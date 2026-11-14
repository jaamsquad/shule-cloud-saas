/**
 * Question Paper module (sidebar → Question Paper):
 *   POST /qp/extract          upload a .docx / .pdf / .txt paper → questions to review (nothing saved)
 *   GET  /qp/subjects         subjects (both subject lists) with how many bank questions each has
 *   GET  /qp/bank             questions, filtered by subject / class / chapter / type / difficulty / search
 *   POST /qp/bank             save reviewed questions to a subject's bank (duplicates skipped)
 *   PUT  /qp/bank/:id · DELETE /qp/bank/:id · POST /qp/bank/delete (many)
 *   POST /qp/generate         pick questions for a paper (sections, counts, types, difficulty mix)
 *   GET/POST/PUT/DELETE /qp/papers   saved papers (header, rules, numbering, sections)
 * Questions live in `questions`, papers in `question_papers` (shared with the older screens).
 */
import { Router, Request } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { enforceCrud } from '../lib/permissions';
import { extractPaper, questionPlainText } from '../lib/paperExtract';
import { levelKey } from '../lib/examPublish';
import { matchScheme, aiAnswers } from '../lib/qpAnswers';
import { signToken, publicAppUrl } from '../lib/verifyDocs';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const db = (req: Request): Db => (req as any).tenantDb || getMetaDb();
const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const str = (v: any, max = 4000) => String(v ?? '').slice(0, max);
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };
const TYPES = ['MCQ', 'Short Answer', 'Structured', 'Essay', 'True/False', 'Fill in the blank'];
const DIFF = ['EASY', 'MEDIUM', 'HARD'];
const textKey = (q: any) => crypto.createHash('sha1').update(nrm(questionPlainText(q)).replace(/[^a-z0-9 ]/g, '')).digest('hex');
const W = enforceCrud('question_paper', 'create'), U = enforceCrud('question_paper', 'update'), D = enforceCrud('question_paper', 'delete');

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
/** shape stored in `questions` — keeps the older fields so the older screens still read it */
const toDoc = (c: ReturnType<typeof cleanQuestion>, meta: any) => ({
    ...c, questionText: questionPlainText(c), questionType: c.type, correctAnswer: c.answer,
    subjectId: meta.subjectId, subjectName: meta.subjectName, subjectKey: nrm(meta.subjectName),
    classId: meta.classId || '', className: meta.className || '', classLevel: meta.className ? levelKey(meta.className) : '', chapterId: meta.chapterId || '', chapterName: meta.chapterName || '',
    section: str(meta.section, 120), sourceDocument: str(meta.sourceDocument, 200), textKey: textKey(c),
});

// ─── extract (preview only) ────────────────────────────────────────────────────
// optional `scheme` file: a marking scheme numbered like the paper → answers per question
router.post('/qp/extract', W, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'scheme', maxCount: 1 }]), async (req: any, res) => {
    try {
        const file = req.files?.file?.[0], scheme = req.files?.scheme?.[0];
        if (!file) return res.status(400).json({ message: 'Choose a file to upload' });
        const r: any = await extractPaper(file.buffer, file.originalname || 'paper');
        let schemeInfo: any = null;
        if (scheme) {
            try {
                const sr = await extractPaper(scheme.buffer, scheme.originalname || 'scheme');
                const m = matchScheme(r.questions, sr.questions);
                r.questions = r.questions.map((q: any, i: number) => (m.answers[i] ? { ...q, answer: m.answers[i]!.answer, markingScheme: m.answers[i]!.markingScheme } : q));
                schemeInfo = { filename: scheme.originalname, matched: m.matched, unmatched: m.unmatched, extra: m.extra };
                if (m.unmatched.length) r.warnings = [...(r.warnings || []), `The marking scheme has no answer for question${m.unmatched.length > 1 ? 's' : ''} ${m.unmatched.join(', ')}.`];
            } catch (e: any) { r.warnings = [...(r.warnings || []), `The marking scheme could not be read: ${e.message || 'unknown error'}`]; }
        }
        res.json({ filename: file.originalname, ...r, scheme: schemeInfo });
    } catch (e: any) { res.status(400).json({ message: e.message || 'Could not read this file' }); }
});

