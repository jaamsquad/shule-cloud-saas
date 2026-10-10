/**
 * Student sign-out with a parent one-time code (Front Desk → Student Sign Out).
 *
 *   send   a 6-digit code goes by SMS to the parent/guardian phones on the student's record
 *          (and email where there is one); valid 10 minutes, at most one new code a minute
 *   record the sign-out is saved; with a code it is checked here (5 tries) and the record is
 *          marked "OTP verified" — the browser can't just claim it was verified
 *
 * Collection: `signout_otps` (code stored hashed).
 */
import crypto from 'crypto';
import { Db, ObjectId } from 'mongodb';

const TTL_MIN = 10, MAX_TRIES = 5, RESEND_SEC = 60;
const hash = (code: string) => crypto.createHash('sha256').update(`signout:${code}`).digest('hex');
const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const nameOf = (s: any) => s?.studentName || `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || s?.name || 'your child';
const mask = (p: string) => p.length > 4 ? `${p.slice(0, 4)}${'•'.repeat(Math.max(0, p.length - 7))}${p.slice(-3)}` : p;
const maskMail = (e: string) => e.replace(/^(.)(.*)(@.*)$/, (_m, a, b, c) => `${a}${'•'.repeat(Math.min(6, b.length))}${c}`);

export const parentPhones = (s: any): string[] =>
    [...new Set([s?.parentPhone, s?.fatherPhone, s?.motherPhone, s?.guardianPhone, s?.parentContact, s?.emergencyPhone].map(v => String(v || '').trim()).filter(v => v.replace(/\D/g, '').length >= 9))];
export const parentEmails = (s: any): string[] =>
    [...new Set([s?.parentEmail, s?.fatherEmail, s?.motherEmail, s?.guardianEmail].map(v => String(v || '').trim()).filter(v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)))];

type Senders = {
    sms?: (db: Db, schoolId: string, phones: string[], message: string) => Promise<any>;
    email?: (db: Db, to: string[], subject: string, message: string) => Promise<{ status: string }[]>;
};
const defaultSenders: Required<Senders> = {
    sms: async (db, schoolId, phones, message) => (await import('../services/smsGateway.service')).queueSms(db, schoolId, phones, message, { audience: 'signout-otp' }),
    email: async (db, to, subject, message) => (await import('../services/communications.service')).sendEmail(db, { to, subject, message }),
};

export async function sendSignoutOtp(db: Db, schoolId: string, studentId: string, opts: { pickedBy?: string; reason?: string; schoolName?: string } = {}, senders: Senders = {}) {
    const send = { ...defaultSenders, ...senders };
    const id = oid(studentId);
    const s: any = id ? await db.collection('students').findOne({ _id: id }) : null;
    if (!s) return { error: 'Student not found', status: 404 };
    const phones = parentPhones(s), emails = parentEmails(s);
    if (!phones.length && !emails.length) return { error: `No parent phone number or email on ${nameOf(s)}'s record. Add one in the student's profile.`, status: 400 };

    const recent: any = await db.collection('signout_otps').findOne({ studentId: String(s._id), createdAt: { $gt: new Date(Date.now() - RESEND_SEC * 1000) } });
    if (recent) return { error: 'A code was sent less than a minute ago — wait a moment before sending another.', status: 429 };

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const who = opts.pickedBy ? ` by ${opts.pickedBy}` : '';
    const message = `${nameOf(s)} is being signed out of school${who}${opts.reason ? ` (${opts.reason})` : ''}. If you agree, give the school this code: ${code}. It expires in ${TTL_MIN} minutes.`;

    const sentTo: string[] = [];
    let smsError = '';
    if (phones.length) {
        try {
            const r: any = await send.sms(db, schoolId, phones, message);
            if (r.queued > 0 && (r.sent > 0 || !r.immediate)) sentTo.push(...phones.map(mask));
            else smsError = r.error || 'SMS could not be sent';
        } catch (e: any) { smsError = e.message; }
    }
    if (emails.length) {
        try {
            const r = await send.email(db, emails, `${opts.schoolName || 'School'}: sign-out code for ${nameOf(s)}`, message);
            if (r.some(x => x.status === 'sent')) sentTo.push(...emails.map(maskMail));
        } catch { /* email optional */ }
    }
    if (!sentTo.length) return { error: `The code could not be sent${smsError ? `: ${smsError}` : ''}. Check SMS settings under Communication.`, status: 502 };

    await db.collection('signout_otps').updateMany({ studentId: String(s._id), usedAt: { $exists: false } }, { $set: { replacedAt: new Date() } });
    await db.collection('signout_otps').insertOne({ studentId: String(s._id), codeHash: hash(code), sentTo, tries: 0, createdAt: new Date(), expiresAt: new Date(Date.now() + TTL_MIN * 60_000) });
    return { ok: true, sentTo, expiresInMin: TTL_MIN };
}

/** Check a code; on success it is used up. */
export async function checkSignoutOtp(db: Db, studentId: string, code: string): Promise<{ ok: true; sentTo: string[] } | { ok: false; error: string }> {
    const otp: any = await db.collection('signout_otps').findOne(
        { studentId: String(studentId), usedAt: { $exists: false }, replacedAt: { $exists: false } },
        { sort: { createdAt: -1 } } as any,
    );
    if (!otp) return { ok: false, error: 'No code has been sent for this student — send one first.' };
    if (new Date(otp.expiresAt) < new Date()) return { ok: false, error: 'The code has expired — send a new one.' };
    if (otp.tries >= MAX_TRIES) return { ok: false, error: 'Too many wrong tries — send a new code.' };
    if (hash(String(code || '').replace(/\D/g, '')) !== otp.codeHash) {
        const left = MAX_TRIES - (Number(otp.tries) || 0) - 1;
        await db.collection('signout_otps').updateOne({ _id: otp._id }, { $inc: { tries: 1 } });
        return { ok: false, error: left > 0 ? `Wrong code (${left} ${left === 1 ? 'try' : 'tries'} left).` : 'Wrong code — send a new one.' };
    }
    await db.collection('signout_otps').updateOne({ _id: otp._id }, { $set: { usedAt: new Date() } });
    return { ok: true, sentTo: otp.sentTo || [] };
}
