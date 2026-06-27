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
        res.json(classes);
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

// ═══════════════════════════════════════════════════════════════════
// 5. STUDENT ACADEMIC ENROLLMENTS
// CRITICAL: Never overwrite. Always create new on promotion.
// ═══════════════════════════════════════════════════════════════════

router.get('/v2/enrollments', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const query: any = { deletedAt: { $exists: false } };
        if (req.query.studentId) query.studentId = req.query.studentId.toString();
        if (req.query.academicYearId) query.academicYearId = req.query.academicYearId.toString();
        if (req.query.classId) query.classId = req.query.classId.toString();
        if (req.query.streamId) query.streamId = req.query.streamId.toString();
        if (req.query.status) query.status = req.query.status.toString();
        const enrollments = await db.collection('student_enrollments').find(query).sort({ enrollmentDate: -1 }).toArray();
        // Enrich with each student's REAL current class from the students collection.
        const students = await db.collection('students').find({}).toArray().catch(() => []);
        const byId: Record<string, any> = {};
        students.forEach((s: any) => { byId[String(s._id)] = s; });
        res.json(enrollments.map((e: any) => {
            const s = byId[String(e.studentId)];
            return { ...e, currentClass: s?.studentClass || s?.currentClass || e.fullClassName || e.className || '' };
        }));
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

router.post('/v2/enrollments', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { studentId, academicYearId, termId, classId, streamId } = req.body;
        if (!studentId || !academicYearId || !classId || !streamId) {
            return res.status(400).json({ message: 'studentId, academicYearId, classId, streamId are required' });
        }
        // Check for duplicate active enrollment
        const existing = await db.collection('student_enrollments').findOne({ studentId, academicYearId, classId, streamId, status: 'active', deletedAt: { $exists: false } });
        if (existing) return res.status(400).json({ message: 'Student already has an active enrollment in this class/stream for this year' });

        const [student, year, cls, stream] = await Promise.all([
            db.collection('students').findOne({ _id: toOid(studentId) }),
            db.collection('academic_years').findOne({ _id: toOid(academicYearId) }),
            db.collection('v2_classes').findOne({ _id: toOid(classId) }),
            db.collection('v2_streams').findOne({ _id: toOid(streamId) }),
        ]);

        const enrollment = {
            studentId, studentName: student?.studentName || student?.name || '',
            academicYearId, academicYear: year?.year || '',
            termId: termId || null,
            classId, className: cls?.name || '',
            streamId, streamName: stream?.name || '', fullClassName: stream?.fullName || `${cls?.name} ${stream?.name}`,
            status: 'active', promotedFromEnrollmentId: req.body.promotedFromEnrollmentId || null,
            enrollmentDate: now(), createdAt: now(),
        };

        const result = await db.collection('student_enrollments').insertOne(enrollment);

        // Sync the student's current class so All Students reflects the enrolment.
        try {
            await db.collection('students').updateOne(
                { _id: toOid(studentId) },
                { $set: { studentClass: enrollment.fullClassName || cls?.name || '', currentClass: enrollment.fullClassName || cls?.name || '', classId, streamId, streamName: stream?.name || '', academicYear: year?.year || '', updatedAt: now() } },
            );
        } catch { /* ignore */ }

        await auditLog(db, 'CREATE_ENROLLMENT', 'student_enrollments', result.insertedId.toString(), 'system', null, enrollment);
        res.status(201).json({ id: result.insertedId, ...enrollment });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Enroll MANY students into the same class/stream/year in one call.
router.post('/v2/enrollments/bulk', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { studentIds, academicYearId, termId, classId, streamId } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0 || !academicYearId || !classId || !streamId) {
            return res.status(400).json({ message: 'studentIds[], academicYearId, classId, streamId are required' });
        }
        const [year, cls, stream] = await Promise.all([
            db.collection('academic_years').findOne({ _id: toOid(academicYearId) }),
            db.collection('v2_classes').findOne({ _id: toOid(classId) }),
            db.collection('v2_streams').findOne({ _id: toOid(streamId) }),
        ]);
        let enrolled = 0, skipped = 0;
        for (const studentId of studentIds) {
            const existing = await db.collection('student_enrollments').findOne({ studentId, academicYearId, classId, streamId, status: 'active', deletedAt: { $exists: false } });
            if (existing) { skipped++; continue; }
            const student = await db.collection('students').findOne({ _id: toOid(studentId) });
            const enrollment = {
                studentId, studentName: student?.studentName || student?.name || '',
                academicYearId, academicYear: year?.year || '', termId: termId || null,
                classId, className: cls?.name || '',
                streamId, streamName: stream?.name || '', fullClassName: stream?.fullName || `${cls?.name} ${stream?.name}`,
                status: 'active', enrollmentDate: now(), createdAt: now(),
            };
            const r = await db.collection('student_enrollments').insertOne(enrollment);
            await auditLog(db, 'CREATE_ENROLLMENT', 'student_enrollments', r.insertedId.toString(), 'system', null, enrollment);
            enrolled++;
        }
        res.status(201).json({ enrolled, skipped, total: studentIds.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// 6. PROMOTION WORKFLOW
// Creates NEW enrollment, marks old as "completed"
// NEVER modifies old enrollment or marks
// ═══════════════════════════════════════════════════════════════════

router.post('/v2/promotions/preview', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { fromAcademicYearId, fromClassId, fromStreamId, toAcademicYearId, toClassId, toStreamId } = req.body;
        const activeEnrollments = await db.collection('student_enrollments').find({
            academicYearId: fromAcademicYearId, classId: fromClassId, streamId: fromStreamId, status: 'active'
        }).toArray();
        const [toClass, toStream] = await Promise.all([
            db.collection('v2_classes').findOne({ _id: toOid(toClassId) }),
            db.collection('v2_streams').findOne({ _id: toOid(toStreamId) }),
        ]);
        res.json({
            studentsToPromote: activeEnrollments.length,
            fromClass: activeEnrollments[0]?.className,
            fromStream: activeEnrollments[0]?.streamName,
            toClass: toClass?.name,
            toStream: toStream?.name,
            students: activeEnrollments.map((e: any) => ({ studentId: e.studentId, name: e.studentName, enrollmentId: e._id })),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/v2/promotions', async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { fromAcademicYearId, fromClassId, fromStreamId, toAcademicYearId, toClassId, toStreamId, studentIds } = req.body;

        if (!fromAcademicYearId || !toAcademicYearId || !fromClassId || !toClassId || !fromStreamId || !toStreamId) {
            return res.status(400).json({ message: 'All year/class/stream IDs are required' });
        }

        // Get active enrollments to promote
        const query: any = { academicYearId: fromAcademicYearId, classId: fromClassId, streamId: fromStreamId, status: 'active' };
        if (studentIds?.length) query.studentId = { $in: studentIds };
        const toPromote = await db.collection('student_enrollments').find(query).toArray();

        if (!toPromote.length) return res.status(400).json({ message: 'No active enrollments found to promote' });

        const [toYear, toClass, toStream] = await Promise.all([
            db.collection('academic_years').findOne({ _id: toOid(toAcademicYearId) }),
            db.collection('v2_classes').findOne({ _id: toOid(toClassId) }),
            db.collection('v2_streams').findOne({ _id: toOid(toStreamId) }),
        ]);

        let promoted = 0;
        let skipped = 0;

        for (const enrollment of toPromote) {
            // Check not already enrolled in target
            const alreadyEnrolled = await db.collection('student_enrollments').findOne({
                studentId: enrollment.studentId, academicYearId: toAcademicYearId, classId: toClassId, streamId: toStreamId, status: 'active'
            });
            if (alreadyEnrolled) { skipped++; continue; }

            // 1. Mark old enrollment as completed — NEVER delete it
            await db.collection('student_enrollments').updateOne(
                { _id: enrollment._id },
                { $set: { status: 'completed', completedAt: now(), promotedToYearId: toAcademicYearId } }
            );

            // 2. Create NEW enrollment for promoted year/class/stream
            const newEnrollment = {
                studentId: enrollment.studentId,
                studentName: enrollment.studentName,
                academicYearId: toAcademicYearId,
                academicYear: toYear?.year || '',
                termId: null,
                classId: toClassId,
                className: toClass?.name || '',
                streamId: toStreamId,
                streamName: toStream?.name || '',
                fullClassName: toStream?.fullName || `${toClass?.name} ${toStream?.name}`,
                status: 'active',
                promotedFromEnrollmentId: enrollment._id.toString(),
                enrollmentDate: now(),
                createdAt: now(),
            };
            await db.collection('student_enrollments').insertOne(newEnrollment);

            // 3. Sync the student's CURRENT class on the students collection so the
            //    All Students page (and everything that reads studentClass) reflects
            //    the promotion immediately. Historical enrollments stay intact above.
            const newClassLabel = newEnrollment.fullClassName || `${toClass?.name || ''} ${toStream?.name || ''}`.trim() || toClass?.name || '';
            const sid = enrollment.studentId;
            try {
                const filter = /^[a-f0-9]{24}$/i.test(String(sid)) ? { _id: new (require('mongodb').ObjectId)(String(sid)) } : { _id: sid as any };
                await db.collection('students').updateOne(filter, {
                    $set: {
                        studentClass: newClassLabel,
                        currentClass: newClassLabel,
                        classId: toClassId,
                        streamId: toStreamId,
                        streamName: toStream?.name || '',
                        academicYear: toYear?.year || '',
                        updatedAt: now(),
                    },
                });
            } catch { /* ignore a bad id, continue promoting others */ }
            promoted++;
        }

        await auditLog(db, 'BULK_PROMOTION', 'student_enrollments', 'bulk', 'system', { from: fromClassId, fromStream: fromStreamId }, { to: toClassId, toStream: toStreamId, count: promoted });

        res.json({ message: `Promotion complete`, promoted, skipped, total: toPromote.length });
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
        res.status(201).json({ ok: true, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete('/v2/teacher-subjects/:id', async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('staff_subjects').deleteOne({ _id: toOid(req.params.id) });
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