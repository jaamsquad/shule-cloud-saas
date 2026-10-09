/**
 * Communication → Meetings & Templates
 *
 *  - School calendar of meetings (staff meeting, PTA, board, class…)
 *  - Who is invited: staff, teachers, parents (all or of chosen classes) and/or people picked by hand
 *  - One click to notify them by SMS and/or email (personalised: {name}, {date}, {time}…),
 *    plus an optional automatic reminder before the meeting
 *  - Reusable SMS & email templates, also used by the other composers
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId, Db } from 'mongodb';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';
import { dbFromReq, schoolIdFromReq, sendEmail, normalizePhone } from '../services/communications.service';

const router = Router();
const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const now = () => new Date();

// Signed-in admin-app user or staff member (these routes must not be public).
const who = (req: any): { id: string; name: string } | null => {
    const raw = String(req.headers.authorization || '').split(' ')[1];
    if (!raw) return null;
    for (const secret of [process.env.JWT_SECRET || 'secret', process.env.JWT_SECRET || 'shulecloud_student_secret_2024']) {
        try {
            const c: any = jwt.verify(raw, secret);
            if (c.sub || c.staffId) return { id: String(c.sub || c.staffId), name: String(c.name || c.email || 'Staff') };
            return null;   // student / parent tokens are not allowed here
        } catch { /* next */ }
    }
    return null;
};
router.use(['/communications/templates', '/meetings'], (req: any, res, next) => {
    const u = who(req);
    if (!u) return res.status(401).json({ message: 'Sign in to continue' });
    req.commUser = u;
    next();
});

// ═══════════════════════════════════════════════════════════════════════════
// Templates
// ═══════════════════════════════════════════════════════════════════════════
export const PLACEHOLDERS = ['{name}', '{school}', '{title}', '{date}', '{time}', '{location}', '{link}', '{amount}', '{class}', '{adm}'];

const DEFAULT_TEMPLATES = [
    { channel: 'sms', category: 'Meetings', name: 'Meeting invitation (SMS)', body: 'Dear {name}, you are invited to {title} on {date} at {time}, {location}. Kindly attend.' },
    { channel: 'sms', category: 'Meetings', name: 'Meeting reminder (SMS)', body: 'Reminder: {title} is on {date} at {time}, {location}. See you there.' },
    { channel: 'sms', category: 'Meetings', name: 'Meeting cancelled (SMS)', body: 'Dear {name}, {title} planned for {date} at {time} has been cancelled. We apologise for any inconvenience.' },
    { channel: 'sms', category: 'Fees', name: 'Fee balance reminder', body: 'Dear Parent, {name} ({class}) has a fee balance of KES {amount}. Kindly clear it. Thank you.' },
    { channel: 'email', category: 'Meetings', name: 'Meeting invitation (email)', subject: 'Invitation: {title} — {date}', body: 'Dear {name},\n\nYou are invited to {title}.\n\nDate: {date}\nTime: {time}\nVenue: {location}\n{link}\n\nKind regards,\n{school}' },
    { channel: 'email', category: 'General', name: 'General notice (email)', subject: 'Notice from {school}', body: 'Dear {name},\n\n\n\nKind regards,\n{school}' },
];

async function ensureDefaults(db: Db) {
    const c = db.collection('message_templates');
    if (await c.countDocuments({}, { limit: 1 })) return;
    await c.insertMany(DEFAULT_TEMPLATES.map(t => ({ ...t, subject: (t as any).subject || '', isDefault: true, usageCount: 0, createdAt: now(), createdBy: 'system' })));
}

