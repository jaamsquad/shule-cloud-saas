/**
 * Skill-based reports: skills / fields of study inside subjects, rated per learner per term.
 *
 *   skill_areas        { subject, area (field of study), skills:[{id,name}], scale, levels:[class names] }
 *   skill_assessments  { studentId, subject, area, skillId, term, year, rating }
 *
 * Ratings use one of the scales below (mastery, letters, CBC levels, effort). Printing templates are chosen
 * on the front end; this file stores the framework and the ratings and returns them for a report.
 */
import { Router, Request } from 'express';
import crypto from 'crypto';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../../lib/mongodb';
import { enforceCrud } from '../../lib/permissions';
import { resolveScope, scopeForCollection, mergeFilter } from '../../lib/dataScope';
import { canonicalStatus } from '../../lib/studentStatus';
import { CBC_DEFAULT_SKILLS, CBC_DEFAULT_SUBJECTS } from './cbcDefaults';
import { sendEmail, getCommSettings } from '../../services/communications.service';
import { htmlToPdf, closeReportBrowser } from '../../services/report-card-pdf.service';

const router = Router();
const dbOf = (req: Request): Db => (req as any).tenantDb || getMetaDb();
const str = (v: any, max = 200) => String(v ?? '').trim().slice(0, max);
const norm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const SCALES: Record<string, { label: string; ratings: { code: string; label: string; short: string }[] }> = {
    mastery: { label: 'Mastery (Mastered / Progressing / Beginning)', ratings: [{ code: 'M', label: 'Mastered', short: 'Mastered' }, { code: 'P', label: 'Progressing', short: 'Progressing' }, { code: 'B', label: 'Beginning', short: 'Beginning' }] },
    letters: { label: 'Letter grades (A – E)', ratings: ['A', 'B', 'C', 'D', 'E'].map(c => ({ code: c, label: c, short: c })) },
    cbc: { label: 'CBC levels (EE / ME / AE / BE)', ratings: [{ code: 'EE', label: 'Exceeding Expectation', short: 'EE' }, { code: 'ME', label: 'Meeting Expectation', short: 'ME' }, { code: 'AE', label: 'Approaching Expectation', short: 'AE' }, { code: 'BE', label: 'Below Expectation', short: 'BE' }] },
    effort: { label: 'Effort (Excellent … Needs improvement)', ratings: [{ code: 'EX', label: 'Excellent', short: 'Excellent' }, { code: 'VG', label: 'Very Good', short: 'Very Good' }, { code: 'G', label: 'Good', short: 'Good' }, { code: 'F', label: 'Fair', short: 'Fair' }, { code: 'NI', label: 'Needs Improvement', short: 'Needs Impr.' }] },
};
const validRating = (scale: string, code: string) => !!SCALES[scale]?.ratings.some(r => r.code === code);

router.get('/skills/scales', (_req, res) => { res.json(SCALES); });

