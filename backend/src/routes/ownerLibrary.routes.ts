/**
 * Owner-managed shared library — content the platform owner uploads once and every school
 * can use:
 *   - Question Bank: upload a past paper (+ optional marking scheme), the same real
 *     extraction used by a school's own Question Paper module pulls out the questions,
 *     the owner reviews/tags them with a subject + grade and saves them to a GLOBAL bank
 *     (meta DB, not any one school's). Schools read it read-only from
 *     GET /qp/bank/global (questionPapers.routes.ts) alongside their own bank.
 *   - Teaching Resources: upload notes/worksheets/PDFs once; every school's teachers (staff
 *     portal) and admins (Notes & Resources) can see and download them.
 *
 * Mounted at /api/v1/owner — Super Owner / Owner / Support roles only (same JWT as the
 * rest of the owner portal; see owner.controller.ts's ownerClaims for the role list).
 */
import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getMetaDb } from '../lib/mongodb';
import { extractPaper, questionPlainText } from '../lib/paperExtract';
import { matchScheme } from '../lib/qpAnswers';
import { levelKey } from '../lib/examPublish';

const router = Router();
const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const str = (v: any, max = 4000) => String(v ?? '').slice(0, max);
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };
const TYPES = ['MCQ', 'Short Answer', 'Structured', 'Essay', 'True/False', 'Fill in the blank'];
const DIFF = ['EASY', 'MEDIUM', 'HARD'];

// ─── Auth: any owner-portal user (not school-specific) ─────────────────────────
const ownerClaims = (req: Request): any => {
    try {
        const auth = req.headers.authorization;
        if (!auth) return null;
        return jwt.verify(auth.split(' ')[1], process.env.OWNER_JWT_SECRET || 'owner_secret');
    } catch { return null; }
};
const requireOwner = (req: Request, res: Response, next: Function) => {
    const claims = ownerClaims(req);
    if (!claims) return res.status(401).json({ message: 'Not authenticated' });
    (req as any).owner = claims;
    next();
};
router.use(requireOwner);

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION BANK — global, shared across every school
// ═══════════════════════════════════════════════════════════════════════════
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const textKey = (q: any) => crypto.createHash('sha1').update(nrm(questionPlainText(q)).replace(/[^a-z0-9 ]/g, '')).digest('hex');

const cleanParts = (ps: any, depth = 0): any[] => (Array.isArray(ps) ? ps : []).slice(0, 26).map((p: any) => ({
    label: str(p?.label, 6), text: str(p?.text), marks: num(p?.marks), parts: depth < 1 ? cleanParts(p?.parts, depth + 1) : [],
}));
function cleanQuestion(q: any) {
    const options = (Array.isArray(q?.options) ? q.options : []).slice(0, 8).map((o: any, i: number) => typeof o === 'string' ? { label: String.fromCharCode(65 + i), text: str(o, 1000) } : { label: str(o?.label, 3) || String.fromCharCode(65 + i), text: str(o?.text, 1000) });
    const parts = cleanParts(q?.parts);
    const type = TYPES.includes(q?.type || q?.questionType) ? (q.type || q.questionType) : options.length >= 2 ? 'MCQ' : parts.length ? 'Structured' : 'Short Answer';
    return {
        text: str(q?.text ?? q?.questionText), parts, options, answer: str(q?.answer ?? q?.correctAnswer, 2000),
        marks: num(q?.marks) ?? 1, type, difficulty: DIFF.includes(String(q?.difficulty).toUpperCase()) ? String(q.difficulty).toUpperCase() : 'MEDIUM',
        images: (Array.isArray(q?.images) ? q.images : []).filter((x: any) => typeof x === 'string' && x.length < 700_000).slice(0, 6),
        markingScheme: str(q?.markingScheme, 4000),
    };
}
const toDoc = (c: ReturnType<typeof cleanQuestion>, meta: any) => ({
    ...c, questionText: questionPlainText(c), questionType: c.type, correctAnswer: c.answer,
    subjectName: meta.subjectName, subjectKey: nrm(meta.subjectName),
    className: meta.className || '', classLevel: meta.className ? levelKey(meta.className) : '',
    textKey: textKey(c),
});

// POST /owner/library/questions/extract — upload a paper (+ optional scheme), preview only
router.post('/library/questions/extract', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'scheme', maxCount: 1 }]), async (req: any, res) => {
    try {
        const file = req.files?.file?.[0], scheme = req.files?.scheme?.[0];
        if (!file) return res.status(400).json({ message: 'Choose a file to upload' });
        const r: any = await extractPaper(file.buffer, file.originalname || 'paper');
        if (scheme) {
            try {
                const sr = await extractPaper(scheme.buffer, scheme.originalname || 'scheme');
                const m = matchScheme(r.questions, sr.questions);
                r.questions = r.questions.map((q: any, i: number) => (m.answers[i] ? { ...q, answer: m.answers[i]!.answer, markingScheme: m.answers[i]!.markingScheme } : q));
            } catch (e: any) { r.warnings = [...(r.warnings || []), `The marking scheme could not be read: ${e.message || 'unknown error'}`]; }
        }
        res.json({ filename: file.originalname, ...r });
    } catch (e: any) { res.status(400).json({ message: e.message || 'Could not read this file' }); }
});