router.get('/communications/templates', async (req, res) => {
    try {
        const db = dbFromReq(req);
        await ensureDefaults(db);
        const q: any = { deletedAt: { $exists: false } };
        if (req.query.channel) q.channel = String(req.query.channel);
        const rows = await db.collection('message_templates').find(q).sort({ category: 1, name: 1 }).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

const readTemplate = (b: any) => {
    const channel = String(b.channel || '');
    if (!['sms', 'email'].includes(channel)) throw new Error('Choose SMS or Email');
    const name = String(b.name || '').trim();
    const body = String(b.body || '').trim();
    if (!name) throw new Error('Give the template a name');
    if (!body) throw new Error('The template has no text');
    if (channel === 'email' && !String(b.subject || '').trim()) throw new Error('An email template needs a subject');
    return { channel, name: name.slice(0, 120), category: String(b.category || 'General').trim().slice(0, 60) || 'General', subject: channel === 'email' ? String(b.subject).trim().slice(0, 200) : '', body: body.slice(0, 10_000) };
};

router.post('/communications/templates', async (req: any, res) => {
    try {
        const doc = { ...readTemplate(req.body || {}), usageCount: 0, createdAt: now(), createdBy: req.commUser.name };
        const r = await dbFromReq(req).collection('message_templates').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.put('/communications/templates/:id', async (req: any, res) => {
    try {
        const set = { ...readTemplate(req.body || {}), updatedAt: now(), updatedBy: req.commUser.name };
        await dbFromReq(req).collection('message_templates').updateOne({ _id: oid(req.params.id) as any }, { $set: set });
        res.json({ message: 'Saved' });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.delete('/communications/templates/:id', async (req, res) => {
    try {
        await dbFromReq(req).collection('message_templates').updateOne({ _id: oid(req.params.id) as any }, { $set: { deletedAt: now() } });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/communications/templates/:id/used', async (req, res) => {
    try {
        await dbFromReq(req).collection('message_templates').updateOne({ _id: oid(req.params.id) as any }, { $inc: { usageCount: 1 }, $set: { lastUsedAt: now() } });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// Recipients
// ═══════════════════════════════════════════════════════════════════════════
export interface Recipient { key: string; name: string; role: string; phone: string; email: string; meta?: string }
export interface MeetingAudience { categories?: string[]; classNames?: string[]; custom?: any[] }

const isTeacher = (s: any) => /teacher|tutor|lecturer/i.test(`${s.designation || ''} ${s.role || ''} ${(s.roles || []).join(' ')}`) || s.isTeachingStaff === true
    || (Array.isArray(s.subjectAssignments) && s.subjectAssignments.length > 0);
const activeStaff = (s: any) => !s.deletedAt && !/^(inactive|terminated|left|resigned|suspended)$/i.test(String(s.status || s.employmentStatus || ''));
const activeStudent = (s: any) => !s.deletedAt && !/^(transferred|graduated|inactive|left)$/i.test(String(s.status || 'Active'));
const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Everyone a meeting invites, de-duplicated (one parent with 3 children gets one message). */
export async function resolveRecipients(db: Db, a: MeetingAudience): Promise<Recipient[]> {
    const cats = new Set((a.categories || []).map(String));
    const out = new Map<string, Recipient>();
    const add = (r: Recipient) => {
        const phone = r.phone ? normalizePhone(r.phone) : '';
        const email = String(r.email || '').trim().toLowerCase();
        if (!phone && !email) return;
        const key = phone ? `p:${phone}` : `e:${email}`;
        const prev = out.get(key);
        if (prev) { if (!prev.email && email) prev.email = email; return; }
        out.set(key, { ...r, key, phone, email });
    };
    if (cats.has('staff') || cats.has('teachers')) {
        const staff = await db.collection('staff').find({}).toArray().catch(() => []);
        for (const s of staff) {
            if (!activeStaff(s)) continue;
            if (!cats.has('staff') && !isTeacher(s)) continue;
            add({ key: '', name: s.employeeName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff', role: isTeacher(s) ? 'Teacher' : 'Staff', phone: s.phone || s.phoneNumber || '', email: s.email || '', meta: s.designation || '' });
        }
    }
    if (cats.has('parents')) {
        const classes = (a.classNames || []).map(nrm).filter(Boolean);
        const students = await db.collection('students').find({}).toArray().catch(() => []);
        for (const s of students) {
            if (!activeStudent(s)) continue;
            const cls = nrm(s.studentClass || s.currentClass || s.className);
            if (classes.length && !classes.some(c => cls === c || cls.startsWith(`${c} `))) continue;
            const child = s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim();
            const pname = s.parentName || s.fatherName || s.motherName || s.guardianName || `Parent of ${child}`;
            add({ key: '', name: pname, role: 'Parent', phone: s.parentPhone || s.fatherPhone || s.motherPhone || s.guardianPhone || '', email: s.parentEmail || s.fatherEmail || s.motherEmail || s.guardianEmail || '', meta: child ? `Parent of ${child}` : '' });
        }
    }
    for (const c of a.custom || []) add({ key: '', name: String(c.name || 'Guest'), role: String(c.role || 'Guest'), phone: String(c.phone || ''), email: String(c.email || ''), meta: c.meta || '' });
    return [...out.values()].sort((x, y) => x.role.localeCompare(y.role) || x.name.localeCompare(y.name));
}

// ═══════════════════════════════════════════════════════════════════════════
// Meetings
// ═══════════════════════════════════════════════════════════════════════════
const MEETING_TYPES = ['Staff meeting', 'Parents meeting (PTA)', 'Board meeting', 'Class meeting', 'Department meeting', 'Academic clinic', 'Other'];

const fmtDate = (d: Date) => d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });
const fmtTime = (d: Date) => d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Nairobi' });

export function fillTemplate(text: string, vars: Record<string, string>) {
    return String(text || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)).replace(/[ \t]+\n/g, '\n').trim();
}

async function schoolName(req: any): Promise<string> {
    try {
        const t: any = await getMetaDb().collection('Tenant').findOne({ _id: oid(req.tenantContext?.tenantId) as any });
        return t?.instituteName || t?.name || 'School';
    } catch { return 'School'; }
}

const readMeeting = (b: any) => {
    const title = String(b.title || '').trim();
    if (!title) throw new Error('Give the meeting a title');
    const start = new Date(b.start);
    if (isNaN(start.getTime())) throw new Error('Choose the meeting date and start time');
    const end = b.end ? new Date(b.end) : new Date(start.getTime() + 60 * 60_000);
    if (isNaN(end.getTime()) || end <= start) throw new Error('The meeting must end after it starts');
    const audience: MeetingAudience = {
        categories: (Array.isArray(b.audience?.categories) ? b.audience.categories : []).filter((c: string) => ['staff', 'teachers', 'parents'].includes(c)),
        classNames: (Array.isArray(b.audience?.classNames) ? b.audience.classNames : []).map(String).slice(0, 100),
        custom: (Array.isArray(b.audience?.custom) ? b.audience.custom : []).slice(0, 1000).map((c: any) => ({ id: String(c.id || ''), name: String(c.name || ''), role: String(c.role || ''), phone: String(c.phone || ''), email: String(c.email || ''), meta: String(c.meta || '') })),
    };
    const reminder = b.reminder && Number(b.reminder.minutesBefore) > 0 && (b.reminder.sms || b.reminder.email)
        ? { minutesBefore: Math.min(10080, Number(b.reminder.minutesBefore)), sms: !!b.reminder.sms, email: !!b.reminder.email, sentAt: null as Date | null }
        : null;
    return {
        title: title.slice(0, 160),
        type: MEETING_TYPES.includes(b.type) ? b.type : 'Other',
        description: String(b.description || '').slice(0, 5000),
        location: String(b.location || '').slice(0, 200),
        mode: b.mode === 'online' ? 'online' : b.mode === 'hybrid' ? 'hybrid' : 'in-person',
        link: String(b.link || '').slice(0, 500),
        start, end,
        color: /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : '#5C67F2',
        audience,
        reminder,
    };
};

router.get('/meetings', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const q: any = { deletedAt: { $exists: false } };
        if (req.query.from || req.query.to) {
            q.start = {};
            if (req.query.from) q.start.$gte = new Date(String(req.query.from));
            if (req.query.to) q.start.$lt = new Date(String(req.query.to));
        }
        const rows = await db.collection('school_meetings').find(q).sort({ start: 1 }).limit(1000).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/meetings/:id', async (req, res) => {
    try {
        const m = await dbFromReq(req).collection('school_meetings').findOne({ _id: oid(req.params.id) as any });
        if (!m) return res.status(404).json({ message: 'Meeting not found' });
        res.json(m);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/meetings', async (req: any, res) => {
    try {
        const doc = { ...readMeeting(req.body || {}), status: 'scheduled', notifications: [], createdAt: now(), createdBy: req.commUser.name, createdById: req.commUser.id };
        const r = await dbFromReq(req).collection('school_meetings').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.put('/meetings/:id', async (req: any, res) => {
    try {
        const db = dbFromReq(req);
        const cur: any = await db.collection('school_meetings').findOne({ _id: oid(req.params.id) as any });
        if (!cur) return res.status(404).json({ message: 'Meeting not found' });
        const set: any = { ...readMeeting(req.body || {}), updatedAt: now(), updatedBy: req.commUser.name };
        // A moved meeting gets its reminder again
        if (set.reminder && cur.reminder?.sentAt && +new Date(cur.start) === +set.start) set.reminder.sentAt = cur.reminder.sentAt;
        await db.collection('school_meetings').updateOne({ _id: cur._id }, { $set: set });
        res.json({ message: 'Saved', rescheduled: +new Date(cur.start) !== +set.start });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.post('/meetings/:id/cancel', async (req: any, res) => {
    try {
        const r = await dbFromReq(req).collection('school_meetings').updateOne({ _id: oid(req.params.id) as any, status: 'scheduled' }, { $set: { status: 'cancelled', cancelledAt: now(), cancelledBy: req.commUser.name, cancelReason: String(req.body?.reason || '') } });
        if (!r.modifiedCount) return res.status(400).json({ message: 'Only a scheduled meeting can be cancelled' });
        res.json({ message: 'Meeting cancelled' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/meetings/:id', async (req, res) => {
    try {
        await dbFromReq(req).collection('school_meetings').updateOne({ _id: oid(req.params.id) as any }, { $set: { deletedAt: now() } });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Preview of who would be notified (before or after saving)
router.post('/meetings/recipients/preview', async (req, res) => {
    try {
        const list = await resolveRecipients(dbFromReq(req), req.body?.audience || {});
        res.json({
            total: list.length,
            withPhone: list.filter(r => r.phone).length,
            withEmail: list.filter(r => r.email).length,
            byRole: list.reduce((m: any, r) => { m[r.role] = (m[r.role] || 0) + 1; return m; }, {}),
            sample: list.slice(0, 300),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

/**
 * Send the meeting to everyone invited. Body:
 *   { sms: bool, email: bool, kind: 'invite'|'reminder'|'update'|'cancel',
 *     smsText?, emailSubject?, emailBody?, templateIds? }
 */
export async function notifyMeeting(db: Db, schoolId: string, school: string, m: any, opts: any, by: string) {
    const recipients = await resolveRecipients(db, m.audience || {});
    const start = new Date(m.start), end = new Date(m.end);
    const base = {
        school, title: m.title, date: fmtDate(start), time: `${fmtTime(start)} – ${fmtTime(end)}`,
        location: m.location || (m.mode === 'online' ? 'Online' : 'School'), link: m.link || '',
    };
    const kind = ['invite', 'reminder', 'update', 'cancel'].includes(opts.kind) ? opts.kind : 'invite';
    const defaultSms = {
        invite: 'Dear {name}, you are invited to {title} on {date} at {time}, {location}.',
        reminder: 'Reminder: {title} on {date} at {time}, {location}.',
        update: 'Dear {name}, {title} has been updated: now on {date} at {time}, {location}.',
        cancel: 'Dear {name}, {title} planned for {date} at {time} has been cancelled.',
    }[kind as 'invite'];
    const smsText = String(opts.smsText || defaultSms);
    const emailSubject = String(opts.emailSubject || ({ invite: 'Invitation: {title} — {date}', reminder: 'Reminder: {title} — {date}', update: 'Updated: {title} — {date}', cancel: 'Cancelled: {title}' } as any)[kind]);
    const emailBody = String(opts.emailBody || `Dear {name},\n\n${{ invite: 'You are invited to {title}.', reminder: 'This is a reminder of {title}.', update: '{title} has been updated.', cancel: '{title} has been cancelled.' }[kind as 'invite']}\n\nDate: {date}\nTime: {time}\nVenue: {location}${m.link ? '\nJoin: {link}' : ''}${m.description && kind !== 'cancel' ? `\n\n${m.description}` : ''}\n\nKind regards,\n{school}`);

    const result: any = { kind, at: new Date(), by, recipients: recipients.length, sms: null, email: null };
    if (opts.sms) {
        const { queueSms } = await import('../services/smsGateway.service');
        const withPhone = recipients.filter(r => r.phone);
        let sent = 0, failed = 0, queued = 0;
        const personal = /\{name\}/.test(smsText);
        if (!personal) {
            const r: any = await queueSms(db, schoolId, withPhone.map(x => x.phone), fillTemplate(smsText, base), { audience: 'meeting', createdBy: by });
            sent += r.sent || 0; failed += r.failed || 0; queued += r.queued || 0;
        } else {
            for (const x of withPhone) {
                const r: any = await queueSms(db, schoolId, [x.phone], fillTemplate(smsText, { ...base, name: x.name }), { audience: 'meeting', createdBy: by }).catch(() => ({ failed: 1 }));
                sent += r.sent || 0; failed += r.failed || 0; queued += r.queued || 0;
            }
        }
        result.sms = { targeted: withPhone.length, queued, sent, failed, skipped: recipients.length - withPhone.length };
    }
    if (opts.email) {
        const withEmail = recipients.filter(r => r.email);
        let sent = 0, failed = 0; let error = '';
        for (const x of withEmail) {
            try {
                const vars = { ...base, name: x.name };
                const r = await sendEmail(db, { to: [x.email], subject: fillTemplate(emailSubject, vars), message: fillTemplate(emailBody, vars) });
                if (r.some(y => y.status === 'sent')) sent++; else { failed++; error = error || r[0]?.error || ''; }
            } catch (e: any) { failed++; error = error || e.message; if (/not configured|disabled/i.test(e.message)) { failed += withEmail.length - sent - failed; break; } }
        }
        result.email = { targeted: withEmail.length, sent, failed, skipped: recipients.length - withEmail.length, error: error || undefined };
    }
    await db.collection('school_meetings').updateOne({ _id: m._id }, { $push: { notifications: result } as any, $set: { lastNotifiedAt: result.at } });
    return result;
}

router.post('/meetings/:id/notify', async (req: any, res) => {
    try {
        const db = dbFromReq(req);
        const m: any = await db.collection('school_meetings').findOne({ _id: oid(req.params.id) as any });
        if (!m) return res.status(404).json({ message: 'Meeting not found' });
        const b = req.body || {};
        if (!b.sms && !b.email) return res.status(400).json({ message: 'Choose SMS, email or both' });
        const kind = m.status === 'cancelled' ? 'cancel' : b.kind;
        const r = await notifyMeeting(db, String(schoolIdFromReq(req) || ''), await schoolName(req), m, { ...b, kind }, req.commUser.name);
        for (const id of (Array.isArray(b.templateIds) ? b.templateIds : [])) await db.collection('message_templates').updateOne({ _id: oid(id) as any }, { $inc: { usageCount: 1 }, $set: { lastUsedAt: now() } }).catch(() => {});
        res.json(r);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// ── Automatic reminders (server.ts tick) ─────────────────────────────────────
let ticking = false;
export async function sendDueMeetingReminders() {
    if (ticking) return;
    ticking = true;
    try {
        const tenants = await getMetaDb().collection('Tenant').find({}, { projection: { subdomain: 1, databaseName: 1, name: 1, instituteName: 1 } }).toArray().catch(() => []);
        const t0 = Date.now();
        for (const t of tenants) {
            try {
                const dbName = t.databaseName || subdomainToDbName(String(t.subdomain || '').toLowerCase());
                if (!dbName) continue;
                const db = getTenantDb(dbName);
                const upcoming = await db.collection('school_meetings').find({ status: 'scheduled', deletedAt: { $exists: false }, 'reminder.minutesBefore': { $gt: 0 }, 'reminder.sentAt': null, start: { $gt: new Date(t0), $lt: new Date(t0 + 7 * 864e5) } }).limit(50).toArray();
                for (const m of upcoming) {
                    if (+new Date(m.start) - m.reminder.minutesBefore * 60_000 > t0) continue;
                    // claim it so two servers never send the same reminder
                    const claimed = await db.collection('school_meetings').updateOne({ _id: m._id, 'reminder.sentAt': null }, { $set: { 'reminder.sentAt': new Date() } });
                    if (!claimed.modifiedCount) continue;
                    await notifyMeeting(db, String(t._id), t.instituteName || t.name || 'School', m, { kind: 'reminder', sms: m.reminder.sms, email: m.reminder.email }, 'auto-reminder').catch(() => {});
                }
            } catch { /* next school */ }
        }
    } finally { ticking = false; }
}

export default router;
