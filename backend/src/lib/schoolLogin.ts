/**
 * School sign-in security: email one-time codes (2FA) and "Continue with Google".
 *
 * The owner sets the policy in the owner portal (platform_settings.schoolAuth):
 *   twoFactorMode  off | optional | required   (required = every admin-app sign-in)
 *   googleEnabled + googleClientId (web client id, also the Android "server client id")
 *
 * A password sign-in that needs a code does not get its session yet: the ready response
 * is parked in school_login_challenges and handed over only after the emailed code is
 * entered. Google sign-in skips the code — Google already verified the person.
 */
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getMetaDb, getTenantDb, subdomainToDbName } from './mongodb';

export type TwoFactorMode = 'off' | 'optional' | 'required';
export interface SchoolAuthPolicy {
    twoFactorMode: TwoFactorMode;
    otpMinutes: number;
    trustDays: number;               // "remember this device" length (0 = never remember)
    googleEnabled: boolean;
    googleClientId: string;          // OAuth web client id
    googleExtraClientIds: string[];  // Android / iOS client ids that may also sign tokens
}

const DEFAULTS: SchoolAuthPolicy = { twoFactorMode: 'optional', otpMinutes: 10, trustDays: 30, googleEnabled: false, googleClientId: '', googleExtraClientIds: [] };

export async function getSchoolAuthPolicy(): Promise<SchoolAuthPolicy> {
    const doc: any = await getMetaDb().collection('platform_settings').findOne({}).catch(() => null);
    const s = doc?.schoolAuth || {};
    const clientId = String(s.googleClientId || process.env.GOOGLE_CLIENT_ID || '').trim();
    return {
        twoFactorMode: (['off', 'optional', 'required'].includes(s.twoFactorMode) ? s.twoFactorMode : DEFAULTS.twoFactorMode) as TwoFactorMode,
        otpMinutes: Math.min(30, Math.max(3, Number(s.otpMinutes) || DEFAULTS.otpMinutes)),
        trustDays: Math.min(90, Math.max(0, s.trustDays === undefined ? DEFAULTS.trustDays : Number(s.trustDays) || 0)),
        googleEnabled: s.googleEnabled === undefined ? !!clientId : !!s.googleEnabled && !!clientId,
        googleClientId: clientId,
        googleExtraClientIds: (Array.isArray(s.googleExtraClientIds) ? s.googleExtraClientIds : String(s.googleExtraClientIds || '').split(/[\s,]+/)).map((x: any) => String(x).trim()).filter(Boolean),
    };
}

export async function saveSchoolAuthPolicy(input: any) {
    const set: any = {};
    if (input.twoFactorMode !== undefined) {
        if (!['off', 'optional', 'required'].includes(input.twoFactorMode)) throw new Error('Invalid 2FA mode');
        set['schoolAuth.twoFactorMode'] = input.twoFactorMode;
    }
    if (input.otpMinutes !== undefined) set['schoolAuth.otpMinutes'] = Math.min(30, Math.max(3, Number(input.otpMinutes) || 10));
    if (input.trustDays !== undefined) set['schoolAuth.trustDays'] = Math.min(90, Math.max(0, Number(input.trustDays) || 0));
    if (input.googleEnabled !== undefined) set['schoolAuth.googleEnabled'] = !!input.googleEnabled;
    if (input.googleClientId !== undefined) {
        const id = String(input.googleClientId || '').trim();
        if (id && !/\.apps\.googleusercontent\.com$/.test(id)) throw new Error('A Google client ID ends with .apps.googleusercontent.com');
        set['schoolAuth.googleClientId'] = id;
    }
    if (input.googleExtraClientIds !== undefined) {
        set['schoolAuth.googleExtraClientIds'] = (Array.isArray(input.googleExtraClientIds) ? input.googleExtraClientIds : String(input.googleExtraClientIds || '').split(/[\s,]+/)).map((x: any) => String(x).trim()).filter(Boolean);
    }
    set['schoolAuth.updatedAt'] = new Date();
    await getMetaDb().collection('platform_settings').updateOne({}, { $set: set }, { upsert: true });
}

// ── Who is signing in ────────────────────────────────────────────────────────
export interface LoginSubject {
    kind: 'user' | 'staff';
    id: string;
    tenantId: string | null;
    tenantSubdomain?: string;
    email?: string;
    name?: string;
    adminApp: boolean;              // lands on the admin app (2FA "required" applies)
    twoFactorEnabled?: boolean;     // the person turned it on themselves
}
export const subjectKey = (s: { kind: string; id: string; tenantId?: string | null }) => `${s.kind}:${s.tenantId || '-'}:${s.id}`;

