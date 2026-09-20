/**
 * Automatic sequential numbers — student registration numbers and employee numbers.
 *
 * The school admin sets a rule per kind in General Settings → Registration Numbers:
 *   prefix + (year) + zero-padded sequence, joined by a separator   e.g.  KHS/2026/0001
 * Rules live in `id_numbering` (one doc per kind, _id = 'student' | 'staff'). `next` is the
 * number the next new record will take; it is advanced atomically so two people
 * registering at once never get the same number.
 *
 * A number is only generated when the record arrives WITHOUT one, so schools can keep
 * typing numbers by hand, or import a list that already carries them.
 */
import { Db } from 'mongodb';

export type NumberKind = 'student' | 'staff';

export interface NumberingRule {
    enabled: boolean;
    prefix: string;       // "KHS"
    separator: string;    // "" | "-" | "/" | "_"
    useYear: boolean;     // put the current year after the prefix
    padding: number;      // digits in the sequence: 4 → 0007
    next: number;         // the next sequence number to hand out
}

// Where each kind's number is stored.
const TARGET: Record<NumberKind, { collection: string; field: string }> = {
    student: { collection: 'students', field: 'registrationNo' },
    staff: { collection: 'staff', field: 'staffNo' },
};
const DEFAULTS: Record<NumberKind, NumberingRule> = {
    student: { enabled: false, prefix: '', separator: '', useYear: false, padding: 4, next: 1 },
    staff: { enabled: false, prefix: 'EMP', separator: '-', useYear: false, padding: 4, next: 1 },
};
const SEPARATORS = ['', '-', '/', '_'];

export const kindForCollection = (collection: string): NumberKind | null =>
    collection === 'students' ? 'student' : collection === 'staff' ? 'staff' : null;

export function formatNumber(rule: NumberingRule, n: number, year = new Date().getFullYear()): string {
    return [rule.prefix, rule.useYear ? String(year) : '', String(n).padStart(rule.padding, '0')].filter(Boolean).join(rule.separator);
}

// Clean up whatever the browser sent, keeping current values for anything missing.
export function cleanRule(input: any, base: NumberingRule): NumberingRule {
    const int = (v: any, lo: number, hi: number, fallback: number) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback; };
    return {
        enabled: input?.enabled === undefined ? base.enabled : !!input.enabled,
        prefix: input?.prefix === undefined ? base.prefix : String(input.prefix).replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase(),
        separator: input?.separator === undefined ? base.separator : (SEPARATORS.includes(input.separator) ? input.separator : base.separator),
        useYear: input?.useYear === undefined ? base.useYear : !!input.useYear,
        padding: int(input?.padding, 1, 8, base.padding),
        next: int(input?.next, 1, 999_999_999, base.next),
    };
}

export async function getRule(db: Db, kind: NumberKind): Promise<NumberingRule> {
    const saved: any = await db.collection('id_numbering').findOne({ _id: kind as any }).catch(() => null);
    return cleanRule(saved || {}, DEFAULTS[kind]);
}

export async function saveRule(db: Db, kind: NumberKind, input: any): Promise<NumberingRule> {
    const rule = cleanRule(input, await getRule(db, kind));
    await db.collection('id_numbering').updateOne({ _id: kind as any }, { $set: { ...rule, updatedAt: new Date() } }, { upsert: true });
    return rule;
}

// The next number the school will hand out (for previews; not reserved).
export const previewNext = (rule: NumberingRule) => formatNumber(rule, rule.next);

// Take the next free number, or null when this kind isn't set to automatic.
export async function allocateNumber(db: Db, kind: NumberKind): Promise<string | null> {
    const { collection, field } = TARGET[kind];
    for (let i = 0; i < 200; i++) {
        // Advance the counter atomically; `before` is the value this caller now owns.
        const before: any = await db.collection('id_numbering').findOneAndUpdate({ _id: kind as any, enabled: true }, { $inc: { next: 1 } }, { returnDocument: 'before' });
        if (!before) return null;
        const value = formatNumber(cleanRule(before, DEFAULTS[kind]), Number(before.next) || 1);
        // Skip numbers already taken (e.g. typed in by hand before automatic numbering was switched on).
        if (!(await db.collection(collection).findOne({ [field]: value }, { projection: { _id: 1 } }))) return value;
    }
    throw new Error('Could not find a free registration number — check the number format and next number in settings.');
}

// Give `doc` its number if it hasn't got one and automatic numbering is on for its kind.
// A new student also gets portal login details derived from the number (username = number).
export async function applyAutoNumber(db: Db, collection: string, doc: any): Promise<void> {
    const kind = kindForCollection(collection);
    if (!kind) return;
    const { field } = TARGET[kind];
    if (String(doc[field] ?? '').trim()) return;
    const value = await allocateNumber(db, kind);
    if (!value) return;
    doc[field] = value;
    if (kind === 'student') {
        if (!String(doc.admNo ?? '').trim()) doc.admNo = value;
        doc.portalUsername = value;
        doc.portalPassword = `shule@${value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
        doc.credentialsGenerated = true;
        doc.lastPasswordReset = new Date().toISOString();
    }
}
