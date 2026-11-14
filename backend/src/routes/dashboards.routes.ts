/**
 * Dashboard data for the dashboard switcher (Admin / Teacher / CBC / 8-4-4).
 * Exam figures come from PUBLISHED results only (lib/examPublish via buildExamResults).
 */
import { Router, Request, Response } from 'express';
import { Db } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getMetaDb } from '../lib/mongodb';
import { buildExamResults } from './analytics.routes';
import { examClassReport, publishedExamsFor } from '../lib/examReports';
import { levelKey } from '../lib/examPublish';
import { canonicalCode } from '../lib/curriculum';
import { resolveGrading, meanGradeFromScale } from '../lib/grading';

/** A class's curriculum: what it was set to, else guessed from its name (Form → 8-4-4, Grade/PP → CBC). */
const curriculumOf = (c: any) => (c?.curriculumType ? canonicalCode(c.curriculumType) : /^\s*(grade|pp|pre)/i.test(String(c?.name || '')) ? 'CBC' : /^\s*form/i.test(String(c?.name || '')) ? '844' : '');

const router = Router();
const db = (req: Request): Db => ((req as any).tenantDb as Db) || getMetaDb();
const LEFT = /left|transfer|graduat|alumni|withdraw/i;
const TEACHING = /teacher|tutor|lecturer|instructor|hod|head of department|principal|deputy|dean/i;
const r2 = (n: number, d = 2) => { const f = 10 ** d; return Math.round((Number(n) || 0) * f) / f; };
const isGirl = (g: any) => /^(f|female|girl)/i.test(String(g || ''));
const isBoy = (g: any) => /^(m|male|boy)/i.test(String(g || ''));
const gradeOfPoints = (scale: any[], mp: number) => meanGradeFromScale(scale, mp);

async function levelSummary(d: Db, examId: string, level: string) {
    const { rows } = await buildExamResults(d, examId);
    const mine = rows.filter((r: any) => levelKey(r.className) === levelKey(level));
    if (!mine.length) return null;
    // The level's configured grading (its template, else the school scale).
    const scale = (await resolveGrading(d, undefined, level || mine[0]?.className)).scale;
    const mp = mine.reduce((a: number, r: any) => a + r.meanPoints, 0) / mine.length;
    const mm = mine.reduce((a: number, r: any) => a + r.meanPct, 0) / mine.length;
    return { entries: mine.length, meanPoints: r2(mp, 4), meanMarks: r2(mm, 2), grade: gradeOfPoints(scale, mp) };
}

