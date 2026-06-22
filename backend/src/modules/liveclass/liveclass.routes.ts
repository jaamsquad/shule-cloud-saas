/**
 * Live Classes module — tenant-scoped REST API with a provider strategy
 * (Jitsi / BigBlueButton, switchable by settings without code changes).
 *
 * Collections (per tenant):
 *   live_classes, meeting_settings, meeting_attendance, meeting_recordings,
 *   meeting_logs
 */
import { Router, Request, Response } from 'express';
import { ObjectId, Db } from 'mongodb';
import { getMeetingSettings, buildProvider, resolveProvider } from './providers/factory';
import { MeetingSettings } from './providers/MeetingProvider';

const router = Router();
const db = (req: Request): Db | null => (req as any).tenantDb || null;
const oid = (s?: string) => { try { return s ? new ObjectId(s) : undefined; } catch { return undefined; } };
const user = (req: Request) => (req as any).user || {};
const log = async (d: Db, action: string, classId: string, by: string, meta?: any) => {
    try { await d.collection('meeting_logs').insertOne({ action, classId, by, meta: meta || null, at: new Date() }); } catch { /* noop */ }
};

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/live-classes/settings', async (req, res) => {
    const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
    const s = await getMeetingSettings(d);
    // Never expose provider secrets to the client.
    res.json({ ...s, bbbSecret: s.bbbSecret ? '••••••••' : '', jitsiAppSecret: s.jitsiAppSecret ? '••••••••' : '' });
});

router.put('/live-classes/settings', async (req, res) => {
    const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
    const b = req.body || {};
    const allowed: (keyof MeetingSettings)[] = [
        'provider', 'allowTeacherOverride',
        'jitsiDomain', 'jitsiRoomPrefix', 'jitsiEnablePassword', 'jitsiEnableLobby', 'jitsiEnableRecording', 'jitsiAppId',
        'bbbUrl', 'bbbAllowRecording', 'bbbWelcome', 'bbbAutoMute', 'bbbLockViewers', 'bbbGuestAccess',
        'recordingEnabled', 'attendanceEnabled', 'notifyEnabled',
    ];
    const set: any = { updatedAt: new Date() };
    allowed.forEach(k => { if (b[k] !== undefined) set[k] = b[k]; });
    // Secrets: only overwrite when a real value is supplied (avoid wiping on save).
    if (typeof b.bbbSecret === 'string' && b.bbbSecret && !b.bbbSecret.startsWith('•')) set.bbbSecret = b.bbbSecret.trim();
    if (typeof b.jitsiAppSecret === 'string' && b.jitsiAppSecret && !b.jitsiAppSecret.startsWith('•')) set.jitsiAppSecret = b.jitsiAppSecret.trim();
    await d.collection('meeting_settings').updateOne({ _id: 'live' as any }, { $set: set }, { upsert: true });
    res.json({ ok: true });
});

