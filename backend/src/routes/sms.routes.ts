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
    deviceStats, newToken, buildResultMessages, listResultSources,
    getProviderStates, normalizePriority, SMS_PROVIDER_NAMES, SmsProviderKey,
} from '../services/smsGateway.service';
import { resolvePhones } from '../services/communications.service';
import { atBalance } from '../services/africasTalking.service';
import { enforceCrud } from '../lib/permissions';
import { getSmsPolicy, saveSmsPolicy, canComposeSms, queueForApproval } from '../lib/smsPolicy';
import { isAdminRole } from '../lib/examWindow';

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
    const { apiConfig, ...rest } = await getSmsSettings(db);
    // Credentials stay on the server: the browser only learns which vendor is active.
    res.json({ ...rest, apiConfig: { vendor: (apiConfig as any)?.vendor || null, senderId: (apiConfig as any)?.senderId || null } });
});

router.post('/communications/sms/settings', async (req, res) => {
    const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
    res.json(await saveSmsSettings(db, req.body || {}));
});

// A send that reached nobody is an error, not a success - otherwise the admin sees "sent"
// while nothing left. Waiting for a phone to collect the message is not a failure.
const failedOutright = (r: any) => r.queued > 0 && r.sent === 0 && r.failed > 0 && r.provider !== 'device';

