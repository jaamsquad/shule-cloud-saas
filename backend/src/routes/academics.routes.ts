import { Router, Request } from 'express';
import * as c from '../controllers/academics.controller';
import { encrypt, decrypt, maskKey } from '../lib/crypto';
import { getMetaDb } from '../lib/mongodb';
import { Db, ObjectId } from 'mongodb';
import { sendEmail } from '../services/communications.service';
import { reportCardHtml, reportCardEmailHtml, htmlToPdf, closeReportBrowser } from '../services/report-card-pdf.service';
import { syncStudentToParents } from '../services/parent-student-sync.service';
import { enforceCrud } from '../lib/permissions';
import { resolveScope, scopeForCollection, mergeFilter } from '../lib/dataScope';
import { getRule, saveRule, previewNext, NumberKind } from '../lib/idNumbering';
import { STUDENT_STATUSES, buildStatusUpdate, canonicalStatus, nextTransferRef } from '../lib/studentStatus';
import { findSchoolAdmin, maskEmail, passwordLocked, recordPasswordFailure, issueOtp, cancelOtps, verifyOtp, OTP_TTL_MIN } from '../lib/purgeVerification';
import { notifyOwner } from '../services/ownerNotify.service';
import bcrypt from 'bcrypt';

const router = Router();

// ─── DB resolver (mirrors controller logic) ────────────────────────────────────
const getRequestDb = (req: Request): Db =>
    (req as any).tenantDb || getMetaDb();

// ─── Transport zone access ────────────────────────────────────────────────────
// A Driver / Bus Attendant may only touch the zones they're assigned to (where
// they are the zone's driver or coDriver). Admins, Transport Managers and
// Coordinators get unrestricted access (null = all zones).
const isRestrictedTransportRole = (s: any): boolean => {
    const text = `${s?.designation || ''} ${(Array.isArray(s?.roles) ? s.roles.join(' ') : '')}`.toLowerCase();
    if (/transport manager|transport coordinator|admin|principal|head/.test(text)) return false;
    return /driver|bus attendant|co.?driver/.test(text);
};
const accessibleZones = async (req: Request, db: Db): Promise<string[] | null> => {
    try {
        const auth = req.headers.authorization;
        if (!auth?.startsWith('Bearer ')) return null;
        const decoded: any = require('jsonwebtoken').verify(auth.split(' ')[1], process.env.JWT_SECRET || 'secret');
        // School admins (no staffId) are unrestricted.
        const role = String(decoded.role || '').toLowerCase();
        if (role === 'school_admin' || role === 'super_admin') return null;
        const staffId = decoded.staffId;
        if (!staffId) return null;
        const staff = await db.collection('staff').findOne({ _id: new ObjectId(String(staffId)) }).catch(() => null);
        if (!staff || !isRestrictedTransportRole(staff)) return null;

        const name = staff.studentName || staff.name || staff.employeeName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
        const zones = await db.collection('transport_zones')
            .find({ $or: [{ driver: name }, { coDriver: name }, { driverId: String(staffId) }, { coDriverId: String(staffId) }] })
            .toArray().catch(() => []);
        return zones.map((z: any) => z.name).filter(Boolean);
    } catch { return null; }
};

// ─── Plan student-limit enforcement ──────────────────────────────────────────
// Blocks adding students beyond the tenant's plan maxStudents. Reads the plan via
// the tenant's subscription in the meta DB. No plan / null limit → unlimited.
const enforcePlanLimit = async (req: Request, res: any, next: any) => {
    try {
        const tid = (req as any).tenantContext?.tenantId;
        if (!tid) return next();
        const meta = getMetaDb();
        const oid = (() => { try { return new (require('mongodb').ObjectId)(tid); } catch { return null; } })();
        if (!oid) return next();
        const sub = await meta.collection('TenantSubscription').findOne({ tenantId: oid });
        let plan: any = sub?.planId ? await meta.collection('Plan').findOne({ _id: sub.planId }) : null;
        if (!plan) { const t = await meta.collection('Tenant').findOne({ _id: oid }); if (t?.planId) plan = await meta.collection('Plan').findOne({ _id: t.planId }); }
        const max = plan?.limits?.maxStudents;
        if (max == null || Number(max) <= 0) return next();   // unlimited
        // Count how many are being added (single vs bulk).
        const adding = Array.isArray(req.body) ? req.body.length : (Array.isArray(req.body?.students) ? req.body.students.length : 1);
        const current = await getRequestDb(req).collection('students').countDocuments({});
        if (current + adding > Number(max)) {
            return res.status(403).json({ message: `Your "${plan.name}" plan allows up to ${max} students. You have ${current}. Upgrade the plan to add more.` });
        }
        next();
    } catch { next(); /* fail-open: never block on an unexpected error */ }
};

// ─── Health ────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => res.json({ status: 'ok', module: 'academics' }));

