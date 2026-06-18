"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOwnerUser = exports.updateOwnerUser = exports.createOwnerUser = exports.listOwnerUsers = exports.getOwnerRoles = exports.getSchoolsSummary = exports.getOwnerRevenue = exports.getOwnerStats = exports.getRevenueReport = exports.getPlans = exports.getTenants = exports.OWNER_ROLES = void 0;
const mongodb_1 = require("mongodb");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongodb_2 = require("../lib/mongodb");
// ─── Owner roles & permissions ───────────────────────────────────────────────
// Roles available to owner-portal users and what each can do.
exports.OWNER_ROLES = ['super_owner', 'owner', 'support', 'finance', 'sales', 'viewer'];
const ROLE_PERMS = {
    super_owner: ['*'],
    owner: ['schools.manage', 'plans.manage', 'billing.view', 'users.manage', 'analytics.view'],
    finance: ['billing.view', 'billing.manage', 'analytics.view'],
    support: ['schools.manage', 'analytics.view'],
    sales: ['schools.manage', 'plans.view', 'analytics.view'],
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
        const plans = await db.collection('Plan').find({}).toArray();
        return res.json(plans);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch plans' });
    }
};
exports.getPlans = getPlans;
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