// ─── AI answers & marking schemes ──────────────────────────────────────────────
// POST /qp/ai-answers { subject, className, questions } → { results: [{ answer, markingScheme }] } (nothing saved)
router.post('/qp/ai-answers', W, async (req, res) => {
    try {
        const qs = (Array.isArray(req.body?.questions) ? req.body.questions : []).slice(0, 80).map(cleanQuestion);
        if (!qs.length) return res.status(400).json({ message: 'No questions' });
        const r = await aiAnswers(req, qs, { subject: str(req.body?.subject, 120), className: str(req.body?.className, 120) });
        res.json(r);
    } catch (e: any) { res.status(e.status || 500).json({ message: e.message }); }
});
// POST /qp/bank/ai-answers { ids, overwrite? } → answers + marking schemes written to bank questions
router.post('/qp/bank/ai-answers', U, async (req, res) => {
    try {
        const d = db(req);
        const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(oid).filter(Boolean).slice(0, 80) as ObjectId[];
        const rows: any[] = ids.length ? await d.collection('questions').find({ _id: { $in: ids } }).toArray() : [];
        const todo = req.body?.overwrite ? rows : rows.filter(r => !String(r.markingScheme || '').trim());
        if (!todo.length) return res.json({ updated: 0, message: 'These questions already have marking schemes' });
        const r = await aiAnswers(req, todo.map(x => cleanQuestion({ ...x, text: x.text ?? x.questionText })), { subject: todo[0].subjectName || '', className: todo[0].className || '' });
        let updated = 0;
        for (const [i, row] of todo.entries()) {
            const a = r.results[i]; if (!a?.markingScheme && !a?.answer) continue;
            await d.collection('questions').updateOne({ _id: row._id }, { $set: { answer: a.answer, correctAnswer: a.answer, markingScheme: a.markingScheme, schemeBy: 'AI', updatedAt: new Date() } });
            updated++;
        }
        res.json({ updated, failed: r.failed });
    } catch (e: any) { res.status(e.status || 500).json({ message: e.message }); }
});

