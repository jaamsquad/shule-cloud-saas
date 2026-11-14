/**
 * Subjects → Subjects we offer, Subjects → Pathways, and the CBC module's learning areas.
 *
 *  - The subject list is built in (lib/subjectCatalog); a school ticks the subjects it offers.
 *    Ticked subjects become the school's subjects (`subjects` collection) used everywhere
 *    (classes, exams, marks, report cards). Unticking hides a subject; one that already has
 *    marks or is on a class is kept (hidden) so no history is lost.
 *  - CBE senior school pathways / tracks are built in (lib/cbeCurriculum); the school chooses
 *    the tracks it offers and assigns learners a pathway, track and 3 electives.
 *  - CBC learning areas follow the learner's band (KICD) and, in senior school, their pathway.
 */
import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { enforceCrud } from '../lib/permissions';
import { SUBJECT_CATALOG, SUBJECT_GROUPS, catalogByKey, catalogMatch } from '../lib/subjectCatalog';
import { PATHWAYS, pathwayByKey, trackByKey, SENIOR_CORE, SENIOR_CORE_MATH, SENIOR_SUPPORT, ELECTIVES_PER_LEARNER, BANDS, bandOf, seniorSubjectsFor } from '../lib/cbeCurriculum';

const router = Router();
const db = (req: Request): Db => ((req as any).tenantDb as Db) || getMetaDb();
const norm = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const LEFT = /left|transfer|graduat|alumni|withdraw/i;

async function schoolSubjects(d: Db) {
    const rows: any[] = await d.collection('subjects').find({}).toArray().catch(() => []);
    return rows.map(s => ({ ...s, catalogKey: s.catalogKey || catalogMatch(s.name || s.subjectName)?.key || null }));
}

