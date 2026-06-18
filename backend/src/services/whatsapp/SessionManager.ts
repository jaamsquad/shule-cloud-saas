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
import { EventEmitter } from 'events';
import { Db } from 'mongodb';
import baileys from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../../lib/mongodb';
import { useMongoAuthState, MongoAuthState } from './mongoAuthStore';
import { logEvent } from './logger';

const makeWASocket = (baileys as any).default;
const { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = baileys as any;

const QR_TTL_MS = 20_000;             // WhatsApp QR validity window (~20s)
const MAX_RECONNECT_ATTEMPTS = 5;
const SESSIONS_COLL = 'whatsapp_sessions';

export type SessionStatus =
    | 'disconnected' | 'qr' | 'connecting' | 'authenticated'
    | 'connected' | 'reconnecting' | 'logged_out';

export interface SessionMeta {
    schoolId: string;
    status: SessionStatus;
    sessionId: string;
    phoneNumber: string | null;
    profileName: string | null;
    qr: string | null;            // current QR string (raw), null when connected/expired
    qrExpiresAt: Date | null;
    connectedAt: Date | null;
    lastSeen: Date | null;
    updatedAt: Date;
}

interface LiveSession {
    schoolId: string;
    subdomain: string;
    db: Db;
    sock: any;
    auth: MongoAuthState;
    status: SessionStatus;
    qr: string | null;
    qrExpiresAt: Date | null;
    qrTimer?: NodeJS.Timeout;
    reconnectAttempts: number;
    connecting: boolean;
    phoneNumber: string | null;
    profileName: string | null;
    connectedAt: Date | null;
    lastSeen?: Date | null;
}

class WhatsAppSessionManager extends EventEmitter {
    private sessions = new Map<string, LiveSession>();

    /** Resolve a school's tenant DB + subdomain from the meta registry. */
    private async resolveTenant(schoolId: string): Promise<{ db: Db; subdomain: string } | null> {
        try {
            const { ObjectId } = await import('mongodb');
            const meta = getMetaDb();
            const t = await meta.collection('Tenant').findOne({ _id: new ObjectId(schoolId) });
            if (!t) return null;
            const dbName = t.databaseName || subdomainToDbName(t.subdomain || schoolId);
            return { db: getTenantDb(dbName), subdomain: String(t.subdomain || schoolId) };
        } catch { return null; }
    }

    private metaDoc(s: LiveSession): SessionMeta {
        return {
            schoolId: s.schoolId, status: s.status, sessionId: s.schoolId,
            phoneNumber: s.phoneNumber, profileName: s.profileName,
            qr: s.qr, qrExpiresAt: s.qrExpiresAt, connectedAt: s.connectedAt,
            lastSeen: new Date(), updatedAt: new Date(),
        };
    }

    /** Persist the latest session metadata to the tenant DB. */
    private async persist(s: LiveSession) {
        try {
            await s.db.collection(SESSIONS_COLL).updateOne(
                { schoolId: s.schoolId },
                {
                    $set: {
                        schoolId: s.schoolId, status: s.status, sessionId: s.schoolId,
                        phoneNumber: s.phoneNumber, profileName: s.profileName,
                        qrExpiresAt: s.qrExpiresAt, connectedAt: s.connectedAt,
                        lastSeen: new Date(), updatedAt: new Date(),
                    },
                    $setOnInsert: { createdAt: new Date() },
                },
                { upsert: true },
            );
        } catch { /* metadata best-effort */ }
    }

    private setStatus(s: LiveSession, status: SessionStatus) {
        s.status = status;
        this.persist(s);
    }

    private emitTo(schoolId: string, event: string, payload?: any) {
        this.emit(`${schoolId}:${event}`, payload);
        this.emit(event, { schoolId, ...payload });   // global listeners (admin overview)
    }

    /** Public status for the REST layer (live session or last-known DB metadata). */
    async getStatus(schoolId: string): Promise<SessionMeta> {
        const live = this.sessions.get(schoolId);
        if (live) return this.metaDoc(live);
        const tenant = await this.resolveTenant(schoolId);
        const stored = tenant && await tenant.db.collection(SESSIONS_COLL).findOne({ schoolId });
        return {
            schoolId, status: (stored?.status as SessionStatus) || 'disconnected', sessionId: schoolId,
            phoneNumber: stored?.phoneNumber ?? null, profileName: stored?.profileName ?? null,
            qr: null, qrExpiresAt: stored?.qrExpiresAt ?? null,
            connectedAt: stored?.connectedAt ?? null, lastSeen: stored?.lastSeen ?? null,
            updatedAt: stored?.updatedAt ?? new Date(),
        };
    }

    /** Returns the current QR for a school, creating the session if needed. */
    async getQR(schoolId: string): Promise<{ qr: string | null; expiresAt: Date | null; status: SessionStatus }> {
        const live = this.sessions.get(schoolId);
        if (live?.status === 'connected') return { qr: null, expiresAt: null, status: 'connected' };
        if (live?.qr && live.qrExpiresAt && live.qrExpiresAt > new Date()) {
            return { qr: live.qr, expiresAt: live.qrExpiresAt, status: live.status };
        }
        await this.connect(schoolId);
        // Wait briefly for the first QR (or connection) to arrive.
        const cur = this.sessions.get(schoolId);
        if (cur?.qr) return { qr: cur.qr, expiresAt: cur.qrExpiresAt, status: cur.status };
        const qr = await this.waitForQR(schoolId, 12_000);
        const after = this.sessions.get(schoolId);
        return { qr, expiresAt: after?.qrExpiresAt ?? null, status: after?.status ?? 'connecting' };
    }

    private waitForQR(schoolId: string, timeoutMs: number): Promise<string | null> {
        return new Promise((resolve) => {
            const onQr = (p: any) => { cleanup(); resolve(p?.qr ?? null); };
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
    async connect(schoolId: string): Promise<SessionMeta> {
        const existing = this.sessions.get(schoolId);
        if (existing && (existing.connecting || existing.status === 'connected')) {
            return this.metaDoc(existing);
        }

        const tenant = await this.resolveTenant(schoolId);
        if (!tenant) throw new Error('School not found');

        const auth = await useMongoAuthState(tenant.db);
        const { version } = await fetchLatestBaileysVersion();

        const session: LiveSession = existing || {
            schoolId, subdomain: tenant.subdomain, db: tenant.db,
            sock: null, auth, status: 'connecting', qr: null, qrExpiresAt: null,
            reconnectAttempts: 0, connecting: false, phoneNumber: null,
            profileName: null, connectedAt: null,
        };
        session.db = tenant.db; session.auth = auth; session.connecting = true;
        this.sessions.set(schoolId, session);
        this.setStatus(session, 'connecting');

        const sock = makeWASocket({
            version,
            auth: {
                creds: auth.state.creds,
                keys: makeCacheableSignalKeyStore(auth.state.keys, console as any),
            },
            printQRInTerminal: false,
            browser: ['ShuleCloud', 'Chrome', '1.0.0'],
            markOnlineOnConnect: false,
            syncFullHistory: false,
        });
        session.sock = sock;

        sock.ev.on('creds.update', auth.saveCreds);
        sock.ev.on('connection.update', (u: any) => this.onConnectionUpdate(schoolId, u));
        sock.ev.on('messages.upsert', (m: any) => {
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

        logEvent(schoolId, 'connect_initiated', { subdomain: tenant.subdomain });
        return this.metaDoc(session);
    }

    private async onConnectionUpdate(schoolId: string, update: any) {
        const s = this.sessions.get(schoolId);
        if (!s) return;
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            s.qr = qr;
            s.qrExpiresAt = new Date(Date.now() + QR_TTL_MS);
            this.setStatus(s, 'qr');
            if (s.qrTimer) clearTimeout(s.qrTimer);
            // When the QR lapses, mark it expired so the UI can request a fresh one.
            s.qrTimer = setTimeout(() => {
                const cur = this.sessions.get(schoolId);
                if (cur && cur.status === 'qr') {
                    cur.qr = null; cur.qrExpiresAt = null;
                    this.emitTo(schoolId, 'session_expired', {});
                }
            }, QR_TTL_MS);
            this.emitTo(schoolId, 'qr', { qr, expiresAt: s.qrExpiresAt });
            logEvent(schoolId, 'qr_generated');
        }

        if (connection === 'connecting') {
            this.setStatus(s, s.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
            if (s.reconnectAttempts > 0) this.emitTo(schoolId, 'reconnecting', {});
        }

        if (connection === 'open') {
            s.connecting = false;
            s.reconnectAttempts = 0;
            s.qr = null; s.qrExpiresAt = null;
            if (s.qrTimer) clearTimeout(s.qrTimer);
            const me = s.sock?.user;
            s.phoneNumber = me?.id ? String(me.id).split(':')[0].split('@')[0] : null;
            s.profileName = me?.name || me?.verifiedName || null;
            s.connectedAt = new Date();
            this.setStatus(s, 'connected');
            this.emitTo(schoolId, 'authenticated', {});
            this.emitTo(schoolId, 'connected', { phoneNumber: s.phoneNumber, profileName: s.profileName, connectedAt: s.connectedAt });
            logEvent(schoolId, 'connected', { phoneNumber: s.phoneNumber });
        }

        if (connection === 'close') {
            s.connecting = false;
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const loggedOut = statusCode === DisconnectReason.loggedOut;

            if (loggedOut) {
                // The phone unlinked this device — wipe creds, require a fresh scan.
                this.setStatus(s, 'logged_out');
                await s.auth.clear().catch(() => {});
                this.emitTo(schoolId, 'logout', { reason: 'logged_out' });
                logEvent(schoolId, 'logout', { reason: 'phone_unlinked' });
                this.sessions.delete(schoolId);
                return;
            }

            // Transient drop — retry with backoff up to the cap.
            if (s.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                s.reconnectAttempts += 1;
                this.setStatus(s, 'reconnecting');
                this.emitTo(schoolId, 'reconnecting', { attempt: s.reconnectAttempts });
                logEvent(schoolId, 'reconnecting', { attempt: s.reconnectAttempts, statusCode });
                const delay = Math.min(2000 * s.reconnectAttempts, 15000);
                setTimeout(() => this.connect(schoolId).catch(() => {}), delay);
            } else {
                this.setStatus(s, 'disconnected');
                this.emitTo(schoolId, 'disconnected', { reason: 'max_retries', statusCode });
                logEvent(schoolId, 'disconnected', { reason: 'max_retries' });
            }
        }
    }

    /** Log out the device (clears creds) but keep the session record. */
    async disconnect(schoolId: string): Promise<void> {
        const s = this.sessions.get(schoolId);
        if (s?.sock) { try { await s.sock.logout(); } catch { /* may already be gone */ } }
        if (s) {
            await s.auth.clear().catch(() => {});
            if (s.qrTimer) clearTimeout(s.qrTimer);
            this.setStatus(s, 'logged_out');
            s.phoneNumber = null; s.profileName = null; s.connectedAt = null;
            this.emitTo(schoolId, 'logout', { reason: 'manual' });
            this.sessions.delete(schoolId);
        } else {
            const tenant = await this.resolveTenant(schoolId);
            if (tenant) {
                await tenant.db.collection('whatsapp_auth').deleteMany({}).catch(() => {});
                await tenant.db.collection(SESSIONS_COLL).updateOne(
                    { schoolId }, { $set: { status: 'logged_out', phoneNumber: null, profileName: null, connectedAt: null, updatedAt: new Date() } },
                ).catch(() => {});
            }
        }
        logEvent(schoolId, 'disconnect');
    }

    /** Fully delete a session: end socket, wipe creds AND the metadata record. */
    async deleteSession(schoolId: string): Promise<void> {
        const s = this.sessions.get(schoolId);
        if (s?.sock) { try { s.sock.end(undefined); } catch {} }
        if (s?.qrTimer) clearTimeout(s.qrTimer);
        this.sessions.delete(schoolId);
        const tenant = await this.resolveTenant(schoolId);
        if (tenant) {
            await tenant.db.collection('whatsapp_auth').deleteMany({}).catch(() => {});
            await tenant.db.collection(SESSIONS_COLL).deleteMany({ schoolId }).catch(() => {});
        }
        this.emitTo(schoolId, 'disconnected', { reason: 'deleted' });
        logEvent(schoolId, 'session_deleted');
    }

    /** Rich profile info for the "Connected as" card. */
    async getInfo(schoolId: string): Promise<any> {
        const status = await this.getStatus(schoolId);
        const s = this.sessions.get(schoolId);
        let profilePicUrl: string | null = null;
        if (s?.sock && status.status === 'connected' && s.sock.user?.id) {
            try { profilePicUrl = await s.sock.profilePictureUrl(s.sock.user.id, 'image'); } catch { /* none */ }
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
    async sendText(schoolId: string, toPhone: string, text: string): Promise<{ id?: string }> {
        const s = this.sessions.get(schoolId);
        if (!s || s.status !== 'connected' || !s.sock) throw new Error('WhatsApp is not connected for this school');
        const jid = toPhone.includes('@') ? toPhone : `${toPhone.replace(/[^\d]/g, '')}@s.whatsapp.net`;
        const sent = await s.sock.sendMessage(jid, { text });
        this.emitTo(schoolId, 'message_sent', { to: jid, text });
        return { id: sent?.key?.id };
    }

    // ── Background maintenance ────────────────────────────────────────────────
    isLive(schoolId: string): boolean { return this.sessions.has(schoolId); }
    liveSchoolIds(): string[] { return [...this.sessions.keys()]; }

    /**
     * Restore previously-connected sessions on boot, and reconnect any that have
     * gone stale. Called by the heartbeat job.
     */
    async restoreAll(): Promise<void> {
        try {
            const { ObjectId } = await import('mongodb');
            const meta = getMetaDb();
            const tenants = await meta.collection('Tenant').find({ status: 'active' }).project({ _id: 1, subdomain: 1, databaseName: 1 }).toArray();
            for (const t of tenants) {
                const schoolId = t._id.toString();
                if (this.sessions.has(schoolId)) continue;
                const dbName = t.databaseName || subdomainToDbName(t.subdomain || schoolId);
                const db = getTenantDb(dbName);
                const stored = await db.collection(SESSIONS_COLL).findOne({ schoolId, status: 'connected' }).catch(() => null);
                const hasCreds = stored && await db.collection('whatsapp_auth').findOne({ _id: 'creds' as any }).catch(() => null);
                if (stored && hasCreds) {
                    this.connect(schoolId).catch(() => {});
                    logEvent(schoolId, 'restore_on_boot');
                }
            }
            void ObjectId;
        } catch (e: any) { logEvent('system', 'restore_error', { error: e.message }); }
    }

    /** Heartbeat: reconnect connected-but-dropped sessions; clean expired QRs. */
    async heartbeat(): Promise<void> {
        for (const [schoolId, s] of this.sessions) {
            if (s.status === 'qr' && s.qrExpiresAt && s.qrExpiresAt < new Date()) {
                s.qr = null; s.qrExpiresAt = null;
            }
            if (s.status === 'disconnected' && s.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                this.connect(schoolId).catch(() => {});
            }
        }
    }
}

export const whatsAppManager = new WhatsAppSessionManager();
