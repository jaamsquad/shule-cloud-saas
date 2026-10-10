// Report-card arithmetic shared by the printed class report cards (Exams → Class Report
// Cards) and the student & parent portals, so both show the same totals and grades.
// The server keeps an identical copy in backend/src/lib/reportCardCalc.ts (it signs the
// QR from these numbers); scripts/check-report-calc.ts checks the two agree.

export interface GradeBand { grade: string; min: number; max: number; label?: string; color?: string }

/** The school's grading scale: curriculum settings first, else the grading criteria. */
export function gradingFrom(curriculumSettings: any, gradingConfig: any): { scale: GradeBand[]; passMark: number } {
    let scale: GradeBand[] = [];
    if (curriculumSettings?.gradingScale?.length) scale = curriculumSettings.gradingScale;
    else if (gradingConfig?.grades?.length) scale = gradingConfig.grades.map((g: any) => ({ grade: g.grade, min: g.from, max: g.upto, label: g.status, color: g.color }));
    const passMark: number = curriculumSettings?.passMark ?? gradingConfig?.passmark ?? 50;
    return { scale, passMark };
}

const band = (scale: GradeBand[], pct: number) => [...scale].sort((a, b) => b.min - a.min).find(g => pct >= g.min && pct <= g.max);

export function gradeFor(scale: GradeBand[], pct: number): string {
    if (scale.length) { const s = band(scale, pct); if (s) return s.grade; }
    if (pct >= 80) return "A"; if (pct >= 70) return "B+"; if (pct >= 60) return "B";
    if (pct >= 50) return "C+"; if (pct >= 40) return "C"; if (pct >= 33) return "D"; return "F";
}
export function statusFor(scale: GradeBand[], passMark: number, pct: number): string {
    if (scale.length) { const s = band(scale, pct); if (s?.label) return s.label; }
    return pct >= passMark ? "Pass" : "Fail";
}
export function colorFor(scale: GradeBand[], passMark: number, pct: number): string {
    if (scale.length) { const s = band(scale, pct); if (s?.color) return s.color; }
    return pct >= passMark ? "#10B981" : "#EF4444";
}

/** Subject names from a student's `subjects` field (strings or {name|subjectName}). */
export const subjectNamesOf = (subjects: any): string[] =>
    Array.isArray(subjects) ? subjects.map((s: any) => (typeof s === "string" ? s : s?.name || s?.subjectName || "").trim()).filter(Boolean) : [];

export interface StudentSummary {
    obtained: number; maxAll: number; maxScored: number; pct: number; grade: string; status: string;
    totalSubjects: number; scoredSubjects: number; ownSubjectNames: string[];
    /** marks in report order — one per subject, `noMarks` where nothing was entered */
    marks: any[];
}

/** One learner's totals for one exam — exactly how the printed report card computes them. */
export function summariseStudent(o: {
    studentMarks: any[]; ownSubjects: any; classSubjectNames: string[];
    missingMarkPolicy?: string; scale: GradeBand[]; passMark: number;
}): StudentSummary {
    const { studentMarks, scale, passMark } = o;
    const policy = o.missingMarkPolicy === "count_as_zero" ? "count_as_zero" : "skip";
    const own = subjectNamesOf(o.ownSubjects);
    const ownSubjectNames = own.length > 0 ? own : o.classSubjectNames;
    const marksMap = new Map(studentMarks.map((m: any) => [(m.subjectName || "").toLowerCase(), m]));

    let obtained = 0, maxForCalc = 0;
    if (policy === "count_as_zero" && ownSubjectNames.length > 0) {
        ownSubjectNames.forEach(name => {
            const m: any = marksMap.get(name.toLowerCase());
            obtained += m ? Number(m.marksObtained) || 0 : 0;
            maxForCalc += m ? Number(m.totalMarks) || 100 : 100;
        });
    } else {
        obtained = studentMarks.reduce((sum: number, m: any) => sum + (Number(m.marksObtained) || 0), 0);
        maxForCalc = studentMarks.reduce((sum: number, m: any) => sum + (Number(m.totalMarks) || 100), 0);
    }
    const maxScored = studentMarks.reduce((sum: number, m: any) => sum + (Number(m.totalMarks) || 100), 0);
    const totalSubjects = Math.max(ownSubjectNames.length, studentMarks.length);
    const maxAll = (policy === "count_as_zero" ? maxForCalc : totalSubjects * 100) || maxScored;
    const pct = maxForCalc > 0 ? Math.round((obtained / maxForCalc) * 100) : 0;

    const marks = ownSubjectNames.map(name => {
        const m = studentMarks.find((mk: any) => (mk.subjectName || "").toLowerCase() === name.toLowerCase());
        return m ? { ...m } : { subjectName: name, marksObtained: null, totalMarks: 100, noMarks: true };
    });
    if (marks.length === 0) marks.push(...studentMarks);

    return { obtained, maxAll, maxScored, pct, grade: gradeFor(scale, pct), status: statusFor(scale, passMark, pct), totalSubjects, scoredSubjects: studentMarks.length, ownSubjectNames, marks };
}

/** Per-subject class average and topper (as %), keyed by lower-case subject name. */
export function classStatsOf(marks: any[]): Record<string, { avg: number; top: number }> {
    const acc: Record<string, number[]> = {};
    marks.forEach((m: any) => {
        const t = Number(m.totalMarks) || 0; if (!t || m.marksObtained == null || m.marksObtained === "") return;
        (acc[(m.subjectName || "").toLowerCase()] ||= []).push((Number(m.marksObtained) / t) * 100);
    });
    const out: Record<string, { avg: number; top: number }> = {};
    Object.entries(acc).forEach(([k, v]) => { out[k] = { avg: v.reduce((a, b) => a + b, 0) / v.length, top: Math.max(...v) }; });
    return out;
}
