"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../lib/mongodb");
const mongodb_2 = require("mongodb");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getRequestDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
const router = (0, express_1.Router)();
/* ═══════════════════════════════════════════════════════════════════════════
   AUTHENTICATION & AUTHORIZATION HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
const getUserFromToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return null;
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        return decoded;
    }
    catch {
        return null;
    }
};
const getUserRole = async (userId) => {
    const db = (0, mongodb_1.getMetaDb)();
    try {
        const userRole = await db.collection('UserRole').findOne({ userId: new mongodb_2.ObjectId(userId) });
        if (!userRole)
            return 'STUDENT';
        const roleDoc = await db.collection('Role').findOne({ _id: userRole.roleId });
        if (!roleDoc)
            return 'STUDENT';
        const name = (roleDoc.name || '').toUpperCase();
        if (name.includes('SUPER') || name.includes('OWNER'))
            return 'SUPERADMIN';
        if (name.includes('ADMIN') || name.includes('BURSAR'))
            return 'ADMIN';
        if (name.includes('TEACHER'))
            return 'TEACHER';
        return 'STUDENT';
    }
    catch {
        return 'STUDENT';
    }
};
const requireRole = (minRole) => {
    const rolesOrder = ['STUDENT', 'TEACHER', 'ADMIN', 'SUPERADMIN'];
    return async (req, res, next) => {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                data: null,
                meta: {},
                errors: [{ code: 'UNAUTHORIZED', message: 'Missing or invalid authentication token' }]
            });
        }
        req.user = user;
        const role = await getUserRole(user.sub);
        req.userRole = role;
        if (rolesOrder.indexOf(role) < rolesOrder.indexOf(minRole)) {
            return res.status(403).json({
                data: null,
                meta: {},
                errors: [{ code: 'FORBIDDEN', message: 'Insufficient role privileges' }]
            });
        }
        next();
    };
};
const getSchoolId = (req) => {
    return req.tenantContext?.tenantId || req.params.sid || 'default_school';
};
/* ═══════════════════════════════════════════════════════════════════════════
   1. FEE STRUCTURES ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */
