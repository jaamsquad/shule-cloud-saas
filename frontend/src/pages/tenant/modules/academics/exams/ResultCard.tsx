import { useState, useRef, useMemo, useEffect } from "react";
import {
    Search, Printer, Download, Home, User, Award, GraduationCap,
    Loader2, ChevronDown, BarChart3, BookOpen, Mail
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { RenderPrintTemplate } from "./PrintTemplates";
import { openPrintDoc } from "@/lib/pdfDoc";
import { reportQr } from "@/lib/reportQr";

export default function ResultCard() {
    const [emailing, setEmailing] = useState(false);

    const emailAll = async (selectedExam: any, selectedClass: any) => {
        if (!selectedExam || !selectedClass) { toast.error("Select an exam and class first"); return; }
        if (!confirm(`Email result cards (PDF) to all parents in ${selectedClass.levelName || selectedClass.name} for ${selectedExam.examName || selectedExam.name}?`)) return;
        setEmailing(true);
        try {
            const r = await api.post("/exams/email-result-cards", {
                examId: selectedExam._id, classId: selectedClass._id,
                className: selectedClass.levelName || selectedClass.name,
            });
            const { sent = 0, failed = 0, skipped = 0, total = 0, error } = r.data || {};
            const summary = `${sent} sent${failed ? `, ${failed} failed` : ""}${skipped ? `, ${skipped} without email` : ""} (of ${total}).`;
            if (sent === 0 && failed > 0) toast.error(`No emails went out. ${error ? `Reason: ${error}` : "Check Communications → Settings (SMTP)."} (${summary})`, { duration: 12000 });
            else toast.success(`Result cards emailed — ${summary}${error ? ` First error: ${error}` : ""}`, { duration: failed ? 10000 : 5000 });
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to email result cards");
        } finally { setEmailing(false); }
    };
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [search, setSearch] = useState("");
    // Whether to include internal assessments in progress & report
    const [includeCats, setIncludeCats]             = useState(false);
    // Specific internal exam IDs to include (when user picks selectively)
    const [selectedInternalIds, setSelectedInternalIds] = useState<Set<string>>(new Set());
    const [showInternalPicker, setShowInternalPicker]   = useState(false);

    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data });
    const { data: periods = [] } = useQuery<any[]>({ queryKey: ["periods"], queryFn: async () => (await api.get("/academics/periods")).data });
    const currentPeriod = periods.find((p: any) => p.isCurrent) || periods[0];

    const { data: allStudents = [] } = useQuery<any[]>({
        queryKey: ["students"],
        queryFn: async () => (await api.get("/students")).data,
    });

    const students = selectedClass
        ? allStudents.filter((s: any) =>
            s.classId === selectedClass._id ||
            s.studentClass === (selectedClass.levelName || selectedClass.name)
          )
        : [];

    const { data: marks = [], isLoading: loadingMarks } = useQuery<any[]>({
        queryKey: ["result-card", selectedExam?._id, selectedStudent?._id],
        queryFn: async () => selectedExam && selectedStudent
            ? (await api.get(`/academics/exam-marks?examId=${selectedExam._id}&studentId=${selectedStudent._id}`)).data
            : [],
        enabled: !!selectedExam && !!selectedStudent,
    });

    const { data: studentAllMarks = [] } = useQuery<any[]>({
        queryKey: ["student-all-marks", selectedStudent?._id],
        queryFn: async () => selectedStudent
            ? (await api.get(`/academics/exam-marks?studentId=${selectedStudent._id}`)).data
            : [],
        enabled: !!selectedStudent,
    });

    // Staff for subject-teacher mapping
    const { data: allStaff = [] } = useQuery<any[]>({
        queryKey: ["staff"],
        queryFn: async () => (await api.get("/staff")).data || [],
    });

    const { data: tenantProfile } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
    });

    const filteredStudents = students.filter((s: any) => {
        const name = s.studentName || (s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : null) || s.fullName || s.name || "";
        const adm = s.admissionNumber || s.admNo || s.registrationNo || "";
        return name.toLowerCase().includes(search.toLowerCase()) || adm.toLowerCase().includes(search.toLowerCase());
    });

    const getStudentName = (s: any) =>
        s.studentName ||
        (s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : null) ||
        s.fullName || s.name || s.admNo || "Student";
    const getAdmNo = (s: any) => s.admissionNumber || s.admNo || s.registrationNo || "—";

    // Missing mark policy from the exam record (set at exam creation)
    const missingMarkPolicy: "skip" | "count_as_zero" = (selectedExam as any)?.missingMarkPolicy || "skip";

    // Obtained = sum of recorded marks only (always)
    const totalObtained  = marks.reduce((sum: number, m: any) => sum + (Number(m.marksObtained) || 0), 0);
    const totalMaxScored = marks.reduce((sum: number, m: any) => sum + (Number(m.totalMarks) || 100), 0);
    // % denominator depends on policy — computed after allSubjectRows is ready (see totalMaxAll below)
    const overall        = totalMaxScored > 0 ? Math.round((totalObtained / totalMaxScored) * 100) : 0;
    const studentPhoto   = selectedStudent?.studentPhoto || selectedStudent?.photo || selectedStudent?.avatar || null;

    // ── Curriculum settings → grading scale ──────────────────────────────────
    const { data: curriculumSettings } = useQuery<any>({
        queryKey: ["curriculum_settings"],
        queryFn: async () => {
            const r = await api.get("/curriculum_settings");
            return Array.isArray(r.data) ? r.data[0] : null;
        },
    });

    // ── Legacy grading_criteria (fallback) ────────────────────────────────────
    const { data: gradingConfig } = useQuery<any>({
        queryKey: ["grading_criteria"],
        queryFn: async () => (await api.get("/grading_criteria")).data?.[0],
    });

    // ── Per-class grading scale (the authoritative one: this class's, else global)
    const { data: classScale } = useQuery<any>({
        queryKey: ["grading_scale", selectedClass?._id],
        queryFn: async () => (await api.get("/grading-scale", { params: { classId: selectedClass?._id } })).data,
        enabled: !!selectedClass,
    });

    // School profile → real curriculum name for the header.
    const { data: schoolProfile } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; },
        staleTime: Infinity,
    });
    const curriculumName = schoolProfile?.curriculum || schoolProfile?.curriculumType || curriculumSettings?.curriculumName || curriculumSettings?.curriculumId || "Standard";

    // ── Subjects ASSIGNED to the selected class (to show "-" for unscored) ────
    // Authoritative source = class.subjects (set in Assign Subjects). Only these
    // subjects appear on the report card — never the whole subjects collection.
    const { data: classSubjects = [] } = useQuery<any[]>({
        queryKey: ["subjects_for_class", selectedClass?._id, selectedClass?.levelName],
        queryFn: async () => {
            if (!selectedClass) return [];
            // 1) The class's own assigned subjects.
            if (Array.isArray(selectedClass.subjects) && selectedClass.subjects.length > 0) {
                return selectedClass.subjects.map((s: any) => ({ _id: s.subjectId || s._id, name: s.subjectName || s.name, subjectName: s.subjectName || s.name }));
            }
            // 2) Fall back to subjects tagged with this class name (legacy data).
            const name = selectedClass.levelName || selectedClass.name || "";
            const r = await api.get(`/subjects?className=${encodeURIComponent(name)}`);
            const byClass = Array.isArray(r.data) ? r.data : [];
            return byClass;
        },
        enabled: !!selectedClass,
    });

    // ── Resolved grading scale: per-class scale > curriculum > legacy > defaults ──
    const gradingScale: Array<{ grade: string; min: number; max: number; label?: string; color?: string }> = (() => {
        if (classScale?.grades?.length > 0) {
            return classScale.grades.map((g: any) => ({ grade: g.grade, min: g.from, max: g.upto, label: g.remark }));
        }
        if (curriculumSettings?.gradingScale?.length > 0) {
            return curriculumSettings.gradingScale.map((g: any) => ({ grade: g.grade, min: g.min, max: g.max, label: g.label, color: g.color }));
        }
        if (gradingConfig?.grades?.length > 0) {
            return gradingConfig.grades.map((g: any) => ({ grade: g.grade, min: g.from, max: g.upto, label: g.status }));
        }
        return [];
    })();

    const passMark = classScale?.passMark ?? curriculumSettings?.passMark ?? gradingConfig?.passmark ?? 50;

    // Helper: derive grade from percentage using resolved grading scale
    const getGradeForPct = (pct: number): string => {
        if (gradingScale.length > 0) {
            const sorted = [...gradingScale].sort((a, b) => b.min - a.min);
            const match = sorted.find(g => pct >= g.min && pct <= g.max);
            if (match) return match.grade;
        }
        if (pct >= 80) return "A"; if (pct >= 70) return "B+"; if (pct >= 60) return "B";
        if (pct >= 50) return "C+"; if (pct >= 40) return "C"; if (pct >= 33) return "D"; return "F";
    };

    const getStatusForPct = (pct: number): string => {
        if (gradingScale.length > 0) {
            const sorted = [...gradingScale].sort((a, b) => b.min - a.min);
            const match = sorted.find(g => pct >= g.min && pct <= g.max);
            if (match?.label) return match.label;
        }
        return pct >= passMark ? "Pass" : "Fail";
    };

    const getGradeColor = (pct: number): string => {
        if (gradingScale.length > 0) {
            const sorted = [...gradingScale].sort((a, b) => b.min - a.min);
            const match = sorted.find(g => pct >= g.min && pct <= g.max);
            if (match?.color) return match.color;
        }
        return pct >= passMark ? "#10B981" : "#EF4444";
    };

    // ── Subject rows: use student's assigned subjects as the list ─────────────
    // Priority: student.subjects (assigned via Assign Subjects modal)
    //           → classSubjects (all subjects in the class)
    //           → marks only (fallback)
    const studentAssignedSubjects: string[] = useMemo(() => {
        const raw = selectedStudent?.subjects || [];
        return raw.map((s: any) => (typeof s === "string" ? s : s.name || s.subjectName || "").trim()).filter(Boolean);
    }, [selectedStudent]);

    const allSubjectRows = useMemo(() => {
        const marksMap = new Map<string, any>(
            marks.map((m: any) => [(m.subjectName || "").toLowerCase().trim(), m])
        );

        // Use student's own assigned subjects list if available
        if (studentAssignedSubjects.length > 0) {
            return studentAssignedSubjects.map(name => {
                const m = marksMap.get(name.toLowerCase());
                return { subjectName: name, mark: m || null, hasMarks: !!m };
            });
        }

        // Fall back to class subjects list if available
        if (classSubjects.length > 0) {
            return classSubjects.map((sub: any) => {
                const name = sub.name || sub.subjectName || "";
                const m = marksMap.get(name.toLowerCase().trim());
                return { subjectName: name, mark: m || null, hasMarks: !!m };
            });
        }

        // Final fallback: only show subjects that have marks
        return marks.map((m: any) => ({ subjectName: m.subjectName || "—", mark: m, hasMarks: true }));
    }, [marks, studentAssignedSubjects, classSubjects]);

    // Total max depends on missingMarkPolicy:
    //   "skip"           → only rows with actual marks contribute to max
    //   "count_as_zero"  → ALL assigned subject rows contribute (unscored = 0/maxMarks)
    const totalMaxAll = allSubjectRows.reduce((sum: number, row: any) => {
        if (!row.hasMarks) {
            return missingMarkPolicy === "count_as_zero" ? sum + 100 : sum;
        }
        return sum + (row.mark ? Number(row.mark.totalMarks) || 100 : 100);
    }, 0);

    const overallGrade = getGradeForPct(overall);
    const overallStatus = getStatusForPct(overall);

    // Internal/continuous assessment types — excluded from official report by default
    const INTERNAL_TYPES = new Set(["cat", "assignment", "mid term", "midterm", "opening", "opener", "opening / opener", "mock", "homework", "quiz", "internal"]);
    const isCatType = (exam: any) => {
        const t = (exam.type || exam.examType || "").toLowerCase().trim();
        return INTERNAL_TYPES.has(t) || Array.from(INTERNAL_TYPES).some(it => t.includes(it));
    };

    // ── Build subject → teacher map from staff specializedSubjects ────────────
    const subjectTeachers = useMemo(() => {
        const map: Record<string, string> = {};
        allStaff.forEach((s: any) => {
            const name = s.employeeName || s.name || "";
            const d    = (s.designation || s.role || "").toLowerCase();
            if (!d.includes("teacher") && !s.isTeachingStaff) return;
            (s.specializedSubjects || []).forEach((sid: any) => {
                // sid may be an ID string; look up the subject name
                if (!map[sid]) map[sid] = name;
            });
        });
        return map;
    }, [allStaff]);

    // Helper: resolve subject name from marks subjectName
    const getTeacherForSubject = (subjectName: string) => {
        // Try direct name match first
        const byName = allStaff.find((s: any) => {
            const d = (s.designation || s.role || "").toLowerCase();
            if (!d.includes("teacher") && !s.isTeachingStaff) return false;
            return (s.specializedSubjects || []).some((sid: any) => {
                const sub = classSubjects.find((cs: any) => cs._id?.toString() === sid?.toString());
                return (sub?.name || sub?.subjectName || "").toLowerCase() === subjectName.toLowerCase();
            });
        });
        return byName ? (byName.employeeName || byName.name || "—") : "—";
    };

    // ── Available internal exams for the same term as selected exam ───────────
    const availableInternalExams = useMemo(() => {
        if (!selectedExam) return [];
        const term   = (selectedExam.term || "").trim();
        const termId = (selectedExam.termId || "").trim();
        return exams.filter((e: any) => {
            if (!isCatType(e) || e._id === selectedExam._id) return false;
            const eTerm   = (e.term || "").trim();
            const eTermId = (e.termId || "").trim();
            return (term && eTerm === term) || (termId && eTermId === termId);
        });
    }, [exams, selectedExam]);

    // ── CAT/Internal exam IDs to include ──────────────────────────────────────
    // If user has specifically selected exams → use those.
    // If includeCats toggle is on but no specific selection → use all available for same term.
    const catExamIds = useMemo(() => {
        if (!includeCats) return new Set<string>();
        if (selectedInternalIds.size > 0) return selectedInternalIds;
        // Default: all available internal exams for this term
        return new Set(availableInternalExams.map((e: any) => e._id?.toString()));
    }, [includeCats, selectedInternalIds, availableInternalExams]);

    // Per-subject CAT totals for the student
    const catBySubject = useMemo(() => {
        const map: Record<string, { obtained: number; max: number }> = {};
        studentAllMarks
            .filter((m: any) => catExamIds.has(m.examId?.toString()))
            .forEach((m: any) => {
                const name = (m.subjectName || "").toLowerCase();
                if (!map[name]) map[name] = { obtained: 0, max: 0 };
                map[name].obtained += Number(m.marksObtained) || 0;
                map[name].max      += Number(m.totalMarks)    || 100;
            });
        return map;
    }, [studentAllMarks, catExamIds]);

    const termProgress = exams
        .map((exam: any) => {
            const examMarks = studentAllMarks.filter((m: any) => m.examId === exam._id);
            if (examMarks.length === 0) return null;
            const totalObtained = examMarks.reduce((sum: number, m: any) => sum + (Number(m.marksObtained) || 0), 0);
            const totalMax      = examMarks.reduce((sum: number, m: any) => sum + (Number(m.totalMarks) || 100), 0);
            const pct   = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
            const grade = getGradeForPct(pct);
            return {
                examId: exam._id,
                examName: exam.examName,
                examType: exam.type || exam.examType || "",
                isCat: isCatType(exam),
                totalObtained, totalMax, pct, grade,
                startDate: exam.startDate
            };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());

    // Merge CAT marks into their own term's main exam ONLY
    // Each CAT is matched by term name to avoid cross-term contamination.
    const mergedTermProgress = (() => {
        const mainExams = termProgress.filter((e: any) => !e.isCat);
        const catExams  = termProgress.filter((e: any) => e.isCat);

        if (!includeCats || catExams.length === 0) return mainExams;

        return mainExams.map((main: any) => {
            const mainTerm = (main.term || main.examType || "").trim();

            // Only include CATs that share the SAME term as this main exam
            const relatedCats = catExams.filter((c: any) => {
                const catTerm = (c.term || c.examType || "").trim();
                return catTerm === mainTerm || !catTerm; // match by term or fallback if term unset
            });

            if (relatedCats.length === 0) return main; // no related CATs — show main as-is

            const catTotal    = relatedCats.reduce((s: number, c: any) => s + c.totalObtained, 0);
            const catMax      = relatedCats.reduce((s: number, c: any) => s + c.totalMax, 0);
            const combined    = main.totalObtained + catTotal;
            const combinedMax = main.totalMax + catMax;
            const pct         = combinedMax > 0 ? Math.round((combined / combinedMax) * 100) : 0;
            return {
                ...main,
                examName: `${main.examName} + CAT`,
                totalObtained: combined,
                totalMax: combinedMax,
                pct,
                grade: getGradeForPct(pct),
            };
        });
    })();

    const finalTermProgress = mergedTermProgress.length > 0
        ? mergedTermProgress
        : [{
            examId: selectedExam?._id || "current",
            examName: selectedExam?.examName || selectedExam?.name || "Current Term",
            totalObtained,
            totalMax: totalMaxAll,
            pct: overall,
            grade: overallGrade
        }];


    const schoolName = tenantProfile?.name || tenantProfile?.schoolName || tenantProfile?.instituteName || "ShuleCloud School";
    const schoolTagline = tenantProfile?.targetLine || tenantProfile?.tagline || "Excellence in Education";
    const schoolLogo = tenantProfile?.logo || tenantProfile?.logoUrl || "";
    const reportTemplate = tenantProfile?.reportTemplate || "annual_exam";
    const schoolAddress = [tenantProfile?.address || tenantProfile?.location, tenantProfile?.city || tenantProfile?.county, tenantProfile?.phone].filter(Boolean).join(" · ");
    const examDate = selectedExam?.startDate ? new Date(selectedExam.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";
    const printRef = useRef<HTMLDivElement>(null);

    // QR that opens the online verification page for this report card
    const [qrUrl, setQrUrl] = useState("");
    useEffect(() => {
        let live = true;
        setQrUrl("");
        if (!selectedStudent?._id || !selectedExam) return;
        reportQr({
            studentId: String(selectedStudent._id), className: selectedClass?.levelName || selectedClass?.name || selectedStudent?.class || "",
            term: currentPeriod?.label || "", year: String(currentPeriod?.academicYear || selectedExam.academicYear || ""),
            exam: selectedExam.examName || selectedExam.name || "", average: overall, grade: overallGrade,
        }).then(u => { if (live) setQrUrl(u); });
        return () => { live = false; };
    }, [selectedStudent?._id, selectedExam?._id, overall, overallGrade, currentPeriod?.label]);

    const navigate = useNavigate();
    const printInNewWindow = () => {
        // The school's classic A4 format is printed from the ScholarSheet page
        if (reportTemplate === "scholarsheet") { navigate(`/exams/scholar-sheet?studentId=${selectedStudent?._id || ""}&examId=${selectedExam?._id || ""}`); return; }
        const content = printRef.current;
        if (!content) return;
        const win = openPrintDoc();
        if (!win) return;
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML).join('\n');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Result Card – ${getStudentName(selectedStudent)}</title>
                ${styles}
                <style>
                    @page { size: A4 portrait; margin: 12mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 16px; background: white; }
                    * { box-sizing: border-box; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { padding: 6px 10px; font-size: 11px; }
                </style>
            </head>
            <body>${content.innerHTML}</body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 800);
    };

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            <div className="print:hidden w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Exams</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Result Card</span>
                </div>
                <div className="flex items-center gap-2">
                    {selectedExam && selectedClass && (
                        <button onClick={() => emailAll(selectedExam, selectedClass)} disabled={emailing}
                            className="flex items-center gap-2 px-5 py-2 bg-[#159a52] hover:bg-[#127a42] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md transition-all disabled:opacity-60">
                            {emailing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} {emailing ? "Emailing…" : "Email Result Cards"}
                        </button>
                    )}
                    {selectedStudent && marks.length > 0 && (
                        <button onClick={printInNewWindow} className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md transition-all">
                            <Printer className="w-3.5 h-3.5" /> Print Result Card
                        </button>
                    )}
                </div>
            </div>

            <div className="print:hidden flex-1 px-8 py-8 w-full max-w-6xl mx-auto">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Result Card</h1>
                <p className="text-slate-400 text-sm font-medium mb-8">Generate individual student result cards with full academic performance.</p>

                {/* Selectors */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {/* Exam */}
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Exam</label>
                        <select
                            value={selectedExam?._id || ""}
                            onChange={e => setSelectedExam(exams.find((o: any) => o._id === e.target.value) || null)}
                            className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none"
                        >
                            <option value="">— Select Exam —</option>
                            {exams.map((o: any) => (
                                <option key={o._id} value={o._id}>
                                    {o.examName || o.name || o.label || "Unnamed Exam"}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 bottom-4 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Class */}
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Class</label>
                        <select
                            value={selectedClass?._id || ""}
                            onChange={e => { setSelectedClass(classes.find((o: any) => o._id === e.target.value) || null); setSelectedStudent(null); setSearch(""); }}
                            className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none"
                        >
                            <option value="">— Select Class —</option>
                                {classes.map((o: any) => (
                                <option key={o._id} value={o._id}>
                                    {o.levelName || o.name || "—"}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 bottom-4 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Student search */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Student</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…" className="w-full h-12 pl-12 pr-4 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-300" />
                        </div>
                        {search && filteredStudents.length > 0 && (
                            <div className="absolute mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto w-full max-w-xs">
                                {filteredStudents.map((s: any) => (
                        <button key={s._id} onClick={() => { setSelectedStudent(s); setSearch(""); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-[#5C67F2] flex items-center gap-2 transition-colors">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-[#5C67F2] text-[10px] font-black">{getStudentName(s)[0]}</div>
                                        {getStudentName(s)} <span className="text-slate-400 text-xs font-normal">({getAdmNo(s)})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Result Card */}
                {selectedStudent && selectedExam ? (
                    loadingMarks ? (
                        <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>
                    ) : (
                        <div className="print:hidden bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Header — school logo + name + student photo */}
                            <div className="bg-gradient-to-r from-[#5C67F2] to-indigo-600 px-8 py-5 text-white relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                                <div className="flex items-center justify-between relative z-10">
                                    {/* School logo + name */}
                                    <div className="flex items-center gap-3">
                                        {schoolLogo ? (
                                            <img src={schoolLogo} alt={schoolName} className="w-14 h-14 rounded-xl object-contain bg-white/10 p-1 border border-white/20" />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                                                <GraduationCap className="w-7 h-7 text-white" />
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="text-lg font-black uppercase tracking-wide leading-tight">{schoolName}</h2>
                                            <p className="text-white/70 text-[11px] font-medium">{schoolTagline}</p>
                                            <div className="mt-1 inline-block px-3 py-0.5 bg-white/15 rounded-full">
                                                <p className="text-[9px] font-black uppercase tracking-widest">Student Result Card</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Student photo */}
                                    <div className="flex-shrink-0">
                                        {studentPhoto ? (
                                            <img src={studentPhoto} alt={getStudentName(selectedStudent)} className="w-16 h-20 rounded-xl object-cover border-2 border-white/40" />
                                        ) : (
                                            <div className="w-16 h-20 rounded-xl bg-white/20 border-2 border-white/30 flex items-center justify-center">
                                                <User className="w-7 h-7 text-white/60" />
                                            </div>
                                        )}
                                        <p className="text-[8px] text-white/50 text-center mt-1 uppercase">Photo</p>
                                    </div>
                                </div>
                            </div>

                            {/* Student Info */}
                            <div className="px-8 py-4 bg-slate-50 border-b border-gray-100">
                                <div className="grid grid-cols-4 gap-4">
                                    {[
                                        { label: "Student Name", value: getStudentName(selectedStudent) },
                                        { label: "Admission No.", value: getAdmNo(selectedStudent) },
                                        { label: "Class", value: selectedClass?.levelName || selectedClass?.name || selectedStudent?.class || "—" },
                                        { label: "Academic Period", value: currentPeriod ? `${currentPeriod.label} · ${currentPeriod.academicYear}` : selectedExam.academicYear || "—" },
                                        { label: "Exam", value: selectedExam.examName || selectedExam.name || "—" },
                                        { label: "Exam Date", value: examDate },
                                        { label: "Curriculum", value: curriculumName },
                                        { label: "Overall Result", value: overall >= passMark ? "✅ PASSED" : "❌ FAILED" },
                                    ].map(item => (
                                        <div key={item.label}>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">{item.label}</p>
                                            <p className="text-sm font-black text-slate-800">{String(item.value)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Marks Table — shows ALL subjects, "-" where no marks */}
                            <div className="px-8 py-5">
                                {/* Grading scale legend */}
                                {gradingScale.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4 items-center">
                                        {gradingScale.map((g: any) => (
                                            <span key={g.grade} className="text-[9px] font-black px-2.5 py-1 rounded-full border" style={{ color: g.color || "#5C67F2", borderColor: `${g.color || "#5C67F2"}40`, backgroundColor: `${g.color || "#5C67F2"}10` }}>
                                                {g.grade}: {g.min}–{g.max}%{g.label ? ` (${g.label})` : ""}
                                            </span>
                                        ))}
                                        <span className="text-[9px] font-bold text-gray-400 px-2.5 py-1">Pass mark: {passMark}%</span>
                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ml-2 ${missingMarkPolicy === "count_as_zero" ? "bg-red-50 border-red-200 text-red-600" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                                            Missing marks: {missingMarkPolicy === "count_as_zero" ? "Counted as 0" : "Skipped"}
                                        </span>
                                    </div>
                                )}

                                {allSubjectRows.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 font-bold text-sm">
                                        <BookOpen className="w-8 h-8 mx-auto mb-3 text-slate-200" />
                                        No subjects or marks found for this exam and student.
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-[#5C67F2] to-indigo-500 text-white">
                                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest rounded-tl-xl">#</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Subject</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Teacher</th>
                                                {includeCats && catExamIds.size > 0 && <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest bg-amber-500/30">CAT</th>}
                                                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">{includeCats && catExamIds.size > 0 ? "End Term" : "Max"}</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">{includeCats && catExamIds.size > 0 ? "Obtained" : "Obtained"}</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">%</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Grade</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest rounded-tr-xl">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allSubjectRows.map((row: any, i: number) => {
                                                const m = row.mark;
                                                const hasMarks = row.hasMarks && m;
                                                const pct      = hasMarks && m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : null;
                                                const subGrade  = pct !== null ? getGradeForPct(pct) : "—";
                                                const gradeClr  = pct !== null ? getGradeColor(pct) : "#94a3b8";
                                                const status    = pct !== null ? getStatusForPct(pct) : "—";
                                                // CAT data for this subject
                                                const catKey = row.subjectName.toLowerCase();
                                                const catData = catBySubject[catKey];
                                                const catObtained = catData?.obtained ?? null;
                                                const catMax      = catData?.max ?? null;
                                                // Combined total (end term + cat)
                                                const combinedObtained = hasMarks && catObtained !== null ? (Number(m?.marksObtained) || 0) + catObtained : (hasMarks ? Number(m?.marksObtained) || 0 : null);
                                                const combinedMax      = hasMarks && catMax !== null ? (Number(m?.totalMarks) || 100) + catMax : (hasMarks ? Number(m?.totalMarks) || 100 : null);
                                                const combinedPct      = combinedMax && combinedMax > 0 ? Math.round(((combinedObtained ?? 0) / combinedMax) * 100) : pct;
                                                const teacher = getTeacherForSubject(row.subjectName);

                                                return (
                                                    <tr key={i} className={`border-b border-gray-50 ${!hasMarks ? "opacity-60" : i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-400">{i + 1}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-sm font-black text-slate-800">{row.subjectName}</span>
                                                            {!hasMarks && <span className="ml-2 text-[8px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-black uppercase">no marks</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-400 font-medium">{teacher}</td>
                                                        {/* CAT column — only shown when includeCats is on and there are CAT exams */}
                                                        {includeCats && catExamIds.size > 0 && (
                                                            <td className="px-3 py-3 text-center bg-amber-50/40">
                                                                {catObtained !== null ? (
                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                        <span className="text-xs font-black text-amber-700">{catObtained}/{catMax}</span>
                                                                        <span className="text-[9px] text-amber-500 font-bold">{catMax && catMax > 0 ? Math.round((catObtained / catMax) * 100) : 0}%</span>
                                                                    </div>
                                                                ) : <span className="text-[10px] text-gray-300">—</span>}
                                                            </td>
                                                        )}
                                                        {/* End Term / Max column */}
                                                        <td className="px-4 py-3 text-center text-sm font-bold text-slate-600">
                                                            {hasMarks ? (includeCats && catExamIds.size > 0 ? `${m.marksObtained}/${m.totalMarks}` : m.totalMarks) : 100}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-sm font-black" style={{ color: hasMarks ? "#5C67F2" : "#94a3b8" }}>
                                                            {hasMarks ? (includeCats && catExamIds.size > 0 && combinedObtained !== null ? `${combinedObtained}/${combinedMax}` : m.marksObtained) : "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`text-xs font-black ${(combinedPct ?? pct) !== null ? ((combinedPct ?? pct)! >= passMark ? "text-emerald-600" : "text-red-500") : "text-gray-400"}`}>
                                                                {(combinedPct ?? pct) !== null ? `${combinedPct ?? pct}%` : "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${gradeClr}15`, color: gradeClr }}>{subGrade}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-500">{status}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                                                <td colSpan={2} className="px-4 py-3 text-sm font-black uppercase tracking-wider rounded-bl-xl">
                                                    TOTAL — {marks.length} scored / {allSubjectRows.length} subjects
                                                    {missingMarkPolicy === "count_as_zero" && allSubjectRows.length > marks.length && (
                                                        <span className="ml-2 text-[9px] bg-white/20 px-2 py-0.5 rounded-full">unscored = 0</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center font-black">{totalMaxAll}</td>
                                                <td className="px-4 py-3 text-center font-black text-yellow-400">{totalObtained}</td>
                                                <td className="px-4 py-3 text-center font-black text-yellow-400">
                                                    {totalMaxAll > 0 ? Math.round((totalObtained / totalMaxAll) * 100) : 0}%
                                                </td>
                                                <td className="px-4 py-3 text-center"><span className="font-black text-yellow-400 text-lg">{overallGrade}</span></td>
                                                <td className="px-4 py-3 font-black rounded-br-xl">{overall >= passMark ? "✅" : "❌"} {overallStatus}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>

                            {/* ── Term Progress: all exams per term ────── */}
                            {(finalTermProgress.length > 1 || termProgress.some((e: any) => e.isCat)) && (
                                <div className="px-8 py-5 border-t border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            Term Progress — {finalTermProgress.length} Exam{finalTermProgress.length !== 1 ? "s" : ""}
                                            {termProgress.some((e: any) => e.isCat) && (
                                                <span className="ml-2 text-amber-500 normal-case font-medium">
                                                    ({termProgress.filter((e: any) => e.isCat).length} CAT/Assignment hidden)
                                                </span>
                                            )}
                                        </p>
                                        {availableInternalExams.length > 0 && (
                                            <div className="flex items-center gap-2 relative">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <div className={`relative w-9 h-5 rounded-full transition-colors ${includeCats ? "bg-[#5C67F2]" : "bg-gray-200"}`}
                                                        onClick={() => { setIncludeCats(v => !v); if (includeCats) setSelectedInternalIds(new Set()); }}>
                                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${includeCats ? "left-4" : "left-0.5"}`} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-500">Include Internal</span>
                                                </label>
                                                {includeCats && (
                                                    <button onClick={() => setShowInternalPicker(v => !v)}
                                                        className="flex items-center gap-1 px-2.5 py-1 border border-indigo-200 bg-indigo-50 text-[#5C67F2] text-[10px] font-black rounded-lg hover:bg-indigo-100 transition-all">
                                                        {selectedInternalIds.size > 0 ? `${selectedInternalIds.size} selected` : "All"} ▾
                                                    </button>
                                                )}
                                                {/* Internal exam picker dropdown */}
                                                {includeCats && showInternalPicker && (
                                                    <div className="absolute top-8 right-0 z-20 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 min-w-[240px]">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                            Select internal exams to include:
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            <button onClick={() => setSelectedInternalIds(new Set())}
                                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedInternalIds.size === 0 ? "border-[#5C67F2] bg-[#5C67F2]/5 text-[#5C67F2]" : "border-gray-100 hover:bg-gray-50 text-gray-600"}`}>
                                                                ✓ All internal exams from this term
                                                            </button>
                                                            {availableInternalExams.map((e: any) => {
                                                                const eid = e._id?.toString();
                                                                const sel = selectedInternalIds.has(eid);
                                                                return (
                                                                    <button key={eid}
                                                                        onClick={() => {
                                                                            const next = new Set(selectedInternalIds);
                                                                            sel ? next.delete(eid) : next.add(eid);
                                                                            setSelectedInternalIds(next);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${sel ? "border-[#5C67F2] bg-[#5C67F2]/5 text-[#5C67F2]" : "border-gray-100 hover:bg-gray-50 text-gray-600"}`}>
                                                                        <span>{e.examName}</span>
                                                                        <span className="text-[9px] uppercase font-black ml-2 opacity-60">{e.type}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <button onClick={() => setShowInternalPicker(false)}
                                                            className="mt-3 w-full h-8 bg-[#5C67F2] text-white text-[10px] font-black uppercase rounded-xl hover:bg-[#4a54c4] transition-all">
                                                            Done
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress table — HORIZONTAL: exams as columns, metrics as rows */}
                                    <div className="overflow-x-auto rounded-xl border border-gray-100 mb-5">
                                        <table className="text-xs border-collapse" style={{ minWidth: `${120 + finalTermProgress.length * 140}px` }}>
                                            <thead>
                                                <tr>
                                                    <th className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-wide text-white bg-slate-800 rounded-tl-lg sticky left-0 z-10 min-w-[90px]">Metric</th>
                                                    {finalTermProgress.map((p: any, idx) => {
                                                        const isCurrent = p.examId === selectedExam?._id;
                                                        return (
                                                            <th key={p.examId}
                                                                className={`px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-wide text-white ${isCurrent ? "bg-[#5C67F2]" : "bg-slate-700"}`}>
                                                                <span className="block truncate max-w-[130px]">{p.examName}</span>
                                                                {isCurrent && <span className="text-[7px] opacity-80 font-bold">CURRENT</span>}
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[
                                                    { label: "Obtained", render: (p: any) => <span className="font-black text-[#5C67F2]">{p.totalObtained}</span> },
                                                    { label: "Max",      render: (p: any) => <span className="text-gray-500">{p.totalMax}</span> },
                                                    { label: "%",        render: (p: any) => <span className="font-black" style={{ color: getGradeColor(p.pct) }}>{p.pct}%</span> },
                                                    { label: "Grade",    render: (p: any) => <span className="font-black px-2 py-0.5 rounded-lg text-[10px]" style={{ backgroundColor: `${getGradeColor(p.pct)}15`, color: getGradeColor(p.pct) }}>{p.grade}</span> },
                                                    { label: "Trend",    render: (p: any, idx: number) => {
                                                        if (idx === 0) return <span className="text-gray-300 text-base">—</span>;
                                                        const prev = finalTermProgress[idx - 1];
                                                        const tr = p.pct > prev.pct ? "▲" : p.pct < prev.pct ? "▼" : "→";
                                                        const cl = tr === "▲" ? "text-emerald-600" : tr === "▼" ? "text-red-500" : "text-gray-400";
                                                        return <span className={`font-black text-base ${cl}`}>{tr}</span>;
                                                    }},
                                                ].map((row, rIdx) => (
                                                    <tr key={row.label} className={rIdx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                                                        <td className="px-3 py-2 text-[9px] font-black uppercase tracking-wide text-gray-400 bg-gray-50 border-r border-gray-100 sticky left-0 z-10">{row.label}</td>
                                                        {finalTermProgress.map((p: any, idx) => (
                                                            <td key={p.examId} className="px-4 py-2 text-center border-b border-gray-50">
                                                                {row.render(p, idx)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* SVG Line Graph */}
                                    <div className="bg-slate-50/60 rounded-2xl border border-slate-100 p-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Performance Trend</p>
                                        <svg viewBox="0 0 600 160" className="w-full h-36">
                                            <defs>
                                                <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#5C67F2" stopOpacity="0.3" />
                                                    <stop offset="100%" stopColor="#5C67F2" stopOpacity="0.0" />
                                                </linearGradient>
                                            </defs>
                                            {/* Grid lines */}
                                            {[0, 25, 50, 75, 100].map(pct => {
                                                const y = 130 - (pct / 100) * 100;
                                                return (
                                                    <g key={pct}>
                                                        <line x1="40" y1={y} x2="580" y2={y} stroke={pct === passMark ? "#EF4444" : "#e2e8f0"} strokeDasharray={pct === passMark ? "4" : "3"} strokeWidth={pct === passMark ? "1.5" : "1"} />
                                                        <text x="36" y={y + 4} textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="700">{pct}</text>
                                                    </g>
                                                );
                                            })}
                                            {/* Pass mark label */}
                                            <text x="584" y={130 - (passMark / 100) * 100 + 4} fontSize="7" fill="#EF4444" fontWeight="900">Pass</text>

                                            {/* Area */}
                                            {(() => {
                                                const pts = finalTermProgress;
                                                if (pts.length < 2) return null;
                                                const step = 540 / (pts.length - 1);
                                                const coords = pts.map((p: any, i: number) => ({ x: 40 + i * step, y: 130 - (p.pct / 100) * 100 }));
                                                const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
                                                const area = `M ${coords[0].x} 130 L ${coords.map(c => `${c.x} ${c.y}`).join(" L ")} L ${coords[coords.length - 1].x} 130 Z`;
                                                return (
                                                    <>
                                                        <path d={area} fill="url(#progressGrad)" />
                                                        <path d={line} fill="none" stroke="#5C67F2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                        {coords.map((c, i) => {
                                                            const isCurr = pts[i].examId === selectedExam?._id;
                                                            return (
                                                                <g key={i}>
                                                                    <circle cx={c.x} cy={c.y} r={isCurr ? 6 : 4.5} fill={isCurr ? "#5C67F2" : "#fff"} stroke="#5C67F2" strokeWidth="2.5" />
                                                                    <text x={c.x} y="148" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700">{pts[i].examName?.split(" ").slice(-1)[0]}</text>
                                                                    <text x={c.x} y={c.y - 9} textAnchor="middle" fontSize="9" fill="#5C67F2" fontWeight="900">{pts[i].pct}%</text>
                                                                </g>
                                                            );
                                                        })}
                                                    </>
                                                );
                                            })()}

                                            {/* Single point */}
                                            {finalTermProgress.length === 1 && (
                                                <>
                                                    <circle cx="300" cy={130 - (finalTermProgress[0].pct / 100) * 100} r="6" fill="#5C67F2" />
                                                    <text x="300" y={130 - (finalTermProgress[0].pct / 100) * 100 - 10} textAnchor="middle" fontSize="10" fill="#5C67F2" fontWeight="900">{finalTermProgress[0].pct}%</text>
                                                </>
                                            )}
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {/* Signature section */}
                            <div className="px-8 py-6 border-t border-gray-100 grid grid-cols-3 gap-8">
                                {["Class Teacher", "Principal / Head", "Parent / Guardian"].map(role => (
                                    <div key={role} className="text-center">
                                        <div className="h-10 border-b border-dashed border-slate-300 mb-2" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-4">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                            <Award className="w-10 h-10 text-[#5C67F2]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-black text-slate-700">Select Exam & Student</h3>
                            <p className="text-slate-400 text-sm font-medium mt-1">Choose an exam, class, and student to generate their result card.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Print-only template (hidden on screen, shown on print) — outside print:hidden */}
            {selectedStudent && selectedExam && (marks.length > 0 || allSubjectRows.length > 0) && (
                <div ref={printRef} style={{ display: "none" }}>
                    <RenderPrintTemplate
                        templateId={reportTemplate}
                        schoolName={schoolName}
                        schoolTagline={schoolTagline}
                        schoolLogo={schoolLogo}
                        qrUrl={qrUrl}
                        schoolAddress={schoolAddress}
                        studentName={getStudentName(selectedStudent)}
                        admNo={getAdmNo(selectedStudent)}
                        studentPhoto={studentPhoto}
                        className={selectedClass?.levelName || selectedClass?.name || selectedStudent?.class || "—"}
                        periodLabel={currentPeriod ? `${currentPeriod.label} · ${currentPeriod.academicYear}` : selectedExam.academicYear || "—"}
                        examName={selectedExam.examName || selectedExam.name || "Exam"}
                        examDate={examDate}
                        marks={allSubjectRows.map((r: any) => r.mark ? { ...r.mark, subjectName: r.subjectName } : { subjectName: r.subjectName, marksObtained: null, totalMarks: 100, grade: "—", noMarks: true })}
                        termProgress={finalTermProgress}
                        totalMax={totalMaxAll}
                        totalObtained={totalObtained}
                        overall={totalMaxAll > 0 ? Math.round((totalObtained / totalMaxAll) * 100) : 0}
                        overallGrade={overallGrade}
                        overallStatus={overallStatus}
                        getGradeForPct={getGradeForPct}
                        getStatusForPct={getStatusForPct}
                        passMark={passMark}
                        gradingScale={gradingScale}
                    />
                </div>
            )}
        </div>
    );
}
