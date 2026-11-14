/**
 * Self-heal for exam_marks written by an online exam publish BEFORE onlineCategory
 * existed on the record (modules/onlineExam/onlineExam.routes.ts's publish-results).
 * Those older rows carry `source: 'online_exam'` but no category, so the report card
 * can't tell them apart from the parent exam's own type and folds them under the
 * parent's column instead of giving them their own (see reports.routes.ts's
 * onlineMarkType) — exactly the "I don't see the CAT column" problem.
 *
 * Recovers the category from the online exam doc that produced the mark: it's
 * attached to this same main exam (parentExamId/mainExamId) and covers the same
 * subject. Idempotent and cheap to call before any read — it only ever touches rows
 * still missing onlineCategory, so a second call is a no-op.
 */
import { Db } from 'mongodb';

export async function backfillOnlineCategoryForExam(db: Db, examId: string): Promise<void> {
    try {
        const stale = await db.collection('exam_marks')
            .find({ examId: String(examId), source: 'online_exam', $or: [{ onlineCategory: { $exists: false } }, { onlineCategory: '' }] }, { projection: { _id: 1, subjectId: 1, subjectName: 1 } })
            .toArray();
        if (!stale.length) return;

        const onlineExams = await db.collection('online_exams')
            .find({ $or: [{ parentExamId: String(examId) }, { mainExamId: String(examId) }] }, { projection: { subjectId: 1, subjectName: 1, category: 1 } })
            .toArray().catch(() => []);
        if (!onlineExams.length) return;

        const key = (subjectId: any, subjectName: any) => String(subjectId || subjectName || '').toLowerCase().trim();
        const catBySubject: Record<string, string> = {};
        onlineExams.forEach((oe: any) => { const k = key(oe.subjectId, oe.subjectName); if (k && oe.category) catBySubject[k] = oe.category; });

        const ops = stale.map((m: any) => {
            const cat = catBySubject[key(m.subjectId, m.subjectName)];
            if (!cat) return null;
            return { updateOne: { filter: { _id: m._id }, update: { $set: { onlineCategory: cat } } } };
        }).filter(Boolean) as any[];
        if (ops.length) await db.collection('exam_marks').bulkWrite(ops);
    } catch { /* best-effort — a failed backfill just leaves the old (still correct) marks as-is */ }
}
