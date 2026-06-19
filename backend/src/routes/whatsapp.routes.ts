/**
 * WhatsApp QR session API (per-school, multi-tenant).
 *
 * Every route derives schoolId from the authenticated tenant context populated
 * by the tenancy middleware (which already enforces the cross-tenant token
 * guard). A school can therefore only ever touch its OWN session.
 *
 *   GET    /whatsapp/status      → connection status
 *   GET    /whatsapp/qr          → create-if-needed + current QR (as data-URL)
 *   POST   /whatsapp/connect     → start a connection
 *   POST   /whatsapp/disconnect  → log out the linked device
 *   DELETE /whatsapp/session     → delete the session entirely
 *   GET    /whatsapp/info        → profile photo / name / phone / status
 *   POST   /whatsapp/send        → send a text (foundation for broadcasts)
 *
 * Admin (super_owner) overview:
 *   GET    /whatsapp/admin/sessions          → all schools' sessions
 *   POST   /whatsapp/admin/:schoolId/disconnect
 *   DELETE /whatsapp/admin/:schoolId/session
 */
import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { whatsAppManager } from '../services/whatsapp/SessionManager';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';
import { logEvent } from '../services/whatsapp/logger';

const router = Router();

// ── School scope ─────────────────────────────────────────────────────────────
function schoolIdOf(req: Request): string | null {
    return req.tenantContext?.tenantId || null;
}
function requireSchool(req: Request, res: Response): string | null {
    const id = schoolIdOf(req);
    if (!id) { res.status(401).json({ message: 'School authentication required' }); return null; }
    return id;
}

// ── Lightweight in-memory rate limiter for connection endpoints ───────────────
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(max: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = `${schoolIdOf(req) || req.ip}:${req.path}`;
        const now = Date.now();
        const rec = hits.get(key);
        if (!rec || rec.resetAt < now) { hits.set(key, { count: 1, resetAt: now + windowMs }); return next(); }
        if (rec.count >= max) {
            const retry = Math.ceil((rec.resetAt - now) / 1000);
            return res.status(429).json({ message: `Too many requests. Try again in ${retry}s.` });
        }
        rec.count += 1; next();
    };
}
const connLimiter = rateLimit(10, 60_000);   // 10 conn-attempts / school / minute

