/**
 * Extra checks before students are deleted FOR GOOD (emptied from the Trash):
 *   1. the school administrator's password, and
 *   2. a one-time code emailed to that administrator.
 * Stored in the platform (meta) DB — never in the school's own DB, so a school user can't read or edit it.
 */
import crypto from 'crypto';
import { Db, ObjectId } from 'mongodb';

export const OTP_TTL_MIN = 10;
export const MAX_OTP_TRIES = 5;      // wrong codes before the code is thrown away
const MAX_PW_FAILS = 5;              // wrong passwords …
const PW_WINDOW_MIN = 15;            // … within this many minutes locks further tries

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const tid = (tenantId: string) => { try { return new ObjectId(tenantId); } catch { return tenantId as any; } };

/** A stable key for "this exact set of archived students" so a code can't be reused for a different set. */
export const idsKey = (ids: string[]) => sha([...new Set(ids)].sort().join(','));

/** The school's administrator account (the one created when the school registered). */
export async function findSchoolAdmin(meta: Db, tenantId: string): Promise<any | null> {
    const id = tid(tenantId);
    const q = { $or: [{ isSchoolAdmin: true }, { role: 'school_admin' }] };
    return (await meta.collection('User').findOne({ tenantId: id, ...q })) || (await meta.collection('User').findOne({ tenantId, ...q }));
}

export const maskEmail = (email: string) => {
    const [name = '', domain = ''] = String(email).split('@');
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
};

// ── password attempts ────────────────────────────────────────────────────────
export async function passwordLocked(meta: Db, tenantId: string): Promise<boolean> {
    const since = new Date(Date.now() - PW_WINDOW_MIN * 60_000);
    return (await meta.collection('purge_password_failures').countDocuments({ tenantId, at: { $gte: since } })) >= MAX_PW_FAILS;
}
export async function recordPasswordFailure(meta: Db, tenantId: string, by: string) {
    await meta.collection('purge_password_failures').insertOne({ tenantId, by, at: new Date() });
}

// ── one-time codes ───────────────────────────────────────────────────────────
/** Create a fresh 6-digit code (older unused ones for this person are cancelled). */
export async function issueOtp(meta: Db, opts: { tenantId: string; requester: string; ids: string[]; adminEmail: string }): Promise<string> {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const salt = crypto.randomBytes(8).toString('hex');
    await meta.collection('purge_otps').updateMany({ tenantId: opts.tenantId, requester: opts.requester, used: false }, { $set: { used: true, cancelled: true } });
    await meta.collection('purge_otps').insertOne({
        tenantId: opts.tenantId, requester: opts.requester, idsKey: idsKey(opts.ids), adminEmail: opts.adminEmail,
        salt, otpHash: sha(salt + code), attempts: 0, used: false, createdAt: new Date(), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
    });
    return code;
}
export async function cancelOtps(meta: Db, tenantId: string, requester: string) {
    await meta.collection('purge_otps').updateMany({ tenantId, requester, used: false }, { $set: { used: true, cancelled: true } });
}

export type OtpResult = { ok: true } | { ok: false; reason: 'none' | 'expired' | 'wrong' | 'locked'; attemptsLeft?: number };

/** Check a code. A correct code is consumed (single use); wrong ones are counted and the code dies after MAX_OTP_TRIES. */
export async function verifyOtp(meta: Db, opts: { tenantId: string; requester: string; ids: string[]; code: string }): Promise<OtpResult> {
    const doc: any = await meta.collection('purge_otps').findOne(
        { tenantId: opts.tenantId, requester: opts.requester, idsKey: idsKey(opts.ids), used: false },
        { sort: { createdAt: -1 } },
    );
    if (!doc) return { ok: false, reason: 'none' };
    if (new Date(doc.expiresAt) < new Date()) { await meta.collection('purge_otps').updateOne({ _id: doc._id }, { $set: { used: true } }); return { ok: false, reason: 'expired' }; }
    if (doc.attempts >= MAX_OTP_TRIES) return { ok: false, reason: 'locked' };

    const given = sha(doc.salt + String(opts.code || '').trim());
    const match = given.length === doc.otpHash.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(doc.otpHash));
    if (!match) {
        const attempts = doc.attempts + 1;
        await meta.collection('purge_otps').updateOne({ _id: doc._id }, { $set: { attempts, ...(attempts >= MAX_OTP_TRIES ? { used: true } : {}) } });
        return attempts >= MAX_OTP_TRIES ? { ok: false, reason: 'locked' } : { ok: false, reason: 'wrong', attemptsLeft: MAX_OTP_TRIES - attempts };
    }
    // consume atomically so two requests can't both succeed with the same code
    const used = await meta.collection('purge_otps').updateOne({ _id: doc._id, used: false }, { $set: { used: true, usedAt: new Date() } });
    return used.modifiedCount ? { ok: true } : { ok: false, reason: 'none' };
}
