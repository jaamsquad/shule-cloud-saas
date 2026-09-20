/**
 * Term handling for the CBC module.
 *
 * The school's terms live in `terms` (academic-years module, `isActive` = current) with
 * the legacy `periods` collection (`isCurrent`) as a fallback. CBC records — activities,
 * assessments, comments — belong to one term. A record is tagged with `term` + `year`
 * when it is created; older records were saved without a tag, so those are placed in a
 * term by their date (activity date, else created date) falling inside the term's dates.
 */
import { Db } from 'mongodb';

export interface TermInfo {
    term: string;        // "Term 1"
    year: string;        // "2026"
    label: string;       // "Term 1 2026"
    isCurrent: boolean;
    start: Date | null;
    end: Date | null;
    order: number;
}

const norm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const toDate = (v: any): Date | null => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

// Every term the school has, newest first. `isCurrent` marks the one in use now.
export async function loadTerms(db: Db): Promise<TermInfo[]> {
    const rows: any[] = await db.collection('terms').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
    let list: TermInfo[] = rows.map(t => {
        const term = String(t.name || '').trim(), year = String(t.academicYear ?? '');
        return { term, year, label: `${term} ${year}`.trim(), isCurrent: !!t.isActive, start: toDate(t.startDate), end: toDate(t.endDate), order: Number(t.termNumber) || 0 };
    }).filter(t => t.term);

    if (!list.length) {
        const periods: any[] = await db.collection('periods').find({}).toArray().catch(() => []);
        list = periods.map(p => {
            const term = String(p.term || p.label || p.name || p.title || '').trim(), year = String(p.academicYear ?? '');
            return { term, year, label: `${term} ${year}`.trim(), isCurrent: !!p.isCurrent, start: toDate(p.startDate), end: toDate(p.endDate), order: 0 };
        }).filter(t => t.term);
    }
    return list.sort((a, b) => b.year.localeCompare(a.year) || b.order - a.order);
}

// The term in use now: the one flagged current, else the one whose dates include today.
export function pickCurrent(terms: TermInfo[]): TermInfo | null {
    const flagged = terms.find(t => t.isCurrent);
    if (flagged) return flagged;
    const now = Date.now();
    return terms.find(t => t.start && t.end && now >= t.start.getTime() && now <= t.end.getTime() + 86_400_000 - 1) || null;
}

export async function currentTerm(db: Db): Promise<TermInfo | null> {
    return pickCurrent(await loadTerms(db));
}

// Does this record belong to `sel`? (see file header for how untagged records are placed)
export function belongsToTerm(doc: any, sel: TermInfo): boolean {
    const tag = norm(doc?.term);
    if (tag) {
        if (tag === norm(sel.label)) return true;                       // tagged with the full label
        return tag === norm(sel.term) && (!doc.year || String(doc.year) === sel.year);
    }
    const when = toDate(doc?.date) || toDate(doc?.createdAt);
    if (!when || !sel.start || !sel.end) return false;
    return when.getTime() >= sel.start.getTime() && when.getTime() <= sel.end.getTime() + 86_400_000 - 1;
}

export const termOption = (t: TermInfo) => ({ term: t.term, year: t.year, label: t.label, isCurrent: t.isCurrent });
