/**
 * Builds a student's term invoice the same way everywhere (class-wide job, per-student
 * page, preview), so the two screens can never disagree.
 *
 * Which fee structure applies to a student for a term:
 *   1. a structure for the student's class (or its class level, e.g. "Grade 2" for
 *      "Grade 2 North") that is set for THIS term (academic year + term)
 *   2. otherwise one set for this term by name ("Term 2" / "2027") — older structures
 *   3. otherwise one with no term at all (a general structure)
 * A structure set for a different term is never used. Newest wins inside each rank.
 *
 * Lines: the structure's items, with
 *   - tuition priced per class when the fee particular has a class amount
 *   - transport priced by the student's transport zone; a student with no
 *     transport zone is not charged transport
 *   - lines that come to 0 left out
 */
import { ObjectId } from 'mongodb';
import { canonicalStatus } from '../lib/studentStatus';

export const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const sid = (v: any) => (v === null || v === undefined ? '' : String(v));
const num = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface TermCtx {
    yearId: string; termId: string;
    year: any | null; term: any | null;
    yearLabel: string; termLabel: string;
    structures: any[];
    classNameById: Map<string, string>;
    zones: any[];
    particulars: any[];
}

export const studentName = (s: any) => s?.studentName || `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || 'Student';
export const studentClassName = (s: any) => String(s?.studentClass || s?.currentClass || s?.className || '').trim();

const oidOrNull = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };

export async function loadTermContext(db: any, yearId: string, termId: string): Promise<TermCtx> {
    const [year, term, structures, classes, zones, particularGroups] = await Promise.all([
        oidOrNull(yearId) ? db.collection('academic_years').findOne({ _id: oidOrNull(yearId) }).catch(() => null) : null,
        oidOrNull(termId) ? db.collection('terms').findOne({ _id: oidOrNull(termId) }).catch(() => null) : null,
        db.collection('fee_structures').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
        db.collection('classes').find({}).toArray().catch(() => []),
        db.collection('transport_zones').find({}).toArray().catch(() => []),
        db.collection('fee_particulars').find({}).toArray().catch(() => []),
    ]);
    const tuitionRows: any[] = await db.collection('class_tuition_fees').find({}).toArray().catch(() => []);
    const classNameById = new Map<string, string>();
    for (const c of classes) classNameById.set(sid(c._id), String(c.name || c.levelName || ''));
    const particulars: any[] = [];
    for (const g of particularGroups) for (const p of (g.particulars || [])) if (p?.label) particulars.push(p);
    // per-class tuition saved by class (lib/classTuition) wins over the copy kept by class name;
    // this term's own price (matched by TERM NUMBER — tuition isn't year-specific) wins over
    // the class's usual tuition. Older rows saved against a specific term's id still match it.
    if (tuitionRows.length) {
        const byClass: Record<string, any> = {};
        const termNumber = sid(term?.termNumber);
        const isUsual = (r: any) => !r.termNumber && !sid(r.termId);
        const isThisTerm = (r: any) => (r.termNumber ? sid(r.termNumber) === termNumber : sid(r.termId) === sid(termId)) && (!!r.termNumber || !!sid(r.termId));
        const ordered = [...tuitionRows.filter(isUsual), ...tuitionRows.filter(isThisTerm)];
        for (const r of ordered) { const name = classNameById.get(sid(r.classId)) || r.className; if (name) byClass[name] = r.amount; }
        for (let i = 0; i < particulars.length; i++) {
            if (isTuition(particulars[i].label)) particulars[i] = { ...particulars[i], classAmounts: { ...(particulars[i].classAmounts || {}), ...byClass } };
        }
    }
    return {
        yearId: sid(yearId), termId: sid(termId), year, term,
        yearLabel: year ? String(year.name || year.year || '') : '',
        termLabel: term ? String(term.name || '') : '',
        structures, classNameById, zones, particulars,
    };
}

/** Normalised class names a structure covers. */
export function structureClasses(s: any, ctx: TermCtx): string[] {
    const out = new Set<string>();
    for (const c of (Array.isArray(s.class_ids) ? s.class_ids : [])) {
        const byId = ctx.classNameById.get(sid(c));
        out.add(nrm(byId || c));
    }
    if (s.className) out.add(nrm(s.className));
    if (Array.isArray(s.classNames)) s.classNames.forEach((c: any) => out.add(nrm(c)));
    out.delete('');
    return [...out];
}

/** 3 = set for this term, 2 = same term by name, 1 = no term on it, 0 = another term. */
export function termRank(s: any, ctx: TermCtx): number {
    if (s.semester_id) {
        return sid(s.semester_id) === ctx.termId && (!s.academic_year_id || sid(s.academic_year_id) === ctx.yearId) ? 3 : 0;
    }
    if (s.academic_year_id && sid(s.academic_year_id) !== ctx.yearId) return 0;
    const tName = nrm(s.term), yName = nrm(s.year);
    if (tName || yName) {
        const termOk = !tName || (!!ctx.termLabel && tName === nrm(ctx.termLabel));
        const yearOk = !yName || (!!ctx.year && [nrm(ctx.year.year), nrm(ctx.year.name)].includes(yName)) || (!!ctx.yearLabel && nrm(ctx.yearLabel).includes(yName));
        return termOk && yearOk ? 2 : 0;
    }
    return 1;   // no term on it (or only this year): a general structure
}

/** "Grade 2 North" → ["grade 2 north", "grade 2"] (the class itself, then its level). */
function classKeys(student: any): string[] {
    const full = nrm(studentClassName(student));
    const keys = [full];
    const level = nrm(student?.className);
    if (level && level !== full) keys.push(level);
    const stream = nrm(student?.stream || student?.streamName);
    if (stream && full.endsWith(` ${stream}`)) keys.push(full.slice(0, -stream.length - 1).trim());
    return [...new Set(keys.filter(Boolean))];
}

export interface StructureMatch { structure: any | null; how: string; error?: string }

export function resolveStructure(student: any, ctx: TermCtx): StructureMatch {
    const keys = classKeys(student);
    if (!keys.length) return { structure: null, how: '', error: 'The student is not in a class' };
    const ts = (s: any) => new Date(s.updatedAt || s.createdAt || 0).getTime() || 0;
    for (let k = 0; k < keys.length; k++) {
        const hits = ctx.structures
            .map(s => ({ s, rank: termRank(s, ctx), covers: structureClasses(s, ctx).includes(keys[k]) }))
            .filter(x => x.covers && x.rank > 0)
            .sort((a, b) => b.rank - a.rank || ts(b.s) - ts(a.s));
        if (hits.length) {
            const h = hits[0];
            const how = h.rank === 3 ? 'Set for this term' : h.rank === 2 ? 'Same term (by name)' : 'General structure (no term set)';
            return { structure: h.s, how: k > 0 ? `${how} · class level` : how };
        }
    }
    const otherTerm = ctx.structures.some(s => keys.some(k => structureClasses(s, ctx).includes(k)));
    const when = [ctx.termLabel, ctx.yearLabel].filter(Boolean).join(' ');
    return {
        structure: null, how: '',
        error: otherTerm
            ? `${studentClassName(student)} has a fee structure, but not for ${when || 'this term'}`
            : `No fee structure for ${studentClassName(student) || 'this class'}`,
    };
}

const isTransport = (cat: string) => /transport/i.test(cat);
const isTuition = (cat: string) => /tuition/i.test(cat);

/** Invoice lines for one student from a structure (see header for the rules). */
export function buildLines(structure: any, student: any, ctx: TermCtx): { line_items: any[]; notes: string[] } {
    let base: any[] = [];
    if (Array.isArray(structure.items) && structure.items.length) base = structure.items;
    else if (structure.amounts && typeof structure.amounts === 'object') {
        base = Object.entries(structure.amounts).map(([category, amount]) => ({ category, amount, is_required: true }));
    }
    const notes: string[] = [];
    const cls = studentClassName(student);
    const lines: any[] = [];
    for (const i of base) {
        const category = String(i.category || i.name || 'Fee');
        let amount = num(i.amount);
        if (isTransport(category)) {
            const zoneName = String(student?.transportZone || '').trim();
            if (!zoneName) { notes.push(`${category} left out — no transport zone`); continue; }
            const zone = ctx.zones.find(z => nrm(z.name) === nrm(zoneName));
            const zoneFee = zone ? num(zone.fee ?? zone.amount ?? zone.termFee) : 0;
            if (zoneFee > 0) amount = zoneFee;
        }
        if (isTuition(category)) {
            const p = ctx.particulars.find(x => x.label === category);
            const byClass = p?.classAmounts ? (p.classAmounts[cls] ?? Object.entries(p.classAmounts).find(([k]) => nrm(k) === nrm(cls))?.[1]) : undefined;
            if (byClass !== undefined && num(byClass) > 0) amount = num(byClass);
        }
        if (amount <= 0) continue;
        lines.push({ id: i.id || new ObjectId().toString(), category, description: i.description || '', amount: round2(amount), is_required: i.is_required !== false });
    }
    return { line_items: lines, notes };
}

export function totals(lines: any[], discountType?: string, discountValue?: any) {
    const subtotal = round2(lines.reduce((s, l) => s + num(l.amount), 0));
    const type = discountType === 'FIXED' || discountType === 'PERCENTAGE' ? discountType : 'NONE';
    const val = num(discountValue);
    const discount_amount = round2(Math.min(subtotal, type === 'FIXED' ? val : type === 'PERCENTAGE' ? (subtotal * val) / 100 : 0));
    return { subtotal, discount_type: type, discount_value: val, discount_amount, total_due: round2(Math.max(0, subtotal - discount_amount)) };
}

/** Everything needed to invoice one student for a term (no writes). */
export function planStudentInvoice(student: any, ctx: TermCtx) {
    const match = resolveStructure(student, ctx);
    if (!match.structure) return { ok: false as const, error: match.error || 'No fee structure' };
    const { line_items, notes } = buildLines(match.structure, student, ctx);
    if (!line_items.length) return { ok: false as const, error: `${match.structure.name || 'The fee structure'} has no amounts for this student` };
    const t = totals(line_items, match.structure.discount_type, match.structure.discount_value);
    return { ok: true as const, structure: match.structure, how: match.how, line_items, notes, ...t };
}

export const isActiveStudent = (s: any) => canonicalStatus(s?.status) === 'Active' && !s?.deletedAt;

/** Active students whose class (or its level) is one of `classNames`. */
export function studentsInClasses(students: any[], classNames: string[]) {
    const want = new Set(classNames.map(nrm).filter(Boolean));
    return students.filter(s => isActiveStudent(s) && classKeys(s).some(k => want.has(k)));
}

/** Invoices count as "this term" when they carry the term id — or, for old ones, its name. */
export function termInvoiceFilter(ctx: { yearId: string; termId: string }) {
    return { academic_year_id: ctx.yearId, semester_id: ctx.termId };
}
