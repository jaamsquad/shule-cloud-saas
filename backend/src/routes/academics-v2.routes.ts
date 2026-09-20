/**
 * Production-Grade Academic Architecture v2
 *
 * Architecture:
 * - Academic Years & Terms
 * - Classes (Grade 1, Form 2, etc.)
 * - Streams (East, North, Red) — BELONG TO a class
 * - StudentAcademicEnrollments — the bridge (never overwrite, always create new)
 * - Exams — scoped to academicYearId + termId + classId + streamId
 * - StudentExamMarks — ALWAYS tied to enrollmentId (historically immutable)
 * - Promotions — create NEW enrollment, old becomes "completed"
 * - Report Cards — generated from historical enrollment snapshot
 * - Rankings — per stream/class/exam/term
 */

import { Router } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { loadCurricula, canonicalCode } from '../lib/curriculum';
import { resolveScope, scopeForCollection, mergeFilter } from '../lib/dataScope';
import { canonicalStatus } from '../lib/studentStatus';
const getRequestDb = (req: any) => req.tenantDb || getMetaDb();

const router = Router();

// ─── Helper ────────────────────────────────────────────────────────────────────
const toOid = (id: string) => new ObjectId(id);
const now = () => new Date();

const auditLog = async (db: any, action: string, collection: string, docId: string, userId: string, oldVal: any = null, newVal: any = null) => {
    try {
        await db.collection('audit_logs').insertOne({ action, collection, documentId: docId, changedBy: userId || 'system', changedAt: now(), oldValue: oldVal, newValue: newVal });
    } catch (_) {}
};

