/**
 * CBC Assessment module — Competency-Based Curriculum assessment.
 *
 * Uses achievement LEVELS (EE/ME/AE/BE) not marks. Owns: cbc_learning_areas,
 * cbc_competencies, cbc_strands, cbc_activities, cbc_assessments (records),
 * cbc_comments, cbc_feedback, cbc_settings. Integrates with the existing
 * students / classes collections.
 */
import { actorOf } from '../../lib/actor';
import { Router, Request } from 'express';
import { ObjectId } from 'mongodb';
import { getMetaDb } from '../../lib/mongodb';
import { sanitizeUpdate } from '../../lib/sanitizeUpdate';
import { resolveScope } from '../../lib/dataScope';
import { loadTerms, pickCurrent, belongsToTerm, termOption, TermInfo } from './cbcTerm';

const router = Router();
const db = (req: Request) => (req as any).tenantDb || getMetaDb();
const oid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };
const user = (req: Request) => actorOf(req);

// Achievement level → numeric score for averaging (EE=4 … BE=1).
const LEVEL_SCORE: Record<string, number> = { EE: 4, ME: 3, AE: 2, BE: 1 };
const SCORE_LEVEL = (avg: number) => avg >= 3.5 ? 'EE' : avg >= 2.5 ? 'ME' : avg >= 1.5 ? 'AE' : 'BE';
const LEVEL_LABEL: Record<string, string> = { EE: 'Exceeding Expectation', ME: 'Meeting Expectation', AE: 'Approaching Expectation', BE: 'Below Expectation' };

const audit = async (req: Request, action: string, target: string, meta: any = {}) => {
    try { await db(req).collection('audit_logs').insertOne({ scope: 'cbc', action, target, meta, user: user(req), changedAt: new Date(), createdAt: new Date() }); } catch { /* */ }
};

// ── Terms ─────────────────────────────────────────────────────────────────────
// Activities, assessments and comments belong to a term; learning areas, competencies
// and strands are the curriculum itself and are not term-based.
const TERM_SCOPED = new Set(['cbc_activities', 'cbc_assessments', 'cbc_comments', 'cbc_feedback']);

// Which term is this request looking at? Everyone gets the CURRENT term. Only admins may
// pick another (?term=Term 1&year=2026) or every term (?term=all) — enforced here, so a
// teacher can't widen it from the browser. With no terms set up, nothing is filtered.
async function termScope(req: Request) {
    const d = db(req);
    const [terms, scope] = await Promise.all([loadTerms(d), resolveScope(req, d)]);
    const current = pickCurrent(terms);
    const asked = String(req.query.term || '').trim(), askedYear = String(req.query.year || '').trim();
    let sel: TermInfo | null = current, all = false;
    if (scope.isAdmin && asked) {
        if (asked.toLowerCase() === 'all') all = true;
        else sel = terms.find(t => t.term.toLowerCase() === asked.toLowerCase() && (!askedYear || t.year === askedYear)) || current;
    }
    return { terms, current, sel, all, isAdmin: scope.isAdmin, match: (doc: any) => all || !sel || belongsToTerm(doc, sel) };
}

// Tag a new record with its term: the current one, unless an admin chose another.
async function stampTerm(req: Request, body: any) {
    const { current, isAdmin } = await termScope(req);
    if (!current || (isAdmin && String(body?.term || '').trim())) return body;
    return { ...body, term: current.term, year: current.year };
}