export const maskEmail = (e: string) => {
    const [u, d] = String(e || '').split('@');
    if (!d) return e;
    return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, Math.min(6, u.length - 2)))}@${d}`;
};

const sha = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const safeEq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

let indexed = false;
async function col(name: 'school_login_challenges' | 'school_trusted_devices') {
    const c = getMetaDb().collection(name);
    if (!indexed) {
        indexed = true;
        await getMetaDb().collection('school_login_challenges').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 3600 }).catch(() => {});
        await getMetaDb().collection('school_trusted_devices').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    }
    return c;
}

export function needsSecondFactor(policy: SchoolAuthPolicy, s: LoginSubject): boolean {
    if (policy.twoFactorMode === 'off') return false;
    if (policy.twoFactorMode === 'required' && s.adminApp) return true;
    return !!s.twoFactorEnabled;
}

async function tenantInfo(tenantId: string | null) {
    if (!tenantId) return null;
    try { return await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(tenantId) }); } catch { return null; }
}

/** Email the code — from the school's own mail settings, else the platform's company mail. */
async function sendCode(s: LoginSubject, code: string, minutes: number) {
    const tenant: any = await tenantInfo(s.tenantId);
    const school = tenant?.instituteName || tenant?.name || 'ShuleCloud';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1e293b">
        <h2 style="color:#5C67F2;margin-bottom:4px">${school}</h2>
        <p>Hi ${s.name || ''}, use this code to finish signing in:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f1f5f9;padding:14px 0;text-align:center;border-radius:10px">${code}</p>
        <p style="font-size:13px;color:#64748b">It expires in ${minutes} minutes. If you did not try to sign in, change your password — someone knows it.</p>
      </div>`;
    const subject = `${code} is your ${school} sign-in code`;
    if (tenant) {
        try {
            const { sendEmail } = await import('../services/communications.service');
            const db = getTenantDb(tenant.databaseName || subdomainToDbName(tenant.subdomain));
            const r = await sendEmail(db, { to: [s.email!], subject, html });
            if (r.some(x => x.status === 'sent')) return;
        } catch { /* fall back to platform mail */ }
    }
    const { notifyOwner } = await import('../services/ownerNotify.service');
    const r = await notifyOwner({ email: s.email }, subject, html, '');
    if (!r.email) throw new Error('The sign-in code could not be emailed. Ask the school to check its email settings.');
}

/**
 * Send the ready sign-in response, or — when a code is needed — email one and send
 * { twoFactorRequired, challengeId } instead. A remembered device skips the code.
 */
export async function finishSchoolLogin(req: any, res: any, payload: any, s: LoginSubject) {
    const policy = await getSchoolAuthPolicy();
    if (!needsSecondFactor(policy, s)) return res.json(payload);
    if (!s.email || !/@/.test(s.email)) {
        // No email to send to — never lock anyone out; tell them to add one.
        return res.json({ ...payload, twoFactorWarning: 'Add an email address to your profile so sign-in codes can reach you.' });
    }
    const trust = String(req.body?.trustToken || req.headers['x-trust-token'] || '');
    if (trust) {
        const dev = await (await col('school_trusted_devices')).findOne({ key: subjectKey(s), hash: sha(trust), expiresAt: { $gt: new Date() } });
        if (dev) return res.json(payload);
    }
    const challengeId = crypto.randomBytes(18).toString('hex');
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const now = new Date();
    await (await col('school_login_challenges')).insertOne({
        _id: challengeId as any, key: subjectKey(s), subject: s, codeHash: sha(`${challengeId}:${code}`),
        payload, attempts: 0, sends: 1, lastSentAt: now, createdAt: now, expiresAt: new Date(now.getTime() + policy.otpMinutes * 60_000),
    });
    try { await sendCode(s, code, policy.otpMinutes); }
    catch (e: any) {
        await (await col('school_login_challenges')).deleteOne({ _id: challengeId as any });
        return res.status(503).json({ message: e.message || 'Could not send the sign-in code' });
    }
    return res.json({ twoFactorRequired: true, method: 'email', challengeId, sentTo: maskEmail(s.email), expiresInMinutes: policy.otpMinutes, canRemember: policy.trustDays > 0, trustDays: policy.trustDays });
}

