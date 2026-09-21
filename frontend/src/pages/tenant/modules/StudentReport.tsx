import { useParams, Link } from "react-router-dom";
import { Home, FileText, BookOpen, Search, Loader2, Book, Check, X, Printer, TrendingUp, Settings2, Maximize2, Award } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useModuleCrud } from "@/contexts/PermissionsContext";
import api from "@/lib/api";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, LabelList } from "recharts";
import { openPrintDoc, printElementToPdf } from "@/lib/pdfDoc";
import AcademicHistoryCard from "@/components/AcademicHistoryCard";
import { useSchoolBrand } from "@/lib/printDoc";
import { printTransferLetter, displayDate } from "./students/transferLetter";
import CertificateModal from "./students/certificates/CertificateModal";
import NemisDetailsCard from "./students/NemisDetailsCard";

export default function StudentReport() {
    const { id } = useParams();
    const reportRef = useRef<HTMLDivElement>(null);
    const { items: students, isLoading } = useItems("students");
    const { items: allSubjects } = useItems("subjects");
    const { items: classes } = useItems("classes");
    
    const student = students?.find((s: any) => s._id === id || s.registrationNo === id);

    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [certOpen, setCertOpen] = useState(false);   // Generate certificate
    const [trendOpen, setTrendOpen] = useState(false);   // Performance Trends — wide view

    // Manage Student — lifecycle status (Active / Transferred / Graduated) + transfer letter
    const queryClient = useQueryClient();
    const school = useSchoolBrand();
    const { canUpdate } = useModuleCrud("students");
    const { canCreate: canIssueCert } = useModuleCrud("certificates");
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [manageStatus, setManageStatus] = useState("Active");
    const [manageReason, setManageReason] = useState("");
    const [tfSchool, setTfSchool] = useState("");
    const [tfDate, setTfDate] = useState("");
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    // Records written by older code used lower case ("transferred").
    const currentStatus = (() => { const t = String(student?.status || "Active").toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); })();
    const transfer = student?.transfer;   // { refNo, toSchool, date, reason, status: "draft" | "completed" }
    const isTransferred = currentStatus === "Transferred";
    const isDraft = !isTransferred && transfer?.status === "draft";
    const studentLabel = student?.studentName || `${student?.firstName || ""} ${student?.lastName || ""}`.trim();

    const handleOpenManage = () => {
        setManageStatus(isDraft ? "Transferred" : currentStatus);
        setManageReason(transfer?.reason || "");
        setTfSchool(transfer?.toSchool || "");
        setTfDate(transfer?.date || new Date().toISOString().slice(0, 10));
        setIsManageOpen(true);
    };
    const refreshStudents = () => queryClient.invalidateQueries({ queryKey: ["students"] });

    // Active / Graduated (and moving a transferred student back)
    const handleSaveStatus = async () => {
        try {
            setIsSavingStatus(true);
            await api.post(`/students/${student?._id || id}/status`, { status: manageStatus, reason: manageReason });
            await refreshStudents();
            toast.success(`Student marked ${manageStatus}`);
            setIsManageOpen(false);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to update student status");
        } finally {
            setIsSavingStatus(false);
        }
    };

    // Transfer to another school: a draft keeps the student Active; permanent takes them out of their class.
    const saveTransfer = async (mode: "draft" | "permanent") => {
        if (!tfSchool.trim()) { toast.error("Enter the school the student is transferring to."); return; }
        if (mode === "permanent" && !isTransferred && !confirm(`Transfer ${studentLabel} to ${tfSchool.trim()} permanently? They will be removed from their class. You can set them back to Active later.`)) return;
        try {
            setIsSavingStatus(true);
            const r = await api.post(`/students/${student?._id || id}/transfer`, { toSchool: tfSchool.trim(), date: tfDate, reason: manageReason, mode });
            await refreshStudents();
            toast.success(r.data?.message || "Saved");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to save the transfer");
        } finally {
            setIsSavingStatus(false);
        }
    };
    const discardDraft = async () => {
        if (!confirm("Discard this draft transfer?")) return;
        try {
            setIsSavingStatus(true);
            await api.delete(`/students/${student?._id || id}/transfer`);
            await refreshStudents();
            toast.success("Draft discarded");
            setIsManageOpen(false);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to discard the draft");
        } finally {
            setIsSavingStatus(false);
        }
    };
    const printLetter = () => { if (transfer && student) printTransferLetter(school, student, transfer); };

    // Initialize selected subjects when student loads
    useState(() => {
        if (student?.subjects) setSelectedSubjects(student.subjects);
    });

    const handleOpenAssignModal = () => {
        let initialSubjects = student?.subjects || [];
        
        // Inherit from class if student has no subjects
        if (initialSubjects.length === 0) {
            const studentClassObj = classes?.find((c: any) => c._id === student?.classId || c.className === student?.studentClass || c.className === student?.currentClass);
            if (studentClassObj?.subjects) {
                initialSubjects = studentClassObj.subjects;
            }
        }

        // Force select core/compulsory
        const coreSubjects = allSubjects?.filter((s: any) => s.category?.toLowerCase() === 'core' || s.category?.toLowerCase() === 'compulsory') || [];
        
        const merged = [...initialSubjects];
        coreSubjects.forEach((coreSub: any) => {
            if (!merged.some(s => s._id === coreSub._id || s === coreSub._id)) {
                merged.push(coreSub);
            }
        });

        setSelectedSubjects(merged);
        setIsAssignOpen(true);
    };

    const handleAssignSubjects = async () => {
        try {
            setIsSaving(true);
            await api.patch(`/students/${id}`, { subjects: selectedSubjects });
            toast.success("Subjects assigned successfully!");
            setIsAssignOpen(false);
            window.location.reload();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to assign subjects");
        } finally {
            setIsSaving(false);
        }
    };

    // ── ALL hooks must be declared before any conditional returns ────────────
    const { data: progressData } = useQuery({
        queryKey: ["student_progress", id],
        queryFn: async () => {
            const r = await api.get(`/reports/student-progress?student_id=${id}`);
            return r.data;
        },
        enabled: !!id,
    });

    const { data: feeData } = useQuery({
        queryKey: ["student_fee_summary_report", id],
        queryFn: async () => {
            const r = await api.get(`/schools/default/students/${id}/fee-summary`);
            return r.data.data;
        },
        enabled: !!id,
    });

    // These were incorrectly placed after early returns — moved here to fix hook order
    const { data: allMarks = [] } = useQuery({
        queryKey: ["all_exam_marks_student", id],
        queryFn: async () => {
            const r = await api.get(`/exam_marks?studentId=${id}`);
            return Array.isArray(r.data) ? r.data : [];
        },
        enabled: !!id,
    });

    const { data: institute } = useQuery({
        queryKey: ["tenant_profile"],
        queryFn: async () => { const r = await api.get("/tenant_profile"); return Array.isArray(r.data) ? r.data[0] : r.data; },
    });

    // ── Conditional renders AFTER all hooks ───────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex-1 bg-[#f4f7f6] min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2]" />
                    <p className="text-slate-400 font-bold animate-pulse">Fetching student records...</p>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex-1 bg-[#f4f7f6] min-h-screen flex items-center justify-center">
                <div className="bg-white p-12 rounded-[2rem] shadow-xl text-center space-y-4 border border-gray-100">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Student Not Found</h2>
                    <p className="text-slate-500 max-w-xs">We couldn't find a student with ID: <span className="font-bold text-[#5C67F2]">{id}</span></p>
                </div>
            </div>
        );
    }

    const latestAttendance = progressData?.attendanceTrends?.[0]?.presentPercentage || 0;
    const historicalExams = progressData?.historicalExams || [];
    const bestExam = historicalExams.length > 0 ? historicalExams.reduce((prev: any, current: any) => (prev.average > current.average) ? prev : current) : null;

    // Build trend chart data from historicalExams
    const trendData = historicalExams.map((e: any) => ({
        name: `${e.examName} (${e.term || ""})`.trim(),
        Average: Number(e.average || 0),
        GPA: Number(e.gpa || 0),
    })).reverse();

    // Wide chart rows: every exam gets a distinct label (two "Term Exam (Term 1)" would otherwise look identical).
    const trendRows = (() => {
        const seen: Record<string, number> = {};
        return historicalExams.slice().reverse().map((e: any) => {
            const base = [e.examName, e.term].filter(Boolean).join(" · ") || "Exam";
            const label = e.academicYear ? `${base} ${e.academicYear}` : base;
            seen[label] = (seen[label] || 0) + 1;
            return { name: seen[label] > 1 ? `${label} (#${seen[label]})` : label, Average: Number(e.average || 0), GPA: Number(e.gpa || 0), total: e.totalMarks, term: e.term || "", year: e.academicYear || "" };
        });
    })();

    function printReportCard(exam: any) {
        const win = openPrintDoc();
        if (!win) { toast.error("Allow popups to print"); return; }
        const schoolName = institute?.schoolName || institute?.name || "School";
        const address = institute?.address || "";
        const phone = institute?.phone || "";
        const logo = institute?.logo || null;
        const studentName = student.studentName || `${student.firstName || ""} ${student.lastName || ""}`.trim();

        // Get subject marks for this exam
        const examMarks = allMarks.filter((m: any) => m.examId === exam.examId || m.examName === exam.examName);
        const marksRows = examMarks.length > 0
            ? examMarks.map((m: any) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px">${m.subjectName || "—"}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px">${m.outOf || 100}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:900;font-size:12px;color:#5C67F2">${m.marks || m.score || "—"}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px">${m.grade || "—"}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px">${m.remarks || "—"}</td></tr>`).join("")
            : `<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;font-size:11px">No subject marks found for this exam in the system</td></tr>`;

        win.document.write(`<!DOCTYPE html><html><head><title>Report Card — ${studentName}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 720px; margin: 0 auto; color: #1e293b; }
          .school-header { display:flex; align-items:center; gap:16px; border-bottom:3px solid #5C67F2; padding-bottom:16px; margin-bottom:20px; }
          .school-header img { height:64px; object-fit:contain; }
          .school-name { font-size:20px; font-weight:900; color:#5C67F2; text-transform:uppercase; }
          .school-sub { font-size:10px; color:#94a3b8; margin-top:3px; }
          .report-title { text-align:center; background:#5C67F2; color:white; padding:10px; font-size:14px; font-weight:900; text-transform:uppercase; letter-spacing:2px; margin-bottom:20px; border-radius:8px; }
          .student-info { display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#f8fafc; padding:16px; border-radius:8px; margin-bottom:20px; }
          .info-item label { font-size:9px; font-weight:700; text-transform:uppercase; color:#94a3b8; display:block; letter-spacing:1px; }
          .info-item span { font-size:13px; font-weight:800; color:#1e293b; }
          table { width:100%; border-collapse:collapse; margin-bottom:16px; }
          th { background:#5C67F2; color:white; padding:10px 12px; font-size:10px; text-transform:uppercase; font-weight:700; text-align:left; }
          .summary { display:flex; gap:12px; margin-bottom:20px; }
          .summary-box { flex:1; text-align:center; padding:12px; border-radius:8px; border:1px solid #e2e8f0; }
          .summary-box label { font-size:9px; font-weight:700; text-transform:uppercase; color:#94a3b8; display:block; }
          .summary-box span { font-size:20px; font-weight:900; }
          .signature { display:grid; grid-template-columns:1fr 1fr 1fr; gap:24px; margin-top:40px; }
          .sig-box { border-top:1px solid #94a3b8; padding-top:6px; text-align:center; font-size:10px; color:#94a3b8; text-transform:uppercase; position:relative; }
          .sig-img { position:absolute; left:50%; bottom:100%; transform:translateX(-50%); max-height:56px; max-width:150px; object-fit:contain; margin-bottom:2px; }
          .stamp-img { position:absolute; right:-6px; bottom:-4px; width:78px; height:78px; object-fit:contain; opacity:.88; transform:rotate(-8deg); }
          .footer { text-align:center; margin-top:32px; font-size:9px; color:#94a3b8; border-top:1px dashed #e2e8f0; padding-top:12px; }
          @media print { @page { margin:15mm; } }
        </style></head><body>
        <div class="school-header">
          ${logo ? `<img src="${logo}" />` : ""}
          <div><div class="school-name">${schoolName}</div><div class="school-sub">${[address, phone].filter(Boolean).join(" · ")}</div></div>
        </div>
        <div class="report-title">Student Academic Report Card</div>
        <div class="student-info">
          <div class="info-item"><label>Student Name</label><span>${studentName}</span></div>
          <div class="info-item"><label>Registration No</label><span>${student.registrationNo || "—"}</span></div>
          <div class="info-item"><label>Class</label><span>${student.studentClass || student.currentClass || "—"}</span></div>
          <div class="info-item"><label>Exam</label><span>${exam.examName}</span></div>
          <div class="info-item"><label>Term</label><span>${exam.term || "—"}</span></div>
          <div class="info-item"><label>Academic Year</label><span>${exam.academicYear || new Date().getFullYear()}</span></div>
        </div>
        <table>
          <thead><tr><th>Subject</th><th style="text-align:center">Out Of</th><th style="text-align:center">Marks</th><th style="text-align:center">Grade</th><th style="text-align:center">Remarks</th></tr></thead>
          <tbody>${marksRows}</tbody>
        </table>
        <div class="summary">
          <div class="summary-box" style="background:#eff6ff;border-color:#bfdbfe"><label>Average</label><span style="color:#5C67F2">${exam.average}%</span></div>
          <div class="summary-box" style="background:#f0fdf4;border-color:#bbf7d0"><label>GPA</label><span style="color:#16a34a">${exam.gpa}</span></div>
          <div class="summary-box" style="background:#fefce8;border-color:#fde68a"><label>Total Marks</label><span style="color:#ca8a04">${exam.totalMarks || "—"}</span></div>
        </div>
        <div class="signature">
          <div class="sig-box">Class Teacher</div>
          <div class="sig-box">${institute?.principalSignature ? `<img class="sig-img" src="${institute.principalSignature}" />` : ""}${institute?.schoolStamp ? `<img class="stamp-img" src="${institute.schoolStamp}" />` : ""}${institute?.principalName ? `${institute.principalName}<br/>` : ""}${institute?.principalTitle || "Head Teacher / Principal"}</div>
          <div class="sig-box">Parent / Guardian</div>
        </div>
        <div class="footer">This is a computer-generated report card — ${schoolName} · Powered by ShuleCloud ERP</div>
        <script>window.onload = () => window.print()</script>
        </body></html>`);
        win.document.close();
    }
    
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <div className="flex items-center">
                    <span className="font-bold text-gray-800 text-lg mr-2">Students</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <Home className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-500 font-medium">
                        - Student Report
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {canUpdate && (
                        <button onClick={handleOpenManage}
                            className="h-9 px-4 bg-white border border-[#868DF4]/40 hover:border-[#5C67F2] text-[#5C67F2] text-[11px] font-bold rounded-full flex items-center gap-2 transition-colors">
                            <Settings2 className="w-3.5 h-3.5" /> Manage Student
                        </button>
                    )}
                    {canIssueCert && (
                        <button onClick={() => setCertOpen(true)}
                            className="h-9 px-4 bg-white border border-amber-300 hover:border-amber-500 text-amber-600 text-[11px] font-bold rounded-full flex items-center gap-2 transition-colors">
                            <Award className="w-3.5 h-3.5" /> Generate Certificate
                        </button>
                    )}
                    {transfer && (
                        <button onClick={printLetter}
                            className="h-9 px-4 bg-white border border-[#868DF4]/40 hover:border-[#5C67F2] text-[#5C67F2] text-[11px] font-bold rounded-full flex items-center gap-2 transition-colors">
                            <FileText className="w-3.5 h-3.5" /> Transfer Letter{isDraft ? " (Draft)" : ""}
                        </button>
                    )}
                    <Link to={`/students/history/${student?._id || id}`}
                        className="h-9 px-4 bg-white border border-[#868DF4]/40 hover:border-[#5C67F2] text-[#5C67F2] text-[11px] font-bold rounded-full flex items-center gap-2 transition-colors">
                        <Book className="w-3.5 h-3.5" /> Class History
                    </Link>
                    <button onClick={() => printElementToPdf(reportRef.current, `Student Report — ${student?.studentName || student?.firstName || "Student"}`, { fileName: `Student-Report-${student?.registrationNo || student?.admissionNo || ""}`, always: true })}
                        className="h-9 px-5 bg-[#868DF4] hover:bg-[#5C67F2] text-white text-[11px] font-bold rounded-full shadow-sm flex items-center gap-2 transition-colors">
                        <FileText className="w-3.5 h-3.5" /> Get PDF
                    </button>
                </div>
            </div>

            {isTransferred && (
                <div className="mx-4 mb-2 w-[calc(100%-2rem)] bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-sm text-amber-900">
                    <b>Transferred{transfer?.toSchool ? ` to ${transfer.toSchool}` : ""}{transfer?.date ? ` on ${displayDate(transfer.date)}` : ""}.</b>{" "}
                    This is a record of their time at the school — the student is no longer in a class.
                </div>
            )}
            {isDraft && (
                <div className="mx-4 mb-2 w-[calc(100%-2rem)] bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm text-slate-700">
                    <b>Draft transfer to {transfer.toSchool}.</b> The student is still active — open Manage Student to complete the transfer.
                </div>
            )}

            <div ref={reportRef} className="p-6 pt-0 w-full mt-4 flex flex-col lg:flex-row gap-6">
                
                {/* Left Column - Profile Details */}
                <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-6">
                    {/* Top Profile Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-gray-100 rounded-full border-[6px] border-[#868DF4]/10 flex items-center justify-center overflow-hidden mb-6">
                            {(student.studentPhoto || student.avatar) ? (
                                <img src={student.studentPhoto || student.avatar} alt={student.studentName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#1e293b] flex flex-col items-center pt-5 relative">
                                    <div className="w-10 h-10 bg-[#fcd34d] rounded-full"></div>
                                    <div className="w-20 h-16 bg-[#5C67F2] mt-2 rounded-t-[2rem] relative"></div>
                                </div>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-[#868DF4] mb-4">{student.studentName || `${student.firstName} ${student.lastName}`}</h2>
                        {!isTransferred && (
                        <button 
                            onClick={handleOpenAssignModal}
                            className="w-full bg-[#868DF4]/10 hover:bg-[#868DF4]/20 text-[#868DF4] font-bold py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <Book className="w-4 h-4" /> Assign Subjects
                        </button>
                        )}
                    </div>

                    {/* Details List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-4">
                        <DetailRow label="Registration No" value={student.registrationNo || student.admNo} />
                        <DetailRow label="Date Of Admission" value={displayDate(student.admissionDate)} />
                        <DetailRow label={currentStatus !== "Active" ? "Previous Class" : "Class"} value={student.studentClass || student.currentClass || (currentStatus !== "Active" ? student.statusPrevClass?.studentClass : "")} />
                        <DetailRow label="Status" value={currentStatus} />
                        {transfer && <DetailRow label="Transfer" value={`${transfer.status === "draft" ? "Draft — " : ""}${transfer.toSchool}${transfer.date ? `, ${displayDate(transfer.date)}` : ""}${transfer.refNo ? ` (${transfer.refNo})` : ""}`} />}
                        <DetailRow label="Family" value={student.family || ""} />
                        <DetailRow label="Discount in Fee" value={student.discount ? `${student.discount}%` : ""} />
                    </div>

                    {/* Academic History — past classes + ScholarSheet links */}
                    <AcademicHistoryCard studentId={String(student?._id || id)} />

                    {/* Extended Details List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-4">
                        <DetailRow label="Date Of Birth" value={displayDate(student.dob)} />
                        <DetailRow label="Gender" value={student.gender} />
                        <DetailRow label="Any Identification Mark?" value={student.idMark} />
                        <DetailRow label="Blood Group" value={student.bloodGroup} />
                        <DetailRow label="Disease If Any?" value={student.disease} />
                        <DetailRow label="Student Birth Form ID / NIC" value={student.nationalId} />
                        <DetailRow label="Cast" value={student.cast} />
                        <DetailRow label="Previous School" value={student.previousSchool} />
                        <DetailRow label="Previous ID / Board Roll No" value={student.previousRollNo} />
                        <DetailRow label="Any Additional Note" value={student.additionalNote} />
                        <DetailRow label="Religion" value={student.religion} />
                    </div>

                    {/* All NEMIS learner details — read-only, Edit to change */}
                    <NemisDetailsCard studentId={String(id)} canEdit={!!canUpdate} />

                    {/* Assigned Subjects List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-4">
                        <h3 className="text-[#868DF4] font-black border-b border-gray-100 pb-3 flex items-center gap-2">
                            <Book className="w-4 h-4" /> Enrolled Subjects
                        </h3>
                        {student.subjects && student.subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {student.subjects.map((sub: any, idx: number) => (
                                    <span key={idx} className="bg-slate-100 text-slate-700 font-bold text-[10px] px-3 py-1.5 rounded-full border border-slate-200">
                                        {sub.name || sub}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm font-bold text-slate-400">No subjects assigned yet.</p>
                        )}
                    </div>

                    {/* Parent Details List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-4">
                        <DetailRow label="Father Name" value={student.fatherName || student.parents?.[0]?.name} />
                        <DetailRow label="Mother Name" value={student.motherName} />
                        <DetailRow label="Address" value={student.address || student.address1} />
                    </div>
                </div>

                {/* Right Column - Reports Grid */}
                <div className="flex-1 columns-1 xl:columns-2 gap-6">
                    
                    {/* 1 Attendance Report */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col break-inside-avoid mb-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 rounded-full bg-[#868DF4] text-white flex items-center justify-center text-xs font-bold">1</div>
                            <h3 className="text-[#868DF4] font-bold">Attendance Report</h3>
                        </div>
                        
                        <div className="flex justify-center gap-6 mb-8">
                            {/* Overall Circle */}
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full border-[6px] border-emerald-500/20 flex flex-col items-center justify-center relative">
                                    <span className="text-emerald-500 font-bold text-lg leading-tight">{latestAttendance}%</span>
                                    <span className="text-[9px] text-emerald-500 font-bold">Overall</span>
                                </div>
                                <div className="mt-4 border border-gray-200 rounded-full px-3 py-1 text-[8px] font-bold text-gray-400 flex items-center gap-1">
                                    <span className="text-[#6b8cff]">Trend</span> <span className="text-gray-300">-&gt;</span> PRESENT
                                </div>
                            </div>
                        </div>

                        {/* Cards */}
                        <div className="flex gap-2 mt-auto">
                            <div className="flex-1 bg-[#6b8cff] rounded-2xl p-4 text-white flex justify-between">
                                <div>
                                    <p className="text-[10px] font-bold tracking-widest mb-2">PRESENTS</p>
                                    <p className="text-2xl font-bold">{latestAttendance}%</p>
                                    <p className="text-[9px] opacity-80 mt-1">Overall</p>
                                </div>
                            </div>
                            <div className="flex-1 bg-[#ff5e6c] rounded-2xl p-4 text-white flex justify-between">
                                <div>
                                    <p className="text-[10px] font-bold tracking-widest mb-2">ABSENTS</p>
                                    <p className="text-2xl font-bold">{100 - latestAttendance}%</p>
                                    <p className="text-[9px] opacity-80 mt-1">Overall</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Trends Chart */}
                    {trendData.length >= 2 && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 break-inside-avoid mb-6">
                            <div className="flex items-center justify-between gap-2 mb-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                    </div>
                                    <h3 className="text-emerald-600 font-bold">Performance Trends</h3>
                                </div>
                                <button onClick={() => setTrendOpen(true)} className="h-8 px-3 rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-[11px] font-bold flex items-center gap-1.5 transition-colors print:hidden">
                                    <Maximize2 className="w-3 h-3" /> View more
                                </button>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}${name === "Average" ? "%" : ""}`, name]}
                                        contentStyle={{ borderRadius: "12px", fontSize: "11px", fontWeight: 700, border: "1px solid #e2e8f0" }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }} />
                                    <ReferenceLine y={50} stroke="#fca5a5" strokeDasharray="3 3" label={{ value: "Pass", fontSize: 9, fill: "#fca5a5" }} />
                                    <Line
                                        type="monotone" dataKey="Average" stroke="#868DF4" strokeWidth={2.5}
                                        dot={{ fill: "#868DF4", r: 4, strokeWidth: 2, stroke: "white" }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone" dataKey="GPA" stroke="#10b981" strokeWidth={2}
                                        dot={{ fill: "#10b981", r: 3, strokeWidth: 2, stroke: "white" }}
                                        strokeDasharray="5 3"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {[
                                    { label: "Best Average", value: `${Math.max(...trendData.map((d: any) => d.Average)).toFixed(1)}%`, color: "text-emerald-600" },
                                    { label: "Latest Average", value: `${(trendData[trendData.length - 1]?.Average || 0).toFixed(1)}%`, color: "text-[#868DF4]" },
                                    { label: "Trend", value: trendData.length >= 2 && trendData[trendData.length - 1]?.Average > trendData[0]?.Average ? "📈 Improving" : "📉 Declining", color: "text-slate-600" },
                                ].map(s => (
                                    <div key={s.label} className="text-center bg-slate-50 rounded-2xl p-3">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                                        <p className={`text-sm font-black mt-0.5 ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2 Class Tests Report (Using best exam as placeholder if tests unavailable) */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col break-inside-avoid mb-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 rounded-full bg-[#868DF4] text-white flex items-center justify-center text-xs font-bold">2</div>
                            <h3 className="text-[#ff5e6c] font-bold">Performance Summary</h3>
                        </div>
                        
                        {bestExam ? (
                            <div className="flex justify-between items-center bg-gray-50/50 rounded-2xl p-6 border border-gray-100 h-full">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="w-4 h-4 text-[#868DF4]" />
                                        <h4 className="font-bold text-gray-700">{bestExam.examName}</h4>
                                    </div>
                                    <p className="text-[#868DF4] font-bold text-sm mb-4">Top Score</p>
                                    
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase">
                                            <div className="w-2 h-2 rounded-full bg-[#ff5e6c]"></div> TERM ({bestExam.term})
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase">
                                            <div className="w-2 h-2 rounded-full bg-[#868DF4]"></div> TOTAL MARKS ({bestExam.totalMarks})
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase">
                                            <div className="w-2 h-2 rounded-full bg-[#6b8cff]"></div> GPA ({bestExam.gpa})
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-24 h-24 rounded-full border-4 border-gray-200 border-l-[#868DF4] flex flex-col items-center justify-center -rotate-45">
                                    <div className="rotate-45 flex flex-col items-center">
                                        <span className="text-gray-800 font-black text-xl leading-tight">{bestExam.average}%</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">avg</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center pb-8">
                                <div className="w-32 h-32 bg-rose-50/50 rounded-full flex items-center justify-center mb-4 relative">
                                    <BookOpen className="w-12 h-12 text-[#ff5e6c] opacity-50" />
                                </div>
                                <p className="font-bold text-[#ff5e6c]">No Records.</p>
                            </div>
                        )}
                    </div>

                    {/* 4 Fee Report */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col break-inside-avoid mb-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 rounded-full bg-[#868DF4] text-white flex items-center justify-center text-xs font-bold">3</div>
                            <h3 className="text-[#868DF4] font-bold">Fee Report</h3>
                        </div>
                        <div className="flex-1 flex flex-col justify-center pb-8 w-full">
                            {feeData ? (
                                <div className="w-full space-y-4">
                                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Invoiced</p>
                                        <p className="text-2xl font-black text-indigo-700">KSh {feeData.total_invoiced.toLocaleString()}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Paid</p>
                                            <p className="text-lg font-black text-emerald-600">KSh {feeData.total_paid.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Balance</p>
                                            <p className="text-lg font-black text-rose-600">KSh {feeData.outstanding.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 mb-3">Recent Invoices</p>
                                        <div className="space-y-2">
                                            {feeData.invoices?.slice(0,3).map((inv: any) => (
                                                <div key={inv.id} className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-gray-700">{inv.invoice_no}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                    }`}>{inv.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-32 h-32 bg-indigo-50/50 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                                        <Search className="w-12 h-12 text-[#868DF4] opacity-50" />
                                    </div>
                                    <p className="font-bold text-[#868DF4]">Loading Fees...</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {certOpen && student && <CertificateModal student={student} onClose={() => setCertOpen(false)} />}

            {/* Performance Trends — wide view */}
            {trendOpen && trendRows.length >= 2 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setTrendOpen(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg">Performance Trends</h3>
                                    <p className="text-xs font-bold text-slate-500">{studentLabel} · {trendRows.length} exams</p>
                                </div>
                            </div>
                            <button onClick={() => setTrendOpen(false)} className="w-9 h-9 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 bg-[#f4f7f6]">
                            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                <ResponsiveContainer width="100%" height={430}>
                                    <LineChart data={trendRows} margin={{ top: 28, right: 24, left: 4, bottom: trendRows.length > 4 ? 60 : 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="name" interval={0} angle={trendRows.length > 4 ? -25 : 0} textAnchor={trendRows.length > 4 ? "end" : "middle"} height={trendRows.length > 4 ? 70 : 40}
                                            tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        {/* Average is a percentage; GPA is a small number — each gets its own axis so neither is squashed. */}
                                        <YAxis yAxisId="avg" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: "#868DF4", fontWeight: 700 }} axisLine={false} tickLine={false} width={44} />
                                        <YAxis yAxisId="gpa" orientation="right" domain={[0, (max: number) => Math.max(5, Math.ceil(max))]} allowDecimals={false} tick={{ fontSize: 11, fill: "#10b981", fontWeight: 700 }} axisLine={false} tickLine={false} width={34} />
                                        <Tooltip
                                            formatter={(v: any, name: string) => [name === "Average" ? `${Number(v).toFixed(1)}%` : Number(v).toFixed(2), name]}
                                            contentStyle={{ borderRadius: "12px", fontSize: "12px", fontWeight: 700, border: "1px solid #e2e8f0" }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 700, paddingTop: 8 }} />
                                        <ReferenceLine yAxisId="avg" y={50} stroke="#fca5a5" strokeDasharray="4 4" label={{ value: "Pass mark (50%)", position: "insideTopRight", fontSize: 11, fill: "#f87171", fontWeight: 700 }} />
                                        <Line yAxisId="avg" type="monotone" dataKey="Average" name="Average" stroke="#868DF4" strokeWidth={3} dot={{ fill: "#868DF4", r: 5, strokeWidth: 2, stroke: "white" }} activeDot={{ r: 8 }}>
                                            <LabelList dataKey="Average" position="top" formatter={(v: any) => `${Number(v).toFixed(0)}%`} style={{ fontSize: 11, fontWeight: 800, fill: "#5C67F2" }} />
                                        </Line>
                                        <Line yAxisId="gpa" type="monotone" dataKey="GPA" name="GPA" stroke="#10b981" strokeWidth={2.5} strokeDasharray="6 4" dot={{ fill: "#10b981", r: 4, strokeWidth: 2, stroke: "white" }} activeDot={{ r: 7 }}>
                                            <LabelList dataKey="GPA" position="bottom" formatter={(v: any) => Number(v).toFixed(1)} style={{ fontSize: 10, fontWeight: 800, fill: "#059669" }} />
                                        </Line>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { label: "Best average", value: `${Math.max(...trendRows.map((d: any) => d.Average)).toFixed(1)}%`, color: "text-emerald-600" },
                                    { label: "Latest average", value: `${trendRows[trendRows.length - 1].Average.toFixed(1)}%`, color: "text-[#5C67F2]" },
                                    { label: "Trend", value: trendRows[trendRows.length - 1].Average >= trendRows[0].Average ? "Improving" : "Declining", color: trendRows[trendRows.length - 1].Average >= trendRows[0].Average ? "text-emerald-600" : "text-rose-500" },
                                ].map(c => (
                                    <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</p>
                                        <p className={`text-2xl font-black mt-1 ${c.color}`}>{c.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead><tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">{["#", "Exam", "Average", "GPA", "Total marks"].map(h => <th key={h} className="px-4 py-3 font-black">{h}</th>)}</tr></thead>
                                    <tbody>
                                        {trendRows.map((r: any, i: number) => (
                                            <tr key={r.name} className="border-t border-slate-50">
                                                <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-bold text-slate-700">{r.name}</td>
                                                <td className="px-4 py-2.5 font-black text-[#5C67F2]">{r.Average.toFixed(1)}%</td>
                                                <td className="px-4 py-2.5 font-bold text-emerald-600">{r.GPA.toFixed(1)}</td>
                                                <td className="px-4 py-2.5 text-slate-500">{r.total ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Student Modal */}
            {isManageOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">Manage Student</h3>
                                <p className="text-xs font-bold text-slate-500">{studentLabel}</p>
                            </div>
                            <button onClick={() => setIsManageOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 bg-[#f4f7f6] overflow-y-auto">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Student status</label>
                                <select
                                    value={manageStatus}
                                    onChange={e => setManageStatus(e.target.value)}
                                    className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm bg-white font-bold text-slate-700 cursor-pointer"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Transferred">Transferred</option>
                                    <option value="Graduated">Graduated</option>
                                </select>
                            </div>

                            {manageStatus === "Transferred" ? (
                                <>
                                    {/* Transfer to another school + letter */}
                                    {transfer && (
                                        <div className={`text-xs font-bold rounded-xl px-3 py-2 border ${isDraft ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>
                                            {isDraft ? "Draft transfer" : "Transfer completed"}{transfer.refNo ? ` · Ref ${transfer.refNo}` : ""}
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">School transferring to *</label>
                                        <input value={tfSchool} onChange={e => setTfSchool(e.target.value)} placeholder="e.g. Alliance High School"
                                            className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm bg-white text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Date of transfer</label>
                                        <input type="date" value={tfDate} onChange={e => setTfDate(e.target.value)}
                                            className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm bg-white text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Reason (optional)</label>
                                        <textarea value={manageReason} onChange={e => setManageReason(e.target.value)} rows={2} placeholder="e.g. Family relocation"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm bg-white text-slate-700 resize-none" />
                                    </div>
                                    {!isTransferred && (
                                        <p className="text-xs font-medium rounded-xl p-3 border bg-amber-50 border-amber-100 text-amber-800">
                                            <b>Save as draft</b> keeps {studentLabel || "the student"} active in {student.studentClass || student.currentClass || "their class"} and prepares the letter.{" "}
                                            <b>Transfer permanently</b> removes them from the class; their records and fee history are kept, and setting them back to Active restores the class.
                                        </p>
                                    )}
                                    {transfer && (
                                        <button type="button" onClick={printLetter} className="w-full h-10 rounded-xl border border-[#5C67F2]/40 text-[#5C67F2] text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors">
                                            <Printer className="w-4 h-4" /> Print transfer letter{isDraft ? " (marked DRAFT)" : ""}
                                        </button>
                                    )}
                                    {transfer && <p className="text-[11px] text-slate-400 -mt-2">The letter uses the details saved last — save your changes first.</p>}
                                </>
                            ) : (
                                <>
                                    {manageStatus !== "Active" && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Note (optional)</label>
                                            <textarea
                                                value={manageReason}
                                                onChange={e => setManageReason(e.target.value)}
                                                rows={2}
                                                placeholder="e.g. Completed Form 4, KCSE 2026"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm bg-white text-slate-700 resize-none"
                                            />
                                        </div>
                                    )}
                                    {manageStatus !== currentStatus && (
                                        <p className={`text-xs font-medium rounded-xl p-3 border ${manageStatus === "Active" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-amber-50 border-amber-100 text-amber-800"}`}>
                                            {manageStatus === "Active"
                                                ? "The student will be placed back in the class they left."
                                                : `The student will be removed from ${student.studentClass || student.currentClass || "their class"} and won't appear in class lists, attendance or marks entry. Their records and fee history are kept, and setting them back to Active restores their class.`}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white flex flex-wrap justify-end gap-3">
                            <button onClick={() => setIsManageOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                Close
                            </button>
                            {manageStatus === "Transferred" ? (
                                <>
                                    {isDraft && (
                                        <button onClick={discardDraft} disabled={isSavingStatus} className="px-5 py-2.5 rounded-xl font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50">
                                            Discard draft
                                        </button>
                                    )}
                                    {!isTransferred && (
                                        <button onClick={() => saveTransfer("draft")} disabled={isSavingStatus} className="px-5 py-2.5 rounded-xl font-bold text-[#5C67F2] bg-white border border-[#5C67F2]/40 hover:bg-indigo-50 transition-colors disabled:opacity-50">
                                            {isDraft ? "Update draft" : "Save as draft"}
                                        </button>
                                    )}
                                    <button onClick={() => saveTransfer("permanent")} disabled={isSavingStatus} className="px-5 py-2.5 rounded-xl font-bold text-white bg-[#868DF4] hover:bg-[#5C67F2] transition-colors flex items-center gap-2 disabled:opacity-50">
                                        {isSavingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {isTransferred ? "Save details" : "Transfer permanently"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleSaveStatus}
                                    disabled={isSavingStatus || manageStatus === currentStatus}
                                    className="px-5 py-2.5 rounded-xl font-bold text-white bg-[#868DF4] hover:bg-[#5C67F2] transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSavingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Subjects Modal */}
            {isAssignOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">Assign Subjects</h3>
                                <p className="text-xs font-bold text-slate-500">Select subjects for {student.studentName}</p>
                            </div>
                            <button onClick={() => setIsAssignOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-[#f4f7f6]">
                            {allSubjects?.map((sub: any) => {
                                const isSelected = selectedSubjects.some(s => s._id === sub._id || s === sub._id);
                                const isCore = sub.category?.toLowerCase() === 'core' || sub.category?.toLowerCase() === 'compulsory';

                                return (
                                    <div 
                                        key={sub._id}
                                        onClick={() => {
                                            if (isCore) {
                                                toast("Core subjects are compulsory and cannot be removed.", { icon: "🔒" });
                                                return;
                                            }
                                            if (isSelected) {
                                                setSelectedSubjects(selectedSubjects.filter(s => s._id !== sub._id && s !== sub._id));
                                            } else {
                                                setSelectedSubjects([...selectedSubjects, sub]);
                                            }
                                        }}
                                        className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                                            isCore ? "cursor-not-allowed border-gray-300 bg-gray-50 opacity-80" : "cursor-pointer"
                                        } ${
                                            isSelected && !isCore
                                                ? "border-[#868DF4] bg-indigo-50/50" 
                                                : (!isCore ? "border-gray-100 bg-white hover:border-[#868DF4]/30 hover:bg-gray-50" : "")
                                        }`}
                                    >
                                        <div>
                                            <p className={`font-black ${isSelected && !isCore ? 'text-[#868DF4]' : 'text-slate-700'}`}>{sub.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {sub.category || "General"} {isCore && " (Compulsory)"}
                                            </p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                            isSelected 
                                                ? (isCore ? "bg-gray-400 text-white" : "bg-[#868DF4] text-white") 
                                                : "bg-gray-100 border border-gray-200"
                                        }`}>
                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                    </div>
                                );
                            })}
                            {(!allSubjects || allSubjects.length === 0) && (
                                <div className="text-center p-8 bg-white rounded-2xl border border-gray-100">
                                    <p className="font-bold text-slate-400">No subjects available in the system.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                            <button 
                                onClick={() => setIsAssignOpen(false)}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAssignSubjects}
                                disabled={isSaving}
                                className="px-5 py-2.5 rounded-xl font-bold text-white bg-[#868DF4] hover:bg-[#5C67F2] transition-colors flex items-center gap-2"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Assignments
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="mb-3 last:mb-0">
            <p className="text-[11px] font-bold text-[#a0a8be] mb-0.5 tracking-wide">{label}</p>
            {value ? (
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-300 font-bold">↳</span>
                    <span className="font-bold text-[#3B54A6] text-sm">{value}</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-300 font-bold">↳</span>
                </div>
            )}
        </div>
    );
}
