/**
 * One student's exam analysis (student profile → Analysis), from PUBLISHED results only.
 *  - the exams they sat (for the picker), newest first
 *  - for the chosen exam: mean grade/marks/points, overall & stream position, each with the
 *    change since the previous exam they sat; per subject: marks, grade, change, change vs the
 *    student's target, rank in the class level and the class mean
 *  - performance over time (each exam: mean marks, class mean, position, grade)
 *  - plain-language highlights (strongest/weakest, most improved, biggest drop, vs class)
 * Targets live in `student_targets` { studentId, meanMarks?, subjects: { <subject>: pct } }.
 */
import { Db, ObjectId } from 'mongodb';
import { buildExamResults } from '../routes/analytics.routes';
import { levelKey, publishedView } from './examPublish';
import { formatExamName } from './examName';
import { catalogMatch } from './subjectCatalog';
import { resolveGrading } from './grading';

const num = (v: any) => Number(v) || 0;
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const norm = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Competition rank (1,2,2,4): position of `id` when sorted by `key` descending. */
function rankOf<T>(items: T[], key: (x: T) => number[], id: (x: T) => string, me: string) {
    const sorted = [...items].sort((a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < ka.length; i++) if (kb[i] !== ka[i]) return kb[i] - ka[i]; return 0; });
    let pos = 0;
    for (let i = 0; i < sorted.length; i++) {
        const same = i > 0 && key(sorted[i - 1]).every((v, j) => v === key(sorted[i])[j]);
        if (!same) pos = i + 1;
        if (id(sorted[i]) === me) return pos;
    }
    return null;
}

