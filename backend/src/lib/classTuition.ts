/**
 * Termly tuition fee per class — and, when a school wants, a different price per term.
 * (Fees → Class Tuition, also reachable from Fee Particulars and Fee Structure.)
 *
 * Terms are hard-coded (Term 1/2/3 — see lib: academics-v2 terms) and repeat the same dates
 * every year, so tuition is priced by TERM NUMBER, not by a specific year's term document —
 * no year picker, and a price set for "Term 1" applies every year until changed.
 *
 * `class_tuition_fees` holds one row per class per term:
 *   {classId, className, termNumber: '' , amount}   the class's usual tuition (every term)
 *   {classId, className, termNumber: <n>, amount}   that term's own price (overrides the usual)
 * Rows saved before per-term prices existed have no termNumber and count as the usual tuition.
 * Rows saved before terms became year-independent carry a `termId` (an old term document's id)
 * instead — load() resolves those to a termNumber from that document, so nothing already
 * entered is lost.
 * The usual amounts are also copied into the TERMLY TUITION FEE particular's `classAmounts`
 * (keyed by class name), which older screens still read. Invoices for a term use that term's
 * price, else the usual one (services/invoiceBuilder).
 */
import { Db, ObjectId } from 'mongodb';

const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const sid = (v: any) => (v === null || v === undefined ? '' : String(v));
export const isTuitionLabel = (l: any) => /tuition/i.test(String(l || ''));
const className = (c: any) => String(c?.name || c?.levelName || '').trim();
const num = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
const blank = (v: any) => v === null || v === undefined || String(v).trim() === '';

export interface ClassTuition {
    classId: string; className: string; amount: number; saved: boolean; updatedAt: Date | null;
    /** where `amount` comes from for the term asked: its own price, the usual one, or none */
    source: 'term' | 'default' | 'none';
    defaultAmount: number | null;
}

