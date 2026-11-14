import { Request, Response } from 'express';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';
import { generateUniqueSchoolId } from '../lib/schoolId';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { notifyOwner } from '../services/ownerNotify.service';
import { creditSmsWallet, getSmsPricing } from '../services/smsWallet.service';

// Use meta db for onboarding (Tenant / User / Plan collections)
const getDb = () => getMetaDb();

const sixDigit = () => String(Math.floor(100000 + Math.random() * 900000));
// Activation code: 3 letters + 4 digits, e.g. "SCH-4827".
const activationCode = () => {
    const letters = Array.from({ length: 3 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
    return `${letters}-${String(Math.floor(1000 + Math.random() * 9000))}`;
};

/** Send the email OTP to the registering school admin (best-effort). */
async function sendSchoolOtp(target: { email?: string; phone?: string; name?: string }, code: string) {
    const subject = 'Verify your ShuleCloud school account';
    const html = `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:480px;margin:auto">
        <h2 style="color:#5C67F2">ShuleCloud</h2>
        <p>Hello ${target.name || ''}, thanks for registering your school.</p>
        <p>Your email verification code is:</p>
        <p style="font-size:30px;font-weight:900;letter-spacing:6px;color:#5C67F2">${code}</p>
        <p style="color:#6b7280;font-size:13px">Enter this code to verify your email. It expires in 15 minutes.</p>
    </div>`;
    const text = `ShuleCloud email verification code: ${code}. Expires in 15 minutes.`;
    try { await notifyOwner({ email: target.email, phone: target.phone }, subject, html, text); } catch { /* best effort */ }
}

/** Alert every owner-portal user that a new school registered (email + WhatsApp). */
async function notifyOwnersNewSchool(db: ReturnType<typeof getDb>, school: { name: string; subdomain: string; adminName: string; adminEmail: string; adminPhone?: string; code: string }) {
    try {
        const owners = await db.collection('OwnerUser').find({ status: { $ne: 'disabled' } }, { projection: { email: 1, phone: 1 } }).toArray().catch(() => []);
        const subject = `New school registration: ${school.name}`;
        const html = `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:520px;margin:auto">
            <h2 style="color:#534AB7">New School Registered</h2>
            <p>A new school has registered and is awaiting review.</p>
            <table style="border-collapse:collapse;margin:12px 0">
                <tr><td style="padding:5px 12px;color:#6b7280">School</td><td style="padding:5px 12px;font-weight:700">${school.name}</td></tr>
                <tr><td style="padding:5px 12px;color:#6b7280">Subdomain</td><td style="padding:5px 12px;font-weight:700">${school.subdomain}</td></tr>
                <tr><td style="padding:5px 12px;color:#6b7280">Admin</td><td style="padding:5px 12px;font-weight:700">${school.adminName} (${school.adminEmail}${school.adminPhone ? ', ' + school.adminPhone : ''})</td></tr>
                <tr><td style="padding:5px 12px;color:#6b7280">Activation Code</td><td style="padding:5px 12px;font-weight:900;color:#534AB7">${school.code}</td></tr>
            </table>
            <p style="color:#6b7280;font-size:13px">Give this activation code to the school to activate their account, or activate them from the owner portal.</p>
        </div>`;
        const text = `New school registered: ${school.name} (${school.subdomain})\nAdmin: ${school.adminName} ${school.adminEmail} ${school.adminPhone || ''}\nActivation code: ${school.code}\nReview in the owner portal.`;
        for (const o of owners) {
            if (!o.email && !o.phone) continue;
            await notifyOwner({ email: o.email, phone: o.phone }, subject, html, text).catch(() => null);
        }
    } catch { /* best effort */ }
}

export const checkSubdomain = async (req: Request, res: Response) => {
    const { subdomain } = req.query;
    if (!subdomain || typeof subdomain !== 'string') {
        return res.status(400).json({ message: 'Subdomain is required' });
    }

    const reserved = ['owner', 'api', 'www', 'admin', 'support', 'mail', 'localhost', '127'];
    if (reserved.includes(subdomain.toLowerCase())) {
        return res.json({ available: false, message: 'Reserved subdomain' });
    }

    try {
        const db = getDb();
        const existing = await db.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });

        return res.json({
            available: !existing,
            message: existing ? 'Subdomain already taken' : 'Available'
        });
    } catch (e) {
        return res.json({ available: true, message: 'Available' });
    }
};

