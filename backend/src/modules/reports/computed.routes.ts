/**
 * Computed reports — aggregations that a plain collection dump can't produce
 * (exam analysis, finance statements, enrolment/revenue trends, attendance %).
 *
 * Each endpoint returns a uniform shape the frontend ComputedReport renders:
 *   { title, cards?: {label,value}[], columns: {key,label,type?}[], rows: any[],
 *     chart?: { type:'bar'|'pie'|'line', data:{name,value}[] } }
 */
import { Router, Request } from 'express';
import { getMetaDb } from '../../lib/mongodb';

const router = Router();
const db = (req: Request) => (req as any).tenantDb || getMetaDb();
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
const gradeOf = (pct: number) => pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C+' : pct >= 40 ? 'C' : pct >= 33 ? 'D' : 'E';

// Real exam marks live in `exam_marks` (studentId/subjectId/subjectName/examId/
// marksObtained/totalMarks). They don't carry className, so enrich each mark with
// the student's class + name. Falls back to the legacy v2 collection if present.
const marks = async (req: Request) => {
    let all = await db(req).collection('exam_marks').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
    if (!all.length) all = await db(req).collection('student_exam_marks_v2').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
    if (!all.length) return all;

    // Build a studentId → {class, name} map once.
    const students = await db(req).collection('students').find({}, { projection: { studentName: 1, name: 1, firstName: 1, lastName: 1, studentClass: 1, className: 1, currentClass: 1 } }).toArray().catch(() => []);
    const byId: Record<string, any> = {};
    students.forEach((s: any) => { byId[String(s._id)] = s; });

    // Resolve exam names too (for the exam-comparison report).
    const exams = await db(req).collection('exams').find({}, { projection: { examName: 1, name: 1 } }).toArray().catch(() => []);
    const examName: Record<string, string> = {};
    exams.forEach((e: any) => { examName[String(e._id)] = e.examName || e.name || 'Exam'; });

    return all.map((m: any) => {
        const s = byId[String(m.studentId)] || {};
        return {
            ...m,
            className: m.className || s.studentClass || s.className || s.currentClass || 'Unknown',
            studentName: m.studentName || s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
            examName: m.examName || examName[String(m.examId)] || 'Exam',
        };
    });
};