// GET /cbc/terms — the terms to show in the selector, and whether this user may switch.
router.get('/cbc/terms', async (req, res) => {
    try {
        const ts = await termScope(req);
        res.json({ terms: ts.terms.map(termOption), current: ts.current ? termOption(ts.current) : null, canChoose: ts.isAdmin });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Generic soft-delete CRUD ──────────────────────────────────────────────────
function crud(coll: string) {
    const scoped = TERM_SCOPED.has(coll);
    router.get(`/${coll}`, async (req, res) => {
        try {
            const q: any = { deletedAt: { $exists: false } };
            // (term/year on term-scoped collections are handled by termScope, not as exact matches)
            ['grade', 'class', 'learningArea', 'teacher', ...(scoped ? [] : ['term', 'year']), 'studentId', 'status', 'strand'].forEach(k => { if (req.query[k]) q[k] = String(req.query[k]); });
            let rows = await db(req).collection(coll).find(q).sort({ createdAt: -1 }).limit(2000).toArray();
            if (scoped) rows = rows.filter((await termScope(req)).match);
            res.json(rows);
        } catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.post(`/${coll}`, async (req, res) => {
        try { const doc = { ...(scoped ? await stampTerm(req, req.body) : req.body), createdBy: user(req), createdAt: new Date() }; const r = await db(req).collection(coll).insertOne(doc); await audit(req, `create_${coll}`, String(r.insertedId)); res.status(201).json({ _id: r.insertedId, ...doc }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.patch(`/${coll}/:id`, async (req, res) => {
        try { await db(req).collection(coll).updateOne({ _id: oid(req.params.id)! }, { $set: { ...sanitizeUpdate(req.body), updatedAt: new Date(), updatedBy: user(req) } }); await audit(req, `update_${coll}`, req.params.id); res.json({ ok: true }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.delete(`/${coll}/:id`, async (req, res) => {
        try { await db(req).collection(coll).updateOne({ _id: oid(req.params.id)! }, { $set: { deletedAt: new Date(), deletedBy: user(req) } }); await audit(req, `delete_${coll}`, req.params.id); res.json({ ok: true }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
}
['cbc_learning_areas', 'cbc_competencies', 'cbc_strands', 'cbc_activities', 'cbc_assessments', 'cbc_comments', 'cbc_feedback'].forEach(crud);

// Bulk save assessment records (whole class at once).
router.post('/cbc/assessments/bulk', async (req, res) => {
    try {
        const records: any[] = Array.isArray(req.body?.records) ? req.body.records : [];
        if (!records.length) return res.status(400).json({ message: 'No records' });
        // Each assessment belongs to the term of its activity (else the current term).
        const activity: any = req.body.activityId ? await db(req).collection('cbc_activities').findOne({ _id: oid(String(req.body.activityId))! }).catch(() => null) : null;
        const { current } = await termScope(req);
        const term = activity?.term || current?.term || '', year = activity?.year || current?.year || '';
        const ops = records.filter(r => r.studentId && r.level).map(r => ({
            updateOne: {
                filter: { studentId: r.studentId, activityId: r.activityId },
                update: { $set: { ...r, term: r.term || term, year: r.year || year, level: r.level, score: LEVEL_SCORE[r.level] || 0, updatedAt: new Date(), updatedBy: user(req) }, $setOnInsert: { createdAt: new Date() } },
                upsert: true,
            },
        }));
        if (ops.length) await db(req).collection('cbc_assessments').bulkWrite(ops);
        await audit(req, 'bulk_assess', req.body.activityId || '', { count: ops.length });
        res.json({ ok: true, saved: ops.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Seed the 7 CBC core competencies + default learning areas.
router.post('/cbc/seed', async (req, res) => {
    try {
        const comps = ['Communication and Collaboration', 'Critical Thinking and Problem Solving', 'Creativity and Imagination', 'Citizenship', 'Digital Literacy', 'Learning to Learn', 'Self-Efficacy'];
        if (await db(req).collection('cbc_competencies').countDocuments({}) === 0)
            await db(req).collection('cbc_competencies').insertMany(comps.map(name => ({ name, active: true, createdAt: new Date() })));
        const areas = ['Mathematics', 'English', 'Kiswahili', 'Science & Technology', 'Social Studies', 'Creative Arts', 'Physical & Health Education', 'Religious Education', 'Agriculture', 'Home Science'];
        if (await db(req).collection('cbc_learning_areas').countDocuments({}) === 0)
            await db(req).collection('cbc_learning_areas').insertMany(areas.map(name => ({ name, active: true, createdAt: new Date() })));
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/cbc/stats', async (req, res) => {
    try {
        const ts = await termScope(req);
        const [students, areas, allActivities, allAssessments, allComments] = await Promise.all([
            db(req).collection('students').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('cbc_learning_areas').countDocuments({ deletedAt: { $exists: false } }).catch(() => 0),
            db(req).collection('cbc_activities').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('cbc_assessments').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('cbc_comments').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
        ]);
        // Only this term's activities, assessments and comments feed the dashboard.
        const activities = allActivities.filter(ts.match), assessments = allAssessments.filter(ts.match);
        const comments = allComments.filter(ts.match).length;
        const avgScore = assessments.length ? assessments.reduce((s: number, a: any) => s + (a.score || 0), 0) / assessments.length : 0;

        const byGrade: Record<string, { sum: number; n: number }> = {}; const byArea: Record<string, { sum: number; n: number }> = {}; const compAch: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 }; const byGender: Record<string, { sum: number; n: number }> = {};
        const studentById: Record<string, any> = {}; students.forEach((s: any) => studentById[String(s._id)] = s);
        assessments.forEach((a: any) => {
            const st = studentById[a.studentId]; const g = a.grade || st?.currentClass || 'Unknown'; const ar = a.learningArea || 'Other';
            (byGrade[g] ||= { sum: 0, n: 0 }); byGrade[g].sum += a.score || 0; byGrade[g].n++;
            (byArea[ar] ||= { sum: 0, n: 0 }); byArea[ar].sum += a.score || 0; byArea[ar].n++;
            compAch[a.level] = (compAch[a.level] || 0) + 1;
            const sx = st?.gender || 'Unknown'; (byGender[sx] ||= { sum: 0, n: 0 }); byGender[sx].sum += a.score || 0; byGender[sx].n++;
        });
        const avgMap = (m: Record<string, { sum: number; n: number }>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v.sum / v.n * 25)]));   // 0-100 scale
        const completed = activities.filter((a: any) => assessments.some((s: any) => s.activityId === String(a._id))).length;

        res.json({
            cards: {
                totalLearners: students.length, learningAreas: areas,
                assessmentsConducted: activities.length, completed, pending: activities.length - completed,
                averageScore: Math.round(avgScore * 25),
                needSupport: assessments.filter((a: any) => a.level === 'BE').map((a: any) => a.studentId).filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i).length,
                outstandingComments: Math.max(0, students.length - comments),
            },
            charts: { byGrade: avgMap(byGrade), byArea: avgMap(byArea), competencyAchievement: compAch, byGender: avgMap(byGender), completionRate: { Completed: completed, Pending: activities.length - completed } },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Learner progress ──────────────────────────────────────────────────────────
router.get('/cbc/progress/:studentId', async (req, res) => {
    try {
        const sid = req.params.studentId;
        const ts = await termScope(req);
        const student = await db(req).collection('students').findOne({ _id: oid(sid)! }).catch(() => null);
        const assessments = (await db(req).collection('cbc_assessments').find({ studentId: sid, deletedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray().catch(() => [])).filter(ts.match);
        const comments = (await db(req).collection('cbc_comments').find({ studentId: sid }).sort({ createdAt: -1 }).toArray().catch(() => [])).filter(ts.match);

        const byArea: Record<string, { sum: number; n: number }> = {};
        assessments.forEach((a: any) => { (byArea[a.learningArea || 'Other'] ||= { sum: 0, n: 0 }); byArea[a.learningArea || 'Other'].sum += a.score || 0; byArea[a.learningArea || 'Other'].n++; });
        const areas = Object.entries(byArea).map(([area, v]) => { const avg = v.sum / v.n; return { area, level: SCORE_LEVEL(avg), levelLabel: LEVEL_LABEL[SCORE_LEVEL(avg)], assessments: v.n }; });
        const strengths = areas.filter(a => a.level === 'EE' || a.level === 'ME').map(a => a.area);
        const improve = areas.filter(a => a.level === 'AE' || a.level === 'BE').map(a => a.area);

        res.json({ student, areas, assessments, comments, strengths, improvement: improve, total: assessments.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── CBC report card ───────────────────────────────────────────────────────────
router.get('/cbc/report-card/:studentId', async (req, res) => {
    try {
        const sid = req.params.studentId;
        const ts = await termScope(req);   // the report card is for one term: the current one unless an admin picked another
        const student = await db(req).collection('students').findOne({ _id: oid(sid)! }).catch(() => null);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const assessments = (await db(req).collection('cbc_assessments').find({ studentId: sid, deletedAt: { $exists: false } }).toArray().catch(() => [])).filter(ts.match);

        const byArea: Record<string, { sum: number; n: number; strands: Record<string, { sum: number; n: number }> }> = {};
        assessments.forEach((a: any) => {
            const ar = a.learningArea || 'Other'; (byArea[ar] ||= { sum: 0, n: 0, strands: {} });
            byArea[ar].sum += a.score || 0; byArea[ar].n++;
            if (a.strand) { (byArea[ar].strands[a.strand] ||= { sum: 0, n: 0 }); byArea[ar].strands[a.strand].sum += a.score || 0; byArea[ar].strands[a.strand].n++; }
        });
        const learningAreas = Object.entries(byArea).map(([area, v]) => ({
            area, level: SCORE_LEVEL(v.sum / v.n), levelLabel: LEVEL_LABEL[SCORE_LEVEL(v.sum / v.n)],
            strands: Object.entries(v.strands).map(([strand, sv]) => ({ strand, level: SCORE_LEVEL(sv.sum / sv.n), levelLabel: LEVEL_LABEL[SCORE_LEVEL(sv.sum / sv.n)] })),
        }));

        const comments = (await db(req).collection('cbc_comments').find({ studentId: sid }).sort({ createdAt: -1 }).toArray().catch(() => [])).filter(ts.match);
        const tenant = await getMetaDb().collection('Tenant').findOne({ _id: oid(String((req as any).tenantContext?.tenantId || '')) || undefined as any }).catch(() => null);

        res.json({
            school: { name: tenant?.instituteName || tenant?.name || 'School', logo: tenant?.logo || '' },
            student: { name: student.studentName || student.name, admissionNo: student.registrationNo || student.admNo, grade: student.currentClass || student.studentClass, gender: student.gender },
            term: ts.all ? 'All terms' : (ts.sel?.term || ''), year: ts.all ? '' : (ts.sel?.year || String(new Date().getFullYear())),
            learningAreas,
            teacherComment: comments.find((c: any) => /teacher/i.test(c.type || ''))?.text || comments[0]?.text || '',
            headComment: comments.find((c: any) => /head|principal/i.test(c.type || ''))?.text || '',
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/cbc/settings', async (req, res) => {
    const s: any = (await db(req).collection('cbc_settings').findOne({})) || {};
    res.json({ achievementLevels: s.achievementLevels ?? [{ code: 'EE', label: 'Exceeding Expectation' }, { code: 'ME', label: 'Meeting Expectation' }, { code: 'AE', label: 'Approaching Expectation' }, { code: 'BE', label: 'Below Expectation' }], assessmentTypes: s.assessmentTypes ?? ['Observation', 'Practical Activity', 'Oral Assessment', 'Project', 'Portfolio', 'Written Exercise', 'Quiz', 'Group Work', 'Presentation', 'Experiment'], parentAccess: s.parentAccess ?? true, ...s });
});
router.patch('/cbc/settings', async (req, res) => { await db(req).collection('cbc_settings').updateOne({}, { $set: { ...req.body, updatedAt: new Date() } }, { upsert: true }); res.json({ ok: true }); });

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/cbc/reports/:kind', async (req, res) => {
    try {
        const ts = await termScope(req);
        const assessments = (await db(req).collection('cbc_assessments').find({ deletedAt: { $exists: false } }).toArray().catch(() => [])).filter(ts.match);
        const students = await db(req).collection('students').find({}).toArray().catch(() => []);
        const byId: Record<string, any> = {}; students.forEach((s: any) => byId[String(s._id)] = s);
        const kind = req.params.kind;
        if (kind === 'competency') {
            const m: Record<string, Record<string, number>> = {};
            assessments.forEach((a: any) => { const c = a.learningArea || 'Other'; (m[c] ||= { EE: 0, ME: 0, AE: 0, BE: 0 }); m[c][a.level] = (m[c][a.level] || 0) + 1; });
            return res.json({ title: 'Competency Report', columns: [{ key: 'area', label: 'Learning Area' }, { key: 'EE', label: 'EE' }, { key: 'ME', label: 'ME' }, { key: 'AE', label: 'AE' }, { key: 'BE', label: 'BE' }], rows: Object.entries(m).map(([area, v]) => ({ area, ...v })) });
        }
        if (kind === 'learning-area') {
            const m: Record<string, { sum: number; n: number }> = {};
            assessments.forEach((a: any) => { (m[a.learningArea || 'Other'] ||= { sum: 0, n: 0 }); m[a.learningArea || 'Other'].sum += a.score || 0; m[a.learningArea || 'Other'].n++; });
            return res.json({ title: 'Learning Area Report', columns: [{ key: 'area', label: 'Learning Area' }, { key: 'level', label: 'Mean Level' }, { key: 'count', label: 'Assessments' }], rows: Object.entries(m).map(([area, v]) => ({ area, level: SCORE_LEVEL(v.sum / v.n), count: v.n })) });
        }
        // Default: learner progress summary
        const byStudent: Record<string, { sum: number; n: number }> = {};
        assessments.forEach((a: any) => { (byStudent[a.studentId] ||= { sum: 0, n: 0 }); byStudent[a.studentId].sum += a.score || 0; byStudent[a.studentId].n++; });
        return res.json({ title: 'Learner Progress Report', columns: [{ key: 'learner', label: 'Learner' }, { key: 'grade', label: 'Grade' }, { key: 'level', label: 'Overall' }, { key: 'count', label: 'Assessments' }], rows: Object.entries(byStudent).map(([id, v]) => ({ learner: byId[id]?.studentName || byId[id]?.name || '—', grade: byId[id]?.currentClass || '', level: SCORE_LEVEL(v.sum / v.n), count: v.n })) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
