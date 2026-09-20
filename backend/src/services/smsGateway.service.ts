/**
 * SMS gateway service.
 *
 * A school can send SMS through any of these, tried in the order of its `priority`
 * (Integrations page for the APIs, Communications → Devices for phones):
 *   - Africa's Talking  (HTTP API — services/africasTalking.service.ts)
 *   - Talksasa          (HTTP API — services/talksasa.service.ts)
 *   - an Android phone running our gateway app, sending via its SIM
 *
 * For the device provider we queue jobs in the tenant's `sms_jobs` collection
 * and push them to connected devices over Socket.IO (with polling as fallback).
 * Devices report back sent/delivered/failed status and a periodic heartbeat.
 *
 * Collections (per tenant):
 *   sms_devices  — paired Android devices (one row per phone)
 *   sms_jobs     — individual SMS messages with delivery status
 *   sms_settings — { priority, deviceEnabled, pacingMs, dailyLimit }
 */
import { Db, ObjectId } from 'mongodb';
import crypto from 'crypto';
import { notifyDevices } from './smsSocket';
import { atSendSms, AtConfig } from './africasTalking.service';

// 'api' = any HTTP gateway (Africa's Talking, Talksasa); 'device' = a paired Android phone.
export type SmsProvider = 'device' | 'api';

// The gateways a school can send through. Each is switched on in its own place
// (Integrations page for the two APIs, Communications → Devices for phones) and the
// order they are tried in is the school's `priority`.
export type SmsProviderKey = 'africas_talking' | 'talksasa' | 'device';
export const SMS_PROVIDER_NAMES: Record<SmsProviderKey, string> = { africas_talking: "Africa's Talking", talksasa: 'Talksasa', device: 'Android phone (SIM)' };
const DEFAULT_ORDER: SmsProviderKey[] = ['africas_talking', 'talksasa', 'device'];

const room = (schoolId: string) => `sms:${schoolId}`;

export const newToken = () => crypto.randomBytes(24).toString('hex');

export const normalizePriority = (raw: any): SmsProviderKey[] => {
    const wanted: SmsProviderKey[] = Array.isArray(raw) ? raw.filter((k: any) => DEFAULT_ORDER.includes(k)) : [];
    return Array.from(new Set([...wanted, ...DEFAULT_ORDER]));   // whatever wasn't ranked goes after, in the default order
};

export interface ProviderState {
    key: SmsProviderKey; name: string;
    configured: boolean;   // has credentials / a paired phone
    enabled: boolean;      // switched on by the admin
    ready: boolean;        // configured && enabled → will be used
    config?: any;          // credentials (server side only)
}

/** Which gateways are set up + switched on, and the order the school wants them tried. */
export const getProviderStates = async (db: Db) => {
    const [s, ts, at, pairedDevices]: any[] = await Promise.all([
        db.collection('sms_settings').findOne({ _id: 'sms' as any }).catch(() => null),
        db.collection('integration_settings').findOne({ integration: 'talksasa' }).catch(() => null),
        db.collection('integration_settings').findOne({ integration: 'africas_talking' }).catch(() => null),
        db.collection('sms_devices').countDocuments({ paired: true, revoked: { $ne: true } }).catch(() => 0),
    ]);
    const legacy = s?.apiConfig || {};   // older setups kept the API credentials on sms_settings

    // Africa's Talking — only used when the admin has switched it ON (a saved key alone doesn't count).
    const atFrom = at?.apiKey ? at : (legacy.apiKey && legacy.username ? legacy : null);
    const atCfg: AtConfig | null = atFrom ? { username: String(atFrom.username || '').trim(), apiKey: String(atFrom.apiKey || '').trim(), senderId: atFrom.senderId, environment: atFrom.environment } : null;
    const atConfigured = !!(atCfg?.apiKey && (atCfg.username || /sandbox/i.test(atCfg.environment || '')));
    const atEnabled = at?.apiKey ? at.enabled === true : !!atCfg;

    // Talksasa — on unless explicitly switched off (how it has always behaved).
    const tsFrom = ts?.apiToken ? ts : (legacy.apiToken ? legacy : null);
    const tsCfg = tsFrom ? { apiToken: String(tsFrom.apiToken).trim(), senderId: tsFrom.senderId } : null;
    const tsEnabled = ts?.apiToken ? ts.enabled !== false : !!tsCfg;

    const deviceEnabled = s?.deviceEnabled !== false;

    const states: Record<SmsProviderKey, ProviderState> = {
        africas_talking: { key: 'africas_talking', name: SMS_PROVIDER_NAMES.africas_talking, configured: atConfigured, enabled: atEnabled, ready: atConfigured && atEnabled, config: atCfg },
        talksasa: { key: 'talksasa', name: SMS_PROVIDER_NAMES.talksasa, configured: !!tsCfg, enabled: tsEnabled, ready: !!tsCfg && tsEnabled, config: tsCfg },
        device: { key: 'device', name: SMS_PROVIDER_NAMES.device, configured: pairedDevices > 0, enabled: deviceEnabled, ready: pairedDevices > 0 && deviceEnabled },
    };
    const priority = normalizePriority(s?.priority);
    const order = priority.filter(k => states[k].ready);   // the gateways that will actually be tried, in order
    return { states, priority, order, settings: s };
};

