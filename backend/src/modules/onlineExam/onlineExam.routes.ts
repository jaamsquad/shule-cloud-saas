/**
 * Online Examination Module — teacher/admin authoring routes.
 *
 * Mounted under /api/v1. Uses req.tenantDb (admin/teacher app). Every exam is
 * scoped to organization + branch + class + stream + subject. Student-facing
 * exam-taking lives in onlineExam.student.routes.ts.
 */
import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../../lib/mongodb';
import { DEFAULT_SETTINGS, EXAM_STATUS, QUESTION_TYPES } from './onlineExam.types';

const router = Router();
const db = (req: any): Db => (req.tenantDb as Db) || getMetaDb();
const oid = (id: string) => { try { return new ObjectId(String(id)); } catch { return null; } };
const now = () => new Date();

// Branch + actor context from the request (multi-branch scoping + audit).
const ctx = (req: any) => ({
    branchId: String(req.headers['x-branch-id'] || req.query.branchId || (req as any).tenantContext?.branchId || ''),
    actorId: String((req as any).user?.id || (req as any).user?.staffId || 'system'),
    actorName: String((req as any).user?.name || 'Staff'),
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
    ua: String(req.headers['user-agent'] || ''),
});

async function audit(database: Db, req: any, action: string, examId: string, meta: any = {}) {
    const c = ctx(req);
    await database.collection('online_exam_audit').insertOne({
        action, examId, branchId: c.branchId, actorId: c.actorId, actorName: c.actorName,
        ip: c.ip, browser: c.ua, ...meta, at: now(),
    }).catch(() => { /* audit is best-effort */ });
}

// ─── Exams ─────────────────────────────────────────────────────────────────────

