/**
 * CBC Assessment module — Competency-Based Curriculum assessment.
 *
 * Uses achievement LEVELS (EE/ME/AE/BE) not marks. Owns: cbc_learning_areas,
 * cbc_competencies, cbc_strands, cbc_activities, cbc_assessments (records),
 * cbc_comments, cbc_feedback, cbc_settings. Integrates with the existing
 * students / classes collections.
 */
import { Router, Request } from 'express';
import { ObjectId } from 'mongodb';
import { getMetaDb } from '../../lib/mongodb';

const router = Router();
const db = (req: Request) => (req as any).tenantDb || getMetaDb();
const oid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };
const user = (req: Request) => (req as any).tenantContext?.user || 'admin';

// Achievement level → numeric score for averaging (EE=4 … BE=1).
const LEVEL_SCORE: Record<string, number> = { EE: 4, ME: 3, AE: 2, BE: 1 };
const SCORE_LEVEL = (avg: number) => avg >= 3.5 ? 'EE' : avg >= 2.5 ? 'ME' : avg >= 1.5 ? 'AE' : 'BE';
const LEVEL_LABEL: Record<string, string> = { EE: 'Exceeding Expectation', ME: 'Meeting Expectation', AE: 'Approaching Expectation', BE: 'Below Expectation' };

const audit = async (req: Request, action: string, target: string, meta: any = {}) => {
    try { await db(req).collection('audit_logs').insertOne({ scope: 'cbc', action, target, meta, user: user(req), changedAt: new Date(), createdAt: new Date() }); } catch { /* */ }
};

// ── Generic soft-delete CRUD ──────────────────────────────────────────────────
function crud(coll: string) {
    router.get(`/${coll}`, async (req, res) => {
        try {
            const q: any = { deletedAt: { $exists: false } };
            ['grade', 'class', 'learningArea', 'teacher', 'term', 'year', 'studentId', 'status', 'strand'].forEach(k => { if (req.query[k]) q[k] = String(req.query[k]); });
            res.json(await db(req).collection(coll).find(q).sort({ createdAt: -1 }).limit(2000).toArray());
        } catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.post(`/${coll}`, async (req, res) => {
        try { const doc = { ...req.body, createdBy: user(req), createdAt: new Date() }; const r = await db(req).collection(coll).insertOne(doc); await audit(req, `create_${coll}`, String(r.insertedId)); res.status(201).json({ _id: r.insertedId, ...doc }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.patch(`/${coll}/:id`, async (req, res) => {
        try { await db(req).collection(coll).updateOne({ _id: oid(req.params.id)! }, { $set: { ...req.body, updatedAt: new Date(), updatedBy: user(req) } }); await audit(req, `update_${coll}`, req.params.id); res.json({ ok: true }); }
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
        const ops = records.filter(r => r.studentId && r.level).map(r => ({
            updateOne: {
                filter: { studentId: r.studentId, activityId: r.activityId },
                update: { $set: { ...r, level: r.level, score: LEVEL_SCORE[r.level] || 0, updatedAt: new Date(), updatedBy: user(req) }, $setOnInsert: { createdAt: new Date() } },
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
        const [students, areas, activities, assessments] = await Promise.all([
            db(req).collection('students').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('cbc_learning_areas').countDocuments({ deletedAt: { $exists: false } }).catch(() => 0),
            db(req).collection('cbc_activities').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('cbc_assessments').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
        ]);
        const comments = await db(req).collection('cbc_comments').countDocuments({ deletedAt: { $exists: false } }).catch(() => 0);
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
        const student = await db(req).collection('students').findOne({ _id: oid(sid)! }).catch(() => null);
        const assessments = await db(req).collection('cbc_assessments').find({ studentId: sid, deletedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray().catch(() => []);
        const comments = await db(req).collection('cbc_comments').find({ studentId: sid }).sort({ createdAt: -1 }).toArray().catch(() => []);

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
        const { term, year } = req.query as any;
        const student = await db(req).collection('students').findOne({ _id: oid(sid)! }).catch(() => null);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const q: any = { studentId: sid, deletedAt: { $exists: false } };
        if (term) q.term = term; if (year) q.year = year;
        const assessments = await db(req).collection('cbc_assessments').find(q).toArray().catch(() => []);

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

        const comments = await db(req).collection('cbc_comments').find({ studentId: sid }).sort({ createdAt: -1 }).toArray().catch(() => []);
        const tenant = await getMetaDb().collection('Tenant').findOne({ _id: oid(String((req as any).tenantContext?.tenantId || '')) || undefined as any }).catch(() => null);

        res.json({
            school: { name: tenant?.instituteName || tenant?.name || 'School', logo: tenant?.logo || '' },
            student: { name: student.studentName || student.name, admissionNo: student.registrationNo || student.admNo, grade: student.currentClass || student.studentClass, gender: student.gender },
            term: term || '', year: year || String(new Date().getFullYear()),
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
        const assessments = await db(req).collection('cbc_assessments').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
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
