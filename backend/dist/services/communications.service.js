"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbFromReq = exports.sendWhatsApp = exports.sendEmail = exports.resolvePhones = exports.normalizePhone = exports.resolveEmails = exports.getCommSettings = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const mongodb_1 = require("../lib/mongodb");
// ─── Settings ─────────────────────────────────────────────────────────────────
const getCommSettings = async (db) => {
    try {
        return (await db.collection('communication_settings').findOne({})) || {};
    }
    catch {
        return {};
    }
};
exports.getCommSettings = getCommSettings;
const uniq = (arr) => Array.from(new Set(arr.map(s => String(s).trim()).filter(Boolean)));
/** Collect email addresses for an audience from the tenant DB. */
const resolveEmails = async (db, audience) => {
    const out = [];
    const want = (a) => audience === 'all' || audience === a;
    if (want('students')) {
        const s = await db.collection('students').find({}).toArray().catch(() => []);
        s.forEach((x) => out.push(x.studentEmail || x.email));
    }
    if (want('parents')) {
        const p = await db.collection('parents').find({}).toArray().catch(() => []);
        p.forEach((x) => out.push(x.email));
        const s = await db.collection('students').find({}).toArray().catch(() => []);
        s.forEach((x) => out.push(x.parentEmail || x.fatherEmail || x.motherEmail));
    }
    if (want('staff')) {
        const st = await db.collection('staff').find({}).toArray().catch(() => []);
        st.forEach((x) => out.push(x.email));
    }
    return uniq(out);
};
exports.resolveEmails = resolveEmails;
/** Normalise a phone number to international format (no +) for WhatsApp. */
const normalizePhone = (raw, defaultCc = '254') => {
    let p = String(raw || '').replace(/[^\d]/g, '');
    if (!p)
        return '';
    if (p.startsWith('0'))
        p = defaultCc + p.slice(1);
    else if (p.length <= 9)
        p = defaultCc + p;
    return p;
};
exports.normalizePhone = normalizePhone;
/** Collect phone numbers for an audience from the tenant DB. */
const resolvePhones = async (db, audience) => {
    const out = [];
    const want = (a) => audience === 'all' || audience === a;
    if (want('students')) {
        const s = await db.collection('students').find({}).toArray().catch(() => []);
        s.forEach((x) => out.push(x.phone));
    }
    if (want('parents')) {
        const p = await db.collection('parents').find({}).toArray().catch(() => []);
        p.forEach((x) => out.push(x.whatsappNumber || x.primaryPhone));
        const s = await db.collection('students').find({}).toArray().catch(() => []);
        s.forEach((x) => out.push(x.parentPhone || x.fatherPhone || x.motherPhone));
    }
    if (want('staff')) {
        const st = await db.collection('staff').find({}).toArray().catch(() => []);
        st.forEach((x) => out.push(x.phone));
    }
    return uniq(out.map(p => (0, exports.normalizePhone)(p)));
};
exports.resolvePhones = resolvePhones;
// ─── Email ──────────────────────────────────────────────────────────────────────
const buildTransport = (s) => {
    const host = s.smtpHost || process.env.SMTP_HOST;
    const port = Number(s.smtpPort || process.env.SMTP_PORT || 587);
    const user = s.smtpUser || process.env.SMTP_USER;
    const pass = s.smtpPass || process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        throw new Error('Email is not configured. Set SMTP host, user and password in Communications → Settings.');
    }
    return nodemailer_1.default.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
};
const plainToHtml = (msg) => `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6">${String(msg).replace(/\n/g, '<br>')}</div>`;
const sendEmail = async (db, { to, subject, message, html, from, attachments }) => {
    const s = await (0, exports.getCommSettings)(db);
    if (s.emailEnabled === false)
        throw new Error('Email sending is disabled in Communications → Settings.');
    const transport = buildTransport(s);
    const fromAddr = from || s.emailFromAddress || s.smtpUser || process.env.SMTP_USER;
    const fromName = s.emailFromName || 'School';
    const recipients = uniq(to);
    const bodyHtml = html || (message ? plainToHtml(message) : '');
    const results = [];
    for (const r of recipients) {
        let result;
        try {
            const info = await transport.sendMail({
                from: `"${fromName}" <${fromAddr}>`, to: r, subject,
                text: message || undefined, html: bodyHtml || undefined,
                attachments: attachments && attachments.length ? attachments : undefined,
            });
            result = { to: r, status: 'sent', messageId: info.messageId };
        }
        catch (e) {
            result = { to: r, status: 'failed', error: e.message };
        }
        results.push(result);
        db.collection('email_logs').insertOne({
            to: r, subject, status: result.status, error: result.error || null,
            channel: 'email', createdAt: new Date(),
        }).catch(() => { });
    }
    return results;
};
exports.sendEmail = sendEmail;
// ─── WhatsApp (Meta Cloud API) ────────────────────────────────────────────────
const sendWhatsApp = async (db, { to, message }) => {
    const s = await (0, exports.getCommSettings)(db);
    if (!s.whatsappEnabled)
        throw new Error('WhatsApp is disabled in Communications → Settings.');
    const token = s.whatsappApiKey || process.env.WHATSAPP_TOKEN;
    const phoneId = s.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) {
        throw new Error('WhatsApp is not configured. Set the API key and Phone Number ID in Communications → Settings.');
    }
    const recipients = uniq(to.map(t => (0, exports.normalizePhone)(t)));
    const results = [];
    for (const r of recipients) {
        let result;
        try {
            const resp = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: r, type: 'text', text: { preview_url: false, body: message } }),
            });
            const data = await resp.json().catch(() => ({}));
            const ok = resp.ok && Array.isArray(data?.messages);
            result = { to: r, status: ok ? 'sent' : 'failed', error: ok ? null : (data?.error?.message || `HTTP ${resp.status}`) };
        }
        catch (e) {
            result = { to: r, status: 'failed', error: e.message };
        }
        results.push(result);
        db.collection('whatsapp_logs').insertOne({
            to: r, message, status: result.status, error: result.error || null,
            channel: 'whatsapp', createdAt: new Date(),
        }).catch(() => { });
    }
    return results;
};
exports.sendWhatsApp = sendWhatsApp;
const dbFromReq = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
exports.dbFromReq = dbFromReq;
