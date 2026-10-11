import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { formatExamName } from '../lib/examName';
import { canonicalCode, curriculumFromClassLabel } from '../lib/curriculum';
import { makeGradingCache, resolveGrading, meanGradeFromScale, GradeBand } from '../lib/grading';
import { marksWindow, examInWindow } from '../lib/examWindow';
import { enforceCrud } from '../lib/permissions';
import { publishedView, onlyPublished } from '../lib/examPublish';

const router = Router();
const db = (req: any): Db => (req.tenantDb as Db) || getMetaDb();
const num = (v: any) => Number(v) || 0;
const round = (n: number, d = 0) => { const f = 10 ** d; return Math.round((Number(n) || 0) * f) / f; };
// Class-level key from a class/stream label, e.g. "FORM 4 West" -> "Form 4".
// Falls back to a title-cased version of the raw text when there's no form/grade.
const levelOf = (s: string) => {
    const m = String(s || '').match(/(form|grade)\s*\d+/i);
    if (m) { const w = m[0].replace(/\s+/g, ' ').trim().toLowerCase(); return w.charAt(0).toUpperCase() + w.slice(1); }
    return String(s || 'Class').trim();
};

/**
 * Class levels that still exist (v2 classes + their streams, and the older class list).
 * Analytics only shows these — a deleted class/grade no longer appears even if old marks
 * mention it. null = the school has no classes set up yet (then nothing is hidden).
 */
async function liveLevels(database: Db): Promise<Set<string> | null> {
    const [v2, legacy] = await Promise.all([
        database.collection('v2_classes').find({ deletedAt: { $exists: false } }, { projection: { name: 1 } }).toArray().catch(() => [] as any[]),
        database.collection('classes').find({}, { projection: { name: 1, levelName: 1 } }).toArray().catch(() => [] as any[]),
    ]);
    const set = new Set<string>();
    v2.forEach((c: any) => c.name && set.add(levelOf(c.name).toLowerCase()));
    legacy.forEach((c: any) => { const n = c.levelName || c.name; if (n) set.add(levelOf(n).toLowerCase()); });
    return set.size ? set : null;
}

// ─── Analytics settings (Exams → Analysis → Settings) ──────────────────────────
// The basic views are on by default; the extra insights are opt-in.
export const DEFAULT_ANALYTICS_SETTINGS = {
    views: {
        meritList: true, comparison: true, subjects: true, classes: true, improved: true,   // basics
        distribution: true,                                                                  // grade spread + pass rate
        gender: false, topBottom: false, atRisk: false, subjectRanking: false,               // extra insights
    },
    passMarkPct: 50,          // a learner "passes" at this mean %
    atRiskBelowPct: 40,       // at risk when the mean % is below this…
    atRiskDropPoints: 1,      // …or the mean points fell by at least this since the last exam
    topBottomCount: 10,
    defaultToCurrentTerm: true,
};
export async function analyticsSettings(database: Db) {
    const s: any = await database.collection('analytics_settings').findOne({ _id: 'default' as any }).catch(() => null);
    return { ...DEFAULT_ANALYTICS_SETTINGS, ...(s || {}), views: { ...DEFAULT_ANALYTICS_SETTINGS.views, ...(s?.views || {}) } };
}

// ─── Grading ──────────────────────────────────────────────────────────────────
// Always the configured grading (lib/grading resolveGrading: class template → class
// criteria → global criteria → curriculum settings → KCSE default).
async function loadScale(database: Db, classId?: string) {
    const g = await resolveGrading(database, classId);
    return { scale: g.scale, grade: g.gradeOf };
}

// Mean grade from a mean points value (reverse lookup, nearest band).
const meanGradeFromPoints = (scale: GradeBand[], meanPoints: number) => meanGradeFromScale(scale, meanPoints);

