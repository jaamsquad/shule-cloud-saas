/**
 * Exams → Printouts: merit list, analysis report and transcripts for a class (form/grade),
 * built from PUBLISHED results only (buildExamResults + lib/examPublish).
 *
 * Ranking: competition ranking (ties share a position: 1, 2, 2, 4) by mean points, then
 * total marks. Positions are within the class level ("overall") and within each stream.
 * DEV columns compare with the previous exam this class sat (by year → term → date).
 */
import { Db, ObjectId } from 'mongodb';
import { buildExamResults } from '../routes/analytics.routes';
import { levelKey, publishedView } from './examPublish';
import { formatExamName } from './examName';
import { catalogMatch } from './subjectCatalog';
import { resolveGrading, meanGradeFromScale } from './grading';

const num = (v: any) => Number(v) || 0;
const r2 = (n: number, d = 2) => { const f = 10 ** d; return Math.round((Number(n) || 0) * f) / f; };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const norm = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isGirl = (g: any) => /^(f|female|girl)/i.test(String(g || ''));
const isBoy = (g: any) => /^(m|male|boy)/i.test(String(g || ''));
const genderLabel = (g: any) => (isGirl(g) ? 'Female' : isBoy(g) ? 'Male' : '');

export type RankBy = 'points' | 'marks';

function gradeOfPoints(scale: any[], mp: number) {
    return meanGradeFromScale(scale, mp);
}
/** Competition ranking (1,2,2,4). `key` higher = better. */
function rankMap<T>(items: T[], key: (x: T) => number[], id: (x: T) => string) {
    const sorted = [...items].sort((a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < ka.length; i++) if (kb[i] !== ka[i]) return kb[i] - ka[i]; return 0; });
    const out = new Map<string, number>();
    sorted.forEach((x, i) => {
        const prev = sorted[i - 1];
        const same = prev && key(prev).every((v, j) => v === key(x)[j]);
        out.set(id(x), same ? out.get(id(prev))! : i + 1);
    });
    return out;
}

