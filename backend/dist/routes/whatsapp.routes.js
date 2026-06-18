"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const qrcode_1 = __importDefault(require("qrcode"));
const SessionManager_1 = require("../services/whatsapp/SessionManager");
const mongodb_1 = require("../lib/mongodb");
const logger_1 = require("../services/whatsapp/logger");
const router = (0, express_1.Router)();
// ── School scope ─────────────────────────────────────────────────────────────
function schoolIdOf(req) {
    return req.tenantContext?.tenantId || null;
}
function requireSchool(req, res) {
    const id = schoolIdOf(req);
    if (!id) {
        res.status(401).json({ message: 'School authentication required' });
        return null;
    }
    return id;
}
// ── Lightweight in-memory rate limiter for connection endpoints ───────────────
const hits = new Map();
function rateLimit(max, windowMs) {
    return (req, res, next) => {
        const key = `${schoolIdOf(req) || req.ip}:${req.path}`;
        const now = Date.now();
        const rec = hits.get(key);
        if (!rec || rec.resetAt < now) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        if (rec.count >= max) {
            const retry = Math.ceil((rec.resetAt - now) / 1000);
            return res.status(429).json({ message: `Too many requests. Try again in ${retry}s.` });
        }
        rec.count += 1;
        next();
    };
}
const connLimiter = rateLimit(10, 60000); // 10 conn-attempts / school / minute
// ── Routes ───────────────────────────────────────────────────────────────────
router.get('/whatsapp/status', async (req, res) => {
    const schoolId = requireSchool(req, res);
    if (!schoolId)
        return;
    try {
        const s = await SessionManager_1.whatsAppManager.getStatus(schoolId);
        res.json({
            connected: s.status === 'connected',
            status: s.status,
            phoneNumber: s.phoneNumber,
            profileName: s.profileName,
            lastSeen: s.lastSeen,
            connectedAt: s.connectedAt,
        });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/whatsapp/qr', connLimiter, async (req, res) => {
    const schoolId = requireSchool(req, res);
    if (!schoolId)
        return;
    try {
        const { qr, expiresAt, status } = await SessionManager_1.whatsAppManager.getQR(schoolId);
        if (status === 'connected')
            return res.json({ qr: null, connected: true, status });
        const dataUrl = qr ? await qrcode_1.default.toDataURL(qr, { margin: 1, width: 320 }) : null;
        res.json({ qr: dataUrl, raw: qr, expiresAt, status, connected: false });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/whatsapp/connect', connLimiter, async (req, res) => {
    const schoolId = requireSchool(req, res);
    if (!schoolId)
        return;
    try {
        const meta = await SessionManager_1.whatsAppManager.connect(schoolId);
        res.json({ message: 'Connecting', status: meta.status });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/whatsapp/disconnect', connLimiter, async (req, res) => {
    const schoolId = requireSchool(req, res);
    if (!schoolId)
        return;
    try {
        await SessionManager_1.whatsAppManager.disconnect(schoolId);
        res.json({ message: 'Disconnected' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.delete('/whatsapp/session', connLimiter, async (req, res) => {
    const schoolId = requireSchool(req, res);
    if (!schoolId)
        return;
    try {
        await SessionManager_1.whatsAppManager.deleteSession(schoolId);
        res.json({ message: 'Session deleted' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/whatsapp/info', async (req, res) => {
    const schoolId = requireSchool(req, res);
    if (!schoolId)
        return;
    try {
        res.json(await SessionManager_1.whatsAppManager.getInfo(schoolId));
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/whatsapp/send', rateLimit(60, 60000), async (req, res) => {
    const schoolId = requireSchool(req, res);
    if (!schoolId)
        return;
    try {
        const { to, message } = req.body || {};
        if (!to || !message)
            return res.status(400).json({ message: 'to and message are required' });
        const result = await SessionManager_1.whatsAppManager.sendText(schoolId, String(to), String(message));
        res.json({ message: 'Sent', id: result.id });
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
// ── Super-owner admin overview ────────────────────────────────────────────────
function requireSuperOwner(req, res) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Owner authentication required' });
        return false;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(auth.split(' ')[1], process.env.OWNER_JWT_SECRET || 'owner_secret');
        const role = String(decoded.role || '').toLowerCase();
        if (role !== 'super_owner') {
            res.status(403).json({ message: 'Super Owner only' });
            return false;
        }
        return true;
    }
    catch {
        res.status(401).json({ message: 'Invalid owner token' });
        return false;
    }
}
router.get('/whatsapp/admin/sessions', async (req, res) => {
    if (!requireSuperOwner(req, res))
        return;
    try {
        const meta = (0, mongodb_1.getMetaDb)();
        const tenants = await meta.collection('Tenant').find({ status: 'active' }).project({ _id: 1, name: 1, subdomain: 1, databaseName: 1 }).toArray();
        const rows = await Promise.all(tenants.map(async (t) => {
            const dbName = t.databaseName || (0, mongodb_1.subdomainToDbName)(t.subdomain || String(t._id));
            const db = (0, mongodb_1.getTenantDb)(dbName);
            const s = await db.collection('whatsapp_sessions').findOne({ schoolId: t._id.toString() }).catch(() => null);
            return {
                schoolId: t._id.toString(), name: t.name || t.subdomain, subdomain: t.subdomain,
                status: s?.status || 'disconnected', live: SessionManager_1.whatsAppManager.isLive(t._id.toString()),
                phoneNumber: s?.phoneNumber || null, profileName: s?.profileName || null,
                connectedAt: s?.connectedAt || null, lastSeen: s?.lastSeen || null,
            };
        }));
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/whatsapp/admin/:schoolId/disconnect', async (req, res) => {
    if (!requireSuperOwner(req, res))
        return;
    try {
        await SessionManager_1.whatsAppManager.disconnect(req.params.schoolId);
        (0, logger_1.logEvent)(req.params.schoolId, 'admin_force_disconnect');
        res.json({ message: 'Disconnected' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.delete('/whatsapp/admin/:schoolId/session', async (req, res) => {
    if (!requireSuperOwner(req, res))
        return;
    try {
        await SessionManager_1.whatsAppManager.deleteSession(req.params.schoolId);
        (0, logger_1.logEvent)(req.params.schoolId, 'admin_delete_session');
        res.json({ message: 'Session deleted' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
exports.default = router;
