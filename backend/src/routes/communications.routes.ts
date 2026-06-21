import { Router } from 'express';
import {
    sendEmail, sendWhatsApp, resolveEmails, resolvePhones, getCommSettings, dbFromReq, schoolIdFromReq,
} from '../services/communications.service';
import { buildResultMessages, listResultSources } from '../services/smsGateway.service';
import { whatsAppManager } from '../services/whatsapp/SessionManager';

const router = Router();

const summarize = (results: any[]) => ({
    sent: results.filter(r => r.status === 'sent').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
});

// ── Email ───────────────────────────────────────────────────────────────────
router.post('/communications/email/send', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const { to, audience, subject, message, html } = req.body || {};
        if (!subject || !(message || html)) return res.status(400).json({ message: 'Subject and message are required' });

        let recipients: string[] = Array.isArray(to) ? to : [];
        if (audience) recipients = [...recipients, ...await resolveEmails(db, audience)];
        recipients = Array.from(new Set(recipients.filter(Boolean)));
        if (recipients.length === 0) return res.status(400).json({ message: 'No recipients with email addresses were found' });

        const results = await sendEmail(db, { to: recipients, subject, message, html });
        res.json(summarize(results));
    } catch (e: any) {
        res.status(400).json({ message: e.message });
    }
});

router.post('/communications/email/test', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const { to } = req.body || {};
        if (!to) return res.status(400).json({ message: 'A test recipient email is required' });
        const results = await sendEmail(db, {
            to: [to], subject: 'Test email from your school portal',
            message: 'This is a test email confirming your email gateway is configured correctly.',
        });
        res.json(summarize(results));
    } catch (e: any) {
        res.status(400).json({ message: e.message });
    }
});

router.get('/communications/email/logs', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const logs = await db.collection('email_logs').find({}).sort({ createdAt: -1 }).limit(50).toArray();
        res.json(logs);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── WhatsApp ──────────────────────────────────────────────────────────────────
router.post('/communications/whatsapp/send', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const { to, audience, message } = req.body || {};
        if (!message) return res.status(400).json({ message: 'Message is required' });

        let recipients: string[] = Array.isArray(to) ? to : [];
        if (audience) recipients = [...recipients, ...await resolvePhones(db, audience)];
        recipients = Array.from(new Set(recipients.filter(Boolean)));
        if (recipients.length === 0) return res.status(400).json({ message: 'No recipients with phone numbers were found' });

        const results = await sendWhatsApp(db, { to: recipients, message, schoolId: schoolIdFromReq(req) });
        res.json(summarize(results));
    } catch (e: any) {
        res.status(400).json({ message: e.message });
    }
});

// List exams / class tests / CBC activities for WhatsApp result sending.
router.get('/communications/whatsapp/result-sources', async (req, res) => {
    try { res.json(await listResultSources(dbFromReq(req))); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Send per-student results to parents over WhatsApp (existing QR session or API).
router.post('/communications/whatsapp/send-results', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const { type, id } = req.body || {};
        if (!type || !id) return res.status(400).json({ message: 'Choose a result source' });
        const messages = await buildResultMessages(db, type, id);
        if (messages.length === 0) return res.status(409).json({ message: 'No results found, or students have no parent phone numbers.' });

        // Group identical-by-recipient sends; WhatsApp is per-number with its own body.
        const results: any[] = [];
        for (const m of messages) {
            const r = await sendWhatsApp(db, { to: [m.phone], message: m.text, schoolId: schoolIdFromReq(req) });
            results.push(...r);
        }
        res.json({ recipients: messages.length, ...summarize(results) });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.post('/communications/whatsapp/test', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const { to } = req.body || {};
        if (!to) return res.status(400).json({ message: 'A test recipient phone number is required' });
        const results = await sendWhatsApp(db, { to: [to], message: 'Test WhatsApp message — your gateway is configured correctly.', schoolId: schoolIdFromReq(req) });
        res.json(summarize(results));
    } catch (e: any) {
        res.status(400).json({ message: e.message });
    }
});

router.get('/communications/whatsapp/logs', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const logs = await db.collection('whatsapp_logs').find({}).sort({ createdAt: -1 }).limit(50).toArray();
        res.json(logs);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Recipient counts + gateway status (for the compose UI) ────────────────────
router.get('/communications/status', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const s = await getCommSettings(db);
        const audiences: ('all' | 'students' | 'parents' | 'staff')[] = ['all', 'students', 'parents', 'staff'];
        const emailCounts: Record<string, number> = {};
        const phoneCounts: Record<string, number> = {};
        for (const a of audiences) {
            emailCounts[a] = (await resolveEmails(db, a)).length;
            phoneCounts[a] = (await resolvePhones(db, a)).length;
        }
        // WhatsApp is "ready" when the QR session is connected (preferred) OR the
        // Meta Cloud API is configured. The QR session needs no separate enable flag.
        const schoolId = schoolIdFromReq(req);
        const qrConnected = schoolId ? (await whatsAppManager.getStatus(schoolId)).status === 'connected' : false;
        const apiConfigured = !!(s.whatsappApiKey && s.whatsappPhoneNumberId);
        const waConfigured = qrConnected || apiConfigured;
        const waEnabled = qrConnected || (apiConfigured && !!s.whatsappEnabled);

        res.json({
            email: { enabled: !!s.emailEnabled, configured: !!(s.smtpHost && s.smtpUser && s.smtpPass), counts: emailCounts },
            whatsapp: { enabled: waEnabled, configured: waConfigured, provider: qrConnected ? 'qr' : (apiConfigured ? 'api' : null), counts: phoneCounts },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
