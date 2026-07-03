/**
 * Marks Approval & Moderation (HOD workflow).
 *
 * A batch = one (exam × subject) set of marks. Teachers submit a batch; the HOD
 * approves / rejects / returns-for-correction / locks / unlocks it. The batch
 * status lives in a `mark_approvals` collection keyed by { examId, subject } so we
 * never rewrite the raw exam_marks rows. Every transition is appended to the
 * batch's `history[]` for moderation history, and mirrored to the audit trail.
 *
 * Security: mutations require that the caller may access a department that OWNS
 * the subject (HOD of Science can moderate Biology, not English). Admins pass.
 */
import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { resolveDeptAccess } from '../lib/departmentAccess';
import { recordAudit } from '../lib/audit';
import { sendEmail } from '../services/communications.service';

const router = Router();
const db = (req: any): Db => (req.tenantDb as Db) || getMetaDb();
const NORM = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const now = () => new Date();

type Status = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Returned' | 'Locked';

const actor = (req: Request) => {
    const u = (req as any).tenantContext?.user || {};
    return { staffId: u.staffId || null, name: u.name || 'User', role: u.role || '' };
};

/** The departments (by _id + name) that own a given subject name. */
async function departmentsForSubject(database: Db, subject: string): Promise<Array<{ id: string; name: string }>> {
    const want = NORM(subject);
    const deps = await database.collection('departments').find({}).toArray().catch(() => []);
    return deps
        .filter((d: any) => Array.isArray(d.subjects) && d.subjects.some((s: string) => NORM(s) === want))
        .map((d: any) => ({ id: String(d._id), name: d.name }));
}

/** May the caller moderate this subject? (admin, or HOD of a dept owning it) */
async function canModerateSubject(req: Request, database: Db, subject: string): Promise<boolean> {
    const access = await resolveDeptAccess(req, database);
    if (access.isAdmin) return true;
    const owners = await departmentsForSubject(database, subject);
    return owners.some(o => access.can(o.id));
}

