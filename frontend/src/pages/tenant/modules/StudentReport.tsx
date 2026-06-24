import { useParams, Link } from "react-router-dom";
import { Home, FileText, BookOpen, Search, Loader2, Book, Check, X, Printer, TrendingUp } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { openPrintDoc, printElementToPdf } from "@/lib/pdfDoc";

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
          .sig-box { border-top:1px solid #94a3b8; padding-top:6px; text-align:center; font-size:10px; color:#94a3b8; text-transform:uppercase; }
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
          <div class="sig-box">Head Teacher / Principal</div>
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
                        <button 
                            onClick={handleOpenAssignModal}
                            className="w-full bg-[#868DF4]/10 hover:bg-[#868DF4]/20 text-[#868DF4] font-bold py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <Book className="w-4 h-4" /> Assign Subjects
                        </button>
                    </div>

                    {/* Details List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-4">
                        <DetailRow label="Registration No" value={student.registrationNo || student.admNo} />
                        <DetailRow label="Date Of Admission" value={student.admissionDate} />
                        <DetailRow label="Class" value={student.studentClass || student.currentClass} />
                        <DetailRow label="Family" value={student.family || ""} />
                        <DetailRow label="Discount in Fee" value={student.discount ? `${student.discount}%` : ""} />
                    </div>

                    {/* Extended Details List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-4">
                        <DetailRow label="Date Of Birth" value={student.dob} />
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

                    {/* 3 Examination Report */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col break-inside-avoid mb-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 rounded-full bg-[#868DF4] text-white flex items-center justify-center text-xs font-bold">3</div>
                            <h3 className="text-[#868DF4] font-bold">Examination Report</h3>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center pb-2 w-full">
                            {historicalExams.length > 0 ? (
                                <div className="w-full space-y-3">
                                    {historicalExams.map((exam: any, idx: number) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-700 text-sm truncate">{exam.examName}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">{exam.term}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-black text-[#868DF4]">{exam.average}% avg</p>
                                                <p className="text-[9px] text-slate-500 font-bold">GPA: {exam.gpa}</p>
                                            </div>
                                            <button
                                                onClick={() => printReportCard(exam)}
                                                title="Print Report Card"
                                                className="w-9 h-9 flex-shrink-0 rounded-xl bg-[#868DF4]/10 hover:bg-[#868DF4] text-[#868DF4] hover:text-white flex items-center justify-center transition-all group"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="w-32 h-32 bg-indigo-50/50 rounded-full flex items-center justify-center mb-4 relative">
                                        <Search className="w-12 h-12 text-[#868DF4] opacity-50" />
                                    </div>
                                    <p className="font-bold text-[#868DF4]">No Record Found.</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Performance Trends Chart */}
                    {trendData.length >= 2 && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 break-inside-avoid mb-6">
                            <div className="flex items-center gap-2 mb-5">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-emerald-600 font-bold">Performance Trends</h3>
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
                            <div className="w-6 h-6 rounded-full bg-[#868DF4] text-white flex items-center justify-center text-xs font-bold">4</div>
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
