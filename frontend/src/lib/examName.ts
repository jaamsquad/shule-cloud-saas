// ─── Exam naming convention (CRITICAL) ─────────────────────────────────────────
// Every exam renders as:  [FORM] [STREAM] [TERM] [EXAM TYPE] EXAM ([YEAR])
// e.g.  FORM 4 EAST TERM 2 END TERM EXAM (2026)
// The same exam, assigned to many classes, substitutes the correct class/stream.
//
// Use formatExamName() everywhere an exam is shown — headers, dropdowns, lists,
// report cards, inbox. Never print a raw examName.

export const EXAM_TYPES = ["CAT 1", "CAT 2", "End Term", "Test Exam", "Trial", "Series 1", "Series 2"] as const;
export type ExamType = typeof EXAM_TYPES[number];

const up = (s: any) => String(s ?? "").trim().toUpperCase();

// "Term 2" / "2" / "term2" → "TERM 2"
function fmtTerm(term: any): string {
    const s = String(term ?? "").trim();
    if (!s) return "";
    const m = s.match(/(\d+)/);
    return m ? `TERM ${m[1]}` : up(s);
}

// Exam type → uppercase, with trailing "EXAM". "End Term" → "END TERM EXAM".
function fmtType(t: any): string {
    const s = up(t).replace(/\s+EXAM$/, "");
    return s ? `${s} EXAM` : "EXAM";
}

// Class/stream label, e.g. "Form 4 East" / "Grade 7 Blue" → "FORM 4 EAST".
function fmtClass(cls: any): string {
    if (!cls) return "";
    if (typeof cls === "string") return up(cls);
    const name = cls.name || cls.className || cls.studentClass || "";
    const stream = cls.stream || cls.streamName || "";
    // If the class name already contains the stream, don't double it.
    const combined = stream && !up(name).includes(up(stream)) ? `${name} ${stream}` : name;
    return up(combined);
}

export interface ExamLike {
    examName?: string; name?: string;
    examType?: string; type?: string;
    term?: string; termName?: string;
    academicYear?: string | number; year?: string | number;
}

/**
 * Full formatted exam title for a given class/stream.
 * If examType is missing we fall back to the stored examName as the "type"
 * portion so legacy exams still render a sensible title.
 */
export function formatExamName(exam: ExamLike | null | undefined, cls?: any): string {
    if (!exam) return "";
    const form = fmtClass(cls);
    const term = fmtTerm(exam.term ?? exam.termName);
    const typeRaw = exam.examType ?? exam.type ?? exam.examName ?? exam.name ?? "";
    const type = fmtType(typeRaw);
    const year = String(exam.academicYear ?? exam.year ?? "").trim();
    const parts = [form, term, type].filter(Boolean).join(" ");
    return year ? `${parts} (${year})` : parts;
}

/** Title without a class (for exam-level lists/selectors): TERM 2 END TERM EXAM (2026). */
export function formatExamTitle(exam: ExamLike | null | undefined): string {
    return formatExamName(exam, undefined);
}
