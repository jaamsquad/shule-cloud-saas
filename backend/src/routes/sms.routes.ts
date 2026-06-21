/**
 * SMS gateway routes — both the school-facing admin API and the Android app API.
 *
 * School admin (tenant-authenticated via the normal portal session):
 *   POST   /communications/sms/send          queue an SMS to an audience/numbers
 *   GET    /communications/sms/logs          recent jobs + counts
 *   GET    /communications/sms/settings      provider + pacing + api config
 *   POST   /communications/sms/settings      update provider/settings
 *   GET    /sms/devices                       list paired devices + live stats
 *   POST   /sms/devices/pair                  create a pairing code/token
 *   POST   /sms/devices/:id/reset             revoke (reset) a device pairing
 *   DELETE /sms/devices/:id                   remove a device
 *
 * Android app (authenticated by device token in `x-device-token`; tenant resolved
 * by the usual subdomain header so req.tenantDb is set):
 *   POST   /mobile/register                   pair using a pairing code
 *   POST   /mobile/heartbeat                  battery/network/online ping
 *   GET    /mobile/jobs                        claim pending jobs to send
 *   POST   /mobile/update                      report a job's send/delivery status
 */
import { Router, Request, Response } from 'express';
import { ObjectId, Db } from 'mongodb';
import {
    getSmsSettings, saveSmsSettings, queueSms, claimJobs, updateJobStatus,
    deviceStats, newToken, normalizePhone,
} from '../services/smsGateway.service';
import { resolvePhones } from '../services/communications.service';

const router = Router();
const oid = (s?: string) => { try { return s ? new ObjectId(s) : undefined; } catch { return undefined; } };
const tdb = (req: Request): Db | null => (req as any).tenantDb || null;
const schoolId = (req: Request): string => String((req as any).tenantContext?.tenantId || '');

// ════════════════════════════════════════════════════════════════════════════
//  SCHOOL ADMIN
// ════════════════════════════════════════════════════════════════════════════

router.get('/communications/sms/settings', async (req, res) => {
    const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
    res.json(await getSmsSettings(db));
});

router.post('/communications/sms/settings', async (req, res) => {
    const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
    res.json(await saveSmsSettings(db, req.body || {}));
});

