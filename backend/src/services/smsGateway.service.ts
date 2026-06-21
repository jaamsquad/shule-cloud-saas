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
    // Pull the SMS-API credentials from the Integrations page (Africa's Talking)
    // when the school hasn't set an explicit apiConfig on sms_settings.
    let apiConfig = s?.apiConfig || {};
    if (!apiConfig.apiKey) {
        const at = await db.collection('integration_settings').findOne({ integration: 'africas_talking' }).catch(() => null);
        if (at && (at.enabled || at.apiKey)) apiConfig = { apiKey: at.apiKey, username: at.username, senderId: at.senderId, environment: at.environment };
    }
    return {
        provider: (s?.provider as SmsProvider) || 'device',
        apiConfig,                                // { apiKey, username, senderId, ... }
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

// ─── Result-message builder (shared by SMS + WhatsApp results) ────────────────
const gradeFor = (score: number) => score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'E';
const studentPhone = (s: any) => s.parentPhone || s.fatherPhone || s.motherPhone || s.guardianPhone || s.phone;
const studentName = (s: any) => s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student';
const CBC_LABEL: Record<string, string> = { EE: 'Exceeding Expectation', ME: 'Meeting Expectation', AE: 'Approaching Expectation', BE: 'Below Expectation' };

/** Build personalised result messages (phone + text) for an exam/class-test/CBC source. */
export const buildResultMessages = async (
    db: Db, type: 'exam' | 'classTest' | 'cbc', id: string,
): Promise<{ phone: string; text: string }[]> => {
    const { ObjectId } = await import('mongodb');
    const oid = (s?: string) => { try { return s ? new ObjectId(s) : undefined; } catch { return undefined; } };
    const school = (await db.collection('settings').findOne({}).catch(() => null))?.schoolName || '';
    const students = await db.collection('students').find({}).toArray();
    const byId: Record<string, any> = {};
    students.forEach((s: any) => { byId[String(s._id)] = s; if (s.admNo) byId[s.admNo] = s; if (s.registrationNo) byId[s.registrationNo] = s; });
    const out: { phone: string; text: string }[] = [];
    const pre = school ? school + ': ' : '';

    if (type === 'exam') {
        const exam = await db.collection('exams').findOne({ _id: oid(id) });
        const marks = await db.collection('marks').find({ examId: id }).toArray();
        const byStudent: Record<string, any[]> = {};
        marks.forEach((m: any) => { (byStudent[m.studentId] ||= []).push(m); });
        for (const [sid, ms] of Object.entries(byStudent)) {
            const st = byId[sid]; if (!st) continue; const phone = studentPhone(st); if (!phone) continue;
            const total = ms.reduce((t, m) => t + Number(m.marks || m.score || 0), 0);
            const avg = ms.length ? Math.round(total / ms.length) : 0;
            const lines = ms.map(m => `${m.subjectName || 'Subj'}:${Number(m.marks || m.score || 0)}(${gradeFor(Number(m.marks || m.score || 0))})`).join(', ');
            out.push({ phone, text: `${pre}${studentName(st)} — ${exam?.name || 'Exam'} results. ${lines}. Mean: ${avg}% (${gradeFor(avg)}).` });
        }
    } else if (type === 'classTest') {
        const test = await db.collection('class_tests').findOne({ _id: oid(id) });
        const tmarks = await db.collection('test_marks').find({ test_id: oid(id) }).toArray();
        for (const m of tmarks) {
            const st = byId[String(m.student_id)] || byId[m.studentId]; if (!st) continue; const phone = studentPhone(st); if (!phone) continue;
            const score = Number(m.score ?? m.marks ?? 0);
            const display = test?.total_marks ? `${score}/${test.total_marks}` : `${score}`;
            out.push({ phone, text: `${pre}${studentName(st)} scored ${display} in ${test?.name || 'the class test'}${test?.subject_name ? ' (' + test.subject_name + ')' : ''}.` });
        }
    } else if (type === 'cbc') {
        const activity = await db.collection('cbc_activities').findOne({ _id: oid(id) });
        const assessments = await db.collection('cbc_assessments').find({ activityId: id, deletedAt: { $exists: false } }).toArray();
        for (const a of assessments) {
            const st = byId[a.studentId]; if (!st) continue; const phone = studentPhone(st); if (!phone) continue;
            out.push({ phone, text: `${pre}${studentName(st)} — ${activity?.learningArea || activity?.title || 'CBC'} assessment: ${a.level} (${CBC_LABEL[a.level] || ''}).` });
        }
    }
    return out;
};

export const listResultSources = async (db: Db) => {
    const [exams, tests, cbc] = await Promise.all([
        db.collection('exams').find({}).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []),
        db.collection('class_tests').find({}).sort({ date: -1 }).limit(100).toArray().catch(() => []),
        db.collection('cbc_activities').find({ deletedAt: { $exists: false } }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []),
    ]);
    return {
        exams: exams.map((e: any) => ({ id: String(e._id), name: e.name || e.examName || 'Exam', term: e.term, year: e.year })),
        classTests: tests.map((t: any) => ({ id: String(t._id), name: t.name || t.title || 'Class Test', subject: t.subject_name || t.subjectName, total: t.total_marks })),
        cbcActivities: cbc.map((a: any) => ({ id: String(a._id), name: a.title || a.name || a.learningArea || 'CBC Activity', learningArea: a.learningArea, strand: a.strand })),
    };
};