export async function verifyChallenge(challengeId: string, code: string, remember: boolean) {
    const c = await col('school_login_challenges');
    const ch: any = await c.findOne({ _id: String(challengeId) as any });
    if (!ch || ch.expiresAt < new Date()) return { status: 400, body: { message: 'This code has expired. Sign in again to get a new one.', expired: true } };
    if (ch.attempts >= 5) { await c.deleteOne({ _id: ch._id }); return { status: 429, body: { message: 'Too many wrong codes. Sign in again.', expired: true } }; }
    const clean = String(code || '').replace(/\D/g, '');
    if (!safeEq(sha(`${ch._id}:${clean}`), ch.codeHash)) {
        await c.updateOne({ _id: ch._id }, { $inc: { attempts: 1 } });
        return { status: 400, body: { message: `Wrong code. ${4 - ch.attempts} attempt(s) left.` } };
    }
    await c.deleteOne({ _id: ch._id });
    const body: any = { ...ch.payload };
    const policy = await getSchoolAuthPolicy();
    if (remember && policy.trustDays > 0) {
        const token = crypto.randomBytes(32).toString('hex');
        await (await col('school_trusted_devices')).insertOne({ key: ch.key, hash: sha(token), createdAt: new Date(), expiresAt: new Date(Date.now() + policy.trustDays * 864e5) });
        body.trustToken = token;
    }
    return { status: 200, body };
}

export async function resendChallenge(challengeId: string) {
    const c = await col('school_login_challenges');
    const ch: any = await c.findOne({ _id: String(challengeId) as any });
    if (!ch || ch.expiresAt < new Date()) return { status: 400, body: { message: 'This sign-in has expired. Sign in again.', expired: true } };
    if (ch.sends >= 5) return { status: 429, body: { message: 'Too many codes sent. Sign in again later.' } };
    const wait = 45_000 - (Date.now() - new Date(ch.lastSentAt).getTime());
    if (wait > 0) return { status: 429, body: { message: `Wait ${Math.ceil(wait / 1000)}s before asking for another code.` } };
    const policy = await getSchoolAuthPolicy();
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await sendCode(ch.subject, code, policy.otpMinutes);
    await c.updateOne({ _id: ch._id }, { $set: { codeHash: sha(`${ch._id}:${code}`), lastSentAt: new Date(), attempts: 0, expiresAt: new Date(Date.now() + policy.otpMinutes * 60_000) }, $inc: { sends: 1 } });
    return { status: 200, body: { message: 'A new code has been sent.', sentTo: maskEmail(ch.subject.email) } };
}

/** Forget every remembered device of a person (after a password change or turning 2FA off). */
export async function forgetDevices(s: { kind: string; id: string; tenantId?: string | null }) {
    await (await col('school_trusted_devices')).deleteMany({ key: subjectKey(s) });
}

// ── Google ID token ──────────────────────────────────────────────────────────
export interface GoogleIdentity { sub: string; email: string; emailVerified: boolean; name: string; picture: string }

/** Verifies a Google ID token with Google and checks it was issued for our client id(s). */
export async function verifyGoogleCredential(credential: string, policy?: SchoolAuthPolicy): Promise<GoogleIdentity> {
    const p = policy || await getSchoolAuthPolicy();
    if (!p.googleEnabled || !p.googleClientId) throw Object.assign(new Error('Google sign-in is not set up yet. Ask ShuleCloud support.'), { status: 400 });
    if (!credential || String(credential).split('.').length !== 3) throw Object.assign(new Error('Invalid Google sign-in'), { status: 400 });
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!r.ok) throw Object.assign(new Error('Google could not confirm this sign-in. Try again.'), { status: 401 });
    const t: any = await r.json();
    const allowed = new Set([p.googleClientId, ...p.googleExtraClientIds]);
    if (!allowed.has(String(t.aud))) throw Object.assign(new Error('This Google sign-in was made for a different app.'), { status: 401 });
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(String(t.iss))) throw Object.assign(new Error('Invalid Google sign-in'), { status: 401 });
    if (Number(t.exp) * 1000 < Date.now()) throw Object.assign(new Error('Google sign-in expired. Try again.'), { status: 401 });
    return { sub: String(t.sub), email: String(t.email || '').toLowerCase(), emailVerified: t.email_verified === true || t.email_verified === 'true', name: t.name || '', picture: t.picture || '' };
}
