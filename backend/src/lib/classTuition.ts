/**
 * Termly tuition fee per class (Fees → Fee Particulars → "Setup class tuition fees").
 *
 * Saved one row per class in `class_tuition_fees` ({classId, className, amount}) so each
 * class's tuition is kept on its own and survives class renames. The amounts are also
 * copied into the TERMLY TUITION FEE particular's `classAmounts` (keyed by class name),
 * which is where invoices, fee structures and the portals already read tuition from.
 * Older schools that only have `classAmounts` are read from there until they next save.
 */
import { Db, ObjectId } from 'mongodb';

const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const sid = (v: any) => (v === null || v === undefined ? '' : String(v));
export const isTuitionLabel = (l: any) => /tuition/i.test(String(l || ''));
const className = (c: any) => String(c?.name || c?.levelName || '').trim();
const num = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

export interface ClassTuition { classId: string; className: string; amount: number; saved: boolean; updatedAt: Date | null }

/** Every class with its termly tuition (0 when not set). */
export async function getClassTuition(db: Db): Promise<ClassTuition[]> {
    const [classes, rows, groups] = await Promise.all([
        db.collection('classes').find({}).toArray().catch(() => [] as any[]),
        db.collection('class_tuition_fees').find({}).toArray().catch(() => [] as any[]),
        db.collection('fee_particulars').find({}).toArray().catch(() => [] as any[]),
    ]);
    const byId = new Map<string, any>(rows.map((r: any) => [sid(r.classId), r]));
    // legacy: the tuition particular's classAmounts, keyed by class name
    const legacy = new Map<string, number>();
    for (const g of groups) for (const p of (g.particulars || [])) {
        if (!isTuitionLabel(p?.label) || !p.classAmounts) continue;
        for (const [k, v] of Object.entries(p.classAmounts)) if (num(v) > 0 && !legacy.has(nrm(k))) legacy.set(nrm(k), num(v));
    }
    return classes
        .map((c: any) => {
            const name = className(c);
            const row = byId.get(sid(c._id));
            if (row) return { classId: sid(c._id), className: name, amount: num(row.amount), saved: true, updatedAt: row.updatedAt || null };
            const old = legacy.get(nrm(name));
            return { classId: sid(c._id), className: name, amount: old ?? 0, saved: old !== undefined, updatedAt: null };
        })
        .filter(c => c.className);
}

/** Save tuition for the classes given ({classId: amount}); other classes are left alone. */
export async function saveClassTuition(db: Db, amounts: Record<string, any>, by?: string): Promise<ClassTuition[]> {
    const classes: any[] = await db.collection('classes').find({}).toArray().catch(() => []);
    const byId = new Map<string, any>(classes.map((c: any) => [sid(c._id), c]));
    const now = new Date();
    const ops: any[] = [];
    for (const [classId, raw] of Object.entries(amounts || {})) {
        const c = byId.get(sid(classId));
        if (!c) continue;
        ops.push({
            updateOne: {
                filter: { classId: sid(c._id) },
                update: { $set: { classId: sid(c._id), className: className(c), amount: num(raw), updatedAt: now, ...(by ? { updatedBy: by } : {}) }, $setOnInsert: { createdAt: now } },
                upsert: true,
            },
        });
    }
    if (ops.length) await db.collection('class_tuition_fees').bulkWrite(ops);
    const all = await getClassTuition(db);
    await mirrorToParticulars(db, all);
    return all;
}

/** Copy the saved amounts into every fee-particulars group's tuition row (by class name). */
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
