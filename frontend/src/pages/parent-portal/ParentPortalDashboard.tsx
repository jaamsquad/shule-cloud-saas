import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, TrendingUp, CreditCard, Bell, LogOut, Users, BookOpen, ClipboardList, BarChart2, Loader2, GraduationCap, Megaphone, Clock, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { API_ORIGIN } from "@/lib/config";
import { useGrading } from "@/lib/grading";

const pApi = axios.create({ baseURL: `${API_ORIGIN}/api/v1` });
pApi.interceptors.request.use(cfg => {
    const t = localStorage.getItem("parent_token");
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
});

function gc(p: number) { return p >= 70 ? "text-emerald-400" : p >= 50 ? "text-amber-400" : "text-rose-400"; }

type Tab = "home" | "performance" | "fees" | "notices";

export default function ParentPortalDashboard() {
    const navigate = useNavigate();
    const [parent, setParent] = useState<any>(null);
    const [tab, setTab] = useState<Tab>("home");

    useEffect(() => {
        const info = localStorage.getItem("parent_info");
        if (!info || !localStorage.getItem("parent_token")) { navigate("/parent-portal"); return; }
        setParent(JSON.parse(info));
    }, [navigate]);

    const studentId = parent?.student?._id;

    const { data: student } = useQuery({
        queryKey: ["pp_student"],
        queryFn: async () => { const r = await pApi.get("/auth/parent-portal/student"); return r.data; },
        enabled: !!studentId,
    });

    // The school's configured grading for the child's class (fetched with the portal token).
    const grading = useGrading(student?.classId, student?.class || student?.studentClass || parent?.student?.class, pApi);
    const grade = (p: number) => grading.grade(p);

    const { data: examResults = [], isLoading: loadExams } = useQuery({
        queryKey: ["pp_exams"],
        queryFn: async () => {
            const r = await axios.get(`/api/v1/exam_marks?studentId=${studentId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("parent_token")}` } });
            const marks = Array.isArray(r.data) ? r.data : [];
            const grouped: Record<string, any> = {};
            marks.forEach((m: any) => {
                const k = m.examId || m.examName || "exam";
                if (!grouped[k]) grouped[k] = { examName: m.examName || "Exam", term: m.term || "", subjects: [], totalMarks: 0, totalOutOf: 0 };
                grouped[k].subjects.push({ name: m.subjectName, marks: Number(m.marksObtained || 0), outOf: Number(m.totalMarks || 100) });
                grouped[k].totalMarks += Number(m.marksObtained || 0);
                grouped[k].totalOutOf += Number(m.totalMarks || 100);
            });
            return Object.values(grouped).map((g: any) => ({ ...g, average: g.totalOutOf > 0 ? (g.totalMarks / g.totalOutOf) * 100 : 0 }));
        },
        enabled: !!studentId,
    });

    const { data: invoices = [] } = useQuery({
        queryKey: ["pp_invoices"],
        queryFn: async () => {
            const r = await pApi.get("/auth/student-portal/fee-invoices");
            return Array.isArray(r.data) ? r.data : [];
        },
        enabled: !!studentId,
    });

    const { data: announcements = [] } = useQuery({
        queryKey: ["pp_notices"],
        queryFn: async () => { const r = await pApi.get("/auth/student-portal/announcements"); return Array.isArray(r.data) ? r.data : []; },
    });

    const overallAvg = examResults.length > 0 ? examResults.reduce((s: number, e: any) => s + (e.average || 0), 0) / examResults.length : 0;
    const outstanding = invoices.reduce((s: number, i: any) => s + Math.max(0, Number(i.balance || i.outstanding || 0)), 0);
    const trendData = [...examResults].reverse().map((e: any) => ({ name: e.examName?.slice(0, 10), Avg: Number(e.average.toFixed(1)) }));

    const handleLogout = () => { localStorage.removeItem("parent_token"); localStorage.removeItem("parent_info"); toast.success("Logged out"); navigate("/parent-portal"); };

    if (!parent) return null;

    const NAV: { key: Tab; icon: React.ElementType; label: string }[] = [
        { key: "home", icon: Home, label: "Home" },
        { key: "performance", icon: TrendingUp, label: "Results" },
        { key: "fees", icon: CreditCard, label: "Fees" },
        { key: "notices", icon: Bell, label: "Notices" },
    ];

    const stu = parent.student;

    return (
        <div className="min-h-screen font-sans flex flex-col" style={{ background: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)" }}>
            {/* Top bar */}
            <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-white font-black text-xs">Parent Portal</p>
                        <p className="text-emerald-400 text-[8px] font-bold uppercase tracking-widest">ShuleCloud</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="w-8 h-8 bg-white/5 hover:bg-red-900/30 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-400 transition-all">
                    <LogOut className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-24">
                <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

                    {/* HOME */}
                    {tab === "home" && (
                        <>
                            {/* Parent / Student card */}
                            <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)" }}>
                                <div className="absolute right-0 top-0 w-28 h-28 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                                <p className="text-emerald-200 text-[9px] font-bold uppercase tracking-widest mb-0.5">Parent / Guardian</p>
                                <h2 className="text-xl font-black text-white">{parent.name}</h2>
                                <div className="mt-3 bg-white/20 rounded-2xl p-3 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center font-black text-white text-sm">{stu?.name?.[0] || "S"}</div>
                                    <div>
                                        <p className="text-white font-black text-sm">{stu?.name}</p>
                                        <p className="text-emerald-200 text-[9px] font-bold uppercase">{stu?.class} · {stu?.registrationNo}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Overall Avg", value: overallAvg > 0 ? `${overallAvg.toFixed(1)}%` : "—", icon: TrendingUp, color: gc(overallAvg) },
                                    { label: "Exams", value: examResults.length, icon: BookOpen, color: "text-indigo-400" },
                                    { label: "Fee Balance", value: outstanding > 0 ? `KSh ${outstanding.toLocaleString()}` : "Cleared", icon: CreditCard, color: outstanding > 0 ? "text-rose-400" : "text-emerald-400" },
                                    { label: "Notices", value: announcements.length, icon: Bell, color: "text-amber-400" },
                                ].map(s => (
                                    <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
                                        <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {examResults[0] && (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Latest Result</p>
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-white font-black">{examResults[0].examName}</p><p className="text-slate-500 text-[9px] font-bold">{examResults[0].term} · {examResults[0].subjects?.length || 0} subjects</p></div>
                                        <div className="text-right"><p className={`text-2xl font-black ${gc(examResults[0].average)}`}>{examResults[0].average.toFixed(1)}%</p><p className={`text-sm font-black ${gc(examResults[0].average)}`}>{grade(examResults[0].average)}</p></div>
                                    </div>
                                    <button onClick={() => setTab("performance")} className="w-full mt-3 text-[9px] text-emerald-400 font-black uppercase tracking-widest text-center flex items-center justify-center gap-1">View full results <ChevronRight className="w-3 h-3" /></button>
                                </div>
                            )}

                            {outstanding > 0 && (
                                <div className="bg-rose-900/30 border border-rose-500/30 rounded-3xl p-4 flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-rose-400 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-white font-black text-sm">Fee Balance Due</p>
                                        <p className="text-rose-400 font-black text-lg">KSh {outstanding.toLocaleString()}</p>
                                    </div>
                                    <button onClick={() => setTab("fees")} className="text-[9px] text-rose-400 font-black uppercase">View →</button>
                                </div>
                            )}
                        </>
                    )}

                    {/* PERFORMANCE */}
                    {tab === "performance" && (
                        <>
                            <h2 className="text-white font-black text-lg uppercase tracking-tight">Academic Performance</h2>
                            {overallAvg > 0 && (
                                <div className="rounded-3xl p-5 text-center" style={{ background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)" }}>
                                    <p className="text-4xl font-black text-white">{overallAvg.toFixed(1)}%</p>
                                    <p className="text-4xl font-black text-white/80 mt-1">{grade(overallAvg)}</p>
                                    <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest mt-2">Overall — {examResults.length} exams</p>
                                </div>
                            )}
                            {trendData.length >= 2 && (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Performance Trend</p>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                            <Tooltip formatter={(v: any) => [`${v}%`]} contentStyle={{ background: "#022c22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "11px", color: "white" }} />
                                            <Line type="monotone" dataKey="Avg" stroke="#34d399" strokeWidth={2.5} dot={{ fill: "#34d399", r: 4, stroke: "#022c22", strokeWidth: 2 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            {examResults.map((e: any) => (
                                <div key={e.examName} className="bg-white/5 border border-white/10 rounded-3xl p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div><p className="text-white font-black">{e.examName}</p><p className="text-slate-500 text-[9px] font-bold uppercase">{e.term}</p></div>
                                        <div className="text-right"><p className={`text-xl font-black ${gc(e.average)}`}>{e.average.toFixed(1)}%</p><p className={`text-sm font-black ${gc(e.average)}`}>{grade(e.average)}</p></div>
                                    </div>
                                    {e.subjects?.map((sub: any, i: number) => {
                                        const pct = sub.outOf > 0 ? (sub.marks / sub.outOf) * 100 : 0;
                                        return (
                                            <div key={i} className="flex items-center gap-3 py-1.5 border-t border-white/5">
                                                <p className="text-slate-300 text-[10px] font-bold flex-1 truncate">{sub.name}</p>
                                                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className={`h-full ${pct >= 70 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                                                <span className={`text-[10px] font-black w-10 text-right ${gc(pct)}`}>{sub.marks}/{sub.outOf}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </>
                    )}

                    {/* FEES */}
                    {tab === "fees" && (
                        <>
                            <h2 className="text-white font-black text-lg uppercase tracking-tight">Fee Account</h2>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { l: "Total Billed", v: `KSh ${invoices.reduce((s: number, i: any) => s + Number(i.total_due || i.amount || 0), 0).toLocaleString()}`, c: "text-indigo-400" },
                                    { l: "Paid", v: `KSh ${invoices.reduce((s: number, i: any) => s + Number(i.paid_amount || i.amount_paid || 0), 0).toLocaleString()}`, c: "text-emerald-400" },
                                    { l: "Balance", v: `KSh ${outstanding.toLocaleString()}`, c: outstanding > 0 ? "text-rose-400" : "text-emerald-400" },
                                ].map(s => (
                                    <div key={s.l} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                                        <p className={`text-sm font-black ${s.c}`}>{s.v}</p>
                                        <p className="text-[7px] text-slate-500 font-black uppercase">{s.l}</p>
                                    </div>
                                ))}
                            </div>
                            {invoices.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center"><CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400 text-xs font-black uppercase">No invoices found</p></div>
                            ) : invoices.map((inv: any) => {
                                const isPaid = (inv.balance || 0) <= 0 || inv.status === "PAID";
                                return (
                                    <div key={inv._id} className={`rounded-3xl p-5 border ${isPaid ? "bg-emerald-900/20 border-emerald-500/20" : "bg-white/5 border-white/10"}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div><p className="text-white font-black">{inv.invoice_no || inv.invoiceNo || "Invoice"}</p><p className="text-slate-500 text-[9px] font-bold uppercase">{inv.term || "—"}</p></div>
                                            <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase ${isPaid ? "bg-emerald-500 text-white" : "bg-rose-900/50 text-rose-400 border border-rose-500/30"}`}>{isPaid ? "Paid" : "Unpaid"}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            {[{ l: "Billed", v: Number(inv.total_due || inv.amount || 0).toLocaleString() }, { l: "Paid", v: Number(inv.paid_amount || inv.amount_paid || 0).toLocaleString() }, { l: "Balance", v: Math.max(0, Number(inv.balance || 0)).toLocaleString() }].map(f => (
                                                <div key={f.l} className="bg-white/5 rounded-2xl py-2"><p className="text-[7px] text-slate-500 font-black uppercase">{f.l}</p><p className="text-xs font-black text-white">KSh {f.v}</p></div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* NOTICES */}
                    {tab === "notices" && (
                        <>
                            <h2 className="text-white font-black text-lg uppercase tracking-tight">School Notices</h2>
                            {announcements.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center"><Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400 text-xs font-black uppercase">No notices</p></div>
                            ) : announcements.map((ann: any) => (
                                <div key={ann._id} className={`rounded-3xl p-5 border ${ann.priority === "Urgent" ? "bg-rose-900/20 border-rose-500/20" : "bg-white/5 border-white/10"}`}>
                                    <div className="flex items-start gap-3">
                                        <Megaphone className={`w-4 h-4 flex-shrink-0 mt-0.5 ${ann.priority === "Urgent" ? "text-rose-400" : "text-emerald-400"}`} />
                                        <div>
                                            <div className="flex items-center gap-2 mb-1"><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${ann.priority === "Urgent" ? "bg-rose-500 text-white" : "bg-white/10 text-slate-400"}`}>{ann.priority || "Notice"}</span></div>
                                            <p className="text-white font-black text-sm">{ann.title}</p>
                                            <p className="text-slate-400 text-[10px] font-medium mt-1">{ann.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 inset-x-0 z-30" style={{ background: "rgba(2,44,34,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
                    {NAV.map(n => {
                        const active = tab === n.key;
                        return (
                            <button key={n.key} onClick={() => setTab(n.key)}
                                className={`flex flex-col items-center gap-1 py-2 px-5 rounded-2xl transition-all ${active ? "bg-white/10" : "hover:bg-white/5"}`}>
                                <n.icon className={`w-5 h-5 ${active ? "text-emerald-400" : "text-slate-500"}`} />
                                <span className={`text-[8px] font-black uppercase tracking-wide ${active ? "text-emerald-300" : "text-slate-600"}`}>{n.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
