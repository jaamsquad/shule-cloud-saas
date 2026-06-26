import { Router } from 'express';
import { getTenants, getPlans, createPlan, updatePlan, deletePlan, getRevenueReport, getBillingPayments, getOwnerStats, getOwnerRevenue, getSchoolsSummary, getOwnerRoles, listOwnerUsers, createOwnerUser, updateOwnerUser, deleteOwnerUser, getSchoolDetail, assignSchoolPlan, setSchoolStatus, setSchoolModules, impersonateSchool, messageSchool, listContactMessages, updateContactMessage, getPublicSettings, setPublicSettings, getPlatformMpesa, setPlatformMpesa, getPlatformMeeting, setPlatformMeeting, testPlatformMeeting, listReminders, createReminder, updateReminder, deleteReminder, getCompanyEmail, setCompanyEmail, sendBroadcast, sendTenantNotification, listPlatformNotifications, getOwnerProfile, updateOwnerProfile, listOwnerContacts, sendOwnerToOwner } from '../controllers/owner.controller';

const router = Router();

router.get('/tenants', getTenants);
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);
router.get('/billing/revenue-report', getRevenueReport);
router.get('/billing/payments', getBillingPayments);

// ─── Owner analytics ─────────────────────────────────────────────────────────
router.get('/stats', getOwnerStats);                 // GET /api/v1/owner/stats
router.get('/revenue', getOwnerRevenue);             // GET /api/v1/owner/revenue?period=monthly
router.get('/schools/summary', getSchoolsSummary);   // GET /api/v1/owner/schools/summary

// ─── Single-school management ────────────────────────────────────────────────
router.get('/schools/:id', getSchoolDetail);
router.post('/schools/:id/plan', assignSchoolPlan);
router.post('/schools/:id/status', setSchoolStatus);
router.post('/schools/:id/modules', setSchoolModules);
router.post('/schools/:id/impersonate', impersonateSchool);
router.post('/schools/:id/message', messageSchool);

// ─── Owner profile + owner-to-owner messaging ────────────────────────────────
router.get('/profile', getOwnerProfile);
router.patch('/profile', updateOwnerProfile);
router.get('/contacts', listOwnerContacts);
router.post('/message-user', sendOwnerToOwner);

// ─── Contact messages + platform settings ────────────────────────────────────
router.get('/contact-messages', listContactMessages);
router.patch('/contact-messages/:id', updateContactMessage);
router.get('/public-settings', getPublicSettings);
router.post('/public-settings', setPublicSettings);

// ─── Platform M-PESA (Daraja) for subscription billing ───────────────────────
router.get('/mpesa-settings', getPlatformMpesa);
router.post('/mpesa-settings', setPlatformMpesa);
router.get('/meeting-settings', getPlatformMeeting);
router.post('/meeting-settings', setPlatformMeeting);
router.post('/meeting-settings/test', testPlatformMeeting);

// ─── Personal reminders ──────────────────────────────────────────────────────
router.get('/reminders', listReminders);
router.post('/reminders', createReminder);
router.patch('/reminders/:id', updateReminder);
router.delete('/reminders/:id', deleteReminder);

// ─── Company email (SMTP) — super_owner only ─────────────────────────────────
router.get('/company-email', getCompanyEmail);
router.post('/company-email', setCompanyEmail);

// ─── Personal email broadcast ────────────────────────────────────────────────
router.post('/broadcast', sendBroadcast);

// ─── Owner → school notifications ────────────────────────────────────────────
router.post('/notify', sendTenantNotification);
router.get('/notifications-sent', listPlatformNotifications);

// ─── Owner user management (add users + assign roles) ────────────────────────
router.get('/roles', getOwnerRoles);
router.get('/users', listOwnerUsers);
router.post('/users', createOwnerUser);
router.patch('/users/:id', updateOwnerUser);
router.delete('/users/:id', deleteOwnerUser);

// ─── Super-Owner: organization (multi-branch) management ──────────────────────
import { getMetaDb } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { createBranch, listBranches } from '../services/organization.service';

