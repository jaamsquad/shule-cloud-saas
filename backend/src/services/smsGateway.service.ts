/**
 * SMS gateway service.
 *
 * A school can send SMS one of two ways (per-tenant `sms_settings.provider`):
 *   - "api"    → a traditional bulk-SMS HTTP API (e.g. Africa's Talking)
 *   - "device" → an Android phone running our gateway app, sending via its SIM
 *
 * For the device provider we queue jobs in the tenant's `sms_jobs` collection
 * and push them to connected devices over Socket.IO (with polling as fallback).
 * Devices report back sent/delivered/failed status and a periodic heartbeat.
 *
 * Collections (per tenant):
 *   sms_devices  — paired Android devices (one row per phone)
 *   sms_jobs     — individual SMS messages with delivery status
 *   sms_settings — { provider, apiConfig, pacingMs, dailyLimit }
 */
import { Db } from 'mongodb';
import crypto from 'crypto';
import { notifyDevices } from './smsSocket';

export type SmsProvider = 'device' | 'api';

const room = (schoolId: string) => `sms:${schoolId}`;

export const newToken = () => crypto.randomBytes(24).toString('hex');

export const getSmsSettings = async (db: Db) => {
    const s = await db.collection('sms_settings').findOne({ _id: 'sms' as any }).catch(() => null);
    return {
        provider: (s?.provider as SmsProvider) || 'device',
        apiConfig: s?.apiConfig || {},          // { provider, apiKey, username, senderId, ... }
        pacingMs: s?.pacingMs ?? 2500,           // gap between messages on a device
        dailyLimit: s?.dailyLimit ?? 0,          // 0 = unlimited
        updatedAt: s?.updatedAt || null,
    };
};

export const saveSmsSettings = async (db: Db, patch: any) => {
    const allowed: any = {};
    for (const k of ['provider', 'apiConfig', 'pacingMs', 'dailyLimit']) if (patch[k] !== undefined) allowed[k] = patch[k];
    allowed.updatedAt = new Date();
    await db.collection('sms_settings').updateOne({ _id: 'sms' as any }, { $set: allowed }, { upsert: true });
    return getSmsSettings(db);
};

// Normalise a Kenyan number to 2547######## where possible.
export const normalizePhone = (raw: string): string => {
    let p = String(raw || '').replace(/[^\d+]/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    if (p.startsWith('0')) p = '254' + p.slice(1);
    if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
    return p;
};

/** Queue SMS jobs for a set of numbers and notify connected devices. */
export const queueSms = async (
    db: Db, schoolId: string,
    numbers: string[], message: string,
    opts: { scheduledAt?: Date | null; createdBy?: string; audience?: string } = {},
) => {
    const clean = Array.from(new Set(numbers.map(normalizePhone).filter(n => n.length >= 9)));
    if (clean.length === 0) return { queued: 0, jobIds: [] as string[] };

    const now = new Date();
    const docs = clean.map(phone => ({
        schoolId, phone, message,
        status: opts.scheduledAt && opts.scheduledAt > now ? 'scheduled' : 'queued',
        scheduledAt: opts.scheduledAt || null,
        deviceId: null as string | null,
        attempts: 0,
        audience: opts.audience || null,
        createdBy: opts.createdBy || null,
        createdAt: now, updatedAt: now,
    }));
    const r = await db.collection('sms_jobs').insertMany(docs);
    const jobIds = Object.values(r.insertedIds).map(String);

    // Push to the school's devices so they fetch immediately (real-time).
    if (!opts.scheduledAt || opts.scheduledAt <= now) {
        notifyDevices(schoolId, { count: clean.length });
    }
    return { queued: clean.length, jobIds };
};

/** Pull pending jobs for a device to send (claims them by setting deviceId). */
export const claimJobs = async (db: Db, schoolId: string, deviceId: string, limit = 20) => {
    const now = new Date();
    const jobs: any[] = [];
    for (let i = 0; i < limit; i++) {
        const job = await db.collection('sms_jobs').findOneAndUpdate(
            {
                schoolId, status: { $in: ['queued', 'scheduled'] },
                $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }],
                deviceId: null,
            },
            { $set: { status: 'sending', deviceId, updatedAt: now }, $inc: { attempts: 1 } },
            { returnDocument: 'after', sort: { createdAt: 1 } },
        );
        const value = (job as any)?.value ?? job;
        if (!value) break;
        jobs.push({ _id: String(value._id), phone: value.phone, message: value.message });
    }
    return jobs;
};

export const updateJobStatus = async (db: Db, jobId: string, status: string, error?: string) => {
    const { ObjectId } = await import('mongodb');
    let _id: any; try { _id = new ObjectId(jobId); } catch { _id = jobId; }
    const valid = ['sent', 'delivered', 'failed', 'cancelled', 'retrying', 'queued'];
    const set: any = { status: valid.includes(status) ? status : 'sent', updatedAt: new Date() };
    if (status === 'failed' && error) set.error = error;
    if (status === 'retrying') { set.status = 'queued'; set.deviceId = null; }
    await db.collection('sms_jobs').updateOne({ _id }, { $set: set });
};

export const deviceStats = async (db: Db, schoolId: string) => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const col = db.collection('sms_jobs');
    const [queued, sending, sentToday, delivered, failed, total] = await Promise.all([
        col.countDocuments({ schoolId, status: { $in: ['queued', 'scheduled'] } }),
        col.countDocuments({ schoolId, status: 'sending' }),
        col.countDocuments({ schoolId, status: { $in: ['sent', 'delivered'] }, updatedAt: { $gte: startOfDay } }),
        col.countDocuments({ schoolId, status: 'delivered' }),
        col.countDocuments({ schoolId, status: 'failed' }),
        col.countDocuments({ schoolId }),
    ]);
    return { queued, sending, sentToday, delivered, failed, total };
};

export { room as smsRoom };
