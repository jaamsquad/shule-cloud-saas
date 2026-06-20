/**
 * Teacher Service Commission (TSC) module.
 *
 * Integrates with the existing Employee system: teachers ARE staff (filtered to
 * teaching designations). Core TSC fields live ON the staff doc; multi-row data
 * lives in linked collections keyed by staffId:
 *   tsc_qualifications, tsc_deployment, tsc_leave, tsc_performance, tsc_documents,
 *   tsc_subjects.
 *
 * Workload is computed live from timetable_slots (by teacherId).
 */
import { Router, Request } from 'express';
import { ObjectId } from 'mongodb';
import { getMetaDb } from '../../lib/mongodb';

const router = Router();
const db = (req: Request) => (req as any).tenantDb || getMetaDb();
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const oid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };

// A staff member is a teacher when their designation/role looks like teaching.
const TEACHER_RE = /teacher|tutor|instructor|director of studies|hod|head of department|principal|deputy|head teacher/i;
const isTeacher = (s: any) => TEACHER_RE.test(`${s.designation || ''} ${(Array.isArray(s.roles) ? s.roles.join(' ') : '')}`);

const loadTeachers = async (req: Request) => {
    const staff = await db(req).collection('staff').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
    return staff.filter(isTeacher);
};

const auditLog = async (req: Request, action: string, target: string, meta: any = {}) => {
    try { await db(req).collection('audit_logs').insertOne({ scope: 'tsc', action, target, meta, user: (req as any).tenantContext?.user || 'admin', changedAt: new Date(), createdAt: new Date() }); } catch { /* */ }
};

// ── Employment-type helper ────────────────────────────────────────────────────
const EMP_TYPE = (s: any): string => s.employmentType || (/(intern)/i.test(s.designation || '') ? 'TSC Intern' : s.tscNumber ? 'TSC Permanent' : 'BoM');

// ── Workload from the timetable ───────────────────────────────────────────────
async function workloadFor(req: Request, staffId: string, name: string) {
    const slots = await db(req).collection('timetable_slots')
        .find({ $or: [{ teacherId: staffId }, { teacherName: name }] }).toArray().catch(() => []);
    const subjects = new Set<string>(); const classes = new Set<string>();
    slots.forEach((s: any) => { if (s.subjectName || s.subject) subjects.add(s.subjectName || s.subject); if (s.className) classes.add(s.className); });
    const weeklyLessons = slots.length;
    return {
        weeklyLessons,
        hours: Math.round(weeklyLessons * 40 / 60 * 10) / 10,   // ~40-min lessons
        subjects: subjects.size,
        classes: classes.size,
        subjectNames: [...subjects],
        classNames: [...classes],
    };
}

