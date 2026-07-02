import { Router, Request, Response } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

const router = Router();
const db = (req: any) => req.tenantDb || getMetaDb();
const oid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };

// ── Departments ───────────────────────────────────────────────────────────────
router.get('/departments', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const departments = await d.collection('departments').find({}).sort({ name: 1 }).toArray();
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

router.patch('/departments/:id', async (req: Request, res: Response) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(400).json({ message: 'Invalid id' });
        const { _id, ...body } = req.body || {};
        await db(req).collection('departments').updateOne({ _id: id }, { $set: { ...body, updatedAt: new Date() } });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/departments/:id', async (req: Request, res: Response) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('departments').deleteOne({ _id: id });
        await db(req).collection('department_members').deleteMany({ departmentId: req.params.id });
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

router.post('/departments/:id/members', async (req: Request, res: Response) => {
    try {
        const { staffId, staffName, role, startDate } = req.body || {};
        if (!staffId) return res.status(400).json({ message: 'Select a staff member' });
        await db(req).collection('department_members').updateOne(
            { departmentId: req.params.id, staffId },
            { $set: { departmentId: req.params.id, staffId, staffName, role: role || 'Teacher', isHead: false, startDate: startDate || null, status: 'Active' } },
            { upsert: true },
        );
        res.status(201).json({ message: 'Member added' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/departments/:id/members/:memberId', async (req: Request, res: Response) => {
    try {
        const mid = oid(req.params.memberId); if (!mid) return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('department_members').deleteOne({ _id: mid });
        res.json({ message: 'Removed' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Meetings ───────────────────────────────────────────────────────────────────
router.get('/departments/:id/meetings', async (req: Request, res: Response) => {
    try { res.json(await db(req).collection('department_meetings').find({ departmentId: req.params.id }).sort({ date: -1 }).toArray()); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/departments/:id/meetings', async (req: Request, res: Response) => {
    try {
        const doc = { ...req.body, departmentId: req.params.id, createdAt: new Date() };
        const r = await db(req).collection('department_meetings').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/departments/:id/meetings/:meetingId', async (req: Request, res: Response) => {
    try {
        const mid = oid(req.params.meetingId); if (!mid) return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('department_meetings').deleteOne({ _id: mid });
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

router.get('/departments/:id/hod-dashboard', async (req: Request, res: Response) => {
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

        // Teaching progress (schemes of work / lesson plans). These collections don't
        // exist yet — report 0 with a clear flag so the UI can show "not tracked yet".
        const [schemesTotal, schemesDone, plansTotal, plansDone] = await Promise.all([
            d.collection('schemes_of_work').countDocuments({ departmentId: req.params.id }).catch(() => 0),
            d.collection('schemes_of_work').countDocuments({ departmentId: req.params.id, status: 'Completed' }).catch(() => 0),
            d.collection('lesson_plans').countDocuments({ departmentId: req.params.id }).catch(() => 0),
            d.collection('lesson_plans').countDocuments({ departmentId: req.params.id, status: 'Completed' }).catch(() => 0),
        ]);

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

export default router;