// ═══════════════════════════════════════════════════════════════════
// 1. ACADEMIC YEARS
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/academic-years', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const years = await db.collection('academic_years').find({ deletedAt: { $exists: false } }).sort({ year: -1 }).toArray();
        res.json(years);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/academic-years', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { year, name, startDate, endDate } = req.body;
        if (!year) return res.status(400).json({ message: 'Year is required' });
        const exists = await db.collection('academic_years').findOne({ year: Number(year), deletedAt: { $exists: false } });
        if (exists) return res.status(400).json({ message: `Academic year ${year} already exists` });
        const doc = { year: Number(year), name: name || `Academic Year ${year}`, startDate, endDate, isActive: false, createdAt: now() };
        const result = await db.collection('academic_years').insertOne(doc);
        res.status(201).json({ id: result.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/v2/academic-years/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { name, startDate, endDate, isActive } = req.body;
        const update: any = { updatedAt: now() };
        if (name !== undefined) update.name = name;
        if (startDate !== undefined) update.startDate = startDate;
        if (endDate !== undefined) update.endDate = endDate;
        if (isActive !== undefined) {
            // Only one year can be active
            if (isActive) await db.collection('academic_years').updateMany({}, { $set: { isActive: false } });
            update.isActive = isActive;
        }
        await db.collection('academic_years').updateOne({ _id: toOid(req.params.id) }, { $set: update });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/v2/academic-years/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('academic_years').updateOne({ _id: toOid(req.params.id) }, { $set: { deletedAt: now() } });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 2. TERMS
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/terms', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const query: any = { deletedAt: { $exists: false } };
        if (req.query.academicYearId) query.academicYearId = req.query.academicYearId.toString();
        const terms = await db.collection('terms').find(query).sort({ termNumber: 1 }).toArray();
        res.json(terms);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/terms', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { academicYearId, name, termNumber, startDate, endDate } = req.body;
        if (!academicYearId || !name) return res.status(400).json({ message: 'academicYearId and name are required' });
        const year = await db.collection('academic_years').findOne({ _id: toOid(academicYearId) });
        if (!year) return res.status(404).json({ message: 'Academic year not found' });
        const doc = { academicYearId, academicYear: year.year, name, termNumber: Number(termNumber) || 1, startDate, endDate, isActive: false, createdAt: now() };
        const result = await db.collection('terms').insertOne(doc);
        res.status(201).json({ id: result.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/v2/terms/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const update: any = { updatedAt: now() };
        ['name', 'termNumber', 'startDate', 'endDate', 'type'].forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

        if (req.body.isActive !== undefined) {
            if (req.body.isActive) {
                // Deactivate ALL terms first — only one term can be active system-wide
                await db.collection('terms').updateMany({}, { $set: { isActive: false } });
                // Also find and activate the year that owns this term
                const term = await db.collection('terms').findOne({ _id: toOid(req.params.id) });
                if (term?.academicYearId) {
                    await db.collection('academic_years').updateMany({}, { $set: { isActive: false } });
                    await db.collection('academic_years').updateOne(
                        { _id: toOid(term.academicYearId) },
                        { $set: { isActive: true, updatedAt: now() } }
                    );
                }
            }
            update.isActive = req.body.isActive;
        }

        await db.collection('terms').updateOne({ _id: toOid(req.params.id) }, { $set: update });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/v2/terms/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('terms').updateOne({ _id: toOid(req.params.id) }, { $set: { deletedAt: now() } });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 3. CLASSES (Grade 1, Form 2 — NOT streams)
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/classes', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const classes = await db.collection('v2_classes').find({ deletedAt: { $exists: false } }).sort({ level: 1, name: 1 }).toArray();
        // Curriculum-aware: attach each class's resolved curriculum config so the
        // frontend gets behavior (terminology, assessment mode, report layout) from
        // the backend — no frontend logic decides curriculum behavior.
        const curricula = await loadCurricula(db);
        const byCode: Record<string, any> = {}; curricula.forEach(c => { byCode[canonicalCode(c.code)] = c; });
        const enriched = classes.map((c: any) => {
            const code = canonicalCode(c.curriculumType ?? c.curriculum ?? '844');
            const cfg = byCode[code] || null;
            return { ...c, curriculumCode: code, curriculum: cfg };
        });
        res.json(enriched);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/classes', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { name, code, level, curriculumType, capacity } = req.body;
        if (!name) return res.status(400).json({ message: 'Class name is required' });
        const doc = { name, code: code || '', level: Number(level) || 1, curriculumType: curriculumType || '844', capacity: Number(capacity) || 40, isActive: true, createdAt: now() };
        const result = await db.collection('v2_classes').insertOne(doc);
        res.status(201).json({ id: result.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/v2/classes/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const update: any = { updatedAt: now() };
        ['name', 'code', 'level', 'curriculumType', 'capacity', 'isActive'].forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
        await db.collection('v2_classes').updateOne({ _id: toOid(req.params.id) }, { $set: update });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/v2/classes/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('v2_classes').updateOne({ _id: toOid(req.params.id) }, { $set: { deletedAt: now() } });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 4. STREAMS (East, North, Red — BELONG to a class)
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/streams', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const query: any = { deletedAt: { $exists: false } };
        if (req.query.classId) query.classId = req.query.classId.toString();
        const streams = await db.collection('v2_streams').find(query).sort({ name: 1 }).toArray();
        res.json(streams);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/streams', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { classId, name, capacity, classTeacherId } = req.body;
        if (!classId || !name) return res.status(400).json({ message: 'classId and stream name are required' });
        const cls = await db.collection('v2_classes').findOne({ _id: toOid(classId) });
        if (!cls) return res.status(404).json({ message: 'Class not found' });
        const doc = { classId, className: cls.name, name, fullName: `${cls.name} ${name}`, capacity: Number(capacity) || 40, classTeacherId: classTeacherId || null, isActive: true, createdAt: now() };
        const result = await db.collection('v2_streams').insertOne(doc);
        res.status(201).json({ id: result.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/v2/streams/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const update: any = { updatedAt: now() };
        ['name', 'capacity', 'classTeacherId', 'isActive'].forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
        if (req.body.name) {
            const stream = await db.collection('v2_streams').findOne({ _id: toOid(req.params.id) });
            if (stream) update.fullName = `${stream.className} ${req.body.name}`;
        }
        await db.collection('v2_streams').updateOne({ _id: toOid(req.params.id) }, { $set: update });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/v2/streams/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('v2_streams').updateOne({ _id: toOid(req.params.id) }, { $set: { deletedAt: now() } });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Class list: one stream's students with fee balance + performance, and its class teacher ──
// Members are the ACTIVE students whose streamId matches or whose class text is this stream's
// full name (same rule the Classes page counts with). Scoped to what the caller may see.
router.get('/v2/streams/:id/roster', async (req, res) => {
    try {
        const db = getRequestDb(req);
        let sid: ObjectId; try { sid = toOid(req.params.id); } catch { return res.status(400).json({ message: 'Invalid class id' }); }
        const stream: any = await db.collection('v2_streams').findOne({ _id: sid, deletedAt: { $exists: false } });
        if (!stream) return res.status(404).json({ message: 'Class not found' });
        const fullName = String(stream.fullName || `${stream.className || ''} ${stream.name}`).trim();
        const rx = new RegExp(`^\\s*${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\s*$`, 'i');

        const scope = await resolveScope(req, db);
        const filter = mergeFilter({ $or: [{ streamId: String(stream._id) }, { studentClass: rx }, { currentClass: rx }] }, scopeForCollection('students', scope));
        const members: any[] = (await db.collection('students').find(filter).toArray()).filter((s: any) => canonicalStatus(s.status) === 'Active');
        const ids = members.map(s => String(s._id));

        // class teacher
        let teacher: any = null;
        if (stream.classTeacherId) {
            try { teacher = await db.collection('staff').findOne({ _id: new ObjectId(String(stream.classTeacherId)) }); } catch { /* not an id */ }
        }

        // fee balances (voided invoices ignored; overpayment credit taken off)
        const invoices: any[] = ids.length ? await db.collection('invoices').find({ status: { $ne: 'VOIDED' }, $or: [{ student_id: { $in: ids } }, { studentId: { $in: ids } }] }).toArray().catch(() => []) : [];
        const fee: Record<string, { billed: number; paid: number; balance: number }> = {};
        for (const inv of invoices) {
            const key = String(inv.student_id || inv.studentId);
            const totalDue = parseFloat(inv.total_due ?? inv.total) || 0;
            const paid = parseFloat(inv.amount_paid ?? (String(inv.status || '').toLowerCase() === 'paid' ? totalDue : 0)) || 0;
            const balance = parseFloat(inv.balance ?? (String(inv.status || '').toLowerCase() === 'paid' ? 0 : totalDue)) || 0;
            const f = (fee[key] ||= { billed: 0, paid: 0, balance: 0 });
            f.billed += totalDue; f.paid += paid; f.balance += balance;
        }

        // performance: mean percentage over the student's marks (optionally for one exam)
        const examId = req.query.examId ? String(req.query.examId) : '';
        const marks: any[] = ids.length ? await db.collection('exam_marks').find({ studentId: { $in: ids }, ...(examId ? { examId } : {}) }).toArray().catch(() => []) : [];
        const perf: Record<string, { sum: number; n: number; exams: Set<string> }> = {};
        const examMap = new Map<string, { _id: string; name: string; term: string }>();
        for (const m of marks) {
            const obtained = Number(m.marksObtained ?? m.marks ?? m.score); const total = Number(m.totalMarks || m.outOf || 100);
            if (!Number.isFinite(obtained) || !total) continue;
            const p = (perf[String(m.studentId)] ||= { sum: 0, n: 0, exams: new Set() });
            p.sum += (obtained / total) * 100; p.n++; p.exams.add(String(m.examId));
            if (m.examId && !examMap.has(String(m.examId))) examMap.set(String(m.examId), { _id: String(m.examId), name: m.examName || 'Exam', term: m.term || '' });
        }

        const students = members.map(s => {
            const id = String(s._id), f = fee[id], p = perf[id];
            const credit = Math.max(0, Number(s.feeCredit) || 0);
            return {
                _id: id, studentName: s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
                registrationNo: s.registrationNo || s.admNo || '', gender: s.gender || '', avatar: s.avatar || s.studentPhoto || '',
                phone: s.parentPhone || s.fatherPhone || s.motherPhone || s.guardianPhone || s.phone || '',
                feeBilled: Math.round((f?.billed || 0) * 100) / 100, feePaid: Math.round((f?.paid || 0) * 100) / 100,
                feeDue: Math.max(0, Math.round(((f?.balance || 0) - credit) * 100) / 100),
                average: p && p.n ? Math.round((p.sum / p.n) * 10) / 10 : null, examsCount: p ? p.exams.size : 0, position: null as number | null,
            };
        });
        // rank by average, best first (equal averages share a position)
        const ranked = students.filter(s => s.average != null).sort((a, b) => (b.average as number) - (a.average as number));
        ranked.forEach((s, i) => { s.position = i > 0 && ranked[i - 1].average === s.average ? ranked[i - 1].position : i + 1; });

        const withAvg = ranked.map(s => s.average as number);
        res.json({
            stream: { _id: String(stream._id), name: fullName, classId: stream.classId, className: stream.className, capacity: Number(stream.capacity) || 0 },
            teacher: teacher ? { _id: String(teacher._id), name: teacher.employeeName || teacher.name || '', designation: teacher.designation || '', phone: teacher.phone || '', email: teacher.email || '' } : null,
            exams: [...examMap.values()],
            summary: {
                total: students.length, boys: students.filter(s => /^m/i.test(s.gender)).length, girls: students.filter(s => /^f/i.test(s.gender)).length,
                feeDueTotal: Math.round(students.reduce((t, s) => t + s.feeDue, 0) * 100) / 100,
                owing: students.filter(s => s.feeDue > 0).length,
                classMean: withAvg.length ? Math.round((withAvg.reduce((t, v) => t + v, 0) / withAvg.length) * 10) / 10 : null,
            },
            students,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 5. STUDENT ACADEMIC ENROLLMENTS
// CRITICAL: Never overwrite. Always create new on promotion.
// ═══════════════════════════════════════════════════════════════════

// Enrollment feature removed — class/stream is stored directly on the student.
// This endpoint purges any leftover student_enrollments records.
router.delete('/v2/enrollments/purge', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const r = await db.collection('student_enrollments').deleteMany({});
        res.json({ ok: true, removed: r.deletedCount });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/v2/students/:id/history', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const studentId = req.params.id;
        const student = await db.collection('students').findOne({ _id: toOid(studentId) });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const enrollments = await db.collection('student_enrollments').find({ studentId }).sort({ enrollmentDate: 1 }).toArray();
        res.json({ student, enrollments, totalYears: enrollments.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});


// ═══════════════════════════════════════════════════════════════════
// 6. PROMOTION (enrollment-free)
// Updates each student's CURRENT class/stream and appends a promotion-history
// entry. Past exam marks already carry classAtTime, so previous results stay
// attached to the old class forever (Academic History on the student page).
// ═══════════════════════════════════════════════════════════════════

// Promote selected students to a destination class + stream.
router.post('/v2/promotions', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { studentIds, toClassId, toStreamId, academicYear } = req.body || {};
        if (!Array.isArray(studentIds) || !studentIds.length) return res.status(400).json({ message: 'No students selected' });
        if (!toClassId) return res.status(400).json({ message: 'Destination class is required' });

        const [toClass, toStream] = await Promise.all([
            db.collection('v2_classes').findOne({ _id: toOid(toClassId) }).catch(() => null),
            toStreamId ? db.collection('v2_streams').findOne({ _id: toOid(toStreamId) }).catch(() => null) : null,
        ]);
        if (!toClass) return res.status(400).json({ message: 'Destination class not found' });
        const fullClass = toStream ? (toStream.fullName || `${toClass.name} ${toStream.name}`) : toClass.name;
        const year = academicYear || String(new Date().getFullYear());

        let promoted = 0, skipped = 0;
        for (const sid of studentIds) {
            const oid = toOid(String(sid));
            if (!oid) { skipped++; continue; }
            const student: any = await db.collection('students').findOne({ _id: oid }).catch(() => null);
            if (!student) { skipped++; continue; }
            const fromClass = student.studentClass || student.currentClass || '';
            // Append a history entry (immutable record of the class they left).
            const historyEntry = { className: fromClass, classId: student.classId || '', streamId: student.streamId || '', streamName: student.stream || student.streamName || '', academicYear: student.academicYear || '', leftAt: now() };
            await db.collection('students').updateOne({ _id: oid }, {
                $set: {
                    studentClass: fullClass, currentClass: fullClass,
                    classId: toClassId, className: toClass.name,
                    streamId: toStreamId || null, stream: toStream?.name || '', streamName: toStream?.name || '',
                    academicYear: year, updatedAt: now(),
                },
                $push: { classHistory: historyEntry } as any,
            });
            promoted++;
        }
        await auditLog(db, 'BULK_PROMOTION', 'students', 'bulk', 'system', null, { toClassId, toStreamId, count: promoted });
        res.json({ message: 'Promotion complete', promoted, skipped, total: studentIds.length, destination: fullClass });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 7. EXAMS (scoped to year/term/class/stream)
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/exams', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const query: any = { deletedAt: { $exists: false } };
        ['academicYearId', 'termId', 'classId', 'streamId', 'status'].forEach(f => { if (req.query[f]) query[f] = req.query[f].toString(); });
        const exams = await db.collection('v2_exams').find(query).sort({ createdAt: -1 }).toArray();
        res.json(exams);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/exams', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { name, examType, academicYearId, termId, classId, streamId, startDate, endDate, totalMarks } = req.body;
        if (!name || !academicYearId || !classId || !streamId) {
            return res.status(400).json({ message: 'name, academicYearId, classId, streamId are required' });
        }
        const [year, cls, stream] = await Promise.all([
            db.collection('academic_years').findOne({ _id: toOid(academicYearId) }),
            db.collection('v2_classes').findOne({ _id: toOid(classId) }),
            db.collection('v2_streams').findOne({ _id: toOid(streamId) }),
        ]);
        const doc = {
            name, examType: examType || 'End Term', academicYearId, academicYear: year?.year,
            termId: termId || null, classId, className: cls?.name || '', streamId, streamName: stream?.name || '',
            fullClassName: stream?.fullName || '', startDate, endDate, totalMarks: Number(totalMarks) || 100,
            status: 'draft', isLocked: false, createdAt: now(),
        };
        const result = await db.collection('v2_exams').insertOne(doc);
        res.status(201).json({ id: result.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/v2/exams/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const exam = await db.collection('v2_exams').findOne({ _id: toOid(req.params.id) });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        if (exam.isLocked) return res.status(400).json({ message: 'Exam is locked and cannot be modified' });
        const update: any = { updatedAt: now() };
        ['name', 'examType', 'startDate', 'endDate', 'totalMarks', 'status', 'isLocked'].forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
        await db.collection('v2_exams').updateOne({ _id: toOid(req.params.id) }, { $set: update });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 8. STUDENT EXAM MARKS
// CRITICAL: Always tied to enrollmentId — historically immutable
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/marks', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const query: any = { deletedAt: { $exists: false } };
        ['studentId', 'enrollmentId', 'examId', 'subjectId', 'academicYearId', 'termId', 'classId', 'streamId'].forEach(f => {
            if (req.query[f]) query[f] = req.query[f].toString();
        });
        const marks = await db.collection('student_exam_marks_v2').find(query).toArray();
        res.json(marks);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/marks', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { studentId, enrollmentId, examId, subjectId, subjectName, marksObtained, totalMarks, grade, points, remarks, teacherId } = req.body;
        if (!studentId || !enrollmentId || !examId || !subjectId) {
            return res.status(400).json({ message: 'studentId, enrollmentId, examId, subjectId required' });
        }

        // Verify exam is not locked
        const exam = await db.collection('v2_exams').findOne({ _id: toOid(examId) });
        if (exam?.isLocked) return res.status(400).json({ message: 'Exam marks are locked and cannot be modified' });

        // Verify enrollment exists and is active/completed (allow marking for completed too)
        const enrollment = await db.collection('student_enrollments').findOne({ _id: toOid(enrollmentId) });
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        // Auto-calculate grade if not provided
        const pct = totalMarks > 0 ? (Number(marksObtained) / Number(totalMarks)) * 100 : 0;
        const autoGrade = grade || (pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C+' : pct >= 40 ? 'C' : pct >= 33 ? 'D' : 'F');
        const autoPoints = points || (pct >= 80 ? 4.0 : pct >= 70 ? 3.5 : pct >= 60 ? 3.0 : pct >= 50 ? 2.5 : pct >= 40 ? 2.0 : pct >= 33 ? 1.0 : 0.0);

        const doc = {
            studentId, studentName: enrollment.studentName,
            enrollmentId,
            academicYearId: enrollment.academicYearId, academicYear: enrollment.academicYear,
            termId: enrollment.termId, classId: enrollment.classId, className: enrollment.className,
            streamId: enrollment.streamId, streamName: enrollment.streamName,
            examId, subjectId, subjectName: subjectName || '',
            marksObtained: Number(marksObtained), totalMarks: Number(totalMarks) || 100,
            percentage: Math.round(pct * 100) / 100,
            grade: autoGrade, points: autoPoints, remarks: remarks || '',
            teacherId: teacherId || null, isApproved: false, isLocked: false,
            createdAt: now(),
        };

        // Upsert — if mark exists for same student/enrollment/exam/subject, update it
        const existing = await db.collection('student_exam_marks_v2').findOne({ studentId, enrollmentId, examId, subjectId });
        if (existing) {
            if (existing.isLocked) return res.status(400).json({ message: 'This mark is locked' });
            await db.collection('student_exam_marks_v2').updateOne({ _id: existing._id }, { $set: { ...doc, updatedAt: now() } });
            await auditLog(db, 'UPDATE_MARK', 'student_exam_marks_v2', existing._id.toString(), teacherId || 'system', existing, doc);
            return res.json({ id: existing._id, ...doc, updated: true });
        }

        const result = await db.collection('student_exam_marks_v2').insertOne(doc);
        res.status(201).json({ id: result.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Bulk marks entry
router.post('/v2/marks/bulk', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { marks } = req.body;
        if (!Array.isArray(marks) || !marks.length) return res.status(400).json({ message: 'marks array required' });

        let saved = 0; let skipped = 0;
        for (const mark of marks) {
            try {
                const exam = await db.collection('v2_exams').findOne({ _id: toOid(mark.examId) });
                if (exam?.isLocked) { skipped++; continue; }

                const enrollment = await db.collection('student_enrollments').findOne({ _id: toOid(mark.enrollmentId) });
                if (!enrollment) { skipped++; continue; }

                const pct = mark.totalMarks > 0 ? (Number(mark.marksObtained) / Number(mark.totalMarks)) * 100 : 0;
                const g = pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C+' : pct >= 40 ? 'C' : pct >= 33 ? 'D' : 'F';
                const p = pct >= 80 ? 4.0 : pct >= 70 ? 3.5 : pct >= 60 ? 3.0 : pct >= 50 ? 2.5 : pct >= 40 ? 2.0 : pct >= 33 ? 1.0 : 0.0;

                const doc = { ...mark, percentage: Math.round(pct * 100) / 100, grade: mark.grade || g, points: mark.points || p, academicYearId: enrollment.academicYearId, classId: enrollment.classId, streamId: enrollment.streamId, isApproved: false, isLocked: false, updatedAt: now() };

                await db.collection('student_exam_marks_v2').updateOne(
                    { studentId: mark.studentId, enrollmentId: mark.enrollmentId, examId: mark.examId, subjectId: mark.subjectId },
                    { $set: doc, $setOnInsert: { createdAt: now() } },
                    { upsert: true }
                );
                saved++;
            } catch (_) { skipped++; }
        }
        res.json({ message: `Bulk marks saved`, saved, skipped });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/v2/marks/:id/approve', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('student_exam_marks_v2').updateOne({ _id: toOid(req.params.id) }, { $set: { isApproved: true, approvedBy: req.body.approvedBy || 'admin', approvedAt: now() } });
        res.json({ message: 'Mark approved' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/v2/marks/:id/lock', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('student_exam_marks_v2').updateOne({ _id: toOid(req.params.id) }, { $set: { isLocked: true, lockedAt: now() } });
        res.json({ message: 'Mark locked' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Lock all marks for an exam
router.patch('/v2/exams/:id/lock-all', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('student_exam_marks_v2').updateMany({ examId: req.params.id }, { $set: { isLocked: true, lockedAt: now() } });
        await db.collection('v2_exams').updateOne({ _id: toOid(req.params.id) }, { $set: { isLocked: true, status: 'locked', lockedAt: now() } });
        res.json({ message: 'All marks locked for this exam' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 9. RANKINGS (per stream/class — same year/term only)
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/rankings', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { examId, streamId, classId, academicYearId, termId } = req.query;
        if (!examId) return res.status(400).json({ message: 'examId is required' });

        const query: any = { examId: examId.toString() };
        if (streamId) query.streamId = streamId.toString();
        else if (classId) query.classId = classId.toString();

        const marks = await db.collection('student_exam_marks_v2').find(query).toArray();

        // Aggregate per student
        const studentMap: Record<string, any> = {};
        marks.forEach((m: any) => {
            if (!studentMap[m.studentId]) {
                studentMap[m.studentId] = { studentId: m.studentId, studentName: m.studentName, enrollmentId: m.enrollmentId, classId: m.classId, className: m.className, streamId: m.streamId, streamName: m.streamName, subjects: [], totalMarks: 0, totalOutOf: 0 };
            }
            studentMap[m.studentId].subjects.push({ subjectId: m.subjectId, name: m.subjectName, marks: m.marksObtained, outOf: m.totalMarks, grade: m.grade });
            studentMap[m.studentId].totalMarks += m.marksObtained;
            studentMap[m.studentId].totalOutOf += m.totalMarks;
        });

        const rankings = Object.values(studentMap).map((s: any) => ({
            ...s,
            average: s.totalOutOf > 0 ? (s.totalMarks / s.totalOutOf) * 100 : 0,
            meanGrade: s.totalOutOf > 0 ? (s.totalMarks / s.totalOutOf) >= 0.8 ? 'A' : (s.totalMarks / s.totalOutOf) >= 0.7 ? 'B+' : (s.totalMarks / s.totalOutOf) >= 0.6 ? 'B' : (s.totalMarks / s.totalOutOf) >= 0.5 ? 'C+' : (s.totalMarks / s.totalOutOf) >= 0.4 ? 'C' : 'D' : 'F',
        })).sort((a: any, b: any) => b.totalMarks - a.totalMarks).map((s: any, i: number) => ({ ...s, position: i + 1 }));

        res.json({ total: rankings.length, rankings });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 10. REPORT CARDS (uses historical enrollment — never current class)
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/report-card/:enrollmentId', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { enrollmentId } = req.params;
        const { examId } = req.query;

        const enrollment = await db.collection('student_enrollments').findOne({ _id: toOid(enrollmentId) });
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        const student = await db.collection('students').findOne({ _id: toOid(enrollment.studentId) });

        // ── Fetch ALL subjects assigned to this student's class/stream ──────────
        // Subjects live in `v2_subjects` (classId = a v2_classes _id, stored as a
        // string). A subject with no classId is treated as school-wide. We also
        // fall back to the legacy `subjects` collection so older data still shows.
        const className  = enrollment.className  || '';
        const streamName = enrollment.streamName || '';
        const levelName  = className; // "Grade 4", "Form 2", etc.
        const escapeRe   = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const classIdStr = enrollment.classId ? enrollment.classId.toString() : '';

        // Primary source: v2_subjects assigned to this class (or school-wide).
        const v2Subjects = await db.collection('v2_subjects').find({
            deletedAt: { $exists: false },
            $or: [
                { classId: classIdStr },
                { classId: null },
                { classId: { $exists: false } },
            ],
        }).toArray();

        // Fallback source: legacy `subjects` collection. These are commonly created
        // school-wide (just name + code, no class field) via the Subjects page, so we
        // match by class/level when present AND include any subject with no class link.
        const legacySubjects = await db.collection('subjects').find({
            $or: [
                { classId:   enrollment.classId },
                { className: { $regex: new RegExp(`^${escapeRe(className.trim())}$`, 'i') } },
                { levelName: { $regex: new RegExp(`^${escapeRe(levelName.trim())}$`, 'i') } },
                { levelName: { $regex: new RegExp(escapeRe(className.trim()), 'i') } },
                // School-wide subjects (no class linkage of any kind)
                { classId: { $exists: false }, className: { $exists: false }, levelName: { $exists: false } },
            ],
        }).toArray();

        // Merge both sources, de-duplicating by subject name (case-insensitive).
        const allSubjects: any[] = [];
        const seenNames = new Set<string>();
        [...v2Subjects, ...legacySubjects].forEach((sub: any) => {
            const nm = (sub.name || sub.subjectName || '').trim().toLowerCase();
            if (!nm || seenNames.has(nm)) return;
            seenNames.add(nm);
            allSubjects.push(sub);
        });

        // ── Fetch marks for this enrollment ────────────────────────────────────
        const marksQuery: any = { enrollmentId };
        if (examId) marksQuery.examId = examId.toString();
        const marks = await db.collection('student_exam_marks_v2').find(marksQuery).toArray();

        // ── Get exam info for marks we have ────────────────────────────────────
        const examIds = [...new Set(marks.map((m: any) => m.examId))];
        const examOids = examIds.map(id => { try { return toOid(id as string); } catch { return null; } }).filter((x): x is ObjectId => x !== null);
        const exams    = examOids.length > 0 ? await db.collection('v2_exams').find({ _id: { $in: examOids } }).toArray() : [];
        const examMap: Record<string, any> = {};
        exams.forEach((e: any) => { examMap[e._id.toString()] = e; });

        // ── If filtered by examId, also get the exam's default total marks ─────
        let examDefaultOutOf = 100;
        if (examId) {
            try {
                const examDoc = await db.collection('v2_exams').findOne({ _id: toOid(examId as string) });
                if (examDoc?.totalMarks) examDefaultOutOf = examDoc.totalMarks;
            } catch (_) {}
        }

        // ── Build subject-keyed marks map ──────────────────────────────────────
        const marksMap: Record<string, any> = {};
        marks.forEach((m: any) => {
            const key = m.subjectId?.toString() || m.subjectName;
            if (!marksMap[key]) {
                marksMap[key] = { subjectId: m.subjectId, subjectName: m.subjectName, entries: [], totalMarks: 0, totalOutOf: 0, hasMarks: true };
            }
            marksMap[key].entries.push({
                examType: examMap[m.examId]?.examType || examMap[m.examId]?.name || 'Exam',
                marks: m.marksObtained,
                outOf: m.totalMarks,
                grade: m.grade,
                percentage: m.percentage,
            });
            marksMap[key].totalMarks  += Number(m.marksObtained || 0);
            marksMap[key].totalOutOf  += Number(m.totalMarks || 0);
        });

        // ── Merge: ALL assigned subjects + marks (or "-" where absent) ─────────
        const subjectList: any[] = [];

        // 1. Start with subjects that HAVE marks (already in marks map)
        const processedSubjectNames = new Set<string>();
        Object.values(marksMap).forEach((s: any) => {
            processedSubjectNames.add((s.subjectName || '').toLowerCase());
            subjectList.push({
                subjectId:   s.subjectId,
                subjectName: s.subjectName,
                entries:     s.entries,
                totalMarks:  s.totalMarks,
                totalOutOf:  s.totalOutOf,
                hasMarks:    true,
                average:     s.totalOutOf > 0 ? (s.totalMarks / s.totalOutOf) * 100 : 0,
            });
        });

        // 2. Add subjects with NO marks — these get a "-" placeholder
        allSubjects.forEach((sub: any) => {
            const name = (sub.name || sub.subjectName || '').toLowerCase();
            if (!processedSubjectNames.has(name)) {
                subjectList.push({
                    subjectId:   sub._id?.toString(),
                    subjectName: sub.name || sub.subjectName,
                    entries:     [],
                    totalMarks:  null,           // "-" — marks not entered
                    totalOutOf:  examDefaultOutOf, // still show the max possible marks
                    hasMarks:    false,
                    average:     null,
                });
                processedSubjectNames.add(name);
            }
        });

        // 3. Sort: subjects with marks first (by name), then unscored (by name)
        subjectList.sort((a: any, b: any) => {
            if (a.hasMarks && !b.hasMarks) return -1;
            if (!a.hasMarks && b.hasMarks) return 1;
            return (a.subjectName || '').localeCompare(b.subjectName || '');
        });

        // ── Summary — only from subjects WITH marks ────────────────────────────
        const scoredSubjects = subjectList.filter((s: any) => s.hasMarks);
        const overallMarks  = scoredSubjects.reduce((sum: number, s: any) => sum + (s.totalMarks  || 0), 0);
        const overallOutOf  = scoredSubjects.reduce((sum: number, s: any) => sum + (s.totalOutOf  || 0), 0);
        const overallPct    = overallOutOf > 0 ? (overallMarks / overallOutOf) * 100 : 0;
        const meanGrade     = overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+' : overallPct >= 60 ? 'B' : overallPct >= 50 ? 'C+' : overallPct >= 40 ? 'C' : overallPct > 0 ? 'D' : '—';

        const savedCard = await db.collection('v2_report_cards').findOne({ enrollmentId });

        res.json({
            enrollment: {
                id: enrollment._id, academicYear: enrollment.academicYear,
                class: enrollment.className, stream: enrollment.streamName,
                fullClass: enrollment.fullClassName, status: enrollment.status,
                enrollmentDate: enrollment.enrollmentDate,
            },
            student: {
                id: student?._id,
                name: student?.studentName || enrollment.studentName,
                admissionNo: student?.registrationNo || student?.admNo,
                gender: student?.gender,
            },
            subjects:    subjectList,
            totalSubjects:  subjectList.length,
            scoredSubjects: scoredSubjects.length,
            summary: {
                totalMarks: overallMarks, totalOutOf: overallOutOf,
                average: Math.round(overallPct * 100) / 100, meanGrade,
            },
            comments: {
                classTeacher: savedCard?.classTeacherComment || '',
                principal:    savedCard?.principalComment    || '',
            },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Save report card comments
router.patch('/v2/report-card/:enrollmentId/comments', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { classTeacherComment, principalComment } = req.body;
        await db.collection('v2_report_cards').updateOne(
            { enrollmentId: req.params.enrollmentId },
            { $set: { enrollmentId: req.params.enrollmentId, classTeacherComment, principalComment, updatedAt: now() } },
            { upsert: true }
        );
        res.json({ message: 'Comments saved' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 11. SUBJECTS (v2 — with class assignment, codes, compulsory flag)
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/subjects', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const query: any = { deletedAt: { $exists: false } };
        if (req.query.classId) query.classId = req.query.classId.toString();
        const subjects = await db.collection('v2_subjects').find(query).sort({ name: 1 }).toArray();
        res.json(subjects);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/subjects', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { name, code, classId, category, isCompulsory, teacherId } = req.body;
        if (!name) return res.status(400).json({ message: 'Subject name required' });
        const doc = { name, code: code || '', classId: classId || null, category: category || 'Core', isCompulsory: isCompulsory !== false, teacherId: teacherId || null, isActive: true, createdAt: now() };
        const result = await db.collection('v2_subjects').insertOne(doc);
        res.status(201).json({ id: result.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/v2/subjects/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const update: any = { updatedAt: now() };
        ['name', 'code', 'classId', 'category', 'isCompulsory', 'teacherId', 'isActive'].forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
        await db.collection('v2_subjects').updateOne({ _id: toOid(req.params.id) }, { $set: update });
        res.json({ message: 'Updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/v2/subjects/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('v2_subjects').updateOne({ _id: toOid(req.params.id) }, { $set: { deletedAt: now() } });
        res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 11b. TEACHER ↔ SUBJECT ↔ CLASS ASSIGNMENTS (staff_subjects)
// Drives the "Initials" column on report cards. One link = a teacher teaches
// a subject for a class (stream optional). Stored denormalised (names alongside
// ids) so report rendering needs no extra joins.
// ═══════════════════════════════════════════════════════════════════

// List assignments, optionally filtered by class / subject / teacher.
router.get('/v2/teacher-subjects', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const q: any = {};
        if (req.query.classId) q.classId = String(req.query.classId);
        if (req.query.subjectId) q.subjectId = String(req.query.subjectId);
        if (req.query.teacherId) q.$or = [{ teacherId: String(req.query.teacherId) }, { staffId: String(req.query.teacherId) }];
        const rows = await db.collection('staff_subjects').find(q).sort({ className: 1, subjectName: 1 }).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Create / upsert an assignment. Idempotent on (subjectId, classId, streamId).
router.post('/v2/teacher-subjects', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { teacherId, teacherName, subjectId, subjectName, classId, className, streamId, streamName } = req.body || {};
        if (!teacherId) return res.status(400).json({ message: 'teacherId required' });
        if (!subjectId && !subjectName) return res.status(400).json({ message: 'subject required' });
        const key: any = { subjectId: subjectId || null, classId: classId || null, streamId: streamId || null };
        const doc = {
            teacherId: String(teacherId), staffId: String(teacherId), teacherName: teacherName || '',
            subjectId: subjectId || null, subjectName: subjectName || '',
            classId: classId || null, className: className || '',
            streamId: streamId || null, streamName: streamName || '',
            updatedAt: now(),
        };
        await db.collection('staff_subjects').updateOne(key, { $set: doc, $setOnInsert: { createdAt: now() } }, { upsert: true });

        // Mirror onto staff.subjectAssignments so the Teachers page reflects it too
        // (single source of truth = staff_subjects; this keeps the card in sync).
        try {
            const tid = toOid(String(teacherId));
            const staff: any = await db.collection('staff').findOne({ _id: tid });
            const list: any[] = Array.isArray(staff?.subjectAssignments) ? staff.subjectAssignments : [];
            const exists = list.some((a: any) => String(a.subjectId) === String(subjectId) && String(a.classId || '') === String(classId || ''));
            if (!exists) {
                list.push({ subjectId: subjectId || '', subjectName: subjectName || '', classId: classId || '', className: streamName ? `${className} ${streamName}`.trim() : (className || '') });
                const subjIds = [...new Set(list.map((a: any) => String(a.subjectId)).filter(Boolean))];
                await db.collection('staff').updateOne({ _id: tid }, { $set: { subjectAssignments: list, specializedSubjects: subjIds, updatedAt: now() } });
            }
        } catch { /* staff mirror is best-effort */ }

        res.status(201).json({ ok: true, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/v2/teacher-subjects/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const link: any = await db.collection('staff_subjects').findOne({ _id: toOid(req.params.id) });
        await db.collection('staff_subjects').deleteOne({ _id: toOid(req.params.id) });
        // Remove the mirrored entry from staff.subjectAssignments too.
        if (link?.teacherId || link?.staffId) {
            try {
                const tid = toOid(String(link.teacherId || link.staffId));
                const staff: any = await db.collection('staff').findOne({ _id: tid });
                const list: any[] = Array.isArray(staff?.subjectAssignments) ? staff.subjectAssignments : [];
                const next = list.filter((a: any) => !(String(a.subjectId) === String(link.subjectId) && String(a.classId || '') === String(link.classId || '')));
                if (next.length !== list.length) {
                    const subjIds = [...new Set(next.map((a: any) => String(a.subjectId)).filter(Boolean))];
                    await db.collection('staff').updateOne({ _id: tid }, { $set: { subjectAssignments: next, specializedSubjects: subjIds, updatedAt: now() } });
                }
            } catch { /* best-effort */ }
        }
        res.json({ message: 'Removed' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 12. AUDIT LOG
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/audit-logs', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const query: any = {};
        if (req.query.collection) query.collection = req.query.collection.toString();
        if (req.query.documentId) query.documentId = req.query.documentId.toString();
        const logs = await db.collection('audit_logs').find(query).sort({ changedAt: -1 }).limit(100).toArray();
        res.json(logs);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;