// ── Settings (limits, lists) ──────────────────────────────────────────────────
const getSettings = async (req: Request) => (await db(req).collection('tsc_settings').findOne({})) || {};
router.get('/tsc/settings', async (req, res) => {
    const s: any = await getSettings(req);
    res.json({
        maxLessonsPerWeek: s.maxLessonsPerWeek ?? 30,
        minLessonsPerWeek: s.minLessonsPerWeek ?? 18,
        lessonMinutes: s.lessonMinutes ?? 40,
        employmentTypes: s.employmentTypes ?? ['TSC Permanent', 'TSC Intern', 'BoM', 'Contract', 'Part Time'],
        leaveTypes: s.leaveTypes ?? ['Annual', 'Sick', 'Maternity', 'Paternity', 'Compassionate', 'Study', 'Official Duty', 'Unpaid'],
        jobGroups: s.jobGroups ?? ['B5', 'C1', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2', 'D3'],
        qualificationCategories: s.qualificationCategories ?? ['Certificate', 'Diploma', 'Degree', 'Masters', 'PhD'],
        ...s,
    });
});
router.patch('/tsc/settings', async (req, res) => {
    await db(req).collection('tsc_settings').updateOne({}, { $set: { ...req.body, updatedAt: new Date() } }, { upsert: true });
    res.json({ ok: true });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/tsc/stats', async (req, res) => {
    try {
        const teachers = await loadTeachers(req);
        const s: any = await getSettings(req);
        const max = s.maxLessonsPerWeek ?? 30;

        const byType: Record<string, number> = {};
        const byDept: Record<string, number> = {};
        const byQual: Record<string, number> = {};
        teachers.forEach((t: any) => { const et = EMP_TYPE(t); byType[et] = (byType[et] || 0) + 1; const d = t.department || 'Unassigned'; byDept[d] = (byDept[d] || 0) + 1; const q = t.highestQualification || 'Unspecified'; byQual[q] = (byQual[q] || 0) + 1; });

        const leave = await db(req).collection('tsc_leave').find({ status: { $regex: /approved/i } }).toArray().catch(() => []);
        const now = new Date();
        const onLeave = leave.filter((l: any) => new Date(l.startDate) <= now && new Date(l.endDate) >= now).length;

        // Total teaching hours this week + workload buckets.
        let totalHours = 0; const workloadDist: Record<string, number> = { Underloaded: 0, Balanced: 0, Overloaded: 0 };
        for (const t of teachers) {
            const w = await workloadFor(req, String(t._id), t.employeeName || t.name);
            totalHours += w.hours;
            workloadDist[w.weeklyLessons > max ? 'Overloaded' : w.weeklyLessons < (s.minLessonsPerWeek ?? 18) ? 'Underloaded' : 'Balanced']++;
        }

        res.json({
            cards: {
                totalTeachers: teachers.length,
                tscTeachers: teachers.filter((t: any) => /tsc/i.test(EMP_TYPE(t))).length,
                bomTeachers: teachers.filter((t: any) => /bom|board/i.test(EMP_TYPE(t))).length,
                internTeachers: teachers.filter((t: any) => /intern/i.test(EMP_TYPE(t))).length,
                onLeave,
                missingTsc: teachers.filter((t: any) => !t.tscNumber).length,
                incompleteProfiles: teachers.filter((t: any) => !t.nationalId || !t.kraPin || !t.phone || !t.tscNumber).length,
                teachingHoursThisWeek: Math.round(totalHours),
            },
            charts: { byDept, byType, byQual, workloadDist, leaveByType: leave.reduce((a: any, l: any) => { a[l.type] = (a[l.type] || 0) + 1; return a; }, {}) },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Teachers list ─────────────────────────────────────────────────────────────
router.get('/tsc/teachers', async (req, res) => {
    try {
        const teachers = await loadTeachers(req);
        const rows = teachers.map((t: any) => ({
            _id: String(t._id),
            name: t.employeeName || t.name || '',
            photo: t.photo || t.avatar || '',
            employeeNo: t.employeeId || t.staffNo || t.employeeNo || '',
            tscNumber: t.tscNumber || '',
            nationalId: t.nationalId || '',
            phone: t.phone || '', email: t.email || '',
            department: t.department || '',
            employmentType: EMP_TYPE(t),
            status: t.status || 'Active',
            campus: t.campus || t.schoolCampus || '',
            designation: t.designation || '',
        }));
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Single teacher profile (staff + TSC + linked records + workload) ──────────
router.get('/tsc/teachers/:id', async (req, res) => {
    try {
        const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Bad id' });
        const staff = await db(req).collection('staff').findOne({ _id });
        if (!staff) return res.status(404).json({ message: 'Teacher not found' });
        const sid = req.params.id;
        const [qualifications, deployment, leave, performance, documents, subjects] = await Promise.all([
            db(req).collection('tsc_qualifications').find({ staffId: sid }).sort({ year: -1 }).toArray().catch(() => []),
            db(req).collection('tsc_deployment').find({ staffId: sid }).sort({ startDate: -1 }).toArray().catch(() => []),
            db(req).collection('tsc_leave').find({ staffId: sid }).sort({ startDate: -1 }).toArray().catch(() => []),
            db(req).collection('tsc_performance').find({ staffId: sid }).sort({ createdAt: -1 }).toArray().catch(() => []),
            db(req).collection('tsc_documents').find({ staffId: sid }).sort({ createdAt: -1 }).toArray().catch(() => []),
            db(req).collection('tsc_subjects').find({ staffId: sid }).toArray().catch(() => []),
        ]);
        const workload = await workloadFor(req, sid, staff.employeeName || staff.name);
        res.json({ staff: { ...staff, employmentType: EMP_TYPE(staff) }, qualifications, deployment, leave, performance, documents, subjects, workload });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Update TSC/core fields on the staff doc (inherits employee info, adds TSC data).
router.patch('/tsc/teachers/:id', async (req, res) => {
    try {
        const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Bad id' });
        const allowed = ['tscNumber', 'employmentType', 'jobGroup', 'salaryScale', 'payrollNumber', 'department', 'position', 'reportingOfficer',
            'registrationDate', 'registrationStatus', 'registrationCertificate', 'county', 'subCounty', 'zone', 'institutionCode',
            'previousSchool', 'currentSchool', 'dateConfirmed', 'dateOfEmployment', 'campus', 'status', 'kraPin', 'nhifNo', 'nssfNo',
            'emergencyContact', 'highestQualification', 'verificationStatus'];
        const set: any = { updatedAt: new Date() };
        allowed.forEach(k => { if (req.body[k] !== undefined) set[k] = req.body[k]; });
        await db(req).collection('staff').updateOne({ _id }, { $set: set });
        await auditLog(req, 'update_teacher', req.params.id, { fields: Object.keys(set) });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/tsc/teachers/:id/workload', async (req, res) => {
    try {
        const staff = await db(req).collection('staff').findOne({ _id: oid(req.params.id)! }).catch(() => null);
        const w = await workloadFor(req, req.params.id, staff?.employeeName || staff?.name);
        const s: any = await getSettings(req);
        res.json({ ...w, status: w.weeklyLessons > (s.maxLessonsPerWeek ?? 30) ? 'Overloaded' : w.weeklyLessons < (s.minLessonsPerWeek ?? 18) ? 'Underloaded' : 'Balanced' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Generic CRUD for the linked collections (qualifications, deployment, etc.) ─
const LINKED = ['tsc_qualifications', 'tsc_deployment', 'tsc_leave', 'tsc_performance', 'tsc_documents', 'tsc_subjects'];
LINKED.forEach((col) => {
    router.get(`/${col}`, async (req, res) => {
        try { const q: any = {}; if (req.query.staffId) q.staffId = String(req.query.staffId); res.json(await db(req).collection(col).find(q).sort({ createdAt: -1 }).toArray()); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.post(`/${col}`, async (req, res) => {
        try { const doc = { ...req.body, createdAt: new Date() }; const r = await db(req).collection(col).insertOne(doc); await auditLog(req, `add_${col}`, String(r.insertedId)); res.status(201).json({ _id: r.insertedId, ...doc }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.patch(`/${col}/:id`, async (req, res) => {
        try { await db(req).collection(col).updateOne({ _id: oid(req.params.id)! }, { $set: { ...req.body, updatedAt: new Date() } }); await auditLog(req, `edit_${col}`, req.params.id); res.json({ ok: true }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.delete(`/${col}/:id`, async (req, res) => {
        try { await db(req).collection(col).deleteOne({ _id: oid(req.params.id)! }); await auditLog(req, `del_${col}`, req.params.id); res.json({ ok: true }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
});

// ── Leave balance summary ─────────────────────────────────────────────────────
router.get('/tsc/leave-balances/:id', async (req, res) => {
    try {
        const ENTITLEMENT: Record<string, number> = { Annual: 30, Sick: 21, Maternity: 90, Paternity: 14, Compassionate: 15, Study: 0, 'Official Duty': 0, Unpaid: 0 };
        const taken = await db(req).collection('tsc_leave').find({ staffId: req.params.id, status: { $regex: /approved/i } }).toArray().catch(() => []);
        const used: Record<string, number> = {};
        taken.forEach((l: any) => { used[l.type] = (used[l.type] || 0) + num(l.totalDays); });
        res.json(Object.entries(ENTITLEMENT).map(([type, entitled]) => ({ type, entitled, used: used[type] || 0, balance: Math.max(0, entitled - (used[type] || 0)) })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Reports (workload, qualifications, leave summary, register, etc.) ─────────
router.get('/tsc/reports/:kind', async (req, res) => {
    try {
        const teachers = await loadTeachers(req);
        const kind = req.params.kind;
        if (kind === 'workload') {
            const rows = [];
            for (const t of teachers) { const w = await workloadFor(req, String(t._id), t.employeeName || t.name); rows.push({ name: t.employeeName || t.name, tscNumber: t.tscNumber || '', lessons: w.weeklyLessons, hours: w.hours, subjects: w.subjects, classes: w.classes }); }
            return res.json({ title: 'Teacher Workload Report', columns: [{ key: 'name', label: 'Teacher' }, { key: 'tscNumber', label: 'TSC No' }, { key: 'lessons', label: 'Lessons/Wk' }, { key: 'hours', label: 'Hours' }, { key: 'subjects', label: 'Subjects' }, { key: 'classes', label: 'Classes' }], rows });
        }
        if (kind === 'qualifications') {
            const quals = await db(req).collection('tsc_qualifications').find({}).toArray().catch(() => []);
            const byStaff: Record<string, any> = {}; teachers.forEach((t: any) => byStaff[String(t._id)] = t);
            const rows = quals.map((q: any) => ({ teacher: byStaff[q.staffId]?.employeeName || byStaff[q.staffId]?.name || '—', level: q.level, course: q.course, institution: q.institution, year: q.year }));
            return res.json({ title: 'Teacher Qualification Report', columns: [{ key: 'teacher', label: 'Teacher' }, { key: 'level', label: 'Level' }, { key: 'course', label: 'Course' }, { key: 'institution', label: 'Institution' }, { key: 'year', label: 'Year' }], rows });
        }
        if (kind === 'leave') {
            const leave = await db(req).collection('tsc_leave').find({}).sort({ startDate: -1 }).toArray().catch(() => []);
            const byStaff: Record<string, any> = {}; teachers.forEach((t: any) => byStaff[String(t._id)] = t);
            const rows = leave.map((l: any) => ({ teacher: byStaff[l.staffId]?.employeeName || '—', type: l.type, start: l.startDate, end: l.endDate, days: l.totalDays, status: l.status }));
            return res.json({ title: 'Leave Summary', columns: [{ key: 'teacher', label: 'Teacher' }, { key: 'type', label: 'Type' }, { key: 'start', label: 'From', type: 'date' }, { key: 'end', label: 'To', type: 'date' }, { key: 'days', label: 'Days' }, { key: 'status', label: 'Status' }], rows });
        }
        // Default: register / contact list / by-type
        const filter = req.query.type ? teachers.filter((t: any) => new RegExp(String(req.query.type), 'i').test(EMP_TYPE(t))) : teachers;
        const rows = filter.map((t: any) => ({ name: t.employeeName || t.name, employeeNo: t.employeeId || t.staffNo || '', tscNumber: t.tscNumber || '', phone: t.phone || '', email: t.email || '', department: t.department || '', employmentType: EMP_TYPE(t), status: t.status || 'Active' }));
        res.json({ title: kind === 'contacts' ? 'Staff Contact List' : 'Teacher Register', columns: [{ key: 'name', label: 'Teacher' }, { key: 'employeeNo', label: 'Emp No' }, { key: 'tscNumber', label: 'TSC No' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'department', label: 'Dept' }, { key: 'employmentType', label: 'Type' }, { key: 'status', label: 'Status' }], rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Notifications (alerts) ────────────────────────────────────────────────────
router.get('/tsc/alerts', async (req, res) => {
    try {
        const teachers = await loadTeachers(req);
        const s: any = await getSettings(req);
        const max = s.maxLessonsPerWeek ?? 30;
        const alerts: any[] = [];
        teachers.forEach((t: any) => {
            if (!t.tscNumber) alerts.push({ level: 'warning', message: `${t.employeeName || t.name} is missing a TSC number` });
            if (!t.nationalId || !t.kraPin) alerts.push({ level: 'info', message: `${t.employeeName || t.name} has an incomplete profile` });
        });
        for (const t of teachers) { const w = await workloadFor(req, String(t._id), t.employeeName || t.name); if (w.weeklyLessons > max) alerts.push({ level: 'warning', message: `${t.employeeName || t.name} is overloaded (${w.weeklyLessons} lessons/week)` }); }
        const pendingLeave = await db(req).collection('tsc_leave').countDocuments({ status: { $regex: /pending/i } }).catch(() => 0);
        if (pendingLeave) alerts.push({ level: 'info', message: `${pendingLeave} leave request(s) awaiting approval` });
        res.json(alerts.slice(0, 50));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
