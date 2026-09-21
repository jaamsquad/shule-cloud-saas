/**
 * Yearly (annual) report: every subject's result for Term 1, Term 2 and Term 3 side by side, and the average for
 * the whole year. It can only be made once the year has reached Term 3 (or the year is over).
 *
 * A term's result for a subject is the average % over that term's exams. Where the class's report cards were
 * generated for the term, those exams (and the marks frozen at generation) are used; otherwise every exam
 * tagged with that term and year.
 */
import { Db, ObjectId } from 'mongodb';
import { loadTerms, pickCurrent } from '../modules/cbc/cbcTerm';
import { canonicalStatus } from './studentStatus';

export const termNumberOf = (v: any): number => { const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; };
const norm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface YearlySubject { name: string; t: (number | null)[]; avg: number | null; grade: string }
export interface YearlyStudent {
    studentId: string; name: string; regNo: string; className: string; year: string;
    subjects: YearlySubject[]; termOverall: (number | null)[]; yearAvg: number | null; yearGrade: string;
}

/** May a yearly report be made for this year? (Term 3 of that year or later.) */
export async function yearlyStatus(db: Db, yearAsked?: string) {
    const terms = await loadTerms(db);
    const current = pickCurrent(terms);
    const year = String(yearAsked || current?.year || new Date().getFullYear());
    const years = Array.from(new Set(terms.map(t => t.year).filter(Boolean))).sort().reverse();
    if (!terms.length) return { allowed: true, year, years, current: null, reason: '' };
    const cur = current ? { term: current.term, year: current.year, label: current.label } : null;
    const allowed = !!current && ((current.year === year && termNumberOf(current.term) >= 3) || current.year > year);
    return {
        allowed, year, years, current: cur,
        reason: allowed ? '' : `The yearly report can only be made in Term 3 (or after the year ends). ${cur ? `Now: ${cur.label}.` : ''}`.trim(),
    };
}

async function gradeFn(db: Db) {
    const g: any = await db.collection('grading_criteria').findOne({}).catch(() => null);
    const grades: any[] = (g?.grades || []).map((x: any) => ({ grade: x.grade, from: Number(x.from), upto: Number(x.upto) })).filter((x: any) => x.grade && !isNaN(x.from));
    return (pct: number) => (grades.find(x => pct >= x.from && pct <= x.upto)?.grade) || (pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'E');
}

/** Active learners of a class (by class name, plus stream when one is chosen). */
export async function classStudents(db: Db, opts: { className: string; streamId?: string | null }): Promise<any[]> {
    const rx = new RegExp(`^\\s*${String(opts.className).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\s*$`, 'i');
    const rows: any[] = await db.collection('students').find({ $or: [{ studentClass: rx }, { currentClass: rx }, ...(opts.streamId ? [{ streamId: String(opts.streamId) }] : [])] }).toArray().catch(() => []);
    return rows.filter(s => canonicalStatus(s.status) === 'Active').sort((a, b) => String(a.studentName || '').localeCompare(String(b.studentName || '')));
}

