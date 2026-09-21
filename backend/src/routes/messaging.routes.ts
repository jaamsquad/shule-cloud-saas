import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { formatExamName } from '../lib/examName';
import { resolveScope } from '../lib/dataScope';
import { loadTerms, pickCurrent, termOption, TermInfo } from '../modules/cbc/cbcTerm';
import { resultUrl, resultSnapshot, resultText } from '../lib/resultLink';

const router = Router();
const db = (req: any): Db => (req.tenantDb as Db) || getMetaDb();

// ─── Parent inbox messaging ────────────────────────────────────────────────────
// Admin/teacher composes messages of type Meeting | Results | General to a class
// or an individual student. When type=Results, the message auto-attaches that
// student's exam results so the parent sees them inline.

const TYPES = ['Meeting', 'Results', 'General'] as const;

// ── Terms ───────────────────────────────────────────────────────────────────────
// Result messages default to the CURRENT term's exams. Only admins may look at another term
// (or all terms); for everyone else the server keeps it on the current term whatever the browser asks.
const digits = (v: any) => String(v ?? '').replace(/\D/g, '');
function examInTerm(exam: any, sel: TermInfo): boolean {
    const tag = String(exam?.term ?? exam?.termName ?? '').trim();
    if (tag) {
        const sameTerm = digits(tag) ? digits(tag) === digits(sel.term) : tag.toLowerCase() === sel.term.toLowerCase();
        const yr = String(exam.academicYear ?? exam.year ?? '').trim();
        return sameTerm && (!yr || yr.includes(sel.year) || sel.year.includes(yr));
    }
    const when = new Date(exam?.startDate || exam?.date || exam?.createdAt || '');
    if (isNaN(when.getTime()) || !sel.start || !sel.end) return false;
    return when.getTime() >= sel.start.getTime() && when.getTime() <= sel.end.getTime() + 86_400_000 - 1;
}
async function termScope(req: Request) {
    const d = db(req);
    const [terms, scope] = await Promise.all([loadTerms(d), resolveScope(req, d)]);
    const current = pickCurrent(terms);
    const asked = String(req.query.term ?? req.body?.term ?? '').trim(), askedYear = String(req.query.year ?? req.body?.year ?? '').trim();
    let sel: TermInfo | null = current, all = false;
    if (scope.isAdmin && asked) {
        if (asked.toLowerCase() === 'all') all = true;
        else sel = terms.find(t => t.term.toLowerCase() === asked.toLowerCase() && (!askedYear || t.year === askedYear)) || current;
    }
    // with no terms set up there is nothing to filter by
    return { terms, current, sel, isAdmin: scope.isAdmin, inScope: (exam: any) => all || !sel || examInTerm(exam, sel) };
}