async function examsInOrder(db: Db) {
    const exams = await db.collection('exams').find({}).toArray().catch(() => [] as any[]);
    const tn = (t: any) => num(String(t || '').match(/\d+/)?.[0]);
    return exams.sort((a: any, b: any) => num(a.academicYear) - num(b.academicYear) || tn(a.term) - tn(b.term) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

/** Rows of one exam for one class level (published only). */
async function levelRows(db: Db, examId: string, level: string) {
    const { rows } = await buildExamResults(db, examId);
    const mine = rows.filter((r: any) => levelKey(r.className) === levelKey(level));
    // The class level's configured grading (its template, else the school scale).
    const scale = (await resolveGrading(db, undefined, level || mine[0]?.className)).scale;
    return { rows: mine, scale };
}

async function teacherLookup(db: Db, level: string) {
    const [links, staff, streams] = await Promise.all([
        db.collection('staff_subjects').find({}).toArray().catch(() => [] as any[]),
        db.collection('staff').find({}, { projection: { name: 1, fullName: 1, firstName: 1, lastName: 1, staffName: 1, tscNo: 1, tscNumber: 1, tsc: 1 } }).toArray().catch(() => [] as any[]),
        db.collection('v2_streams').find({ deletedAt: { $exists: false } }).toArray().catch(() => [] as any[]),
    ]);
    const staffById = new Map(staff.map((s: any) => [String(s._id), s]));
    const nameOf = (s: any) => s?.name || s?.fullName || s?.staffName || `${s?.firstName || ''} ${s?.lastName || ''}`.trim();
    const tscOf = (s: any) => s?.tscNo || s?.tscNumber || s?.tsc || '';
    const mine = links.filter((l: any) => levelKey(l.className) === levelKey(level));
    const subjectTeacher = (subject: string, stream?: string) => {
        const l = mine.find((x: any) => norm(x.subjectName) === norm(subject) && (!stream || norm(x.streamName) === norm(stream)))
            || (stream ? mine.find((x: any) => norm(x.subjectName) === norm(subject) && !x.streamName) : null);
        if (!l) return { name: '', tsc: '' };
        const s = staffById.get(String(l.teacherId || l.staffId));
        return { name: nameOf(s) || l.teacherName || '', tsc: tscOf(s) };
    };
    const classTeacher = (stream: string) => {
        const st = streams.find((s: any) => levelKey(s.className) === levelKey(level) && norm(s.name) === norm(stream));
        const s = st?.classTeacherId ? staffById.get(String(st.classTeacherId)) : null;
        return { name: nameOf(s) || '', tsc: tscOf(s) };
    };
    return { subjectTeacher, classTeacher };
}

function gradeSummary(list: any[], scale: any[], pick: (r: any) => { grade: string; pct: number; points: number } | null) {
    const counts: Record<string, number> = {};
    scale.forEach((s: any) => { counts[s.grade] = 0; });
    const vals: { pct: number; points: number }[] = [];
    for (const r of list) { const v = pick(r); if (!v) continue; counts[v.grade] = (counts[v.grade] || 0) + 1; vals.push(v); }
    const mm = avg(vals.map(v => v.pct)), mp = avg(vals.map(v => v.points));
    return { counts, entries: vals.length, meanMarks: r2(mm, 1), meanPoints: r2(mp, 4), grade: vals.length ? gradeOfPoints(scale, mp) : '-' };
}

/** Everything the merit list and analysis report need for one exam × class level. */
export async function examClassReport(db: Db, examId: string, level: string, opts: { rankBy?: RankBy } = {}) {
    const rankBy = opts.rankBy || 'points';
    const { rows, scale } = await levelRows(db, examId, level);
    const exam: any = await db.collection('exams').findOne({ _id: toId(examId) }).catch(() => null);

    // previous exam this level sat (for DEV)
    const order = await examsInOrder(db);
    const idx = order.findIndex((e: any) => String(e._id) === String(examId));
    let prev: any = null; let prevRows: any[] = [];
    for (let i = idx - 1; i >= 0 && i >= idx - 12; i--) {
        const pr = (await levelRows(db, String(order[i]._id), level)).rows;
        if (pr.length) { prev = order[i]; prevRows = pr; break; }
    }
    const prevBy = new Map(prevRows.map((r: any) => [r.studentId, r]));

    // subjects present (ordered by how many sat them, then name)
    const subjCount = new Map<string, { name: string; short: string; n: number }>();
    rows.forEach((r: any) => r.subjects.forEach((s: any) => { const k = norm(s.name); const e = subjCount.get(k) || { name: s.name, short: s.shortCode, n: 0 }; e.n++; subjCount.set(k, e); }));
    // KNEC order (ENG, KIS, MAT, BIO, CHE, …) where the subject is in the catalogue, then by name
    const codeOf = (name: string) => Number(catalogMatch(name)?.code) || 9999;
    const subjects = [...subjCount.values()].sort((a, b) => codeOf(a.name) - codeOf(b.name) || a.name.localeCompare(b.name)).map(({ name, short }) => ({ name, short }));

    const key = (r: any) => (rankBy === 'marks' ? [r.totalMarks, r.meanPoints] : [r.meanPoints, r.totalMarks]);
    const overall = rankMap(rows, key, (r: any) => r.studentId);
    const streamsList = [...new Set(rows.map((r: any) => r.stream))].sort();
    const streamRank = new Map<string, number>();
    for (const st of streamsList) rankMap(rows.filter((r: any) => r.stream === st), key, (r: any) => r.studentId).forEach((v, k) => streamRank.set(k, v));
    const streamSize = new Map(streamsList.map(st => [st, rows.filter((r: any) => r.stream === st).length]));
    const genderRank = (g: 'Male' | 'Female', scope?: string) => rankMap(rows.filter((r: any) => genderLabel(r.gender) === g && (!scope || r.stream === scope)), key, (r: any) => r.studentId);

    const students = rows.map((r: any) => {
        const p = prevBy.get(r.studentId);
        const bySub: Record<string, any> = {};
        r.subjects.forEach((s: any) => { bySub[norm(s.name)] = { marks: s.marks, max: s.max, pct: s.pct, grade: s.grade, points: s.points }; });
        return {
            studentId: r.studentId, name: r.name, adm: r.adm, upi: '', stream: r.stream, gender: genderLabel(r.gender), kcpe: r.kcpe || null,
            subjects: bySub, subjectCount: r.subjects.length,
            totalMarks: r.totalMarks, meanMarks: r2(r.meanPct), totalPoints: r.totalPoints, meanPoints: r2(r.meanPoints, 3), meanGrade: r.meanGrade,
            dev: p ? r2(r.meanPoints - p.meanPoints, 3) : null, devMarks: p ? r2(r.meanPct - p.meanPct) : null,
            streamPos: streamRank.get(r.studentId) || null, streamOf: streamSize.get(r.stream) || 0,
            overallPos: overall.get(r.studentId) || null, overallOf: rows.length,
        };
    }).sort((a: any, b: any) => (a.overallPos || 1e9) - (b.overallPos || 1e9) || a.name.localeCompare(b.name));
    // UPI / admission extras
    const stuDocs = await db.collection('students').find({}, { projection: { upi: 1, upiNumber: 1, nemisUpi: 1 } }).toArray().catch(() => [] as any[]);
    const upiById = new Map(stuDocs.map((s: any) => [String(s._id), s.upi || s.upiNumber || s.nemisUpi || '']));
    students.forEach((s: any) => { s.upi = upiById.get(s.studentId) || ''; });

    const t = await teacherLookup(db, level);
    const overallPick = (r: any) => ({ grade: r.meanGrade, pct: r.meanPct, points: r.meanPoints });
    const prevOverall = (list: any[]) => gradeSummary(list, scale, overallPick);
    const withDev = (cur: any, old: any) => ({ ...cur, mmDev: old && old.entries ? r2(cur.meanMarks - old.meanMarks, 2) : null, mpDev: old && old.entries ? r2(cur.meanPoints - old.meanPoints, 4) : null });

    // grade breakdown (overall), per stream + whole class, and by gender
    const breakdown = {
        streams: [
            ...streamsList.map(st => ({ label: `${level} ${st}`, stream: st, ...withDev(prevOverall(rows.filter((r: any) => r.stream === st)), prevOverall(prevRows.filter((r: any) => r.stream === st))), classTeacher: t.classTeacher(st) })),
            { label: level, stream: '', ...withDev(prevOverall(rows), prevOverall(prevRows)), classTeacher: { name: '', tsc: '' } },
        ],
        gender: (['Male', 'Female'] as const).map(g => ({ label: g === 'Male' ? 'Boys' : 'Girls', ...withDev(prevOverall(rows.filter((r: any) => genderLabel(r.gender) === g)), prevOverall(prevRows.filter((r: any) => genderLabel(r.gender) === g))) })),
    };

    // subject summary (class grade summary) + per-subject detail
    const subjPick = (sub: string) => (r: any) => { const s = r.subjects.find((x: any) => norm(x.name) === norm(sub)); return s ? { grade: s.grade, pct: s.pct, points: s.points } : null; };
    const topList = (list: any[], sub: string | null, n = 3) => {
        if (!sub) {
            const rk = rankMap(list, key, (r: any) => r.studentId);
            return list.filter((r: any) => (rk.get(r.studentId) || 99) <= n).sort((a: any, b: any) => rk.get(a.studentId)! - rk.get(b.studentId)!).map((r: any) => r.studentId);
        }
        const sc = (r: any) => r.subjects.find((x: any) => norm(x.name) === norm(sub))?.pct;
        const has = list.filter((r: any) => sc(r) !== undefined);
        const rk = rankMap(has, (r: any) => [sc(r)], (r: any) => r.studentId);
        return has.filter((r: any) => (rk.get(r.studentId) || 99) <= n).sort((a: any, b: any) => rk.get(a.studentId)! - rk.get(b.studentId)!).map((r: any) => r.studentId);
    };
    const subjectSummary = subjects.map(s => {
        const cur = withDev(gradeSummary(rows, scale, subjPick(s.name)), gradeSummary(prevRows, scale, subjPick(s.name)));
        return { ...s, ...cur, teachers: streamsList.map(st => t.subjectTeacher(s.name, st).name).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') };
    }).sort((a, b) => b.meanPoints - a.meanPoints);

    // top students (overall + per subject) with stream / overall / gender ranks
    const studentById = new Map(students.map((s: any) => [s.studentId, s]));
    const rowById = new Map(rows.map((r: any) => [r.studentId, r]));
    const decorate = (ids: string[], sub: string | null) => ids.map(id => {
        const s: any = studentById.get(id); const r: any = rowById.get(id);
        const g = s.gender as 'Male' | 'Female' | '';
        const base: any = { studentId: id, adm: s.adm, name: s.name, stream: s.stream, gender: g };
        if (!sub) {
            const gO = g ? genderRank(g).get(id) : null, gS = g ? genderRank(g, s.stream).get(id) : null;
            return { ...base, streamRank: `${s.streamPos} / ${s.streamOf}`, overallRank: `${s.overallPos} / ${s.overallOf}`, meanMarks: s.meanMarks, dev: s.dev, totalMarks: s.totalMarks, totalPoints: s.totalPoints, grade: s.meanGrade,
                genderStreamRank: gS ? `${gS} / ${rows.filter((x: any) => genderLabel(x.gender) === g && x.stream === s.stream).length}` : '', genderOverallRank: gO ? `${gO} / ${rows.filter((x: any) => genderLabel(x.gender) === g).length}` : '' };
        }
        const sc = (x: any) => x.subjects.find((y: any) => norm(y.name) === norm(sub));
        const entries = rows.filter((x: any) => sc(x));
        const pctOf = (x: any) => sc(x).pct;
        const ovr = rankMap(entries, (x: any) => [pctOf(x)], (x: any) => x.studentId).get(id);
        const inStream = entries.filter((x: any) => x.stream === s.stream);
        const str = rankMap(inStream, (x: any) => [pctOf(x)], (x: any) => x.studentId).get(id);
        const gEntries = entries.filter((x: any) => genderLabel(x.gender) === g);
        const gStream = gEntries.filter((x: any) => x.stream === s.stream);
        return { ...base, streamRank: `${str} / ${inStream.length}`, overallRank: `${ovr} / ${entries.length}`, score: sc(r).marks, pct: sc(r).pct, grade: sc(r).grade,
            genderStreamRank: g ? `${rankMap(gStream, (x: any) => [pctOf(x)], (x: any) => x.studentId).get(id)} / ${gStream.length}` : '',
            genderOverallRank: g ? `${rankMap(gEntries, (x: any) => [pctOf(x)], (x: any) => x.studentId).get(id)} / ${gEntries.length}` : '' };
    });
    const tops = (sub: string | null, scope: any[]) => ({
        overall: decorate(topList(scope, sub), sub),
        boys: decorate(topList(scope.filter((r: any) => genderLabel(r.gender) === 'Male'), sub), sub),
        girls: decorate(topList(scope.filter((r: any) => genderLabel(r.gender) === 'Female'), sub), sub),
    });
    const perSubject = subjects.map(s => ({
        ...s,
        streams: [
            ...streamsList.map(st => ({ label: `${level} ${st}`, stream: st, ...withDev(gradeSummary(rows.filter((r: any) => r.stream === st), scale, subjPick(s.name)), gradeSummary(prevRows.filter((r: any) => r.stream === st), scale, subjPick(s.name))), teacher: t.subjectTeacher(s.name, st) })),
            { label: level, stream: '', ...withDev(gradeSummary(rows, scale, subjPick(s.name)), gradeSummary(prevRows, scale, subjPick(s.name))), teacher: { name: '', tsc: '' } },
        ],
        gender: (['Male', 'Female'] as const).map(g => ({ label: g === 'Male' ? 'Boys' : 'Girls', ...gradeSummary(rows.filter((r: any) => genderLabel(r.gender) === g), scale, subjPick(s.name)) })),
        top: tops(s.name, rows),
    }));

    const all = breakdown.streams[breakdown.streams.length - 1];
    return {
        exam: exam ? { _id: String(exam._id), title: formatExamName(exam), name: exam.examName || exam.name, term: exam.term, academicYear: exam.academicYear } : { _id: examId, title: 'Exam' },
        previousExam: prev ? { _id: String(prev._id), title: formatExamName(prev) } : null,
        level, rankBy, grades: scale.map((s: any) => s.grade), scale,
        streams: streamsList, subjects, students,
        summary: { entries: rows.length, meanMarks: all.meanMarks, meanPoints: all.meanPoints, grade: all.grade, mmDev: all.mmDev, mpDev: all.mpDev,
            streamMeans: breakdown.streams.slice(0, -1).map((s: any) => ({ stream: s.stream, meanPoints: s.meanPoints, meanMarks: s.meanMarks })) },
        breakdown, subjectSummary, top: tops(null, rows), perSubject,
    };
}

const toId = (id: string): any => (ObjectId.isValid(id) ? new ObjectId(id) : id);
const levelLabel = (s: any) => String(s || '').match(/(form|grade|pp|class|year)\s*\d+/i)?.[0] || String(s || '');

/** Exams that have published results for a class level, newest first. */
export async function publishedExamsFor(db: Db, level: string) {
    const view = await publishedView(db);
    const order = await examsInOrder(db);
    const ids = order.map((e: any) => String(e._id));
    const pairs: any[] = ids.length ? await db.collection('exam_marks').aggregate([
        { $match: { examId: { $in: ids } } },
        { $group: { _id: { examId: '$examId', classId: { $ifNull: ['$classIdAtTime', '$classId'] }, className: { $ifNull: ['$classAtTime', '$className'] } } } },
    ]).toArray().catch(() => []) : [];
    const ok = new Set(pairs.filter(p => levelKey(p._id.className) === levelKey(level) && view.statusOf(String(p._id.examId), p._id.classId ? String(p._id.classId) : undefined, p._id.className) === 'Published').map(p => String(p._id.examId)));
    return order.filter((e: any) => ok.has(String(e._id))).reverse().map((e: any) => ({ _id: String(e._id), title: formatExamName(e), term: e.term || '', academicYear: String(e.academicYear || ''), type: e.type || '' }));
}

/**
 * Transcripts: each student's results across the published exams they sat, one column per
 * term (its end-of-term exam, else the last exam of the term) or one per exam (mode 'all').
 */
export async function transcripts(db: Db, level: string, stream: string | null, mode: 'term' | 'all' = 'term') {
    const students: any[] = await db.collection('students').find({}).toArray().catch(() => []);
    const roster = students.filter((s: any) => {
        const cls = s.studentClass || s.currentClass || s.className || '';
        if (levelKey(cls) !== levelKey(level)) return false;
        if (/left|transfer|graduat|alumni|withdraw/i.test(String(s.status || ''))) return false;
        if (!stream) return true;
        const st = s.streamName || s.stream || String(cls).replace(/^(form|grade|year|class)\s*\d+\s*/i, '');
        return norm(st) === norm(stream);
    });
    const ids = new Set(roster.map((s: any) => String(s._id)));
    const order = await examsInOrder(db);
    const view = await publishedView(db);
    const marks: any[] = (await db.collection('exam_marks').find({ studentId: { $in: [...ids] } }).toArray().catch(() => [])).filter(view.ok);
    const sat = new Set(marks.map((m: any) => String(m.examId)));
    const examsSat = order.filter((e: any) => sat.has(String(e._id)));

    // which exams become columns
    const colExams: any[] = [];
    if (mode === 'all') colExams.push(...examsSat);
    else {
        const byTerm = new Map<string, any[]>();
        examsSat.forEach((e: any) => { const k = `${e.academicYear}|${e.term}`; byTerm.set(k, [...(byTerm.get(k) || []), e]); });
        for (const list of byTerm.values()) colExams.push(list.find((e: any) => /end/i.test(`${e.type} ${e.examName}`)) || list[list.length - 1]);
    }
    const results = new Map<string, any>();
    for (const e of colExams) results.set(String(e._id), await buildExamResults(db, String(e._id)));

    const maxPts = (scale: any[]) => Math.max(...scale.map((s: any) => num(s.points)), 12);
    const out = roster.map((s: any) => {
        const sid = String(s._id);
        const cols: any[] = [];
        for (const e of colExams) {
            const res = results.get(String(e._id)); if (!res) continue;
            const row = res.rows.find((r: any) => r.studentId === sid); if (!row) continue;
            const peers = res.rows.filter((r: any) => levelKey(r.className) === levelKey(row.className));
            const rk = rankMap(peers, (r: any) => [r.meanPoints, r.totalMarks], (r: any) => r.studentId);
            const mp = maxPts(res.scale);
            cols.push({
                examId: String(e._id), exam: formatExamName(e), term: e.term || '', year: String(e.academicYear || ''), level: levelLabel(row.className),
                subjects: Object.fromEntries(row.subjects.map((x: any) => [norm(x.name), { name: x.name, pct: x.pct, grade: x.grade, points: x.points, marks: x.marks, max: x.max }])),
                meanMarks: r2(row.meanPct), totalMarks: row.totalMarks, totalMax: row.subjects.reduce((a: number, x: any) => a + num(x.max), 0),
                totalPoints: row.totalPoints, totalPointsMax: row.subjects.length * mp, rank: rk.get(sid) || null, rankOf: peers.length, grade: row.meanGrade, meanPoints: r2(row.meanPoints, 3),
            });
        }
        const subjectNames: string[] = [];
        cols.forEach(c => Object.values(c.subjects).forEach((x: any) => { if (!subjectNames.some(n => norm(n) === norm(x.name))) subjectNames.push(x.name); }));
        return {
            studentId: sid, name: s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || 'Student',
            adm: s.registrationNo || s.admNo || s.admissionNumber || '', className: s.studentClass || s.currentClass || level,
            stream: s.streamName || s.stream || '', gender: genderLabel(s.gender || s.sex), photo: s.photo || s.avatar || s.image || '',
            subjects: subjectNames, columns: cols,
        };
    }).filter((s: any) => s.columns.length).sort((a: any, b: any) => a.name.localeCompare(b.name));
    return { level, stream, mode, students: out };
}
