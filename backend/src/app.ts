import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { tenancyMiddleware } from './middleware/tenancy';
import onboardRoutes from './routes/onboard.routes';
import authRoutes from './routes/auth.routes';
import ownerAuthRoutes from './routes/owner-auth.routes';
import ownerRoutes from './routes/owner.routes';
import { ownerBusinessRouter, publicDocsRouter } from './routes/business.routes';
import academicsRoutes from './routes/academics.routes';
import organizationRoutes from './routes/organization.routes';
import analyticsRoutes from './routes/analytics.routes';
import messagingRoutes from './routes/messaging.routes';
import attendanceRoutes from './routes/attendance.routes';
import reportsRoutes from './routes/reports.routes';
import feesRoutes from './routes/fees.routes';
import feesOverviewRoutes from './routes/feesOverview.routes';
import questionImportRoutes from './modules/questionImport/questionImport.routes';
import questionBankRoutes from './modules/questionBank/questionBank.routes';
import onlineExamRoutes from './modules/onlineExam/onlineExam.routes';
import examGeneratorRoutes from './modules/examGenerator/examGenerator.routes';
import certificatesRoutes from './modules/certificates/certificates.routes';
import { studentCertRouter, publicVerifyRouter } from './modules/certificates/studentCerts.routes';
import skillsRoutes from './modules/skills/skills.routes';
import classTestsRoutes from './modules/classTests/classTests.routes';
import behaviourRoutes from './modules/behaviour/behaviour.routes';
import salaryRoutes from './routes/salary.routes';
import posRoutes from './routes/pos.routes';
import academicsV2Routes from './routes/academics-v2.routes';
import communicationsRoutes from './routes/communications.routes';
import walletRoutes from './routes/wallet.routes';
import domainsRoutes from './routes/domains.routes';
import mpesaRoutes from './routes/mpesa.routes';
import integrationsRoutes from './routes/integrations.routes';
import kraRoutes from './routes/kra.routes';
import departmentsRoutes from './routes/departments.routes';
import markApprovalsRoutes from './routes/markApprovals.routes';
import assistantRoutes from './routes/assistant.routes';
import curriculumRoutes from './routes/curriculum.routes';
import gradingTemplatesRoutes from './routes/gradingTemplates.routes';
import cafeteriaRoutes from './routes/cafeteria.routes';
import studentIdRoutes from './routes/studentId.routes';
import modulesRoutes from './routes/modules.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import nemisRoutes from './modules/nemis/nemis.routes';
import computedReportRoutes from './modules/reports/computed.routes';
import tscRoutes from './modules/tsc/tsc.routes';
import expenseRoutes from './modules/expense/expense.routes';
import cbcRoutes from './modules/cbc/cbc.routes';
import procurementRoutes from './modules/procurement/procurement.routes';
import accountingRoutes from './modules/accounting/accounting.routes';
import requestsRoutes from './modules/requests/requests.routes';
import blogRoutes from './routes/blog.routes';
import smsRoutes from './routes/sms.routes';
import liveClassRoutes from './modules/liveclass/liveclass.routes';
import calendarRoutes from './routes/calendar.routes';
import driverRoutes from './routes/driver.routes';

console.log('[App] Bootstrapping institutional backend system...');
const app = express();

