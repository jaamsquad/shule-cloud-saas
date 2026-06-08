import { Home, History, ArrowRight, BookOpen, TrendingUp, Loader2, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";

function grade(pct: number) {
    if (pct >= 80) return "A"; if (pct >= 70) return "B+"; if (pct >= 60) return "B";
    if (pct >= 50) return "C+"; if (pct >= 40) return "C"; if (pct >= 33) return "D"; return "F";
}
function gradeColor(pct: number) { return pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"; }

export default function StudentHistoryPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data, isLoading, error } = useQuery({
        queryKey: ["v2_student_history", id],
        queryFn: async () => {
            const r = await api.get(`/v2/students/${id}/history`);
            return r.data;
        },
        enabled: !!id,
    });

    const { data: marksData = [] } = useQuery({
        queryKey: ["v2_all_marks_student", id],
        queryFn: async () => {
            const r = await api.get(`/v2/marks?studentId=${id}`);
            return Array.isArray(r.data) ? r.data : [];
        },
        enabled: !!id,
    });

    const student = data?.student;
    const enrollments: any[] = data?.enrollments || [];

    // Group marks by enrollment
    const marksByEnrollment: Record<string, any[]> = {};
    marksData.forEach((m: any) => {
        if (!marksByEnrollment[m.enrollmentId]) marksByEnrollment[m.enrollmentId] = [];
        marksByEnrollment[m.enrollmentId].push(m);
    });

    // Compute summary per enrollment
    const enrollmentSummaries = enrollments.map(enroll => {
        const marks = marksByEnrollment[enroll._id?.toString()] || [];
        const totalMarks = marks.reduce((s: number, m: any) => s + Number(m.marksObtained || 0), 0);
        const totalOutOf = marks.reduce((s: number, m: any) => s + Number(m.totalMarks || 100), 0);
        const avg = totalOutOf > 0 ? (totalMarks / totalOutOf) * 100 : 0;
        const subjects = [...new Set(marks.map((m: any) => m.subjectName))];
        return { ...enroll, marks, totalMarks, totalOutOf, avg, subjectCount: subjects.length };
    });

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] h-screen">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading academic history...</p>
            </div>
        </div>
    );

    if (error || !student) return (
        <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] h-screen">
            <div className="text-center">
                <p className="text-slate-400 text-sm font-black uppercase mb-4">Student not found</p>
                <button onClick={() => navigate(-1)} className="h-10 px-5 bg-[#5C67F2] text-white font-black text-xs uppercase rounded-xl">Go Back</button>
            </div>
        </div>
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <button onClick={() => navigate("/academic-system/enrollments")} className="font-bold text-gray-500 hover:text-[#5C67F2] transition-colors">Enrollments</button>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Student Academic History</span>
                </div>
                <button onClick={() => navigate(`/academic-system/report-cards`)}
                    className="h-9 px-4 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <FileText className="w-3.5 h-3.5" /> View Report Cards
                </button>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-8">
                {/* Student card */}
                <div className="bg-gradient-to-r from-[#5C67F2] to-purple-600 rounded-[2rem] p-6 mb-8 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-40 h-40 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center font-black text-3xl">
                            {(student.studentName || "?")[0]}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black">{student.studentName || `${student.firstName} ${student.lastName}`}</h1>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                                    {student.registrationNo || student.admNo || "—"}
                                </span>
                                <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                                    {enrollments.length} Academic Year{enrollments.length !== 1 ? "s" : ""}
                                </span>
                                <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                                    {marksData.length} Marks recorded
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Academic timeline */}
                <div className="mb-6">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <History className="w-4 h-4 text-[#5C67F2]" /> Academic Timeline ({enrollments.length} years)
                    </h2>

                    {enrollments.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase">
                            <History className="w-8 h-8" /> No enrollment records found
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200" />

                            <div className="space-y-4">
                                {enrollmentSummaries.map((enroll, i) => {
                                    const isFirst = i === 0;
                                    const isLast = i === enrollmentSummaries.length - 1;
                                    return (
                                        <div key={enroll._id} className="flex items-start gap-5">
                                            {/* Timeline dot */}
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 relative z-10 ${enroll.status === "active" ? "bg-[#5C67F2] text-white shadow-lg shadow-indigo-200" : "bg-white border-2 border-slate-200 text-slate-500"}`}>
                                                {enroll.academicYear || "—"}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-black text-slate-800 text-sm">{enroll.fullClassName || `${enroll.className} ${enroll.streamName}`}</p>
                                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${enroll.status === "active" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400"}`}>
                                                                {enroll.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                                            {enroll.academicYear} · Enrolled {enroll.enrollmentDate ? new Date(enroll.enrollmentDate).toLocaleDateString("en-GB") : "—"}
                                                            {enroll.completedAt && ` · Completed ${new Date(enroll.completedAt).toLocaleDateString("en-GB")}`}
                                                        </p>
                                                    </div>
                                                    {enroll.avg > 0 && (
                                                        <div className="text-right flex-shrink-0">
                                                            <p className={`text-xl font-black ${gradeColor(enroll.avg)}`}>{enroll.avg.toFixed(1)}%</p>
                                                            <p className={`text-sm font-black ${gradeColor(enroll.avg)}`}>{grade(enroll.avg)}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Marks summary */}
                                                {enroll.marks.length > 0 ? (
                                                    <div className="mt-3 pt-3 border-t border-slate-50">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                            {enroll.marks.length} mark entries across {enroll.subjectCount} subjects · {enroll.totalMarks}/{enroll.totalOutOf} total
                                                        </p>
                                                        {/* Mini bar */}
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${enroll.avg >= 70 ? "bg-emerald-400" : enroll.avg >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
                                                                style={{ width: `${Math.min(enroll.avg, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[9px] text-slate-300 font-bold mt-2">No marks recorded for this year</p>
                                                )}

                                                {/* Promoted from/to */}
                                                {enroll.promotedFromEnrollmentId && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
                                                        <ArrowRight className="w-3 h-3" /> Promoted from previous year
                                                    </div>
                                                )}

                                                {/* Action buttons */}
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                                                    <button onClick={() => navigate(`/academic-system/report-cards?enrollmentId=${enroll._id}`)}
                                                        className="flex items-center gap-1.5 text-[9px] text-[#5C67F2] font-black uppercase hover:underline">
                                                        <FileText className="w-3 h-3" /> View Report Card
                                                    </button>
                                                    <span className="text-slate-200">·</span>
                                                    <button onClick={() => navigate(`/academic-system/marks?enrollmentId=${enroll._id}`)}
                                                        className="flex items-center gap-1.5 text-[9px] text-[#5C67F2] font-black uppercase hover:underline">
                                                        <TrendingUp className="w-3 h-3" /> View Marks
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Performance across years */}
                {enrollmentSummaries.filter(e => e.avg > 0).length >= 2 && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#5C67F2]" /> Performance Across Years
                        </h3>
                        <div className="flex items-end gap-3 h-32">
                            {enrollmentSummaries.filter(e => e.avg > 0).map(e => (
                                <div key={e._id} className="flex-1 flex flex-col items-center gap-1">
                                    <p className={`text-[10px] font-black ${gradeColor(e.avg)}`}>{e.avg.toFixed(0)}%</p>
                                    <div className="w-full rounded-t-xl relative" style={{ height: `${(e.avg / 100) * 96}px`, background: e.avg >= 70 ? "#4ade80" : e.avg >= 50 ? "#fbbf24" : "#f87171" }} />
                                    <p className="text-[8px] font-black text-slate-400 uppercase text-center">{e.academicYear}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