export const getSmsSettings = async (db: Db) => {
    const { states, order, priority, settings: s } = await getProviderStates(db);
    // Shape kept for existing callers: `provider` is 'device' or 'api'; `apiConfig` is the first ready API gateway.
    const firstApi = order.find(k => k !== 'device') as SmsProviderKey | undefined;
    const apiConfig = firstApi === 'africas_talking' ? { vendor: 'africas_talking', ...states.africas_talking.config }
        : firstApi === 'talksasa' ? { vendor: 'talksasa', ...states.talksasa.config } : {};
    return {
        provider: (order[0] ? (order[0] === 'device' ? 'device' : 'api') : ((s?.provider as SmsProvider) || 'device')) as SmsProvider,
        apiConfig,
        priority, order,
        pacingMs: s?.pacingMs ?? 2500,           // gap between messages on a device
        dailyLimit: s?.dailyLimit ?? 0,          // 0 = unlimited
        updatedAt: s?.updatedAt || null,
    };
};

export const saveSmsSettings = async (db: Db, patch: any) => {
    const allowed: any = {};
    for (const k of ['apiConfig', 'pacingMs', 'dailyLimit', 'deviceEnabled']) if (patch[k] !== undefined) allowed[k] = patch[k];
    if (patch.priority !== undefined) allowed.priority = normalizePriority(patch.priority);
    if (patch.provider !== undefined) {
        // The "Mobile App Gateway / API Gateway" switch on the Devices page: it just reorders the priority.
        const cur = (await getProviderStates(db)).priority;
        allowed.provider = patch.provider;
        allowed.priority = patch.provider === 'device' ? ['device', ...cur.filter(k => k !== 'device')] : [...cur.filter(k => k !== 'device'), 'device'];
        allowed.deviceEnabled = true;
    }
    allowed.updatedAt = new Date();
    await db.collection('sms_settings').updateOne({ _id: 'sms' as any }, { $set: allowed }, { upsert: true });
    return getSmsSettings(db);
};

/**
 * Digits only, international, no "+": 0712345678 / 712345678 / +254 712 345 678 / 00254712345678
 * → 254712345678. Numbers already in international form (any country) are left alone.
 */
export const normalizePhone = (raw: string, countryCode = '254'): string => {
    let p = String(raw || '').replace(/[^\d]/g, '');
    if (p.startsWith('00')) p = p.slice(2);
    else if (p.startsWith('0')) p = countryCode + p.slice(1);
    else if (p.length === 9 && /^[71]/.test(p)) p = countryCode + p;
    return p;
};
// A number Africa's Talking can be given ("+254712345678"), or null when it can't be a real number.
const toE164 = (phone: string): string | null => (/^\d{10,15}$/.test(phone) ? `+${phone}` : null);

// Resolve the school's display name for SMS branding: prefer the Tenant record
// in the meta DB (by schoolId), then the tenant-DB profile. Cached per call.
const resolveSchoolName = async (db: Db, schoolId: string): Promise<string> => {
    try {
        if (schoolId) {
            const { getMetaDb } = await import('../lib/mongodb');
            let oid: any = null; try { oid = new ObjectId(String(schoolId)); } catch { /* not an oid */ }
            if (oid) {
                const t: any = await getMetaDb().collection('Tenant').findOne({ _id: oid });
                if (t?.instituteName || t?.name) return t.instituteName || t.name;
            }
        }
    } catch { /* ignore */ }
    try {
        const p: any = await db.collection('school_profile').findOne({}) || await db.collection('tenant_profile').findOne({});
        return p?.name || p?.schoolName || '';
    } catch { return ''; }
};

