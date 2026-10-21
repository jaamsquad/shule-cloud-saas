/**
 * Online Examination — student-portal exam-taking routes.
 *
 * Mounted under /api/v1. Authenticated via the portal `authed` wrapper passed in
 * from auth.routes (so we reuse the exact JWT + tenant-DB resolution students use).
 * One attempt per student per exam; answers autosave; submission marks auto-types
 * immediately and flags manual ones for the teacher.
 */
import { Router } from 'express';
import { Db, ObjectId } from 'mongodb';
import { autoMarkAttempt } from './onlineExam.marking';

const oid = (id: string) => { try { return new ObjectId(String(id)); } catch { return null; } };
const now = () => new Date();

// Strip answer keys before sending a question to a student.
function sanitizeForStudent(q: any) {
    const { correctAnswer, correctAnswers, tolerance, correctOrder, autoMark, rubric, explanation, ...safe } = q;
    // For matching, send lefts + shuffled rights without the mapping.
    if (q.type === 'matching') {
        safe.lefts = (q.pairs || []).map((p: any) => p.left);
        safe.rights = shuffle((q.pairs || []).map((p: any) => p.right));
    }
    return safe;
}
function shuffle<T>(a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

const examOpen = (exam: any) => {
    const t = Date.now();
    if (exam.status !== 'Published') return false;
    if (exam.startAt && t < new Date(exam.startAt).getTime()) return false;
    if (exam.endAt && t > new Date(exam.endAt).getTime()) return false;
    return true;
};

/**
 * Build the router. `authed` is the portal auth wrapper from auth.routes:
 *   authed((req, res, db, decoded) => Promise<void>)
 * `decoded.studentId` identifies the student.
 */
export function buildStudentExamRouter(authed: any) {
    const router = Router();

    const studentClassMatch = (exam: any, student: any) => {
        const norm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
        const classOk = !exam.classId || String(student.classId) === String(exam.classId) || norm(student.studentClass).includes(norm(exam.className));
        const streamOk = !exam.streamId || String(student.streamId) === String(exam.streamId) || norm(student.stream || student.streamName) === norm(exam.streamName);
        return classOk && streamOk;
    };

    // List exams visible to this student, grouped into upcoming / available / completed / missed.
    router.get('/student-portal/online-exams', authed(async (req: any, res: any, db: Db, decoded: any) => {
        const sid = String(decoded.studentId || '');
        const student: any = await db.collection('students').findOne({ _id: oid(sid)! }).catch(() => null);
        if (!student) return res.json({ upcoming: [], available: [], completed: [], missed: [] });
        const exams = await db.collection('online_exams').find({ status: { $in: ['Published', 'Closed'] }, deletedAt: { $exists: false } }).sort({ startAt: 1 }).toArray();
        const mine = exams.filter(e => studentClassMatch(e, student));
        const attempts = await db.collection('online_exam_attempts').find({ studentId: sid }).toArray();
        const attByExam: Record<string, any> = {}; attempts.forEach((a: any) => attByExam[String(a.examId)] = a);

        const t = Date.now();
        const out: any = { upcoming: [], available: [], completed: [], missed: [] };
        for (const e of mine) {
            const att = attByExam[String(e._id)];
            const card = { _id: e._id, examName: e.examName, subjectName: e.subjectName, category: e.category, durationMinutes: e.durationMinutes, totalMarks: e.totalMarks, startAt: e.startAt, endAt: e.endAt, status: att?.status || 'not_started' };
            const started = e.startAt ? new Date(e.startAt).getTime() : 0;
            const ended = e.endAt ? new Date(e.endAt).getTime() : Infinity;
            if (att && ['submitted', 'auto_submitted', 'marked', 'published'].includes(att.status)) out.completed.push(card);
            else if (started > t) out.upcoming.push(card);
            else if (t > ended) out.missed.push(card);
            else out.available.push(card);
        }
        res.json(out);
    }));

    // Start (or resume) an attempt — returns sanitized questions + saved answers.
    router.post('/student-portal/online-exams/:id/start', authed(async (req: any, res: any, db: Db, decoded: any) => {
        const sid = String(decoded.studentId || '');
        const exam: any = await db.collection('online_exams').findOne({ _id: oid(req.params.id)! });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        if (!examOpen(exam)) return res.status(403).json({ message: 'This exam is not open right now.' });
        const student: any = await db.collection('students').findOne({ _id: oid(sid)! }).catch(() => null);
        if (!student || !studentClassMatch(exam, student)) return res.status(403).json({ message: 'This exam is not for your class.' });

        let attempt: any = await db.collection('online_exam_attempts').findOne({ examId: req.params.id, studentId: sid });
        if (attempt && ['submitted', 'auto_submitted', 'marked', 'published'].includes(attempt.status)) {
            return res.status(403).json({ message: 'You have already completed this exam.' });
        }
        const resumed = !!attempt;   // an in-progress attempt already existed — continue it, don't restart.
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
        if (!attempt) {
            attempt = {
                examId: req.params.id, studentId: sid, studentName: student.studentName || student.name,
                classId: student.classId || '', className: student.studentClass || student.currentClass || '',
                streamId: student.streamId || '', streamName: student.stream || student.streamName || '',
                branchId: exam.branchId || '', subjectName: exam.subjectName || '',
                status: 'in_progress', answers: {}, flagged: [],
                startedAt: now(), lastSavedAt: now(),
                deadlineAt: new Date(Date.now() + (Number(exam.durationMinutes) || 60) * 60000),
                violations: 0, ip, browser: String(req.headers['user-agent'] || ''),
            };
            const r = await db.collection('online_exam_attempts').insertOne(attempt);
            attempt._id = r.insertedId;
            await db.collection('online_exam_audit').insertOne({ action: 'STUDENT_STARTED', examId: req.params.id, studentId: sid, ip, at: now() }).catch(() => {});
        }

        let questions = await db.collection('online_exam_questions').find({ examId: req.params.id, deletedAt: { $exists: false } }).sort({ order: 1 }).toArray();
        if (exam.settings?.randomizeQuestions) questions = shuffle(questions);
        const safe = questions.map((q: any) => {
            const s = sanitizeForStudent(q);
            if (exam.settings?.randomizeChoices && Array.isArray(s.options)) s.options = shuffle(s.options);
            return s;
        });
        res.json({
            exam: { _id: exam._id, examName: exam.examName, subjectName: exam.subjectName, instructions: exam.instructions, durationMinutes: exam.durationMinutes, totalMarks: exam.totalMarks, settings: exam.settings },
            attempt: { _id: attempt._id, status: attempt.status, answers: attempt.answers || {}, flagged: attempt.flagged || [], deadlineAt: attempt.deadlineAt, startedAt: attempt.startedAt, lastIndex: attempt.lastIndex || 0 },
            questions: safe,
            resumed,
        });
    }));

    // Autosave answers (called every few seconds). Refuses after submission/deadline.
    router.post('/student-portal/online-exams/:id/autosave', authed(async (req: any, res: any, db: Db, decoded: any) => {
        const sid = String(decoded.studentId || '');
        const attempt: any = await db.collection('online_exam_attempts').findOne({ examId: req.params.id, studentId: sid });
        if (!attempt) return res.status(404).json({ message: 'No attempt' });
        if (attempt.status !== 'in_progress') return res.status(409).json({ message: 'Attempt is closed' });
        const set: any = { lastSavedAt: now() };
        if (req.body?.answers && typeof req.body.answers === 'object') set.answers = { ...(attempt.answers || {}), ...req.body.answers };
        if (Array.isArray(req.body?.flagged)) set.flagged = req.body.flagged;
        if (Number.isInteger(req.body?.idx) && req.body.idx >= 0) set.lastIndex = req.body.idx;
        await db.collection('online_exam_attempts').updateOne({ _id: attempt._id }, { $set: set });
        res.json({ ok: true, savedAt: set.lastSavedAt });
    }));

    // Submit (manual or auto). Auto-marks objective types immediately.
    router.post('/student-portal/online-exams/:id/submit', authed(async (req: any, res: any, db: Db, decoded: any) => {
        const sid = String(decoded.studentId || '');
        const exam: any = await db.collection('online_exams').findOne({ _id: oid(req.params.id)! });
        const attempt: any = await db.collection('online_exam_attempts').findOne({ examId: req.params.id, studentId: sid });
        if (!exam || !attempt) return res.status(404).json({ message: 'Not found' });
        if (attempt.status !== 'in_progress') return res.json({ ok: true, alreadySubmitted: true });

        const answers = { ...(attempt.answers || {}), ...(req.body?.answers || {}) };
        const questions = await db.collection('online_exam_questions').find({ examId: req.params.id, deletedAt: { $exists: false } }).toArray();
        const { autoScore, needsManual, perQuestion } = autoMarkAttempt(questions, answers);

        const auto = req.body?.auto === true;
        await db.collection('online_exam_attempts').updateOne({ _id: attempt._id }, {
            $set: {
                answers, status: auto ? 'auto_submitted' : 'submitted',
                submittedAt: now(), autoSubmitted: auto, autoScore, needsManual,
                perQuestion, finalScore: needsManual ? null : autoScore,
            },
        });
        await db.collection('online_exam_audit').insertOne({ action: auto ? 'STUDENT_AUTO_SUBMITTED' : 'STUDENT_SUBMITTED', examId: req.params.id, studentId: sid, autoScore, needsManual, at: now() }).catch(() => {});
        res.json({ ok: true, needsManual, score: needsManual ? null : autoScore, totalMarks: exam.totalMarks });
    }));

    // Record a proctoring violation; auto-submit when the configured cap is hit.
    router.post('/student-portal/online-exams/:id/violation', authed(async (req: any, res: any, db: Db, decoded: any) => {
        const sid = String(decoded.studentId || '');
        const exam: any = await db.collection('online_exams').findOne({ _id: oid(req.params.id)! });
        const attempt: any = await db.collection('online_exam_attempts').findOne({ examId: req.params.id, studentId: sid });
        if (!exam || !attempt || attempt.status !== 'in_progress') return res.json({ ok: true });
        const kind = String(req.body?.kind || 'unknown');
        const count = (attempt.violations || 0) + 1;
        await db.collection('online_exam_violations').insertOne({ examId: req.params.id, studentId: sid, kind, detail: req.body?.detail || '', at: now() }).catch(() => {});
        const cap = Number(exam.settings?.maxWarnings ?? 2) + 1;   // warnings then submit
        const shouldSubmit = exam.settings?.strictMode && exam.settings?.autoSubmitAfterViolation && count >= cap;
        await db.collection('online_exam_attempts').updateOne({ _id: attempt._id }, { $set: { violations: count } });
        if (shouldSubmit) {
            const questions = await db.collection('online_exam_questions').find({ examId: req.params.id, deletedAt: { $exists: false } }).toArray();
            const { autoScore, needsManual, perQuestion } = autoMarkAttempt(questions, attempt.answers || {});
            await db.collection('online_exam_attempts').updateOne({ _id: attempt._id }, { $set: { status: 'auto_submitted', submittedAt: now(), autoSubmitted: true, autoScore, needsManual, perQuestion, finalScore: needsManual ? null : autoScore } });
        }
        res.json({ ok: true, violations: count, warningsLeft: Math.max(0, cap - count), autoSubmitted: shouldSubmit });
    }));

    return router;
}
