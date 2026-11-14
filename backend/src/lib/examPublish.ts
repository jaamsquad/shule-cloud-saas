/**
 * Exam results publishing (Exams → Manage Exams): results are released per exam AND class.
 *
 *  - Exams created from now on are marked `publishing: 'manual'`: their results stay hidden
 *    (merit list, analytics, report cards, portals, result links) until the class is published.
 *  - Exams that existed before publishing was introduced keep showing their results, so no
 *    school loses what it already had; an admin can still unpublish them per class.
 *  - A publication record { examId, classKey, status } in `exam_publications` decides.
 *
 * Mark entry, moderation and HOD analysis read marks directly and are not affected.
 */
import { Db } from 'mongodb';

export const PUBLICATIONS = 'exam_publications';

/** Class-level key for a mark or class label: "FORM 3 East" → "form 3"; v2 class ids as-is. */
export const levelKey = (label: any) => {
    const s = String(label || '').trim();
    const m = s.match(/(form|grade|pp|class|year)\s*\d+/i);
    return (m ? m[0] : s).toLowerCase().replace(/\s+/g, ' ').trim();
};

export interface PublishedView {
    /** true when this mark's results may be shown */
    ok: (mark: any) => boolean;
    /** status for an exam × class (for the manage page) */
    statusOf: (examId: string, classId?: string, className?: string) => 'Published' | 'Pending';
    /** false for an exam with nothing published yet (hide it from result pickers) */
    examListed: (examId: string) => boolean;
}

export async function publishedView(db: Db): Promise<PublishedView> {
    const [exams, pubs] = await Promise.all([
        db.collection('exams').find({}, { projection: { publishing: 1 } }).toArray().catch(() => [] as any[]),
        db.collection(PUBLICATIONS).find({}).toArray().catch(() => [] as any[]),
    ]);
    const manual = new Set(exams.filter((e: any) => e.publishing === 'manual').map((e: any) => String(e._id)));
    // examId → key → status   (key: "id:<classId>" or "lvl:<level>")
    const byExam = new Map<string, Map<string, string>>();
    for (const p of pubs) {
        const m = byExam.get(String(p.examId)) || new Map<string, string>();
        if (p.classId) m.set(`id:${p.classId}`, p.status);
        if (p.className) m.set(`lvl:${levelKey(p.className)}`, p.status);
        byExam.set(String(p.examId), m);
    }
    const statusOf = (examId: string, classId?: string, className?: string): 'Published' | 'Pending' => {
        const m = byExam.get(String(examId));
        const rec = m && ((classId && m.get(`id:${classId}`)) || (className && m.get(`lvl:${levelKey(className)}`)));
        if (rec) return rec === 'Published' ? 'Published' : 'Pending';
        return manual.has(String(examId)) ? 'Pending' : 'Published';
    };
    const ok = (mark: any) => {
        if (!mark) return false;
        const examId = String(mark.examId ?? mark.exam_id ?? '');
        if (!examId) return true;
        if (!byExam.has(examId) && !manual.has(examId)) return true; // fast path: legacy, never touched
        return statusOf(examId, String(mark.classIdAtTime || mark.classId || '') || undefined, mark.classAtTime || mark.className) === 'Published';
    };
    const examListed = (examId: string) => {
        if (!manual.has(String(examId))) return true;
        const m = byExam.get(String(examId));
        return !!m && [...m.values()].includes('Published');
    };
    return { ok, statusOf, examListed };
}

/** Keep only marks whose results are published. */
export async function onlyPublished<T = any>(db: Db, marks: T[]): Promise<T[]> {
    if (!marks?.length) return marks || [];
    const v = await publishedView(db);
    return marks.filter(v.ok);
}

/**
 * Exam ids an admin chose to LOCK when publishing ("avoid teachers uploading marks again for
 * this exam"): no non-admin may record marks for them, and they drop off a teacher's marks-
 * entry picker. Admins can still unpublish or edit to fix a mistake.
 */
export async function lockedExamIds(db: Db): Promise<Set<string>> {
    const pubs = await db.collection(PUBLICATIONS).find({ locked: true }).toArray().catch(() => [] as any[]);
    return new Set(pubs.map((p: any) => String(p.examId)));
}