// POST /owner/library/questions/save { subjectName, className, questions[] } → global_questions
router.post('/library/questions/save', async (req, res) => {
    try {
        const d = getMetaDb();
        const b = req.body || {};
        const subjectName = str(b.subjectName, 120).trim();
        const className = str(b.className, 120).trim();
        if (!subjectName) return res.status(400).json({ message: 'Choose the subject' });
        if (!className) return res.status(400).json({ message: 'Choose the grade/class these questions are for' });
        const list = (Array.isArray(b.questions) ? b.questions : []).slice(0, 500).map(cleanQuestion).filter((q: any) => q.text.trim() || q.parts.length);
        if (!list.length) return res.status(400).json({ message: 'No questions to save' });
        const owner = (req as any).owner || {};
        const meta = { subjectName, className };
        const existing = new Set((await d.collection('global_questions').find({ subjectKey: nrm(subjectName) }, { projection: { textKey: 1 } }).toArray()).map((x: any) => x.textKey).filter(Boolean));
        const docs: any[] = []; let skipped = 0;
        for (const q of list) {
            const doc = { ...toDoc(q, meta), createdAt: new Date(), createdBy: owner.name || owner.email || 'owner' };
            if (existing.has(doc.textKey)) { skipped++; continue; }
            existing.add(doc.textKey); docs.push(doc);
        }
        if (docs.length) await d.collection('global_questions').insertMany(docs);
        res.status(201).json({ saved: docs.length, skipped, subject: subjectName });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/library/questions', async (req, res) => {
    try {
        const d = getMetaDb();
        const q: any = req.query;
        const and: any[] = [];
        if (q.subject) and.push({ subjectKey: nrm(q.subject) });
        if (q.className) and.push({ classLevel: levelKey(String(q.className)) });
        if (q.type) and.push({ $or: [{ type: String(q.type) }, { questionType: String(q.type) }] });
        if (q.difficulty) and.push({ difficulty: String(q.difficulty).toUpperCase() });
        if (q.search) and.push({ questionText: { $regex: String(q.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80), $options: 'i' } });
        const filter = and.length ? { $and: and } : {};
        const rows = await d.collection('global_questions').find(filter).sort({ createdAt: -1 }).limit(Math.min(5000, Number(q.limit) || 2000)).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put('/library/questions/:id', async (req, res) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(404).json({ message: 'Not found' });
        const d = getMetaDb();
        const cur: any = await d.collection('global_questions').findOne({ _id: id });
        if (!cur) return res.status(404).json({ message: 'Not found' });
        const b = req.body || {};
        const c = cleanQuestion({ ...cur, ...b, text: b.text ?? cur.text ?? cur.questionText });
        const doc = toDoc(c, { subjectName: str(b.subjectName ?? cur.subjectName, 120), className: str(b.className ?? cur.className, 120) });
        await d.collection('global_questions').updateOne({ _id: id }, { $set: { ...doc, updatedAt: new Date() } });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete('/library/questions/:id', async (req, res) => {
    try { const id = oid(req.params.id); if (id) await getMetaDb().collection('global_questions').deleteOne({ _id: id }); res.json({ ok: true }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// TEACHING RESOURCES — notes / PDFs shared with every school's staff + admin
// ═══════════════════════════════════════════════════════════════════════════
const RESOURCE_DIR = path.join(__dirname, '..', '..', 'uploads', 'resources');
fs.mkdirSync(RESOURCE_DIR, { recursive: true });
const resourceStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, RESOURCE_DIR),
    filename: (_req, file, cb) => {
        const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 10);
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
});
const uploadResource = multer({ storage: resourceStorage, limits: { fileSize: 30 * 1024 * 1024 } });

router.post('/library/resources', uploadResource.single('file'), async (req: any, res) => {
    try {
        const b = req.body || {};
        const title = str(b.title, 160).trim();
        if (!title) return res.status(400).json({ message: 'Give this resource a title' });
        const owner = (req as any).owner || {};
        const doc = {
            title, type: str(b.type, 40) || 'Notes', subjectName: str(b.subjectName, 120), className: str(b.className, 120),
            description: str(b.description, 2000), url: str(b.url, 600), videoUrl: str(b.videoUrl, 600),
            fileUrl: req.file ? `/uploads/resources/${req.file.filename}` : '', fileName: req.file?.originalname || '', fileType: req.file?.mimetype || '',
            isPublic: true, createdAt: new Date(), createdBy: owner.name || owner.email || 'owner',
        };
        const r = await getMetaDb().collection('global_resources').insertOne(doc);
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/library/resources', async (req, res) => {
    try {
        const q: any = req.query;
        const and: any[] = [];
        if (q.subject) and.push({ subjectName: new RegExp(`^${String(q.subject).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        if (q.className) and.push({ className: new RegExp(`^${String(q.className).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        if (q.type) and.push({ type: String(q.type) });
        if (q.search) and.push({ title: { $regex: String(q.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80), $options: 'i' } });
        const filter = and.length ? { $and: and } : {};
        res.json(await getMetaDb().collection('global_resources').find(filter).sort({ createdAt: -1 }).toArray());
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete('/library/resources/:id', async (req, res) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(404).json({ message: 'Not found' });
        const d = getMetaDb();
        const doc: any = await d.collection('global_resources').findOne({ _id: id });
        if (doc?.fileUrl) { try { fs.unlinkSync(path.join(RESOURCE_DIR, path.basename(doc.fileUrl))); } catch { /* already gone */ } }
        await d.collection('global_resources').deleteOne({ _id: id });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
