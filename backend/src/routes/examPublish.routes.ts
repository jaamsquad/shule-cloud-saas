/**
 * Exams → Manage Exams: every exam × class with its results status, and publish / unpublish.
 * Unpublished results are hidden everywhere results are shown (lib/examPublish).
 */
import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { publishedView, PUBLICATIONS, levelKey } from '../lib/examPublish';
import { enforceCrud } from '../lib/permissions';
import { formatExamName } from '../lib/examName';

const router = Router();
const db = (req: Request): Db => ((req as any).tenantDb as Db) || getMetaDb();
const actorOf = (req: Request) => { const u = (req as any).tenantContext?.user || {}; return String(u.name || u.fullName || u.email || u.staffId || 'Admin'); };
const termNo = (t: any) => Number(String(t || '').match(/\d+/)?.[0] || 0);

// GET /exam-publishing?year=2026 → [{ year, terms: [{ term, exams: [{ ...exam, classes: [...] }] }] }]
router.get('/exam-publishing', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const year = String(req.query.year || '').trim();
        const examFilter: any = year ? { academicYear: { $in: [year, Number(year)] } } : {};
        const [exams, view, pubs, v2] = await Promise.all([
            d.collection('exams').find(examFilter).toArray().catch(() => [] as any[]),
            publishedView(d),
            d.collection(PUBLICATIONS).find({}).toArray().catch(() => [] as any[]),
            d.collection('v2_classes').find({ deletedAt: { $exists: false } }, { projection: { name: 1, level: 1 } }).toArray().catch(() => [] as any[]),
        ]);
        const ids = exams.map((e: any) => String(e._id));
        // one row per exam × class: how many marks, students, subjects, last change
        const groups: any[] = ids.length ? await d.collection('exam_marks').aggregate([
            { $match: { examId: { $in: ids } } },
            { $group: {
                _id: { examId: '$examId', classId: { $ifNull: ['$classIdAtTime', '$classId'] }, className: { $ifNull: ['$classAtTime', '$className'] } },
                marks: { $sum: 1 }, students: { $addToSet: '$studentId' }, subjects: { $addToSet: '$subjectName' },
                updatedAt: { $max: { $ifNull: ['$updatedAt', '$createdAt'] } },
            } },
        ]).toArray().catch(() => []) : [];
        const levelOrder = new Map(v2.map((c: any) => [levelKey(c.name), Number(c.level) || 0]));
        const pubBy = (examId: string, classId: string, className: string) =>
            pubs.find((p: any) => String(p.examId) === examId && ((classId && String(p.classId || '') === classId) || levelKey(p.className) === levelKey(className)));

        const rowsByExam = new Map<string, any[]>();
        for (const g of groups) {
            const examId = String(g._id.examId);
            const classId = String(g._id.classId || '');
            const className = String(g._id.className || 'Class');
            const list = rowsByExam.get(examId) || [];
            // merge rows that are the same class level (old marks without a class id)
            const same = list.find(r => (classId && r.classId === classId) || levelKey(r.className) === levelKey(className));
            if (same) {
                same.marks += g.marks; same.students = Array.from(new Set([...same.students, ...g.students.map(String)]));
                same.subjects = Array.from(new Set([...same.subjects, ...g.subjects.filter(Boolean)]));
                if (g.updatedAt && (!same.updatedAt || g.updatedAt > same.updatedAt)) same.updatedAt = g.updatedAt;
                if (!same.classId && classId) same.classId = classId;
                continue;
            }
            list.push({ classId, className, marks: g.marks, students: g.students.map(String), subjects: g.subjects.filter(Boolean), updatedAt: g.updatedAt || null });
            rowsByExam.set(examId, list);
        }

        const out: Record<string, Record<string, any[]>> = {};
        for (const e of exams) {
            const examId = String(e._id);
            const classes = (rowsByExam.get(examId) || []).map(r => {
                const p = pubBy(examId, r.classId, r.className);
                return {
                    classId: r.classId, className: r.className,
                    students: r.students.length, subjects: r.subjects.length, marks: r.marks,
                    updatedAt: r.updatedAt,
                    status: view.statusOf(examId, r.classId || undefined, r.className),
                    publishedAt: p?.status === 'Published' ? p.at : null,
                    publishedBy: p?.status === 'Published' ? p.by : null,
                    changedBy: p?.by || null, changedAt: p?.at || null,
                };
            }).sort((a, b) => (levelOrder.get(levelKey(a.className)) ?? 99) - (levelOrder.get(levelKey(b.className)) ?? 99) || a.className.localeCompare(b.className));
            const y = String(e.academicYear || e.year || 'Other');
            const t = String(e.term || 'Other');
            ((out[y] ||= {})[t] ||= []).push({
                _id: examId, title: formatExamName(e), examName: e.examName || e.name || 'Exam', type: e.type || '',
                term: t, academicYear: y, classLevel: e.classLevel || '', createdAt: e.createdAt || null,
                manual: e.publishing === 'manual', classes,
            });
        }
        const years = Object.keys(out).sort((a, b) => Number(b) - Number(a) || b.localeCompare(a)).map(yr => ({
            year: yr,
            terms: Object.keys(out[yr]).sort((a, b) => termNo(b) - termNo(a) || b.localeCompare(a)).map(t => ({
                term: t,
                exams: out[yr][t].sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
            })),
        }));
        res.json({ years });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

async function setStatus(req: Request, res: Response, status: 'Published' | 'Unpublished') {
    try {
        const d = db(req);
        const examId = String(req.params.examId);
        const classId = String(req.body?.classId || '').trim();
        const className = String(req.body?.className || '').trim();
        if (!classId && !className) return res.status(400).json({ message: 'Which class?' });
        const exam = await d.collection('exams').findOne({ _id: (ObjectId.isValid(examId) ? new ObjectId(examId) : examId) as any }).catch(() => null);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        if (status === 'Published') {
            const has = await d.collection('exam_marks').countDocuments({ examId, $or: [...(classId ? [{ classId }, { classIdAtTime: classId }] : []), ...(className ? [{ className }, { classAtTime: className }] : [])] }).catch(() => 0);
            if (!has) return res.status(400).json({ message: 'There are no marks for this class yet.' });
        }
        const filter: any = { examId, ...(classId ? { classId } : { classKey: levelKey(className) }) };
        const by = actorOf(req);
        // Publishing may also lock marks entry for this exam ("avoid teachers uploading marks
        // again"); unpublishing always unlocks it so the mistake can be fixed and republished.
        const locked = status === 'Published' ? !!req.body?.lock : false;
        await d.collection(PUBLICATIONS).updateOne(filter, {
            $set: { examId, classId: classId || null, className, classKey: levelKey(className), status, by, at: new Date(), locked },
            $push: { history: { status, by, at: new Date(), locked } } as any,
        }, { upsert: true });
        res.json({
            message: `${status === 'Published' ? `Results published for ${className || 'the class'}` : `Results unpublished for ${className || 'the class'}`}${locked ? ' — marks entry locked for this exam.' : ''}`,
            status, locked,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
}

router.post('/exam-publishing/:examId/publish', enforceCrud('exams', 'update'), (req, res) => setStatus(req, res, 'Published'));
router.post('/exam-publishing/:examId/unpublish', enforceCrud('exams', 'update'), (req, res) => setStatus(req, res, 'Unpublished'));

// Delete one class's results for an exam (the exam itself stays).
router.post('/exam-publishing/:examId/delete-results', enforceCrud('exams', 'delete'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const examId = String(req.params.examId);
        const classId = String(req.body?.classId || '').trim();
        const className = String(req.body?.className || '').trim();
        if (!classId && !className) return res.status(400).json({ message: 'Which class?' });
        const or = [...(classId ? [{ classId }, { classIdAtTime: classId }] : []), ...(className ? [{ className }, { classAtTime: className }] : [])];
        const r = await d.collection('exam_marks').deleteMany({ examId, $or: or });
        await d.collection(PUBLICATIONS).deleteMany({ examId, $or: [...(classId ? [{ classId }] : []), { classKey: levelKey(className) }] }).catch(() => {});
        res.json({ message: `Deleted ${r.deletedCount} mark(s) for ${className || 'the class'}`, deleted: r.deletedCount });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
