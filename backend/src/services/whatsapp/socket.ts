/**
 * Socket.IO bridge for live WhatsApp session updates.
 *
 * Namespace: /whatsapp
 *   Auth: the browser passes its tenant JWT (handshake.auth.token) + subdomain.
 *   We verify the token, resolve the school, and join a room scoped to that
 *   school's id — so a school only ever receives ITS OWN session events.
 *
 * Relayed events: qr, connected, disconnected, reconnecting, authenticated,
 * logout, session_expired, message_received, message_sent.
 */
import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getMetaDb } from '../../lib/mongodb';
import { whatsAppManager } from './SessionManager';
import { logEvent } from './logger';

const RELAYED = [
    'qr', 'connected', 'disconnected', 'reconnecting', 'authenticated',
    'logout', 'session_expired', 'message_received', 'message_sent',
] as const;

let io: IOServer | null = null;

async function resolveSchoolId(token?: string, subdomain?: string): Promise<{ schoolId: string; role: string } | null> {
    // Prefer the JWT (carries tenantId) — authoritative.
    if (token) {
        try {
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            if (decoded?.tenantId) return { schoolId: String(decoded.tenantId), role: decoded.role || 'user' };
        } catch { /* fall through to subdomain */ }
    }
    // Owner/super-admin overview uses the owner token. With subdomain 'platform'
    // (or none) the owner watches the platform session; with a school subdomain
    // they watch that school's session.
    if (token) {
        try {
            const owner: any = jwt.verify(token, process.env.OWNER_JWT_SECRET || 'owner_secret');
            if (owner) {
                if (!subdomain || subdomain.toLowerCase() === 'platform') {
                    return { schoolId: 'platform', role: `owner:${owner.role || 'owner'}` };
                }
                const t = await getMetaDb().collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
                if (t) return { schoolId: t._id.toString(), role: `owner:${owner.role || 'owner'}` };
            }
        } catch { /* not an owner token */ }
    }
    return null;
}

export function attachWhatsAppSocket(server: HttpServer): IOServer {
    io = new IOServer(server, {
        path: '/socket.io',
        cors: {
            origin: (origin, cb) => cb(null, true),   // CORS already gated at the HTTP layer
            credentials: true,
        },
    });

    const ns = io.of('/whatsapp');

    ns.use(async (socket: Socket, next) => {
        const { token, subdomain } = socket.handshake.auth || {};
        const ctx = await resolveSchoolId(token, subdomain);
        if (!ctx) return next(new Error('Unauthorized'));
        (socket.data as any).schoolId = ctx.schoolId;
        (socket.data as any).role = ctx.role;
        next();
    });

    ns.on('connection', (socket: Socket) => {
        const schoolId: string = (socket.data as any).schoolId;
        const room = `school:${schoolId}`;
        socket.join(room);
        logEvent(schoolId, 'socket_connected', { sid: socket.id });

        // Per-school relay: forward manager events into this school's room only.
        const handlers: Record<string, (p: any) => void> = {};
        for (const ev of RELAYED) {
            const handler = (payload: any) => ns.to(room).emit(ev, payload || {});
            handlers[ev] = handler;
            whatsAppManager.on(`${schoolId}:${ev}`, handler);
        }

        // Allow the client to ask for a fresh QR over the socket too.
        socket.on('request_qr', async () => {
            try { await whatsAppManager.getQR(schoolId); } catch { /* surfaced via REST */ }
        });

        socket.on('disconnect', () => {
            for (const ev of RELAYED) whatsAppManager.off(`${schoolId}:${ev}`, handlers[ev]);
            logEvent(schoolId, 'socket_disconnected', { sid: socket.id });
        });
    });

    logEvent('system', 'socket_namespace_ready', { namespace: '/whatsapp' });
    return io;
}

export function getIO(): IOServer | null { return io; }