export const registerTenant = async (req: Request, res: Response) => {
    const { schoolName, subdomain, planId, adminName, adminEmail, adminPhone, password } = req.body;

    try {
        const db = getDb();

        // 1. Basic checks — subdomain and email must be unique across the platform.
        const existing = await db.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
        if (existing) return res.status(409).json({ message: 'Subdomain already taken' });

        const emailLc = String(adminEmail || '').trim().toLowerCase();
        if (!emailLc) return res.status(400).json({ message: 'Email is required' });
        // An email may register only ONCE — check both existing users and tenants.
        const emailRx = new RegExp(`^${emailLc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const emailTaken = await db.collection('User').findOne({ email: emailRx })
            || await db.collection('Tenant').findOne({ contactEmail: emailRx });
        if (emailTaken) return res.status(409).json({ message: 'This email is already registered. Use a different email or log in.' });

        // 2. Fetch or Create plan
        let plan;
        if (planId) {
            plan = await db.collection('Plan').findOne({ _id: new ObjectId(planId) });
        } else {
            plan = await db.collection('Plan').findOne({ name: 'Basic' });
        }

        if (!plan) {
            const planResult = await db.collection('Plan').insertOne({
                name: 'Basic',
                description: 'Default Basic Plan',
                price: 0,
                billingCycle: 'monthly',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            plan = { _id: planResult.insertedId, name: 'Basic' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create Tenant — PENDING review. Email must be OTP-verified, then the
        // school activates with a code issued by the owner. databaseName is stamped
        // now so DB-per-tenant isolation works the moment they're activated.
        const cleanSubdomain = subdomain.toLowerCase().trim();
        const databaseName   = subdomainToDbName(cleanSubdomain);
        const emailOtp = sixDigit();
        const code = activationCode();
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const shulecloudId = await generateUniqueSchoolId(db);
        const tenantResult = await db.collection('Tenant').insertOne({
            name: schoolName,
            subdomain: cleanSubdomain,
            shulecloudId,
            databaseName,
            contactEmail: adminEmail,
            contactPhone: adminPhone,
            status: 'pending',          // awaiting email verification + owner activation
            emailVerified: false,
            emailOtp, otpExpiresAt,
            activationCode: code,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const tenantId = tenantResult.insertedId;

        // Create Domain
        await db.collection('TenantDomain').insertOne({
            tenantId: tenantId,
            domain: subdomain.toLowerCase(),
            isPrimary: true
        });

        // Create Subscription
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);

        await db.collection('TenantSubscription').insertOne({
            tenantId: tenantId,
            planId: plan._id,
            status: 'trial',
            trialEnd,
            startDate: new Date()
        });

        // Seed Roles
        const roleNames = ['Super Admin', 'Teacher', 'Bursar', 'Student', 'Parent'];
        const createdRoles: Record<string, ObjectId> = {};

        for (const name of roleNames) {
            const roleResult = await db.collection('Role').insertOne({
                tenantId: tenantId,
                name,
                createdAt: new Date()
            });
            createdRoles[name] = roleResult.insertedId;
        }

        // Create Admin User — stamped with tenantId, role, and school info
        // This is the ONLY super admin for this school; tenantId is the key
        // that binds this account to the school's subdomain forever.
        const userResult = await db.collection('User').insertOne({
            tenantId,
            tenantSubdomain: cleanSubdomain,   // extra safety binding
            email: adminEmail,
            passwordHash: hashedPassword,
            name: adminName || adminEmail.split('@')[0],
            phone: adminPhone || '',
            role: 'school_admin',
            isSchoolAdmin: true,
            status: 'active',   // the user record is fine; the TENANT status gates login
            createdAt: new Date()
        });
        const userId = userResult.insertedId;

        // Assign Role
        await db.collection('UserRole').insertOne({
            userId: userId,
            roleId: createdRoles['Super Admin']
        });

        // Settings
        await db.collection('SchoolSetting').insertOne({
            tenantId: tenantId,
            jsonSettings: {
                currency: 'KES',
                timezone: 'Africa/Nairobi'
            }
        });

        // 4. Send the email OTP to the school, and alert the owners (email + WhatsApp).
        await sendSchoolOtp({ email: adminEmail, phone: adminPhone, name: adminName }, emailOtp);
        await notifyOwnersNewSchool(db, { name: schoolName, subdomain: cleanSubdomain, adminName, adminEmail, adminPhone, code });

        return res.status(201).json({
            message: 'Registered. Check your email for a verification code.',
            tenant: { id: tenantId, name: schoolName, subdomain: cleanSubdomain },
            requiresVerification: true,
        });
    } catch (error: any) {
        console.error('Registration Error:', error);
        return res.status(500).json({ message: error.message || 'Registration failed' });
    }
};

// ── Email OTP verification ────────────────────────────────────────────────────
export const verifyEmailOtp = async (req: Request, res: Response) => {
    const { subdomain, otp } = req.body || {};
    if (!subdomain || !otp) return res.status(400).json({ message: 'Subdomain and code are required' });
    try {
        const db = getDb();
        const tenant = await db.collection('Tenant').findOne({ subdomain: String(subdomain).toLowerCase() });
        if (!tenant) return res.status(404).json({ message: 'School not found' });
        if (tenant.emailVerified) return res.json({ ok: true, alreadyVerified: true });
        if (!tenant.emailOtp || String(tenant.emailOtp) !== String(otp).trim()) return res.status(400).json({ message: 'Incorrect verification code' });
        if (tenant.otpExpiresAt && new Date(tenant.otpExpiresAt) < new Date()) return res.status(400).json({ message: 'Code expired. Request a new one.' });
        await db.collection('Tenant').updateOne({ _id: tenant._id }, { $set: { emailVerified: true, updatedAt: new Date() }, $unset: { emailOtp: '', otpExpiresAt: '' } });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Resend a fresh OTP.
export const resendEmailOtp = async (req: Request, res: Response) => {
    const { subdomain } = req.body || {};
    try {
        const db = getDb();
        const tenant = await db.collection('Tenant').findOne({ subdomain: String(subdomain || '').toLowerCase() });
        if (!tenant) return res.status(404).json({ message: 'School not found' });
        if (tenant.emailVerified) return res.json({ ok: true, alreadyVerified: true });
        const emailOtp = sixDigit();
        await db.collection('Tenant').updateOne({ _id: tenant._id }, { $set: { emailOtp, otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
        await sendSchoolOtp({ email: tenant.contactEmail, phone: tenant.contactPhone, name: tenant.name }, emailOtp);
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ── Activation with the owner-issued code ─────────────────────────────────────
export const activateTenant = async (req: Request, res: Response) => {
    const { subdomain, code } = req.body || {};
    if (!subdomain || !code) return res.status(400).json({ message: 'Subdomain and activation code are required' });
    try {
        const db = getDb();
        const tenant = await db.collection('Tenant').findOne({ subdomain: String(subdomain).toLowerCase() });
        if (!tenant) return res.status(404).json({ message: 'School not found' });
        if (tenant.status === 'active') return res.json({ ok: true, alreadyActive: true });
        if (!tenant.emailVerified) return res.status(400).json({ message: 'Verify your email first.' });
        if (String(tenant.activationCode || '').toUpperCase() !== String(code).trim().toUpperCase()) return res.status(400).json({ message: 'Invalid activation code' });
        await db.collection('Tenant').updateOne({ _id: tenant._id }, { $set: { status: 'active', activatedAt: new Date(), updatedAt: new Date() } });

        // Welcome bonus: free SMS credits for the new school, once.
        if (tenant.databaseName) {
            try {
                const pricing = await getSmsPricing();
                await creditSmsWallet(getTenantDb(tenant.databaseName), pricing.welcomeBonus, { source: 'Welcome Bonus', description: 'Free SMS credits for joining ShuleCloud' });
            } catch (e: any) { console.error('[onboard] welcome SMS bonus failed:', e.message); }

            // Give the registering admin a staff record too, so they show up in Staff / Teachers
            // like any other team member rather than being an invisible meta-level login only.
            try {
                const tdb = getTenantDb(tenant.databaseName);
                const adminUser = await db.collection('User').findOne({ tenantId: tenant._id, isSchoolAdmin: true });
                if (adminUser && !(await tdb.collection('staff').findOne({ email: adminUser.email }))) {
                    await tdb.collection('staff').insertOne({
                        employeeName: adminUser.name, email: adminUser.email, phone: adminUser.phone || '',
                        designation: 'School Administrator', isTeachingStaff: false, portalAccess: 'admin',
                        status: 'Active', createdAt: new Date(),
                    });
                }
            } catch (e: any) { console.error('[onboard] admin staff record failed:', e.message); }
        }

        return res.json({ ok: true, subdomain: tenant.subdomain });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Lightweight status poll for the waiting page.
export const registrationStatus = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const tenant = await db.collection('Tenant').findOne({ subdomain: String(req.query.subdomain || '').toLowerCase() }, { projection: { status: 1, emailVerified: 1 } });
        if (!tenant) return res.status(404).json({ message: 'Not found' });
        return res.json({ status: tenant.status, emailVerified: !!tenant.emailVerified });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};
