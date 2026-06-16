"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../lib/mongodb");
const mongodb_2 = require("mongodb");
const router = (0, express_1.Router)();
const db = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
const oid = (id) => { try {
    return new mongodb_2.ObjectId(id);
}
catch {
    return null;
} };
// ── Departments ───────────────────────────────────────────────────────────────
router.get('/departments', async (req, res) => {
    try {
        const d = db(req);
        const departments = await d.collection('departments').find({}).sort({ name: 1 }).toArray();
        const members = await d.collection('department_members').find({}).toArray();
        const counts = {};
        members.forEach((m) => { counts[String(m.departmentId)] = (counts[String(m.departmentId)] || 0) + 1; });
        res.json(departments.map((dep) => ({ ...dep, memberCount: counts[String(dep._id)] || 0 })));
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/departments/summary', async (req, res) => {
    try {
        const d = db(req);
        const [total, active, members, pendingLeave] = await Promise.all([
            d.collection('departments').countDocuments({}),
            d.collection('departments').countDocuments({ status: { $ne: 'Inactive' } }),
            d.collection('department_members').countDocuments({}),
            d.collection('leave_requests').countDocuments({ status: { $in: ['Pending', 'HOD Approved'] } }),
        ]);
        res.json({ total, active, totalStaffAssigned: members, pendingLeave });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/departments', async (req, res) => {
    try {
        const doc = { ...req.body, status: req.body?.status || 'Active', createdAt: new Date(), updatedAt: new Date() };
        const r = await db(req).collection('departments').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.patch('/departments/:id', async (req, res) => {
    try {
        const id = oid(req.params.id);
        if (!id)
            return res.status(400).json({ message: 'Invalid id' });
        const { _id, ...body } = req.body || {};
        await db(req).collection('departments').updateOne({ _id: id }, { $set: { ...body, updatedAt: new Date() } });
        res.json({ message: 'Updated' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.delete('/departments/:id', async (req, res) => {
    try {
        const id = oid(req.params.id);
        if (!id)
            return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('departments').deleteOne({ _id: id });
        await db(req).collection('department_members').deleteMany({ departmentId: req.params.id });
        res.json({ message: 'Deleted' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Head of Department ─────────────────────────────────────────────────────────
router.post('/departments/:id/head', async (req, res) => {
    try {
        const id = oid(req.params.id);
        if (!id)
            return res.status(400).json({ message: 'Invalid id' });
        const { staffId, staffName, appointmentDate, acting } = req.body || {};
        await db(req).collection('departments').updateOne({ _id: id }, { $set: { headOfDepartment: staffId, headName: staffName, headAppointmentDate: appointmentDate, headActing: !!acting, updatedAt: new Date() } });
        // Ensure the HOD is also a member flagged as head.
        await db(req).collection('department_members').updateOne({ departmentId: req.params.id, staffId }, { $set: { departmentId: req.params.id, staffId, staffName, role: 'Department Head', isHead: true, startDate: appointmentDate, status: 'Active' } }, { upsert: true });
        await db(req).collection('department_members').updateMany({ departmentId: req.params.id, staffId: { $ne: staffId } }, { $set: { isHead: false } });
        res.json({ message: 'HOD assigned' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Members ────────────────────────────────────────────────────────────────────
router.get('/departments/:id/members', async (req, res) => {
    try {
        res.json(await db(req).collection('department_members').find({ departmentId: req.params.id }).sort({ isHead: -1, staffName: 1 }).toArray());
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/departments/:id/members', async (req, res) => {
    try {
        const { staffId, staffName, role, startDate } = req.body || {};
        if (!staffId)
            return res.status(400).json({ message: 'Select a staff member' });
        await db(req).collection('department_members').updateOne({ departmentId: req.params.id, staffId }, { $set: { departmentId: req.params.id, staffId, staffName, role: role || 'Teacher', isHead: false, startDate: startDate || null, status: 'Active' } }, { upsert: true });
        res.status(201).json({ message: 'Member added' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.delete('/departments/:id/members/:memberId', async (req, res) => {
    try {
        const mid = oid(req.params.memberId);
        if (!mid)
            return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('department_members').deleteOne({ _id: mid });
        res.json({ message: 'Removed' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Meetings ───────────────────────────────────────────────────────────────────
router.get('/departments/:id/meetings', async (req, res) => {
    try {
        res.json(await db(req).collection('department_meetings').find({ departmentId: req.params.id }).sort({ date: -1 }).toArray());
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/departments/:id/meetings', async (req, res) => {
    try {
        const doc = { ...req.body, departmentId: req.params.id, createdAt: new Date() };
        const r = await db(req).collection('department_meetings').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.delete('/departments/:id/meetings/:meetingId', async (req, res) => {
    try {
        const mid = oid(req.params.meetingId);
        if (!mid)
            return res.status(400).json({ message: 'Invalid id' });
        await db(req).collection('department_meetings').deleteOne({ _id: mid });
        res.json({ message: 'Deleted' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Leave requests (HOD → HR/Admin workflow) ────────────────────────────────────
router.get('/leave-requests', async (req, res) => {
    try {
        const q = {};
        if (req.query.departmentId)
            q.departmentId = req.query.departmentId;
        if (req.query.status)
            q.status = req.query.status;
        res.json(await db(req).collection('leave_requests').find(q).sort({ createdAt: -1 }).toArray());
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/leave-requests', async (req, res) => {
    try {
        const doc = { ...req.body, status: 'Pending', hodApproval: null, hrApproval: null, createdAt: new Date() };
        const r = await db(req).collection('leave_requests').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.patch('/leave-requests/:id', async (req, res) => {
    try {
        const id = oid(req.params.id);
        if (!id)
            return res.status(400).json({ message: 'Invalid id' });
        const { action, by, note } = req.body || {};
        const stamp = { by: by || 'Admin', note: note || '', at: new Date() };
        let set = { updatedAt: new Date() };
        if (action === 'hod-approve')
            set = { ...set, status: 'HOD Approved', hodApproval: stamp };
        else if (action === 'hr-approve')
            set = { ...set, status: 'Approved', hrApproval: stamp };
        else if (action === 'reject')
            set = { ...set, status: 'Rejected', rejection: stamp };
        else
            return res.status(400).json({ message: 'Unknown action' });
        await db(req).collection('leave_requests').updateOne({ _id: id }, { $set: set });
        res.json({ message: 'Updated' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Per-department dashboard ─────────────────────────────────────────────────────
router.get('/departments/:id/dashboard', async (req, res) => {
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
        const upcoming = meetings.filter((m) => m.date && new Date(m.date) >= now).length;
        res.json({ head: dep?.headName || null, totalStaff, pendingLeave, upcomingMeetings: upcoming, recentMeetings: meetings });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
exports.default = router;