// ── Academic ──────────────────────────────────────────────────────────────────
router.get('/reports/computed/subject-performance', async (req, res) => {
    try {
        const all = await marks(req);
        const bySub: Record<string, { sum: number; n: number }> = {};
        all.forEach((m: any) => { const k = m.subjectName || 'Unknown'; const pct = m.percentage ?? (num(m.totalMarks) ? num(m.marksObtained) / num(m.totalMarks) * 100 : 0); (bySub[k] ||= { sum: 0, n: 0 }); bySub[k].sum += pct; bySub[k].n++; });
        const rows = Object.entries(bySub).map(([subject, v]) => ({ subject, average: Math.round(v.sum / v.n * 10) / 10, entries: v.n, grade: gradeOf(v.sum / v.n) })).sort((a, b) => b.average - a.average);
        res.json({ title: 'Subject Performance', columns: [{ key: 'subject', label: 'Subject' }, { key: 'average', label: 'Mean %' }, { key: 'grade', label: 'Grade' }, { key: 'entries', label: 'Entries' }], rows, chart: { type: 'bar', data: rows.map(r => ({ name: r.subject, value: r.average })) } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/class-performance', async (req, res) => {
    try {
        const all = await marks(req);
        const byClass: Record<string, { sum: number; n: number }> = {};
        all.forEach((m: any) => { const k = m.className || 'Unknown'; const pct = m.percentage ?? (num(m.totalMarks) ? num(m.marksObtained) / num(m.totalMarks) * 100 : 0); (byClass[k] ||= { sum: 0, n: 0 }); byClass[k].sum += pct; byClass[k].n++; });
        const rows = Object.entries(byClass).map(([cls, v]) => ({ class: cls, mean: Math.round(v.sum / v.n * 10) / 10, grade: gradeOf(v.sum / v.n), entries: v.n })).sort((a, b) => b.mean - a.mean);
        res.json({ title: 'Class Performance', columns: [{ key: 'class', label: 'Class' }, { key: 'mean', label: 'Mean %' }, { key: 'grade', label: 'Grade' }, { key: 'entries', label: 'Entries' }], rows, chart: { type: 'bar', data: rows.map(r => ({ name: r.class, value: r.mean })) } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/grade-distribution', async (req, res) => {
    try {
        const all = await marks(req);
        const dist: Record<string, number> = { A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, D: 0, E: 0 };
        all.forEach((m: any) => { const pct = m.percentage ?? (num(m.totalMarks) ? num(m.marksObtained) / num(m.totalMarks) * 100 : 0); dist[m.grade || gradeOf(pct)] = (dist[m.grade || gradeOf(pct)] || 0) + 1; });
        const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
        const rows = Object.entries(dist).map(([grade, count]) => ({ grade, count, percent: `${Math.round(count / total * 100)}%` }));
        res.json({ title: 'Grade Distribution', cards: [{ label: 'Total Entries', value: total }], columns: [{ key: 'grade', label: 'Grade' }, { key: 'count', label: 'Count' }, { key: 'percent', label: 'Share' }], rows, chart: { type: 'pie', data: rows.map(r => ({ name: r.grade, value: r.count })) } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/mark-sheets', async (req, res) => {
    try {
        const all = await marks(req);
        const byStudent: Record<string, { name: string; cls: string; sum: number; out: number; subs: number }> = {};
        all.forEach((m: any) => { const k = m.studentId || m.studentName; (byStudent[k] ||= { name: m.studentName, cls: m.className || '', sum: 0, out: 0, subs: 0 }); byStudent[k].sum += num(m.marksObtained); byStudent[k].out += num(m.totalMarks); byStudent[k].subs++; });
        const rows = Object.values(byStudent).map(s => { const pct = s.out ? s.sum / s.out * 100 : 0; return { student: s.name, class: s.cls, subjects: s.subs, total: `${s.sum}/${s.out}`, mean: Math.round(pct * 10) / 10, grade: gradeOf(pct) }; }).sort((a, b) => b.mean - a.mean).map((r, i) => ({ position: i + 1, ...r }));
        res.json({ title: 'Mark Sheets', columns: [{ key: 'position', label: 'Pos' }, { key: 'student', label: 'Student' }, { key: 'class', label: 'Class' }, { key: 'subjects', label: 'Subjects' }, { key: 'total', label: 'Total' }, { key: 'mean', label: 'Mean %' }, { key: 'grade', label: 'Grade' }], rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/cbc-competency', async (req, res) => {
    try {
        const all = await marks(req);
        const LV = (pct: number) => pct >= 80 ? 'Exceeding (4)' : pct >= 60 ? 'Meeting (3)' : pct >= 40 ? 'Approaching (2)' : 'Below (1)';
        const byStudent: Record<string, { name: string; cls: string; sum: number; n: number }> = {};
        all.forEach((m: any) => { const k = m.studentId || m.studentName; const pct = m.percentage ?? (num(m.totalMarks) ? num(m.marksObtained) / num(m.totalMarks) * 100 : 0); (byStudent[k] ||= { name: m.studentName, cls: m.className || '', sum: 0, n: 0 }); byStudent[k].sum += pct; byStudent[k].n++; });
        const rows = Object.values(byStudent).map(s => { const avg = s.n ? s.sum / s.n : 0; return { student: s.name, class: s.cls, average: Math.round(avg * 10) / 10, competency: LV(avg) }; }).sort((a, b) => b.average - a.average);
        res.json({ title: 'CBC Competency Report', columns: [{ key: 'student', label: 'Learner' }, { key: 'class', label: 'Grade' }, { key: 'average', label: 'Mean %' }, { key: 'competency', label: 'Competency Level' }], rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/mean-score-trends', async (req, res) => {
    try {
        const all = await marks(req);
        const byExam: Record<string, { sum: number; n: number }> = {};
        all.forEach((m: any) => { const k = m.examName || m.examId || 'Exam'; const pct = m.percentage ?? (num(m.totalMarks) ? num(m.marksObtained) / num(m.totalMarks) * 100 : 0); (byExam[k] ||= { sum: 0, n: 0 }); byExam[k].sum += pct; byExam[k].n++; });
        const rows = Object.entries(byExam).map(([exam, v]) => ({ exam, mean: Math.round(v.sum / v.n * 10) / 10, grade: gradeOf(v.sum / v.n) }));
        res.json({ title: 'Mean Score Trends', columns: [{ key: 'exam', label: 'Exam' }, { key: 'mean', label: 'Mean %' }, { key: 'grade', label: 'Grade' }], rows, chart: { type: 'line', data: rows.map(r => ({ name: r.exam, value: r.mean })) } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Attendance % Summary ──────────────────────────────────────────────────────
router.get('/reports/computed/attendance-summary', async (req, res) => {
    try {
        // Student attendance is stored in `student_attendance` (studentId/classId/
        // status/date). Fall back to the legacy `attendance` collection if empty.
        let recs = await db(req).collection('student_attendance').find({}).toArray().catch(() => []);
        if (!recs.length) recs = await db(req).collection('attendance').find({}).toArray().catch(() => []);
        // Resolve class id → name and student → class for grouping.
        const classes = await db(req).collection('classes').find({}, { projection: { name: 1, levelName: 1, className: 1 } }).toArray().catch(() => []);
        const clsName: Record<string, string> = {};
        classes.forEach((c: any) => { clsName[String(c._id)] = c.name || c.levelName || c.className || ''; });
        const students = await db(req).collection('students').find({}, { projection: { studentClass: 1, className: 1, currentClass: 1 } }).toArray().catch(() => []);
        const stuClass: Record<string, string> = {};
        students.forEach((s: any) => { stuClass[String(s._id)] = s.studentClass || s.className || s.currentClass || ''; });
        const byClass: Record<string, { present: number; total: number }> = {};
        recs.forEach((r: any) => {
            const k = r.studentClass || r.className || clsName[String(r.classId)] || stuClass[String(r.studentId)] || 'Unknown';
            (byClass[k] ||= { present: 0, total: 0 }); byClass[k].total++; if (/present|late/i.test(String(r.status))) byClass[k].present++;
        });
        const rows = Object.entries(byClass).map(([cls, v]) => ({ class: cls, present: v.present, total: v.total, percent: v.total ? `${Math.round(v.present / v.total * 100)}%` : '0%' }));
        const totP = recs.filter((r: any) => /present|late/i.test(String(r.status))).length;
        res.json({ title: 'Attendance % Summary', cards: [{ label: 'Records', value: recs.length }, { label: 'Overall Present', value: recs.length ? `${Math.round(totP / recs.length * 100)}%` : '0%' }], columns: [{ key: 'class', label: 'Class' }, { key: 'present', label: 'Present' }, { key: 'total', label: 'Records' }, { key: 'percent', label: 'Attendance %' }], rows, chart: { type: 'bar', data: rows.map(r => ({ name: r.class, value: parseInt(r.percent) })) } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Finance ───────────────────────────────────────────────────────────────────
const financeTotals = async (req: Request) => {
    const [income, expenses, payments, invoices] = await Promise.all([
        db(req).collection('income').find({}).toArray().catch(() => []),
        db(req).collection('expenses').find({}).toArray().catch(() => []),
        db(req).collection('payments').find({}).toArray().catch(() => []),
        db(req).collection('invoices').find({}).toArray().catch(() => []),
    ]);
    const feeIncome = payments.reduce((s: number, p: any) => s + num(p.amount ?? p.paidAmount), 0);
    const otherIncome = income.reduce((s: number, i: any) => s + num(i.amount), 0);
    const totalExpense = expenses.reduce((s: number, e: any) => s + num(e.amount), 0);
    const outstanding = invoices.reduce((s: number, i: any) => s + num(i.balance ?? i.total_due), 0);
    return { feeIncome, otherIncome, totalIncome: feeIncome + otherIncome, totalExpense, outstanding, income, expenses };
};

router.get('/reports/computed/balance-sheet', async (req, res) => {
    try {
        const f = await financeTotals(req);
        const cashAtBank = f.totalIncome - f.totalExpense;
        const rows = [
            { section: 'ASSETS', item: 'Cash & Bank (net collections)', amount: ksh(cashAtBank) },
            { section: 'ASSETS', item: 'Fees Receivable (outstanding)', amount: ksh(f.outstanding) },
            { section: 'ASSETS', item: 'Total Assets', amount: ksh(cashAtBank + f.outstanding) },
            { section: 'INCOME', item: 'Fee Collections', amount: ksh(f.feeIncome) },
            { section: 'INCOME', item: 'Other Income', amount: ksh(f.otherIncome) },
            { section: 'EXPENSES', item: 'Total Expenses', amount: ksh(f.totalExpense) },
            { section: 'EQUITY', item: 'Net Surplus / (Deficit)', amount: ksh(f.totalIncome - f.totalExpense) },
        ];
        res.json({ title: 'Balance Sheet', cards: [{ label: 'Total Income', value: ksh(f.totalIncome) }, { label: 'Total Expenses', value: ksh(f.totalExpense) }, { label: 'Net Position', value: ksh(f.totalIncome - f.totalExpense) }], columns: [{ key: 'section', label: 'Section' }, { key: 'item', label: 'Item' }, { key: 'amount', label: 'Amount' }], rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/trial-balance', async (req, res) => {
    try {
        const f = await financeTotals(req);
        const byHead: Record<string, { debit: number; credit: number }> = {};
        f.income.forEach((i: any) => { const h = i.head || i.category || 'Income'; (byHead[h] ||= { debit: 0, credit: 0 }); byHead[h].credit += num(i.amount); });
        f.expenses.forEach((e: any) => { const h = e.head || e.category || 'Expense'; (byHead[h] ||= { debit: 0, credit: 0 }); byHead[h].debit += num(e.amount); });
        const rows = Object.entries(byHead).map(([account, v]) => ({ account, debit: v.debit ? ksh(v.debit) : '—', credit: v.credit ? ksh(v.credit) : '—' }));
        const totD = f.totalExpense, totC = f.totalIncome;
        rows.push({ account: 'TOTAL', debit: ksh(totD), credit: ksh(totC) });
        res.json({ title: 'Trial Balance', cards: [{ label: 'Total Debits', value: ksh(totD) }, { label: 'Total Credits', value: ksh(totC) }], columns: [{ key: 'account', label: 'Account' }, { key: 'debit', label: 'Debit' }, { key: 'credit', label: 'Credit' }], rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/revenue-overview', async (req, res) => {
    try {
        const payments = await db(req).collection('payments').find({}).toArray().catch(() => []);
        const byMonth: Record<string, number> = {};
        payments.forEach((p: any) => { const d = new Date(p.date || p.createdAt); if (isNaN(d.getTime())) return; const k = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); byMonth[k] = (byMonth[k] || 0) + num(p.amount ?? p.paidAmount); });
        const rows = Object.entries(byMonth).map(([month, amount]) => ({ month, amount: ksh(amount) }));
        const total = payments.reduce((s: number, p: any) => s + num(p.amount ?? p.paidAmount), 0);
        res.json({ title: 'Revenue Overview', cards: [{ label: 'Total Revenue', value: ksh(total) }, { label: 'Payments', value: payments.length }], columns: [{ key: 'month', label: 'Month' }, { key: 'amount', label: 'Revenue' }], rows, chart: { type: 'line', data: Object.entries(byMonth).map(([name, value]) => ({ name, value })) } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Management ────────────────────────────────────────────────────────────────
router.get('/reports/computed/enrollment-trends', async (req, res) => {
    try {
        const students = await db(req).collection('students').find({}).toArray().catch(() => []);
        const byYear: Record<string, number> = {};
        students.forEach((s: any) => { const d = new Date(s.admissionDate || s.createdAt); const k = isNaN(d.getTime()) ? 'Unknown' : String(d.getFullYear()); byYear[k] = (byYear[k] || 0) + 1; });
        const rows = Object.entries(byYear).sort().map(([year, count]) => ({ year, admissions: count }));
        res.json({ title: 'Enrollment Trends', cards: [{ label: 'Total Students', value: students.length }], columns: [{ key: 'year', label: 'Admission Year' }, { key: 'admissions', label: 'Admissions' }], rows, chart: { type: 'bar', data: rows.map(r => ({ name: r.year, value: r.admissions })) } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Compliance / Government (preparatory exports — manual portal submission) ───
router.get('/reports/computed/nemis-export', async (req, res) => {
    try {
        const students = await db(req).collection('students').find({}).toArray().catch(() => []);
        const rows = students.map((s: any) => ({ adm: s.registrationNo || s.admNo || '', upi: s.upi || '', name: s.studentName || '', birthCert: s.birthCertNo || s.birthFormId || '', gender: s.gender || '', grade: s.currentClass || s.studentClass || '' }));
        res.json({ title: 'NEMIS Export (preparation)', cards: [{ label: 'Students', value: rows.length }, { label: 'Note', value: 'Use NEMIS Assistant → Export for the official file' }], columns: [{ key: 'adm', label: 'ADM_NO' }, { key: 'upi', label: 'UPI' }, { key: 'name', label: 'STUDENT_NAME' }, { key: 'birthCert', label: 'BIRTH_CERT' }, { key: 'gender', label: 'GENDER' }, { key: 'grade', label: 'GRADE' }], rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/knec-registration', async (req, res) => {
    try {
        const students = await db(req).collection('students').find({}).toArray().catch(() => []);
        // KNEC registers candidates in exam classes (Grade 6 / Grade 9 / Form 4 etc.).
        const candidates = students.filter((s: any) => /class 8|grade 6|grade 9|form 4|std 8/i.test(String(s.currentClass || s.studentClass || '')));
        const rows = candidates.map((s: any) => ({ index: s.knecIndex || '', name: s.studentName || '', adm: s.registrationNo || s.admNo || '', birthCert: s.birthCertNo || s.birthFormId || '', class: s.currentClass || s.studentClass || '' }));
        res.json({ title: 'KNEC Registration', cards: [{ label: 'Candidates', value: rows.length }], columns: [{ key: 'index', label: 'Index No' }, { key: 'name', label: 'Candidate' }, { key: 'adm', label: 'Adm No' }, { key: 'birthCert', label: 'Birth Cert' }, { key: 'class', label: 'Class' }], rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/statutory-returns', async (req, res) => {
    try {
        const [students, staff] = await Promise.all([
            db(req).collection('students').countDocuments({}).catch(() => 0),
            db(req).collection('staff').find({}).toArray().catch(() => []),
        ]);
        const teaching = staff.filter((s: any) => /teacher|tutor/i.test(String(s.designation || ''))).length;
        const rows = [
            { item: 'Total Enrolment', value: students },
            { item: 'Teaching Staff', value: teaching },
            { item: 'Non-Teaching Staff', value: staff.length - teaching },
            { item: 'Total Staff', value: staff.length },
        ];
        res.json({ title: 'Statutory Returns', columns: [{ key: 'item', label: 'Return Item' }, { key: 'value', label: 'Value' }], rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/computed/ministry-data', async (req, res) => {
    try {
        const students = await db(req).collection('students').find({}).toArray().catch(() => []);
        const byGrade: Record<string, { m: number; f: number }> = {};
        students.forEach((s: any) => { const g = s.currentClass || s.studentClass || 'Unknown'; (byGrade[g] ||= { m: 0, f: 0 }); if (/female|^f$/i.test(String(s.gender))) byGrade[g].f++; else byGrade[g].m++; });
        const rows = Object.entries(byGrade).map(([grade, v]) => ({ grade, boys: v.m, girls: v.f, total: v.m + v.f }));
        res.json({ title: 'Ministry Data Submission', cards: [{ label: 'Total Enrolment', value: students.length }], columns: [{ key: 'grade', label: 'Grade/Class' }, { key: 'boys', label: 'Boys' }, { key: 'girls', label: 'Girls' }, { key: 'total', label: 'Total' }], rows, chart: { type: 'bar', data: rows.map(r => ({ name: r.grade, value: r.total })) } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
