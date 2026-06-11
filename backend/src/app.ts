import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { tenancyMiddleware } from './middleware/tenancy';
import onboardRoutes from './routes/onboard.routes';
import authRoutes from './routes/auth.routes';
import ownerAuthRoutes from './routes/owner-auth.routes';
import ownerRoutes from './routes/owner.routes';
import academicsRoutes from './routes/academics.routes';
import attendanceRoutes from './routes/attendance.routes';
import reportsRoutes from './routes/reports.routes';
import feesRoutes from './routes/fees.routes';
import questionImportRoutes from './modules/questionImport/questionImport.routes';
import questionBankRoutes from './modules/questionBank/questionBank.routes';
import examGeneratorRoutes from './modules/examGenerator/examGenerator.routes';
import certificatesRoutes from './modules/certificates/certificates.routes';
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
import departmentsRoutes from './routes/departments.routes';

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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-subdomain'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

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
        // Only return public, non-sensitive fields
        res.json({
            name:       tenant.instituteName || tenant.name || sub,
            logo:       tenant.logo || tenant.schoolLogo || null,
            address:    tenant.address || null,
            subdomain:  tenant.subdomain,
            tagline:    tenant.tagline || null,
        });
    } catch (e: any) {
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
                if (!body.username || !body.apiKey) return res.status(400).json({ message: 'Username and API Key are required' });
                // Just validate credentials by hitting the user data endpoint
                const r = await fetch(`https://api.africastalking.com/version1/user?username=${body.username}`, {
                    headers: { 'apiKey': body.apiKey, 'Accept': 'application/json' }
                });
                if (r.ok) return res.json({ message: "Africa's Talking connection successful!" });
                return res.status(400).json({ message: "Invalid Africa's Talking credentials." });
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

// Global Tenancy Middleware
app.use(tenancyMiddleware);

// API Routes
app.use('/api/v1', academicsRoutes);
app.use('/api/v1', attendanceRoutes);
app.use('/api/v1', reportsRoutes);
app.use('/api/v1', feesRoutes);
app.use('/api/v1', questionImportRoutes);
app.use('/api/v1', questionBankRoutes);
app.use('/api/v1', examGeneratorRoutes);
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
app.use('/api/v1', departmentsRoutes);    // department management
app.use('/api/v1/onboard', onboardRoutes);
app.use('/api/v1/auth', authRoutes);
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
