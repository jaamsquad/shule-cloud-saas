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
    deviceStats, newToken, normalizePhone, buildResultMessages, listResultSources,
} from '../services/smsGateway.service';
import { resolvePhones } from '../services/communications.service';

const router = Router();
const oid = (s?: string) => { try { return s ? new ObjectId(s) : undefined; } catch { return undefined; } };
const tdb = (req: Request): Db | null => (req as any).tenantDb || null;
const schoolId = (req: Request): string => String((req as any).tenantContext?.tenantId || '');

// Resolve the school's display name (Tenant record + tenant-DB profile fallback)
// and prefix the message: "Egerton High School: <message>". Applied at QUEUE time
// so EVERY provider (Android device SIM or HTTP API) sends the branded text.
async function brandFor(req: Request, db: Db, message: string): Promise<string> {
    let name = (req as any).tenantContext?.tenantName || '';
    if (!name) {
        try {
            const { getMetaDb } = await import('../lib/mongodb');
            const tid = (req as any).tenantContext?.tenantId;
            const t: any = tid ? await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(String(tid)) }) : null;
            name = t?.instituteName || t?.name || '';
        } catch { /* ignore */ }
    }
    if (!name) { const p: any = await db.collection('school_profile').findOne({}).catch(() => null) || await db.collection('tenant_profile').findOne({}).catch(() => null); name = p?.name || ''; }
    const { brandMessage } = await import('../services/talksasa.service');
    return brandMessage(name, message);
}

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
        const { message: rawMsg, to, audience, audiences, scheduledAt } = req.body || {};
        if (!rawMsg) return res.status(400).json({ message: 'Message is required' });
        const message = await brandFor(req, db, rawMsg);   // prefix school name (all providers)

        let numbers: string[] = Array.isArray(to) ? to : (to ? [to] : []);
        const audList: string[] = Array.isArray(audiences) ? audiences : (audience ? [audience] : []);
        for (const a of audList) numbers = [...numbers, ...await resolvePhones(db, a as any)];
        numbers = Array.from(new Set(numbers.filter(Boolean)));
        if (numbers.length === 0) return res.status(400).json({ message: 'No recipients with phone numbers were found' });

        const audienceLabel = audList.join(',') || null;
        const settings = await getSmsSettings(db);
        // queueSms now dispatches immediately via Talksasa when configured, else
        // notifies devices. Non-Africa's-Talking API still uses the legacy path.
        if (settings.provider === 'api' && !settings.apiConfig?.apiToken) {
            const { queued } = await queueSms(db, schoolId(req), numbers, message, { audience: audienceLabel || undefined, createdBy: (req as any).user?.id });
            const sent = await sendViaApi(db, settings.apiConfig, numbers, message);
            return res.json({ provider: 'api', queued, ...sent });
        }

        const result = await queueSms(db, schoolId(req), numbers, message, {
            audience: audienceLabel || undefined, createdBy: (req as any).user?.id,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        });
        if ((result as any).provider === 'talksasa') return res.json({ provider: 'talksasa', ...result });
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
        const message = await brandFor(req, db, 'SMS test — your gateway is connected and working. ✅');
        const settings = await getSmsSettings(db);
        if (settings.provider === 'api' && !settings.apiConfig?.apiToken) {
            await queueSms(db, schoolId(req), [phone], message, { audience: 'test' });
            const sent = await sendViaApi(db, settings.apiConfig, [phone], message);
            return res.json({ provider: 'api', ...sent });
        }
        // Talksasa: queueSms sends immediately. Device: it notifies the phone.
        const tr = await queueSms(db, schoolId(req), [phone], message, { audience: 'test' });
        if ((tr as any).provider === 'talksasa') return res.json({ provider: 'talksasa', ...tr });
        const online = await db.collection('sms_devices').countDocuments({ revoked: { $ne: true }, online: true });
        res.json({ provider: 'device', ...tr, onlineDevices: online });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Results SMS: list sources + send per-student results ────────────────────

// List exams / class tests / CBC activities the admin can send results for.
router.get('/communications/sms/result-sources', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        res.json(await listResultSources(db));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Build per-student result messages for a source and queue/send them via SMS.
router.post('/communications/sms/send-results', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const { type, id, scheduledAt, classId, streamId, className, streamName } = req.body || {};
        if (!type || !id) return res.status(400).json({ message: 'Choose a result source' });

        const messagesRaw = await buildResultMessages(db, type, id, { classId, streamId, className, streamName });
        if (messagesRaw.length === 0) return res.status(409).json({ message: 'No results found, or students have no parent phone numbers.' });
        // Prefix the school name on every result message.
        const messages = await Promise.all(messagesRaw.map(async (m: any) => ({ ...m, text: await brandFor(req, db, m.text) })));

        const settings = await getSmsSettings(db);
        const when = scheduledAt ? new Date(scheduledAt) : null;
        let queued = 0;
        for (const m of messages) {
            const r = await queueSms(db, schoolId(req), [m.phone], m.text, { audience: `results:${type}`, scheduledAt: when, createdBy: (req as any).user?.id });
            queued += r.queued;
        }
        // queueSms already dispatched via Talksasa (immediate). Only the legacy
        // non-token API provider needs the extra sendViaApi call.
        if (settings.provider === 'api' && !settings.apiConfig?.apiToken && !when) {
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
// SMS balance + profile (Talksasa). Reads the school's saved token.
router.get('/communications/sms/balance', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const settings = await getSmsSettings(db);
        const token = settings.apiConfig?.apiToken;
        if (!token) return res.json({ configured: false, message: 'Talksasa not configured.' });
        const { talksasaBalance } = await import('../services/talksasa.service');
        const b = await talksasaBalance({ apiToken: token });
        res.json({ configured: true, vendor: 'talksasa', balance: b.balance, raw: b.raw, topupUrl: 'https://bulksms.talksasa.com' });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

async function sendViaApi(db: Db, cfg: any, numbers: string[], rawMessage: string) {
    const results: any[] = [];
    // The message is already branded (school name prefixed) at queue time, so we
    // dispatch it as-is. The job lookup below also keys on this exact text.
    const message = rawMessage;

    // ── Talksasa vendor ───────────────────────────────────────────────────────
    if (cfg?.vendor === 'talksasa' || cfg?.apiToken) {
        const { talksasaSend } = await import('../services/talksasa.service');
        const r = await talksasaSend({ apiToken: cfg.apiToken, senderId: cfg.senderId }, numbers, message);
        for (const phone of numbers) await db.collection('sms_jobs').updateOne({ phone, message: rawMessage, status: 'queued' }, { $set: { status: r.ok ? 'sent' : 'failed', provider: 'talksasa', error: r.error, updatedAt: new Date() } });
        return { sent: r.sent, failed: r.failed, error: r.error, raw: r.raw };
    }

    if (!cfg?.apiKey || !cfg?.username) {
        // No API configured — log as failed so the school notices.
        for (const phone of numbers) await db.collection('sms_jobs').updateOne({ phone, message: rawMessage, status: 'queued' }, { $set: { status: 'failed', error: 'SMS API not configured', updatedAt: new Date() } });
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
        for (const phone of numbers) await db.collection('sms_jobs').updateOne({ phone, message: rawMessage, status: 'queued' }, { $set: { status: sent ? 'sent' : 'failed', provider: 'api', updatedAt: new Date() } });
        results.push(data);
        return { sent: sent || (resp.ok ? numbers.length : 0), failed: numbers.length - (sent || (resp.ok ? numbers.length : 0)), raw: data };
    } catch (e: any) {
        return { sent: 0, failed: numbers.length, error: e.message };
    }
}

export default router;
