/**
 * The report card a learner or parent sees in their portal — built from the same data and
 * the same maths (lib/reportCardCalc) as the printed class report cards, so the two match:
 * the school's chosen template, grading scale, class averages, signature/stamp, and a
 * signed "scan to verify" QR link computed here (never from numbers the browser sends).
 * Schools on the ScholarSheet template get the ScholarSheet payload instead.
 * Other learners' marks never leave the server — only per-subject class averages.
 */
import type { Request } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from './mongodb';
import { signToken, publicAppUrl } from './verifyDocs';
import { gradingFrom, summariseStudent, classStatsOf, subjectNamesOf } from './reportCardCalc';
import { onlyPublished } from './examPublish';
import { resolveGrading } from './grading';

const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const idForms = (v: any) => { const s = String(v ?? ''); const o = oid(s); return o ? [s, o] : [s]; };

export async function printableReports(db: Db, req: Request, sid: string, examIds: string[]) {
    const tid = (req as any).tenantContext?.tenantId;
    const tenant: any = tid ? await getMetaDb().collection('Tenant').findOne({ _id: oid(tid) as any }).catch(() => null) : null;
    const curriculumSettings = await db.collection('curriculum_settings').findOne({}).catch(() => null);
    const gradingConfig = await db.collection('grading_criteria').findOne({}).catch(() => null);
    const { scale: legacyScale, passMark } = gradingFrom(curriculumSettings, gradingConfig);

    const student: any = await db.collection('students').findOne({ _id: oid(sid) as any }).catch(() => null);
    if (!student) return null;
    // The learner's CLASS grading (template → class criteria → global → curriculum → default),
    // in the report-card shape. Bands are made contiguous so every whole % lands in one.
    const resolved = await resolveGrading(db, student.classId ? String(student.classId) : undefined, String(student.studentClass || student.currentClass || '') || undefined);
    const colorOf = (g: string) => (legacyScale.find((b: any) => b.grade === g) as any)?.color;
    const scale = resolved.scale.map((b, i, arr) => ({
        grade: b.grade,
        min: i === arr.length - 1 ? Math.min(b.from, 0) : b.from,
        max: i === 0 ? Math.max(b.upto, 100) : Math.max(b.upto, arr[i - 1].from - 1),
        label: b.remark || undefined,
        ...(colorOf(b.grade) ? { color: colorOf(b.grade) } : {}),
    }));
    const templateId = String(tenant?.reportTemplate || 'annual_exam');
    const school = {
        name: tenant?.name || tenant?.instituteName || 'School',
        logo: tenant?.logo || tenant?.logoUrl || '',
        tagline: tenant?.tagline || tenant?.targetLine || '',
        address: [tenant?.address || tenant?.location, tenant?.city || tenant?.county, tenant?.phone].filter(Boolean).join(' · '),
        signature: tenant?.principalSignature || '', stamp: tenant?.schoolStamp || '', signerName: tenant?.principalName || '',
    };

    const classNameRaw = student.studentClass || student.currentClass || '';
    const current: any = await db.collection('periods').findOne({ isCurrent: true }).catch(() => null)
        || await db.collection('periods').findOne({}).catch(() => null);
    const slug = String((req as any).tenantContext?.tenantSubdomain || '').toLowerCase();
    const studentName = student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || '—';
    const admNo = student.admissionNumber || student.admNo || student.registrationNo || '—';

    // The learner's class, classmates and the class's subjects, resolved PER EXAM from
    // exam_marks.classAtTime/classIdAtTime — the class the student was actually in when
    // they sat THAT exam — not their current class. Otherwise a promoted student's old
    // exam (e.g. sat in Form 3) would render under their new class (Form 4): wrong subjects,
    // wrong classmates for the class average, wrong class name on the card. Cached by class
    // key so repeat exams for the same historical class don't re-query.
    const classCache = new Map<string, { className: string; rosterIds: Set<string>; subjectNames: string[] }>();
    async function resolveClassFor(classAtTime: string, classIdAtTime: string) {
        const key = `${classIdAtTime}|${classAtTime}`;
        if (classCache.has(key)) return classCache.get(key)!;
        const nameRaw = classAtTime || classNameRaw;
        const idRaw = classIdAtTime || student.classId;
        const cls: any = (idRaw && await db.collection('classes').findOne({ _id: (oid(idRaw) || idRaw) as any }).catch(() => null))
            || (nameRaw && await db.collection('classes').findOne({ $or: [{ levelName: nameRaw }, { name: nameRaw }] }).catch(() => null)) || null;
        const className = cls?.levelName || cls?.name || nameRaw || '—';
        const rosterQ: any[] = [];
        if (cls?._id) rosterQ.push({ classId: String(cls._id) }, { classId: cls._id });
        if (className && className !== '—') rosterQ.push({ studentClass: className });
        const roster: any[] = rosterQ.length ? await db.collection('students').find({ $or: rosterQ }, { projection: { _id: 1, subjects: 1, studentName: 1 } }).toArray().catch(() => []) : [];
        const rosterIds = new Set(roster.map(r => String(r._id)));
        rosterIds.add(String(student._id));
        let subjectNames: string[] = subjectNamesOf(roster.find(r => subjectNamesOf(r.subjects).length)?.subjects);
        if (!subjectNames.length && Array.isArray(cls?.subjects) && cls.subjects.length) subjectNames = cls.subjects.map((s: any) => s.subjectName || s.name).filter(Boolean);
        if (!subjectNames.length && className !== '—') {
            const subs = await db.collection('subjects').find({ className }).toArray().catch(() => []);
            subjectNames = subs.map((s: any) => s.name || s.subjectName).filter(Boolean);
        }
        const result = { className, rosterIds, subjectNames };
        classCache.set(key, result);
        return result;
    }

    const exams: Record<string, any> = {};
    for (const examId of examIds) {
        const exam: any = await db.collection('exams').findOne({ _id: (oid(examId) || examId) as any }).catch(() => null);
        const allMarks: any[] = await onlyPublished(db, await db.collection('exam_marks').find({ examId: { $in: idForms(examId) } }).toArray().catch(() => []));
        const studentMarks = allMarks.filter(m => String(m.studentId) === String(student._id) || (!m.studentId && m.studentName === studentName));
        if (!studentMarks.length) continue;
        const classAtTime = studentMarks.find(m => m.classAtTime)?.classAtTime || '';
        const classIdAtTime = studentMarks.find(m => m.classIdAtTime)?.classIdAtTime || '';
        const { className, rosterIds, subjectNames: classSubjectNames } = await resolveClassFor(classAtTime, classIdAtTime);
        const subjectNames = classSubjectNames.length ? classSubjectNames : [...new Set(allMarks.map(m => m.subjectName).filter(Boolean))] as string[];
        const sum = summariseStudent({ studentMarks, ownSubjects: student.subjects, classSubjectNames: subjectNames, missingMarkPolicy: exam?.missingMarkPolicy, scale, passMark });
        const classStats = classStatsOf(allMarks.filter(m => rosterIds.has(String(m.studentId))));

        const term = String(exam?.term || current?.label || '');
        const year = String(exam?.academicYear || current?.academicYear || '');
        const examName = exam?.examName || exam?.name || studentMarks[0]?.examName || 'Exam';
        const token = signToken({ s: String(student._id), n: studentName, r: student.registrationNo || '', c: className, t: term, y: year, e: examName, a: sum.pct, g: sum.grade, at: Date.now() });

        exams[examId] = {
            templateId, school, className,
            student: { name: studentName, admNo, photo: student.studentPhoto || student.photo || student.avatar || student.photoUrl || student.profilePhoto || null },
            periodLabel: exam?.term ? `${exam.term}${exam.academicYear ? ` · ${exam.academicYear}` : ''}` : (current ? `${current.label} · ${current.academicYear}` : exam?.academicYear || '—'),
            examName,
            examDate: exam?.startDate ? new Date(exam.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—',
            marks: sum.marks, totalMax: sum.maxAll, totalObtained: sum.obtained,
            overall: sum.pct, overallGrade: sum.grade, overallStatus: sum.status,
            gradingScale: scale, passMark, classStats,
            verifyUrl: `${publicAppUrl()}/${slug}/report/verify/online/${token}`,
        };
    }
    return { templateId, exams };
}