// ─── Sending ─────────────────────────────────────────────────────────────────
type DueJob = { _id: any; phone: string; message: string };
interface DispatchSummary { sent: number; failed: number; provider: SmsProviderKey | null; error?: string; results: { phone: string; ok: boolean; status?: string; messageId?: string; cost?: string; error?: string }[]; notes: string[] }

const markJobs = (db: Db, jobs: DueJob[], set: any) =>
    jobs.length ? db.collection('sms_jobs').updateMany({ _id: { $in: jobs.map(j => j._id) } }, { $set: { ...set, updatedAt: new Date() }, $inc: { attempts: 1 } }) : Promise.resolve();

// Send through Africa's Talking and record every recipient's own outcome on its job.
// Returns the jobs this gateway could not take (so the next gateway in line can try them).
async function sendViaAfricasTalking(db: Db, cfg: AtConfig, jobs: DueJob[], message: string, sum: DispatchSummary): Promise<DueJob[]> {
    const withNumber = jobs.map(j => ({ job: j, number: toE164(j.phone) }));
    const bad = withNumber.filter(x => !x.number).map(x => x.job);
    if (bad.length) {   // never send garbage to the gateway
        await markJobs(db, bad, { status: 'failed', provider: 'africas_talking', error: 'Invalid phone number' });
        bad.forEach(j => sum.results.push({ phone: j.phone, ok: false, status: 'InvalidPhoneNumber', error: 'Invalid phone number' })); sum.failed += bad.length;
    }
    const good = withNumber.filter(x => x.number) as { job: DueJob; number: string }[];
    if (!good.length) return [];

    const res = await atSendSms(cfg, good.map(x => x.number), message);
    const byNumber = new Map(res.recipients.map(r => [r.number, r]));
    if (res.senderIdDropped) sum.notes.push(`Sender ID "${cfg.senderId}" is not registered with Africa's Talking, so messages went from its default sender. Register the sender ID on your Africa's Talking account, or clear it here.`);

    const ops: any[] = []; const retry: DueJob[] = [];
    for (const { job, number } of good) {
        const r = byNumber.get(number);
        if (r?.ok) {
            sum.sent++; sum.results.push({ phone: job.phone, ok: true, status: r.status, messageId: r.messageId, cost: r.cost });
            ops.push({ updateOne: { filter: { _id: job._id }, update: { $set: { status: 'sent', provider: 'africas_talking', messageId: r.messageId || null, statusCode: r.statusCode, cost: r.cost || null, error: null, updatedAt: new Date() }, $inc: { attempts: 1 } } } });
        } else if (r) {
            if (r.policy === 'provider' || r.policy === 'sender') { retry.push(job); sum.error = r.error; continue; }   // gateway-level problem → next gateway
            sum.failed++; sum.error = sum.error || r.error; sum.results.push({ phone: job.phone, ok: false, status: r.status, error: r.error });
            ops.push({ updateOne: { filter: { _id: job._id }, update: { $set: { status: 'failed', provider: 'africas_talking', statusCode: r.statusCode, error: r.error || 'Not sent', updatedAt: new Date() }, $inc: { attempts: 1 } } } });
        } else {
            // Not in any reply: the request itself failed (bad key, gateway down, no network, timeout).
            const e = res.requestError;
            if (e && !e.provider) {   // unknown whether it left — record, never resend
                sum.failed++; sum.error = e.message; sum.results.push({ phone: job.phone, ok: false, error: e.message });
                ops.push({ updateOne: { filter: { _id: job._id }, update: { $set: { status: 'failed', provider: 'africas_talking', error: e.message, updatedAt: new Date() }, $inc: { attempts: 1 } } } });
            } else { retry.push(job); sum.error = e?.message || 'Africa\'s Talking did not accept the message'; }
        }
    }
    if (ops.length) await db.collection('sms_jobs').bulkWrite(ops);
    return retry;
}