// Terms for the picker + the exams that may be attached to a Results message.
router.get('/messaging/exams', async (req: Request, res: Response) => {
    try {
        const ts = await termScope(req);
        const exams = (await db(req).collection('exams').find({}).sort({ createdAt: -1 }).limit(1000).toArray().catch(() => [])).filter(ts.inScope);
        res.json({ terms: ts.terms.map(termOption), current: ts.current ? termOption(ts.current) : null, canChoose: ts.isAdmin, exams });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Where a parent's email is kept: the linked Parents record first, then the student's own fields.
async function parentEmailOf(database: Db, st: any): Promise<string> {
    const linked: any[] = await database.collection('parents').find({ 'linkedStudents.studentId': String(st._id) }).toArray().catch(() => []);
    const parent = linked.find(p => (p.linkedStudents || []).some((l: any) => String(l.studentId) === String(st._id) && l.isPrimary)) || linked[0];
    return parent?.email || parent?.parentEmail || parent?.emailAddress || st.parentEmail || st.fatherEmail || st.motherEmail || st.guardianEmail || '';
}
const escHtml = (v: any) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// Build the per-student results snapshot for a Results message.
async function resultsAttachment(database: Db, studentId: string, examId: string) {
    const marks = await database.collection('exam_marks').find({ examId, studentId }).toArray().catch(() => []);
    if (!marks.length) return null;
    const exam = await database.collection('exams').findOne({ _id: new ObjectId(examId) }).catch(() => null);
    const student = await database.collection('students').findOne({ _id: new ObjectId(studentId) }).catch(() => null) as any;
    const subjects = marks.map((m: any) => {
        const max = Number(m.totalMarks) || 100; const mark = Number(m.marksObtained) || 0;
        return { name: m.subjectName || m.subject, marks: mark, outOf: max, pct: max ? Math.round((mark / max) * 100) : 0 };
    });
    const meanPct = subjects.length ? Math.round(subjects.reduce((a, s) => a + s.pct, 0) / subjects.length) : 0;
    return { studentName: student?.studentName || student?.name || '', examTitle: formatExamName(exam, `${student?.studentClass || ''} ${student?.stream || ''}`), subjects, meanPct };
}

// Compose & send (admin/teacher).
router.post('/messaging/compose', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const { type, subject, body, classId, className, streamId, streamName, studentId, examId } = req.body || {};
        const emailMode: 'none' | 'pdf' | 'text' = req.body?.email === 'pdf' ? 'pdf' : req.body?.email === 'text' ? 'text' : 'none';
        const includeLink = req.body?.includeLink !== false;   // Results messages carry an online link by default
        if (!TYPES.includes(type)) return res.status(400).json({ message: 'Invalid message type.' });
        if (!subject) return res.status(400).json({ message: 'Subject is required.' });
        let examDoc: any = null;
        if (type === 'Results') {
            if (!examId) return res.status(400).json({ message: 'Choose the exam to attach.' });
            examDoc = await database.collection('exams').findOne({ _id: new ObjectId(String(examId)) }).catch(() => null);
            if (!examDoc) return res.status(404).json({ message: 'Exam not found.' });
            const ts = await termScope(req);
            if (!ts.inScope(examDoc)) return res.status(403).json({ message: `Only exams from the current term (${ts.current?.label || 'current term'}) can be sent.` });
        }

        const sender = (req as any).user?.name || 'School';
        // Resolve recipients: one student, or all students of a class.
        let recipients: any[] = [];
        if (studentId) {
            const s = await database.collection('students').findOne({ _id: new ObjectId(String(studentId)) }).catch(() => null);
            if (s) recipients = [s];
        } else if (classId || className) {
            // Resolve by class, then narrow to a stream when one is chosen.
            const q: any = classId ? { classId: String(classId) } : { $or: [{ studentClass: className }, { currentClass: className }] };
            let list = await database.collection('students').find(q).toArray().catch(() => []);
            // If classId yielded nothing (legacy students stored class as text), retry by name.
            if (!list.length && className) {
                list = await database.collection('students').find({ $or: [{ studentClass: className }, { currentClass: className }] }).toArray().catch(() => []);
            }
            if (streamId || streamName) {
                const norm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
                const wantStream = norm(streamName);
                list = list.filter((s: any) => String(s.streamId) === String(streamId) || (wantStream && norm(s.stream || s.streamName) === wantStream));
            }
            recipients = list;
        }
        if (!recipients.length) return res.status(400).json({ message: 'No recipients found.' });

        const now = new Date();
        const sendSms = req.body?.sendSms !== false;   // also send an SMS by default
        const docs = [];
        const smsTargets: Array<{ phone: string; text: string }> = [];

        // School name to brand SMS.
        let schoolName = (req as any).tenantContext?.tenantName || '';
        if (!schoolName) { try { const { getMetaDb } = await import('../lib/mongodb'); const tid = (req as any).tenantContext?.tenantId; const t: any = tid ? await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(String(tid)) }) : null; schoolName = t?.instituteName || t?.name || ''; } catch { /* ignore */ } }

        const slug = String((req as any).tenantContext?.tenantSubdomain || '').toLowerCase();
        const emailJobs: Array<{ student: any; link: string }> = [];
        for (const s of recipients) {
            const sid = String(s._id);
            let attachment: any = null;
            if (type === 'Results' && examId) attachment = await resultsAttachment(database, sid, examId);
            const link = attachment && includeLink && slug ? resultUrl(slug, String(examId), sid) : '';
            if (attachment && link) attachment.link = link;
            docs.push({
                studentId: sid, studentName: s.studentName || s.name, stream: s.stream || s.streamName || '',
                from: sender, type, subject, body: `${body || ''}${link ? `${body ? '\n\n' : ''}View the full result online: ${link}` : ''}`, attachment, read: false, createdAt: now,
            });
            if (attachment && emailMode !== 'none') emailJobs.push({ student: s, link });
            // Build an SMS per parent.
            if (sendSms) {
                const phone = s.parentPhone || s.guardianPhone || s.fatherPhone || s.motherPhone || s.phone || '';
                if (phone) {
                    const childName = s.studentName || s.name || 'Your child';
                    let text = `${subject}${body ? ` — ${body}` : ''}`;
                    // Results SMS leads with the student's name so the parent knows whose marks these are.
                    if (attachment) text = `${childName} — ${attachment.examTitle}: ${attachment.subjects.map((x: any) => `${x.name} ${x.marks}/${x.outOf}`).join(', ')}. Mean ${attachment.meanPct}%.${link ? ` View online: ${link}` : ''}`;
                    smsTargets.push({ phone, text });
                }
            }
        }
        await database.collection('parent_messages').insertMany(docs);

        // Send the SMS via the school gateway (Talksasa, branded, immediate).
        let smsSent = 0;
        if (sendSms && smsTargets.length) {
            const { queueSms } = await import('../services/smsGateway.service');
            const { brandMessage } = await import('../services/talksasa.service');
            const schoolId = String((req as any).tenantContext?.tenantId || 'default');
            for (const t of smsTargets) {
                const r: any = await queueSms(database, schoolId, [t.phone], brandMessage(schoolName, t.text), { audience: 'parent_message' });
                if (r.provider === 'device' || r.sent) smsSent++;
            }
        }

        // Email: the report card as a PDF attachment, or the same results as plain text.
        let emailSent = 0, emailFailed = 0, emailSkipped = 0, emailError = '';
        if (emailJobs.length) {
            const { sendEmail } = await import('../services/communications.service');
            const pdfSvc = emailMode === 'pdf' ? await import('../services/report-card-pdf.service') : null;
            const tid = (req as any).tenantContext?.tenantId;
            const tenant: any = tid ? await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(String(tid)) }).catch(() => null) : null;
            const grading = pdfSvc ? await database.collection('grading_criteria').findOne({}).catch(() => null) : null;
            const curriculum = pdfSvc ? String(((await database.collection('curriculum_settings').findOne({}).catch(() => null)) as any)?.curriculumId || '') : '';
            const note = body ? `${body}\n\n` : '';
            const job = async ({ student: st, link }: { student: any; link: string }) => {
                const to = await parentEmailOf(database, st);
                if (!to) { emailSkipped++; return; }
                try {
                    const snap = await resultSnapshot(database, String(examId), String(st._id));
                    if (!snap) { emailSkipped++; return; }
                    const greeting = `Dear Parent/Guardian of ${snap.studentName},`;
                    if (emailMode === 'text') {
                        const text = `${greeting}\n\n${note}${resultText(snap)}\n${link ? `\nView the full result online:\n${link}\n` : ''}\nRegards,\n${schoolName || 'The School'}`;
                        await sendEmail(database, { to: [to], subject, message: text, html: `<pre style="font-family:Consolas,'Courier New',monospace;font-size:13px;line-height:1.5;color:#111;white-space:pre-wrap">${escHtml(text)}</pre>` });
                    } else {
                        const marks = await database.collection('exam_marks').find({ examId: String(examId), studentId: String(st._id) }).toArray();
                        const data = { school: tenant?.name, logo: tenant?.logo, template: tenant?.reportTemplate, curriculum, student: st, exam: examDoc, className: snap.className, marks, grading };
                        const pdf = await pdfSvc!.htmlToPdf(pdfSvc!.reportCardHtml(data));
                        const intro = `<p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937">${escHtml(greeting)}</p>${body ? `<p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;white-space:pre-wrap">${escHtml(body)}</p>` : ''}`;
                        const outro = link ? `<p style="font-family:Arial,sans-serif;font-size:13px">View the full result online: <a href="${escHtml(link)}">${escHtml(link)}</a></p>` : '';
                        await sendEmail(database, {
                            to: [to], subject, html: intro + pdfSvc!.reportCardEmailHtml(data) + outro,
                            attachments: [{ filename: `ResultCard-${String(st.registrationNo || st.admNo || st.studentName || 'student').replace(/[^\w-]/g, '_')}.pdf`, content: pdf, contentType: 'application/pdf' }],
                        });
                    }
                    emailSent++;
                } catch (e: any) { emailFailed++; if (!emailError) emailError = e?.message || String(e); }
            };
            let cursor = 0;
            await Promise.all(Array.from({ length: Math.min(emailMode === 'pdf' ? 6 : 10, emailJobs.length) }, async () => { while (cursor < emailJobs.length) await job(emailJobs[cursor++]); }));
            if (pdfSvc) await pdfSvc.closeReportBrowser().catch(() => {});
        }
        res.json({ ok: true, sent: docs.length, smsSent, emailSent, emailFailed, emailSkipped, emailError: emailError || undefined });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Parent inbox — messages for the active child (x-student-id) or ?studentId=.
router.get('/messaging/inbox', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const sid = String(req.headers['x-student-id'] || req.query.studentId || '');
        if (!sid) return res.json({ data: [] });
        const rows = await database.collection('parent_messages').find({ studentId: sid }).sort({ createdAt: -1 }).limit(200).toArray();
        res.json({ data: rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/messaging/:id/read', async (req: Request, res: Response) => {
    try { await db(req).collection('parent_messages').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { read: true } }); res.json({ ok: true }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
