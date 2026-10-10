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

// Searchable contacts (students, parents, staff/teachers) for sending to a
// single person. Each row carries a phone + email so the same list works for
// SMS, WhatsApp and Email composers. ?q= filters by name; ?type= narrows.
router.get(['/communications/contacts', '/secretary/communications/contacts'], async (req, res) => {
    try {
        const db = dbFromReq(req);
        const q = String((req.query as any).q || '').trim().toLowerCase();
        const type = String((req.query as any).type || 'all');
        const match = (name: string) => !q || name.toLowerCase().includes(q);
        const out: { id: string; name: string; role: string; phone?: string; email?: string; meta?: string }[] = [];

        if (type === 'all' || type === 'students') {
            const students = await db.collection('students').find({}).limit(2000).toArray().catch(() => []);
            students.forEach((s: any) => {
                const name = s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim();
                if (name && match(name)) out.push({
                    id: String(s._id), name, role: 'Student',
                    phone: s.phone, email: s.studentEmail || s.email,
                    meta: s.currentClass || s.studentClass || s.admNo || '',
                });
            });
        }
        if (type === 'all' || type === 'parents') {
            const students = await db.collection('students').find({}).limit(2000).toArray().catch(() => []);
            students.forEach((s: any) => {
                const pn = s.parentName || s.fatherName || s.motherName || s.guardianName;
                const phone = s.parentPhone || s.fatherPhone || s.motherPhone || s.guardianPhone;
                const email = s.parentEmail || s.guardianEmail;
                const childName = s.studentName || s.name;
                const display = pn || (childName ? `Parent of ${childName}` : 'Parent');
                if ((phone || email) && match(`${display} ${childName || ''}`)) out.push({
                    id: `parent:${s._id}`, name: display, role: 'Parent', phone, email,
                    meta: childName ? `Parent of ${childName}` : '',
                });
            });
        }
        if (type === 'all' || type === 'staff' || type === 'teachers') {
            const staff = await db.collection('staff').find({}).limit(2000).toArray().catch(() => []);
            staff.forEach((s: any) => {
                const name = s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim();
                const isTeacher = /teacher|tutor/i.test(s.role || s.designation || '') || (s.subjects && s.subjects.length);
                if (type === 'teachers' && !isTeacher) return;
                if (name && match(name)) out.push({
                    id: String(s._id), name, role: isTeacher ? 'Teacher' : 'Staff',
                    phone: s.phone, email: s.email,
                    meta: s.designation || s.role || '',
                });
            });
        }
        res.json(out.slice(0, 200));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
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
