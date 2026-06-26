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
    // schools.manage = EDIT tenants; schools.view = read-only. plans.manage = create/edit plans.
    owner: ['schools.view', 'schools.manage', 'plans.manage', 'billing.view', 'users.manage', 'analytics.view', 'reminders', 'broadcast'],
    finance: ['billing.view', 'billing.manage', 'analytics.view', 'schools.view', 'reminders', 'broadcast'],
    support: ['schools.view', 'analytics.view', 'reminders', 'broadcast'],
    sales: ['schools.view', 'plans.view', 'analytics.view', 'reminders', 'broadcast'],
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
// Generic permission check for a specific capability code.
const hasPerm = (claims: any, code: string) => {
    const role = String(claims?.role || '').toLowerCase();
    const perms = ROLE_PERMS[role] || [];
    return role === 'super_owner' || perms.includes('*') || perms.includes(code);
};
// Guard helper: returns claims if allowed, else writes 401/403 and returns null.
const guard = (req: Request, res: Response, code?: string): any => {
    const claims = ownerClaims(req);
    if (!claims) { res.status(401).json({ message: 'Unauthorized' }); return null; }
    if (code && !hasPerm(claims, code)) { res.status(403).json({ message: 'Your role does not allow this action.' }); return null; }
    return claims;
};

// Record a platform-level (owner) action for the audit trail.
export const ownerAudit = async (req: Request, action: string, entity: string, metadata: any = {}) => {
    try {
        const claims = ownerClaims(req);
        await getDb().collection('owner_audit_logs').insertOne({
            action, entity, metadata,
            actor: claims?.name || claims?.email || claims?.role || 'owner',
            actorRole: claims?.role || '',
            ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
            device: String(req.headers['user-agent'] || ''),
            createdAt: new Date(),
        });
    } catch { /* never block on audit */ }
};

