"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsAppManager = void 0;
/**
 * WhatsAppSessionManager — one isolated WhatsApp Web (Baileys) session per school.
 *
 *  • Multi-tenant: keyed by schoolId (the tenant _id). A session NEVER crosses tenants.
 *  • Persistent: auth creds live in the tenant DB (see mongoAuthStore) so sessions
 *    are restored automatically after a backend restart — no re-scan needed.
 *  • Event-driven: emits 'qr', 'connected', 'disconnected', 'reconnecting',
 *    'authenticated', 'logout', 'session_expired', 'message_received',
 *    'message_sent'. The Socket.IO layer relays these to the browser.
 *  • Self-healing: auto-reconnects on transient drops; surfaces logout/expiry.
 *
 * Designed to hold thousands of concurrent sessions: sockets are created lazily,
 * torn down on logout, and metadata is the single source of truth for status.
 */
const events_1 = require("events");
const baileys_1 = __importDefault(require("@whiskeysockets/baileys"));
const mongodb_1 = require("../../lib/mongodb");
const mongoAuthStore_1 = require("./mongoAuthStore");
const logger_1 = require("./logger");
const makeWASocket = baileys_1.default.default;
const { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = baileys_1.default;
const QR_TTL_MS = 20000; // WhatsApp QR validity window (~20s)
const MAX_RECONNECT_ATTEMPTS = 5;
const SESSIONS_COLL = 'whatsapp_sessions';
class WhatsAppSessionManager extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.sessions = new Map();
    }
    /** Resolve a school's tenant DB + subdomain from the meta registry. */
    async resolveTenant(schoolId) {
        try {
            const { ObjectId } = await Promise.resolve().then(() => __importStar(require('mongodb')));
            const meta = (0, mongodb_1.getMetaDb)();
            const t = await meta.collection('Tenant').findOne({ _id: new ObjectId(schoolId) });
            if (!t)
                return null;
            const dbName = t.databaseName || (0, mongodb_1.subdomainToDbName)(t.subdomain || schoolId);
            return { db: (0, mongodb_1.getTenantDb)(dbName), subdomain: String(t.subdomain || schoolId) };
        }
        catch {
            return null;
        }
    }
    metaDoc(s) {
        return {
            schoolId: s.schoolId, status: s.status, sessionId: s.schoolId,
            phoneNumber: s.phoneNumber, profileName: s.profileName,
            qr: s.qr, qrExpiresAt: s.qrExpiresAt, connectedAt: s.connectedAt,
            lastSeen: new Date(), updatedAt: new Date(),
        };
    }
    /** Persist the latest session metadata to the tenant DB. */
    async persist(s) {
        try {
            await s.db.collection(SESSIONS_COLL).updateOne({ schoolId: s.schoolId }, {
                $set: {
                    schoolId: s.schoolId, status: s.status, sessionId: s.schoolId,
                    phoneNumber: s.phoneNumber, profileName: s.profileName,
                    qrExpiresAt: s.qrExpiresAt, connectedAt: s.connectedAt,
                    lastSeen: new Date(), updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
            }, { upsert: true });
        }
        catch { /* metadata best-effort */ }
    }
    setStatus(s, status) {
        s.status = status;
        this.persist(s);
    }
    emitTo(schoolId, event, payload) {
        this.emit(`${schoolId}:${event}`, payload);
        this.emit(event, { schoolId, ...payload }); // global listeners (admin overview)
    }
    /** Public status for the REST layer (live session or last-known DB metadata). */
    async getStatus(schoolId) {
        const live = this.sessions.get(schoolId);
        if (live)
            return this.metaDoc(live);
        const tenant = await this.resolveTenant(schoolId);
        const stored = tenant && await tenant.db.collection(SESSIONS_COLL).findOne({ schoolId });
        return {
            schoolId, status: stored?.status || 'disconnected', sessionId: schoolId,
            phoneNumber: stored?.phoneNumber ?? null, profileName: stored?.profileName ?? null,
            qr: null, qrExpiresAt: stored?.qrExpiresAt ?? null,
            connectedAt: stored?.connectedAt ?? null, lastSeen: stored?.lastSeen ?? null,
            updatedAt: stored?.updatedAt ?? new Date(),
        };
    }
    /** Returns the current QR for a school, creating the session if needed. */
    async getQR(schoolId) {
        const live = this.sessions.get(schoolId);
        if (live?.status === 'connected')
            return { qr: null, expiresAt: null, status: 'connected' };
        if (live?.qr && live.qrExpiresAt && live.qrExpiresAt > new Date()) {
            return { qr: live.qr, expiresAt: live.qrExpiresAt, status: live.status };
        }
        await this.connect(schoolId);
        // Wait briefly for the first QR (or connection) to arrive.
        const cur = this.sessions.get(schoolId);
        if (cur?.qr)
            return { qr: cur.qr, expiresAt: cur.qrExpiresAt, status: cur.status };
        const qr = await this.waitForQR(schoolId, 12000);
        const after = this.sessions.get(schoolId);
        return { qr, expiresAt: after?.qrExpiresAt ?? null, status: after?.status ?? 'connecting' };
    }
    waitForQR(schoolId, timeoutMs) {
        return new Promise((resolve) => {
            const onQr = (p) => { cleanup(); resolve(p?.qr ?? null); };
            const onConn = () => { cleanup(); resolve(null); };
            const timer = setTimeout(() => { cleanup(); resolve(this.sessions.get(schoolId)?.qr ?? null); }, timeoutMs);
            const cleanup = () => {
                clearTimeout(timer);
                this.off(`${schoolId}:qr`, onQr);
                this.off(`${schoolId}:connected`, onConn);
            };
            this.once(`${schoolId}:qr`, onQr);
            this.once(`${schoolId}:connected`, onConn);
        });
    }
    /** Create (or reuse) a school's WhatsApp socket and begin connecting. */
    async connect(schoolId) {
        const existing = this.sessions.get(schoolId);
        if (existing && (existing.connecting || existing.status === 'connected')) {
            return this.metaDoc(existing);
        }
        const tenant = await this.resolveTenant(schoolId);
        if (!tenant)
            throw new Error('School not found');
        const auth = await (0, mongoAuthStore_1.useMongoAuthState)(tenant.db);
        const { version } = await fetchLatestBaileysVersion();
        const session = existing || {
            schoolId, subdomain: tenant.subdomain, db: tenant.db,
            sock: null, auth, status: 'connecting', qr: null, qrExpiresAt: null,
            reconnectAttempts: 0, connecting: false, phoneNumber: null,
            profileName: null, connectedAt: null,
        };
        session.db = tenant.db;
        session.auth = auth;
        session.connecting = true;
        this.sessions.set(schoolId, session);
        this.setStatus(session, 'connecting');
        const sock = makeWASocket({
            version,
            auth: {
                creds: auth.state.creds,
                keys: makeCacheableSignalKeyStore(auth.state.keys, console),
            },
            printQRInTerminal: false,
            browser: ['ShuleCloud', 'Chrome', '1.0.0'],
            markOnlineOnConnect: false,
            syncFullHistory: false,
        });
        session.sock = sock;
        sock.ev.on('creds.update', auth.saveCreds);
        sock.ev.on('connection.update', (u) => this.onConnectionUpdate(schoolId, u));
        sock.ev.on('messages.upsert', (m) => {
            if (m?.type === 'notify') {
                for (const msg of m.messages || []) {
                    const fromMe = msg?.key?.fromMe;
                    this.emitTo(schoolId, fromMe ? 'message_sent' : 'message_received', {
                        id: msg?.key?.id, from: msg?.key?.remoteJid,
                        text: msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || '',
                    });
                    session.lastSeen = new Date();
                }
            }
        });
        (0, logger_1.logEvent)(schoolId, 'connect_initiated', { subdomain: tenant.subdomain });
        return this.metaDoc(session);
    }
    async onConnectionUpdate(schoolId, update) {
        const s = this.sessions.get(schoolId);
        if (!s)
            return;
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            s.qr = qr;
            s.qrExpiresAt = new Date(Date.now() + QR_TTL_MS);
            this.setStatus(s, 'qr');
            if (s.qrTimer)
                clearTimeout(s.qrTimer);
            // When the QR lapses, mark it expired so the UI can request a fresh one.
            s.qrTimer = setTimeout(() => {
                const cur = this.sessions.get(schoolId);
                if (cur && cur.status === 'qr') {
                    cur.qr = null;
                    cur.qrExpiresAt = null;
                    this.emitTo(schoolId, 'session_expired', {});
                }
            }, QR_TTL_MS);
            this.emitTo(schoolId, 'qr', { qr, expiresAt: s.qrExpiresAt });
            (0, logger_1.logEvent)(schoolId, 'qr_generated');
        }
        if (connection === 'connecting') {
            this.setStatus(s, s.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
            if (s.reconnectAttempts > 0)
                this.emitTo(schoolId, 'reconnecting', {});
        }
        if (connection === 'open') {
            s.connecting = false;
            s.reconnectAttempts = 0;
            s.qr = null;
            s.qrExpiresAt = null;
            if (s.qrTimer)
                clearTimeout(s.qrTimer);
            const me = s.sock?.user;
            s.phoneNumber = me?.id ? String(me.id).split(':')[0].split('@')[0] : null;
            s.profileName = me?.name || me?.verifiedName || null;
            s.connectedAt = new Date();
            this.setStatus(s, 'connected');
            this.emitTo(schoolId, 'authenticated', {});
            this.emitTo(schoolId, 'connected', { phoneNumber: s.phoneNumber, profileName: s.profileName, connectedAt: s.connectedAt });
            (0, logger_1.logEvent)(schoolId, 'connected', { phoneNumber: s.phoneNumber });
        }
        if (connection === 'close') {
            s.connecting = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const loggedOut = statusCode === DisconnectReason.loggedOut;
            if (loggedOut) {
                // The phone unlinked this device — wipe creds, require a fresh scan.
                this.setStatus(s, 'logged_out');
                await s.auth.clear().catch(() => { });
                this.emitTo(schoolId, 'logout', { reason: 'logged_out' });
                (0, logger_1.logEvent)(schoolId, 'logout', { reason: 'phone_unlinked' });
                this.sessions.delete(schoolId);
                return;
            }
            // Transient drop — retry with backoff up to the cap.
            if (s.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                s.reconnectAttempts += 1;
                this.setStatus(s, 'reconnecting');
                this.emitTo(schoolId, 'reconnecting', { attempt: s.reconnectAttempts });
                (0, logger_1.logEvent)(schoolId, 'reconnecting', { attempt: s.reconnectAttempts, statusCode });
                const delay = Math.min(2000 * s.reconnectAttempts, 15000);
                setTimeout(() => this.connect(schoolId).catch(() => { }), delay);
            }
            else {
                this.setStatus(s, 'disconnected');
                this.emitTo(schoolId, 'disconnected', { reason: 'max_retries', statusCode });
                (0, logger_1.logEvent)(schoolId, 'disconnected', { reason: 'max_retries' });
            }
        }
    }
    /** Log out the device (clears creds) but keep the session record. */
    async disconnect(schoolId) {
        const s = this.sessions.get(schoolId);
        if (s?.sock) {
            try {
                await s.sock.logout();
            }
            catch { /* may already be gone */ }
        }
        if (s) {
            await s.auth.clear().catch(() => { });
            if (s.qrTimer)
                clearTimeout(s.qrTimer);
            this.setStatus(s, 'logged_out');
            s.phoneNumber = null;
            s.profileName = null;
            s.connectedAt = null;
            this.emitTo(schoolId, 'logout', { reason: 'manual' });
            this.sessions.delete(schoolId);
        }
        else {
            const tenant = await this.resolveTenant(schoolId);
            if (tenant) {
                await tenant.db.collection('whatsapp_auth').deleteMany({}).catch(() => { });
                await tenant.db.collection(SESSIONS_COLL).updateOne({ schoolId }, { $set: { status: 'logged_out', phoneNumber: null, profileName: null, connectedAt: null, updatedAt: new Date() } }).catch(() => { });
            }
        }
        (0, logger_1.logEvent)(schoolId, 'disconnect');
    }
    /** Fully delete a session: end socket, wipe creds AND the metadata record. */
    async deleteSession(schoolId) {
        const s = this.sessions.get(schoolId);
        if (s?.sock) {
            try {
                s.sock.end(undefined);
            }
            catch { }
        }
        if (s?.qrTimer)
            clearTimeout(s.qrTimer);
        this.sessions.delete(schoolId);
        const tenant = await this.resolveTenant(schoolId);
        if (tenant) {
            await tenant.db.collection('whatsapp_auth').deleteMany({}).catch(() => { });
            await tenant.db.collection(SESSIONS_COLL).deleteMany({ schoolId }).catch(() => { });
        }
        this.emitTo(schoolId, 'disconnected', { reason: 'deleted' });
        (0, logger_1.logEvent)(schoolId, 'session_deleted');
    }
    /** Rich profile info for the "Connected as" card. */
    async getInfo(schoolId) {
        const status = await this.getStatus(schoolId);
        const s = this.sessions.get(schoolId);
        let profilePicUrl = null;
        if (s?.sock && status.status === 'connected' && s.sock.user?.id) {
            try {
                profilePicUrl = await s.sock.profilePictureUrl(s.sock.user.id, 'image');
            }
            catch { /* none */ }
        }
        return {
            connected: status.status === 'connected',
            status: status.status,
            phoneNumber: status.phoneNumber,
            profileName: status.profileName,
            profilePicUrl,
            connectedAt: status.connectedAt,
            lastSeen: status.lastSeen,
        };
    }
    /** Send a text message (foundation for broadcasts / reminders / results). */
    async sendText(schoolId, toPhone, text) {
        const s = this.sessions.get(schoolId);
        if (!s || s.status !== 'connected' || !s.sock)
            throw new Error('WhatsApp is not connected for this school');
        const jid = toPhone.includes('@') ? toPhone : `${toPhone.replace(/[^\d]/g, '')}@s.whatsapp.net`;
        const sent = await s.sock.sendMessage(jid, { text });
        this.emitTo(schoolId, 'message_sent', { to: jid, text });
        return { id: sent?.key?.id };
    }
    // ── Background maintenance ────────────────────────────────────────────────
    isLive(schoolId) { return this.sessions.has(schoolId); }
    liveSchoolIds() { return [...this.sessions.keys()]; }
    /**
     * Restore previously-connected sessions on boot, and reconnect any that have
     * gone stale. Called by the heartbeat job.
     */
    async restoreAll() {
        try {
            const { ObjectId } = await Promise.resolve().then(() => __importStar(require('mongodb')));
            const meta = (0, mongodb_1.getMetaDb)();
            const tenants = await meta.collection('Tenant').find({ status: 'active' }).project({ _id: 1, subdomain: 1, databaseName: 1 }).toArray();
            for (const t of tenants) {
                const schoolId = t._id.toString();
                if (this.sessions.has(schoolId))
                    continue;
                const dbName = t.databaseName || (0, mongodb_1.subdomainToDbName)(t.subdomain || schoolId);
                const db = (0, mongodb_1.getTenantDb)(dbName);
                const stored = await db.collection(SESSIONS_COLL).findOne({ schoolId, status: 'connected' }).catch(() => null);
                const hasCreds = stored && await db.collection('whatsapp_auth').findOne({ _id: 'creds' }).catch(() => null);
                if (stored && hasCreds) {
                    this.connect(schoolId).catch(() => { });
                    (0, logger_1.logEvent)(schoolId, 'restore_on_boot');
                }
            }
            void ObjectId;
        }
        catch (e) {
            (0, logger_1.logEvent)('system', 'restore_error', { error: e.message });
        }
    }
    /** Heartbeat: reconnect connected-but-dropped sessions; clean expired QRs. */
    async heartbeat() {
        for (const [schoolId, s] of this.sessions) {
            if (s.status === 'qr' && s.qrExpiresAt && s.qrExpiresAt < new Date()) {
                s.qr = null;
                s.qrExpiresAt = null;
            }
            if (s.status === 'disconnected' && s.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                this.connect(schoolId).catch(() => { });
            }
        }
    }
}
exports.whatsAppManager = new WhatsAppSessionManager();
