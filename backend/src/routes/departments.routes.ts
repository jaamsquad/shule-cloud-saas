import { Router, Request, Response } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireDeptAccess, resolveDeptAccess } from '../lib/departmentAccess';
import { recordAudit } from '../lib/audit';
import { buildExamResults } from './analytics.routes';

const router = Router();
const db = (req: any) => req.tenantDb || getMetaDb();
const oid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };

// ── Departments ───────────────────────────────────────────────────────────────
router.get('/departments', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const access = await resolveDeptAccess(req, d);
        let departments = await d.collection('departments').find({}).sort({ name: 1 }).toArray();
        // HODs only see departments they may access; admins see all.
        if (!access.isAdmin) departments = departments.filter((dep: any) => access.can(String(dep._id)));
        const members = await d.collection('department_members').find({}).toArray();
        const counts: Record<string, number> = {};
        members.forEach((m: any) => { counts[String(m.departmentId)] = (counts[String(m.departmentId)] || 0) + 1; });
        res.json(departments.map((dep: any) => ({ ...dep, memberCount: counts[String(dep._id)] || 0 })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/departments/summary', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const [total, active, members, pendingLeave] = await Promise.all([
            d.collection('departments').countDocuments({}),
            d.collection('departments').countDocuments({ status: { $ne: 'Inactive' } }),
            d.collection('department_members').countDocuments({}),
            d.collection('leave_requests').countDocuments({ status: { $in: ['Pending', 'HOD Approved'] } }),
        ]);
        res.json({ total, active, totalStaffAssigned: members, pendingLeave });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/departments', async (req: Request, res: Response) => {
    try {
        const doc = { ...req.body, status: req.body?.status || 'Active', createdAt: new Date(), updatedAt: new Date() };
        const r = await db(req).collection('departments').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/departments/:id', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(400).json({ message: 'Invalid id' });
        const { _id, ...body } = req.body || {};
        await db(req).collection('departments').updateOne({ _id: id }, { $set: { ...body, updatedAt: new Date() } });
        await recordAudit(req, { action: 'Edited', entity: 'department', entityId: req.params.id, departmentId: req.params.id });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/departments/:id', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('departments').deleteOne({ _id: id });
        await db(req).collection('department_members').deleteMany({ departmentId: req.params.id });
        await recordAudit(req, { action: 'Deleted', entity: 'department', entityId: req.params.id, departmentId: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Head of Department ─────────────────────────────────────────────────────────
router.post('/departments/:id/head', async (req: Request, res: Response) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(400).json({ message: 'Invalid id' });
        const { staffId, staffName, appointmentDate, acting } = req.body || {};
        await db(req).collection('departments').updateOne({ _id: id }, { $set: { headOfDepartment: staffId, headName: staffName, headAppointmentDate: appointmentDate, headActing: !!acting, updatedAt: new Date() } });
        // Ensure the HOD is also a member flagged as head.
        await db(req).collection('department_members').updateOne(
            { departmentId: req.params.id, staffId },
            { $set: { departmentId: req.params.id, staffId, staffName, role: 'Department Head', isHead: true, startDate: appointmentDate, status: 'Active' } },
            { upsert: true },
        );
        await db(req).collection('department_members').updateMany({ departmentId: req.params.id, staffId: { $ne: staffId } }, { $set: { isHead: false } });
        res.json({ message: 'HOD assigned' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Members ────────────────────────────────────────────────────────────────────
router.get('/departments/:id/members', async (req: Request, res: Response) => {
    try { res.json(await db(req).collection('department_members').find({ departmentId: req.params.id }).sort({ isHead: -1, staffName: 1 }).toArray()); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/departments/:id/members', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const { staffId, staffName, role, startDate, subjects } = req.body || {};
        if (!staffId) return res.status(400).json({ message: 'Select a staff member' });
        await db(req).collection('department_members').updateOne(
            { departmentId: req.params.id, staffId },
            { $set: { departmentId: req.params.id, staffId, staffName, role: role || 'Teacher', subjects: Array.isArray(subjects) ? subjects : [], isHead: false, startDate: startDate || null, status: 'Active' } },
            { upsert: true },
        );
        await recordAudit(req, { action: 'Created', entity: 'department_member', entityId: staffId, departmentId: req.params.id, meta: { staffName, role } });
        res.status(201).json({ message: 'Member added' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/departments/:id/members/:memberId', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const mid = oid(req.params.memberId); if (!mid) return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('department_members').deleteOne({ _id: mid });
        await recordAudit(req, { action: 'Deleted', entity: 'department_member', entityId: req.params.memberId, departmentId: req.params.id });
        res.json({ message: 'Removed' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Meetings ───────────────────────────────────────────────────────────────────
router.get('/departments/:id/meetings', async (req: Request, res: Response) => {
    try { res.json(await db(req).collection('department_meetings').find({ departmentId: req.params.id }).sort({ date: -1 }).toArray()); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/departments/:id/meetings', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const doc = { ...req.body, departmentId: req.params.id, createdAt: new Date() };
        const r = await db(req).collection('department_meetings').insertOne(doc);
        await recordAudit(req, { action: 'Created', entity: 'department_meeting', entityId: String(r.insertedId), departmentId: req.params.id, meta: { title: doc.title } });
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/departments/:id/meetings/:meetingId', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const mid = oid(req.params.meetingId); if (!mid) return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('department_meetings').deleteOne({ _id: mid });
        await recordAudit(req, { action: 'Deleted', entity: 'department_meeting', entityId: req.params.meetingId, departmentId: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Leave requests (HOD → HR/Admin workflow) ────────────────────────────────────
router.get('/leave-requests', async (req: Request, res: Response) => {
    try {
        const q: any = {};
        if (req.query.departmentId) q.departmentId = req.query.departmentId;
        if (req.query.status) q.status = req.query.status;
        res.json(await db(req).collection('leave_requests').find(q).sort({ createdAt: -1 }).toArray());
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/leave-requests', async (req: Request, res: Response) => {
    try {
        const doc = { ...req.body, status: 'Pending', hodApproval: null, hrApproval: null, createdAt: new Date() };
        const r = await db(req).collection('leave_requests').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/leave-requests/:id', async (req: Request, res: Response) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(400).json({ message: 'Invalid id' });
        const { action, by, note } = req.body || {};
        const stamp = { by: by || 'Admin', note: note || '', at: new Date() };
        let set: any = { updatedAt: new Date() };
        if (action === 'hod-approve') set = { ...set, status: 'HOD Approved', hodApproval: stamp };
        else if (action === 'hr-approve') set = { ...set, status: 'Approved', hrApproval: stamp };
        else if (action === 'reject') set = { ...set, status: 'Rejected', rejection: stamp };
        else return res.status(400).json({ message: 'Unknown action' });
        await db(req).collection('leave_requests').updateOne({ _id: id }, { $set: set });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── HOD Dashboard ────────────────────────────────────────────────────────────────
// A rich, data-backed home page for a Department Head. Everything is scoped to the
// department's own subjects (matched by NAME — subjects aren't tagged with a
// departmentId in this schema) and its assigned members. Returns:
//   subjects[], teachers[], studentCount, examsAwaitingApproval, avgPerformance,
//   teachersMissingMarks[], upcomingMeetings[], teachingProgress, subjectPerformance[].
const DEFAULT_SCALE = [
    { grade: 'A', from: 80, upto: 100, points: 12 }, { grade: 'A-', from: 75, upto: 79, points: 11 },
    { grade: 'B+', from: 70, upto: 74, points: 10 }, { grade: 'B', from: 65, upto: 69, points: 9 },
    { grade: 'B-', from: 60, upto: 64, points: 8 }, { grade: 'C+', from: 55, upto: 59, points: 7 },
    { grade: 'C', from: 50, upto: 54, points: 6 }, { grade: 'C-', from: 45, upto: 49, points: 5 },
    { grade: 'D+', from: 40, upto: 44, points: 4 }, { grade: 'D', from: 35, upto: 39, points: 3 },
    { grade: 'D-', from: 30, upto: 34, points: 2 }, { grade: 'E', from: 0, upto: 29, points: 1 },
];
const NUM = (v: any) => Number(v) || 0;
const NORM = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

router.get('/departments/:id/hod-dashboard', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const id = oid(req.params.id);
        const dep: any = id ? await d.collection('departments').findOne({ _id: id }) : null;
        if (!dep) return res.status(404).json({ message: 'Department not found' });

        // Department subjects: the explicit list on the department, else derive from
        // the members' taught subjects. Matched case-insensitively everywhere.
        const members = await d.collection('department_members').find({ departmentId: req.params.id }).toArray().catch(() => []);
        let subjects: string[] = Array.isArray(dep.subjects) ? dep.subjects.filter(Boolean) : [];
        const subjectSet = new Set(subjects.map(NORM));

        // Grading scale (school default).
        const gradeRec: any = await d.collection('grading_criteria').findOne({}).catch(() => null);
        const raw = gradeRec?.grades || gradeRec?.gradingScale || [];
        const scale = raw.length ? raw.map((g: any, i: number) => ({
            grade: g.grade ?? g.name ?? '', from: NUM(g.from ?? g.minPercent ?? g.min),
            upto: NUM(g.upto ?? g.maxPercent ?? g.max ?? 100), points: NUM(g.points ?? g.point ?? (raw.length - i)),
        })).sort((a: any, b: any) => b.upto - a.upto) : DEFAULT_SCALE;
        const gradeOf = (pct: number) => scale.find((s: any) => pct >= s.from && pct <= s.upto) || scale[scale.length - 1];

        // Marks for department subjects only. If the department has no subject list,
        // we can't scope by subject — return marks-derived panels empty rather than leak.
        const allMarks = subjectSet.size
            ? (await d.collection('exam_marks').find({}).toArray().catch(() => []))
                .filter((m: any) => subjectSet.has(NORM(m.subjectName || m.subject)))
            : [];

        // Students taking department subjects (distinct studentIds in scoped marks).
        const studentIds = new Set(allMarks.map((m: any) => String(m.studentId)));

        // Average department performance (mean % across all scoped marks).
        const pcts = allMarks.map((m: any) => { const mx = NUM(m.totalMarks) || 100; return mx > 0 ? (NUM(m.marksObtained) / mx) * 100 : 0; });
        const avgPct = pcts.length ? pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length : 0;

        // Subject-by-subject performance (mean %, grade, entries).
        const bySubject: Record<string, { sum: number; n: number }> = {};
        for (const m of allMarks) {
            const key = m.subjectName || m.subject || 'Subject';
            const mx = NUM(m.totalMarks) || 100; const pct = mx > 0 ? (NUM(m.marksObtained) / mx) * 100 : 0;
            (bySubject[key] ||= { sum: 0, n: 0 }); bySubject[key].sum += pct; bySubject[key].n += 1;
        }
        const subjectPerformance = Object.entries(bySubject).map(([name, v]) => {
            const mean = v.n ? v.sum / v.n : 0;
            return { subject: name, meanPct: Math.round(mean * 10) / 10, grade: gradeOf(mean).grade, entries: v.n };
        }).sort((a, b) => b.meanPct - a.meanPct);
        // Backfill the subjects list from marks when the department has none configured.
        if (!subjects.length) subjects = subjectPerformance.map(s => s.subject);

        // Exams awaiting approval that touch a department subject. Uses the same
        // approvalStatus convention as questions/question-papers ('Pending').
        const pendingPapers = await d.collection('question_papers')
            .find({ approvalStatus: 'Pending' }).toArray().catch(() => []);
        const examsAwaitingApproval = pendingPapers.filter((p: any) =>
            !subjectSet.size || subjectSet.has(NORM(p.subject || p.subjectName))).length;

        // Teachers who haven't submitted marks: department members whose taught
        // subject has NO marks in the latest exam. We approximate "latest exam" as
        // the most recent examId present in scoped marks.
        const latestExamId = allMarks.length
            ? allMarks.slice().sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]?.examId
            : null;
        const submittedSubjects = new Set(
            allMarks.filter((m: any) => !latestExamId || String(m.examId) === String(latestExamId))
                .map((m: any) => NORM(m.subjectName || m.subject)));
        const teachers = members.filter((m: any) => !/support|technician|secretary/i.test(m.role || ''));
        const teachersMissingMarks = teachers
            .filter((t: any) => {
                const taught = (t.subjects && Array.isArray(t.subjects) ? t.subjects : (t.subject ? [t.subject] : []))
                    .map(NORM).filter((s: string) => subjectSet.has(s));
                if (!taught.length) return false; // no dept subject assigned → not counted
                return !taught.some((s: string) => submittedSubjects.has(s));
            })
            .map((t: any) => ({ staffId: t.staffId, staffName: t.staffName, role: t.role }));

        // Upcoming meetings.
        const now = new Date();
        const meetings = await d.collection('department_meetings').find({ departmentId: req.params.id }).sort({ date: 1 }).toArray().catch(() => []);
        const upcomingMeetings = meetings.filter((m: any) => m.date && new Date(m.date) >= now).slice(0, 5);

        // Teaching progress (schemes of work / lesson plans). These are matched to the
        // department by SUBJECT NAME (they carry subjectName, not a departmentId).
        const [allSchemes, allPlans] = await Promise.all([
            d.collection('schemes_of_work').find({}).toArray().catch(() => []),
            d.collection('lesson_plans').find({}).toArray().catch(() => []),
        ]);
        const deptSchemes = subjectSet.size ? allSchemes.filter((s: any) => subjectSet.has(NORM(s.subjectName || s.subject))) : [];
        const deptPlans = subjectSet.size ? allPlans.filter((p: any) => subjectSet.has(NORM(p.subjectName || p.subject))) : [];
        const isDone = (x: any) => /complete|done|approved|published/i.test(String(x.status || ''));
        const schemesTotal = deptSchemes.length, schemesDone = deptSchemes.filter(isDone).length;
        const plansTotal = deptPlans.length, plansDone = deptPlans.filter(isDone).length;
        // Scheme coverage = weeks with a topic filled ÷ total weeks, averaged across schemes.
        const schemeCoverage = deptSchemes.length ? Math.round(
            deptSchemes.reduce((acc: number, s: any) => {
                const weeks = Array.isArray(s.weeks) ? s.weeks : [];
                const filled = weeks.filter((w: any) => String(w.topic || '').trim()).length;
                return acc + (weeks.length ? filled / weeks.length : 0);
            }, 0) / deptSchemes.length * 100) : 0;

        res.json({
            department: { id: String(dep._id), name: dep.name, code: dep.code || '', head: dep.headName || null },
            subjects,
            teachers: teachers.map((t: any) => ({ staffId: t.staffId, staffName: t.staffName, role: t.role, isHead: !!t.isHead })),
            counts: {
                subjects: subjects.length,
                teachers: teachers.length,
                students: studentIds.size,
                examsAwaitingApproval,
                teachersMissingMarks: teachersMissingMarks.length,
                upcomingMeetings: upcomingMeetings.length,
            },
            avgPerformance: { meanPct: Math.round(avgPct * 10) / 10, grade: gradeOf(avgPct).grade },
            teachersMissingMarks,
            upcomingMeetings,
            teachingProgress: {
                tracked: schemesTotal + plansTotal > 0,
                schemes: { total: schemesTotal, completed: schemesDone },
                lessonPlans: { total: plansTotal, completed: plansDone },
                coverage: schemeCoverage,
            },
            subjectPerformance,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Per-department dashboard ─────────────────────────────────────────────────────
router.get('/departments/:id/dashboard', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const id = oid(req.params.id);
        const dep = id ? await d.collection('departments').findOne({ _id: id }) : null;
        const [totalStaff, pendingLeave, meetings] = await Promise.all([
            d.collection('department_members').countDocuments({ departmentId: req.params.id }),
            d.collection('leave_requests').countDocuments({ departmentId: req.params.id, status: { $in: ['Pending', 'HOD Approved'] } }),
            d.collection('department_meetings').find({ departmentId: req.params.id }).sort({ date: -1 }).limit(5).toArray(),
        ]);
        const now = new Date();
        const upcoming = meetings.filter((m: any) => m.date && new Date(m.date) >= now).length;
        res.json({ head: dep?.headName || null, totalStaff, pendingLeave, upcomingMeetings: upcoming, recentMeetings: meetings });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── CBC Assessment ───────────────────────────────────────────────────────────────
// For CBC-curriculum schools: learning areas, rubrics (competency levels), competency
// reports and assessment oversight, scoped to the department's subjects/learning areas.
const CBC_LEVELS = [
    { code: 'EE', label: 'Exceeding Expectation' }, { code: 'ME', label: 'Meeting Expectation' },
    { code: 'AE', label: 'Approaching Expectation' }, { code: 'BE', label: 'Below Expectation' },
];
router.get('/departments/:id/cbc', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const dep: any = await d.collection('departments').findOne({ _id: oid(req.params.id) as any });
        if (!dep) return res.status(404).json({ message: 'Department not found' });
        const subjectSet = new Set((Array.isArray(dep.subjects) ? dep.subjects : []).map(NORM));
        const inDept = (s: string) => subjectSet.size === 0 || subjectSet.has(NORM(s));

        const [areas, activities, assessments, competencies] = await Promise.all([
            d.collection('cbc_learning_areas').find({}).toArray().catch(() => []),
            d.collection('cbc_activities').find({}).toArray().catch(() => []),
            d.collection('cbc_assessments').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            d.collection('cbc_competencies').find({}).toArray().catch(() => []),
        ]);
        // Learning areas owned by this department (by name match against dept subjects).
        const deptAreas = areas.filter((a: any) => inDept(a.name)).map((a: any) => ({ id: String(a._id), name: a.name, strand: a.strand || '' }));
        // Activities within dept learning areas.
        const deptActivities = activities.filter((a: any) => inDept(a.learningArea || a.title));
        const actById: Record<string, any> = {}; deptActivities.forEach((a: any) => { actById[String(a._id)] = a; });
        const deptAssessments = assessments.filter((x: any) => actById[String(x.activityId)]);

        // Competency-level distribution (rubric) over dept assessments.
        const levelDist: Record<string, number> = {};
        deptAssessments.forEach((x: any) => { const lv = x.level || '—'; levelDist[lv] = (levelDist[lv] || 0) + 1; });
        const rubric = CBC_LEVELS.map(l => ({ ...l, count: levelDist[l.code] || 0 }));

        // Per learning-area competency report (level breakdown + learners assessed).
        const byArea: Record<string, { area: string; total: number; learners: Set<string>; levels: Record<string, number> }> = {};
        deptAssessments.forEach((x: any) => {
            const act = actById[String(x.activityId)];
            const area = act?.learningArea || act?.title || 'Learning Area'; const key = NORM(area);
            const b = (byArea[key] ||= { area, total: 0, learners: new Set(), levels: {} });
            b.total++; if (x.studentId) b.learners.add(String(x.studentId));
            b.levels[x.level] = (b.levels[x.level] || 0) + 1;
        });
        const competencyReport = Object.values(byArea).map(b => ({
            area: b.area, assessed: b.total, learners: b.learners.size,
            levels: CBC_LEVELS.map(l => ({ code: l.code, count: b.levels[l.code] || 0 })),
        })).sort((a, b) => b.assessed - a.assessed);

        // Assessment approval batches per learning area (reuses mark_approvals model,
        // scoped by entity 'cbc'). One batch per learning area.
        const cbcBatches = await d.collection('cbc_approvals').find({ departmentId: req.params.id }).toArray().catch(() => []);

        res.json({
            department: { id: String(dep._id), name: dep.name },
            isCbc: deptAreas.length > 0 || deptActivities.length > 0,
            summary: {
                learningAreas: deptAreas.length,
                activities: deptActivities.length,
                assessments: deptAssessments.length,
                learners: new Set(deptAssessments.map((x: any) => String(x.studentId))).size,
                competencies: competencies.length,
            },
            learningAreas: deptAreas,
            rubric,
            competencyReport,
            approvals: cbcBatches.map((b: any) => ({ id: String(b._id), area: b.area, status: b.status, moderatedBy: b.moderatedBy || null })),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Approve / reject a learning area's assessments (CBC). Creates/updates a per-area
// cbc_approvals batch, guarded to the department and audit-logged.
router.patch('/departments/:id/cbc/:action', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const action = req.params.action;
        if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Unknown action' });
        const area = String(req.body?.area || '');
        if (!area) return res.status(400).json({ message: 'area required' });
        const status = action === 'approve' ? 'Approved' : 'Rejected';
        const by = (req as any).tenantContext?.user?.name || 'HOD';
        await d.collection('cbc_approvals').updateOne(
            { departmentId: req.params.id, areaNorm: NORM(area) },
            { $set: { departmentId: req.params.id, area, areaNorm: NORM(area), status, moderatedBy: by, moderatedAt: new Date(), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true },
        );
        await recordAudit(req, { action: status, entity: 'cbc_assessment', entityId: area, departmentId: req.params.id, meta: { area } });
        res.json({ message: `Assessments ${status.toLowerCase()}`, status });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Examination Management ───────────────────────────────────────────────────────
// Department-scoped view of question banks, question moderation, exam schedules,
// invigilators, online exams and exam statistics. Everything is matched to the
// department by SUBJECT NAME (or subjectId when the dept pins subject ids).
router.get('/departments/:id/examinations', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const dep: any = await d.collection('departments').findOne({ _id: oid(req.params.id) as any });
        if (!dep) return res.status(404).json({ message: 'Department not found' });
        const subjectSet = new Set((Array.isArray(dep.subjects) ? dep.subjects : []).map(NORM));
        const inDept = (s: string) => subjectSet.size === 0 || subjectSet.has(NORM(s));

        const [questions, papers, schedules, subjectDefs, onlineExams] = await Promise.all([
            d.collection('questions').find({}).toArray().catch(() => []),
            d.collection('question_papers').find({}).toArray().catch(() => []),
            d.collection('exam_schedules').find({}).toArray().catch(() => []),
            d.collection('subjects').find({}).toArray().catch(() => []),
            d.collection('online_exams').find({}).toArray().catch(() => []),
        ]);
        // subjectId → name, so records that only carry an id still resolve to a subject.
        const subjNameById: Record<string, string> = {};
        subjectDefs.forEach((s: any) => { subjNameById[String(s._id)] = s.name || s.subjectName || ''; });
        const subjectOf = (x: any) => x.subjectName || x.subject || subjNameById[String(x.subjectId || '')] || '';

        const deptQuestions = questions.filter((q: any) => inDept(subjectOf(q)));
        const deptPapers = papers.filter((p: any) => inDept(subjectOf(p)));
        const deptSchedules = schedules.filter((s: any) => inDept(subjectOf(s)));
        const deptOnline = onlineExams.filter((e: any) => inDept(subjectOf(e)));

        const statusCount = (arr: any[]) => {
            const c: Record<string, number> = {};
            arr.forEach((x: any) => { const s = x.approvalStatus || 'Pending'; c[s] = (c[s] || 0) + 1; });
            return c;
        };
        // Question bank grouped by subject with approval breakdown.
        const bankBySubject: Record<string, { subject: string; total: number; approved: number; pending: number; rejected: number }> = {};
        deptQuestions.forEach((q: any) => {
            const label = subjectOf(q) || 'Unknown'; const key = NORM(label);
            const b = (bankBySubject[key] ||= { subject: label, total: 0, approved: 0, pending: 0, rejected: 0 });
            b.total++;
            const st = String(q.approvalStatus || 'Pending');
            if (/approv/i.test(st)) b.approved++; else if (/reject/i.test(st)) b.rejected++; else b.pending++;
        });

        res.json({
            department: { id: String(dep._id), name: dep.name },
            summary: {
                questions: deptQuestions.length,
                questionsPending: deptQuestions.filter((q: any) => !/approv/i.test(String(q.approvalStatus || '')) && !/reject/i.test(String(q.approvalStatus || ''))).length,
                papers: deptPapers.length,
                papersPending: deptPapers.filter((p: any) => /pending/i.test(String(p.approvalStatus || ''))).length,
                schedules: deptSchedules.length,
                onlineExams: deptOnline.length,
            },
            questionBank: Object.values(bankBySubject).sort((a, b) => b.total - a.total),
            pendingQuestions: deptQuestions
                .filter((q: any) => !/approv|reject/i.test(String(q.approvalStatus || '')))
                .slice(0, 100)
                .map((q: any) => ({ id: String(q._id), subject: subjectOf(q), text: (q.questionText || q.text || q.question || '').slice(0, 160), type: q.questionType || q.type || '', difficulty: q.difficulty || '', status: q.approvalStatus || 'Pending' })),
            papers: deptPapers.map((p: any) => ({ id: String(p._id), title: p.paperTitle || p.title || '', subject: subjectOf(p), status: p.approvalStatus || 'Draft', totalMarks: p.totalMarks || 0 })),
            schedules: deptSchedules
                .map((s: any) => ({ id: String(s._id), subject: subjectOf(s), className: s.className || '', room: s.room || '', invigilator: s.invigilator || '', date: s.date || '', startTime: s.startTime || '', endTime: s.endTime || '' }))
                .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date))),
            onlineExams: deptOnline.map((e: any) => ({ id: String(e._id), title: e.title || e.examName || '', subject: subjectOf(e), status: e.status || '', startAt: e.startAt || e.startTime || '' })),
            paperStatusCount: statusCount(deptPapers),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Moderate a single question (approve / reject). Reuses the questions.approvalStatus
// convention; guarded so only an HOD owning the question's subject (or admin) may act.
router.patch('/departments/:id/questions/:questionId/:action', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const action = req.params.action;
        if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Unknown action' });
        const qid = oid(req.params.questionId); if (!qid) return res.status(400).json({ message: 'Invalid id' });
        const q: any = await d.collection('questions').findOne({ _id: qid });
        if (!q) return res.status(404).json({ message: 'Question not found' });
        const status = action === 'approve' ? 'Approved' : 'Rejected';
        await d.collection('questions').updateOne({ _id: qid }, { $set: { approvalStatus: status, moderatedBy: (req as any).tenantContext?.user?.name || 'HOD', moderatedAt: new Date(), updatedAt: new Date() } });
        await recordAudit(req, { action: status, entity: 'question', entityId: req.params.questionId, departmentId: req.params.id, meta: { subject: q.subjectName || q.subject || '' } });
        res.json({ message: `Question ${status.toLowerCase()}` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Lesson & Teacher Supervision ─────────────────────────────────────────────────
// Department-scoped view of schemes of work, lesson plans and per-teacher
// supervision (workload, coverage, lesson & mark-submission status). Schemes and
// plans are matched to the department by SUBJECT NAME.
router.get('/departments/:id/supervision', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const dep: any = await d.collection('departments').findOne({ _id: oid(req.params.id) as any });
        if (!dep) return res.status(404).json({ message: 'Department not found' });
        const subjectSet = new Set((Array.isArray(dep.subjects) ? dep.subjects : []).map(NORM));
        const inDept = (s: string) => subjectSet.size === 0 || subjectSet.has(NORM(s));
        const isDone = (x: any) => /complete|done|approved|published/i.test(String(x.status || ''));
        const coverageOf = (s: any) => {
            const weeks = Array.isArray(s.weeks) ? s.weeks : [];
            const filled = weeks.filter((w: any) => String(w.topic || '').trim()).length;
            return weeks.length ? Math.round(filled / weeks.length * 100) : 0;
        };

        const [allSchemes, allPlans, members, staffSubjectLinks, approvals] = await Promise.all([
            d.collection('schemes_of_work').find({}).toArray().catch(() => []),
            d.collection('lesson_plans').find({}).toArray().catch(() => []),
            d.collection('department_members').find({ departmentId: req.params.id }).toArray().catch(() => []),
            d.collection('staff_subjects').find({}).toArray().catch(() => []),
            d.collection('mark_approvals').find({}).toArray().catch(() => []),
        ]);
        const schemes = allSchemes.filter((s: any) => inDept(s.subjectName || s.subject));
        const plans = allPlans.filter((p: any) => inDept(p.subjectName || p.subject));

        // Scheme / plan lists with coverage + completion.
        const schemeList = schemes.map((s: any) => ({
            id: String(s._id), title: s.title || `${s.subjectName} scheme`, subject: s.subjectName || s.subject || '',
            className: s.className || '', term: s.term || '', year: s.year || '', status: s.status || 'Draft',
            coverage: coverageOf(s), completed: isDone(s),
        })).sort((a: any, b: any) => a.subject.localeCompare(b.subject));
        const planList = plans.map((p: any) => ({
            id: String(p._id), topic: p.topic || '', subject: p.subjectName || p.subject || '',
            className: p.className || '', date: p.date || '', status: p.status || 'Draft', completed: isDone(p),
        })).sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));

        // Subject → teacher (staff_subjects), scoped to dept subjects.
        const subjectTeacher: Record<string, string> = {};
        staffSubjectLinks.forEach((l: any) => {
            const name = NORM(l.subjectName || l.subject);
            if (name && inDept(name) && !subjectTeacher[name]) subjectTeacher[name] = l.teacherName || l.staffName || '';
        });
        // Mark-submission status per subject (latest batch per subject).
        const statusBySubject: Record<string, string> = {};
        approvals.forEach((a: any) => { if (inDept(a.subject)) statusBySubject[a.subjectNorm] = a.status; });

        // Per-teacher supervision: workload (subjects/classes), scheme & plan counts,
        // coverage, lesson completion, mark-submission status.
        const teachers = members.filter((m: any) => !/support|technician|secretary/i.test(m.role || ''));
        const teacherSupervision = teachers.map((t: any) => {
            const taught = (Array.isArray(t.subjects) ? t.subjects : (t.subject ? [t.subject] : []))
                .filter((s: string) => inDept(s));
            const mySchemes = schemes.filter((s: any) => taught.some((sub: string) => NORM(sub) === NORM(s.subjectName || s.subject)));
            const myPlans = plans.filter((p: any) => taught.some((sub: string) => NORM(sub) === NORM(p.subjectName || p.subject)));
            const classes = Array.from(new Set([...mySchemes, ...myPlans].map((x: any) => x.className).filter(Boolean)));
            const avgCoverage = mySchemes.length ? Math.round(mySchemes.reduce((a: number, s: any) => a + coverageOf(s), 0) / mySchemes.length) : 0;
            const markStatuses = taught.map((s: string) => statusBySubject[NORM(s)] || 'Not submitted');
            return {
                staffId: t.staffId, staffName: t.staffName, role: t.role, isHead: !!t.isHead,
                subjects: taught, classes,
                schemes: mySchemes.length, schemesDone: mySchemes.filter(isDone).length,
                lessonPlans: myPlans.length, lessonPlansDone: myPlans.filter(isDone).length,
                coverage: avgCoverage,
                markSubmission: markStatuses,
            };
        });

        res.json({
            department: { id: String(dep._id), name: dep.name },
            summary: {
                schemes: schemeList.length, schemesCompleted: schemeList.filter((s: any) => s.completed).length,
                lessonPlans: planList.length, lessonPlansCompleted: planList.filter((p: any) => p.completed).length,
                avgCoverage: schemeList.length ? Math.round(schemeList.reduce((a: number, s: any) => a + s.coverage, 0) / schemeList.length) : 0,
                teachers: teacherSupervision.length,
            },
            schemes: schemeList,
            lessonPlans: planList,
            teacherSupervision,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Department Academic Analysis ─────────────────────────────────────────────────
// Full HOD performance analytics scoped to the department's subjects. For a given
// exam (and optional compare exam) returns: subject/class/stream/teacher performance,
// grading distribution, weak & top classes/students, and a term/year comparison.
const levelOf = (s: string) => {
    const m = String(s || '').match(/(form|grade)\s*\d+/i);
    if (m) { const w = m[0].replace(/\s+/g, ' ').trim().toLowerCase(); return w.charAt(0).toUpperCase() + w.slice(1); }
    return String(s || 'Class').trim();
};

router.get('/departments/:id/analysis', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const dep: any = await d.collection('departments').findOne({ _id: oid(req.params.id) as any });
        if (!dep) return res.status(404).json({ message: 'Department not found' });
        const examId = String(req.query.examId || '');
        if (!examId) return res.status(400).json({ message: 'examId required' });
        const compareExamId = req.query.compareExamId ? String(req.query.compareExamId) : '';

        const deptSubjects: string[] = Array.isArray(dep.subjects) ? dep.subjects : [];
        const subjectSet = new Set(deptSubjects.map(NORM));
        const inDept = (name: string) => subjectSet.size === 0 || subjectSet.has(NORM(name));

        // Reuse the canonical results builder, then keep only department subjects.
        const { rows } = await buildExamResults(d, examId);
        const scoped = rows
            .map((r: any) => ({ ...r, subjects: (r.subjects || []).filter((s: any) => inDept(s.name)) }))
            .filter((r: any) => r.subjects.length > 0);

        // Recompute per-student aggregates over department subjects only.
        for (const r of scoped) {
            r.deptTotalPct = r.subjects.reduce((a: number, s: any) => a + s.pct, 0);
            r.deptMeanPct = r.subjects.length ? r.deptTotalPct / r.subjects.length : 0;
            r.deptPoints = r.subjects.reduce((a: number, s: any) => a + s.points, 0);
            r.deptMeanPoints = r.subjects.length ? r.deptPoints / r.subjects.length : 0;
        }

        const roundN = (n: number, p = 1) => { const f = 10 ** p; return Math.round((Number(n) || 0) * f) / f; };
        const meanOf = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

        // ── Subject performance ──
        const bySubject: Record<string, number[]> = {};
        scoped.forEach((r: any) => r.subjects.forEach((s: any) => { (bySubject[s.name] ||= []).push(s.pct); }));
        const subjectPerformance = Object.entries(bySubject)
            .map(([subject, pcts]) => ({ subject, meanPct: roundN(meanOf(pcts)), entries: pcts.length }))
            .sort((a, b) => b.meanPct - a.meanPct);

        // ── Class performance (by level, e.g. Form 4) ──
        const byClass: Record<string, number[]> = {};
        scoped.forEach((r: any) => { (byClass[levelOf(r.className)] ||= []).push(r.deptMeanPct); });
        const classPerformance = Object.entries(byClass)
            .map(([className, pcts]) => ({ className, meanPct: roundN(meanOf(pcts)), students: pcts.length }))
            .sort((a, b) => b.meanPct - a.meanPct);

        // ── Stream performance ──
        const byStream: Record<string, number[]> = {};
        scoped.forEach((r: any) => { (byStream[r.stream || '(No stream)'] ||= []).push(r.deptMeanPct); });
        const streamPerformance = Object.entries(byStream)
            .map(([stream, pcts]) => ({ stream, meanPct: roundN(meanOf(pcts)), students: pcts.length }))
            .sort((a, b) => b.meanPct - a.meanPct);

        // ── Teacher performance (map dept subjects → teacher via staff_subjects) ──
        const staffSubjectLinks = await d.collection('staff_subjects').find({}).toArray().catch(() => []);
        const subjectTeacher: Record<string, string> = {};
        staffSubjectLinks.forEach((l: any) => {
            const name = NORM(l.subjectName || l.subject);
            if (name && inDept(name) && !subjectTeacher[name]) subjectTeacher[name] = l.teacherName || l.staffName || '';
        });
        const byTeacher: Record<string, { name: string; pcts: number[]; subjects: Set<string> }> = {};
        scoped.forEach((r: any) => r.subjects.forEach((s: any) => {
            const t = subjectTeacher[NORM(s.name)] || 'Unassigned';
            (byTeacher[t] ||= { name: t, pcts: [], subjects: new Set() });
            byTeacher[t].pcts.push(s.pct); byTeacher[t].subjects.add(s.name);
        }));
        const teacherPerformance = Object.values(byTeacher)
            .map(t => ({ teacher: t.name, meanPct: roundN(meanOf(t.pcts)), entries: t.pcts.length, subjects: [...t.subjects] }))
            .sort((a, b) => b.meanPct - a.meanPct);

        // ── Grading distribution (counts of each grade over dept-subject marks) ──
        const gradeDist: Record<string, number> = {};
        scoped.forEach((r: any) => r.subjects.forEach((s: any) => { gradeDist[s.grade] = (gradeDist[s.grade] || 0) + 1; }));
        const gradingDistribution = Object.entries(gradeDist).map(([grade, count]) => ({ grade, count }));

        // ── Weak & top classes / students ──
        const topClasses = classPerformance.slice(0, 3);
        const weakClasses = [...classPerformance].reverse().slice(0, 3);
        const rankedStudents = [...scoped].sort((a, b) => b.deptMeanPct - a.deptMeanPct)
            .map((r: any) => ({ name: r.name, adm: r.adm, className: r.className, stream: r.stream, meanPct: roundN(r.deptMeanPct), meanGrade: r.meanGrade }));
        const topStudents = rankedStudents.slice(0, 10);
        const weakStudents = [...rankedStudents].reverse().slice(0, 10);

        // ── Overall department averages ──
        const overall = {
            meanPct: roundN(meanOf(scoped.map((r: any) => r.deptMeanPct))),
            meanPoints: roundN(meanOf(scoped.map((r: any) => r.deptMeanPoints)), 2),
            students: scoped.length,
            subjects: subjectPerformance.length,
        };

        // ── Comparison (term or year — any other exam) ──
        let comparison: any = null;
        if (compareExamId && compareExamId !== examId) {
            const { rows: prevRows } = await buildExamResults(d, compareExamId);
            const prevScoped = prevRows
                .map((r: any) => ({ ...r, subjects: (r.subjects || []).filter((s: any) => inDept(s.name)) }))
                .filter((r: any) => r.subjects.length > 0)
                .map((r: any) => ({ ...r, deptMeanPct: r.subjects.length ? r.subjects.reduce((a: number, s: any) => a + s.pct, 0) / r.subjects.length : 0 }));
            const prevMean = roundN(meanOf(prevScoped.map((r: any) => r.deptMeanPct)));
            // Per-subject change.
            const prevBySubject: Record<string, number[]> = {};
            prevScoped.forEach((r: any) => r.subjects.forEach((s: any) => { (prevBySubject[s.name] ||= []).push(s.pct); }));
            const subjectChange = subjectPerformance.map(sp => {
                const prev = prevBySubject[sp.subject] ? roundN(meanOf(prevBySubject[sp.subject])) : null;
                return { subject: sp.subject, current: sp.meanPct, previous: prev, change: prev != null ? roundN(sp.meanPct - prev) : null };
            });
            comparison = { previousMeanPct: prevMean, currentMeanPct: overall.meanPct, change: roundN(overall.meanPct - prevMean), subjectChange };
        }

        res.json({
            department: { id: String(dep._id), name: dep.name },
            examId, compareExamId: compareExamId || null,
            overall, subjectPerformance, classPerformance, streamPerformance, teacherPerformance,
            gradingDistribution, topClasses, weakClasses, topStudents, weakStudents, comparison,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Department Timetable + conflict detection ────────────────────────────────────
// Timetable slots for the department's subjects, teaching-load per teacher, and
// conflicts (a teacher booked in two places at the same day+period).
router.get('/departments/:id/timetable', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const dep: any = await d.collection('departments').findOne({ _id: oid(req.params.id) as any });
        if (!dep) return res.status(404).json({ message: 'Department not found' });
        const subjectSet = new Set((Array.isArray(dep.subjects) ? dep.subjects : []).map(NORM));
        const inDept = (s: string) => subjectSet.size === 0 || subjectSet.has(NORM(s));

        const [slots, periods] = await Promise.all([
            d.collection('timetable_slots').find({}).toArray().catch(() => []),
            d.collection('timetable_periods').find({}).toArray().catch(() => []),
        ]);
        const periodName: Record<string, string> = {}; periods.forEach((p: any) => { periodName[String(p._id)] = p.name || p.label || ''; });
        const deptSlots = slots.filter((s: any) => inDept(s.subjectName || s.subject));

        // Teaching load per teacher (lesson count within dept subjects).
        const load: Record<string, { teacher: string; lessons: number; subjects: Set<string>; classes: Set<string> }> = {};
        deptSlots.forEach((s: any) => {
            const t = s.teacherName || 'Unassigned';
            const l = (load[t] ||= { teacher: t, lessons: 0, subjects: new Set(), classes: new Set() });
            l.lessons++; if (s.subjectName) l.subjects.add(s.subjectName); if (s.className) l.classes.add(s.className);
        });
        const teachingLoad = Object.values(load).map(l => ({ teacher: l.teacher, lessons: l.lessons, subjects: [...l.subjects], classes: [...l.classes] })).sort((a, b) => b.lessons - a.lessons);

        // Conflicts: a teacher assigned to >1 slot at the same day+period (across the
        // WHOLE timetable, not just dept, so we catch clashes with other departments).
        const byTeacherSlot: Record<string, any[]> = {};
        slots.forEach((s: any) => {
            if (!s.teacherId && !s.teacherName) return;
            const key = `${s.teacherId || s.teacherName}|${s.day}|${s.periodId}`;
            (byTeacherSlot[key] ||= []).push(s);
        });
        const conflicts: any[] = [];
        Object.values(byTeacherSlot).forEach(group => {
            if (group.length > 1 && group.some((s: any) => inDept(s.subjectName || s.subject))) {
                conflicts.push({
                    teacher: group[0].teacherName || 'Teacher', day: group[0].day,
                    period: periodName[String(group[0].periodId)] || group[0].periodId,
                    clashes: group.map((s: any) => ({ subject: s.subjectName || s.subject || '', className: s.className || '', room: s.room || '' })),
                });
            }
        });

        res.json({
            department: { id: String(dep._id), name: dep.name },
            summary: { lessons: deptSlots.length, teachers: teachingLoad.length, conflicts: conflicts.length },
            teachingLoad, conflicts,
            slots: deptSlots.map((s: any) => ({ day: s.day, period: periodName[String(s.periodId)] || s.periodId, subject: s.subjectName || s.subject || '', className: s.className || '', teacher: s.teacherName || '', room: s.room || '' })),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Department Resources & Documents ─────────────────────────────────────────────
// Generic per-department file/resource store (past papers, marking schemes, notes,
// policies, circulars…). Visibility restricted to department members via the guard.
router.get('/departments/:id/resources', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const q: any = { departmentId: req.params.id };
        if (req.query.category) q.category = String(req.query.category);
        const items = await d.collection('department_resources').find(q).sort({ createdAt: -1 }).toArray().catch(() => []);
        res.json(items);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/departments/:id/resources', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const a = (req as any).tenantContext?.user || {};
        const doc = { ...req.body, departmentId: req.params.id, uploadedBy: a.name || 'User', uploadedById: a.staffId || null, createdAt: new Date() };
        const r = await d.collection('department_resources').insertOne(doc);
        await recordAudit(req, { action: 'Created', entity: 'department_resource', entityId: String(r.insertedId), departmentId: req.params.id, meta: { title: doc.title, category: doc.category } });
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete('/departments/:id/resources/:resourceId', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const rid = oid(req.params.resourceId); if (!rid) return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('department_resources').deleteOne({ _id: rid });
        await recordAudit(req, { action: 'Deleted', entity: 'department_resource', entityId: req.params.resourceId, departmentId: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Meeting minutes ──────────────────────────────────────────────────────────────
router.patch('/departments/:id/meetings/:meetingId/minutes', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const mid = oid(req.params.meetingId); if (!mid) return res.status(400).json({ message: 'Invalid id' });
        const { minutes, attendance } = req.body || {};
        await db(req).collection('department_meetings').updateOne({ _id: mid }, { $set: { minutes: minutes || '', attendance: Array.isArray(attendance) ? attendance : [], minutesAt: new Date() } });
        await recordAudit(req, { action: 'Edited', entity: 'meeting_minutes', entityId: req.params.meetingId, departmentId: req.params.id });
        res.json({ message: 'Minutes saved' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Notifications ────────────────────────────────────────────────────────────────
// Department notice board: create + list. (Delivery to members' inboxes can layer
// on the existing communications module later; these are the department-scoped notes.)
router.get('/departments/:id/notifications', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const items = await db(req).collection('department_notifications').find({ departmentId: req.params.id }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []);
        res.json(items);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/departments/:id/notifications', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const a = (req as any).tenantContext?.user || {};
        const doc = { ...req.body, departmentId: req.params.id, createdBy: a.name || 'User', createdAt: new Date() };
        const r = await d.collection('department_notifications').insertOne(doc);
        await recordAudit(req, { action: 'Published', entity: 'department_notification', entityId: String(r.insertedId), departmentId: req.params.id, meta: { title: doc.title, kind: doc.kind } });
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Reports (export data) ────────────────────────────────────────────────────────
// Returns a report dataset as JSON rows (the frontend converts to CSV/Excel/PDF).
// kind: performance | teachers | subjects | coverage | inventory | activities.
router.get('/departments/:id/reports/:kind', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const dep: any = await d.collection('departments').findOne({ _id: oid(req.params.id) as any });
        if (!dep) return res.status(404).json({ message: 'Department not found' });
        const subjectSet = new Set((Array.isArray(dep.subjects) ? dep.subjects : []).map(NORM));
        const inDept = (s: string) => subjectSet.size === 0 || subjectSet.has(NORM(s));
        const kind = req.params.kind;
        let columns: string[] = []; let rows: any[][] = [];

        if (kind === 'coverage') {
            const schemes = (await d.collection('schemes_of_work').find({}).toArray().catch(() => [])).filter((s: any) => inDept(s.subjectName || s.subject));
            columns = ['Subject', 'Class', 'Term', 'Status', 'Coverage %'];
            rows = schemes.map((s: any) => {
                const weeks = Array.isArray(s.weeks) ? s.weeks : [];
                const filled = weeks.filter((w: any) => String(w.topic || '').trim()).length;
                const cov = weeks.length ? Math.round(filled / weeks.length * 100) : 0;
                return [s.subjectName || '', s.className || '', s.term || '', s.status || 'Draft', cov];
            });
        } else if (kind === 'activities') {
            const logs = await d.collection('audit_logs').find({ departmentId: req.params.id }).sort({ at: -1 }).limit(500).toArray().catch(() => []);
            columns = ['Action', 'Entity', 'User', 'When', 'IP'];
            rows = logs.map((l: any) => [l.action, l.entity, l.userName, new Date(l.at).toLocaleString(), l.ip || '']);
        } else if (kind === 'inventory') {
            const assets = (await d.collection('assets').find({ departmentId: req.params.id }).toArray().catch(() => []));
            columns = ['Name', 'Category', 'Quantity', 'Condition', 'Location'];
            rows = assets.map((a: any) => [a.name || '', a.category || '', a.quantity ?? 1, a.condition || '', a.location || '']);
        } else {
            return res.status(400).json({ message: 'Unknown report kind. Use coverage | activities | inventory (performance/teachers/subjects come from /analysis).' });
        }
        res.json({ title: `${dep.name} — ${kind} report`, columns, rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Assets / Inventory (future-features scaffolding) ─────────────────────────────
router.get('/departments/:id/assets', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try { res.json(await db(req).collection('assets').find({ departmentId: req.params.id }).sort({ createdAt: -1 }).toArray().catch(() => [])); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/departments/:id/assets', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const doc = { ...req.body, departmentId: req.params.id, createdAt: new Date() };
        const r = await db(req).collection('assets').insertOne(doc);
        await recordAudit(req, { action: 'Created', entity: 'department_asset', entityId: String(r.insertedId), departmentId: req.params.id, meta: { name: doc.name } });
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete('/departments/:id/assets/:assetId', requireDeptAccess('param', 'id'), async (req: Request, res: Response) => {
    try {
        const aid = oid(req.params.assetId); if (!aid) return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('assets').deleteOne({ _id: aid });
        await recordAudit(req, { action: 'Deleted', entity: 'department_asset', entityId: req.params.assetId, departmentId: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Audit trail (read) ───────────────────────────────────────────────────────
// Department-scoped audit log. Filter by departmentId, entity, action, or user.
// HODs see only their departments' logs; admins see all.
router.get('/audit-logs', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const access = await resolveDeptAccess(req, d);
        const q: any = {};
        if (req.query.departmentId) q.departmentId = String(req.query.departmentId);
        if (req.query.entity) q.entity = String(req.query.entity);
        if (req.query.action) q.action = String(req.query.action);
        if (req.query.userId) q.userId = String(req.query.userId);
        if (!access.isAdmin) {
            // Restrict to logs for the HOD's departments (or with no dept tag but by them).
            q.$or = [{ departmentId: { $in: access.departmentIds } }, { userId: access.staffId }];
        }
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const logs = await d.collection('audit_logs').find(q).sort({ at: -1 }).limit(limit).toArray().catch(() => []);
        res.json(logs);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