// ── Subjects we offer ────────────────────────────────────────────────────────────
router.get('/subject-catalog', async (req: Request, res: Response) => {
    try {
        const mine = await schoolSubjects(db(req));
        const byKey = new Map(mine.filter(s => s.catalogKey).map(s => [s.catalogKey, s]));
        res.json({
            groups: SUBJECT_GROUPS,
            subjects: SUBJECT_CATALOG.map(c => {
                const s: any = byKey.get(c.key);
                return { ...c, offered: !!s && s.offered !== false, subjectId: s ? String(s._id) : null };
            }),
            custom: mine.filter(s => !s.catalogKey && s.offered !== false).map(s => ({ _id: String(s._id), name: s.name || s.subjectName, code: s.code || '', category: s.category || '' })),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/subject-catalog/offered', enforceCrud('subjects', 'update'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const keys = new Set<string>((Array.isArray(req.body?.keys) ? req.body.keys : []).map(String).filter((k: string) => catalogByKey.has(k)));
        const mine = await schoolSubjects(d);
        const byKey = new Map(mine.filter(s => s.catalogKey).map(s => [s.catalogKey, s]));
        const classes: any[] = await d.collection('classes').find({}, { projection: { subjects: 1 } }).toArray().catch(() => []);
        const onClass = new Set(classes.flatMap((c: any) => (c.subjects || []).map((x: any) => String(x.subjectId || x._id || ''))));
        let added = 0, hidden = 0, removed = 0, restored = 0;
        for (const c of SUBJECT_CATALOG) {
            const s: any = byKey.get(c.key);
            if (keys.has(c.key)) {
                if (!s) {
                    await d.collection('subjects').insertOne({ name: c.name, code: c.code || '', shortCode: c.short, category: c.group, catalogKey: c.key, offered: true, createdAt: new Date() });
                    added++;
                } else if (s.offered === false || !s.catalogKey) {
                    await d.collection('subjects').updateOne({ _id: s._id }, { $set: { offered: true, catalogKey: c.key, ...(s.shortCode ? {} : { shortCode: c.short }), ...(s.code ? {} : { code: c.code || '' }) } });
                    if (s.offered === false) restored++;
                }
            } else if (s && s.offered !== false) {
                const used = onClass.has(String(s._id)) || (await d.collection('exam_marks').countDocuments({ $or: [{ subjectId: String(s._id) }, { subjectName: s.name }] }).catch(() => 1)) > 0;
                if (used) { await d.collection('subjects').updateOne({ _id: s._id }, { $set: { offered: false, catalogKey: c.key } }); hidden++; }
                else { await d.collection('subjects').deleteOne({ _id: s._id }); removed++; }
            }
        }
        res.json({ message: `Saved: ${keys.size} subjects offered${added ? `, ${added} added` : ''}${restored ? `, ${restored} restored` : ''}${hidden ? `, ${hidden} hidden (they have marks or classes)` : ''}${removed ? `, ${removed} removed` : ''}.`, added, restored, hidden, removed });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Pathways (CBE senior school) ─────────────────────────────────────────────────
const SETTINGS_ID = 'pathways';
async function offeredTracks(d: Db): Promise<string[] | null> {
    const s: any = await d.collection('curriculum_options').findOne({ _id: SETTINGS_ID as any }).catch(() => null);
    return Array.isArray(s?.offeredTracks) ? s.offeredTracks : null;   // null = all tracks
}

router.get('/pathways', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const [mine, students, offered] = await Promise.all([
            schoolSubjects(d),
            d.collection('students').find({ pathway: { $exists: true, $ne: null } }, { projection: { pathway: 1, track: 1, status: 1 } }).toArray().catch(() => [] as any[]),
            offeredTracks(d),
        ]);
        const offeredSubj = new Set(mine.filter(s => s.offered !== false).map(s => s.catalogKey || norm(s.name)));
        const live = students.filter((s: any) => !LEFT.test(String(s.status || '')));
        res.json({
            core: { subjects: SENIOR_CORE, math: SENIOR_CORE_MATH, support: SENIOR_SUPPORT, electivesPerLearner: ELECTIVES_PER_LEARNER },
            pathways: PATHWAYS.map(p => ({
                key: p.key, name: p.name, short: p.short,
                students: live.filter((s: any) => s.pathway === p.key).length,
                tracks: p.tracks.map(t => ({
                    key: t.key, name: t.name, offered: !offered || offered.includes(t.key),
                    students: live.filter((s: any) => s.track === t.key).length,
                    subjects: t.subjects.map(n => { const c = catalogMatch(n); return { name: n, key: c?.key || null, offered: !!c && offeredSubj.has(c.key) }; }),
                })),
            })),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/pathways/tracks', enforceCrud('subjects', 'update'), async (req: Request, res: Response) => {
    try {
        const all = PATHWAYS.flatMap(p => p.tracks.map(t => t.key));
        const keys = (Array.isArray(req.body?.offeredTracks) ? req.body.offeredTracks : []).map(String).filter((k: string) => all.includes(k));
        await db(req).collection('curriculum_options').updateOne({ _id: SETTINGS_ID as any }, { $set: { offeredTracks: keys, updatedAt: new Date() } }, { upsert: true });
        res.json({ message: `${keys.length} track(s) offered`, offeredTracks: keys });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// learners of a class (Grade 10+) with their pathway, track and electives
router.get('/pathways/learners', async (req: Request, res: Response) => {
    try {
        const cls = String(req.query.class || '').trim(), stream = String(req.query.stream || '').trim();
        if (!cls) return res.status(400).json({ message: 'Pick a class' });
        const all: any[] = await db(req).collection('students').find({}).toArray().catch(() => []);
        const lvl = (v: any) => String(v || '').toLowerCase().match(/(grade|form)\s*\d+/)?.[0]?.replace(/\s+/g, ' ') || norm(v);
        const rows = all.filter(s => lvl(s.studentClass || s.currentClass) === lvl(cls) && !LEFT.test(String(s.status || '')))
            .filter(s => !stream || norm(s.streamName || s.stream || String(s.studentClass || '').replace(/^(grade|form)\s*\d+\s*/i, '')) === norm(stream))
            .map(s => ({ _id: String(s._id), name: s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student', adm: s.registrationNo || s.admNo || '', gender: s.gender || '', stream: s.streamName || s.stream || '',
                pathway: s.pathway || '', track: s.track || '', electives: Array.isArray(s.electives) ? s.electives : [] }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/pathways/assign', enforceCrud('students', 'update'), async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const list: any[] = Array.isArray(req.body?.assignments) ? req.body.assignments : [];
        let saved = 0; const problems: string[] = [];
        for (const a of list) {
            const id = oid(a.studentId); if (!id) continue;
            const p = pathwayByKey(a.pathway);
            const t = a.track ? trackByKey(a.track) : null;
            if (a.pathway && !p) { problems.push(`Unknown pathway for ${a.studentId}`); continue; }
            if (t && p && t.pathway.key !== p.key) { problems.push(`${t.track.name} is not a ${p.name} track`); continue; }
            const electives = (Array.isArray(a.electives) ? a.electives : []).map((x: any) => String(x).trim()).filter(Boolean).filter((x: string, i: number, arr: string[]) => arr.indexOf(x) === i).slice(0, ELECTIVES_PER_LEARNER);
            const $set: any = p
                ? { pathway: p.key, pathwayName: p.name, track: t?.track.key || null, trackName: t?.track.name || null, electives, pathwayUpdatedAt: new Date() }
                : { pathway: null, pathwayName: null, track: null, trackName: null, electives: [], pathwayUpdatedAt: new Date() };
            await d.collection('students').updateOne({ _id: id }, { $set });
            saved++;
        }
        res.json({ message: `Saved ${saved} learner(s)${problems.length ? ` · ${problems.length} skipped` : ''}`, saved, problems });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── CBC learning areas by band / pathway ─────────────────────────────────────────
async function seniorAreas(d: Db) {
    const mine = await schoolSubjects(d);
    const electives = PATHWAYS.flatMap(p => p.tracks.flatMap(t => t.subjects));
    const isElective = new Set(electives.map(norm));
    const offered = mine.filter(s => s.offered !== false).map(s => s.name).filter(n => isElective.has(norm(n)));
    const core = [...SENIOR_CORE, SENIOR_CORE_MATH.stem, SENIOR_CORE_MATH.other, ...SENIOR_SUPPORT];
    return Array.from(new Set([...core, ...(offered.length ? offered : electives)]));
}

router.get('/cbc/bands', async (req: Request, res: Response) => {
    try { const sa = await seniorAreas(db(req)); res.json(BANDS.map(b => ({ ...b, areas: b.key === 'senior-school' ? sa : b.areas }))); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET /cbc/areas-for?grade=Grade 10&studentId= → the learning areas for that class / learner
router.get('/cbc/areas-for', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        let grade = String(req.query.grade || '');
        let student: any = null;
        if (req.query.studentId) { student = await d.collection('students').findOne({ _id: oid(req.query.studentId) as any }).catch(() => null); grade = grade || student?.studentClass || student?.currentClass || ''; }
        const band = bandOf(grade);
        if (!band) return res.json({ band: null, areas: [] });
        if (band.key !== 'senior-school') return res.json({ band: band.key, areas: band.areas });
        if (student?.pathway) return res.json({ band: band.key, pathway: student.pathway, track: student.track, areas: seniorSubjectsFor(student.pathway, student.electives || []) });
        res.json({ band: band.key, areas: await seniorAreas(d) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET /cbc/roster?activityId= → learners for an activity: its grade, and for a senior-school
// elective only the learners who take that subject (learners with no electives set stay listed)
router.get('/cbc/roster', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const act: any = await d.collection('cbc_activities').findOne({ _id: oid(req.query.activityId) as any }).catch(() => null);
        if (!act) return res.status(404).json({ message: 'Activity not found' });
        const all: any[] = await d.collection('students').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const grade = String(act.grade || act.class || '');
        let rows = grade ? all.filter(s => { const c = String(s.currentClass || s.studentClass || ''); return c === grade || c.includes(grade); }) : all;
        rows = rows.filter(s => !LEFT.test(String(s.status || '')));
        const band = bandOf(grade);
        const area = norm(act.learningArea);
        const everyone = [...SENIOR_CORE, ...SENIOR_SUPPORT].map(norm);
        if (band?.key === 'senior-school' && area && !everyone.includes(area)) {
            if (area === norm(SENIOR_CORE_MATH.stem)) rows = rows.filter(s => !s.pathway || s.pathway === 'stem');
            else if (area === norm(SENIOR_CORE_MATH.other)) rows = rows.filter(s => !s.pathway || s.pathway !== 'stem');
            else rows = rows.filter(s => !Array.isArray(s.electives) || !s.electives.length || s.electives.map(norm).includes(area));
        }
        res.json(rows.map(s => ({ _id: String(s._id), studentName: s.studentName || s.name, registrationNo: s.registrationNo || s.admNo || '', currentClass: s.currentClass, studentClass: s.studentClass, pathway: s.pathway || null, track: s.track || null })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// POST /cbc/learning-areas/load → add the KICD learning areas for each band (missing ones only)
router.post('/cbc/learning-areas/load', async (req: Request, res: Response) => {
    try {
        const d = db(req);
        const existing: any[] = await d.collection('cbc_learning_areas').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const have = new Set(existing.map(a => `${a.band || ''}|${norm(a.name)}`));
        const sa = await seniorAreas(d);
        const docs: any[] = [];
        for (const b of BANDS) for (const name of (b.key === 'senior-school' ? sa : b.areas)) {
            if (have.has(`${b.key}|${norm(name)}`)) continue;
            docs.push({ name, band: b.key, bandName: b.name, grades: b.grades, active: true, source: 'KICD', createdAt: new Date() });
        }
        if (docs.length) await d.collection('cbc_learning_areas').insertMany(docs);
        res.json({ message: docs.length ? `Added ${docs.length} learning area(s)` : 'All KICD learning areas are already there', added: docs.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