async function examsInOrder(db: Db) {
    const exams = await db.collection('exams').find({}).toArray().catch(() => [] as any[]);
    const tn = (t: any) => num(String(t || '').match(/\d+/)?.[0]);
    return exams.sort((a: any, b: any) => num(a.academicYear) - num(b.academicYear) || tn(a.term) - tn(b.term) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

const subjectKey = (name: string) => norm(catalogMatch(name)?.name || name);
const shortOf = (name: string, given?: string) => catalogMatch(name)?.short || given || name.slice(0, 3).toUpperCase();
const codeOf = (name: string) => Number(catalogMatch(name)?.code) || 9999;

/** This student's result in one exam, with positions and subject ranks within the class level. */
async function examSnapshot(db: Db, examId: string, studentId: string, cache: Map<string, any>) {
    if (!cache.has(examId)) cache.set(examId, await buildExamResults(db, examId));
    const { rows } = cache.get(examId);
    const me = rows.find((r: any) => r.studentId === studentId);
    if (!me) return null;
    // The student's class grading (template → class → global → …), as used for their grades.
    const scale = (await resolveGrading(db, undefined, me.className)).scale;
    const peers = rows.filter((r: any) => levelKey(r.className) === levelKey(me.className));
    const stream = peers.filter((r: any) => r.stream === me.stream);
    const key = (r: any) => [r.meanPoints, r.totalMarks];
    const maxPts = Math.max(...scale.map((s: any) => num(s.points)), 12);
    const subjects = me.subjects.map((s: any) => {
        const sat = peers.filter((p: any) => p.subjects.some((x: any) => norm(x.name) === norm(s.name)));
        const pctOf = (p: any) => p.subjects.find((x: any) => norm(x.name) === norm(s.name))?.pct || 0;
        const satStream = sat.filter((p: any) => p.stream === me.stream);
        return {
            key: subjectKey(s.name), name: s.name, short: shortOf(s.name, s.shortCode), pct: r1(num(s.pct)), marks: s.marks, max: s.max, grade: s.grade, points: s.points,
            rank: rankOf(sat, (p: any) => [pctOf(p)], (p: any) => p.studentId, studentId), rankOf: sat.length,
            streamRank: rankOf(satStream, (p: any) => [pctOf(p)], (p: any) => p.studentId, studentId), streamOf: satStream.length,
            classMean: r1(avg(sat.map(pctOf))),
        };
    }).sort((a: any, b: any) => codeOf(a.name) - codeOf(b.name) || a.name.localeCompare(b.name));
    return {
        level: me.className, stream: me.stream, scale,
        meanMarks: r1(num(me.meanPct)), meanPoints: r2(num(me.meanPoints)), grade: me.meanGrade,
        totalMarks: me.totalMarks, totalMax: me.subjects.reduce((a: number, s: any) => a + num(s.max), 0),
        totalPoints: me.totalPoints, totalPointsMax: me.subjects.length * maxPts,
        overallPos: rankOf(peers, key, (r: any) => r.studentId, studentId), overallOf: peers.length,
        streamPos: rankOf(stream, key, (r: any) => r.studentId, studentId), streamOf: stream.length,
        classMean: r1(avg(peers.map((p: any) => num(p.meanPct)))),
        subjects,
    };
}

export async function studentAnalysis(db: Db, studentId: string, examId?: string) {
    const view = await publishedView(db);
    const marks: any[] = (await db.collection('exam_marks').find({ studentId }, { projection: { examId: 1, classId: 1, classIdAtTime: 1, className: 1, classAtTime: 1, studentId: 1 } }).toArray().catch(() => [])).filter(view.ok);
    const sat = new Set(marks.map(m => String(m.examId)));
    const order = (await examsInOrder(db)).filter((e: any) => sat.has(String(e._id)));
    const exams = order.map((e: any) => ({ _id: String(e._id), title: formatExamName(e), name: e.examName || e.name || formatExamName(e), term: e.term || '', academicYear: String(e.academicYear || '') })).reverse();
    const target: any = await db.collection('student_targets').findOne({ studentId }).catch(() => null);
    const targets: Record<string, number> = target?.subjects || {};
    if (!exams.length) return { exams, current: null, overTime: [], targets: { meanMarks: target?.meanMarks ?? null, subjects: targets }, highlights: [] };

    const chosen = exams.find(e => e._id === examId) || exams[0];
    const cache = new Map<string, any>();
    const cur = await examSnapshot(db, chosen._id, studentId, cache);
    const idx = exams.findIndex(e => e._id === chosen._id);
    let prev: any = null; let prevExam: any = null;
    for (let i = idx + 1; i < exams.length && !prev; i++) { prev = await examSnapshot(db, exams[i]._id, studentId, cache); if (prev) prevExam = exams[i]; }

    const prevSub = new Map<string, any>((prev?.subjects || []).map((s: any) => [s.key, s]));
    const diff = (a: number | null | undefined, b: number | null | undefined) => (a === null || a === undefined || b === null || b === undefined ? null : r2(a - b));
    const current = cur && {
        exam: chosen, previousExam: prevExam,
        level: cur.level, stream: cur.stream,
        grade: cur.grade, prevGrade: prev?.grade || null,
        meanMarks: cur.meanMarks, meanMarksDev: diff(cur.meanMarks, prev?.meanMarks),
        meanPoints: cur.meanPoints, meanPointsDev: diff(cur.meanPoints, prev?.meanPoints),
        totalMarks: cur.totalMarks, totalMax: cur.totalMax,
        totalPoints: cur.totalPoints, totalPointsMax: cur.totalPointsMax, totalPointsDev: diff(cur.totalPoints, prev?.totalPoints),
        overallPos: cur.overallPos, overallOf: cur.overallOf, overallPosDev: prev?.overallPos && cur.overallPos ? prev.overallPos - cur.overallPos : null,   // + = moved up
        streamPos: cur.streamPos, streamOf: cur.streamOf, streamPosDev: prev?.streamPos && cur.streamPos && prev.stream === cur.stream ? prev.streamPos - cur.streamPos : null,
        classMean: cur.classMean,
        targetMean: target?.meanMarks ?? null,
        subjects: cur.subjects.map((s: any) => {
            const p = prevSub.get(s.key);
            const t = targets[s.key];
            return { ...s, dev: diff(s.pct, p?.pct), prevPct: p?.pct ?? null, target: t ?? null, devTarget: t !== undefined && t !== null ? r2(s.pct - t) : null };
        }),
    };

    // performance over time (oldest → newest), last 12 exams
    const overTime: any[] = [];
    for (const e of [...exams].slice(0, 12).reverse()) {
        const s = await examSnapshot(db, e._id, studentId, cache);
        if (s) overTime.push({ examId: e._id, label: `${e.name}`, term: e.term, year: e.academicYear, meanMarks: s.meanMarks, classMean: s.classMean, meanPoints: s.meanPoints, grade: s.grade, overallPos: s.overallPos, overallOf: s.overallOf });
    }

    return { exams, current, overTime, targets: { meanMarks: target?.meanMarks ?? null, subjects: targets }, highlights: current ? highlights(current) : [] };
}

/** Short, plain statements a teacher or parent can act on. */
function highlights(c: any): { tone: 'up' | 'down' | 'info'; text: string }[] {
    const out: { tone: 'up' | 'down' | 'info'; text: string }[] = [];
    const subs = [...c.subjects];
    if (!subs.length) return out;
    const best = [...subs].sort((a, b) => b.pct - a.pct);
    out.push({ tone: 'up', text: `Strongest: ${best.slice(0, 2).map(s => `${s.name} (${s.pct}%)`).join(' and ')}.` });
    const weak = best.slice(-2).reverse().filter(s => !best.slice(0, 2).includes(s) && s.pct < best[0].pct);
    if (weak.length) out.push({ tone: 'down', text: `Needs most support: ${weak.map(s => `${s.name} (${s.pct}%)`).join(' and ')}.` });
    const moved = subs.filter(s => s.dev !== null);
    const up = [...moved].sort((a, b) => b.dev - a.dev)[0];
    const down = [...moved].sort((a, b) => a.dev - b.dev)[0];
    if (up && up.dev > 0) out.push({ tone: 'up', text: `Most improved: ${up.name}, up ${up.dev} points since ${c.previousExam?.name || 'the last exam'}.` });
    if (down && down.dev < 0) out.push({ tone: 'down', text: `Biggest drop: ${down.name}, down ${Math.abs(down.dev)} points.` });
    const above = subs.filter(s => s.pct >= s.classMean).length;
    out.push({ tone: 'info', text: `Above the class average in ${above} of ${subs.length} subjects (class mean ${c.classMean}% vs ${c.meanMarks}%).` });
    if (c.overallPosDev) out.push({ tone: c.overallPosDev > 0 ? 'up' : 'down', text: `Overall position ${c.overallPosDev > 0 ? 'up' : 'down'} ${Math.abs(c.overallPosDev)} place${Math.abs(c.overallPosDev) === 1 ? '' : 's'} (now ${c.overallPos} of ${c.overallOf}).` });
    const missed = subs.filter(s => s.devTarget !== null && s.devTarget < 0);
    if (missed.length) out.push({ tone: 'down', text: `Below target in ${missed.length} subject${missed.length === 1 ? '' : 's'}: ${missed.slice(0, 3).map(s => s.name).join(', ')}${missed.length > 3 ? '…' : ''}.` });
    return out;
}

export async function saveTargets(db: Db, studentId: string, body: any) {
    const subjects: Record<string, number> = {};
    for (const [k, v] of Object.entries(body?.subjects || {})) {
        if (v === '' || v === null || v === undefined) continue;
        const n = Number(v); if (!Number.isFinite(n)) continue;
        subjects[subjectKey(k)] = Math.max(0, Math.min(100, Math.round(n)));
    }
    const meanMarks = body?.meanMarks === '' || body?.meanMarks === null || body?.meanMarks === undefined ? null : Math.max(0, Math.min(100, Math.round(Number(body.meanMarks)) || 0));
    await db.collection('student_targets').updateOne({ studentId }, { $set: { studentId, subjects, meanMarks, updatedAt: new Date() } }, { upsert: true });
    return { subjects, meanMarks };
}

export const validStudentId = (id: string) => { try { return !!new ObjectId(id) && id.length === 24; } catch { return false; } };
