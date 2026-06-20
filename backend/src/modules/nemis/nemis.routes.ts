/**
 * NEMIS Assistant API — prepare, validate, export, import and track NEMIS data.
 * Does NOT talk to NEMIS directly; it readies data for manual portal submission.
 */
import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getMetaDb } from '../../lib/mongodb';
import { NEMIS_FIELDS, FIELD_BY_KEY, validateStudent, readField, StudentValidation } from './nemis.fields';

const router = Router();
const db = (req: Request) => (req as any).tenantDb || getMetaDb();

const loadStudents = async (req: Request) =>
    (await db(req).collection('students').find({ deletedAt: { $exists: false } }).toArray().catch(() => []));

const logSync = async (req: Request, action: string, meta: Record<string, any>) => {
    try {
        await db(req).collection('nemis_sync_log').insertOne({
            action, ...meta, user: (req as any).tenantContext?.user || 'admin', at: new Date(),
        });
    } catch { /* best-effort */ }
};

// ── Dashboard stats + chart data ──────────────────────────────────────────────
router.get('/nemis/stats', async (req, res) => {
    try {
        const students = await loadStudents(req);
        const validations: StudentValidation[] = students.map((s: any) => validateStudent(s));

        const missing = (key: string) => validations.filter(v => !v.fields.find(f => f.key === key)?.value).length;
        const byGrade: Record<string, number> = {};
        const byGender: Record<string, number> = {};
        const missingBreakdown: Record<string, number> = {};
        validations.forEach((v: StudentValidation) => {
            const g = v.grade || 'Unassigned'; byGrade[g] = (byGrade[g] || 0) + 1;
            const sx = v.fields.find(f => f.key === 'gender')?.value || 'Unknown'; byGender[sx] = (byGender[sx] || 0) + 1;
            [...v.missingRequired, ...v.missingRecommended].forEach(l => { missingBreakdown[l] = (missingBreakdown[l] || 0) + 1; });
        });

        const transfers = await db(req).collection('nemis_transfers').find({}).toArray().catch(() => []);
        const pendingTransfers = transfers.filter((t: any) => /pending/i.test(String(t.status))).length;

        res.json({
            cards: {
                totalStudents: students.length,
                readyForNemis: validations.filter(v => v.ready).length,
                missingUpi: missing('upi'),
                missingBirthCert: missing('birthCertNo'),
                missingParent: missing('parentName') + missing('parentPhone'),
                missingGuardian: missing('guardianName') + missing('guardianPhone'),
                missingPhoto: missing('passportPhoto'),
                incompleteProfiles: validations.filter(v => v.score < 100).length,
                pendingTransfers,
            },
            charts: {
                byGrade, byGender, missingBreakdown,
                validationErrors: {
                    Ready: validations.filter(v => v.ready).length,
                    Warnings: validations.filter(v => v.ready && v.missingRecommended.length).length,
                    Errors: validations.filter(v => !v.ready).length,
                },
                transferStatus: transfers.reduce((acc: Record<string, number>, t: any) => { const s = t.status || 'Pending'; acc[s] = (acc[s] || 0) + 1; return acc; }, {}),
            },
            fields: NEMIS_FIELDS.map(f => ({ key: f.key, label: f.label, severity: f.severity, group: f.group })),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Validate students (all, or a subset by ids) ───────────────────────────────
router.get('/nemis/validate', async (req, res) => {
    try {
        const students = await loadStudents(req);
        const ids = req.query.ids ? String(req.query.ids).split(',') : null;
        const subset = ids ? students.filter((s: any) => ids.includes(String(s._id))) : students;
        const validations: StudentValidation[] = subset.map((s: any) => validateStudent(s));
        const avg = validations.length ? Math.round(validations.reduce((sum: number, v: StudentValidation) => sum + v.score, 0) / validations.length) : 0;
        await logSync(req, 'validation', { records: validations.length, status: 'completed', fileName: '' });
        res.json({ validations, summary: { count: validations.length, ready: validations.filter(v => v.ready).length, averageScore: avg } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Students with incomplete info (Missing Information page) ───────────────────
router.get('/nemis/missing', async (req, res) => {
    try {
        const students = await loadStudents(req);
        const rows = students.map((s: any) => validateStudent(s)).filter((v: StudentValidation) => !v.ready || v.missingRecommended.length);
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Update specific NEMIS fields on a student (quick-edit / data entry) ────────
router.patch('/nemis/student/:id', async (req, res) => {
    try {
        const body = req.body || {};
        const set: any = { updatedAt: new Date() };
        // Only persist known NEMIS keys; write to the canonical key name.
        for (const f of NEMIS_FIELDS) if (body[f.key] !== undefined) set[f.key] = body[f.key];
        if (Object.keys(set).length <= 1) return res.status(400).json({ message: 'No NEMIS fields to update' });
        await db(req).collection('students').updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
        const student = await db(req).collection('students').findOne({ _id: new ObjectId(req.params.id) });
        res.json({ ok: true, validation: validateStudent(student) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Export rows in official NEMIS field order ─────────────────────────────────
router.get('/nemis/export', async (req, res) => {
    try {
        let students = await loadStudents(req);
        const { grade, class: cls, year } = req.query as any;
        if (grade) students = students.filter((s: any) => readField(s, FIELD_BY_KEY.grade) === grade);
        if (cls) students = students.filter((s: any) => readField(s, FIELD_BY_KEY.class) === cls);
        if (year) students = students.filter((s: any) => String(readField(s, FIELD_BY_KEY.admissionDate)).startsWith(String(year)));
        if (req.query.ids) { const ids = String(req.query.ids).split(','); students = students.filter((s: any) => ids.includes(String(s._id))); }

        const headers = NEMIS_FIELDS.map(f => f.nemisHeader);
        const rows = students.map((s: any) => NEMIS_FIELDS.map(f => readField(s, f)));
        const validations: StudentValidation[] = students.map((s: any) => validateStudent(s));
        const incomplete = validations.filter((v: StudentValidation) => !v.ready).length;
        await logSync(req, 'export', { records: rows.length, status: 'completed', fileName: `nemis_export_${Date.now()}.csv` });
        res.json({ headers, fields: NEMIS_FIELDS.map(f => f.key), rows, count: rows.length, incomplete });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Import preview — diff an uploaded set against existing students ────────────
router.post('/nemis/import/preview', async (req, res) => {
    try {
        const incoming: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
        if (!incoming.length) return res.status(400).json({ message: 'No rows provided' });
        const students = await loadStudents(req);
        const byAdm = new Map<string, any>();
        students.forEach((s: any) => { const adm = readField(s, FIELD_BY_KEY.admissionNo); if (adm) byAdm.set(adm.toLowerCase(), s); });

        const added: any[] = [], updated: any[] = [], skipped: any[] = [], errors: any[] = [];
        const seen = new Set<string>();
        for (const row of incoming) {
            const adm = String(row.admissionNo || row.ADM_NO || '').trim();
            if (!adm) { errors.push({ row, error: 'Missing admission number' }); continue; }
            if (seen.has(adm.toLowerCase())) { skipped.push({ adm, reason: 'Duplicate in file' }); continue; }
            seen.add(adm.toLowerCase());
            const existing = byAdm.get(adm.toLowerCase());
            // Validate dates if present.
            if (row.dob && isNaN(new Date(row.dob).getTime())) { errors.push({ row, error: 'Invalid date of birth' }); continue; }
            if (existing) updated.push({ adm, id: String(existing._id), changes: row });
            else added.push({ adm, row });
        }
        res.json({ added, updated, skipped, errors, summary: { added: added.length, updated: updated.length, skipped: skipped.length, errors: errors.length } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Import apply — persist updates (only updates existing; adds are flagged) ───
router.post('/nemis/import/apply', async (req, res) => {
    try {
        const updates: any[] = Array.isArray(req.body?.updated) ? req.body.updated : [];
        let applied = 0;
        for (const u of updates) {
            if (!u.id) continue;
            const set: any = { updatedAt: new Date() };
            for (const f of NEMIS_FIELDS) if (u.changes?.[f.key] !== undefined) set[f.key] = u.changes[f.key];
            if (Object.keys(set).length > 1) { await db(req).collection('students').updateOne({ _id: new ObjectId(u.id) }, { $set: set }); applied++; }
        }
        await logSync(req, 'import', { records: applied, status: 'completed', fileName: req.body?.fileName || '' });
        res.json({ ok: true, applied });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Transfers ─────────────────────────────────────────────────────────────────
router.get('/nemis/transfers', async (req, res) => {
    try {
        const q: any = {};
        if (req.query.direction) q.direction = req.query.direction;
        if (req.query.status) q.status = req.query.status;
        const rows = await db(req).collection('nemis_transfers').find(q).sort({ createdAt: -1 }).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/nemis/transfers', async (req, res) => {
    try {
        const b = req.body || {};
        const doc = {
            studentName: b.studentName || '', admissionNo: b.admissionNo || '',
            direction: b.direction === 'incoming' ? 'incoming' : 'outgoing',   // incoming | outgoing
            previousSchool: b.previousSchool || '', newSchool: b.newSchool || '',
            transferDate: b.transferDate || '', reason: b.reason || '',
            status: b.status || 'Pending', createdAt: new Date(),
        };
        const r = await db(req).collection('nemis_transfers').insertOne(doc);
        await logSync(req, 'transfer', { records: 1, status: doc.status, fileName: '' });
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.patch('/nemis/transfers/:id', async (req, res) => {
    try {
        const set: any = { updatedAt: new Date() };
        ['status', 'reason', 'transferDate', 'newSchool', 'previousSchool'].forEach(k => { if (req.body[k] !== undefined) set[k] = req.body[k]; });
        await db(req).collection('nemis_transfers').updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Sync history ──────────────────────────────────────────────────────────────
router.get('/nemis/sync-log', async (req, res) => {
    try {
        const q: any = {};
        if (req.query.action) q.action = req.query.action;
        const rows = await db(req).collection('nemis_sync_log').find(q).sort({ at: -1 }).limit(300).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/nemis/settings', async (req, res) => {
    try {
        const s = (await db(req).collection('nemis_settings').findOne({})) || {};
        res.json({ csvDelimiter: s.csvDelimiter || ',', fileNaming: s.fileNaming || 'nemis_{type}_{date}', ...s });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.patch('/nemis/settings', async (req, res) => {
    try {
        await db(req).collection('nemis_settings').updateOne({}, { $set: { ...req.body, updatedAt: new Date() } }, { upsert: true });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Single student full NEMIS view (Data Entry Assistant).
router.get('/nemis/student/:id', async (req, res) => {
    try {
        const student = await db(req).collection('students').findOne({ _id: new ObjectId(req.params.id) });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json({ student, validation: validateStudent(student) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
