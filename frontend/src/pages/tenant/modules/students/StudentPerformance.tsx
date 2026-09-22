import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, BarChart3, History, BookOpen } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "@/lib/api";

const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const COLORS = ["#5C67F2", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16", "#F97316", "#14B8A6"];

/**
 * A student's academic performance: subject-by-subject charts for the current class, and the same
 * broken down by every class they have been in, so a teacher can see how a learner has trended over time.
 */
export default function StudentPerformance() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState<"subjects" | "classes">("subjects");
    const [chart, setChart] = useState<"bar" | "line">("bar");

    const { data: student } = useQuery<any>({ queryKey: ["student_perf_profile", id], enabled: !!id, queryFn: async () => (await api.get(`/students/${id}`)).data });
    const { data: marksRaw, isLoading } = useQuery<any[]>({ queryKey: ["student_perf_marks", id], enabled: !!id, queryFn: async () => { const r = await api.get(`/exam_marks?studentId=${id}`); return Array.isArray(r.data) ? r.data : []; } });
    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["student_perf_exams"], queryFn: async () => (await api.get("/academics/exams")).data || [] });

    const examMeta = useMemo(() => {
        const m: Record<string, any> = {};
        exams.forEach((e: any) => { m[String(e._id)] = e; });
        return m;
    }, [exams]);

    const marks = useMemo(() => (marksRaw || []).map((m: any) => {
        const outOf = Number(m.totalMarks) || 100, pct = outOf ? Math.round((Number(m.marksObtained) || 0) / outOf * 100) : 0;
        const ex = examMeta[String(m.examId)] || {};
        return { ...m, pct, className: m.classAtTime || student?.studentClass || student?.currentClass || "Current class", examLabel: ex.examName || ex.name || "Exam", examDate: ex.startDate || ex.date || m.createdAt || 0 };
    }).sort((a: any, b: any) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()), [marksRaw, examMeta, student]);

    const currentClass = student?.studentClass || student?.currentClass || "";
    const currentMarks = useMemo(() => marks.filter((m: any) => !currentClass || norm(m.className) === norm(currentClass)), [marks, currentClass]);
    const subjects = useMemo(() => Array.from(new Set(currentMarks.map((m: any) => m.subjectName || m.subject).filter(Boolean))) as string[], [currentMarks]);
    const [subjFilter, setSubjFilter] = useState<string>("");

    // one row per exam, one column per subject — for the "all subjects" chart
    const subjectChartData = useMemo(() => {
        const byExam: Record<string, any> = {};
        currentMarks.forEach((m: any) => {
            const key = m.examLabel + "|" + m.examId;
            (byExam[key] ||= { exam: m.examLabel });
            byExam[key][m.subjectName || m.subject || "Subject"] = m.pct;
        });
        return Object.values(byExam);
    }, [currentMarks]);
    const filteredSubjects = subjFilter ? [subjFilter] : subjects;

    // classes the student has passed through, oldest first
    const classGroups = useMemo(() => {
        const g: Record<string, any[]> = {};
        marks.forEach((m: any) => { (g[m.className] ||= []).push(m); });
        return Object.entries(g).map(([className, rows]) => {
            const subs = Array.from(new Set(rows.map((r: any) => r.subjectName || r.subject).filter(Boolean))) as string[];
            const overall = rows.length ? Math.round(rows.reduce((a: number, r: any) => a + r.pct, 0) / rows.length) : 0;
            const bySubject = subs.map(s => { const rs = rows.filter((r: any) => (r.subjectName || r.subject) === s); return { subject: s, avg: Math.round(rs.reduce((a: number, r: any) => a + r.pct, 0) / rs.length) }; });
            return { className, isCurrent: norm(className) === norm(currentClass), overall, examCount: new Set(rows.map((r: any) => r.examId)).size, bySubject };
        }).sort((a, b) => (a.isCurrent ? 1 : 0) - (b.isCurrent ? 1 : 0));
    }, [marks, currentClass]);

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-[#5C67F2]" /> {student?.studentName || student?.name || "Student"} — Performance</h1>
                <p className="text-sm text-slate-400 mt-1">Subject-by-subject results in graph form, and how they have performed in every class so far.</p>
            </div>

            <div className="flex gap-2 mb-6">
                <button onClick={() => setTab("subjects")} className={`h-10 px-5 rounded-xl text-sm font-bold flex items-center gap-2 ${tab === "subjects" ? "bg-[#5C67F2] text-white" : "bg-white border border-slate-200 text-slate-600"}`}><BookOpen className="w-4 h-4" /> Subjects ({currentClass || "current class"})</button>
                <button onClick={() => setTab("classes")} className={`h-10 px-5 rounded-xl text-sm font-bold flex items-center gap-2 ${tab === "classes" ? "bg-[#5C67F2] text-white" : "bg-white border border-slate-200 text-slate-600"}`}><History className="w-4 h-4" /> Previous Classes ({classGroups.length})</button>
            </div>

            {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div> : tab === "subjects" ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setSubjFilter("")} className={`h-8 px-3 rounded-full text-xs font-bold ${!subjFilter ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-500"}`}>All subjects</button>
                            {subjects.map(s => <button key={s} onClick={() => setSubjFilter(s)} className={`h-8 px-3 rounded-full text-xs font-bold ${subjFilter === s ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-500"}`}>{s}</button>)}
                        </div>
                        <div className="flex gap-1 bg-slate-50 rounded-lg p-1">
                            <button onClick={() => setChart("bar")} className={`h-7 px-3 rounded-md text-xs font-bold ${chart === "bar" ? "bg-white shadow text-slate-700" : "text-slate-400"}`}>Bar</button>
                            <button onClick={() => setChart("line")} className={`h-7 px-3 rounded-md text-xs font-bold ${chart === "line" ? "bg-white shadow text-slate-700" : "text-slate-400"}`}>Line</button>
                        </div>
                    </div>
                    {subjectChartData.length === 0 ? <p className="text-center text-sm text-slate-400 py-16">No marks recorded yet for {currentClass || "this class"}.</p> : (
                        <ResponsiveContainer width="100%" height={380}>
                            {chart === "bar" ? (
                                <BarChart data={subjectChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="exam" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                                    {filteredSubjects.map((s, i) => <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}
                                </BarChart>
                            ) : (
                                <LineChart data={subjectChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="exam" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                                    {filteredSubjects.map((s, i) => <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} />)}
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    )}
                </div>
            ) : (
                <div className="space-y-5">
                    {classGroups.length === 0 ? <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-400">No class records yet.</div> : classGroups.map(g => (
                        <div key={g.className} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                                <div className="flex items-center gap-2"><History className="w-4 h-4" /><h3 className="font-black text-sm">{g.className}</h3>{g.isCurrent && <span className="text-[9px] font-black uppercase bg-emerald-500 px-2 py-0.5 rounded-full">Current</span>}</div>
                                <span className="text-xs font-bold text-slate-300">{g.examCount} exam{g.examCount !== 1 ? "s" : ""} · overall {g.overall}%</span>
                            </div>
                            <div className="p-5">
                                {g.bySubject.length === 0 ? <p className="text-xs text-slate-400">No subject marks for this class.</p> : (
                                    <ResponsiveContainer width="100%" height={Math.max(160, g.bySubject.length * 34)}>
                                        <BarChart data={g.bySubject} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="subject" width={120} tick={{ fontSize: 11 }} /><Tooltip />
                                            <Bar dataKey="avg" fill="#5C67F2" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
