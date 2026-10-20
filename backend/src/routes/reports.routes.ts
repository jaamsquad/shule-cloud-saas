import { Router, Request, Response } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { Db, ObjectId } from 'mongodb';
import { formatExamName } from '../lib/examName';
import { getCurriculumConfig, curriculumFromClassLabel, resolveClassCurriculum } from '../lib/curriculum';
import { yearlyStatus, computeYearly, classStudents } from '../lib/yearlyReport';
import { onlyPublished, publishedView } from '../lib/examPublish';
import { resolveGrading, gradeFromScale, meanGradeFromScale, makeGradingCache } from '../lib/grading';
import { backfillClassAtTimeForExam } from '../lib/classAtTimeBackfill';
import { averageAcrossSourceExams } from './analytics.routes';

const getRequestDb = (req: Request): Db => (req as any).tenantDb || getMetaDb();

const router = Router();

// ─── ScholarSheet report card data ─────────────────────────────────────────────
// Assembles exactly what the A4 report card needs: summary row, subject rows
// (mark/out-of/total/point/grade/position/remarks/initials), KCPE + value added,
// the historical Form1-4 × T1-T3 grid (MP/MG/POS), and the term bar chart series.
// Subjects come from the student's class (curriculum-driven); grading from the
// chosen scale.
const N = (v: any) => Number(v) || 0;
const RND = (n: number, d = 0) => { const f = 10 ** d; return Math.round((Number(n) || 0) * f) / f; };

// The class's grading = the single resolver in lib/grading (class template → class
// grading_criteria → global grading_criteria → curriculum settings → default).
// Only the built-in default keeps this report card's traditional remark wording.
const DEFAULT_REMARKS: Record<string, string> = {
    A: 'EXCELLENT', 'A-': 'V.GOOD', 'B+': 'GOOD', B: 'GOOD', 'B-': 'GOOD', 'C+': 'FAIR', C: 'FAIR',
    'C-': 'C.AVERAGE', 'D+': 'AIM HIGHER', D: 'AIM HIGHER', 'D-': 'WEAK', E: 'PULL UP YOUR SOCKS',
};
async function loadGrading(database: Db, classId?: string, className?: string) {
    const g = await resolveGrading(database, classId, className);
    const scale = g.source === 'default' ? g.scale.map(b => ({ ...b, remark: DEFAULT_REMARKS[b.grade] ?? b.remark })) : g.scale;
    const gradeOf = (pct: number) => gradeFromScale(scale, pct);
    const meanGrade = (mp: number) => meanGradeFromScale(scale, mp);
    return { scale, gradeOf, meanGrade };
}

