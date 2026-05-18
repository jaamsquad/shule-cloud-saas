import { Router } from 'express';
import * as c from '../controllers/academics.controller';
import { encrypt, decrypt, maskKey } from '../lib/crypto';
import { getDb } from '../lib/mongodb';

const router = Router();

// ─── Health ────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => res.json({ status: 'ok', module: 'academics' }));

// ─── Exams / Assessments ───────────────────────────────────────────────────
router.get('/exams',              c.getItems('exams'));
router.post('/exams',             c.createItem('exams'));
router.patch('/exams/:id',        c.updateItem('exams'));
router.delete('/exams/:id',       c.deleteItem('exams'));

router.get('/assessments',        c.getItems('exams'));
router.post('/assessments',       c.createItem('exams'));
router.patch('/assessments/:id',  c.updateItem('exams'));
router.delete('/assessments/:id', c.deleteItem('exams'));

router.get('/academics/exams',              c.getItems('exams'));
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
        const { getDb } = require('../lib/mongodb');
        const db = getDb();
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ message: 'No entries provided' });
        const ops = entries.map((entry: any) => {
            const { _id, ...data } = entry;
            return {
                updateOne: {
                    filter: { studentId: data.studentId, subjectId: data.subjectId, examId: data.examId },
                    update: { $set: { ...data, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
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
router.post('/students',             c.createItem('students'));
router.patch('/students/:id',        c.updateItem('students'));
router.delete('/students/:id',       c.deleteItem('students'));
router.post('/students/bulk',        c.bulkCreate('students'));

// ─── Staff ───────────────────────────────────────────────────────────────────
router.get('/staff',                 c.getItems('staff'));
router.get('/staff/:id',             async (req, res) => {
    try {
        const db = require('../lib/mongodb').getDb();
        const { ObjectId } = require('mongodb');
        const item = await db.collection('staff').findOne({ _id: new ObjectId(req.params.id) });
        if (!item) return res.status(404).json({ message: 'Staff not found' });
        res.json(item);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/staff',                c.createItem('staff'));
router.patch('/staff/:id',           c.updateItem('staff'));
router.put('/staff/:id',             c.updateItem('staff'));
router.delete('/staff/:id',          c.deleteItem('staff'));
router.post('/staff/bulk',           c.bulkCreate('staff'));

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
['enrollments','transactions','invoices','classes','streams','sessions','levels','staff_subjects','chart_of_accounts','income','expenses','fee_particulars','fee_structures','periods','discount_types','fee_accounts','theme_settings','homework','weekdays','timetable_periods','rooms','timetables','timetable_slots','substitutions','constraints'].forEach(col => {
    // Standard paths
    router.get(`/${col}`,    c.getItems(col));
    router.get(`/${col}/:id`, c.getItem(col));
    router.post(`/${col}`,   c.createItem(col));
    router.patch(`/${col}/:id`,  c.updateItem(col));
    router.delete(`/${col}/:id`, c.deleteItem(col));

    // Prefixed paths for consistency
    router.get(`/academics/${col}`,    c.getItems(col));
    router.get(`/academics/${col}/:id`, c.getItem(col));
    router.post(`/academics/${col}`,   c.createItem(col));
    router.patch(`/academics/${col}/:id`,  c.updateItem(col));
    router.delete(`/academics/${col}/:id`, c.deleteItem(col));
});

router.patch('/academics/periods/:id/set-current', async (req, res) => {
    try {
        const db = require('../lib/mongodb').getDb();
        const { ObjectId } = require('mongodb');
        const { id } = req.params;
        
        // 1. Unset all current flags for this tenant/school
        await db.collection('periods').updateMany({}, { $set: { isCurrent: false } });
        
        // 2. Set this one as current
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

// ─── Assessment questions (QuestionBank) ─────────────────────────────────────
router.get('/assessments/questions',   c.getItems('questions'));
router.post('/assessments/questions',  c.createItem('questions'));

// ─── Settings: Bank Accounts ──────────────────────────────────────────────────
router.get('/settings/bank-accounts', c.getItems('fee_accounts'));
router.post('/settings/bank-accounts', c.createItem('fee_accounts'));
router.patch('/settings/bank-accounts/:id', c.updateItem('fee_accounts'));
router.delete('/settings/bank-accounts/:id', c.deleteItem('fee_accounts'));

// ─── Settings: Gateways ───────────────────────────────────────────────────────
router.get('/settings/gateways/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const db = getDb();
        const gateway = await db.collection('gateways').findOne({ type });
        if (!gateway) return res.json(null);

        const config = { ...gateway.config };
        
        // Decrypt and mask sensitive keys
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/settings/gateways/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { isEnabled, ...config } = req.body;
        const db = getDb();
        
        // Encrypt sensitive keys if they are not already masked
        const gateway = await db.collection('gateways').findOne({ type });
        const existingConfig = gateway?.config || {};

        const encryptField = (field: string) => {
            if (config[field]) {
                if (config[field].includes('••••••••••••')) {
                    // Keep existing encrypted value
                    config[field] = existingConfig[field];
                } else {
                    config[field] = encrypt(config[field]);
                }
            }
        };

        if (type === 'payhero') {
            encryptField('apiKey');
        } else if (type === 'daraja') {
            encryptField('consumerKey');
            encryptField('consumerSecret');
            encryptField('passkey');
        } else if (type === 'stripe') {
            encryptField('secretKey');
            encryptField('webhookSecret');
        }

        await db.collection('gateways').updateOne(
            { type },
            { $set: { isEnabled, config, updatedAt: new Date() } },
            { upsert: true }
        );
        res.json({ message: 'Gateway updated successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
