"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlatformNotifications = exports.sendTenantNotification = exports.sendBroadcast = exports.setCompanyEmail = exports.getCompanyEmail = exports.deleteReminder = exports.updateReminder = exports.createReminder = exports.listReminders = exports.setPlatformMpesa = exports.getPlatformMpesa = exports.setPublicSettings = exports.getPublicSettings = exports.updateContactMessage = exports.listContactMessages = exports.submitContactMessage = exports.impersonateSchool = exports.setSchoolModules = exports.setSchoolStatus = exports.assignSchoolPlan = exports.getSchoolDetail = exports.deleteOwnerUser = exports.updateOwnerUser = exports.createOwnerUser = exports.listOwnerUsers = exports.getOwnerRoles = exports.getSchoolsSummary = exports.getOwnerRevenue = exports.getOwnerStats = exports.getRevenueReport = exports.deletePlan = exports.updatePlan = exports.createPlan = exports.getPlans = exports.getTenants = exports.OWNER_ROLES = void 0;
const mongodb_1 = require("mongodb");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongodb_2 = require("../lib/mongodb");
// ─── Owner roles & permissions ───────────────────────────────────────────────
// Roles available to owner-portal users and what each can do.
exports.OWNER_ROLES = ['super_owner', 'owner', 'support', 'finance', 'sales', 'viewer'];
const ROLE_PERMS = {
    super_owner: ['*'],
    // schools.manage = EDIT tenants; schools.view = read-only. plans.manage = create/edit plans.
    owner: ['schools.view', 'schools.manage', 'plans.manage', 'billing.view', 'users.manage', 'analytics.view', 'reminders', 'broadcast'],
    finance: ['billing.view', 'billing.manage', 'analytics.view', 'schools.view', 'reminders', 'broadcast'],
    support: ['schools.view', 'analytics.view', 'reminders', 'broadcast'],
    sales: ['schools.view', 'plans.view', 'analytics.view', 'reminders', 'broadcast'],
    viewer: ['analytics.view'],
};
// Decode the owner JWT from the request (already issued by owner-auth).
const ownerClaims = (req) => {
    try {
        const auth = req.headers.authorization;
        if (!auth)
            return null;
        return jsonwebtoken_1.default.verify(auth.split(' ')[1], process.env.OWNER_JWT_SECRET || 'owner_secret');
    }
    catch {
        return null;
    }
};
const canManageUsers = (claims) => {
    const role = String(claims?.role || '').toLowerCase();
    return role === 'super_owner' || ROLE_PERMS[role]?.includes('users.manage');
};
// Generic permission check for a specific capability code.
const hasPerm = (claims, code) => {
    const role = String(claims?.role || '').toLowerCase();
    const perms = ROLE_PERMS[role] || [];
    return role === 'super_owner' || perms.includes('*') || perms.includes(code);
};
// Guard helper: returns claims if allowed, else writes 401/403 and returns null.
const guard = (req, res, code) => {
    const claims = ownerClaims(req);
    if (!claims) {
        res.status(401).json({ message: 'Unauthorized' });
        return null;
    }
    if (code && !hasPerm(claims, code)) {
        res.status(403).json({ message: 'Your role does not allow this action.' });
        return null;
    }
    return claims;
};
const getTenants = async (req, res) => {
    try {
        const db = (0, mongodb_2.getDb)();
        const tenants = await db.collection('Tenant').find({}).toArray();
        // Enhance tenants with counts if needed, but for now just return them
        return res.json(tenants);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch tenants' });
    }
};
exports.getTenants = getTenants;
const getPlans = async (req, res) => {
    try {
        const db = (0, mongodb_2.getDb)();
        const plans = await db.collection('Plan').find({}).sort({ price: 1 }).toArray();
        return res.json(plans);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch plans' });
    }
};
exports.getPlans = getPlans;
// Create a plan (with module list + max-students limit).
const createPlan = async (req, res) => {
    if (!guard(req, res, 'plans.manage'))
        return;
    try {
        const db = (0, mongodb_2.getDb)();
        const { name, price, maxStudents, modules, description, isActive, durationDays, graceDays } = req.body || {};
        if (!name)
            return res.status(400).json({ message: 'Plan name is required' });
        const doc = {
            name: String(name).trim(),
            price: Number(price) || 0,
            limits: { maxStudents: maxStudents === '' || maxStudents == null ? null : Number(maxStudents) },
            modules: Array.isArray(modules) ? modules : [],
            description: description || '',
            durationDays: Number(durationDays) > 0 ? Number(durationDays) : 30, // billing period length
            graceDays: Number(graceDays) >= 0 ? Number(graceDays) : 0, // post-expiry grace
            isActive: isActive !== false,
            createdAt: new Date(), updatedAt: new Date(),
        };
        const r = await db.collection('Plan').insertOne(doc);
        return res.status(201).json({ _id: String(r.insertedId), ...doc });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.createPlan = createPlan;
const updatePlan = async (req, res) => {
    if (!guard(req, res, 'plans.manage'))
        return;
    try {
        const db = (0, mongodb_2.getDb)();
        const { name, price, maxStudents, modules, description, isActive, durationDays, graceDays } = req.body || {};
        const set = { updatedAt: new Date() };
        if (name !== undefined)
            set.name = String(name).trim();
        if (price !== undefined)
            set.price = Number(price) || 0;
        if (maxStudents !== undefined)
            set.limits = { maxStudents: maxStudents === '' || maxStudents == null ? null : Number(maxStudents) };
        if (modules !== undefined)
            set.modules = Array.isArray(modules) ? modules : [];
        if (description !== undefined)
            set.description = description;
        if (durationDays !== undefined)
            set.durationDays = Number(durationDays) > 0 ? Number(durationDays) : 30;
        if (graceDays !== undefined)
            set.graceDays = Number(graceDays) >= 0 ? Number(graceDays) : 0;
        if (isActive !== undefined)
            set.isActive = !!isActive;
        const r = await db.collection('Plan').updateOne({ _id: new mongodb_1.ObjectId(req.params.id) }, { $set: set });
        if (!r.matchedCount)
            return res.status(404).json({ message: 'Plan not found' });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.updatePlan = updatePlan;
const deletePlan = async (req, res) => {
    if (!guard(req, res, 'plans.manage'))
        return;
    try {
        const db = (0, mongodb_2.getDb)();
        await db.collection('Plan').deleteOne({ _id: new mongodb_1.ObjectId(req.params.id) });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.deletePlan = deletePlan;
const getRevenueReport = async (req, res) => {
    try {
        // Placeholder for revenue report
        return res.json({
            totalRevenue: 0,
            monthlyRevenue: 0,
            recentTransactions: []
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch revenue report' });
    }
};
exports.getRevenueReport = getRevenueReport;
// ─── Owner analytics ─────────────────────────────────────────────────────────
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
// Joins tenants → their subscription → plan, returning a normalized view.
async function loadSchoolRows(db) {
    const [tenants, plans, subs] = await Promise.all([
        db.collection('Tenant').find({}).toArray(),
        db.collection('Plan').find({}).toArray(),
        db.collection('TenantSubscription').find({}).toArray().catch(() => []),
    ]);
    const planById = {};
    plans.forEach((p) => { planById[String(p._id)] = p; });
    const subByTenant = {};
    subs.forEach((s) => { subByTenant[String(s.tenantId)] = s; });
    return tenants.map((t) => {
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
const getOwnerStats = async (_req, res) => {
    try {
        const db = (0, mongodb_2.getDb)();
        const rows = await loadSchoolRows(db);
        const now = new Date();
        const in30 = new Date(now.getTime() + 30 * 86400000);
        const monthlyRevenue = rows
            .filter((r) => r.status === 'active')
            .reduce((s, r) => s + num(r.planPrice), 0);
        const expiringSoon = rows.filter((r) => r.expiry && new Date(r.expiry) > now && new Date(r.expiry) <= in30).length;
        return res.json({
            totalSchools: rows.length,
            activeSchools: rows.filter((r) => r.status === 'active').length,
            trialSchools: rows.filter((r) => r.status === 'trial').length,
            suspendedSchools: rows.filter((r) => r.status === 'suspended').length,
            monthlyRevenue,
            expiringSoon,
        });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.getOwnerStats = getOwnerStats;
const getOwnerRevenue = async (req, res) => {
    try {
        const db = (0, mongodb_2.getDb)();
        // Build last 12 months from subscription payments if present, else from
        // active plan prices spread over each school's lifetime.
        const payments = await db.collection('subscription_payments').find({}).toArray().catch(() => []);
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push({ month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), amount: 0 });
        }
        const idx = {};
        months.forEach((m, i) => { idx[m.month] = i; });
        if (payments.length) {
            payments.forEach((p) => {
                const d = new Date(p.paidAt || p.createdAt || p.date || Date.now());
                const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                if (idx[key] !== undefined)
                    months[idx[key]].amount += num(p.amount);
            });
        }
        else {
            // Fallback: current MRR applied to the latest month so the chart isn't flat-empty.
            const rows = await loadSchoolRows(db);
            const mrr = rows.filter((r) => r.status === 'active').reduce((s, r) => s + num(r.planPrice), 0);
            if (months.length)
                months[months.length - 1].amount = mrr;
        }
        return res.json(months);
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.getOwnerRevenue = getOwnerRevenue;
const getSchoolsSummary = async (_req, res) => {
    try {
        const db = (0, mongodb_2.getDb)();
        const rows = await loadSchoolRows(db);
        return res.json(rows);
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.getSchoolsSummary = getSchoolsSummary;
// ─── Owner user management (add users + assign roles) ─────────────────────────
const getOwnerRoles = (_req, res) => {
    return res.json(exports.OWNER_ROLES.map((r) => ({ role: r, permissions: ROLE_PERMS[r] })));
};
exports.getOwnerRoles = getOwnerRoles;
const listOwnerUsers = async (req, res) => {
    if (!ownerClaims(req))
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = (0, mongodb_2.getDb)();
        const users = await db.collection('OwnerUser').find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();
        return res.json(users.map((u) => ({
            _id: String(u._id), name: u.name, email: u.email,
            role: u.role || 'owner', status: u.status || (u.isActive === false ? 'suspended' : 'active'),
            createdAt: u.createdAt,
        })));
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.listOwnerUsers = listOwnerUsers;
const createOwnerUser = async (req, res) => {
    const claims = ownerClaims(req);
    if (!claims)
        return res.status(401).json({ message: 'Unauthorized' });
    if (!canManageUsers(claims))
        return res.status(403).json({ message: 'You are not allowed to add users.' });
    try {
        const db = (0, mongodb_2.getDb)();
        const { name, email, password, role } = req.body || {};
        if (!name || !email || !password)
            return res.status(400).json({ message: 'Name, email and password are required' });
        if (!exports.OWNER_ROLES.includes((role || 'viewer')))
            return res.status(400).json({ message: 'Invalid role' });
        const existing = await db.collection('OwnerUser').findOne({ email });
        if (existing)
            return res.status(409).json({ message: 'Email already registered' });
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const r = await db.collection('OwnerUser').insertOne({
            name, email, passwordHash, role: role || 'viewer', status: 'active', isActive: true,
            createdBy: claims.email || claims.sub, createdAt: new Date(), updatedAt: new Date(),
        });
        return res.status(201).json({ _id: String(r.insertedId), name, email, role: role || 'viewer', status: 'active' });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.createOwnerUser = createOwnerUser;
const updateOwnerUser = async (req, res) => {
    const claims = ownerClaims(req);
    if (!claims)
        return res.status(401).json({ message: 'Unauthorized' });
    if (!canManageUsers(claims))
        return res.status(403).json({ message: 'You are not allowed to manage users.' });
    try {
        const db = (0, mongodb_2.getDb)();
        const { role, status, password } = req.body || {};
        const set = { updatedAt: new Date() };
        if (role) {
            if (!exports.OWNER_ROLES.includes(role))
                return res.status(400).json({ message: 'Invalid role' });
            set.role = role;
        }
        if (status) {
            set.status = status;
            set.isActive = status !== 'suspended';
        }
        if (password)
            set.passwordHash = await bcrypt_1.default.hash(password, 10);
        const r = await db.collection('OwnerUser').updateOne({ _id: new mongodb_1.ObjectId(req.params.id) }, { $set: set });
        if (!r.matchedCount)
            return res.status(404).json({ message: 'User not found' });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.updateOwnerUser = updateOwnerUser;
const deleteOwnerUser = async (req, res) => {
    const claims = ownerClaims(req);
    if (!claims)
        return res.status(401).json({ message: 'Unauthorized' });
    if (!canManageUsers(claims))
        return res.status(403).json({ message: 'You are not allowed to remove users.' });
    try {
        const db = (0, mongodb_2.getDb)();
        // Never delete the last super_owner.
        const target = await db.collection('OwnerUser').findOne({ _id: new mongodb_1.ObjectId(req.params.id) });
        if (target?.role === 'super_owner') {
            const supers = await db.collection('OwnerUser').countDocuments({ role: 'super_owner' });
            if (supers <= 1)
                return res.status(400).json({ message: 'Cannot remove the last Super Owner.' });
        }
        await db.collection('OwnerUser').deleteOne({ _id: new mongodb_1.ObjectId(req.params.id) });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.deleteOwnerUser = deleteOwnerUser;
// ─── School (tenant) management ──────────────────────────────────────────────
const tenantDbOf = (t) => t.databaseName || (0, mongodb_2.subdomainToDbName)(t.subdomain || String(t._id));
// Full detail for one school: plan, status, counts, modules, DB usage.
const getSchoolDetail = async (req, res) => {
    if (!ownerClaims(req))
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const meta = (0, mongodb_2.getDb)();
        const t = await meta.collection('Tenant').findOne({ _id: new mongodb_1.ObjectId(req.params.id) });
        if (!t)
            return res.status(404).json({ message: 'School not found' });
        const sub = await meta.collection('TenantSubscription').findOne({ tenantId: t._id });
        const plan = sub?.planId ? await meta.collection('Plan').findOne({ _id: sub.planId })
            : (t.planId ? await meta.collection('Plan').findOne({ _id: t.planId }) : null);
        const plans = await meta.collection('Plan').find({}).toArray();
        // Counts + DB usage from the tenant's own database.
        let students = 0, staff = 0, dbSizeMB = 0, collections = 0;
        try {
            const tdb = (0, mongodb_2.getTenantDb)(tenantDbOf(t));
            students = await tdb.collection('students').countDocuments({}).catch(() => 0);
            staff = await tdb.collection('staff').countDocuments({}).catch(() => 0);
            const stats = await tdb.command({ dbStats: 1, scale: 1 }).catch(() => null);
            if (stats) {
                dbSizeMB = Math.round(((stats.dataSize || 0) + (stats.indexSize || 0)) / (1024 * 1024) * 100) / 100;
                collections = stats.collections || 0;
            }
        }
        catch { /* ignore */ }
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
            allPlans: plans.map((p) => ({ _id: String(p._id), name: p.name, price: p.price })),
            // Per-school module overrides (falls back to plan modules if unset).
            enabledModules: Array.isArray(t.enabledModules) ? t.enabledModules : (plan?.modules || []),
            counts: { students, staff },
            dbUsage: { sizeMB: dbSizeMB, collections, dbName: tenantDbOf(t) },
            createdAt: t.createdAt,
        });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.getSchoolDetail = getSchoolDetail;
// Assign / change a school's plan.
const assignSchoolPlan = async (req, res) => {
    if (!guard(req, res, 'schools.manage'))
        return;
    try {
        const meta = (0, mongodb_2.getDb)();
        const { planId } = req.body || {};
        const tid = new mongodb_1.ObjectId(req.params.id);
        const plan = planId ? await meta.collection('Plan').findOne({ _id: new mongodb_1.ObjectId(planId) }) : null;
        await meta.collection('TenantSubscription').updateOne({ tenantId: tid }, { $set: { tenantId: tid, planId: plan?._id || null, planName: plan?.name || null, amount: plan?.price || 0, status: 'active', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
        await meta.collection('Tenant').updateOne({ _id: tid }, { $set: { planId: plan?._id || null, plan: plan?.name || null, enabledModules: plan?.modules || [], updatedAt: new Date() } });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.assignSchoolPlan = assignSchoolPlan;
// Activate / suspend a school account.
const setSchoolStatus = async (req, res) => {
    if (!guard(req, res, 'schools.manage'))
        return;
    try {
        const status = String(req.body?.status || '').toLowerCase();
        if (!['active', 'suspended', 'trial'].includes(status))
            return res.status(400).json({ message: 'Invalid status' });
        await (0, mongodb_2.getDb)().collection('Tenant').updateOne({ _id: new mongodb_1.ObjectId(req.params.id) }, { $set: { status, updatedAt: new Date() } });
        return res.json({ ok: true, status });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.setSchoolStatus = setSchoolStatus;
// Toggle which modules a school can access (overrides the plan).
const setSchoolModules = async (req, res) => {
    if (!guard(req, res, 'schools.manage'))
        return;
    try {
        const modules = Array.isArray(req.body?.modules) ? req.body.modules : [];
        await (0, mongodb_2.getDb)().collection('Tenant').updateOne({ _id: new mongodb_1.ObjectId(req.params.id) }, { $set: { enabledModules: modules, updatedAt: new Date() } });
        return res.json({ ok: true, modules });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.setSchoolModules = setSchoolModules;
// Impersonate: mint a tenant admin token so the owner can log in as the school admin.
const impersonateSchool = async (req, res) => {
    if (!guard(req, res, 'schools.manage'))
        return;
    try {
        const meta = (0, mongodb_2.getDb)();
        const t = await meta.collection('Tenant').findOne({ _id: new mongodb_1.ObjectId(req.params.id) });
        if (!t)
            return res.status(404).json({ message: 'School not found' });
        // Find this school's primary admin user (meta User registry).
        const admin = await meta.collection('User').findOne({ tenantId: t._id })
            || await meta.collection('User').findOne({ tenantId: String(t._id) });
        const secret = process.env.JWT_SECRET || 'secret';
        const token = jsonwebtoken_1.default.sign({
            sub: admin?._id?.toString() || String(t._id),
            email: admin?.email || t.email || '',
            role: 'school_admin',
            tenantId: String(t._id),
            tenantSubdomain: t.subdomain,
            name: admin?.name || t.name,
            impersonated: true,
        }, secret, { expiresIn: '2h' });
        return res.json({ access_token: token, subdomain: t.subdomain, name: t.name });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.impersonateSchool = impersonateSchool;
// ─── Contact messages (from the public /contact page) ────────────────────────
// Public: anyone can submit. Stored in the meta DB for the owner to review.
const submitContactMessage = async (req, res) => {
    try {
        const db = (0, mongodb_2.getDb)();
        const { name, school, email, phone, message } = req.body || {};
        if (!name || !email || !message)
            return res.status(400).json({ message: 'Name, email and message are required' });
        await db.collection('contact_messages').insertOne({
            name, school: school || '', email, phone: phone || '', message,
            status: 'new', createdAt: new Date(),
        });
        return res.status(201).json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.submitContactMessage = submitContactMessage;
const listContactMessages = async (req, res) => {
    if (!ownerClaims(req))
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = (0, mongodb_2.getDb)();
        const rows = await db.collection('contact_messages').find({}).sort({ createdAt: -1 }).limit(200).toArray();
        return res.json(rows.map((r) => ({ ...r, _id: String(r._id) })));
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.listContactMessages = listContactMessages;
const updateContactMessage = async (req, res) => {
    if (!ownerClaims(req))
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const db = (0, mongodb_2.getDb)();
        const { status } = req.body || {};
        await db.collection('contact_messages').updateOne({ _id: new mongodb_1.ObjectId(req.params.id) }, { $set: { status: status || 'read', updatedAt: new Date() } });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.updateContactMessage = updateContactMessage;
// ─── Register toggle (owner can enable/disable public self-registration) ──────
const getPublicSettings = async (_req, res) => {
    try {
        const s = await (0, mongodb_2.getDb)().collection('platform_settings').findOne({ key: 'public' });
        return res.json({ registrationEnabled: s?.registrationEnabled !== false });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.getPublicSettings = getPublicSettings;
const setPublicSettings = async (req, res) => {
    if (!ownerClaims(req))
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const { registrationEnabled } = req.body || {};
        await (0, mongodb_2.getDb)().collection('platform_settings').updateOne({ key: 'public' }, { $set: { key: 'public', registrationEnabled: !!registrationEnabled, updatedAt: new Date() } }, { upsert: true });
        return res.json({ ok: true, registrationEnabled: !!registrationEnabled });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.setPublicSettings = setPublicSettings;
// ─── Platform M-PESA (Daraja) settings — owner-level, for subscription billing ─
const MPESA_FIELDS = ['env', 'consumerKey', 'consumerSecret', 'shortcode', 'passkey', 'txType', 'initiator', 'securityCredential', 'callbackBase', 'enabled'];
const getPlatformMpesa = async (req, res) => {
    if (!ownerClaims(req))
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const s = (await (0, mongodb_2.getDb)().collection('mpesa_settings').findOne({})) || {};
        // Mask secrets in the response.
        return res.json({
            env: s.env || 'sandbox',
            consumerKey: s.consumerKey || '',
            consumerSecret: s.consumerSecret ? '••••••••' : '',
            shortcode: s.shortcode || '',
            passkey: s.passkey ? '••••••••' : '',
            txType: s.txType || 'CustomerPayBillOnline',
            initiator: s.initiator || '',
            callbackBase: s.callbackBase || process.env.MPESA_CALLBACK_URL || '',
            enabled: s.enabled !== false,
            configured: !!(s.consumerKey && s.consumerSecret && s.shortcode && s.passkey),
        });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.getPlatformMpesa = getPlatformMpesa;
const setPlatformMpesa = async (req, res) => {
    const claims = ownerClaims(req);
    if (!claims)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const body = req.body || {};
        const set = { updatedAt: new Date() };
        MPESA_FIELDS.forEach((f) => {
            const v = body[f];
            // Don't overwrite a stored secret with the masked placeholder.
            if (v === undefined || v === '••••••••')
                return;
            set[f] = f === 'enabled' ? !!v : v;
        });
        await (0, mongodb_2.getDb)().collection('mpesa_settings').updateOne({}, { $set: set }, { upsert: true });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.setPlatformMpesa = setPlatformMpesa;
// ─── Personal reminders (per owner user) ─────────────────────────────────────
const listReminders = async (req, res) => {
    const claims = guard(req, res);
    if (!claims)
        return;
    try {
        const rows = await (0, mongodb_2.getDb)().collection('owner_reminders').find({ ownerId: String(claims.sub) }).sort({ dueAt: 1, createdAt: -1 }).toArray();
        return res.json(rows.map((r) => ({ ...r, _id: String(r._id) })));
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.listReminders = listReminders;
const createReminder = async (req, res) => {
    const claims = guard(req, res);
    if (!claims)
        return;
    try {
        const { title, note, dueAt } = req.body || {};
        if (!title)
            return res.status(400).json({ message: 'Title is required' });
        const doc = { ownerId: String(claims.sub), title, note: note || '', dueAt: dueAt || null, done: false, createdAt: new Date() };
        const r = await (0, mongodb_2.getDb)().collection('owner_reminders').insertOne(doc);
        return res.status(201).json({ _id: String(r.insertedId), ...doc });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.createReminder = createReminder;
const updateReminder = async (req, res) => {
    const claims = guard(req, res);
    if (!claims)
        return;
    try {
        const set = { updatedAt: new Date() };
        ['title', 'note', 'dueAt', 'done'].forEach((k) => { if (req.body?.[k] !== undefined)
            set[k] = req.body[k]; });
        await (0, mongodb_2.getDb)().collection('owner_reminders').updateOne({ _id: new mongodb_1.ObjectId(req.params.id), ownerId: String(claims.sub) }, { $set: set });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.updateReminder = updateReminder;
const deleteReminder = async (req, res) => {
    const claims = guard(req, res);
    if (!claims)
        return;
    try {
        await (0, mongodb_2.getDb)().collection('owner_reminders').deleteOne({ _id: new mongodb_1.ObjectId(req.params.id), ownerId: String(claims.sub) });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.deleteReminder = deleteReminder;
// ─── Company email (SMTP) settings — super_owner only ─────────────────────────
const getCompanyEmail = async (req, res) => {
    const claims = guard(req, res);
    if (!claims)
        return;
    if (String(claims.role).toLowerCase() !== 'super_owner')
        return res.status(403).json({ message: 'Only the Super Owner can view email settings.' });
    try {
        const s = (await (0, mongodb_2.getDb)().collection('platform_email_settings').findOne({ key: 'smtp' })) || {};
        return res.json({
            host: s.host || '', port: s.port || 587, secure: !!s.secure,
            user: s.user || '', pass: s.pass ? '••••••••' : '',
            fromName: s.fromName || 'ShuleCloud', domain: s.domain || 'shulecloud.com',
            configured: !!(s.host && s.user && s.pass),
        });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.getCompanyEmail = getCompanyEmail;
const setCompanyEmail = async (req, res) => {
    const claims = guard(req, res);
    if (!claims)
        return;
    if (String(claims.role).toLowerCase() !== 'super_owner')
        return res.status(403).json({ message: 'Only the Super Owner can change email settings.' });
    try {
        const b = req.body || {};
        const set = { key: 'smtp', updatedAt: new Date() };
        ['host', 'fromName', 'domain', 'user'].forEach((k) => { if (b[k] !== undefined)
            set[k] = b[k]; });
        if (b.port !== undefined)
            set.port = Number(b.port) || 587;
        if (b.secure !== undefined)
            set.secure = !!b.secure;
        if (b.pass !== undefined && b.pass !== '••••••••')
            set.pass = b.pass;
        await (0, mongodb_2.getDb)().collection('platform_email_settings').updateOne({ key: 'smtp' }, { $set: set }, { upsert: true });
        return res.json({ ok: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.setCompanyEmail = setCompanyEmail;
// ─── Personal email broadcast — sends from <user>@<companyDomain> via SMTP ─────
const sendBroadcast = async (req, res) => {
    const claims = guard(req, res, 'broadcast');
    if (!claims)
        return;
    try {
        const { to, subject, message } = req.body || {};
        const recipients = Array.isArray(to) ? to : String(to || '').split(/[,;\s]+/).filter(Boolean);
        if (!recipients.length || !subject || !message)
            return res.status(400).json({ message: 'Recipients, subject and message are required' });
        const s = (await (0, mongodb_2.getDb)().collection('platform_email_settings').findOne({ key: 'smtp' })) || {};
        if (!s.host || !s.user || !s.pass)
            return res.status(400).json({ message: 'Company email (SMTP) is not configured. Ask the Super Owner to set it in Settings.' });
        const port = Number(s.port) || 587;
        // The port — not a saved flag — decides the encryption mode. 465 is implicit
        // TLS; 587/25 use STARTTLS (plain connect, then upgrade). Honouring a wrong
        // `secure=true` on 587 causes "ssl3_get_record: wrong version number".
        const secure = port === 465;
        const nodemailer = (await Promise.resolve().then(() => __importStar(require('nodemailer')))).default;
        const transporter = nodemailer.createTransport({
            host: s.host,
            port,
            secure,
            requireTLS: !secure, // force STARTTLS upgrade on 587/25
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
        const replyTo = authMatches ? undefined : desiredAddr;
        // Surface bad host/port/credentials as a clear 400 instead of a cryptic 500.
        try {
            await transporter.verify();
        }
        catch (ve) {
            const raw = String(ve?.message || '');
            // The classic STARTTLS-vs-SSL mismatch — give an actionable hint.
            const tlsHint = /wrong version number|ssl3_get_record|routines/i.test(raw)
                ? ` This usually means a TLS/port mismatch — use port 587 (STARTTLS) or 465 (SSL).`
                : '';
            return res.status(400).json({ message: `Cannot connect to the mail server (${s.host}:${port}). Check the SMTP host, port and credentials.${tlsHint} ${raw}`.trim() });
        }
        await transporter.sendMail({ from: fromAddr, replyTo, to: recipients.join(','), subject, html: String(message).replace(/\n/g, '<br>') });
        await (0, mongodb_2.getDb)().collection('owner_broadcasts').insertOne({ ownerId: String(claims.sub), from: fromAddr, replyTo: replyTo || null, to: recipients, subject, message, sentAt: new Date() });
        return res.json({ ok: true, sent: recipients.length, from: fromAddr });
    }
    catch (e) {
        // Provider rejections (e.g. "From not allowed", auth) carry a useful message/code.
        const detail = e?.response || e?.message || 'Unknown error';
        return res.status(502).json({ message: `Email send failed: ${detail}` });
    }
};
exports.sendBroadcast = sendBroadcast;
// ─── Owner → school notifications (top-bar banner for school admins) ──────────
// super_owner and support can broadcast a notification to one school or all.
const sendTenantNotification = async (req, res) => {
    const claims = guard(req, res);
    if (!claims)
        return;
    const role = String(claims.role || '').toLowerCase();
    if (!['super_owner', 'support', 'owner'].includes(role))
        return res.status(403).json({ message: 'Your role cannot send notifications.' });
    try {
        const meta = (0, mongodb_2.getDb)();
        const { title, message, level, tenantId } = req.body || {};
        if (!message)
            return res.status(400).json({ message: 'Message is required' });
        const doc = {
            type: 'platform', title: title || 'Platform Notice', message,
            level: level || 'info', // info | warning | success
            audience: 'Admins', from: claims.name || 'ShuleCloud',
            read: false, dismissed: false, createdAt: new Date(),
        };
        // Targets: one tenant, or all tenants.
        const tenants = tenantId
            ? [await meta.collection('Tenant').findOne({ _id: new mongodb_1.ObjectId(tenantId) })].filter(Boolean)
            : await meta.collection('Tenant').find({}).toArray();
        let delivered = 0;
        for (const t of tenants) {
            try {
                const dbName = t.databaseName || (0, mongodb_2.subdomainToDbName)(t.subdomain || String(t._id));
                await (0, mongodb_2.getTenantDb)(dbName).collection('notifications').insertOne({ ...doc, tenantId: String(t._id) });
                delivered++;
            }
            catch { /* skip a bad tenant */ }
        }
        // Keep a copy in meta for the owner's own audit/history.
        await meta.collection('platform_notifications').insertOne({ ...doc, tenantId: tenantId || 'all', delivered });
        return res.json({ ok: true, delivered });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.sendTenantNotification = sendTenantNotification;
const listPlatformNotifications = async (req, res) => {
    if (!guard(req, res))
        return;
    try {
        const rows = await (0, mongodb_2.getDb)().collection('platform_notifications').find({}).sort({ createdAt: -1 }).limit(100).toArray();
        return res.json(rows.map((r) => ({ ...r, _id: String(r._id) })));
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
};
exports.listPlatformNotifications = listPlatformNotifications;
