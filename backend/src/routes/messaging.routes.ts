import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { formatExamName } from '../lib/examName';

const router = Router();
const db = (req: any): Db => (req.tenantDb as Db) || getMetaDb();

// ─── Parent inbox messaging ────────────────────────────────────────────────────
// Admin/teacher composes messages of type Meeting | Results | General to a class
// or an individual student. When type=Results, the message auto-attaches that
// student's exam results so the parent sees them inline.

const TYPES = ['Meeting', 'Results', 'General'] as const;

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
    return { examTitle: formatExamName(exam, `${student?.studentClass || ''} ${student?.stream || ''}`), subjects, meanPct };
}

// Compose & send (admin/teacher).
router.post('/messaging/compose', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const { type, subject, body, classId, className, streamId, streamName, studentId, examId } = req.body || {};
        if (!TYPES.includes(type)) return res.status(400).json({ message: 'Invalid message type.' });
        if (!subject) return res.status(400).json({ message: 'Subject is required.' });

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

        for (const s of recipients) {
            const sid = String(s._id);
            let attachment = null;
            if (type === 'Results' && examId) attachment = await resultsAttachment(database, sid, examId);
            docs.push({
                studentId: sid, studentName: s.studentName || s.name, stream: s.stream || s.streamName || '',
                from: sender, type, subject, body: body || '', attachment, read: false, createdAt: now,
            });
            // Build an SMS per parent.
            if (sendSms) {
                const phone = s.parentPhone || s.guardianPhone || s.fatherPhone || s.motherPhone || s.phone || '';
                if (phone) {
                    let text = `${subject}${body ? ` — ${body}` : ''}`;
                    if (attachment) text = `${subject}. ${attachment.examTitle}: ${attachment.subjects.map((x: any) => `${x.name} ${x.marks}/${x.outOf}`).join(', ')}. Mean ${attachment.meanPct}%.`;
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
                if (r.provider !== 'talksasa' || r.sent) smsSent++;
            }
        }
        res.json({ ok: true, sent: docs.length, smsSent });
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