const scholarSheetHandler = async (req: Request, res: Response) => {
    try {
        const database = getRequestDb(req);
        const sid = req.params.studentId;
        const examId = String(req.query.examId || '');
        if (!examId) return res.status(400).json({ message: 'examId required' });

        const student: any = await database.collection('students').findOne({ _id: new ObjectId(sid) }).catch(() => null);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const exam: any = await database.collection('exams').findOne({ _id: new ObjectId(examId) }).catch(() => null);
        // A Consolidated or Year Average exam has no marks of its own — it's an average
        // across the real written-test exams picked when it was created (sourceExamIds).
        // Resolve those here, then AVERAGE their published marks and tag the merged rows
        // with this exam's own id, so every downstream step below (generations, columns,
        // positions, change-vs-previous) treats it exactly like a normal single exam —
        // no special-casing needed past this point.
        const sourceExamIds: string[] = (exam?.examCategory === 'consolidated' || exam?.examCategory === 'year_average') && Array.isArray(exam?.sourceExamIds)
            ? exam.sourceExamIds.map(String).filter(Boolean) : [];
        const isComputedExam = sourceExamIds.length > 0;
        // School profile = the Tenant record in the meta DB (name, logo, etc.),
        // merged with any tenant-DB profile collection extras.
        const tenantId = (req as any).tenantContext?.tenantId;
        const tenant: any = tenantId ? await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(String(tenantId)) }).catch(() => null) : null;
        const extra: any = await database.collection('school_profile').findOne({}).catch(() => null)
            || await database.collection('tenant_profile').findOne({}).catch(() => null) || {};
        const profile: any = { ...(tenant || {}), ...extra, name: tenant?.instituteName || tenant?.name || extra?.name };
        // The class this card is FOR is the class the student was in when they sat this
        // exam (exam_marks.classAtTime/classIdAtTime, stamped once at save time) — never
        // their current class. Without this, a student promoted since the exam (Form 3 ->
        // Form 4) would print their old Form 3 exam under a "Form 4" heading, which is wrong:
        // the exam, its subjects/curriculum, grading and title must all stay Form 3.
        await Promise.all((isComputedExam ? sourceExamIds : [examId]).map(id => backfillClassAtTimeForExam(database, id)));
        const examMarkForMe: any = await database.collection('exam_marks').findOne({ examId: isComputedExam ? { $in: sourceExamIds } : examId, studentId: sid, $or: [{ classAtTime: { $exists: true, $ne: '' } }, { classIdAtTime: { $exists: true, $ne: '' } }] }).catch(() => null);
        const classId = String(examMarkForMe?.classIdAtTime || student.classId || '');
        const myClass = examMarkForMe?.classAtTime || student.studentClass || student.currentClass || '';
        // Stream at the time, pulled from the classAtTime label itself ("Form 3 East" -> "East");
        // falls back to the student's current stream when there's no classAtTime to read it from.
        const streamAtTimeMatch = examMarkForMe?.classAtTime ? String(examMarkForMe.classAtTime).match(/(?:form|grade)\s*\d+\s+(.+)$/i) : null;
        const myStream = streamAtTimeMatch?.[1] || student.stream || student.streamName || '';
        // Grading resolves via the class's assigned template (by id OR name).
        const { gradeOf, meanGrade } = await loadGrading(database, classId, myClass);

        // ── Curriculum resolution (engine) ────────────────────────────────────────
        // The class's assigned curriculum decides the report card mode/layout/
        // terminology. Prefer the class record's curriculum; fall back to inferring
        // from the class label (Grade/PP → CBC, Form → 8-4-4).
        let curriculumConfig;
        if (classId) {
            const resolved = await resolveClassCurriculum(database, classId);
            curriculumConfig = resolved.config;
        } else {
            curriculumConfig = await getCurriculumConfig(database, curriculumFromClassLabel(myClass));
        }

        // Report-card display settings (KCPE/positions/columns/change).
        const rcSettingsDoc = await database.collection('report_card_settings').findOne({}).catch(() => null);
        const rcSettings = {
            showKcpe: true, showPositions: true, showChange: false,
            ...(rcSettingsDoc || {}),
            columns: { point: true, grade: true, pos: true, remarks: true, initials: true, ...(rcSettingsDoc?.columns || {}) },
        };
        // Clean display label: avoid duplicating the stream when studentClass
        // already ends with it (e.g. "Form 1 East" + stream "East" → "Form 1 East").
        const classFull = (() => {
            const c = String(myClass).trim(); const s = String(myStream).trim();
            if (!s) return c;
            return c.toLowerCase().endsWith(s.toLowerCase()) ? c : `${c} ${s}`.trim();
        })();

        // Find the report-card generation for THIS student's class. The generation
        // pins the End Term (main) exam + optional internal assessments (Mid Term,
        // CAT…) that should appear as columns. We match by classId, or by class name.
        const norm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
        // (Yearly reports are separate documents — never a term card's exam set.)
        const generations = (await database.collection('report_card_generations').find({}).toArray().catch(() => [])).filter((g: any) => g.kind !== 'yearly');
        const sameClassGen = (g: any) =>
            (classId && String(g.classId) === classId) ||
            norm(g.className) === norm(myClass) ||
            norm(g.className) === norm(`${myClass} ${myStream}`) ||
            (g.mainExamId && String(g.mainExamId) === examId && (norm(myClass).includes(norm(g.className)) || norm(g.className).includes(norm(myClass))));
        // The generation for the exam that was OPENED wins. Only its own CATs / Mid Term are shown alongside —
        // a CAT that belongs to another term's generation of the same class must not leak into this card.
        // A Consolidated/Year Average exam has no class-term generation of its own — it isn't
        // a single sat exam, so skip generation matching for it entirely.
        const gen: any = isComputedExam ? null
            : generations.find((g: any) => String(g.mainExamId) === examId && sameClassGen(g))
                || generations.find((g: any) => String(g.mainExamId) === examId)
                || generations.find(sameClassGen);
        const genIsForOpenedExam = !!gen && String(gen.mainExamId) === examId;
        const mainEff = genIsForOpenedExam ? String(gen.mainExamId) : examId;   // the exam this card is built around

        // No class-level report-card generation exists for this term — that's fine:
        // the card still works straight off the opened exam's own published marks
        // (a generation only ever ADDS extra CAT/Mid Term columns alongside it; it
        // was never a precondition for printing the exam the admin already published).
        // Having no published marks at all for this student is checked below instead.

        const typeOf = (e: any): string => {
            const raw = String(e?.type || e?.examType || e?.category || e?.examName || e?.title || e?.name || '').trim();
            const t = norm(raw);
            if (/end\s*term|final/.test(t)) return 'END-TERM';
            // Otherwise keep the exam's own label (CAT 1 / CAT 2 / Mid Term / Mock …).
            return (raw || 'EXAM').toUpperCase().slice(0, 14);
        };
        // Column order: the main exam's column first, then END-TERM, then every other
        // exam label alphabetically (CAT 1, CAT 2, MID TERM, MOCK…). `mainType` is
        // assigned below (in each branch) before this is ever called.
        let mainTypeForOrder = '';
        const typeOrder = (ty: string) => ty === mainTypeForOrder ? 0 : ty === 'END-TERM' ? 1 : 2;

        let examIds: string[]; let examMeta: Record<string, any>; let mainType: string;
        let typeByExam: Record<string, string>; let examIdsByType: Record<string, string[]>;
        let examColumns: Array<{ type: string; title: string; examIds: string[] }>; let multiExam: boolean;
        let allMarks: any[]; let onlineExamDocs: any[];

        if (isComputedExam) {
            // Average the published marks of every source exam, then tag the merged rows
            // with THIS exam's own id — everything below (positions, change column,
            // teacher initials) reads marks by examId/typeByExam, so this one substitution
            // is all it takes for the rest of the card to work unchanged.
            const rawSource = await database.collection('exam_marks').find({ examId: { $in: sourceExamIds } }).toArray().catch(() => []);
            const publishedSource = await onlyPublished(database, rawSource);
            allMarks = averageAcrossSourceExams(publishedSource).map((m: any) => ({ ...m, examId: String(examId) }));
            onlineExamDocs = [];
            examMeta = {};
            examIds = [String(examId)];
            mainType = (exam?.examName || exam?.type || 'AVERAGE').toString().toUpperCase().slice(0, 14);
            mainTypeForOrder = mainType;
            typeByExam = { [String(examId)]: mainType };
            examIdsByType = { [mainType]: [String(examId)] };
            examColumns = [{ type: mainType, title: mainType, examIds: [String(examId)] }];
            multiExam = false;
        } else {
            // The exam set = the exam the user opened (always shown) + the generation's
            // main End Term + any additional internal assessments. The selected exam
            // comes first so its column leads. De-duplicated.
            examIds = [String(examId), ...(genIsForOpenedExam ? [String(gen.mainExamId || ''), ...((gen.additionalExamIds || []).map((x: any) => String(x)))] : [])]
                .filter((v, i, a) => v && a.indexOf(v) === i);
            const examOids = examIds.map(id => { try { return new ObjectId(id); } catch { return id as any; } });
            // Additional assessments may be regular exams OR online exams, so look in both
            // collections — otherwise online CAT/Mid Term docs are missed and their column
            // falls back to a generic "EXAM" title with no type.
            const [regularExamDocs, onlineDocs] = await Promise.all([
                database.collection('exams').find({ _id: { $in: examOids } }).toArray().catch(() => []),
                database.collection('online_exams').find({ _id: { $in: examOids } }).toArray().catch(() => []),
            ]);
            onlineExamDocs = onlineDocs;
            examMeta = {};
            [...regularExamDocs, ...onlineExamDocs].forEach((e: any) => { if (!examMeta[String(e._id)]) examMeta[String(e._id)] = e; });

            // Columns are grouped by assessment TYPE, not per exam. All CATs collapse
            // into one "CAT" column, all Mid Terms into "MIDTERM", the main into
            // "END-TERM". When several exams of the same type cover the same subject
            // (e.g. two online CATs), that subject's cell is the AVERAGE of them.
            // Each DISTINCT exam becomes its own column, labelled by its type/name
            // (e.g. "CAT 1", "CAT 2", "MID TERM", "END TERM") — so every exam picked for
            // this term that has marks shows as a separate column. Only the End-Term main
            // is normalised so the leading column reads "END-TERM".
            // The main exam defines the leading column's type.
            mainType = typeOf(examMeta[mainEff] || examMeta[examId]) || 'END-TERM';
            mainTypeForOrder = mainType;
            // Map each pinned examId → its type, and each type → the examIds under it.
            typeByExam = {};
            examIdsByType = {};
            examIds.forEach(id => {
                const ty = typeOf(examMeta[id]) || 'EXAM';
                typeByExam[id] = ty;
                (examIdsByType[ty] ||= []).push(id);
            });
            examColumns = Object.keys(examIdsByType)
                .sort((a, b) => typeOrder(a) - typeOrder(b) || a.localeCompare(b, undefined, { numeric: true }))
                .map(ty => ({ type: ty, title: ty, examIds: examIdsByType[ty] }));
            multiExam = examColumns.length > 1;

            // Marks across ALL exams in the set (for positions + per-student aggregate).
            // SNAPSHOT: if this generation froze its marks, render from the FROZEN copy so
            // the report card stays stable after generation — later exam_marks edits don't
            // change it until the class is regenerated. Otherwise read live.
            const frozen: any[] = Array.isArray(gen?.frozenMarks) ? gen.frozenMarks : [];
            allMarks = frozen.length
                ? frozen.filter((m: any) => examIds.includes(String(m.examId)))
                : await onlyPublished(database, await database.collection('exam_marks').find({ examId: { $in: examIds } }).toArray().catch(() => []));

            // Supplement with ONLINE-exam attempt scores for any online exams in the set
            // whose results haven't been published into exam_marks yet, so their CAT/Mid
            // Term columns still show real marks. Normalized to the exam_marks shape.
            const onlineIds = onlineExamDocs.map((e: any) => String(e._id));
            if (onlineIds.length) {
                const attempts = await database.collection('online_exam_attempts')
                    .find({ examId: { $in: onlineIds }, status: { $in: ['submitted', 'auto_submitted', 'marked', 'published'] } })
                    .toArray().catch(() => []);
                const onlineById: Record<string, any> = {}; onlineExamDocs.forEach((e: any) => onlineById[String(e._id)] = e);
                const haveInMarks = new Set(allMarks.map((m: any) => `${String(m.examId)}|${String(m.studentId)}`));
                attempts.forEach((a: any) => {
                    const key = `${String(a.examId)}|${String(a.studentId)}`;
                    if (haveInMarks.has(key)) return;   // already published to exam_marks
                    const ex = onlineById[String(a.examId)] || {};
                    const total = N(a.maxScore ?? a.totalMarks ?? ex.totalMarks ?? ex.maxScore ?? 100) || 100;
                    const score = N(a.finalScore ?? a.score ?? a.totalScore ?? 0);
                    allMarks.push({ examId: String(a.examId), studentId: String(a.studentId), subjectName: ex.subjectName || ex.subject || a.subjectName || 'Subject', marksObtained: score, totalMarks: total });
                });
            }
        }

        // Column visibility rule (airtight):
        //   • The MAIN column (the type of the opened/End-Term exam) ALWAYS shows.
        //   • Every OTHER column shows ONLY if at least one of its exams has marks for
        //     someone in the class. So an empty/phantom column (e.g. a stale pinned id
        //     that resolves to the generic "EXAM" and has no marks) is ALWAYS dropped.
        const mainColType = mainType;
        const anyMarkedExamIds = new Set(allMarks.map((m: any) => String(m.examId)));
        const columnHasMarks = (c: { examIds: string[] }) => c.examIds.some(id => anyMarkedExamIds.has(id));
        examColumns = examColumns.filter(c => c.type === mainColType || columnHasMarks(c));
        // Safety net: never show a bare "EXAM" fallback column that carries no marks.
        examColumns = examColumns.filter(c => c.type !== 'EXAM' || columnHasMarks(c));
        // Guarantee at least the main column survives.
        if (examColumns.length === 0) examColumns = [{ type: mainColType, title: mainColType, examIds: examIdsByType[mainColType] || [String(examId)] }];
        multiExam = examColumns.length > 1;

        // Per-student aggregate for POSITIONS. We rank against everyone who sat the
        // MAIN End-Term exam (that defines the level cohort), so positions are stable
        // regardless of which extra CAT/Mid Term columns this student happens to have.
        const students = await database.collection('students').find({}).toArray().catch(() => []);
        const sMeta: Record<string, any> = {}; students.forEach((s: any) => sMeta[String(s._id)] = s);
        // Marks used for ranking: the End-Term (main) exam across ALL students. If for
        // some reason that's empty, fall back to the full pinned exam set. A computed
        // exam's "main exam" marks ARE allMarks (already the whole cohort's average).
        const rankExamId = mainEff;
        const rankMarksMain = isComputedExam ? allMarks
            : await onlyPublished(database, await database.collection('exam_marks').find({ examId: rankExamId }).toArray().catch(() => []));
        const rankMarks = rankMarksMain.length ? rankMarksMain : allMarks;

        // Normalized class identity for a student AT THE TIME OF THIS EXAM — prefer each
        // mark's own classAtTime/classIdAtTime (stamped when it was saved) over the
        // student's live class, so the whole cohort is grouped by who they sat the exam
        // WITH, not who shares their class now. Without this, ranking a historical exam
        // after the class has since been promoted would scatter the real cohort across
        // "old class" (this student) vs "new class" (everyone already promoted).
        const classAtTimeByStudent: Record<string, { cid: string; name: string }> = {};
        rankMarks.forEach((m: any) => {
            const id = String(m.studentId);
            if (!classAtTimeByStudent[id] && (m.classAtTime || m.classIdAtTime)) {
                classAtTimeByStudent[id] = { cid: String(m.classIdAtTime || ''), name: norm(m.classAtTime || '') };
            }
        });
        const myClassId = classId;
        const classKeyOf = (id: string): { cid: string; name: string } => {
            const at = classAtTimeByStudent[id];
            if (at) return at;
            const meta = sMeta[id] || {};
            return { cid: String(meta.classId || ''), name: norm(meta.studentClass || meta.currentClass || meta.class || meta.className || '') };
        };
        // Class level (Form/Grade N) from any class label, e.g. "Form 4 West" → "form 4".
        const levelOfLabel = (s: string) => { const m = norm(s).match(/(form|grade)\s*\d+/); return m ? m[0] : norm(s); };
        // Stream label for a student AT THE TIME — from the classAtTime label when we
        // have one (e.g. "Form 3 East" -> "east"), else their current stream.
        const streamOf = (id: string): string => {
            const at = classAtTimeByStudent[id];
            if (at?.name) { const m = at.name.match(/(?:form|grade)\s*\d+\s+(.+)$/i); if (m) return norm(m[1]); }
            const meta = sMeta[id] || {};
            return norm(meta.stream || meta.streamName || '');
        };
        const myKey = { cid: myClassId, name: norm(myClass), level: levelOfLabel(myClass), stream: norm(myStream) };

        // Same CLASS LEVEL (all streams of Form 4): used for the LEVEL position.
        const sameClassLevel = (id: string) => {
            const k = classKeyOf(id);
            return levelOfLabel(k.name) === myKey.level && !!myKey.level;
        };
        // Same STREAM (exactly Form 4 West): used for CLASS position + subject position.
        const sameStream = (id: string) => {
            if (!sameClassLevel(id)) return false;
            // When we know the stream, match it; otherwise fall back to full class name.
            if (myKey.stream) return streamOf(id) === myKey.stream;
            const k = classKeyOf(id);
            return k.name === myKey.name;
        };

        const agg: Record<string, { total: number; points: number; n: number }> = {};
        const subjPctByStudent: Record<string, Record<string, { sum: number; n: number }>> = {};
        for (const m of rankMarks) {
            const id = String(m.studentId); const max = N(m.totalMarks) || 100; const pct = max > 0 ? (N(m.marksObtained) / max) * 100 : 0;
            const g = gradeOf(pct);
            (agg[id] ||= { total: 0, points: 0, n: 0 });
            agg[id].total += N(m.marksObtained); agg[id].points += g.points; agg[id].n += 1;
            const sub = m.subjectName || m.subject || 'Subject';
            ((subjPctByStudent[sub] ||= {})[id] ||= { sum: 0, n: 0 });
            subjPctByStudent[sub][id].sum += pct; subjPctByStudent[sub][id].n += 1;
        }
        // Aggregated per-subject ranking list (one entry per student, avg pct).
        const subjMarks: Record<string, Array<{ sid: string; pct: number }>> = {};
        for (const [sub, byStu] of Object.entries(subjPctByStudent)) {
            subjMarks[sub] = Object.entries(byStu).map(([id, v]) => ({ sid: id, pct: v.n ? v.sum / v.n : 0 }));
        }
        const rows = Object.entries(agg).map(([id, a]) => ({ id, ...a, mean: a.n ? a.total / a.n : 0, meanPoints: a.n ? a.points / a.n : 0 }));
        // LEVEL position = rank within the whole CLASS (all streams of Form 4) — NOT
        // the whole school. CLASS position = rank within the student's own STREAM.
        const levelmates = rows.filter(r => sameClassLevel(r.id));
        const levelSorted = [...levelmates].sort((x, y) => y.points - x.points);
        const levelPos = levelSorted.findIndex(r => r.id === sid) + 1;
        const streammates = rows.filter(r => sameStream(r.id));
        const classSorted = [...streammates].sort((x, y) => y.points - x.points);
        const classPos = classSorted.findIndex(r => r.id === sid) + 1;

        // Resolve the teacher who teaches each subject for THIS class, as initials
        // (e.g. "Muzamil Mohamed" → "M.M"). We try, in order: a class-specific
        // staff_subjects link, the subject's own teacherId, then a teacher whose
        // assigned subjects include this subject.
        const initialsOf = (name: string) => String(name || '')
            .trim().split(/\s+/).filter(Boolean).slice(0, 3)
            .map(w => w[0].toUpperCase()).join('.');
        const [staffList, subjectDefs, staffSubjectLinks] = await Promise.all([
            database.collection('staff').find({}).toArray().catch(() => []),
            database.collection('subjects').find({}).toArray().catch(() => []),
            database.collection('staff_subjects').find({}).toArray().catch(() => []),
        ]);
        const staffName = (s: any) => s?.employeeName || s?.name || `${s?.firstName || ''} ${s?.lastName || s?.surname || ''}`.trim();
        const staffById: Record<string, any> = {}; staffList.forEach((s: any) => { staffById[String(s._id)] = s; });
        const normSub = (v: any) => String(v || '').toLowerCase().trim();
        // subjectName → teacher name, preferring a link scoped to this class.
        const teacherForSubject = (subjectName: string): string => {
            const want = normSub(subjectName);
            // Find the subject definition(s) by name.
            const defs = subjectDefs.filter((d: any) => normSub(d.name || d.subjectName) === want);
            const defIds = new Set(defs.map((d: any) => String(d._id)));
            // 1) staff_subjects link for this subject + this class.
            const linkClass = staffSubjectLinks.find((l: any) =>
                (defIds.has(String(l.subjectId)) || normSub(l.subjectName) === want) &&
                (String(l.classId) === classId || normSub(l.className) === normSub(myClass)));
            if (linkClass) { const t = staffById[String(linkClass.teacherId || linkClass.staffId)]; if (t) return staffName(t); if (linkClass.teacherName) return linkClass.teacherName; }
            // 2) any staff_subjects link for this subject.
            const linkAny = staffSubjectLinks.find((l: any) => defIds.has(String(l.subjectId)) || normSub(l.subjectName) === want);
            if (linkAny) { const t = staffById[String(linkAny.teacherId || linkAny.staffId)]; if (t) return staffName(t); if (linkAny.teacherName) return linkAny.teacherName; }
            // 3) the subject definition's own teacherId.
            const defWithTeacher = defs.find((d: any) => d.teacherId);
            if (defWithTeacher) { const t = staffById[String(defWithTeacher.teacherId)]; if (t) return staffName(t); }
            // 4) a teacher whose assigned subjects include this subject.
            const t = staffList.find((s: any) => (s.subjects || s.assignedSubjects || []).some((x: any) => {
                const id = typeof x === 'object' ? String(x.subjectId || x._id || x.id) : String(x);
                return defIds.has(id) || normSub(typeof x === 'object' ? (x.name || x.subjectName) : x) === want;
            }));
            return t ? staffName(t) : '';
        };

        // Subject rows for THIS student, with a column per exam in the set and an
        // AGGREGATE (average of the per-exam percentages). Group this student's marks
        // by subject, then per exam.
        let mine = allMarks.filter((m: any) => String(m.studentId) === sid);
        // Safety net: if the exam set yielded NO marks for this student (e.g. the
        // generation pinned an exam the student wasn't marked in), fall back to ALL
        // of this student's marks for the SAME TERM as the selected exam, so the card
        // shows results instead of an empty table.
        if (mine.length === 0) {
            const selExam: any = exam || examMeta[examId];
            const term = String(selExam?.term || '').toLowerCase();
            const studentMarks = await onlyPublished(database, await database.collection('exam_marks').find({ studentId: sid }).toArray().catch(() => []));
            const examsAll = await database.collection('exams').find({}).toArray().catch(() => []);
            const eById: Record<string, any> = {}; examsAll.forEach((e: any) => eById[String(e._id)] = e);
            const termMarks = studentMarks.filter((m: any) => {
                const e = eById[String(m.examId)];
                return term ? String(e?.term || '').toLowerCase() === term : true;
            });
            if (termMarks.length) {
                mine = termMarks;
                // Rebuild TYPE columns from the exams actually present in the fallback marks.
                const byType: Record<string, string[]> = {};
                termMarks.forEach((m: any) => {
                    const ty = typeOf(eById[String(m.examId)]) || 'EXAM';
                    typeByExam[String(m.examId)] = ty;
                    (byType[ty] ||= []).push(String(m.examId));
                });
                examColumns = Object.keys(byType)
                    .sort((a, b) => typeOrder(a) - typeOrder(b) || a.localeCompare(b))
                    .map(ty => ({ type: ty, title: ty, examIds: Array.from(new Set(byType[ty])) }));
            }
        }
        // Group this student's marks by subject, then by assessment TYPE. A subject
        // may have several exams of the same type (e.g. two CATs) — keep them all so
        // the cell can average them.
        const bySubject: Record<string, Record<string, any[]>> = {};
        for (const m of mine) {
            const sub = m.subjectName || m.subject || 'Subject';
            const ty = typeByExam[String(m.examId)] || typeOf(examMeta[String(m.examId)]) || 'EXAM';
            ((bySubject[sub] ||= {})[ty] ||= []).push(m);
        }
        // ── "Change" column: this student's subject % vs the PREVIOUS exam ──────────
        // Find the exam chronologically before the main exam, then this student's
        // per-subject % in it, so we can show improvement/drop per subject.
        // Always compute the change data (cheap) so the "Change" column has values
        // the moment the setting is toggled on — no report re-fetch needed.
        let prevPctBySubject: Record<string, number> = {};
        {
            // Pull the student's marks across BOTH regular and online exams so a prior
            // online CAT/Mid Term also counts as "the previous exam done".
            const examsAll2 = await database.collection('exams').find({}).toArray().catch(() => []);
            const onlineAll2 = await database.collection('online_exams').find({}).toArray().catch(() => []);
            const eById2: Record<string, any> = {};
            [...examsAll2, ...onlineAll2].forEach((e: any) => { if (!eById2[String(e._id)]) eById2[String(e._id)] = e; });
            const [regMarks, onlineAttempts] = await Promise.all([
                database.collection('exam_marks').find({ studentId: sid }).toArray().catch(() => []).then(m => onlyPublished(database, m)),
                database.collection('online_exam_attempts')
                    .find({ studentId: sid, status: { $in: ['submitted', 'auto_submitted', 'marked', 'published'] } })
                    .toArray().catch(() => []),
            ]);
            // De-dupe: skip online attempts whose results are already in exam_marks.
            const inRegMarks = new Set(regMarks.map((m: any) => `${String(m.examId)}|${String(sid)}`));
            const allStudentMarks: any[] = [...regMarks, ...onlineAttempts
                .filter((a: any) => !inRegMarks.has(`${String(a.examId)}|${String(sid)}`))
                .map((a: any) => {
                    const ex = eById2[String(a.examId)] || {};
                    return {
                        examId: a.examId,
                        subjectName: ex.subjectName || ex.subject || a.subjectName || 'Subject',
                        marksObtained: N(a.finalScore ?? a.score ?? a.totalScore ?? 0),
                        totalMarks: N(a.maxScore ?? a.totalMarks ?? ex.totalMarks ?? ex.maxScore ?? 100) || 100,
                    };
                })];
            const yOf = (e: any) => N(e?.academicYear ?? e?.year);
            const tOf = (e: any) => N(String(e?.term || '').match(/\d+/)?.[0] || 0);
            // A finer chronological key: year, term, then creation time — so the
            // "previous" exam can be an EARLIER exam in the SAME term (e.g. a CAT or
            // Mid Term before the End Term), not only a previous term.
            const timeOf = (e: any) => { const d = new Date(e?.createdAt || e?.startDate || e?.date || 0).getTime(); return isNaN(d) ? 0 : d; };
            const orderKey = (e: any) => yOf(e) * 1e15 + tOf(e) * 1e13 + timeOf(e);
            const mainE = examMeta[mainEff] || exam;
            const mainOrder = orderKey(mainE);
            const mainExamId = mainEff;   // never compare an exam to itself
            const cardExamIds = new Set(examIds.map(String));      // exams shown ON this card
            // Every one of the student's marks whose exam sorts BEFORE the main exam
            // (and isn't the main exam itself) is a candidate "previous exam".
            const priorMarks = allStudentMarks
                .map((m: any) => ({ m, e: eById2[String(m.examId)] }))
                .filter((x: any) => x.e && String(x.m.examId) !== mainExamId && orderKey(x.e) < mainOrder);
            // Two-tier per subject: PREFER the latest prior exam that is NOT on this card
            // (a genuine earlier term/CAT), so we don't compare the term's aggregate to a
            // component of itself. If none exists (e.g. a first-term report), FALL BACK to
            // the latest earlier assessment on the card (Mid Term / CAT before the End
            // Term) so the Change column is still meaningful.
            const offCard: Record<string, { key: number; pct: number }> = {};
            const onCard: Record<string, { key: number; pct: number }> = {};
            priorMarks.forEach(({ m, e }: any) => {
                const sub = norm(m.subjectName || m.subject || 'Subject'); const key = orderKey(e);
                const max = N(m.totalMarks) || 100; const pct = max > 0 ? (N(m.marksObtained) / max) * 100 : 0;
                const bucket = cardExamIds.has(String(m.examId)) ? onCard : offCard;
                if (!bucket[sub] || key > bucket[sub].key) bucket[sub] = { key, pct };
            });
            const subjectsSeen = new Set([...Object.keys(offCard), ...Object.keys(onCard)]);
            subjectsSeen.forEach((sub) => {
                const pick = offCard[sub] || onCard[sub];   // off-card wins; on-card is the fallback
                if (pick) prevPctBySubject[sub] = pick.pct;
            });
        }

        let totalMarks = 0, totalPoints = 0;
        const subjects = Object.entries(bySubject).map(([sub, byType]) => {
            // One cell per TYPE column. Show the mark over its REAL out-of (a CAT
            // out of /20 shows "17/20", not "85/100"). When a subject has several
            // exams of the SAME type: if they share the out-of, sum the raw marks;
            // otherwise fall back to the averaged percentage out of 100. The `pct`
            // is always the % (used for grading/aggregate).
            const cells = examColumns.map(col => {
                const ms = byType[col.type] || [];
                if (!ms.length) return { mark: null as number | null, outOf: 100, pct: null as number | null, grade: '' };
                const rows = ms.map((m: any) => ({ obtained: N(m.marksObtained), outOf: N(m.totalMarks) || 100 }));
                const avgPct = rows.reduce((a, r) => a + (r.outOf > 0 ? (r.obtained / r.outOf) * 100 : 0), 0) / rows.length;
                // Per-cell grade from the class's resolved template (letters / EE-ME / EE1…).
                const cellGrade = gradeOf(avgPct).grade;
                const sameOutOf = rows.every(r => r.outOf === rows[0].outOf);
                if (sameOutOf) {
                    // Real out-of preserved (e.g. 17/20, or the sum across two /20 CATs → /40).
                    const totalObtained = rows.reduce((a, r) => a + r.obtained, 0);
                    const totalOutOf = rows.reduce((a, r) => a + r.outOf, 0);
                    return { mark: Math.round(totalObtained), outOf: Math.round(totalOutOf), pct: avgPct, grade: cellGrade };
                }
                // Mixed maxima → normalise to a percentage.
                return { mark: Math.round(avgPct), outOf: 100, pct: avgPct, grade: cellGrade };
            });
            // Aggregate = average of available exam percentages → a 0-100 score.
            const present = cells.filter(c => c.pct !== null) as Array<{ mark: number; outOf: number; pct: number }>;
            const aggPct = present.length ? present.reduce((a, c) => a + c.pct, 0) / present.length : 0;
            const g = gradeOf(aggPct);
            const aggMark = Math.round(aggPct);     // aggregate expressed out of 100
            totalMarks += aggMark; totalPoints += g.points;
            // Subject position ranks the student within their STREAM.
            const list = (subjMarks[sub] || []).filter(x => sameStream(x.sid)).sort((a, b) => b.pct - a.pct);
            const pos = list.findIndex(x => x.sid === sid) + 1;
            const tName = teacherForSubject(sub);
            const initials = initialsOf(tName);
            // Change vs the previous exam (percentage points, rounded). null when no
            // prior exam exists for this subject. We measure the MAIN (End-Term) exam's
            // % against the previous exam's % — a clean exam-over-exam comparison — and
            // fall back to the term aggregate only if the main column has no mark.
            // Always computed; the frontend shows the column only when the setting is on.
            const prevPct = prevPctBySubject[norm(sub)];
            const mainCellPct = (cells[0]?.pct != null) ? cells[0].pct : aggPct;   // cells[0] is the main/End-Term column
            const change = (prevPct !== undefined && prevPct !== null) ? Math.round(mainCellPct - prevPct) : null;
            return {
                subject: sub,
                cells,                                  // per-exam columns
                mark: aggMark, outOf: 100, total: aggMark,   // aggregate (back-compat fields)
                point: g.points, grade: g.grade, position: `${pos}/${list.length}`, remark: g.remark, initials,
                change,
            };
        });
        const subjN = subjects.length || 1;
        const meanScore = RND(totalMarks / subjN, 1);
        const meanPoint = RND(totalPoints / subjN, 1);
        // Columns may have changed via the fallback above — recompute multiExam.
        multiExam = examColumns.length > 1;

        // KCPE / value added.
        const kcpeMarks = N(student.kcpeMarks ?? student.kcpe);
        const kcpeMean = N(profile.kcpeMean) || 0;
        const valueAdded = kcpeMean ? RND(meanPoint - (kcpeMean / 100 * 12), 1) : null;

        // Historical grid: from this student's exam_marks across exams → Form×Term MP/MG/POS.
        const myAll = await onlyPublished(database, await database.collection('exam_marks').find({ studentId: sid }).toArray().catch(() => []));
        const exams = await database.collection('exams').find({}).toArray().catch(() => []);
        const examById: Record<string, any> = {}; exams.forEach((e: any) => examById[String(e._id)] = e);
        // Level system comes from the resolved curriculum (Form/Grade/Year), not a
        // string guess — CBC → Grade, 8-4-4 → Form, Cambridge → Year. Used only as a
        // fallback below — each historical column instead uses the word actually
        // saved on its own exam_marks.classAtTime, so a school that renamed its
        // classes (e.g. Form → Grade) still shows each old term under the name it
        // was really sat under, instead of relabelling history with today's system.
        const levelPrefix = curriculumConfig.levelPrefix || 'Form';
        const levelSys = { prefix: levelPrefix, short: levelPrefix.charAt(0).toUpperCase() };
        // The level-system word as saved on a class label itself (e.g. "Form 4 East" →
        // "Form", "Grade 11 East" → "Grade") — falls back to the curriculum's own word
        // when the label doesn't carry one (e.g. a bare class name).
        const prefixWordOf = (cls: string): string => {
            const m = String(cls || '').match(/form|grade|pp|class|year/i);
            return m ? m[0].charAt(0).toUpperCase() + m[0].slice(1).toLowerCase() : levelPrefix;
        };

        const histAgg: Record<string, { sum: number; pts: number; n: number; cls: string; year: number; term: number }> = {};
        for (const m of myAll) {
            const e = examById[String(m.examId)]; if (!e) continue;
            const max = N(m.totalMarks) || 100; const pct = max > 0 ? (N(m.marksObtained) / max) * 100 : 0;
            const key = String(m.examId);
            (histAgg[key] ||= { sum: 0, pts: 0, n: 0, cls: m.classAtTime || myClass || '', year: N(e.academicYear ?? e.year), term: N(String(e.term || '').match(/\d+/)?.[0] || 0) });
            histAgg[key].sum += pct; histAgg[key].pts += gradeOf(pct).points; histAgg[key].n += 1;
        }
        // Build the grid + chart from the (level, term) combos that ACTUALLY have
        // data, so only filled cells/bars are shown — and report which levels &
        // terms exist so the frontend renders just those columns.
        const grid: Record<string, { mp: number; mg: string }> = {};
        const chart: Array<{ label: string; value: number }> = [];
        const levelsSet = new Set<number>(); const termsSet = new Set<number>();
        const levelLabels: Record<number, string> = {};
        for (const v of Object.values(histAgg)) {
            if (!v.n) continue;
            const lvlMatch = String(v.cls).match(/(\d+)/); const lvl = lvlMatch ? Number(lvlMatch[1]) : 0;
            if (lvl < 1 || v.term < 1) continue;
            const mp = RND(v.pts / v.n, 0);
            const ownPrefix = prefixWordOf(v.cls);
            grid[`l${lvl}t${v.term}`] = { mp, mg: meanGrade(v.pts / v.n) };
            chart.push({ label: `${ownPrefix.charAt(0)}${lvl}T${v.term}`, value: mp });
            levelsSet.add(lvl); termsSet.add(v.term);
            levelLabels[lvl] = ownPrefix;   // the word THIS level was actually saved under
        }
        const levels = Array.from(levelsSet).sort((a, b) => a - b);
        const terms = Array.from(termsSet).sort((a, b) => a - b);
        chart.sort((a, b) => a.label.localeCompare(b.label));

        // ── "Next Term Begins On" ────────────────────────────────────────────────
        // Show the start date of the term AFTER this exam's term, taken from the
        // academic calendar (terms collection). The next term is: same year with
        // termNumber+1, or — when this is the last term of the year — term 1 of the
        // next academic year. If no such term is defined (or it has no start date),
        // show "Not set". A manual override on the school profile still wins.
        let nextTermBegins = String(profile.nextTermBegins || '').trim();
        if (!nextTermBegins) {
            const curTermNo = N(String(exam?.term || '').match(/\d+/)?.[0] || 0);
            const curYear = N(exam?.academicYear ?? exam?.year ?? 0);
            if (curTermNo > 0) {
                const allTerms = await database.collection('terms').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
                const termsByYear = allTerms.map((t: any) => ({
                    year: N(t.academicYear ?? t.year ?? 0),
                    num: N(t.termNumber ?? String(t.name || '').match(/\d+/)?.[0] ?? 0),
                    startDate: t.startDate,
                }));
                // Prefer next term in the same year; else the earliest term of the next year.
                let next = termsByYear.find(t => t.year === curYear && t.num === curTermNo + 1);
                if (!next) {
                    next = termsByYear
                        .filter(t => t.year === curYear + 1 && t.num > 0)
                        .sort((a, b) => a.num - b.num)[0];
                }
                if (next?.startDate) {
                    const d = new Date(next.startDate);
                    if (!isNaN(d.getTime())) {
                        nextTermBegins = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                    }
                }
            }
        }
        if (!nextTermBegins) nextTermBegins = 'Not set';

        res.json({
            school: { name: profile.name || profile.schoolName || '', box: profile.poBox || profile.address || '', tel: profile.phone || profile.tel || '', motto: profile.motto || '', logo: profile.logo || '' },
            curriculum: curriculumConfig.name,
            // Curriculum-aware rendering: the frontend uses these to pick the CBC vs
            // 8-4-4 layout and terminology — resolved server-side from the class.
            curriculumCode: curriculumConfig.code,
            curriculumMode: curriculumConfig.assessmentMode,          // 'traditional' | 'competency'
            reportLayout: curriculumConfig.reportLayout,               // '844' | 'cbc' | 'cambridge'
            terminology: curriculumConfig.terminology,
            performanceLevels: curriculumConfig.performanceLevels || null,
            settings: rcSettings,   // report-card display settings (KCPE/positions/columns/change)
            issueDate: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            termYear: `${exam?.academicYear ?? exam?.year ?? ''} ${exam?.term ?? ''}`.trim(),
            examTitle: formatExamName(examMeta[mainEff] || exam, classFull),
            examColumns,            // [{ examId, title }] — one per exam in the set
            multiExam,              // true when >1 exam (show columns + aggregate)
            student: { name: student.studentName || student.name, adm: student.registrationNo || student.admNo || student.admissionNo, className: classFull, house: student.house || '', photo: student.photo || student.image || '' },
            summary: { totalMarks: `${RND(totalMarks)}/${subjN * 100}`, meanScore, totalPoints, meanPoint, meanGrade: meanGrade(meanPoint), classPos: `${classPos}/${streammates.length}`, levelPos: `${levelPos}/${levelmates.length}` },
            kcpe: { marks: kcpeMarks || '-', rank: student.kcpeRank || '-', mean: kcpeMean || '-', valueAdded: valueAdded ?? '-' },
            subjects,
            chart,
            history: grid,
            levelSystem: levelSys.prefix,    // "Form" | "Grade" — fallback when a level has no saved label
            levelLabels,                     // { 4: "Form", 11: "Grade" } — the word each level was actually saved under
            levels,                          // e.g. [3, 4] — only those with data
            terms,                           // e.g. [2, 3] — only those with data
            comments: { classTeacher: '', principal: '', principalName: profile.principalName || '' },
            nextTermBegins,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
};
router.get(['/reports/scholar-sheet/:studentId', '/reports/kithimani-card/:studentId'], scholarSheetHandler);

/** The ScholarSheet payload for one learner and exam (used by the student & parent portals). */
export function scholarSheetData(req: Request, studentId: string, examId: string): Promise<{ status: number; body: any }> {
    return new Promise(resolve => {
        const r: any = Object.create(req);
        r.params = { ...(req.params || {}), studentId };
        r.query = { ...(req.query || {}), examId };
        const out: any = {
            statusCode: 200,
            status(c: number) { this.statusCode = c; return this; },
            json(body: any) { resolve({ status: this.statusCode, body }); return this; },
        };
        scholarSheetHandler(r, out).catch((e: any) => resolve({ status: 500, body: { message: e?.message } }));
    });
}

/** Report Card Settings (columns shown on the ScholarSheet). */
export async function reportCardSettings(db: Db) {
    return mergeRcSettings(await db.collection('report_card_settings').findOne({}).catch(() => null));
}

// Academic History — the classes a student has been in (current + previous after
// promotion) and the exams sat in each, so the profile can list each class's
// ScholarSheets. Built from exam_marks.classAtTime + the student's classHistory.
router.get('/reports/student-academic-history/:studentId', async (req: Request, res: Response) => {
    try {
        const database = getRequestDb(req);
        const sid = req.params.studentId;
        const student: any = await database.collection('students').findOne({ _id: new ObjectId(sid) }).catch(() => null);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const currentClass = student.studentClass || student.currentClass || '';

        const [marks, exams] = await Promise.all([
            database.collection('exam_marks').find({ studentId: sid }).toArray().catch(() => []).then(m => onlyPublished(database, m)),
            database.collection('exams').find({}).toArray().catch(() => []),
        ]);
        const examById: Record<string, any> = {}; exams.forEach((e: any) => examById[String(e._id)] = e);

        // Group marks by the class held at the time, then by exam within that class.
        const byClass: Record<string, { className: string; exams: Record<string, { examId: string; name: string; term: string; year: string; n: number }> }> = {};
        for (const m of marks) {
            const cls = m.classAtTime || currentClass || 'Unknown';
            const grp = (byClass[cls] ||= { className: cls, exams: {} });
            const eid = String(m.examId); const e = examById[eid] || {};
            (grp.exams[eid] ||= { examId: eid, name: e.examName || e.name || 'Exam', term: e.term || '', year: String(e.academicYear ?? e.year ?? ''), n: 0 }).n++;
        }
        // Order: previous classes first (from classHistory), current class last.
        const histOrder: string[] = Array.isArray(student.classHistory) ? student.classHistory.map((h: any) => h.className).filter(Boolean) : [];
        const classes = Object.values(byClass).map(c => ({
            className: c.className,
            isCurrent: c.className === currentClass,
            exams: Object.values(c.exams).sort((a, b) => `${a.year}${a.term}`.localeCompare(`${b.year}${b.term}`)),
        })).sort((a, b) => {
            if (a.isCurrent) return 1; if (b.isCurrent) return -1;
            return histOrder.indexOf(a.className) - histOrder.indexOf(b.className);
        });

        res.json({
            student: { name: student.studentName || student.name, adm: student.registrationNo || student.admNo, currentClass },
            classes,
            classHistory: Array.isArray(student.classHistory) ? student.classHistory : [],
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Student academic + fees history, grouped by each class the student was in.
// Uses classAtTime stamped on exam_marks / invoices (falls back to the student's
// current class for legacy records that weren't stamped).
router.get('/reports/student-history/:studentId', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const sid = req.params.studentId;
        const student = await db.collection('students').findOne({ _id: new ObjectId(sid) }).catch(() => null);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const fallbackClass = student.studentClass || student.className || student.currentClass || 'Class';

        const [marks, invoices, payments, exams] = await Promise.all([
            db.collection('exam_marks').find({ studentId: sid }).toArray().catch(() => []).then(m => onlyPublished(db, m)),
            db.collection('invoices').find({ $or: [{ student_id: sid }, { studentId: sid }] }).toArray().catch(() => []),
            db.collection('payments').find({ $or: [{ student_id: sid }, { studentId: sid }], is_voided: { $ne: true } }).toArray().catch(() => []),
            db.collection('exams').find({}).toArray().catch(() => []),
        ]);
        const examName: Record<string, string> = {};
        exams.forEach((e: any) => { examName[String(e._id)] = e.examName || e.name || 'Exam'; });

        // Group everything by the class the record belongs to.
        const groups: Record<string, any> = {};
        const g = (cls: string) => (groups[cls] ||= { class: cls, exams: {}, invoiced: 0, paid: 0, balance: 0, invoices: 0 });

        // Exam marks → per class → per exam mean.
        const examAgg: Record<string, Record<string, { sum: number; n: number }>> = {};
        marks.forEach((m: any) => {
            const cls = m.classAtTime || fallbackClass;
            const k = String(m.examId);
            (examAgg[cls] ||= {}); (examAgg[cls][k] ||= { sum: 0, n: 0 });
            const max = Number(m.totalMarks) || 100;
            examAgg[cls][k].sum += max > 0 ? (Number(m.marksObtained ?? 0) / max) * 100 : 0;
            examAgg[cls][k].n++;
        });
        Object.entries(examAgg).forEach(([cls, byExam]) => {
            const grp = g(cls);
            grp.exams = Object.entries(byExam).map(([eid, v]) => ({ exam: examName[eid] || 'Exam', mean: Math.round(v.sum / v.n), subjects: v.n }));
        });

        // Invoices + payments → per class fee totals.
        invoices.forEach((inv: any) => {
            const grp = g(inv.classAtTime || inv.className || fallbackClass);
            grp.invoiced += Number(inv.total_due ?? inv.total ?? 0);
            grp.paid += Number(inv.amount_paid ?? 0);
            grp.balance += Number(inv.balance ?? 0);
            grp.invoices++;
        });
        // Payments not tied to a stamped invoice still count toward the fallback class total.
        const paidTotal = payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
        const stampedPaid = Object.values(groups).reduce((s: number, x: any) => s + x.paid, 0);
        if (paidTotal > stampedPaid) g(fallbackClass).paid += (paidTotal - stampedPaid);

        const history = Object.values(groups).sort((a: any, b: any) => String(a.class).localeCompare(String(b.class)));
        res.json({
            student: { id: String(student._id), name: student.studentName || student.name || '', admNo: student.admNo || student.registrationNo || '', currentClass: fallbackClass },
            history,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Merged Income & Expense rows (the old report read an empty `transactions`
// collection). Combines manual income, expenses, and fee payments into one ledger.
router.get('/reports/income-expense-rows', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const [income, expenses, payments] = await Promise.all([
            db.collection('income').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db.collection('expenses').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db.collection('payments').find({ is_voided: { $ne: true } }).toArray().catch(() => []),
        ]);
        const rows = [
            ...income.map((i: any) => ({ date: i.date || i.createdAt, type: 'Income', category: i.category || i.source || 'Income', description: i.title || i.description || '', amount: Number(i.amount ?? i.total ?? 0) })),
            ...payments.map((p: any) => ({ date: p.payment_date || p.createdAt, type: 'Income', category: 'Fees', description: `Fee payment ${p.receipt_no || ''}${p.studentName ? ' — ' + p.studentName : ''}`.trim(), amount: Number(p.amount ?? 0) })),
            ...expenses.map((e: any) => ({ date: e.date || e.createdAt, type: 'Expense', category: e.category || 'Expense', description: e.title || e.description || '', amount: Number(e.totalAmount ?? e.amount ?? 0) })),
        ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Outstanding balances with the student name resolved (invoices store student_id,
// not studentName) — that's why the report showed "—".
router.get('/reports/outstanding-balances-rows', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const invoices = await db.collection('invoices').find({}).sort({ createdAt: -1 }).limit(2000).toArray().catch(() => []);
        const studentIds = Array.from(new Set(invoices.map((i: any) => String(i.student_id || i.studentId || '')).filter(Boolean)));
        const students = studentIds.length
            ? await db.collection('students').find({ _id: { $in: studentIds.map(id => { try { return new ObjectId(id); } catch { return id as any; } }) } }).toArray().catch(() => [])
            : [];
        const byId: Record<string, any> = {};
        students.forEach((s: any) => { byId[String(s._id)] = s; });
        const rows = invoices.map((i: any) => {
            const s = byId[String(i.student_id || i.studentId)] || {};
            return {
                studentName: i.studentName || s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || '—',
                className: s.studentClass || s.className || s.currentClass || i.className || '—',
                invoiceNo: i.number || i.invoice_no || String(i._id).slice(-6),
                balance: Number(i.balance ?? ((i.total_due ?? i.total ?? 0) - (i.amount_paid ?? 0))),
                status: i.status || 'UNPAID',
            };
        });
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// 1. GET /api/v1/reports/report-cards
router.get('/reports/report-cards', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { class_id, exam_id, term, year, student_id } = req.query;

        const query: any = {};
        // The class dropdown sends the class NAME (e.g. "FORM 1 East"); students may
        // store it under any of these fields, so match broadly.
        if (class_id) query.$or = [
            { studentClass: class_id }, { className: class_id }, { currentClass: class_id }, { classId: class_id },
        ];
        if (student_id) query._id = new ObjectId(student_id as string);

        const currentPeriodObj = await db.collection('periods').findOne({ isCurrent: true });
        const activeTerm = term || currentPeriodObj?.label || "Term 2";
        const activeYear = year || currentPeriodObj?.academicYear || new Date().getFullYear();

        const students = await db.collection('students').find(query).toArray();

        // `exam_id` may be a single id or a comma-separated list (annual report = the
        // selected exams combined). Marks live in `exam_marks`
        // (fields: studentId, subjectId, subjectName, examId, marksObtained, totalMarks).
        const examIds: string[] = String(exam_id || '').split(',').map(s => s.trim()).filter(Boolean);
        const marks = examIds.length
            ? await onlyPublished(db, await db.collection('exam_marks').find({ examId: { $in: examIds } }).toArray())
            : [];
        const examDocs = examIds.length
            ? await db.collection('exams').find({ _id: { $in: examIds.map(id => { try { return new ObjectId(id); } catch { return id as any; } }) } }).toArray()
            : [];
        const allSubjects = await db.collection('subjects').find({}).toArray();
        // Subjects assigned to each class (class.subjects = [{subjectId, subjectName}]).
        // This is the authoritative per-class subject list — report cards must show
        // ONLY these, never the whole subjects collection.
        const classDocs = await db.collection('classes').find({}).toArray().catch(() => []);
        const classSubjectsByName: Record<string, { name: string; id: string }[]> = {};
        const classSubjectsById: Record<string, { name: string; id: string }[]> = {};
        for (const c of classDocs) {
            const list = Array.isArray(c.subjects)
                ? c.subjects.map((s: any) => ({ name: s.subjectName || s.name || '', id: String(s.subjectId || s._id || '') })).filter((s: any) => s.name)
                : [];
            const nameKey = String(c.name || c.levelName || c.className || '').toLowerCase().trim();
            if (nameKey) classSubjectsByName[nameKey] = list;
            classSubjectsById[String(c._id)] = list;
        }
        const examName = examDocs.map((e: any) => e.examName || e.name).filter(Boolean).join(' + ') || '—';

        // ── Performance trend (F1T1, F1T2, … up to the selected exam) ──────────────
        // Build a compact label for an exam from the student's level + the exam term.
        const allExams = await db.collection('exams').find({}).toArray().catch(() => []);
        const examById: Record<string, any> = {};
        allExams.forEach((e: any) => { examById[String(e._id)] = e; });
        // Chronological order of exams: by year then term number then start date.
        const termNum = (s: string) => { const m = String(s || '').match(/(\d+)/); return m ? Number(m[1]) : (/first/i.test(s) ? 1 : /second/i.test(s) ? 2 : /third/i.test(s) ? 3 : 99); };
        const examOrder = (e: any) => `${String(e.academicYear || '').padStart(4, '0')}-${String(termNum(e.term)).padStart(2, '0')}-${e.startDate ? new Date(e.startDate).getTime() : 0}`;
        // Parse a class name into a { prefix:'F'|'G'|'P'|'C', num } so we can shift
        // the level back to the form/grade the student was in at an earlier year.
        const parseLevel = (className: string): { prefix: string; num: number } | null => {
            const c = String(className || '');
            const f = c.match(/form\s*(\d+)/i); if (f) return { prefix: 'F', num: Number(f[1]) };
            const g = c.match(/grade\s*(\d+)/i); if (g) return { prefix: 'G', num: Number(g[1]) };
            const pp = c.match(/pp\s*(\d+)/i); if (pp) return { prefix: 'P', num: Number(pp[1]) };
            const cl = c.match(/class\s*(\d+)/i); if (cl) return { prefix: 'C', num: Number(cl[1]) };
            const any = c.match(/([a-z])\D*(\d+)/i); if (any) return { prefix: any[1].toUpperCase(), num: Number(any[2]) };
            return null;
        };
        // The level at a given exam year: shift the CURRENT level back by the number
        // of years between the current year and the exam year (one level per year).
        // e.g. Form 4 in 2026, exam in 2023 → Form 1. Clamps at 1.
        // Direct label from an exact class name (used when classAtTime is recorded).
        const levelLabelDirect = (className: string): string => {
            const lv = parseLevel(className);
            return lv ? `${lv.prefix}${lv.num}` : (String(className || '').slice(0, 4) || '—');
        };
        const currentYearNum = Number(activeYear) || new Date().getFullYear();
        const levelAtYear = (currentClassName: string, examYear: any): string => {
            const lv = parseLevel(currentClassName);
            const ey = Number(examYear);
            if (!lv) return String(currentClassName || '').slice(0, 4) || '—';
            if (!ey || !currentYearNum) return `${lv.prefix}${lv.num}`;
            const shifted = Math.max(1, lv.num - (currentYearNum - ey));
            return `${lv.prefix}${shifted}`;
        };
        // The cutoff: latest selected exam (so the trend runs "up to the current exam").
        const selectedOrders = examIds.map(id => examById[id]).filter(Boolean).map(examOrder).sort();
        const cutoff = selectedOrders.length ? selectedOrders[selectedOrders.length - 1] : '￿';
        // All marks for the students in this report (for the trend), keyed by student+exam.
        const sIds = students.map((s: any) => s._id.toString());
        const allMarksForTrend = await onlyPublished(db, await db.collection('exam_marks').find({ studentId: { $in: sIds } }).toArray().catch(() => []));
        const isAnnual = examIds.length > 1;

        // ── Real attendance (student_attendance) summarised per student ──────────────
        const studentIdStrs = students.map((s: any) => s._id.toString());
        const attRecords = studentIdStrs.length
            ? await db.collection('student_attendance').find({ studentId: { $in: studentIdStrs } }).toArray().catch(() => [])
            : [];
        const attBy: Record<string, { present: number; total: number }> = {};
        for (const a of attRecords) {
            const k = String(a.studentId);
            const rec = attBy[k] || (attBy[k] = { present: 0, total: 0 });
            rec.total++;
            if (/present|late/i.test(String(a.status || ''))) rec.present++;
        }

        // ── Personality profile (behaviour_ratings + behaviour_traits) ──────────────
        const traits = await db.collection('behaviour_traits').find({}).sort({ order: 1 }).toArray().catch(() => []);
        const traitName: Record<string, string> = {};
        traits.forEach((t: any) => { traitName[t._id.toString()] = t.name; });
        const ratings = await db.collection('behaviour_ratings').find({}).toArray().catch(() => []);
        const ratingGrade: Record<number, string> = { 5: 'A+', 4: 'A', 3: 'B+', 2: 'C', 1: 'D' };
        const personalityBy: Record<string, { trait: string; grade: string }[]> = {};
        for (const r of ratings) {
            const k = String(r.student_id);
            const name = traitName[String(r.trait_id)];
            if (!name) continue;
            (personalityBy[k] = personalityBy[k] || []).push({
                trait: name,
                grade: r.grade || ratingGrade[Number(r.rating)] || String(r.rating ?? '-'),
            });
        }

        // Each student's subjects are graded with their CLASS's configured grading.
        const gradingFor = makeGradingCache(db);
        const gradingByStudent: Record<string, Awaited<ReturnType<typeof resolveGrading>>> = {};
        for (const st of students as any[]) {
            gradingByStudent[st._id.toString()] = await gradingFor(st.classId ? String(st.classId) : undefined, st.studentClass || st.className || st.currentClass || undefined);
        }

        const reportCards = students.map((student: any) => {
            const sid = student._id.toString();
            const studentMarks = marks.filter((m: any) =>
                String(m.studentId) === sid || m.studentId === student.admNo || m.studentId === student.registrationNo);
            const studentClassName = student.studentClass || student.className || student.currentClass || "General Class";
            const grading = gradingByStudent[sid];

            // ONLY the subjects assigned to this student's class. Resolve by the
            // student's classId first, else by class name. No all-subjects fallback.
            let assignedSubjects = classSubjectsById[String(student.classId)]
                || classSubjectsByName[String(studentClassName).toLowerCase().trim()]
                || [];
            // Legacy fallback: if the class has no assigned subjects, derive the list
            // from this student's own marks (still NOT the whole subjects collection).
            if (assignedSubjects.length === 0) {
                assignedSubjects = Array.from(new Set(studentMarks.map((m: any) => (m.subjectName || '').trim()).filter(Boolean)))
                    .map(name => ({ name, id: '' }));
            }

            let totalPct = 0;
            const subjectsList = assignedSubjects.map(sub => {
                // All marks for this subject across the chosen exams.
                const subMarks = studentMarks.filter((m: any) =>
                    (sub.id && String(m.subjectId) === sub.id) ||
                    (m.subjectName || '').toLowerCase().trim() === sub.name.toLowerCase().trim());
                // Average the per-exam percentages (handles different max marks per exam).
                const pcts = subMarks.map((m: any) => {
                    const max = Number(m.totalMarks) || 100;
                    const got = Number(m.marksObtained ?? m.marks ?? m.score ?? 0);
                    return max > 0 ? (got / max) * 100 : 0;
                });
                const hasMark = subMarks.length > 0;
                const avgPct = hasMark ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
                if (hasMark) totalPct += avgPct;

                // Per-exam scores for the "term" columns (annual layout).
                const perExam: Record<string, number> = {};
                subMarks.forEach((m: any) => { perExam[String(m.examId)] = Number(m.marksObtained ?? m.marks ?? m.score ?? 0); });

                return {
                    subjectName: sub.name,
                    score: avgPct,
                    scoreDisplay: hasMark ? avgPct : "-",
                    perExam,
                    grade: hasMark ? grading.gradeOf(avgPct).grade : '-',
                    remarks: hasMark ? (grading.gradeOf(avgPct).remark || (avgPct >= 70 ? "Excellent" : avgPct >= 50 ? "Good" : "Needs improvement")) : "No marks entered",
                };
            });

            const gradedCount = subjectsList.filter(s => s.scoreDisplay !== "-").length;
            const meanScore = gradedCount > 0 ? totalPct / gradedCount : 0;       // average % across graded subjects
            const totalMarks = Math.round(totalPct);                              // sum of subject %s (used for ranking)
            const gpa = gradedCount > 0 ? (meanScore / 20).toFixed(2) : "0.00";

            // Performance trend: this student's mean % per exam, chronologically, up
            // to (and including) the selected exam. Labelled F1T1 / G1T1 / etc.
            const myTrendMarks = allMarksForTrend.filter((m: any) => String(m.studentId) === sid);
            const byExam: Record<string, { sum: number; n: number; classAtTime?: string }> = {};
            myTrendMarks.forEach((m: any) => {
                const ex = examById[String(m.examId)]; if (!ex) return;
                if (examOrder(ex) > cutoff) return;   // skip exams after the selected one
                const max = Number(m.totalMarks) || 100;
                const pct = max > 0 ? (Number(m.marksObtained ?? m.marks ?? m.score ?? 0) / max) * 100 : 0;
                const k = String(m.examId); (byExam[k] ||= { sum: 0, n: 0 }); byExam[k].sum += pct; byExam[k].n++;
                if (m.classAtTime) byExam[k].classAtTime = m.classAtTime;   // the class the student was in for THIS exam
            });
            const trendRaw = Object.keys(byExam)
                .map(eid => { const ex = examById[eid]; return { eid, ex, mean: Math.round(byExam[eid].sum / byExam[eid].n), classAtTime: byExam[eid].classAtTime }; })
                .filter(t => t.ex)
                .sort((a, b) => examOrder(a.ex).localeCompare(examOrder(b.ex)))
                .map(t => ({
                    // Prefer the class recorded at exam time (exact); else infer from the year gap.
                    label: `${t.classAtTime ? levelLabelDirect(t.classAtTime) : levelAtYear(studentClassName, t.ex.academicYear)}T${termNum(t.ex.term)}`,
                    exam: t.ex.examName || t.ex.name || 'Exam',
                    mean: t.mean,
                }));
            // If two points still share a label (same level+term — e.g. a CAT and an
            // End-Term in the same term), disambiguate with a #2, #3 suffix.
            const seenLabel: Record<string, number> = {};
            const trend = trendRaw.map(t => {
                const n = (seenLabel[t.label] = (seenLabel[t.label] || 0) + 1);
                return n > 1 ? { ...t, label: `${t.label}·${n}` } : t;
            });

            return {
                studentId: student._id,
                studentName: student.studentName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || "Student",
                admNo: student.admNo || student.registrationNo || `BS${student._id.toString().slice(-4).toUpperCase()}`,
                photo: student.avatar || student.photo || student.studentPhoto || student.image || "",
                className: studentClassName,
                examName, isAnnual,
                examList: examDocs.map((e: any) => ({ id: e._id.toString(), name: e.examName || e.name })),
                term: activeTerm,
                year: activeYear,
                subjects: subjectsList,
                subjectsCount: subjectsList.length,
                gradedCount,
                totalMarks,
                meanScore: Number(meanScore.toFixed(1)),
                gpa,
                trend,
                hasMarks: gradedCount > 0,
                rank: "—",
                rankNum: 0,
                attendanceSummary: (() => {
                    const a = attBy[sid];
                    if (!a || a.total === 0) return { presentDays: 0, totalDays: 0, percentage: "—" };
                    return { presentDays: a.present, totalDays: a.total, percentage: `${Math.round((a.present / a.total) * 100)}%` };
                })(),
                personality: personalityBy[sid] || [],
                teacherRemarks: "",
                principalRemarks: "",
            };
        });

        // ── Rank each student within their CLASS by total marks (graded only). ──
        const byClass: Record<string, any[]> = {};
        for (const rc of reportCards) {
            const key = rc.className || "General";
            (byClass[key] = byClass[key] || []).push(rc);
        }
        for (const key of Object.keys(byClass)) {
            const graded = byClass[key].filter(r => r.hasMarks).sort((a, b) => b.totalMarks - a.totalMarks);
            const size = graded.length;
            graded.forEach((r, i) => {
                const pos = i + 1;
                const suffix = pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th";
                r.rankNum = pos;
                r.rank = `${pos}${suffix} out of ${size}`;
            });
            // Ungraded students get no rank.
            byClass[key].filter(r => !r.hasMarks).forEach(r => { r.rank = "—"; r.rankNum = 0; });
        }

        res.json({ data: reportCards, examSelected: examIds.length > 0, examCount: examIds.length, examName });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 2. GET /api/v1/reports/students-info
router.get('/reports/students-info', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { class_id, gender, status, search, page = 1, limit = 50 } = req.query;

        const query: any = {};
        if (class_id) query.studentClass = class_id;
        if (gender) query.gender = gender;
        if (status) query.status = status;
        if (search) {
            const searchVal = search as string;
            query.$or = [
                { studentName: { $regex: searchVal, $options: 'i' } },
                { name: { $regex: searchVal, $options: 'i' } },
                { firstName: { $regex: searchVal, $options: 'i' } },
                { lastName: { $regex: searchVal, $options: 'i' } },
                { admNo: { $regex: searchVal, $options: 'i' } },
                { registrationNo: { $regex: searchVal, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await db.collection('students').countDocuments(query);
        const rawStudents = await db.collection('students').find(query).skip(skip).limit(Number(limit)).toArray();

        const normalizedStudents = rawStudents.map((s: any) => ({
            ...s,
            name: s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || "Unnamed Student",
            admNo: s.admNo || s.registrationNo || `BS${s._id.toString().slice(-4).toUpperCase()}`,
            studentClass: s.studentClass || s.className || "General Class",
            gender: s.gender || "Male",
            status: s.status || "Active",
            admissionDate: s.admissionDate || new Date().toISOString().split('T')[0],
            parents: s.parents?.length ? s.parents : [{ name: s.parentName || "Guardian", phone: s.phone || "N/A" }]
        }));

        // Ensure fallback sample data if empty
        const data = normalizedStudents.length > 0 ? normalizedStudents : [
            {
                _id: new ObjectId(),
                admNo: "BS001",
                name: "Fatuma Waridi",
                gender: "Female",
                studentClass: "Grade 8 Stream 1",
                status: "Active",
                admissionDate: "2022-01-10",
                parents: [{ name: "Amina Waridi", phone: "+254711223344", relation: "Mother", email: "amina@example.com" }]
            },
            {
                _id: new ObjectId(),
                admNo: "BS002",
                name: "John Doe",
                gender: "Male",
                studentClass: "Grade 8 Stream 1",
                status: "Active",
                admissionDate: "2022-01-12",
                parents: [{ name: "Peter Doe", phone: "+254722334455", relation: "Father", email: "peter@example.com" }]
            }
        ];

        res.json({
            data,
            pagination: {
                total: total > 0 ? total : data.length,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil((total > 0 ? total : data.length) / Number(limit))
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 3. GET /api/v1/reports/parents-info
router.get('/reports/parents-info', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { student_class_id, search, relation } = req.query;

        const query: any = {};
        if (student_class_id) {
            query.$or = [
                { studentClass: student_class_id },
                { className: student_class_id },
                { classId: student_class_id }
            ];
        }

        const students = await db.collection('students').find(query).toArray();
        let parents: any[] = [];

        students.forEach((s: any) => {
            const studentName = s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || "Unnamed Student";
            const studentAdmNo = s.admNo || s.registrationNo || `BS${s._id.toString().slice(-4).toUpperCase()}`;
            const studentClass = s.studentClass || s.className || "General Class";

            let studentParents: any[] = [];

            if (s.parents && Array.isArray(s.parents) && s.parents.length > 0) {
                studentParents = s.parents.map((p: any) => ({
                    _id: p._id || new ObjectId(),
                    studentId: s._id,
                    studentName,
                    studentAdmNo,
                    studentClass,
                    parentName: p.name || p.parentName || "Guardian",
                    relation: p.relation || p.relationship || "Parent",
                    phone: p.phone || p.mobile || "N/A",
                    email: p.email || "N/A",
                    occupation: p.occupation || "Business",
                    isEmergencyContact: p.isEmergencyContact ?? p.isEmergency ?? true
                }));
            } else if (s.guardians && Array.isArray(s.guardians) && s.guardians.length > 0) {
                studentParents = s.guardians.map((g: any) => ({
                    _id: g._id || new ObjectId(),
                    studentId: s._id,
                    studentName,
                    studentAdmNo,
                    studentClass,
                    parentName: g.name || g.guardianName || "Guardian",
                    relation: g.relation || g.relationship || "Guardian",
                    phone: g.phone || g.mobile || "N/A",
                    email: g.email || "N/A",
                    occupation: g.occupation || "Business",
                    isEmergencyContact: g.isEmergencyContact ?? g.isEmergency ?? true
                }));
            } else if (s.parentName || s.fatherName || s.motherName || s.guardianName || s.phone || s.mobile) {
                if (s.fatherName) {
                    studentParents.push({
                        _id: new ObjectId(), studentId: s._id, studentName, studentAdmNo, studentClass,
                        parentName: s.fatherName, relation: "Father", phone: s.fatherPhone || s.phone || s.mobile || "N/A",
                        email: s.fatherEmail || s.email || "N/A", occupation: s.fatherOccupation || s.occupation || "Business",
                        isEmergencyContact: true
                    });
                }
                if (s.motherName) {
                    studentParents.push({
                        _id: new ObjectId(), studentId: s._id, studentName, studentAdmNo, studentClass,
                        parentName: s.motherName, relation: "Mother", phone: s.motherPhone || s.phone || s.mobile || "N/A",
                        email: s.motherEmail || s.email || "N/A", occupation: s.motherOccupation || s.occupation || "Business",
                        isEmergencyContact: true
                    });
                }
                if (!s.fatherName && !s.motherName && (s.parentName || s.guardianName || s.phone || s.mobile)) {
                    studentParents.push({
                        _id: new ObjectId(), studentId: s._id, studentName, studentAdmNo, studentClass,
                        parentName: s.parentName || s.guardianName || "Guardian",
                        relation: s.relation || s.relationship || s.parentRelation || "Parent",
                        phone: s.phone || s.mobile || "N/A",
                        email: s.email || s.parentEmail || "N/A",
                        occupation: s.occupation || s.parentOccupation || "Business",
                        isEmergencyContact: s.isEmergencyContact ?? s.isEmergency ?? true
                    });
                }
            }

            parents.push(...studentParents);
        });

        if (search) {
            const searchStr = (search as string).toLowerCase();
            parents = parents.filter(p => 
                p.parentName?.toLowerCase().includes(searchStr) || 
                p.studentName?.toLowerCase().includes(searchStr) ||
                p.phone?.includes(searchStr) ||
                p.studentAdmNo?.toLowerCase().includes(searchStr) ||
                p.email?.toLowerCase().includes(searchStr)
            );
        }

        if (relation) {
            const relStr = (relation as string).toLowerCase();
            parents = parents.filter(p => p.relation?.toLowerCase() === relStr);
        }

        // Fallback sample data if empty
        if (parents.length === 0) {
            parents = [
                {
                    _id: new ObjectId(), studentId: new ObjectId(), studentName: "Fatuma Waridi", studentAdmNo: "BS001", studentClass: "Grade 8",
                    parentName: "Amina Waridi", relation: "Mother", phone: "+254711223344", email: "amina@example.com", occupation: "Doctor", isEmergencyContact: true
                },
                {
                    _id: new ObjectId(), studentId: new ObjectId(), studentName: "John Doe", studentAdmNo: "BS002", studentClass: "Grade 8",
                    parentName: "Peter Doe", relation: "Father", phone: "+254722334455", email: "peter@example.com", occupation: "Engineer", isEmergencyContact: true
                }
            ];
        }

        res.json({ data: parents });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 4. GET /api/v1/reports/attendance/monthly-students
// 4. GET /api/v1/reports/attendance/monthly-students
router.get('/reports/attendance/monthly-students', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { class_id, month, year } = req.query;

        const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
        const targetYear = year ? Number(year) : new Date().getFullYear();

        const query: any = {};
        if (class_id) {
            query.$or = [
                { studentClass: class_id },
                { className: class_id },
                { classId: class_id },
                { currentClass: class_id }
            ];
        }

        const students = await db.collection('students').find(query).toArray();
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        // Fetch attendance records for the month
        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const attQuery: any = {
            date: { $gte: startDate, $lte: endDate }
        };
        if (class_id) {
            attQuery.$or = [{ class_id }, { classId: class_id }, { className: class_id }];
        }

        const attendanceLogs = await db.collection('student_attendance').find(attQuery).toArray();

        const activeStudents = students.length > 0 ? students : [
            { _id: new ObjectId(), admNo: "BSC742", name: "Muzamil Ibrahim Mohamed", studentClass: "Grade 8 Stream 1" },
            { _id: new ObjectId(), admNo: "BSC743", name: "Mudathir Mohamed", studentClass: "Grade 8 Stream 1" }
        ];

        const monthlyGrid = activeStudents.map((student: any) => {
            const dailyStatus: Record<number, string> = {};
            let presentCount = 0;
            let lateCount = 0;
            let absentCount = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const log = attendanceLogs.find((a: any) => 
                    (a.date === dateStr && a.records?.some((r: any) => r.student_id === student._id?.toString() || r.studentId?.toString() === student._id?.toString() || r.admNo === student.admNo || r.admNo === student.registrationNo)) ||
                    (a.date === dateStr && (a.studentId?.toString() === student._id?.toString() || a.student_id?.toString() === student._id?.toString() || a.admNo === student.admNo || a.admNo === student.registrationNo))
                );
                
                let status = "P"; // Default Present for simulation if no log
                if (log) {
                    if (log.records) {
                        const rec = log.records.find((r: any) => r.student_id === student._id?.toString() || r.studentId?.toString() === student._id?.toString() || r.admNo === student.admNo || r.admNo === student.registrationNo);
                        if (rec) {
                            if (rec.status === "PRESENT" || rec.status === "P") status = "P";
                            else if (rec.status === "ABSENT" || rec.status === "A") status = "A";
                            else if (rec.status === "LATE" || rec.status === "L") status = "L";
                            else if (rec.status === "EXCUSED" || rec.status === "E") status = "E";
                        }
                    } else {
                        if (log.status === "PRESENT" || log.status === "P") status = "P";
                        else if (log.status === "ABSENT" || log.status === "A") status = "A";
                        else if (log.status === "LATE" || log.status === "L") status = "L";
                        else if (log.status === "EXCUSED" || log.status === "E") status = "E";
                    }
                } else {
                    // Randomize slightly for realistic sample data
                    const rand = Math.random();
                    if (rand > 0.95) status = "A";
                    else if (rand > 0.90) status = "L";
                }

                dailyStatus[d] = status;
                if (status === "P") presentCount++;
                else if (status === "L") { lateCount++; presentCount++; } // Late counts as present
                else if (status === "A") absentCount++;
            }

            const totalWorkingDays = daysInMonth;
            const percentage = ((presentCount / totalWorkingDays) * 100).toFixed(1) + "%";

            return {
                studentId: student._id,
                admNo: student.admNo || student.registrationNo || `BS${student._id?.toString().slice(-4).toUpperCase()}`,
                studentName: student.studentName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
                className: student.studentClass || student.className || student.currentClass || "Grade 8",
                dailyStatus,
                totalWorkingDays,
                presentCount,
                lateCount,
                absentCount,
                percentage
            };
        });

        res.json({
            data: monthlyGrid,
            meta: { month: targetMonth, year: targetYear, daysInMonth }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 5. GET /api/v1/reports/attendance/monthly-staff
router.get('/reports/attendance/monthly-staff', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { department_id, month, year } = req.query;

        const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
        const targetYear = year ? Number(year) : new Date().getFullYear();

        const query: any = {};
        if (department_id) {
            query.$or = [
                { department: department_id }, 
                { departmentId: department_id }, 
                { deptName: department_id }
            ];
        }

        const staff = await db.collection('staff').find(query).toArray();
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const attLogs = await db.collection('employee_attendance').find({
            date: { $gte: startDate, $lte: endDate }
        }).toArray();

        const activeStaff = staff.length > 0 ? staff : [
            { _id: new ObjectId(), empNo: "EMPC744", name: "Muzamil Ibrahim Mohamed", department: "Academic", designation: "Teacher" },
            { _id: new ObjectId(), empNo: "EMPCE88", name: "Mudathir Mohamed", department: "Academic", designation: "Teacher" },
            { _id: new ObjectId(), empNo: "EMPCEF9", name: "AHMED", department: "Academic", designation: "Teacher" }
        ];

        const monthlyGrid = activeStaff.map((emp: any) => {
            const dailyStatus: Record<number, string> = {};
            let presentCount = 0;
            let leaveCount = 0;
            let absentCount = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const log = attLogs.find((a: any) => a.date === dateStr && (
                    a.employeeId?.toString() === emp._id?.toString() || 
                    a.staffId?.toString() === emp._id?.toString() || 
                    a.employee_id?.toString() === emp._id?.toString() ||
                    a.empNo === emp.empNo ||
                    a.employeeNo === emp.empNo
                ));

                let status = "P";
                if (log) {
                    if (log.status === "PRESENT" || log.status === "P") status = "P";
                    else if (log.status === "ABSENT" || log.status === "A") status = "A";
                    else if (log.status === "LATE" || log.status === "L") status = "L";
                    else if (log.status === "EXCUSED" || log.status === "E") status = "E";
                } else {
                    const rand = Math.random();
                    if (rand > 0.96) status = "A";
                    else if (rand > 0.92) status = "L";
                }

                dailyStatus[d] = status;
                if (status === "P" || status === "L") presentCount++;
                else if (status === "A") absentCount++;
            }

            const totalWorkingDays = daysInMonth;
            const percentage = ((presentCount / totalWorkingDays) * 100).toFixed(1) + "%";

            return {
                staffId: emp._id,
                empNo: emp.empNo || emp.employeeId || `EMP${emp._id?.toString().slice(-4).toUpperCase()}`,
                staffName: emp.name || emp.employeeName || emp.staffName || "Employee",
                department: emp.department || emp.deptName || "Academic",
                designation: emp.designation || "Teacher",
                dailyStatus,
                totalWorkingDays,
                presentCount,
                leaveDeductions: absentCount,
                percentage
            };
        });

        res.json({
            data: monthlyGrid,
            meta: { month: targetMonth, year: targetYear, daysInMonth }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 6. GET /api/v1/reports/fee-collection — REAL fee payments + invoice totals.
router.get('/reports/fee-collection', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { start_date, end_date, class_id, payment_mode, status } = req.query as any;

        // Pull real payments from the `payments` collection (recorded by Collect
        // Fees). Some schools also have `transactions` — merge both.
        const collect = async (name: string) => { try { return await db.collection(name).find({}).toArray(); } catch { return []; } };
        const rawPayments = [...(await collect('payments')), ...(await collect('transactions'))]
            .filter((p: any) => !p.is_voided && (p.status ? String(p.status).toLowerCase() !== 'rejected' : true));

        // Index students for name/adm/class enrichment.
        const students = await collect('students');
        const byId: Record<string, any> = {};
        students.forEach((s: any) => { byId[String(s._id)] = s; });
        const findStudent = (p: any) => byId[String(p.student_id || p.studentId || '')] || students.find((s: any) => (s.registrationNo || s.admNo) && (s.registrationNo === (p.registrationNo || p.admNo) || s.admNo === (p.registrationNo || p.admNo)));

        let data = rawPayments.map((p: any) => {
            const s = findStudent(p);
            const amount = Number(p.amount ?? p.amount_paid ?? p.paid_amount ?? 0);
            const date = p.payment_date || p.paymentDate || (p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '') || p.date || '';
            return {
                _id: String(p._id),
                receiptNo: p.receipt_no || p.receiptNo || p.reference || `RCPT-${String(p._id).slice(-6).toUpperCase()}`,
                studentName: p.studentName || s?.studentName || `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || '—',
                admNo: p.registrationNo || p.admNo || s?.registrationNo || s?.admNo || '—',
                className: p.studentClass || s?.studentClass || s?.currentClass || '—',
                amount,
                paymentMode: p.method || p.paymentMode || p.payment_mode || p.mode || 'Cash',
                paymentDate: date,
                status: p.status || 'Completed',
            };
        });

        // Apply filters.
        if (start_date && end_date) data = data.filter((t) => t.paymentDate >= start_date && t.paymentDate <= end_date);
        if (payment_mode) data = data.filter((t) => String(t.paymentMode).toLowerCase() === String(payment_mode).toLowerCase());
        if (status) data = data.filter((t) => String(t.status).toLowerCase() === String(status).toLowerCase());
        if (class_id) data = data.filter((t) => String(t.className).toLowerCase().includes(String(class_id).toLowerCase()));
        data.sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)));

        // Real expected/collected/outstanding from invoices.
        const invoices = await collect('invoices');
        const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total_due ?? i.total ?? i.amount ?? 0), 0);
        const totalCollected = data.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const totalOutstanding = invoices.reduce((s: number, i: any) => {
            const t = Number(i.total_due ?? i.total ?? i.amount ?? 0);
            const paid = Number(i.paid_amount ?? i.amountPaid ?? i.amount_paid ?? 0);
            return s + Math.max(0, Number(i.balance ?? (t - paid)));
        }, 0);

        res.json({
            summary: {
                totalExpected: totalBilled || totalCollected + totalOutstanding,
                totalCollected,
                totalOutstanding,
            },
            data,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 7. GET /api/v1/reports/student-progress
router.get('/reports/student-progress', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { student_id, year } = req.query;

        // Fetch student details
        let student: any = null;
        if (student_id) {
            try {
                student = await db.collection('students').findOne({ 
                    $or: [
                        { _id: new ObjectId(student_id as string) },
                        { admNo: student_id as string },
                        { registrationNo: student_id as string }
                    ]
                });
            } catch(e){}
        }

        if (!student) { 
            const firstStudent = await db.collection('students').findOne({});
            student = firstStudent || { _id: new ObjectId(), name: "Fatuma Waridi", admNo: "BS001", studentClass: "Grade 8 Stream 1" }; 
        }

        const studentIdStr = student._id?.toString();
        let marks: any[] = [];
        if (studentIdStr) {
            marks = await db.collection('exam_marks').find({ 
                $or: [
                    { studentId: studentIdStr },
                    { studentId: new ObjectId(studentIdStr) },
                    { student_id: studentIdStr },
                    { student_id: new ObjectId(studentIdStr) },
                    ...(student.admNo ? [{ studentId: student.admNo }, { student_id: student.admNo }] : []),
                    ...(student.registrationNo ? [{ studentId: student.registrationNo }, { student_id: student.registrationNo }] : [])
                ]
            }).toArray();
            marks = await onlyPublished(db, marks);
        }

        const exams = await db.collection('exams').find({}).toArray();

        let historicalExams: any[] = [];
        if (marks.length > 0) {
            // Group by examId
            const examGroups: Record<string, any[]> = {};
            marks.forEach((m: any) => {
                const eId = m.examId || m.assessmentId || "unknown";
                if (!examGroups[eId]) examGroups[eId] = [];
                examGroups[eId].push(m);
            });

            Object.entries(examGroups).forEach(([eId, mList]) => {
                const examObj = exams.find((e: any) => e._id?.toString() === eId.toString() || e.name === eId);
                const totalMarks = mList.reduce((sum, m) => sum + Number(m.marksObtained || m.marks || m.score || m.value || 0), 0);
                const average = mList.length > 0 ? Math.round(totalMarks / mList.length) : 0;
                const gpa = Number((average / 20).toFixed(2));
                historicalExams.push({
                    term: examObj?.term || examObj?.semester || "Term 1",
                    examName: examObj?.name || examObj?.examName || "Term Exam",
                    gpa,
                    totalMarks,
                    average
                });
            });
        }

        const attendanceTrends: any[] = [];
        const evaluations: any[] = [];

        res.json({
            student: {
                studentId: student._id,
                name: student.studentName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
                admNo: student.registrationNo || student.admNo || "BS001",
                className: student.studentClass || student.className || student.currentClass || "Grade 8"
            },
            historicalExams,
            attendanceTrends,
            evaluations
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 8. GET /api/v1/reports/accounts
router.get('/reports/accounts', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { start_date, end_date, account_id, type } = req.query;

        const query: any = {};
        if (start_date && end_date) {
            query.transactionDate = { $gte: start_date, $lte: end_date };
        }
        if (type) query.type = type;

        const ledgerEntries = await db.collection('account_ledger').find(query).toArray();
        const txnQuery: any = {};
        if (start_date && end_date) {
            txnQuery.date = { $gte: start_date, $lte: end_date };
        }
        const feeTxns = await db.collection('transactions').find(txnQuery).toArray();
        const mappedFeeTxns = feeTxns.map((t: any) => ({
            _id: t._id,
            date: t.date || t.createdAt?.toISOString()?.split('T')[0] || "2026-05-01",
            reference: t.receiptNo || t.invoiceNo || `REC-${t._id.toString().slice(-6).toUpperCase()}`,
            description: `Fee Collection - ${t.studentName || 'Student'} (${t.class || 'Class'})`,
            type: "income",
            category: "Tuition Fees",
            amount: Number(t.amount || t.paidAmount || 0),
            paymentMethod: t.paymentMode || t.mode || "Cash",
            recordedBy: t.recordedBy || "Admin"
        }));

        // Real income / expense entries from the Accounts module.
        const dateFilter: any = (start_date && end_date) ? { $or: [{ date: { $gte: start_date, $lte: end_date } }, { transactionDate: { $gte: start_date, $lte: end_date } }] } : {};
        const mapAcc = (e: any, t: 'income' | 'expense') => ({
            _id: e._id,
            date: e.date || e.transactionDate || (e.createdAt instanceof Date ? e.createdAt.toISOString().split('T')[0] : '') || '',
            reference: e.reference || e.refNo || e.voucherNo || `${t === 'income' ? 'INC' : 'EXP'}-${e._id.toString().slice(-6).toUpperCase()}`,
            description: e.description || e.title || e.name || e.head || e.source || (t === 'income' ? 'Income' : 'Expense'),
            type: t,
            category: e.category || e.head || e.accountHead || e.source || 'General',
            amount: Number(e.amount || 0),
            paymentMethod: e.paymentMethod || e.mode || e.method || 'Cash',
            recordedBy: e.recordedBy || 'Admin',
        });
        const incomeEntries = (await db.collection('income').find(dateFilter).toArray()).map((e: any) => mapAcc(e, 'income'));
        const expenseEntries = (await db.collection('expenses').find(dateFilter).toArray()).map((e: any) => mapAcc(e, 'expense'));

        let combinedEntries = [...ledgerEntries, ...incomeEntries, ...expenseEntries, ...mappedFeeTxns];
        if (type) combinedEntries = combinedEntries.filter((e: any) => e.type === type);
        combinedEntries.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));

        const data = combinedEntries;   // real data only — no fabricated samples
        const openingBalance = 0;
        const totalIncome = data.filter((d: any) => d.type === "income").reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
        const totalExpense = data.filter((d: any) => d.type === "expense").reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
        const closingBalance = openingBalance + totalIncome - totalExpense;

        // Breakdown
        const breakdown: Record<string, number> = {};
        data.forEach((item: any) => {
            const cat = item.category || "General";
            breakdown[cat] = (breakdown[cat] || 0) + Number(item.amount || 0);
        });

        res.json({
            summary: {
                openingBalance,
                closingBalance,
                totalIncome,
                totalExpense
            },
            breakdown: Object.entries(breakdown).map(([category, amount]) => ({ category, amount })),
            data
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 9. GET /api/v1/reports/custom/templates
router.get('/reports/custom/templates', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const templates = await db.collection('custom_report_templates').find({}).toArray();

        const data = templates.length > 0 ? templates : [
            {
                _id: new ObjectId(),
                name: "Student Demographics & Contacts",
                description: "Comprehensive listing of student personal details and parent contact information.",
                columns: ["admNo", "name", "gender", "studentClass", "parentName", "parentPhone"],
                filters: { status: "Active" },
                createdAt: new Date()
            },
            {
                _id: new ObjectId(),
                name: "Fee Defaulters Comprehensive List",
                description: "Report showing students with outstanding fee balances exceeding KSH 10,000.",
                columns: ["admNo", "name", "studentClass", "balance"],
                filters: { minBalance: 10000 },
                createdAt: new Date()
            }
        ];

        res.json({ data });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 10. POST /api/v1/reports/custom/templates
router.post('/reports/custom/templates', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { name, description, columns, filters } = req.body;

        const newTemplate = {
            name,
            description,
            columns: columns || [],
            filters: filters || {},
            createdAt: new Date()
        };

        const result = await db.collection('custom_report_templates').insertOne(newTemplate);
        res.status(201).json({ id: result.insertedId, ...newTemplate });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 11. POST /api/v1/reports/custom/generate
router.post('/reports/custom/generate', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { columns = ["admNo", "name", "studentClass"], filters = {}, sort = {}, page = 1, limit = 50 } = req.body;

        const query: any = {};
        if (filters.status) query.status = filters.status;
        if (filters.gender) query.gender = filters.gender;
        if (filters.studentClass) query.studentClass = filters.studentClass;

        const skip = (Number(page) - 1) * Number(limit);
        const students = await db.collection('students').find(query).skip(skip).limit(Number(limit)).toArray();

        // Map report column keys → the actual student fields (real data).
        const resolve: Record<string, (s: any) => any> = {
            admNo: s => s.registrationNo || s.admNo || s.admissionNo || s.admissionNumber || 'N/A',
            name: s => s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || 'N/A',
            studentName: s => s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'N/A',
            studentClass: s => s.studentClass || s.currentClass || s.className || 'N/A',
            gender: s => s.gender || 'N/A',
            status: s => s.status || 'Active',
            dob: s => s.dob || s.dateOfBirth || 'N/A',
            balance: s => Number(s.feeBalance ?? s.balance ?? s.outstanding ?? 0),
            parentName: s => s.fatherName || s.motherName || s.guardianName || s.parentName || 'N/A',
            parentPhone: s => s.fatherPhone || s.motherPhone || s.guardianPhone || s.phone || s.parentPhone || 'N/A',
        };
        const projectedData = students.map((item: any) => {
            const projected: any = { _id: item._id };
            columns.forEach((col: string) => { projected[col] = resolve[col] ? resolve[col](item) : (item[col] ?? 'N/A'); });
            return projected;
        });

        const total = await db.collection('students').countDocuments(query);
        res.json({
            data: projectedData,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) || 1 }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Shared helper endpoints
router.get('/reports/shared/classes', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        // The real classes are whatever students actually belong to — this is what
        // the report filters match against (student.studentClass).
        const distinct: string[] = (await db.collection('students').distinct('studentClass')).filter(Boolean);
        if (distinct.length > 0) {
            return res.json(distinct.sort().map((name: string) => ({ _id: name, name, levelName: name })));
        }
        // Fallback to the classes collection (use any available label field).
        const classes = await db.collection('classes').find({}).toArray();
        res.json(classes.map((c: any) => ({ _id: c._id, name: c.name || c.levelName || c.className, levelName: c.levelName || c.name })).filter((c: any) => c.name));
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

router.get('/reports/shared/exams', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const exams = await db.collection('exams').find({}).sort({ createdAt: -1 }).toArray();
        // Exams are stored with `examName` (not `name`), so the dropdown was blank.
        // Normalize to always provide a display `name`.
        const data = exams.map((e: any) => {
            const label = e.examName || e.name || e.title
                || [e.type, e.term, e.academicYear].filter(Boolean).join(' ')
                || 'Exam';
            return { ...e, _id: e._id, name: label, examName: e.examName || label };
        });
        res.json(data);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

router.get('/reports/shared/departments', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const depts = await db.collection('departments').find({}).toArray();
        const data = depts.length > 0 ? depts : [
            { _id: new ObjectId(), name: "Science Department" },
            { _id: new ObjectId(), name: "Mathematics Department" },
            { _id: new ObjectId(), name: "Languages Department" },
            { _id: new ObjectId(), name: "Humanities Department" }
        ];
        res.json(data);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// ── Report Card Settings ──────────────────────────────────────────────────────
// Controls what the report card shows: KCPE fields, positions, and each optional
// column (Point/Grade/Pos/Remarks/Initials/Change). One doc per tenant.
const DEFAULT_RC_SETTINGS = {
    showKcpe: true,
    showPositions: true,
    showChange: false,       // "Change" column: improvement/drop vs previous exam
    columns: { point: true, grade: true, pos: true, remarks: true, initials: true },
    // Analysis (Merit List) column toggles.
    analysis: { avg: true, tm: true, mg: true, pg: true, stream: true, subjects: true },
};
const mergeRcSettings = (doc: any) => ({
    ...DEFAULT_RC_SETTINGS, ...(doc || {}),
    columns: { ...DEFAULT_RC_SETTINGS.columns, ...(doc?.columns || {}) },
    analysis: { ...DEFAULT_RC_SETTINGS.analysis, ...(doc?.analysis || {}) },
});
router.get('/report-card-settings', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const doc = await db.collection('report_card_settings').findOne({}).catch(() => null);
        res.json(mergeRcSettings(doc));
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});
router.patch('/report-card-settings', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { _id, ...body } = req.body || {};
        await db.collection('report_card_settings').updateOne({}, { $set: { ...body, updatedAt: new Date() } }, { upsert: true });
        const doc = await db.collection('report_card_settings').findOne({});
        res.json(mergeRcSettings(doc));
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// Whole-year report: is it allowed yet? (Term 3 of the year, or after the year ends)
router.get('/reports/yearly/status', async (req: Request, res: Response) => {
    try { res.json(await yearlyStatus(getRequestDb(req), String(req.query.year || '') || undefined)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/report_card_generations', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const generations = await db.collection('report_card_generations').find({}, { projection: { yearly: 0 } }).sort({ generatedAt: -1 }).toArray();
        res.json(generations);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/report_card_generations', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const payload = req.body;
        if (payload?.kind === 'yearly') {   // ── yearly report: Term 1 | Term 2 | Term 3 | year average ──
            const st = await yearlyStatus(db, String(payload.academicYear || ''));
            if (!st.allowed) return res.status(403).json({ message: st.reason });
            if (!payload.className) return res.status(400).json({ message: 'className is required' });
            const students = await classStudents(db, { className: String(payload.className), streamId: payload.streamId || null });
            if (!students.length) return res.status(400).json({ message: 'No active students found in this class.' });
            const snap = await computeYearly(db, students, st.year);
            const yg = {
                kind: 'yearly', classId: String(payload.classId || ''), classV2Id: payload.classV2Id ? String(payload.classV2Id) : null, className: String(payload.className),
                mainExamId: `YEAR-${st.year}`, mainExamName: `${st.year} ANNUAL REPORT`, additionalExamIds: [] as string[], term: 'Whole Year', academicYear: st.year,
                streamId: payload.streamId || null, streamName: payload.streamName || null, generatedAt: new Date().toISOString(), frozenAt: new Date().toISOString(),
                yearly: { students: snap },
            };
            const nrmY = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
            const priorY = await db.collection('report_card_generations').find({ kind: 'yearly', academicYear: st.year }).toArray().catch(() => []);
            const dropY = priorY.filter((p: any) => nrmY(p.className) === nrmY(yg.className) && String(p.streamId || '') === String(yg.streamId || '')).map((p: any) => p._id);
            if (dropY.length) await db.collection('report_card_generations').deleteMany({ _id: { $in: dropY } }).catch(() => {});
            const insY = await db.collection('report_card_generations').insertOne(yg);
            const { yearly: _omit, ...lite } = yg as any;
            return res.status(201).json({ ...lite, students: snap.length, _id: insY.insertedId });
        }
        if (!payload?.classId || !payload?.mainExamId) {
            return res.status(400).json({ message: 'classId and mainExamId are required' });
        }
        const examSet = [String(payload.mainExamId), ...(Array.isArray(payload.additionalExamIds) ? payload.additionalExamIds.map((id: any) => String(id)) : [])].filter(Boolean);
        // Report cards only from PUBLISHED results (Exams → Manage Exams → Publish results).
        const pubView = await publishedView(db);
        if (pubView.statusOf(String(payload.mainExamId), String(payload.classV2Id || payload.classId || '') || undefined, payload.className) !== 'Published') {
            return res.status(409).json({ message: `This exam's results for ${payload.className || 'this class'} are not published yet. Publish them first under Exams → Manage Exams.` });
        }
        // SNAPSHOT: freeze the marks AS THEY ARE NOW so the generated report card is
        // stable — later edits to exam_marks don't change it until regenerated.
        const frozenMarks = (await db.collection('exam_marks').find({ examId: { $in: examSet } })
            .project({ studentId: 1, examId: 1, subjectId: 1, subjectName: 1, marksObtained: 1, totalMarks: 1, className: 1, classId: 1, classIdAtTime: 1, classAtTime: 1 })
            .toArray().catch(() => [])).filter(pubView.ok);
        const generation = {
            classId: String(payload.classId),
            classV2Id: payload.classV2Id ? String(payload.classV2Id) : null,
            className: payload.className || '',
            mainExamId: String(payload.mainExamId),
            mainExamName: payload.mainExamName || '',
            additionalExamIds: Array.isArray(payload.additionalExamIds) ? payload.additionalExamIds.map((id: any) => String(id)) : [],
            term: payload.term || '',
            academicYear: payload.academicYear || '',
            streamId: payload.streamId || null,
            streamName: payload.streamName || null,
            generatedAt: payload.generatedAt || new Date().toISOString(),
            // Frozen snapshot of marks at generation time (stringified ids).
            frozenMarks: frozenMarks.map((m: any) => ({ studentId: String(m.studentId), examId: String(m.examId), subjectId: m.subjectId != null ? String(m.subjectId) : '', subjectName: m.subjectName || '', marksObtained: N(m.marksObtained), totalMarks: N(m.totalMarks) || 100, className: m.className || '' })),
            frozenAt: new Date().toISOString(),
        };
        // Regenerate = replace. Drop ANY prior generation for the same target
        // (matched by className OR classId, plus stream + term + year) so we never
        // accumulate duplicates — even when the legacy classId varies between runs.
        const nrm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
        const priors = await db.collection('report_card_generations').find({
            term: generation.term, academicYear: generation.academicYear,
        }).toArray().catch(() => []);
        const dupeIds = priors.filter((p: any) => {
            const sameStream = String(p.streamId || '') === String(generation.streamId || '');
            const sameClass = String(p.classId) === generation.classId || (generation.className && nrm(p.className) === nrm(generation.className));
            return sameStream && sameClass;
        }).map((p: any) => p._id);
        if (dupeIds.length) await db.collection('report_card_generations').deleteMany({ _id: { $in: dupeIds } }).catch(() => {});
        const result = await db.collection('report_card_generations').insertOne(generation);
        res.status(201).json({ ...generation, _id: result.insertedId });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Admin-only guard: only organization/school administrators & principals may
// delete generated report-card records.
const ADMIN_ROLES = new Set(['super_admin', 'school_admin', 'admin', 'principal', 'super admin', 'school admin']);
const isAdminReq = (req: Request) => {
    const role = String((req as any).tenantContext?.user?.role || '').toLowerCase();
    return !role || ADMIN_ROLES.has(role);
};

// DELETE one generated report record (admin only).
router.delete('/report_card_generations/:id', async (req: Request, res: Response) => {
    try {
        if (!isAdminReq(req)) return res.status(403).json({ message: 'Only an administrator can delete generated reports.' });
        const db = getRequestDb(req);
        let _id: ObjectId; try { _id = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Invalid id' }); }
        const r = await db.collection('report_card_generations').deleteOne({ _id });
        if (!r.deletedCount) return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// Bulk delete — all records for an exam (admin only). Filter by mainExamId, and
// optionally term/academicYear. Used to clear a whole exam's generated set.
router.post('/report_card_generations/bulk-delete', async (req: Request, res: Response) => {
    try {
        if (!isAdminReq(req)) return res.status(403).json({ message: 'Only an administrator can delete generated reports.' });
        const db = getRequestDb(req);
        const { mainExamId, term, academicYear } = req.body || {};
        const q: any = {};
        if (mainExamId) q.mainExamId = String(mainExamId);
        if (term) q.term = term;
        if (academicYear) q.academicYear = String(academicYear);
        if (Object.keys(q).length === 0) return res.status(400).json({ message: 'Provide mainExamId (and optionally term/year).' });
        const r = await db.collection('report_card_generations').deleteMany(q);
        res.json({ message: 'Deleted', deleted: r.deletedCount });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// A generated yearly report as ready-to-print HTML (one page per learner)
async function yearlyDocForGeneration(req: Request, gen: any) {
    const db = getRequestDb(req);
    const tid = (req as any).tenantContext?.tenantId;
    const tenant: any = tid ? await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(String(tid)) }).catch(() => null) : null;
    // Grade boundaries = each learner's CLASS grading (template → class → global → …).
    const gradingFor = makeGradingCache(db);
    const bandsOf = async (y: any) => (await gradingFor((gen.classV2Id || gen.classId) ? String(gen.classV2Id || gen.classId) : undefined, y?.className || gen.className || undefined)).scale
        .map(b => ({ grade: String(b.grade || ''), lo: b.from, hi: b.upto })).filter(b => b.grade);
    const { yearlyDocumentHtml } = require('../services/report-card-pdf.service');
    const { classTeacherSignatureFor } = require('../lib/classTeacherSignature');
    const address = [tenant?.address || tenant?.location, tenant?.city || tenant?.county].filter(Boolean).join(', ');
    const list: any[] = gen.yearly?.students || [];
    const classTeacherSignature = await classTeacherSignatureFor(db, gen.className || list[0]?.className || '');
    const pages = await Promise.all(list.map(async y => ({ school: tenant?.instituteName || tenant?.name, logo: tenant?.logo, address, template: tenant?.reportTemplate, signature: tenant?.principalSignature || null, stamp: tenant?.schoolStamp || null, signerName: tenant?.principalName || null, classTeacherSignature, ...y, bands: await bandsOf(y) })));
    return { html: yearlyDocumentHtml(pages), count: list.length };
}
router.get('/report_card_generations/:id/yearly-html', async (req: Request, res: Response) => {
    try {
        if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid report ID' });
        const gen: any = await getRequestDb(req).collection('report_card_generations').findOne({ _id: new ObjectId(req.params.id), kind: 'yearly' });
        if (!gen) return res.status(404).json({ message: 'Yearly report not found' });
        res.json(await yearlyDocForGeneration(req, gen));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// 8. GET /api/v1/report_card_generations/:id/pdf
// Download generated report card as PDF
router.get('/report_card_generations/:id/pdf', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid report card ID" });
        }

        // Fetch the generation record
        const generation = await db.collection('report_card_generations').findOne({
            _id: new ObjectId(id)
        });

        if (!generation) {
            return res.status(404).json({ message: "Report card generation not found" });
        }
        if ((generation as any).kind === 'yearly') {   // yearly report → its own document
            const { htmlToPdf: toPdf } = require('../services/report-card-pdf.service');
            const doc = await yearlyDocForGeneration(req, generation);
            const ypdf = await toPdf(doc.html);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Annual-Report-${(generation as any).className}-${(generation as any).academicYear}.pdf"`);
            res.setHeader('Content-Length', ypdf.length);
            return res.end(ypdf);
        }

        const { classId, className, mainExamId, mainExamName, additionalExamIds = [], term, academicYear } = generation;

        // Fetch class to get students
        const classDoc = await db.collection('classes').findOne({ _id: new ObjectId(classId) });
        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Fetch main exam
        const mainExam = await db.collection('exams').findOne({ _id: new ObjectId(mainExamId) });
        if (!mainExam) {
            return res.status(404).json({ message: "Main exam not found" });
        }

        // Fetch additional exams if any
        const additionalExams = [];
        if (additionalExamIds && additionalExamIds.length > 0) {
            const fetched = await db.collection('exams').find({
                _id: { $in: additionalExamIds.map((id: string) => new ObjectId(id)) }
            }).toArray();
            additionalExams.push(...fetched);
        }

        const examList = [mainExam, ...additionalExams].filter(Boolean);

        // Fetch students in this class
        const students = await db.collection('students').find({
            $or: [
                { class: classDoc._id.toString() },
                { classId: classDoc._id.toString() },
                { "enrollment.class": classDoc._id.toString() }
            ]
        }).toArray();

        if (students.length === 0) {
            return res.status(400).json({ message: "No students found in this class" });
        }

        // Import PDF generation functions
        const { reportCardHtml, htmlToPdf } = require('../services/report-card-pdf.service');
        const school = (await db.collection('school').findOne({})) as any || {};
        // the layout the school chose on Report Card Templates
        const { getMetaDb: metaDbOf } = require('../lib/mongodb');
        const tidRc = (req as any).tenantContext?.tenantId;
        const tenantRc: any = tidRc ? await metaDbOf().collection('Tenant').findOne({ _id: new (require('mongodb').ObjectId)(String(tidRc)) }).catch(() => null) : null;

        // Generate combined PDF with all student report cards
        let allHtml = `
            <style>
                * { margin: 0; padding: 0; }
                body { font-family: Arial, sans-serif; }
                .page-break { page-break-after: always; margin-top: 1cm; }
            </style>
        `;

        const classScale = (await resolveGrading(db, String(classDoc._id), classDoc.levelName || classDoc.name || undefined)).scale;
        const { classTeacherSignatureFor } = require('../lib/classTeacherSignature');
        const classTeacherSignature = await classTeacherSignatureFor(db, classDoc.levelName || classDoc.name || '');
        for (const student of students) {
            try {
                // Fetch marks for this student
                const marks = await db.collection('marks').find({
                    studentId: student._id.toString(),
                    examId: { $in: examList.map(e => e._id.toString()) }
                }).toArray();

                if (marks.length > 0) {
                    const reportData = {
                        school: school.schoolName || 'School',
                        logo: school.logo || null,
                        motto: school.motto || '',
                        template: tenantRc?.reportTemplate || mainExam.curriculum || 'CBC', signature: tenantRc?.principalSignature || null, stamp: tenantRc?.schoolStamp || null, signerName: tenantRc?.principalName || null, classTeacherSignature, curriculum: mainExam.curriculum || '',
                        student: {
                            ...student,
                            className: classDoc.levelName || classDoc.name
                        },
                        exam: mainExam,
                        className: classDoc.levelName || classDoc.name,
                        marks,
                        // The class's configured grading scale.
                        scale: classScale,
                    };

                    const html = reportCardHtml(reportData);
                    allHtml += html + '<div class="page-break"></div>';
                }
            } catch (err) {
                console.error(`Error generating card for student ${student._id}:`, err);
            }
        }

        // Convert combined HTML to PDF
        const pdf = await htmlToPdf(allHtml);

        // Set response headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Report-Cards-${className}-${term}-${academicYear}.pdf"`);
        res.setHeader('Content-Length', pdf.length);

        // Send PDF
        res.end(pdf);
    } catch (error: any) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ message: "Error generating PDF: " + error.message });
    }
});

export default router;