async function sendViaTalksasa(db: Db, cfg: { apiToken: string; senderId?: string }, jobs: DueJob[], message: string, sum: DispatchSummary): Promise<DueJob[]> {
    const { talksasaSend } = await import('./talksasa.service');
    const r = await talksasaSend(cfg, jobs.map(j => j.phone), message);
    if (r.ok) {
        await markJobs(db, jobs, { status: 'sent', provider: 'talksasa', error: null });
        sum.sent += jobs.length; jobs.forEach(j => sum.results.push({ phone: j.phone, ok: true }));
        return [];
    }
    sum.error = r.error || 'Talksasa did not accept the message';
    return jobs;
}

/**
 * Send jobs that are due, through the school's gateways in priority order. A gateway that
 * can't take a message (no credit, unreachable, bad key…) hands it to the next one; a
 * message that is simply bad (invalid number, opted out) is failed and not tried again.
 * Phones are left `queued` for the Android app to collect.
 */
export const dispatchJobs = async (db: Db, schoolId: string, jobs: DueJob[]): Promise<DispatchSummary> => {
    const sum: DispatchSummary = { sent: 0, failed: 0, provider: null, results: [], notes: [] };
    if (!jobs.length) return sum;
    const { states, order } = await getProviderStates(db);

    if (!order.length) {
        const error = 'No SMS provider is switched on. Enable Africa\'s Talking or Talksasa under Integrations, or pair an Android phone.';
        await markJobs(db, jobs, { status: 'failed', error });
        return { ...sum, failed: jobs.length, error, results: jobs.map(j => ({ phone: j.phone, ok: false, error })) };
    }

    // Jobs carry their own text (results SMS are personalised), so send each distinct text together.
    const groups = new Map<string, DueJob[]>();
    jobs.forEach(j => { (groups.get(j.message) || groups.set(j.message, []).get(j.message)!).push(j); });

    for (const [message, group] of groups) {
        let pending = group;
        for (const key of order) {
            if (!pending.length) break;
            if (key === 'device') {
                // Phones collect queued jobs themselves; just wake them.
                notifyDevices(schoolId, { count: pending.length });
                sum.provider = sum.provider || 'device';
                pending = [];
                break;
            }
            const before = sum.sent;
            pending = key === 'africas_talking'
                ? await sendViaAfricasTalking(db, states.africas_talking.config, pending, message, sum)
                : await sendViaTalksasa(db, states.talksasa.config, pending, message, sum);
            if (sum.sent > before && !sum.provider) sum.provider = key;
        }
        if (pending.length) {   // every gateway in line refused these
            const error = sum.error || 'Could not be sent';
            await markJobs(db, pending, { status: 'failed', error });
            sum.failed += pending.length; pending.forEach(j => sum.results.push({ phone: j.phone, ok: false, error }));
        }
    }
    return sum;
};