router.post('/live-classes/provider/test-connection', async (req, res) => {
    const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
    const settings = await getMeetingSettings(d);
    // Apply any unsaved overrides from the form so the user can test before saving.
    const merged = { ...settings, ...req.body };
    if (merged.bbbSecret?.startsWith?.('•')) merged.bbbSecret = settings.bbbSecret;
    const provider = buildProvider(merged, req.body?.provider);
    res.json(await provider.testConnection());
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/live-classes', async (req, res) => {
    try {
        const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
        const { subject, teacher, status, from, to } = req.query as any;
        const q: any = { deletedAt: { $exists: false } };
        if (subject) q.subjectId = subject;
        if (teacher) q.teacherId = teacher;
        if (status && status !== 'all') q.status = status;
        if (from || to) { q.startAt = {}; if (from) q.startAt.$gte = new Date(from); if (to) q.startAt.$lte = new Date(to); }
        const rows = await d.collection('live_classes').find(q).sort({ startAt: 1 }).toArray();
        res.json(rows.map(autoStatus));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/live-classes/:id', async (req, res) => {
    const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
    const row = await d.collection('live_classes').findOne({ _id: oid(req.params.id) });
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(autoStatus(row));
});

router.post('/live-classes', async (req, res) => {
    try {
        const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
        const b = req.body || {};
        if (!b.title || !b.startAt) return res.status(400).json({ message: 'Title and start time are required' });
        const settings = await getMeetingSettings(d);
        const provider = settings.allowTeacherOverride && b.provider ? b.provider : settings.provider;
        const meetingId = `LC${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
        const doc = {
            title: b.title, description: b.description || '',
            subjectId: b.subjectId || null, subjectName: b.subjectName || '',
            unitId: b.unitId || null, unitName: b.unitName || '',
            teacherId: b.teacherId || user(req).id || null, teacherName: b.teacherName || user(req).name || 'Teacher',
            startAt: new Date(b.startAt), endAt: b.endAt ? new Date(b.endAt) : null,
            durationMinutes: Number(b.durationMinutes) || 60,
            provider, meetingId, password: b.password || '',
            recordingEnabled: b.recordingEnabled ?? settings.recordingEnabled,
            waitingRoom: b.waitingRoom ?? true, autoMute: b.autoMute ?? true,
            attendanceEnabled: b.attendanceEnabled ?? settings.attendanceEnabled,
            audience: b.audience || 'all', classId: b.classId || null,
            status: 'scheduled', createdBy: user(req).id || null, createdAt: new Date(), updatedAt: new Date(),
        };
        const r = await d.collection('live_classes').insertOne(doc);
        await log(d, 'create', String(r.insertedId), doc.teacherName);
        res.status(201).json({ ...doc, _id: r.insertedId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/live-classes/:id', async (req, res) => {
    try {
        const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
        const b = req.body || {};
        const set: any = { updatedAt: new Date() };
        ['title', 'description', 'subjectId', 'subjectName', 'unitId', 'unitName', 'teacherId', 'teacherName',
            'durationMinutes', 'provider', 'password', 'recordingEnabled', 'waitingRoom', 'autoMute',
            'attendanceEnabled', 'audience', 'classId'].forEach(k => { if (b[k] !== undefined) set[k] = b[k]; });
        if (b.startAt) set.startAt = new Date(b.startAt);
        if (b.endAt) set.endAt = new Date(b.endAt);
        await d.collection('live_classes').updateOne({ _id: oid(req.params.id) }, { $set: set });
        await log(d, 'update', req.params.id, user(req).name || 'user');
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/live-classes/:id/duplicate', async (req, res) => {
    const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
    const src = await d.collection('live_classes').findOne({ _id: oid(req.params.id) });
    if (!src) return res.status(404).json({ message: 'Not found' });
    const { _id, createdAt, ...rest } = src as any;
    const meetingId = `LC${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const copy = { ...rest, title: `${src.title} (copy)`, meetingId, status: 'scheduled', createdAt: new Date(), updatedAt: new Date() };
    const r = await d.collection('live_classes').insertOne(copy);
    res.status(201).json({ ...copy, _id: r.insertedId });
});

router.delete('/live-classes/:id', async (req, res) => {
    const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
    await d.collection('live_classes').updateOne({ _id: oid(req.params.id) }, { $set: { deletedAt: new Date() } });
    await log(d, 'delete', req.params.id, user(req).name || 'user');
    res.json({ ok: true });
});

// ─── Lifecycle: start / join / end ────────────────────────────────────────────
router.post('/live-classes/:id/start', async (req, res) => {
    try {
        const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
        const lc = await d.collection('live_classes').findOne({ _id: oid(req.params.id) });
        if (!lc) return res.status(404).json({ message: 'Not found' });
        const { provider } = await resolveProvider(d, lc.provider);
        const created = await provider.createMeeting({
            meetingId: lc.meetingId, title: lc.title, moderatorName: lc.teacherName,
            record: lc.recordingEnabled, waitingRoom: lc.waitingRoom, autoMute: lc.autoMute, durationMinutes: lc.durationMinutes,
            password: lc.password,
        });
        if (!created.ok) return res.status(502).json({ message: created.message || 'Could not start the meeting' });
        await d.collection('live_classes').updateOne({ _id: lc._id }, { $set: { status: 'live', startedAt: new Date() } });
        await log(d, 'start', req.params.id, user(req).name || 'teacher');
        const join = await provider.getJoinInfo({ meetingId: lc.meetingId, displayName: lc.teacherName, role: 'moderator', password: lc.password, subjectName: lc.subjectName });
        res.json({ ok: true, provider: provider.name, ...join });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/live-classes/:id/join', async (req, res) => {
    try {
        const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
        const lc = await d.collection('live_classes').findOne({ _id: oid(req.params.id) });
        if (!lc) return res.status(404).json({ message: 'Not found' });
        // Students may only join from 15 min before start until end.
        const role = req.body?.role === 'moderator' ? 'moderator' : 'attendee';
        if (role === 'attendee') {
            const opensAt = new Date(new Date(lc.startAt).getTime() - 15 * 60000);
            if (Date.now() < opensAt.getTime()) return res.status(425).json({ message: 'The class hasn\'t opened yet. The Join button activates 15 minutes before start.' });
            if (lc.status === 'ended' || lc.status === 'cancelled') return res.status(409).json({ message: 'This class has ended.' });
        }
        const { provider } = await resolveProvider(d, lc.provider);
        const displayName = req.body?.displayName || user(req).name || 'Participant';
        const join = await provider.getJoinInfo({ meetingId: lc.meetingId, displayName, role, password: lc.password, avatar: req.body?.avatar, subjectName: lc.subjectName });
        // Record attendance join (best-effort).
        if (lc.attendanceEnabled && role === 'attendee') {
            await d.collection('meeting_attendance').updateOne(
                { classId: String(lc._id), userId: req.body?.userId || user(req).id || displayName },
                {
                    $setOnInsert: {
                        classId: String(lc._id), meetingId: lc.meetingId,
                        userId: req.body?.userId || user(req).id || displayName, name: displayName,
                        admissionNo: req.body?.admissionNo || '', joinedAt: new Date(),
                        ip: req.ip || '', device: req.headers['user-agent'] || '',
                    },
                },
                { upsert: true },
            );
        }
        await log(d, 'join', req.params.id, displayName, { role });
        res.json({ ok: true, provider: provider.name, ...join });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/live-classes/:id/leave', async (req, res) => {
    const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
    const lc = await d.collection('live_classes').findOne({ _id: oid(req.params.id) });
    if (!lc) return res.status(404).json({ message: 'Not found' });
    const uid = req.body?.userId || user(req).id;
    if (uid) {
        const att = await d.collection('meeting_attendance').findOne({ classId: String(lc._id), userId: uid });
        if (att && !att.leftAt) {
            const leftAt = new Date();
            const durationSec = Math.round((leftAt.getTime() - new Date(att.joinedAt).getTime()) / 1000);
            await d.collection('meeting_attendance').updateOne({ _id: att._id }, { $set: { leftAt, durationSec } });
        }
    }
    res.json({ ok: true });
});

router.post('/live-classes/:id/end', async (req, res) => {
    try {
        const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
        const lc = await d.collection('live_classes').findOne({ _id: oid(req.params.id) });
        if (!lc) return res.status(404).json({ message: 'Not found' });
        const { provider } = await resolveProvider(d, lc.provider);
        await provider.endMeeting(lc.meetingId).catch(() => {});
        await d.collection('live_classes').updateOne({ _id: lc._id }, { $set: { status: 'ended', endedAt: new Date() } });
        await log(d, 'end', req.params.id, user(req).name || 'teacher');
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Attendance ───────────────────────────────────────────────────────────────
router.get('/live-classes/:id/attendance', async (req, res) => {
    const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
    const rows = await d.collection('meeting_attendance').find({ classId: req.params.id }).sort({ joinedAt: 1 }).toArray();
    res.json(rows);
});

// ─── Recordings (provider + teacher uploads) ──────────────────────────────────
router.get('/live-classes/:id/recordings', async (req, res) => {
    try {
        const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
        const lc = await d.collection('live_classes').findOne({ _id: oid(req.params.id) });
        if (!lc) return res.status(404).json({ message: 'Not found' });
        const { provider } = await resolveProvider(d, lc.provider);
        const providerRecs = await provider.getRecordings(lc.meetingId).catch(() => []);
        const uploaded = await d.collection('meeting_recordings').find({ classId: req.params.id }).toArray();
        res.json([...providerRecs.map(r => ({ ...r, source: provider.name })), ...uploaded.map(r => ({ ...r, source: 'upload' }))]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Teacher uploads a recording URL (or a file already hosted elsewhere).
router.post('/live-classes/:id/recordings', async (req, res) => {
    const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
    const { url, name } = req.body || {};
    if (!url) return res.status(400).json({ message: 'A recording URL is required' });
    const doc = { classId: req.params.id, url, name: name || 'Recording', createdAt: new Date(), by: user(req).name || 'teacher' };
    const r = await d.collection('meeting_recordings').insertOne(doc);
    res.status(201).json({ ...doc, _id: r.insertedId });
});

router.delete('/live-classes/recordings/:recId', async (req, res) => {
    try {
        const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
        // Try local first; if not found, ask the provider to delete it.
        const local = await d.collection('meeting_recordings').findOneAndDelete({ _id: oid(req.params.recId) });
        if ((local as any)?.value || local) return res.json({ ok: true });
        const { provider } = await resolveProvider(d);
        await provider.deleteRecording(req.params.recId);
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Dashboard stats ──────────────────────────────────────────────────────────
router.get('/live-classes/stats/overview', async (req, res) => {
    try {
        const d = db(req); if (!d) return res.status(400).json({ message: 'No tenant' });
        const col = d.collection('live_classes');
        const base = { deletedAt: { $exists: false } };
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const [total, live, today, upcoming, ended] = await Promise.all([
            col.countDocuments(base),
            col.countDocuments({ ...base, status: 'live' }),
            col.countDocuments({ ...base, startAt: { $gte: startOfDay, $lte: endOfDay } }),
            col.find({ ...base, status: 'scheduled', startAt: { $gte: new Date() } }).sort({ startAt: 1 }).limit(5).toArray(),
            col.countDocuments({ ...base, status: 'ended' }),
        ]);
        const byProvider = await col.aggregate([{ $match: base }, { $group: { _id: '$provider', n: { $sum: 1 } } }]).toArray();
        res.json({ total, live, today, ended, upcoming: upcoming.map(autoStatus), providerUsage: byProvider.map(p => ({ provider: p._id, count: p.n })) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

/** Derive a display status from times (live window) without a cron. */
function autoStatus(lc: any) {
    if (!lc || lc.status === 'cancelled' || lc.status === 'ended') return lc;
    const now = Date.now();
    const start = new Date(lc.startAt).getTime();
    const end = lc.endAt ? new Date(lc.endAt).getTime() : start + (lc.durationMinutes || 60) * 60000;
    let derived = lc.status;
    if (lc.status === 'live') derived = now > end + 30 * 60000 ? 'ended' : 'live';
    else if (now >= start && now <= end) derived = lc.status === 'live' ? 'live' : lc.status; // teacher must start
    return { ...lc, joinOpensAt: new Date(start - 15 * 60000) };
}

export default router;