// ─── Core: build per-student results for an exam ───────────────────────────────
// Returns one row per student: { studentId, name, adm, stream, subjects[], totalMarks,
// meanPct, totalPoints, meanPoints, meanGrade }.
// Exported so the Department Analysis (departments.routes) can reuse the exact same
// results-building + grading logic instead of duplicating it.
export async function buildExamResults(database: Db, examId: string, opts: { includeUnpublished?: boolean } = {}) {
    // Only published results (Exams → Manage Exams) unless the caller is a moderation view.
    const raw = await database.collection('exam_marks').find({ examId: String(examId) }).toArray().catch(() => []);
    const marks = opts.includeUnpublished ? raw : await onlyPublished(database, raw);
    // Grade PER CLASS using the class's assigned template (grading cache avoids
    // re-querying). The overall `scale` (for grade-list axes) is the school one.
    const gradingFor = makeGradingCache(database);
    const { scale } = await loadScale(database);
    const studentScale: Record<string, GradeBand[]> = {};

    // Pre-load each student's classId so per-student grading can resolve the template.
    const studentIdsAll = Array.from(new Set(marks.map((m: any) => String(m.studentId))));
    const studentDocsAll = studentIdsAll.length ? await database.collection('students').find({}).toArray().catch(() => []) : [];
    const sClassById: Record<string, { id: string; name: string }> = {};
    studentDocsAll.forEach((s: any) => { sClassById[String(s._id)] = { id: String(s.classId || ''), name: s.studentClass || s.className || s.currentClass || '' }; });

    // Subject short codes (compact labels for merit-list columns), keyed by
    // normalized subject name. Falls back to the first letters of the name when a
    // subject has no short code set.
    const subjectDefs = await database.collection('subjects').find({}).toArray().catch(() => []);
    const nrm = (v: any) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const shortByName: Record<string, string> = {};
    subjectDefs.forEach((s: any) => {
        const sc = String(s.shortCode || '').trim();
        if (sc) shortByName[nrm(s.name || s.subjectName)] = sc.toUpperCase();
    });
    const shortCodeFor = (name: string): string =>
        shortByName[nrm(name)] || String(name || '').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();

    const byStudent: Record<string, any> = {};
    for (const m of marks) {
        const sid = String(m.studentId);
        const max = num(m.totalMarks) || 100;
        const pct = max > 0 ? (num(m.marksObtained) / max) * 100 : 0;
        const scls = sClassById[sid] || { id: '', name: m.classAtTime || '' };
        const grading = await gradingFor(scls.id, scls.name || m.classAtTime);
        studentScale[sid] ||= grading.scale;   // the mean grade uses the same scale as the subjects
        const g = grading.gradeOf(pct);
        const subName = m.subjectName || m.subject || 'Subject';
        (byStudent[sid] ||= { studentId: sid, subjects: [], classAtTime: m.classAtTime }).subjects.push({
            name: subName, shortCode: shortCodeFor(subName), marks: num(m.marksObtained), max, pct: round(pct, 1),
            grade: g.grade, points: g.points,
        });
    }

    // Enrich with student info (name / adm / stream).
    const ids = Object.keys(byStudent);
    const students = ids.length ? await database.collection('students').find({}).toArray().catch(() => []) : [];
    const sById: Record<string, any> = {};
    students.forEach((s: any) => { sById[String(s._id)] = s; });

    // Authoritative streams = the v2_streams collection. We resolve each student's
    // stream against THIS list so analytics shows real streams (West/South), not a
    // stale word left in old class text.
    const v2Streams = await database.collection('v2_streams').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
    const streamById: Record<string, any> = {}; const streamByName: Record<string, any> = {};
    v2Streams.forEach((s: any) => { streamById[String(s._id)] = s; streamByName[String(s.name || '').toLowerCase().trim()] = s; });
    const validStreamNames = new Set(v2Streams.map((s: any) => String(s.name || '').toLowerCase().trim()));

    // Resolve a student's stream: prefer the v2 streamId, then a v2 stream whose
    // NAME the student references, then a stream word in the class text — but ONLY
    // if that word is a real v2 stream. Otherwise "(No stream)".
    const streamWord = (className: string): string => {
        const m = String(className || '').match(/(?:form|grade)\s*\d+\s+(.+)$/i);
        return m ? m[1].trim() : '';
    };
    const resolveStream = (stu: any, className: string): string => {
        if (stu.streamId && streamById[String(stu.streamId)]) return streamById[String(stu.streamId)].name;
        const named = String(stu.streamName || stu.stream || '').toLowerCase().trim();
        if (named && (validStreamNames.size === 0 || validStreamNames.has(named))) return stu.streamName || stu.stream;
        const word = streamWord(className).toLowerCase().trim();
        if (word && validStreamNames.has(word)) return streamWord(className);
        return '(No stream)';
    };
    const rows = ids.map((sid) => {
        const r = byStudent[sid];
        const stu = sById[sid] || {};
        const subjects = r.subjects;
        const totalMarks = subjects.reduce((a: number, s: any) => a + s.marks, 0);
        const totalPoints = subjects.reduce((a: number, s: any) => a + s.points, 0);
        const meanPct = subjects.length ? subjects.reduce((a: number, s: any) => a + s.pct, 0) / subjects.length : 0;
        const meanPoints = subjects.length ? totalPoints / subjects.length : 0;
        const className = r.classAtTime || stu.studentClass || stu.currentClass || '';
        const stream = resolveStream(stu, className);
        return {
            studentId: sid,
            name: stu.studentName || stu.name || 'Student',
            adm: stu.registrationNo || stu.admNo || stu.admissionNo || '',
            stream,
            className,
            kcpe: num(stu.kcpeMarks ?? stu.kcpe ?? stu.kcpeScore),
            gender: String(stu.gender || stu.sex || '').trim(),
            subjects, totalMarks, totalPoints,
            meanPct: round(meanPct, 2), meanPoints: round(meanPoints, 2),
            meanGrade: meanGradeFromPoints(studentScale[sid] || scale, meanPoints),
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

// All exams grouped by term (for the exam selector). Pass ?studentId= to return
// ONLY the exams that student actually sat (so a parent never picks an empty one);
// pass ?onlyPublished=1 to hide unpublished exams from parents.
router.get('/analytics/exams', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        let exams = await examsChrono(database);
        const studentId = String(req.query.studentId || req.headers['x-student-id'] || '');
        if (studentId) {
            const sat = await database.collection('exam_marks').distinct('examId', { studentId }).catch(() => []);
            const satSet = new Set(sat.map(String));
            const filtered = exams.filter((e: any) => satSet.has(String(e._id)));
            if (filtered.length) exams = filtered;   // fall back to all if none matched (legacy ids)
        }
        // Exams with no published results yet are not offered (Exams → Manage Exams → Publish).
        const pubView = await publishedView(database);
        exams = exams.filter((e: any) => pubView.examListed(String(e._id)));
        const data = exams.map((e: any) => ({
            id: String(e._id), examName: e.examName, examType: e.type || e.examType,
            term: e.term, academicYear: e.academicYear ?? e.year,
            title: formatExamName(e), publishStatus: e.publishStatus,
        }));
        // Group by term label.
        const groups: Record<string, any[]> = {};
        data.forEach((e: any) => { (groups[e.term || 'Other'] ||= []).push(e); });
        // Default: the latest exam of the CURRENT term that has marks (else of the current
        // term, else the latest exam overall).
        let currentExamId: string | null = null;
        const settings = await analyticsSettings(database);
        if (settings.defaultToCurrentTerm) {
            const win = await marksWindow(database).catch(() => null);
            const inTerm = win ? exams.filter((e: any) => examInWindow(e, win)) : [];
            if (inTerm.length) {
                const withMarks = new Set((await database.collection('exam_marks').distinct('examId', { examId: { $in: inTerm.map((e: any) => String(e._id)) } }).catch(() => [])).map(String));
                const pick = [...inTerm].reverse().find((e: any) => withMarks.has(String(e._id))) || inTerm[inTerm.length - 1];
                currentExamId = String(pick._id);
            }
        }
        if (!currentExamId && data.length) currentExamId = data[data.length - 1].id;
        res.json({ exams: data, groups, currentExamId, currentTerm: (await marksWindow(database).catch(() => null))?.label || null });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Form/class summary cards (My Classes): per class — mean points/marks/grade,
// student count, grade breakdown.
router.get('/analytics/overview', async (req: Request, res: Response) => {
    try {
        const examId = String(req.query.examId || '');
        if (!examId) return res.json({ classes: [] });
        const database = db(req);
        const { rows, scale } = await buildExamResults(database, examId);
        // Group by CLASS LEVEL ("Form 4"), not per stream — so My Classes shows one
        // card per form that aggregates all its streams.
        const byClass: Record<string, any[]> = {};
        rows.forEach(r => { (byClass[levelOf(r.className || r.stream)] ||= []).push(r); });
        const grades = scale.map((s: any) => s.grade);

        // Curriculum + grading TEMPLATE per class level, so each card uses ITS OWN
        // grading scale (the assigned template — letters, EE/ME/AE/BE, or EE1/AE1…).
        const v2ClassesEarly = await database.collection('v2_classes').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const curByLevel: Record<string, string> = {};
        v2ClassesEarly.forEach((c: any) => { curByLevel[levelOf(c.name).toLowerCase()] = canonicalCode(c.curriculumType ?? c.curriculum ?? ''); });

        const classes = await Promise.all(Object.entries(byClass).map(async ([name, list]) => {
            const cur = curByLevel[name.toLowerCase()] || canonicalCode(curriculumFromClassLabel(name));
            // Resolve the class's grading template; its grade set drives the breakdown.
            const g = await resolveGrading(database, undefined, name);
            const classGrades = g.scale.map((b: any) => b.grade);
            const breakdown: Record<string, number> = {};
            classGrades.forEach((gr: string) => breakdown[gr] = 0);
            list.forEach(r => {
                const key = g.meanGrade(r.meanPoints);
                breakdown[key] = (breakdown[key] || 0) + 1;
            });
            const meanPoints = list.reduce((a, r) => a + r.meanPoints, 0) / list.length;
            const meanPct = list.reduce((a, r) => a + r.meanPct, 0) / list.length;
            return {
                name, students: list.length, noMarks: false,
                meanPoints: round(meanPoints, 2), meanPct: round(meanPct, 2),
                meanGrade: g.meanGrade(meanPoints),
                breakdown, grades: classGrades, curriculum: cur,
            };
        }));

        // Also surface every class the exam APPLIES TO — even if no marks are entered
        // yet — so My Classes shows the full picture (and which classes still need
        // marks). The exam's classLevel is "All Classes" or a specific level.
        const exam: any = await database.collection('exams').findOne({ _id: new ObjectId(examId) }).catch(() => null);
        const examLevel = String(exam?.classLevel || exam?.classLevels || '').trim();
        const v2Classes = await database.collection('v2_classes').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const have = new Set(classes.map(c => c.name.toLowerCase()));
        const wantedLevels = (!examLevel || /all/i.test(examLevel))
            ? v2Classes.map((c: any) => levelOf(c.name))   // all classes
            : [levelOf(examLevel)];
        for (const lvl of wantedLevels) {
            if (have.has(lvl.toLowerCase())) continue;
            have.add(lvl.toLowerCase());
            const cur = curByLevel[lvl.toLowerCase()] || canonicalCode(curriculumFromClassLabel(lvl));
            const gr = await resolveGrading(database, undefined, lvl);
            const gset = gr.scale.map((b: any) => b.grade);
            const emptyBreakdown: Record<string, number> = {}; gset.forEach((x: string) => emptyBreakdown[x] = 0);
            classes.push({ name: lvl, students: 0, noMarks: true, meanPoints: 0, meanPct: 0, meanGrade: '-', breakdown: emptyBreakdown, grades: gset, curriculum: cur });
        }
        classes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        // Only classes that still exist — a deleted class/grade is not shown.
        const live = await liveLevels(database);
        const shown = live ? classes.filter(c => live.has(String(c.name).toLowerCase())) : classes;

        // Each class already carries its own `curriculum` + `grades`. Return the
        // school-default `grades` too for any consumer that wants the fallback set.
        res.json({ classes: shown, grades });
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
        const { rows } = await buildExamResults(database, examId);
        const inForm = form ? rows.filter(r => String(r.className).toLowerCase().includes(form.toLowerCase()) || String(r.stream).toLowerCase().includes(form.toLowerCase())) : rows;
        // Grade this FORM using its assigned template (letters / EE-ME / EE1…), so the
        // mean grade, subject grades and breakdown axis all match the report card.
        const formGrading = await resolveGrading(database, undefined, form || (inForm[0]?.className || ''));
        const scale = formGrading.scale;
        const meanGradeForm = (mp: number) => formGrading.meanGrade(mp);
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
            name, points: round(v.pts / v.n, 2), grade: meanGradeForm(v.pts / v.n), change: 0,
        })).sort((a, b) => b.points - a.points);

        // Grade breakdown (streams as rows, grades as columns) — re-graded with the
        // form's template so the axis and counts match its scale.
        const breakdown = Object.entries(byStream).map(([stream, list]) => {
            const counts: Record<string, number> = {}; grades.forEach((g: string) => counts[g] = 0);
            list.forEach(r => { const g = meanGradeForm(r.meanPoints); counts[g] = (counts[g] || 0) + 1; });
            return { stream, counts };
        });

        res.json({
            examTitle: formatExamName(exam, form || undefined),
            form, satCount: inForm.length, grades,
            averages: { meanPoints: round(meanPoints, 2), meanPct: round(meanPct, 2), meanGrade: meanGradeForm(meanPoints) },
            streams, subjects, breakdown,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Merit list — ranked by total points, with subject marks + grades.
router.get('/analytics/merit-list', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const examId = String(req.query.examId || '');
        const form = String(req.query.form || '');
        const { rows } = await buildExamResults(database, examId);
        const inForm = form ? rows.filter(r => String(r.className).toLowerCase().includes(form.toLowerCase()) || String(r.stream).toLowerCase().includes(form.toLowerCase())) : rows;

        // Previous exam's overall grade per student (for the PG column). Template-graded.
        const exams = await examsChrono(database);
        const idx = exams.findIndex((e: any) => String(e._id) === examId);
        const prev = idx > 0 ? exams[idx - 1] : null;
        const prevGradeByStudent: Record<string, string> = {};
        if (prev) {
            const { rows: prevRows } = await buildExamResults(database, String(prev._id));
            prevRows.forEach((r: any) => { prevGradeByStudent[String(r.studentId)] = r.meanGrade; });
        }

        res.json({
            students: inForm.map(r => ({
                position: (r as any).position, adm: r.adm, name: r.name, stream: r.stream,
                totalPoints: r.totalPoints, totalMarks: r.totalMarks,
                avg: r.meanPct,                    // AVG (mean %)
                meanGrade: r.meanGrade,            // MG (current, template-graded)
                prevGrade: prevGradeByStudent[String(r.studentId)] || null,   // PG
                subjects: r.subjects,
            })),
        });
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

// Current vs previous exam comparison — overall means + per-subject deltas.
router.get('/analytics/compare', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const examId = String(req.query.examId || '');
        const form = String(req.query.form || '');
        const exams = await examsChrono(database);
        const idx = exams.findIndex((e: any) => String(e._id) === examId);
        const prev = idx > 0 ? exams[idx - 1] : null;

        const inForm = (rows: any[]) => form ? rows.filter(r => String(r.className).toLowerCase().includes(form.toLowerCase()) || String(r.stream).toLowerCase().includes(form.toLowerCase())) : rows;
        const cur = await buildExamResults(database, examId);
        const curRows = inForm(cur.rows);
        const prevData = prev ? await buildExamResults(database, String(prev._id)) : null;
        const prevRows = prevData ? inForm(prevData.rows) : [];

        const mean = (rows: any[], key: string) => rows.length ? round(rows.reduce((a, r) => a + (r[key] || 0), 0) / rows.length, 2) : 0;
        // Per-subject mean % in each exam.
        const subjMean = (rows: any[]) => {
            const m: Record<string, { sum: number; n: number }> = {};
            rows.forEach(r => r.subjects.forEach((s: any) => { (m[s.name] ||= { sum: 0, n: 0 }); m[s.name].sum += s.pct; m[s.name].n++; }));
            return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, round(v.sum / v.n, 1)]));
        };
        const curSub = subjMean(curRows); const prevSub = subjMean(prevRows);
        const subjects = Array.from(new Set([...Object.keys(curSub), ...Object.keys(prevSub)])).sort().map(name => ({
            name, current: curSub[name] ?? null, previous: prevSub[name] ?? null,
            change: (curSub[name] != null && prevSub[name] != null) ? round(curSub[name] - prevSub[name], 1) : null,
        }));

        res.json({
            currentExam: formatExamName(exams[idx]),
            previousExam: prev ? formatExamName(prev) : null,
            current: { meanPoints: mean(curRows, 'meanPoints'), meanPct: mean(curRows, 'meanPct'), students: curRows.length },
            previous: prev ? { meanPoints: mean(prevRows, 'meanPoints'), meanPct: mean(prevRows, 'meanPct'), students: prevRows.length } : null,
            delta: prev ? { meanPoints: round(mean(curRows, 'meanPoints') - mean(prevRows, 'meanPoints'), 2), meanPct: round(mean(curRows, 'meanPct') - mean(prevRows, 'meanPct'), 1) } : null,
            subjects,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// List subjects available for an exam (optionally within a form/class).
router.get('/analytics/subjects', async (req: Request, res: Response) => {
    try {
        const examId = String(req.query.examId || '');
        const { rows } = await buildExamResults(db(req), examId);
        const form = String(req.query.form || '');
        const inForm = form ? rows.filter(r => String(r.className).toLowerCase().includes(form.toLowerCase()) || String(r.stream).toLowerCase().includes(form.toLowerCase())) : rows;
        const subjects = Array.from(new Set(inForm.flatMap(r => r.subjects.map((s: any) => s.name)))).sort();
        res.json({ subjects });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Per-subject sheet: every student (in a form/stream) for ONE subject, ranked by
// that subject's marks, with grade + position. Like a merit list for a subject.
router.get('/analytics/subject-sheet', async (req: Request, res: Response) => {
    try {
        const examId = String(req.query.examId || '');
        const subject = String(req.query.subject || '');
        const form = String(req.query.form || '');
        if (!subject) return res.status(400).json({ message: 'subject required' });
        const { rows } = await buildExamResults(db(req), examId);
        const inForm = form ? rows.filter(r => String(r.className).toLowerCase().includes(form.toLowerCase()) || String(r.stream).toLowerCase().includes(form.toLowerCase())) : rows;
        const list = inForm
            .map(r => { const s = r.subjects.find((x: any) => x.name === subject); return s ? { adm: r.adm, name: r.name, stream: r.stream, marks: s.marks, pct: s.pct, grade: s.grade, points: s.points } : null; })
            .filter(Boolean) as any[];
        list.sort((a, b) => b.marks - a.marks);
        list.forEach((r, i) => { r.position = i + 1; });
        const avg = list.length ? round(list.reduce((a, r) => a + r.pct, 0) / list.length, 1) : 0;
        res.json({ subject, form, count: list.length, average: avg, students: list });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Class-level structure: groups streams into their class level (Form 4 contains
// 4 East/West/South). Returns per-class-level + per-stream means for an exam.
router.get('/analytics/class-levels', async (req: Request, res: Response) => {
    try {
        const examId = String(req.query.examId || '');
        const { rows } = await buildExamResults(db(req), examId);
        const byLevel: Record<string, any[]> = {};
        rows.forEach(r => { (byLevel[levelOf(r.className || r.stream)] ||= []).push(r); });
        // Each class level's mean grade uses that level's configured grading.
        const gradingFor = makeGradingCache(db(req));
        const levelScale: Record<string, GradeBand[]> = {};
        for (const [level, list] of Object.entries(byLevel)) levelScale[level] = (await gradingFor(undefined, level || list[0]?.className)).scale;
        const classes = Object.entries(byLevel).map(([level, list]) => {
            const scale = levelScale[level];
            const byStream: Record<string, any[]> = {};
            list.forEach(r => { (byStream[r.stream || '(No stream)'] ||= []).push(r); });
            const mp = list.reduce((a, r) => a + r.meanPoints, 0) / list.length;
            return {
                level, students: list.length,
                meanPoints: round(mp, 2), meanPct: round(list.reduce((a, r) => a + r.meanPct, 0) / list.length, 2),
                meanGrade: meanGradeFromPoints(scale, mp),
                streams: Object.entries(byStream).map(([stream, sl]) => ({ stream, students: sl.length, meanPoints: round(sl.reduce((a, r) => a + r.meanPoints, 0) / sl.length, 2), meanPct: round(sl.reduce((a, r) => a + r.meanPct, 0) / sl.length, 2), meanGrade: meanGradeFromPoints(scale, sl.reduce((a, r) => a + r.meanPoints, 0) / sl.length) })).sort((a, b) => b.meanPoints - a.meanPoints),
            };
        }).sort((a, b) => a.level.localeCompare(b.level));
        const live = await liveLevels(db(req));
        res.json({ classes: live ? classes.filter(c => live.has(c.level.toLowerCase())) : classes });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Analytics settings: which views show, and the thresholds the insights use.
router.get('/analytics/settings', async (req: Request, res: Response) => {
    try { res.json(await analyticsSettings(db(req))); } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put('/analytics/settings', enforceCrud('exams', 'update'), async (req: Request, res: Response) => {
    try {
        const b = req.body || {};
        const cur = await analyticsSettings(db(req));
        const views: any = { ...cur.views };
        for (const k of Object.keys(DEFAULT_ANALYTICS_SETTINGS.views)) if (typeof b.views?.[k] === 'boolean') views[k] = b.views[k];
        const clamp = (v: any, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
        const next = {
            views,
            passMarkPct: clamp(b.passMarkPct, 0, 100, cur.passMarkPct),
            atRiskBelowPct: clamp(b.atRiskBelowPct, 0, 100, cur.atRiskBelowPct),
            atRiskDropPoints: clamp(b.atRiskDropPoints, 0, 12, cur.atRiskDropPoints),
            topBottomCount: Math.round(clamp(b.topBottomCount, 3, 50, cur.topBottomCount)),
            defaultToCurrentTerm: typeof b.defaultToCurrentTerm === 'boolean' ? b.defaultToCurrentTerm : cur.defaultToCurrentTerm,
            updatedAt: new Date(),
        };
        await db(req).collection('analytics_settings').updateOne({ _id: 'default' as any }, { $set: next }, { upsert: true });
        res.json(next);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Extra insights for one form in one exam: grade spread + pass rate, gender, top &
// bottom learners, learners at risk, and subjects ranked (with their teachers).
router.get('/analytics/insights', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const examId = String(req.query.examId || '');
        const form = String(req.query.form || '');
        if (!examId) return res.status(400).json({ message: 'examId required' });
        const settings = await analyticsSettings(database);
        const inForm = (rows: any[]) => form ? rows.filter(r => levelOf(r.className || r.stream).toLowerCase() === levelOf(form).toLowerCase()) : rows;
        const { rows: all } = await buildExamResults(database, examId);
        const rows = inForm(all);
        const g = await resolveGrading(database, undefined, form || (rows[0]?.className || ''));
        const grades = g.scale.map((b: any) => b.grade);
        const mean = (list: any[], k: string) => list.length ? round(list.reduce((a, r) => a + (r[k] || 0), 0) / list.length, 2) : 0;

        // grade spread + pass rate
        const counts: Record<string, number> = {}; grades.forEach((x: string) => counts[x] = 0);
        rows.forEach(r => { const gr = g.meanGrade(r.meanPoints); counts[gr] = (counts[gr] || 0) + 1; });
        const passed = rows.filter(r => r.meanPct >= settings.passMarkPct).length;
        const distribution = { grades, counts, passMarkPct: settings.passMarkPct, passed, failed: rows.length - passed, passRate: rows.length ? round((passed / rows.length) * 100, 1) : 0 };

        // gender
        const gKey = (v: string) => /^f/i.test(v) ? 'Female' : /^m/i.test(v) ? 'Male' : 'Not recorded';
        const byG: Record<string, any[]> = {};
        rows.forEach(r => { (byG[gKey(r.gender)] ||= []).push(r); });
        const gender = Object.entries(byG).map(([k, list]) => ({ gender: k, students: list.length, meanPoints: mean(list, 'meanPoints'), meanPct: mean(list, 'meanPct'), meanGrade: g.meanGrade(mean(list, 'meanPoints')) }))
            .sort((a, b) => b.meanPoints - a.meanPoints);

        // top / bottom
        const n = settings.topBottomCount;
        const ranked = [...rows].sort((a, b) => b.meanPoints - a.meanPoints || b.meanPct - a.meanPct);
        const brief = (r: any) => ({ name: r.name, adm: r.adm, stream: r.stream, meanPoints: r.meanPoints, meanPct: r.meanPct, meanGrade: g.meanGrade(r.meanPoints) });
        const top = ranked.slice(0, n).map(brief);
        const bottom = ranked.slice(-n).reverse().map(brief);

        // at risk: low mean %, or a big drop since the previous exam
        const exams = await examsChrono(database);
        const idx = exams.findIndex((e: any) => String(e._id) === examId);
        const prev = idx > 0 ? exams[idx - 1] : null;
        const prevBy: Record<string, any> = {};
        if (prev) inForm((await buildExamResults(database, String(prev._id))).rows).forEach((r: any) => prevBy[r.studentId] = r);
        const atRisk = rows.map(r => {
            const p = prevBy[r.studentId];
            const drop = p ? round(p.meanPoints - r.meanPoints, 2) : 0;
            const reasons: string[] = [];
            if (r.meanPct < settings.atRiskBelowPct) reasons.push(`Mean ${r.meanPct}% (below ${settings.atRiskBelowPct}%)`);
            if (p && drop >= settings.atRiskDropPoints && drop > 0) reasons.push(`Dropped ${drop} points since ${formatExamName(prev)}`);
            const weak = r.subjects.filter((s: any) => s.pct < settings.passMarkPct).map((s: any) => s.name);
            return reasons.length ? { ...brief(r), reasons, weakSubjects: weak } : null;
        }).filter(Boolean).sort((a: any, b: any) => a.meanPct - b.meanPct);

        // subjects ranked, with the teacher who teaches each in this form
        const staff: any[] = await database.collection('staff').find({}, { projection: { name: 1, employeeName: 1, firstName: 1, lastName: 1, subjectAssignments: 1 } }).toArray().catch(() => []);
        const teachersOf = (subject: string) => [...new Set(staff.filter(t => (t.subjectAssignments || []).some((a: any) =>
            String(a.subjectName || a.subject || '').toLowerCase() === subject.toLowerCase() && (!form || levelOf(a.className || a.class || '').toLowerCase() === levelOf(form).toLowerCase())))
            .map(t => t.employeeName || t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim()).filter(Boolean))];
        const agg: Record<string, { pts: number; pct: number; n: number; pass: number }> = {};
        rows.forEach(r => r.subjects.forEach((s: any) => { const a = (agg[s.name] ||= { pts: 0, pct: 0, n: 0, pass: 0 }); a.pts += s.points; a.pct += s.pct; a.n++; if (s.pct >= settings.passMarkPct) a.pass++; }));
        const subjectRanking = Object.entries(agg).map(([name, a]) => ({
            name, students: a.n, meanPoints: round(a.pts / a.n, 2), meanPct: round(a.pct / a.n, 1), grade: g.meanGrade(a.pts / a.n),
            passRate: round((a.pass / a.n) * 100, 1), teachers: teachersOf(name),
        })).sort((x, y) => y.meanPoints - x.meanPoints).map((x, i) => ({ rank: i + 1, ...x }));

        res.json({ settings, students: rows.length, distribution, gender, top, bottom, atRisk, subjectRanking, comparedTo: prev ? formatExamName(prev) : null });
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
            const marks = await onlyPublished(database, await database.collection('exam_marks').find({ examId: String(e._id), studentId: sid }).toArray().catch(() => []));
            if (!marks.length) continue;
            const mean = marks.reduce((a: number, m: any) => { const max = num(m.totalMarks) || 100; return a + (max > 0 ? (num(m.marksObtained) / max) * 100 : 0); }, 0) / marks.length;
            series.push({ exam: formatExamName(e), mean: round(mean, 1) });
        }
        res.json({ series });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
