/**
 * Socket.IO namespace (/sms) for the Android SMS-gateway app.
 *
 * The app connects with handshake.auth = { token, subdomain } where `token` is
 * the device token issued at pairing. We resolve the school's DB, validate the
 * device, and join a per-school room so `sms:jobs` notifications reach only that
 * school's devices. The app then claims jobs over REST.
 */
import { Server as IOServer, Socket } from 'socket.io';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';

let smsNs: ReturnType<IOServer['of']> | null = null;

async function resolveDevice(token?: string, subdomain?: string) {
    if (!token || !subdomain) return null;
    try {
        const tenant = await getMetaDb().collection('Tenant').findOne({ subdomain: String(subdomain).toLowerCase() });
        if (!tenant) return null;
        const dbName = tenant.databaseName || subdomainToDbName(String(subdomain).toLowerCase());
        const db = getTenantDb(dbName);
        const device = await db.collection('sms_devices').findOne({ token, revoked: { $ne: true } });
        if (!device) return null;
        return { schoolId: tenant._id.toString(), deviceId: String(device._id), db };
    } catch { return null; }
}

export function attachSmsSocket(io: IOServer) {
    smsNs = io.of('/sms');
    smsNs.use(async (socket: Socket, next) => {
        const { token, subdomain } = socket.handshake.auth || {};
        const ctx = await resolveDevice(token, subdomain);
        if (!ctx) return next(new Error('Unauthorized device'));
        (socket.data as any).schoolId = ctx.schoolId;
        (socket.data as any).deviceId = ctx.deviceId;
        next();
    });

    smsNs.on('connection', (socket: Socket) => {
        const schoolId = (socket.data as any).schoolId;
        socket.join(`sms:${schoolId}`);
        // Tell the device it's live; it should immediately claim any pending jobs.
        socket.emit('sms:ready', { ok: true });
        socket.on('disconnect', () => { /* room auto-left */ });
    });
}

/** Notify a school's connected devices that new jobs are waiting. */
export function notifyDevices(schoolId: string, payload: any) {
    try { smsNs?.to(`sms:${schoolId}`).emit('sms:jobs', payload); } catch { /* noop */ }
}