/** Queue SMS jobs for a set of numbers, branded with the school name, and send them now (unless scheduled). */
export const queueSms = async (
    db: Db, schoolId: string,
    numbers: string[], rawMessage: string,
    opts: { scheduledAt?: Date | null; createdBy?: string; audience?: string } = {},
) => {
    const clean = Array.from(new Set(numbers.map(n => normalizePhone(n)).filter(n => n.length >= 9)));
    if (clean.length === 0) return { queued: 0, jobIds: [] as string[], sent: 0, failed: 0, provider: null as SmsProviderKey | null, immediate: false };

    // Brand EVERY SMS with the school name ("Kilimo High: <message>"). Idempotent —
    // paths that already branded aren't double-prefixed (brandMessage guards that).
    const schoolName = await resolveSchoolName(db, schoolId);
    const { brandMessage } = await import('./talksasa.service');
    const message = brandMessage(schoolName, rawMessage);

    const now = new Date();
    const dueNow = !opts.scheduledAt || opts.scheduledAt <= now;
    const docs = clean.map(phone => ({
        schoolId, phone, message,
        status: dueNow ? 'queued' : 'scheduled',
        scheduledAt: opts.scheduledAt || null,
        deviceId: null as string | null,
        attempts: 0,
        audience: opts.audience || null,
        createdBy: opts.createdBy || null,
        createdAt: now, updatedAt: now,
    }));
    const r = await db.collection('sms_jobs').insertMany(docs);
    const jobIds = Object.values(r.insertedIds).map(String);
    if (!dueNow) return { queued: clean.length, jobIds, sent: 0, failed: 0, provider: null as SmsProviderKey | null, immediate: false };

    const sum = await dispatchJobs(db, schoolId, clean.map((phone, i) => ({ _id: r.insertedIds[i], phone, message })));
    return {
        queued: clean.length, jobIds, sent: sum.sent, failed: sum.failed, provider: sum.provider,
        immediate: sum.provider !== 'device',   // false → waiting for a phone to collect it
        error: sum.error, results: sum.results, notes: sum.notes,
    };
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
    filter?: { classId?: string; streamId?: string; className?: string; streamName?: string },
): Promise<{ phone: string; text: string }[]> => {
    const { ObjectId } = await import('mongodb');
    const oid = (s?: string) => { try { return s ? new ObjectId(s) : undefined; } catch { return undefined; } };
    const school = (await db.collection('settings').findOne({}).catch(() => null))?.schoolName || '';
    const students = await db.collection('students').find({}).toArray();
    const byId: Record<string, any> = {};
    students.forEach((s: any) => { byId[String(s._id)] = s; if (s.admNo) byId[s.admNo] = s; if (s.registrationNo) byId[s.registrationNo] = s; });
    const out: { phone: string; text: string }[] = [];
    const pre = school ? school + ': ' : '';

    // Optional class+stream gate: only send to learners in the chosen class
    // (and stream, if one is chosen). Matches by v2 ids or class/stream TEXT.
    const norm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    const f = filter && (filter.classId || filter.className) ? filter : null;
    const passesFilter = (st: any): boolean => {
        if (!f) return true;
        const classOk = String(st.classId) === String(f.classId) || norm(st.studentClass || st.currentClass) === norm(f.className);
        if (!classOk) return false;
        if (!f.streamId && !f.streamName) return true;
        return String(st.streamId) === String(f.streamId) || norm(st.stream || st.streamName) === norm(f.streamName);
    };

    if (type === 'exam') {
        const exam = await db.collection('exams').findOne({ _id: oid(id) });
        const marks = await db.collection('marks').find({ examId: id }).toArray();
        const byStudent: Record<string, any[]> = {};
        marks.forEach((m: any) => { (byStudent[m.studentId] ||= []).push(m); });
        for (const [sid, ms] of Object.entries(byStudent)) {
            const st = byId[sid]; if (!st || !passesFilter(st)) continue; const phone = studentPhone(st); if (!phone) continue;
            const total = ms.reduce((t, m) => t + Number(m.marks || m.score || 0), 0);
            const avg = ms.length ? Math.round(total / ms.length) : 0;
            const lines = ms.map(m => `${m.subjectName || 'Subj'}:${Number(m.marks || m.score || 0)}(${gradeFor(Number(m.marks || m.score || 0))})`).join(', ');
            out.push({ phone, text: `${pre}${studentName(st)} — ${exam?.name || 'Exam'} results. ${lines}. Mean: ${avg}% (${gradeFor(avg)}).` });
        }
    } else if (type === 'classTest') {
        const test = await db.collection('class_tests').findOne({ _id: oid(id) });
        const tmarks = await db.collection('test_marks').find({ test_id: oid(id) }).toArray();
        for (const m of tmarks) {
            const st = byId[String(m.student_id)] || byId[m.studentId]; if (!st || !passesFilter(st)) continue; const phone = studentPhone(st); if (!phone) continue;
            const score = Number(m.score ?? m.marks ?? 0);
            const display = test?.total_marks ? `${score}/${test.total_marks}` : `${score}`;
            out.push({ phone, text: `${pre}${studentName(st)} scored ${display} in ${test?.name || 'the class test'}${test?.subject_name ? ' (' + test.subject_name + ')' : ''}.` });
        }
    } else if (type === 'cbc') {
        const activity = await db.collection('cbc_activities').findOne({ _id: oid(id) });
        const assessments = await db.collection('cbc_assessments').find({ activityId: id, deletedAt: { $exists: false } }).toArray();
        for (const a of assessments) {
            const st = byId[a.studentId]; if (!st || !passesFilter(st)) continue; const phone = studentPhone(st); if (!phone) continue;
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
