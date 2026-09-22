/**
 * The format fee invoice numbers are printed in — Settings → Fees → Invoice Numbers.
 * Default: INV-2026-000027 (prefix "INV", separator "-", the year, a 6-digit sequence).
 * The sequence is not a stored counter — it is the count of invoices already numbered this
 * way this year, so changing the format never collides with numbers already given out.
 */
import { Db } from 'mongodb';

export interface InvoiceNumberFormat { prefix: string; separator: string; useYear: boolean; padding: number }
const DEFAULT_FORMAT: InvoiceNumberFormat = { prefix: 'INV', separator: '-', useYear: true, padding: 6 };
const SEPARATORS = ['', '-', '/', '_'];
const escRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function cleanInvoiceFormat(input: any, base: InvoiceNumberFormat = DEFAULT_FORMAT): InvoiceNumberFormat {
    const int = (v: any, lo: number, hi: number, fallback: number) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback; };
    return {
        prefix: input?.prefix === undefined ? base.prefix : String(input.prefix).replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase() || 'INV',
        separator: input?.separator === undefined ? base.separator : (SEPARATORS.includes(input.separator) ? input.separator : base.separator),
        useYear: input?.useYear === undefined ? base.useYear : !!input.useYear,
        padding: int(input?.padding, 3, 10, base.padding),
    };
}

export async function getInvoiceFormat(db: Db): Promise<InvoiceNumberFormat> {
    const saved: any = await db.collection('id_numbering').findOne({ _id: 'invoice' as any }).catch(() => null);
    return cleanInvoiceFormat(saved || {});
}

export async function saveInvoiceFormat(db: Db, input: any): Promise<InvoiceNumberFormat> {
    const fmt = cleanInvoiceFormat(input, await getInvoiceFormat(db));
    await db.collection('id_numbering').updateOne({ _id: 'invoice' as any }, { $set: { ...fmt, updatedAt: new Date() } }, { upsert: true });
    return fmt;
}

const build = (fmt: InvoiceNumberFormat, seq: number, year: number) =>
    [fmt.prefix, fmt.useYear ? String(year) : '', String(seq).padStart(fmt.padding, '0')].filter(Boolean).join(fmt.separator);

export const previewInvoiceNo = (fmt: InvoiceNumberFormat) => build(fmt, 1, new Date().getFullYear());

/** The next invoice number to hand out, in the school's chosen format. */
export async function nextInvoiceNo(db: Db, schoolId: string): Promise<string> {
    const fmt = await getInvoiceFormat(db);
    const year = new Date().getFullYear();
    const parts = [fmt.prefix, fmt.useYear ? String(year) : ''].filter(Boolean).map(escRx).join(escRx(fmt.separator) + '?');
    const rx = new RegExp(`^${parts}`);
    const count = await db.collection('invoices').countDocuments({ schoolId, invoice_no: rx });
    return build(fmt, count + 1, year);
}