// ── List approval batches ────────────────────────────────────────────────────
// Filter by examId, subject, status, or departmentId. HODs see only batches for
// subjects their department(s) own; admins see all.
router.get('/mark-approvals', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const access = await resolveDeptAccess(req, d);
        const q: any = {};
        if (req.query.examId) q.examId = String(req.query.examId);
        if (req.query.subject) q.subjectNorm = NORM(req.query.subject);
        if (req.query.status) q.status = req.query.status;

        let batches = await d.collection('mark_approvals').find(q).sort({ updatedAt: -1 }).toArray().catch(() => []);

        // Scope to the HOD's owned subjects.
        if (!access.isAdmin) {
            const deps = await d.collection('departments').find({ _id: { $in: access.departmentIds.map(id => { try { return new ObjectId(id); } catch { return id as any; } }) } }).toArray().catch(() => []);
            const ownedSubjects = new Set<string>();
            deps.forEach((dep: any) => (dep.subjects || []).forEach((s: string) => ownedSubjects.add(NORM(s))));
            batches = batches.filter((b: any) => ownedSubjects.has(b.subjectNorm));
        }
        res.json(batches);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Pending / missing overview for an exam ───────────────────────────────────
// Compares the subjects that HAVE marks for an exam vs. their approval status, and
// (optionally) a department's expected subjects to surface MISSING submissions.
router.get('/mark-approvals/overview', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const examId = String(req.query.examId || '');
        if (!examId) return res.status(400).json({ message: 'examId required' });
        const departmentId = req.query.departmentId ? String(req.query.departmentId) : '';

        const marks = await d.collection('exam_marks').find({ examId }).toArray().catch(() => []);
        const subjectsWithMarks = new Map<string, number>();   // norm → entry count
        const subjectLabel = new Map<string, string>();
        for (const m of marks) {
            const label = m.subjectName || m.subject || 'Subject'; const n = NORM(label);
            subjectsWithMarks.set(n, (subjectsWithMarks.get(n) || 0) + 1);
            if (!subjectLabel.has(n)) subjectLabel.set(n, label);
        }
        const batches = await d.collection('mark_approvals').find({ examId }).toArray().catch(() => []);
        const statusBySubject = new Map<string, string>();
        batches.forEach((b: any) => statusBySubject.set(b.subjectNorm, b.status));

        let expected: string[] = [];
        if (departmentId) {
            const dep: any = await d.collection('departments').findOne({ _id: (() => { try { return new ObjectId(departmentId); } catch { return null as any; } })() }).catch(() => null);
            expected = Array.isArray(dep?.subjects) ? dep.subjects : [];
        }
        const expectedNorm = new Set(expected.map(NORM));

        // When scoped to a department, show ONLY that department's subjects (with their
        // status — including 'Missing' when a subject has no marks). Without a
        // department, fall back to every subject that has marks for the exam.
        const keys = departmentId ? [...expectedNorm] : [...subjectsWithMarks.keys()];
        const subjects = keys.map(n => ({
            subject: subjectLabel.get(n) || expected.find(e => NORM(e) === n) || n,
            entries: subjectsWithMarks.get(n) || 0,
            hasMarks: subjectsWithMarks.has(n),
            status: statusBySubject.get(n) || (subjectsWithMarks.has(n) ? 'Draft' : 'Missing'),
        }));

        res.json({
            examId,
            counts: {
                total: subjects.length,
                submitted: subjects.filter(s => s.status === 'Submitted').length,
                approved: subjects.filter(s => s.status === 'Approved').length,
                pending: subjects.filter(s => ['Submitted', 'Draft', 'Returned', 'Rejected'].includes(s.status)).length,
                missing: subjects.filter(s => s.status === 'Missing').length,
                locked: subjects.filter(s => s.status === 'Locked').length,
            },
            subjects: subjects.sort((a, b) => a.subject.localeCompare(b.subject)),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Teacher submits a subject's marks for approval ───────────────────────────
router.post('/mark-approvals/submit', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const { examId, examName, subject, className, note } = req.body || {};
        if (!examId || !subject) return res.status(400).json({ message: 'examId and subject are required' });
        const a = actor(req);
        const entries = await d.collection('exam_marks').countDocuments({ examId: String(examId), $or: [{ subjectName: subject }, { subject }] }).catch(() => 0);
        const owners = await departmentsForSubject(d, subject);
        const key = { examId: String(examId), subjectNorm: NORM(subject) };
        const existing: any = await d.collection('mark_approvals').findOne(key).catch(() => null);
        if (existing && ['Approved', 'Locked'].includes(existing.status)) {
            return res.status(409).json({ message: `Marks already ${existing.status.toLowerCase()} — ask the HOD to unlock first.` });
        }
        const event = { action: 'Submitted', by: a.name, byId: a.staffId, at: now(), note: note || '' };
        await d.collection('mark_approvals').updateOne(
            key,
            {
                $set: { examId: String(examId), examName: examName || '', subject, subjectNorm: NORM(subject), className: className || '', entries, status: 'Submitted' as Status, departmentIds: owners.map(o => o.id), departmentNames: owners.map(o => o.name), submittedBy: a.name, submittedById: a.staffId, submittedAt: now(), updatedAt: now() },
                $setOnInsert: { createdAt: now() },
                $push: { history: event },
            } as any,
            { upsert: true },
        );
        // Mark this batch's marks as pending (submitted, not yet approved) so they
        // stay hidden from students until the HOD/admin approves.
        await d.collection('exam_marks').updateMany(
            { examId: String(examId), $or: [{ subjectName: subject }, { subject }] },
            { $set: { approvalStatus: 'Submitted', approved: false } },
        ).catch(() => {});
        await recordAudit(req, { action: 'Submitted', entity: 'marks', entityId: `${examId}:${subject}`, meta: { subject, examId, entries } });
        res.json({ message: 'Marks submitted for approval', entries });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── HOD moderates a subject DIRECTLY (by exam+subject) ───────────────────────
// Lets the HOD approve/reject/return marks that exist but were never formally
// submitted (status "Draft"), creating the approval batch on the fly. This is what
// makes Marks Approval usable when teachers save marks without clicking Submit.
router.post('/mark-approvals/moderate', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const { examId, examName, subject, className, action, note } = req.body || {};
        if (!examId || !subject || !action) return res.status(400).json({ message: 'examId, subject and action are required' });
        if (!['approve', 'reject', 'return', 'lock', 'unlock'].includes(action)) return res.status(400).json({ message: 'Unknown action' });

        // Authorize: HOD must own a department that owns this subject (admins pass).
        if (!(await canModerateSubject(req, d, subject))) {
            return res.status(403).json({ message: 'You cannot moderate this subject.' });
        }

        const a = actor(req);
        const status: Status = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : action === 'return' ? 'Returned' : action === 'lock' ? 'Locked' : 'Approved';
        const verb = action === 'unlock' ? 'Unlocked' : status;
        const entries = await d.collection('exam_marks').countDocuments({ examId: String(examId), $or: [{ subjectName: subject }, { subject }] }).catch(() => 0);
        const owners = await departmentsForSubject(d, subject);
        const key = { examId: String(examId), subjectNorm: NORM(subject) };
        const event = { action: verb, by: a.name, byId: a.staffId, at: now(), note: note || '' };
        await d.collection('mark_approvals').updateOne(
            key,
            {
                $set: { examId: String(examId), examName: examName || '', subject, subjectNorm: NORM(subject), className: className || '', entries, status, departmentIds: owners.map(o => o.id), departmentNames: owners.map(o => o.name), moderatedBy: a.name, moderatedById: a.staffId, moderatedAt: now(), lastNote: note || '', updatedAt: now() },
                $setOnInsert: { createdAt: now() },
                $push: { history: event },
            } as any,
            { upsert: true },
        );
        // Reflect approval on the underlying marks (gates student visibility).
        const approvedNow = status === 'Approved' || status === 'Locked';
        await d.collection('exam_marks').updateMany(
            { examId: String(examId), $or: [{ subjectName: subject }, { subject }] },
            { $set: { approvalStatus: status, approved: approvedNow } },
        ).catch(() => {});
        await recordAudit(req, { action: verb, entity: 'marks', entityId: `${examId}:${subject}`, meta: { subject, examId } });
        res.json({ message: `Marks ${verb.toLowerCase()}`, status });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── HOD transitions: approve / reject / return / lock / unlock ────────────────
const TRANSITIONS: Record<string, { to: Status; verb: string }> = {
    approve: { to: 'Approved', verb: 'Approved' },
    reject: { to: 'Rejected', verb: 'Rejected' },
    return: { to: 'Returned', verb: 'Returned' },
    lock: { to: 'Locked', verb: 'Locked' },
    unlock: { to: 'Approved', verb: 'Unlocked' },
};

router.patch('/mark-approvals/:id/:action', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const id = (() => { try { return new ObjectId(req.params.id); } catch { return null; } })();
        if (!id) return res.status(400).json({ message: 'Invalid id' });
        const t = TRANSITIONS[req.params.action];
        if (!t) return res.status(400).json({ message: 'Unknown action' });

        const batch: any = await d.collection('mark_approvals').findOne({ _id: id });
        if (!batch) return res.status(404).json({ message: 'Approval batch not found' });

        // Authorize: caller must moderate a department owning this subject.
        if (!(await canModerateSubject(req, d, batch.subject))) {
            return res.status(403).json({ message: 'You cannot moderate this subject.' });
        }
        // Guard illegal transitions.
        if (req.params.action === 'unlock' && batch.status !== 'Locked') return res.status(409).json({ message: 'Only locked marks can be unlocked.' });
        if (req.params.action === 'lock' && batch.status !== 'Approved') return res.status(409).json({ message: 'Only approved marks can be locked.' });

        const a = actor(req);
        const event = { action: t.verb, by: a.name, byId: a.staffId, at: now(), note: req.body?.note || '' };
        await d.collection('mark_approvals').updateOne(
            { _id: id },
            {
                $set: { status: t.to, moderatedBy: a.name, moderatedById: a.staffId, moderatedAt: now(), lastNote: req.body?.note || '', updatedAt: now() },
                $push: { history: event },
            } as any,
        );
        // Reflect the batch's approval on its underlying marks so student-facing
        // reads (report cards, portals) can gate on it. Approved/Locked → visible;
        // Submitted/Returned/Rejected → hidden from students until approved.
        const approvedNow = t.to === 'Approved' || t.to === 'Locked';
        await d.collection('exam_marks').updateMany(
            { examId: String(batch.examId), $or: [{ subjectName: batch.subject }, { subject: batch.subject }] },
            { $set: { approvalStatus: t.to, approved: approvedNow } },
        ).catch(() => { /* non-fatal */ });

        await recordAudit(req, { action: t.verb, entity: 'marks', entityId: `${batch.examId}:${batch.subject}`, meta: { subject: batch.subject, examId: batch.examId, note: req.body?.note || '' } });

        // On REJECT or RETURN, email the submitting teacher to recheck & resubmit.
        if ((req.params.action === 'reject' || req.params.action === 'return') && batch.submittedById) {
            try {
                const teacher: any = await d.collection('staff').findOne({ _id: new ObjectId(String(batch.submittedById)) }).catch(() => null);
                const email = teacher?.email || teacher?.workEmail || '';
                if (email) {
                    const verb = req.params.action === 'reject' ? 'rejected' : 'returned for correction';
                    const note = req.body?.note ? `<p><b>Reviewer's note:</b> ${req.body.note}</p>` : '';
                    await sendEmail(d, {
                        to: [email],
                        subject: `Marks ${verb}: ${batch.subject} — ${batch.examName || 'Exam'}`,
                        html: `<div style="font-family:Arial,sans-serif;color:#111">
                            <h2 style="color:#5C67F2">Marks ${verb}</h2>
                            <p>Dear ${teacher?.employeeName || teacher?.name || 'Teacher'},</p>
                            <p>The marks you submitted for <b>${batch.subject}</b> in <b>${batch.examName || 'the exam'}</b> (${batch.className || ''}) were <b>${verb}</b> by ${a.name}.</p>
                            <p>Please recheck the marks, make the necessary corrections, and <b>resubmit for approval</b>.</p>
                            ${note}
                            <p style="color:#888;font-size:12px;margin-top:20px">ShuleCloud · ${new Date().toLocaleString()}</p>
                        </div>`,
                    }).catch(() => { /* email is best-effort */ });
                }
            } catch { /* never block the transition on email failure */ }
        }

        res.json({ message: `Marks ${t.verb.toLowerCase()}`, status: t.to });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Moderation history for a batch ───────────────────────────────────────────
router.get('/mark-approvals/:id/history', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const id = (() => { try { return new ObjectId(req.params.id); } catch { return null; } })();
        if (!id) return res.status(400).json({ message: 'Invalid id' });
        const batch: any = await d.collection('mark_approvals').findOne({ _id: id });
        if (!batch) return res.status(404).json({ message: 'Not found' });
        res.json({ subject: batch.subject, examName: batch.examName, status: batch.status, history: (batch.history || []).slice().reverse() });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
