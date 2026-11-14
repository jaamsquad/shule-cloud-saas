/**
 * Money received in a period, one row per receipt — where it came from and how it was paid.
 * Used by the dashboard's Revenue card (click → list) and Accounts → Account Statement.
 *
 *   fee payments  `payments` (cash, M-PESA, bank, cheque, sponsor, wallet…), voided ones left out;
 *                 "CREDIT" rows are an earlier overpayment being used up, not new money — left out
 *   other income  `income` (Accounts → Add Income)
 */
import { Db, ObjectId } from 'mongodb';

const num = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const sid = (v: any) => (v === null || v === undefined ? '' : String(v));
const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const when = (v: any) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

const MODE: Record<string, string> = {
    CASH: 'Cash', MPESA: 'M-PESA', 'M-PESA': 'M-PESA', BANK: 'Bank', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque', CHECK: 'Cheque',
    CARD: 'Card', SPONSOR: 'Sponsor', WALLET: 'Wallet', AIRTEL: 'Airtel Money', PAYPAL: 'PayPal', ONLINE: 'Online',
};
export const modeLabel = (m: any) => { const k = String(m || '').trim(); if (!k) return 'Not recorded'; return MODE[k.toUpperCase().replace(/\s+/g, '_')] || k.charAt(0).toUpperCase() + k.slice(1); };

export interface RevenueRow {
    id: string; kind: 'fee' | 'income'; date: string; amount: number; mode: string; reference: string;
    source: string; description: string;
    details: Record<string, any>;
}

/** from / to: 'YYYY-MM-DD' (inclusive); either may be empty. */
export async function revenueLedger(db: Db, from = '', to = '') {
    const lo = from ? new Date(`${from}T00:00:00`) : null;
    const hi = to ? new Date(`${to}T23:59:59.999`) : null;
    const inRange = (d: Date | null) => !!d && (!lo || d >= lo) && (!hi || d <= hi);

    const [payments, income] = await Promise.all([
        db.collection('payments').find({}).toArray().catch(() => [] as any[]),
        db.collection('income').find({}).toArray().catch(() => [] as any[]),
    ]);
    const pays = payments.filter((p: any) => !p.is_voided && String(p.method || '').toUpperCase() !== 'CREDIT' && inRange(when(p.payment_date || p.date || p.createdAt)));

    // who paid: student and invoice behind each fee payment
    const studentIds = [...new Set(pays.map((p: any) => sid(p.student_id || p.studentId)).filter(Boolean))];
    const invoiceIds = [...new Set(pays.map((p: any) => sid(p.invoice_id)).filter(Boolean))];
    const [students, invoices] = await Promise.all([
        studentIds.length ? db.collection('students').find({ _id: { $in: studentIds.map(oid).filter(Boolean) as ObjectId[] } }).toArray().catch(() => []) : [],
        invoiceIds.length ? db.collection('invoices').find({ _id: { $in: invoiceIds.map(oid).filter(Boolean) as ObjectId[] } }).toArray().catch(() => []) : [],
    ]);
    const stu = new Map(students.map((s: any) => [sid(s._id), s]));
    const inv = new Map(invoices.map((i: any) => [sid(i._id), i]));

    const rows: RevenueRow[] = [];
    for (const p of pays) {
        const s: any = stu.get(sid(p.student_id || p.studentId));
        const i: any = inv.get(sid(p.invoice_id));
        const name = s?.studentName || `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || p.studentName || i?.studentName || 'Student';
        const cls = s?.studentClass || s?.currentClass || i?.studentClass || '';
        const mode = p.payment_mode || modeLabel(p.method);
        const items = Array.isArray(i?.line_items) ? i.line_items : Array.isArray(i?.items) ? i.items : [];
        rows.push({
            id: sid(p._id), kind: 'fee', date: (when(p.payment_date || p.date || p.createdAt) as Date).toISOString(), amount: num(p.amount), mode,
            reference: sid(p.mpesaCode || p.reference || p.transactionId || ''),
            source: `Fee payment — ${name}${cls ? ` (${cls})` : ''}`,
            description: p.remarks || p.note || (i ? `Invoice ${i.invoice_no || i.invoiceNo || ''}`.trim() : 'School fees'),
            details: {
                student: name, admNo: s?.registrationNo || s?.admissionNumber || s?.admNo || p.registrationNo || '', className: cls,
                receiptNo: p.receipt_no || '', invoiceNo: i?.invoice_no || i?.invoiceNo || '', invoiceFor: items.map((x: any) => x.category || x.description || x.name).filter(Boolean).slice(0, 6).join(', '),
                payerPhone: p.phone || '', sponsor: p.sponsor_id ? (p.remarks || 'Sponsor') : '', method: p.method || '', remarks: p.remarks || p.note || '',
            },
        });
    }
    for (const r of income) {
        const d = when(r.date || r.createdAt);
        if (!inRange(d)) continue;
        rows.push({
            id: sid(r._id), kind: 'income', date: (d as Date).toISOString(), amount: num(r.amount),
            mode: modeLabel(r.paymentMethod || r.payment_mode || r.mode || r.method),
            reference: sid(r.reference || r.receiptNo || r.ref || ''),
            source: r.category || r.source || r.incomeHead || 'Other income',
            description: r.description || r.title || r.name || '',
            details: { receivedFrom: r.receivedFrom || r.payer || r.from || '', category: r.category || '', remarks: r.remarks || r.note || '' },
        });
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));

    const byMode: Record<string, { mode: string; amount: number; count: number }> = {};
    for (const r of rows) { (byMode[r.mode] ||= { mode: r.mode, amount: 0, count: 0 }); byMode[r.mode].amount += r.amount; byMode[r.mode].count++; }
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
        from, to,
        total: round(rows.reduce((a, r) => a + r.amount, 0)),
        fees: round(rows.filter(r => r.kind === 'fee').reduce((a, r) => a + r.amount, 0)),
        otherIncome: round(rows.filter(r => r.kind === 'income').reduce((a, r) => a + r.amount, 0)),
        byMode: Object.values(byMode).map(m => ({ ...m, amount: round(m.amount) })).sort((a, b) => b.amount - a.amount),
        rows,
    };
}
