/**
 * Sign-in security for school users (mounted at /api/v1/auth):
 *   - email one-time code step  (POST /2fa/verify, /2fa/resend)
 *   - Continue with Google       (GET /google/config, POST /google/login)
 *   - each person's own settings (GET /account-security, POST /google/link|unlink, /2fa/enable)
 * Policy (2FA mode, Google client id) is set by the owner: GET/POST /api/v1/owner/school-auth.
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ObjectId, Db } from 'mongodb';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';
import { isSchoolId, normalizeSchoolId } from '../lib/schoolId';
import {
    getSchoolAuthPolicy, verifyChallenge, resendChallenge, verifyGoogleCredential, forgetDevices, maskEmail,
} from '../lib/schoolLogin';
import { userLoginPayload, staffLoginPayload } from './auth.routes';

const router = Router();
const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const fail = (res: any, e: any) => res.status(e?.status || 500).json({ message: e?.message || 'Something went wrong' });

// The school this request is for: tenancy middleware, else the body's subdomain / School ID.
async function schoolOf(req: any): Promise<{ tenant: any; db: Db } | null> {
    const meta = getMetaDb();
    let tenant: any = null;
    if (req.tenantContext?.tenantId) tenant = await meta.collection('Tenant').findOne({ _id: oid(req.tenantContext.tenantId) as any });
    const sub = String(req.body?.subdomain || req.query?.subdomain || '').trim();
    if (!tenant && sub) {
        tenant = isSchoolId(sub)
            ? await meta.collection('Tenant').findOne({ shulecloudId: normalizeSchoolId(sub) })
            : await meta.collection('Tenant').findOne({ subdomain: sub.toLowerCase() });
    }
    if (!tenant) return null;
    return { tenant, db: req.tenantDb || getTenantDb(tenant.databaseName || subdomainToDbName(tenant.subdomain)) };
}

// The signed-in person (admin-app user token or staff token).
async function me(req: any): Promise<{ kind: 'user' | 'staff'; doc: any; tenantId: string | null; db: Db | null } | null> {
    const raw = String(req.headers.authorization || '').split(' ')[1];
    if (!raw) return null;
    let claims: any = null;
    for (const secret of [process.env.JWT_SECRET || 'secret', process.env.JWT_SECRET || 'shulecloud_student_secret_2024']) {
        try { claims = jwt.verify(raw, secret); break; } catch { /* try next */ }
    }
    if (!claims) return null;
    if (claims.sub) {
        const doc = await getMetaDb().collection('User').findOne({ _id: oid(claims.sub) as any });
        return doc ? { kind: 'user', doc, tenantId: String(doc.tenantId || claims.tenantId || '') || null, db: req.tenantDb || null } : null;
    }
    if (claims.staffId) {
        const school = await schoolOf(req);
        if (!school) return null;
        const doc = await school.db.collection('staff').findOne({ _id: oid(claims.staffId) as any });
        return doc ? { kind: 'staff', doc, tenantId: String(school.tenant._id), db: school.db } : null;
    }
    return null;
}

// ── Public ───────────────────────────────────────────────────────────────────
router.get('/google/config', async (_req, res) => {
    try {
        const p = await getSchoolAuthPolicy();
        res.json({ enabled: p.googleEnabled, clientId: p.googleEnabled ? p.googleClientId : '', twoFactorMode: p.twoFactorMode });
    } catch (e) { fail(res, e); }
});

router.post('/2fa/verify', async (req, res) => {
    try {
        const { challengeId, code, remember } = req.body || {};
        if (!challengeId || !code) return res.status(400).json({ message: 'Enter the 6-digit code' });
        const r = await verifyChallenge(String(challengeId), String(code), !!remember);
        res.status(r.status).json(r.body);
    } catch (e) { fail(res, e); }
});

router.post('/2fa/resend', async (req, res) => {
    try {
        const r = await resendChallenge(String(req.body?.challengeId || ''));
        res.status(r.status).json(r.body);
    } catch (e) { fail(res, e); }
});

/**
 * Continue with Google. Finds the account at THIS school that linked this Google account.
 * app: 'teacher' answers in the teacher-app shape ({ token, staff }).
 */
router.post('/google/login', async (req, res) => {
    try {
        const g = await verifyGoogleCredential(String(req.body?.credential || req.body?.idToken || ''));
        const school = await schoolOf(req);
        if (!school) return res.status(400).json({ message: 'Choose your school first (School ID or school address).' });
        const { tenant, db } = school;
        if (tenant.status && tenant.status !== 'active') return res.status(403).json({ message: 'This school account is not active.' });
        const tenantId = String(tenant._id);
        const ctx = { tenantId, tenantSubdomain: tenant.subdomain };
        const app = String(req.body?.app || 'web');

        const user = app === 'teacher' ? null : await getMetaDb().collection('User').findOne({ googleSub: g.sub, tenantId: { $in: [tenantId, oid(tenantId)] } as any });
        if (user) {
            const { payload } = await userLoginPayload(user, user.email, { ...ctx, tenantDb: db });
            return res.json({ ...payload, via: 'google' });
        }
        const staff: any = await db.collection('staff').findOne({ googleSub: g.sub });
        if (staff) {
            if (app === 'teacher') {
                if ((staff.portalAccess || 'both').toLowerCase() === 'admin') return res.status(403).json({ message: 'You are assigned to the main school portal. Please sign in there instead.' });
                const token = jwt.sign({ staffId: staff._id.toString(), username: staff.portalUsername, role: staff.role || 'teacher', name: staff.employeeName || staff.name }, process.env.JWT_SECRET || 'shulecloud_student_secret_2024', { expiresIn: '7d' });
                return res.json({ token, staff: { _id: staff._id, name: staff.employeeName || staff.name, designation: staff.designation || 'Teacher', portalUsername: staff.portalUsername, email: staff.email, phone: staff.phone }, via: 'google' });
            }
            const { payload } = staffLoginPayload(staff, staff.portalUsername || staff.email || '', ctx);
            return res.json({ ...payload, via: 'google' });
        }
        res.status(404).json({
            code: 'GOOGLE_NOT_LINKED',
            message: `${g.email} is not linked to an account at ${tenant.instituteName || tenant.name || 'this school'}. Sign in with your password once, then link Google from your profile.`,
        });
    } catch (e) { fail(res, e); }
});