// Read the platform audit trail.
export const getOwnerAuditLogs = async (req: Request, res: Response) => {
    if (!guard(req, res)) return;
    try {
        const { search } = req.query as any;
        const q: any = {};
        if (search) { const s = String(search); q.$or = [{ action: { $regex: s, $options: 'i' } }, { entity: { $regex: s, $options: 'i' } }, { actor: { $regex: s, $options: 'i' } }]; }
        const logs = await getDb().collection('owner_audit_logs').find(q).sort({ createdAt: -1 }).limit(1000).toArray();
        const security = logs.filter((l: any) => /suspend|delete|reset|impersonate|password/i.test(l.action)).length;
        return res.json({ logs, total: logs.length, securityIncidents: security });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const getTenants = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const tenants = await db.collection('Tenant').find({}).toArray();

        // Join each tenant's current plan (from its subscription, then from the
        // Tenant doc itself) so the dashboard can show the plan name + status.
        const [subs, plans] = await Promise.all([
            db.collection('TenantSubscription').find({}).toArray().catch(() => []),
            db.collection('Plan').find({}).toArray().catch(() => []),
        ]);
        const planById = new Map(plans.map((p: any) => [String(p._id), p]));
        const subByTenant = new Map(subs.map((s: any) => [String(s.tenantId), s]));

        const enriched = tenants.map((t: any) => {
            const sub = subByTenant.get(String(t._id));
            const plan =
                (sub?.planId && planById.get(String(sub.planId))) ||
                (t.planId && planById.get(String(t.planId))) ||
                (t.plan ? { name: t.plan } : null) ||
                (sub?.planName ? { name: sub.planName } : null);
            return {
                ...t,
                subscription: sub ? { ...sub, plan: plan || null } : (plan ? { plan } : null),
                planName: plan?.name || null,
            };
        });

        return res.json(enriched);
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
    if (!guard(req, res, 'plans.manage')) return;
    try {
        const db = getDb();
        const { name, price, maxStudents, modules, description, isActive, durationDays, graceDays } = req.body || {};
        if (!name) return res.status(400).json({ message: 'Plan name is required' });
        const doc = {
            name: String(name).trim(),
            price: Number(price) || 0,
            limits: { maxStudents: maxStudents === '' || maxStudents == null ? null : Number(maxStudents) },
            modules: Array.isArray(modules) ? modules : [],
            description: description || '',
            durationDays: Number(durationDays) > 0 ? Number(durationDays) : 30,   // billing period length
            graceDays: Number(graceDays) >= 0 ? Number(graceDays) : 0,            // post-expiry grace
            isActive: isActive !== false,
            createdAt: new Date(), updatedAt: new Date(),
        };
        const r = await db.collection('Plan').insertOne(doc);
        return res.status(201).json({ _id: String(r.insertedId), ...doc });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const updatePlan = async (req: Request, res: Response) => {
    if (!guard(req, res, 'plans.manage')) return;
    try {
        const db = getDb();
        const { name, price, maxStudents, modules, description, isActive, durationDays, graceDays } = req.body || {};
        const set: any = { updatedAt: new Date() };
        if (name !== undefined) set.name = String(name).trim();
        if (price !== undefined) set.price = Number(price) || 0;
        if (maxStudents !== undefined) set.limits = { maxStudents: maxStudents === '' || maxStudents == null ? null : Number(maxStudents) };
        if (modules !== undefined) set.modules = Array.isArray(modules) ? modules : [];
        if (description !== undefined) set.description = description;
        if (durationDays !== undefined) set.durationDays = Number(durationDays) > 0 ? Number(durationDays) : 30;
        if (graceDays !== undefined) set.graceDays = Number(graceDays) >= 0 ? Number(graceDays) : 0;
        if (isActive !== undefined) set.isActive = !!isActive;
        const r = await db.collection('Plan').updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
        if (!r.matchedCount) return res.status(404).json({ message: 'Plan not found' });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const deletePlan = async (req: Request, res: Response) => {
    if (!guard(req, res, 'plans.manage')) return;
    try {
        const db = getDb();
        await db.collection('Plan').deleteOne({ _id: new ObjectId(req.params.id) });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const getRevenueReport = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        const completed = await db.collection('subscription_payments').find({ status: 'completed' }).toArray().catch(() => []);
        const totalRevenue = completed.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const monthlyRevenue = completed
            .filter((p: any) => new Date(p.completedAt || p.createdAt) >= monthStart)
            .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        return res.json({ totalRevenue, monthlyRevenue, count: completed.length });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to fetch revenue report' });
    }
};

// Subscription payments schools have made (for the owner Billing page).
export const getBillingPayments = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        const { status } = req.query as any;
        const q: any = {};
        if (status && status !== 'all') q.status = status;
        const payments = await db.collection('subscription_payments').find(q).sort({ createdAt: -1 }).limit(300).toArray();
        // Attach school names.
        const tenantIds = Array.from(new Set(payments.map((p: any) => String(p.tenantId)).filter(Boolean)));
        const tenants = await db.collection('Tenant').find({ _id: { $in: tenantIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) as any } }).toArray().catch(() => []);
        const nameById: Record<string, string> = {};
        tenants.forEach((t: any) => { nameById[String(t._id)] = t.instituteName || t.name || t.subdomain || 'School'; });
        res.json(payments.map((p: any) => ({
            id: String(p._id),
            tenant: { name: nameById[String(p.tenantId)] || 'School' },
            plan: p.planName || '',
            amount: Number(p.amount || 0),
            status: p.status === 'completed' ? 'PAID' : p.status === 'failed' ? 'FAILED' : 'PENDING',
            receipt: p.mpesaReceipt || null,
            phone: p.phone || '',
            issuedAt: p.createdAt,
            paidAt: p.completedAt || null,
        })));
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to fetch payments' });
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
        const { name, email, password, role, phone } = req.body || {};
        if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
        if (!OWNER_ROLES.includes((role || 'viewer') as any)) return res.status(400).json({ message: 'Invalid role' });
        const existing = await db.collection('OwnerUser').findOne({ email });
        if (existing) return res.status(409).json({ message: 'Email already registered' });
        const passwordHash = await bcrypt.hash(password, 10);
        const r = await db.collection('OwnerUser').insertOne({
            name, email, phone: phone || '', passwordHash, role: role || 'viewer', status: 'active', isActive: true,
            mustChangePassword: true,   // forced to set their own password on first login
            createdBy: claims.email || claims.sub, createdAt: new Date(), updatedAt: new Date(),
        });

        // Email + WhatsApp the new user their credentials + login link (best-effort).
        let delivery: any = null;
        try {
            const { sendOwnerCredentials } = await import('../services/ownerNotify.service');
            delivery = await sendOwnerCredentials({ email, phone, name }, password);
        } catch (e: any) { delivery = { email: false, whatsapp: false, errors: [e.message] }; }

        return res.status(201).json({ _id: String(r.insertedId), name, email, role: role || 'viewer', status: 'active', delivery });
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
        if (password) { set.passwordHash = await bcrypt.hash(password, 10); set.mustChangePassword = true; }
        const r = await db.collection('OwnerUser').updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
        if (!r.matchedCount) return res.status(404).json({ message: 'User not found' });

        // A super-owner password reset re-sends the new credentials to the user.
        let delivery: any = null;
        if (password) {
            try {
                const target = await db.collection('OwnerUser').findOne({ _id: new ObjectId(req.params.id) });
                if (target?.email) {
                    const { sendOwnerCredentials } = await import('../services/ownerNotify.service');
                    delivery = await sendOwnerCredentials({ email: target.email, phone: target.phone, name: target.name }, password);
                }
            } catch (e: any) { delivery = { email: false, whatsapp: false, errors: [e.message] }; }
        }
        return res.json({ ok: true, delivery });
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
            organizationId: t.organizationId ? String(t.organizationId) : null,
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
    if (!guard(req, res, 'schools.manage')) return;
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
        await ownerAudit(req, 'school.assign_plan', `school:${req.params.id}`, { plan: plan?.name });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Send a direct message to a school's contact (email and/or WhatsApp).
// Email uses the Company SMTP; WhatsApp uses the platform session.
export const messageSchool = async (req: Request, res: Response) => {
    if (!guard(req, res, 'schools.view')) return;
    try {
        const meta = getDb();
        const t = await meta.collection('Tenant').findOne({ _id: new ObjectId(req.params.id) });
        if (!t) return res.status(404).json({ message: 'School not found' });

        const { channel, subject, message } = req.body || {};
        if (!message) return res.status(400).json({ message: 'Message is required' });
        const email = t.email || t.contactEmail || '';
        const phone = t.phone || t.contactPhone || '';

        const { notifyOwner } = await import('../services/ownerNotify.service');
        const wantEmail = channel === 'email' || channel === 'both' || !channel;
        const wantWa = channel === 'whatsapp' || channel === 'both' || !channel;

        const html = `<div style="font-family:Arial,sans-serif;color:#1f2937">${String(message).replace(/\n/g, '<br>')}</div>`;
        const result = await notifyOwner(
            { email: wantEmail ? email : undefined, phone: wantWa ? phone : undefined },
            subject || 'Message from ShuleCloud',
            html,
            String(message),
        );

        // Also drop an in-app notification into the school's own DB.
        try {
            const tdb = getTenantDb(t.databaseName || subdomainToDbName(t.subdomain || String(t._id)));
            await tdb.collection('notifications').insertOne({
                type: 'platform', title: subject || 'Message from ShuleCloud', message,
                audience: 'Admins', level: 'info', read: false, dismissed: false, createdAt: new Date(),
            });
        } catch { /* best-effort */ }

        if (!result.email && !result.whatsapp) {
            return res.status(400).json({ message: `Could not deliver. ${result.errors.join('; ') || 'No contact on file.'}` });
        }
        await ownerAudit(req, 'school.message', `school:${req.params.id}`, { channels: [result.email && 'email', result.whatsapp && 'whatsapp'].filter(Boolean) });
        return res.json({ ok: true, delivery: result });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── Owner profile ───────────────────────────────────────────────────────────
export const getOwnerProfile = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const u = await getDb().collection('OwnerUser').findOne({ _id: new ObjectId(String(claims.sub)) }, { projection: { passwordHash: 0, otpHash: 0 } });
        if (!u) return res.status(404).json({ message: 'Profile not found' });
        return res.json({
            id: String(u._id), name: u.name || '', email: u.email, phone: u.phone || '',
            role: u.role || 'viewer', avatar: u.avatar || '', bio: u.bio || '',
            isSuperOwner: String(u.role).toLowerCase() === 'super_owner',
        });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const updateOwnerProfile = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        const me = await db.collection('OwnerUser').findOne({ _id: new ObjectId(String(claims.sub)) });
        if (!me) return res.status(404).json({ message: 'Profile not found' });

        const b = req.body || {};
        const set: any = { updatedAt: new Date() };
        ['name', 'phone', 'avatar', 'bio'].forEach((k) => { if (b[k] !== undefined) set[k] = b[k]; });

        // Only a super_owner may change their own email.
        if (b.email !== undefined && b.email !== me.email) {
            if (String(me.role).toLowerCase() !== 'super_owner') {
                return res.status(403).json({ message: 'Only a Super Owner can change their email address.' });
            }
            const taken = await db.collection('OwnerUser').findOne({ email: b.email, _id: { $ne: me._id } });
            if (taken) return res.status(409).json({ message: 'That email is already in use.' });
            set.email = b.email;
        }
        await db.collection('OwnerUser').updateOne({ _id: me._id }, { $set: set });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── Owner-to-owner messaging ────────────────────────────────────────────────
export const listOwnerContacts = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const users = await getDb().collection('OwnerUser')
            .find({ _id: { $ne: new ObjectId(String(claims.sub)) } }, { projection: { name: 1, email: 1, phone: 1, role: 1, avatar: 1 } })
            .toArray();
        return res.json(users.map((u: any) => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone || '', role: u.role, avatar: u.avatar || '' })));
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const sendOwnerToOwner = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = getDb();
        const { toUserId, subject, message } = req.body || {};
        if (!toUserId || !message) return res.status(400).json({ message: 'Recipient and message are required' });
        const target = await db.collection('OwnerUser').findOne({ _id: new ObjectId(String(toUserId)) });
        if (!target?.email) return res.status(404).json({ message: 'Recipient has no email on file' });

        const fromName = claims.name || claims.email || 'A ShuleCloud admin';
        const { notifyOwner } = await import('../services/ownerNotify.service');
        const html = `<div style="font-family:Arial,sans-serif;color:#1f2937"><p style="color:#6b7280;font-size:12px">From: ${fromName}</p>${String(message).replace(/\n/g, '<br>')}</div>`;
        const result = await notifyOwner({ email: target.email, phone: target.phone }, subject || `Message from ${fromName}`, html, `From ${fromName}:\n${message}`);

        // Log it for an in-portal inbox later.
        await db.collection('owner_messages').insertOne({
            fromId: String(claims.sub), fromName, toId: String(target._id), toEmail: target.email,
            subject: subject || '', message, delivery: result, sentAt: new Date(),
        }).catch(() => {});

        if (!result.email && !result.whatsapp) return res.status(400).json({ message: `Could not deliver. ${result.errors.join('; ')}` });
        return res.json({ ok: true, delivery: result });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Activate / suspend a school account.
export const setSchoolStatus = async (req: Request, res: Response) => {
    if (!guard(req, res, 'schools.manage')) return;
    try {
        const status = String(req.body?.status || '').toLowerCase();
        if (!['active', 'suspended', 'trial'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
        await getDb().collection('Tenant').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status, updatedAt: new Date() } });
        await ownerAudit(req, status === 'suspended' ? 'school.suspend' : 'school.activate', `school:${req.params.id}`, { status });
        return res.json({ ok: true, status });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Edit a school's core details (name, email, phone, subdomain). Subdomain must
// stay unique; the school's DB name is preserved (renaming a DB is unsafe), but
// the subdomain it resolves by is updated, and the admin's email kept in sync.
export const updateSchool = async (req: Request, res: Response) => {
    if (!guard(req, res, 'schools.manage')) return;
    try {
        const meta = getDb();
        const id = new ObjectId(req.params.id);
        const t: any = await meta.collection('Tenant').findOne({ _id: id });
        if (!t) return res.status(404).json({ message: 'School not found' });
        const { name, email, phone, subdomain } = req.body || {};
        const $set: any = { updatedAt: new Date() };
        if (name) $set.name = name;
        if (email !== undefined) { $set.contactEmail = String(email).trim().toLowerCase(); $set.email = $set.contactEmail; }
        if (phone !== undefined) { $set.contactPhone = phone; $set.phone = phone; }
        if (subdomain && String(subdomain).toLowerCase().trim() !== t.subdomain) {
            const sub = String(subdomain).toLowerCase().trim();
            const reserved = ['owner', 'api', 'www', 'admin', 'support', 'mail', 'localhost', 'app', 'org'];
            if (reserved.includes(sub)) return res.status(400).json({ message: 'That subdomain is reserved.' });
            if (await meta.collection('Tenant').findOne({ subdomain: sub, _id: { $ne: id } })) return res.status(409).json({ message: 'That subdomain is already taken.' });
            $set.subdomain = sub;
            // Keep any Branch link in sync so org routing still resolves.
            await meta.collection('Branch').updateMany({ tenantId: String(t._id) }, { $set: { subdomain: sub } }).catch(() => { });
        }
        await meta.collection('Tenant').updateOne({ _id: id }, { $set });
        await ownerAudit(req, 'school.update', `school:${req.params.id}`, { fields: Object.keys($set).filter(k => k !== 'updatedAt') });
        // Keep the admin user's email in sync if it changed.
        if (email) {
            await meta.collection('User').updateOne({ $or: [{ tenantId: t._id }, { tenantId: String(t._id) }] }, { $set: { email: String(email).trim().toLowerCase() } }, { sort: { createdAt: 1 } as any }).catch(() => { });
        }
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Reset a school admin's password (optionally a supplied one, else generated)
// and email it to the school. Updates the meta User; if the school is also an
// org owner, the org login uses the same hash so it stays in sync.
export const resetSchoolPassword = async (req: Request, res: Response) => {
    if (!guard(req, res, 'schools.manage')) return;
    try {
        const meta = getDb();
        const t: any = await meta.collection('Tenant').findOne({ _id: new ObjectId(req.params.id) });
        if (!t) return res.status(404).json({ message: 'School not found' });
        const bcrypt = (await import('bcrypt')).default;
        const newPassword = String(req.body?.password || '').trim() || genPassword();
        const hash = await bcrypt.hash(newPassword, 10);
        const admin: any = await meta.collection('User').findOne({ $or: [{ tenantId: t._id }, { tenantId: String(t._id) }] }, { sort: { createdAt: 1 } });
        if (admin) await meta.collection('User').updateOne({ _id: admin._id }, { $set: { passwordHash: hash, updatedAt: new Date() } });
        // Keep an org-owner login (if any) in sync.
        const email = (admin?.email || t.contactEmail || '').toLowerCase();
        if (email) await meta.collection('OrgUser').updateOne({ email }, { $set: { passwordHash: hash } }).catch(() => { });

        let emailed = false;
        const to = email;
        if (req.body?.email !== false && to) {
            const { notifyOwner } = await import('../services/ownerNotify.service');
            const html = `<div style="font-family:Arial,sans-serif;color:#1f2937"><h2 style="color:#534AB7">ShuleCloud — Password Reset</h2><p>The password for <b>${t.name}</b> (${t.subdomain}.shulecloud.com) has been reset.</p><p>New password: <b style="font-size:18px">${newPassword}</b></p><p style="color:#6b7280;font-size:13px">Please sign in and change it.</p></div>`;
            const r = await notifyOwner({ email: to, phone: t.contactPhone }, 'Your ShuleCloud password was reset', html, `New password for ${t.name}: ${newPassword}`).catch(() => null);
            emailed = !!r;
        }
        await ownerAudit(req, 'school.reset_password', `school:${req.params.id}`, { emailed, sentTo: to });
        return res.json({ ok: true, password: newPassword, emailed, sentTo: to });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Reset an organization owner's password and email it.
export const resetOrgPassword = async (req: Request, res: Response) => {
    if (!guard(req, res, 'schools.manage')) return;
    try {
        const meta = getDb();
        const org: any = await meta.collection('Organization').findOne({ _id: new ObjectId(req.params.id) });
        if (!org) return res.status(404).json({ message: 'Organization not found' });
        const bcrypt = (await import('bcrypt')).default;
        const newPassword = String(req.body?.password || '').trim() || genPassword();
        const hash = await bcrypt.hash(newPassword, 10);
        const owner: any = await meta.collection('OrgUser').findOne({ organizationId: String(org._id), role: 'ORG_OWNER' });
        const to = owner?.email || org.ownerEmail;
        await meta.collection('OrgUser').updateMany({ organizationId: String(org._id), role: 'ORG_OWNER' }, { $set: { passwordHash: hash } });
        let emailed = false;
        if (req.body?.email !== false && to) {
            const { notifyOwner } = await import('../services/ownerNotify.service');
            const html = `<div style="font-family:Arial,sans-serif;color:#1f2937"><h2 style="color:#534AB7">ShuleCloud — Organization Password Reset</h2><p>The owner password for <b>${org.name}</b> has been reset.</p><p>New password: <b style="font-size:18px">${newPassword}</b></p><p style="color:#6b7280;font-size:13px">Sign in at /org/login and change it.</p></div>`;
            const r = await notifyOwner({ email: to }, 'Your ShuleCloud organization password was reset', html, `New org password for ${org.name}: ${newPassword}`).catch(() => null);
            emailed = !!r;
        }
        await ownerAudit(req, 'org.reset_password', `org:${req.params.id}`, { emailed, sentTo: to });
        return res.json({ ok: true, password: newPassword, emailed, sentTo: to });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

const genPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Toggle which modules a school can access (overrides the plan).
export const setSchoolModules = async (req: Request, res: Response) => {
    if (!guard(req, res, 'schools.manage')) return;
    try {
        const modules = Array.isArray(req.body?.modules) ? req.body.modules : [];
        await getDb().collection('Tenant').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { enabledModules: modules, updatedAt: new Date() } });
        return res.json({ ok: true, modules });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Impersonate: mint a tenant admin token so the owner can log in as the school admin.
export const impersonateSchool = async (req: Request, res: Response) => {
    if (!guard(req, res, 'schools.manage')) return;
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

// ─── Platform M-PESA (Daraja) settings — owner-level, for subscription billing ─
const MPESA_FIELDS = ['env', 'consumerKey', 'consumerSecret', 'shortcode', 'tillNumber', 'passkey', 'txType', 'initiator', 'securityCredential', 'callbackBase', 'enabled'];

export const getPlatformMpesa = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const s: any = (await getDb().collection('mpesa_settings').findOne({})) || {};
        // Mask secrets in the response.
        return res.json({
            env: s.env || 'sandbox',
            consumerKey: s.consumerKey || '',
            consumerSecret: s.consumerSecret ? '••••••••' : '',
            shortcode: s.shortcode || '',
            tillNumber: s.tillNumber || '',
            passkey: s.passkey ? '••••••••' : '',
            txType: s.txType || 'CustomerPayBillOnline',
            initiator: s.initiator || '',
            callbackBase: s.callbackBase || process.env.MPESA_CALLBACK_URL || '',
            enabled: s.enabled !== false,
            configured: !!(s.consumerKey && s.consumerSecret && s.shortcode && s.passkey),
        });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const setPlatformMpesa = async (req: Request, res: Response) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const body = req.body || {};
        const set: any = { updatedAt: new Date() };
        MPESA_FIELDS.forEach((f) => {
            const v = body[f];
            // Don't overwrite a stored secret with the masked placeholder.
            if (v === undefined || v === '••••••••') return;
            set[f] = f === 'enabled' ? !!v : v;
        });
        await getDb().collection('mpesa_settings').updateOne({}, { $set: set }, { upsert: true });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── Platform Jitsi / JaaS (Live Classes) — one shared account for all schools ─
export const getPlatformMeeting = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const s: any = (await getDb().collection('platform_meeting_settings').findOne({ key: 'jitsi' })) || {};
        return res.json({
            jitsiEnabled: s.jitsiEnabled !== false,
            jitsiDomain: s.jitsiDomain || '8x8.vc',
            jitsiAppId: s.jitsiAppId || '',
            jitsiKeyId: s.jitsiKeyId || '',
            jitsiAppSecret: s.jitsiAppSecret ? '••••••••' : '',
            configured: !!(s.jitsiAppId && s.jitsiAppSecret),
            // BigBlueButton is hidden from schools unless the super owner enables it.
            bbbAllowedForSchools: s.bbbAllowedForSchools === true,
        });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const setPlatformMeeting = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const b = req.body || {};
        const set: any = { updatedAt: new Date() };
        if (b.jitsiEnabled !== undefined) set.jitsiEnabled = !!b.jitsiEnabled;
        if (typeof b.jitsiDomain === 'string') set.jitsiDomain = b.jitsiDomain.trim();
        if (typeof b.jitsiAppId === 'string') set.jitsiAppId = b.jitsiAppId.trim();
        if (typeof b.jitsiKeyId === 'string') set.jitsiKeyId = b.jitsiKeyId.trim();
        // Don't overwrite the stored RSA private key with the masked placeholder.
        if (typeof b.jitsiAppSecret === 'string' && b.jitsiAppSecret && !b.jitsiAppSecret.startsWith('•')) {
            set.jitsiAppSecret = b.jitsiAppSecret.trim();
        }
        if (b.bbbAllowedForSchools !== undefined) set.bbbAllowedForSchools = !!b.bbbAllowedForSchools;
        await getDb().collection('platform_meeting_settings').updateOne({ key: 'jitsi' }, { $set: set }, { upsert: true });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// Diagnose the platform JaaS config by actually signing a test token and
// reporting precisely what's wrong (empty Key ID, unparseable private key, …).
export const testPlatformMeeting = async (req: Request, res: Response) => {
    if (!ownerClaims(req)) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const s: any = (await getDb().collection('platform_meeting_settings').findOne({ key: 'jitsi' })) || {};
        const problems: string[] = [];
        if (!s.jitsiAppId) problems.push('App ID is missing.');
        else if (!/^vpaas-/.test(s.jitsiAppId)) problems.push('App ID should start with "vpaas-magic-cookie-".');
        if (!s.jitsiKeyId) problems.push('Key ID is missing (the part after "/" in the API key name).');
        let key: string = (s.jitsiAppSecret || '').trim();
        if (!key) problems.push('RSA private key is missing.');
        else {
            if (key.includes('PUBLIC KEY')) problems.push('You pasted a PUBLIC key — JaaS needs the PRIVATE key.');
            if (!key.includes('BEGIN') || !key.includes('PRIVATE KEY')) problems.push('Private key does not look like a PEM block (missing -----BEGIN PRIVATE KEY-----).');
        }

        let token: string | undefined;
        let signError: string | undefined;
        if (!problems.length) {
            try {
                const now = Math.floor(Date.now() / 1000);
                token = jwt.sign(
                    { aud: 'jitsi', iss: 'chat', sub: s.jitsiAppId, room: '*', nbf: now - 10, exp: now + 600,
                      context: { user: { id: 'diag', name: 'Diagnostic', moderator: 'true' }, features: {} } },
                    key, { algorithm: 'RS256', header: { kid: `${s.jitsiAppId}/${s.jitsiKeyId}` } as any },
                );
            } catch (e: any) {
                signError = e.message;
                if (/asn1|PEM|DECODER|unsupported|bad base|routines/i.test(e.message)) {
                    signError = `Private key could not be parsed (${e.message}). Re-paste the full key, including the BEGIN/END lines and all line breaks.`;
                }
            }
        }

        return res.json({
            ok: !problems.length && !signError,
            kid: s.jitsiAppId && s.jitsiKeyId ? `${s.jitsiAppId}/${s.jitsiKeyId}` : '(incomplete)',
            keyLooksPem: key.includes('BEGIN') && key.includes('PRIVATE KEY'),
            keyLength: key.length,
            problems,
            signError,
            // Paste this into jwt.io (with your PUBLIC key) to verify the signature.
            sampleToken: token,
            message: problems.length ? problems.join(' ')
                : signError ? signError
                : 'Signed a test token successfully. If meetings still fail, the Key ID/private key pair does not match what 8x8 has — regenerate the API key.',
        });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── Personal reminders (per owner user) ─────────────────────────────────────
export const listReminders = async (req: Request, res: Response) => {
    const claims = guard(req, res); if (!claims) return;
    try {
        const rows = await getDb().collection('owner_reminders').find({ ownerId: String(claims.sub) }).sort({ dueAt: 1, createdAt: -1 }).toArray();
        return res.json(rows.map((r: any) => ({ ...r, _id: String(r._id) })));
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};
export const createReminder = async (req: Request, res: Response) => {
    const claims = guard(req, res); if (!claims) return;
    try {
        const { title, note, dueAt } = req.body || {};
        if (!title) return res.status(400).json({ message: 'Title is required' });
        const doc = { ownerId: String(claims.sub), title, note: note || '', dueAt: dueAt || null, done: false, createdAt: new Date() };
        const r = await getDb().collection('owner_reminders').insertOne(doc);
        return res.status(201).json({ _id: String(r.insertedId), ...doc });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};
export const updateReminder = async (req: Request, res: Response) => {
    const claims = guard(req, res); if (!claims) return;
    try {
        const set: any = { updatedAt: new Date() };
        ['title', 'note', 'dueAt', 'done'].forEach((k) => { if (req.body?.[k] !== undefined) set[k] = req.body[k]; });
        await getDb().collection('owner_reminders').updateOne({ _id: new ObjectId(req.params.id), ownerId: String(claims.sub) }, { $set: set });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};
export const deleteReminder = async (req: Request, res: Response) => {
    const claims = guard(req, res); if (!claims) return;
    try {
        await getDb().collection('owner_reminders').deleteOne({ _id: new ObjectId(req.params.id), ownerId: String(claims.sub) });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── Company email (SMTP) settings — super_owner only ─────────────────────────
export const getCompanyEmail = async (req: Request, res: Response) => {
    const claims = guard(req, res); if (!claims) return;
    if (String(claims.role).toLowerCase() !== 'super_owner') return res.status(403).json({ message: 'Only the Super Owner can view email settings.' });
    try {
        const s: any = (await getDb().collection('platform_email_settings').findOne({ key: 'smtp' })) || {};
        return res.json({
            host: s.host || '', port: s.port || 587, secure: !!s.secure,
            user: s.user || '', pass: s.pass ? '••••••••' : '',
            fromName: s.fromName || 'ShuleCloud', domain: s.domain || 'shulecloud.com',
            configured: !!(s.host && s.user && s.pass),
        });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};
export const setCompanyEmail = async (req: Request, res: Response) => {
    const claims = guard(req, res); if (!claims) return;
    if (String(claims.role).toLowerCase() !== 'super_owner') return res.status(403).json({ message: 'Only the Super Owner can change email settings.' });
    try {
        const b = req.body || {};
        const set: any = { key: 'smtp', updatedAt: new Date() };
        ['host', 'fromName', 'domain', 'user'].forEach((k) => { if (b[k] !== undefined) set[k] = b[k]; });
        if (b.port !== undefined) set.port = Number(b.port) || 587;
        if (b.secure !== undefined) set.secure = !!b.secure;
        if (b.pass !== undefined && b.pass !== '••••••••') set.pass = b.pass;
        await getDb().collection('platform_email_settings').updateOne({ key: 'smtp' }, { $set: set }, { upsert: true });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

// ─── Personal email broadcast — sends from <user>@<companyDomain> via SMTP ─────
export const sendBroadcast = async (req: Request, res: Response) => {
    const claims = guard(req, res, 'broadcast'); if (!claims) return;
    try {
        const { to, subject, message } = req.body || {};
        const recipients: string[] = Array.isArray(to) ? to : String(to || '').split(/[,;\s]+/).filter(Boolean);
        if (!recipients.length || !subject || !message) return res.status(400).json({ message: 'Recipients, subject and message are required' });

        const s: any = (await getDb().collection('platform_email_settings').findOne({ key: 'smtp' })) || {};
        if (!s.host || !s.user || !s.pass) return res.status(400).json({ message: 'Company email (SMTP) is not configured. Ask the Super Owner to set it in Settings.' });

        const port = Number(s.port) || 587;
        // The port — not a saved flag — decides the encryption mode. 465 is implicit
        // TLS; 587/25 use STARTTLS (plain connect, then upgrade). Honouring a wrong
        // `secure=true` on 587 causes "ssl3_get_record: wrong version number".
        const secure = port === 465;
        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({
            host: s.host,
            port,
            secure,
            requireTLS: !secure,          // force STARTTLS upgrade on 587/25
            auth: { user: s.user, pass: s.pass },
            connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000,
        });

        // Desired From = the logged-in owner's username @ company domain.
        const domain = s.domain || 'shulecloud.com';
        const localPart = String(claims.email || claims.name || 'noreply').split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
        const desiredAddr = `${localPart}@${domain}`;
        const displayName = s.fromName || claims.name || 'ShuleCloud';

        // Many SMTP providers only allow sending FROM the authenticated mailbox.
        // If the desired address isn't the SMTP user, send as the SMTP user and set
        // Reply-To to the desired address so replies still reach the owner.
        const authMatches = String(s.user).toLowerCase() === desiredAddr.toLowerCase();
        const fromAddr = authMatches ? `"${displayName}" <${desiredAddr}>` : `"${displayName}" <${s.user}>`;
        const replyTo  = authMatches ? undefined : desiredAddr;

        // Surface bad host/port/credentials as a clear 400 instead of a cryptic 500.
        try {
            await transporter.verify();
        } catch (ve: any) {
            const raw = String(ve?.message || '');
            // The classic STARTTLS-vs-SSL mismatch — give an actionable hint.
            const tlsHint = /wrong version number|ssl3_get_record|routines/i.test(raw)
                ? ` This usually means a TLS/port mismatch — use port 587 (STARTTLS) or 465 (SSL).`
                : '';
            return res.status(400).json({ message: `Cannot connect to the mail server (${s.host}:${port}). Check the SMTP host, port and credentials.${tlsHint} ${raw}`.trim() });
        }

        await transporter.sendMail({ from: fromAddr, replyTo, to: recipients.join(','), subject, html: String(message).replace(/\n/g, '<br>') });
        await getDb().collection('owner_broadcasts').insertOne({ ownerId: String(claims.sub), from: fromAddr, replyTo: replyTo || null, to: recipients, subject, message, sentAt: new Date() });
        return res.json({ ok: true, sent: recipients.length, from: fromAddr });
    } catch (e: any) {
        // Provider rejections (e.g. "From not allowed", auth) carry a useful message/code.
        const detail = e?.response || e?.message || 'Unknown error';
        return res.status(502).json({ message: `Email send failed: ${detail}` });
    }
};

// ─── Owner → school notifications (top-bar banner for school admins) ──────────
// super_owner and support can broadcast a notification to one school or all.
export const sendTenantNotification = async (req: Request, res: Response) => {
    const claims = guard(req, res); if (!claims) return;
    const role = String(claims.role || '').toLowerCase();
    if (!['super_owner', 'support', 'owner'].includes(role)) return res.status(403).json({ message: 'Your role cannot send notifications.' });
    try {
        const meta = getDb();
        const { title, message, level, tenantId } = req.body || {};
        if (!message) return res.status(400).json({ message: 'Message is required' });
        const doc = {
            type: 'platform', title: title || 'Platform Notice', message,
            level: level || 'info',           // info | warning | success
            audience: 'Admins', from: claims.name || 'ShuleCloud',
            read: false, dismissed: false, createdAt: new Date(),
        };

        // Targets: one tenant, or all tenants.
        const tenants = tenantId
            ? [await meta.collection('Tenant').findOne({ _id: new ObjectId(tenantId) })].filter(Boolean)
            : await meta.collection('Tenant').find({}).toArray();

        let delivered = 0;
        for (const t of tenants as any[]) {
            try {
                const dbName = t.databaseName || subdomainToDbName(t.subdomain || String(t._id));
                await getTenantDb(dbName).collection('notifications').insertOne({ ...doc, tenantId: String(t._id) });
                delivered++;
            } catch { /* skip a bad tenant */ }
        }
        // Keep a copy in meta for the owner's own audit/history.
        await meta.collection('platform_notifications').insertOne({ ...doc, tenantId: tenantId || 'all', delivered });
        return res.json({ ok: true, delivered });
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};

export const listPlatformNotifications = async (req: Request, res: Response) => {
    if (!guard(req, res)) return;
    try {
        const rows = await getDb().collection('platform_notifications').find({}).sort({ createdAt: -1 }).limit(100).toArray();
        return res.json(rows.map((r: any) => ({ ...r, _id: String(r._id) })));
    } catch (e: any) { return res.status(500).json({ message: e.message }); }
};