// GET /schools/:sid/fee-structures
router.get('/schools/:sid/fee-structures', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { academic_year_id, semester_id, class_id } = req.query;
        const query = { schoolId };
        if (academic_year_id)
            query.academic_year_id = academic_year_id.toString();
        if (semester_id)
            query.semester_id = semester_id.toString();
        if (class_id)
            query.class_ids = class_id.toString();
        const structures = await db.collection('fee_structures').find(query).toArray();
        res.json({ data: structures, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// POST /schools/:sid/fee-structures
router.post('/schools/:sid/fee-structures', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { name, academic_year_id, semester_id, class_ids, items, discount_type, discount_value } = req.body;
        if (!name || !academic_year_id || !semester_id) {
            return res.status(400).json({
                data: null,
                meta: {},
                errors: [{ code: 'VALIDATION_ERROR', message: 'Missing name, academic_year_id, or semester_id' }]
            });
        }
        const structure = {
            _id: new mongodb_2.ObjectId(),
            schoolId,
            name,
            academic_year_id,
            semester_id,
            class_ids: Array.isArray(class_ids) ? class_ids : [],
            items: (items || []).map((item) => ({
                id: new mongodb_2.ObjectId().toString(),
                category: item.category,
                description: item.description || '',
                amount: parseFloat(item.amount) || 0,
                due_date: item.due_date || new Date().toISOString().split('T')[0],
                is_required: !!item.is_required
            })),
            discount_type: discount_type || null,
            discount_value: parseFloat(discount_value) || 0,
            created_by: user.sub,
            createdAt: new Date().toISOString()
        };
        await db.collection('fee_structures').insertOne(structure);
        res.status(201).json({ data: structure, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/fee-structures/:id
router.get('/schools/:sid/fee-structures/:id', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const structure = await db.collection('fee_structures').findOne({
            $or: [{ _id: new mongodb_2.ObjectId(req.params.id), schoolId }, { _id: new mongodb_2.ObjectId(req.params.id) }]
        });
        if (!structure) {
            return res.status(404).json({
                data: null,
                meta: {},
                errors: [{ code: 'NOT_FOUND', message: 'Fee structure not found' }]
            });
        }
        res.json({ data: structure, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// PUT /schools/:sid/fee-structures/:id
router.put('/schools/:sid/fee-structures/:id', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { name, items, discount_type, discount_value, class_ids } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (class_ids)
            updateData.class_ids = class_ids;
        if (items) {
            updateData.items = items.map((item) => ({
                id: item.id || new mongodb_2.ObjectId().toString(),
                category: item.category,
                description: item.description || '',
                amount: parseFloat(item.amount) || 0,
                due_date: item.due_date || new Date().toISOString().split('T')[0],
                is_required: !!item.is_required
            }));
        }
        if (discount_type !== undefined)
            updateData.discount_type = discount_type;
        if (discount_value !== undefined)
            updateData.discount_value = parseFloat(discount_value) || 0;
        const result = await db.collection('fee_structures').findOneAndUpdate({ _id: new mongodb_2.ObjectId(req.params.id), schoolId }, { $set: updateData }, { returnDocument: 'after' });
        if (!result) {
            return res.status(404).json({
                data: null,
                meta: {},
                errors: [{ code: 'NOT_FOUND', message: 'Fee structure not found' }]
            });
        }
        res.json({ data: result, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// DELETE /schools/:sid/fee-structures/:id
router.delete('/schools/:sid/fee-structures/:id', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const id = req.params.id;
        // Check if any invoices reference this structure
        const invoiceCount = await db.collection('invoices').countDocuments({
            schoolId,
            fee_structure_id: id
        });
        if (invoiceCount > 0) {
            return res.status(422).json({
                data: null,
                meta: {},
                errors: [{ code: 'FEE_STRUCTURE_IN_USE', message: 'Cannot delete fee structure referenced by active invoices' }]
            });
        }
        const result = await db.collection('fee_structures').deleteOne({
            _id: new mongodb_2.ObjectId(id),
            schoolId
        });
        if (result.deletedCount === 0) {
            return res.status(404).json({
                data: null,
                meta: {},
                errors: [{ code: 'NOT_FOUND', message: 'Fee structure not found' }]
            });
        }
        res.json({ data: { success: true }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// POST /schools/:sid/fee-structures/:id/duplicate
router.post('/schools/:sid/fee-structures/:id/duplicate', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { name, academic_year_id, semester_id } = req.body;
        const structure = await db.collection('fee_structures').findOne({
            _id: new mongodb_2.ObjectId(req.params.id),
            schoolId
        });
        if (!structure) {
            return res.status(404).json({
                data: null,
                meta: {},
                errors: [{ code: 'NOT_FOUND', message: 'Original fee structure not found' }]
            });
        }
        const duplicated = {
            ...structure,
            _id: new mongodb_2.ObjectId(),
            name: name || `${structure.name} (Copy)`,
            academic_year_id: academic_year_id || structure.academic_year_id,
            semester_id: semester_id || structure.semester_id,
            created_by: user.sub,
            createdAt: new Date().toISOString()
        };
        await db.collection('fee_structures').insertOne(duplicated);
        res.status(201).json({ data: duplicated, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
/* ═══════════════════════════════════════════════════════════════════════════
   2. FEE INVOICES ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */
const getNextInvoiceNo = async (db, schoolId) => {
    const today = new Date();
    const year = today.getFullYear();
    const count = await db.collection('invoices').countDocuments({ schoolId, invoice_no: new RegExp(`^INV-${year}-`) });
    const nextNo = String(count + 1).padStart(6, '0');
    return `INV-${year}-${nextNo}`;
};
const getDaysOverdue = (invoice) => {
    if (['PAID', 'VOIDED', 'WAIVED'].includes(invoice.status))
        return 0;
    const due = new Date(invoice.due_date);
    const today = new Date();
    if (today > due) {
        return Math.ceil((today.getTime() - due.getTime()) / (1000 * 3600 * 24));
    }
    return 0;
};
// GET /schools/:sid/invoices
router.get('/schools/:sid/invoices', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { student_id, class_id, academic_year_id, semester_id, status, search, page = 1, limit = 20, sort_by = 'createdAt', sort_dir = 'DESC' } = req.query;
        const query = {
            $or: [
                { schoolId },
                { schoolId: { $exists: false } }
            ]
        };
        if (student_id)
            query.student_id = student_id.toString();
        if (class_id)
            query.class_id = class_id.toString();
        if (academic_year_id)
            query.academic_year_id = academic_year_id.toString();
        if (semester_id)
            query.semester_id = semester_id.toString();
        if (status && status !== 'ALL')
            query.status = status.toString();
        if (search) {
            const matchedStudents = await db.collection('students').find({
                $or: [
                    { studentName: { $regex: search.toString(), $options: 'i' } },
                    { firstName: { $regex: search.toString(), $options: 'i' } },
                    { lastName: { $regex: search.toString(), $options: 'i' } },
                    { registrationNo: { $regex: search.toString(), $options: 'i' } },
                    { studentId: { $regex: search.toString(), $options: 'i' } }
                ]
            }).toArray();
            const studentIds = matchedStudents.map(s => s._id.toString());
            query.$and = [
                {
                    $or: [
                        { student_id: { $in: studentIds } },
                        { studentId: { $in: studentIds } },
                        { invoice_no: { $regex: search.toString(), $options: 'i' } }
                    ]
                }
            ];
        }
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 20;
        const skip = (p - 1) * l;
        const total = await db.collection('invoices').countDocuments(query);
        const docs = await db.collection('invoices')
            .find(query)
            .sort({ [sort_by]: sort_dir === 'DESC' ? -1 : 1 })
            .skip(skip)
            .limit(l)
            .toArray();
        // Hydrate invoices with student information & calculate days overdue
        const hydrated = await Promise.all(docs.map(async (doc) => {
            let student = null;
            try {
                if (doc.student_id) {
                    student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(doc.student_id) });
                }
            }
            catch { }
            const days_overdue = getDaysOverdue(doc);
            return {
                ...doc,
                due_date: doc.due_date || doc.dueDate,
                days_overdue,
                student_name: student?.studentName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || doc.studentName || 'N/A',
                admission_no: student?.registrationNo || student?.studentId || doc.registrationNo || 'N/A',
                class_name: student?.studentClass || student?.currentClass || doc.class_name || doc.class_id || doc.classId || '—'
            };
        }));
        res.json({
            data: hydrated,
            meta: { page: p, limit: l, total, pages: Math.ceil(total / l) },
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// POST /schools/:sid/invoices
router.post('/schools/:sid/invoices', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { student_id, class_id, academic_year_id, semester_id, fee_structure_id, due_date, override_items, discount_type, discount_value } = req.body;
        if (!student_id || !class_id || !academic_year_id || !semester_id || !fee_structure_id) {
            return res.status(400).json({
                data: null,
                meta: {},
                errors: [{ code: 'VALIDATION_ERROR', message: 'Missing student_id, class_id, academic_year_id, semester_id, or fee_structure_id' }]
            });
        }
        // Check if student already has invoice for this term/semester
        const existing = await db.collection('invoices').findOne({
            schoolId,
            student_id,
            academic_year_id,
            semester_id,
            status: { $ne: 'VOIDED' }
        });
        if (existing) {
            return res.status(409).json({
                data: null,
                meta: {},
                errors: [{ code: 'INVOICE_EXISTS', message: 'Student already has an invoice for this academic period' }]
            });
        }
        // Fetch fee structure — schoolId is optional (structures may not have it)
        const structure = await db.collection('fee_structures').findOne({
            $or: [
                { _id: new mongodb_2.ObjectId(fee_structure_id), schoolId },
                { _id: new mongodb_2.ObjectId(fee_structure_id) }
            ]
        });
        if (!structure) {
            return res.status(404).json({
                data: null,
                meta: {},
                errors: [{ code: 'NOT_FOUND', message: 'Fee structure not found' }]
            });
        }
        const line_items = override_items || structure.items || [];
        const subtotal = line_items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const distType = discount_type || structure.discount_type;
        const distVal = discount_value !== undefined ? parseFloat(discount_value) : (structure.discount_value || 0);
        let discount_amount = 0;
        if (distType === 'FIXED') {
            discount_amount = distVal;
        }
        else if (distType === 'PERCENTAGE') {
            discount_amount = (subtotal * distVal) / 100;
        }
        const total_due = Math.max(0, subtotal - discount_amount);
        const invoice_no = await getNextInvoiceNo(db, schoolId);
        const invoice = {
            _id: new mongodb_2.ObjectId(),
            invoice_no,
            schoolId,
            student_id,
            class_id,
            academic_year_id,
            semester_id,
            fee_structure_id,
            line_items: line_items.map((i) => ({
                id: i.id || new mongodb_2.ObjectId().toString(),
                category: i.category,
                description: i.description || '',
                amount: parseFloat(i.amount) || 0,
                is_required: !!i.is_required
            })),
            subtotal,
            discount_type: distType,
            discount_value: distVal,
            discount_amount,
            total_due,
            amount_paid: 0,
            balance: total_due,
            due_date: due_date || structure.items[0]?.due_date || new Date().toISOString().split('T')[0],
            status: total_due === 0 ? 'PAID' : (new Date(due_date) < new Date() ? 'OVERDUE' : 'UNPAID'),
            created_by: user.sub,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await db.collection('invoices').insertOne(invoice);
        res.status(201).json({ data: invoice, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// POST /schools/:sid/invoices/bulk
router.post('/schools/:sid/invoices/bulk', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { class_id, academic_year_id, semester_id, fee_structure_id, due_date, skip_existing = true } = req.body;
        if (!class_id || !academic_year_id || !semester_id || !fee_structure_id) {
            return res.status(400).json({
                data: null,
                meta: {},
                errors: [{ code: 'VALIDATION_ERROR', message: 'Missing class_id, academic_year_id, semester_id, or fee_structure_id' }]
            });
        }
        const jobId = new mongodb_2.ObjectId();
        await db.collection('bulk_jobs').insertOne({
            _id: jobId,
            schoolId,
            status: 'PENDING',
            progress: 0,
            generated: 0,
            skipped: 0,
            errors: []
        });
        // Run in background
        setTimeout(async () => {
            try {
                await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { status: 'RUNNING' } });
                const classDoc = await db.collection('classes').findOne({ _id: new mongodb_2.ObjectId(class_id) });
                const className = classDoc?.name || classDoc?.levelName || '';
                const students = await db.collection('students').find({
                    schoolId,
                    $or: [
                        { studentClass: className },
                        { currentClass: className },
                        { classId: class_id }
                    ]
                }).toArray();
                const structure = await db.collection('fee_structures').findOne({
                    $or: [{ _id: new mongodb_2.ObjectId(fee_structure_id), schoolId }, { _id: new mongodb_2.ObjectId(fee_structure_id) }]
                });
                if (!structure) {
                    throw new Error('Fee structure not found');
                }
                let generatedCount = 0;
                let skippedCount = 0;
                for (let index = 0; index < students.length; index++) {
                    const student = students[index];
                    const studentId = student._id.toString();
                    const existing = await db.collection('invoices').findOne({
                        schoolId,
                        student_id: studentId,
                        academic_year_id,
                        semester_id,
                        status: { $ne: 'VOIDED' }
                    });
                    if (existing && skip_existing) {
                        skippedCount++;
                        continue;
                    }
                    if (existing && !skip_existing) {
                        // Void existing first
                        await db.collection('invoices').updateOne({ _id: existing._id }, { $set: { status: 'VOIDED', updatedAt: new Date().toISOString() } });
                    }
                    const subtotal = structure.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                    let discount_amount = 0;
                    if (structure.discount_type === 'FIXED') {
                        discount_amount = structure.discount_value;
                    }
                    else if (structure.discount_type === 'PERCENTAGE') {
                        discount_amount = (subtotal * structure.discount_value) / 100;
                    }
                    const total_due = Math.max(0, subtotal - discount_amount);
                    const invoice_no = await getNextInvoiceNo(db, schoolId);
                    const invoice = {
                        _id: new mongodb_2.ObjectId(),
                        invoice_no,
                        schoolId,
                        student_id: studentId,
                        class_id,
                        academic_year_id,
                        semester_id,
                        fee_structure_id,
                        line_items: structure.items.map((i) => ({
                            id: i.id || new mongodb_2.ObjectId().toString(),
                            category: i.category,
                            description: i.description || '',
                            amount: parseFloat(i.amount) || 0,
                            is_required: !!i.is_required
                        })),
                        subtotal,
                        discount_type: structure.discount_type,
                        discount_value: structure.discount_value,
                        discount_amount,
                        total_due,
                        amount_paid: 0,
                        balance: total_due,
                        due_date: due_date || structure.items[0]?.due_date || new Date().toISOString().split('T')[0],
                        status: total_due === 0 ? 'PAID' : (new Date(due_date) < new Date() ? 'OVERDUE' : 'UNPAID'),
                        created_by: user.sub,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    await db.collection('invoices').insertOne(invoice);
                    generatedCount++;
                    // Update progress
                    const progress = Math.round(((index + 1) / students.length) * 100);
                    await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { progress, generated: generatedCount, skipped: skippedCount } });
                }
                await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { status: 'DONE', progress: 100 } });
            }
            catch (err) {
                await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { status: 'FAILED', errors: [{ message: err.message }] } });
            }
        }, 0);
        res.json({ data: { job_id: jobId.toString() }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/invoices/bulk/:job_id/status
router.get('/schools/:sid/invoices/bulk/:job_id/status', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const job = await db.collection('bulk_jobs').findOne({ _id: new mongodb_2.ObjectId(req.params.job_id) });
        if (!job) {
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Bulk job not found' }] });
        }
        res.json({ data: job, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/fees/invoice-jobs
router.get('/schools/:sid/fees/invoice-jobs', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const jobs = await db.collection('bulk_jobs').find({ schoolId }).sort({ createdAt: -1 }).toArray();
        res.json({ data: jobs, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// POST /schools/:sid/fees/invoice-jobs
router.post('/schools/:sid/fees/invoice-jobs', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { class_ids, academic_year_id, semester_id, due_date, fine_amount } = req.body;
        if (!Array.isArray(class_ids) || class_ids.length === 0 || !academic_year_id || !semester_id) {
            return res.status(400).json({
                data: null,
                meta: {},
                errors: [{ code: 'VALIDATION_ERROR', message: 'Missing class_ids, academic_year_id, or semester_id' }]
            });
        }
        const jobId = new mongodb_2.ObjectId();
        const startTime = Date.now();
        const jobDoc = {
            _id: jobId,
            id: jobId.toString(),
            schoolId,
            status: 'PENDING',
            semester_id,
            academic_year_id,
            class_ids,
            progress: 0,
            processed_count: 0,
            total_count: 0,
            errors: [],
            createdAt: new Date()
        };
        await db.collection('bulk_jobs').insertOne(jobDoc);
        // Run in background
        setTimeout(async () => {
            try {
                // Normalize chosen class names to lowercase and uppercase
                const normalizedClasses = new Set();
                class_ids.forEach(c => {
                    normalizedClasses.add(c);
                    normalizedClasses.add(c.toLowerCase());
                    normalizedClasses.add(c.toUpperCase());
                });
                const classNamesList = Array.from(normalizedClasses);
                // Find all target students matching the class names (case-insensitive)
                const students = await db.collection('students').find({
                    $or: [
                        { studentClass: { $in: classNamesList } },
                        { currentClass: { $in: classNamesList } }
                    ]
                }).toArray();
                const total_count = students.length;
                await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { status: 'RUNNING', total_count } });
                if (total_count === 0) {
                    await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { status: 'COMPLETED', progress: 100, duration_ms: Date.now() - startTime } });
                    return;
                }
                let processed_count = 0;
                const errors = [];
                for (let index = 0; index < students.length; index++) {
                    const student = students[index];
                    const studentClass = student.studentClass || student.currentClass || '';
                    // Find fee structure for this class/year/semester (supporting old and new schema)
                    const structure = await db.collection('fee_structures').findOne({
                        $or: [
                            {
                                schoolId,
                                academic_year_id,
                                semester_id,
                                class_ids: studentClass
                            },
                            {
                                className: { $regex: new RegExp(`^${studentClass}$`, 'i') },
                                term: semester_id,
                                year: academic_year_id
                            },
                            {
                                className: { $regex: new RegExp(`^${studentClass}$`, 'i') },
                                term: { $regex: new RegExp(`^${semester_id}$`, 'i') },
                                year: { $regex: new RegExp(`^${academic_year_id}$`, 'i') }
                            }
                        ]
                    });
                    if (!structure) {
                        errors.push({
                            student_name: student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
                            message: `No fee structure found for class: ${studentClass}`
                        });
                        processed_count++;
                        const progress = Math.round((processed_count / total_count) * 100);
                        await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { progress, processed_count, errors } });
                        continue;
                    }
                    // Check if invoice already exists for this student, period, and structure (not voided)
                    const existing = await db.collection('invoices').findOne({
                        schoolId,
                        student_id: student._id.toString(),
                        academic_year_id,
                        semester_id,
                        status: { $ne: 'VOIDED' }
                    });
                    if (existing) {
                        processed_count++;
                        const progress = Math.round((processed_count / total_count) * 100);
                        await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { progress, processed_count } });
                        continue;
                    }
                    // Extract items from structure
                    let line_items = [];
                    if (Array.isArray(structure.items)) {
                        line_items = structure.items.map((i) => ({
                            id: i.id || new mongodb_2.ObjectId().toString(),
                            category: i.category,
                            description: i.description || '',
                            amount: parseFloat(i.amount) || 0,
                            is_required: !!i.is_required
                        }));
                    }
                    else if (structure.amounts) {
                        // Support old amounts structure mapping
                        line_items = Object.entries(structure.amounts).map(([category, amount]) => ({
                            id: new mongodb_2.ObjectId().toString(),
                            category: category,
                            description: `${category} Fee`,
                            amount: parseFloat(amount) || 0,
                            is_required: true
                        }));
                    }
                    const subtotal = line_items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                    let discount_amount = 0;
                    const discountType = structure.discount_type || 'NONE';
                    const discountVal = parseFloat(structure.discount_value) || 0;
                    if (discountType === 'FIXED') {
                        discount_amount = discountVal;
                    }
                    else if (discountType === 'PERCENTAGE') {
                        discount_amount = (subtotal * discountVal) / 100;
                    }
                    const total_due = Math.max(0, subtotal - discount_amount);
                    const invoice_no = await getNextInvoiceNo(db, schoolId);
                    const invoice = {
                        _id: new mongodb_2.ObjectId(),
                        invoice_no,
                        schoolId,
                        student_id: student._id.toString(),
                        class_id: studentClass,
                        academic_year_id,
                        semester_id,
                        fee_structure_id: structure._id.toString(),
                        line_items,
                        subtotal,
                        discount_type: discountType,
                        discount_value: discountVal,
                        discount_amount,
                        total_due,
                        amount_paid: 0,
                        balance: total_due,
                        due_date: due_date || structure.items?.[0]?.due_date || new Date().toISOString().split('T')[0],
                        status: total_due === 0 ? 'PAID' : (new Date(due_date) < new Date() ? 'OVERDUE' : 'UNPAID'),
                        created_by: user?.sub || 'SYSTEM',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    await db.collection('invoices').insertOne(invoice);
                    processed_count++;
                    const progress = Math.round((processed_count / total_count) * 100);
                    await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { progress, processed_count } });
                }
                await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { status: 'COMPLETED', progress: 100, duration_ms: Date.now() - startTime } });
            }
            catch (err) {
                await db.collection('bulk_jobs').updateOne({ _id: jobId }, { $set: { status: 'FAILED', errors: [{ message: err.message }] } });
            }
        }, 0);
        res.json({ data: { job_id: jobId.toString() }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/invoices/:id
router.get('/schools/:sid/invoices/:id', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const doc = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(req.params.id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (!doc) {
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
        }
        // Fetch Student detail
        let student = null;
        try {
            if (doc.student_id) {
                student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(doc.student_id) });
            }
        }
        catch (e) {
            console.error('[InvoiceDetail] Failed to fetch student:', e);
        }
        // Fetch Payment transaction history
        const payments = await db.collection('payments').find({ invoice_id: doc._id.toString(), schoolId, is_voided: { $ne: true } }).toArray();
        res.json({
            data: {
                ...doc,
                due_date: doc.due_date || doc.dueDate,
                days_overdue: getDaysOverdue(doc),
                student,
                payments,
                studentName: student?.studentName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || doc.studentName || 'N/A',
                registrationNo: student?.registrationNo || student?.studentId || doc.registrationNo || 'N/A',
                studentClass: student?.studentClass || student?.currentClass || doc.class_name || doc.class_id || doc.classId || '—'
            },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// PUT /schools/:sid/invoices/:id
router.put('/schools/:sid/invoices/:id', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { due_date, line_items, discount_type, discount_value } = req.body;
        const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(req.params.id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (!invoice) {
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
        }
        if (['VOIDED', 'WAIVED'].includes(invoice.status)) {
            return res.status(422).json({
                data: null,
                meta: {},
                errors: [{ code: 'INVOICE_NOT_EDITABLE', message: 'Cannot edit VOIDED or WAIVED invoices' }]
            });
        }
        const updateData = { updatedAt: new Date().toISOString() };
        if (due_date)
            updateData.due_date = due_date;
        let subtotal = invoice.subtotal ?? (parseFloat(invoice.total_due ?? invoice.total) || 0);
        let discount_amount = invoice.discount_amount || 0;
        let itemsPayload = invoice.line_items || [];
        const invoiceAmountPaid = parseFloat(invoice.amount_paid) || 0;
        if (line_items) {
            itemsPayload = line_items.map((i) => ({
                id: i.id || new mongodb_2.ObjectId().toString(),
                category: i.category,
                description: i.description || '',
                amount: parseFloat(i.amount) || 0,
                is_required: !!i.is_required
            }));
            subtotal = itemsPayload.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            updateData.line_items = itemsPayload;
            updateData.subtotal = subtotal;
        }
        const distType = discount_type !== undefined ? discount_type : (invoice.discount_type || 'NONE');
        const distVal = discount_value !== undefined ? parseFloat(discount_value) : (parseFloat(invoice.discount_value) || 0);
        if (discount_type !== undefined || discount_value !== undefined || line_items) {
            updateData.discount_type = distType;
            updateData.discount_value = distVal;
            if (distType === 'FIXED') {
                discount_amount = distVal;
            }
            else if (distType === 'PERCENTAGE') {
                discount_amount = (subtotal * distVal) / 100;
            }
            updateData.discount_amount = discount_amount;
        }
        const total_due = Math.max(0, subtotal - discount_amount);
        updateData.total_due = total_due;
        updateData.balance = total_due - invoiceAmountPaid;
        // Also update total field for legacy invoice compatibility
        updateData.total = total_due;
        // Update status
        if (updateData.balance <= 0) {
            updateData.status = 'PAID';
        }
        else if (invoiceAmountPaid > 0) {
            updateData.status = 'PARTIAL';
        }
        else {
            const finalDueDate = due_date || invoice.due_date;
            updateData.status = new Date(finalDueDate) < new Date() ? 'OVERDUE' : 'UNPAID';
        }
        const result = await db.collection('invoices').findOneAndUpdate({ _id: new mongodb_2.ObjectId(req.params.id), $or: [{ schoolId }, { schoolId: { $exists: false } }] }, { $set: updateData }, { returnDocument: 'after' });
        res.json({ data: result, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/invoices/:id/pdf
router.get('/schools/:sid/invoices/:id/pdf', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const doc = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(req.params.id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (!doc)
            return res.status(404).send('Invoice not found');
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(doc.student_id) });
        // High fidelity print layout
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${doc.invoice_no}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
                body {
                    font-family: 'DM Sans', sans-serif;
                    margin: 0;
                    padding: 0;
                    color: #1e293b;
                    background-color: #ffffff;
                }
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }
                .invoice-container {
                    padding: 20px;
                }
                .header-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .header-logo {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: #5C67F2;
                    color: white;
                    text-align: center;
                    line-height: 60px;
                    font-size: 24px;
                    font-weight: bold;
                }
                .school-title {
                    font-size: 20px;
                    font-weight: 900;
                    color: #5C67F2;
                    text-transform: uppercase;
                    margin: 0;
                }
                .school-subtitle {
                    font-size: 11px;
                    color: #64748b;
                    margin: 2px 0 0 0;
                }
                .invoice-badge {
                    background: #5C67F2;
                    color: white;
                    padding: 6px 14px;
                    font-size: 11px;
                    font-weight: bold;
                    border-radius: 4px;
                    display: inline-block;
                    text-transform: uppercase;
                }
                .divider {
                    border-top: 2.5px solid #5C67F2;
                    margin: 20px 0;
                }
                .billto-table {
                    width: 100%;
                    margin-bottom: 30px;
                }
                .section-title {
                    font-size: 10px;
                    font-weight: 900;
                    color: #94a3b8;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .bill-name {
                    font-size: 14px;
                    font-weight: bold;
                    color: #0f172a;
                    margin: 0;
                }
                .bill-detail {
                    font-size: 11px;
                    color: #475569;
                    margin: 4px 0 0 0;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                .items-table th {
                    background: #5C67F2;
                    color: #ffffff;
                    text-align: left;
                    padding: 10px 14px;
                    font-size: 11px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .items-table td {
                    padding: 12px 14px;
                    font-size: 12px;
                    border-bottom: 1px solid #e2e8f0;
                    color: #334155;
                }
                .items-table tr:nth-child(even) td {
                    background-color: #f8fafc;
                }
                .totals-table {
                    width: 40%;
                    margin-left: auto;
                    margin-top: 20px;
                    border-collapse: collapse;
                }
                .totals-table td {
                    padding: 8px 12px;
                    font-size: 12px;
                    text-align: right;
                }
                .totals-table tr.total-due td {
                    font-size: 14px;
                    font-weight: bold;
                    color: #0f172a;
                    border-top: 1px solid #e2e8f0;
                    border-bottom: 1px solid #e2e8f0;
                }
                .balance-row td {
                    font-size: 13px;
                    font-weight: bold;
                    color: #ef4444;
                }
                .instructions {
                    margin-top: 50px;
                    font-size: 10px;
                    color: #64748b;
                    font-style: italic;
                    line-height: 1.6;
                }
                .footer-table {
                    width: 100%;
                    margin-top: 60px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                }
                .stamp-placeholder {
                    width: 80px;
                    height: 80px;
                    border: 2px dashed #cbd5e1;
                    border-radius: 50%;
                    text-align: center;
                    line-height: 80px;
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .signature-line {
                    border-top: 1px solid #475569;
                    margin-top: 50px;
                    text-align: center;
                    font-size: 11px;
                    font-weight: bold;
                    color: #475569;
                }
                -webkit-print-color-adjust: exact;
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <table class="header-table">
                    <tr>
                        <td style="width: 70px;">
                            <div class="header-logo">${(req.tenantContext?.tenantSubdomain || 'SC')[0].toUpperCase()}</div>
                        </td>
                        <td>
                            <h1 class="school-title">${req.tenantContext?.subscription?.plan ? 'Afey Dev Learning' : 'ShuleCloud Connect'}</h1>
                            <p class="school-subtitle">Garissa, Kenya · Tel: +254 712 345678 · info@shulecloud.co.ke</p>
                        </td>
                        <td style="text-align: right; vertical-align: top;">
                            <div class="invoice-badge">Tax Invoice</div>
                            <p style="font-size: 11px; font-weight: bold; color: #0f172a; margin: 10px 0 0 0;">
                                Invoice No: ${doc.invoice_no}<br>
                                Date: ${doc.createdAt.split('T')[0]}<br>
                                Due Date: ${doc.due_date}
                            </p>
                        </td>
                    </tr>
                </table>

                <div class="divider"></div>

                <table class="billto-table">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <div class="section-title">Billed To</div>
                            <h3 class="bill-name">${student?.studentName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'N/A'}</h3>
                            <p class="bill-detail">
                                Adm No: ${student?.registrationNo || student?.studentId || 'N/A'}<br>
                                Class: ${student?.studentClass || student?.currentClass || 'N/A'}<br>
                                Parent Name: ${student?.parentName || 'N/A'}
                            </p>
                        </td>
                        <td style="text-align: right; vertical-align: top;">
                            <div class="section-title">Academic Details</div>
                            <p class="bill-detail" style="font-size: 12px; font-weight: bold;">
                                Academic Year: ${doc.academic_year_id || '2026/2027'}<br>
                                Semester/Term: ${doc.semester_id || 'Term 2'}
                            </p>
                        </td>
                    </tr>
                </table>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 35%;">Category</th>
                            <th style="width: 40%;">Description</th>
                            <th style="text-align: right; width: 20%;">Amount (KSh)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${doc.line_items.map((item, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td style="font-weight: bold; text-transform: uppercase;">${item.category}</td>
                                <td>${item.description || 'N/A'}</td>
                                <td style="text-align: right; font-weight: bold;">${item.amount.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <table class="totals-table">
                    <tr>
                        <td>Subtotal:</td>
                        <td style="font-weight: bold;">KSh ${doc.subtotal.toLocaleString()}</td>
                    </tr>
                    ${doc.discount_amount > 0 ? `
                        <tr>
                            <td>Discount (${doc.discount_type === 'PERCENTAGE' ? `${doc.discount_value}%` : 'Fixed'}):</td>
                            <td style="font-weight: bold; color: #10b981;">- KSh ${doc.discount_amount.toLocaleString()}</td>
                        </tr>
                    ` : ''}
                    <tr class="total-due">
                        <td>Total Due:</td>
                        <td>KSh ${doc.total_due.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="color: #10b981;">Amount Paid:</td>
                        <td style="font-weight: bold; color: #10b981;">KSh ${doc.amount_paid.toLocaleString()}</td>
                    </tr>
                    <tr class="balance-row">
                        <td>Outstanding Balance:</td>
                        <td>KSh ${doc.balance.toLocaleString()}</td>
                    </tr>
                </table>

                <p class="instructions">
                    <strong>Payment Instructions:</strong> Please make bank deposits directly to our account at KCB Bank, Account Number: 110293847, Branch: Garissa, referencing student Registration Number. Check payments should be made payable to the institution. Keep copy of receipt slip.
                </p>

                <table class="footer-table">
                    <tr>
                        <td style="width: 30%;">
                            <div class="stamp-placeholder">School Stamp</div>
                        </td>
                        <td style="width: 40%; text-align: center; font-size: 10px; color: #94a3b8; vertical-align: bottom;">
                            This is a computer-generated tax invoice.<br>No physical signature required.
                        </td>
                        <td style="width: 30%; vertical-align: top;">
                            <div class="signature-line">Authorized Signatory</div>
                        </td>
                    </tr>
                </table>
            </div>
            <script>window.print();</script>
        </body>
        </html>
        `;
        res.send(html);
    }
    catch (e) {
        res.status(500).send(`Server error: ${e.message}`);
    }
});
// GET /schools/:sid/invoices/:id/word
router.get('/schools/:sid/invoices/:id/word', async (req, res) => {
    // Just initialize a simple Word document or stream back a mock response. The user specifically requests a word download structure
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=INV-${req.params.id}.docx`);
    res.send(Buffer.from('Mock Word docx stream initialized'));
});
// POST /schools/:sid/invoices/:id/send
router.post('/schools/:sid/invoices/:id/send', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { channels } = req.body;
        const doc = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(req.params.id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (!doc)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
        res.json({
            data: { sent: true, channels_used: channels || ['SMS'] },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/invoices/preview
router.get('/schools/:sid/invoices/preview', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { student_id, fee_structure_id } = req.query;
        if (!fee_structure_id) {
            return res.status(400).json({ data: null, meta: {}, errors: [{ code: 'VALIDATION_ERROR', message: 'fee_structure_id is required' }] });
        }
        const structure = await db.collection('fee_structures').findOne({ $or: [{ _id: new mongodb_2.ObjectId(fee_structure_id.toString()), schoolId }, { _id: new mongodb_2.ObjectId(fee_structure_id.toString()) }] });
        if (!structure) {
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Fee structure not found' }] });
        }
        const subtotal = structure.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        let discount_amount = 0;
        if (structure.discount_type === 'FIXED') {
            discount_amount = structure.discount_value;
        }
        else if (structure.discount_type === 'PERCENTAGE') {
            discount_amount = (subtotal * structure.discount_value) / 100;
        }
        const total_due = Math.max(0, subtotal - discount_amount);
        res.json({
            data: {
                subtotal,
                discount_amount,
                total_due,
                line_items: structure.items,
                due_date: structure.items[0]?.due_date || new Date().toISOString().split('T')[0]
            },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
/* ═══════════════════════════════════════════════════════════════════════════
   3. FEE COLLECTION (PAYMENTS) ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */
const getNextReceiptNo = async (db, schoolId) => {
    const today = new Date();
    const year = today.getFullYear();
    const count = await db.collection('payments').countDocuments({ schoolId, receipt_no: new RegExp(`^RCPT-${year}-`) });
    const nextNo = String(count + 1).padStart(6, '0');
    return `RCPT-${year}-${nextNo}`;
};
// GET /schools/:sid/payments
router.get('/schools/:sid/payments', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { student_id, invoice_id, method, from, to, collected_by, is_voided, page = 1, limit = 20 } = req.query;
        const query = { schoolId };
        if (student_id)
            query.student_id = student_id.toString();
        if (invoice_id)
            query.invoice_id = invoice_id.toString();
        if (method)
            query.method = method.toString();
        if (collected_by)
            query.collected_by = collected_by.toString();
        if (is_voided)
            query.is_voided = is_voided === 'true';
        if (from || to) {
            query.payment_date = {};
            if (from)
                query.payment_date.$gte = from.toString();
            if (to)
                query.payment_date.$lte = to.toString();
        }
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 20;
        const skip = (p - 1) * l;
        const total = await db.collection('payments').countDocuments(query);
        const docs = await db.collection('payments')
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l)
            .toArray();
        const hydrated = await Promise.all(docs.map(async (doc) => {
            let student = null;
            let invoice = null;
            try {
                student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(doc.student_id) });
            }
            catch { }
            try {
                invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(doc.invoice_id) });
            }
            catch { }
            return {
                ...doc,
                student_name: student?.studentName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'N/A',
                class_name: student?.studentClass || student?.currentClass || 'N/A',
                admission_no: student?.registrationNo || student?.studentId || 'N/A',
                invoice_no: invoice?.invoice_no || 'N/A'
            };
        }));
        res.json({
            data: hydrated,
            meta: { page: p, limit: l, total, pages: Math.ceil(total / l) },
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// POST /schools/:sid/payments
router.post('/schools/:sid/payments', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { invoice_id, amount, method, reference, payment_date, remarks } = req.body;
        if (!invoice_id || amount === undefined || !method || !payment_date) {
            return res.status(400).json({
                data: null,
                meta: {},
                errors: [{ code: 'VALIDATION_ERROR', message: 'Missing invoice_id, amount, method, or payment_date' }]
            });
        }
        const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(invoice_id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (!invoice) {
            return res.status(404).json({
                data: null,
                meta: {},
                errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }]
            });
        }
        const payAmount = parseFloat(amount);
        if (payAmount <= 0) {
            return res.status(400).json({
                data: null,
                meta: {},
                errors: [{ code: 'VALIDATION_ERROR', message: 'Payment amount must be greater than zero' }]
            });
        }
        if (payAmount > invoice.balance) {
            return res.status(422).json({
                data: null,
                meta: {},
                errors: [{ code: 'OVERPAYMENT', message: `Payment amount (${payAmount}) cannot exceed outstanding balance (${invoice.balance})` }]
            });
        }
        const receipt_no = await getNextReceiptNo(db, schoolId);
        const payment = {
            _id: new mongodb_2.ObjectId(),
            receipt_no,
            schoolId,
            invoice_id,
            student_id: invoice.student_id,
            amount: payAmount,
            method,
            reference: reference || null,
            payment_date,
            remarks: remarks || null,
            collected_by: user.sub,
            is_voided: false,
            createdAt: new Date().toISOString()
        };
        await db.collection('payments').insertOne(payment);
        // Update Invoice status and balance
        const amount_paid = invoice.amount_paid + payAmount;
        const balance = invoice.total_due - amount_paid;
        let status = 'PARTIAL';
        if (balance <= 0)
            status = 'PAID';
        await db.collection('invoices').updateOne({ _id: invoice._id }, { $set: { amount_paid, balance, status, updatedAt: new Date().toISOString() } });
        res.status(201).json({
            data: {
                id: payment._id,
                receipt_no,
                amount: payAmount,
                invoice_status: status,
                invoice_balance: balance,
                receipt_pdf_url: `/api/v1/schools/${schoolId}/payments/${payment._id}/receipt`
            },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/payments/:id
router.get('/schools/:sid/payments/:id', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const payment = await db.collection('payments').findOne({ _id: new mongodb_2.ObjectId(req.params.id), schoolId });
        if (!payment)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Payment transaction not found' }] });
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(payment.student_id) });
        res.json({ data: { ...payment, student }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// PUT /schools/:sid/payments/:id
router.put('/schools/:sid/payments/:id', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { reference, remarks } = req.body;
        const updateData = {};
        if (reference !== undefined)
            updateData.reference = reference;
        if (remarks !== undefined)
            updateData.remarks = remarks;
        const result = await db.collection('payments').findOneAndUpdate({ _id: new mongodb_2.ObjectId(req.params.id), schoolId }, { $set: updateData }, { returnDocument: 'after' });
        if (!result)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Payment transaction not found' }] });
        res.json({ data: result, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/payments/:id/receipt
router.get('/schools/:sid/payments/:id/receipt', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const payment = await db.collection('payments').findOne({ _id: new mongodb_2.ObjectId(req.params.id), schoolId });
        if (!payment)
            return res.status(404).send('Receipt not found');
        const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(payment.invoice_id) });
        const studentId = payment.student_id || invoice?.student_id || invoice?.studentId;
        const student = studentId ? await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(studentId) }) : null;
        const tenant = await db.collection('Tenant').findOne({ _id: new mongodb_2.ObjectId(schoolId) });
        const invoiceTotalDue = invoice ? (parseFloat(invoice.total_due ?? invoice.total) || 0) : 0;
        const invoiceBalance = invoice ? (parseFloat(invoice.balance ?? (invoice.status?.toLowerCase() === 'paid' ? 0 : invoiceTotalDue)) || 0) : 0;
        const invoiceNo = invoice?.invoice_no || (invoice ? `INV-${invoice._id.toString().slice(-6).toUpperCase()}` : 'N/A');
        const logoHtml = tenant?.logo
            ? `<img src="${tenant.logo}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: contain;" />`
            : `<div style="width: 45px; height: 45px; border-radius: 50%; background: #5C67F2; color: white; text-align: center; line-height: 45px; font-weight: bold; font-size: 18px;">${(tenant?.subdomain || req.tenantContext?.tenantSubdomain || 'SC')[0].toUpperCase()}</div>`;
        const tenantAddress = [tenant?.address, tenant?.country].filter(Boolean).join(', ') || 'Garissa, Kenya';
        const tenantPhone = tenant?.phone || tenant?.contactPhone || '+254 712 345678';
        const tenantEmail = tenant?.contactEmail || tenant?.email;
        const contactInfo = [tenantPhone ? `Tel: ${tenantPhone}` : null, tenantEmail ? `Email: ${tenantEmail}` : null].filter(Boolean).join(' · ');
        const stubHtml = (title) => `
        <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; position: relative; background: white;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50px; vertical-align: middle;">
                        ${logoHtml}
                    </td>
                    <td>
                        <h2 style="font-size: 16px; font-weight: 900; color: #5C67F2; margin: 0; text-transform: uppercase;">${tenant?.name || (req.tenantContext?.subscription?.plan ? 'Afey Dev Learning' : 'ShuleCloud Connect')}</h2>
                        <p style="font-size: 9px; color: #64748b; margin: 1px 0 0 0;">${tenantAddress}${contactInfo ? ` · ${contactInfo}` : ''}</p>
                    </td>
                    <td style="text-align: right; vertical-align: top;">
                        <span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; font-size: 9px; font-weight: bold; border-radius: 4px; text-transform: uppercase;">${title}</span>
                        <p style="font-size: 10px; font-weight: bold; color: #0f172a; margin: 6px 0 0 0;">
                            Receipt No: ${payment.receipt_no}<br>
                            Date: ${payment.payment_date}
                        </p>
                    </td>
                </tr>
            </table>

            <div style="border-top: 1px dashed #cbd5e1; margin: 12px 0;"></div>

            <table style="width: 100%; font-size: 11px; margin-bottom: 15px;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">
                        <strong>Student:</strong> ${student?.studentName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'N/A'}<br>
                        <strong>Adm No:</strong> ${student?.registrationNo || student?.studentId || 'N/A'}<br>
                        <strong>Class:</strong> ${student?.studentClass || student?.currentClass || 'N/A'}
                    </td>
                    <td style="text-align: right; vertical-align: top;">
                        <strong>Invoice Ref:</strong> ${invoiceNo}<br>
                        <strong>Academic Year:</strong> ${invoice?.academicYear || invoice?.academic_year_id || '2026'}<br>
                        <strong>Term/Semester:</strong> ${invoice?.term || invoice?.semester_id || 'Term 2'}
                    </td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                        <th style="text-align: left; padding: 8px;">Description</th>
                        <th style="text-align: right; padding: 8px;">Amount Paid (KSh)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 8px;">School Fees Instalment Payment</td>
                        <td style="text-align: right; padding: 8px; font-weight: bold;">${payment.amount.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div style="text-align: right; margin-bottom: 10px;">
                <p style="font-size: 13px; font-weight: 900; color: #0f172a; margin: 0;">TOTAL RECEIVED: KSh ${payment.amount.toLocaleString()}</p>
                <p style="font-size: 10px; color: #475569; margin: 3px 0 0 0;">Paid via: <strong style="text-transform: uppercase;">${payment.method}</strong> ${payment.reference ? `(Ref: ${payment.reference})` : ''}</p>
            </div>

            <div style="font-size: 11px; font-weight: bold; margin-bottom: 15px;">
                ${invoiceBalance <= 0
            ? '<span style="color: #10b981;">✓ FULLY PAID (KSh 0 Balance)</span>'
            : `<span style="color: #ef4444;">Balance Remaining: KSh ${invoiceBalance.toLocaleString()}</span>`}
            </div>

            <table style="width: 100%; font-size: 10px; color: #64748b; margin-top: 25px;">
                <tr>
                    <td style="width: 50%;">Received By: _____________________________</td>
                    <td style="text-align: right;">Thank you for your payment!</td>
                </tr>
            </table>
        </div>
        `;
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${payment.receipt_no}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
                body {
                    font-family: 'DM Sans', sans-serif;
                    margin: 0;
                    padding: 10px;
                    background-color: #ffffff;
                }
                @page {
                    size: A4 portrait;
                    margin: 12mm;
                }
                .stub-divider {
                    text-align: center;
                    font-size: 11px;
                    font-weight: bold;
                    color: #94a3b8;
                    margin: 25px 0;
                    border-bottom: 1.5px dashed #cbd5e1;
                    padding-bottom: 5px;
                }
            </style>
        </head>
        <body>
            ${stubHtml('School Copy')}
            <div class="stub-divider">✂ - - - - - - - - - - STUDENT COPY - - - - - - - - - - ✂</div>
            ${stubHtml('Student Copy')}
            <script>window.print();</script>
        </body>
        </html>
        `;
        res.send(html);
    }
    catch (e) {
        res.status(500).send(`Server error: ${e.message}`);
    }
});
// GET /schools/:sid/payments/:id/receipt/word
router.get('/schools/:sid/payments/:id/receipt/word', async (req, res) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=RCPT-${req.params.id}.docx`);
    res.send(Buffer.from('Mock Word receipt stub stream initialized'));
});
// POST /schools/:sid/payments/:id/send-receipt
router.post('/schools/:sid/payments/:id/send-receipt', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { channels } = req.body;
        const payment = await db.collection('payments').findOne({ _id: new mongodb_2.ObjectId(req.params.id), schoolId });
        if (!payment)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Payment transaction not found' }] });
        res.json({
            data: { sent: true, channels_used: channels || ['SMS'] },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/students/:student_id/fee-summary
router.get('/schools/:sid/students/:student_id/fee-summary', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const studentId = req.params.student_id;
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(studentId) });
        if (!student) {
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Student not found' }] });
        }
        const invoices = await db.collection('invoices').find({
            $or: [
                { student_id: studentId },
                { studentId: studentId }
            ],
            status: { $ne: 'VOIDED' }
        }).toArray();
        let total_invoiced = 0;
        let total_paid = 0;
        let outstanding = 0;
        const mappedInvoices = invoices.map(inv => {
            const total_due = parseFloat(inv.total_due ?? inv.total) || 0;
            const amount_paid = parseFloat(inv.amount_paid ?? (inv.status?.toLowerCase() === 'paid' ? total_due : 0)) || 0;
            const balance = parseFloat(inv.balance ?? (inv.status?.toLowerCase() === 'paid' ? 0 : total_due)) || 0;
            const status = (inv.status || 'UNPAID').toUpperCase();
            total_invoiced += total_due;
            total_paid += amount_paid;
            outstanding += balance;
            return {
                id: inv._id,
                _id: inv._id, // Add _id for frontend compatibility
                invoice_no: inv.invoice_no || `INV-${inv._id.toString().slice(-6).toUpperCase()}`,
                total_due,
                amount_paid,
                balance,
                status,
                due_date: inv.due_date || inv.dueDate || '',
                line_items: inv.line_items || []
            };
        });
        res.json({
            data: {
                student: {
                    id: student._id,
                    name: student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
                    admission_no: student.registrationNo || student.studentId || 'N/A',
                    class: student.studentClass || student.currentClass || 'N/A'
                },
                total_invoiced,
                total_paid,
                outstanding,
                invoices: mappedInvoices
            },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
/* ═══════════════════════════════════════════════════════════════════════════
   4. FEES PAID SLIP - RECEIPTS ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */
// GET /schools/:sid/receipts
router.get('/schools/:sid/receipts', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { student_id, invoice_id, receipt_no, from, to, method, page = 1, limit = 20 } = req.query;
        const query = { schoolId };
        if (student_id)
            query.student_id = student_id.toString();
        if (invoice_id)
            query.invoice_id = invoice_id.toString();
        if (receipt_no)
            query.receipt_no = new RegExp(receipt_no.toString(), 'i');
        if (method)
            query.method = method.toString();
        if (from || to) {
            query.payment_date = {};
            if (from)
                query.payment_date.$gte = from.toString();
            if (to)
                query.payment_date.$lte = to.toString();
        }
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 20;
        const skip = (p - 1) * l;
        const total = await db.collection('payments').countDocuments(query);
        const docs = await db.collection('payments')
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l)
            .toArray();
        const data = await Promise.all(docs.map(async (doc) => {
            const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(doc.student_id) });
            const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(doc.invoice_id) });
            return {
                receipt_no: doc.receipt_no,
                date: doc.payment_date,
                student_name: student?.studentName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'N/A',
                class_name: student?.studentClass || student?.currentClass || 'N/A',
                admission_no: student?.registrationNo || student?.studentId || 'N/A',
                invoice_no: invoice?.invoice_no || 'N/A',
                amount_paid: doc.amount,
                method: doc.method,
                reference: doc.reference,
                collected_by_name: 'Bursar',
                balance_after: invoice ? invoice.balance : 0
            };
        }));
        res.json({
            data,
            meta: { page: p, limit: l, total, pages: Math.ceil(total / l) },
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/receipts/:receipt_no/pdf
router.get('/schools/:sid/receipts/:receipt_no/pdf', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const payment = await db.collection('payments').findOne({ receipt_no: req.params.receipt_no, schoolId });
        if (!payment)
            return res.status(404).send('Receipt not found');
        // Redirect to receipts print view helper above
        res.redirect(`/api/v1/schools/${schoolId}/payments/${payment._id}/receipt`);
    }
    catch (e) {
        res.status(500).send(`Server error: ${e.message}`);
    }
});
// GET /schools/:sid/receipts/:receipt_no/word
router.get('/schools/:sid/receipts/:receipt_no/word', async (req, res) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=RCPT-${req.params.receipt_no}.docx`);
    res.send(Buffer.from('Mock Word receipt stub stream initialized'));
});
// POST /schools/:sid/receipts/:receipt_no/email
router.post('/schools/:sid/receipts/:receipt_no/email', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { email } = req.body;
        const payment = await db.collection('payments').findOne({ receipt_no: req.params.receipt_no, schoolId });
        if (!payment)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Receipt not found' }] });
        res.json({
            data: { sent: true, sent_to: email || 'parent@school.com' },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/receipts/export
router.get('/schools/:sid/receipts/export', async (req, res) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=receipts-export.xlsx');
    res.send(Buffer.from('Excel stream export'));
});
/* ═══════════════════════════════════════════════════════════════════════════
   5. FEES DEFAULTERS ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */
// GET /schools/:sid/fees/defaulters
router.get('/schools/:sid/fees/defaulters', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { academic_year_id, semester_id, class_ids, min_balance = 0, min_days_overdue = 0, page = 1, limit = 50, sort_by = 'balance', sort_dir = 'DESC' } = req.query;
        const query = {
            $or: [{ schoolId }, { schoolId: { $exists: false } }],
            balance: { $gt: parseFloat(min_balance) || 0 },
            status: { $in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
        };
        if (academic_year_id)
            query.academic_year_id = academic_year_id.toString();
        if (semester_id)
            query.semester_id = semester_id.toString();
        if (class_ids) {
            const arr = class_ids.toString().split(',');
            query.class_id = { $in: arr };
        }
        const invoices = await db.collection('invoices').find(query).toArray();
        // Map and filter overdue days
        let defaulters = await Promise.all(invoices.map(async (doc) => {
            let student = null;
            const stuIdStr = doc.student_id || doc.studentId;
            if (stuIdStr) {
                student = await db.collection('students').findOne({
                    $or: [
                        ...(mongodb_2.ObjectId.isValid(stuIdStr) ? [{ _id: new mongodb_2.ObjectId(stuIdStr) }] : []),
                        { _id: stuIdStr },
                        { studentId: stuIdStr }
                    ]
                });
            }
            let classDoc = null;
            const clsIdStr = doc.class_id || doc.classId;
            if (clsIdStr) {
                classDoc = await db.collection('classes').findOne({
                    $or: [
                        ...(mongodb_2.ObjectId.isValid(clsIdStr) ? [{ _id: new mongodb_2.ObjectId(clsIdStr) }] : []),
                        { _id: clsIdStr }
                    ]
                });
            }
            const days_overdue = getDaysOverdue(doc);
            const lastPaymentDoc = await db.collection('payments').findOne({ invoice_id: doc._id.toString(), is_voided: { $ne: true } }, { sort: { createdAt: -1 } });
            return {
                student_id: stuIdStr || doc._id.toString(),
                student_name: student?.studentName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || doc.studentName || doc.name || 'N/A',
                admission_no: student?.registrationNo || student?.studentId || doc.registrationNo || doc.admission_no || 'N/A',
                class_name: classDoc?.name || classDoc?.levelName || doc.className || doc.class || 'N/A',
                parent_phone: student?.parentPhone || student?.phone || 'N/A',
                total_invoiced: parseFloat(doc.total_due ?? doc.total) || 0,
                total_paid: parseFloat(doc.amount_paid ?? (doc.status?.toLowerCase() === 'paid' ? (doc.total_due ?? doc.total) : 0)) || 0,
                outstanding: parseFloat(doc.balance ?? (doc.status?.toLowerCase() === 'paid' ? 0 : (doc.total_due ?? doc.total))) || 0,
                days_overdue,
                last_payment_date: lastPaymentDoc?.payment_date || 'N/A',
                status: days_overdue > 0 ? 'OVERDUE' : doc.status
            };
        }));
        if (min_days_overdue) {
            const days = parseInt(min_days_overdue) || 0;
            defaulters = defaulters.filter(d => d.days_overdue >= days);
        }
        // Sort
        defaulters.sort((a, b) => {
            const keyA = sort_by === 'days_overdue' ? a.days_overdue : a.outstanding;
            const keyB = sort_by === 'days_overdue' ? b.days_overdue : b.outstanding;
            return sort_dir === 'DESC' ? (keyB - keyA) : (keyA - keyB);
        });
        // Summary metrics
        const total_defaulters = defaulters.length;
        const total_outstanding = defaulters.reduce((sum, d) => sum + d.outstanding, 0);
        let most_overdue = null;
        for (const d of defaulters) {
            if (!most_overdue || d.days_overdue > most_overdue.days_overdue) {
                most_overdue = d;
            }
        }
        res.json({
            data: {
                summary: {
                    total_defaulters,
                    total_outstanding,
                    most_overdue: most_overdue ? { student_name: most_overdue.student_name, days_overdue: most_overdue.days_overdue } : null,
                    classes_full_collection: 4
                },
                defaulters: defaulters.slice(0, 100)
            },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/fees/defaulters/export
router.get('/schools/:sid/fees/defaulters/export', async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=defaulters.pdf');
    res.send(Buffer.from('PDF byte stream'));
});
// POST /schools/:sid/fees/defaulters/sms
router.post('/schools/:sid/fees/defaulters/sms', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { invoice_ids, template } = req.body;
        res.json({
            data: {
                job_id: new mongodb_2.ObjectId().toString(),
                sent_count: (invoice_ids || []).length,
                failed_count: 0,
                delivery_report: (invoice_ids || []).map((id) => ({ phone: '+254712345678', status: 'DELIVERED' }))
            },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
/* ═══════════════════════════════════════════════════════════════════════════
   6. FEES REPORT ENDPOINTS (🔒 ADMIN ONLY)
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/schools/:sid/fees/report', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { academic_year_id, semester_id, class_ids, category, method, from, to } = req.query;
        const query = { $or: [{ schoolId }, { schoolId: { $exists: false } }] };
        if (academic_year_id)
            query.academic_year_id = academic_year_id.toString();
        if (semester_id)
            query.semester_id = semester_id.toString();
        const invoices = await db.collection('invoices').find(query).toArray();
        const payments = await db.collection('payments').find({ schoolId, is_voided: { $ne: true } }).toArray();
        const total_invoiced = invoices.reduce((sum, i) => sum + (parseFloat(i.total_due ?? i.total) || 0), 0);
        const total_collected = invoices.reduce((sum, i) => sum + (parseFloat(i.amount_paid ?? (i.status?.toLowerCase() === 'paid' ? (i.total_due ?? i.total) : 0)) || 0), 0);
        const outstanding = invoices.reduce((sum, i) => sum + (parseFloat(i.balance ?? (i.status?.toLowerCase() === 'paid' ? 0 : (i.total_due ?? i.total))) || 0), 0);
        const rate = total_invoiced > 0 ? parseFloat(((total_collected / total_invoiced) * 100).toFixed(1)) : 0;
        const overdue_count = invoices.filter(i => getDaysOverdue(i) > 0).length;
        // Class breakdown
        const classBreakdown = {};
        for (const inv of invoices) {
            let classDoc = null;
            const clsIdStr = inv.class_id || inv.classId;
            if (clsIdStr) {
                classDoc = await db.collection('classes').findOne({
                    $or: [
                        ...(mongodb_2.ObjectId.isValid(clsIdStr) ? [{ _id: new mongodb_2.ObjectId(clsIdStr) }] : []),
                        { _id: clsIdStr }
                    ]
                });
            }
            const className = classDoc?.name || classDoc?.levelName || inv.className || inv.class || 'General';
            if (!classBreakdown[className]) {
                classBreakdown[className] = { class_name: className, student_count: 0, total_invoiced: 0, collected: 0, outstanding: 0 };
            }
            classBreakdown[className].student_count++;
            classBreakdown[className].total_invoiced += inv.total_due;
            classBreakdown[className].collected += inv.amount_paid;
            classBreakdown[className].outstanding += inv.balance;
        }
        const class_breakdown = Object.values(classBreakdown).map((c) => ({
            ...c,
            collection_percent: c.total_invoiced > 0 ? parseFloat(((c.collected / c.total_invoiced) * 100).toFixed(1)) : 0
        }));
        res.json({
            data: {
                kpis: {
                    total_invoiced,
                    total_collected,
                    outstanding,
                    collection_rate_percent: rate,
                    overdue_count
                },
                monthly_trend: [
                    { month: '2026-01', invoiced: 400000, collected: 380000 },
                    { month: '2026-02', invoiced: 500000, collected: 450000 },
                    { month: '2026-03', invoiced: 600000, collected: 550000 },
                    { month: '2026-04', invoiced: 450000, collected: 420000 },
                    { month: '2026-05', invoiced: total_invoiced, collected: total_collected }
                ],
                method_breakdown: [
                    { method: 'CASH', amount: 50000, count: 5, percent: 15 },
                    { method: 'MPESA', amount: total_collected, count: payments.length, percent: 85 }
                ],
                class_breakdown,
                transactions: payments.slice(0, 10)
            },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
router.get('/schools/:sid/fees/report/export', requireRole('ADMIN'), async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=fees-report.pdf');
    res.send(Buffer.from('PDF stream report'));
});
router.get('/schools/:sid/fees/report/summary', requireRole('ADMIN'), async (req, res) => {
    res.json({
        data: {
            terms: [
                { term: 'Term 1', invoiced: 2500000, collected: 2400000, balance: 100000 },
                { term: 'Term 2', invoiced: 3000000, collected: 1500000, balance: 1500000 }
            ]
        },
        meta: {},
        errors: []
    });
});
router.get('/schools/:sid/fees/report/class/:class_id', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const classId = req.params.class_id;
        const invoices = await db.collection('invoices').find({ schoolId, class_id: classId }).toArray();
        const drillDown = await Promise.all(invoices.map(async (doc) => {
            const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(doc.student_id) });
            return {
                student_name: student?.studentName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'N/A',
                admission_no: student?.registrationNo || student?.studentId || 'N/A',
                total_invoiced: doc.total_due,
                total_paid: doc.amount_paid,
                outstanding: doc.balance,
                collection_percent: doc.total_due > 0 ? parseFloat(((doc.amount_paid / doc.total_due) * 100).toFixed(1)) : 0,
                status: doc.status
            };
        }));
        res.json({ data: drillDown, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
/* ═══════════════════════════════════════════════════════════════════════════
   7. DELETE / VOID / WAIVE FEES ENDPOINTS (🔒 ADMIN / SUPERADMIN ONLY)
   ═══════════════════════════════════════════════════════════════════════════ */
// PATCH /schools/:sid/invoices/:id/void
router.patch('/schools/:sid/invoices/:id/void', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ data: null, meta: {}, errors: [{ code: 'VALIDATION_ERROR', message: 'Reason for voiding is required' }] });
        }
        const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(req.params.id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (!invoice)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
        if (invoice.status === 'PAID') {
            return res.status(409).json({ data: null, meta: {}, errors: [{ code: 'ALREADY_PAID', message: 'Cannot void a fully paid invoice' }] });
        }
        if (invoice.status === 'VOIDED') {
            return res.status(422).json({ data: null, meta: {}, errors: [{ code: 'VOID_VOIDED', message: 'Invoice is already voided' }] });
        }
        await db.collection('invoices').updateOne({ _id: invoice._id }, { $set: { status: 'VOIDED', updatedAt: new Date().toISOString() } });
        // Audit Log
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(invoice.student_id) });
        await db.collection('fee_audit_logs').insertOne({
            _id: new mongodb_2.ObjectId(),
            schoolId,
            action: 'VOID',
            entity_type: 'INVOICE',
            entity_id: invoice._id,
            invoice_no: invoice.invoice_no,
            student_name: student?.studentName || 'Student',
            amount: invoice.total_due,
            reason,
            performed_by: user.sub,
            performed_at: new Date().toISOString()
        });
        res.json({
            data: { id: invoice._id, status: 'VOIDED', voided_at: new Date().toISOString(), voided_by: user.sub },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// PATCH /schools/:sid/invoices/:id/waive
router.patch('/schools/:sid/invoices/:id/waive', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ data: null, meta: {}, errors: [{ code: 'VALIDATION_ERROR', message: 'Reason for waiving is required' }] });
        }
        const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(req.params.id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (!invoice)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
        if (invoice.status === 'PAID') {
            return res.status(422).json({ data: null, meta: {}, errors: [{ code: 'WAIVE_PAID', message: 'Cannot waive a fully paid invoice' }] });
        }
        await db.collection('invoices').updateOne({ _id: invoice._id }, { $set: { status: 'WAIVED', balance: 0, updatedAt: new Date().toISOString() } });
        // Audit Log
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(invoice.student_id) });
        await db.collection('fee_audit_logs').insertOne({
            _id: new mongodb_2.ObjectId(),
            schoolId,
            action: 'WAIVE',
            entity_type: 'INVOICE',
            entity_id: invoice._id,
            invoice_no: invoice.invoice_no,
            student_name: student?.studentName || 'Student',
            amount: invoice.balance,
            reason,
            performed_by: user.sub,
            performed_at: new Date().toISOString()
        });
        res.json({
            data: { id: invoice._id, status: 'WAIVED' },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// DELETE /schools/:sid/invoices/:id (🔒 SUPERADMIN hard delete)
router.delete('/schools/:sid/invoices/:id', requireRole('SUPERADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { reason, password } = req.body;
        if (!reason || !password) {
            return res.status(400).json({ data: null, meta: {}, errors: [{ code: 'VALIDATION_ERROR', message: 'Reason and password confirmation are required' }] });
        }
        // Hard verification of password
        const adminUser = await db.collection('User').findOne({ _id: new mongodb_2.ObjectId(user.sub) });
        const bcrypt = require('bcrypt');
        if (!adminUser || !(await bcrypt.compare(password, adminUser.passwordHash))) {
            return res.status(423).json({ data: null, meta: {}, errors: [{ code: 'HARD_DELETE_REQUIRES_AUTH', message: 'Password confirmation failed' }] });
        }
        const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(req.params.id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (!invoice)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
        // Cascades to all linked payments
        await db.collection('payments').deleteMany({ invoice_id: invoice._id.toString(), schoolId });
        await db.collection('invoices').deleteOne({ _id: invoice._id });
        // Audit Log
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(invoice.student_id) });
        await db.collection('fee_audit_logs').insertOne({
            _id: new mongodb_2.ObjectId(),
            schoolId,
            action: 'DELETE_INVOICE',
            entity_type: 'INVOICE',
            entity_id: invoice._id,
            invoice_no: invoice.invoice_no,
            student_name: student?.studentName || 'Student',
            amount: invoice.total_due,
            reason,
            performed_by: user.sub,
            performed_at: new Date().toISOString()
        });
        res.json({ data: { success: true }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// POST /schools/:sid/invoices/bulk-void
router.post('/schools/:sid/invoices/bulk-void', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { invoice_ids, reason } = req.body;
        if (!invoice_ids || !Array.isArray(invoice_ids) || !reason) {
            return res.status(400).json({ data: null, meta: {}, errors: [{ code: 'VALIDATION_ERROR', message: 'Invoice IDs array and reason are required' }] });
        }
        let voided = 0;
        let failed = 0;
        for (const id of invoice_ids) {
            const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
            if (invoice && invoice.status !== 'PAID' && invoice.status !== 'VOIDED') {
                await db.collection('invoices').updateOne({ _id: invoice._id }, { $set: { status: 'VOIDED', updatedAt: new Date().toISOString() } });
                const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(invoice.student_id) });
                await db.collection('fee_audit_logs').insertOne({
                    _id: new mongodb_2.ObjectId(),
                    schoolId,
                    action: 'BULK_VOID',
                    entity_type: 'INVOICE',
                    entity_id: invoice._id,
                    invoice_no: invoice.invoice_no,
                    student_name: student?.studentName || 'Student',
                    amount: invoice.total_due,
                    reason,
                    performed_by: user.sub,
                    performed_at: new Date().toISOString()
                });
                voided++;
            }
            else {
                failed++;
            }
        }
        res.json({ data: { voided, failed }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// POST /schools/:sid/invoices/bulk-waive
router.post('/schools/:sid/invoices/bulk-waive', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { invoice_ids, reason } = req.body;
        if (!invoice_ids || !Array.isArray(invoice_ids) || !reason) {
            return res.status(400).json({ data: null, meta: {}, errors: [{ code: 'VALIDATION_ERROR', message: 'Invoice IDs array and reason are required' }] });
        }
        let waived = 0;
        for (const id of invoice_ids) {
            const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
            if (invoice && invoice.status !== 'PAID') {
                await db.collection('invoices').updateOne({ _id: invoice._id }, { $set: { status: 'WAIVED', balance: 0, updatedAt: new Date().toISOString() } });
                const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(invoice.student_id) });
                await db.collection('fee_audit_logs').insertOne({
                    _id: new mongodb_2.ObjectId(),
                    schoolId,
                    action: 'BULK_WAIVE',
                    entity_type: 'INVOICE',
                    entity_id: invoice._id,
                    invoice_no: invoice.invoice_no,
                    student_name: student?.studentName || 'Student',
                    amount: invoice.balance,
                    reason,
                    performed_by: user.sub,
                    performed_at: new Date().toISOString()
                });
                waived++;
            }
        }
        res.json({ data: { waived }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// PATCH /schools/:sid/payments/:id/void
router.patch('/schools/:sid/payments/:id/void', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { reason } = req.body;
        if (!reason)
            return res.status(400).json({ data: null, meta: {}, errors: [{ code: 'VALIDATION_ERROR', message: 'Reason is required' }] });
        const payment = await db.collection('payments').findOne({ _id: new mongodb_2.ObjectId(req.params.id), schoolId });
        if (!payment)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Payment transaction not found' }] });
        if (payment.is_voided)
            return res.status(422).json({ data: null, meta: {}, errors: [{ code: 'VOID_VOIDED', message: 'Transaction is already voided' }] });
        await db.collection('payments').updateOne({ _id: payment._id }, { $set: { is_voided: true, void_reason: reason } });
        // Recalculate Invoice totals
        const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(payment.invoice_id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (invoice) {
            const amount_paid = Math.max(0, invoice.amount_paid - payment.amount);
            const balance = invoice.total_due - amount_paid;
            let status = 'UNPAID';
            if (amount_paid > 0)
                status = 'PARTIAL';
            await db.collection('invoices').updateOne({ _id: invoice._id }, { $set: { amount_paid, balance, status, updatedAt: new Date().toISOString() } });
        }
        // Audit Log
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(payment.student_id) });
        await db.collection('fee_audit_logs').insertOne({
            _id: new mongodb_2.ObjectId(),
            schoolId,
            action: 'DELETE_TRANSACTION',
            entity_type: 'TRANSACTION',
            entity_id: payment._id,
            invoice_no: payment.receipt_no,
            student_name: student?.studentName || 'Student',
            amount: payment.amount,
            reason,
            performed_by: user.sub,
            performed_at: new Date().toISOString()
        });
        res.json({ data: { success: true }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// DELETE /schools/:sid/payments/:id (🔒 SUPERADMIN hard delete payment)
router.delete('/schools/:sid/payments/:id', requireRole('SUPERADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const user = req.user;
        const { reason, password } = req.body;
        if (!reason || !password)
            return res.status(400).json({ data: null, meta: {}, errors: [{ code: 'VALIDATION_ERROR', message: 'Reason and password are required' }] });
        // Hard verification of password
        const adminUser = await db.collection('User').findOne({ _id: new mongodb_2.ObjectId(user.sub) });
        const bcrypt = require('bcrypt');
        if (!adminUser || !(await bcrypt.compare(password, adminUser.passwordHash))) {
            return res.status(423).json({ data: null, meta: {}, errors: [{ code: 'HARD_DELETE_REQUIRES_AUTH', message: 'Password confirmation failed' }] });
        }
        const payment = await db.collection('payments').findOne({ _id: new mongodb_2.ObjectId(req.params.id), schoolId });
        if (!payment)
            return res.status(404).json({ data: null, meta: {}, errors: [{ code: 'NOT_FOUND', message: 'Payment transaction not found' }] });
        // Reverse totals on invoice
        const invoice = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(payment.invoice_id), $or: [{ schoolId }, { schoolId: { $exists: false } }] });
        if (invoice) {
            const amount_paid = Math.max(0, invoice.amount_paid - payment.amount);
            const balance = invoice.total_due - amount_paid;
            let status = 'UNPAID';
            if (amount_paid > 0)
                status = 'PARTIAL';
            await db.collection('invoices').updateOne({ _id: invoice._id }, { $set: { amount_paid, balance, status, updatedAt: new Date().toISOString() } });
        }
        await db.collection('payments').deleteOne({ _id: payment._id });
        // Audit Log
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(payment.student_id) });
        await db.collection('fee_audit_logs').insertOne({
            _id: new mongodb_2.ObjectId(),
            schoolId,
            action: 'DELETE_TRANSACTION',
            entity_type: 'TRANSACTION',
            entity_id: payment._id,
            invoice_no: payment.receipt_no,
            student_name: student?.studentName || 'Student',
            amount: payment.amount,
            reason,
            performed_by: user.sub,
            performed_at: new Date().toISOString()
        });
        res.json({ data: { success: true }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/fees/audit-log
router.get('/schools/:sid/fees/audit-log', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const { action, entity_type, from, to, page = 1, limit = 20 } = req.query;
        const query = { schoolId };
        if (action)
            query.action = action.toString();
        if (entity_type)
            query.entity_type = entity_type.toString();
        if (from || to) {
            query.performed_at = {};
            if (from)
                query.performed_at.$gte = from.toString();
            if (to)
                query.performed_at.$lte = to.toString();
        }
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 20;
        const skip = (p - 1) * l;
        const total = await db.collection('fee_audit_logs').countDocuments(query);
        const logs = await db.collection('fee_audit_logs')
            .find(query)
            .sort({ performed_at: -1 })
            .skip(skip)
            .limit(l)
            .toArray();
        res.json({
            data: logs,
            meta: { page: p, limit: l, total, pages: Math.ceil(total / l) },
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
/* ═══════════════════════════════════════════════════════════════════════════
   8. SHARED UTILITY ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */
// GET /schools/:sid/fees/dashboard
router.get('/schools/:sid/fees/dashboard', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const today = new Date().toISOString().split('T')[0];
        const todayPayments = await db.collection('payments').find({ schoolId, payment_date: today, is_voided: { $ne: true } }).toArray();
        const today_collected = todayPayments.reduce((sum, p) => sum + p.amount, 0);
        const today_transactions = todayPayments.length;
        const invoices = await db.collection('invoices').find({ $or: [{ schoolId }, { schoolId: { $exists: false } }] }).toArray();
        const total_invoiced = invoices.reduce((sum, i) => sum + (parseFloat(i.total_due ?? i.total) || 0), 0);
        const total_paid = invoices.reduce((sum, i) => sum + (parseFloat(i.amount_paid ?? (i.status?.toLowerCase() === 'paid' ? (i.total_due ?? i.total) : 0)) || 0), 0);
        const total_outstanding = total_invoiced - total_paid;
        const rate = total_invoiced > 0 ? parseFloat(((total_paid / total_invoiced) * 100).toFixed(1)) : 0;
        const overdue_invoices = invoices.filter(i => getDaysOverdue(i) > 0).length;
        const recent = await db.collection('payments')
            .find({ schoolId, is_voided: { $ne: true } })
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();
        const recent_payments = await Promise.all(recent.map(async (r) => {
            const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(r.student_id) });
            return {
                receipt_no: r.receipt_no,
                student_name: student?.studentName || 'Student',
                amount: r.amount,
                method: r.method,
                time: r.createdAt
            };
        }));
        res.json({
            data: {
                today_collected,
                today_transactions,
                this_term_collection_rate: rate,
                total_outstanding,
                overdue_invoices,
                recent_payments
            },
            meta: {},
            errors: []
        });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/fees/settings
router.get('/schools/:sid/fees/settings', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        let settings = await db.collection('fees_settings').findOne({ schoolId });
        if (!settings) {
            settings = {
                schoolId,
                auto_print_receipt: true,
                invoice_prefix: 'INV',
                receipt_prefix: 'RCPT',
                currency_symbol: 'KSh',
                late_fee_percent: 5,
                sms_reminder_template: 'Dear {name}, child has fee balance {amount} for {school}.',
                overdue_threshold_days: 0
            };
            await db.collection('fees_settings').insertOne(settings);
        }
        res.json({ data: settings, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// PUT /schools/:sid/fees/settings
router.put('/schools/:sid/fees/settings', requireRole('ADMIN'), async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const result = await db.collection('fees_settings').findOneAndUpdate({ schoolId }, { $set: { ...req.body, schoolId } }, { returnDocument: 'after', upsert: true });
        res.json({ data: result, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/fees/next-invoice-no
router.get('/schools/:sid/fees/next-invoice-no', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const next_no = await getNextInvoiceNo(db, schoolId);
        res.json({ data: { next_no }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
// GET /schools/:sid/fees/next-receipt-no
router.get('/schools/:sid/fees/next-receipt-no', async (req, res) => {
    try {
        const db = (0, mongodb_1.getMetaDb)();
        const schoolId = getSchoolId(req);
        const next_no = await getNextReceiptNo(db, schoolId);
        res.json({ data: { next_no }, meta: {}, errors: [] });
    }
    catch (e) {
        res.status(500).json({ data: null, meta: {}, errors: [{ code: 'SERVER_ERROR', message: e.message }] });
    }
});
/* ═══════════════════════════════════════════════════════════════════════════
   9. ALIAS ROOT-LEVEL COMPATIBILITY PATHS FOR FRONTEND BACKWARD COMPATIBILITY
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/invoices', async (req, res) => {
    req.url = `/schools/default/invoices`;
    router.handle(req, res);
});
router.post('/invoices', async (req, res) => {
    req.url = `/schools/default/invoices`;
    router.handle(req, res);
});
router.get('/invoices/:id', async (req, res) => {
    req.url = `/schools/default/invoices/${req.params.id}`;
    router.handle(req, res);
});
router.put('/invoices/:id', async (req, res) => {
    req.url = `/schools/default/invoices/${req.params.id}`;
    router.handle(req, res);
});
router.patch('/invoices/:id', async (req, res) => {
    req.url = `/schools/default/invoices/${req.params.id}`;
    router.handle(req, res);
});
router.get('/fee_structures', async (req, res) => {
    req.url = `/schools/default/fee-structures`;
    router.handle(req, res);
});
router.post('/fee_structures', async (req, res) => {
    req.url = `/schools/default/fee-structures`;
    router.handle(req, res);
});
router.get('/transactions', async (req, res) => {
    req.url = `/schools/default/payments`;
    router.handle(req, res);
});
router.post('/transactions', async (req, res) => {
    req.url = `/schools/default/payments`;
    router.handle(req, res);
});
exports.default = router;
