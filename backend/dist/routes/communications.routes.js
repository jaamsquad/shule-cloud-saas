"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const communications_service_1 = require("../services/communications.service");
const router = (0, express_1.Router)();
const summarize = (results) => ({
    sent: results.filter(r => r.status === 'sent').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
});
// ── Email ───────────────────────────────────────────────────────────────────
router.post('/communications/email/send', async (req, res) => {
    try {
        const db = (0, communications_service_1.dbFromReq)(req);
        const { to, audience, subject, message, html } = req.body || {};
        if (!subject || !(message || html))
            return res.status(400).json({ message: 'Subject and message are required' });
        let recipients = Array.isArray(to) ? to : [];
        if (audience)
            recipients = [...recipients, ...await (0, communications_service_1.resolveEmails)(db, audience)];
        recipients = Array.from(new Set(recipients.filter(Boolean)));
        if (recipients.length === 0)
            return res.status(400).json({ message: 'No recipients with email addresses were found' });
        const results = await (0, communications_service_1.sendEmail)(db, { to: recipients, subject, message, html });
        res.json(summarize(results));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
router.post('/communications/email/test', async (req, res) => {
    try {
        const db = (0, communications_service_1.dbFromReq)(req);
        const { to } = req.body || {};
        if (!to)
            return res.status(400).json({ message: 'A test recipient email is required' });
        const results = await (0, communications_service_1.sendEmail)(db, {
            to: [to], subject: 'Test email from your school portal',
            message: 'This is a test email confirming your email gateway is configured correctly.',
        });
        res.json(summarize(results));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
router.get('/communications/email/logs', async (req, res) => {
    try {
        const db = (0, communications_service_1.dbFromReq)(req);
        const logs = await db.collection('email_logs').find({}).sort({ createdAt: -1 }).limit(50).toArray();
        res.json(logs);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── WhatsApp ──────────────────────────────────────────────────────────────────
router.post('/communications/whatsapp/send', async (req, res) => {
    try {
        const db = (0, communications_service_1.dbFromReq)(req);
        const { to, audience, message } = req.body || {};
        if (!message)
            return res.status(400).json({ message: 'Message is required' });
        let recipients = Array.isArray(to) ? to : [];
        if (audience)
            recipients = [...recipients, ...await (0, communications_service_1.resolvePhones)(db, audience)];
        recipients = Array.from(new Set(recipients.filter(Boolean)));
        if (recipients.length === 0)
            return res.status(400).json({ message: 'No recipients with phone numbers were found' });
        const results = await (0, communications_service_1.sendWhatsApp)(db, { to: recipients, message });
        res.json(summarize(results));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
router.post('/communications/whatsapp/test', async (req, res) => {
    try {
        const db = (0, communications_service_1.dbFromReq)(req);
        const { to } = req.body || {};
        if (!to)
            return res.status(400).json({ message: 'A test recipient phone number is required' });
        const results = await (0, communications_service_1.sendWhatsApp)(db, { to: [to], message: 'Test WhatsApp message — your gateway is configured correctly.' });
        res.json(summarize(results));
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
router.get('/communications/whatsapp/logs', async (req, res) => {
    try {
        const db = (0, communications_service_1.dbFromReq)(req);
        const logs = await db.collection('whatsapp_logs').find({}).sort({ createdAt: -1 }).limit(50).toArray();
        res.json(logs);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Recipient counts + gateway status (for the compose UI) ────────────────────
router.get('/communications/status', async (req, res) => {
    try {
        const db = (0, communications_service_1.dbFromReq)(req);
        const s = await (0, communications_service_1.getCommSettings)(db);
        const audiences = ['all', 'students', 'parents', 'staff'];
        const emailCounts = {};
        const phoneCounts = {};
        for (const a of audiences) {
            emailCounts[a] = (await (0, communications_service_1.resolveEmails)(db, a)).length;
            phoneCounts[a] = (await (0, communications_service_1.resolvePhones)(db, a)).length;
        }
        res.json({
            email: { enabled: !!s.emailEnabled, configured: !!(s.smtpHost && s.smtpUser && s.smtpPass), counts: emailCounts },
            whatsapp: { enabled: !!s.whatsappEnabled, configured: !!(s.whatsappApiKey && s.whatsappPhoneNumberId), counts: phoneCounts },
        });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
exports.default = router;