// Send / queue SMS. Routes to the device queue or the HTTP API per settings.
router.post('/communications/sms/send', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const { message, to, audience, audiences, scheduledAt } = req.body || {};
        if (!message) return res.status(400).json({ message: 'Message is required' });

        let numbers: string[] = Array.isArray(to) ? to : (to ? [to] : []);
        const audList: string[] = Array.isArray(audiences) ? audiences : (audience ? [audience] : []);
        for (const a of audList) numbers = [...numbers, ...await resolvePhones(db, a as any)];
        numbers = Array.from(new Set(numbers.filter(Boolean)));
        if (numbers.length === 0) return res.status(400).json({ message: 'No recipients with phone numbers were found' });

        const audienceLabel = audList.join(',') || null;
        const settings = await getSmsSettings(db);
        if (settings.provider === 'api') {
            // Traditional HTTP gateway — queue then send immediately via the API.
            const { queued } = await queueSms(db, schoolId(req), numbers, message, { audience: audienceLabel || undefined, createdBy: (req as any).user?.id });
            const sent = await sendViaApi(db, settings.apiConfig, numbers, message);
            return res.json({ provider: 'api', queued, ...sent });
        }

        // Device provider — queue jobs for the connected Android phone(s).
        const result = await queueSms(db, schoolId(req), numbers, message, {
            audience: audienceLabel || undefined, createdBy: (req as any).user?.id,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        });
        const devices = await db.collection('sms_devices').countDocuments({ revoked: { $ne: true }, online: true });
        res.json({ provider: 'device', ...result, onlineDevices: devices });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Send a single test SMS to verify the gateway is wired up correctly.
router.post('/communications/sms/test', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const { phone } = req.body || {};
        if (!phone) return res.status(400).json({ message: 'A test phone number is required' });
        const message = 'ShuleCloud SMS test — your gateway is connected and working. ✅';
        const settings = await getSmsSettings(db);
        if (settings.provider === 'api') {
            await queueSms(db, schoolId(req), [phone], message, { audience: 'test' });
            const sent = await sendViaApi(db, settings.apiConfig, [phone], message);
            return res.json({ provider: 'api', ...sent });
        }
        const online = await db.collection('sms_devices').countDocuments({ revoked: { $ne: true }, online: true });
        if (online === 0) return res.status(409).json({ message: 'No phone is connected & online. Open the ShuleCloud SMS app on your paired phone, then try again.' });
        const result = await queueSms(db, schoolId(req), [phone], message, { audience: 'test' });
        res.json({ provider: 'device', ...result, onlineDevices: online });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Results SMS: list sources + send per-student results ────────────────────

// List exams / class tests / CBC activities the admin can send results for.
router.get('/communications/sms/result-sources', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const [exams, tests, cbc] = await Promise.all([
            db.collection('exams').find({}).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []),
            db.collection('class_tests').find({}).sort({ date: -1 }).limit(100).toArray().catch(() => []),
            db.collection('cbc_activities').find({ deletedAt: { $exists: false } }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []),
        ]);
        res.json({
            exams: exams.map((e: any) => ({ id: String(e._id), name: e.name || e.examName || 'Exam', term: e.term, year: e.year })),
            classTests: tests.map((t: any) => ({ id: String(t._id), name: t.name || t.title || 'Class Test', subject: t.subject_name || t.subjectName, total: t.total_marks })),
            cbcActivities: cbc.map((a: any) => ({ id: String(a._id), name: a.title || a.name || a.learningArea || 'CBC Activity', learningArea: a.learningArea, strand: a.strand })),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

const gradeFor = (score: number) => score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'E';
const studentPhone = (s: any) => s.parentPhone || s.fatherPhone || s.motherPhone || s.guardianPhone || s.phone;
const studentName = (s: any) => s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student';

// Build per-student result messages for a source and queue/send them.
router.post('/communications/sms/send-results', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const { type, id, scheduledAt } = req.body || {};
        if (!type || !id) return res.status(400).json({ message: 'Choose a result source' });

        const school = (await db.collection('settings').findOne({}))?.schoolName || '';
        const students = await db.collection('students').find({}).toArray();
        const byId: Record<string, any> = {}; students.forEach((s: any) => { byId[String(s._id)] = s; byId[s.admNo] = s; byId[s.registrationNo] = s; });

        // messages: phone -> text
        const messages: { phone: string; text: string }[] = [];

        if (type === 'exam') {
            const exam = await db.collection('exams').findOne({ _id: oid(id) });
            const marks = await db.collection('marks').find({ examId: id }).toArray();
            const byStudent: Record<string, any[]> = {};
            marks.forEach((m: any) => { (byStudent[m.studentId] ||= []).push(m); });
            for (const [sid, ms] of Object.entries(byStudent)) {
                const st = byId[sid]; if (!st) continue;
                const phone = studentPhone(st); if (!phone) continue;
                const total = ms.reduce((t, m) => t + Number(m.marks || m.score || 0), 0);
                const avg = ms.length ? Math.round(total / ms.length) : 0;
                const lines = ms.map(m => `${m.subjectName || 'Subj'}:${Number(m.marks || m.score || 0)}(${gradeFor(Number(m.marks || m.score || 0))})`).join(', ');
                messages.push({ phone, text: `${school ? school + ': ' : ''}${studentName(st)} — ${exam?.name || 'Exam'} results. ${lines}. Mean: ${avg}% (${gradeFor(avg)}).` });
            }
        } else if (type === 'classTest') {
            const test = await db.collection('class_tests').findOne({ _id: oid(id) });
            const tmarks = await db.collection('test_marks').find({ test_id: oid(id) }).toArray();
            for (const m of tmarks) {
                const st = byId[String(m.student_id)] || byId[m.studentId]; if (!st) continue;
                const phone = studentPhone(st); if (!phone) continue;
                const score = Number(m.score ?? m.marks ?? 0);
                const out = test?.total_marks ? `${score}/${test.total_marks}` : `${score}`;
                messages.push({ phone, text: `${school ? school + ': ' : ''}${studentName(st)} scored ${out} in ${test?.name || 'the class test'}${test?.subject_name ? ' (' + test.subject_name + ')' : ''}.` });
            }
        } else if (type === 'cbc') {
            const activity = await db.collection('cbc_activities').findOne({ _id: oid(id) });
            const assessments = await db.collection('cbc_assessments').find({ activityId: id, deletedAt: { $exists: false } }).toArray();
            const LEVEL_LABEL: Record<string, string> = { EE: 'Exceeding Expectation', ME: 'Meeting Expectation', AE: 'Approaching Expectation', BE: 'Below Expectation' };
            for (const a of assessments) {
                const st = byId[a.studentId]; if (!st) continue;
                const phone = studentPhone(st); if (!phone) continue;
                messages.push({ phone, text: `${school ? school + ': ' : ''}${studentName(st)} — ${activity?.learningArea || activity?.title || 'CBC'} assessment: ${a.level} (${LEVEL_LABEL[a.level] || ''}).` });
            }
        } else {
            return res.status(400).json({ message: 'Unknown result type' });
        }

        if (messages.length === 0) return res.status(409).json({ message: 'No results found, or students have no parent phone numbers.' });

        // Queue/send each personalised message. (Same provider routing as /send.)
        const settings = await getSmsSettings(db);
        let queued = 0;
        const when = scheduledAt ? new Date(scheduledAt) : null;
        for (const m of messages) {
            const r = await queueSms(db, schoolId(req), [m.phone], m.text, { audience: `results:${type}`, scheduledAt: when, createdBy: (req as any).user?.id });
            queued += r.queued;
        }
        if (settings.provider === 'api' && !when) {
            // Fire the API for each (already queued above); send in one batched call is hard with
            // per-student bodies, so send individually.
            for (const m of messages) await sendViaApi(db, settings.apiConfig, [m.phone], m.text);
        }
        res.json({ provider: settings.provider, recipients: messages.length, queued });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Connection status summary for the admin dashboard.
router.get('/communications/sms/status', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const now = Date.now();
        const devices = await db.collection('sms_devices').find({ revoked: { $ne: true } }).sort({ lastSeen: -1 }).toArray();
        const live = devices.map((d: any) => ({ ...d, token: undefined, online: d.online && d.lastSeen && (now - new Date(d.lastSeen).getTime() < 90_000) }));
        const connectedDevice = live.find((d: any) => d.paired && d.online) || live.find((d: any) => d.paired) || null;
        const settings = await getSmsSettings(db);
        const stats = await deviceStats(db, schoolId(req));
        const webConnected = true; // the admin is making this authenticated request, so the web side is up
        const deviceConnected = settings.provider === 'api' ? !!(settings.apiConfig?.apiKey) : !!(connectedDevice && connectedDevice.online);
        res.json({
            provider: settings.provider,
            webConnected,
            deviceConnected,
            ready: webConnected && deviceConnected,
            device: connectedDevice,
            deviceCount: live.length,
            stats,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/communications/sms/logs', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const [jobs, stats] = await Promise.all([
            db.collection('sms_jobs').find({}).sort({ createdAt: -1 }).limit(200).toArray(),
            deviceStats(db, schoolId(req)),
        ]);
        res.json({ jobs, stats });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Devices ─────────────────────────────────────────────────────────────────
router.get('/sms/devices', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const [devices, stats] = await Promise.all([
            db.collection('sms_devices').find({}).sort({ lastSeen: -1 }).toArray(),
            deviceStats(db, schoolId(req)),
        ]);
        // mark stale (>90s no heartbeat) as offline for display
        const now = Date.now();
        const view = devices.map((d: any) => ({ ...d, token: undefined, pairingCode: d.paired ? undefined : d.pairingCode, online: d.online && d.lastSeen && (now - new Date(d.lastSeen).getTime() < 90_000) }));
        res.json({ devices: view, stats });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Create a one-time pairing code the user types into the app.
router.post('/sms/devices/pair', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
        const doc = {
            name: req.body?.name || 'New device', paired: false, online: false, revoked: false,
            pairingCode, pairingExpires: new Date(Date.now() + 15 * 60_000),
            token: null as string | null, createdAt: new Date(), lastSeen: null,
        };
        const r = await db.collection('sms_devices').insertOne(doc);
        res.status(201).json({ deviceId: String(r.insertedId), pairingCode, expiresInMinutes: 15 });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Reset (revoke) a device — the school admin can re-pair afterwards.
router.post('/sms/devices/:id/reset', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        await db.collection('sms_devices').updateOne({ _id: oid(req.params.id) }, { $set: { revoked: true, online: false, token: null, updatedAt: new Date() } });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/sms/devices/:id', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        await db.collection('sms_devices').deleteOne({ _id: oid(req.params.id) });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  ANDROID APP   (device-token auth; tenant resolved by subdomain header)
// ════════════════════════════════════════════════════════════════════════════

const deviceFromReq = async (req: Request): Promise<any | null> => {
    const db = tdb(req); if (!db) return null;
    const token = req.headers['x-device-token'] as string;
    if (!token) return null;
    return db.collection('sms_devices').findOne({ token, revoked: { $ne: true } });
};

// Pair: exchange a pairing code for a permanent device token.
router.post('/mobile/register', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'Unknown school' });
        const { pairingCode, deviceName, imei, simOperator, phone, firebaseToken } = req.body || {};
        if (!pairingCode) return res.status(400).json({ message: 'Pairing code required' });
        const device = await db.collection('sms_devices').findOne({ pairingCode: String(pairingCode), paired: false, revoked: { $ne: true } });
        if (!device) return res.status(404).json({ message: 'Invalid or already-used pairing code' });
        if (device.pairingExpires && new Date(device.pairingExpires) < new Date()) return res.status(410).json({ message: 'Pairing code expired' });

        const token = newToken();
        await db.collection('sms_devices').updateOne({ _id: device._id }, {
            $set: {
                paired: true, online: true, token, pairingCode: null, pairingExpires: null,
                name: deviceName || device.name, imei: imei || null, simOperator: simOperator || null,
                phone: phone || null, firebaseToken: firebaseToken || null,
                lastSeen: new Date(), updatedAt: new Date(),
            },
        });
        res.json({ ok: true, token, deviceId: String(device._id), school: schoolId(req) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/mobile/heartbeat', async (req, res) => {
    try {
        const db = tdb(req); const device = await deviceFromReq(req);
        if (!db || !device) return res.status(401).json({ message: 'Unauthorized device' });
        const { battery, network, sim, signal, simSlot } = req.body || {};
        await db.collection('sms_devices').updateOne({ _id: device._id }, {
            $set: { online: true, battery, network, sim, signal, simSlot, lastSeen: new Date() },
        });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/mobile/jobs', async (req, res) => {
    try {
        const db = tdb(req); const device = await deviceFromReq(req);
        if (!db || !device) return res.status(401).json({ message: 'Unauthorized device' });
        await db.collection('sms_devices').updateOne({ _id: device._id }, { $set: { online: true, lastSeen: new Date() } });
        const jobs = await claimJobs(db, schoolId(req), String(device._id), Number(req.query.limit) || 20);
        const settings = await getSmsSettings(db);
        res.json({ jobs, pacingMs: settings.pacingMs });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/mobile/update', async (req, res) => {
    try {
        const db = tdb(req); const device = await deviceFromReq(req);
        if (!db || !device) return res.status(401).json({ message: 'Unauthorized device' });
        const { jobId, status, error, updates } = req.body || {};
        if (Array.isArray(updates)) {
            for (const u of updates) await updateJobStatus(db, u.jobId, u.status, u.error);
        } else if (jobId) {
            await updateJobStatus(db, jobId, status, error);
        }
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── HTTP gateway sender (Africa's Talking-style) ────────────────────────────
async function sendViaApi(db: Db, cfg: any, numbers: string[], message: string) {
    const results: any[] = [];
    if (!cfg?.apiKey || !cfg?.username) {
        // No API configured — log as failed so the school notices.
        for (const phone of numbers) await db.collection('sms_jobs').updateOne({ phone, message, status: 'queued' }, { $set: { status: 'failed', error: 'SMS API not configured', updatedAt: new Date() } });
        return { sent: 0, failed: numbers.length, error: 'SMS API not configured' };
    }
    try {
        const to = numbers.map(n => '+' + normalizePhone(n)).join(',');
        const resp = await fetch('https://api.africastalking.com/version1/messaging', {
            method: 'POST',
            headers: { apiKey: cfg.apiKey, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: new URLSearchParams({ username: cfg.username, to, message, ...(cfg.senderId ? { from: cfg.senderId } : {}) }),
        });
        const data: any = await resp.json().catch(() => ({}));
        const recipients = data?.SMSMessageData?.Recipients || [];
        const sent = recipients.filter((r: any) => /success|sent/i.test(r.status)).length;
        for (const phone of numbers) await db.collection('sms_jobs').updateOne({ phone, message, status: 'queued' }, { $set: { status: sent ? 'sent' : 'failed', provider: 'api', updatedAt: new Date() } });
        results.push(data);
        return { sent: sent || (resp.ok ? numbers.length : 0), failed: numbers.length - (sent || (resp.ok ? numbers.length : 0)), raw: data };
    } catch (e: any) {
        return { sent: 0, failed: numbers.length, error: e.message };
    }
}

export default router;
