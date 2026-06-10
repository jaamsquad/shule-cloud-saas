import nodemailer from 'nodemailer';
import { Db } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getCommSettings = async (db: Db): Promise<any> => {
    try { return (await db.collection('communication_settings').findOne({})) || {}; }
    catch { return {}; }
};

// ─── Recipient resolution ──────────────────────────────────────────────────────
type Audience = 'all' | 'students' | 'parents' | 'staff';

const uniq = (arr: string[]) => Array.from(new Set(arr.map(s => String(s).trim()).filter(Boolean)));

/** Collect email addresses for an audience from the tenant DB. */
export const resolveEmails = async (db: Db, audience: Audience): Promise<string[]> => {
    const out: string[] = [];
    const want = (a: Audience) => audience === 'all' || audience === a;
    if (want('students')) {
        const s = await db.collection('students').find({}).toArray().catch(() => []);
        s.forEach((x: any) => out.push(x.studentEmail || x.email));
    }
    if (want('parents')) {
        const p = await db.collection('parents').find({}).toArray().catch(() => []);
        p.forEach((x: any) => out.push(x.email));
        const s = await db.collection('students').find({}).toArray().catch(() => []);
        s.forEach((x: any) => out.push(x.parentEmail || x.fatherEmail || x.motherEmail));
    }
    if (want('staff')) {
        const st = await db.collection('staff').find({}).toArray().catch(() => []);
        st.forEach((x: any) => out.push(x.email));
    }
    return uniq(out);
};

/** Normalise a phone number to international format (no +) for WhatsApp. */
export const normalizePhone = (raw: string, defaultCc = '254'): string => {
    let p = String(raw || '').replace(/[^\d]/g, '');
    if (!p) return '';
    if (p.startsWith('0')) p = defaultCc + p.slice(1);
    else if (p.length <= 9) p = defaultCc + p;
    return p;
};

/** Collect phone numbers for an audience from the tenant DB. */
export const resolvePhones = async (db: Db, audience: Audience): Promise<string[]> => {
    const out: string[] = [];
    const want = (a: Audience) => audience === 'all' || audience === a;
    if (want('students')) {
        const s = await db.collection('students').find({}).toArray().catch(() => []);
        s.forEach((x: any) => out.push(x.phone));
    }
    if (want('parents')) {
        const p = await db.collection('parents').find({}).toArray().catch(() => []);
        p.forEach((x: any) => out.push(x.whatsappNumber || x.primaryPhone));
        const s = await db.collection('students').find({}).toArray().catch(() => []);
        s.forEach((x: any) => out.push(x.parentPhone || x.fatherPhone || x.motherPhone));
    }
    if (want('staff')) {
        const st = await db.collection('staff').find({}).toArray().catch(() => []);
        st.forEach((x: any) => out.push(x.phone));
    }
    return uniq(out.map(p => normalizePhone(p)));
};

// ─── Email ──────────────────────────────────────────────────────────────────────
const buildTransport = (s: any) => {
    const host = s.smtpHost || process.env.SMTP_HOST;
    const port = Number(s.smtpPort || process.env.SMTP_PORT || 587);
    const user = s.smtpUser || process.env.SMTP_USER;
    const pass = s.smtpPass || process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        throw new Error('Email is not configured. Set SMTP host, user and password in Communications → Settings.');
    }
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
};

const plainToHtml = (msg: string) =>
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6">${String(msg).replace(/\n/g, '<br>')}</div>`;

export interface SendResult { to: string; status: 'sent' | 'failed'; error?: string | null; messageId?: string }

export const sendEmail = async (
    db: Db,
    { to, subject, message, html, from, attachments }: { to: string[]; subject: string; message?: string; html?: string; from?: string; attachments?: { filename: string; content: Buffer; contentType?: string }[] },
): Promise<SendResult[]> => {
    const s = await getCommSettings(db);
    if (s.emailEnabled === false) throw new Error('Email sending is disabled in Communications → Settings.');
    const transport = buildTransport(s);
    const fromAddr = from || s.emailFromAddress || s.smtpUser || process.env.SMTP_USER;
    const fromName = s.emailFromName || 'School';
    const recipients = uniq(to);
    const bodyHtml = html || (message ? plainToHtml(message) : '');

    const results: SendResult[] = [];
    for (const r of recipients) {
        let result: SendResult;
        try {
            const info = await transport.sendMail({
                from: `"${fromName}" <${fromAddr}>`, to: r, subject,
                text: message || undefined, html: bodyHtml || undefined,
                attachments: attachments && attachments.length ? attachments : undefined,
            });
            result = { to: r, status: 'sent', messageId: info.messageId };
        } catch (e: any) {
            result = { to: r, status: 'failed', error: e.message };
        }
        results.push(result);
        db.collection('email_logs').insertOne({
            to: r, subject, status: result.status, error: result.error || null,
            channel: 'email', createdAt: new Date(),
        }).catch(() => {});
    }
    return results;
};

// ─── WhatsApp (Meta Cloud API) ────────────────────────────────────────────────
export const sendWhatsApp = async (
    db: Db,
    { to, message }: { to: string[]; message: string },
): Promise<SendResult[]> => {
    const s = await getCommSettings(db);
    if (!s.whatsappEnabled) throw new Error('WhatsApp is disabled in Communications → Settings.');
    const token = s.whatsappApiKey || process.env.WHATSAPP_TOKEN;
    const phoneId = s.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) {
        throw new Error('WhatsApp is not configured. Set the API key and Phone Number ID in Communications → Settings.');
    }
    const recipients = uniq(to.map(t => normalizePhone(t)));
    const results: SendResult[] = [];
    for (const r of recipients) {
        let result: SendResult;
        try {
            const resp = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: r, type: 'text', text: { preview_url: false, body: message } }),
            });
            const data: any = await resp.json().catch(() => ({}));
            const ok = resp.ok && Array.isArray(data?.messages);
            result = { to: r, status: ok ? 'sent' : 'failed', error: ok ? null : (data?.error?.message || `HTTP ${resp.status}`) };
        } catch (e: any) {
            result = { to: r, status: 'failed', error: e.message };
        }
        results.push(result);
        db.collection('whatsapp_logs').insertOne({
            to: r, message, status: result.status, error: result.error || null,
            channel: 'whatsapp', createdAt: new Date(),
        }).catch(() => {});
    }
    return results;
};

export const dbFromReq = (req: any): Db => req.tenantDb || getMetaDb();