// Send / queue SMS through the school's SMS gateways, in the order of its priority.
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

        const actor = (req as any).tenantContext?.user as { staffId: string | null; role: string; name: string } | null;
        const policy = await getSmsPolicy(db);
        if (!canComposeSms(policy, actor)) return res.status(403).json({ message: 'You are not allowed to send SMS. Ask your admin to grant access under Communication settings.' });
        if (policy.approvalRequired && !(actor && isAdminRole(actor.role))) {
            const pending = await queueForApproval(db, {
                message, numbers, audience: audList.join(',') || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                requestedBy: { staffId: actor?.staffId || null, name: actor?.name || 'Staff', role: actor?.role || '' },
            });
            return res.json({ pendingApproval: true, id: pending.id, message: 'Submitted for admin approval before sending.' });
        }

        const result: any = await queueSms(db, schoolId(req), numbers, message, {
            audience: audList.join(',') || undefined, createdBy: actor?.staffId || undefined,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        });
        if (failedOutright(result)) return res.status(502).json({ ...result, message: result.error || 'The SMS could not be sent.' });
        const onlineDevices = result.provider === 'device' ? await db.collection('sms_devices').countDocuments({ revoked: { $ne: true }, online: true }) : undefined;
        res.json({ ...result, ...(onlineDevices !== undefined ? { onlineDevices } : {}) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Send a single test SMS to verify the gateway is wired up correctly.
router.post('/communications/sms/test', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const { phone } = req.body || {};
        if (!phone) return res.status(400).json({ message: 'A test phone number is required' });
        const message = await brandFor(req, db, 'SMS test - your gateway is connected and working.');
        const result: any = await queueSms(db, schoolId(req), [phone], message, { audience: 'test' });
        if (failedOutright(result)) return res.status(502).json({ ...result, message: result.error || 'The test SMS could not be sent.' });
        const onlineDevices = result.provider === 'device' ? await db.collection('sms_devices').countDocuments({ revoked: { $ne: true }, online: true }) : undefined;
        res.json({ ...result, ...(onlineDevices !== undefined ? { onlineDevices } : {}) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Who can send SMS, and whether a send needs approval first ───────────────

router.get('/communications/sms/policy', async (req, res) => {
    const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
    res.json(await getSmsPolicy(db));
});

router.put('/communications/sms/policy', enforceCrud('communications', 'update'), async (req, res) => {
    const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
    const { allowedStaffIds, approvalRequired } = req.body || {};
    const patch: any = {};
    if (allowedStaffIds !== undefined) patch.allowedStaffIds = Array.isArray(allowedStaffIds) ? allowedStaffIds.map(String) : [];
    if (approvalRequired !== undefined) patch.approvalRequired = !!approvalRequired;
    res.json(await saveSmsPolicy(db, patch));
});

// Pending SMS awaiting admin (or reporting-officer) approval before they're sent.
router.get('/communications/sms/approvals', async (req, res) => {
    const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
    const status = String(req.query.status || 'pending');
    const rows = await db.collection('sms_approvals').find(status === 'all' ? {} : { status }).sort({ createdAt: -1 }).toArray();
    res.json(rows);
});

router.post('/communications/sms/approvals/:id/approve', enforceCrud('communications', 'update'), async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const row: any = await db.collection('sms_approvals').findOne({ _id: oid(req.params.id) });
        if (!row) return res.status(404).json({ message: 'Not found' });
        if (row.status !== 'pending') return res.status(400).json({ message: `Already ${row.status}` });
        const actor = (req as any).tenantContext?.user;
        const result: any = await queueSms(db, schoolId(req), row.numbers, row.message, {
            audience: row.audience || undefined, createdBy: row.requestedBy?.staffId || undefined, scheduledAt: row.scheduledAt || null,
        });
        await db.collection('sms_approvals').updateOne({ _id: row._id }, { $set: { status: 'approved', decidedAt: new Date(), decidedBy: actor?.name || 'Admin' } });
        res.json({ message: 'Approved and sent', result });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/communications/sms/approvals/:id/reject', enforceCrud('communications', 'update'), async (req, res) => {
    const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
    const actor = (req as any).tenantContext?.user;
    const result = await db.collection('sms_approvals').updateOne({ _id: oid(req.params.id), status: 'pending' }, { $set: { status: 'rejected', decidedAt: new Date(), decidedBy: actor?.name || 'Admin' } });
    if (!result.matchedCount) return res.status(404).json({ message: 'Not found or already decided' });
    res.json({ message: 'Rejected' });
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

        const when = scheduledAt ? new Date(scheduledAt) : null;
        // Each learner's message is different, so each is its own send - a few at a time.
        let queued = 0, sent = 0, failed = 0, provider: string | null = null, error: string | undefined;
        for (let i = 0; i < messages.length; i += 5) {
            const rs: any[] = await Promise.all(messages.slice(i, i + 5).map((m: any) =>
                queueSms(db, schoolId(req), [m.phone], m.text, { audience: `results:${type}`, scheduledAt: when, createdBy: (req as any).user?.id })));
            rs.forEach(r => { queued += r.queued; sent += r.sent || 0; failed += r.failed || 0; provider = provider || r.provider; error = error || r.error; });
        }
        if (queued > 0 && sent === 0 && failed > 0 && provider !== 'device') return res.status(502).json({ message: error || 'The results could not be sent.', recipients: messages.length, queued, sent, failed });
        res.json({ provider, recipients: messages.length, queued, sent, failed });
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
        const deviceConnected = settings.provider === 'api' ? !!((settings.apiConfig as any)?.apiKey || (settings.apiConfig as any)?.apiToken) : !!(connectedDevice && connectedDevice.online);
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

// ─── SMS gateways: which are on, and in what order they are tried ───────────────
const providerView = async (db: Db) => {
    const { states, priority, order } = await getProviderStates(db);
    return {
        providers: priority.map(k => ({ key: k, name: states[k].name, configured: states[k].configured, enabled: states[k].enabled, ready: states[k].ready })),
        priority, order, active: order[0] || null,
    };
};
router.get('/communications/sms/providers', async (req, res) => {
    try { const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' }); res.json(await providerView(db)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
// Body: { priority?: string[], disable?: string[] } - used when an admin switches a gateway on and
// picks either "turn the others off" or "keep them, in this order".
router.put('/communications/sms/providers', enforceCrud('communications', 'update'), async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const disable: SmsProviderKey[] = (Array.isArray(req.body?.disable) ? req.body.disable : []).filter((k: any) => k in SMS_PROVIDER_NAMES);
        for (const k of disable) {
            if (k === 'device') await db.collection('sms_settings').updateOne({ _id: 'sms' as any }, { $set: { deviceEnabled: false, updatedAt: new Date() } }, { upsert: true });
            else await db.collection('integration_settings').updateMany({ integration: k }, { $set: { enabled: false, updatedAt: new Date() } });
        }
        if (Array.isArray(req.body?.priority)) await db.collection('sms_settings').updateOne({ _id: 'sms' as any }, { $set: { priority: normalizePriority(req.body.priority), updatedAt: new Date() } }, { upsert: true });
        res.json(await providerView(db));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Credit left with the gateway that is currently first in line.
router.get('/communications/sms/balance', async (req, res) => {
    try {
        const db = tdb(req); if (!db) return res.status(400).json({ message: 'No tenant' });
        const { states, order } = await getProviderStates(db);
        const first = order.find(k => k !== 'device');
        if (first === 'africas_talking') {
            const b = await atBalance(states.africas_talking.config);
            return res.json({ configured: true, vendor: 'africas_talking', balance: b.balance, raw: b.raw, topupUrl: 'https://account.africastalking.com' });
        }
        if (first === 'talksasa') {
            const { talksasaBalance } = await import('../services/talksasa.service');
            const b = await talksasaBalance({ apiToken: states.talksasa.config.apiToken });
            return res.json({ configured: true, vendor: 'talksasa', balance: b.balance, raw: b.raw, topupUrl: 'https://bulksms.talksasa.com' });
        }
        res.json({ configured: false, message: 'No SMS API is switched on.' });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

export default router;
