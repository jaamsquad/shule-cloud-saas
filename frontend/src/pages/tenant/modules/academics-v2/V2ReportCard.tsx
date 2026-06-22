import { useState } from "react";
import { Home, Printer, Search, FileText, Loader2, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { openPrintDoc } from "@/lib/pdfDoc";

function grade(pct: number | null) { if (pct === null) return "—"; if (pct >= 80) return "A"; if (pct >= 70) return "B+"; if (pct >= 60) return "B"; if (pct >= 50) return "C+"; if (pct >= 40) return "C"; if (pct >= 33) return "D"; return "F"; }
function gradeColor(pct: number | null) { if (pct === null) return "text-gray-400"; return pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"; }

export default function V2ReportCard() {
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
    const [selectedExamId, setSelectedExamId] = useState("");
    const [ctComment, setCtComment] = useState("");
    const [principalComment, setPrincipalComment] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: history } = useQuery({ queryKey: ["v2_student_history", selectedStudent?._id], queryFn: async () => { const r = await api.get(`/v2/students/${selectedStudent._id}/history`); return r.data; }, enabled: !!selectedStudent });
    const { data: exams = [] } = useQuery({ queryKey: ["v2_exams"] , queryFn: async () => { const r = await api.get("/v2/exams"); return Array.isArray(r.data) ? r.data : []; } });

    const { data: reportCard, isLoading: loadRC } = useQuery({
        queryKey: ["v2_report_card", selectedEnrollment?._id, selectedExamId],
        queryFn: async () => {
            const url = `/v2/report-card/${selectedEnrollment._id}${selectedExamId ? `?examId=${selectedExamId}` : ""}`;
            const r = await api.get(url);
            return r.data;
        },
        enabled: !!selectedEnrollment,
        onSuccess: (data: any) => {
            setCtComment(data.comments?.classTeacher || "");
            setPrincipalComment(data.comments?.principal || "");
        },
    });

    const saveComments = async () => {
        if (!selectedEnrollment) return;
        setIsSaving(true);
        try {
            await api.patch(`/v2/report-card/${selectedEnrollment._id}/comments`, { classTeacherComment: ctComment, principalComment });
            toast.success("Comments saved");
        } catch { toast.error("Failed"); } finally { setIsSaving(false); }
    };

    const printReportCard = () => {
        if (!reportCard) return;
        const win = openPrintDoc();
        if (!win) { toast.error("Allow popups"); return; }
        const rows = (reportCard.subjects || []).map((s: any) => `
            <tr style="${!s.hasMarks ? 'color:#94a3b8' : ''}">
                <td>${s.subjectName}</td>
                ${s.hasMarks
                    ? s.entries.map((e: any) => `<td style="text-align:center">${e.marks}/${e.outOf}</td><td style="text-align:center">${e.grade}</td>`).join("")
                    : `<td style="text-align:center;color:#94a3b8">—</td><td style="text-align:center;color:#94a3b8">—</td>`
                }
                <td style="text-align:center;font-weight:900">${s.hasMarks ? `${s.totalMarks}/${s.totalOutOf}` : `—/${s.totalOutOf}`}</td>
                <td style="text-align:center;font-weight:900;color:${!s.hasMarks ? '#94a3b8' : s.average >= 70 ? '#059669' : s.average >= 50 ? '#d97706' : '#dc2626'}">
                    ${s.hasMarks ? `${s.average?.toFixed(1)}%` : '—'} · ${grade(s.average)}
                </td>
            </tr>
        `).join("");
        win.document.write(`<!DOCTYPE html><html><head><title>Report Card</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1e293b}
        h1{color:#5C67F2;font-size:20px;font-weight:900;text-transform:uppercase}
        .header{border-bottom:3px solid #5C67F2;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between}
        .info{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#f8fafc;padding:14px;border-radius:8px;margin-bottom:20px}
        .info-item label{font-size:9px;text-transform:uppercase;color:#94a3b8;font-weight:700}
        .info-item span{font-size:13px;font-weight:800}
        table{width:100%;border-collapse:collapse;margin-bottom:16px}
        th{background:#5C67F2;color:white;padding:9px 10px;font-size:9px;text-transform:uppercase}
        td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px}
        .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;margin:16px 0}
        .sum-box{background:#eff6ff;border-radius:8px;padding:12px}
        .sum-box label{font-size:9px;text-transform:uppercase;color:#94a3b8;font-weight:700;display:block}
        .sum-box span{font-size:20px;font-weight:900;color:#5C67F2}
        .comments{margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .comment-box{border:1px solid #e2e8f0;border-radius:8px;padding:12px}
        .comment-box label{font-size:9px;text-transform:uppercase;color:#94a3b8;font-weight:700;display:block;margin-bottom:6px}
        .sig{height:40px;border-top:1px solid #94a3b8;margin-top:30px;display:flex;align-items:flex-end;justify-content:center;font-size:9px;color:#94a3b8}
        @media print{@page{margin:15mm}}
        </style></head><body>
        <div class="header">
            <div><h1>Academic Report Card</h1><p style="font-size:11px;color:#94a3b8">${reportCard.enrollment?.academicYear} · ${reportCard.enrollment?.class} ${reportCard.enrollment?.stream}</p></div>
        </div>
        <div class="info">
            <div class="info-item"><label>Student Name</label><span>${reportCard.student?.name}</span></div>
            <div class="info-item"><label>Admission No</label><span>${reportCard.student?.admissionNo || "—"}</span></div>
            <div class="info-item"><label>Class</label><span>${reportCard.enrollment?.fullClass}</span></div>
            <div class="info-item"><label>Academic Year</label><span>${reportCard.enrollment?.academicYear}</span></div>
        </div>
        <table><thead><tr><th>Subject</th><th>Marks</th><th>Grade</th><th>Average</th><th>Final Grade</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="summary">
            <div class="sum-box"><label>Total Marks</label><span>${reportCard.summary?.totalMarks}/${reportCard.summary?.totalOutOf}</span></div>
            <div class="sum-box"><label>Average</label><span>${reportCard.summary?.average?.toFixed(1)}%</span></div>
            <div class="sum-box"><label>Mean Grade</label><span>${reportCard.summary?.meanGrade}</span></div>
        </div>
        <div class="comments">
            <div class="comment-box"><label>Class Teacher</label><p style="font-size:11px">${reportCard.comments?.classTeacher || "—"}</p></div>
            <div class="comment-box"><label>Principal</label><p style="font-size:11px">${reportCard.comments?.principal || "—"}</p></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:48px">
            <div class="sig">Class Teacher Sign</div>
            <div class="sig">Principal Sign</div>
            <div class="sig">Parent Sign</div>
        </div>
        <script>window.onload=()=>window.print()</script></body></html>`);
        win.document.close();
    };

    const filteredStudents = studentSearch.length >= 2 ? students.filter((s: any) => (s.studentName || "").toLowerCase().includes(studentSearch.toLowerCase()) || (s.registrationNo || "").toLowerCase().includes(studentSearch.toLowerCase())) : [];

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academic System</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Historical Report Cards</span>
                </div>
                {reportCard && (
                    <div className="flex gap-2">
                        <button onClick={saveComments} disabled={isSaving} className="h-9 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1.5">
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save Comments
                        </button>
                        <button onClick={printReportCard} className="h-9 px-4 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-[9px] uppercase rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-100">
                            <Printer className="w-3.5 h-3.5" /> Print Report Card
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><FileText className="w-7 h-7 text-[#5C67F2]" />Historical Report Cards</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Report cards use historical enrollment data — NEVER the student's current class.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Select student + enrollment */}
                    <div className="space-y-5">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 relative">
                            <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Search Student</div>
                            <div className="relative mt-2">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input type="text" value={studentSearch} onChange={e => { setStudentSearch(e.target.value); if (selectedStudent) { setSelectedStudent(null); setSelectedEnrollment(null); } }} className="w-full h-11 pl-12 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" placeholder="Search name..." />
                            </div>
                            {filteredStudents.length > 0 && !selectedStudent && (
                                <div className="mt-2 border border-slate-100 rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                                    {filteredStudents.map((s: any) => <div key={s._id} onClick={() => { setSelectedStudent(s); setStudentSearch(s.studentName || ""); setSelectedEnrollment(null); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50"><p className="text-xs font-black text-slate-700">{s.studentName}</p><p className="text-[9px] text-slate-400 font-bold">{s.registrationNo}</p></div>)}
                                </div>
                            )}
                        </div>

                        {/* Academic history */}
                        {history?.enrollments?.length > 0 && (
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Academic History ({history.enrollments.length} years)</p>
                                {history.enrollments.map((e: any) => (
                                    <button key={e._id} onClick={() => setSelectedEnrollment(e)}
                                        className={`w-full text-left px-4 py-3 rounded-2xl border mb-2 transition-all ${selectedEnrollment?._id === e._id ? "border-[#5C67F2] bg-indigo-50" : "border-slate-100 hover:border-indigo-200"}`}>
                                        <p className="text-xs font-black text-slate-800">{e.academicYear} · {e.fullClassName}</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase">{e.status} · {e.enrollmentDate ? new Date(e.enrollmentDate).toLocaleDateString("en-GB") : "—"}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Exam filter */}
                        {selectedEnrollment && (
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 relative">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Filter by Exam</div>
                                <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                    <option value="">All Exams (combined)</option>
                                    {exams.filter((e: any) => e.academicYearId === selectedEnrollment.academicYearId).map((e: any) => <option key={e._id} value={e._id}>{e.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Right: Report card */}
                    <div className="lg:col-span-2">
                        {!selectedEnrollment ? (
                            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center h-80 gap-3 text-slate-300">
                                <FileText className="w-12 h-12" />
                                <p className="text-xs font-black uppercase tracking-widest">Select a student and enrollment year to view report card</p>
                            </div>
                        ) : loadRC ? (
                            <div className="flex items-center justify-center h-80 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading report card...</div>
                        ) : reportCard ? (
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-[#5C67F2] to-purple-600 rounded-[2rem] p-6 text-white">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Report Card</p>
                                            <h2 className="text-xl font-black">{reportCard.student?.name}</h2>
                                            <p className="text-white/70 text-[10px] font-bold mt-0.5">{reportCard.student?.admissionNo}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Class</p>
                                            <p className="font-black text-lg">{reportCard.enrollment?.fullClass}</p>
                                            <p className="text-white/70 text-[10px] font-bold">{reportCard.enrollment?.academicYear}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mt-4">
                                        {[{ l: "Total", v: `${reportCard.summary?.totalMarks}/${reportCard.summary?.totalOutOf}` }, { l: "Average", v: `${reportCard.summary?.average?.toFixed(1)}%` }, { l: "Mean Grade", v: reportCard.summary?.meanGrade }].map(s => (
                                            <div key={s.l} className="bg-white/10 rounded-2xl py-3 text-center">
                                                <p className="text-[8px] font-black opacity-70 uppercase tracking-widest">{s.l}</p>
                                                <p className="text-lg font-black mt-0.5">{s.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Subjects */}
                                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subject Performance</p>
                                        <div className="flex items-center gap-2 text-[9px] font-bold">
                                            <span className="text-emerald-600">{reportCard.scoredSubjects ?? reportCard.subjects?.filter((s: any) => s.hasMarks !== false).length} scored</span>
                                            {(reportCard.totalSubjects ?? reportCard.subjects?.length) > (reportCard.scoredSubjects ?? 0) && (
                                                <span className="text-gray-400">· {(reportCard.totalSubjects ?? reportCard.subjects?.length) - (reportCard.scoredSubjects ?? 0)} pending marks</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {(reportCard.subjects || []).map((sub: any) => {
                                            const hasMarks = sub.hasMarks !== false && sub.totalMarks !== null;
                                            return (
                                                <div key={sub.subjectId || sub.subjectName}
                                                    className={`flex items-center gap-3 py-2.5 border-b border-slate-50 ${!hasMarks ? "opacity-60" : ""}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-xs font-black ${hasMarks ? "text-slate-800" : "text-slate-400"}`}>{sub.subjectName}</p>
                                                            {!hasMarks && (
                                                                <span className="text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-full">
                                                                    No marks entered
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden w-full">
                                                            {hasMarks && (
                                                                <div
                                                                    className={`h-full rounded-full ${sub.average >= 70 ? "bg-emerald-400" : sub.average >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
                                                                    style={{ width: `${Math.min(sub.average ?? 0, 100)}%` }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 min-w-[90px]">
                                                        {hasMarks ? (
                                                            <>
                                                                <p className={`text-sm font-black ${gradeColor(sub.average)}`}>
                                                                    {sub.totalMarks}/{sub.totalOutOf}
                                                                </p>
                                                                <p className={`text-[10px] font-black ${gradeColor(sub.average)}`}>
                                                                    {sub.average?.toFixed(1)}% · {grade(sub.average)}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="text-sm font-black text-gray-400">
                                                                    —/{sub.totalOutOf}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-gray-300">
                                                                    — · —
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {reportCard.subjects?.length === 0 && (
                                            <p className="text-slate-300 text-xs font-bold uppercase text-center py-6">
                                                No subjects found for this class. Add subjects to the class first.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Comments */}
                                <div className="grid grid-cols-2 gap-4">
                                    {[{ label: "Class Teacher Comment", val: ctComment, set: setCtComment }, { label: "Principal Comment", val: principalComment, set: setPrincipalComment }].map(f => (
                                        <div key={f.label} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-4">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{f.label}</p>
                                            <textarea value={f.val} onChange={e => f.set(e.target.value)} rows={3} placeholder="Type comment..." className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 resize-none focus:outline-none focus:border-[#5C67F2]" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
