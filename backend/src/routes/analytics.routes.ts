import { Router, Request, Response } from 'express';
import { Db } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { formatExamName } from '../lib/examName';

const router = Router();
const db = (req: any): Db => (req.tenantDb as Db) || getMetaDb();
const num = (v: any) => Number(v) || 0;
const round = (n: number, d = 0) => { const f = 10 ** d; return Math.round((Number(n) || 0) * f) / f; };

// ─── Grading (KCSE 12-point) ───────────────────────────────────────────────────
// Loads the school's grading scale and exposes pct → { grade, points }. Falls
// back to the standard Kenyan 12-point scale if none is configured.
const DEFAULT_SCALE = [
    { grade: 'A', from: 80, upto: 100, points: 12 }, { grade: 'A-', from: 75, upto: 79, points: 11 },
    { grade: 'B+', from: 70, upto: 74, points: 10 }, { grade: 'B', from: 65, upto: 69, points: 9 },
    { grade: 'B-', from: 60, upto: 64, points: 8 }, { grade: 'C+', from: 55, upto: 59, points: 7 },
    { grade: 'C', from: 50, upto: 54, points: 6 }, { grade: 'C-', from: 45, upto: 49, points: 5 },
    { grade: 'D+', from: 40, upto: 44, points: 4 }, { grade: 'D', from: 35, upto: 39, points: 3 },
    { grade: 'D-', from: 30, upto: 34, points: 2 }, { grade: 'E', from: 0, upto: 29, points: 1 },
];

async function loadScale(database: Db, classId?: string) {
    let rec: any = classId ? await database.collection('grading_criteria').findOne({ classId }).catch(() => null) : null;
    if (!rec) rec = await database.collection('grading_criteria').findOne({}).catch(() => null);
    const raw = (rec?.grades || rec?.gradingScale || []);
    const scale = raw.length ? raw.map((g: any, i: number) => ({
        grade: g.grade ?? g.name ?? g.label ?? '',
        from: num(g.from ?? g.minPercent ?? g.min),
        upto: num(g.upto ?? g.maxPercent ?? g.max ?? 100),
        points: num(g.points ?? g.point ?? (raw.length - i)),
    })).sort((a: any, b: any) => b.upto - a.upto) : DEFAULT_SCALE;
    const grade = (pct: number) => scale.find((s: any) => pct >= s.from && pct <= s.upto) || scale[scale.length - 1];
    return { scale, grade };
}

// Mean grade from a mean points value (reverse lookup, nearest band).
const meanGradeFromPoints = (scale: any[], meanPoints: number) => {
    let best = scale[scale.length - 1];
    for (const s of scale) { if (meanPoints >= s.points - 0.5) { best = s; break; } }
    return best?.grade || '-';
};

// ─── Core: build per-student results for an exam ───────────────────────────────
// Returns one row per student: { studentId, name, adm, stream, subjects[], totalMarks,
// meanPct, totalPoints, meanPoints, meanGrade }.
async function buildExamResults(database: Db, examId: string) {
    const marks = await database.collection('exam_marks').find({ examId: String(examId) }).toArray().catch(() => []);
    const { scale, grade } = await loadScale(database);

    const byStudent: Record<string, any> = {};
    for (const m of marks) {
        const sid = String(m.studentId);
        const max = num(m.totalMarks) || 100;
        const pct = max > 0 ? (num(m.marksObtained) / max) * 100 : 0;
        const g = grade(pct);
        (byStudent[sid] ||= { studentId: sid, subjects: [], classAtTime: m.classAtTime }).subjects.push({
            name: m.subjectName || m.subject || 'Subject', marks: num(m.marksObtained), max, pct: round(pct, 1),
            grade: g.grade, points: g.points,
        });
    }

    // Enrich with student info (name / adm / stream).
    const ids = Object.keys(byStudent);
    const students = ids.length ? await database.collection('students').find({}).toArray().catch(() => []) : [];
    const sById: Record<string, any> = {};
    students.forEach((s: any) => { sById[String(s._id)] = s; });

    const rows = ids.map((sid) => {
        const r = byStudent[sid];
        const stu = sById[sid] || {};
        const subjects = r.subjects;
        const totalMarks = subjects.reduce((a: number, s: any) => a + s.marks, 0);
        const totalPoints = subjects.reduce((a: number, s: any) => a + s.points, 0);
        const meanPct = subjects.length ? subjects.reduce((a: number, s: any) => a + s.pct, 0) / subjects.length : 0;
        const meanPoints = subjects.length ? totalPoints / subjects.length : 0;
        return {
            studentId: sid,
            name: stu.studentName || stu.name || 'Student',
            adm: stu.registrationNo || stu.admNo || stu.admissionNo || '',
            stream: stu.stream || stu.streamName || '',
            className: r.classAtTime || stu.studentClass || stu.currentClass || '',
            kcpe: num(stu.kcpeMarks ?? stu.kcpe),
            subjects, totalMarks, totalPoints,
            meanPct: round(meanPct, 2), meanPoints: round(meanPoints, 2),
            meanGrade: meanGradeFromPoints(scale, meanPoints),
        };
    });

    // Overall position (by total points desc), and stream position.
    rows.sort((a, b) => b.totalPoints - a.totalPoints || b.meanPct - a.meanPct);
    rows.forEach((r, i) => { (r as any).position = i + 1; });
    const byStream: Record<string, any[]> = {};
    rows.forEach(r => { (byStream[r.stream || r.className] ||= []).push(r); });
    Object.values(byStream).forEach(list => { list.sort((a, b) => b.totalPoints - a.totalPoints).forEach((r, i) => { (r as any).streamPosition = i + 1; }); });

    return { rows, scale };
}

