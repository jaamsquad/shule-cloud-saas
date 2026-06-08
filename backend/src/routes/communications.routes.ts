import { Router } from 'express';
import {
    sendEmail, sendWhatsApp, resolveEmails, resolvePhones, getCommSettings, dbFromReq,
} from '../services/communications.service';

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

        const results = await sendWhatsApp(db, { to: recipients, message });
        res.json(summarize(results));
    } catch (e: any) {
        res.status(400).json({ message: e.message });
    }
});

router.post('/communications/whatsapp/test', async (req, res) => {
    try {
        const db = dbFromReq(req);
        const { to } = req.body || {};
        if (!to) return res.status(400).json({ message: 'A test recipient phone number is required' });
        const results = await sendWhatsApp(db, { to: [to], message: 'Test WhatsApp message — your gateway is configured correctly.' });
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
        res.json({
            email: { enabled: !!s.emailEnabled, configured: !!(s.smtpHost && s.smtpUser && s.smtpPass), counts: emailCounts },
            whatsapp: { enabled: !!s.whatsappEnabled, configured: !!(s.whatsappApiKey && s.whatsappPhoneNumberId), counts: phoneCounts },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
