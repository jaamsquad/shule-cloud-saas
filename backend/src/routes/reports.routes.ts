import { Router, Request, Response } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { Db, ObjectId } from 'mongodb';

const getRequestDb = (req: Request): Db => (req as any).tenantDb || getMetaDb();

const router = Router();

// Student academic + fees history, grouped by each class the student was in.
// Uses classAtTime stamped on exam_marks / invoices (falls back to the student's
// current class for legacy records that weren't stamped).
router.get('/reports/student-history/:studentId', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const sid = req.params.studentId;
        const student = await db.collection('students').findOne({ _id: new ObjectId(sid) }).catch(() => null);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const fallbackClass = student.studentClass || student.className || student.currentClass || 'Class';

        const [marks, invoices, payments, exams] = await Promise.all([
            db.collection('exam_marks').find({ studentId: sid }).toArray().catch(() => []),
            db.collection('invoices').find({ $or: [{ student_id: sid }, { studentId: sid }] }).toArray().catch(() => []),
            db.collection('payments').find({ $or: [{ student_id: sid }, { studentId: sid }], is_voided: { $ne: true } }).toArray().catch(() => []),
            db.collection('exams').find({}).toArray().catch(() => []),
        ]);
        const examName: Record<string, string> = {};
        exams.forEach((e: any) => { examName[String(e._id)] = e.examName || e.name || 'Exam'; });

        // Group everything by the class the record belongs to.
        const groups: Record<string, any> = {};
        const g = (cls: string) => (groups[cls] ||= { class: cls, exams: {}, invoiced: 0, paid: 0, balance: 0, invoices: 0 });

        // Exam marks → per class → per exam mean.
        const examAgg: Record<string, Record<string, { sum: number; n: number }>> = {};
        marks.forEach((m: any) => {
            const cls = m.classAtTime || fallbackClass;
            const k = String(m.examId);
            (examAgg[cls] ||= {}); (examAgg[cls][k] ||= { sum: 0, n: 0 });
            const max = Number(m.totalMarks) || 100;
            examAgg[cls][k].sum += max > 0 ? (Number(m.marksObtained ?? 0) / max) * 100 : 0;
            examAgg[cls][k].n++;
        });
        Object.entries(examAgg).forEach(([cls, byExam]) => {
            const grp = g(cls);
            grp.exams = Object.entries(byExam).map(([eid, v]) => ({ exam: examName[eid] || 'Exam', mean: Math.round(v.sum / v.n), subjects: v.n }));
        });

        // Invoices + payments → per class fee totals.
        invoices.forEach((inv: any) => {
            const grp = g(inv.classAtTime || inv.className || fallbackClass);
            grp.invoiced += Number(inv.total_due ?? inv.total ?? 0);
            grp.paid += Number(inv.amount_paid ?? 0);
            grp.balance += Number(inv.balance ?? 0);
            grp.invoices++;
        });
        // Payments not tied to a stamped invoice still count toward the fallback class total.
        const paidTotal = payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
        const stampedPaid = Object.values(groups).reduce((s: number, x: any) => s + x.paid, 0);
        if (paidTotal > stampedPaid) g(fallbackClass).paid += (paidTotal - stampedPaid);

        const history = Object.values(groups).sort((a: any, b: any) => String(a.class).localeCompare(String(b.class)));
        res.json({
            student: { id: String(student._id), name: student.studentName || student.name || '', admNo: student.admNo || student.registrationNo || '', currentClass: fallbackClass },
            history,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Merged Income & Expense rows (the old report read an empty `transactions`
// collection). Combines manual income, expenses, and fee payments into one ledger.
router.get('/reports/income-expense-rows', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const [income, expenses, payments] = await Promise.all([
            db.collection('income').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db.collection('expenses').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db.collection('payments').find({ is_voided: { $ne: true } }).toArray().catch(() => []),
        ]);
        const rows = [
            ...income.map((i: any) => ({ date: i.date || i.createdAt, type: 'Income', category: i.category || i.source || 'Income', description: i.title || i.description || '', amount: Number(i.amount ?? i.total ?? 0) })),
            ...payments.map((p: any) => ({ date: p.payment_date || p.createdAt, type: 'Income', category: 'Fees', description: `Fee payment ${p.receipt_no || ''}${p.studentName ? ' — ' + p.studentName : ''}`.trim(), amount: Number(p.amount ?? 0) })),
            ...expenses.map((e: any) => ({ date: e.date || e.createdAt, type: 'Expense', category: e.category || 'Expense', description: e.title || e.description || '', amount: Number(e.totalAmount ?? e.amount ?? 0) })),
        ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Outstanding balances with the student name resolved (invoices store student_id,
// not studentName) — that's why the report showed "—".
router.get('/reports/outstanding-balances-rows', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const invoices = await db.collection('invoices').find({}).sort({ createdAt: -1 }).limit(2000).toArray().catch(() => []);
        const studentIds = Array.from(new Set(invoices.map((i: any) => String(i.student_id || i.studentId || '')).filter(Boolean)));
        const students = studentIds.length
            ? await db.collection('students').find({ _id: { $in: studentIds.map(id => { try { return new ObjectId(id); } catch { return id as any; } }) } }).toArray().catch(() => [])
            : [];
        const byId: Record<string, any> = {};
        students.forEach((s: any) => { byId[String(s._id)] = s; });
        const rows = invoices.map((i: any) => {
            const s = byId[String(i.student_id || i.studentId)] || {};
            return {
                studentName: i.studentName || s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || '—',
                className: s.studentClass || s.className || s.currentClass || i.className || '—',
                invoiceNo: i.number || i.invoice_no || String(i._id).slice(-6),
                balance: Number(i.balance ?? ((i.total_due ?? i.total ?? 0) - (i.amount_paid ?? 0))),
                status: i.status || 'UNPAID',
            };
        });
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// 1. GET /api/v1/reports/report-cards
router.get('/reports/report-cards', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { class_id, exam_id, term, year, student_id } = req.query;

        const query: any = {};
        // The class dropdown sends the class NAME (e.g. "FORM 1 East"); students may
        // store it under any of these fields, so match broadly.
        if (class_id) query.$or = [
            { studentClass: class_id }, { className: class_id }, { currentClass: class_id }, { classId: class_id },
        ];
        if (student_id) query._id = new ObjectId(student_id as string);

        const currentPeriodObj = await db.collection('periods').findOne({ isCurrent: true });
        const activeTerm = term || currentPeriodObj?.label || "Term 2";
        const activeYear = year || currentPeriodObj?.academicYear || new Date().getFullYear();

        const students = await db.collection('students').find(query).toArray();

        // `exam_id` may be a single id or a comma-separated list (annual report = the
        // selected exams combined). Marks live in `exam_marks`
        // (fields: studentId, subjectId, subjectName, examId, marksObtained, totalMarks).
        const examIds: string[] = String(exam_id || '').split(',').map(s => s.trim()).filter(Boolean);
        const marks = examIds.length
            ? await db.collection('exam_marks').find({ examId: { $in: examIds } }).toArray()
            : [];
        const examDocs = examIds.length
            ? await db.collection('exams').find({ _id: { $in: examIds.map(id => { try { return new ObjectId(id); } catch { return id as any; } }) } }).toArray()
            : [];
        const allSubjects = await db.collection('subjects').find({}).toArray();
        // Subjects assigned to each class (class.subjects = [{subjectId, subjectName}]).
        // This is the authoritative per-class subject list — report cards must show
        // ONLY these, never the whole subjects collection.
        const classDocs = await db.collection('classes').find({}).toArray().catch(() => []);
        const classSubjectsByName: Record<string, { name: string; id: string }[]> = {};
        const classSubjectsById: Record<string, { name: string; id: string }[]> = {};
        for (const c of classDocs) {
            const list = Array.isArray(c.subjects)
                ? c.subjects.map((s: any) => ({ name: s.subjectName || s.name || '', id: String(s.subjectId || s._id || '') })).filter((s: any) => s.name)
                : [];
            const nameKey = String(c.name || c.levelName || c.className || '').toLowerCase().trim();
            if (nameKey) classSubjectsByName[nameKey] = list;
            classSubjectsById[String(c._id)] = list;
        }
        const examName = examDocs.map((e: any) => e.examName || e.name).filter(Boolean).join(' + ') || '—';

        // ── Performance trend (F1T1, F1T2, … up to the selected exam) ──────────────
        // Build a compact label for an exam from the student's level + the exam term.
        const allExams = await db.collection('exams').find({}).toArray().catch(() => []);
        const examById: Record<string, any> = {};
        allExams.forEach((e: any) => { examById[String(e._id)] = e; });
        // Chronological order of exams: by year then term number then start date.
        const termNum = (s: string) => { const m = String(s || '').match(/(\d+)/); return m ? Number(m[1]) : (/first/i.test(s) ? 1 : /second/i.test(s) ? 2 : /third/i.test(s) ? 3 : 99); };
        const examOrder = (e: any) => `${String(e.academicYear || '').padStart(4, '0')}-${String(termNum(e.term)).padStart(2, '0')}-${e.startDate ? new Date(e.startDate).getTime() : 0}`;
        // Parse a class name into a { prefix:'F'|'G'|'P'|'C', num } so we can shift
        // the level back to the form/grade the student was in at an earlier year.
        const parseLevel = (className: string): { prefix: string; num: number } | null => {
            const c = String(className || '');
            const f = c.match(/form\s*(\d+)/i); if (f) return { prefix: 'F', num: Number(f[1]) };
            const g = c.match(/grade\s*(\d+)/i); if (g) return { prefix: 'G', num: Number(g[1]) };
            const pp = c.match(/pp\s*(\d+)/i); if (pp) return { prefix: 'P', num: Number(pp[1]) };
            const cl = c.match(/class\s*(\d+)/i); if (cl) return { prefix: 'C', num: Number(cl[1]) };
            const any = c.match(/([a-z])\D*(\d+)/i); if (any) return { prefix: any[1].toUpperCase(), num: Number(any[2]) };
            return null;
        };
        // The level at a given exam year: shift the CURRENT level back by the number
        // of years between the current year and the exam year (one level per year).
        // e.g. Form 4 in 2026, exam in 2023 → Form 1. Clamps at 1.
        // Direct label from an exact class name (used when classAtTime is recorded).
        const levelLabelDirect = (className: string): string => {
            const lv = parseLevel(className);
            return lv ? `${lv.prefix}${lv.num}` : (String(className || '').slice(0, 4) || '—');
        };
        const currentYearNum = Number(activeYear) || new Date().getFullYear();
        const levelAtYear = (currentClassName: string, examYear: any): string => {
            const lv = parseLevel(currentClassName);
            const ey = Number(examYear);
            if (!lv) return String(currentClassName || '').slice(0, 4) || '—';
            if (!ey || !currentYearNum) return `${lv.prefix}${lv.num}`;
            const shifted = Math.max(1, lv.num - (currentYearNum - ey));
            return `${lv.prefix}${shifted}`;
        };
        // The cutoff: latest selected exam (so the trend runs "up to the current exam").
        const selectedOrders = examIds.map(id => examById[id]).filter(Boolean).map(examOrder).sort();
        const cutoff = selectedOrders.length ? selectedOrders[selectedOrders.length - 1] : '￿';
        // All marks for the students in this report (for the trend), keyed by student+exam.
        const sIds = students.map((s: any) => s._id.toString());
        const allMarksForTrend = await db.collection('exam_marks').find({ studentId: { $in: sIds } }).toArray().catch(() => []);
        const isAnnual = examIds.length > 1;

        // ── Real attendance (student_attendance) summarised per student ──────────────
        const studentIdStrs = students.map((s: any) => s._id.toString());
        const attRecords = studentIdStrs.length
            ? await db.collection('student_attendance').find({ studentId: { $in: studentIdStrs } }).toArray().catch(() => [])
            : [];
        const attBy: Record<string, { present: number; total: number }> = {};
        for (const a of attRecords) {
            const k = String(a.studentId);
            const rec = attBy[k] || (attBy[k] = { present: 0, total: 0 });
            rec.total++;
            if (/present|late/i.test(String(a.status || ''))) rec.present++;
        }

        // ── Personality profile (behaviour_ratings + behaviour_traits) ──────────────
        const traits = await db.collection('behaviour_traits').find({}).sort({ order: 1 }).toArray().catch(() => []);
        const traitName: Record<string, string> = {};
        traits.forEach((t: any) => { traitName[t._id.toString()] = t.name; });
        const ratings = await db.collection('behaviour_ratings').find({}).toArray().catch(() => []);
        const ratingGrade: Record<number, string> = { 5: 'A+', 4: 'A', 3: 'B+', 2: 'C', 1: 'D' };
        const personalityBy: Record<string, { trait: string; grade: string }[]> = {};
        for (const r of ratings) {
            const k = String(r.student_id);
            const name = traitName[String(r.trait_id)];
            if (!name) continue;
            (personalityBy[k] = personalityBy[k] || []).push({
                trait: name,
                grade: r.grade || ratingGrade[Number(r.rating)] || String(r.rating ?? '-'),
            });
        }

        const gradeFor = (pct: number) => pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'E';

        const reportCards = students.map((student: any) => {
            const sid = student._id.toString();
            const studentMarks = marks.filter((m: any) =>
                String(m.studentId) === sid || m.studentId === student.admNo || m.studentId === student.registrationNo);
            const studentClassName = student.studentClass || student.className || student.currentClass || "General Class";

            // ONLY the subjects assigned to this student's class. Resolve by the
            // student's classId first, else by class name. No all-subjects fallback.
            let assignedSubjects = classSubjectsById[String(student.classId)]
                || classSubjectsByName[String(studentClassName).toLowerCase().trim()]
                || [];
            // Legacy fallback: if the class has no assigned subjects, derive the list
            // from this student's own marks (still NOT the whole subjects collection).
            if (assignedSubjects.length === 0) {
                assignedSubjects = Array.from(new Set(studentMarks.map((m: any) => (m.subjectName || '').trim()).filter(Boolean)))
                    .map(name => ({ name, id: '' }));
            }

            let totalPct = 0;
            const subjectsList = assignedSubjects.map(sub => {
                // All marks for this subject across the chosen exams.
                const subMarks = studentMarks.filter((m: any) =>
                    (sub.id && String(m.subjectId) === sub.id) ||
                    (m.subjectName || '').toLowerCase().trim() === sub.name.toLowerCase().trim());
                // Average the per-exam percentages (handles different max marks per exam).
                const pcts = subMarks.map((m: any) => {
                    const max = Number(m.totalMarks) || 100;
                    const got = Number(m.marksObtained ?? m.marks ?? m.score ?? 0);
                    return max > 0 ? (got / max) * 100 : 0;
                });
                const hasMark = subMarks.length > 0;
                const avgPct = hasMark ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
                if (hasMark) totalPct += avgPct;

                // Per-exam scores for the "term" columns (annual layout).
                const perExam: Record<string, number> = {};
                subMarks.forEach((m: any) => { perExam[String(m.examId)] = Number(m.marksObtained ?? m.marks ?? m.score ?? 0); });

                return {
                    subjectName: sub.name,
                    score: avgPct,
                    scoreDisplay: hasMark ? avgPct : "-",
                    perExam,
                    grade: hasMark ? gradeFor(avgPct) : '-',
                    remarks: hasMark ? (avgPct >= 70 ? "Excellent" : avgPct >= 50 ? "Good" : "Needs improvement") : "No marks entered",
                };
            });

            const gradedCount = subjectsList.filter(s => s.scoreDisplay !== "-").length;
            const meanScore = gradedCount > 0 ? totalPct / gradedCount : 0;       // average % across graded subjects
            const totalMarks = Math.round(totalPct);                              // sum of subject %s (used for ranking)
            const gpa = gradedCount > 0 ? (meanScore / 20).toFixed(2) : "0.00";

            // Performance trend: this student's mean % per exam, chronologically, up
            // to (and including) the selected exam. Labelled F1T1 / G1T1 / etc.
            const myTrendMarks = allMarksForTrend.filter((m: any) => String(m.studentId) === sid);
            const byExam: Record<string, { sum: number; n: number; classAtTime?: string }> = {};
            myTrendMarks.forEach((m: any) => {
                const ex = examById[String(m.examId)]; if (!ex) return;
                if (examOrder(ex) > cutoff) return;   // skip exams after the selected one
                const max = Number(m.totalMarks) || 100;
                const pct = max > 0 ? (Number(m.marksObtained ?? m.marks ?? m.score ?? 0) / max) * 100 : 0;
                const k = String(m.examId); (byExam[k] ||= { sum: 0, n: 0 }); byExam[k].sum += pct; byExam[k].n++;
                if (m.classAtTime) byExam[k].classAtTime = m.classAtTime;   // the class the student was in for THIS exam
            });
            const trendRaw = Object.keys(byExam)
                .map(eid => { const ex = examById[eid]; return { eid, ex, mean: Math.round(byExam[eid].sum / byExam[eid].n), classAtTime: byExam[eid].classAtTime }; })
                .filter(t => t.ex)
                .sort((a, b) => examOrder(a.ex).localeCompare(examOrder(b.ex)))
                .map(t => ({
                    // Prefer the class recorded at exam time (exact); else infer from the year gap.
                    label: `${t.classAtTime ? levelLabelDirect(t.classAtTime) : levelAtYear(studentClassName, t.ex.academicYear)}T${termNum(t.ex.term)}`,
                    exam: t.ex.examName || t.ex.name || 'Exam',
                    mean: t.mean,
                }));
            // If two points still share a label (same level+term — e.g. a CAT and an
            // End-Term in the same term), disambiguate with a #2, #3 suffix.
            const seenLabel: Record<string, number> = {};
            const trend = trendRaw.map(t => {
                const n = (seenLabel[t.label] = (seenLabel[t.label] || 0) + 1);
                return n > 1 ? { ...t, label: `${t.label}·${n}` } : t;
            });

            return {
                studentId: student._id,
                studentName: student.studentName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || "Student",
                admNo: student.admNo || student.registrationNo || `BS${student._id.toString().slice(-4).toUpperCase()}`,
                photo: student.avatar || student.photo || student.studentPhoto || student.image || "",
                className: studentClassName,
                examName, isAnnual,
                examList: examDocs.map((e: any) => ({ id: e._id.toString(), name: e.examName || e.name })),
                term: activeTerm,
                year: activeYear,
                subjects: subjectsList,
                subjectsCount: subjectsList.length,
                gradedCount,
                totalMarks,
                meanScore: Number(meanScore.toFixed(1)),
                gpa,
                trend,
                hasMarks: gradedCount > 0,
                rank: "—",
                rankNum: 0,
                attendanceSummary: (() => {
                    const a = attBy[sid];
                    if (!a || a.total === 0) return { presentDays: 0, totalDays: 0, percentage: "—" };
                    return { presentDays: a.present, totalDays: a.total, percentage: `${Math.round((a.present / a.total) * 100)}%` };
                })(),
                personality: personalityBy[sid] || [],
                teacherRemarks: "",
                principalRemarks: "",
            };
        });

        // ── Rank each student within their CLASS by total marks (graded only). ──
        const byClass: Record<string, any[]> = {};
        for (const rc of reportCards) {
            const key = rc.className || "General";
            (byClass[key] = byClass[key] || []).push(rc);
        }
        for (const key of Object.keys(byClass)) {
            const graded = byClass[key].filter(r => r.hasMarks).sort((a, b) => b.totalMarks - a.totalMarks);
            const size = graded.length;
            graded.forEach((r, i) => {
                const pos = i + 1;
                const suffix = pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th";
                r.rankNum = pos;
                r.rank = `${pos}${suffix} out of ${size}`;
            });
            // Ungraded students get no rank.
            byClass[key].filter(r => !r.hasMarks).forEach(r => { r.rank = "—"; r.rankNum = 0; });
        }

        res.json({ data: reportCards, examSelected: examIds.length > 0, examCount: examIds.length, examName });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 2. GET /api/v1/reports/students-info
router.get('/reports/students-info', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { class_id, gender, status, search, page = 1, limit = 50 } = req.query;

        const query: any = {};
        if (class_id) query.studentClass = class_id;
        if (gender) query.gender = gender;
        if (status) query.status = status;
        if (search) {
            const searchVal = search as string;
            query.$or = [
                { studentName: { $regex: searchVal, $options: 'i' } },
                { name: { $regex: searchVal, $options: 'i' } },
                { firstName: { $regex: searchVal, $options: 'i' } },
                { lastName: { $regex: searchVal, $options: 'i' } },
                { admNo: { $regex: searchVal, $options: 'i' } },
                { registrationNo: { $regex: searchVal, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await db.collection('students').countDocuments(query);
        const rawStudents = await db.collection('students').find(query).skip(skip).limit(Number(limit)).toArray();

        const normalizedStudents = rawStudents.map((s: any) => ({
            ...s,
            name: s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || "Unnamed Student",
            admNo: s.admNo || s.registrationNo || `BS${s._id.toString().slice(-4).toUpperCase()}`,
            studentClass: s.studentClass || s.className || "General Class",
            gender: s.gender || "Male",
            status: s.status || "Active",
            admissionDate: s.admissionDate || new Date().toISOString().split('T')[0],
            parents: s.parents?.length ? s.parents : [{ name: s.parentName || "Guardian", phone: s.phone || "N/A" }]
        }));

        // Ensure fallback sample data if empty
        const data = normalizedStudents.length > 0 ? normalizedStudents : [
            {
                _id: new ObjectId(),
                admNo: "BS001",
                name: "Fatuma Waridi",
                gender: "Female",
                studentClass: "Grade 8 Stream 1",
                status: "Active",
                admissionDate: "2022-01-10",
                parents: [{ name: "Amina Waridi", phone: "+254711223344", relation: "Mother", email: "amina@example.com" }]
            },
            {
                _id: new ObjectId(),
                admNo: "BS002",
                name: "John Doe",
                gender: "Male",
                studentClass: "Grade 8 Stream 1",
                status: "Active",
                admissionDate: "2022-01-12",
                parents: [{ name: "Peter Doe", phone: "+254722334455", relation: "Father", email: "peter@example.com" }]
            }
        ];

        res.json({
            data,
            pagination: {
                total: total > 0 ? total : data.length,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil((total > 0 ? total : data.length) / Number(limit))
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 3. GET /api/v1/reports/parents-info
router.get('/reports/parents-info', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { student_class_id, search, relation } = req.query;

        const query: any = {};
        if (student_class_id) {
            query.$or = [
                { studentClass: student_class_id },
                { className: student_class_id },
                { classId: student_class_id }
            ];
        }

        const students = await db.collection('students').find(query).toArray();
        let parents: any[] = [];

        students.forEach((s: any) => {
            const studentName = s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || "Unnamed Student";
            const studentAdmNo = s.admNo || s.registrationNo || `BS${s._id.toString().slice(-4).toUpperCase()}`;
            const studentClass = s.studentClass || s.className || "General Class";

            let studentParents: any[] = [];

            if (s.parents && Array.isArray(s.parents) && s.parents.length > 0) {
                studentParents = s.parents.map((p: any) => ({
                    _id: p._id || new ObjectId(),
                    studentId: s._id,
                    studentName,
                    studentAdmNo,
                    studentClass,
                    parentName: p.name || p.parentName || "Guardian",
                    relation: p.relation || p.relationship || "Parent",
                    phone: p.phone || p.mobile || "N/A",
                    email: p.email || "N/A",
                    occupation: p.occupation || "Business",
                    isEmergencyContact: p.isEmergencyContact ?? p.isEmergency ?? true
                }));
            } else if (s.guardians && Array.isArray(s.guardians) && s.guardians.length > 0) {
                studentParents = s.guardians.map((g: any) => ({
                    _id: g._id || new ObjectId(),
                    studentId: s._id,
                    studentName,
                    studentAdmNo,
                    studentClass,
                    parentName: g.name || g.guardianName || "Guardian",
                    relation: g.relation || g.relationship || "Guardian",
                    phone: g.phone || g.mobile || "N/A",
                    email: g.email || "N/A",
                    occupation: g.occupation || "Business",
                    isEmergencyContact: g.isEmergencyContact ?? g.isEmergency ?? true
                }));
            } else if (s.parentName || s.fatherName || s.motherName || s.guardianName || s.phone || s.mobile) {
                if (s.fatherName) {
                    studentParents.push({
                        _id: new ObjectId(), studentId: s._id, studentName, studentAdmNo, studentClass,
                        parentName: s.fatherName, relation: "Father", phone: s.fatherPhone || s.phone || s.mobile || "N/A",
                        email: s.fatherEmail || s.email || "N/A", occupation: s.fatherOccupation || s.occupation || "Business",
                        isEmergencyContact: true
                    });
                }
                if (s.motherName) {
                    studentParents.push({
                        _id: new ObjectId(), studentId: s._id, studentName, studentAdmNo, studentClass,
                        parentName: s.motherName, relation: "Mother", phone: s.motherPhone || s.phone || s.mobile || "N/A",
                        email: s.motherEmail || s.email || "N/A", occupation: s.motherOccupation || s.occupation || "Business",
                        isEmergencyContact: true
                    });
                }
                if (!s.fatherName && !s.motherName && (s.parentName || s.guardianName || s.phone || s.mobile)) {
                    studentParents.push({
                        _id: new ObjectId(), studentId: s._id, studentName, studentAdmNo, studentClass,
                        parentName: s.parentName || s.guardianName || "Guardian",
                        relation: s.relation || s.relationship || s.parentRelation || "Parent",
                        phone: s.phone || s.mobile || "N/A",
                        email: s.email || s.parentEmail || "N/A",
                        occupation: s.occupation || s.parentOccupation || "Business",
                        isEmergencyContact: s.isEmergencyContact ?? s.isEmergency ?? true
                    });
                }
            }

            parents.push(...studentParents);
        });

        if (search) {
            const searchStr = (search as string).toLowerCase();
            parents = parents.filter(p => 
                p.parentName?.toLowerCase().includes(searchStr) || 
                p.studentName?.toLowerCase().includes(searchStr) ||
                p.phone?.includes(searchStr) ||
                p.studentAdmNo?.toLowerCase().includes(searchStr) ||
                p.email?.toLowerCase().includes(searchStr)
            );
        }

        if (relation) {
            const relStr = (relation as string).toLowerCase();
            parents = parents.filter(p => p.relation?.toLowerCase() === relStr);
        }

        // Fallback sample data if empty
        if (parents.length === 0) {
            parents = [
                {
                    _id: new ObjectId(), studentId: new ObjectId(), studentName: "Fatuma Waridi", studentAdmNo: "BS001", studentClass: "Grade 8",
                    parentName: "Amina Waridi", relation: "Mother", phone: "+254711223344", email: "amina@example.com", occupation: "Doctor", isEmergencyContact: true
                },
                {
                    _id: new ObjectId(), studentId: new ObjectId(), studentName: "John Doe", studentAdmNo: "BS002", studentClass: "Grade 8",
                    parentName: "Peter Doe", relation: "Father", phone: "+254722334455", email: "peter@example.com", occupation: "Engineer", isEmergencyContact: true
                }
            ];
        }

        res.json({ data: parents });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 4. GET /api/v1/reports/attendance/monthly-students
// 4. GET /api/v1/reports/attendance/monthly-students
router.get('/reports/attendance/monthly-students', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { class_id, month, year } = req.query;

        const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
        const targetYear = year ? Number(year) : new Date().getFullYear();

        const query: any = {};
        if (class_id) {
            query.$or = [
                { studentClass: class_id },
                { className: class_id },
                { classId: class_id },
                { currentClass: class_id }
            ];
        }

        const students = await db.collection('students').find(query).toArray();
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        // Fetch attendance records for the month
        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const attQuery: any = {
            date: { $gte: startDate, $lte: endDate }
        };
        if (class_id) {
            attQuery.$or = [{ class_id }, { classId: class_id }, { className: class_id }];
        }

        const attendanceLogs = await db.collection('student_attendance').find(attQuery).toArray();

        const activeStudents = students.length > 0 ? students : [
            { _id: new ObjectId(), admNo: "BSC742", name: "Muzamil Ibrahim Mohamed", studentClass: "Grade 8 Stream 1" },
            { _id: new ObjectId(), admNo: "BSC743", name: "Mudathir Mohamed", studentClass: "Grade 8 Stream 1" }
        ];

        const monthlyGrid = activeStudents.map((student: any) => {
            const dailyStatus: Record<number, string> = {};
            let presentCount = 0;
            let lateCount = 0;
            let absentCount = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const log = attendanceLogs.find((a: any) => 
                    (a.date === dateStr && a.records?.some((r: any) => r.student_id === student._id?.toString() || r.studentId?.toString() === student._id?.toString() || r.admNo === student.admNo || r.admNo === student.registrationNo)) ||
                    (a.date === dateStr && (a.studentId?.toString() === student._id?.toString() || a.student_id?.toString() === student._id?.toString() || a.admNo === student.admNo || a.admNo === student.registrationNo))
                );
                
                let status = "P"; // Default Present for simulation if no log
                if (log) {
                    if (log.records) {
                        const rec = log.records.find((r: any) => r.student_id === student._id?.toString() || r.studentId?.toString() === student._id?.toString() || r.admNo === student.admNo || r.admNo === student.registrationNo);
                        if (rec) {
                            if (rec.status === "PRESENT" || rec.status === "P") status = "P";
                            else if (rec.status === "ABSENT" || rec.status === "A") status = "A";
                            else if (rec.status === "LATE" || rec.status === "L") status = "L";
                            else if (rec.status === "EXCUSED" || rec.status === "E") status = "E";
                        }
                    } else {
                        if (log.status === "PRESENT" || log.status === "P") status = "P";
                        else if (log.status === "ABSENT" || log.status === "A") status = "A";
                        else if (log.status === "LATE" || log.status === "L") status = "L";
                        else if (log.status === "EXCUSED" || log.status === "E") status = "E";
                    }
                } else {
                    // Randomize slightly for realistic sample data
                    const rand = Math.random();
                    if (rand > 0.95) status = "A";
                    else if (rand > 0.90) status = "L";
                }

                dailyStatus[d] = status;
                if (status === "P") presentCount++;
                else if (status === "L") { lateCount++; presentCount++; } // Late counts as present
                else if (status === "A") absentCount++;
            }

            const totalWorkingDays = daysInMonth;
            const percentage = ((presentCount / totalWorkingDays) * 100).toFixed(1) + "%";

            return {
                studentId: student._id,
                admNo: student.admNo || student.registrationNo || `BS${student._id?.toString().slice(-4).toUpperCase()}`,
                studentName: student.studentName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
                className: student.studentClass || student.className || student.currentClass || "Grade 8",
                dailyStatus,
                totalWorkingDays,
                presentCount,
                lateCount,
                absentCount,
                percentage
            };
        });

        res.json({
            data: monthlyGrid,
            meta: { month: targetMonth, year: targetYear, daysInMonth }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 5. GET /api/v1/reports/attendance/monthly-staff
router.get('/reports/attendance/monthly-staff', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { department_id, month, year } = req.query;

        const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
        const targetYear = year ? Number(year) : new Date().getFullYear();

        const query: any = {};
        if (department_id) {
            query.$or = [
                { department: department_id }, 
                { departmentId: department_id }, 
                { deptName: department_id }
            ];
        }

        const staff = await db.collection('staff').find(query).toArray();
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const attLogs = await db.collection('employee_attendance').find({
            date: { $gte: startDate, $lte: endDate }
        }).toArray();

        const activeStaff = staff.length > 0 ? staff : [
            { _id: new ObjectId(), empNo: "EMPC744", name: "Muzamil Ibrahim Mohamed", department: "Academic", designation: "Teacher" },
            { _id: new ObjectId(), empNo: "EMPCE88", name: "Mudathir Mohamed", department: "Academic", designation: "Teacher" },
            { _id: new ObjectId(), empNo: "EMPCEF9", name: "AHMED", department: "Academic", designation: "Teacher" }
        ];

        const monthlyGrid = activeStaff.map((emp: any) => {
            const dailyStatus: Record<number, string> = {};
            let presentCount = 0;
            let leaveCount = 0;
            let absentCount = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const log = attLogs.find((a: any) => a.date === dateStr && (
                    a.employeeId?.toString() === emp._id?.toString() || 
                    a.staffId?.toString() === emp._id?.toString() || 
                    a.employee_id?.toString() === emp._id?.toString() ||
                    a.empNo === emp.empNo ||
                    a.employeeNo === emp.empNo
                ));

                let status = "P";
                if (log) {
                    if (log.status === "PRESENT" || log.status === "P") status = "P";
                    else if (log.status === "ABSENT" || log.status === "A") status = "A";
                    else if (log.status === "LATE" || log.status === "L") status = "L";
                    else if (log.status === "EXCUSED" || log.status === "E") status = "E";
                } else {
                    const rand = Math.random();
                    if (rand > 0.96) status = "A";
                    else if (rand > 0.92) status = "L";
                }

                dailyStatus[d] = status;
                if (status === "P" || status === "L") presentCount++;
                else if (status === "A") absentCount++;
            }

            const totalWorkingDays = daysInMonth;
            const percentage = ((presentCount / totalWorkingDays) * 100).toFixed(1) + "%";

            return {
                staffId: emp._id,
                empNo: emp.empNo || emp.employeeId || `EMP${emp._id?.toString().slice(-4).toUpperCase()}`,
                staffName: emp.name || emp.employeeName || emp.staffName || "Employee",
                department: emp.department || emp.deptName || "Academic",
                designation: emp.designation || "Teacher",
                dailyStatus,
                totalWorkingDays,
                presentCount,
                leaveDeductions: absentCount,
                percentage
            };
        });

        res.json({
            data: monthlyGrid,
            meta: { month: targetMonth, year: targetYear, daysInMonth }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 6. GET /api/v1/reports/fee-collection — REAL fee payments + invoice totals.
router.get('/reports/fee-collection', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { start_date, end_date, class_id, payment_mode, status } = req.query as any;

        // Pull real payments from the `payments` collection (recorded by Collect
        // Fees). Some schools also have `transactions` — merge both.
        const collect = async (name: string) => { try { return await db.collection(name).find({}).toArray(); } catch { return []; } };
        const rawPayments = [...(await collect('payments')), ...(await collect('transactions'))]
            .filter((p: any) => !p.is_voided && (p.status ? String(p.status).toLowerCase() !== 'rejected' : true));

        // Index students for name/adm/class enrichment.
        const students = await collect('students');
        const byId: Record<string, any> = {};
        students.forEach((s: any) => { byId[String(s._id)] = s; });
        const findStudent = (p: any) => byId[String(p.student_id || p.studentId || '')] || students.find((s: any) => (s.registrationNo || s.admNo) && (s.registrationNo === (p.registrationNo || p.admNo) || s.admNo === (p.registrationNo || p.admNo)));

        let data = rawPayments.map((p: any) => {
            const s = findStudent(p);
            const amount = Number(p.amount ?? p.amount_paid ?? p.paid_amount ?? 0);
            const date = p.payment_date || p.paymentDate || (p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '') || p.date || '';
            return {
                _id: String(p._id),
                receiptNo: p.receipt_no || p.receiptNo || p.reference || `RCPT-${String(p._id).slice(-6).toUpperCase()}`,
                studentName: p.studentName || s?.studentName || `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || '—',
                admNo: p.registrationNo || p.admNo || s?.registrationNo || s?.admNo || '—',
                className: p.studentClass || s?.studentClass || s?.currentClass || '—',
                amount,
                paymentMode: p.method || p.paymentMode || p.payment_mode || p.mode || 'Cash',
                paymentDate: date,
                status: p.status || 'Completed',
            };
        });

        // Apply filters.
        if (start_date && end_date) data = data.filter((t) => t.paymentDate >= start_date && t.paymentDate <= end_date);
        if (payment_mode) data = data.filter((t) => String(t.paymentMode).toLowerCase() === String(payment_mode).toLowerCase());
        if (status) data = data.filter((t) => String(t.status).toLowerCase() === String(status).toLowerCase());
        if (class_id) data = data.filter((t) => String(t.className).toLowerCase().includes(String(class_id).toLowerCase()));
        data.sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)));

        // Real expected/collected/outstanding from invoices.
        const invoices = await collect('invoices');
        const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total_due ?? i.total ?? i.amount ?? 0), 0);
        const totalCollected = data.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const totalOutstanding = invoices.reduce((s: number, i: any) => {
            const t = Number(i.total_due ?? i.total ?? i.amount ?? 0);
            const paid = Number(i.paid_amount ?? i.amountPaid ?? i.amount_paid ?? 0);
            return s + Math.max(0, Number(i.balance ?? (t - paid)));
        }, 0);

        res.json({
            summary: {
                totalExpected: totalBilled || totalCollected + totalOutstanding,
                totalCollected,
                totalOutstanding,
            },
            data,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 7. GET /api/v1/reports/student-progress
router.get('/reports/student-progress', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { student_id, year } = req.query;

        // Fetch student details
        let student: any = null;
        if (student_id) {
            try {
                student = await db.collection('students').findOne({ 
                    $or: [
                        { _id: new ObjectId(student_id as string) },
                        { admNo: student_id as string },
                        { registrationNo: student_id as string }
                    ]
                });
            } catch(e){}
        }

        if (!student) { 
            const firstStudent = await db.collection('students').findOne({});
            student = firstStudent || { _id: new ObjectId(), name: "Fatuma Waridi", admNo: "BS001", studentClass: "Grade 8 Stream 1" }; 
        }

        const studentIdStr = student._id?.toString();
        let marks: any[] = [];
        if (studentIdStr) {
            marks = await db.collection('exam_marks').find({ 
                $or: [
                    { studentId: studentIdStr },
                    { studentId: new ObjectId(studentIdStr) },
                    { student_id: studentIdStr },
                    { student_id: new ObjectId(studentIdStr) },
                    ...(student.admNo ? [{ studentId: student.admNo }, { student_id: student.admNo }] : []),
                    ...(student.registrationNo ? [{ studentId: student.registrationNo }, { student_id: student.registrationNo }] : [])
                ]
            }).toArray();
        }

        const exams = await db.collection('exams').find({}).toArray();

        let historicalExams: any[] = [];
        if (marks.length > 0) {
            // Group by examId
            const examGroups: Record<string, any[]> = {};
            marks.forEach((m: any) => {
                const eId = m.examId || m.assessmentId || "unknown";
                if (!examGroups[eId]) examGroups[eId] = [];
                examGroups[eId].push(m);
            });

            Object.entries(examGroups).forEach(([eId, mList]) => {
                const examObj = exams.find((e: any) => e._id?.toString() === eId.toString() || e.name === eId);
                const totalMarks = mList.reduce((sum, m) => sum + Number(m.marksObtained || m.marks || m.score || m.value || 0), 0);
                const average = mList.length > 0 ? Math.round(totalMarks / mList.length) : 0;
                const gpa = Number((average / 20).toFixed(2));
                historicalExams.push({
                    term: examObj?.term || examObj?.semester || "Term 1",
                    examName: examObj?.name || examObj?.examName || "Term Exam",
                    gpa,
                    totalMarks,
                    average
                });
            });
        }

        const attendanceTrends: any[] = [];
        const evaluations: any[] = [];

        res.json({
            student: {
                studentId: student._id,
                name: student.studentName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
                admNo: student.registrationNo || student.admNo || "BS001",
                className: student.studentClass || student.className || student.currentClass || "Grade 8"
            },
            historicalExams,
            attendanceTrends,
            evaluations
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 8. GET /api/v1/reports/accounts
router.get('/reports/accounts', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { start_date, end_date, account_id, type } = req.query;

        const query: any = {};
        if (start_date && end_date) {
            query.transactionDate = { $gte: start_date, $lte: end_date };
        }
        if (type) query.type = type;

        const ledgerEntries = await db.collection('account_ledger').find(query).toArray();
        const txnQuery: any = {};
        if (start_date && end_date) {
            txnQuery.date = { $gte: start_date, $lte: end_date };
        }
        const feeTxns = await db.collection('transactions').find(txnQuery).toArray();
        const mappedFeeTxns = feeTxns.map((t: any) => ({
            _id: t._id,
            date: t.date || t.createdAt?.toISOString()?.split('T')[0] || "2026-05-01",
            reference: t.receiptNo || t.invoiceNo || `REC-${t._id.toString().slice(-6).toUpperCase()}`,
            description: `Fee Collection - ${t.studentName || 'Student'} (${t.class || 'Class'})`,
            type: "income",
            category: "Tuition Fees",
            amount: Number(t.amount || t.paidAmount || 0),
            paymentMethod: t.paymentMode || t.mode || "Cash",
            recordedBy: t.recordedBy || "Admin"
        }));

        // Real income / expense entries from the Accounts module.
        const dateFilter: any = (start_date && end_date) ? { $or: [{ date: { $gte: start_date, $lte: end_date } }, { transactionDate: { $gte: start_date, $lte: end_date } }] } : {};
        const mapAcc = (e: any, t: 'income' | 'expense') => ({
            _id: e._id,
            date: e.date || e.transactionDate || (e.createdAt instanceof Date ? e.createdAt.toISOString().split('T')[0] : '') || '',
            reference: e.reference || e.refNo || e.voucherNo || `${t === 'income' ? 'INC' : 'EXP'}-${e._id.toString().slice(-6).toUpperCase()}`,
            description: e.description || e.title || e.name || e.head || e.source || (t === 'income' ? 'Income' : 'Expense'),
            type: t,
            category: e.category || e.head || e.accountHead || e.source || 'General',
            amount: Number(e.amount || 0),
            paymentMethod: e.paymentMethod || e.mode || e.method || 'Cash',
            recordedBy: e.recordedBy || 'Admin',
        });
        const incomeEntries = (await db.collection('income').find(dateFilter).toArray()).map((e: any) => mapAcc(e, 'income'));
        const expenseEntries = (await db.collection('expenses').find(dateFilter).toArray()).map((e: any) => mapAcc(e, 'expense'));

        let combinedEntries = [...ledgerEntries, ...incomeEntries, ...expenseEntries, ...mappedFeeTxns];
        if (type) combinedEntries = combinedEntries.filter((e: any) => e.type === type);
        combinedEntries.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));

        const data = combinedEntries;   // real data only — no fabricated samples
        const openingBalance = 0;
        const totalIncome = data.filter((d: any) => d.type === "income").reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
        const totalExpense = data.filter((d: any) => d.type === "expense").reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
        const closingBalance = openingBalance + totalIncome - totalExpense;

        // Breakdown
        const breakdown: Record<string, number> = {};
        data.forEach((item: any) => {
            const cat = item.category || "General";
            breakdown[cat] = (breakdown[cat] || 0) + Number(item.amount || 0);
        });

        res.json({
            summary: {
                openingBalance,
                closingBalance,
                totalIncome,
                totalExpense
            },
            breakdown: Object.entries(breakdown).map(([category, amount]) => ({ category, amount })),
            data
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 9. GET /api/v1/reports/custom/templates
router.get('/reports/custom/templates', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const templates = await db.collection('custom_report_templates').find({}).toArray();

        const data = templates.length > 0 ? templates : [
            {
                _id: new ObjectId(),
                name: "Student Demographics & Contacts",
                description: "Comprehensive listing of student personal details and parent contact information.",
                columns: ["admNo", "name", "gender", "studentClass", "parentName", "parentPhone"],
                filters: { status: "Active" },
                createdAt: new Date()
            },
            {
                _id: new ObjectId(),
                name: "Fee Defaulters Comprehensive List",
                description: "Report showing students with outstanding fee balances exceeding KSH 10,000.",
                columns: ["admNo", "name", "studentClass", "balance"],
                filters: { minBalance: 10000 },
                createdAt: new Date()
            }
        ];

        res.json({ data });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 10. POST /api/v1/reports/custom/templates
router.post('/reports/custom/templates', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { name, description, columns, filters } = req.body;

        const newTemplate = {
            name,
            description,
            columns: columns || [],
            filters: filters || {},
            createdAt: new Date()
        };

        const result = await db.collection('custom_report_templates').insertOne(newTemplate);
        res.status(201).json({ id: result.insertedId, ...newTemplate });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 11. POST /api/v1/reports/custom/generate
router.post('/reports/custom/generate', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { columns = ["admNo", "name", "studentClass"], filters = {}, sort = {}, page = 1, limit = 50 } = req.body;

        const query: any = {};
        if (filters.status) query.status = filters.status;
        if (filters.gender) query.gender = filters.gender;
        if (filters.studentClass) query.studentClass = filters.studentClass;

        const skip = (Number(page) - 1) * Number(limit);
        const students = await db.collection('students').find(query).skip(skip).limit(Number(limit)).toArray();

        // Map report column keys → the actual student fields (real data).
        const resolve: Record<string, (s: any) => any> = {
            admNo: s => s.registrationNo || s.admNo || s.admissionNo || s.admissionNumber || 'N/A',
            name: s => s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || 'N/A',
            studentName: s => s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'N/A',
            studentClass: s => s.studentClass || s.currentClass || s.className || 'N/A',
            gender: s => s.gender || 'N/A',
            status: s => s.status || 'Active',
            dob: s => s.dob || s.dateOfBirth || 'N/A',
            balance: s => Number(s.feeBalance ?? s.balance ?? s.outstanding ?? 0),
            parentName: s => s.fatherName || s.motherName || s.guardianName || s.parentName || 'N/A',
            parentPhone: s => s.fatherPhone || s.motherPhone || s.guardianPhone || s.phone || s.parentPhone || 'N/A',
        };
        const projectedData = students.map((item: any) => {
            const projected: any = { _id: item._id };
            columns.forEach((col: string) => { projected[col] = resolve[col] ? resolve[col](item) : (item[col] ?? 'N/A'); });
            return projected;
        });

        const total = await db.collection('students').countDocuments(query);
        res.json({
            data: projectedData,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) || 1 }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Shared helper endpoints
router.get('/reports/shared/classes', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        // The real classes are whatever students actually belong to — this is what
        // the report filters match against (student.studentClass).
        const distinct: string[] = (await db.collection('students').distinct('studentClass')).filter(Boolean);
        if (distinct.length > 0) {
            return res.json(distinct.sort().map((name: string) => ({ _id: name, name, levelName: name })));
        }
        // Fallback to the classes collection (use any available label field).
        const classes = await db.collection('classes').find({}).toArray();
        res.json(classes.map((c: any) => ({ _id: c._id, name: c.name || c.levelName || c.className, levelName: c.levelName || c.name })).filter((c: any) => c.name));
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

router.get('/reports/shared/exams', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const exams = await db.collection('exams').find({}).sort({ createdAt: -1 }).toArray();
        // Exams are stored with `examName` (not `name`), so the dropdown was blank.
        // Normalize to always provide a display `name`.
        const data = exams.map((e: any) => {
            const label = e.examName || e.name || e.title
                || [e.type, e.term, e.academicYear].filter(Boolean).join(' ')
                || 'Exam';
            return { ...e, _id: e._id, name: label, examName: e.examName || label };
        });
        res.json(data);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

router.get('/reports/shared/departments', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const depts = await db.collection('departments').find({}).toArray();
        const data = depts.length > 0 ? depts : [
            { _id: new ObjectId(), name: "Science Department" },
            { _id: new ObjectId(), name: "Mathematics Department" },
            { _id: new ObjectId(), name: "Languages Department" },
            { _id: new ObjectId(), name: "Humanities Department" }
        ];
        res.json(data);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
});

export default router;