// Chronological exams for a form/level (for change-vs-previous & over-time).
async function examsChrono(database: Db) {
    const exams = await database.collection('exams').find({}).toArray().catch(() => []);
    return exams
        .map((e: any) => ({ ...e, _year: num(e.academicYear ?? e.year), _term: num(String(e.term || '').match(/\d+/)?.[0] || 0) }))
        .sort((a: any, b: any) => a._year - b._year || a._term - b._term || String(a.createdAt).localeCompare(String(b.createdAt)));
}

// ─── Endpoints ──────────────────────────────────────────────────────────────────

// All exams grouped by term (for the exam selector).
router.get('/analytics/exams', async (req: Request, res: Response) => {
    try {
        const exams = await examsChrono(db(req));
        const data = exams.map((e: any) => ({
            id: String(e._id), examName: e.examName, examType: e.type || e.examType,
            term: e.term, academicYear: e.academicYear ?? e.year,
            title: formatExamName(e), publishStatus: e.publishStatus,
        }));
        // Group by term label.
        const groups: Record<string, any[]> = {};
        data.forEach((e: any) => { (groups[e.term || 'Other'] ||= []).push(e); });
        res.json({ exams: data, groups });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Form/class summary cards (My Classes): per class — mean points/marks/grade,
// student count, grade breakdown.
router.get('/analytics/overview', async (req: Request, res: Response) => {
    try {
        const examId = String(req.query.examId || '');
        if (!examId) return res.json({ classes: [] });
        const { rows, scale } = await buildExamResults(db(req), examId);
        const byClass: Record<string, any[]> = {};
        rows.forEach(r => { (byClass[r.className || r.stream || 'Class'] ||= []).push(r); });
        const grades = scale.map((s: any) => s.grade);
        const classes = Object.entries(byClass).map(([name, list]) => {
            const breakdown: Record<string, number> = {};
            grades.forEach((g: string) => breakdown[g] = 0);
            list.forEach(r => { breakdown[r.meanGrade] = (breakdown[r.meanGrade] || 0) + 1; });
            const meanPoints = list.reduce((a, r) => a + r.meanPoints, 0) / list.length;
            const meanPct = list.reduce((a, r) => a + r.meanPct, 0) / list.length;
            return {
                name, students: list.length,
                meanPoints: round(meanPoints, 2), meanPct: round(meanPct, 2),
                meanGrade: meanGradeFromPoints(scale, meanPoints), breakdown,
            };
        });
        res.json({ classes, grades });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Full form analytics for one class/form in one exam.
router.get('/analytics/form', async (req: Request, res: Response) => {
    try {
        const examId = String(req.query.examId || '');
        const form = String(req.query.form || '');   // class/form name filter
        if (!examId) return res.status(400).json({ message: 'examId required' });
        const database = db(req);
        const exam = await database.collection('exams').findOne({}).catch(() => null);
        const { rows, scale } = await buildExamResults(database, examId);
        const inForm = form ? rows.filter(r => String(r.className).toLowerCase().includes(form.toLowerCase()) || String(r.stream).toLowerCase().includes(form.toLowerCase())) : rows;
        const grades = scale.map((s: any) => s.grade);

        // Class averages.
        const meanPoints = inForm.length ? inForm.reduce((a, r) => a + r.meanPoints, 0) / inForm.length : 0;
        const meanPct = inForm.length ? inForm.reduce((a, r) => a + r.meanPct, 0) / inForm.length : 0;

        // Stream comparison (mean points per stream).
        const byStream: Record<string, any[]> = {};
        inForm.forEach(r => { (byStream[r.stream || r.className || '—'] ||= []).push(r); });
        const streams = Object.entries(byStream).map(([stream, list]) => ({
            stream, students: list.length,
            meanPoints: round(list.reduce((a, r) => a + r.meanPoints, 0) / list.length, 2),
            meanPct: round(list.reduce((a, r) => a + r.meanPct, 0) / list.length, 2),
        })).sort((a, b) => b.meanPoints - a.meanPoints);

        // Subject performance (avg points per subject) + change vs previous exam.
        const subjAgg: Record<string, { pts: number; n: number }> = {};
        inForm.forEach(r => r.subjects.forEach((s: any) => { (subjAgg[s.name] ||= { pts: 0, n: 0 }); subjAgg[s.name].pts += s.points; subjAgg[s.name].n += 1; }));
        const subjects = Object.entries(subjAgg).map(([name, v]) => ({
            name, points: round(v.pts / v.n, 2), grade: meanGradeFromPoints(scale, v.pts / v.n), change: 0,
        })).sort((a, b) => b.points - a.points);

        // Grade breakdown (streams as rows, grades as columns).
        const breakdown = Object.entries(byStream).map(([stream, list]) => {
            const counts: Record<string, number> = {}; grades.forEach((g: string) => counts[g] = 0);
            list.forEach(r => { counts[r.meanGrade] = (counts[r.meanGrade] || 0) + 1; });
            return { stream, counts };
        });

        res.json({
            examTitle: formatExamName(exam, form || undefined),
            form, satCount: inForm.length, grades,
            averages: { meanPoints: round(meanPoints, 2), meanPct: round(meanPct, 2), meanGrade: meanGradeFromPoints(scale, meanPoints) },
            streams, subjects, breakdown,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Merit list — ranked by total points, with subject marks + grades.
router.get('/analytics/merit-list', async (req: Request, res: Response) => {
    try {
        const examId = String(req.query.examId || '');
        const form = String(req.query.form || '');
        const { rows } = await buildExamResults(db(req), examId);
        const inForm = form ? rows.filter(r => String(r.className).toLowerCase().includes(form.toLowerCase()) || String(r.stream).toLowerCase().includes(form.toLowerCase())) : rows;
        res.json({ students: inForm.map(r => ({ position: (r as any).position, adm: r.adm, name: r.name, stream: r.stream, totalPoints: r.totalPoints, meanGrade: r.meanGrade, subjects: r.subjects })) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Most improved — largest positive mean-points change vs the previous exam.
router.get('/analytics/most-improved', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const examId = String(req.query.examId || '');
        const exams = await examsChrono(database);
        const idx = exams.findIndex((e: any) => String(e._id) === examId);
        const prev = idx > 0 ? exams[idx - 1] : null;
        const cur = (await buildExamResults(database, examId)).rows;
        const prevRows = prev ? (await buildExamResults(database, String(prev._id))).rows : [];
        const prevBy: Record<string, any> = {}; prevRows.forEach(r => prevBy[r.studentId] = r);
        const improved = cur
            .filter(r => prevBy[r.studentId])
            .map(r => ({ adm: r.adm, name: r.name, stream: r.stream, change: round(r.meanPoints - prevBy[r.studentId].meanPoints, 2), from: prevBy[r.studentId].meanPoints, to: r.meanPoints }))
            .filter(r => r.change > 0)
            .sort((a, b) => b.change - a.change)
            .slice(0, 50);
        res.json({ students: improved, comparedTo: prev ? formatExamName(prev) : null });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Performance over time — mean points per stream + overall, across all exams.
router.get('/analytics/over-time', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const form = String(req.query.form || '');
        const exams = await examsChrono(database);
        const series: any[] = [];
        for (const e of exams) {
            const { rows } = await buildExamResults(database, String(e._id));
            const inForm = form ? rows.filter(r => String(r.className).toLowerCase().includes(form.toLowerCase()) || String(r.stream).toLowerCase().includes(form.toLowerCase())) : rows;
            if (!inForm.length) continue;
            const byStream: Record<string, any[]> = {};
            inForm.forEach(r => { (byStream[r.stream || '—'] ||= []).push(r); });
            const point: any = { exam: formatExamName(e), short: `${String(e.term || '').replace(/\D/g, 'T')}` };
            point.Overall = round(inForm.reduce((a, r) => a + r.meanPoints, 0) / inForm.length, 2);
            Object.entries(byStream).forEach(([s, list]) => { point[s] = round(list.reduce((a, r) => a + r.meanPoints, 0) / list.length, 2); });
            series.push(point);
        }
        const streams = Array.from(new Set(series.flatMap(p => Object.keys(p).filter(k => k !== 'exam' && k !== 'short'))));
        res.json({ series, streams });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Per-student exam result (parent portal): performance, subject table w/ rank,
// student-vs-class averages, and change vs previous exam.
router.get('/analytics/student/:studentId', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const examId = String(req.query.examId || '');
        const sid = req.params.studentId;
        const exams = await examsChrono(database);
        const idx = exams.findIndex((e: any) => String(e._id) === examId);
        const exam = idx >= 0 ? exams[idx] : null;
        const prev = idx > 0 ? exams[idx - 1] : null;

        const { rows } = await buildExamResults(database, examId);
        const me = rows.find(r => r.studentId === sid);
        if (!me) return res.json({ found: false });
        const cohort = rows.filter(r => (r.stream || r.className) === (me.stream || me.className));

        // Previous exam (for subject change + over-time).
        const prevRows = prev ? (await buildExamResults(database, String(prev._id))).rows : [];
        const prevMe = prevRows.find(r => r.studentId === sid);
        const prevSubj: Record<string, number> = {};
        prevMe?.subjects.forEach((s: any) => prevSubj[s.name] = s.pct);

        // Class average per subject (for the student-vs-class chart) + subject rank.
        const classSubjAvg: Record<string, { sum: number; n: number; marks: number[] }> = {};
        cohort.forEach(r => r.subjects.forEach((s: any) => { (classSubjAvg[s.name] ||= { sum: 0, n: 0, marks: [] }); classSubjAvg[s.name].sum += s.pct; classSubjAvg[s.name].n += 1; classSubjAvg[s.name].marks.push(s.pct); }));

        const subjectTable = me.subjects.map((s: any) => {
            const avg = classSubjAvg[s.name];
            const rank = avg ? avg.marks.filter(m => m > s.pct).length + 1 : 1;
            return { name: s.name, pct: s.pct, grade: s.grade, change: round(s.pct - (prevSubj[s.name] ?? s.pct), 1), rank, of: avg?.n || cohort.length };
        });
        const vsClass = me.subjects.map((s: any) => ({ subject: s.name, student: s.pct, classAvg: round((classSubjAvg[s.name]?.sum || 0) / (classSubjAvg[s.name]?.n || 1), 1) }));

        res.json({
            found: true,
            examTitle: formatExamName(exam, me.stream || me.className),
            student: { name: me.name, adm: me.adm, stream: me.stream, kcpe: me.kcpe },
            performance: {
                meanPct: me.meanPct, totalPoints: me.totalPoints, outOf: me.subjects.length * 12,
                overallPosition: (me as any).position, overallOf: rows.length,
                streamPosition: (me as any).streamPosition, streamOf: cohort.length,
                meanGrade: me.meanGrade,
            },
            subjectTable, vsClass,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Student performance-over-time (parent): mean % per exam (single line).
router.get('/analytics/student/:studentId/over-time', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const sid = req.params.studentId;
        const exams = await examsChrono(database);
        const series: any[] = [];
        for (const e of exams) {
            const marks = await database.collection('exam_marks').find({ examId: String(e._id), studentId: sid }).toArray().catch(() => []);
            if (!marks.length) continue;
            const mean = marks.reduce((a: number, m: any) => { const max = num(m.totalMarks) || 100; return a + (max > 0 ? (num(m.marksObtained) / max) * 100 : 0); }, 0) / marks.length;
            series.push({ exam: formatExamName(e), mean: round(mean, 1) });
        }
        res.json({ series });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
