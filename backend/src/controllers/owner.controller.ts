import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';

// ─── Owner roles & permissions ───────────────────────────────────────────────
// Roles available to owner-portal users and what each can do.
export const OWNER_ROLES = ['super_owner', 'owner', 'support', 'finance', 'sales', 'viewer'] as const;
const ROLE_PERMS: Record<string, string[]> = {
    super_owner: ['*'],
    owner: ['schools.manage', 'plans.manage', 'billing.view', 'users.manage', 'analytics.view'],
    finance: ['billing.view', 'billing.manage', 'analytics.view'],
    support: ['schools.manage', 'analytics.view'],
    sales: ['schools.manage', 'plans.view', 'analytics.view'],
    viewer: ['analytics.view'],
};

// Decode the owner JWT from the request (already issued by owner-auth).
const ownerClaims = (req: Request): any => {
    try {
        const auth = req.headers.authorization;
        if (!auth) return null;
        return jwt.verify(auth.split(' ')[1], process.env.OWNER_JWT_SECRET || 'owner_secret');
    } catch { return null; }
};
const canManageUsers = (claims: any) => {
    const role = String(claims?.role || '').toLowerCase();
    return role === 'super_owner' || ROLE_PERMS[role]?.includes('users.manage');
};

export const getTenants = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const tenants = await db.collection('Tenant').find({}).toArray();
        
        // Enhance tenants with counts if needed, but for now just return them
        return res.json(tenants);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch tenants' });
    }
};

export const getPlans = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const plans = await db.collection('Plan').find({}).sort({ price: 1 }).toArray();
        return res.json(plans);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch plans' });
    }
};