// ── Routes ───────────────────────────────────────────────────────────────────
router.get('/whatsapp/status', async (req, res) => {
    const schoolId = requireSchool(req, res); if (!schoolId) return;
    try {
        const s = await whatsAppManager.getStatus(schoolId);
        res.json({
            connected: s.status === 'connected',
            status: s.status,
            phoneNumber: s.phoneNumber,
            profileName: s.profileName,
            lastSeen: s.lastSeen,
            connectedAt: s.connectedAt,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/whatsapp/qr', connLimiter, async (req, res) => {
    const schoolId = requireSchool(req, res); if (!schoolId) return;
    try {
        const { qr, expiresAt, status } = await whatsAppManager.getQR(schoolId);
        if (status === 'connected') return res.json({ qr: null, connected: true, status });
        const dataUrl = qr ? await QRCode.toDataURL(qr, { margin: 1, width: 320 }) : null;
        res.json({ qr: dataUrl, raw: qr, expiresAt, status, connected: false });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/whatsapp/connect', connLimiter, async (req, res) => {
    const schoolId = requireSchool(req, res); if (!schoolId) return;
    try {
        const meta = await whatsAppManager.connect(schoolId);
        res.json({ message: 'Connecting', status: meta.status });
    } catch (e: any) {
        // Log the full stack so the VPS logs reveal the real cause of a 500.
        console.error('[WhatsApp] connect failed:', e?.stack || e?.message || e);
        res.status(500).json({ message: e?.message || 'WhatsApp connect failed', error: String(e?.message || e) });
    }
});

router.post('/whatsapp/disconnect', connLimiter, async (req, res) => {
    const schoolId = requireSchool(req, res); if (!schoolId) return;
    try {
        await whatsAppManager.disconnect(schoolId);
        res.json({ message: 'Disconnected' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/whatsapp/session', connLimiter, async (req, res) => {
    const schoolId = requireSchool(req, res); if (!schoolId) return;
    try {
        await whatsAppManager.deleteSession(schoolId);
        res.json({ message: 'Session deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/whatsapp/info', async (req, res) => {
    const schoolId = requireSchool(req, res); if (!schoolId) return;
    try { res.json(await whatsAppManager.getInfo(schoolId)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/whatsapp/send', rateLimit(60, 60_000), async (req, res) => {
    const schoolId = requireSchool(req, res); if (!schoolId) return;
    try {
        const { to, message } = req.body || {};
        if (!to || !message) return res.status(400).json({ message: 'to and message are required' });
        const result = await whatsAppManager.sendText(schoolId, String(to), String(message));
        res.json({ message: 'Sent', id: result.id });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});


// ── Super-owner admin overview ────────────────────────────────────────────────
function requireSuperOwner(req: Request, res: Response): boolean {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) { res.status(401).json({ message: 'Owner authentication required' }); return false; }
    try {
        const decoded: any = jwt.verify(auth.split(' ')[1], process.env.OWNER_JWT_SECRET || 'owner_secret');
        const role = String(decoded.role || '').toLowerCase();
        if (role !== 'super_owner') { res.status(403).json({ message: 'Super Owner only' }); return false; }
        return true;
    } catch { res.status(401).json({ message: 'Invalid owner token' }); return false; }
}

router.get('/whatsapp/admin/sessions', async (req, res) => {
    if (!requireSuperOwner(req, res)) return;
    try {
        const meta = getMetaDb();
        const tenants = await meta.collection('Tenant').find({ status: 'active' }).project({ _id: 1, name: 1, subdomain: 1, databaseName: 1 }).toArray();
        const rows = await Promise.all(tenants.map(async (t: any) => {
            const dbName = t.databaseName || subdomainToDbName(t.subdomain || String(t._id));
            const db = getTenantDb(dbName);
            const s = await db.collection('whatsapp_sessions').findOne({ schoolId: t._id.toString() }).catch(() => null);
            return {
                schoolId: t._id.toString(), name: t.name || t.subdomain, subdomain: t.subdomain,
                status: s?.status || 'disconnected', live: whatsAppManager.isLive(t._id.toString()),
                phoneNumber: s?.phoneNumber || null, profileName: s?.profileName || null,
                connectedAt: s?.connectedAt || null, lastSeen: s?.lastSeen || null,
            };
        }));
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/whatsapp/admin/:schoolId/disconnect', async (req, res) => {
    if (!requireSuperOwner(req, res)) return;
    try { await whatsAppManager.disconnect(req.params.schoolId); logEvent(req.params.schoolId, 'admin_force_disconnect'); res.json({ message: 'Disconnected' }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/whatsapp/admin/:schoolId/session', async (req, res) => {
    if (!requireSuperOwner(req, res)) return;
    try { await whatsAppManager.deleteSession(req.params.schoolId); logEvent(req.params.schoolId, 'admin_delete_session'); res.json({ message: 'Session deleted' }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Platform (owner/company) WhatsApp session — key 'platform' in the meta DB ──
// Powers owner login OTPs, owner broadcasts, and new-user credential delivery.
const PLATFORM = 'platform';
router.get('/whatsapp/platform/status', async (req, res) => {
    if (!requireSuperOwner(req, res)) return;
    try {
        const s = await whatsAppManager.getStatus(PLATFORM);
        res.json({ connected: s.status === 'connected', status: s.status, phoneNumber: s.phoneNumber, profileName: s.profileName, lastSeen: s.lastSeen, connectedAt: s.connectedAt });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/whatsapp/platform/qr', async (req, res) => {
    if (!requireSuperOwner(req, res)) return;
    try {
        const { qr, expiresAt, status } = await whatsAppManager.getQR(PLATFORM);
        if (status === 'connected') return res.json({ qr: null, connected: true, status });
        const dataUrl = qr ? await QRCode.toDataURL(qr, { margin: 1, width: 320 }) : null;
        res.json({ qr: dataUrl, raw: qr, expiresAt, status, connected: false });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/whatsapp/platform/connect', async (req, res) => {
    if (!requireSuperOwner(req, res)) return;
    try { const meta = await whatsAppManager.connect(PLATFORM); res.json({ message: 'Connecting', status: meta.status }); }
    catch (e: any) { console.error('[WhatsApp] platform connect failed:', e?.stack || e); res.status(500).json({ message: e?.message || 'Connect failed' }); }
});

router.post('/whatsapp/platform/disconnect', async (req, res) => {
    if (!requireSuperOwner(req, res)) return;
    try { await whatsAppManager.disconnect(PLATFORM); res.json({ message: 'Disconnected' }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/whatsapp/platform/session', async (req, res) => {
    if (!requireSuperOwner(req, res)) return;
    try { await whatsAppManager.deleteSession(PLATFORM); res.json({ message: 'Session deleted' }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/whatsapp/platform/info', async (req, res) => {
    if (!requireSuperOwner(req, res)) return;
    try { res.json(await whatsAppManager.getInfo(PLATFORM)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