// ── frameworks (subject → field of study → skills) ────────────────────────────
router.get('/skills/frameworks', async (req, res) => {
    try {
        const q: any = {};
        if (req.query.subject) q.subject = str(req.query.subject);
        const rows: any[] = await dbOf(req).collection('skill_areas').find(q).toArray();
        const level = norm(req.query.level);
        const list = level ? rows.filter(r => !r.levels?.length || r.levels.some((l: string) => norm(level).startsWith(norm(l)) || norm(l) === level)) : rows;
        res.json(list.sort((a, b) => a.subject.localeCompare(b.subject) || (a.order ?? 0) - (b.order ?? 0)));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

const cleanFramework = (b: any, prev?: any) => {
    const scale = SCALES[b.scale] ? b.scale : 'mastery';
    const prevByName = new Map<string, string>((prev?.skills || []).map((s: any) => [norm(s.name), s.id]));
    const skills = (Array.isArray(b.skills) ? b.skills : []).map((s: any) => str(typeof s === 'string' ? s : s?.name, 300)).filter(Boolean).slice(0, 60)
        .map((name: string) => ({ id: prevByName.get(norm(name)) || crypto.randomBytes(5).toString('hex'), name }));   // renaming-free edits keep ids, so ratings stay attached
    return { subject: str(b.subject, 80), area: str(b.area, 120), scale, skills, levels: (Array.isArray(b.levels) ? b.levels : []).map((l: any) => str(l, 60)).filter(Boolean).slice(0, 30), order: Number(b.order) || 0 };
};
router.post('/skills/frameworks', enforceCrud('exams', 'create'), async (req, res) => {
    try {
        const f = cleanFramework(req.body || {});
        if (!f.subject || !f.area) return res.status(400).json({ message: 'Give the subject and the field of study.' });
        if (!f.skills.length) return res.status(400).json({ message: 'Add at least one skill.' });
        const r = await dbOf(req).collection('skill_areas').insertOne({ ...f, createdAt: new Date() } as any);
        res.status(201).json({ _id: r.insertedId, ...f });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put('/skills/frameworks/:id', enforceCrud('exams', 'update'), async (req, res) => {
    try {
        let _id: ObjectId; try { _id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Invalid id' }); }
        const d = dbOf(req); const prev: any = await d.collection('skill_areas').findOne({ _id });
        if (!prev) return res.status(404).json({ message: 'Not found' });
        const f = cleanFramework(req.body || {}, prev);
        if (!f.subject || !f.area || !f.skills.length) return res.status(400).json({ message: 'Give the subject, the field of study and at least one skill.' });
        await d.collection('skill_areas').updateOne({ _id }, { $set: { ...f, updatedAt: new Date() } });
        res.json({ _id, ...f });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete('/skills/frameworks/:id', enforceCrud('exams', 'delete'), async (req, res) => {
    try {
        let _id: ObjectId; try { _id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Invalid id' }); }
        const d = dbOf(req); const prev: any = await d.collection('skill_areas').findOne({ _id });
        if (!prev) return res.status(404).json({ message: 'Not found' });
        await d.collection('skill_areas').deleteMany({ _id });
        await d.collection('skill_assessments').deleteMany({ skillId: { $in: (prev.skills || []).map((s: any) => s.id) } });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── CBC defaults: ready-made strands/skills a school can load instead of typing ──
// them from scratch (see cbcDefaults.ts for sourcing notes).
router.get('/skills/defaults', (_req, res) => {
    res.json({ subjects: CBC_DEFAULT_SUBJECTS, areas: CBC_DEFAULT_SKILLS });
});
router.post('/skills/frameworks/seed-defaults', enforceCrud('exams', 'create'), async (req, res) => {
    try {
        const d = dbOf(req);
        const wantSubjects: string[] = Array.isArray(req.body?.subjects) && req.body.subjects.length
            ? req.body.subjects.map((s: any) => str(s, 80))
            : CBC_DEFAULT_SUBJECTS;
        const toSeed = CBC_DEFAULT_SKILLS.filter(a => wantSubjects.some(s => norm(s) === norm(a.subject)));
        if (!toSeed.length) return res.status(400).json({ message: 'No matching default subjects.' });
        const existing: any[] = await d.collection('skill_areas').find({ subject: { $in: toSeed.map(a => a.subject) } }, { projection: { subject: 1, area: 1 } }).toArray();
        const have = new Set(existing.map((e: any) => `${norm(e.subject)}|${norm(e.area)}`));
        const docs = toSeed.filter(a => !have.has(`${norm(a.subject)}|${norm(a.area)}`))
            .map(a => ({ ...cleanFramework(a), createdAt: new Date(), source: 'cbc-default' }));
        if (docs.length) await d.collection('skill_areas').insertMany(docs as any[]);
        res.json({ added: docs.length, skipped: toSeed.length - docs.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── learners of a class (active only, within the caller's data scope) ─────────
async function classLearners(req: Request, className: string) {
    const d = dbOf(req);
    const rx = new RegExp(`^\\s*${esc(className).replace(/\s+/g, '\\s+')}\\s*$`, 'i');
    const stream: any = await d.collection('v2_streams').findOne({ fullName: rx, deletedAt: { $exists: false } }).catch(() => null);
    // a whole class (all its streams), e.g. "Form 1", as created in the school's classes
    const level: any = stream ? null : await d.collection('v2_classes').findOne({ name: rx, deletedAt: { $exists: false } }).catch(() => null);
    const scope = await resolveScope(req, d);
    const filter = mergeFilter({ $or: [...(stream ? [{ streamId: String(stream._id) }] : []), ...(level ? [{ classId: String(level._id) }] : []), { studentClass: rx }, { currentClass: rx }] }, scopeForCollection('students', scope));
    const rows: any[] = (await d.collection('students').find(filter).toArray()).filter((s: any) => canonicalStatus(s.status) === 'Active');
    return rows.map(s => ({ _id: String(s._id), name: s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(), regNo: s.registrationNo || s.admNo || '', className: s.studentClass || className, gender: s.gender || '' })).sort((a, b) => a.name.localeCompare(b.name));
}

// ── ratings for a class + subject + term ──────────────────────────────────────
router.get('/skills/assessments', async (req, res) => {
    try {
        const className = str(req.query.className, 80), subject = str(req.query.subject, 80), term = str(req.query.term, 40), year = str(req.query.year, 10);
        if (!className || !subject || !term) return res.status(400).json({ message: 'className, subject and term are required' });
        const learners = await classLearners(req, className);
        const ids = learners.map(l => l._id);
        const rows: any[] = ids.length ? await dbOf(req).collection('skill_assessments').find({ studentId: { $in: ids }, subject, term, year }).toArray() : [];
        const ratings: Record<string, Record<string, string>> = {};
        rows.forEach(r => { (ratings[r.studentId] ||= {})[r.skillId] = r.rating; });
        res.json({ learners, ratings });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/skills/assessments/bulk', enforceCrud('exams', 'update'), async (req, res) => {
    try {
        const d = dbOf(req); const b = req.body || {};
        const subject = str(b.subject, 80), term = str(b.term, 40), year = str(b.year, 10);
        const records: any[] = Array.isArray(b.records) ? b.records.slice(0, 5000) : [];
        if (!subject || !term || !year || !records.length) return res.status(400).json({ message: 'subject, term, year and records are required' });
        const frameworks: any[] = await d.collection('skill_areas').find({ subject }).toArray();
        const skillInfo = new Map<string, { area: string; scale: string }>();
        frameworks.forEach(f => (f.skills || []).forEach((s: any) => skillInfo.set(s.id, { area: f.area, scale: f.scale })));
        const actor = (req as any).tenantContext?.user || {};
        const ops: any[] = []; let saved = 0, cleared = 0, skipped = 0;
        for (const r of records) {
            const info = skillInfo.get(String(r.skillId)); const studentId = str(r.studentId, 40);
            if (!info || !studentId) { skipped++; continue; }
            const key = { studentId, skillId: String(r.skillId), term, year };
            if (!r.rating) { ops.push({ deleteOne: { filter: key } }); cleared++; continue; }
            if (!validRating(info.scale, String(r.rating))) { skipped++; continue; }
            ops.push({ updateOne: { filter: key, update: { $set: { ...key, subject, area: info.area, rating: String(r.rating), updatedAt: new Date(), updatedBy: actor.name || actor.staffId || 'user' }, $setOnInsert: { createdAt: new Date() } }, upsert: true } }); saved++;
        }
        if (ops.length) await d.collection('skill_assessments').bulkWrite(ops);
        res.json({ saved, cleared, skipped });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── report data: for one learner (studentId) or a whole class (className) ─────
router.get('/skills/report', async (req, res) => {
    try {
        const d = dbOf(req);
        const year = str(req.query.year, 10), terms = ['Term 1', 'Term 2', 'Term 3'];
        let learners: any[] = [];
        if (req.query.studentId) {
            let oid: ObjectId; try { oid = new ObjectId(String(req.query.studentId)); } catch { return res.status(400).json({ message: 'Invalid student' }); }
            const scope = await resolveScope(req, d);
            const s: any = await d.collection('students').findOne(mergeFilter({ _id: oid }, scopeForCollection('students', scope)));
            if (!s) return res.status(404).json({ message: 'Student not found' });
            learners = [{ _id: String(s._id), name: s.studentName || s.name || '', regNo: s.registrationNo || s.admNo || '', className: s.studentClass || s.currentClass || s.statusPrevClass?.studentClass || '', gender: s.gender || '' }];
        } else if (req.query.className) learners = await classLearners(req, str(req.query.className, 80));
        else return res.status(400).json({ message: 'studentId or className is required' });
        if (learners.length > 300) learners = learners.slice(0, 300);

        const wantSubjects = str(req.query.subjects, 400).split(',').map(s => s.trim()).filter(Boolean);
        const frameworks: any[] = (await d.collection('skill_areas').find(wantSubjects.length ? { subject: { $in: wantSubjects } } : {}).toArray())
            .filter(f => !learners[0]?.className || !f.levels?.length || f.levels.some((l: string) => norm(learners[0].className).startsWith(norm(l))));
        const ids = learners.map(l => l._id);
        const rows: any[] = ids.length ? await d.collection('skill_assessments').find({ studentId: { $in: ids }, year }).toArray() : [];
        const byStudent = new Map<string, any[]>(); rows.forEach(r => { (byStudent.get(r.studentId) || byStudent.set(r.studentId, []).get(r.studentId)!).push(r); });

        const subjects = Array.from(new Set(frameworks.map(f => f.subject))).sort();
        res.json({
            year, terms, scales: SCALES,
            reports: learners.map(l => {
                const mine = byStudent.get(l._id) || [];
                return {
                    student: l,
                    subjects: subjects.map(subject => ({
                        subject,
                        areas: frameworks.filter(f => f.subject === subject).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(f => ({
                            area: f.area, scale: f.scale,
                            skills: (f.skills || []).map((s: any) => ({ id: s.id, name: s.name, ratings: Object.fromEntries(terms.map(t => [t, mine.find(r => r.skillId === s.id && r.term === t)?.rating || ''])) })),
                        })),
                    })),
                };
            }),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Email a class's skill-based reports (PDF) to parents ──────────────────────
// Communications → Bulk SMS → Send Results: the "Skill-Based Report" option
// generates one PDF per learner (their ratings for the chosen term) and emails
// it to their parent, the same way Exams → Manage Exams emails result cards.
const RATING_LABEL = (scale: string, code: string): string => SCALES[scale]?.ratings.find(r => r.code === code)?.label || code || '—';
function skillReportPdfHtml(opts: {
    schoolName: string; studentName: string; regNo: string; className: string; term: string; year: string;
    subjects: { subject: string; areas: { area: string; scale: string; skills: { name: string; rating: string }[] }[] }[];
}): string {
    const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    const sections = opts.subjects.map(s => `
        <h3 style="margin:18px 0 6px;font-size:14px;color:#1f2937">${esc(s.subject)}</h3>
        ${s.areas.map(a => `
            <div style="margin-bottom:10px">
                <div style="font-weight:700;font-size:12px;color:#475569;margin-bottom:4px">${esc(a.area)}</div>
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    ${a.skills.map(sk => `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb">${esc(sk.name)}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;width:140px;font-weight:700;color:#334155">${esc(RATING_LABEL(a.scale, sk.rating))}</td></tr>`).join('')}
                </table>
            </div>`).join('')}`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{margin:14mm}body{font-family:Arial,Helvetica,sans-serif;color:#1e293b}</style></head><body>
        <div style="border-bottom:3px solid #5C67F2;padding-bottom:10px;margin-bottom:14px">
            <h1 style="margin:0;font-size:18px">${esc(opts.schoolName)}</h1>
            <p style="margin:2px 0 0;font-size:12px;color:#64748b">Skill-Based Report — ${esc(opts.term)} ${esc(opts.year)}</p>
        </div>
        <p style="margin:0 0 2px;font-size:13px"><b>${esc(opts.studentName)}</b> ${opts.regNo ? `(${esc(opts.regNo)})` : ''}</p>
        <p style="margin:0 0 10px;font-size:12px;color:#64748b">${esc(opts.className)}</p>
        ${sections || '<p style="color:#94a3b8;font-size:12px">No skills rated for this term yet.</p>'}
    </body></html>`;
}
router.post('/skills/email-report', enforceCrud('exams', 'update'), async (req, res) => {
    const d = dbOf(req);
    try {
        const className = str(req.body?.className, 80), term = str(req.body?.term, 40), year = str(req.body?.year, 10);
        if (!className || !term || !year) return res.status(400).json({ message: 'className, term and year are required' });
        const wantSubjects: string[] = Array.isArray(req.body?.subjects) ? req.body.subjects.map((s: any) => str(s, 80)).filter(Boolean) : [];

        // Fail fast with a clear message if email isn't configured at all.
        const cs: any = await getCommSettings(d);
        const host = cs.smtpHost || process.env.SMTP_HOST, user = cs.smtpUser || process.env.SMTP_USER, pass = cs.smtpPass || process.env.SMTP_PASS;
        if (cs.emailEnabled === false) return res.status(400).json({ message: 'Email sending is disabled. Enable it in Communications → Settings.' });
        if (!host || !user || !pass) return res.status(400).json({ message: 'Email is not configured. Set SMTP host, username and password in Communications → Settings.' });

        const learners = await classLearners(req, className);
        if (!learners.length) return res.status(404).json({ message: 'No learners found in this class.' });
        const students = await d.collection('students').find({ _id: { $in: learners.map(l => new ObjectId(l._id)) } }).toArray();
        const studentById = new Map<string, any>(students.map((s: any) => [String(s._id), s]));

        const frameworks: any[] = (await d.collection('skill_areas').find(wantSubjects.length ? { subject: { $in: wantSubjects } } : {}).toArray())
            .filter((f: any) => !f.levels?.length || f.levels.some((l: string) => norm(className).startsWith(norm(l))));
        const subjects = Array.from(new Set(frameworks.map((f: any) => f.subject))).sort();
        if (!subjects.length) return res.status(400).json({ message: 'No skills have been set up for this class/subject yet — set them up under Exams → Skill-Based Reports.' });

        const ids = learners.map(l => l._id);
        const rows: any[] = ids.length ? await d.collection('skill_assessments').find({ studentId: { $in: ids }, term, year }).toArray() : [];
        const byStudent = new Map<string, any[]>(); rows.forEach((r: any) => { (byStudent.get(r.studentId) || byStudent.set(r.studentId, []).get(r.studentId)!).push(r); });

        const tenantId = (req as any).tenantContext?.tenantId;
        const tenant: any = tenantId ? await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(String(tenantId)) }).catch(() => null) : null;
        const schoolName = tenant?.instituteName || tenant?.name || 'School';

        let sent = 0, failed = 0, skipped = 0; let firstError = '';
        const processLearner = async (l: { _id: string; name: string; regNo: string }) => {
            const st = studentById.get(l._id);
            if (!st) { skipped++; return; }
            const linked = await d.collection('parents').find({ 'linkedStudents.studentId': l._id }).toArray().catch(() => []);
            const parent = linked.find((p: any) => (p.linkedStudents || []).some((x: any) => String(x.studentId) === l._id && x.isPrimary)) || linked[0];
            const email = parent?.email || parent?.parentEmail || parent?.emailAddress || st.parentEmail || st.fatherEmail || st.motherEmail || st.guardianEmail || '';
            if (!email) { skipped++; return; }
            try {
                const mine = byStudent.get(l._id) || [];
                const html = skillReportPdfHtml({
                    schoolName, studentName: l.name, regNo: l.regNo, className, term, year,
                    subjects: subjects.map(subject => ({
                        subject,
                        areas: frameworks.filter((f: any) => f.subject === subject).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((f: any) => ({
                            area: f.area, scale: f.scale,
                            skills: (f.skills || []).map((s: any) => ({ name: s.name, rating: mine.find((r: any) => r.skillId === s.id)?.rating || '' })),
                        })),
                    })),
                });
                const pdf = await htmlToPdf(html);
                await sendEmail(d, {
                    to: [email],
                    subject: `Skill-Based Report — ${l.name} (${term} ${year})`,
                    html: `<p>Dear Parent,</p><p>Please find attached ${l.name}'s Skill-Based Report for ${term} ${year}.</p><p>Regards,<br>${schoolName}</p>`,
                    attachments: [{ filename: `SkillReport-${(l.regNo || l.name).toString().replace(/[^\w-]/g, '_')}.pdf`, content: pdf, contentType: 'application/pdf' }],
                });
                sent++;
            } catch (e: any) { failed++; if (!firstError) firstError = e?.message || String(e); }
        };

        const CONCURRENCY = 6;
        let cursor = 0;
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, learners.length) }, async () => {
            while (cursor < learners.length) { const i = cursor++; await processLearner(learners[i]); }
        }));

        await closeReportBrowser().catch(() => {});
        res.json({ total: learners.length, sent, failed, skipped, error: failed > 0 ? firstError : undefined });
    } catch (e: any) {
        await closeReportBrowser().catch(() => {});
        res.status(500).json({ message: e.message });
    }
});

export default router;
