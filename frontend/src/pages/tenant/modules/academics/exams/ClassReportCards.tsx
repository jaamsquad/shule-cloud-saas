import { useState, useRef, useMemo } from "react";
import { Home, Printer, ChevronDown, Loader2, Users, Award, CheckCircle2, XCircle, BarChart3, FileText, Eye, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { RenderPrintTemplate } from "./PrintTemplates";
import { openPrintDoc } from "@/lib/pdfDoc";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useGradingFns() {
    const { data: curriculumSettings } = useQuery<any>({
        queryKey: ["curriculum_settings"],
        queryFn: async () => { const r = await api.get("/curriculum_settings"); return Array.isArray(r.data) ? r.data[0] : null; },
    });
    const { data: gradingConfig } = useQuery<any>({
        queryKey: ["grading_criteria"],
        queryFn: async () => (await api.get("/grading_criteria")).data?.[0],
    });

    const scale: any[] = useMemo(() => {
        if (curriculumSettings?.gradingScale?.length) return curriculumSettings.gradingScale;
        if (gradingConfig?.grades?.length) return gradingConfig.grades.map((g: any) => ({ grade: g.grade, min: g.from, max: g.upto, label: g.status, color: g.color }));
        return [];
    }, [curriculumSettings, gradingConfig]);

    const passMark: number = curriculumSettings?.passMark ?? gradingConfig?.passmark ?? 50;

    const getGrade = (pct: number) => {
        if (scale.length) { const s = [...scale].sort((a, b) => b.min - a.min).find(g => pct >= g.min && pct <= g.max); if (s) return s.grade; }
        if (pct >= 80) return "A"; if (pct >= 70) return "B+"; if (pct >= 60) return "B";
        if (pct >= 50) return "C+"; if (pct >= 40) return "C"; if (pct >= 33) return "D"; return "F";
    };
    const getStatus = (pct: number) => {
        if (scale.length) { const s = [...scale].sort((a, b) => b.min - a.min).find(g => pct >= g.min && pct <= g.max); if (s?.label) return s.label; }
        return pct >= passMark ? "Pass" : "Fail";
    };
    const getColor = (pct: number) => {
        if (scale.length) { const s = [...scale].sort((a, b) => b.min - a.min).find(g => pct >= g.min && pct <= g.max); if (s?.color) return s.color; }
        return pct >= passMark ? "#10B981" : "#EF4444";
    };

    return { getGrade, getStatus, getColor, passMark, scale, curriculumId: curriculumSettings?.curriculumId };
}

export default function ClassReportCards() {
    const [selectedExam, setSelectedExam]   = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [emailing, setEmailing] = useState(false);

    const emailAllReports = async () => {
        if (!selectedExam || !selectedClass) { toast.error("Select an exam and class first"); return; }
        if (!confirm(`Email report cards to all parents in ${selectedClass.levelName || selectedClass.name} for ${selectedExam.examName || selectedExam.name}?`)) return;
        setEmailing(true);
        try {
            const r = await api.post("/exams/email-result-cards", { examId: selectedExam._id, classId: selectedClass._id, className: selectedClass.levelName || selectedClass.name });
            const { sent = 0, failed = 0, skipped = 0, total = 0 } = r.data || {};
            toast.success(`Reports emailed — ${sent} sent${failed ? `, ${failed} failed` : ""}${skipped ? `, ${skipped} without parent email` : ""} (of ${total}).`);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to email reports");
        } finally { setEmailing(false); }
    };
    const printAllRef = useRef<HTMLDivElement>(null);

    const { getGrade, getStatus, getColor, passMark, scale, curriculumId } = useGradingFns();

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data || [] });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data || [] });
    const { data: allStudents = [] } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });
    const { data: tenantProfile } = useQuery<any>({ queryKey: ["tenant_profile_global"], queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; } });
    const { data: periods = [] } = useQuery<any[]>({ queryKey: ["periods"], queryFn: async () => (await api.get("/academics/periods")).data || [] });

    // Subjects ASSIGNED to the class (set in Assign Subjects). Report cards show
    // only these — never the whole subjects collection.
    const { data: classSubjects = [] } = useQuery<any[]>({
        queryKey: ["subjects_for_class", selectedClass?._id],
        queryFn: async () => {
            if (!selectedClass) return [];
            if (Array.isArray(selectedClass.subjects) && selectedClass.subjects.length > 0) {
                return selectedClass.subjects.map((s: any) => ({ _id: s.subjectId || s._id, name: s.subjectName || s.name, subjectName: s.subjectName || s.name }));
            }
            const name = selectedClass.levelName || selectedClass.name || "";
            const r = await api.get(`/subjects?className=${encodeURIComponent(name)}`);
            return Array.isArray(r.data) ? r.data : [];
        },
        enabled: !!selectedClass,
    });

    // All marks for the selected exam
    const { data: allMarks = [], isLoading: loadingMarks } = useQuery<any[]>({
        queryKey: ["class-report-marks", selectedExam?._id],
        queryFn: async () => (await api.get(`/academics/exam-marks?examId=${selectedExam._id}`)).data || [],
        enabled: !!selectedExam,
    });

    // ── Derived data ───────────────────────────────────────────────────────────
    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        return allStudents.filter((s: any) =>
            s.classId === selectedClass._id ||
            s.studentClass === (selectedClass.levelName || selectedClass.name)
        );
    }, [allStudents, selectedClass]);

    // Derive a shared subject name list for the class.
    // We prefer each student's own assigned subjects (student.subjects field).
    // Fall back to classSubjects, then to subjects extracted from marks.
    const subjectNames = useMemo(() => {
        // Try first student with assigned subjects as a representative for the class
        const withSubjects = allStudents.find((s: any) =>
            classStudents.some((cs: any) => cs._id === s._id) &&
            Array.isArray(s.subjects) && s.subjects.length > 0
        );
        if (withSubjects?.subjects?.length > 0) {
            return withSubjects.subjects
                .map((s: any) => (typeof s === "string" ? s : s.name || s.subjectName || "").trim())
                .filter(Boolean) as string[];
        }
        if (classSubjects.length > 0) {
            return classSubjects.map((s: any) => s.name || s.subjectName).filter(Boolean) as string[];
        }
        return [...new Set(allMarks.map((m: any) => m.subjectName).filter(Boolean))] as string[];
    }, [allStudents, classStudents, classSubjects, allMarks]);

    // Missing mark policy from the exam record
    const missingMarkPolicy: "skip" | "count_as_zero" = (selectedExam as any)?.missingMarkPolicy || "skip";

    // Build per-student summary
    const studentSummaries = useMemo(() => {
        return classStudents.map((student: any) => {
            const studentMarks = allMarks.filter((m: any) =>
                m.studentId === student._id?.toString() ||
                m.studentId === student._id ||
                m.studentName === (student.studentName || `${student.firstName} ${student.lastName}`.trim())
            );

            // Use this student's own assigned subjects if available
            const ownSubjectNames: string[] = Array.isArray(student.subjects) && student.subjects.length > 0
                ? student.subjects.map((s: any) => (typeof s === "string" ? s : s.name || s.subjectName || "").trim()).filter(Boolean)
                : subjectNames;

            const marksMap = new Map(studentMarks.map((m: any) => [(m.subjectName || "").toLowerCase(), m]));

            let obtained = 0;
            let maxForCalc = 0;

            if (missingMarkPolicy === "count_as_zero" && ownSubjectNames.length > 0) {
                // Include ALL assigned subjects — missing ones get 0/maxMarks
                ownSubjectNames.forEach(name => {
                    const m = marksMap.get(name.toLowerCase());
                    obtained += m ? Number(m.marksObtained) || 0 : 0;
                    maxForCalc += m ? Number(m.totalMarks) || 100 : 100;
                });
            } else {
                // Default "skip": only count subjects that have marks
                obtained = studentMarks.reduce((sum: number, m: any) => sum + (Number(m.marksObtained) || 0), 0);
                maxForCalc = studentMarks.reduce((sum: number, m: any) => sum + (Number(m.totalMarks) || 100), 0);
            }

            const maxScored = studentMarks.reduce((sum: number, m: any) => sum + (Number(m.totalMarks) || 100), 0);
            const totalSubjects = Math.max(ownSubjectNames.length, studentMarks.length);
            const maxAll = missingMarkPolicy === "count_as_zero" ? maxForCalc : (totalSubjects * 100);
            const pct = maxForCalc > 0 ? Math.round((obtained / maxForCalc) * 100) : 0;

            const name = student.studentName || `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.name || "—";
            const admNo = student.admissionNumber || student.admNo || student.registrationNo || "—";

            return { student, name, admNo, studentMarks, marksMap, ownSubjectNames, obtained, maxScored, maxAll: maxAll || maxScored, totalSubjects, scoredSubjects: studentMarks.length, pct, grade: getGrade(pct), status: getStatus(pct), color: getColor(pct) };
        });
    }, [classStudents, allMarks, subjectNames, getGrade, getStatus, getColor]);

    // ── Class statistics ───────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const scored = studentSummaries.filter(s => s.scoredSubjects > 0);
        if (scored.length === 0) return { avg: 0, passCount: 0, failCount: 0, scored: 0 };
        const avg = Math.round(scored.reduce((s, r) => s + r.pct, 0) / scored.length);
        const passCount = scored.filter(r => r.pct >= passMark).length;
        return { avg, passCount, failCount: scored.length - passCount, scored: scored.length };
    }, [studentSummaries, passMark]);

    const schoolName    = tenantProfile?.name || tenantProfile?.instituteName || "School";
    const schoolLogo    = tenantProfile?.logo || tenantProfile?.logoUrl || "";
    const schoolTagline = tenantProfile?.tagline || tenantProfile?.targetLine || "";
    const reportTemplate = tenantProfile?.reportTemplate || "cherith_termly";
    const currentPeriod  = periods.find((p: any) => p.isCurrent) || periods[0];
    const examDate       = selectedExam?.startDate ? new Date(selectedExam.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";
    const periodLabel    = currentPeriod ? `${currentPeriod.label} · ${currentPeriod.academicYear}` : selectedExam?.academicYear || "—";
    const className      = selectedClass?.levelName || selectedClass?.name || "—";

    // ── Print single student ───────────────────────────────────────────────────
    const printStudent = (row: typeof studentSummaries[0]) => {
        const win = openPrintDoc();
        if (!win) return;
        const styles = Array.from(document.querySelectorAll("style, link[rel=stylesheet]")).map(e => e.outerHTML).join("\n");
        // Use this student's own assigned subject list
        const subList = row.ownSubjectNames.length > 0 ? row.ownSubjectNames : subjectNames;
        const marks = subList.map((name: string) => {
            const m = row.studentMarks.find((mk: any) => (mk.subjectName || "").toLowerCase() === name.toLowerCase());
            return m ? { ...m } : { subjectName: name, marksObtained: null, totalMarks: 100, noMarks: true };
        });
        if (marks.length === 0) marks.push(...row.studentMarks);

        const div = document.createElement("div");
        document.body.appendChild(div);
        import("react-dom/client").then(({ createRoot }) => {
            const root = createRoot(div);
            import("react").then(React => {
                root.render(React.createElement(RenderPrintTemplate, {
                    templateId: reportTemplate, curriculumId,
                    schoolName, schoolTagline, schoolLogo,
                    studentName: row.name, admNo: row.admNo,
                    studentPhoto: row.student?.studentPhoto || row.student?.photo || row.student?.avatar || row.student?.photoUrl || row.student?.profilePhoto || null,
                    className, periodLabel, examName: selectedExam?.examName || selectedExam?.name || "Exam",
                    examDate, marks,
                    totalMax: row.maxAll, totalObtained: row.obtained,
                    overall: row.pct, overallGrade: row.grade, overallStatus: row.status,
                    getGradeForPct: getGrade, getStatusForPct: getStatus,
                    passMark, gradingScale: scale,
                }));
                setTimeout(() => {
                    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report Card – ${row.name}</title>${styles}<style>@page{size:A4;margin:12mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;padding:16px;background:white}*{box-sizing:border-box}table{border-collapse:collapse;width:100%}th,td{padding:6px 10px;font-size:11px}</style></head><body>${div.innerHTML}</body></html>`);
                    win.document.close(); win.focus(); setTimeout(() => { win.print(); document.body.removeChild(div); }, 600);
                }, 400);
            });
        });
    };

    // ── Print ALL students (batch) ─────────────────────────────────────────────
    const printAll = () => {
        const el = printAllRef.current;
        if (!el) return;
        const win = openPrintDoc();
        if (!win) return;
        const styles = Array.from(document.querySelectorAll("style, link[rel=stylesheet]")).map(e => e.outerHTML).join("\n");
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Class Report Cards – ${className}</title>${styles}<style>@page{size:A4;margin:12mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;background:white}*{box-sizing:border-box}table{border-collapse:collapse;width:100%}th,td{padding:6px 10px;font-size:11px}.page-break{page-break-after:always;break-after:always}</style></head><body>${el.innerHTML}</body></html>`);
        win.document.close(); win.focus(); setTimeout(() => win.print(), 800);
    };

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="print:hidden w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Exams</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Class Report Cards</span>
                </div>
                <div className="flex items-center gap-2">
                    {selectedExam && selectedClass && (
                        <button onClick={emailAllReports} disabled={emailing}
                            className="flex items-center gap-2 px-5 py-2 bg-[#159a52] hover:bg-[#127a42] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md transition-all disabled:opacity-60">
                            {emailing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} {emailing ? "Emailing…" : "Email All Reports"}
                        </button>
                    )}
                    {studentSummaries.some(s => s.scoredSubjects > 0) && (
                        <button onClick={printAll}
                            className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md transition-all">
                            <Printer className="w-3.5 h-3.5" /> Print All ({classStudents.length}) Reports
                        </button>
                    )}
                </div>
            </div>

            <div className="print:hidden flex-1 px-8 py-8 w-full max-w-7xl mx-auto">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Class Report Cards</h1>
                <p className="text-slate-400 text-sm font-medium mb-8">Generate and print report cards for all students in a class at once.</p>

                {/* ── Selectors ───────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Exam</label>
                        <select value={selectedExam?._id || ""}
                            onChange={e => setSelectedExam(exams.find((o: any) => o._id === e.target.value) || null)}
                            className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none">
                            <option value="">— Select Exam —</option>
                            {exams.map((o: any) => <option key={o._id} value={o._id}>{o.examName || o.name || "Unnamed Exam"}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 bottom-4 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Class</label>
                        <select value={selectedClass?._id || ""}
                            onChange={e => { setSelectedClass(classes.find((o: any) => o._id === e.target.value) || null); setExpandedStudent(null); }}
                            className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none">
                            <option value="">— Select Class —</option>
                            {classes.map((o: any) => <option key={o._id} value={o._id}>{o.levelName || o.name || "—"}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 bottom-4 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* ── Stats bar ───────────────────────────────────────── */}
                {selectedExam && selectedClass && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: "Total Students", value: classStudents.length, icon: Users, color: "#5C67F2", bg: "bg-indigo-50" },
                            { label: "Scored / Marked", value: `${stats.scored} / ${classStudents.length}`, icon: FileText, color: "#8B5CF6", bg: "bg-purple-50" },
                            { label: "Class Average", value: stats.scored > 0 ? `${stats.avg}%` : "—", icon: BarChart3, color: stats.avg >= passMark ? "#10B981" : "#EF4444", bg: stats.avg >= passMark ? "bg-emerald-50" : "bg-red-50" },
                            { label: "Pass / Fail", value: stats.scored > 0 ? `${stats.passCount} / ${stats.failCount}` : "—", icon: Award, color: "#F59E0B", bg: "bg-amber-50" },
                        ].map(s => (
                            <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3`}>
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                                    <p className="text-lg font-black text-slate-800">{String(s.value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Students table ──────────────────────────────────── */}
                {!selectedExam || !selectedClass ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-4">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                            <Users className="w-10 h-10 text-[#5C67F2]" />
                        </div>
                        <h3 className="text-base font-black text-slate-700">Select Exam & Class</h3>
                        <p className="text-slate-400 text-sm font-medium">Choose an exam and a class to generate their report cards.</p>
                    </div>
                ) : loadingMarks ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" />
                        <span className="text-sm font-bold uppercase tracking-widest">Loading marks…</span>
                    </div>
                ) : classStudents.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-8 text-center">
                        <p className="font-black text-amber-800">No students found in <strong>{className}</strong>.</p>
                        <p className="text-sm text-amber-600 mt-1">Make sure students are assigned to this class.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Subject columns header */}
                        {subjectNames.length > 0 && (
                            <div className="px-6 py-3 bg-slate-50 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">Subjects:</span>
                                {subjectNames.map(n => (
                                    <span key={n} className="text-[10px] font-bold text-slate-600 bg-white border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">{n}</span>
                                ))}
                            </div>
                        )}

                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#5C67F2] to-indigo-500 text-white">
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">#</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Student Name</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Adm No</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Subjects Scored</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Obtained / Max</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">%</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Grade</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Status</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentSummaries.map((row, i) => (
                                    <>
                                        <tr key={row.student._id}
                                            className={`border-b border-gray-50 cursor-pointer transition-colors ${expandedStudent === row.student._id ? "bg-indigo-50/60" : i % 2 === 0 ? "bg-white hover:bg-slate-50/50" : "bg-slate-50/30 hover:bg-slate-100/40"}`}
                                            onClick={() => setExpandedStudent(expandedStudent === row.student._id ? null : row.student._id)}>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-400">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[#5C67F2] font-black text-xs flex-shrink-0">
                                                        {row.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800">{row.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">{row.admNo}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-black ${row.scoredSubjects > 0 ? "text-emerald-600" : "text-amber-500"}`}>
                                                    {row.scoredSubjects} / {subjectNames.length || row.scoredSubjects}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                                                {row.scoredSubjects > 0 ? `${row.obtained} / ${row.maxScored}` : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {row.scoredSubjects > 0 ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-sm font-black" style={{ color: row.color }}>{row.pct}%</span>
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(row.pct, 100)}%`, backgroundColor: row.color }} />
                                                        </div>
                                                    </div>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {row.scoredSubjects > 0 ? (
                                                    <span className="text-sm font-black px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${row.color}15`, color: row.color }}>
                                                        {row.grade}
                                                    </span>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {row.scoredSubjects > 0 ? (
                                                    row.pct >= passMark
                                                        ? <span className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-black"><CheckCircle2 className="w-3.5 h-3.5" /> Pass</span>
                                                        : <span className="flex items-center justify-center gap-1 text-red-500 text-xs font-black"><XCircle className="w-3.5 h-3.5" /> Fail</span>
                                                ) : <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">No marks</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => setExpandedStudent(expandedStudent === row.student._id ? null : row.student._id)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black uppercase text-[#5C67F2] bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition-all">
                                                        <Eye className="w-3 h-3" /> View
                                                    </button>
                                                    {row.scoredSubjects > 0 && (
                                                        <button onClick={() => printStudent(row)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black uppercase text-white bg-slate-700 hover:bg-slate-900 rounded-lg transition-all shadow-sm">
                                                            <Printer className="w-3 h-3" /> Print
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded subject breakdown */}
                                        {expandedStudent === row.student._id && (
                                            <tr key={`${row.student._id}-expanded`} className="bg-indigo-50/40">
                                                <td colSpan={9} className="px-8 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {(row.ownSubjectNames.length > 0 ? row.ownSubjectNames : subjectNames.length > 0 ? subjectNames : row.studentMarks.map((m: any) => m.subjectName)).map((subName: string) => {
                                                            const m = row.studentMarks.find((mk: any) => (mk.subjectName || "").toLowerCase() === subName.toLowerCase());
                                                            const spct = m && m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : null;
                                                            return (
                                                                <div key={subName} className={`bg-white rounded-xl px-3 py-2 border text-center min-w-[100px] ${!m ? "opacity-50 border-dashed border-gray-200" : "border-gray-100 shadow-sm"}`}>
                                                                    <p className="text-[9px] font-black uppercase text-gray-400 mb-1">{subName}</p>
                                                                    {m ? (
                                                                        <>
                                                                            <p className="text-base font-black" style={{ color: spct !== null ? getColor(spct) : "#94a3b8" }}>{m.marksObtained}</p>
                                                                            <p className="text-[9px] font-bold text-gray-400">/{m.totalMarks} · {spct}%</p>
                                                                            <p className="text-[9px] font-black mt-0.5" style={{ color: spct !== null ? getColor(spct) : "#94a3b8" }}>{spct !== null ? getGrade(spct) : "—"}</p>
                                                                        </>
                                                                    ) : (
                                                                        <p className="text-sm font-black text-gray-300">—</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                            {/* Class total row */}
                            {stats.scored > 0 && (
                                <tfoot>
                                    <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                                        <td colSpan={4} className="px-4 py-3 text-sm font-black uppercase tracking-wider">
                                            Class Summary — {classStudents.length} students
                                        </td>
                                        <td colSpan={2} className="px-4 py-3 text-center font-black text-yellow-400">
                                            Class Avg: {stats.avg}%
                                        </td>
                                        <td className="px-4 py-3 text-center font-black text-yellow-400">{getGrade(stats.avg)}</td>
                                        <td colSpan={2} className="px-4 py-3 text-center font-black">
                                            <span className="text-emerald-400">{stats.passCount} Pass</span>
                                            <span className="text-slate-400 mx-2">·</span>
                                            <span className="text-red-400">{stats.failCount} Fail</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>

            {/* ── Hidden batch print container ────────────────────────── */}
            <div ref={printAllRef} style={{ display: "none" }}>
                {selectedExam && selectedClass && studentSummaries.filter(r => r.scoredSubjects > 0).map((row, idx) => {
                    // Use this student's own assigned subjects for the print template
                    const subList = row.ownSubjectNames.length > 0 ? row.ownSubjectNames : subjectNames.length > 0 ? subjectNames : row.studentMarks.map((m: any) => m.subjectName);
                    const marks = subList.map((name: string) => {
                        const m = row.studentMarks.find((mk: any) => (mk.subjectName || "").toLowerCase() === (name || "").toLowerCase());
                        return m ? { ...m } : { subjectName: name, marksObtained: null, totalMarks: 100, noMarks: true };
                    });
                    return (
                        <div key={row.student._id} className={idx < studentSummaries.filter(r => r.scoredSubjects > 0).length - 1 ? "page-break" : ""}>
                            <RenderPrintTemplate
                                templateId={reportTemplate} curriculumId={curriculumId}
                                schoolName={schoolName} schoolTagline={schoolTagline} schoolLogo={schoolLogo}
                                studentName={row.name} admNo={row.admNo}
                                studentPhoto={row.student?.studentPhoto || row.student?.photo || row.student?.avatar || row.student?.photoUrl || row.student?.profilePhoto || null}
                                className={className} periodLabel={periodLabel}
                                examName={selectedExam?.examName || selectedExam?.name || "Exam"}
                                examDate={examDate} marks={marks}
                                totalMax={row.maxAll} totalObtained={row.obtained}
                                overall={row.pct} overallGrade={row.grade} overallStatus={row.status}
                                getGradeForPct={getGrade} getStatusForPct={getStatus}
                                passMark={passMark} gradingScale={scale}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