// ─── subjects with bank counts ─────────────────────────────────────────────────
router.get('/qp/subjects', async (req, res) => {
    try {
        const d = db(req);
        const [a, b, counts] = await Promise.all([
            d.collection('subjects').find({}).toArray().catch(() => [] as any[]),
            d.collection('v2_subjects').find({ deletedAt: { $exists: false } }).toArray().catch(() => [] as any[]),
            d.collection('questions').aggregate([{ $group: { _id: { $ifNull: ['$subjectKey', '$subjectId'] }, n: { $sum: 1 } } }]).toArray().catch(() => [] as any[]),
        ]);
        const byKey = new Map<string, any>();
        [...a, ...b].forEach((s: any) => {
            const name = String(s.name || s.subjectName || '').trim(); if (!name) return;
            const k = nrm(name);
            if (!byKey.has(k)) byKey.set(k, { id: String(s._id), name, code: s.code || s.shortCode || '', key: k, count: 0 });
        });
        const countBy = new Map<string, number>(counts.map((c: any) => [String(c._id), c.n]));
        const list = [...byKey.values()].map(s => ({ ...s, count: (countBy.get(s.key) || 0) + (countBy.get(s.id) || 0) }));
        list.sort((x, y) => x.name.localeCompare(y.name));
        res.json(list);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── bank ──────────────────────────────────────────────────────────────────────
/** The class level (grade) a request refers to: "Grade 1 North" or its id → "grade 1". */
async function levelFrom(d: Db, classId: any, className: any): Promise<string> {
    if (String(className || '').trim()) return levelKey(className);
    const id = String(classId || '').trim(); if (!id) return '';
    const o = oid(id);
    const c: any = (o && (await d.collection('v2_classes').findOne({ _id: o }).catch(() => null))) || (o && (await d.collection('classes').findOne({ _id: o }).catch(() => null))) || (await d.collection('v2_streams').findOne({ _id: o as any }).catch(() => null));
    return c ? levelKey(c.className && c.name && !/\d/.test(c.name) ? `${c.className} ${c.name}` : (c.name || c.levelName || c.className)) : '';
}
/** Questions of one grade only — streams share their grade's questions; no other grade's. */
const levelOfQ = (r: any) => r.classLevel || (r.className ? levelKey(r.className) : '');
const onlyLevel = (rows: any[], level: string) => rows.filter(r => levelOfQ(r) === level);

function bankFilter(q: any) {
    const f: any = {};
    const and: any[] = [];
    if (q.subject) and.push({ $or: [{ subjectKey: nrm(q.subject) }, { subjectId: String(q.subjectId || '') || '__none__' }, { subjectName: new RegExp(`^${String(q.subject).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] });
    if (q.chapterId) f.chapterId = String(q.chapterId);
    if (q.type) and.push({ $or: [{ type: String(q.type) }, { questionType: String(q.type) }] });
    if (q.difficulty) f.difficulty = String(q.difficulty).toUpperCase();
    if (q.search) and.push({ questionText: { $regex: String(q.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80), $options: 'i' } });
    if (and.length) f.$and = and;
    return f;
}
router.get('/qp/bank', async (req, res) => {
    try {
        const d = db(req);
        let rows = await d.collection('questions').find(bankFilter(req.query)).sort({ createdAt: -1 }).limit(Math.min(5000, Number(req.query.limit) || 2000)).toArray();
        if (req.query.unassigned) rows = rows.filter(r => !levelOfQ(r));
        else if (req.query.classId || req.query.className) rows = onlyLevel(rows, await levelFrom(d, req.query.classId, req.query.className));
        res.json(rows.map((r: any) => ({ ...r, text: r.text ?? r.questionText ?? '', type: r.type || r.questionType || 'Short Answer', answer: r.answer ?? r.correctAnswer ?? '', parts: r.parts || [], options: (r.options || []).map((o: any, i: number) => typeof o === 'string' ? { label: String.fromCharCode(65 + i), text: o } : o) })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET /qp/bank/global — the owner-uploaded shared library, filtered the same way as /qp/bank.
// Read-only here: a school adds one of these to its own bank with POST /qp/bank/adopt.
router.get('/qp/bank/global', async (req, res) => {
    try {
        const d = db(req);
        let rows = await getMetaDb().collection('global_questions').find(bankFilter(req.query)).sort({ createdAt: -1 }).limit(Math.min(5000, Number(req.query.limit) || 2000)).toArray();
        if (req.query.classId || req.query.className) rows = onlyLevel(rows, await levelFrom(d, req.query.classId, req.query.className));
        res.json(rows.map((r: any) => ({ ...r, isGlobal: true, text: r.text ?? r.questionText ?? '', type: r.type || r.questionType || 'Short Answer', answer: r.answer ?? r.correctAnswer ?? '', parts: r.parts || [], options: (r.options || []).map((o: any, i: number) => typeof o === 'string' ? { label: String.fromCharCode(65 + i), text: o } : o) })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
// POST /qp/bank/adopt { ids } — copy ShuleCloud Library questions into this school's own bank
router.post('/qp/bank/adopt', W, async (req, res) => {
    try {
        const d = db(req);
        const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(oid).filter(Boolean) as ObjectId[];
        if (!ids.length) return res.status(400).json({ message: 'Choose questions to add' });
        const rows = await getMetaDb().collection('global_questions').find({ _id: { $in: ids } }).toArray();
        const actor = (req as any).tenantContext?.user || {};
        const existing = new Set((await d.collection('questions').find({}, { projection: { textKey: 1 } }).toArray()).map((x: any) => x.textKey).filter(Boolean));
        const docs: any[] = []; let skipped = 0;
        for (const r of rows) {
            const doc = { ...toDoc(cleanQuestion({ ...r, text: r.text ?? r.questionText }), { subjectName: r.subjectName, className: r.className }), createdAt: new Date(), createdBy: actor.name || 'ShuleCloud Library', approvalStatus: 'Approved' };
            if (existing.has(doc.textKey)) { skipped++; continue; }
            existing.add(doc.textKey); docs.push(doc);
        }
        if (docs.length) await d.collection('questions').insertMany(docs);
        res.status(201).json({ added: docs.length, skipped });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/qp/bank', W, async (req, res) => {
    try {
        const d = db(req);
        const b = req.body || {};
        if (!String(b.subjectName || '').trim()) return res.status(400).json({ message: 'Choose the subject these questions belong to' });
        // every question belongs to a class (grade) so papers are only made from that grade's questions
        const level = await levelFrom(d, b.classId, b.className);
        if (!level) return res.status(400).json({ message: 'Choose the class (grade) these questions are for' });
        const list = (Array.isArray(b.questions) ? b.questions : []).slice(0, 500).map(cleanQuestion).filter((q: any) => q.text.trim() || q.parts.length);
        if (!list.length) return res.status(400).json({ message: 'No questions to save' });
        const actor = (req as any).tenantContext?.user || {};
        const meta = { subjectId: str(b.subjectId, 60), subjectName: str(b.subjectName, 120).trim(), classId: str(b.classId, 60), className: str(b.className, 120), chapterId: str(b.chapterId, 60), chapterName: str(b.chapterName, 160), sourceDocument: b.sourceDocument };
        const existing = new Set((await d.collection('questions').find({ subjectKey: nrm(meta.subjectName) }, { projection: { textKey: 1 } }).toArray()).map((x: any) => x.textKey).filter(Boolean));
        const docs: any[] = []; let skipped = 0;
        for (const [i, q] of list.entries()) {
            const doc = { ...toDoc(q, { ...meta, section: b.questions[i]?.section }), createdAt: new Date(), createdBy: actor.name || 'staff', approvalStatus: 'Approved' };
            if (existing.has(doc.textKey)) { skipped++; continue; }
            existing.add(doc.textKey); docs.push(doc);
        }
        if (docs.length) await d.collection('questions').insertMany(docs);
        res.status(201).json({ saved: docs.length, skipped, subject: meta.subjectName });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/qp/bank/:id', U, async (req, res) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(404).json({ message: 'Not found' });
        const d = db(req);
        const cur: any = await d.collection('questions').findOne({ _id: id });
        if (!cur) return res.status(404).json({ message: 'Not found' });
        const b = req.body || {};
        const c = cleanQuestion({ ...cur, ...b, text: b.text ?? cur.text ?? cur.questionText });
        const subjectName = str(b.subjectName ?? cur.subjectName ?? '', 120);
        const doc = toDoc(c, { subjectId: b.subjectId ?? cur.subjectId, subjectName, classId: b.classId ?? cur.classId, className: b.className ?? cur.className, chapterId: b.chapterId ?? cur.chapterId, chapterName: b.chapterName ?? cur.chapterName, section: cur.section, sourceDocument: cur.sourceDocument });
        await d.collection('questions').updateOne({ _id: id }, { $set: { ...doc, updatedAt: new Date() } });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete('/qp/bank/:id', D, async (req, res) => {
    try { const id = oid(req.params.id); if (id) await db(req).collection('questions').deleteOne({ _id: id }); res.json({ ok: true }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
// POST /qp/bank/assign-class { ids, classId, className } — put questions under a class (grade)
router.post('/qp/bank/assign-class', U, async (req, res) => {
    try {
        const d = db(req);
        const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(oid).filter(Boolean) as ObjectId[];
        const level = await levelFrom(d, req.body?.classId, req.body?.className);
        if (!ids.length || !level) return res.status(400).json({ message: 'Choose questions and a class' });
        const r = await d.collection('questions').updateMany({ _id: { $in: ids } }, { $set: { classId: str(req.body?.classId, 60), className: str(req.body?.className, 120), classLevel: level, updatedAt: new Date() } });
        res.json({ updated: r.modifiedCount ?? ids.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/qp/bank/delete', D, async (req, res) => {
    try {
        const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(oid).filter(Boolean) as ObjectId[];
        const r = ids.length ? await db(req).collection('questions').deleteMany({ _id: { $in: ids } }) : { deletedCount: 0 };
        res.json({ deleted: r.deletedCount });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── generate ──────────────────────────────────────────────────────────────────
/**
 * body: { subject, subjectId?, classId?, chapterIds?: [], difficulty?: {EASY, MEDIUM, HARD} (%),
 *         sections: [{ name, instructions?, count, types?: [] , marksEach? }], exclude?: [ids], shuffle? }
 * Questions are picked at random without repeats across sections, honouring the
 * difficulty mix as closely as the bank allows. Shortages are reported per section.
 */
export function pickQuestions(pool: any[], sections: any[], mix?: Record<string, number>) {
    const used = new Set<string>();
    const rand = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
    const out = sections.map((s: any) => {
        const want = Math.max(0, Math.min(200, Number(s.count) || 0));
        const types: string[] = Array.isArray(s.types) ? s.types.filter(Boolean) : [];
        const fits = pool.filter(q => !used.has(String(q._id)) && (!types.length || types.includes(q.type || q.questionType)));
        let chosen: any[] = [];
        const total = mix ? (mix.EASY || 0) + (mix.MEDIUM || 0) + (mix.HARD || 0) : 0;
        if (total > 0) {
            for (const lvl of DIFF) {
                const n = Math.round((want * (mix![lvl] || 0)) / total);
                chosen.push(...rand(fits.filter(q => (q.difficulty || 'MEDIUM') === lvl)).slice(0, n));
            }
            chosen = chosen.slice(0, want);
        }
        if (chosen.length < want) chosen.push(...rand(fits.filter(q => !chosen.includes(q))).slice(0, want - chosen.length));
        chosen.forEach(q => used.add(String(q._id)));
        return { name: s.name || '', instructions: s.instructions || '', questions: chosen.map(q => ({ ...q, marks: s.marksEach ? Number(s.marksEach) : q.marks })), wanted: want, short: Math.max(0, want - chosen.length) };
    });
    return out;
}
router.post('/qp/generate', W, async (req, res) => {
    try {
        const b = req.body || {};
        if (!b.subject) return res.status(400).json({ message: 'Choose a subject' });
        const d = db(req);
        // only this class's grade: Grade 1 North / East … all use Grade 1 questions, never Grade 2's
        const level = await levelFrom(d, b.classId, b.className);
        if (!level) return res.status(400).json({ message: 'Choose the class the paper is for' });
        const f: any = bankFilter({ subject: b.subject, subjectId: b.subjectId });
        if (Array.isArray(b.chapterIds) && b.chapterIds.length) f.chapterId = { $in: b.chapterIds.map(String) };
        if (Array.isArray(b.exclude) && b.exclude.length) f._id = { $nin: b.exclude.map(oid).filter(Boolean) };
        const all = await d.collection('questions').find(f).toArray();
        const pool = onlyLevel(all, level);
        const unassigned = all.filter(r => !levelOfQ(r)).length;
        const norm = pool.map((r: any) => ({ ...r, text: r.text ?? r.questionText ?? '', type: r.type || r.questionType || 'Short Answer', answer: r.answer ?? r.correctAnswer ?? '', parts: r.parts || [], options: (r.options || []).map((o: any, i: number) => typeof o === 'string' ? { label: String.fromCharCode(65 + i), text: o } : o) }));
        const sections = Array.isArray(b.sections) && b.sections.length ? b.sections.slice(0, 10) : [{ name: '', count: Number(b.count) || 10, types: b.types || [] }];
        const picked = pickQuestions(norm, sections, b.difficulty);
        res.json({ available: norm.length, level, unassigned, sections: picked });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── saved papers ──────────────────────────────────────────────────────────────
const paperDoc = (b: any) => ({
    kind: 'paper-v2',
    paperTitle: str(b.paperTitle || b.header?.title, 200), subject: str(b.subject, 120), subjectId: str(b.subjectId, 60),
    classId: str(b.classId, 60), className: str(b.className, 120),
    header: b.header && typeof b.header === 'object' ? b.header : {}, rules: Array.isArray(b.rules) ? b.rules.map((r: any) => str(r, 400)).slice(0, 30) : [],
    numbering: b.numbering && typeof b.numbering === 'object' ? b.numbering : {},
    sections: (Array.isArray(b.sections) ? b.sections : []).slice(0, 10).map((s: any) => ({ name: str(s.name, 160), instructions: str(s.instructions, 600), questions: (Array.isArray(s.questions) ? s.questions : []).slice(0, 200).map((q: any) => ({ ...cleanQuestion(q), _id: q._id ? String(q._id) : undefined })) })),
    totalMarks: Number(b.totalMarks) || 0, duration: str(b.duration, 40), status: ['Draft', 'Final'].includes(b.status) ? b.status : 'Draft',
});
router.get('/qp/papers', async (req, res) => {
    try { res.json(await db(req).collection('question_papers').find({ kind: 'paper-v2' }).sort({ updatedAt: -1, createdAt: -1 }).project({ 'sections.questions.images': 0 }).toArray()); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/qp/papers/:id', async (req, res) => {
    try { const id = oid(req.params.id); const p = id ? await db(req).collection('question_papers').findOne({ _id: id }) : null; if (!p) return res.status(404).json({ message: 'Not found' }); res.json(p); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/qp/papers', W, async (req, res) => {
    try {
        const actor = (req as any).tenantContext?.user || {};
        const doc = { ...paperDoc(req.body || {}), createdAt: new Date(), updatedAt: new Date(), createdBy: actor.name || 'staff' };
        const r = await db(req).collection('question_papers').insertOne(doc);
        // the questions used are marked, so the generator can avoid repeating them
        const ids = doc.sections.flatMap((s: any) => s.questions.map((q: any) => oid(q._id))).filter(Boolean) as ObjectId[];
        if (ids.length) await db(req).collection('questions').updateMany({ _id: { $in: ids } }, { $inc: { timesUsed: 1 }, $set: { lastUsedAt: new Date() } }).catch(() => {});
        res.status(201).json({ ...doc, _id: r.insertedId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put('/qp/papers/:id', U, async (req, res) => {
    try {
        const id = oid(req.params.id); if (!id) return res.status(404).json({ message: 'Not found' });
        await db(req).collection('question_papers').updateOne({ _id: id }, { $set: { ...paperDoc(req.body || {}), updatedAt: new Date() } });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete('/qp/papers/:id', D, async (req, res) => {
    try { const id = oid(req.params.id); if (id) await db(req).collection('question_papers').deleteOne({ _id: id }); res.json({ ok: true }); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// "Scan to verify" QR link for a printed paper — proves it was issued by this school, and
// (when studentName/admNo are given) ties a specific printed copy to the student it went to.
router.post('/qp/verify-link', async (req, res) => {
    try {
        const b = req.body || {};
        const slug = String((req as any).tenantContext?.tenantSubdomain || '').toLowerCase();
        const token = signToken({
            p: str(b.paperId, 60), title: str(b.title, 200), subject: str(b.subject, 120),
            className: str(b.className, 120), studentName: str(b.studentName, 120), admNo: str(b.admNo, 40),
            at: Date.now(),
        });
        res.json({ url: `${publicAppUrl()}/${slug}/paper/verify/online/${token}` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