// ── Signed-in person ─────────────────────────────────────────────────────────
router.get('/account-security', async (req, res) => {
    try {
        const who = await me(req);
        if (!who) return res.status(401).json({ message: 'Sign in again' });
        const p = await getSchoolAuthPolicy();
        const d = who.doc;
        const adminApp = who.kind === 'user' || (d.portalAccess || 'both').toLowerCase() !== 'teacher';
        res.json({
            kind: who.kind,
            email: d.email || '',
            google: { enabled: p.googleEnabled, clientId: p.googleEnabled ? p.googleClientId : '', linked: !!d.googleSub, email: d.googleEmail || '', linkedAt: d.googleLinkedAt || null },
            twoFactor: {
                mode: p.twoFactorMode,
                enabled: p.twoFactorMode === 'required' && adminApp ? true : !!d.twoFactorEnabled,
                enforced: p.twoFactorMode === 'required' && adminApp,
                available: p.twoFactorMode !== 'off',
                sendsTo: d.email ? maskEmail(d.email) : '',
            },
        });
    } catch (e) { fail(res, e); }
});

const collOf = (who: any) => (who.kind === 'user' ? getMetaDb().collection('User') : who.db!.collection('staff'));

router.post('/google/link', async (req, res) => {
    try {
        const who = await me(req);
        if (!who) return res.status(401).json({ message: 'Sign in again' });
        const g = await verifyGoogleCredential(String(req.body?.credential || req.body?.idToken || ''));
        if (!g.emailVerified) return res.status(400).json({ message: 'That Google account has no verified email.' });
        // One Google account → one person per school
        const tid = who.tenantId;
        const takenUser = await getMetaDb().collection('User').findOne({ googleSub: g.sub, _id: { $ne: who.kind === 'user' ? who.doc._id : null }, ...(tid ? { tenantId: { $in: [tid, oid(tid)] } } : {}) } as any);
        const takenStaff = who.db ? await who.db.collection('staff').findOne({ googleSub: g.sub, _id: { $ne: who.kind === 'staff' ? who.doc._id : null } } as any) : null;
        if (takenUser || takenStaff) return res.status(409).json({ message: `${g.email} is already linked to another account at this school.` });
        await collOf(who).updateOne({ _id: who.doc._id }, { $set: { googleSub: g.sub, googleEmail: g.email, googleLinkedAt: new Date(), googlePicture: g.picture } });
        res.json({ message: `Linked ${g.email}. You can now use Continue with Google.`, email: g.email });
    } catch (e) { fail(res, e); }
});

router.post('/google/unlink', async (req, res) => {
    try {
        const who = await me(req);
        if (!who) return res.status(401).json({ message: 'Sign in again' });
        await collOf(who).updateOne({ _id: who.doc._id }, { $unset: { googleSub: '', googleEmail: '', googleLinkedAt: '', googlePicture: '' } });
        res.json({ message: 'Google account unlinked' });
    } catch (e) { fail(res, e); }
});

router.post('/2fa/enable', async (req, res) => {
    try {
        const who = await me(req);
        if (!who) return res.status(401).json({ message: 'Sign in again' });
        const p = await getSchoolAuthPolicy();
        const on = !!req.body?.enabled;
        const d = who.doc;
        if (on) {
            if (p.twoFactorMode === 'off') return res.status(400).json({ message: 'Two-step sign-in is switched off for all schools.' });
            if (!d.email) return res.status(400).json({ message: 'Add an email address to your profile first — codes are sent there.' });
        } else {
            if (p.twoFactorMode === 'required' && (who.kind === 'user' || (d.portalAccess || 'both').toLowerCase() !== 'teacher')) return res.status(400).json({ message: 'Two-step sign-in is required for school admins and cannot be turned off.' });
            // turning protection off needs the password
            const pw = String(req.body?.password || '');
            const ok = who.kind === 'user' ? await bcrypt.compare(pw, d.passwordHash || '').catch(() => false) : (!!pw && pw === d.portalPassword);
            if (!ok) return res.status(401).json({ message: 'Enter your current password to turn this off.' });
            await forgetDevices({ kind: who.kind, id: String(d._id), tenantId: who.tenantId });
        }
        await collOf(who).updateOne({ _id: d._id }, { $set: { twoFactorEnabled: on, twoFactorChangedAt: new Date() } });
        res.json({ message: on ? 'Two-step sign-in is on. Next time you sign in, enter the code we email you.' : 'Two-step sign-in is off.', enabled: on });
    } catch (e) { fail(res, e); }
});

router.post('/trusted-devices/forget', async (req, res) => {
    try {
        const who = await me(req);
        if (!who) return res.status(401).json({ message: 'Sign in again' });
        await forgetDevices({ kind: who.kind, id: String(who.doc._id), tenantId: who.tenantId });
        res.json({ message: 'Every remembered device will be asked for a code again.' });
    } catch (e) { fail(res, e); }
});

export default router;