export async function computeYearly(db: Db, students: any[], year: string): Promise<YearlyStudent[]> {
    if (!students.length) return [];
    const grade = await gradeFn(db);
    const exams: any[] = await db.collection('exams').find({}).toArray().catch(() => []);
    const gens: any[] = (await db.collection('report_card_generations').find({}).toArray().catch(() => []))
        .filter(g => g.kind !== 'yearly' && String(g.academicYear) === String(year));
    const inYear = (e: any) => { const y = String(e.academicYear ?? e.year ?? '').trim(); return !y || y.includes(year) || year.includes(y); };

    // which exams make up each term, per student
    const plan = students.map(s => {
        const cls = s.studentClass || s.currentClass || '';
        const stream = s.stream || s.streamName || '';
        const perTerm: string[][] = [1, 2, 3].map(t => {
            const gen = gens.find(g => termNumberOf(g.term) === t && (
                (g.streamId && String(g.streamId) === String(s.streamId)) || norm(g.className) === norm(cls) || norm(g.className) === norm(`${cls} ${stream}`)));
            if (gen) return [String(gen.mainExamId), ...((gen.additionalExamIds || []).map(String))].filter(Boolean);
            return exams.filter(e => termNumberOf(e.term ?? e.termName) === t && inYear(e)).map(e => String(e._id));
        });
        return { s, perTerm };
    });
    const allExamIds = Array.from(new Set(plan.flatMap(p => p.perTerm.flat())));
    const studentIds = students.map(s => String(s._id));
    const live: any[] = allExamIds.length ? await db.collection('exam_marks').find({ examId: { $in: allExamIds }, studentId: { $in: studentIds } }).toArray().catch(() => []) : [];

    // marks by student|exam|subject — the marks frozen at report-card generation win over live edits
    const key = (sid: string, eid: string, sub: string) => `${sid}|${eid}|${norm(sub)}`;
    const cell = new Map<string, { o: number; t: number; name: string }>();
    const put = (m: any) => { const sub = m.subjectName || m.subject; if (!sub) return; cell.set(key(String(m.studentId), String(m.examId), sub), { o: Number(m.marksObtained) || 0, t: Number(m.totalMarks) || 100, name: String(sub) }); };
    live.forEach(put);
    gens.forEach(g => (g.frozenMarks || []).forEach((m: any) => { if (studentIds.includes(String(m.studentId))) put(m); }));

    return plan.map(({ s, perTerm }) => {
        const sid = String(s._id);
        const names = new Map<string, string>();       // norm subject → display name
        const per: Record<string, (number | null)[]> = {};
        perTerm.forEach((ids, ti) => {
            const acc: Record<string, number[]> = {};
            ids.forEach(eid => cell.forEach((v, k) => {
                if (!k.startsWith(`${sid}|${eid}|`) || !v.t) return;
                const sub = k.split('|')[2]; names.set(sub, names.get(sub) || v.name);
                (acc[sub] ||= []).push((v.o / v.t) * 100);
            }));
            Object.entries(acc).forEach(([sub, arr]) => { (per[sub] ||= [null, null, null])[ti] = round1(arr.reduce((a, b) => a + b, 0) / arr.length); });
        });
        const subjects: YearlySubject[] = Object.entries(per).map(([sub, t]) => {
            const have = t.filter((x): x is number => x != null);
            const avg = have.length ? round1(have.reduce((a, b) => a + b, 0) / have.length) : null;
            return { name: names.get(sub) || sub, t, avg, grade: avg == null ? '' : grade(avg) };
        }).sort((a, b) => a.name.localeCompare(b.name));
        const termOverall = [0, 1, 2].map(i => { const v = subjects.map(x => x.t[i]).filter((x): x is number => x != null); return v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null; });
        const have = termOverall.filter((x): x is number => x != null);
        const yearAvg = have.length ? round1(have.reduce((a, b) => a + b, 0) / have.length) : null;
        return { studentId: sid, name: String(s.studentName || s.name || ''), regNo: String(s.registrationNo || s.admNo || ''), className: String(s.studentClass || s.currentClass || ''), year, subjects, termOverall, yearAvg, yearGrade: yearAvg == null ? '' : grade(yearAvg) };
    });
}

/** Stored (frozen) yearly snapshots win; anyone not covered is computed from the marks now. */
export async function yearlyFor(db: Db, students: any[], year: string): Promise<Map<string, YearlyStudent>> {
    const out = new Map<string, YearlyStudent>();
    const stored: any[] = (await db.collection('report_card_generations').find({ kind: 'yearly' }).toArray().catch(() => [])).filter(g => String(g.academicYear) === String(year));
    stored.forEach(g => (g.yearly?.students || []).forEach((y: YearlyStudent) => out.set(String(y.studentId), y)));
    const missing = students.filter(s => !out.has(String(s._id)));
    (await computeYearly(db, missing, year)).forEach(y => out.set(y.studentId, y));
    return out;
}

/** The yearly figures as a neat plain-text table. */
export function yearlyText(y: YearlyStudent): string {
    const w = Math.max(10, ...y.subjects.map(s => s.name.length));
    const f = (v: number | null) => (v == null ? '-' : `${v}%`).padStart(7);
    const line = '-'.repeat(w + 42);
    return [
        `${y.year} ANNUAL REPORT`, `Student: ${y.name}${y.regNo ? ` (${y.regNo})` : ''}`, y.className ? `Class: ${y.className}` : '', line,
        `${'Subject'.padEnd(w)}  ${'Term 1'.padStart(7)}${'Term 2'.padStart(8)}${'Term 3'.padStart(8)}  ${'Year'.padStart(7)}  Grade`, line,
        ...y.subjects.map(s => `${s.name.padEnd(w)}  ${f(s.t[0])} ${f(s.t[1])} ${f(s.t[2])}  ${f(s.avg)}  ${s.grade}`),
        line, `${'OVERALL'.padEnd(w)}  ${f(y.termOverall[0])} ${f(y.termOverall[1])} ${f(y.termOverall[2])}  ${f(y.yearAvg)}  ${y.yearGrade}`,
    ].filter((l, i) => l !== '' || i > 2).join('\n');
}

export const isYearlyKey = (k: string) => /^Y\d{4}$/.test(k);
export { ObjectId };