// List every organization with its branch count + owner.
router.get('/organizations', async (_req, res) => {
    try {
        const meta = getMetaDb();
        const orgs = await meta.collection('Organization').find({}).sort({ createdAt: -1 }).toArray();
        const out = await Promise.all(orgs.map(async (o: any) => {
            const branches = await listBranches(String(o._id));
            const owner = await meta.collection('OrgUser').findOne({ organizationId: String(o._id), role: 'ORG_OWNER' });
            return { id: String(o._id), name: o.name, ownerEmail: o.ownerEmail, branchCount: branches.length, branches: branches.map(b => ({ id: String(b._id), name: b.name, subdomain: b.subdomain })), backfilled: !!o.backfilled, createdAt: o.createdAt, ownerName: owner?.name };
        }));
        res.json(out);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Create an organization with its owner + primary branch (new tenant DB).
router.post('/organizations', async (req, res) => {
    try {
        const { name, ownerEmail, ownerName, password, primaryBranch } = req.body || {};
        if (!name || !ownerEmail || !password) return res.status(400).json({ message: 'Organization name, owner email and password are required.' });
        const meta = getMetaDb();
        const email = String(ownerEmail).trim().toLowerCase();
        if (await meta.collection('OrgUser').findOne({ email })) return res.status(409).json({ message: 'That owner email already exists.' });
        const orgRes = await meta.collection('Organization').insertOne({ name, ownerEmail: email, branding: null, createdAt: new Date() });
        const organizationId = String(orgRes.insertedId);
        await meta.collection('OrgUser').insertOne({ organizationId, email, name: ownerName || name, role: 'ORG_OWNER', allowedBranchIds: [], passwordHash: await bcrypt.hash(String(password), 10), createdAt: new Date() });
        let branch = null;
        if (primaryBranch?.name && primaryBranch?.subdomain) {
            const sub = String(primaryBranch.subdomain).toLowerCase().trim();
            if (await meta.collection('Tenant').findOne({ subdomain: sub })) return res.status(409).json({ message: 'That branch subdomain is already taken.' });
            branch = await createBranch({ organizationId, name: primaryBranch.name, subdomain: sub, isPrimary: true });
        }
        res.json({ ok: true, organizationId, branch: branch ? { id: String(branch._id), name: branch.name, subdomain: branch.subdomain } : null });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Add a branch (new tenant DB) to an existing organization.
router.post('/organizations/:id/branches', async (req, res) => {
    try {
        const { name, subdomain } = req.body || {};
        if (!name || !subdomain) return res.status(400).json({ message: 'Branch name and subdomain are required.' });
        const meta = getMetaDb();
        const sub = String(subdomain).toLowerCase().trim();
        if (await meta.collection('Tenant').findOne({ subdomain: sub })) return res.status(409).json({ message: 'That subdomain is already taken.' });
        const branch = await createBranch({ organizationId: req.params.id, name, subdomain: sub });
        res.json({ ok: true, branch: { id: String(branch._id), name: branch.name, subdomain: branch.subdomain } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Wrap one existing standalone tenant into a single-branch organization.
router.post('/organizations/wrap-tenant/:tenantId', async (req, res) => {
    try {
        const meta = getMetaDb();
        const t: any = await meta.collection('Tenant').findOne({ _id: new ObjectId(req.params.tenantId) });
        if (!t) return res.status(404).json({ message: 'Tenant not found.' });
        if (t.organizationId) return res.status(409).json({ message: 'Tenant already belongs to an organization.' });
        const orgRes = await meta.collection('Organization').insertOne({ name: t.name || t.subdomain, ownerEmail: t.contactEmail || '', branding: null, createdAt: new Date(), backfilled: true });
        const organizationId = String(orgRes.insertedId);
        const branch = await createBranch({ organizationId, name: t.name || t.subdomain, subdomain: t.subdomain, isPrimary: true, tenantId: String(t._id), databaseName: t.databaseName });
        // Create an org owner using the school's contact email (password set later / reset).
        if (t.contactEmail) {
            const email = String(t.contactEmail).toLowerCase();
            const exists = await meta.collection('OrgUser').findOne({ email });
            if (!exists) await meta.collection('OrgUser').insertOne({ organizationId, email, name: t.name, role: 'ORG_OWNER', allowedBranchIds: [], passwordHash: await bcrypt.hash(req.body?.password || 'changeme123', 10), createdAt: new Date() });
        }
        res.json({ ok: true, organizationId, branch: { id: String(branch._id), name: branch.name } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