// Middleware
// CORS — allow manwellstore.com, its subdomains (egerton.manwellstore.com,
// students.egerton.manwellstore.com, …), and localhost for development.
const ALLOWED_DOMAINS = ['shulecloud.com'];
const isAllowedOrigin = (origin?: string): boolean => {
    if (!origin) return true; // same-origin / server-to-server / curl
    try {
        const host = new URL(origin).hostname.toLowerCase();
        if (host === 'localhost' || host.endsWith('.localhost')) return true;
        return ALLOWED_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
    } catch { return false; }
};
app.use(cors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-subdomain', 'x-student-id', 'x-device-token'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files (blog images, etc.) statically.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Public school search (no auth) — used by bare localhost login page ─────────
app.get('/api/v1/onboard/search-schools', async (req, res) => {
    try {
        const { getMetaDb } = await import('./lib/mongodb');
        const metaDb = getMetaDb();
        const q = String(req.query.q || "").trim();
        if (!q || q.length < 3) return res.json([]);
        const schools = await metaDb.collection('Tenant').find({
            status: 'active',
            $or: [
                { name:       { $regex: q, $options: 'i' } },
                { subdomain:  { $regex: q, $options: 'i' } },
                { instituteName: { $regex: q, $options: 'i' } },
            ]
        }).project({ name: 1, subdomain: 1, logo: 1, instituteName: 1 }).limit(8).toArray();
        res.json(schools.map((s: any) => ({
            name: s.name || s.instituteName || s.subdomain,
            subdomain: s.subdomain,
            logo: s.logo || null,
        })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Public school-info endpoint (no auth, no tenant middleware) ────────────────
// Used by the login page to show school branding when on a subdomain.
app.get('/api/v1/public/school/:subdomain', async (req, res) => {
    try {
        const { getMetaDb } = await import('./lib/mongodb');
        const metaDb = getMetaDb();
        const sub = req.params.subdomain.toLowerCase().trim();
        const esc = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Case/space-insensitive match — stored subdomain may be "Egerton" etc.
        const tenant = await metaDb.collection('Tenant').findOne({ subdomain: { $regex: `^\\s*${esc}\\s*$`, $options: 'i' } });
        if (!tenant) return res.status(404).json({ message: 'School not found' });

        // If this school belongs to an organization, show the ORGANISATION's
        // logo + name on the login page; otherwise the school's own branding.
        let name = tenant.instituteName || tenant.name || sub;
        let logo = tenant.logo || tenant.schoolLogo || null;
        let tagline = tenant.tagline || null;
        let organization: any = null;
        if (tenant.organizationId) {
            const org = await metaDb.collection('Organization').findOne({ _id: (await import('mongodb')).ObjectId.createFromHexString(String(tenant.organizationId)) }).catch(() => null);
            if (org) {
                organization = { id: String(org._id), name: org.name };
                if (org.name) name = org.name;
                if (org.branding?.logo) logo = org.branding.logo;
                if (org.branding?.motto) tagline = org.branding.motto;
            }
        }
        res.json({
            name, logo, tagline,
            address:    tenant.address || null,
            subdomain:  tenant.subdomain,
            organization,
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// ── Public student application (no auth) — subdomain.shulecloud.com/application ─
app.get('/api/v1/public/apply/:subdomain', async (req, res) => {
    // Returns school branding + the classes a public applicant can choose.
    try {
        const { getMetaDb, getTenantDb, subdomainToDbName } = await import('./lib/mongodb');
        const sub = req.params.subdomain.toLowerCase().trim();
        const esc = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const tenant = await getMetaDb().collection('Tenant').findOne({ subdomain: { $regex: `^\\s*${esc}\\s*$`, $options: 'i' } });
        if (!tenant) return res.status(404).json({ message: 'School not found' });
        const db = getTenantDb(tenant.databaseName || subdomainToDbName(tenant.subdomain));
        const classes = await db.collection('classes').find({}).project({ name: 1, levelName: 1 }).toArray().catch(() => []);
        res.json({
            name: tenant.instituteName || tenant.name || sub,
            logo: tenant.logo || tenant.schoolLogo || null,
            subdomain: tenant.subdomain,
            tagline: tenant.tagline || null,
            classes: classes.map((c: any) => c.name || c.levelName).filter(Boolean),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.post('/api/v1/public/apply/:subdomain', async (req, res) => {
    try {
        const { getMetaDb, getTenantDb, subdomainToDbName } = await import('./lib/mongodb');
        const sub = req.params.subdomain.toLowerCase().trim();
        const esc = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const tenant = await getMetaDb().collection('Tenant').findOne({ subdomain: { $regex: `^\\s*${esc}\\s*$`, $options: 'i' } });
        if (!tenant) return res.status(404).json({ message: 'School not found' });
        const db = getTenantDb(tenant.databaseName || subdomainToDbName(tenant.subdomain));
        const b = req.body || {};
        if (!b.applicantName || !b.contactPhone) return res.status(400).json({ message: 'Applicant name and contact phone are required' });
        const appNo = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const doc = {
            applicationNo: appNo,
            applicantName: b.applicantName, dob: b.dob || '', gender: b.gender || '',
            classApplied: b.classApplied || '', previousSchool: b.previousSchool || '',
            parentName: b.parentName || '', contactPhone: b.contactPhone, contactEmail: b.contactEmail || '',
            address: b.address || '', notes: b.notes || '',
            documentName: b.documentName || '', document: b.document || '', // base64 image/pdf
            status: 'Pending', source: 'public', createdAt: new Date(),
        };
        const r = await db.collection('admissions').insertOne(doc);
        res.status(201).json({ id: r.insertedId, applicationNo: appNo, message: 'Application submitted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Integration test connection endpoints (no heavy auth required) ────────────
app.post('/api/v1/integrations/test/:type', async (req, res) => {
    const { type } = req.params;
    const body = req.body || {};
    try {
        switch (type) {
            case 'talksasa': {
                if (!body.apiToken) return res.status(400).json({ message: 'API Token is required' });
                const { talksasaTest } = await import('./services/talksasa.service');
                await talksasaTest({ apiToken: body.apiToken });
                return res.json({ message: 'Talksasa connection successful! Token is valid.' });
            }
            case 'mpesa': {
                // Test Daraja API by getting access token
                if (!body.consumerKey || !body.consumerSecret) return res.status(400).json({ message: 'Consumer Key and Secret are required' });
                const cred = Buffer.from(`${body.consumerKey}:${body.consumerSecret}`).toString('base64');
                const r = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
                    headers: { Authorization: `Basic ${cred}` }
                });
                if (r.ok) return res.json({ message: 'M-PESA Daraja connection successful! Access token obtained.' });
                return res.status(400).json({ message: 'Invalid Daraja credentials. Check Consumer Key and Secret.' });
            }
            case 'payhero': {
                if (!body.username || !body.password) return res.status(400).json({ message: 'Username and Password are required' });
                const cred = Buffer.from(`${body.username}:${body.password}`).toString('base64');
                const r = await fetch('https://backend.payhero.co.ke/api/v2/channels', {
                    headers: { Authorization: `Basic ${cred}` }
                });
                if (r.ok) return res.json({ message: 'PayHero connection successful!' });
                return res.status(400).json({ message: 'Invalid PayHero credentials.' });
            }
            // KRA PIN Checker moved to the Owner Portal (platform-wide, shared by every school) —
            // see owner.controller.ts testPlatformKra / POST /owner/kra-settings/test.
            case 'stripe': {
                if (!body.secretKey) return res.status(400).json({ message: 'Secret Key is required' });
                const r = await fetch('https://api.stripe.com/v1/balance', {
                    headers: { Authorization: `Bearer ${body.secretKey}` }
                });
                if (r.ok) return res.json({ message: 'Stripe connection successful! Balance retrieved.' });
                return res.status(400).json({ message: 'Invalid Stripe Secret Key.' });
            }
            case 'sendgrid': {
                if (!body.apiKey) return res.status(400).json({ message: 'API Key is required' });
                const to = body.testEmail || body.fromEmail;
                if (!to) return res.status(400).json({ message: 'Provide a test email address' });
                const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${body.apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        personalizations: [{ to: [{ email: to }] }],
                        from: { email: body.fromEmail || 'noreply@shulecloud.com', name: body.fromName || 'ShuleCloud' },
                        subject: 'ShuleCloud — Integration Test',
                        content: [{ type: 'text/plain', value: 'This is a test email from ShuleCloud Integration. Your SendGrid is working!' }]
                    })
                });
                if (r.status === 202) return res.json({ message: `Test email sent to ${to} via SendGrid!` });
                return res.status(400).json({ message: 'SendGrid send failed. Check API key.' });
            }
            case 'at': { // Africa's Talking
                if (!body.apiKey || (!body.username && !/sandbox/i.test(body.environment || ''))) return res.status(400).json({ message: 'Username and API Key are required' });
                const { atBalance, atSendSms, isSandbox } = await import('./services/africasTalking.service');
                const cfg = { username: body.username, apiKey: body.apiKey, senderId: body.senderId, environment: body.environment };
                // 1) credentials + environment: read the account balance
                let balance = '';
                try { balance = (await atBalance(cfg)).balance; } catch (e: any) { return res.status(400).json({ message: e.message }); }
                const where = isSandbox(cfg) ? 'sandbox' : 'live';
                // 2) optional: send one real message and report exactly what Africa's Talking said about it
                if (body.testPhone) {
                    const { normalizePhone } = await import('./services/smsGateway.service');
                    const to = '+' + normalizePhone(body.testPhone);
                    const out = await atSendSms(cfg, [to], 'ShuleCloud test - Africa\'s Talking is connected and sending.');
                    const r0 = out.recipients[0];
                    if (out.requestError) return res.status(400).json({ message: out.requestError.message });
                    if (!r0?.ok) return res.status(400).json({ message: r0?.error || 'Africa\'s Talking did not accept the test message.' });
                    return res.json({ message: `Connected (${where}, balance ${balance}). Test SMS to ${to}: ${r0.status}${r0.cost ? `, cost ${r0.cost}` : ''}${r0.messageId ? `, id ${r0.messageId}` : ''}.${out.senderIdDropped ? ` Note: sender ID "${cfg.senderId}" is not registered on your account, so it was sent from the default sender.` : ''}${isSandbox(cfg) ? ' (Sandbox messages only show in the Africa\'s Talking simulator, not on a real phone.)' : ''}` });
                }
                return res.json({ message: `Africa's Talking connection successful (${where}). Balance: ${balance}.` });
            }
            case 'twilio': {
                if (!body.accountSid || !body.authToken) return res.status(400).json({ message: 'Account SID and Auth Token are required' });
                const cred = Buffer.from(`${body.accountSid}:${body.authToken}`).toString('base64');
                const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${body.accountSid}.json`, {
                    headers: { Authorization: `Basic ${cred}` }
                });
                if (r.ok) return res.json({ message: 'Twilio connection successful!' });
                return res.status(400).json({ message: 'Invalid Twilio credentials.' });
            }
            case 'smtp': {
                // Just validate fields are present — real SMTP test requires nodemailer
                if (!body.host || !body.username || !body.password) return res.status(400).json({ message: 'SMTP Host, Username and Password are required' });
                return res.json({ message: `SMTP configuration saved. Email will be sent from ${body.fromEmail || body.username} via ${body.host}:${body.port || 587}` });
            }
            case 'google': {
                if (!body.clientId || !body.clientSecret) return res.status(400).json({ message: 'Client ID and Secret are required' });
                return res.json({ message: 'Google credentials format valid. Complete OAuth flow to activate.' });
            }
            case 'zoom': {
                if (!body.accountId || !body.clientId || !body.clientSecret) return res.status(400).json({ message: 'Account ID, Client ID and Secret are required' });
                return res.json({ message: 'Zoom credentials saved. Meetings will use Server-to-Server OAuth.' });
            }
            case 'teams': {
                if (!body.tenantId || !body.clientId || !body.clientSecret) return res.status(400).json({ message: 'Tenant ID, Client ID and Secret are required' });
                return res.json({ message: 'Microsoft Teams credentials saved.' });
            }
            case 'whatsapp': {
                if (!body.phoneNumberId || !body.accessToken) return res.status(400).json({ message: 'Phone Number ID and Access Token are required' });
                const r = await fetch(`https://graph.facebook.com/v18.0/${body.phoneNumberId}`, {
                    headers: { Authorization: `Bearer ${body.accessToken}` }
                });
                if (r.ok) return res.json({ message: 'WhatsApp Business API connection successful!' });
                return res.status(400).json({ message: 'Invalid WhatsApp Business credentials.' });
            }
            case 'flutterwave': {
                if (!body.secretKey) return res.status(400).json({ message: 'Secret Key is required' });
                const r = await fetch('https://api.flutterwave.com/v3/banks/KE', {
                    headers: { Authorization: `Bearer ${body.secretKey}` }
                });
                if (r.ok) return res.json({ message: 'Flutterwave connection successful!' });
                return res.status(400).json({ message: 'Invalid Flutterwave Secret Key.' });
            }
            default:
                return res.status(400).json({ message: `No test available for "${type}"` });
        }
    } catch (e: any) {
        res.status(500).json({ message: `Connection test failed: ${e.message}` });
    }
});

// ─── Organization (multi-branch) routes — mounted BEFORE tenancy ──────────────
// Org-level auth/aggregation is not scoped to a single tenant DB; it groups
// branches in the meta DB and fans out itself. (Transfer routes that need a
// tenant DB resolve branch DBs explicitly via the organization service.)
app.use('/api/v1', organizationRoutes);

// Global Tenancy Middleware
app.use(tenancyMiddleware);

// API Routes
app.use('/api/v1', academicsRoutes);
app.use('/api/v1', analyticsRoutes);
app.use('/api/v1', messagingRoutes);
app.use('/api/v1', attendanceRoutes);
app.use('/api/v1', reportsRoutes);
app.use('/api/v1', feesOverviewRoutes);         // Fees dashboard (overview, overdue, records, M-PESA in process…)
app.use('/api/v1', feesRoutes);
app.use('/api/v1', questionImportRoutes);
app.use('/api/v1', questionBankRoutes);
app.use('/api/v1', onlineExamRoutes);
app.use('/api/v1', examGeneratorRoutes);
app.use('/api/v1', skillsRoutes);               // skill-based reports (skills per subject, rated per term)
app.use('/api/v1', studentCertRouter);           // certificates issued to students (+ QR verification links)
app.use('/api/v1/public/verify', publicVerifyRouter);   // public: scan a QR → is this certificate / report card genuine?
app.use('/api/v1', certificatesRoutes);
app.use('/api/v1', classTestsRoutes);
app.use('/api/v1', behaviourRoutes);
app.use('/api/v1', salaryRoutes);
app.use('/api/v1', posRoutes);
app.use('/api/v1', academicsV2Routes);
app.use('/api/v1', communicationsRoutes);
app.use('/api/v1', walletRoutes);
app.use('/api/v1', domainsRoutes);
app.use('/api/v1', mpesaRoutes);          // public callbacks (exempt from tenancy)
app.use('/api', mpesaRoutes);             // also served at /api/mpesa/callback (configured URL)
app.use('/api/v1', integrationsRoutes);   // tenancy-aware M-PESA settings
app.use('/api/v1', kraRoutes);              // KRA PIN Checker lookup (Add Employee)
app.use('/api/v1', departmentsRoutes);    // department management
app.use('/api/v1', markApprovalsRoutes);  // HOD marks approval & moderation
app.use('/api/v1', assistantRoutes);      // Smart Assistant (logic-based insights)
app.use('/api/v1', curriculumRoutes);     // Curriculum engine (class → behavior config)
app.use('/api/v1', gradingTemplatesRoutes); // Named grading-scale templates
app.use('/api/v1', cafeteriaRoutes);      // kitchen meal service + canteen quick sale
app.use('/api/v1', studentIdRoutes);      // student ID card: QR + barcode + print-ready PDF
app.use('/api', studentIdRoutes);         // also at /api/student-id (per the spec)
app.use('/api/v1', modulesRoutes);        // Sports, Trips, Front Desk, Secretary modules
app.use('/api/v1', whatsappRoutes);       // WhatsApp QR session management (Baileys)
app.use('/api/v1', nemisRoutes);          // NEMIS Assistant (validate / export / import / transfers)
app.use('/api/v1', computedReportRoutes); // Computed reports (exam analysis, finance statements, trends)
app.use('/api/v1', tscRoutes);            // Teacher Service Commission (TSC) management
app.use('/api/v1', expenseRoutes);        // Expense Management
app.use('/api/v1', cbcRoutes);            // CBC Assessment
app.use('/api/v1', procurementRoutes);    // Procurement (shares suppliers/PR/PO with Expense)
app.use('/api/v1', accountingRoutes);     // Accounting / General Ledger
app.use('/api/v1', requestsRoutes);       // Request Management & Approval Workflow
app.use('/api/v1', blogRoutes);           // Blog (super-owner admin + public)
app.use('/api/v1', smsRoutes);            // SMS gateway (school admin + Android app)
app.use('/api/v1', liveClassRoutes);      // Live Classes (Jitsi + BigBlueButton)
app.use('/api/v1', calendarRoutes);       // School calendar module
app.use('/api/v1', driverRoutes);         // ShuleCloud Driver app (transport/GPS)
app.use('/api/v1/onboard', onboardRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/owner/business', ownerBusinessRouter);   // quotations / invoices / contracts (owner portal)
app.use('/api/v1/public/docs', publicDocsRouter);         // their shareable, printable links (+ pay / accept / sign)
app.use('/api/v1/owner/auth', ownerAuthRoutes);
app.use('/api/v1/owner', ownerRoutes);

// Root path
app.get('/', (req, res) => {
    res.json({ message: 'ShuleCloud Express API v1.0.0' });
});

// 404 handler
app.use((req, res, next) => {
    console.log(`[App] Fallback 404 reached for: ${req.method} ${req.url}`);
    next();
});
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

export default app;

// touch: reload env (MPESA_CALLBACK_URL)
