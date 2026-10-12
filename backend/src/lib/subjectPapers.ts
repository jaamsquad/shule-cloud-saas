/**
 * A subject can be split into weighted papers (Paper 1, Paper 2, ...), each configured in
 * General Settings → Subject Paper Ratios with its own max score ("out of") and ratio.
 * Marks entry (admin and teacher portal) lets the marker pick a paper when a subject has
 * any configured; the subject's overall score is then the ratio-weighted average of
 * whichever papers have been scored so far, normalised to each paper's own "out of" so a
 * paper marked out of 50 counts the same as one out of 100 once weighted.
 */
import { Db } from 'mongodb';

export interface SubjectPaperDef { _id: string; subjectId: string; label: string; outOf: number; ratio: number }

export async function papersForSubject(db: Db, subjectId: string): Promise<SubjectPaperDef[]> {
    if (!subjectId) return [];
    const rows: any[] = await db.collection('subject_papers').find({ subjectId: String(subjectId) }).toArray().catch(() => []);
    return rows.map(r => ({ _id: String(r._id), subjectId: String(r.subjectId), label: String(r.label || ''), outOf: Number(r.outOf) || 100, ratio: Number(r.ratio) || 1 }));
}

/** The teacher portal identifies a subject by name, not id — resolve it first (subject_papers
 * is keyed by subjectId). Returns [] if no subject with that name is on file. */
export async function papersForSubjectName(db: Db, subjectName: string): Promise<SubjectPaperDef[]> {
    if (!subjectName) return [];
    const exact: any = await db.collection('subjects').findOne({ $or: [{ name: subjectName }, { subjectName }] }).catch(() => null);
    if (exact) return papersForSubject(db, String(exact._id));
    // The name on a teacher's assignment is captured once and never updated if the subject
    // is later renamed/re-cased — fall back to a trim + case-insensitive match so a stale
    // name still resolves instead of silently returning no papers. Prefer the subjectId
    // path (papersForSubject) wherever the caller has it; this is a safety net only.
    const nrm = String(subjectName).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!nrm) return [];
    const esc = nrm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const rx = new RegExp(`^${esc}$`, 'i');
    const fuzzy: any = await db.collection('subjects').findOne({ $or: [{ name: rx }, { subjectName: rx }] }).catch(() => null);
    return fuzzy ? papersForSubject(db, String(fuzzy._id)) : [];
}

/** Combine per-paper scores (keyed by paper _id) into one subject score out of 100.
 * Only papers that have been scored so far count, so the combined score updates as each
 * paper comes in and settles once all configured papers are scored. Returns null if
 * nothing is scored yet. */
export function combinePapers(papers: Record<string, { marksObtained: number; totalMarks?: number }>, defs: SubjectPaperDef[]): { marksObtained: number; totalMarks: number } | null {
    const entries = Object.entries(papers || {});
    if (!entries.length) return null;
    let weighted = 0, ratioSum = 0;
    for (const [paperId, sc] of entries) {
        const def = defs.find(d => d._id === paperId);
        const outOf = def?.outOf || Number(sc.totalMarks) || 0;
        if (!outOf) continue;
        const ratio = def?.ratio ?? 1;
        weighted += (Number(sc.marksObtained) / outOf) * ratio;
        ratioSum += ratio;
    }
    if (!ratioSum) return null;
    return { marksObtained: Math.round((weighted / ratioSum) * 10000) / 100, totalMarks: 100 };
}