// ─── Tenant notifications (platform notices shown in the school top bar) ─────
router.get('/notifications', async (req, res) => {
    try {
        const rows = await getRequestDb(req).collection('notifications')
            .find({ dismissed: { $ne: true } }).sort({ createdAt: -1 }).limit(50).toArray();
        res.json(rows.map((r: any) => ({ ...r, _id: String(r._id) })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.patch('/notifications/:id/dismiss', async (req, res) => {
    try {
        let _id: any; try { _id = new ObjectId(req.params.id); } catch { _id = req.params.id; }
        await getRequestDb(req).collection('notifications').updateOne({ _id }, { $set: { dismissed: true, dismissedAt: new Date() } });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.patch('/notifications/read-all', async (req, res) => {
    try { await getRequestDb(req).collection('notifications').updateMany({ read: { $ne: true } }, { $set: { read: true } }); res.json({ ok: true }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Card-scan attendance (student / staff) ──────────────────────────────────
const scanDay = () => new Date().toISOString().slice(0, 10);

// Scan a card → mark IN (first scan) or OUT (second scan) for today.
router.post('/attendance/scan', async (req: Request, res) => {
    try {
        const db = getRequestDb(req);
        const code = String(req.body?.code || '').trim();
        if (!code) return res.status(400).json({ message: 'No code scanned' });

        let person: any = await db.collection('students').findOne({ $or: [{ registrationNo: code }, { admNo: code }, { portalUsername: code }, { studentId: code }] });
        let personType = 'student', name = '', role = 'Student', reg = code;
        if (person) { name = person.studentName || 'Student'; role = person.studentClass ? `Student · ${person.studentClass}` : 'Student'; reg = person.registrationNo || person.admNo || code; }
        else {
            person = await db.collection('staff').findOne({ $or: [{ portalUsername: code }, { staffNo: code }, { employeeId: code }, { employeeNo: code }, { nationalId: code }] });
            if (person) { personType = 'staff'; name = person.employeeName || person.name || 'Staff'; role = person.designation || 'Staff'; reg = person.staffNo || person.employeeId || person.portalUsername || code; }
        }
        if (!person) return res.status(404).json({ message: `No student or staff found for "${code}"` });

        const personId = String(person._id);
        const date = scanDay();
        const now = new Date();
        const existing = await db.collection('scan_attendance').findOne({ date, personId });

        if (!existing) {
            const doc = { date, personId, personType, name, role, registrationNo: reg, photo: person.photo || person.avatar || person.studentPhoto || null, inTime: now, outTime: null, status: 'Present', createdAt: now };
            await db.collection('scan_attendance').insertOne(doc);
            return res.json({ action: 'in', ...doc });
        }
        await db.collection('scan_attendance').updateOne({ _id: existing._id }, { $set: { outTime: now, status: 'Present' } });
        return res.json({ action: 'out', ...existing, outTime: now });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Today's scan log.
router.get('/attendance/scan/today', async (req: Request, res) => {
    try {
        const db = getRequestDb(req);
        const rows = await db.collection('scan_attendance').find({ date: scanDay() }).sort({ inTime: -1, createdAt: -1 }).toArray();
        const present = rows.filter((r: any) => r.status === 'Present').length;
        res.json({ rows, present, absent: rows.filter((r: any) => r.status === 'Absent').length, total: rows.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Mark everyone NOT scanned today as Absent.
router.post('/attendance/scan/finalize', async (req: Request, res) => {
    try {
        const db = getRequestDb(req);
        const date = scanDay();
        const scanned = await db.collection('scan_attendance').find({ date }).toArray();
        const ids = new Set(scanned.map((s: any) => s.personId));
        const students = await db.collection('students').find({}).toArray();
        const staff = await db.collection('staff').find({}).toArray();
        const absents: any[] = [];
        students.forEach((s: any) => { if (!ids.has(String(s._id))) absents.push({ date, personId: String(s._id), personType: 'student', name: s.studentName, role: s.studentClass ? `Student · ${s.studentClass}` : 'Student', registrationNo: s.registrationNo || s.admNo, inTime: null, outTime: null, status: 'Absent', createdAt: new Date() }); });
        staff.forEach((s: any) => { if (!ids.has(String(s._id))) absents.push({ date, personId: String(s._id), personType: 'staff', name: s.employeeName || s.name, role: s.designation || 'Staff', inTime: null, outTime: null, status: 'Absent', createdAt: new Date() }); });
        if (absents.length) await db.collection('scan_attendance').insertMany(absents);
        res.json({ markedAbsent: absents.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Backfill: create/link Parent records from every student's father/mother fields
// (for students added via bulk import before the auto-sync existed).
router.post('/parents/generate-from-students', async (req: Request, res) => {
    try {
        const db = getRequestDb(req);
        const students = await db.collection('students').find({
            $or: [{ fatherName: { $nin: [null, ''] } }, { motherName: { $nin: [null, ''] } }],
        }).toArray();
        const before = await db.collection('parents').countDocuments({});
        for (const st of students) {
            await syncStudentToParents(db, String(st._id), st).catch(() => {});
        }
        const after = await db.collection('parents').countDocuments({});
        res.json({ studentsProcessed: students.length, parentsCreated: Math.max(0, after - before), totalParents: after });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// ─── Email result cards (PDF) to parents for an exam + class ──────────────────
router.post('/exams/email-result-cards', async (req: Request, res) => {
    try {
        const db = getRequestDb(req);
        const { examId, classId, className } = req.body || {};
        if (!examId) return res.status(400).json({ message: 'examId is required' });
        const oid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };

        const exam = await db.collection('exams').findOne({ _id: oid(examId) || (examId as any) });
        const cls = classId ? await db.collection('classes').findOne({ _id: oid(classId) || (classId as any) }) : null;
        const clsName = className || cls?.className || '';
        const students = await db.collection('students').find({
            $or: [{ classId: classId }, { studentClass: clsName }, { currentClass: clsName }, { class: clsName }],
        }).toArray();

        const tid = (req as any).tenantContext?.tenantId;
        const tenant = tid ? await getMetaDb().collection('Tenant').findOne({ _id: oid(tid) || (tid as any) }) : null;
        const grading = await db.collection('grading_criteria').findOne({}).catch(() => null);

        // Fail fast with a clear message if email isn't configured at all, instead
        // of reporting "20 failed" with no reason.
        try {
            const { getCommSettings } = await import('../services/communications.service');
            const cs: any = await getCommSettings(db);
            const host = cs.smtpHost || process.env.SMTP_HOST;
            const user = cs.smtpUser || process.env.SMTP_USER;
            const pass = cs.smtpPass || process.env.SMTP_PASS;
            if (cs.emailEnabled === false) return res.status(400).json({ message: 'Email sending is disabled. Enable it in Communications → Settings.' });
            if (!host || !user || !pass) return res.status(400).json({ message: 'Email is not configured. Set SMTP host, username and password in Communications → Settings (or the Email/SMTP integration).' });
        } catch { /* fall through — per-student errors will surface below */ }

        let sent = 0, failed = 0, skipped = 0;
        let firstError = '';

        // Process every student concurrently (bounded) so all emails go out fast.
        const processStudent = async (st: any) => {
            // Send to the PARENT's email only — prefer the linked Parents-module record.
            let email = '';
            const linkedParents = await db.collection('parents').find({ 'linkedStudents.studentId': String(st._id) }).toArray().catch(() => []);
            const parent = linkedParents.find((p: any) => (p.linkedStudents || []).some((l: any) => String(l.studentId) === String(st._id) && l.isPrimary)) || linkedParents[0];
            email = parent?.email || parent?.parentEmail || parent?.emailAddress || '';
            if (!email) email = st.parentEmail || st.fatherEmail || st.motherEmail || st.guardianEmail || '';
            if (!email) { skipped++; return; }
            try {
                const marks = await db.collection('exam_marks').find({ examId: String(examId), studentId: String(st._id) }).toArray();
                const data = { school: tenant?.name, logo: tenant?.logo, template: tenant?.reportTemplate, student: st, exam, className: clsName, marks, grading };
                const pdf = await htmlToPdf(reportCardHtml(data));
                await sendEmail(db, {
                    to: [email],
                    subject: `${exam?.examName || exam?.name || 'Exam'} Result Card — ${st.studentName} (${clsName})`,
                    html: reportCardEmailHtml(data),
                    attachments: [{ filename: `ResultCard-${(st.registrationNo || st.admNo || st.studentName || 'student').toString().replace(/[^\w-]/g, '_')}.pdf`, content: pdf, contentType: 'application/pdf' }],
                });
                sent++;
            } catch (e: any) { failed++; if (!firstError) firstError = e?.message || String(e); }
        };

        const CONCURRENCY = 8;
        let cursor = 0;
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, students.length) }, async () => {
            while (cursor < students.length) { const i = cursor++; await processStudent(students[i]); }
        }));

        await closeReportBrowser().catch(() => {});
        res.json({ total: students.length, sent, failed, skipped, error: failed > 0 ? firstError : undefined });
    } catch (e: any) {
        await closeReportBrowser().catch(() => {});
        res.status(500).json({ message: e.message });
    }
});

// ─── Global search (employees, students, subjects, invoices) ──────────────────
router.get('/search', async (req: Request, res) => {
    try {
        const db = getRequestDb(req);
        const q = String((req.query.q as string) || '').trim();
        if (q.length < 2) return res.json([]);
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const out: any[] = [];

        const staff = await db.collection('staff').find({ $or: [{ employeeName: rx }, { name: rx }, { email: rx }, { phone: rx }, { designation: rx }] }).limit(6).toArray().catch(() => []);
        staff.forEach((s: any) => out.push({ type: 'Employee', id: String(s._id), label: s.employeeName || s.name || 'Staff', sub: [s.designation, s.email].filter(Boolean).join(' · ') }));

        const students = await db.collection('students').find({ $or: [{ studentName: rx }, { registrationNo: rx }, { admNo: rx }] }).limit(6).toArray().catch(() => []);
        students.forEach((s: any) => out.push({ type: 'Student', id: String(s._id), label: s.studentName || 'Student', sub: [s.registrationNo || s.admNo, s.studentClass].filter(Boolean).join(' · ') }));

        const subjects = await db.collection('subjects').find({ $or: [{ name: rx }, { subjectName: rx }, { code: rx }] }).limit(6).toArray().catch(() => []);
        subjects.forEach((s: any) => out.push({ type: 'Subject', id: String(s._id), label: s.name || s.subjectName || 'Subject', sub: s.code || '' }));

        const invoices = await db.collection('invoices').find({ $or: [{ invoice_no: rx }, { studentName: rx }] }).limit(6).toArray().catch(() => []);
        invoices.forEach((i: any) => out.push({ type: 'Invoice', id: String(i._id), label: i.invoice_no || 'Invoice', sub: [i.studentName, i.total_due ? `KSh ${Number(i.total_due).toLocaleString()}` : ''].filter(Boolean).join(' · ') }));

        res.json(out);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// ─── Exams / Assessments ───────────────────────────────────────────────────
router.get('/exams',              c.getItems('exams'));
router.get('/exams/:id',          c.getItem('exams'));
router.post('/exams',             c.createItem('exams'));
router.patch('/exams/:id',        c.updateItem('exams'));
router.delete('/exams/:id',       c.deleteItem('exams'));

router.get('/assessments',        c.getItems('exams'));
router.post('/assessments',       c.createItem('exams'));
router.patch('/assessments/:id',  c.updateItem('exams'));
router.delete('/assessments/:id', c.deleteItem('exams'));

router.get('/academics/exams',              c.getItems('exams'));
router.get('/academics/exams/:id',          c.getItem('exams'));
router.post('/academics/exams',             c.createItem('exams'));
router.patch('/academics/exams/:id',        c.updateItem('exams'));
router.delete('/academics/exams/:id',       c.deleteItem('exams'));

// ─── Exam Marks ──────────────────────────────────────────────────────────────
router.get('/academics/exam-marks',          c.getItems('exam_marks'));
router.post('/academics/exam-marks',         c.createItem('exam_marks'));
router.patch('/academics/exam-marks/:id',    c.updateItem('exam_marks'));
router.delete('/academics/exam-marks/:id',   c.deleteItem('exam_marks'));
router.post('/academics/exam-marks/bulk', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ message: 'No entries provided' });

        // ── Lock enforcement ──────────────────────────────────────────────────────
        // If an (exam × subject) batch has been Approved or Locked by an HOD, block
        // further edits — only an admin/principal may overwrite. This keeps approved
        // results tamper-proof while still allowing authorized corrections.
        const role = String((req as any).tenantContext?.user?.role || '').toLowerCase();
        const isAdmin = ['super_admin', 'school_admin', 'admin', 'principal', 'super admin', 'school admin'].includes(role);
        if (!isAdmin) {
            const NORMB = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
            const pairs = new Map<string, { examId: string; subject: string }>();
            entries.forEach((e: any) => {
                const examId = String(e.examId || ''); const subject = e.subjectName || e.subject || '';
                if (examId && subject) pairs.set(`${examId}::${NORMB(subject)}`, { examId, subject });
            });
            if (pairs.size) {
                const examIds = [...new Set([...pairs.values()].map(p => p.examId))];
                const locked = await db.collection('mark_approvals')
                    .find({ examId: { $in: examIds }, status: { $in: ['Approved', 'Locked'] } })
                    .toArray().catch(() => []);
                const blocked = locked.filter((b: any) => pairs.has(`${String(b.examId)}::${b.subjectNorm}`));
                if (blocked.length) {
                    const names = [...new Set(blocked.map((b: any) => `${b.subject} (${b.status})`))].join(', ');
                    return res.status(423).json({ message: `These marks are locked by the HOD and cannot be edited: ${names}. Ask the HOD to unlock first.` });
                }
            }
        }

        // Stamp each mark with the student's class + academic year AT SAVE TIME, so a
        // student's records stay attributed to the class they were in (history per class).
        const period = await db.collection('periods').findOne({ isCurrent: true }).catch(() => null);
        const year = period?.academicYear || new Date().getFullYear();
        const sIds = Array.from(new Set(entries.map((e: any) => String(e.studentId)).filter(Boolean)));
        const studentDocs = sIds.length
            ? await db.collection('students').find({ _id: { $in: sIds.map(id => { try { return new ObjectId(id); } catch { return id as any; } }) } }, { projection: { studentClass: 1, className: 1, currentClass: 1, classId: 1 } }).toArray().catch(() => [])
            : [];
        const classByStudent: Record<string, { name: string; id: string }> = {};
        studentDocs.forEach((s: any) => { classByStudent[String(s._id)] = { name: s.studentClass || s.className || s.currentClass || '', id: String(s.classId || '') }; });

        const ops = entries.map((entry: any) => {
            // Strip fields that must not appear in both $set and $setOnInsert (MongoDB conflict)
            const { _id, createdAt, __v, ...data } = entry;
            const cls = classByStudent[String(data.studentId)] || { name: data.className || '', id: '' };
            return {
                updateOne: {
                    filter: { studentId: data.studentId, subjectId: data.subjectId, examId: data.examId },
                    update: {
                        // classAtTime/academicYear set only on first insert, so re-saving
                        // marks never rewrites the historical class attribution.
                        $set: { ...data, updatedAt: new Date() },
                        $setOnInsert: { createdAt: new Date(), classAtTime: cls.name, classIdAtTime: cls.id, academicYear: String(year) },
                    },
                    upsert: true
                }
            };
        });
        const result = await db.collection('exam_marks').bulkWrite(ops);
        res.json({ message: 'Marks saved', upserted: result.upsertedCount, modified: result.modifiedCount });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Exam Schedules ───────────────────────────────────────────────────────────
router.get('/academics/exam-schedules',          c.getItems('exam_schedules'));
router.post('/academics/exam-schedules',         c.createItem('exam_schedules'));
router.patch('/academics/exam-schedules/:id',    c.updateItem('exam_schedules'));
router.delete('/academics/exam-schedules/:id',   c.deleteItem('exam_schedules'));

// ─── Exam Types ─────────────────────────────────────────────────────────────
router.get('/exam_types',                      c.getItems('exam_types'));
router.post('/exam_types',                     c.createItem('exam_types'));
router.patch('/exam_types/:id',                c.updateItem('exam_types'));
router.delete('/exam_types/:id',               c.deleteItem('exam_types'));

router.get('/exam-types',                      c.getItems('exam_types'));
router.post('/exam-types',                     c.createItem('exam_types'));
router.patch('/exam-types/:id',                c.updateItem('exam_types'));
router.delete('/exam-types/:id',               c.deleteItem('exam_types'));

router.get('/academics/exam_types',            c.getItems('exam_types'));
router.post('/academics/exam_types',           c.createItem('exam_types'));
router.patch('/academics/exam_types/:id',      c.updateItem('exam_types'));
router.delete('/academics/exam_types/:id',     c.deleteItem('exam_types'));

router.get('/academics/exam-types',            c.getItems('exam_types'));
router.post('/academics/exam-types',           c.createItem('exam_types'));
router.patch('/academics/exam-types/:id',      c.updateItem('exam_types'));
router.delete('/academics/exam-types/:id',     c.deleteItem('exam_types'));

// ─── Subject Groups ──────────────────────────────────────────────────────────
router.get('/subject_groups',                      c.getItems('subject_groups'));
router.post('/subject_groups',                     c.createItem('subject_groups'));
router.patch('/subject_groups/:id',                c.updateItem('subject_groups'));
router.delete('/subject_groups/:id',               c.deleteItem('subject_groups'));

router.get('/subject-groups',                      c.getItems('subject_groups'));
router.post('/subject-groups',                     c.createItem('subject_groups'));
router.patch('/subject-groups/:id',                c.updateItem('subject_groups'));
router.delete('/subject-groups/:id',               c.deleteItem('subject_groups'));

router.get('/academics/subject_groups',            c.getItems('subject_groups'));
router.post('/academics/subject_groups',           c.createItem('subject_groups'));
router.patch('/academics/subject_groups/:id',      c.updateItem('subject_groups'));
router.delete('/academics/subject_groups/:id',     c.deleteItem('subject_groups'));

router.get('/academics/subject-groups',            c.getItems('subject_groups'));
router.post('/academics/subject-groups',           c.createItem('subject_groups'));
router.patch('/academics/subject-groups/:id',      c.updateItem('subject_groups'));
router.delete('/academics/subject-groups/:id',     c.deleteItem('subject_groups'));

// ─── Subjects ────────────────────────────────────────────────────────────────
router.get('/subjects',              c.getItems('subjects'));
router.post('/subjects',             c.createItem('subjects'));
router.patch('/subjects/:id',        c.updateItem('subjects'));
router.delete('/subjects/:id',       c.deleteItem('subjects'));

router.get('/academics/subjects',    c.getItems('subjects'));
router.post('/academics/subjects',   c.createItem('subjects'));
router.patch('/academics/subjects/:id',  c.updateItem('subjects'));
router.delete('/academics/subjects/:id', c.deleteItem('subjects'));

// ─── Grades ──────────────────────────────────────────────────────────────────
router.get('/grades',              c.getItems('grades'));
router.post('/grades',             c.createItem('grades'));
router.patch('/grades/:id',        c.updateItem('grades'));
router.delete('/grades/:id',       c.deleteItem('grades'));

router.get('/academics/grades',    c.getItems('grades'));
router.post('/academics/grades',   c.createItem('grades'));
router.patch('/academics/grades/:id',  c.updateItem('grades'));
router.delete('/academics/grades/:id', c.deleteItem('grades'));

// ─── Grading Presets ──────────────────────────────────────────────────────────
router.get('/grading_presets',                   c.getItems('grading_presets'));
router.post('/grading_presets',                  c.createItem('grading_presets'));
router.patch('/grading_presets/:id',             c.updateItem('grading_presets'));
router.delete('/grading_presets/:id',            c.deleteItem('grading_presets'));

router.get('/grading-presets',                   c.getItems('grading_presets'));
router.post('/grading-presets',                  c.createItem('grading_presets'));
router.patch('/grading-presets/:id',             c.updateItem('grading_presets'));
router.delete('/grading-presets/:id',            c.deleteItem('grading_presets'));

router.get('/academics/grading_presets',         c.getItems('grading_presets'));
router.post('/academics/grading_presets',        c.createItem('grading_presets'));
router.patch('/academics/grading_presets/:id',   c.updateItem('grading_presets'));
router.delete('/academics/grading_presets/:id',  c.deleteItem('grading_presets'));

router.get('/academics/grading-presets',         c.getItems('grading_presets'));
router.post('/academics/grading-presets',        c.createItem('grading_presets'));
router.patch('/academics/grading-presets/:id',   c.updateItem('grading_presets'));
router.delete('/academics/grading-presets/:id',  c.deleteItem('grading_presets'));

// ─── Grading Criteria ─────────────────────────────────────────────────────────
router.get('/grading_criteria',                  c.getItems('grading_criteria'));
router.post('/grading_criteria',                 c.createItem('grading_criteria'));
router.patch('/grading_criteria/:id',            c.updateItem('grading_criteria'));
router.delete('/grading_criteria/:id',           c.deleteItem('grading_criteria'));

router.get('/grading-criteria',                  c.getItems('grading_criteria'));
router.post('/grading-criteria',                 c.createItem('grading_criteria'));
router.patch('/grading-criteria/:id',            c.updateItem('grading_criteria'));
router.delete('/grading-criteria/:id',           c.deleteItem('grading_criteria'));

router.get('/academics/grading_criteria',        c.getItems('grading_criteria'));
router.post('/academics/grading_criteria',       c.createItem('grading_criteria'));
router.patch('/academics/grading_criteria/:id',  c.updateItem('grading_criteria'));
router.delete('/academics/grading_criteria/:id', c.deleteItem('grading_criteria'));

router.get('/academics/grading-criteria',        c.getItems('grading_criteria'));
router.post('/academics/grading-criteria',       c.createItem('grading_criteria'));
router.patch('/academics/grading-criteria/:id',  c.updateItem('grading_criteria'));
router.delete('/academics/grading-criteria/:id', c.deleteItem('grading_criteria'));

// ─── Curricula ────────────────────────────────────────────────────────────────
router.get('/curricula',             c.getItems('curricula'));
router.post('/curricula',            c.createItem('curricula'));
router.patch('/curricula/:id',       c.updateItem('curricula'));
router.delete('/curricula/:id',      c.deleteItem('curricula'));

router.get('/academics/curricula',   c.getItems('curricula'));
router.post('/academics/curricula',  c.createItem('curricula'));
router.patch('/academics/curricula/:id',  c.updateItem('curricula'));
router.delete('/academics/curricula/:id', c.deleteItem('curricula'));

// ─── Students ────────────────────────────────────────────────────────────────
router.get('/students',              c.getItems('students'));
router.post('/students',             enforceCrud('students', 'create'), enforcePlanLimit, c.createItem('students'));
router.patch('/students/:id',        enforceCrud('students', 'update'), c.updateItem('students'));
router.delete('/students/:id',       enforceCrud('students', 'delete'), c.deleteItem('students'));
router.post('/students/bulk',        enforceCrud('students', 'create'), enforcePlanLimit, c.bulkCreate('students'));

// ─── Automatic registration / employee numbers ───────────────────────────────
// Settings → Registration Numbers. Anyone can read the rule (the add forms need to know
// whether the number is automatic, and what comes next); only admins can change it.
const NUMBER_KINDS: NumberKind[] = ['student', 'staff'];
const numberingView = async (db: Db) => {
    const out: any = {};
    for (const k of NUMBER_KINDS) { const rule = await getRule(db, k); out[k] = { ...rule, preview: previewNext(rule) }; }
    return out;
};
router.get('/settings/numbering', async (req, res) => {
    try { res.json(await numberingView(getRequestDb(req))); } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put('/settings/numbering', enforceCrud('settings', 'update'), async (req, res) => {
    try {
        const db = getRequestDb(req);
        for (const k of NUMBER_KINDS) if (req.body?.[k]) await saveRule(db, k, req.body[k]);
        res.json(await numberingView(db));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Student lifecycle status (Active / Transferred / Graduated) ─────────────
// See lib/studentStatus.ts: Transferred / Graduated students are taken out of their class
// (the class they left is kept), and Active puts them back.
const actorName = (req: any) => { const u = req.tenantContext?.user || {}; return u.name || u.staffId || 'admin'; };
const loadStudent = async (req: Request, db: Db) => {
    let oid: ObjectId;
    try { oid = new ObjectId(req.params.id); } catch { return { error: 'Invalid student id' as const }; }
    const scope = await resolveScope(req, db);
    const student: any = await db.collection('students').findOne(mergeFilter({ _id: oid }, scopeForCollection('students', scope)));
    return student ? { student, oid } : { error: 'Student not found' as const };
};

router.post('/students/:id/status', enforceCrud('students', 'update'), async (req, res) => {
    try {
        const db = getRequestDb(req);
        const status = STUDENT_STATUSES.find(s => s.toLowerCase() === String(req.body?.status || '').toLowerCase());
        if (!status) return res.status(400).json({ message: `Status must be one of: ${STUDENT_STATUSES.join(', ')}` });
        const found = await loadStudent(req, db);
        if ('error' in found) return res.status(found.error === 'Student not found' ? 404 : 400).json({ message: found.error });

        const { update, nothingToDo } = buildStatusUpdate(found.student, status, { reason: req.body?.reason, by: actorName(req) });
        if (nothingToDo) return res.json({ message: `Student is already ${status}`, status });
        await db.collection('students').updateOne({ _id: found.oid }, update);
        res.json({ message: `Student marked ${status}`, status });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Transfer to another school (with transfer letter) ───────────────────────
// Body: { toSchool, date?, reason?, mode: 'draft' | 'permanent' }
//   draft      the details and letter are saved, but the student stays Active in their class
//   permanent  the student is marked Transferred and taken out of their class
// Either way the student gets a `transfer` record (reference number, destination school, date,
// reason) that the transfer letter is generated from.
router.post('/students/:id/transfer', enforceCrud('students', 'update'), async (req, res) => {
    try {
        const db = getRequestDb(req);
        const found = await loadStudent(req, db);
        if ('error' in found) return res.status(found.error === 'Student not found' ? 404 : 400).json({ message: found.error });
        const { student, oid } = found;

        const toSchool = String(req.body?.toSchool || '').trim();
        if (!toSchool) return res.status(400).json({ message: 'Enter the school the student is transferring to.' });
        const mode = req.body?.mode === 'permanent' ? 'permanent' : 'draft';
        const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date || '')) ? String(req.body.date) : new Date().toISOString().slice(0, 10);
        const reason = String(req.body?.reason || '').trim();
        const wasTransferred = canonicalStatus(student.status) === 'Transferred';
        if (mode === 'draft' && wasTransferred) return res.status(409).json({ message: 'This student is already transferred — edit the transfer details instead.' });

        const old = student.transfer || {};
        const now = new Date();
        const transfer = {
            refNo: old.refNo || await nextTransferRef(db),      // one reference number per transfer, kept across edits
            toSchool, date, reason,
            status: mode === 'permanent' ? 'completed' : 'draft',
            preparedBy: old.preparedBy || actorName(req), preparedAt: old.preparedAt || now,
            ...(mode === 'permanent' ? { completedBy: actorName(req), completedAt: now } : {}),
        };

        if (mode === 'draft') {
            await db.collection('students').updateOne({ _id: oid }, { $set: { transfer, updatedAt: now } });
            return res.json({ message: 'Transfer saved as a draft', transfer, status: canonicalStatus(student.status) });
        }
        const { update } = buildStatusUpdate(student, 'Transferred', { reason: reason || `Transferred to ${toSchool}`, by: actorName(req), extraSet: { transfer } });
        await db.collection('students').updateOne({ _id: oid }, update);
        res.json({ message: `Student transferred to ${toSchool}`, transfer, status: 'Transferred' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Throw away a draft (a completed transfer is undone by setting the student back to Active).
router.delete('/students/:id/transfer', enforceCrud('students', 'update'), async (req, res) => {
    try {
        const db = getRequestDb(req);
        const found = await loadStudent(req, db);
        if ('error' in found) return res.status(found.error === 'Student not found' ? 404 : 400).json({ message: found.error });
        if (found.student.transfer?.status !== 'draft') return res.status(409).json({ message: 'Only a draft transfer can be discarded.' });
        await db.collection('students').updateOne({ _id: found.oid }, { $unset: { transfer: '' }, $set: { updatedAt: new Date() } });
        res.json({ message: 'Draft discarded' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Student trash (soft delete) ─────────────────────────────────────────────
// DELETE /students/:id moves the record into `archives` (see deleteItem), which hides
// it everywhere. These endpoints list that trash, restore from it, or erase for good.
// Credentials are never sent to the browser. Scoped users only see their own students.
const trashQuery = async (req: Request, db: Db, extra: any = {}) => {
    const scope = await resolveScope(req, db);
    return mergeFilter({ originalCollection: 'students', ...extra }, scopeForCollection('students', scope));
};
const toObjectId = (id: string): ObjectId | null => { try { return new ObjectId(id); } catch { return null; } };

router.get('/students/trash', enforceCrud('students', 'delete'), async (req, res) => {
    try {
        const db = getRequestDb(req);
        const items = await db.collection('archives')
            .find(await trashQuery(req, db), { projection: { portalPassword: 0, parentPortalPassword: 0 } })
            .sort({ deletedAt: -1 }).toArray();
        res.json(items);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/students/trash/:id/restore', enforceCrud('students', 'delete'), async (req, res) => {
    try {
        const db = getRequestDb(req);
        const oid = toObjectId(req.params.id);
        if (!oid) return res.status(400).json({ message: 'Invalid id' });
        const archived: any = await db.collection('archives').findOne(await trashQuery(req, db, { _id: oid }));
        if (!archived) return res.status(404).json({ message: 'Deleted student not found in trash' });

        const { _id, originalCollection, archivedId, deletedAt, deletedBy, ...data } = archived;
        if (data.registrationNo && await db.collection('students').findOne({ registrationNo: data.registrationNo })) {
            return res.status(409).json({ message: `Another student already has registration number ${data.registrationNo}. Change or remove it first.` });
        }
        await db.collection('students').insertOne({ ...data, _id: archivedId || _id, restoredAt: new Date() });
        await db.collection('archives').deleteOne({ _id });
        res.json({ message: 'Student restored' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Delete for good (emptying the trash) needs the school administrator's password + an emailed code ───
// Step 1  POST /students/trash/purge/request  { ids, password }  → checks the administrator's password,
//         then emails a 6-digit code to the administrator.
// Step 2  POST /students/trash/purge/confirm  { ids, otp }       → checks the code, then deletes.
// (There is deliberately no single-call delete: the API can't be used to skip the checks.)
const purgeIds = (raw: any): string[] => Array.from(new Set((Array.isArray(raw) ? raw : []).map((x: any) => String(x)).filter((x: string) => !!toObjectId(x)))).slice(0, 200);
const purgeWho = (req: Request) => { const u = (req as any).tenantContext?.user || {}; return String(u.staffId || u.name || 'admin'); };

router.post('/students/trash/purge/request', enforceCrud('students', 'delete'), async (req, res) => {
    try {
        const db = getRequestDb(req), meta = getMetaDb();
        const tenantId = String((req as any).tenantContext?.tenantId || '');
        if (!tenantId) return res.status(400).json({ message: 'No school context.' });
        const ids = purgeIds(req.body?.ids);
        if (!ids.length) return res.status(400).json({ message: 'Choose the students to delete.' });
        const password = String(req.body?.password || '');
        if (!password) return res.status(400).json({ message: 'Enter the school administrator\'s password.' });

        if (await passwordLocked(meta, tenantId)) return res.status(429).json({ message: 'Too many wrong passwords. Try again in 15 minutes.' });
        const admin = await findSchoolAdmin(meta, tenantId);
        if (!admin?.email || !admin.passwordHash) return res.status(409).json({ message: 'No school administrator account was found for this school.' });
        if (!(await bcrypt.compare(password, admin.passwordHash))) {
            await recordPasswordFailure(meta, tenantId, purgeWho(req));
            return res.status(401).json({ message: 'That is not the school administrator\'s password.' });
        }

        // the students must be in this user's trash
        const found: any[] = await db.collection('archives').find(await trashQuery(req, db, { _id: { $in: ids.map(i => new ObjectId(i)) } }), { projection: { studentName: 1, name: 1, registrationNo: 1 } }).toArray();
        if (found.length !== ids.length) return res.status(404).json({ message: 'Some of these students are no longer in the trash.' });

        const requester = purgeWho(req);
        const code = await issueOtp(meta, { tenantId, requester, ids, adminEmail: admin.email });
        const names = found.slice(0, 8).map(s => `${s.studentName || s.name || 'Student'}${s.registrationNo ? ` (${s.registrationNo})` : ''}`);
        const by = (req as any).tenantContext?.user?.name || 'a user';
        const html = `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:480px;margin:auto">
            <h2 style="color:#dc2626">Confirm permanent deletion</h2>
            <p>${by} asked to permanently delete <b>${found.length}</b> student${found.length === 1 ? '' : 's'} from your school:</p>
            <ul>${names.map(n => `<li>${n}</li>`).join('')}${found.length > names.length ? `<li>…and ${found.length - names.length} more</li>` : ''}</ul>
            <p>Your verification code is:</p>
            <p style="font-size:30px;font-weight:900;letter-spacing:6px;color:#dc2626">${code}</p>
            <p style="color:#6b7280;font-size:13px">It expires in ${OTP_TTL_MIN} minutes. Permanent deletion cannot be undone. If you did not expect this, do not share the code — change your password.</p></div>`;
        const text = `ShuleCloud: code to permanently delete ${found.length} student(s): ${code}. Expires in ${OTP_TTL_MIN} minutes. If you did not expect this, do not share it.`;
        const sent = await notifyOwner({ email: admin.email }, 'Confirm permanent deletion of students', html, text);
        if (!sent.email) {
            await cancelOtps(meta, tenantId, requester);
            return res.status(502).json({ message: 'We could not email the verification code. Ask ShuleCloud support to check the email settings, then try again.' });
        }
        res.json({ sentTo: maskEmail(admin.email), expiresInMinutes: OTP_TTL_MIN });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/students/trash/purge/confirm', enforceCrud('students', 'delete'), async (req, res) => {
    try {
        const db = getRequestDb(req), meta = getMetaDb();
        const tenantId = String((req as any).tenantContext?.tenantId || '');
        const ids = purgeIds(req.body?.ids);
        if (!tenantId || !ids.length) return res.status(400).json({ message: 'Choose the students to delete.' });

        const check = await verifyOtp(meta, { tenantId, requester: purgeWho(req), ids, code: String(req.body?.otp || '') });
        if (!check.ok) {
            const msg = check.reason === 'wrong' ? `That code is not right. ${check.attemptsLeft} ${check.attemptsLeft === 1 ? 'try' : 'tries'} left.`
                : check.reason === 'locked' ? 'Too many wrong codes. Start again to get a new code.'
                : check.reason === 'expired' ? 'That code has expired. Start again to get a new one.'
                : 'No active code for this deletion. Start again to get a new one.';
            return res.status(check.reason === 'locked' ? 429 : 400).json({ message: msg, reason: check.reason });
        }

        const q = await trashQuery(req, db, { _id: { $in: ids.map(i => new ObjectId(i)) } });
        const doomed: any[] = await db.collection('archives').find(q, { projection: { studentName: 1, name: 1, registrationNo: 1 } }).toArray();
        const r = await db.collection('archives').deleteMany(q);
        await db.collection('audit_logs').insertOne({
            action: 'PERMANENT_DELETE_STUDENTS', collection: 'students', changedBy: purgeWho(req), changedByName: (req as any).tenantContext?.user?.name || '',
            changedAt: new Date(), count: r.deletedCount, students: doomed.map(s => ({ name: s.studentName || s.name, registrationNo: s.registrationNo })),
            verifiedWith: 'school administrator password + emailed code',
        }).catch(() => {});
        res.json({ message: `${r.deletedCount} student${r.deletedCount === 1 ? '' : 's'} permanently deleted`, deleted: r.deletedCount });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Staff ───────────────────────────────────────────────────────────────────
router.get('/staff',                 c.getItems('staff'));
router.get('/staff/:id',             async (req, res) => {
    try {
        const db = getRequestDb(req);
        const item = await db.collection('staff').findOne({ _id: new ObjectId(req.params.id) });
        if (!item) return res.status(404).json({ message: 'Staff not found' });
        res.json(item);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/staff',                enforceCrud('employees', 'create'), c.createItem('staff'));
router.patch('/staff/:id',           enforceCrud('employees', 'update'), c.updateItem('staff'));
router.put('/staff/:id',             enforceCrud('employees', 'update'), c.updateItem('staff'));
router.delete('/staff/:id',          enforceCrud('employees', 'delete'), c.deleteItem('staff'));
router.post('/staff/bulk',           enforceCrud('employees', 'create'), c.bulkCreate('staff'));

// ─── Tenant Profile ──────────────────────────────────────────────────────────
router.get('/tenant_profile',        c.getItems('tenant_profile'));

// ─── Rules & Regulations ─────────────────────────────────────────────────────
router.get('/rules_regulations',     c.getItems('rules_regulations'));
router.post('/rules_regulations',    c.createItem('rules_regulations'));
router.patch('/rules_regulations/:id', c.updateItem('rules_regulations'));

// ─── Marks ───────────────────────────────────────────────────────────────────
router.get('/marks',                 c.getItems('marks'));
router.post('/marks',                c.createItem('marks'));
router.patch('/marks/:id',           c.updateItem('marks'));
router.delete('/marks/:id',          c.deleteItem('marks'));

router.get('/assessments/marks/:examId', c.getItems('marks'));

// ─── Audit Trails ─────────────────────────────────────────────────────────────
router.get('/audit_trails',             c.getItems('audit_trails'));
router.get('/audit-trails',             c.getItems('audit_trails'));
router.get('/academics/audit_trails',   c.getItems('audit_trails'));
router.get('/academics/audit-trails',   c.getItems('audit_trails'));

// ─── Other Collections ────────────────────────────────────────────────────────
// Collection → sidebar module key, for CRUD enforcement on the generic routes.
// Only collections with sensitive writes are gated; others stay admin-only by
// virtue of the module not being visible to non-admins.
const COLLECTION_MODULE: Record<string, string> = {
    classes: 'classes', streams: 'classes', levels: 'classes', sessions: 'classes',
    invoices: 'fees', fee_particulars: 'fees', fee_structures: 'fees', discount_types: 'fees', fee_accounts: 'fees', transactions: 'fees',
    chart_of_accounts: 'accounts', income: 'accounts', expenses: 'accounts',
    enrollments: 'students', admissions: 'students', parents: 'students',
    student_transfers: 'students', student_discipline: 'students', student_medical: 'students', student_documents: 'students',
    homework: 'academics_content', lesson_plans: 'academics_content', schemes_of_work: 'academics_content', academic_resources: 'academics_content', academic_assignments: 'academics_content',
    timetable_periods: 'timetable', timetables: 'timetable', timetable_slots: 'timetable', rooms: 'timetable', weekdays: 'timetable',
    transport_zones: 'transport', buses: 'transport',
    hostels: 'hostel', hostel_rooms: 'hostel', hostel_beds: 'hostel', hostel_allocations: 'hostel', hostel_fees: 'hostel',
    announcements: 'communications', sms_logs: 'communications', email_logs: 'communications', whatsapp_logs: 'communications',
    lms_courses: 'live_class', lms_lessons: 'live_class', lms_quizzes: 'live_class',
};

['enrollments','transactions','invoices','classes','streams','sessions','levels','staff_subjects','chart_of_accounts','income','expenses','fee_particulars','fee_structures','periods','discount_types','fee_accounts','theme_settings','homework','weekdays','timetable_periods','rooms','timetables','timetable_slots','substitutions','constraints','transport_zones','buses','transport_settings','live_meetings','curriculum_frameworks','academic_resources','academic_assignments','lesson_plans','schemes_of_work','student_transfers','student_discipline','student_medical','student_documents','hostels','hostel_rooms','hostel_beds','hostel_allocations','hostel_attendance_records','hostel_fees','hostel_settings','announcements','sms_logs','email_logs','messages','message_threads','communication_settings','integration_settings','lms_courses','lms_lessons','lms_quizzes','lms_quiz_attempts','lms_enrollments','role_permissions','admissions','roles','stream_templates','grade_templates','curriculum_settings','report_card_generations','portal_requisitions','portal_clearances','portal_registrations','parents','notification_settings','communication_prefs','email_logs','whatsapp_logs','term_settings','term_breaks','term_holidays','term_activities','assets','attendance','audit_logs','login_logs','leave_requests','salary_payments','purchases','student_enrollments','library_members','library_books','library_issues','pos_products','pos_orders','transport_pickups','form_templates','mpesa_c2b_payments','accounting_journals'].forEach(col => {
    const mk = COLLECTION_MODULE[col];
    const cr = mk ? [enforceCrud(mk, 'create')] : [];
    const up = mk ? [enforceCrud(mk, 'update')] : [];
    const de = mk ? [enforceCrud(mk, 'delete')] : [];

    router.get(`/${col}`,    c.getItems(col));
    router.get(`/${col}/:id`, c.getItem(col));
    router.post(`/${col}`,   ...cr, c.createItem(col));
    router.patch(`/${col}/:id`,  ...up, c.updateItem(col));
    router.delete(`/${col}/:id`, ...de, c.deleteItem(col));

    router.get(`/academics/${col}`,    c.getItems(col));
    router.get(`/academics/${col}/:id`, c.getItem(col));
    router.post(`/academics/${col}`,   ...cr, c.createItem(col));
    router.patch(`/academics/${col}/:id`,  ...up, c.updateItem(col));
    router.delete(`/academics/${col}/:id`, ...de, c.deleteItem(col));
});

// Effective grading scale for a class: the class-specific grading_criteria if one
// exists, otherwise the global (classId-less) record. Used by report cards / mark
// sheets so each class can have its own grading or share one global scale.
router.get('/grading-scale', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const classId = String(req.query.classId || '').trim();
        let rec: any = null;
        if (classId) rec = await db.collection('grading_criteria').findOne({ classId }).catch(() => null);
        let scope: 'class' | 'global' = 'class';
        if (!rec) { rec = await db.collection('grading_criteria').findOne({ $or: [{ classId: { $exists: false } }, { classId: null }, { classId: '' }] }).catch(() => null); scope = 'global'; }
        if (!rec) rec = await db.collection('grading_criteria').findOne({}).catch(() => null);
        const grades = (rec?.grades || rec?.gradingScale || []).map((g: any) => ({
            grade: g.grade ?? g.name ?? g.label ?? '',
            from: Number(g.from ?? g.minPercent ?? g.min ?? 0),
            upto: Number(g.upto ?? g.maxPercent ?? g.max ?? 100),
            remark: g.remark ?? g.status ?? g.label ?? '',
        })).sort((a: any, b: any) => b.upto - a.upto);
        res.json({ scope: rec ? scope : 'none', classId: classId || null, grades, passMark: Number(rec?.failCriteria?.overallPercent ?? rec?.passMark ?? 50) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Bulk-create hostel beds (the generic CRUD has no /:col/bulk route).
router.post('/hostel_beds/bulk', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const items = Array.isArray(req.body?.items) ? req.body.items : [];
        if (!items.length) return res.status(400).json({ message: 'No beds to create' });
        const docs = items.map((b: any) => ({ ...b, isOccupied: !!b.isOccupied, createdAt: new Date() }));
        const r = await db.collection('hostel_beds').insertMany(docs);
        res.status(201).json({ insertedCount: r.insertedCount });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/academics/periods/:id/set-current', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        await db.collection('periods').updateMany({}, { $set: { isCurrent: false } });
        const result = await db.collection('periods').updateOne(
            { _id: new ObjectId(id) },
            { $set: { isCurrent: true, updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ message: 'Period not found' });
        res.json({ message: 'Period set as current and active' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Archive Governance ───────────────────────────────────────────────────────
router.get('/archives',                c.getArchives);
router.post('/archives/restore/:id',   c.restoreFromArchive);
router.delete('/archives/clear',       c.clearArchives);

// ─── Reporting ────────────────────────────────────────────────────────────────
router.get('/reports/exam/:examId',    c.getExamReport);

// ─── Assessment questions (Legacy Alias) ───────────────────────────────────
router.get('/assessments/questions',   c.getItems('questions'));
router.post('/assessments/questions',  c.createItem('questions'));

// ─── Module 1: Subject Chapters ──────────────────────────────────────────────
router.get('/chapters',                c.getItems('chapters'));
router.post('/chapters',               c.createItem('chapters'));
router.get('/chapters/:id',            c.getItem('chapters'));
router.put('/chapters/:id',            c.updateItem('chapters'));
router.delete('/chapters/:id',         c.deleteItem('chapters'));
router.patch('/chapters/:id/archive', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('chapters').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: 'Archived', updatedAt: new Date() } }
        );
        res.json({ message: 'Chapter archived successfully' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.patch('/chapters/reorder', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { items } = req.body;
        if (!Array.isArray(items)) return res.status(400).json({ message: 'Items array required' });
        for (const item of items) {
            if (item._id) {
                await db.collection('chapters').updateOne(
                    { _id: new ObjectId(item._id) },
                    { $set: { order: item.order, updatedAt: new Date() } }
                );
            }
        }
        res.json({ message: 'Chapters reordered successfully' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Module 2: Question Bank ─────────────────────────────────────────────────
router.patch('/questions/:id/approve', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('questions').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { approvalStatus: 'Approved', updatedAt: new Date() } }
        );
        res.json({ message: 'Question approved successfully' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.patch('/questions/:id/reject', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('questions').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { approvalStatus: 'Rejected', updatedAt: new Date() } }
        );
        res.json({ message: 'Question rejected successfully' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/questions/random', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const count = parseInt(req.query.count as string) || 5;
        const match: any = {};
        if (req.query.subjectId) match.subjectId = req.query.subjectId;
        if (req.query.chapterId) match.chapterId = req.query.chapterId;
        if (req.query.classId) match.classId = req.query.classId;
        if (req.query.difficulty) match.difficulty = req.query.difficulty;
        if (req.query.questionType) match.questionType = req.query.questionType;

        const items = await db.collection('questions').aggregate([
            { $match: match },
            { $sample: { size: count } }
        ]).toArray();
        res.json(items);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Module 3: Create Question Paper ─────────────────────────────────────────
router.get('/question-papers',         c.getItems('question_papers'));
router.post('/question-papers',        c.createItem('question_papers'));
router.get('/question-papers/:id',     c.getItem('question_papers'));
router.put('/question-papers/:id',     c.updateItem('question_papers'));
router.delete('/question-papers/:id',  c.deleteItem('question_papers'));

router.post('/question-papers/generate', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { paperTitle, examId, classId, subjectId, duration, instructions, totalMarks, blueprint } = req.body;

        const match: any = {};
        if (subjectId) match.subjectId = subjectId;
        if (classId) match.classId = classId;
        const allQuestions = await db.collection('questions').find(match).toArray();

        let generatedQuestions: any[] = [];
        if (blueprint && Array.isArray(blueprint) && blueprint.length > 0) {
            blueprint.forEach((bp: any) => {
                const qs = allQuestions.filter(q =>
                    q.difficulty === bp.difficulty && q.questionType === bp.questionType
                );
                const shuffled = [...qs].sort(() => 0.5 - Math.random());
                generatedQuestions.push(...shuffled.slice(0, bp.count || 1));
            });
        } else {
            generatedQuestions = [
                ...allQuestions.filter(q => q.difficulty === 'EASY').slice(0, 4),
                ...allQuestions.filter(q => q.difficulty === 'MEDIUM').slice(0, 4),
                ...allQuestions.filter(q => q.difficulty === 'HARD').slice(0, 2),
            ];
        }

        const calcTotalMarks = generatedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 5), 0);
        const data = {
            paperTitle: paperTitle || 'Generated Examination Paper',
            examId, classId, subjectId,
            duration: duration || 120,
            instructions: instructions || 'Answer all questions in the provided booklet.',
            totalMarks: totalMarks || calcTotalMarks,
            sections: [
                { sectionName: 'Section A (Compulsory)', questions: generatedQuestions.slice(0, Math.ceil(generatedQuestions.length / 2)) },
                { sectionName: 'Section B (Core Analysis)', questions: generatedQuestions.slice(Math.ceil(generatedQuestions.length / 2)) }
            ],
            generatedQuestions,
            status: 'Draft', approvalStatus: 'Pending',
            createdAt: new Date(), version: '1.0'
        };

        const result = await db.collection('question_papers').insertOne(data);
        res.status(201).json({ id: result.insertedId, ...data });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/question-papers/preview', async (req, res) => {
    res.json({ message: 'Live high-fidelity preview generated successfully', previewData: req.body });
});
router.get('/question-papers/export/pdf', async (_req, res) => {
    res.json({ message: 'PDF Export stream initialized with institutional watermarks' });
});
router.get('/question-papers/export/word', async (_req, res) => {
    res.json({ message: 'Word DOCX Export stream initialized' });
});
router.patch('/question-papers/:id/publish', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('question_papers').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: 'Published', updatedAt: new Date() } }
        );
        res.json({ message: 'Question paper published successfully' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.patch('/question-papers/:id/approve', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('question_papers').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { approvalStatus: 'Approved', updatedAt: new Date() } }
        );
        res.json({ message: 'Question paper approved by Examination Board' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Settings: Bank Accounts ──────────────────────────────────────────────────
router.get('/settings/bank-accounts', c.getItems('fee_accounts'));
router.post('/settings/bank-accounts', c.createItem('fee_accounts'));
router.patch('/settings/bank-accounts/:id', c.updateItem('fee_accounts'));
router.delete('/settings/bank-accounts/:id', c.deleteItem('fee_accounts'));

// ─── Settings: Gateways ───────────────────────────────────────────────────────
router.get('/settings/gateways/:type', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { type } = req.params;
        const gateway = await db.collection('gateways').findOne({ type });
        if (!gateway) return res.json(null);

        const config = { ...gateway.config };
        if (type === 'payhero' && config.apiKey) {
            config.apiKey = maskKey(decrypt(config.apiKey));
        } else if (type === 'daraja') {
            if (config.consumerKey) config.consumerKey = maskKey(decrypt(config.consumerKey));
            if (config.consumerSecret) config.consumerSecret = maskKey(decrypt(config.consumerSecret));
            if (config.passkey) config.passkey = maskKey(decrypt(config.passkey));
        } else if (type === 'stripe') {
            if (config.secretKey) config.secretKey = maskKey(decrypt(config.secretKey));
            if (config.webhookSecret) config.webhookSecret = maskKey(decrypt(config.webhookSecret));
        }
        res.json({ isEnabled: gateway.isEnabled, ...config });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

router.post('/settings/gateways/:type', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { type } = req.params;
        const { isEnabled, ...config } = req.body;
        const existing = await db.collection('gateways').findOne({ type });
        const existingConfig = existing?.config || {};

        const encryptField = (field: string) => {
            if (config[field]) {
                config[field] = config[field].includes('••••••••••••')
                    ? existingConfig[field]
                    : encrypt(config[field]);
            }
        };
        if (type === 'payhero') { encryptField('apiKey'); }
        else if (type === 'daraja') { encryptField('consumerKey'); encryptField('consumerSecret'); encryptField('passkey'); }
        else if (type === 'stripe') { encryptField('secretKey'); encryptField('webhookSecret'); }

        await db.collection('gateways').updateOne(
            { type },
            { $set: { isEnabled, config, updatedAt: new Date() } },
            { upsert: true }
        );
        res.json({ message: 'Gateway updated successfully' });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// ─── Online Store & POS ───────────────────────────────────────────────────────

router.get('/pos/categories',           c.getItems('pos_categories'));
router.get('/pos/categories/:id',       c.getItem('pos_categories'));
router.post('/pos/categories',          c.createItem('pos_categories'));
router.patch('/pos/categories/:id',     c.updateItem('pos_categories'));
router.delete('/pos/categories/:id',    c.deleteItem('pos_categories'));

router.get('/pos/taxes',                c.getItems('pos_taxes'));
router.get('/pos/taxes/:id',            c.getItem('pos_taxes'));
router.post('/pos/taxes',               c.createItem('pos_taxes'));
router.patch('/pos/taxes/:id',          c.updateItem('pos_taxes'));
router.delete('/pos/taxes/:id',         c.deleteItem('pos_taxes'));

router.get('/pos/products',             c.getItems('pos_products'));
router.get('/pos/products/:id',         c.getItem('pos_products'));
router.patch('/pos/products/:id',       c.updateItem('pos_products'));
router.delete('/pos/products/:id',      c.deleteItem('pos_products'));

router.post('/pos/products', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { name, sku } = req.body;
        if (!name) return res.status(400).json({ message: 'Product name is required' });
        if (sku) {
            const exists = await db.collection('pos_products').findOne({ sku });
            if (exists) return res.status(400).json({ message: `SKU "${sku}" already exists` });
        }
        const result = await db.collection('pos_products').insertOne({ ...req.body, createdAt: new Date() });
        res.status(201).json({ id: result.insertedId, ...req.body });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/pos/orders',               c.getItems('pos_orders'));
router.get('/pos/orders/:id',           c.getItem('pos_orders'));
router.patch('/pos/orders/:id',         c.updateItem('pos_orders'));
router.delete('/pos/orders/:id',        c.deleteItem('pos_orders'));

router.post('/pos/orders', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { items, paymentMethod, paymentRef, customerName, discount = 0, notes } = req.body;
        if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Order must have at least one item' });

        let subtotal = 0, taxTotal = 0;
        const processedItems = items.map((item: any) => {
            const itemSub = Number(item.unitPrice) * Number(item.qty);
            const itemTax = Math.round(itemSub * ((Number(item.taxRate) || 0) / 100) * 100) / 100;
            subtotal += itemSub; taxTotal += itemTax;
            return { ...item, subtotal: itemSub, taxAmount: itemTax };
        });
        const total = Math.round((subtotal + taxTotal - Number(discount)) * 100) / 100;
        const count = await db.collection('pos_orders').countDocuments();
        const orderNo = `ORD-${String(count + 1).padStart(5, '0')}`;

        const order = {
            orderNo, items: processedItems,
            subtotal: Math.round(subtotal * 100) / 100,
            taxTotal: Math.round(taxTotal * 100) / 100,
            discount: Number(discount), total,
            paymentMethod: paymentMethod || 'CASH', paymentRef: paymentRef || '',
            customerName: customerName || 'Walk-in', notes: notes || '',
            status: 'COMPLETED', source: 'POS', createdAt: new Date(),
        };
        const result = await db.collection('pos_orders').insertOne(order);

        for (const item of items) {
            if (item.productId) {
                try {
                    await db.collection('pos_products').updateOne(
                        { _id: new ObjectId(item.productId) },
                        { $inc: { stock: -Number(item.qty) }, $set: { updatedAt: new Date() } }
                    );
                } catch (_) {}
            }
        }
        res.status(201).json({ id: result.insertedId, ...order });
    } catch (e: any) { console.error('[POS] order error:', e); res.status(500).json({ message: e.message }); }
});

router.patch('/pos/orders/:id/cancel', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const order: any = await db.collection('pos_orders').findOne({ _id: new ObjectId(req.params.id) });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.status === 'CANCELLED') return res.status(400).json({ message: 'Already cancelled' });
        await db.collection('pos_orders').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: 'CANCELLED', updatedAt: new Date() } }
        );
        for (const item of (order.items || [])) {
            if (item.productId) {
                try {
                    await db.collection('pos_products').updateOne(
                        { _id: new ObjectId(item.productId) },
                        { $inc: { stock: Number(item.qty) }, $set: { updatedAt: new Date() } }
                    );
                } catch (_) {}
            }
        }
        res.json({ message: 'Order cancelled and stock restored' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/pos/analytics', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const days = parseInt(req.query.period as string) || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const orders = await db.collection('pos_orders').find({
            createdAt: { $gte: since }, status: { $ne: 'CANCELLED' }
        }).toArray();

        const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
        const totalOrders = orders.length;
        const totalItems = orders.reduce((s: number, o: any) => s + (o.items || []).reduce((a: number, i: any) => a + Number(i.qty), 0), 0);

        const paymentBreakdown: Record<string, number> = {};
        orders.forEach((o: any) => { paymentBreakdown[o.paymentMethod || 'CASH'] = (paymentBreakdown[o.paymentMethod || 'CASH'] || 0) + (o.total || 0); });

        const productMap: Record<string, any> = {};
        orders.forEach((o: any) => { (o.items || []).forEach((item: any) => { const k = item.productName || 'Unknown'; if (!productMap[k]) productMap[k] = { name: k, qty: 0, revenue: 0 }; productMap[k].qty += Number(item.qty); productMap[k].revenue += Number(item.subtotal || 0); }); });
        const topProducts = Object.values(productMap).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 8);

        const dailyMap: Record<string, number> = {};
        orders.forEach((o: any) => { const day = new Date(o.createdAt).toISOString().split('T')[0]; dailyMap[day] = (dailyMap[day] || 0) + (o.total || 0); });
        const daily = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date: date.slice(5), revenue }));

        const lowStock = await db.collection('pos_products').find({ stock: { $lte: 5 }, isActive: { $ne: false } }).project({ name: 1, stock: 1, sku: 1 }).toArray();
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter((o: any) => new Date(o.createdAt) >= todayStart);
        const todayRevenue = todayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

        res.json({ totalRevenue, totalOrders, totalItems, todayRevenue, todayOrders: todayOrders.length, paymentBreakdown, topProducts, daily, lowStock });
    } catch (e: any) { console.error('[POS] analytics error:', e); res.status(500).json({ message: e.message }); }
});

// ─── Hostel: Allocate student to bed ─────────────────────────────────────────
router.post('/hostel/allocate', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { studentId, studentName, admissionNo, studentClass, bedId, roomId, roomNumber, hostelId, hostelName, fee, notes } = req.body;
        if (!studentId || !bedId) return res.status(400).json({ message: 'Student and bed are required' });

        const bed = await db.collection('hostel_beds').findOne({ _id: new ObjectId(bedId) });
        if (!bed) return res.status(404).json({ message: 'Bed not found' });
        if (bed.isOccupied) return res.status(400).json({ message: 'Bed is already occupied' });

        const existing = await db.collection('hostel_allocations').findOne({ studentId, status: 'Active' });
        if (existing) return res.status(400).json({ message: 'Student already has an active hostel allocation' });

        const allocation = {
            studentId, studentName, admissionNo: admissionNo || '', studentClass: studentClass || '',
            bedId, roomId, roomNumber, hostelId, hostelName,
            bedNumber: bed.bedNumber, allocationDate: new Date().toISOString().split('T')[0],
            vacateDate: null, status: 'Active', fee: Number(fee) || 0,
            paymentStatus: 'Unpaid', notes: notes || '', createdAt: new Date(),
        };
        const result = await db.collection('hostel_allocations').insertOne(allocation);
        await db.collection('hostel_beds').updateOne(
            { _id: new ObjectId(bedId) },
            { $set: { isOccupied: true, studentId, studentName, admissionNo: admissionNo || '', updatedAt: new Date() } }
        );
        res.status(201).json({ id: result.insertedId, ...allocation });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Allocate MANY students to the free beds of one room (fee comes from the room).
router.post('/hostel/allocate/bulk', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { studentIds, roomId, notes } = req.body;
        if (!Array.isArray(studentIds) || !studentIds.length || !roomId) return res.status(400).json({ message: 'studentIds[] and roomId are required' });

        const room: any = await db.collection('hostel_rooms').findOne({ _id: new ObjectId(roomId) }).catch(() => null)
            || await db.collection('hostel_rooms').findOne({ _id: roomId } as any);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        const roomFee = Number(room.fee ?? room.hostelFee ?? room.rent ?? 0);

        let freeBeds = await db.collection('hostel_beds').find({ roomId: String(roomId), isOccupied: { $ne: true } }).sort({ bedNumber: 1 }).toArray();
        if (!freeBeds.length) freeBeds = await db.collection('hostel_beds').find({ roomId: room._id, isOccupied: { $ne: true } } as any).sort({ bedNumber: 1 }).toArray();

        let allocated = 0, skipped = 0, noBed = 0;
        for (const studentId of studentIds) {
            const existing = await db.collection('hostel_allocations').findOne({ studentId, status: 'Active' });
            if (existing) { skipped++; continue; }
            const bed = freeBeds.shift();
            if (!bed) { noBed++; continue; }
            const student: any = await db.collection('students').findOne({ _id: new ObjectId(studentId) }).catch(() => null);
            const allocation = {
                studentId, studentName: student?.studentName || student?.name || '',
                admissionNo: student?.registrationNo || student?.admNo || '', studentClass: student?.studentClass || '',
                bedId: String(bed._id), roomId: String(room._id), roomNumber: room.roomNumber || room.name || room.number,
                hostelId: room.hostelId, hostelName: room.hostelName || room.blockName,
                bedNumber: bed.bedNumber, allocationDate: new Date().toISOString().split('T')[0],
                vacateDate: null, status: 'Active', fee: roomFee, paymentStatus: 'Unpaid', notes: notes || '', createdAt: new Date(),
            };
            await db.collection('hostel_allocations').insertOne(allocation);
            await db.collection('hostel_beds').updateOne({ _id: bed._id }, { $set: { isOccupied: true, studentId, studentName: allocation.studentName, updatedAt: new Date() } });
            allocated++;
        }
        res.json({ allocated, skipped, noBed });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/hostel/allocate/:id/vacate', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const alloc: any = await db.collection('hostel_allocations').findOne({ _id: new ObjectId(req.params.id) });
        if (!alloc) return res.status(404).json({ message: 'Allocation not found' });
        if (alloc.status === 'Vacated') return res.status(400).json({ message: 'Already vacated' });

        await db.collection('hostel_allocations').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: 'Vacated', vacateDate: new Date().toISOString().split('T')[0], updatedAt: new Date() } }
        );
        if (alloc.bedId) {
            try {
                await db.collection('hostel_beds').updateOne(
                    { _id: new ObjectId(alloc.bedId) },
                    { $set: { isOccupied: false, studentId: null, studentName: null, updatedAt: new Date() } }
                );
            } catch (_) {}
        }
        res.json({ message: 'Student vacated successfully' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/hostel/attendance/bulk', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { date, hostelId, hostelName, roomId, roomNumber, records, takenBy } = req.body;
        if (!date || !Array.isArray(records)) return res.status(400).json({ message: 'Date and records are required' });
        const doc = { date, hostelId, hostelName, roomId: roomId || null, roomNumber: roomNumber || null, records, takenBy: takenBy || '', createdAt: new Date() };
        await db.collection('hostel_attendance_records').updateOne(
            { date, hostelId, roomId: roomId || null },
            { $set: { ...doc, updatedAt: new Date() } },
            { upsert: true }
        );
        res.json({ message: 'Hostel attendance saved' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/hostel/stats', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const [totalBeds, occupiedBeds, totalRooms, activeAllocations, hostels] = await Promise.all([
            db.collection('hostel_beds').countDocuments(),
            db.collection('hostel_beds').countDocuments({ isOccupied: true }),
            db.collection('hostel_rooms').countDocuments({ isActive: { $ne: false } }),
            db.collection('hostel_allocations').countDocuments({ status: 'Active' }),
            db.collection('hostels').find({ isActive: { $ne: false } }).toArray(),
        ]);
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = await db.collection('hostel_attendance_records').find({ date: today }).toArray();
        const todayPresent = todayAttendance.reduce((s: number, a: any) => s + (a.records || []).filter((r: any) => r.status === 'Present').length, 0);
        const todayTotal = todayAttendance.reduce((s: number, a: any) => s + (a.records || []).length, 0);
        const recentAllocations = await db.collection('hostel_allocations').find({ status: 'Active' }).sort({ createdAt: -1 }).limit(5).toArray();
        res.json({ totalBeds, occupiedBeds, availableBeds: totalBeds - occupiedBeds, totalRooms, activeAllocations, hostels, todayPresent, todayTotal, recentAllocations });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Portal Credentials ───────────────────────────────────────────────────────

router.patch('/students/:id/portal-credentials', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { portalUsername, portalPassword, credentialsGenerated } = req.body;
        if (portalUsername) {
            const selfId = new ObjectId(req.params.id);
            const [staffConflict, studentConflict, parentConflict] = await Promise.all([
                db.collection('staff').findOne({ portalUsername }),
                db.collection('students').findOne({ portalUsername, _id: { $ne: selfId } }),
                db.collection('students').findOne({ parentPortalUsername: portalUsername }),
            ]);
            if (staffConflict) return res.status(409).json({ message: `"${portalUsername}" is already used by a staff member` });
            if (studentConflict) return res.status(409).json({ message: `"${portalUsername}" is already taken by another student` });
            if (parentConflict) return res.status(409).json({ message: `"${portalUsername}" is already used as a parent username` });
        }
        const update: any = { updatedAt: new Date() };
        if (portalUsername) update.portalUsername = portalUsername;
        if (portalPassword) update.portalPassword = portalPassword;
        if (credentialsGenerated !== undefined) update.credentialsGenerated = credentialsGenerated;
        await db.collection('students').updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
        res.json({ message: 'Student portal credentials updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/staff/:id/portal-credentials', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { portalUsername, portalPassword, credentialsGenerated } = req.body;
        if (portalUsername) {
            const selfId = new ObjectId(req.params.id);
            const [studentConflict, staffConflict, parentConflict] = await Promise.all([
                db.collection('students').findOne({ portalUsername }),
                db.collection('staff').findOne({ portalUsername, _id: { $ne: selfId } }),
                db.collection('students').findOne({ parentPortalUsername: portalUsername }),
            ]);
            if (studentConflict) return res.status(409).json({ message: `"${portalUsername}" is already used by a student` });
            if (staffConflict) return res.status(409).json({ message: `"${portalUsername}" is already taken by another staff member` });
            if (parentConflict) return res.status(409).json({ message: `"${portalUsername}" is already used as a parent username` });
        }
        const update: any = { updatedAt: new Date() };
        if (portalUsername) update.portalUsername = portalUsername;
        if (portalPassword) update.portalPassword = portalPassword;
        if (credentialsGenerated !== undefined) update.credentialsGenerated = credentialsGenerated;
        await db.collection('staff').updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
        res.json({ message: 'Staff portal credentials updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/students/:id/parent-credentials', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { parentPortalUsername, parentPortalPassword, parentCredentialsGenerated } = req.body;
        if (parentPortalUsername) {
            const selfId = new ObjectId(req.params.id);
            const [staffConflict, studentConflict, parentConflict] = await Promise.all([
                db.collection('staff').findOne({ portalUsername: parentPortalUsername }),
                db.collection('students').findOne({ portalUsername: parentPortalUsername }),
                db.collection('students').findOne({ parentPortalUsername, _id: { $ne: selfId } }),
            ]);
            if (staffConflict) return res.status(409).json({ message: `"${parentPortalUsername}" is already used by a staff member` });
            if (studentConflict) return res.status(409).json({ message: `"${parentPortalUsername}" is already used by a student` });
            if (parentConflict) return res.status(409).json({ message: `"${parentPortalUsername}" is already used by another parent` });
        }
        const update: any = { updatedAt: new Date() };
        if (parentPortalUsername) update.parentPortalUsername = parentPortalUsername;
        if (parentPortalPassword) update.parentPortalPassword = parentPortalPassword;
        if (parentCredentialsGenerated !== undefined) update.parentCredentialsGenerated = parentCredentialsGenerated;
        await db.collection('students').updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
        res.json({ message: 'Parent portal credentials updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Transport: bus pickup / drop with optional parent notification ───────────
router.post('/transport/pickup', async (req, res) => {
    try {
        const db = getRequestDb(req);
        // type: 'pickup' | 'drop'. direction: 'to_school' | 'to_home' (the school
        // decides where the bus is headed). busReg: registration / number plate.
        const { studentId, studentName, type, busName, direction, busReg } = req.body || {};
        if (!studentId) return res.status(400).json({ message: 'studentId is required' });

        const student = await db.collection('students').findOne({ _id: new ObjectId(String(studentId)) }).catch(() => null);

        // Zone restriction: a Driver / Bus Attendant may only mark students in
        // their assigned zones.
        const zones = await accessibleZones(req, db);
        if (zones !== null && !zones.includes(student?.transportZone)) {
            return res.status(403).json({ message: "This student is not in a zone you're assigned to." });
        }

        const name = studentName || student?.studentName || 'Student';
        const at = new Date();

        // Record the event.
        await db.collection('transport_pickups').insertOne({
            studentId: String(studentId), studentName: name, studentClass: student?.currentClass || student?.studentClass || '',
            type: type === 'drop' ? 'drop' : 'pickup', busName: busName || '', at, createdAt: at,
        });

        // Notify the parent on the channels enabled in transport_settings.
        const settings: any = (await db.collection('transport_settings').findOne({})) || {};
        const verb = type === 'drop' ? 'dropped off' : 'picked up';
        // Always format in Kenyan time (Africa/Nairobi), not the server's timezone,
        // so parents see the correct local time even when the VPS runs in UTC.
        const timeStr = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
        // The bus is heading "to school" (picked from home) or "to home" (picked
        // from school). Default by event type if the school didn't specify.
        const goingHome = direction ? direction === 'to_home' : type === 'drop';
        const fromPlace = goingHome ? 'school' : 'home';
        // Brief, directional message + bus identifier (reg/plate, else bus name).
        const busId = busReg || busName || '';
        const msg = type === 'drop'
            ? `${name} has been dropped ${goingHome ? 'home' : 'at school'} by school bus${busId ? ` ${busId}` : ''} at ${timeStr}.`
            : `${name} has been picked from ${fromPlace} by school bus${busId ? ` ${busId}` : ''} at ${timeStr}.`;
        const email = student?.parentEmail || student?.fatherEmail || student?.motherEmail || '';
        const phone = student?.parentPhone || student?.fatherPhone || student?.motherPhone || student?.phone || '';

        const sent: string[] = [];
        try {
            if (settings.notifyEmail && email) { await sendEmail(db, { to: [email], subject: `Transport update — ${name}`, message: msg }); sent.push('email'); }
            if (settings.notifyWhatsapp && phone) {
                const { sendWhatsApp } = await import('../services/communications.service');
                await sendWhatsApp(db, { to: [phone], message: msg, schoolId: (req as any).tenantContext?.tenantId });
                sent.push('whatsapp');
            }
            if (settings.notifySms && phone) {
                // Actually send via the school's SMS gateway (Talksasa / device),
                // branded with the school name. Previously this only logged a row
                // and never sent anything.
                const tenant: any = (req as any).tenantContext;
                let schoolName = tenant?.tenantName || '';
                if (!schoolName) { try { const { getMetaDb } = await import('../lib/mongodb'); const t: any = tenant?.tenantId ? await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(String(tenant.tenantId)) }) : null; schoolName = t?.instituteName || t?.name || ''; } catch { /* ignore */ } }
                const { brandMessage } = await import('../services/talksasa.service');
                const branded = brandMessage(schoolName, msg);
                const { queueSms } = await import('../services/smsGateway.service');
                const sr: any = await queueSms(db, String(tenant?.tenantId || 'default'), [phone], branded, { audience: 'transport' });
                const ok = sr.provider === 'device' || sr.sent > 0;
                await db.collection('sms_logs').insertOne({ to: phone, message: branded, status: ok ? 'Sent' : 'Failed', purpose: 'transport', createdAt: at });
                if (ok) sent.push('sms');
            }
        } catch (e: any) { /* notification best-effort */ }

        res.json({ message: `Marked ${verb}`, notified: sent });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/transport/pickups', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const q: any = { at: { $gte: today } };
        const zones = await accessibleZones(req, db);
        if (zones !== null) q.busName = { $in: zones };   // drivers see only their zones' events
        const rows = await db.collection('transport_pickups').find(q).sort({ at: -1 }).limit(200).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Students the current user may handle on the bus. Admins → all students on
// transport; a Driver / Bus Attendant → only students in their assigned zones.
// Also returns `zones` (null = unrestricted) so the UI can hide the zone filter.
router.get('/transport/my-students', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const zones = await accessibleZones(req, db);
        const q: any = { transportZone: { $exists: true, $ne: '' } };
        if (zones !== null) q.transportZone = { $in: zones };
        const students = await db.collection('students').find(q)
            .project({ studentName: 1, registrationNo: 1, admNo: 1, transportZone: 1, currentClass: 1, studentClass: 1 })
            .toArray();
        res.json({ zones, students });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Academic Assignments: publish / close ────────────────────────────────────
router.patch('/academic_assignments/:id/publish', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('academic_assignments').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: 'Published', publishedAt: new Date(), updatedAt: new Date() } }
        );
        res.json({ message: 'Assignment published' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.patch('/academic_assignments/:id/close', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('academic_assignments').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: 'Closed', closedAt: new Date(), updatedAt: new Date() } }
        );
        res.json({ message: 'Assignment closed' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Library Module ───────────────────────────────────────────────────────────
const FINE_PER_DAY = 10;

router.get('/library/categories',           c.getItems('library_categories'));
router.get('/library/categories/:id',       c.getItem('library_categories'));
router.post('/library/categories',          c.createItem('library_categories'));
router.patch('/library/categories/:id',     c.updateItem('library_categories'));
router.delete('/library/categories/:id',    c.deleteItem('library_categories'));

router.get('/library/books',                c.getItems('library_books'));
router.get('/library/books/:id',            c.getItem('library_books'));
router.patch('/library/books/:id',          c.updateItem('library_books'));
router.delete('/library/books/:id',         c.deleteItem('library_books'));

router.post('/library/books', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { title, isbn } = req.body;
        if (!title) return res.status(400).json({ message: 'Book title is required' });
        if (isbn) {
            const exists = await db.collection('library_books').findOne({ isbn });
            if (exists) return res.status(400).json({ message: `ISBN "${isbn}" already exists` });
        }
        const totalCopies = Number(req.body.totalCopies) || 1;
        const book = { ...req.body, totalCopies, availableCopies: totalCopies, createdAt: new Date() };
        const result = await db.collection('library_books').insertOne(book);
        res.status(201).json({ id: result.insertedId, ...book });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/library/members',              c.getItems('library_members'));
router.get('/library/members/:id',          c.getItem('library_members'));
router.post('/library/members',             c.createItem('library_members'));
router.patch('/library/members/:id',        c.updateItem('library_members'));
router.delete('/library/members/:id',       c.deleteItem('library_members'));

router.get('/library/issues', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const query: any = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.memberId) query.memberId = req.query.memberId;
        if (req.query.bookId) query.bookId = req.query.bookId;

        const today = new Date(); today.setHours(0, 0, 0, 0);
        await db.collection('library_issues').updateMany(
            { status: 'ISSUED', dueDate: { $lt: today.toISOString().split('T')[0] } },
            { $set: { status: 'OVERDUE', updatedAt: new Date() } }
        );

        const issues = await db.collection('library_issues').find(query).sort({ createdAt: -1 }).toArray();
        res.json(issues);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/library/issues', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { bookId, memberId, memberName, memberType, memberClass, bookTitle, dueDate, notes } = req.body;
        if (!bookId || !memberId) return res.status(400).json({ message: 'Book and member are required' });

        const book = await db.collection('library_books').findOne({ _id: new ObjectId(bookId) });
        if (!book) return res.status(404).json({ message: 'Book not found' });
        if ((book.availableCopies || 0) < 1) return res.status(400).json({ message: 'No copies available for this book' });

        const overdue = await db.collection('library_issues').countDocuments({ memberId, status: 'OVERDUE' });
        if (overdue > 0) return res.status(400).json({ message: 'Member has overdue books. Please return them first.' });

        const today = new Date().toISOString().split('T')[0];
        const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const issue = {
            bookId, bookTitle: bookTitle || book.title,
            memberId, memberName, memberType: memberType || 'student', memberClass: memberClass || '',
            issueDate: today, dueDate: dueDate || defaultDue,
            returnDate: null, status: 'ISSUED',
            fineAmount: 0, finePaid: false, notes: notes || '',
            createdAt: new Date(),
        };

        const result = await db.collection('library_issues').insertOne(issue);
        await db.collection('library_books').updateOne(
            { _id: new ObjectId(bookId) },
            { $inc: { availableCopies: -1 }, $set: { updatedAt: new Date() } }
        );
        res.status(201).json({ id: result.insertedId, ...issue });
    } catch (e: any) { console.error('[Library] issue error:', e); res.status(500).json({ message: e.message }); }
});

router.patch('/library/issues/:id', c.updateItem('library_issues'));

router.patch('/library/issues/:id/return', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const issue: any = await db.collection('library_issues').findOne({ _id: new ObjectId(req.params.id) });
        if (!issue) return res.status(404).json({ message: 'Issue record not found' });
        if (issue.status === 'RETURNED') return res.status(400).json({ message: 'Book already returned' });

        const today = new Date().toISOString().split('T')[0];
        const daysOverdue = Math.max(0, Math.ceil((new Date(today).getTime() - new Date(issue.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
        const fineAmount = daysOverdue * FINE_PER_DAY;

        await db.collection('library_issues').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: 'RETURNED', returnDate: today, fineAmount, finePaid: fineAmount === 0, daysOverdue, updatedAt: new Date() } }
        );
        await db.collection('library_books').updateOne(
            { _id: new ObjectId(issue.bookId) },
            { $inc: { availableCopies: 1 }, $set: { updatedAt: new Date() } }
        );
        res.json({ message: 'Book returned successfully', fineAmount, daysOverdue });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/library/issues/:id/pay-fine', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('library_issues').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { finePaid: true, updatedAt: new Date() } }
        );
        res.json({ message: 'Fine marked as paid' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/library/overdue', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        await db.collection('library_issues').updateMany(
            { status: 'ISSUED', dueDate: { $lt: today.toISOString().split('T')[0] } },
            { $set: { status: 'OVERDUE', updatedAt: new Date() } }
        );
        const overdue = await db.collection('library_issues').find({ status: 'OVERDUE' }).sort({ dueDate: 1 }).toArray();
        const enriched = overdue.map((o: any) => {
            const daysOverdue = Math.max(0, Math.ceil((Date.now() - new Date(o.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
            return { ...o, daysOverdue, fineAmount: o.fineAmount || daysOverdue * FINE_PER_DAY };
        });
        res.json(enriched);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/library/stats', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const [totalBooks, totalMembers, issued, overdue, returned] = await Promise.all([
            db.collection('library_books').countDocuments(),
            db.collection('library_members').countDocuments({ isActive: { $ne: false } }),
            db.collection('library_issues').countDocuments({ status: 'ISSUED' }),
            db.collection('library_issues').countDocuments({ status: 'OVERDUE' }),
            db.collection('library_issues').countDocuments({ status: 'RETURNED' }),
        ]);

        const totalCopies = await db.collection('library_books').aggregate([
            { $group: { _id: null, total: { $sum: '$totalCopies' }, available: { $sum: '$availableCopies' } } }
        ]).toArray();
        const finesData = await db.collection('library_issues').aggregate([
            { $match: { fineAmount: { $gt: 0 } } },
            { $group: { _id: '$finePaid', total: { $sum: '$fineAmount' } } }
        ]).toArray();

        const finesPaid = finesData.find((f: any) => f._id === true)?.total || 0;
        const finesOutstanding = finesData.find((f: any) => f._id === false)?.total || 0;
        const recentIssues = await db.collection('library_issues').find({}).sort({ createdAt: -1 }).limit(5).toArray();
        const topBooks = await db.collection('library_issues').aggregate([
            { $group: { _id: '$bookTitle', count: { $sum: 1 } } },
            { $sort: { count: -1 } }, { $limit: 5 }
        ]).toArray();

        res.json({
            totalBooks, totalMembers, issued, overdue, returned,
            totalCopies: totalCopies[0]?.total || 0,
            availableCopies: totalCopies[0]?.available || 0,
            finesPaid, finesOutstanding, recentIssues, topBooks
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/library/reports', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { period = '30' } = req.query;
        const since = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);
        const issues = await db.collection('library_issues').find({ createdAt: { $gte: since } }).toArray();

        const byStatus: Record<string, number> = {};
        issues.forEach((i: any) => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });

        const topBorrowers = Object.values(
            issues.reduce((acc: any, i: any) => {
                if (!acc[i.memberId]) acc[i.memberId] = { name: i.memberName, class: i.memberClass, count: 0 };
                acc[i.memberId].count++;
                return acc;
            }, {})
        ).sort((a: any, b: any) => b.count - a.count).slice(0, 10);

        const topBooks = Object.values(
            issues.reduce((acc: any, i: any) => {
                if (!acc[i.bookId]) acc[i.bookId] = { title: i.bookTitle, count: 0 };
                acc[i.bookId].count++;
                return acc;
            }, {})
        ).sort((a: any, b: any) => b.count - a.count).slice(0, 10);

        const totalFines = issues.reduce((s: number, i: any) => s + (i.fineAmount || 0), 0);
        const finesPaid = issues.filter((i: any) => i.finePaid).reduce((s: number, i: any) => s + (i.fineAmount || 0), 0);

        res.json({ total: issues.length, byStatus, topBorrowers, topBooks, totalFines, finesPaid });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
