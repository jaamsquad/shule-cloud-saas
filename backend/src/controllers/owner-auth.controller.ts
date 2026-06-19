import { Request, Response } from 'express';
import { getDb } from '../lib/mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendOwnerOtp } from '../services/ownerNotify.service';

const OTP_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

const signOwnerToken = (user: any) => jwt.sign(
    { sub: user._id, email: user.email, type: 'owner', role: user.role || 'owner' },
    process.env.OWNER_JWT_SECRET || 'owner_secret',
    { expiresIn: '24h' },
);

const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, (_m, a, b) => `${a}••••${b}`);
const maskPhone = (p?: string) => (p ? p.replace(/\d(?=\d{2})/g, '•') : '');

export const registerOwner = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    try {
        const db = getDb();
        const existing = await db.collection('OwnerUser').findOne({ email });
        if (existing) return res.status(409).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // The first owner account becomes the Super Owner; later self-registrations
        // default to 'owner'. Additional users are created from the portal with a role.
        const count = await db.collection('OwnerUser').countDocuments({});
        const role = count === 0 ? 'super_owner' : (req.body.role || 'owner');

        const result = await db.collection('OwnerUser').insertOne({
            name,
            email,
            phone: req.body.phone || '',
            passwordHash: hashedPassword,
            role,
            status: 'active',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // The very first (bootstrap) Super Owner logs straight in — there's no SMTP
        // configured yet to deliver an OTP. Everyone else goes through OTP at login.
        const token = signOwnerToken({ _id: result.insertedId, email, role });
        return res.status(201).json({
            access_token: token,
            user: { id: result.insertedId, name, email, role }
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Step 1 of login: verify email + password, then issue a one-time code over
 * email (always) + WhatsApp (if the platform session is linked). Returns
 * otpRequired:true — the client then calls /verify-otp with the code.
 */
export const loginOwner = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const db = getDb();
        const user = await db.collection('OwnerUser').findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (user.isActive === false || user.status === 'suspended') {
            return res.status(403).json({ message: 'This account has been suspended.' });
        }

        // Generate + store a hashed 6-digit OTP.
        const code = String(crypto.randomInt(100000, 1000000));
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        await db.collection('OwnerUser').updateOne(
            { _id: user._id },
            { $set: { otpHash: codeHash, otpExpiresAt: new Date(Date.now() + OTP_TTL_MS), otpAttempts: 0 } },
        );

        const delivery = await sendOwnerOtp({ email: user.email, phone: user.phone, name: user.name }, code);

        // Email is the guaranteed channel — if it failed, surface a clear error.
        if (!delivery.email && !delivery.whatsapp) {
            return res.status(500).json({ message: `Could not send your login code. ${delivery.errors.join('; ')}` });
        }

        const channels: string[] = [];
        if (delivery.email) channels.push(`email (${maskEmail(user.email)})`);
        if (delivery.whatsapp) channels.push(`WhatsApp (${maskPhone(user.phone)})`);

        return res.json({
            otpRequired: true,
            email: user.email,
            channels,
            message: `We sent a 6-digit code to your ${channels.join(' and ')}.`,
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Login failed' });
    }
};

/** Step 2 of login: verify the OTP and issue the owner JWT. */
export const verifyOwnerOtp = async (req: Request, res: Response) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });

    try {
        const db = getDb();
        const user = await db.collection('OwnerUser').findOne({ email });
        if (!user || !user.otpHash || !user.otpExpiresAt) {
            return res.status(400).json({ message: 'No pending login. Please sign in again.' });
        }
        if (new Date(user.otpExpiresAt) < new Date()) {
            return res.status(400).json({ message: 'Your code has expired. Please sign in again.' });
        }
        if ((user.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
            await db.collection('OwnerUser').updateOne({ _id: user._id }, { $unset: { otpHash: '', otpExpiresAt: '' } });
            return res.status(429).json({ message: 'Too many incorrect attempts. Please sign in again.' });
        }

        const codeHash = crypto.createHash('sha256').update(String(code)).digest('hex');
        if (codeHash !== user.otpHash) {
            await db.collection('OwnerUser').updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
            return res.status(401).json({ message: 'Incorrect code. Please try again.' });
        }

        // Success — clear the OTP and issue the token.
        await db.collection('OwnerUser').updateOne(
            { _id: user._id },
            { $unset: { otpHash: '', otpExpiresAt: '', otpAttempts: '' }, $set: { lastLoginAt: new Date() } },
        );
        const token = signOwnerToken(user);
        return res.json({
            access_token: token,
            mustChangePassword: !!user.mustChangePassword,
            user: { id: user._id, name: user.name, email: user.email, role: user.role || 'owner' },
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Verification failed' });
    }
};

/** Authenticated owner sets a new password (used by the first-login change-password page). */
export const changeOwnerPassword = async (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    let claims: any;
    try { claims = jwt.verify(auth.split(' ')[1], process.env.OWNER_JWT_SECRET || 'owner_secret'); }
    catch { return res.status(401).json({ message: 'Invalid session' }); }

    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

    try {
        const db = getDb();
        const { ObjectId } = await import('mongodb');
        const user = await db.collection('OwnerUser').findOne({ _id: new ObjectId(String(claims.sub)) });
        if (!user) return res.status(404).json({ message: 'Account not found' });

        // If not a forced first-login change, require the current password.
        if (!user.mustChangePassword) {
            if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.collection('OwnerUser').updateOne(
            { _id: user._id },
            { $set: { passwordHash, updatedAt: new Date() }, $unset: { mustChangePassword: '' } },
        );
        return res.json({ ok: true, message: 'Password updated' });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Could not update password' });
    }
};

/** Resend a fresh OTP for an in-progress login. */
export const resendOwnerOtp = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    try {
        const db = getDb();
        const user = await db.collection('OwnerUser').findOne({ email });
        if (!user) return res.status(404).json({ message: 'Account not found' });

        const code = String(crypto.randomInt(100000, 1000000));
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        await db.collection('OwnerUser').updateOne(
            { _id: user._id },
            { $set: { otpHash: codeHash, otpExpiresAt: new Date(Date.now() + OTP_TTL_MS), otpAttempts: 0 } },
        );
        const delivery = await sendOwnerOtp({ email: user.email, phone: user.phone, name: user.name }, code);
        if (!delivery.email && !delivery.whatsapp) {
            return res.status(500).json({ message: `Could not resend the code. ${delivery.errors.join('; ')}` });
        }
        return res.json({ message: 'A new code has been sent.' });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Resend failed' });
    }
};