async function load(db: Db) {
    const [classes, rows, groups, terms] = await Promise.all([
        db.collection('classes').find({}).toArray().catch(() => [] as any[]),
        db.collection('class_tuition_fees').find({}).toArray().catch(() => [] as any[]),
        db.collection('fee_particulars').find({}).toArray().catch(() => [] as any[]),
        db.collection('terms').find({}).toArray().catch(() => [] as any[]),
    ]);
    // legacy: the tuition particular's classAmounts, keyed by class name
    const legacy = new Map<string, number>();
    for (const g of groups) for (const p of (g.particulars || [])) {
        if (!isTuitionLabel(p?.label) || !p.classAmounts) continue;
        for (const [k, v] of Object.entries(p.classAmounts)) if (num(v) > 0 && !legacy.has(nrm(k))) legacy.set(nrm(k), num(v));
    }
    // old rows keyed by a specific year's term document id → resolve to that term's number
    const termNumberById = new Map<string, string>();
    for (const t of terms) if (t.termNumber) termNumberById.set(sid(t._id), sid(t.termNumber));
    const termOf = (r: any): string => {
        if (!blank(r.termNumber)) return sid(r.termNumber);
        if (!blank(r.termId)) return termNumberById.get(sid(r.termId)) || '';
        return '';
    };
    const usual = new Map<string, any>(), byTerm = new Map<string, any>();
    for (const r of rows) { const t = termOf(r); (t ? byTerm.set(`${sid(r.classId)}|${t}`, r) : usual.set(sid(r.classId), r)); }
    // the distinct term numbers across every year, in order — these are the grid's columns
    const numbers = Array.from(new Set(terms.map((t: any) => sid(t.termNumber)).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
    const activeNumbers = new Set(terms.filter((t: any) => t.isActive).map((t: any) => sid(t.termNumber)));
    return { classes: classes.filter((c: any) => className(c)), usual, byTerm, legacy, groups, numbers, activeNumbers };
}
type Loaded = Awaited<ReturnType<typeof load>>;

/** The class's usual tuition: saved row, else the legacy class amount, else none. */
function usualOf(L: Loaded, c: any): { amount: number; at: Date | null } | null {
    const row = L.usual.get(sid(c._id));
    if (row) return { amount: num(row.amount), at: row.updatedAt || null };
    const old = L.legacy.get(nrm(className(c)));
    return old !== undefined ? { amount: old, at: null } : null;
}

/** Every class with its tuition for a term ('' = the usual tuition, else a term number like "1"). */
export async function getClassTuition(db: Db, termNumber = ''): Promise<ClassTuition[]> {
    const L = await load(db);
    return L.classes.map((c: any) => {
        const u = usualOf(L, c);
        const own = termNumber ? L.byTerm.get(`${sid(c._id)}|${termNumber}`) : null;
        if (own) return { classId: sid(c._id), className: className(c), amount: num(own.amount), saved: true, updatedAt: own.updatedAt || null, source: 'term' as const, defaultAmount: u ? u.amount : null };
        return { classId: sid(c._id), className: className(c), amount: u ? u.amount : 0, saved: !!u && !termNumber, updatedAt: u?.at || null, source: u ? 'default' as const : 'none' as const, defaultAmount: u ? u.amount : null };
    });
}

/** The grid: each class's usual tuition and each term's own price — no year dimension. */
export async function getTuitionGrid(db: Db) {
    const L = await load(db);
    return {
        terms: L.numbers.map(n => ({ _id: n, name: `Term ${n}`, isActive: L.activeNumbers.has(n) })),
        classes: L.classes.map((c: any) => {
            const u = usualOf(L, c);
            const byTerm: Record<string, number> = {};
            for (const n of L.numbers) { const r = L.byTerm.get(`${sid(c._id)}|${n}`); if (r) byTerm[n] = num(r.amount); }
            return { classId: sid(c._id), className: className(c), usual: u ? u.amount : null, byTerm };
        }),
    };
}

/**
 * Save tuition cells: [{classId, termNumber ('' = usual), amount}]. An empty amount on a
 * term cell removes that term's own price (the class goes back to its usual tuition).
 */
export async function saveTuitionCells(db: Db, cells: { classId: any; termNumber?: any; amount: any }[], by?: string) {
    const L = await load(db);
    const byId = new Map<string, any>(L.classes.map((c: any) => [sid(c._id), c]));
    const now = new Date();
    const ops: any[] = [];
    let usualChanged = false;
    for (const cell of (cells || []).slice(0, 2000)) {
        const c = byId.get(sid(cell.classId));
        if (!c) continue;
        const termNumber = sid(cell.termNumber);
        const filter = termNumber
            ? { classId: sid(c._id), termNumber }
            : { classId: sid(c._id), $or: [{ termNumber: { $exists: false } }, { termNumber: '' }, { termId: { $exists: false } }, { termId: '' }, { termId: null }] };
        if (blank(cell.amount)) {
            if (termNumber) ops.push({ deleteMany: { filter } });
            continue;
        }
        if (!termNumber) usualChanged = true;
        ops.push({
            updateOne: {
                filter,
                update: { $set: { classId: sid(c._id), className: className(c), termNumber, termId: '', amount: num(cell.amount), updatedAt: now, ...(by ? { updatedBy: by } : {}) }, $setOnInsert: { createdAt: now } },
                upsert: true,
            },
        });
    }
    if (ops.length) await db.collection('class_tuition_fees').bulkWrite(ops);
    if (usualChanged) await mirrorToParticulars(db, await getClassTuition(db));
}

/** Older API: save the usual tuition ({classId: amount}). */
export async function saveClassTuition(db: Db, amounts: Record<string, any>, by?: string, termNumber = ''): Promise<ClassTuition[]> {
    await saveTuitionCells(db, Object.entries(amounts || {}).map(([classId, amount]) => ({ classId, termNumber, amount })), by);
    return getClassTuition(db, termNumber);
}

/** Copy the usual amounts into every fee-particulars group's tuition row (by class name). */
async function mirrorToParticulars(db: Db, all: ClassTuition[]) {
    const classAmounts: Record<string, string> = {};
    for (const c of all) if (c.saved) classAmounts[c.className] = String(c.amount);
    const groups: any[] = await db.collection('fee_particulars').find({}).toArray().catch(() => []);
    const avg = () => { const v = Object.values(classAmounts).map(Number); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(0) : '0'; };
    let touched = false;
    for (const g of groups) {
        const parts = Array.isArray(g.particulars) ? g.particulars : [];
        if (!parts.some((p: any) => isTuitionLabel(p?.label))) continue;
        const next = parts.map((p: any) => isTuitionLabel(p?.label) ? { ...p, classAmounts: { ...(p.classAmounts || {}), ...classAmounts }, amount: avg() } : p);
        await db.collection('fee_particulars').updateOne({ _id: g._id }, { $set: { particulars: next, updatedAt: new Date() } });
        touched = true;
    }
    // no tuition particular anywhere yet: start the "All Students" list with one
    if (!touched) {
        const all = groups.find(g => g.category === 'All Students');
        const row = { label: 'TERMLY TUITION FEE', amount: avg(), fixed: true, classAmounts };
        if (all) await db.collection('fee_particulars').updateOne({ _id: all._id }, { $set: { particulars: [row, ...(all.particulars || [])], updatedAt: new Date() } });
        else await db.collection('fee_particulars').insertOne({ _id: new ObjectId(), category: 'All Students', particulars: [row], createdAt: new Date(), updatedAt: new Date() } as any);
    }
}
