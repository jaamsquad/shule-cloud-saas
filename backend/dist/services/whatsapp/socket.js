"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachWhatsAppSocket = attachWhatsAppSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongodb_1 = require("../../lib/mongodb");
const SessionManager_1 = require("./SessionManager");
const logger_1 = require("./logger");
const RELAYED = [
    'qr', 'connected', 'disconnected', 'reconnecting', 'authenticated',
    'logout', 'session_expired', 'message_received', 'message_sent',
];
let io = null;
async function resolveSchoolId(token, subdomain) {
    // Prefer the JWT (carries tenantId) — authoritative.
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            if (decoded?.tenantId)
                return { schoolId: String(decoded.tenantId), role: decoded.role || 'user' };
        }
        catch { /* fall through to subdomain */ }
    }
    // Owner/super-admin overview uses the owner token + an explicit subdomain.
    if (token) {
        try {
            const owner = jsonwebtoken_1.default.verify(token, process.env.OWNER_JWT_SECRET || 'owner_secret');
            if (owner && subdomain) {
                const t = await (0, mongodb_1.getMetaDb)().collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
                if (t)
                    return { schoolId: t._id.toString(), role: `owner:${owner.role || 'owner'}` };
            }
        }
        catch { /* not an owner token */ }
    }
    return null;
}
function attachWhatsAppSocket(server) {
    io = new socket_io_1.Server(server, {
        path: '/socket.io',
        cors: {
            origin: (origin, cb) => cb(null, true), // CORS already gated at the HTTP layer
            credentials: true,
        },
    });
    const ns = io.of('/whatsapp');
    ns.use(async (socket, next) => {
        const { token, subdomain } = socket.handshake.auth || {};
        const ctx = await resolveSchoolId(token, subdomain);
        if (!ctx)
            return next(new Error('Unauthorized'));
        socket.data.schoolId = ctx.schoolId;
        socket.data.role = ctx.role;
        next();
    });
    ns.on('connection', (socket) => {
        const schoolId = socket.data.schoolId;
        const room = `school:${schoolId}`;
        socket.join(room);
        (0, logger_1.logEvent)(schoolId, 'socket_connected', { sid: socket.id });
        // Per-school relay: forward manager events into this school's room only.
        const handlers = {};
        for (const ev of RELAYED) {
            const handler = (payload) => ns.to(room).emit(ev, payload || {});
            handlers[ev] = handler;
            SessionManager_1.whatsAppManager.on(`${schoolId}:${ev}`, handler);
        }
        // Allow the client to ask for a fresh QR over the socket too.
        socket.on('request_qr', async () => {
            try {
                await SessionManager_1.whatsAppManager.getQR(schoolId);
            }
            catch { /* surfaced via REST */ }
        });
        socket.on('disconnect', () => {
            for (const ev of RELAYED)
                SessionManager_1.whatsAppManager.off(`${schoolId}:${ev}`, handlers[ev]);
            (0, logger_1.logEvent)(schoolId, 'socket_disconnected', { sid: socket.id });
        });
    });
    (0, logger_1.logEvent)('system', 'socket_namespace_ready', { namespace: '/whatsapp' });
    return io;
}
function getIO() { return io; }
