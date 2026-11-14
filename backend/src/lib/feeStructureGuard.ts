/**
 * One fee structure per class per term.
 *
 * A class may appear in only ONE active fee structure for a given term (academic year +
 * term) — Term 1, Term 2 and Term 3 each get their own structure. Saving a structure that
 * puts a class into a term it already has a structure for is refused, naming the
 * structure that already holds the class.
 *
 * Terms are compared the way invoices pick structures (services/invoiceBuilder):
 *   - both set by term id (semester_id) → same term when the ids match
 *   - otherwise by name: "Term 2" / "TERM TWO" and the year ("2027", "2026/2027");
 *     a name with no year matches that term in any year
 * Structures with no term at all (general fallbacks), archived or deleted ones never clash.
 * Classes are compared by name, so class ids and older name-only structures both count.
 */
import { Db, ObjectId } from 'mongodb';
import { termNo as termNoOf, yearsIn } from './examWindow';

const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const sid = (v: any) => (v === null || v === undefined ? '' : String(v));
/** "Term 2" → "2" (years in the text are ignored, so "2027 Term 2" is still term 2) */
const termNo = (v: any) => termNoOf(String(v ?? '').replace(/\b(19|20)\d{2}\b/g, ''));
const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };

interface TermId { id: string; no: string; years: string[]; label: string }
export interface StructureConflict { classId: string | null; className: string; structureId: string; structureName: string; term: string }

const isInactive = (s: any) => !!s?.deletedAt || nrm(s?.status) === 'archived';

async function loadLookups(db: Db) {
    const [classes, terms, years] = await Promise.all([
        db.collection('classes').find({}).toArray().catch(() => [] as any[]),
        db.collection('terms').find({}).toArray().catch(() => [] as any[]),
        db.collection('academic_years').find({}).toArray().catch(() => [] as any[]),
    ]);
    const classById = new Map<string, any>(classes.map((c: any) => [sid(c._id), c]));
    const termById = new Map<string, any>(terms.map((t: any) => [sid(t._id), t]));
    const yearById = new Map<string, any>(years.map((y: any) => [sid(y._id), y]));
    return { classById, termById, yearById };
}
type Lookups = Awaited<ReturnType<typeof loadLookups>>;

const className = (c: any) => String(c?.name || c?.levelName || '').trim();

/** Normalised class names a structure covers → display name and id. */
function classesOf(s: any, L: Lookups): Map<string, { id: string | null; name: string }> {
    const out = new Map<string, { id: string | null; name: string }>();
    for (const c of (Array.isArray(s.class_ids) ? s.class_ids : [])) {
        const doc = L.classById.get(sid(c));
        const name = doc ? className(doc) : sid(c);
        if (nrm(name)) out.set(nrm(name), { id: doc ? sid(doc._id) : null, name });
    }
    const names = [s.className, ...(Array.isArray(s.classNames) ? s.classNames : [])];
    for (const n of names) if (nrm(n) && !out.has(nrm(n))) out.set(nrm(n), { id: null, name: String(n).trim() });
    return out;
}

/** The term a structure is set for, or null for a general (no-term) structure. */
function termOf(s: any, L: Lookups): TermId | null {
    if (s.semester_id) {
        const t = L.termById.get(sid(s.semester_id));
        const y = L.yearById.get(sid(s.academic_year_id || t?.academicYearId));
        const name = t?.name || s.term || '';
        const yr = String(y?.year || y?.name || t?.academicYear || s.year || '');
        return { id: sid(s.semester_id), no: termNo(t?.termNumber ? `Term ${t.termNumber}` : name), years: yearsIn(yr), label: `${name} ${yr}`.trim() };
    }
    const no = termNo(s.term);
    if (!no) return null;
    const y = s.academic_year_id ? L.yearById.get(sid(s.academic_year_id)) : null;
    const yr = String(y?.year || y?.name || s.year || '');
    return { id: '', no, years: yearsIn(yr), label: `${s.term} ${yr}`.trim() };
}

function sameTerm(a: TermId, b: TermId): boolean {
    if (a.id && b.id) return a.id === b.id;
    if (a.no !== b.no) return false;
    if (!a.years.length || !b.years.length) return true;
    return a.years.some(y => b.years.includes(y));
}

/** Classes in `candidate` that another active structure already holds for the same term. */
export async function feeStructureConflicts(db: Db, candidate: any, excludeId?: string | null): Promise<StructureConflict[]> {
    if (isInactive(candidate)) return [];
    const L = await loadLookups(db);
    const term = termOf(candidate, L);
    if (!term) return [];
    const mine = classesOf(candidate, L);
    if (!mine.size) return [];
    const others: any[] = await db.collection('fee_structures').find({}).toArray().catch(() => []);
    const out: StructureConflict[] = [];
    for (const o of others) {
        if (excludeId && sid(o._id) === sid(excludeId)) continue;
        if (isInactive(o)) continue;
        const t = termOf(o, L);
        if (!t || !sameTerm(term, t)) continue;
        for (const [key, c] of classesOf(o, L)) {
            const m = mine.get(key);
            if (m && !out.some(x => nrm(x.className) === key)) {
                out.push({ classId: m.id || c.id, className: m.name || c.name, structureId: sid(o._id), structureName: String(o.name || 'another fee structure'), term: term.label || t.label });
            }
        }
    }
    return out;
}

export const conflictMessage = (list: StructureConflict[]) => {
    const first = list[0];
    const names = list.map(c => c.className).join(', ');
    const where = [...new Set(list.map(c => `“${c.structureName}”`))].join(', ');
    return `${names} already ${list.length > 1 ? 'have' : 'has'} a fee structure for ${first.term || 'this term'} (${where}). A class can only be in one fee structure per term.`;
};

/**
 * Express middleware for the generic POST /fee_structures and PATCH /fee_structures/:id.
 * On PATCH the stored structure is merged with the change first (a status-only change
 * still gets checked, e.g. restoring an archived structure).
 */
export const feeStructureGuard = async (req: any, res: any, next: any) => {
    try {
        const db: Db = req.tenantDb || null;
        if (!db) return next();
        const id = req.params?.id || null;
        let doc = { ...(req.body || {}) };
        if (id) {
            const existing = oid(id) ? await db.collection('fee_structures').findOne({ _id: oid(id) as any }).catch(() => null) : null;
            doc = { ...(existing || {}), ...doc };
        }
        const conflicts = await feeStructureConflicts(db, doc, id);
        if (!conflicts.length) return next();
        const message = conflictMessage(conflicts);
        return res.status(409).json({ message, code: 'CLASS_ALREADY_IN_TERM_STRUCTURE', conflicts, errors: [{ code: 'CLASS_ALREADY_IN_TERM_STRUCTURE', message }] });
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
};
