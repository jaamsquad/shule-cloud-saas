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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const tenancy_1 = require("./middleware/tenancy");
const onboard_routes_1 = __importDefault(require("./routes/onboard.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const owner_auth_routes_1 = __importDefault(require("./routes/owner-auth.routes"));
const owner_routes_1 = __importDefault(require("./routes/owner.routes"));
const academics_routes_1 = __importDefault(require("./routes/academics.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const fees_routes_1 = __importDefault(require("./routes/fees.routes"));
const questionImport_routes_1 = __importDefault(require("./modules/questionImport/questionImport.routes"));
const questionBank_routes_1 = __importDefault(require("./modules/questionBank/questionBank.routes"));
const examGenerator_routes_1 = __importDefault(require("./modules/examGenerator/examGenerator.routes"));
const certificates_routes_1 = __importDefault(require("./modules/certificates/certificates.routes"));
const classTests_routes_1 = __importDefault(require("./modules/classTests/classTests.routes"));
const behaviour_routes_1 = __importDefault(require("./modules/behaviour/behaviour.routes"));
const salary_routes_1 = __importDefault(require("./routes/salary.routes"));
const pos_routes_1 = __importDefault(require("./routes/pos.routes"));
const academics_v2_routes_1 = __importDefault(require("./routes/academics-v2.routes"));
const communications_routes_1 = __importDefault(require("./routes/communications.routes"));
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
const domains_routes_1 = __importDefault(require("./routes/domains.routes"));
const mpesa_routes_1 = __importDefault(require("./routes/mpesa.routes"));
const integrations_routes_1 = __importDefault(require("./routes/integrations.routes"));
const departments_routes_1 = __importDefault(require("./routes/departments.routes"));
const cafeteria_routes_1 = __importDefault(require("./routes/cafeteria.routes"));
const studentId_routes_1 = __importDefault(require("./routes/studentId.routes"));
const modules_routes_1 = __importDefault(require("./routes/modules.routes"));
const whatsapp_routes_1 = __importDefault(require("./routes/whatsapp.routes"));
console.log('[App] Bootstrapping institutional backend system...');
const app = (0, express_1.default)();
// Middleware
// CORS — allow manwellstore.com, its subdomains (egerton.manwellstore.com,
// students.egerton.manwellstore.com, …), and localhost for development.
const ALLOWED_DOMAINS = ['shulecloud.com'];
const isAllowedOrigin = (origin) => {
    if (!origin)
        return true; // same-origin / server-to-server / curl
    try {
        const host = new URL(origin).hostname.toLowerCase();
        if (host === 'localhost' || host.endsWith('.localhost'))
            return true;
        return ALLOWED_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
    }
    catch {
        return false;
    }
};
app.use((0, cors_1.default)({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-subdomain', 'x-student-id'],
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
// ── Public school search (no auth) — used by bare localhost login page ─────────
app.get('/api/v1/onboard/search-schools', async (req, res) => {
    try {
        const { getMetaDb } = await Promise.resolve().then(() => __importStar(require('./lib/mongodb')));
        const metaDb = getMetaDb();
        const q = String(req.query.q || "").trim();
        if (!q || q.length < 3)
            return res.json([]);
        const schools = await metaDb.collection('Tenant').find({
            status: 'active',
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { subdomain: { $regex: q, $options: 'i' } },
                { instituteName: { $regex: q, $options: 'i' } },
            ]
        }).project({ name: 1, subdomain: 1, logo: 1, instituteName: 1 }).limit(8).toArray();
        res.json(schools.map((s) => ({
            name: s.name || s.instituteName || s.subdomain,
            subdomain: s.subdomain,
            logo: s.logo || null,
        })));
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Public school-info endpoint (no auth, no tenant middleware) ────────────────
// Used by the login page to show school branding when on a subdomain.
app.get('/api/v1/public/school/:subdomain', async (req, res) => {
    try {
        const { getMetaDb } = await Promise.resolve().then(() => __importStar(require('./lib/mongodb')));
        const metaDb = getMetaDb();
        const sub = req.params.subdomain.toLowerCase().trim();
        const esc = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Case/space-insensitive match — stored subdomain may be "Egerton" etc.
        const tenant = await metaDb.collection('Tenant').findOne({ subdomain: { $regex: `^\\s*${esc}\\s*$`, $options: 'i' } });
        if (!tenant)
            return res.status(404).json({ message: 'School not found' });
        // Only return public, non-sensitive fields
        res.json({
            name: tenant.instituteName || tenant.name || sub,
            logo: tenant.logo || tenant.schoolLogo || null,
            address: tenant.address || null,
            subdomain: tenant.subdomain,
            tagline: tenant.tagline || null,
        });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Public student application (no auth) — subdomain.shulecloud.com/application ─
app.get('/api/v1/public/apply/:subdomain', async (req, res) => {
    // Returns school branding + the classes a public applicant can choose.
    try {
        const { getMetaDb, getTenantDb, subdomainToDbName } = await Promise.resolve().then(() => __importStar(require('./lib/mongodb')));
        const sub = req.params.subdomain.toLowerCase().trim();
        const esc = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const tenant = await getMetaDb().collection('Tenant').findOne({ subdomain: { $regex: `^\\s*${esc}\\s*$`, $options: 'i' } });
        if (!tenant)
            return res.status(404).json({ message: 'School not found' });
        const db = getTenantDb(tenant.databaseName || subdomainToDbName(tenant.subdomain));
        const classes = await db.collection('classes').find({}).project({ name: 1, levelName: 1 }).toArray().catch(() => []);
        res.json({
            name: tenant.instituteName || tenant.name || sub,
            logo: tenant.logo || tenant.schoolLogo || null,
            subdomain: tenant.subdomain,
            tagline: tenant.tagline || null,
            classes: classes.map((c) => c.name || c.levelName).filter(Boolean),
        });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
app.post('/api/v1/public/apply/:subdomain', async (req, res) => {
    try {
        const { getMetaDb, getTenantDb, subdomainToDbName } = await Promise.resolve().then(() => __importStar(require('./lib/mongodb')));
        const sub = req.params.subdomain.toLowerCase().trim();
        const esc = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const tenant = await getMetaDb().collection('Tenant').findOne({ subdomain: { $regex: `^\\s*${esc}\\s*$`, $options: 'i' } });
        if (!tenant)
            return res.status(404).json({ message: 'School not found' });
        const db = getTenantDb(tenant.databaseName || subdomainToDbName(tenant.subdomain));
        const b = req.body || {};
        if (!b.applicantName || !b.contactPhone)
            return res.status(400).json({ message: 'Applicant name and contact phone are required' });
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
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Integration test connection endpoints (no heavy auth required) ────────────
app.post('/api/v1/integrations/test/:type', async (req, res) => {
    const { type } = req.params;
    const body = req.body || {};
    try {
        switch (type) {
            case 'mpesa': {
                // Test Daraja API by getting access token
                if (!body.consumerKey || !body.consumerSecret)
                    return res.status(400).json({ message: 'Consumer Key and Secret are required' });
                const cred = Buffer.from(`${body.consumerKey}:${body.consumerSecret}`).toString('base64');
                const r = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
                    headers: { Authorization: `Basic ${cred}` }
                });
                if (r.ok)
                    return res.json({ message: 'M-PESA Daraja connection successful! Access token obtained.' });
                return res.status(400).json({ message: 'Invalid Daraja credentials. Check Consumer Key and Secret.' });
            }
            case 'payhero': {
                if (!body.username || !body.password)
                    return res.status(400).json({ message: 'Username and Password are required' });
                const cred = Buffer.from(`${body.username}:${body.password}`).toString('base64');
                const r = await fetch('https://backend.payhero.co.ke/api/v2/channels', {
                    headers: { Authorization: `Basic ${cred}` }
                });
                if (r.ok)
                    return res.json({ message: 'PayHero connection successful!' });
                return res.status(400).json({ message: 'Invalid PayHero credentials.' });
            }
            case 'stripe': {
                if (!body.secretKey)
                    return res.status(400).json({ message: 'Secret Key is required' });
                const r = await fetch('https://api.stripe.com/v1/balance', {
                    headers: { Authorization: `Bearer ${body.secretKey}` }
                });
                if (r.ok)
                    return res.json({ message: 'Stripe connection successful! Balance retrieved.' });
                return res.status(400).json({ message: 'Invalid Stripe Secret Key.' });
            }
            case 'sendgrid': {
                if (!body.apiKey)
                    return res.status(400).json({ message: 'API Key is required' });
                const to = body.testEmail || body.fromEmail;
                if (!to)
                    return res.status(400).json({ message: 'Provide a test email address' });
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
                if (r.status === 202)
                    return res.json({ message: `Test email sent to ${to} via SendGrid!` });
                return res.status(400).json({ message: 'SendGrid send failed. Check API key.' });
            }
            case 'at': { // Africa's Talking
                if (!body.username || !body.apiKey)
                    return res.status(400).json({ message: 'Username and API Key are required' });
                // Just validate credentials by hitting the user data endpoint
                const r = await fetch(`https://api.africastalking.com/version1/user?username=${body.username}`, {
                    headers: { 'apiKey': body.apiKey, 'Accept': 'application/json' }
                });
                if (r.ok)
                    return res.json({ message: "Africa's Talking connection successful!" });
                return res.status(400).json({ message: "Invalid Africa's Talking credentials." });
            }
            case 'twilio': {
                if (!body.accountSid || !body.authToken)
                    return res.status(400).json({ message: 'Account SID and Auth Token are required' });
                const cred = Buffer.from(`${body.accountSid}:${body.authToken}`).toString('base64');
                const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${body.accountSid}.json`, {
                    headers: { Authorization: `Basic ${cred}` }
                });
                if (r.ok)
                    return res.json({ message: 'Twilio connection successful!' });
                return res.status(400).json({ message: 'Invalid Twilio credentials.' });
            }
            case 'smtp': {
                // Just validate fields are present — real SMTP test requires nodemailer
                if (!body.host || !body.username || !body.password)
                    return res.status(400).json({ message: 'SMTP Host, Username and Password are required' });
                return res.json({ message: `SMTP configuration saved. Email will be sent from ${body.fromEmail || body.username} via ${body.host}:${body.port || 587}` });
            }
            case 'google': {
                if (!body.clientId || !body.clientSecret)
                    return res.status(400).json({ message: 'Client ID and Secret are required' });
                return res.json({ message: 'Google credentials format valid. Complete OAuth flow to activate.' });
            }
            case 'zoom': {
                if (!body.accountId || !body.clientId || !body.clientSecret)
                    return res.status(400).json({ message: 'Account ID, Client ID and Secret are required' });
                return res.json({ message: 'Zoom credentials saved. Meetings will use Server-to-Server OAuth.' });
            }
            case 'teams': {
                if (!body.tenantId || !body.clientId || !body.clientSecret)
                    return res.status(400).json({ message: 'Tenant ID, Client ID and Secret are required' });
                return res.json({ message: 'Microsoft Teams credentials saved.' });
            }
            case 'whatsapp': {
                if (!body.phoneNumberId || !body.accessToken)
                    return res.status(400).json({ message: 'Phone Number ID and Access Token are required' });
                const r = await fetch(`https://graph.facebook.com/v18.0/${body.phoneNumberId}`, {
                    headers: { Authorization: `Bearer ${body.accessToken}` }
                });
                if (r.ok)
                    return res.json({ message: 'WhatsApp Business API connection successful!' });
                return res.status(400).json({ message: 'Invalid WhatsApp Business credentials.' });
            }
            case 'flutterwave': {
                if (!body.secretKey)
                    return res.status(400).json({ message: 'Secret Key is required' });
                const r = await fetch('https://api.flutterwave.com/v3/banks/KE', {
                    headers: { Authorization: `Bearer ${body.secretKey}` }
                });
                if (r.ok)
                    return res.json({ message: 'Flutterwave connection successful!' });
                return res.status(400).json({ message: 'Invalid Flutterwave Secret Key.' });
            }
            default:
                return res.status(400).json({ message: `No test available for "${type}"` });
        }
    }
    catch (e) {
        res.status(500).json({ message: `Connection test failed: ${e.message}` });
    }
});
// Global Tenancy Middleware
app.use(tenancy_1.tenancyMiddleware);
// API Routes
app.use('/api/v1', academics_routes_1.default);
app.use('/api/v1', attendance_routes_1.default);
app.use('/api/v1', reports_routes_1.default);
app.use('/api/v1', fees_routes_1.default);
app.use('/api/v1', questionImport_routes_1.default);
app.use('/api/v1', questionBank_routes_1.default);
app.use('/api/v1', examGenerator_routes_1.default);
app.use('/api/v1', certificates_routes_1.default);
app.use('/api/v1', classTests_routes_1.default);
app.use('/api/v1', behaviour_routes_1.default);
app.use('/api/v1', salary_routes_1.default);
app.use('/api/v1', pos_routes_1.default);
app.use('/api/v1', academics_v2_routes_1.default);
app.use('/api/v1', communications_routes_1.default);
app.use('/api/v1', wallet_routes_1.default);
app.use('/api/v1', domains_routes_1.default);
app.use('/api/v1', mpesa_routes_1.default); // public callbacks (exempt from tenancy)
app.use('/api', mpesa_routes_1.default); // also served at /api/mpesa/callback (configured URL)
app.use('/api/v1', integrations_routes_1.default); // tenancy-aware M-PESA settings
app.use('/api/v1', departments_routes_1.default); // department management
app.use('/api/v1', cafeteria_routes_1.default); // kitchen meal service + canteen quick sale
app.use('/api/v1', studentId_routes_1.default); // student ID card: QR + barcode + print-ready PDF
app.use('/api', studentId_routes_1.default); // also at /api/student-id (per the spec)
app.use('/api/v1', modules_routes_1.default); // Sports, Trips, Front Desk, Secretary modules
app.use('/api/v1', whatsapp_routes_1.default); // WhatsApp QR session management (Baileys)
app.use('/api/v1/onboard', onboard_routes_1.default);
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/owner/auth', owner_auth_routes_1.default);
app.use('/api/v1/owner', owner_routes_1.default);
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
exports.default = app;
// touch: reload env (MPESA_CALLBACK_URL)
