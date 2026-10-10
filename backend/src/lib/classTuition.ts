/**
 * Termly tuition fee per class — and, when a school wants, a different price per term.
 * (Fees → Class Tuition, also reachable from Fee Particulars and Fee Structure.)
 *
 * `class_tuition_fees` holds one row per class per term:
 *   {classId, className, termId: '' , amount}   the class's usual tuition (every term)
 *   {classId, className, termId: <id>, amount}  that term's own price (overrides the usual)
 * Rows saved before per-term prices existed have no termId and count as the usual tuition.
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
export const rowTerm = (r: any) => sid(r?.termId);   // '' = every term

export interface ClassTuition {
    classId: string; className: string; amount: number; saved: boolean; updatedAt: Date | null;
    /** where `amount` comes from for the term asked: its own price, the usual one, or none */
    source: 'term' | 'default' | 'none';
    defaultAmount: number | null;
}

async function load(db: Db) {
    const [classes, rows, groups] = await Promise.all([
        db.collection('classes').find({}).toArray().catch(() => [] as any[]),
        db.collection('class_tuition_fees').find({}).toArray().catch(() => [] as any[]),
        db.collection('fee_particulars').find({}).toArray().catch(() => [] as any[]),
    ]);
    // legacy: the tuition particular's classAmounts, keyed by class name
    const legacy = new Map<string, number>();
    for (const g of groups) for (const p of (g.particulars || [])) {
        if (!isTuitionLabel(p?.label) || !p.classAmounts) continue;
        for (const [k, v] of Object.entries(p.classAmounts)) if (num(v) > 0 && !legacy.has(nrm(k))) legacy.set(nrm(k), num(v));
    }
    const usual = new Map<string, any>(), byTerm = new Map<string, any>();
    for (const r of rows) (rowTerm(r) ? byTerm.set(`${sid(r.classId)}|${rowTerm(r)}`, r) : usual.set(sid(r.classId), r));
    return { classes: classes.filter((c: any) => className(c)), usual, byTerm, legacy, groups };
}
type Loaded = Awaited<ReturnType<typeof load>>;

/** The class's usual tuition: saved row, else the legacy class amount, else none. */
function usualOf(L: Loaded, c: any): { amount: number; at: Date | null } | null {
    const row = L.usual.get(sid(c._id));
    if (row) return { amount: num(row.amount), at: row.updatedAt || null };
    const old = L.legacy.get(nrm(className(c)));
    return old !== undefined ? { amount: old, at: null } : null;
}

/** Every class with its tuition for a term ('' = the usual tuition). */
export async function getClassTuition(db: Db, termId = ''): Promise<ClassTuition[]> {
    const L = await load(db);
    return L.classes.map((c: any) => {
        const u = usualOf(L, c);
        const own = termId ? L.byTerm.get(`${sid(c._id)}|${termId}`) : null;
        if (own) return { classId: sid(c._id), className: className(c), amount: num(own.amount), saved: true, updatedAt: own.updatedAt || null, source: 'term' as const, defaultAmount: u ? u.amount : null };
        return { classId: sid(c._id), className: className(c), amount: u ? u.amount : 0, saved: !!u && !termId, updatedAt: u?.at || null, source: u ? 'default' as const : 'none' as const, defaultAmount: u ? u.amount : null };
    });
}

/** Grid for one academic year: each class's usual tuition and each term's own price. */
export async function getTuitionGrid(db: Db, yearId = '') {
    const L = await load(db);
    const terms: any[] = await db.collection('terms').find(yearId ? { academicYearId: yearId } : {}).toArray().catch(() => []);
    terms.sort((a, b) => (Number(a.termNumber) || 0) - (Number(b.termNumber) || 0) || String(a.name).localeCompare(String(b.name)));
    return {
        terms: terms.filter(t => !t.deletedAt).map(t => ({ _id: sid(t._id), name: t.name, isActive: !!t.isActive })),
        classes: L.classes.map((c: any) => {
            const u = usualOf(L, c);
            const byTerm: Record<string, number> = {};
            for (const t of terms) { const r = L.byTerm.get(`${sid(c._id)}|${sid(t._id)}`); if (r) byTerm[sid(t._id)] = num(r.amount); }
            return { classId: sid(c._id), className: className(c), usual: u ? u.amount : null, byTerm };
        }),
    };
}

/**
 * Save tuition cells: [{classId, termId ('' = usual), amount}]. An empty amount on a term
 * cell removes that term's own price (the class goes back to its usual tuition).
 */
export async function saveTuitionCells(db: Db, cells: { classId: any; termId?: any; amount: any }[], by?: string) {
    const L = await load(db);
    const byId = new Map<string, any>(L.classes.map((c: any) => [sid(c._id), c]));
    const now = new Date();
    const ops: any[] = [];
    let usualChanged = false;
    for (const cell of (cells || []).slice(0, 2000)) {
        const c = byId.get(sid(cell.classId));
        if (!c) continue;
        const termId = sid(cell.termId);
        const filter = termId ? { classId: sid(c._id), termId } : { classId: sid(c._id), $or: [{ termId: { $exists: false } }, { termId: '' }, { termId: null }] };
        if (blank(cell.amount)) {
            if (termId) ops.push({ deleteMany: { filter } });
            continue;
        }
        if (!termId) usualChanged = true;
        ops.push({
            updateOne: {
                filter,
                update: { $set: { classId: sid(c._id), className: className(c), termId, amount: num(cell.amount), updatedAt: now, ...(by ? { updatedBy: by } : {}) }, $setOnInsert: { createdAt: now } },
                upsert: true,
            },
        });
    }
    if (ops.length) await db.collection('class_tuition_fees').bulkWrite(ops);
    if (usualChanged) await mirrorToParticulars(db, await getClassTuition(db));
}

/** Older API: save the usual tuition ({classId: amount}). */
export async function saveClassTuition(db: Db, amounts: Record<string, any>, by?: string, termId = ''): Promise<ClassTuition[]> {
    await saveTuitionCells(db, Object.entries(amounts || {}).map(([classId, amount]) => ({ classId, termId, amount })), by);
    return getClassTuition(db, termId);
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