// Create a plan (with module list + max-students limit).
export const createPlan = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        const { name, price, maxStudents, modules, description, isActive } = req.body || {};
        if (!name) return res.status(400).json({ message: 'Plan name is required' });
        const doc = {
            name: String(name).trim(),
            price: Number(price) || 0,
            limits: { maxStudents: maxStudents === '' || maxStudents == null ? null : Number(maxStudents) },
            modules: Array.isArray(modules) ? modules : [],
            description: description || '',
            isActive: isActive !== false,
            createdAt: new Date(), updatedAt: new Date(),
        };
        const r = await db.collection('Plan').insertOne(doc);
        return res.status(201).json({ _id: String(r.insertedId), ...doc });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const updatePlan = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        const { name, price, maxStudents, modules, description, isActive } = req.body || {};
        const set: any = { updatedAt: new Date() };
        if (name !== undefined) set.name = String(name).trim();
        if (price !== undefined) set.price = Number(price) || 0;
        if (maxStudents !== undefined) set.limits = { maxStudents: maxStudents === '' || maxStudents == null ? null : Number(maxStudents) };
        if (modules !== undefined) set.modules = Array.isArray(modules) ? modules : [];
        if (description !== undefined) set.description = description;
        if (isActive !== undefined) set.isActive = !!isActive;
        const r = await db.collection('Plan').updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
        if (!r.matchedCount) return res.status(404).json({ message: 'Plan not found' });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const deletePlan = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        await db.collection('Plan').deleteOne({ _id: new ObjectId(req.params.id) });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const getRevenueReport = async (req: Request, res: Response) => {
    try {
        // Placeholder for revenue report
        return res.json({
            totalRevenue: 0,
            monthlyRevenue: 0,
            recentTransactions: []
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch revenue report' });
    }
};

// ─── Owner analytics ─────────────────────────────────────────────────────────
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Joins tenants → their subscription → plan, returning a normalized view.
async function loadSchoolRows(db: any) {
    const [tenants, plans, subs] = await Promise.all([
        db.collection('Tenant').find({}).toArray(),
        db.collection('Plan').find({}).toArray(),
        db.collection('TenantSubscription').find({}).toArray().catch(() => []),
    ]);
    const planById: Record<string, any> = {};
    plans.forEach((p: any) => { planById[String(p._id)] = p; });
    const subByTenant: Record<string, any> = {};
    subs.forEach((s: any) => { subByTenant[String(s.tenantId)] = s; });

    return tenants.map((t: any) => {
        const sub = subByTenant[String(t._id)];
        const plan = sub ? planById[String(sub.planId)] : null;
        const rawStatus = (t.status || sub?.status || 'active').toLowerCase();
        const status = /suspend|inactive|disabled/.test(rawStatus) ? 'suspended'
            : /trial/.test(rawStatus) ? 'trial' : 'active';
        return {
            _id: String(t._id),
            name: t.name || t.schoolName || t.subdomain || 'School',
            subdomain: t.subdomain || '',
            plan: plan?.name || sub?.planName || t.plan || 'Basic',
            planPrice: num(plan?.price ?? sub?.amount ?? t.planPrice),
            status,
            studentCount: num(t.studentCount ?? t.studentsCount),
            modules: Array.isArray(t.enabledModules) ? t.enabledModules.length : num(t.moduleCount),
            expiry: sub?.expiresAt || sub?.currentPeriodEnd || t.expiryDate || t.expiresAt || null,
            createdAt: t.createdAt || sub?.createdAt || null,
        };
    });
}

export const getOwnerStats = async (_req: Request, res: Response) => {
    try {
        const db = getDb();
        const rows = await loadSchoolRows(db);
        const now = new Date();
        const in30 = new Date(now.getTime() + 30 * 86400000);
        const monthlyRevenue = rows
            .filter((r: any) => r.status === 'active')
            .reduce((s: number, r: any) => s + num(r.planPrice), 0);
        const expiringSoon = rows.filter((r: any) => r.expiry && new Date(r.expiry) > now && new Date(r.expiry) <= in30).length;
        return res.json({
            totalSchools: rows.length,
            activeSchools: rows.filter((r: any) => r.status === 'active').length,
            trialSchools: rows.filter((r: any) => r.status === 'trial').length,
            suspendedSchools: rows.filter((r: any) => r.status === 'suspended').length,
            monthlyRevenue,
            expiringSoon,
        });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const getOwnerRevenue = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        // Build last 12 months from subscription payments if present, else from
        // active plan prices spread over each school's lifetime.
        const payments = await db.collection('subscription_payments').find({}).toArray().catch(() => []);
        const months: { month: string; amount: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            months.push({ month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), amount: 0 });
        }
        const idx: Record<string, number> = {};
        months.forEach((m, i) => { idx[m.month] = i; });

        if (payments.length) {
            payments.forEach((p: any) => {
                const d = new Date(p.paidAt || p.createdAt || p.date || Date.now());
                const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                if (idx[key] !== undefined) months[idx[key]].amount += num(p.amount);
            });
        } else {
            // Fallback: current MRR applied to the latest month so the chart isn't flat-empty.
            const rows = await loadSchoolRows(db);
            const mrr = rows.filter((r: any) => r.status === 'active').reduce((s: number, r: any) => s + num(r.planPrice), 0);
            if (months.length) months[months.length - 1].amount = mrr;
        }
        return res.json(months);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const getSchoolsSummary = async (_req: Request, res: Response) => {
    try {
        const db = getDb();
        const rows = await loadSchoolRows(db);
        return res.json(rows);
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── Owner user management (add users + assign roles) ─────────────────────────
export const getOwnerRoles = (_req: Request, res: Response) => {
    return res.json(OWNER_ROLES.map((r) => ({ role: r, permissions: ROLE_PERMS[r] })));
};

export const listOwnerUsers = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        const users = await db.collection('OwnerUser').find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();
        return res.json(users.map((u: any) => ({
            _id: String(u._id), name: u.name, email: u.email,
            role: u.role || 'owner', status: u.status || (u.isActive === false ? 'suspended' : 'active'),
            createdAt: u.createdAt,
        })));
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const createOwnerUser = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    if (!canManageUsers(claims)) return res.status(403).json({ message: 'You are not allowed to add users.' });
    try {
        const db = getDb();
        const { name, email, password, role } = req.body || {};
        if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
        if (!OWNER_ROLES.includes((role || 'viewer') as any)) return res.status(400).json({ message: 'Invalid role' });
        const existing = await db.collection('OwnerUser').findOne({ email });
        if (existing) return res.status(409).json({ message: 'Email already registered' });
        const passwordHash = await bcrypt.hash(password, 10);
        const r = await db.collection('OwnerUser').insertOne({
            name, email, passwordHash, role: role || 'viewer', status: 'active', isActive: true,
            createdBy: claims.email || claims.sub, createdAt: new Date(), updatedAt: new Date(),
        });
        return res.status(201).json({ _id: String(r.insertedId), name, email, role: role || 'viewer', status: 'active' });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const updateOwnerUser = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    if (!canManageUsers(claims)) return res.status(403).json({ message: 'You are not allowed to manage users.' });
    try {
        const db = getDb();
        const { role, status, password } = req.body || {};
        const set: any = { updatedAt: new Date() };
        if (role) { if (!OWNER_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' }); set.role = role; }
        if (status) { set.status = status; set.isActive = status !== 'suspended'; }
        if (password) set.passwordHash = await bcrypt.hash(password, 10);
        const r = await db.collection('OwnerUser').updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
        if (!r.matchedCount) return res.status(404).json({ message: 'User not found' });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const deleteOwnerUser = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    if (!canManageUsers(claims)) return res.status(403).json({ message: 'You are not allowed to remove users.' });
    try {
        const db = getDb();
        // Never delete the last super_owner.
        const target = await db.collection('OwnerUser').findOne({ _id: new ObjectId(req.params.id) });
        if (target?.role === 'super_owner') {
            const supers = await db.collection('OwnerUser').countDocuments({ role: 'super_owner' });
            if (supers <= 1) return res.status(400).json({ message: 'Cannot remove the last Super Owner.' });
        }
        await db.collection('OwnerUser').deleteOne({ _id: new ObjectId(req.params.id) });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── School (tenant) management ──────────────────────────────────────────────
const tenantDbOf = (t: any) => t.databaseName || subdomainToDbName(t.subdomain || String(t._id));

// Full detail for one school: plan, status, counts, modules, DB usage.
export const getSchoolDetail = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const meta = getDb();
        const t = await meta.collection('Tenant').findOne({ _id: new ObjectId(req.params.id) });
        if (!t) return res.status(404).json({ message: 'School not found' });

        const sub = await meta.collection('TenantSubscription').findOne({ tenantId: t._id });
        const plan = sub?.planId ? await meta.collection('Plan').findOne({ _id: sub.planId })
            : (t.planId ? await meta.collection('Plan').findOne({ _id: t.planId }) : null);
        const plans = await meta.collection('Plan').find({}).toArray();

        // Counts + DB usage from the tenant's own database.
        let students = 0, staff = 0, dbSizeMB = 0, collections = 0;
        try {
            const tdb = getTenantDb(tenantDbOf(t));
            students = await tdb.collection('students').countDocuments({}).catch(() => 0);
            staff = await tdb.collection('staff').countDocuments({}).catch(() => 0);
            const stats: any = await tdb.command({ dbStats: 1, scale: 1 }).catch(() => null);
            if (stats) { dbSizeMB = Math.round(((stats.dataSize || 0) + (stats.indexSize || 0)) / (1024 * 1024) * 100) / 100; collections = stats.collections || 0; }
        } catch { /* ignore */ }

        const rawStatus = (t.status || sub?.status || 'active').toLowerCase();
        const status = /suspend|inactive|disabled/.test(rawStatus) ? 'suspended' : /trial/.test(rawStatus) ? 'trial' : 'active';

        return res.json({
            _id: String(t._id),
            name: t.name || t.schoolName || t.subdomain,
            subdomain: t.subdomain || '',
            email: t.email || t.contactEmail || '',
            phone: t.phone || t.contactPhone || '',
            status,
            plan: plan ? { _id: String(plan._id), name: plan.name, price: plan.price, maxStudents: plan.limits?.maxStudents ?? null, modules: plan.modules || [] } : null,
            allPlans: plans.map((p: any) => ({ _id: String(p._id), name: p.name, price: p.price })),
            // Per-school module overrides (falls back to plan modules if unset).
            enabledModules: Array.isArray(t.enabledModules) ? t.enabledModules : (plan?.modules || []),
            counts: { students, staff },
            dbUsage: { sizeMB: dbSizeMB, collections, dbName: tenantDbOf(t) },
            createdAt: t.createdAt,
        });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Assign / change a school's plan.
export const assignSchoolPlan = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const meta = getDb();
        const { planId } = req.body || {};
        const tid = new ObjectId(req.params.id);
        const plan = planId ? await meta.collection('Plan').findOne({ _id: new ObjectId(planId) }) : null;
        await meta.collection('TenantSubscription').updateOne(
            { tenantId: tid },
            { $set: { tenantId: tid, planId: plan?._id || null, planName: plan?.name || null, amount: plan?.price || 0, status: 'active', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true },
        );
        await meta.collection('Tenant').updateOne({ _id: tid }, { $set: { planId: plan?._id || null, plan: plan?.name || null, enabledModules: plan?.modules || [], updatedAt: new Date() } });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Activate / suspend a school account.
export const setSchoolStatus = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const status = String(req.body?.status || '').toLowerCase();
        if (!['active', 'suspended', 'trial'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
        await getDb().collection('Tenant').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status, updatedAt: new Date() } });
        return res.json({ ok: true, status });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Toggle which modules a school can access (overrides the plan).
export const setSchoolModules = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const modules = Array.isArray(req.body?.modules) ? req.body.modules : [];
        await getDb().collection('Tenant').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { enabledModules: modules, updatedAt: new Date() } });
        return res.json({ ok: true, modules });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Impersonate: mint a tenant admin token so the owner can log in as the school admin.
export const impersonateSchool = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const meta = getDb();
        const t = await meta.collection('Tenant').findOne({ _id: new ObjectId(req.params.id) });
        if (!t) return res.status(404).json({ message: 'School not found' });
        // Find this school's primary admin user (meta User registry).
        const admin = await meta.collection('User').findOne({ tenantId: t._id })
            || await meta.collection('User').findOne({ tenantId: String(t._id) });
        const secret = process.env.JWT_SECRET || 'secret';
        const token = jwt.sign(
            {
                sub: admin?._id?.toString() || String(t._id),
                email: admin?.email || t.email || '',
                role: 'school_admin',
                tenantId: String(t._id),
                tenantSubdomain: t.subdomain,
                name: admin?.name || t.name,
                impersonated: true,
            },
            secret, { expiresIn: '2h' },
        );
        return res.json({ access_token: token, subdomain: t.subdomain, name: t.name });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── Contact messages (from the public /contact page) ────────────────────────
// Public: anyone can submit. Stored in the meta DB for the owner to review.
export const submitContactMessage = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const { name, school, email, phone, message } = req.body || {};
        if (!name || !email || !message) return res.status(400).json({ message: 'Name, email and message are required' });
        await db.collection('contact_messages').insertOne({
            name, school: school || '', email, phone: phone || '', message,
            status: 'new', createdAt: new Date(),
        });
        return res.status(201).json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const listContactMessages = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        const rows = await db.collection('contact_messages').find({}).sort({ createdAt: -1 }).limit(200).toArray();
        return res.json(rows.map((r: any) => ({ ...r, _id: String(r._id) })));
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const updateContactMessage = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        const { status } = req.body || {};
        await db.collection('contact_messages').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: status || 'read', updatedAt: new Date() } });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── Register toggle (owner can enable/disable public self-registration) ──────
export const getPublicSettings = async (_req: Request, res: Response) => {
    try {
        const s = await getDb().collection('platform_settings').findOne({ key: 'public' });
        return res.json({ registrationEnabled: s?.registrationEnabled !== false });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const setPublicSettings = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const { registrationEnabled } = req.body || {};
        await getDb().collection('platform_settings').updateOne(
            { key: 'public' },
            { $set: { key: 'public', registrationEnabled: !!registrationEnabled, updatedAt: new Date() } },
            { upsert: true },
        );
        return res.json({ ok: true, registrationEnabled: !!registrationEnabled });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};
