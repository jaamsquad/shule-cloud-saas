import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getTenants, getPlans, createPlan, updatePlan, deletePlan, getRevenueReport, getBillingPayments, getOwnerStats, getOwnerRevenue, getSchoolsSummary, getOwnerRoles, listOwnerUsers, createOwnerUser, updateOwnerUser, deleteOwnerUser, getSchoolDetail, assignSchoolPlan, setSchoolPricing, setSchoolEmailMode, setSchoolStatus, updateSchool, resetSchoolPassword, resetOrgPassword, setSchoolModules, impersonateSchool, messageSchool, getOwnerAuditLogs, listContactMessages, updateContactMessage, getPublicSettings, setPublicSettings, getPlatformMpesa, setPlatformMpesa, getPlatformSmsPricing, setPlatformSmsPricing, getPlatformMeeting, setPlatformMeeting, testPlatformMeeting, getPlatformKra, setPlatformKra, testPlatformKra, listReminders, createReminder, updateReminder, deleteReminder, getCompanyEmail, setCompanyEmail, sendBroadcast, sendTenantNotification, listPlatformNotifications, getOwnerProfile, updateOwnerProfile, listOwnerContacts, sendOwnerToOwner } from '../controllers/owner.controller';

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

// Platform Talksasa balance + save the platform token.
router.get('/communications/balance', async (_req, res) => {
    try {
        const meta = getMetaDb();
        const platform = await meta.collection('platform_settings').findOne({}).catch(() => null) as any;
        const apiToken = platform?.talksasa?.apiToken || process.env.TALKSASA_TOKEN;
        if (!apiToken) return res.json({ configured: false });
        const { talksasaBalance } = await import('../services/talksasa.service');
        const b = await talksasaBalance({ apiToken });
        res.json({ configured: true, balance: b.balance, raw: b.raw, senderId: platform?.talksasa?.senderId || 'SHULECLOUD', topupUrl: 'https://bulksms.talksasa.com' });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});
router.post('/communications/settings', async (req, res) => {
    try {
        const { apiToken, senderId } = req.body || {};
        await getMetaDb().collection('platform_settings').updateOne({}, { $set: { 'talksasa.apiToken': apiToken, 'talksasa.senderId': senderId, updatedAt: new Date() } }, { upsert: true });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Owner SMS / WhatsApp to any number(s) via Talksasa (platform token).
router.post('/communications/send', async (req, res) => {
    try {
        const { channel, message, numbers } = req.body || {};
        if (!message) return res.status(400).json({ message: 'Message is required.' });
        const recips = (Array.isArray(numbers) ? numbers : String(numbers || '').split(',')).map((s: string) => s.trim()).filter(Boolean);
        if (!recips.length) return res.status(400).json({ message: 'At least one recipient is required.' });
        const meta = getMetaDb();
        const platform = await meta.collection('platform_settings').findOne({}).catch(() => null) as any;
        const apiToken = platform?.talksasa?.apiToken || process.env.TALKSASA_TOKEN;
        const senderId = platform?.talksasa?.senderId || 'SHULECLOUD';
        if (!apiToken) return res.status(400).json({ message: 'No Talksasa token configured (platform settings / TALKSASA_TOKEN).' });
        const { talksasaSend } = await import('../services/talksasa.service');
        const r = await talksasaSend({ apiToken, senderId }, recips, message, { type: channel === 'whatsapp' ? 'whatsapp' : 'plain' });
        res.json({ ok: r.ok, sent: r.sent, failed: r.failed, error: r.error });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/stats', getOwnerStats);                 // GET /api/v1/owner/stats
router.get('/revenue', getOwnerRevenue);             // GET /api/v1/owner/revenue?period=monthly
router.get('/schools/summary', getSchoolsSummary);   // GET /api/v1/owner/schools/summary

// ─── Single-school management ────────────────────────────────────────────────
router.get('/schools/:id', getSchoolDetail);
router.post('/schools/:id/plan', assignSchoolPlan);
router.put('/schools/:id/pricing', setSchoolPricing);
router.post('/schools/:id/email-mode', setSchoolEmailMode);
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
router.get('/sms-pricing', getPlatformSmsPricing);
router.post('/sms-pricing', setPlatformSmsPricing);
router.get('/meeting-settings', getPlatformMeeting);
router.post('/meeting-settings', setPlatformMeeting);
router.post('/meeting-settings/test', testPlatformMeeting);

// ─── Platform KRA PIN Checker — one KRA app shared by every school ───────────
router.get('/kra-settings', getPlatformKra);
router.post('/kra-settings', setPlatformKra);
router.post('/kra-settings/test', testPlatformKra);

// ─── Personal reminders ──────────────────────────────────────────────────────
router.get('/reminders', listReminders);
router.post('/reminders', createReminder);
router.patch('/reminders/:id', updateReminder);
router.delete('/reminders/:id', deleteReminder);

// ─── Apps switched off for one school (hidden for everyone there, admins included) ─
router.post('/schools/:id/apps', async (req, res) => {
    const c = ownerOf(req); if (!c) return res.status(401).json({ message: 'Unauthorized' });
    if (!['super_owner', 'owner'].includes(String(c.role || '').toLowerCase())) return res.status(403).json({ message: 'Your role does not allow this action.' });
    try {
        const { APP_MODULES, CORE_APPS, forgetDisabledApps } = await import('../lib/permissions');
        const list = Array.isArray(req.body?.disabledApps) ? req.body.disabledApps.map(String) : null;
        if (!list) return res.status(400).json({ message: 'disabledApps must be a list' });
        const unknown = list.filter((a: string) => !APP_MODULES[a]);
        if (unknown.length) return res.status(400).json({ message: `Unknown app: ${unknown.join(', ')}` });
        if (list.some((a: string) => CORE_APPS.includes(a))) return res.status(400).json({ message: 'School Overview and Administration cannot be turned off.' });
        const id = new ObjectId(req.params.id);
        const r = await getMetaDb().collection('Tenant').updateOne({ _id: id }, { $set: { disabledApps: Array.from(new Set(list)), updatedAt: new Date() } });
        if (!r.matchedCount) return res.status(404).json({ message: 'School not found' });
        forgetDisabledApps(req.params.id);
        try {
            const { ownerAudit } = await import('../controllers/owner.controller');
            await ownerAudit(req as any, 'SCHOOL_APPS_UPDATED', 'Tenant', { schoolId: req.params.id, disabledApps: list });
        } catch { /* audit is best-effort */ }
        res.json({ message: 'Saved', disabledApps: list });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── School sign-in security: 2FA policy + Google sign-in (owner / super_owner) ─
const ownerOf = (req: any) => { try { return jwt.verify(String(req.headers.authorization || '').split(' ')[1], process.env.OWNER_JWT_SECRET || 'owner_secret') as any; } catch { return null; } };
router.get('/school-auth', async (req, res) => {
    const c = ownerOf(req); if (!c) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const { getSchoolAuthPolicy } = await import('../lib/schoolLogin');
        const p = await getSchoolAuthPolicy();
        const [linkedUsers, enabledUsers] = await Promise.all([
            getMetaDb().collection('User').countDocuments({ googleSub: { $exists: true } }),
            getMetaDb().collection('User').countDocuments({ twoFactorEnabled: true }),
        ]);
        res.json({ ...p, stats: { linkedUsers, enabledUsers } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/school-auth', async (req, res) => {
    const c = ownerOf(req); if (!c) return res.status(401).json({ message: 'Unauthorized' });
    if (!['super_owner', 'owner'].includes(String(c.role || '').toLowerCase())) return res.status(403).json({ message: 'Only an owner can change sign-in security.' });
    try {
        const { saveSchoolAuthPolicy } = await import('../lib/schoolLogin');
        if (req.body?.twoFactorMode === 'required') {
            // codes fall back to the company mailbox — without it a school with no mail settings could not sign in
            const smtp: any = await getMetaDb().collection('platform_email_settings').findOne({ key: 'smtp' });
            if (!smtp?.host || !smtp?.user || !smtp?.pass) return res.status(400).json({ message: 'Set up Company email (SMTP) first — sign-in codes need a mailbox to come from.' });
        }
        await saveSchoolAuthPolicy(req.body || {});
        res.json({ message: 'Saved' });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// ─── AI assistant (Groq) — owner sets the key and model for every school ─────
router.get('/ai-settings', async (req, res) => {
    const c = ownerOf(req); if (!c) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const { getAiConfig, publicAiConfig } = await import('../lib/aiAssistant');
        const cfg = publicAiConfig(await getAiConfig());
        const day = new Date().toISOString().slice(0, 10);
        const usage = await getMetaDb().collection('ai_usage').aggregate([{ $match: { day } }, { $group: { _id: null, requests: { $sum: '$count' }, tokens: { $sum: '$tokens' }, schools: { $sum: 1 } } }]).toArray();
        const off = await getMetaDb().collection('Tenant').countDocuments({ aiEnabled: false });
        res.json({ ...cfg, today: usage[0] || { requests: 0, tokens: 0, schools: 0 }, schoolsOff: off });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/ai-settings', async (req, res) => {
    const c = ownerOf(req); if (!c) return res.status(401).json({ message: 'Unauthorized' });
    if (!['super_owner', 'owner'].includes(String(c.role || '').toLowerCase())) return res.status(403).json({ message: 'Only an owner can change the AI settings.' });
    try {
        const { saveAiConfig } = await import('../lib/aiAssistant');
        await saveAiConfig(req.body || {});
        const { ownerAudit } = await import('../controllers/owner.controller');
        await ownerAudit(req as any, 'AI_SETTINGS_UPDATED', 'Platform', { enabled: req.body?.enabled, model: req.body?.model, keyChanged: !!req.body?.apiKey || !!req.body?.clearKey, dailyLimit: req.body?.dailyLimit });
        res.json({ message: 'Saved' });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});
router.post('/ai-settings/test', async (req, res) => {
    const c = ownerOf(req); if (!c) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const { testAi } = await import('../lib/aiAssistant');
        const reply = await testAi(req.body || {});
        res.json({ ok: true, message: `Connected — the model replied "${reply.slice(0, 40)}".` });
    } catch (e: any) { res.status(400).json({ ok: false, message: e.message }); }
});

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
