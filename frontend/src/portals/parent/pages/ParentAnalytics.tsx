import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { Loader2, TrendingUp, ChevronDown, Award } from "lucide-react";
import type { ParentCtx } from "../ParentLayout";

// Zeraki High parent view: performance stats, student-vs-class chart, subject
// table with rank/change, and performance over time. Real data from the
// analytics API, scoped to the active child.
const GREEN = "#2E7D32", BLUE = "#1565C0";

export default function ParentAnalytics() {
    const { api, child } = useOutletContext<ParentCtx>();
    const sid = child?._id;
    const [examId, setExamId] = useState("");
    const [examOpen, setExamOpen] = useState(false);

    const { data: examData } = useQuery({ queryKey: ["p_an_exams", sid], enabled: !!sid, queryFn: async () => (await api.get("/analytics/exams", { params: { studentId: sid } })).data });
    const exams = examData?.exams || [];
    const activeExamId = examId || exams[0]?.id || "";

    const { data, isLoading } = useQuery({
        queryKey: ["p_an_student", sid, activeExamId],
        enabled: !!sid && !!activeExamId,
        queryFn: async () => (await api.get(`/analytics/student/${sid}`, { params: { examId: activeExamId } })).data,
    });
    const { data: ot } = useQuery({
        queryKey: ["p_an_ot", sid],
        enabled: !!sid,
        queryFn: async () => (await api.get(`/analytics/student/${sid}/over-time`)).data,
    });

    const current = exams.find((e: any) => e.id === activeExamId);
    const p = data?.performance;

    return (
        <div className="min-h-screen bg-[#F5F5F5] pb-20">
            <div className="text-white px-5 py-4" style={{ background: GREEN }}>
                <h1 className="text-lg font-black">{child?.name || "Student"}</h1>
                <p className="text-xs opacity-90">{child?.admNo || child?.registrationNo} · {child?.stream || child?.studentClass || ""}</p>
                <div className="relative mt-3">
                    <button onClick={() => setExamOpen(o => !o)} className="h-9 px-3 rounded-lg bg-white/15 text-sm font-bold flex items-center gap-1.5 w-full justify-between">
                        <span className="truncate">{current?.title || "Change Exam"}</span><ChevronDown className="w-4 h-4" />
                    </button>
                    {examOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setExamOpen(false)} />
                            <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-20 max-h-80 overflow-y-auto text-slate-700">
                                {exams.length === 0 ? (
                                    <p className="px-4 py-3 text-sm text-slate-400">No exams published yet.</p>
                                ) : exams.map((e: any) => (
                                    <button key={e.id} onClick={() => { setExamId(e.id); setExamOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">{e.title}</button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {!sid ? <Empty msg="Select a child." /> : isLoading ? <Spin /> : !data?.found ? <Empty msg="No results for this exam yet." /> : (
                <div className="p-4 space-y-4">
                    {/* Performance stats */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                        <h3 className="font-black text-slate-700 text-sm mb-3">Performance in {current?.title}</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <Stat label="Mean Marks" value={`${p.meanPct}%`} />
                            <Stat label="Total Points" value={`${p.totalPoints}/${p.outOf}`} />
                            <Stat label="Mean Grade" value={p.meanGrade} />
                            <Stat label="Overall Pos" value={`${p.overallPosition}/${p.overallOf}`} />
                            <Stat label="Stream Pos" value={`${p.streamPosition}/${p.streamOf}`} />
                            <Stat label="KCPE" value={data.student.kcpe || "-"} />
                        </div>
                    </div>

                    {/* Student vs Class averages */}
                    <Card title="Student vs Class Averages">
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.vsClass}>
                                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="subject" tick={{ fontSize: 8 }} interval={0} angle={-30} textAnchor="end" height={50} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                                    <Line type="monotone" dataKey="student" name={child?.name?.split(" ")[0] || "Student"} stroke={GREEN} strokeWidth={2} />
                                    <Line type="monotone" dataKey="classAvg" name="Class Avg" stroke={BLUE} strokeWidth={2} strokeDasharray="4 3" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Subject performance table */}
                    <Card title="Subject Performance">
                        <table className="w-full text-sm">
                            <thead><tr className="text-slate-400 text-[11px] uppercase"><th className="text-left py-2">Subject</th><th className="text-right">Marks %</th><th className="text-center">Change</th><th className="text-center">Grade</th><th className="text-center">Rank</th></tr></thead>
                            <tbody>
                                {data.subjectTable.map((s: any) => (
                                    <tr key={s.name} className="border-t border-slate-50">
                                        <td className="py-2 font-bold text-slate-700">{s.name}</td>
                                        <td className="text-right">{s.pct}</td>
                                        <td className="text-center"><Delta v={s.change} /></td>
                                        <td className="text-center font-bold">{s.grade}</td>
                                        <td className="text-center text-slate-500">{s.rank}/{s.of}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {/* Performance over time */}
                    <Card title={<span className="flex items-center gap-2"><Award className="w-4 h-4" style={{ color: GREEN }} /> Performance Over Time</span>}>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={ot?.series || []}>
                                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="exam" tick={{ fontSize: 8 }} hide /><YAxis tick={{ fontSize: 11 }} domain={[0, 100]} /><Tooltip />
                                    <Line type="monotone" dataKey="mean" name="Mean %" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

const Spin = () => <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
const Empty = ({ msg }: { msg: string }) => <div className="py-16 text-center text-slate-400 font-bold">{msg}</div>;
const Card = ({ title, children }: any) => <div className="bg-white rounded-2xl border border-slate-100 p-4"><h3 className="font-black text-slate-700 text-sm mb-3">{title}</h3>{children}</div>;
const Stat = ({ label, value }: any) => (
    <div className="text-center bg-slate-50 rounded-xl py-2">
        <div className="font-black text-base" style={{ color: GREEN }}>{value}</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase">{label}</div>
    </div>
);
const Delta = ({ v }: { v: number }) => {
    if (!v) return <span className="text-slate-300">—</span>;
    const up = v > 0;
    return <span className={`inline-flex items-center gap-0.5 font-bold ${up ? "text-emerald-600" : "text-rose-500"}`}><TrendingUp className={`w-3 h-3 ${up ? "" : "rotate-180"}`} />{up ? "+" : ""}{v}</span>;
};
