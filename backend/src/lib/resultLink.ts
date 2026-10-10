/**
 * "Check the result online" links that go to parents:
 *
 *     <site>/<school>/result/<exam code>/<result id>/<student id>
 *
 * The result id is a signature over school + exam + student, so a link only works for the
 * student and exam it was made for and cannot be guessed or edited to see someone else's marks.
 * Nothing is stored — the link can always be rebuilt (and is checked) from the three parts.
 */
import crypto from 'crypto';
import { Db, ObjectId } from 'mongodb';
import { publicAppUrl } from './verifyDocs';
import { formatExamName } from './examName';
import { onlyPublished } from './examPublish';

const secret = () => process.env.DOC_VERIFY_SECRET || process.env.JWT_SECRET || 'shulecloud_doc_verify_secret';

/** Short, readable code for an exam: the last 6 characters of its id. */
export const examCodeOf = (examId: string) => /^Y\d{4}$/.test(String(examId)) ? String(examId) : String(examId).slice(-6).toUpperCase();   // Y2027 = the whole-year report

export const resultSig = (slug: string, examId: string, studentId: string) =>
    crypto.createHmac('sha256', secret()).update(`result|${String(slug).toLowerCase()}|${examId}|${studentId}`).digest('base64url').slice(0, 20);

export const resultUrl = (slug: string, examId: string, studentId: string) =>
    `${publicAppUrl()}/${String(slug).toLowerCase()}/result/${examCodeOf(examId)}/${resultSig(slug, examId, studentId)}/${studentId}`;

export function sigMatches(slug: string, examId: string, studentId: string, given: string) {
    const good = resultSig(slug, examId, studentId);
    return given.length === good.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(good));
}

/** The exam whose id ends with this code (exams are few, so a scan is fine). */
export async function findExamByCode(db: Db, code: string): Promise<any | null> {
    const want = String(code).toUpperCase();
    if (!/^[A-F0-9]{6}$/.test(want)) return null;
    const rows = await db.collection('exams').find({}, { projection: { _id: 1 } }).toArray().catch(() => []);
    const hit = rows.find((r: any) => String(r._id).toUpperCase().endsWith(want));
    return hit ? db.collection('exams').findOne({ _id: hit._id }) : null;
}

// Grade for a percentage from the school's grading criteria (falls back to a plain A–E scale).
async function gradeFn(db: Db) {
    const g: any = await db.collection('grading_criteria').findOne({}).catch(() => null);
    const grades: any[] = (g?.grades || []).map((x: any) => ({ grade: x.grade, from: Number(x.from), upto: Number(x.upto) })).filter((x: any) => x.grade && !isNaN(x.from));
    return (pct: number) => {
        const hit = grades.find(x => pct >= x.from && pct <= x.upto);
        if (hit) return hit.grade;
        return pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'E';
    };
}

/** One student's results for one exam, ready to show. Returns null when there are no marks. */
export async function resultSnapshot(db: Db, examId: string, studentId: string) {
    let sOid: ObjectId, eOid: ObjectId;
    try { sOid = new ObjectId(studentId); eOid = new ObjectId(examId); } catch { return null; }
    const [marks, exam, student, grade] = await Promise.all([
        db.collection('exam_marks').find({ examId, studentId }).toArray().catch(() => []).then(m => onlyPublished(db, m)),
        db.collection('exams').findOne({ _id: eOid }).catch(() => null) as Promise<any>,
        db.collection('students').findOne({ _id: sOid }).catch(() => null) as Promise<any>,
        gradeFn(db),
    ]);
    if (!student || !exam || !marks.length) return null;
    const subjects = marks.map((m: any) => {
        const outOf = Number(m.totalMarks) || 100, score = Number(m.marksObtained) || 0, pct = outOf ? Math.round((score / outOf) * 100) : 0;
        return { name: m.subjectName || m.subject || '', marks: score, outOf, pct, grade: grade(pct) };
    });
    const total = subjects.reduce((a, s) => a + s.marks, 0), totalMax = subjects.reduce((a, s) => a + s.outOf, 0);
    const meanPct = totalMax ? Math.round((total / totalMax) * 100) : 0;
    const className = String(student.studentClass || student.currentClass || '');
    return {
        studentName: String(student.studentName || student.name || ''), registrationNo: String(student.registrationNo || student.admNo || ''), className,
        examTitle: formatExamName(exam, `${className} ${student.stream || ''}`.trim()), term: String(exam.term || ''), year: String(exam.academicYear || exam.year || ''),
        subjects, total, totalMax, meanPct, meanGrade: grade(meanPct),
    };
}

/** The same results as a neat plain-text block (SMS-free; used for the "plain text" email). */
export function resultText(r: NonNullable<Awaited<ReturnType<typeof resultSnapshot>>>) {
    const w = Math.max(10, ...r.subjects.map(s => s.name.length));
    const line = '-'.repeat(w + 26);
    return [
        `${r.examTitle}`, `Student: ${r.studentName}${r.registrationNo ? ` (${r.registrationNo})` : ''}`, r.className ? `Class: ${r.className}` : '', line,
        `${'Subject'.padEnd(w)}  ${'Marks'.padStart(9)}  ${'%'.padStart(4)}  Grade`, line,
        ...r.subjects.map(s => `${s.name.padEnd(w)}  ${`${s.marks}/${s.outOf}`.padStart(9)}  ${String(s.pct).padStart(4)}  ${s.grade}`),
        line, `${'TOTAL'.padEnd(w)}  ${`${r.total}/${r.totalMax}`.padStart(9)}  ${String(r.meanPct).padStart(4)}  ${r.meanGrade}`,
    ].filter((l, i) => l !== '' || i > 2).join('\n');
}
