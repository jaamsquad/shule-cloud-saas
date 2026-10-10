import nodemailer from 'nodemailer';
import { Db } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { resolveEmailRoute } from '../lib/emailRouting';

// ─── Settings ─────────────────────────────────────────────────────────────────
// Config now lives on the Integrations page (integration_settings). We merge the
// relevant integration records into the legacy field names the senders expect,
// falling back to any old communication_settings doc for backward compatibility.
export const getCommSettings = async (db: Db): Promise<any> => {
    try {
        const legacy = (await db.collection('communication_settings').findOne({})) || {};
        const integ = await db.collection('integration_settings').find({}).toArray().catch(() => []);
        const byKey: Record<string, any> = {};
        integ.forEach((r: any) => { if (r.integration) byKey[r.integration] = r; });

        const smtp = byKey['smtp'];
        const sendgrid = byKey['sendgrid'];
        const mailgun = byKey['mailgun'];
        const wa = byKey['whatsapp'];

        const merged: any = { ...legacy };

        // Email — prefer a configured/enabled integration, else legacy.
        if (smtp && (smtp.enabled || smtp.host)) {
            merged.emailEnabled = smtp.enabled !== false;
            merged.smtpHost = smtp.host; merged.smtpPort = smtp.port;
            merged.smtpUser = smtp.username; merged.smtpPass = smtp.password;
            merged.emailFromAddress = smtp.fromEmail || merged.emailFromAddress;
            merged.emailFromName = smtp.fromName || merged.emailFromName;
        } else if (sendgrid && (sendgrid.enabled || sendgrid.apiKey)) {
            merged.emailEnabled = sendgrid.enabled !== false;
            merged.emailProvider = 'sendgrid'; merged.sendgridApiKey = sendgrid.apiKey;
            merged.emailFromAddress = sendgrid.fromEmail || merged.emailFromAddress;
            merged.emailFromName = sendgrid.fromName || merged.emailFromName;
        } else if (mailgun && (mailgun.enabled || mailgun.apiKey)) {
            merged.emailEnabled = mailgun.enabled !== false;
            merged.emailProvider = 'mailgun'; merged.mailgunApiKey = mailgun.apiKey; merged.mailgunDomain = mailgun.domain;
            merged.emailFromAddress = mailgun.fromEmail || merged.emailFromAddress;
        }

        // WhatsApp API (Meta Cloud) — used when no scanned QR session is active.
        if (wa && (wa.enabled || wa.accessToken)) {
            merged.whatsappApiKey = wa.accessToken || merged.whatsappApiKey;
            merged.whatsappPhoneNumberId = wa.phoneNumberId || merged.whatsappPhoneNumberId;
            merged.whatsappBusinessId = wa.businessId || merged.whatsappBusinessId;
        }

        return merged;
    } catch {
        try { return (await db.collection('communication_settings').findOne({})) || {}; } catch { return {}; }
    }
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
    // the school's own account or ShuleCloud's, as the owner set for this school (lib/emailRouting)
    const route = await resolveEmailRoute(db, s);
    if (s.emailEnabled === false && route.mode !== 'platform') throw new Error('Email sending is disabled in Communications → Settings.');
    if (!route.smtp) throw new Error(route.reason || 'Email is not configured.');
    const transport = buildTransport({ smtpHost: route.smtp.host, smtpPort: route.smtp.port, smtpUser: route.smtp.user, smtpPass: route.smtp.pass });
    const fromAddr = route.via === 'platform' ? route.smtp.fromAddress : (from || route.smtp.fromAddress);
    const fromName = route.smtp.fromName || 'School';
    const replyTo = route.via === 'platform' ? (from || route.smtp.replyTo) : undefined;
    const recipients = uniq(to);
    const bodyHtml = html || (message ? plainToHtml(message) : '');

    const results: SendResult[] = [];
    for (const r of recipients) {
        let result: SendResult;
        try {
            const info = await transport.sendMail({
                from: `"${fromName}" <${fromAddr}>`, to: r, subject, ...(replyTo ? { replyTo } : {}),
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
            channel: 'email', via: route.via, createdAt: new Date(),
        }).catch(() => {});
    }
    return results;
};

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
// Two providers:
//   • 'qr'  → the linked WhatsApp Web (Baileys) session for this school (default)
//   • 'api' → the Meta WhatsApp Cloud API (token + phone-number id)
// `schoolId` is required for the QR provider (selects the school's session).
export const sendWhatsApp = async (
    db: Db,
    { to, message, schoolId }: { to: string[]; message: string; schoolId?: string },
): Promise<SendResult[]> => {
    const s = await getCommSettings(db);

    // Decide the provider. Prefer the explicit setting; otherwise auto-detect:
    // a connected QR session wins, else fall back to the Meta API if configured.
    const { whatsAppManager } = await import('./whatsapp/SessionManager');
    const qrConnected = schoolId ? (await whatsAppManager.getStatus(schoolId)).status === 'connected' : false;
    const apiConfigured = !!((s.whatsappApiKey || process.env.WHATSAPP_TOKEN) && (s.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_ID));
    const provider = (s.whatsappProvider as string) || (qrConnected ? 'qr' : (apiConfigured ? 'api' : 'qr'));

    const recipients = uniq(to.map(t => normalizePhone(t)));
    const results: SendResult[] = [];
    const log = (r: SendResult, via: string) => {
        results.push(r);
        db.collection('whatsapp_logs').insertOne({
            to: r.to, message, status: r.status, error: r.error || null,
            channel: 'whatsapp', provider: via, createdAt: new Date(),
        }).catch(() => {});
    };

    // ── QR session (WhatsApp Web) ──────────────────────────────────────────────
    if (provider === 'qr') {
        if (!schoolId) throw new Error('WhatsApp session unavailable for this school.');
        if (!qrConnected) {
            throw new Error('WhatsApp is not connected. Open Communications → WhatsApp Integration and scan the QR code.');
        }
        for (const r of recipients) {
            try {
                const sent = await whatsAppManager.sendText(schoolId, r, message);
                log({ to: r, status: 'sent', messageId: sent.id }, 'qr');
            } catch (e: any) {
                log({ to: r, status: 'failed', error: e.message }, 'qr');
            }
        }
        return results;
    }

    // ── Meta Cloud API ─────────────────────────────────────────────────────────
    const token = s.whatsappApiKey || process.env.WHATSAPP_TOKEN;
    const phoneId = s.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) {
        throw new Error('WhatsApp is not configured. Either scan the QR code in WhatsApp Integration, or set the Meta API key and Phone Number ID.');
    }
    for (const r of recipients) {
        try {
            const resp = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: r, type: 'text', text: { preview_url: false, body: message } }),
            });
            const data: any = await resp.json().catch(() => ({}));
            const ok = resp.ok && Array.isArray(data?.messages);
            log({ to: r, status: ok ? 'sent' : 'failed', error: ok ? null : (data?.error?.message || `HTTP ${resp.status}`) }, 'api');
        } catch (e: any) {
            log({ to: r, status: 'failed', error: e.message }, 'api');
        }
    }
    return results;
};

export const dbFromReq = (req: any): Db => req.tenantDb || getMetaDb();
export const schoolIdFromReq = (req: any): string | undefined => req.tenantContext?.tenantId;
