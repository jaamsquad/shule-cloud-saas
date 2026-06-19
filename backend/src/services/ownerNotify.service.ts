/**
 * Owner-portal notifications — delivers messages to owner-portal users over
 * Email (Company SMTP) and WhatsApp (the platform QR session, key 'platform').
 *
 * Used for: login OTPs, and new-account credential delivery.
 * All sends are best-effort and report which channels actually succeeded.
 */
import { getDb } from '../lib/mongodb';
import { normalizePhone } from './communications.service';

export interface OwnerDeliveryResult { email: boolean; whatsapp: boolean; errors: string[] }

/** Read the company SMTP settings (set by the Super Owner under Settings). */
async function companySmtp(): Promise<any | null> {
    const s: any = await getDb().collection('platform_email_settings').findOne({ key: 'smtp' });
    if (!s?.host || !s?.user || !s?.pass) return null;
    return s;
}

async function sendOwnerEmail(to: string, subject: string, html: string): Promise<void> {
    const s = await companySmtp();
    if (!s) throw new Error('Company email (SMTP) is not configured');
    const nodemailer = (await import('nodemailer')).default;
    const port = Number(s.port) || 587;
    const transporter = nodemailer.createTransport({
        host: s.host, port, secure: port === 465, requireTLS: port !== 465,
        auth: { user: s.user, pass: s.pass },
        connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000,
    });
    const fromName = s.fromName || 'ShuleCloud';
    await transporter.sendMail({ from: `"${fromName}" <${s.user}>`, to, subject, html });
}

async function sendOwnerWhatsApp(phone: string, message: string): Promise<void> {
    const { whatsAppManager } = await import('./whatsapp/SessionManager');
    const status = await whatsAppManager.getStatus('platform');
    if (status.status !== 'connected') throw new Error('Platform WhatsApp is not connected');
    await whatsAppManager.sendText('platform', normalizePhone(phone), message);
}

/**
 * Deliver a message to an owner over both channels (best-effort).
 * `emailHtml` is the HTML body; `whatsappText` is the plain WhatsApp body.
 */
export async function notifyOwner(
    target: { email?: string; phone?: string },
    subject: string,
    emailHtml: string,
    whatsappText: string,
): Promise<OwnerDeliveryResult> {
    const result: OwnerDeliveryResult = { email: false, whatsapp: false, errors: [] };

    if (target.email) {
        try { await sendOwnerEmail(target.email, subject, emailHtml); result.email = true; }
        catch (e: any) { result.errors.push(`email: ${e.message}`); }
    }
    if (target.phone) {
        try { await sendOwnerWhatsApp(target.phone, whatsappText); result.whatsapp = true; }
        catch (e: any) { result.errors.push(`whatsapp: ${e.message}`); }
    }
    return result;
}

const OWNER_LOGIN_URL = 'https://shulecloud.com/owner/login';

/** Build + send a login OTP to an owner. */
export async function sendOwnerOtp(target: { email?: string; phone?: string; name?: string }, code: string): Promise<OwnerDeliveryResult> {
    const subject = 'Your ShuleCloud owner login code';
    const html = `
        <div style="font-family:Arial,sans-serif;color:#1f2937;max-width:480px;margin:auto">
            <h2 style="color:#534AB7">ShuleCloud Owner Portal</h2>
            <p>Hello ${target.name || ''},</p>
            <p>Your one-time login code is:</p>
            <p style="font-size:30px;font-weight:900;letter-spacing:6px;color:#534AB7">${code}</p>
            <p style="color:#6b7280;font-size:13px">This code expires in 10 minutes. If you didn't try to sign in, ignore this message.</p>
        </div>`;
    const text = `ShuleCloud owner login code: ${code}\nThis code expires in 10 minutes. If you didn't request it, ignore this message.`;
    return notifyOwner(target, subject, html, text);
}

/** Send new-account credentials + the login link to a newly created owner user. */
export async function sendOwnerCredentials(target: { email: string; phone?: string; name?: string }, password: string): Promise<OwnerDeliveryResult> {
    const subject = 'Your ShuleCloud owner account';
    const html = `
        <div style="font-family:Arial,sans-serif;color:#1f2937;max-width:520px;margin:auto">
            <h2 style="color:#534AB7">Welcome to ShuleCloud</h2>
            <p>Hello ${target.name || ''}, an account has been created for you on the ShuleCloud owner portal.</p>
            <table style="border-collapse:collapse;margin:14px 0">
                <tr><td style="padding:6px 12px;color:#6b7280">Email</td><td style="padding:6px 12px;font-weight:700">${target.email}</td></tr>
                <tr><td style="padding:6px 12px;color:#6b7280">Password</td><td style="padding:6px 12px;font-weight:700">${password}</td></tr>
            </table>
            <p><a href="${OWNER_LOGIN_URL}" style="display:inline-block;background:#534AB7;color:#fff;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:700">Log in to ShuleCloud</a></p>
            <p style="color:#6b7280;font-size:12px">Or visit ${OWNER_LOGIN_URL}. Please change your password after your first login.</p>
        </div>`;
    const text = `Welcome to ShuleCloud Owner Portal.\nEmail: ${target.email}\nPassword: ${password}\nLogin: ${OWNER_LOGIN_URL}\nPlease change your password after first login.`;
    return notifyOwner(target, subject, html, text);
}