// List exams (branch-scoped; org admins pass ?all=1 to see every branch).
router.get('/online-exams', async (req: Request, res: Response) => {
    try {
        const database = db(req); const c = ctx(req);
        const q: any = { deletedAt: { $exists: false } };
        if (c.branchId && req.query.all !== '1') q.branchId = c.branchId;
        ['classId', 'streamId', 'subjectId', 'status', 'category', 'term', 'academicYear', 'teacherId'].forEach(f => {
            if (req.query[f]) q[f] = String(req.query[f]);
        });
        const exams = await database.collection('online_exams').find(q).sort({ createdAt: -1 }).toArray();
        // Attach a question count per exam.
        const ids = exams.map((e: any) => String(e._id));
        const counts = await database.collection('online_exam_questions').aggregate([
            { $match: { examId: { $in: ids }, deletedAt: { $exists: false } } },
            { $group: { _id: '$examId', n: { $sum: 1 }, marks: { $sum: '$marks' } } },
        ]).toArray().catch(() => []);
        const byExam: Record<string, any> = {}; counts.forEach((c: any) => byExam[String(c._id)] = c);
        res.json(exams.map((e: any) => ({ ...e, questionCount: byExam[String(e._id)]?.n || 0, computedMarks: byExam[String(e._id)]?.marks || 0 })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/online-exams/:id', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const exam = await database.collection('online_exams').findOne({ _id: oid(req.params.id)! });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        const questions = await database.collection('online_exam_questions')
            .find({ examId: req.params.id, deletedAt: { $exists: false } }).sort({ order: 1 }).toArray();
        res.json({ ...exam, questions });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Create exam.
router.post('/online-exams', async (req: Request, res: Response) => {
    try {
        const database = db(req); const c = ctx(req); const b = req.body || {};
        if (!b.examName) return res.status(400).json({ message: 'Exam name is required' });
        const doc = {
            examName: b.examName,
            academicYear: b.academicYear || '', term: b.term || '', termId: b.termId || null,
            category: b.category || 'CAT',
            branchId: b.branchId || c.branchId || '',
            classId: b.classId || '', className: b.className || '',
            streamId: b.streamId || '', streamName: b.streamName || '',
            subjectId: b.subjectId || '', subjectName: b.subjectName || '',
            teacherId: b.teacherId || c.actorId, teacherName: b.teacherName || c.actorName,
            startAt: b.startAt ? new Date(b.startAt) : null,
            endAt: b.endAt ? new Date(b.endAt) : null,
            durationMinutes: Number(b.durationMinutes) || 60,
            totalMarks: Number(b.totalMarks) || 0,
            passMark: Number(b.passMark) || 0,
            instructions: b.instructions || '',
            status: 'Draft',
            settings: { ...DEFAULT_SETTINGS, ...(b.settings || {}) },
            createdBy: c.actorId, createdAt: now(), updatedAt: now(),
        };
        const r = await database.collection('online_exams').insertOne(doc);
        await audit(database, req, 'EXAM_CREATED', String(r.insertedId), { examName: doc.examName });
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Update exam (settings/schedule/etc). Cannot edit a Published exam's questions
// silently — but metadata edits are allowed; publishing is a separate action.
router.patch('/online-exams/:id', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const update: any = { updatedAt: now() };
        const allowed = ['examName', 'academicYear', 'term', 'termId', 'category', 'classId', 'className',
            'streamId', 'streamName', 'subjectId', 'subjectName', 'teacherId', 'teacherName',
            'startAt', 'endAt', 'durationMinutes', 'totalMarks', 'passMark', 'instructions'];
        allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = (f === 'startAt' || f === 'endAt') ? (req.body[f] ? new Date(req.body[f]) : null) : req.body[f]; });
        if (req.body.settings) update.settings = { ...DEFAULT_SETTINGS, ...req.body.settings };
        await database.collection('online_exams').updateOne({ _id: oid(req.params.id)! }, { $set: update });
        await audit(database, req, 'EXAM_UPDATED', req.params.id);
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Change status (Draft → Published → Closed).
router.post('/online-exams/:id/status', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const status = String(req.body?.status || '');
        if (!EXAM_STATUS.includes(status as any)) return res.status(400).json({ message: 'Invalid status' });
        if (status === 'Published') {
            const n = await database.collection('online_exam_questions').countDocuments({ examId: req.params.id, deletedAt: { $exists: false } });
            if (n === 0) return res.status(400).json({ message: 'Add at least one question before publishing.' });
        }
        await database.collection('online_exams').updateOne({ _id: oid(req.params.id)! }, { $set: { status, updatedAt: now(), ...(status === 'Published' ? { publishedAt: now() } : {}) } });
        await audit(database, req, status === 'Published' ? 'EXAM_PUBLISHED' : `EXAM_${status.toUpperCase()}`, req.params.id);
        res.json({ message: `Exam ${status.toLowerCase()}` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/online-exams/:id', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        await database.collection('online_exams').updateOne({ _id: oid(req.params.id)! }, { $set: { deletedAt: now() } });
        await audit(database, req, 'EXAM_DELETED', req.params.id);
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Questions ───────────────────────────────────────────────────────────────

router.get('/online-exams/:id/questions', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const questions = await database.collection('online_exam_questions')
            .find({ examId: req.params.id, deletedAt: { $exists: false } }).sort({ order: 1 }).toArray();
        res.json(questions);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Add a question to an exam. Stores type-specific fields + rich content blocks.
router.post('/online-exams/:id/questions', async (req: Request, res: Response) => {
    try {
        const database = db(req); const b = req.body || {};
        if (!QUESTION_TYPES.includes(b.type)) return res.status(400).json({ message: 'Invalid question type' });
        const last = await database.collection('online_exam_questions').find({ examId: req.params.id }).sort({ order: -1 }).limit(1).toArray();
        const order = b.order ?? ((last[0]?.order ?? -1) + 1);
        const doc = {
            examId: req.params.id, order,
            type: b.type,
            questionText: b.questionText || '',
            // Rich content: images/tables/equations/audio/video/diagrams/attachments.
            media: Array.isArray(b.media) ? b.media : [],
            attachments: Array.isArray(b.attachments) ? b.attachments : [],
            explanation: b.explanation || '',
            marks: Number(b.marks) || 1,
            section: b.section || '',
            // Type-specific payloads (only the relevant ones are read at mark time).
            options: Array.isArray(b.options) ? b.options : [],            // mcq
            correctAnswer: b.correctAnswer ?? '',                          // single/tf/numeric/fill
            correctAnswers: Array.isArray(b.correctAnswers) ? b.correctAnswers : [], // mcq_multiple/fill
            tolerance: b.tolerance != null ? Number(b.tolerance) : 0,      // numeric
            pairs: Array.isArray(b.pairs) ? b.pairs : [],                  // matching
            correctOrder: Array.isArray(b.correctOrder) ? b.correctOrder : [], // ordering
            items: Array.isArray(b.items) ? b.items : [],                  // ordering display items
            autoMark: b.autoMark !== false,                                // fill_blank toggle
            allowedFileTypes: Array.isArray(b.allowedFileTypes) ? b.allowedFileTypes : ['pdf', 'doc', 'docx', 'png', 'jpg', 'zip'],
            rubric: b.rubric || '',
            createdAt: now(), updatedAt: now(),
        };
        const r = await database.collection('online_exam_questions').insertOne(doc);
        await recomputeTotal(database, req.params.id);
        await audit(database, req, 'QUESTION_ADDED', req.params.id, { questionId: String(r.insertedId), type: b.type });
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/online-exams/:id/questions/:qid', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const update: any = { ...req.body, updatedAt: now() };
        delete update._id; delete update.examId;
        if (update.marks != null) update.marks = Number(update.marks);
        await database.collection('online_exam_questions').updateOne({ _id: oid(req.params.qid)! }, { $set: update });
        await recomputeTotal(database, req.params.id);
        await audit(database, req, 'QUESTION_EDITED', req.params.id, { questionId: req.params.qid });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/online-exams/:id/questions/:qid', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        await database.collection('online_exam_questions').updateOne({ _id: oid(req.params.qid)! }, { $set: { deletedAt: now() } });
        await recomputeTotal(database, req.params.id);
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Reorder questions: body = { order: [qid, qid, ...] }.
router.post('/online-exams/:id/questions/reorder', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const ids: string[] = Array.isArray(req.body?.order) ? req.body.order : [];
        await Promise.all(ids.map((qid, i) => database.collection('online_exam_questions').updateOne({ _id: oid(qid)! }, { $set: { order: i } })));
        res.json({ message: 'Reordered' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Publish results to the main Exams module (ScholarSheet + analytics) ────────
// Simple bridge: ensure a matching exam exists in the `exams` collection, then write
// each submitted attempt's score into `exam_marks` (the collection ScholarSheet and
// analytics already read). Online exam → one subject → one mark per student.
router.post('/online-exams/:id/publish-results', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const exam: any = await database.collection('online_exams').findOne({ _id: oid(req.params.id)! });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // 1) Ensure a linked exam in the main `exams` collection (create once).
        let mainExamId: string = exam.mainExamId || '';
        if (!mainExamId) {
            const examDoc = {
                examName: exam.examName,
                type: exam.category || 'CAT',
                term: exam.term || '', academicYear: exam.academicYear || String(new Date().getFullYear()),
                classLevel: exam.className || 'All Classes',
                status: 'Active', publishStatus: 'Published',
                source: 'online_exam', onlineExamId: String(exam._id),
                createdAt: now(), updatedAt: now(),
            };
            const r = await database.collection('exams').insertOne(examDoc);
            mainExamId = String(r.insertedId);
            await database.collection('online_exams').updateOne({ _id: exam._id }, { $set: { mainExamId } });
        }

        // 2) Write each submitted/marked attempt's score into exam_marks.
        const attempts = await database.collection('online_exam_attempts').find({
            examId: req.params.id, status: { $in: ['submitted', 'auto_submitted', 'marked', 'published'] },
        }).toArray().catch(() => []);
        const totalMarks = Number(exam.totalMarks) || 100;
        const subjectName = exam.subjectName || 'Online Exam';

        let written = 0, pending = 0;
        const ops = attempts.map((a: any) => {
            // finalScore = autoScore when no manual marking is needed; else the marked total.
            const score = a.finalScore != null ? a.finalScore : (a.needsManual ? null : a.autoScore);
            if (score == null) { pending++; return null; }
            written++;
            const cls = a.className || exam.className || '';
            return {
                updateOne: {
                    filter: { studentId: String(a.studentId), examId: mainExamId, subjectId: exam.subjectId || subjectName },
                    update: {
                        $set: {
                            studentId: String(a.studentId), examId: mainExamId,
                            subjectId: exam.subjectId || subjectName, subjectName,
                            marksObtained: Number(score), totalMarks,
                            className: cls, updatedAt: now(), source: 'online_exam',
                        },
                        $setOnInsert: { createdAt: now(), classAtTime: cls, academicYear: exam.academicYear || String(new Date().getFullYear()) },
                    },
                    upsert: true,
                },
            };
        }).filter(Boolean) as any[];

        if (ops.length) await database.collection('exam_marks').bulkWrite(ops);
        // Mark published attempts.
        await database.collection('online_exam_attempts').updateMany({ examId: req.params.id, status: { $in: ['submitted', 'auto_submitted', 'marked'] }, finalScore: { $ne: null } }, { $set: { status: 'published' } }).catch(() => {});
        await audit(database, req, 'RESULTS_PUBLISHED', req.params.id, { mainExamId, written, pending });

        res.json({ ok: true, mainExamId, written, pending, message: pending ? `${written} published · ${pending} awaiting manual marking` : `${written} result(s) published to report cards` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Keep exam.totalMarks in sync with the sum of its questions' marks.
async function recomputeTotal(database: Db, examId: string) {
    const agg = await database.collection('online_exam_questions').aggregate([
        { $match: { examId, deletedAt: { $exists: false } } },
        { $group: { _id: null, total: { $sum: '$marks' } } },
    ]).toArray().catch(() => []);
    await database.collection('online_exams').updateOne({ _id: oid(examId)! }, { $set: { totalMarks: agg[0]?.total || 0, updatedAt: now() } });
}

export default router;
