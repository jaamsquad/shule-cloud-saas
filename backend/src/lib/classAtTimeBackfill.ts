/**
 * Self-heal for exam_marks saved BEFORE classAtTime/classIdAtTime existed on this record
 * (the stamp that keeps a result attributed to the class a student was actually in when
 * they sat it — see auth.routes.ts's /staff-portal/marks and academics.routes.ts's bulk
 * marks route). Those older rows have nothing to fall back on but the student's CURRENT
 * class, which is wrong once they've been promoted — exactly the "Form 4" showing on a
 * Form 3 exam problem.
 *
 * Recovers the real historical class from the student's own classHistory (written by every
 * promotion — services/promotion.service.ts, routes/academics-v2.routes.ts's /v2/promotions):
 * each entry records the class+academicYear the student LEFT. If the exam's academic year
 * matches one of those entries, that's the class they were in for it. If the student hasn't
 * been promoted since that year, their current class is still correct. Otherwise it's left
 * alone — better to keep the existing (if imperfect) fallback than guess wrong.
 *
 * Idempotent and cheap to call before any read of exam_marks for one exam — it only ever
 * touches rows still missing classAtTime, so a second call is a no-op.
 */
import { Db, ObjectId } from 'mongodb';

const toOid = (v: any): ObjectId | null => { try { return new ObjectId(String(v)); } catch { return null; } };

export async function backfillClassAtTimeForExam(db: Db, examId: string): Promise<void> {
    try {
        const missing = await db.collection('exam_marks')
            .find({ examId: String(examId), $or: [{ classAtTime: { $exists: false } }, { classAtTime: '' }, { classAtTime: null }] }, { projection: { _id: 1, studentId: 1 } })
            .toArray();
        if (!missing.length) return;

        const exam: any = await db.collection('exams').findOne({ _id: toOid(examId) || (examId as any) }).catch(() => null);
        const examYear = String(exam?.academicYear ?? exam?.year ?? '').trim();
        if (!examYear) return;   // no year on the exam — nothing reliable to match against

        const studentIds = [...new Set(missing.map((m: any) => String(m.studentId)))];
        const oids = studentIds.map(toOid).filter(Boolean) as ObjectId[];
        const students = oids.length ? await db.collection('students').find({ _id: { $in: oids } }).toArray().catch(() => []) : [];
        const byId = new Map(students.map((s: any) => [String(s._id), s]));

        const ops: any[] = [];
        for (const m of missing) {
            const student = byId.get(String(m.studentId));
            if (!student) continue;
            const hist: any[] = Array.isArray(student.classHistory) ? student.classHistory : [];
            const entry = hist.find((h: any) => String(h.academicYear) === examYear);
            let className = '', classId = '';
            if (entry) { className = String(entry.className || '').trim(); classId = String(entry.classId || ''); }
            else if (String(student.academicYear || '') === examYear) { className = String(student.studentClass || student.currentClass || '').trim(); classId = String(student.classId || ''); }
            if (!className) continue;
            ops.push({ updateOne: { filter: { _id: m._id }, update: { $set: { classAtTime: className, classIdAtTime: classId } } } });
        }
        if (ops.length) await db.collection('exam_marks').bulkWrite(ops, { ordered: false }).catch(() => {});
    } catch { /* best-effort — a report must still render even if this fails */ }
}
