/**
 * Marks-entry window: teachers may only see and record marks for exams of the CURRENT
 * academic year and term. Admins (school admin, principal…) can work on any exam.
 *
 * "Current" comes from the school's active term (v2 terms, else the legacy period marked
 * current — see modules/cbc/cbcTerm). An exam counts as current when its term number and
 * year match ("Term 2" / "TERM 2", "2027" / "2026/2027"). If the school has not set a
 * current term, nothing is blocked — we can't tell which exams are old.
 */
import { Db } from 'mongodb';
import { currentTerm, TermInfo } from '../modules/cbc/cbcTerm';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'admin', 'principal', 'super admin', 'school admin'];
export const isAdminRole = (role?: string) => ADMIN_ROLES.includes(String(role || '').toLowerCase());

const termNo = (v: any): string => {
    const s = String(v ?? '').toLowerCase();
    const d = s.match(/\d+/);
    if (d) return d[0];
    if (/\bone\b|first/.test(s)) return '1';
    if (/\btwo\b|second/.test(s)) return '2';
    if (/\bthree\b|third/.test(s)) return '3';
    return s.trim();
};
const years = (v: any): string[] => String(v ?? '').match(/\b(19|20)\d{2}\b/g) || [];
const toDate = (v: any) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

export interface MarksWindow { term: string; year: string; label: string }

export async function marksWindow(db: Db): Promise<MarksWindow | null> {
    const t: TermInfo | null = await currentTerm(db).catch(() => null);
    if (!t) return null;
    return { term: t.term, year: t.year, label: t.label || `${t.term} ${t.year}`.trim() };
}

/** Is this exam in the current term? (true when no current term is set) */
export function examInWindow(exam: any, w: MarksWindow | null): boolean {
    if (!w) return true;
    if (!exam) return false;
    const eTerm = exam.term ?? exam.termName ?? '';
    const eYear = exam.academicYear ?? exam.year ?? '';
    const hasTerm = String(eTerm).trim() !== '';
    const hasYear = years(eYear).length > 0;
    if (hasTerm && termNo(eTerm) !== termNo(w.term)) return false;
    if (hasYear && years(w.year).length && !years(eYear).some(y => years(w.year).includes(y))) return false;
    if (hasTerm || hasYear) return true;
    // untagged exam: judge by when it was set or started — only this year's count
    const when = toDate(exam.startDate) || toDate(exam.createdAt);
    const wy = years(w.year);
    return !!when && (!wy.length || wy.includes(String(when.getFullYear())));
}

export const WINDOW_MESSAGE = (w: MarksWindow | null) =>
    `Marks can only be entered for ${w ? `${w.label}` : 'the current term'} exams. Ask an administrator to change marks for earlier exams.`;
