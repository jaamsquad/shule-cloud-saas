import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { getMetaDb, getTenantDb } from '../lib/mongodb';
import {
    ensureOrgIndexes, listBranches, createBranch, accessibleBranches,
    canAccessBranch, audit, ORG_ROLES, isOrgWideRole,
} from '../services/organization.service';
import { signOrgToken, requireOrgAuth, requireOrgRole } from '../middleware/orgAuth';
import {
    readableBranchDbs, aggregateEnrollment, aggregateFeeCollection,
    aggregateIncomeExpense, aggregateStaff,
} from '../services/orgAggregate.service';
import { branchDb } from '../services/organization.service';

const router = Router();
ensureOrgIndexes().catch(() => { });

const ipOf = (req: Request) => (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
const deviceOf = (req: Request) => String(req.headers['user-agent'] || '');
const num = (v: any) => Number(v) || 0;

// ─── Org auth ─────────────────────────────────────────────────────────────────
router.post('/org/auth/login', async (req: Request, res: Response) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const password = String(req.body?.password || '');
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
        const meta = getMetaDb();
        const u: any = await meta.collection('OrgUser').findOne({ email });
        if (!u || !(await bcrypt.compare(password, u.passwordHash || ''))) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        const org = await meta.collection('Organization').findOne({ _id: new ObjectId(String(u.organizationId)) });
        const principal = {
            orgUserId: String(u._id), organizationId: String(u.organizationId), role: u.role,
            allowedBranchIds: (u.allowedBranchIds || []).map(String), name: u.name, email: u.email,
        };
        const token = signOrgToken(principal);
        await audit({ organizationId: principal.organizationId, userId: principal.orgUserId, userName: u.name, action: 'org.login', ip: ipOf(req), device: deviceOf(req) });
        res.json({ token, user: { ...principal, organizationName: org?.name } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Current org user + the branches they can switch between.
router.get('/org/me', requireOrgAuth, async (req: Request, res: Response) => {
    const meta = getMetaDb();
    const org = await meta.collection('Organization').findOne({ _id: new ObjectId(req.orgUser!.organizationId) });
    const branches = await accessibleBranches(req.orgUser!);
    res.json({
        user: req.orgUser,
        organization: org ? { id: String(org._id), name: org.name, branding: org.branding || null } : null,
        branches: branches.map(b => ({ id: String(b._id), name: b.name, subdomain: b.subdomain, isPrimary: !!b.isPrimary })),
    });
});

// ─── Organizations (Super-Owner / bootstrap) ──────────────────────────────────
// Create an organization with its owner user and primary branch in one shot.
router.post('/org/organizations', async (req: Request, res: Response) => {
    try {
        const { name, ownerEmail, ownerName, password, primaryBranch } = req.body || {};
        if (!name || !ownerEmail || !password) return res.status(400).json({ message: 'Organization name, owner email and password are required.' });
        const meta = getMetaDb();
        const email = String(ownerEmail).trim().toLowerCase();
        if (await meta.collection('OrgUser').findOne({ email })) return res.status(409).json({ message: 'That owner email already exists.' });

        const orgRes = await meta.collection('Organization').insertOne({ name, ownerEmail: email, branding: null, createdAt: new Date() });
        const organizationId = String(orgRes.insertedId);

        const ownerRes = await meta.collection('OrgUser').insertOne({
            organizationId, email, name: ownerName || name, role: 'ORG_OWNER',
            allowedBranchIds: [], passwordHash: await bcrypt.hash(String(password), 10), createdAt: new Date(),
        });

        let branch = null;
        if (primaryBranch?.name && primaryBranch?.subdomain) {
            branch = await createBranch({ organizationId, name: primaryBranch.name, subdomain: primaryBranch.subdomain, isPrimary: true });
        }
        await audit({ organizationId, userId: String(ownerRes.insertedId), action: 'org.create', newValue: { name }, ip: ipOf(req), device: deviceOf(req) });
        res.json({ ok: true, organizationId, branch });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Branches ─────────────────────────────────────────────────────────────────
router.get('/org/branches', requireOrgAuth, async (req: Request, res: Response) => {
    const branches = await accessibleBranches(req.orgUser!);
    res.json(branches.map(b => ({ id: String(b._id), name: b.name, subdomain: b.subdomain, databaseName: b.databaseName, isPrimary: !!b.isPrimary, status: b.status })));
});

// Create a new branch (= new tenant DB) — Org Owner/Admin only.
// Branches no longer have a user-facing subdomain: a unique internal one is
// generated from the name. Everything is accessed under the organization URL.
router.post('/org/branches', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { name } = req.body || {};
        if (!name) return res.status(400).json({ message: 'Branch name is required.' });
        const meta = getMetaDb();
        // Derive a unique internal subdomain from the branch name + org slug.
        const orgRow = await meta.collection('Organization').findOne({ _id: new ObjectId(req.orgUser!.organizationId) });
        const slug = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18);
        const base = `${slug(orgRow?.name || 'org')}-${slug(name)}` || `branch-${Date.now().toString(36)}`;
        let sub = base, n = 1;
        while (await meta.collection('Tenant').findOne({ subdomain: sub })) { sub = `${base}-${++n}`; }
        const branch = await createBranch({ organizationId: req.orgUser!.organizationId, name, subdomain: sub });
        await audit({ organizationId: req.orgUser!.organizationId, branchId: String(branch._id), userId: req.orgUser!.orgUserId, userName: req.orgUser!.name, action: 'branch.create', newValue: { name, subdomain: sub }, ip: ipOf(req), device: deviceOf(req) });
        res.json({ ok: true, branch: { id: String(branch._id), name: branch.name, subdomain: branch.subdomain } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Org users (manage who can access which branches) ─────────────────────────
router.get('/org/users', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN'), async (req: Request, res: Response) => {
    const users = await getMetaDb().collection('OrgUser').find({ organizationId: req.orgUser!.organizationId }).project({ passwordHash: 0 }).toArray();
    res.json(users.map(u => ({ id: String(u._id), email: u.email, name: u.name, role: u.role, allowedBranchIds: (u.allowedBranchIds || []).map(String) })));
});

router.post('/org/users', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { email, name, role, password, allowedBranchIds } = req.body || {};
        if (!email || !role || !password) return res.status(400).json({ message: 'Email, role and password are required.' });
        if (![...ORG_ROLES].includes(role)) return res.status(400).json({ message: 'Invalid org role.' });
        const meta = getMetaDb();
        const lc = String(email).trim().toLowerCase();
        if (await meta.collection('OrgUser').findOne({ email: lc })) return res.status(409).json({ message: 'That email already exists.' });
        const r = await meta.collection('OrgUser').insertOne({
            organizationId: req.orgUser!.organizationId, email: lc, name: name || lc, role,
            allowedBranchIds: isOrgWideRole(role) ? [] : (allowedBranchIds || []).map(String),
            passwordHash: await bcrypt.hash(String(password), 10), createdAt: new Date(),
        });
        await audit({ organizationId: req.orgUser!.organizationId, userId: req.orgUser!.orgUserId, action: 'orguser.create', newValue: { email: lc, role }, ip: ipOf(req), device: deviceOf(req) });
        res.json({ ok: true, id: String(r.insertedId) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Create an admin account for a specific branch (a school_admin in that branch's
// tenant). The person can then log into that branch directly, and an org user
// with this email can enter the branch from the switcher without a password.
router.post('/org/branch-admin', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { branchId, email, name, phone, password } = req.body || {};
        if (!branchId || !email || !password) return res.status(400).json({ message: 'Branch, email and password are required.' });
        if (!(await canAccessBranch(req.orgUser!, branchId))) return res.status(403).json({ message: 'No access to that branch.' });
        const meta = getMetaDb();
        const branch: any = await meta.collection('Branch').findOne({ _id: new ObjectId(branchId), organizationId: req.orgUser!.organizationId });
        if (!branch) return res.status(404).json({ message: 'Branch not found.' });
        const tenant: any = await meta.collection('Tenant').findOne({ _id: new ObjectId(String(branch.tenantId)) });
        const lc = String(email).trim().toLowerCase();
        // Unique per tenant (the same email may admin different branches).
        const existing = await meta.collection('User').findOne({ email: lc, $or: [{ tenantId: tenant._id }, { tenantId: String(tenant._id) }] });
        if (existing) return res.status(409).json({ message: 'An admin with that email already exists in this branch.' });
        await meta.collection('User').insertOne({
            tenantId: tenant._id, tenantSubdomain: tenant.subdomain, email: lc,
            passwordHash: await bcrypt.hash(String(password), 10), name: name || lc.split('@')[0],
            phone: phone || '', role: 'school_admin', isSchoolAdmin: true, status: 'active', createdAt: new Date(),
        });
        await audit({ organizationId: req.orgUser!.organizationId, branchId, userId: req.orgUser!.orgUserId, userName: req.orgUser!.name, action: 'branchadmin.create', newValue: { email: lc, branch: branch.name }, ip: ipOf(req), device: deviceOf(req) });
        res.json({ ok: true, message: `Admin created for ${branch.name}.` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Enter a branch from an org session (no password) ─────────────────────────
// Mints a valid school token for the chosen branch by matching the org user's
// email to an existing account in that branch DB. Branches stay separate DBs;
// the user lands in the branch app fully logged in under the same org URL.
router.post('/org/enter-branch/:branchId', requireOrgAuth, async (req: Request, res: Response) => {
    try {
        const jwtLib = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'secret';
        if (!(await canAccessBranch(req.orgUser!, req.params.branchId))) return res.status(403).json({ message: 'You do not have access to that branch.' });
        const meta = getMetaDb();
        const branch: any = await meta.collection('Branch').findOne({ _id: new ObjectId(req.params.branchId), organizationId: req.orgUser!.organizationId });
        if (!branch) return res.status(404).json({ message: 'Branch not found.' });
        const email = String(req.orgUser!.email || '').toLowerCase();

        // 1) Admin/User account in the meta DB scoped to this branch's tenant.
        const tenant = await meta.collection('Tenant').findOne({ _id: new ObjectId(String(branch.tenantId)) });
        let user: any = null, role = 'admin', name = req.orgUser!.name, sub = '';
        if (email) {
            user = await meta.collection('User').findOne({ email, $or: [{ tenantId: tenant?._id }, { tenantId: String(tenant?._id) }] })
                || await meta.collection('User').findOne({ email });
            if (user) { role = user.role || 'admin'; name = user.name || name; sub = String(user._id); }
        }
        // 2) Fall back to a staff account in the branch DB by email/username.
        if (!user && email) {
            const db = getTenantDb(branch.databaseName);
            const staff = await db.collection('staff').findOne({ $or: [{ email }, { portalUsername: email }] }).catch(() => null);
            if (staff) { role = 'staff'; name = staff.employeeName || staff.name || name; sub = String(staff._id); }
            else return res.status(404).json({ message: `No account found for ${email} in ${branch.name}. Ask a branch admin to add you.` });
        }
        if (!sub && req.orgUser!.role === 'ORG_OWNER') { sub = req.orgUser!.orgUserId; role = 'admin'; }   // owners always allowed
        if (!sub) return res.status(404).json({ message: `No account found for you in ${branch.name}.` });

        const token = jwtLib.sign({ sub, email, tenantId: String(tenant?._id), tenantSubdomain: branch.subdomain, role, name }, secret, { expiresIn: '7d' });
        await audit({ organizationId: req.orgUser!.organizationId, branchId: req.params.branchId, userId: req.orgUser!.orgUserId, userName: req.orgUser!.name, action: 'branch.enter', ip: ipOf(req), device: deviceOf(req) });
        res.json({ ok: true, token, subdomain: branch.subdomain, branchName: branch.name, role, name });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Branch access guard for the tenant app ───────────────────────────────────
// The frontend's branch switcher sends the chosen branch's subdomain in the
// normal x-tenant-subdomain header, so the whole existing app scopes to it. This
// endpoint lets the UI verify (and the gateway enforce) that the org user is
// actually allowed into that branch before switching.
router.get('/org/can-switch/:branchId', requireOrgAuth, async (req: Request, res: Response) => {
    const ok = await canAccessBranch(req.orgUser!, req.params.branchId);
    res.json({ ok });
});

// ─── Organization aggregation (dashboards & reports) ──────────────────────────
// All accept optional ?branchIds=a,b (subset) and ?from=&to= (date range). With
// no branchIds, they cover every branch the user can read.
const parseRange = (req: Request) => {
    const { from, to } = req.query as any;
    return { from: from ? new Date(from) : undefined, to: to ? (() => { const d = new Date(to); d.setHours(23, 59, 59); return d; })() : undefined };
};
const parseBranchIds = (req: Request) => String(req.query.branchIds || '').split(',').map(s => s.trim()).filter(Boolean);

router.get('/org/aggregate/overview', requireOrgAuth, async (req: Request, res: Response) => {
    try {
        const branches = await readableBranchDbs(req.orgUser!, parseBranchIds(req));
        const { from, to } = parseRange(req);
        const [enrollment, fees, finance, staff] = await Promise.all([
            aggregateEnrollment(branches),
            aggregateFeeCollection(branches, from, to),
            aggregateIncomeExpense(branches, from, to),
            aggregateStaff(branches),
        ]);
        res.json({ branchCount: branches.length, enrollment, fees, finance, staff });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/org/aggregate/enrollment', requireOrgAuth, async (req, res) => {
    try { res.json(await aggregateEnrollment(await readableBranchDbs(req.orgUser!, parseBranchIds(req)))); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/org/aggregate/fees', requireOrgAuth, async (req, res) => {
    try { const { from, to } = parseRange(req); res.json(await aggregateFeeCollection(await readableBranchDbs(req.orgUser!, parseBranchIds(req)), from, to)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/org/aggregate/finance', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN', 'ORG_FINANCE_MANAGER'), async (req, res) => {
    try { const { from, to } = parseRange(req); res.json(await aggregateIncomeExpense(await readableBranchDbs(req.orgUser!, parseBranchIds(req)), from, to)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/org/aggregate/staff', requireOrgAuth, async (req, res) => {
    try { res.json(await aggregateStaff(await readableBranchDbs(req.orgUser!, parseBranchIds(req)))); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Student transfer between branches ────────────────────────────────────────
// Copies the student into the destination branch DB (becomes their current
// branch), flags the source record transferredOut (history kept, never deleted),
// optionally carries the fee balance, logs in both DBs + org audit, and returns
// the data for a transfer letter.
router.post('/org/transfer/student', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { studentId, fromBranchId, toBranchId, reason, transferBalance } = req.body || {};
        if (!studentId || !fromBranchId || !toBranchId) return res.status(400).json({ message: 'studentId, fromBranchId and toBranchId are required.' });
        if (fromBranchId === toBranchId) return res.status(400).json({ message: 'Source and destination branches are the same.' });
        if (!(await canAccessBranch(req.orgUser!, fromBranchId)) || !(await canAccessBranch(req.orgUser!, toBranchId))) {
            return res.status(403).json({ message: 'You do not have access to one of these branches.' });
        }
        const fromDb = await branchDb(req.orgUser!.organizationId, fromBranchId);
        const toDb = await branchDb(req.orgUser!.organizationId, toBranchId);
        if (!fromDb || !toDb) return res.status(404).json({ message: 'Branch database not found.' });

        const student: any = await fromDb.collection('students').findOne({ _id: new ObjectId(String(studentId)) });
        if (!student) return res.status(404).json({ message: 'Student not found in the source branch.' });

        const now = new Date();
        const fromMeta = await getMetaDb().collection('Branch').findOne({ _id: new ObjectId(String(fromBranchId)) });
        const toMeta = await getMetaDb().collection('Branch').findOne({ _id: new ObjectId(String(toBranchId)) });

        // Build the transfer history entry (kept on the record forever).
        const historyEntry = {
            fromBranchId: String(fromBranchId), fromBranchName: fromMeta?.name,
            toBranchId: String(toBranchId), toBranchName: toMeta?.name,
            date: now, reason: reason || '', approvedBy: req.orgUser!.name || req.orgUser!.email,
        };

        // Outstanding balance (optional carry-over).
        let carriedBalance = 0;
        if (transferBalance) {
            const invs = await fromDb.collection('invoices').find({ $or: [{ studentId: String(student._id) }, { student_id: String(student._id) }] }).toArray().catch(() => []);
            carriedBalance = invs.reduce((s: number, inv: any) => s + Math.max(0, num(inv.total_due || inv.amount || 0) - num(inv.paid_amount || inv.amount_paid || 0)), 0);
        }

        // Insert into destination as current branch; preserve full timeline.
        const { _id, ...rest } = student;
        const transferHistory = [...(student.transferHistory || []), historyEntry];
        await toDb.collection('students').insertOne({
            ...rest, currentBranchId: String(toBranchId), currentBranchName: toMeta?.name,
            transferHistory, transferredInAt: now, originStudentId: String(_id),
            ...(carriedBalance > 0 ? { openingBalance: carriedBalance, carriedFromBranch: fromMeta?.name } : {}),
        });

        // Flag the source record (kept as history, marked transferred out).
        await fromDb.collection('students').updateOne(
            { _id: student._id },
            { $set: { status: 'transferred', transferredOut: true, transferredOutAt: now, transferHistory }, $unset: { } },
        );

        // Log in both branch DBs + the org audit trail.
        const log = { studentId: String(student._id), studentName: student.studentName, ...historyEntry, type: 'student' };
        await fromDb.collection('transfer_logs').insertOne({ ...log, direction: 'out' }).catch(() => { });
        await toDb.collection('transfer_logs').insertOne({ ...log, direction: 'in' }).catch(() => { });
        await audit({
            organizationId: req.orgUser!.organizationId, branchId: String(toBranchId),
            userId: req.orgUser!.orgUserId, userName: req.orgUser!.name, action: 'transfer.student',
            oldValue: { branch: fromMeta?.name }, newValue: { branch: toMeta?.name, reason, carriedBalance },
            ip: ipOf(req), device: deviceOf(req),
        });

        res.json({ ok: true, message: `${student.studentName} transferred to ${toMeta?.name}.`, letter: { student: student.studentName, from: fromMeta?.name, to: toMeta?.name, date: now, reason, approvedBy: historyEntry.approvedBy, carriedBalance } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Staff transfer between branches ──────────────────────────────────────────
router.post('/org/transfer/staff', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN', 'ORG_HR_MANAGER'), async (req: Request, res: Response) => {
    try {
        const { staffId, fromBranchId, toBranchId, reason, position, effectiveDate } = req.body || {};
        if (!staffId || !fromBranchId || !toBranchId) return res.status(400).json({ message: 'staffId, fromBranchId and toBranchId are required.' });
        if (fromBranchId === toBranchId) return res.status(400).json({ message: 'Source and destination branches are the same.' });
        if (!(await canAccessBranch(req.orgUser!, fromBranchId)) || !(await canAccessBranch(req.orgUser!, toBranchId))) {
            return res.status(403).json({ message: 'You do not have access to one of these branches.' });
        }
        const fromDb = await branchDb(req.orgUser!.organizationId, fromBranchId);
        const toDb = await branchDb(req.orgUser!.organizationId, toBranchId);
        if (!fromDb || !toDb) return res.status(404).json({ message: 'Branch database not found.' });

        const staff: any = await fromDb.collection('staff').findOne({ _id: new ObjectId(String(staffId)) });
        if (!staff) return res.status(404).json({ message: 'Staff member not found in the source branch.' });

        const now = new Date();
        const eff = effectiveDate ? new Date(effectiveDate) : now;
        const fromMeta = await getMetaDb().collection('Branch').findOne({ _id: new ObjectId(String(fromBranchId)) });
        const toMeta = await getMetaDb().collection('Branch').findOne({ _id: new ObjectId(String(toBranchId)) });
        const historyEntry = {
            fromBranchId: String(fromBranchId), fromBranchName: fromMeta?.name,
            toBranchId: String(toBranchId), toBranchName: toMeta?.name,
            position: position || staff.position || staff.role, effectiveDate: eff,
            reason: reason || '', approvedBy: req.orgUser!.name || req.orgUser!.email,
        };
        const transferHistory = [...(staff.transferHistory || []), historyEntry];

        const { _id, ...rest } = staff;
        await toDb.collection('staff').insertOne({
            ...rest, currentBranchId: String(toBranchId), currentBranchName: toMeta?.name,
            position: position || staff.position, transferHistory, transferredInAt: now, originStaffId: String(_id),
        });
        await fromDb.collection('staff').updateOne({ _id: staff._id }, { $set: { status: 'transferred', transferredOut: true, transferredOutAt: now, transferHistory } });

        const log = { staffId: String(staff._id), name: staff.name || staff.staffName, ...historyEntry, type: 'staff' };
        await fromDb.collection('transfer_logs').insertOne({ ...log, direction: 'out' }).catch(() => { });
        await toDb.collection('transfer_logs').insertOne({ ...log, direction: 'in' }).catch(() => { });
        await audit({
            organizationId: req.orgUser!.organizationId, branchId: String(toBranchId),
            userId: req.orgUser!.orgUserId, userName: req.orgUser!.name, action: 'transfer.staff',
            oldValue: { branch: fromMeta?.name }, newValue: { branch: toMeta?.name, position, reason },
            ip: ipOf(req), device: deviceOf(req),
        });
        res.json({ ok: true, message: `${staff.name || staff.staffName} transferred to ${toMeta?.name}.`, letter: { name: staff.name || staff.staffName, from: fromMeta?.name, to: toMeta?.name, position: historyEntry.position, effectiveDate: eff, reason, approvedBy: historyEntry.approvedBy } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Student timeline (all branches attended) ─────────────────────────────────
// Reads the transferHistory stamped on the student record (present in whichever
// branch currently holds them) plus transfer_logs across branches.
router.get('/org/student-timeline', requireOrgAuth, async (req: Request, res: Response) => {
    try {
        const { studentId, branchId } = req.query as any;
        if (!studentId || !branchId) return res.status(400).json({ message: 'studentId and branchId are required.' });
        if (!(await canAccessBranch(req.orgUser!, String(branchId)))) return res.status(403).json({ message: 'No access to that branch.' });
        const db = await branchDb(req.orgUser!.organizationId, String(branchId));
        if (!db) return res.status(404).json({ message: 'Branch not found.' });
        const stu: any = await db.collection('students').findOne({ _id: new ObjectId(String(studentId)) });
        if (!stu) return res.status(404).json({ message: 'Student not found.' });
        res.json({
            student: { id: String(stu._id), name: stu.studentName, currentBranch: stu.currentBranchName },
            history: stu.transferHistory || [],
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Multi-branch report (pick specific branches) ─────────────────────────────
// Generic report over a chosen subset of branches for a metric. branchIds is a
// comma list; metric is one of enrollment|fees|finance|staff.
router.get('/org/report', requireOrgAuth, async (req: Request, res: Response) => {
    try {
        const metric = String(req.query.metric || 'overview');
        const branches = await readableBranchDbs(req.orgUser!, parseBranchIds(req));
        const { from, to } = parseRange(req);
        let data: any;
        switch (metric) {
            case 'enrollment': data = await aggregateEnrollment(branches); break;
            case 'fees': data = await aggregateFeeCollection(branches, from, to); break;
            case 'finance': data = await aggregateIncomeExpense(branches, from, to); break;
            case 'staff': data = await aggregateStaff(branches); break;
            default: data = {
                enrollment: await aggregateEnrollment(branches),
                fees: await aggregateFeeCollection(branches, from, to),
                finance: await aggregateIncomeExpense(branches, from, to),
                staff: await aggregateStaff(branches),
            };
        }
        res.json({ metric, branchCount: branches.length, data });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Organization settings / branding ────────────────────────────────────────
router.get('/org/settings', requireOrgAuth, async (req: Request, res: Response) => {
    const org = await getMetaDb().collection('Organization').findOne({ _id: new ObjectId(req.orgUser!.organizationId) });
    res.json({ name: org?.name, branding: org?.branding || {}, ownerEmail: org?.ownerEmail });
});

router.put('/org/settings', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { name, branding } = req.body || {};
        const $set: any = { updatedAt: new Date() };
        if (name) $set.name = name;
        if (branding && typeof branding === 'object') $set.branding = branding;   // { logo, primaryColor, motto }
        await getMetaDb().collection('Organization').updateOne({ _id: new ObjectId(req.orgUser!.organizationId) }, { $set });
        await audit({ organizationId: req.orgUser!.organizationId, userId: req.orgUser!.orgUserId, userName: req.orgUser!.name, action: 'org.settings.update', newValue: { name, branding }, ip: ipOf(req), device: deviceOf(req) });
        res.json({ ok: true, message: 'Organization settings saved' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Cross-branch finance: pending expenses across all branches ───────────────
// Org Finance Manager view — every branch's pending/unapproved expenses in one
// place, with approve/reject that writes back to the originating branch DB.
router.get('/org/expenses/pending', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN', 'ORG_FINANCE_MANAGER'), async (req: Request, res: Response) => {
    try {
        const branches = await readableBranchDbs(req.orgUser!, parseBranchIds(req));
        const all: any[] = [];
        for (const b of branches) {
            const rows = await b.db.collection('expenses').find({ status: { $in: ['pending', 'submitted', null] }, is_voided: { $ne: true } }).sort({ createdAt: -1 }).limit(500).toArray().catch(() => []);
            rows.forEach((r: any) => all.push({ _id: String(r._id), branchId: b.id, branchName: b.name, description: r.description || r.title || r.category, amount: Number(r.amount) || 0, category: r.category, date: r.date || r.createdAt, status: r.status || 'pending' }));
        }
        all.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        res.json({ data: all, total: all.reduce((s, e) => s + e.amount, 0) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/org/expenses/:branchId/:id/decision', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN', 'ORG_FINANCE_MANAGER'), async (req: Request, res: Response) => {
    try {
        const { branchId, id } = req.params;
        const decision = String(req.body?.decision || '');   // 'approved' | 'rejected'
        if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'decision must be approved or rejected.' });
        if (!(await canAccessBranch(req.orgUser!, branchId))) return res.status(403).json({ message: 'No access to that branch.' });
        const db = await branchDb(req.orgUser!.organizationId, branchId);
        if (!db) return res.status(404).json({ message: 'Branch not found.' });
        await db.collection('expenses').updateOne({ _id: new ObjectId(id) }, { $set: { status: decision, decidedBy: req.orgUser!.name, decidedAt: new Date() } });
        await audit({ organizationId: req.orgUser!.organizationId, branchId, userId: req.orgUser!.orgUserId, userName: req.orgUser!.name, action: `expense.${decision}`, newValue: { expenseId: id }, ip: ipOf(req), device: deviceOf(req) });
        res.json({ ok: true, message: `Expense ${decision}.` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Organization communications (SMS / WhatsApp via Talksasa) ────────────────
// Sends to free-typed numbers or to a branch's staff/parents. Uses the org's
// Talksasa token (org settings) or the platform token (env TALKSASA_TOKEN).
router.post('/org/communications/send', requireOrgAuth, async (req: Request, res: Response) => {
    try {
        const { channel, message, numbers, branchId, audience } = req.body || {};
        if (!message) return res.status(400).json({ message: 'Message is required.' });
        const meta = getMetaDb();
        const org = await meta.collection('Organization').findOne({ _id: new ObjectId(req.orgUser!.organizationId) });
        const apiToken = (org as any)?.talksasa?.apiToken || process.env.TALKSASA_TOKEN;
        const senderId = (org as any)?.talksasa?.senderId || (org?.name || 'SCHOOL').replace(/[^A-Za-z0-9]/g, '').slice(0, 11).toUpperCase();
        if (!apiToken) return res.status(400).json({ message: 'No Talksasa token configured for the organization. Add it in Org Settings.' });

        // Resolve recipients: explicit numbers + (optionally) a branch audience.
        let recips: string[] = Array.isArray(numbers) ? numbers : (numbers ? String(numbers).split(',') : []);
        if (branchId && audience) {
            const bdb = await branchDb(req.orgUser!.organizationId, branchId);
            if (bdb) {
                const coll = audience === 'staff' ? 'staff' : 'students';
                const field = audience === 'staff' ? ['phone', 'phoneNumber'] : ['parentPhone', 'guardianPhone', 'phone'];
                const docs = await bdb.collection(coll).find({}).toArray().catch(() => []);
                docs.forEach((d: any) => { for (const f of field) if (d[f]) { recips.push(d[f]); break; } });
            }
        }
        recips = Array.from(new Set(recips.map(String).map(s => s.trim()).filter(Boolean)));
        if (!recips.length) return res.status(400).json({ message: 'No recipients.' });

        const { talksasaSend, brandMessage } = await import('../services/talksasa.service');
        const text = brandMessage(org?.name, message);
        const r = await talksasaSend({ apiToken, senderId }, recips, text, { type: channel === 'whatsapp' ? 'whatsapp' : 'plain' });
        await audit({ organizationId: req.orgUser!.organizationId, userId: req.orgUser!.orgUserId, userName: req.orgUser!.name, action: `comms.${channel || 'sms'}`, newValue: { count: recips.length }, ip: ipOf(req), device: deviceOf(req) });
        res.json({ ok: r.ok, sent: r.sent, failed: r.failed, error: r.error });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Org Talksasa balance + save the org's token.
router.get('/org/communications/balance', requireOrgAuth, async (req: Request, res: Response) => {
    try {
        const org = await getMetaDb().collection('Organization').findOne({ _id: new ObjectId(req.orgUser!.organizationId) }) as any;
        const apiToken = org?.talksasa?.apiToken || process.env.TALKSASA_TOKEN;
        if (!apiToken) return res.json({ configured: false });
        const { talksasaBalance } = await import('../services/talksasa.service');
        const b = await talksasaBalance({ apiToken });
        res.json({ configured: true, balance: b.balance, raw: b.raw, senderId: org?.talksasa?.senderId || '', topupUrl: 'https://bulksms.talksasa.com' });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});
router.post('/org/communications/settings', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { apiToken, senderId } = req.body || {};
        await getMetaDb().collection('Organization').updateOne({ _id: new ObjectId(req.orgUser!.organizationId) }, { $set: { 'talksasa.apiToken': apiToken, 'talksasa.senderId': senderId } });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Backfill: wrap existing standalone tenants into single-branch orgs ───────
// Non-destructive. For every active Tenant without an organizationId, create an
// Organization + a primary Branch pointing at that tenant's existing DB. Nothing
// is deleted or moved — the tenant keeps its data and subdomain.
router.post('/org/backfill', async (req: Request, res: Response) => {
    // Guard with a one-off secret so it can't be triggered casually.
    if (String(req.body?.secret || '') !== (process.env.ORG_BACKFILL_SECRET || 'shulecloud-backfill')) {
        return res.status(403).json({ message: 'Forbidden.' });
    }
    try {
        const meta = getMetaDb();
        const tenants = await meta.collection('Tenant').find({ status: 'active', organizationId: { $exists: false } }).toArray();
        let created = 0;
        for (const t of tenants) {
            const orgRes = await meta.collection('Organization').insertOne({ name: t.name || t.subdomain, ownerEmail: t.contactEmail || '', branding: null, createdAt: new Date(), backfilled: true });
            const organizationId = String(orgRes.insertedId);
            await createBranch({ organizationId, name: t.name || t.subdomain, subdomain: t.subdomain, isPrimary: true, tenantId: String(t._id), databaseName: t.databaseName });
            created++;
        }
        res.json({ ok: true, wrapped: created, message: `Wrapped ${created} standalone tenant(s) into single-branch organizations.` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Audit log (read) ─────────────────────────────────────────────────────────
router.get('/org/audit', requireOrgAuth, requireOrgRole('ORG_OWNER', 'ORG_ADMIN', 'ORG_FINANCE_MANAGER'), async (req: Request, res: Response) => {
    const { branchId, action, limit } = req.query as any;
    const q: any = { organizationId: req.orgUser!.organizationId };
    if (branchId) q.branchId = String(branchId);
    if (action) q.action = { $regex: String(action), $options: 'i' };
    const rows = await getMetaDb().collection('org_audit_logs').find(q).sort({ ts: -1 }).limit(Math.min(Number(limit) || 500, 2000)).toArray();
    res.json(rows);
});

export { listBranches };
export default router;
