// Exam naming convention — backend mirror of frontend/src/lib/examName.ts.
// [FORM] [STREAM] [TERM] [EXAM TYPE] EXAM ([YEAR]) — e.g. FORM 4 EAST TERM 2 END TERM EXAM (2026)

export const EXAM_TYPES = ['CAT 1', 'CAT 2', 'End Term', 'Test Exam', 'Trial', 'Series 1', 'Series 2'];

const up = (s: any) => String(s ?? '').trim().toUpperCase();

function fmtTerm(term: any): string {
    const s = String(term ?? '').trim();
    if (!s) return '';
    const m = s.match(/(\d+)/);
    return m ? `TERM ${m[1]}` : up(s);
}

function fmtType(t: any): string {
    const s = up(t).replace(/\s+EXAM$/, '');
    return s ? `${s} EXAM` : 'EXAM';
}

function fmtClass(cls: any): string {
    if (!cls) return '';
    if (typeof cls === 'string') return up(cls);
    const name = cls.name || cls.className || cls.studentClass || '';
    const stream = cls.stream || cls.streamName || '';
    const combined = stream && !up(name).includes(up(stream)) ? `${name} ${stream}` : name;
    return up(combined);
}

export interface ExamLike {
    examName?: string; name?: string; examType?: string; type?: string;
    term?: string; termName?: string; academicYear?: string | number; year?: string | number;
}

export function formatExamName(exam: (ExamLike & Record<string, any>) | any, cls?: any): string {
    if (!exam) return '';
    const form = fmtClass(cls);
    const term = fmtTerm(exam.term ?? exam.termName);
    const type = fmtType(exam.examType ?? exam.type ?? exam.examName ?? exam.name ?? '');
    const year = String(exam.academicYear ?? exam.year ?? '').trim();
    const parts = [form, term, type].filter(Boolean).join(' ');
    return year ? `${parts} (${year})` : parts;
}

export function formatExamTitle(exam: ExamLike | null | undefined): string {
    return formatExamName(exam, undefined);
}
