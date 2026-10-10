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

const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const idForms = (v: any) => { const s = String(v ?? ''); const o = oid(s); return o ? [s, o] : [s]; };

export async function printableReports(db: Db, req: Request, sid: string, examIds: string[]) {
    const tid = (req as any).tenantContext?.tenantId;
    const tenant: any = tid ? await getMetaDb().collection('Tenant').findOne({ _id: oid(tid) as any }).catch(() => null) : null;
    const curriculumSettings = await db.collection('curriculum_settings').findOne({}).catch(() => null);
    const gradingConfig = await db.collection('grading_criteria').findOne({}).catch(() => null);
    const { scale, passMark } = gradingFrom(curriculumSettings, gradingConfig);

    const student: any = await db.collection('students').findOne({ _id: oid(sid) as any }).catch(() => null);
    if (!student) return null;
    const templateId = String(tenant?.reportTemplate || 'annual_exam');
    const school = {
        name: tenant?.name || tenant?.instituteName || 'School',
        logo: tenant?.logo || tenant?.logoUrl || '',
        tagline: tenant?.tagline || tenant?.targetLine || '',
        address: [tenant?.address || tenant?.location, tenant?.city || tenant?.county, tenant?.phone].filter(Boolean).join(' · '),
        signature: tenant?.principalSignature || '', stamp: tenant?.schoolStamp || '', signerName: tenant?.principalName || '',
    };

    // the learner's class, classmates and the class's subjects — as the class report page resolves them
    const classNameRaw = student.studentClass || student.currentClass || '';
    const cls: any = (student.classId && await db.collection('classes').findOne({ _id: (oid(student.classId) || student.classId) as any }).catch(() => null))
        || (classNameRaw && await db.collection('classes').findOne({ $or: [{ levelName: classNameRaw }, { name: classNameRaw }] }).catch(() => null)) || null;
    const className = cls?.levelName || cls?.name || classNameRaw || '—';
    const rosterQ: any[] = [];
    if (cls?._id) rosterQ.push({ classId: String(cls._id) }, { classId: cls._id });
    if (className && className !== '—') rosterQ.push({ studentClass: className });
    const roster: any[] = rosterQ.length ? await db.collection('students').find({ $or: rosterQ }, { projection: { _id: 1, subjects: 1, studentName: 1 } }).toArray().catch(() => []) : [];
    const rosterIds = new Set(roster.map(r => String(r._id)));
    rosterIds.add(String(student._id));

    let classSubjectNames: string[] = subjectNamesOf(roster.find(r => subjectNamesOf(r.subjects).length)?.subjects);
    if (!classSubjectNames.length && Array.isArray(cls?.subjects) && cls.subjects.length) {
        classSubjectNames = cls.subjects.map((s: any) => s.subjectName || s.name).filter(Boolean);
    }
    if (!classSubjectNames.length && className !== '—') {
        const subs = await db.collection('subjects').find({ className }).toArray().catch(() => []);
        classSubjectNames = subs.map((s: any) => s.name || s.subjectName).filter(Boolean);
    }

    const current: any = await db.collection('periods').findOne({ isCurrent: true }).catch(() => null)
        || await db.collection('periods').findOne({}).catch(() => null);
    const slug = String((req as any).tenantContext?.tenantSubdomain || '').toLowerCase();
    const studentName = student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || '—';
    const admNo = student.admissionNumber || student.admNo || student.registrationNo || '—';

    const exams: Record<string, any> = {};
    for (const examId of examIds) {
        const exam: any = await db.collection('exams').findOne({ _id: (oid(examId) || examId) as any }).catch(() => null);
        const allMarks: any[] = await onlyPublished(db, await db.collection('exam_marks').find({ examId: { $in: idForms(examId) } }).toArray().catch(() => []));
        const studentMarks = allMarks.filter(m => String(m.studentId) === String(student._id) || (!m.studentId && m.studentName === studentName));
        if (!studentMarks.length) continue;
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