// GET /dashboard/exam-overview — counts, demographics, classes, latest published exam per class, attendance
router.get('/dashboard/exam-overview', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const [students, staff, classes, streams] = await Promise.all([
            d.collection('students').find({}, { projection: { gender: 1, sex: 1, status: 1, studentClass: 1, currentClass: 1, classId: 1 } }).toArray().catch(() => [] as any[]),
            d.collection('staff').find({}, { projection: { designation: 1, roles: 1, isTeachingStaff: 1, status: 1 } }).toArray().catch(() => [] as any[]),
            d.collection('v2_classes').find({ deletedAt: { $exists: false } }).sort({ level: 1, name: 1 }).toArray().catch(() => [] as any[]),
            d.collection('v2_streams').find({ deletedAt: { $exists: false } }).toArray().catch(() => [] as any[]),
        ]);
        // ?curriculum=844 → only that curriculum's classes (and their streams and learners)
        const want = req.query.curriculum ? canonicalCode(String(req.query.curriculum)) : '';
        if (want) {
            const keep = classes.filter((c: any) => curriculumOf(c) === want);
            const ids = new Set(keep.map((c: any) => String(c._id))); const lv = new Set(keep.map((c: any) => levelKey(c.name)));
            classes.splice(0, classes.length, ...keep);
            streams.splice(0, streams.length, ...streams.filter((st: any) => ids.has(String(st.classId))));
            students.splice(0, students.length, ...students.filter((st: any) => ids.has(String(st.classId || '')) || lv.has(levelKey(st.studentClass || st.currentClass))));
        }
        const live = students.filter((s: any) => !LEFT.test(String(s.status || '')));
        const activeStaff = staff.filter((s: any) => !/inactive|left|terminated|resigned/i.test(String(s.status || '')));
        const teachers = activeStaff.filter((s: any) => s.isTeachingStaff === true || TEACHING.test(`${s.designation || ''} ${(s.roles || []).join(' ')}`));
        const perClass = classes.map((c: any) => {
            const inC = live.filter((s: any) => String(s.classId || '') === String(c._id) || levelKey(s.studentClass || s.currentClass) === levelKey(c.name));
            return { _id: String(c._id), name: c.name, curriculum: c.curriculumType || '', streams: streams.filter((s: any) => String(s.classId) === String(c._id)).length, students: inC.length, boys: inC.filter((s: any) => isBoy(s.gender || s.sex)).length, girls: inC.filter((s: any) => isGirl(s.gender || s.sex)).length };
        });
        // latest published exam per class (and the one before it, for the change)
        const levels: any[] = [];
        for (const c of perClass) {
            const ex = await publishedExamsFor(d, c.name);
            if (!ex.length) { levels.push({ level: c.name, exam: null }); continue; }
            const cur = await levelSummary(d, ex[0]._id, c.name);
            const prev = ex[1] ? await levelSummary(d, ex[1]._id, c.name) : null;
            levels.push({ level: c.name, exam: { _id: ex[0]._id, title: ex[0].title, term: ex[0].term, academicYear: ex[0].academicYear }, ...cur, change: prev && cur ? r2(cur.meanPoints - prev.meanPoints, 4) : null, exams: ex.slice(0, 12) });
        }
        // attendance, last 7 days (present / out of school)
        const since = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
        const att: any[] = await d.collection('student_attendance').find({ date: { $gte: since } }, { projection: { date: 1, status: 1, subject: 1, periodId: 1, studentId: 1 } }).toArray().catch(() => []);
        const days: Record<string, { present: Set<string>; absent: Set<string> }> = {};
        const mine = new Set(live.map((x: any) => String(x._id)));
        att.filter(a => !a.periodId && (!a.subject || a.subject === 'General') && (!want || mine.has(String(a.studentId)))).forEach(a => {
            const dd = (days[a.date] ||= { present: new Set(), absent: new Set() });
            (/present|late/i.test(String(a.status)) ? dd.present : dd.absent).add(String(a.studentId));
        });
        const attendance = Object.keys(days).sort().map(k => ({ date: k, present: days[k].present.size, absent: days[k].absent.size }));
        const totalStreams = streams.length || classes.length;
        res.json({
            counts: { students: live.length, boys: live.filter((s: any) => isBoy(s.gender || s.sex)).length, girls: live.filter((s: any) => isGirl(s.gender || s.sex)).length, teachers: teachers.length, staff: activeStaff.length - teachers.length, classes: classes.length, streams: streams.length },
            classAnalysis: { avgClassSize: totalStreams ? Math.round(live.length / totalStreams) : 0, streams: totalStreams, studentTeacherRatio: teachers.length ? Math.round(live.length / teachers.length) : null },
            classes: perClass, levels, attendance,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET /dashboard/exam-subjects?level=&examId= — subject means for a class & exam (top / low)
router.get('/dashboard/exam-subjects', async (req: Request, res: Response) => {
    try {
        const level = String(req.query.level || ''); let examId = String(req.query.examId || '');
        if (!level) return res.status(400).json({ message: 'level required' });
        if (!examId) examId = (await publishedExamsFor(db(req), level))[0]?._id || '';
        if (!examId) return res.json({ subjects: [], exam: null });
        const r = await examClassReport(db(req), examId, level);
        res.json({ exam: r.exam, streams: r.summary.streamMeans, subjects: r.subjectSummary.map((s: any) => ({ name: s.name, short: s.short, meanPoints: s.meanPoints, meanMarks: s.meanMarks, grade: s.grade, change: s.mpDev })), grades: r.grades, distribution: r.breakdown.streams[r.breakdown.streams.length - 1]?.counts || {} });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET /dashboard/teacher — the signed-in teacher's subject classes with their latest published results
router.get('/dashboard/teacher', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        let claims: any = {};
        try { claims = jwt.decode(String(req.headers.authorization || '').split(' ')[1]) || {}; } catch { /* */ }
        const staffId = String(claims.staffId || (req as any).tenantContext?.user?.staffId || '');
        if (!staffId) return res.json({ assignments: [] });
        const links: any[] = await d.collection('staff_subjects').find({ $or: [{ teacherId: staffId }, { staffId }] }).toArray().catch(() => []);
        const out: any[] = [];
        const cache = new Map<string, any>();
        for (const l of links) {
            const level = l.className || '';
            const exams = await publishedExamsFor(d, level);
            const latest = exams[0];
            let result: any = null;
            if (latest) {
                const key = `${latest._id}|${level}`;
                if (!cache.has(key)) cache.set(key, await examClassReport(d, latest._id, level));
                const rep = cache.get(key);
                const sub = rep.subjectSummary.find((s: any) => String(s.name).toLowerCase() === String(l.subjectName || '').toLowerCase());
                const streamRows = l.streamName ? rep.perSubject.find((p: any) => String(p.name).toLowerCase() === String(l.subjectName || '').toLowerCase())?.streams.find((s: any) => String(s.stream).toLowerCase() === String(l.streamName).toLowerCase()) : null;
                const src = streamRows || sub;
                if (src) result = { exam: latest.title, entries: src.entries, meanMarks: src.meanMarks, meanPoints: src.meanPoints, grade: src.grade, change: src.mpDev ?? null };
            }
            out.push({ subject: l.subjectName, className: level, stream: l.streamName || '', result });
        }
        res.json({ assignments: out });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
