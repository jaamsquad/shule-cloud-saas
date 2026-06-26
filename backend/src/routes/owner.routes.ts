import { Router } from 'express';
import { getTenants, getPlans, createPlan, updatePlan, deletePlan, getRevenueReport, getBillingPayments, getOwnerStats, getOwnerRevenue, getSchoolsSummary, getOwnerRoles, listOwnerUsers, createOwnerUser, updateOwnerUser, deleteOwnerUser, getSchoolDetail, assignSchoolPlan, setSchoolStatus, updateSchool, resetSchoolPassword, resetOrgPassword, setSchoolModules, impersonateSchool, messageSchool, getOwnerAuditLogs, listContactMessages, updateContactMessage, getPublicSettings, setPublicSettings, getPlatformMpesa, setPlatformMpesa, getPlatformMeeting, setPlatformMeeting, testPlatformMeeting, listReminders, createReminder, updateReminder, deleteReminder, getCompanyEmail, setCompanyEmail, sendBroadcast, sendTenantNotification, listPlatformNotifications, getOwnerProfile, updateOwnerProfile, listOwnerContacts, sendOwnerToOwner } from '../controllers/owner.controller';

const router = Router();

router.get('/tenants', getTenants);
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);
router.get('/billing/revenue-report', getRevenueReport);
router.get('/billing/payments', getBillingPayments);

// ─── Owner analytics ─────────────────────────────────────────────────────────
router.get('/audit-logs', getOwnerAuditLogs);        // platform audit trail
router.get('/stats', getOwnerStats);                 // GET /api/v1/owner/stats
router.get('/revenue', getOwnerRevenue);             // GET /api/v1/owner/revenue?period=monthly
router.get('/schools/summary', getSchoolsSummary);   // GET /api/v1/owner/schools/summary

// ─── Single-school management ────────────────────────────────────────────────
router.get('/schools/:id', getSchoolDetail);
router.post('/schools/:id/plan', assignSchoolPlan);
router.post('/schools/:id/status', setSchoolStatus);
router.patch('/schools/:id', updateSchool);
router.post('/schools/:id/reset-password', resetSchoolPassword);
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

// Reset an organization owner's password (and email it).
router.post('/organizations/:id/reset-password', resetOrgPassword);

// Edit an organization (name + owner email).
router.patch('/organizations/:id', async (req, res) => {
    try {
        const meta = getMetaDb();
        const { name, ownerEmail } = req.body || {};
        const $set: any = { updatedAt: new Date() };
        if (name) $set.name = name;
        if (ownerEmail) $set.ownerEmail = String(ownerEmail).trim().toLowerCase();
        await meta.collection('Organization').updateOne({ _id: new ObjectId(req.params.id) }, { $set });
        // Keep the org owner's email/name in sync.
        if (name || ownerEmail) {
            const upd: any = {};
            if (name) upd.name = name;
            if (ownerEmail) upd.email = String(ownerEmail).trim().toLowerCase();
            await meta.collection('OrgUser').updateOne({ organizationId: req.params.id, role: 'ORG_OWNER' }, { $set: upd });
        }
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Delete an organization. Refuses if it still has branches (unless ?force=1),
// and NEVER deletes the underlying school databases — it only unlinks them.
router.delete('/organizations/:id', async (req, res) => {
    try {
        const meta = getMetaDb();
        const id = req.params.id;
        const branches = await listBranches(id);
        if (branches.length && req.query.force !== '1') {
            return res.status(409).json({ message: `This organization still has ${branches.length} branch(es). Remove them first, or confirm force-delete.` });
        }
        // Unlink tenants (the school data is preserved), drop Branch links + org users.
        for (const b of branches) {
            await meta.collection('Tenant').updateOne({ _id: new ObjectId(b.tenantId) }, { $unset: { organizationId: '' } }).catch(() => { });
        }
        await meta.collection('Branch').deleteMany({ organizationId: id });
        await meta.collection('OrgUser').deleteMany({ organizationId: id });
        await meta.collection('Organization').deleteOne({ _id: new ObjectId(id) });
        res.json({ ok: true, message: 'Organization deleted. Linked schools were preserved.' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Remove a branch from an organization (unlink only — school DB preserved).
router.delete('/organizations/:id/branches/:branchId', async (req, res) => {
    try {
        const meta = getMetaDb();
        const branch: any = await meta.collection('Branch').findOne({ _id: new ObjectId(req.params.branchId), organizationId: req.params.id });
        if (!branch) return res.status(404).json({ message: 'Branch not found.' });
        await meta.collection('Tenant').updateOne({ _id: new ObjectId(branch.tenantId) }, { $unset: { organizationId: '' } }).catch(() => { });
        await meta.collection('Branch').deleteOne({ _id: branch._id });
        res.json({ ok: true, message: 'Branch removed (school preserved).' });
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

        // Make the school's FIRST registered account also an organization owner —
        // reusing the SAME email + password hash so they log into /org with their
        // existing school credentials (no new password to remember).
        const created = await createOrgOwnerFromSchool(meta, organizationId, t, req.body?.password);
        res.json({ ok: true, organizationId, branch: { id: String(branch._id), name: branch.name }, orgLoginEmail: created.email, reusedSchoolLogin: created.reused });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Create an ORG_OWNER for a school, reusing the school's first registered admin
// login (same email + passwordHash) so the existing account works on /org too.
async function createOrgOwnerFromSchool(meta: any, organizationId: string, tenant: any, fallbackPassword?: string) {
    // The school's primary admin User in the meta DB (first by creation).
    const tenantId = tenant._id;
    let admin = await meta.collection('User').findOne(
        { $or: [{ tenantId }, { tenantId: String(tenantId) }] },
        { sort: { createdAt: 1 } },
    );
    if (!admin && tenant.contactEmail) admin = await meta.collection('User').findOne({ email: String(tenant.contactEmail).toLowerCase() });

    const email = String(admin?.email || tenant.contactEmail || '').toLowerCase();
    if (!email) return { email: '', reused: false };

    const existing = await meta.collection('OrgUser').findOne({ email });
    if (existing) {
        // Ensure it's linked to this org as owner.
        await meta.collection('OrgUser').updateOne({ _id: existing._id }, { $set: { organizationId, role: 'ORG_OWNER' } });
        return { email, reused: true };
    }

    // Reuse the school's password hash when available → same credentials.
    const passwordHash = admin?.passwordHash || await bcrypt.hash(String(fallbackPassword || 'changeme123'), 10);
    await meta.collection('OrgUser').insertOne({
        organizationId, email, name: admin?.name || tenant.name, role: 'ORG_OWNER',
        allowedBranchIds: [], passwordHash, linkedUserId: admin ? String(admin._id) : null,
        createdAt: new Date(),
    });
    return { email, reused: !!admin?.passwordHash };
}

export default router;
