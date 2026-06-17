import { Router, Request } from 'express';
import { login, getTenantProfile, updateTenantProfile, updateUser, deleteUser } from '../controllers/auth.controller';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';
import { Db, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { ensureWallet, creditWallet, debitWallet, getTransactions, setWalletStatus, setWalletLimits } from '../services/wallet.service';
import { resolveMpesaConfig, stkPush, stkQuery, isMpesaConfigured, applyMpesaPayment, checkStkAndComplete } from '../services/mpesa.service';
import { resolveStaffPermissions, permsToModules, resolveStaffCrud } from '../lib/permissions';

const router = Router();

// Institution data (staff / students) lives in the tenant's isolated database.
// User / Tenant records always live in the meta database.
const getInstDb = (req: Request): Db => (req as any).tenantDb || getMetaDb();

router.post('/login', login);

// ─── Student Portal Login ─────────────────────────────────────────────────────
router.post('/student-login', async (req, res) => {
    try {
        const db = getInstDb(req);
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

        const student = await db.collection('students').findOne({ portalUsername: username });
        if (!student || student.portalPassword !== password) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const secret = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';
        const token = jwt.sign(
            { studentId: student._id.toString(), username: student.portalUsername, role: 'student', name: student.studentName },
            secret,
            { expiresIn: '7d' }
        );
        res.json({
            token,
            student: {
                _id: student._id,
                name: student.studentName,
                registrationNo: student.registrationNo || student.admNo,
                class: student.studentClass || student.currentClass,
                portalUsername: student.portalUsername,
                gender: student.gender,
                photo: student.studentPhoto || null,
            },
        });
    } catch (e: any) {
        console.error('[Auth] student-login error:', e);
        res.status(500).json({ message: e.message });
    }
});

// ─── Username uniqueness check ─────────────────────────────────────────────────
// With DB-per-tenant isolation, we simply check within the institution's own DB.
router.get('/check-username', async (req, res) => {
    try {
        const db = getInstDb(req);
        const { username, excludeId, excludeType } = req.query;

        if (!username || typeof username !== 'string' || username.trim().length < 2) {
            return res.status(400).json({ available: false, message: 'Username too short' });
        }

        const u = username.trim();
        const toExclude = (t: string) =>
            excludeType === t && excludeId ? { _id: { $ne: new ObjectId(excludeId as string) } } : {};

        const [staffConflict, studentConflict, parentConflict] = await Promise.all([
            db.collection('staff').findOne({ portalUsername: u, ...toExclude('staff') }),
            db.collection('students').findOne({ portalUsername: u, ...toExclude('student') }),
            db.collection('students').findOne({ parentPortalUsername: u, ...toExclude('parent') }),
        ]);

        if (staffConflict) return res.json({ available: false, takenBy: 'staff', message: 'Username already used by a staff member' });
        if (studentConflict) return res.json({ available: false, takenBy: 'student', message: 'Username already used by a student' });
        if (parentConflict) return res.json({ available: false, takenBy: 'parent', message: 'Username already used by a parent' });
        res.json({ available: true, message: 'Username is available' });
    } catch (e: any) {
        res.status(500).json({ available: false, message: e.message });
    }
});

// ─── Universal Smart Login (subdomain-strict) ─────────────────────────────────
// Rules:
//   1. A user account created for School A can ONLY log in via School A's subdomain.
//   2. Attempting to log in via School B's subdomain with School A credentials → 403.
//   3. The subdomain passed in the request body (or detected from the hostname header)
//      is the authoritative source of truth — no cross-tenant fallback.
// NOTE: This route is excluded from tenancy middleware (publicPrefixes).
router.post('/smart-login', async (req, res) => {
    try {
        const metaDb   = getMetaDb();
        const { username, password, subdomain } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username/email and password are required' });

        const secret      = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';
        const adminSecret = process.env.JWT_SECRET || 'secret';

        // ── Resolve the target school (tenant) ────────────────────────────────
        let resolvedTenantId: string | null   = null;
        let resolvedTenantSubdomain: string   = '';
        let resolvedTenantName: string        = '';
        let tenantInstDb: Db                  = metaDb;
        let isSubdomainExplicit               = false; // true when subdomain was given by caller

        const loadTenant = (t: any) => {
            resolvedTenantId        = t._id.toString();
            resolvedTenantSubdomain = t.subdomain;
            resolvedTenantName      = t.name || t.subdomain;
            const dbName            = t.databaseName || subdomainToDbName(t.subdomain);
            tenantInstDb            = getTenantDb(dbName);
        };

        if (subdomain) {
            const t = await metaDb.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
            if (t) { loadTenant(t); isSubdomainExplicit = true; }
        }

        // Dev / bare-localhost fallback — only when no subdomain was provided
        if (!resolvedTenantId) {
            const t = await metaDb.collection('Tenant').findOne({ status: 'active' });
            if (t) loadTenant(t);
        }

        // ── HELPER: check if a credential belongs to a different school ───────
        // Returns the tenant name if the account is found but tied to a different school, else null.
        const findUserTenantMismatch = async (): Promise<string | null> => {
            if (!isSubdomainExplicit || !resolvedTenantId) return null;
            if (username.includes('@')) {
                const anyUser = await metaDb.collection('User').findOne({ email: username });
                if (!anyUser) return null;
                const utid = anyUser.tenantId?.toString();
                if (utid && utid !== resolvedTenantId) {
                    const otherTenant = await metaDb.collection('Tenant').findOne({ _id: new ObjectId(utid) });
                    return otherTenant?.name || 'another school';
                }
            }
            return null;
        };

        // ── 1. Admin / Teacher email login (User collection in meta db) ───────
        if (username.includes('@')) {
            // STRICT: only look up this user for the CURRENT tenant
            let user: any = null;
            if (resolvedTenantId) {
                user = await metaDb.collection('User').findOne({ email: username, tenantId: new ObjectId(resolvedTenantId) })
                    || await metaDb.collection('User').findOne({ email: username, tenantId: resolvedTenantId });
            }

            // If not found for this tenant — check if they're registered at another school
            if (!user && isSubdomainExplicit) {
                const mismatch = await findUserTenantMismatch();
                if (mismatch) {
                    return res.status(403).json({
                        message: `This email is registered with "${mismatch}", not with "${resolvedTenantName}". Please use your school's correct login URL.`,
                        code: 'CROSS_TENANT_BLOCKED',
                    });
                }
                // email genuinely doesn't exist anywhere → let it fall through to username checks
            }

            // Last resort dev fallback (no explicit subdomain): find by email alone
            if (!user && !isSubdomainExplicit) {
                user = await metaDb.collection('User').findOne({ email: username });
                // If found but in a different tenant than our resolved one, use their actual tenant
                if (user?.tenantId) {
                    const actualTenant = await metaDb.collection('Tenant').findOne({ _id: new ObjectId(user.tenantId.toString()) });
                    if (actualTenant) loadTenant(actualTenant);
                }
            }

            if (user) {
                const passwordMatch = await require('bcrypt').compare(password, user.passwordHash).catch(() => false);
                if (!passwordMatch) return res.status(401).json({ message: 'Invalid credentials.' });

                let role = (user.role || 'school_admin').toLowerCase();
                const effectiveTenantId = resolvedTenantId || user.tenantId?.toString() || null;
                let staffInfo: any = null;
                try {
                    staffInfo = await tenantInstDb.collection('staff').findOne({ email: username });
                    if (staffInfo) {
                        const d = (staffInfo.designation || '').toLowerCase();
                        if (d.includes('teacher') || staffInfo.isTeachingStaff) role = 'teacher';
                    }
                } catch (_) {}

                const name = user.name
                    || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null)
                    || staffInfo?.employeeName || username.split('@')[0];

                const token = jwt.sign(
                    { sub: user._id.toString(), email: username, tenantId: effectiveTenantId, tenantSubdomain: resolvedTenantSubdomain, role, name },
                    adminSecret,
                    { expiresIn: '7d' }
                );
                return res.json({
                    token, access_token: token,
                    tenantSubdomain: resolvedTenantSubdomain,
                    user_type: role.includes('teacher') ? 'teacher' : 'admin',
                    user: { id: user._id.toString(), email: username, name, role, staffId: staffInfo?._id?.toString() || null },
                    redirect: '/dashboard',
                });
            }
        }

        // ── 2. Staff Portal login — strictly within this school's database ──────
        // Staff records are already isolated in tenantInstDb, so no cross-tenant
        // leakage is possible here. If the username doesn't exist in this school,
        // the login simply fails — we do NOT search other schools' databases.
        const staffMatch = await tenantInstDb.collection('staff').findOne({ portalUsername: username });
        if (staffMatch && staffMatch.portalPassword === password) {
            const rawDesignation = staffMatch.designation || 'staff';
            const role = rawDesignation.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            const userType = role.includes('teacher') ? 'teacher' : 'staff';
            const name = staffMatch.employeeName || staffMatch.name || username;
            const token = jwt.sign({ staffId: staffMatch._id.toString(), username, role, name, tenantId: resolvedTenantId, tenantSubdomain: resolvedTenantSubdomain }, secret, { expiresIn: '7d' });
            const portalAccess = (staffMatch.portalAccess || 'both').toLowerCase();
            const isTeacher = /teacher/i.test(rawDesignation)
                || (Array.isArray(staffMatch.roles) && staffMatch.roles.some((r: string) => /teacher/i.test(r)))
                || staffMatch.isTeachingStaff === true
                || (Array.isArray(staffMatch.subjectAssignments) && staffMatch.subjectAssignments.length > 0)
                || (Array.isArray(staffMatch.specializedSubjects) && staffMatch.specializedSubjects.length > 0);

            // Portal access resolution:
            //   admin   → admin app only (blocked from teacher portal)
            //   teacher → teacher portal only (redirected on login, no admin)
            //   both    → land on the admin app first; offer a "Teaching Portal" button
            const isAdminOnly   = portalAccess === 'admin' || portalAccess === 'admin app only';
            const isTeacherOnly = portalAccess === 'teacher' || portalAccess === 'staff' || portalAccess === 'teacher portal only';
            const canTeacherPortal = !isAdminOnly && (isTeacher || portalAccess === 'both' || portalAccess === 'both portals' || isTeacherOnly);
            const goTeacherPortal  = isTeacherOnly && canTeacherPortal;
            const staffSso = canTeacherPortal
                ? { token, staff: { _id: staffMatch._id.toString(), name, designation: staffMatch.designation, email: staffMatch.email, phone: staffMatch.phone } }
                : null;

            // Resolve the admin-app landing page: the admin's explicit choice, else a
            // sensible default for cafeteria/store roles, else the dashboard.
            const ROLE_LANDING: Record<string, string> = {
                'kitchen': '/cafeteria/meal-service', 'cook': '/cafeteria/meal-service', 'catering supervisor': '/cafeteria/meal-service', 'kitchen staff': '/cafeteria/meal-service',
                'canteen manager': '/canteen/quick-sale', 'canteen cashier': '/canteen/quick-sale', 'canteen attendant': '/canteen/quick-sale',
                'storekeeper': '/canteen/transactions', 'store manager': '/canteen/transactions', 'inventory officer': '/canteen/transactions',
            };
            const landingRoles = [...(Array.isArray(staffMatch.roles) ? staffMatch.roles : []), staffMatch.designation].filter(Boolean).map((r: string) => String(r).toLowerCase());
            const landingPage = staffMatch.landingPage || landingRoles.map((r: string) => ROLE_LANDING[r]).find(Boolean) || '/dashboard';

            return res.json({
                token, access_token: token,
                tenantSubdomain: resolvedTenantSubdomain,
                user_type: userType,
                user: { id: staffMatch._id.toString(), name, role, email: staffMatch.email || '', tenantId: resolvedTenantId, portalAccess, landingPage },
                portalAccess,
                canTeacherPortal,           // admin app shows a "Teaching Portal" button when true
                redirectPortal: goTeacherPortal ? 'staff' : null,   // only teacher-only is auto-redirected
                staffSso,                   // present for teacher-only AND both → enables SSO into teacher portal
                landingPage,
                redirect: landingPage,
            });
        }

        // ── 3. Try Student Portal login (in institution's own database) ──
        const studentMatch = await tenantInstDb.collection('students').findOne({ portalUsername: username });
        if (studentMatch && studentMatch.portalPassword === password) {
            const name = studentMatch.studentName || `${studentMatch.firstName || ''} ${studentMatch.lastName || ''}`.trim();
            const token = jwt.sign({ studentId: studentMatch._id.toString(), username, role: 'student', name, tenantId: resolvedTenantId, tenantSubdomain: resolvedTenantSubdomain }, secret, { expiresIn: '7d' });
            return res.json({
                token, access_token: token,
                tenantSubdomain: resolvedTenantSubdomain,
                user_type: 'student',
                user: { id: studentMatch._id.toString(), name, role: 'student', registrationNo: studentMatch.registrationNo, class: studentMatch.studentClass, portalUsername: username, tenantId: resolvedTenantId },
                redirect: '/student-portal/dashboard',
            });
        }

        // ── 4. Try Parent login (in institution's own database) ──
        const parentMatch = await tenantInstDb.collection('students').findOne({
            $or: [
                { parentPortalUsername: username },
                { parentPhone: username },
                { phone: username },
            ]
        });
        if (parentMatch) {
            const storedPass = parentMatch.parentPortalPassword;
            const defaultPass = `parent@${(parentMatch.parentPhone || parentMatch.phone || '0000').slice(-4)}`;
            if (password === (storedPass || defaultPass)) {
                const parentName = parentMatch.fatherName || parentMatch.motherName || parentMatch.parentName || 'Parent';
                const token = jwt.sign({ role: 'parent', studentId: parentMatch._id.toString(), studentName: parentMatch.studentName, parentName, username, tenantId: resolvedTenantId, tenantSubdomain: resolvedTenantSubdomain }, secret, { expiresIn: '7d' });
                return res.json({
                    token, access_token: token,
                    tenantSubdomain: resolvedTenantSubdomain,
                    user_type: 'parent',
                    parent: { name: parentName, username, student: { _id: parentMatch._id, name: parentMatch.studentName, class: parentMatch.studentClass, registrationNo: parentMatch.registrationNo }, tenantId: resolvedTenantId },
                    redirect: '/parent-portal/dashboard',
                });
            }
        }

        return res.status(401).json({ message: 'Invalid username/email or password. Check your credentials and try again.' });
    } catch (e: any) {
        console.error('[SmartLogin] error:', e);
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
});

// ─── Current user's role permissions ─────────────────────────────────────────
router.get('/my-permissions', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const token = authHeader.split(' ')[1];

        let userRole = '';
        let userId = '';
        let staffId = '';
        try {
            const secret = process.env.JWT_SECRET || 'secret';
            const decoded: any = jwt.verify(token, secret);
            userId = decoded.sub || decoded.userId || decoded.staffId || '';
            staffId = decoded.staffId || '';
            if (decoded.role) {
                userRole = decoded.role.toLowerCase();
            } else if (decoded.staffId) {
                const staff = await db.collection('staff').findOne({ _id: new ObjectId(decoded.staffId) });
                const designation = staff?.designation || staff?.role || 'teacher';
                userRole = designation.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            } else {
                // A verified token with no role claim is treated as the admin user
                // (the main app's admin JWT). Only verified tokens reach here.
                userRole = 'school_admin';
            }
        } catch (_) {
            // Invalid/forged token → deny, never default to admin.
            return res.status(401).json({ message: 'Invalid token' });
        }

        // ── Full admin → return wildcard immediately ──────────────────────────
        if (userRole === 'school_admin' || userRole === 'super_admin') {
            return res.json({ role: userRole, userId, modules: ['*'], crud: {} });
        }

        // ── Resolve the staff member's effective permission CODES, then map them
        //    to sidebar module keys. This is the same source the role editor
        //    writes to (the `roles` collection + per-staff `staff.permissions`),
        //    so permissions assigned there now drive the sidebar. ──────────────
        let staff: any = null;
        if (staffId) {
            try { staff = await db.collection('staff').findOne({ _id: new ObjectId(staffId) }); } catch { /* ignore */ }
        }
        if (!staff && userId) {
            try { staff = await db.collection('staff').findOne({ _id: new ObjectId(userId) }); } catch { /* ignore */ }
        }
        // Fall back to a synthetic staff carrying just the role name so default
        // role permissions still resolve when we can't find the staff doc.
        const staffForPerms = staff || { designation: userRole.replace(/_/g, ' ') };

        // ADMIN PORTAL: strict — only explicitly granted permissions count. No
        // teacher fallback, no built-in role defaults. A freshly registered
        // teacher therefore sees nothing until an admin grants access.
        const codes = await resolveStaffPermissions(db, staffForPerms, { teacherFallback: false, useRoleDefaults: false });
        const resolvedModules = permsToModules(codes);
        const crud = await resolveStaffCrud(db, staffForPerms);

        res.json({ role: userRole, userId, modules: resolvedModules, permissions: codes, crud });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// ─── Staff / Teacher Portal Login ────────────────────────────────────────────
router.post('/staff-login', async (req, res) => {
    try {
        const db = getInstDb(req);
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

        const staff = await db.collection('staff').findOne({ portalUsername: username });
        if (!staff || staff.portalPassword !== password) return res.status(401).json({ message: 'Invalid username or password' });

        // Strict portal assignment: staff assigned to the admin portal only may not use the staff portal.
        if ((staff.portalAccess || 'both').toLowerCase() === 'admin') {
            return res.status(403).json({ message: 'You are assigned to the main school portal. Please log in there instead.' });
        }

        const secret = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';
        const token = jwt.sign(
            { staffId: staff._id.toString(), username: staff.portalUsername, role: staff.role || 'teacher', name: staff.employeeName || staff.name },
            secret,
            { expiresIn: '7d' }
        );
        res.json({
            token,
            staff: {
                _id: staff._id,
                name: staff.employeeName || staff.name,
                designation: staff.designation || 'Teacher',
                portalUsername: staff.portalUsername,
                email: staff.email,
                phone: staff.phone,
            }
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

router.get('/staff-portal/me', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const staff = await db.collection('staff').findOne({ _id: new ObjectId(decoded.staffId) });
        if (!staff) return res.status(404).json({ message: 'Staff not found' });
        const permissions = await resolveStaffPermissions(db, staff);
        res.json({ ...staff, permissions });
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

// Teacher self-service: update own contact details (email / phone).
router.patch('/staff-portal/profile', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const { email, phone } = req.body || {};
        const set: any = { updatedAt: new Date() };
        if (email !== undefined) {
            if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) return res.status(400).json({ message: 'Enter a valid email address' });
            set.email = email;
        }
        if (phone !== undefined) set.phone = phone;
        await db.collection('staff').updateOne({ _id: new ObjectId(decoded.staffId) }, { $set: set });
        res.json({ message: 'Profile updated' });
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

// Roles a staff member is assigned to (for the Role Management "usage" view).
router.get('/staff-portal/permissions', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const staff = await db.collection('staff').findOne({ _id: new ObjectId(decoded.staffId) });
        res.json({ permissions: staff ? await resolveStaffPermissions(db, staff) : [], roles: staff?.roles || [] });
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

router.get('/staff-portal/live-meetings', async (req, res) => {
    try {
        const db = getInstDb(req);
        const meetings = await db.collection('live_meetings').find({ status: 'active' }).sort({ createdAt: -1 }).toArray();
        res.json(meetings);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// Staff: create a live class (the staff member is the host/moderator).
router.post('/staff-portal/live-meetings', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const { title, className, subject } = req.body || {};
        if (!title) return res.status(400).json({ message: 'A class title is required' });
        const meetingId = `LIVE${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const doc = {
            meetingId, title, className: className || '', subject: subject || '',
            hostId: decoded.staffId, hostName: decoded.name, status: 'active', createdAt: new Date(),
        };
        const r = await db.collection('live_meetings').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

// Staff: end a live class they host.
router.post('/staff-portal/live-meetings/:id/end', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        let oid: ObjectId | null = null;
        try { oid = new ObjectId(req.params.id); } catch { oid = null; }
        await db.collection('live_meetings').updateOne(
            oid ? { _id: oid } : { meetingId: req.params.id },
            { $set: { status: 'ended', endedAt: new Date() } },
        );
        res.json({ message: 'Live class ended' });
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

router.get('/staff-portal/announcements', async (req, res) => {
    try {
        const db = getInstDb(req);
        const items = await db.collection('announcements').find({
            $or: [{ audience: 'All' }, { audience: 'Staff' }, { audience: 'Teachers' }]
        }).sort({ createdAt: -1 }).limit(10).toArray();
        res.json(items);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// ─── Parent Portal Login ──────────────────────────────────────────────────────
router.post('/parent-login', async (req, res) => {
    try {
        const db = getInstDb(req);
        const { username, password, phone } = req.body;
        const loginId = username || phone;
        if (!loginId) return res.status(400).json({ message: 'Username or phone number is required' });
        if (!password) return res.status(400).json({ message: 'Password is required' });

        const secret = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';

        // ── 1) Dedicated Parents module record (preferred source of linking) ──
        const parentRec = await db.collection('parents').findOne({
            $or: [{ loginUsername: loginId }, { primaryPhone: loginId }, { secondaryPhone: loginId }, { whatsappNumber: loginId }, { email: loginId }],
        }).catch(() => null);
        if (parentRec) {
            const blocked = ['Inactive', 'Suspended', 'Blacklisted', 'Archived'];
            if (parentRec.status && blocked.includes(parentRec.status)) {
                return res.status(403).json({ message: `Your account is ${String(parentRec.status).toLowerCase()}. Please contact the school.` });
            }
            const defPass = `parent@${String(parentRec.primaryPhone || '0000').slice(-4)}`;
            if (password !== (parentRec.loginPassword || defPass)) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }
            const links = Array.isArray(parentRec.linkedStudents) ? parentRec.linkedStudents : [];
            const children: any[] = [];
            for (const l of links) {
                if (!l.studentId) continue;
                let name = l.studentName, cls = l.studentClass, reg = l.admissionNo;
                try {
                    const oid = safeObjId(l.studentId);
                    const s = oid ? await db.collection('students').findOne({ _id: oid }) : null;
                    if (s) { name = s.studentName; cls = s.studentClass || s.currentClass; reg = s.registrationNo || s.admNo; }
                } catch { /* ignore */ }
                children.push({ _id: String(l.studentId), name, class: cls, registrationNo: reg, admissionNo: l.admissionNo, relationship: l.relationship });
            }
            if (children.length === 0) return res.status(404).json({ message: 'No students are linked to your account yet. Contact the school.' });

            const token = jwt.sign(
                { role: 'parent', studentId: children[0]._id, studentIds: children.map(c => c._id), parentName: parentRec.fullName, parentId: String(parentRec._id), username: loginId },
                secret, { expiresIn: '7d' },
            );
            db.collection('parents').updateOne({ _id: parentRec._id }, { $set: { lastLogin: new Date() } }).catch(() => {});
            return res.json({
                token,
                parent: { name: parentRec.fullName, username: parentRec.loginUsername || loginId, phone: parentRec.primaryPhone, children, student: children[0] },
            });
        }

        // ── 2) Legacy fallback: parent fields stored on the student record ──
        const student = await db.collection('students').findOne({
            $or: [{ parentPortalUsername: loginId }, { parentPhone: loginId }, { phone: loginId }]
        });
        if (!student) return res.status(401).json({ message: 'Invalid username or password' });

        const storedPass = student.parentPortalPassword;
        const defaultPass = `parent@${(student.parentPhone || student.phone || '0000').slice(-4)}`;
        if (password !== (storedPass || defaultPass)) return res.status(401).json({ message: 'Invalid username or password' });

        const parentName = student.fatherName || student.motherName || student.parentName || student.guardianName || 'Parent';

        // Find all children linked to the same parent (siblings share a parent
        // identifier: phone, portal username, parent IDs or family).
        const ids = [
            student.parentPhone, student.parentPortalUsername, student.fatherPhone, student.motherPhone,
            student.fatherNationalId, student.motherNationalId, student.family, loginId,
        ].filter(Boolean);
        const orFilters: any[] = [];
        ids.forEach((v: any) => {
            orFilters.push({ parentPhone: v }, { parentPortalUsername: v }, { fatherPhone: v }, { motherPhone: v },
                { fatherNationalId: v }, { motherNationalId: v }, { family: v });
        });
        let siblings = [student];
        try {
            const found = await db.collection('students').find({ $or: orFilters }).toArray();
            if (found.length) {
                const byId: Record<string, any> = {};
                [student, ...found].forEach((s: any) => { byId[String(s._id)] = s; });
                siblings = Object.values(byId);
            }
        } catch { /* ignore — fall back to the single matched student */ }

        const children = siblings.map((s: any) => ({
            _id: String(s._id),
            name: s.studentName,
            class: s.studentClass || s.currentClass,
            registrationNo: s.registrationNo,
            admissionNo: s.admNo || s.registrationNo,
        }));

        const token = jwt.sign(
            {
                role: 'parent',
                studentId: String(student._id),
                studentIds: children.map(c => c._id),
                parentName, username: loginId,
            },
            secret,
            { expiresIn: '7d' }
        );
        res.json({
            token,
            parent: {
                name: parentName,
                username: student.parentPortalUsername || loginId,
                phone: student.parentPhone || student.phone,
                children,
                student: children[0], // back-compat (first child)
            }
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// Resolve which child the parent is currently viewing. Defaults to the first
// child; honours ?studentId / x-student-id when it belongs to this parent.
const parentStudentId = (req: Request, decoded: any): string => {
    const requested = (req.query.studentId as string) || (req.headers['x-student-id'] as string);
    const allowed: string[] = Array.isArray(decoded.studentIds) && decoded.studentIds.length
        ? decoded.studentIds.map(String)
        : [String(decoded.studentId)];
    if (requested && allowed.includes(String(requested))) return String(requested);
    return String(decoded.studentId || allowed[0]);
};

router.get('/parent-portal/student', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const student = await db.collection('students').findOne({ _id: new ObjectId(parentStudentId(req, decoded)) });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json(student);
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

// ─── Student Portal: profile & data ──────────────────────────────────────────
router.get('/student-portal/me', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json(student);
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

router.get('/student-portal/marks', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const marks = await db.collection('exam_marks').find({ studentId: decoded.studentId }).toArray();
        res.json(marks);
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

router.get('/student-portal/assignments', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const assignments = await db.collection('academic_assignments').find({ status: 'Published' }).toArray();
        res.json(assignments);
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

router.get('/student-portal/exam-results', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');

        const marks = await db.collection('exam_marks').find({ studentId: decoded.studentId }).toArray();
        const exams = await db.collection('exams').find({}).toArray();
        const examMap: Record<string, any> = {};
        exams.forEach((e: any) => { examMap[e._id.toString()] = e; });

        const grouped: Record<string, any> = {};
        marks.forEach((m: any) => {
            const examId = m.examId?.toString() || 'unknown';
            const exam = examMap[examId] || {};
            if (!grouped[examId]) {
                grouped[examId] = {
                    examId,
                    examName: m.examName || exam.name || exam.type || 'Exam',
                    term: m.term || exam.term || '',
                    academicYear: exam.academicYear || '',
                    subjects: [], totalMarks: 0, totalOutOf: 0,
                };
            }
            const marks_obtained = Number(m.marksObtained || 0);
            const out_of = Number(m.totalMarks || 100);
            grouped[examId].subjects.push({ name: m.subjectName || '—', marks: marks_obtained, outOf: out_of, grade: m.grade || '', points: m.gradePoints || 0 });
            grouped[examId].totalMarks += marks_obtained;
            grouped[examId].totalOutOf += out_of;
        });

        const results = Object.values(grouped).map((g: any) => ({
            ...g, average: g.totalOutOf > 0 ? (g.totalMarks / g.totalOutOf) * 100 : 0,
        })).sort((a: any, b: any) => b.examName.localeCompare(a.examName));

        res.json(results);
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

router.get('/student-portal/fee-invoices', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');

        const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const invoices = await db.collection('invoices').find({
            $or: [
                { studentId: decoded.studentId },
                { student_id: decoded.studentId },
                { registrationNo: student.registrationNo || student.admNo },
            ]
        }).sort({ createdAt: -1 }).toArray();

        res.json(invoices);
    } catch (e: any) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

router.post('/student-portal/pay-invoice', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');

        const { invoiceId, invoiceNo, amount, method, reference, phone, notes } = req.body;
        if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Valid amount is required' });

        const payment = {
            invoiceId, invoiceNo,
            studentId: decoded.studentId, studentName: decoded.name,
            amount: Number(amount), method: method || 'MPESA',
            reference: reference || '', phone: phone || '', notes: notes || '',
            status: 'Pending', submittedAt: new Date(),
        };

        const result = await db.collection('student_payment_requests').insertOne(payment);

        if (reference && invoiceId) {
            try {
                const inv = await db.collection('invoices').findOne({ _id: new ObjectId(invoiceId) });
                if (inv) {
                    const newPaid = (Number(inv.paid_amount || inv.amount_paid || 0)) + Number(amount);
                    const newBal = Math.max(0, (Number(inv.total_due || inv.amount || 0)) - newPaid);
                    await db.collection('invoices').updateOne(
                        { _id: new ObjectId(invoiceId) },
                        { $set: { paid_amount: newPaid, balance: newBal, status: newBal <= 0 ? 'PAID' : 'PARTIAL', updatedAt: new Date() } }
                    );
                }
            } catch (_) {}
        }

        res.status(201).json({ id: result.insertedId, message: 'Payment request submitted successfully', status: 'Pending' });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

router.get('/student-portal/live-meetings', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        let cls = '';
        try {
            const decoded: any = jwt.verify((authHeader || '').split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
            const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
            cls = String(student?.studentClass || student?.currentClass || '');
        } catch { /* anonymous → show all active */ }

        const all = await db.collection('live_meetings').find({ status: 'active' }).sort({ createdAt: -1 }).limit(30).toArray();
        // Show classes targeted at this student's class plus school-wide ones.
        const meetings = cls
            ? all.filter((m: any) => !m.className || String(m.className).toLowerCase() === cls.toLowerCase())
            : all;
        res.json(meetings);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

router.get('/student-portal/announcements', async (req, res) => {
    try {
        const db = getInstDb(req);
        const announcements = await db.collection('announcements').find({
            $or: [{ audience: 'All' }, { audience: 'Students' }]
        }).sort({ createdAt: -1 }).limit(10).toArray();
        res.json(announcements);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// Portal feature endpoints (student / staff / parent)
// All operate on the institution's tenant DB resolved by the tenancy middleware.
// ═══════════════════════════════════════════════════════════════════════════

const PORTAL_SECRET = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';

// Wraps a handler with JWT verification + tenant-db resolution.
const authed = (
    handler: (req: Request, res: any, db: Db, decoded: any) => Promise<void>,
) => async (req: Request, res: any) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token' });
        const decoded: any = jwt.verify(authHeader.split(' ')[1], PORTAL_SECRET);
        await handler(req, res, db, decoded);
    } catch (e: any) {
        if (e?.name === 'JsonWebTokenError' || e?.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        res.status(500).json({ message: e.message });
    }
};

const safeObjId = (id: any): ObjectId | null => {
    try { return new ObjectId(String(id)); } catch { return null; }
};

const currentTermName = async (db: Db): Promise<string> => {
    try {
        const p = await db.collection('periods').findOne({ isCurrent: true });
        if (p) return p.name || p.term || p.title || 'Current Term';
    } catch { /* ignore */ }
    // Fall back to the active term in the v2 academic system.
    try {
        const t = await db.collection('terms').findOne({ isActive: true });
        if (t) return `${t.name}${t.academicYear ? ` ${t.academicYear}` : ''}`;
    } catch { /* ignore */ }
    return 'Current Term';
};

const studentInvoices = async (db: Db, student: any, studentId: string) => {
    return db.collection('invoices').find({
        $or: [
            { studentId },
            { student_id: studentId },
            { registrationNo: student?.registrationNo || student?.admNo },
        ],
    }).sort({ createdAt: -1 }).toArray();
};

const invoiceTotals = (invoices: any[]) => {
    const totalBilled = invoices.reduce((s, i) => s + Number(i.total_due || i.amount || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount || i.amount_paid || 0), 0);
    return { totalBilled, totalPaid, balance: totalBilled - totalPaid };
};

// Sum of confirmed/pending payments recorded for a student (across collections).
const studentPaidTotal = async (db: Db, student: any, sid: string): Promise<number> => {
    const regNo = student?.registrationNo || student?.admNo;
    const match = { $or: [{ studentId: sid }, { student_id: sid }, ...(regNo ? [{ registrationNo: regNo }] : [])] };
    const collect = async (name: string) => { try { return await db.collection(name).find(match).toArray(); } catch { return []; } };
    const rows = [...(await collect('payments')), ...(await collect('student_payment_requests'))];
    return rows
        .filter((p: any) => !p.is_voided && (p.status ? p.status !== 'Rejected' : true))
        .reduce((s: number, p: any) => s + Number(p.amount || p.amount_paid || 0), 0);
};

// Fee account summary: billed (from class fee structure or invoices), paid, balance.
const buildFeesSummary = async (db: Db, sid: string) => {
    const student = await db.collection('students').findOne({ _id: new ObjectId(sid) });
    const cls = String(student?.studentClass || student?.currentClass || '');
    let term = await currentTermName(db);
    let items: { name: string; amount: number }[] = [];
    let structureTotal = 0;

    try {
        const norm = (s: any) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const structures = await db.collection('fee_structures').find({}).toArray();
        const target = norm(cls);
        const match = structures.find((s: any) => {
            const names = [s.className, s.class, s.levelName, s.level].map(norm).filter(Boolean);
            // exact or contains either way (handles "Form 1" vs "Form 1 East").
            return names.some((n) => n === target || n.includes(target) || target.includes(n));
        });
        if (match) {
            if (match.term) term = `${match.term}${match.year ? ` ${match.year}` : ''}`;
            if (match.amounts && typeof match.amounts === 'object') {
                items = Object.entries(match.amounts).map(([name, amount]) => ({ name, amount: Number(amount) || 0 })).filter(i => i.amount > 0);
            }
            structureTotal = Number(match.total) || items.reduce((s, i) => s + i.amount, 0);
        }
    } catch { /* ignore */ }

    const invoices = await studentInvoices(db, student, sid);

    // Fees are DUE ONLY WHEN INVOICED. The fee structure is indicative only;
    // billed/paid/balance come strictly from issued invoices.
    const billed = invoices.reduce((s: number, i: any) => s + Number(i.total_due || i.amount || 0), 0);
    const totalPaid = invoices.reduce((s: number, i: any) => s + Number(i.paid_amount || i.amount_paid || 0), 0);
    const balance = invoices.reduce((s: number, i: any) => {
        const t = Number(i.total_due || i.amount || 0);
        const p = Number(i.paid_amount || i.amount_paid || 0);
        return s + Math.max(0, Number(i.balance ?? (t - p)));
    }, 0);

    return {
        term, items, structureTotal,        // structureTotal = indicative only
        billed, totalPaid, balance,          // these reflect issued invoices
        hasInvoices: invoices.length > 0,
        invoices, studentName: student?.studentName, registrationNo: student?.registrationNo || student?.admNo,
    };
};

// Group exam_marks into per-exam result rows (shared by student & parent portals).
const buildExamResults = async (db: Db, studentId: string) => {
    const marks = await db.collection('exam_marks').find({ studentId }).toArray();
    const exams = await db.collection('exams').find({}).toArray();
    const examMap: Record<string, any> = {};
    exams.forEach((e: any) => { examMap[e._id.toString()] = e; });

    const grouped: Record<string, any> = {};
    marks.forEach((m: any) => {
        const examId = m.examId?.toString() || 'unknown';
        const exam = examMap[examId] || {};
        if (!grouped[examId]) {
            grouped[examId] = {
                examId,
                examName: m.examName || exam.examName || exam.name || exam.type || 'Exam',
                term: m.term || exam.term || exam.academicYear || '',
                academicYear: exam.academicYear || '',
                subjects: [], totalMarks: 0, totalOutOf: 0,
            };
        }
        const obtained = Number(m.marksObtained || 0);
        const outOf = Number(m.totalMarks || 100);
        grouped[examId].subjects.push({ name: m.subjectName || '—', marks: obtained, outOf, grade: m.grade || '' });
        grouped[examId].totalMarks += obtained;
        grouped[examId].totalOutOf += outOf;
    });

    return Object.values(grouped).map((g: any) => ({
        ...g, average: g.totalOutOf > 0 ? (g.totalMarks / g.totalOutOf) * 100 : 0,
    })).sort((a: any, b: any) => String(b.examName).localeCompare(String(a.examName)));
};

// ─── Report-card grading by curriculum family ─────────────────────────────────
type Family = 'CBC' | 'KCSE' | 'Cambridge' | 'IB';

const templateFamily = (id?: string): Family => {
    const s = (id || '').toLowerCase();
    if (s.startsWith('cbc')) return 'CBC';
    if (s.startsWith('cam')) return 'Cambridge';
    if (s.startsWith('ib')) return 'IB';
    return 'KCSE'; // kcse_* and default
};

// Returns { grade, points, level } appropriate to the chosen curriculum.
const gradeFor = (family: Family, percent: number): { grade: string; points: number; level: string } => {
    const p = Math.max(0, Math.min(100, percent));
    if (family === 'CBC') {
        const level = p >= 80 ? 'EE' : p >= 60 ? 'ME' : p >= 40 ? 'AE' : 'BE';
        return { grade: level, points: 0, level };
    }
    if (family === 'Cambridge') {
        const grade = p >= 90 ? 'A*' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : p >= 40 ? 'E' : p >= 30 ? 'F' : p >= 20 ? 'G' : 'U';
        return { grade, points: 0, level: grade };
    }
    if (family === 'IB') {
        const pts = p >= 85 ? 7 : p >= 75 ? 6 : p >= 65 ? 5 : p >= 50 ? 4 : p >= 40 ? 3 : p >= 30 ? 2 : 1;
        return { grade: String(pts), points: pts, level: String(pts) };
    }
    // KCSE / 8-4-4 — 12-point scale
    const table: [number, string, number][] = [
        [80, 'A', 12], [75, 'A-', 11], [70, 'B+', 10], [65, 'B', 9], [60, 'B-', 8],
        [55, 'C+', 7], [50, 'C', 6], [45, 'C-', 5], [40, 'D+', 4], [35, 'D', 3], [30, 'D-', 2], [0, 'E', 1],
    ];
    const row = table.find(([min]) => p >= min) || table[table.length - 1];
    return { grade: row[1], points: row[2], level: row[1] };
};

// Decorate grouped exam results with family-specific grade / points / level.
const decorateResults = (results: any[], family: Family) =>
    results.map(exam => {
        const subjects = (exam.subjects || []).map((s: any) => {
            const percent = s.outOf > 0 ? (s.marks / s.outOf) * 100 : 0;
            const g = gradeFor(family, percent);
            return { ...s, percent: Math.round(percent * 10) / 10, grade: s.grade || g.grade, points: g.points, level: g.level };
        });
        const meanPercent = exam.average || 0;
        const mean = gradeFor(family, meanPercent);
        const totalPoints = subjects.reduce((sum: number, s: any) => sum + (s.points || 0), 0);
        return { ...exam, subjects, meanGrade: mean.grade, meanLevel: mean.level, points: family === 'KCSE' ? totalPoints : mean.points };
    });

// Best-effort: return the catalog of registrable units (subjects) for the student.
const registrableUnits = async (db: Db, student: any) => {
    const subjects = await db.collection('subjects').find({}).limit(100).toArray();
    return subjects.map((u: any) => ({
        _id: u._id.toString(),
        code: u.code || u.subjectCode || '',
        name: u.name || u.subjectName || u.title || 'Unit',
        creditHours: u.creditHours || u.credit_hours || 3,
    }));
};

// Map weekday abbreviations / variants to full names used by the grid UI.
const DAY_MAP: Record<string, string> = {
    MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
    MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};
const fullDay = (d: any) => DAY_MAP[String(d || '').toUpperCase()] || d;

// Resolve a student's class document _id from its (text) class name.
const resolveClassId = async (db: Db, className?: string): Promise<string | null> => {
    if (!className) return null;
    const norm = (s: any) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const lc = norm(className);
    try {
        const classes = await db.collection('classes').find({}).toArray();
        // Try several name shapes: combined level+stream, level only, name, className.
        const m = classes.find((c: any) => {
            const combined = norm(`${c.levelName || ''}${c.streamName && c.streamName !== 'General' ? ' ' + c.streamName : ''}`);
            return [combined, norm(c.levelName), norm(c.name), norm(c.className)].filter(Boolean).includes(lc);
        });
        if (m) return String(m._id);
    } catch { /* ignore */ }
    try {
        const mk = await db.collection('exam_marks').findOne({ className });
        if (mk?.classId) return String(mk.classId);
    } catch { /* ignore */ }
    return null;
};

// Build a weekday × time grid from timetable_slots, resolving the id references
// (subjectId / teacherId / roomId / periodId) to human-readable values.
const buildTimetable = async (db: Db, filter: any) => {
    let slots: any[] = [];
    try { slots = await db.collection('timetable_slots').find(filter || {}).toArray(); } catch { slots = []; }
    if (slots.length === 0) return { timeSlots: [], grid: {} };

    const [subjects, staff, rooms, pers] = await Promise.all([
        db.collection('subjects').find({}).toArray().catch(() => []),
        db.collection('staff').find({}).toArray().catch(() => []),
        db.collection('rooms').find({}).toArray().catch(() => []),
        db.collection('timetable_periods').find({}).toArray().catch(() => []),
    ]);
    const sMap: Record<string, string> = {}; subjects.forEach((x: any) => { sMap[String(x._id)] = x.name || x.subjectName; });
    const tMap: Record<string, string> = {}; staff.forEach((x: any) => { tMap[String(x._id)] = x.employeeName || x.name; });
    const rMap: Record<string, string> = {}; rooms.forEach((x: any) => { rMap[String(x._id)] = x.name; });
    const pMap: Record<string, { label: string; start: string }> = {};
    pers.forEach((x: any) => {
        const label = (x.start_time && x.end_time) ? `${x.start_time} - ${x.end_time}` : (x.name || x.start_time || '');
        pMap[String(x._id)] = { label, start: x.start_time || x.name || '' };
    });

    const order: Record<string, string> = {};
    const grid: Record<string, Record<string, any>> = {};
    slots.forEach((s: any) => {
        const day = fullDay(s.day || s.weekday || s.dayName);
        const per = pMap[String(s.periodId)] || { label: String(s.time || s.period || 'Period'), start: '' };
        const time = per.label;
        if (!day || !time) return;
        order[time] = per.start;
        grid[day] = grid[day] || {};
        grid[day][time] = {
            subject: sMap[String(s.subjectId)] || s.subjectName || '',
            teacher: tMap[String(s.teacherId)] || s.teacherName || '',
            room: rMap[String(s.roomId)] || s.roomName || '',
            className: s.className || '',
        };
    });

    const timeSlots = Object.keys(order).sort((a, b) => String(order[a]).localeCompare(String(order[b]), undefined, { numeric: true }));
    return { timeSlots, grid };
};

// ─── Student Portal: profile summary ──────────────────────────────────────────
router.get('/student-portal/summary', authed(async (req, res, db, decoded) => {
    const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
    const invoices = await studentInvoices(db, student, decoded.studentId);
    const { totalBilled, totalPaid, balance } = invoiceTotals(invoices);
    const term = await currentTermName(db);
    const reg = await db.collection('portal_registrations').findOne({ studentId: decoded.studentId, term });
    res.json({
        currentTerm: term,
        registrationStatus: reg ? 'Registered' : 'Not Registered',
        totalBilled, totalPaid, balance,
    });
}));

// ─── Academic calendar (years + terms with dates) ────────────────────────────
// Current term + all activities/important dates configured for it (Academic Term Settings).
const buildAcademicCalendar = async (db: Db) => {
    const terms = await db.collection('terms').find({}).toArray().catch(() => []);
    const term = terms.find((t: any) => t.isActive) || terms[terms.length - 1];
    if (!term) return { term: null, activities: [] };

    const years = await db.collection('academic_years').find({}).toArray().catch(() => []);
    const year = years.find((y: any) => String(y._id) === String(term.academicYearId));
    const s: any = (await db.collection('term_settings').findOne({ termId: String(term._id) }).catch(() => null)) || {};

    const activities: any[] = [];
    const add = (name: string, date: any, type = 'event', endDate: any = null) => { if (date) activities.push({ name, date, type, endDate }); };
    add('School Opening', s.schoolOpening, 'milestone');
    add('Reporting Day', s.reportingDay, 'milestone');
    add('Mid-Term Break', s.midTermBreakStart, 'break', s.midTermBreakEnd);
    add('Parent Meeting Day', s.parentMeetingDay, 'meeting');
    add('Examinations', s.examStartDate, 'exam', s.examEndDate);
    add('Assignment Due', s.assignmentDue, 'assessment');
    add('Project Submission', s.projectSubmission, 'assessment');
    add('Mark Entry Deadline', s.markEntryDeadline, 'assessment');
    add('Opening Fee Due', s.openingFeeDue, 'fee');
    add('Mid-Term Fee Due', s.midTermFeeDue, 'fee');
    add('Final Fee Due', s.finalFeeDue, 'fee');
    add('Results Release', s.resultRelease, 'results');
    add('Prize Giving Day', s.prizeGivingDay, 'milestone');
    add('Graduation', s.graduationDate, 'milestone');
    add('Closing Day', s.closingDate, 'milestone');

    // Free-text holidays ("Name | Start | End | Type") and activities ("Name | Date | Venue").
    String(s.holidays || '').split('\n').map((l: string) => l.trim()).filter(Boolean).forEach((line: string) => {
        const [name, start, end] = line.split('|').map((x: string) => x?.trim());
        if (name && start) activities.push({ name, date: start, endDate: end || null, type: 'holiday' });
    });
    String(s.activities || '').split('\n').map((l: string) => l.trim()).filter(Boolean).forEach((line: string) => {
        const [name, date, venue] = line.split('|').map((x: string) => x?.trim());
        if (name && date) activities.push({ name, date, venue: venue || '', type: 'activity' });
    });

    activities.sort((a, b) => +new Date(a.date) - +new Date(b.date));

    return {
        term: { name: term.name, year: year?.name || (term.academicYear ? `Academic Year ${term.academicYear}` : ''), startDate: term.startDate || null, endDate: term.endDate || null, learningWeeks: s.learningWeeks || null },
        activities,
    };
};

router.get('/student-portal/academic-calendar', authed(async (req, res, db) => {
    res.json(await buildAcademicCalendar(db));
}));

router.get('/parent-portal/academic-calendar', authed(async (req, res, db) => {
    res.json(await buildAcademicCalendar(db));
}));

// ─── Student Portal: registration ─────────────────────────────────────────────
router.get('/student-portal/registration', authed(async (req, res, db, decoded) => {
    const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
    const term = await currentTermName(db);
    const units = await registrableUnits(db, student);
    const reg = await db.collection('portal_registrations').findOne({ studentId: decoded.studentId, term });
    res.json({
        term,
        units,
        registeredUnitIds: reg?.unitIds || [],
        status: reg ? 'Registered' : 'Open',
    });
}));

router.post('/student-portal/registration', authed(async (req, res, db, decoded) => {
    const term = await currentTermName(db);
    const unitIds: string[] = Array.isArray(req.body?.unitIds) ? req.body.unitIds : [];
    if (unitIds.length === 0) return res.status(400).json({ message: 'Select at least one unit' });
    await db.collection('portal_registrations').updateOne(
        { studentId: decoded.studentId, term },
        { $set: { studentId: decoded.studentId, studentName: decoded.name, term, unitIds, status: 'Registered', updatedAt: new Date() } },
        { upsert: true },
    );
    res.json({ message: 'Registration saved', status: 'Registered' });
}));

// ─── Student Portal: timetable ────────────────────────────────────────────────
router.get('/student-portal/timetable', authed(async (req, res, db, decoded) => {
    const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
    const classId = student?.classId ? String(student.classId) : await resolveClassId(db, student?.studentClass || student?.currentClass);
    res.json(await buildTimetable(db, { classId: classId || '___none___' }));
}));

// ─── Student Portal: assignments & homework (view + submit) ───────────────────
const STUDENT_TASK: Record<string, string> = { assignment: 'academic_assignments', homework: 'homework' };

router.get('/student-portal/tasks/:type', authed(async (req, res, db, decoded) => {
    const col = STUDENT_TASK[req.params.type];
    if (!col) return res.status(404).json({ message: 'Unknown task type' });
    const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
    const cls = String(student?.studentClass || student?.currentClass || '');
    // Show items targeted at the student's class (or school-wide ones with no class).
    const items = await db.collection(col).find({ $or: [{ className: cls }, { className: { $in: [null, ''] } }] }).sort({ createdAt: -1 }).toArray();
    const subs = await db.collection('task_submissions').find({ studentId: decoded.studentId, type: req.params.type }).toArray();
    const subMap: Record<string, any> = {};
    subs.forEach((s: any) => { subMap[String(s.itemId)] = s; });
    res.json(items.map((it: any) => ({ ...it, submission: subMap[String(it._id)] || null })));
}));

router.post('/student-portal/tasks/:type/:id/submit', authed(async (req, res, db, decoded) => {
    if (!STUDENT_TASK[req.params.type]) return res.status(404).json({ message: 'Unknown task type' });
    const { answer, attachment, attachmentName, attachmentType } = req.body || {};
    if (!answer && !attachment) return res.status(400).json({ message: 'Provide a written answer or upload your work' });
    const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
    await db.collection('task_submissions').updateOne(
        { studentId: decoded.studentId, type: req.params.type, itemId: req.params.id },
        { $set: {
            studentId: decoded.studentId, studentName: student?.studentName, registrationNo: student?.registrationNo || student?.admNo,
            type: req.params.type, itemId: req.params.id, answer: answer || '', attachment: attachment || '', attachmentName, attachmentType,
            status: 'Submitted', submittedAt: new Date(),
        } },
        { upsert: true },
    );
    res.json({ message: 'Submitted successfully' });
}));

// ─── Notes & Resources visibility ─────────────────────────────────────────────
// Students: resources marked available (isPublic) for their class (or unscoped).
router.get('/student-portal/resources', authed(async (req, res, db, decoded) => {
    const student: any = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) }).catch(() => null);
    const cls = String(student?.studentClass || student?.className || '').toLowerCase();
    const all = await db.collection('academic_resources').find({ isPublic: { $ne: false } }).sort({ createdAt: -1 }).toArray();
    res.json(all.filter((r: any) => !r.className || !cls || String(r.className).toLowerCase() === cls));
}));

// Teachers: resources matching their assigned subjects (unscoped resources always shown).
router.get('/staff-portal/resources', authed(async (req, res, db, decoded) => {
    const staffId = String(decoded.staffId || '');
    const staff: any = await db.collection('staff').findOne({ _id: new ObjectId(staffId) }).catch(() => null);
    const subjectIds = new Set<string>();
    (staff?.subjects || staff?.assignedSubjects || []).forEach((s: any) => subjectIds.add(String(typeof s === 'object' ? (s.subjectId || s._id || s.id) : s)));
    const links = await db.collection('staff_subjects').find({ $or: [{ teacherId: staffId }, { staffId }] }).toArray().catch(() => []);
    links.forEach((l: any) => subjectIds.add(String(l.subjectId)));
    const all = await db.collection('academic_resources').find({}).sort({ createdAt: -1 }).toArray();
    res.json(subjectIds.size ? all.filter((r: any) => !r.subjectId || subjectIds.has(String(r.subjectId))) : all);
}));

// ─── Student Portal: academic requisitions ────────────────────────────────────
router.get('/student-portal/requisitions', authed(async (req, res, db, decoded) => {
    const items = await db.collection('portal_requisitions').find({ studentId: decoded.studentId }).sort({ createdAt: -1 }).toArray();
    res.json(items);
}));

router.post('/student-portal/requisitions', authed(async (req, res, db, decoded) => {
    const { type, reason } = req.body || {};
    if (!type || !reason) return res.status(400).json({ message: 'Type and reason are required' });
    const doc = { studentId: decoded.studentId, studentName: decoded.name, type, reason, status: 'Pending', createdAt: new Date() };
    const r = await db.collection('portal_requisitions').insertOne(doc);
    res.status(201).json({ _id: r.insertedId, ...doc });
}));

// ─── Student Portal: clearance ────────────────────────────────────────────────
const DEFAULT_CLEARANCE = ['Library', 'Finance / Bursary', 'Accommodation / Hostel', 'Department / Faculty', 'Games & Sports', 'Dean of Students'];

router.get('/student-portal/clearance', authed(async (req, res, db, decoded) => {
    const doc = await db.collection('portal_clearances').findOne({ studentId: decoded.studentId });
    if (!doc) {
        return res.json({ requested: false, departments: DEFAULT_CLEARANCE.map(name => ({ name, status: 'Pending' })) });
    }
    res.json({ requested: true, departments: doc.departments });
}));

router.post('/student-portal/clearance', authed(async (req, res, db, decoded) => {
    const existing = await db.collection('portal_clearances').findOne({ studentId: decoded.studentId });
    if (existing) return res.json({ requested: true, departments: existing.departments });
    const departments = DEFAULT_CLEARANCE.map(name => ({ name, status: 'Pending' }));
    await db.collection('portal_clearances').insertOne({
        studentId: decoded.studentId, studentName: decoded.name, departments, requestedAt: new Date(),
    });
    res.status(201).json({ requested: true, departments });
}));

// ─── Student Portal: fee structure ────────────────────────────────────────────
router.get('/student-portal/fee-structure', authed(async (req, res, db, decoded) => {
    const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
    const cls = String(student?.studentClass || student?.currentClass || '');
    let term = await currentTermName(db);
    let items: any[] = [];

    try {
        const structures = await db.collection('fee_structures').find({}).toArray();
        // Match the structure for THIS student's class only.
        const match = structures.find((s: any) => String(s.className || '').toLowerCase() === cls.toLowerCase())
            || structures.find((s: any) => Array.isArray(s.class_ids) && student?.classId && s.class_ids.map(String).includes(String(student.classId)));
        if (match) {
            if (match.term) term = `${match.term}${match.year ? ` ${match.year}` : ''}`;
            if (match.amounts && typeof match.amounts === 'object') {
                items = Object.entries(match.amounts).map(([name, amount]) => ({ name, amount: Number(amount) || 0 }));
            } else if (Array.isArray(match.items)) {
                items = match.items.map((it: any) => ({ name: it.description || it.category || it.name, amount: Number(it.amount) || 0 }));
            }
            items = items.filter((i: any) => i.amount > 0);
        }
    } catch { /* ignore */ }

    // Fallback to fee_particulars only if no class structure was found.
    if (items.length === 0) {
        try {
            const parts = await db.collection('fee_particulars').find({}).toArray();
            const out: any[] = [];
            parts.forEach((p: any) => {
                if (Array.isArray(p.particulars)) {
                    p.particulars.forEach((x: any) => out.push({ name: x.label, amount: Number(x.classAmounts?.[cls] ?? x.amount) || 0 }));
                } else {
                    out.push({ name: p.name || p.particular || p.description, amount: Number(p.amount) || 0 });
                }
            });
            items = out.filter((i: any) => i.amount > 0);
        } catch { /* ignore */ }
    }

    res.json({ term, items });
}));

// ─── Shared M-PESA STK helpers (student & parent) ─────────────────────────────
const initiateStk = async (req: Request, db: Db, sid: string, purpose: 'fees' | 'wallet' = 'fees') => {
    const { phone, amount, invoiceId } = req.body || {};
    if (!phone || !amount || Number(amount) <= 0) throw new Error('Phone number and a valid amount are required');
    const cfg = await resolveMpesaConfig(db);
    if (!isMpesaConfigured(cfg)) throw new Error('M-PESA payment is not set up for your school yet.');
    if (!cfg.callbackBase) throw new Error('M-PESA callback URL is not configured. Contact the school administrator.');

    const student = await db.collection('students').findOne({ _id: new ObjectId(sid) });
    const regNo = student?.registrationNo || student?.admNo || 'Fees';
    const r = await stkPush(cfg, {
        phone, amount: Number(amount),
        accountRef: regNo,            // M-PESA account number = student reg number
        description: purpose === 'wallet' ? 'Wallet top-up' : 'School fees',
        callbackUrl: `${cfg.callbackBase}/mpesa/callback`,
    });
    await getMetaDb().collection('mpesa_transactions').insertOne({
        checkoutRequestId: r.checkoutRequestId, merchantRequestId: r.merchantRequestId, purpose,
        tenantDbName: (req as any).tenantContext?.databaseName, studentId: sid, studentName: student?.studentName,
        registrationNo: regNo, invoiceId: purpose === 'wallet' ? null : (invoiceId || null), amount: Number(amount), phone,
        status: 'pending', applied: false, createdAt: new Date(),
    });
    return { checkoutRequestId: r.checkoutRequestId, message: r.customerMessage || 'Enter your M-PESA PIN on your phone to complete.' };
};

const checkStkStatus = (req: Request, db: Db) => checkStkAndComplete(db, String(req.query.checkoutRequestId || ''));

// ─── Student Portal: fee account + pay ────────────────────────────────────────
router.get('/student-portal/fees', authed(async (req, res, db, decoded) => {
    res.json(await buildFeesSummary(db, decoded.studentId));
}));

router.post('/student-portal/pay-mpesa', authed(async (req, res, db, decoded) => {
    res.json(await initiateStk(req, db, decoded.studentId));
}));

router.get('/student-portal/mpesa-status', authed(async (req, res, db) => {
    res.json(await checkStkStatus(req, db));
}));

// ─── Student Portal: wallet ───────────────────────────────────────────────────
router.get('/student-portal/wallet', authed(async (req, res, db, decoded) => {
    const wallet = await ensureWallet(db, decoded.studentId);
    const transactions = await getTransactions(db, wallet.walletId);
    res.json({ wallet, transactions });
}));

// Wallet top-up via M-PESA STK Push (credited on confirmation).
router.post('/student-portal/wallet/topup', authed(async (req, res, db, decoded) => {
    res.json(await initiateStk(req, db, decoded.studentId, 'wallet'));
}));

router.post('/student-portal/wallet/pay-fees', authed(async (req, res, db, decoded) => {
    // Pay only the outstanding fee balance — capped by the wallet balance.
    const summary = await buildFeesSummary(db, decoded.studentId);
    const feeBalance = Number(summary.balance || 0);
    if (feeBalance <= 0) return res.status(400).json({ message: 'You have no outstanding fee balance.' });

    const wallet = await ensureWallet(db, decoded.studentId);
    const payable = Math.min(feeBalance, Number(wallet.balance || 0));
    if (payable <= 0) return res.status(400).json({ message: 'Insufficient wallet balance.' });

    const w = await debitWallet(db, decoded.studentId, payable, { category: 'Fees', description: 'School fees payment from wallet', by: 'student' });
    const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
    await applyMpesaPayment(db, {
        studentId: decoded.studentId, studentName: student?.studentName,
        registrationNo: student?.registrationNo || student?.admNo,
        amount: payable, receipt: `${Date.now().toString().slice(-8)}`, method: 'WALLET',
    });
    res.json({ ...w, paid: payable, message: `KSh ${payable.toLocaleString()} paid towards fees` });
}));

// ─── Student Portal: receipts ─────────────────────────────────────────────────
router.get('/student-portal/receipts', authed(async (req, res, db, decoded) => {
    const student = await db.collection('students').findOne({ _id: new ObjectId(decoded.studentId) });
    const regNo = student?.registrationNo || student?.admNo;
    const sid = decoded.studentId;
    const match = { $or: [{ studentId: sid }, { student_id: sid }, ...(regNo ? [{ registrationNo: regNo }] : [])] };

    const collect = async (name: string) => {
        try { return await db.collection(name).find(match).toArray(); } catch { return []; }
    };
    const raw = [
        ...(await collect('payments')),
        ...(await collect('student_payment_requests')),
    ];

    const receipts = raw
        .filter((p: any) => !p.is_voided && (p.status ? p.status !== 'Rejected' : true))
        .map((p: any) => ({
            _id: String(p._id),
            receiptNo: p.receipt_no || p.receiptNo || p.reference || `ERCPT${String(p._id).slice(-6).toUpperCase()}`,
            date: p.createdAt || p.created_at || p.paidAt || p.date || p.submittedAt,
            paymentMode: p.method || p.payment_mode || p.paymentMode || p.mode || 'Direct Bank Deposit',
            amount: Number(p.amount || p.amount_paid || 0),
            status: p.status || 'Confirmed',
            reference: p.reference || p.transactionId || p.transactionNo || p.mpesaCode || '',
            purpose: p.notes || p.purpose || p.description || 'Fees payment',
            servedBy: p.servedBy || p.receivedBy || p.by || 'Self-Service Portal',
        }))
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    res.json(receipts);
}));

// ─── Student Portal: exam results / report card (template-aware) ──────────────
const tenantMetaRecord = async (req: Request) => {
    try {
        const tid = (req as any).tenantContext?.tenantId;
        if (!tid) return null;
        return await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(tid) });
    } catch { return null; }
};

// Builds a template-aware report card for a student (shared by student & parent).
const buildReportCard = async (db: Db, req: Request, sid: string, fallbackName?: string) => {
    const student = await db.collection('students').findOne({ _id: new ObjectId(sid) });
    const tenant = await tenantMetaRecord(req);
    const family = templateFamily(tenant?.reportTemplate);

    const all = decorateResults(await buildExamResults(db, sid), family);
    const terms = Array.from(new Set(all.map((r: any) => r.term).filter(Boolean)));
    const selectedTerm = req.query.term ? String(req.query.term) : (terms[0] || '');
    const results = selectedTerm ? all.filter((r: any) => r.term === selectedTerm) : all;

    return {
        template: { id: tenant?.reportTemplate || 'kcse_classic', family },
        school: { name: tenant?.name || '', crest: tenant?.crest || tenant?.logo || null },
        student: {
            name: student?.studentName || fallbackName,
            registrationNo: student?.registrationNo || student?.admNo,
            class: student?.studentClass || student?.currentClass,
            gender: student?.gender,
            photo: student?.studentPhoto || student?.photo || student?.avatar || null,
        },
        terms,
        term: selectedTerm,
        results,
    };
};

router.get('/student-portal/report-card', authed(async (req, res, db, decoded) => {
    res.json(await buildReportCard(db, req, decoded.studentId, decoded.name));
}));

// ─── Portal branding (school name + logo) — resolved from subdomain ───────────
router.get('/portal/branding', async (req, res) => {
    try {
        const tenant = await tenantMetaRecord(req);
        const b = tenant?.branding || {};
        res.json({
            name: b.schoolName || tenant?.name || '',
            logo: b.logo || tenant?.logo || tenant?.crest || null,
            favicon: b.favicon || null,
            primaryColor: b.primaryColor || null,
            secondaryColor: b.secondaryColor || null,
            loginBackground: b.loginBackground || null,
            portalTheme: b.portalTheme || 'light',
            customDomain: tenant?.customDomain || null,
        });
    } catch (e: any) {
        res.json({ name: '', logo: null });
    }
});

// ═══ Staff Portal ════════════════════════════════════════════════════════════

// Resolve the (class, subject) pairs a teacher is assigned to, plus the classes
// they may take a register for. Teacher assignments live on the staff document
// (`subjectAssignments: [{ subjectId, subjectName, classId, className }]`).
const staffAssignments = async (db: Db, decoded: any) => {
    const staffId = decoded.staffId;
    const oid = safeObjId(staffId);
    const staff = oid ? await db.collection('staff').findOne({ _id: oid }) : null;
    const sa: any[] = Array.isArray(staff?.subjectAssignments) ? staff!.subjectAssignments : [];

    const assignments: { classId: string; className: string; subject: string }[] = [];
    const seen = new Set<string>();
    sa.forEach((a: any) => {
        const className = a.className || a.class || '';
        const subject = a.subjectName || a.subject || '';
        const key = `${className}|${subject}`;
        if (!className || !subject || seen.has(key)) return;
        seen.add(key);
        assignments.push({ classId: String(a.classId || ''), className, subject });
    });

    // Class register: prefer classes the teacher formally heads; otherwise fall
    // back to the distinct classes they teach a subject in (so the feature works).
    let classTeacherOf: { classId: string; className: string }[] = [];
    try {
        const headed = await db.collection('classes').find({
            classTeacherId: { $in: [staffId, ...(oid ? [oid] : [])] },
        }).toArray();
        classTeacherOf = headed.map((c: any) => ({ classId: String(c._id), className: c.levelName || c.name }));
    } catch { /* ignore */ }
    if (classTeacherOf.length === 0) {
        const names = Array.from(new Set(assignments.map(a => a.className)));
        classTeacherOf = names.map(n => ({ classId: assignments.find(a => a.className === n)?.classId || '', className: n }));
    }

    return { assignments, classTeacherOf };
};

const studentsInClass = (db: Db, className: string) =>
    db.collection('students').find({
        $or: [{ studentClass: className }, { currentClass: className }],
    }).sort({ studentName: 1 }).toArray();

router.get('/staff-portal/assignments', authed(async (req, res, db, decoded) => {
    res.json(await staffAssignments(db, decoded));
}));

router.get('/staff-portal/summary', authed(async (req, res, db, decoded) => {
    const { assignments, classTeacherOf } = await staffAssignments(db, decoded);
    const classCount = new Set(assignments.map(a => a.className)).size;
    const subjectCount = new Set(assignments.map(a => a.subject)).size;
    const tt = await buildTimetable(db, { teacherId: decoded.staffId });
    const lessons = Object.values(tt.grid).reduce((s: number, day: any) => s + Object.keys(day).length, 0);
    res.json({ classCount, subjectCount, lessonsPerWeek: lessons, classTeacherCount: classTeacherOf.length });
}));

router.get('/staff-portal/my-classes', authed(async (req, res, db, decoded) => {
    const { assignments } = await staffAssignments(db, decoded);
    const out = await Promise.all(assignments.map(async (a) => {
        let studentCount = 0;
        try { studentCount = (await studentsInClass(db, a.className)).length; } catch { /* ignore */ }
        return { className: a.className, subjectName: a.subject, studentCount };
    }));
    res.json(out);
}));

router.get('/staff-portal/timetable', authed(async (req, res, db, decoded) => {
    res.json(await buildTimetable(db, { teacherId: decoded.staffId }));
}));

// Exams selectable for MARKS ENTRY — inactive exams (Draft/Archived/Completed)
// are excluded here so teachers can't enter marks for them. Viewing results is
// unaffected (the Results page does not use this list).
const INACTIVE_EXAM_STATUS = new Set(['draft', 'archived', 'completed', 'inactive']);

router.get('/staff-portal/exams', authed(async (req, res, db) => {
    const exams = (await db.collection('exams').find({}).sort({ createdAt: -1 }).toArray())
        .filter((e: any) => !INACTIVE_EXAM_STATUS.has(String(e.status || '').toLowerCase()));
    res.json(exams.map((e: any) => ({
        _id: String(e._id), name: e.examName || e.name || e.type || 'Exam',
        term: e.term, academicYear: e.academicYear,
        totalMarks: Number(e.settings?.totalMarks) || 100,   // "Out Of" from exam settings
    })));
}));

// Guard: confirm this teacher is assigned to (className, subject) before mutating.
const assertAssigned = async (db: Db, decoded: any, className: string, subject?: string) => {
    const { assignments, classTeacherOf } = await staffAssignments(db, decoded);
    if (subject) return assignments.some(a => a.className === className && a.subject === subject);
    return classTeacherOf.some(c => c.className === className) || assignments.some(a => a.className === className);
};

// Roster + existing marks for an exam+subject in a class.
router.get('/staff-portal/roster', authed(async (req, res, db, decoded) => {
    const className = String(req.query.className || '');
    const subject = String(req.query.subject || '');
    const examId = String(req.query.examId || '');
    if (!(await assertAssigned(db, decoded, className, subject))) {
        return res.status(403).json({ message: 'You are not assigned to this class/subject' });
    }
    const students = await studentsInClass(db, className);
    // "Out Of" is determined by the exam's Total Marks setting.
    const examDoc = examId ? await db.collection('exams').findOne({ _id: safeObjId(examId) || (examId as any) }) : null;
    const examOutOf = Number(examDoc?.settings?.totalMarks) || 100;
    const existing = examId ? await db.collection('exam_marks').find({ examId, subjectName: subject, className }).toArray() : [];
    const markMap: Record<string, any> = {};
    existing.forEach((m: any) => { markMap[String(m.studentId)] = m; });
    res.json(students.map((s: any) => ({
        studentId: String(s._id),
        name: s.studentName,
        registrationNo: s.registrationNo || s.admNo,
        marks: markMap[String(s._id)]?.marksObtained ?? '',
        outOf: examOutOf,
    })));
}));

router.post('/staff-portal/marks', authed(async (req, res, db, decoded) => {
    const { examId, examName, className, subject, term, outOf, marks } = req.body || {};
    if (!examId || !className || !subject || !Array.isArray(marks)) {
        return res.status(400).json({ message: 'examId, className, subject and marks are required' });
    }
    if (!(await assertAssigned(db, decoded, className, subject))) {
        return res.status(403).json({ message: 'You are not assigned to this class/subject' });
    }
    // Respect the exam's active status + "Allow Marks Entry" setting (default allowed).
    try {
        const oid = safeObjId(examId);
        const exam = oid ? await db.collection('exams').findOne({ _id: oid }) : null;
        if (exam && INACTIVE_EXAM_STATUS.has(String(exam.status || '').toLowerCase())) {
            return res.status(403).json({ message: 'This exam is inactive — marks entry is closed' });
        }
        if (exam?.settings && exam.settings.allowMarksEntry === false) {
            return res.status(403).json({ message: 'Marks entry is disabled for this exam by the administrator' });
        }
    } catch { /* ignore */ }
    const total = Number(outOf || 100);
    let saved = 0;
    for (const m of marks) {
        if (m.marks === '' || m.marks == null) continue;
        const obtained = Number(m.marks);
        await db.collection('exam_marks').updateOne(
            { examId, subjectName: subject, studentId: String(m.studentId) },
            { $set: {
                examId, examName: examName || 'Exam', term: term || '', className,
                subjectName: subject, studentId: String(m.studentId),
                marksObtained: obtained, totalMarks: total, markedBy: decoded.name, updatedAt: new Date(),
            } },
            { upsert: true },
        );
        saved++;
    }
    res.json({ message: `Saved ${saved} marks`, saved });
}));

// Results the teacher can view — per student, per class, for subjects they teach.
router.get('/staff-portal/results', authed(async (req, res, db, decoded) => {
    const className = String(req.query.className || '');
    const subject = String(req.query.subject || '');
    if (!(await assertAssigned(db, decoded, className, subject))) {
        return res.status(403).json({ message: 'You are not assigned to this class/subject' });
    }
    const students = await studentsInClass(db, className);
    const marks = await db.collection('exam_marks').find({ subjectName: subject, className }).toArray();
    const byStudent: Record<string, any[]> = {};
    marks.forEach((m: any) => { (byStudent[String(m.studentId)] ||= []).push(m); });

    const rows = students.map((s: any) => {
        const sm = byStudent[String(s._id)] || [];
        const pct = sm.length
            ? sm.reduce((acc, m) => acc + (Number(m.totalMarks) ? (Number(m.marksObtained) / Number(m.totalMarks)) * 100 : 0), 0) / sm.length
            : 0;
        return { studentId: String(s._id), name: s.studentName, registrationNo: s.registrationNo || s.admNo, examsTaken: sm.length, average: Math.round(pct * 10) / 10 };
    }).sort((a, b) => b.average - a.average).map((r, i) => ({ ...r, position: i + 1 }));

    const classAverage = rows.length ? Math.round((rows.reduce((s, r) => s + r.average, 0) / rows.length) * 10) / 10 : 0;
    res.json({ className, subject, classAverage, students: rows });
}));

// Attendance roster (subject attendance for a class, or class-teacher attendance).
router.get('/staff-portal/attendance', authed(async (req, res, db, decoded) => {
    const className = String(req.query.className || '');
    const subject = req.query.subject ? String(req.query.subject) : '';
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    if (!(await assertAssigned(db, decoded, className, subject || undefined))) {
        return res.status(403).json({ message: 'You are not assigned to this class' });
    }
    const students = await studentsInClass(db, className);
    const existing = await db.collection('student_attendance').find({ className, date, subject: subject || 'General' }).toArray();
    const map: Record<string, string> = {};
    existing.forEach((r: any) => { map[String(r.studentId)] = r.status; });
    res.json({
        className, subject: subject || 'General', date,
        students: students.map((s: any) => ({
            studentId: String(s._id), name: s.studentName,
            registrationNo: s.registrationNo || s.admNo, status: map[String(s._id)] || 'Present',
        })),
    });
}));

router.post('/staff-portal/attendance', authed(async (req, res, db, decoded) => {
    const { className, subject, date, records } = req.body || {};
    if (!className || !date || !Array.isArray(records)) {
        return res.status(400).json({ message: 'className, date and records are required' });
    }
    const subj = subject || 'General';
    if (!(await assertAssigned(db, decoded, className, subj === 'General' ? undefined : subj))) {
        return res.status(403).json({ message: 'You are not assigned to this class' });
    }
    let saved = 0;
    for (const r of records) {
        await db.collection('student_attendance').updateOne(
            { studentId: String(r.studentId), className, date, subject: subj },
            { $set: { studentId: String(r.studentId), className, date, subject: subj, status: r.status || 'Present', markedBy: decoded.name, updatedAt: new Date() } },
            { upsert: true },
        );
        saved++;
    }
    res.json({ message: `Attendance saved for ${saved} students`, saved });
}));

// The teacher's own attendance record.
router.get('/staff-portal/my-attendance', authed(async (req, res, db, decoded) => {
    let records: any[] = [];
    try {
        records = await db.collection('employee_attendance').find({
            $or: [{ staffId: decoded.staffId }, { employeeId: decoded.staffId }],
        }).sort({ date: -1 }).limit(60).toArray();
    } catch { /* ignore */ }
    const present = records.filter((r: any) => /present/i.test(r.status || '')).length;
    res.json({
        total: records.length,
        present,
        rate: records.length ? Math.round((present / records.length) * 100) : 0,
        records: records.map((r: any) => ({ date: r.date, status: r.status || 'Present' })),
    });
}));

// ─── Staff Portal: Academic Content (each teacher manages their own) ──────────
const STAFF_CONTENT: Record<string, string> = {
    'lesson-plans': 'lesson_plans',
    'schemes': 'schemes_of_work',
    'resources': 'academic_resources',
    'assignments': 'academic_assignments',
    'homework': 'homework',
};
const contentCollection = (type: string) => STAFF_CONTENT[type];
const ownFilter = (decoded: any) => ({ $or: [{ createdBy: decoded.staffId }, { teacherId: decoded.staffId }] });

router.get('/staff-portal/content/:type', authed(async (req, res, db, decoded) => {
    const col = contentCollection(req.params.type);
    if (!col) return res.status(404).json({ message: 'Unknown content type' });
    const items = await db.collection(col).find(ownFilter(decoded)).sort({ createdAt: -1 }).limit(200).toArray();
    res.json(items);
}));

router.post('/staff-portal/content/:type', authed(async (req, res, db, decoded) => {
    const col = contentCollection(req.params.type);
    if (!col) return res.status(404).json({ message: 'Unknown content type' });
    const doc = { ...(req.body || {}), createdBy: decoded.staffId, teacherId: decoded.staffId, teacherName: decoded.name, createdAt: new Date(), updatedAt: new Date() };
    const r = await db.collection(col).insertOne(doc);
    res.status(201).json({ _id: r.insertedId, ...doc });
}));

router.patch('/staff-portal/content/:type/:id', authed(async (req, res, db, decoded) => {
    const col = contentCollection(req.params.type);
    if (!col) return res.status(404).json({ message: 'Unknown content type' });
    const oid = safeObjId(req.params.id);
    if (!oid) return res.status(400).json({ message: 'Invalid id' });
    const { _id, createdBy, teacherId, createdAt, ...body } = req.body || {};
    await db.collection(col).updateOne({ _id: oid, ...ownFilter(decoded) }, { $set: { ...body, updatedAt: new Date() } });
    res.json({ message: 'Saved' });
}));

router.delete('/staff-portal/content/:type/:id', authed(async (req, res, db, decoded) => {
    const col = contentCollection(req.params.type);
    if (!col) return res.status(404).json({ message: 'Unknown content type' });
    const oid = safeObjId(req.params.id);
    if (!oid) return res.status(400).json({ message: 'Invalid id' });
    const r = await db.collection(col).deleteOne({ _id: oid, ...ownFilter(decoded) });
    if (r.deletedCount === 0) return res.status(404).json({ message: 'Not found or not yours' });
    res.json({ message: 'Deleted' });
}));

// Teacher: view submissions for one of their assignments/homework.
router.get('/staff-portal/content/:type/:id/submissions', authed(async (req, res, db, decoded) => {
    const col = contentCollection(req.params.type);
    const subType = req.params.type === 'assignments' ? 'assignment' : req.params.type === 'homework' ? 'homework' : null;
    if (!col || !subType) return res.status(400).json({ message: 'Submissions are only for assignments and homework' });
    const oid = safeObjId(req.params.id);
    const item = oid ? await db.collection(col).findOne({ _id: oid, ...ownFilter(decoded) }) : null;
    if (!item) return res.status(404).json({ message: 'Not found or not yours' });
    const submissions = await db.collection('task_submissions').find({ type: subType, itemId: req.params.id }).sort({ submittedAt: -1 }).toArray();
    res.json({ item: { title: item.title, totalMarks: item.totalMarks, className: item.className, subject: item.subject }, submissions });
}));

// Finance module (permission-gated): real collections/outstanding dashboard.
router.get('/staff-portal/finance/summary', authed(async (req, res, db, decoded) => {
    const staff = await db.collection('staff').findOne({ _id: new ObjectId(decoded.staffId) });
    const perms = staff ? await resolveStaffPermissions(db, staff) : [];
    if (!(perms.includes('*') || perms.includes('finance.view'))) return res.status(403).json({ message: 'You do not have finance access' });

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const payments = await db.collection('payments').find({}).sort({ createdAt: -1 }).toArray().catch(() => []);
    const invoices = await db.collection('invoices').find({}).toArray().catch(() => []);

    const num = (v: any) => Number(v || 0);
    const todayCollections = payments.filter((p: any) => p.createdAt && new Date(p.createdAt) >= startOfDay).reduce((s: number, p: any) => s + num(p.amount), 0);
    const totalCollected = payments.reduce((s: number, p: any) => s + num(p.amount), 0);
    const billed = invoices.reduce((s: number, i: any) => s + num(i.total_due ?? i.amount), 0);
    const paid = invoices.reduce((s: number, i: any) => s + num(i.paid_amount ?? i.amount_paid), 0);
    const outstanding = Math.max(0, billed - paid);
    const defaulters = new Set(invoices.filter((i: any) => num(i.balance ?? (num(i.total_due) - num(i.paid_amount))) > 0).map((i: any) => String(i.student_id || i.studentId))).size;

    res.json({
        todayCollections, totalCollected, billed, paid, outstanding, defaulters,
        recentPayments: payments.slice(0, 8).map((p: any) => ({ name: p.studentName, amount: num(p.amount), method: p.payment_mode || p.method, reference: p.reference, date: p.createdAt })),
    });
}));

// ── Staff-portal module dashboards (permission-gated, real data) ───────────────
const MODULE_GUARD: Record<string, string> = {
    accounting: 'accounting.income', hr: 'hr.manage', admissions: 'admissions.manage',
    library: 'library.manage', transport: 'transport.manage', boarding: 'boarding.manage',
    health: 'health.manage', reports: 'reports.view',
};

async function buildModuleSummary(db: Db, key: string) {
    const count = async (col: string, q: any = {}) => { try { return await db.collection(col).countDocuments(q); } catch { return 0; } };
    const all = async (col: string, q: any = {}) => { try { return await db.collection(col).find(q).toArray(); } catch { return []; } };
    const sum = (rows: any[], f: string) => rows.reduce((s, r) => s + Number(r[f] || 0), 0);
    const ksh = (n: number) => `KSh ${Number(n || 0).toLocaleString()}`;
    const d = (x: any) => (x ? new Date(x).toLocaleDateString('en-GB') : '');

    switch (key) {
        case 'accounting': {
            const income = await all('income'); const expenses = await all('expenses');
            const inc = sum(income, 'amount'); const exp = sum(expenses, 'amount');
            const recent = [
                ...income.map((r: any) => ({ title: r.source || r.description || 'Income', subtitle: 'Income · ' + d(r.date || r.createdAt), right: '+' + ksh(r.amount), ts: r.date || r.createdAt })),
                ...expenses.map((r: any) => ({ title: r.category || r.description || 'Expense', subtitle: 'Expense · ' + d(r.date || r.createdAt), right: '-' + ksh(r.amount), ts: r.date || r.createdAt })),
            ].sort((a, b) => +new Date(b.ts || 0) - +new Date(a.ts || 0)).slice(0, 8);
            return { stats: [{ label: 'Total Income', value: ksh(inc) }, { label: 'Total Expenses', value: ksh(exp) }, { label: 'Net Balance', value: ksh(inc - exp) }], recent };
        }
        case 'hr': {
            const staff = await all('staff');
            const teaching = staff.filter((s: any) => /teacher/i.test(s.designation || '') || s.isTeachingStaff).length;
            const pendingLeave = await count('leave_requests', { status: { $in: ['Pending', 'HOD Approved'] } });
            const recent = staff.slice(-8).reverse().map((s: any) => ({ title: s.employeeName || s.name, subtitle: s.designation || 'Staff', right: '' }));
            return { stats: [{ label: 'Total Staff', value: staff.length }, { label: 'Teaching Staff', value: teaching }, { label: 'Support Staff', value: staff.length - teaching }, { label: 'Pending Leave', value: pendingLeave }], recent };
        }
        case 'admissions': {
            const students = await all('students');
            const pending = await count('admissions', { status: { $in: ['Pending', 'pending', 'New'] } });
            const recent = [...students].sort((a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0)).slice(0, 8)
                .map((s: any) => ({ title: s.studentName, subtitle: `${s.studentClass || ''} · ${s.registrationNo || s.admNo || ''}`, right: d(s.createdAt || s.admissionDate) }));
            return { stats: [{ label: 'Total Students', value: students.length }, { label: 'Pending Admissions', value: pending }], recent };
        }
        case 'library': {
            const books = (await count('library_books')) || (await count('books'));
            const issued = (await count('library_loans')) || (await count('book_issues'));
            return { stats: [{ label: 'Total Books', value: books }, { label: 'Issued', value: issued }, { label: 'Available', value: Math.max(0, books - issued) }], recent: [] };
        }
        case 'transport': {
            const buses = await count('buses'); const zones = await count('transport_zones');
            const onTransport = await count('students', { transportZone: { $nin: [null, ''] } });
            return { stats: [{ label: 'Buses', value: buses }, { label: 'Routes / Zones', value: zones }, { label: 'Students on Transport', value: onTransport }], recent: [] };
        }
        case 'boarding': {
            const hostels = await count('hostels'); const beds = await count('hostel_beds'); const boarders = await count('hostel_allocations');
            return { stats: [{ label: 'Hostels', value: hostels }, { label: 'Beds', value: beds }, { label: 'Boarders', value: boarders }], recent: [] };
        }
        case 'health': {
            const records = await all('student_medical');
            const recent = records.slice(-8).reverse().map((r: any) => ({ title: r.studentName || 'Student', subtitle: r.condition || r.notes || 'Medical record', right: d(r.date || r.createdAt) }));
            return { stats: [{ label: 'Medical Records', value: records.length }], recent };
        }
        case 'reports': {
            const students = await count('students'); const staff = await count('staff');
            const collected = sum(await all('payments'), 'amount');
            return { stats: [{ label: 'Students', value: students }, { label: 'Staff', value: staff }, { label: 'Total Collected', value: ksh(collected) }], recent: [] };
        }
        default: return { stats: [], recent: [] };
    }
}

router.get('/staff-portal/module/:key/summary', authed(async (req, res, db, decoded) => {
    const guard = MODULE_GUARD[req.params.key];
    if (!guard) return res.status(404).json({ message: 'Unknown module' });
    const staff = await db.collection('staff').findOne({ _id: new ObjectId(decoded.staffId) });
    const perms = staff ? await resolveStaffPermissions(db, staff) : [];
    if (!(perms.includes('*') || perms.includes(guard))) return res.status(403).json({ message: 'You do not have access to this module' });
    res.json(await buildModuleSummary(db, req.params.key));
}));

// Teacher: grade a submission.
router.post('/staff-portal/submissions/:id/grade', authed(async (req, res, db, decoded) => {
    const { marks, feedback } = req.body || {};
    const oid = safeObjId(req.params.id);
    if (!oid) return res.status(400).json({ message: 'Invalid id' });
    await db.collection('task_submissions').updateOne(
        { _id: oid },
        { $set: { marks: marks != null && marks !== '' ? Number(marks) : null, feedback: feedback || '', status: 'Graded', gradedBy: decoded.name, gradedAt: new Date() } },
    );
    res.json({ message: 'Graded' });
}));

// ═══ Parent Portal ═══════════════════════════════════════════════════════════
router.get('/parent-portal/summary', authed(async (req, res, db, decoded) => {
    const sid = parentStudentId(req, decoded);
    const student = await db.collection('students').findOne({ _id: new ObjectId(sid) });
    const invoices = await studentInvoices(db, student, sid);
    const { balance } = invoiceTotals(invoices);
    const results = await buildExamResults(db, sid);
    const overallAverage = results.length ? results.reduce((s, r) => s + (r.average || 0), 0) / results.length : null;
    res.json({ balance, overallAverage });
}));

router.get('/parent-portal/exam-results', authed(async (req, res, db, decoded) => {
    res.json(await buildExamResults(db, parentStudentId(req, decoded)));
}));

router.get('/parent-portal/report-card', authed(async (req, res, db, decoded) => {
    res.json(await buildReportCard(db, req, parentStudentId(req, decoded), decoded.parentName));
}));

router.get('/parent-portal/fee-invoices', authed(async (req, res, db, decoded) => {
    const sid = parentStudentId(req, decoded);
    const student = await db.collection('students').findOne({ _id: new ObjectId(sid) });
    res.json(await studentInvoices(db, student, sid));
}));

router.get('/parent-portal/announcements', authed(async (req, res, db) => {
    const items = await db.collection('announcements').find({
        $or: [{ audience: 'All' }, { audience: 'Parents' }, { audience: 'Guardians' }],
    }).sort({ createdAt: -1 }).limit(10).toArray();
    res.json(items);
}));

router.get('/parent-portal/timetable', authed(async (req, res, db, decoded) => {
    const student = await db.collection('students').findOne({ _id: new ObjectId(parentStudentId(req, decoded)) });
    const classId = student?.classId ? String(student.classId) : await resolveClassId(db, student?.studentClass || student?.currentClass);
    res.json(await buildTimetable(db, { classId: classId || '___none___' }));
}));

router.get('/parent-portal/attendance', authed(async (req, res, db, decoded) => {
    const sid = parentStudentId(req, decoded);
    let records: any[] = [];
    try {
        records = await db.collection('student_attendance').find({
            $or: [{ studentId: sid }, { student_id: sid }],
        }).sort({ date: -1 }).limit(90).toArray();
    } catch { /* ignore */ }
    const present = records.filter((r: any) => /present/i.test(r.status || '')).length;
    res.json({
        total: records.length,
        present,
        absent: records.length - present,
        rate: records.length ? Math.round((present / records.length) * 100) : 0,
        records: records.map((r: any) => ({ date: r.date, subject: r.subject || 'General', status: r.status || 'Present' })),
    });
}));

router.get('/parent-portal/receipts', authed(async (req, res, db, decoded) => {
    const sid = parentStudentId(req, decoded);
    const student = await db.collection('students').findOne({ _id: new ObjectId(sid) });
    const regNo = student?.registrationNo || student?.admNo;
    const match = { $or: [{ studentId: sid }, { student_id: sid }, ...(regNo ? [{ registrationNo: regNo }] : [])] };
    const collect = async (name: string) => { try { return await db.collection(name).find(match).toArray(); } catch { return []; } };
    const raw = [...(await collect('payments')), ...(await collect('student_payment_requests'))];
    const receipts = raw
        .filter((p: any) => !p.is_voided && (p.status ? p.status !== 'Rejected' : true))
        .map((p: any) => ({
            _id: String(p._id),
            receiptNo: p.receipt_no || p.receiptNo || p.reference || `ERCPT${String(p._id).slice(-6).toUpperCase()}`,
            date: p.createdAt || p.created_at || p.paidAt || p.date || p.submittedAt,
            paymentMode: p.method || p.payment_mode || p.paymentMode || p.mode || 'Direct Bank Deposit',
            amount: Number(p.amount || p.amount_paid || 0),
        }))
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    res.json(receipts);
}));

router.get('/parent-portal/fees', authed(async (req, res, db, decoded) => {
    res.json(await buildFeesSummary(db, parentStudentId(req, decoded)));
}));

router.post('/parent-portal/pay-mpesa', authed(async (req, res, db, decoded) => {
    res.json(await initiateStk(req, db, parentStudentId(req, decoded)));
}));

router.get('/parent-portal/mpesa-status', authed(async (req, res, db) => {
    res.json(await checkStkStatus(req, db));
}));

// ─── Parent Portal: wallet (for the selected child) ──────────────────────────
router.get('/parent-portal/wallet', authed(async (req, res, db, decoded) => {
    const wallet = await ensureWallet(db, parentStudentId(req, decoded));
    const transactions = await getTransactions(db, wallet.walletId);
    res.json({ wallet, transactions });
}));

router.post('/parent-portal/wallet/topup', authed(async (req, res, db, decoded) => {
    res.json(await initiateStk(req, db, parentStudentId(req, decoded), 'wallet'));
}));

router.post('/parent-portal/wallet/status', authed(async (req, res, db, decoded) => {
    const { status } = req.body || {};
    if (!['Active', 'Frozen', 'Suspended'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    res.json(await setWalletStatus(db, parentStudentId(req, decoded), status));
}));

router.post('/parent-portal/wallet/limits', authed(async (req, res, db, decoded) => {
    res.json(await setWalletLimits(db, parentStudentId(req, decoded), req.body || {}));
}));

router.post('/parent-portal/pay-invoice', authed(async (req, res, db, decoded) => {
    const sid = parentStudentId(req, decoded);
    const { invoiceId, invoiceNo, amount, method, reference, phone, notes } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Valid amount is required' });
    const payment = {
        invoiceId, invoiceNo, studentId: sid,
        studentName: req.body?.studentName || '', payerType: 'parent', payerName: decoded.parentName || 'Parent',
        amount: Number(amount), method: method || 'MPESA', reference: reference || '', phone: phone || '', notes: notes || '',
        status: 'Pending', submittedAt: new Date(),
    };
    await db.collection('student_payment_requests').insertOne(payment);
    res.status(201).json({ message: 'Payment request submitted successfully', status: 'Pending' });
}));

// ── Parent portal: Trips & Excursions (consent + payment) ────────────────────
// Only OPTIONAL trips (feeMode !== 'Add To Fee Structure') are shown to parents
// for consent; fee-structure trips are billed automatically with school fees.
router.get('/parent-portal/trips', authed(async (req, res, db, decoded) => {
    const sid = parentStudentId(req, decoded);
    const today = new Date().toISOString().slice(0, 10);
    const student = await db.collection('students').findOne({ _id: new ObjectId(sid) });
    const childClass = String(student?.studentClass || student?.currentClass || '').trim().toLowerCase();

    const allTrips = await db.collection('trips').find({
        feeMode: { $ne: 'Add To Fee Structure' },
    }).sort({ date: 1 }).toArray().catch(() => []);

    // A trip belongs to this child if it has no class targeting OR the child's
    // class is among the targeted classes. Trips the child is already a
    // participant in are always shown.
    const parts = await db.collection('trip_participants').find({ studentId: sid }).toArray().catch(() => []);
    const byTrip: Record<string, any> = {};
    parts.forEach((p: any) => { byTrip[String(p.tripId)] = p; });

    const targets = (t: any): string[] => {
        const raw = t.targetClasses ?? t.classes ?? t.studentClass ?? t.class;
        if (Array.isArray(raw)) return raw.map((x: any) => String(x).trim().toLowerCase()).filter(Boolean);
        if (typeof raw === 'string' && raw.trim()) return raw.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        return [];
    };
    const trips = allTrips.filter((t: any) => {
        if (byTrip[String(t._id)]) return true;          // already enrolled → always show
        const tg = targets(t);
        return tg.length === 0 || (childClass && tg.includes(childClass)); // untargeted = whole school
    });

    res.json(trips.map((t: any) => {
        const p = byTrip[String(t._id)];
        return {
            _id: String(t._id),
            name: t.name,
            destination: t.destination || '',
            date: t.date || '',
            fee: Number(t.fee || 0),
            description: t.description || '',
            consentRequired: t.consentRequired !== 'No',
            deadline: t.deadline || '',
            isPast: t.date ? t.date < today : false,
            // Consent questions (one per line) the parent answers Yes/No to.
            consentQuestions: String(t.consentQuestions || '').split('\n').map((q: string) => q.trim()).filter(Boolean),
            // This child's status for the trip.
            consentStatus: p ? (p.status === 'declined' ? 'declined' : 'approved') : 'pending',
            paid: !!(p && (p.paid || p.status === 'confirmed')),
            participantId: p ? String(p._id) : null,
            invoiceNo: p?.invoiceNo || null,
            // Echo back any previously-submitted answers/signature.
            answers: p?.consentAnswers || null,
            signature: p?.signature || null,
        };
    }));
}));

// Approve/decline a trip for the active child. Approving an optional trip with a
// fee posts an invoice so the parent can pay it like any other fee.
router.post('/parent-portal/trips/:id/consent', authed(async (req, res, db, decoded) => {
    const sid = parentStudentId(req, decoded);
    const trip = await db.collection('trips').findOne({ _id: new ObjectId(req.params.id) });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const student = await db.collection('students').findOne({ _id: new ObjectId(sid) });
    const studentName = student?.studentName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim();
    const studentClass = student?.studentClass || student?.currentClass || '';
    const decision = (req.body?.decision || 'approve').toLowerCase();

    // Update or create this child's participant record.
    const existing = await db.collection('trip_participants').findOne({ tripId: req.params.id, studentId: sid });

    if (decision === 'decline') {
        if (existing) await db.collection('trip_participants').updateOne({ _id: existing._id }, { $set: { status: 'declined', updatedAt: new Date() } });
        else await db.collection('trip_participants').insertOne({ tripId: req.params.id, tripName: trip.name, studentId: sid, studentName, studentClass, status: 'declined', paid: false, createdAt: new Date() });
        return res.json({ status: 'declined' });
    }

    // Approve → ensure an invoice exists for the fee (if any).
    let invoiceNo = existing?.invoiceNo || null;
    let invoiceId = existing?.invoiceId || null;
    const fee = Number(trip.fee || 0);
    if (fee > 0 && !invoiceNo) {
        const count = await db.collection('invoices').countDocuments({});
        invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
        const inv = await db.collection('invoices').insertOne({
            invoice_no: invoiceNo, student_id: sid, studentName, studentClass,
            items: [{ description: `${trip.name} (Trip) — ${trip.destination || ''}`.trim(), amount: fee }],
            total: fee, total_due: fee, balance: fee, amountPaid: 0, status: 'unpaid',
            category: 'Trips', createdAt: new Date(), date: new Date().toISOString().slice(0, 10),
        });
        invoiceId = String(inv.insertedId);
    }

    // Digital consent: store the parent's Yes/No answers + signature (data URL).
    const consentAnswers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : null;
    const signature = typeof req.body?.signature === 'string' ? req.body.signature : null;

    const set: any = { tripId: req.params.id, tripName: trip.name, studentId: sid, studentName, studentClass, fee, invoiceNo, invoiceId, status: fee > 0 ? 'awaiting_payment' : 'confirmed', paid: fee <= 0, consentAnswers, signature, consentedBy: decoded.parentName || 'Parent', consentedAt: new Date(), updatedAt: new Date() };
    if (existing) await db.collection('trip_participants').updateOne({ _id: existing._id }, { $set: set });
    else await db.collection('trip_participants').insertOne({ ...set, createdAt: new Date() });

    res.json({ status: set.status, invoiceNo, fee });
}));

router.get('/tenant/profile', getTenantProfile);
router.patch('/tenant/profile', updateTenantProfile);
router.patch('/tenant/user/:id', updateUser);
router.delete('/tenant/user/:id', deleteUser);

export default router;
