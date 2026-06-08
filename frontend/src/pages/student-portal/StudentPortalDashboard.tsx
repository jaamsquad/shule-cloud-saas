import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Home, TrendingUp, CreditCard, FileText, Bell, LogOut,
    GraduationCap, BookOpen, ClipboardList, ChevronRight,
    Megaphone, Clock, CheckCircle2, AlertCircle, Receipt,
    BarChart2, Award, Loader2, Smartphone, X, Check, Phone
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from "recharts";

// ─── Student-scoped axios ─────────────────────────────────────────────────────
const sApi = axios.create({ baseURL: "/api/v1" });
sApi.interceptors.request.use(cfg => {
    const t = localStorage.getItem("student_token");
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
});

function grade(pct: number) {
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C+";
    if (pct >= 40) return "C";
    if (pct >= 33) return "D";
    return "F";
}

function gradeColor(pct: number) {
    if (pct >= 70) return "text-emerald-400";
    if (pct >= 50) return "text-amber-400";
    return "text-rose-400";
}

type Tab = "home" | "exams" | "fees" | "reports" | "notices";

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudentPortalDashboard() {
    const navigate = useNavigate();
    const [student, setStudent] = useState<any>(null);
    const [tab, setTab] = useState<Tab>("home");
    const [expandedExam, setExpandedExam] = useState<string | null>(null);

    // Payment modal state
    const [payingInvoice, setPayingInvoice] = useState<any>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("MPESA");
    const [payPhone, setPayPhone] = useState("");
    const [payRef, setPayRef] = useState("");
    const [paySuccess, setPaySuccess] = useState(false);

    const qc = useQueryClient();

    useEffect(() => {
        const info = localStorage.getItem("student_info");
        const token = localStorage.getItem("student_token");
        if (!info || !token) { navigate("/student-portal"); return; }
        setStudent(JSON.parse(info));
    }, [navigate]);

    // ── Data queries ─────────────────────────────────────────────────────
    const { data: examResults = [], isLoading: loadExams } = useQuery({
        queryKey: ["sp_exam_results"],
        queryFn: async () => { const r = await sApi.get("/auth/student-portal/exam-results"); return Array.isArray(r.data) ? r.data : []; },
        enabled: !!student,
    });

    const { data: invoices = [], isLoading: loadFees } = useQuery({
        queryKey: ["sp_invoices"],
        queryFn: async () => { const r = await sApi.get("/auth/student-portal/fee-invoices"); return Array.isArray(r.data) ? r.data : []; },
        enabled: !!student,
    });

    const { data: assignments = [] } = useQuery({
        queryKey: ["sp_assignments"],
        queryFn: async () => { const r = await sApi.get("/auth/student-portal/assignments"); return Array.isArray(r.data) ? r.data : []; },
        enabled: !!student,
    });

    const { data: announcements = [] } = useQuery({
        queryKey: ["sp_announcements"],
        queryFn: async () => { const r = await sApi.get("/auth/student-portal/announcements"); return Array.isArray(r.data) ? r.data : []; },
    });

    // ── Derived stats ─────────────────────────────────────────────────────
    const overallAvg = examResults.length > 0
        ? examResults.reduce((s: number, e: any) => s + (e.average || 0), 0) / examResults.length
        : 0;

    const totalInvoiced = invoices.reduce((s: number, inv: any) => s + Number(inv.total_due || inv.amount || 0), 0);
    const totalPaid = invoices.reduce((s: number, inv: any) => s + Number(inv.paid_amount || inv.amount_paid || 0), 0);
    const outstanding = totalInvoiced - totalPaid;

    // Trend chart data
    const trendData = [...examResults].reverse().map((e: any) => ({
        name: `${e.examName} (${e.term || ""})`.trim().slice(0, 14),
        Average: Number((e.average || 0).toFixed(1)),
    }));

    const handleLogout = () => {
        localStorage.removeItem("student_token");
        localStorage.removeItem("student_info");
        toast.success("Logged out");
        navigate("/student-portal");
    };

    const payMutation = useMutation({
        mutationFn: async (payload: any) => {
            const r = await sApi.post("/auth/student-portal/pay-invoice", payload);
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["sp_invoices"] });
            setPaySuccess(true);
        },
        onError: (e: any) => {
            import("sonner").then(({ toast }) => toast.error(e.response?.data?.message || "Payment failed"));
        },
    });

    const openPayModal = (inv: any) => {
        const bal = Math.max(0, Number(inv.balance || inv.outstanding || 0));
        setPayingInvoice(inv);
        setPayAmount(String(bal));
        setPayPhone(student?.phone || "");
        setPayRef("");
        setPaySuccess(false);
    };

    if (!student) return null;

    // ── Bottom nav config ─────────────────────────────────────────────────
    const NAV: { key: Tab; icon: React.ElementType; label: string; badge?: number }[] = [
        { key: "home",    icon: Home,       label: "Home"    },
        { key: "exams",   icon: BookOpen,   label: "Exams",   badge: examResults.length },
        { key: "fees",    icon: CreditCard, label: "Fees",    badge: invoices.filter((i: any) => (i.balance || 0) > 0).length || undefined },
        { key: "reports", icon: BarChart2,  label: "Reports" },
        { key: "notices", icon: Bell,       label: "Notices", badge: announcements.length || undefined },
    ];

    return (
        <div className="min-h-screen bg-[#0f0c29] font-sans flex flex-col" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>

            {/* ── Top bar ──────────────────────────────────────────────── */}
            <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-white font-black text-xs leading-tight">Student Portal</p>
                        <p className="text-indigo-400 text-[8px] font-bold uppercase tracking-widest">ShuleCloud</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-black text-white text-xs">
                        {student.name?.[0] || "S"}
                    </div>
                    <button onClick={handleLogout} className="w-8 h-8 bg-white/5 hover:bg-red-900/30 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-400 transition-all">
                        <LogOut className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── Scrollable content ────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto pb-24">
                <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

                    {/* ════════════ HOME ════════════ */}
                    {tab === "home" && (
                        <>
                            {/* Welcome card */}
                            <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                                <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                                </p>
                                <h2 className="text-xl font-black text-white">Welcome back, {student.name?.split(" ")[0]}! 👋</h2>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full">{student.class || "N/A"}</span>
                                    <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full">ID: {student.registrationNo || "—"}</span>
                                </div>
                            </div>

                            {/* Quick stats */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Overall Average", value: overallAvg > 0 ? `${overallAvg.toFixed(1)}%` : "—", sub: overallAvg > 0 ? grade(overallAvg) : "No data", icon: TrendingUp, color: gradeColor(overallAvg) },
                                    { label: "Exams Taken", value: examResults.length, sub: `${examResults.reduce((s: number, e: any) => s + (e.subjects?.length || 0), 0)} subject entries`, icon: BookOpen, color: "text-indigo-400" },
                                    { label: "Fee Balance", value: outstanding > 0 ? `KSh ${outstanding.toLocaleString()}` : "Cleared", sub: outstanding > 0 ? "outstanding" : "No balance", icon: CreditCard, color: outstanding > 0 ? "text-rose-400" : "text-emerald-400" },
                                    { label: "Notices", value: announcements.length, sub: "from school", icon: Bell, color: "text-purple-400" },
                                ].map(s => (
                                    <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center">
                                                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                                            </div>
                                        </div>
                                        <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{s.label}</p>
                                        <p className="text-[8px] text-slate-600 font-bold mt-0.5">{s.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Latest exam result */}
                            {examResults[0] && (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Award className="w-3.5 h-3.5 text-amber-400" /> Latest Exam Result
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-black">{examResults[0].examName}</p>
                                            <p className="text-slate-500 text-[9px] font-bold uppercase mt-0.5">{examResults[0].term} · {examResults[0].subjects?.length || 0} subjects</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-2xl font-black ${gradeColor(examResults[0].average)}`}>{examResults[0].average.toFixed(1)}%</p>
                                            <p className={`text-sm font-black ${gradeColor(examResults[0].average)}`}>{grade(examResults[0].average)}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setTab("exams")} className="w-full mt-3 text-[9px] text-indigo-400 font-black uppercase tracking-widest text-center hover:text-indigo-300 flex items-center justify-center gap-1">
                                        View all exams <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Latest notice */}
                            {announcements[0] && (
                                <div className={`rounded-3xl p-4 border ${announcements[0].priority === "Urgent" ? "bg-rose-900/30 border-rose-500/30" : "bg-white/5 border-white/10"}`}>
                                    <div className="flex items-start gap-3">
                                        <Megaphone className={`w-4 h-4 flex-shrink-0 mt-0.5 ${announcements[0].priority === "Urgent" ? "text-rose-400" : "text-purple-400"}`} />
                                        <div>
                                            <p className="text-white font-black text-sm">{announcements[0].title}</p>
                                            <p className="text-slate-400 text-[10px] font-medium mt-0.5 line-clamp-2">{announcements[0].message}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Pending assignments */}
                            {assignments.filter((a: any) => a.status === "Published" && a.dueDate).length > 0 && (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-amber-400" /> Upcoming Assignments
                                    </p>
                                    {assignments.filter((a: any) => a.status === "Published" && a.dueDate).slice(0, 3).map((a: any) => {
                                        const ov = new Date(a.dueDate) < new Date();
                                        return (
                                            <div key={a._id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ov ? "bg-rose-500" : "bg-amber-400"}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-black text-xs truncate">{a.title}</p>
                                                    <p className="text-slate-500 text-[8px] font-bold">{a.subjectName} · {a.totalMarks} marks</p>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase ${ov ? "text-rose-400" : "text-amber-400"}`}>{a.dueDate}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ════════════ EXAMS ════════════ */}
                    {tab === "exams" && (
                        <>
                            <div className="flex items-center justify-between">
                                <h2 className="text-white font-black text-lg uppercase tracking-tight">Exam Results</h2>
                                <span className="text-[9px] text-slate-400 font-black uppercase">{examResults.length} exams</span>
                            </div>

                            {loadExams ? (
                                <div className="flex items-center justify-center h-32 gap-2 text-slate-400 text-xs font-bold uppercase">
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> Loading...
                                </div>
                            ) : examResults.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                                    <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 text-xs font-black uppercase">No exam results yet</p>
                                </div>
                            ) : examResults.map((exam: any) => {
                                const isExpanded = expandedExam === exam.examId;
                                return (
                                    <div key={exam.examId} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                                        {/* Exam header */}
                                        <button className="w-full flex items-center justify-between p-5"
                                            onClick={() => setExpandedExam(isExpanded ? null : exam.examId)}>
                                            <div className="flex items-center gap-3 text-left">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm ${exam.average >= 70 ? "bg-emerald-900/50 text-emerald-400" : exam.average >= 50 ? "bg-amber-900/50 text-amber-400" : "bg-rose-900/50 text-rose-400"}`}>
                                                    {grade(exam.average)}
                                                </div>
                                                <div>
                                                    <p className="text-white font-black text-sm">{exam.examName}</p>
                                                    <p className="text-slate-500 text-[9px] font-bold uppercase">{exam.term}{exam.academicYear ? ` · ${exam.academicYear}` : ""} · {exam.subjects?.length || 0} subjects</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-xl font-black ${gradeColor(exam.average)}`}>{exam.average.toFixed(1)}%</p>
                                                <p className="text-slate-600 text-[9px] font-bold">{exam.totalMarks}/{exam.totalOutOf}</p>
                                            </div>
                                        </button>

                                        {/* Subject breakdown */}
                                        {isExpanded && exam.subjects?.length > 0 && (
                                            <div className="border-t border-white/10 px-5 py-4 space-y-3">
                                                {exam.subjects.map((sub: any, i: number) => {
                                                    const pct = sub.outOf > 0 ? (sub.marks / sub.outOf) * 100 : 0;
                                                    return (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-white text-[11px] font-black truncate">{sub.name}</p>
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <span className="text-[10px] font-black text-slate-300">{sub.marks}/{sub.outOf}</span>
                                                                        <span className={`text-[10px] font-black ${gradeColor(pct)}`}>{grade(pct)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
                                                                        style={{ width: `${Math.min(pct, 100)}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {/* Exam total bar */}
                                                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                                                    <span className="text-[9px] text-slate-400 font-black uppercase">Total</span>
                                                    <span className={`text-sm font-black ${gradeColor(exam.average)}`}>{exam.totalMarks}/{exam.totalOutOf} · {exam.average.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* ════════════ FEES ════════════ */}
                    {tab === "fees" && (
                        <>
                            <h2 className="text-white font-black text-lg uppercase tracking-tight">Fee Account</h2>

                            {/* Summary cards */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Total Billed", value: `KSh ${totalInvoiced.toLocaleString()}`, color: "text-indigo-400" },
                                    { label: "Total Paid", value: `KSh ${totalPaid.toLocaleString()}`, color: "text-emerald-400" },
                                    { label: "Balance", value: `KSh ${outstanding.toLocaleString()}`, color: outstanding > 0 ? "text-rose-400" : "text-emerald-400" },
                                ].map(s => (
                                    <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                                        <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                                        <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {loadFees ? (
                                <div className="flex items-center justify-center h-32 gap-2 text-slate-400 text-xs font-bold uppercase">
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> Loading invoices...
                                </div>
                            ) : invoices.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                                    <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 text-xs font-black uppercase">No fee invoices found</p>
                                    <p className="text-slate-600 text-[9px] font-bold mt-1">Contact your school office for your fee statements</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {invoices.map((inv: any) => {
                                        const bal = Number(inv.balance || inv.outstanding || 0);
                                        const paid = Number(inv.paid_amount || inv.amount_paid || 0);
                                        const total = Number(inv.total_due || inv.amount || 0);
                                        const isPaid = bal <= 0 || inv.status === "PAID" || inv.status === "paid";
                                        return (
                                            <div key={inv._id} className={`rounded-3xl p-5 border ${isPaid ? "bg-emerald-900/20 border-emerald-500/20" : "bg-rose-950/30 border-rose-500/20"}`}>
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div>
                                                        <p className="text-white font-black text-sm">{inv.invoice_no || inv.invoiceNo || `INV-${inv._id?.slice(-6)}`}</p>
                                                        <p className="text-slate-500 text-[9px] font-bold uppercase mt-0.5">{inv.term || inv.period || "—"} · {inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-GB") : inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-GB") : "—"}</p>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase flex-shrink-0 ${isPaid ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                                                        {isPaid ? "✓ Paid" : "Unpaid"}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                                    {[{ l: "Billed", v: `KSh ${total.toLocaleString()}` }, { l: "Paid", v: `KSh ${paid.toLocaleString()}` }, { l: "Balance", v: `KSh ${Math.max(0, bal).toLocaleString()}` }].map(f => (
                                                        <div key={f.l} className="bg-white/5 rounded-2xl py-2">
                                                            <p className="text-[8px] text-slate-500 font-black uppercase">{f.l}</p>
                                                            <p className={`text-xs font-black mt-0.5 ${f.l === "Balance" && !isPaid && bal > 0 ? "text-rose-300" : "text-white"}`}>{f.v}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {!isPaid && bal > 0 && (
                                                    <button onClick={() => openPayModal(inv)}
                                                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-green-900/40 active:scale-[0.98]">
                                                        <Smartphone className="w-4 h-4" />
                                                        Pay KSh {bal.toLocaleString()} Now
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ════════════ REPORTS ════════════ */}
                    {tab === "reports" && (
                        <>
                            <h2 className="text-white font-black text-lg uppercase tracking-tight">Performance Report</h2>

                            {examResults.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                                    <BarChart2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 text-xs font-black uppercase">No exam data yet</p>
                                </div>
                            ) : (
                                <>
                                    {/* Overall grade card */}
                                    <div className="rounded-3xl p-5 text-center" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}>
                                        <p className="text-4xl font-black text-white">{overallAvg.toFixed(1)}%</p>
                                        <p className="text-5xl font-black mt-1" style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>{grade(overallAvg)}</p>
                                        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mt-2">Overall Average across {examResults.length} exams</p>
                                    </div>

                                    {/* Trend line chart */}
                                    {trendData.length >= 2 && (
                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Performance Trend
                                            </p>
                                            <ResponsiveContainer width="100%" height={180}>
                                                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                    <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        formatter={(v: any) => [`${v}%`, "Average"]}
                                                        contentStyle={{ background: "#1e1b4b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "11px", fontWeight: 700, color: "white" }}
                                                    />
                                                    <Line type="monotone" dataKey="Average" stroke="#818cf8" strokeWidth={2.5}
                                                        dot={{ fill: "#818cf8", r: 4, strokeWidth: 2, stroke: "#0f0c29" }}
                                                        activeDot={{ r: 6 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {/* Exam by exam summary */}
                                    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                                        <div className="px-5 py-4 border-b border-white/10">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exam Summary</p>
                                        </div>
                                        {examResults.map((e: any, i: number) => (
                                            <div key={e.examId} className={`flex items-center gap-3 px-5 py-3.5 ${i < examResults.length - 1 ? "border-b border-white/5" : ""}`}>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-black text-xs truncate">{e.examName}</p>
                                                    <p className="text-slate-500 text-[8px] font-bold uppercase">{e.term}</p>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${e.average >= 70 ? "bg-emerald-400" : e.average >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
                                                            style={{ width: `${Math.min(e.average, 100)}%` }} />
                                                    </div>
                                                    <span className={`text-sm font-black w-10 text-right ${gradeColor(e.average)}`}>{e.average.toFixed(0)}%</span>
                                                    <span className={`text-xs font-black w-5 ${gradeColor(e.average)}`}>{grade(e.average)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* ════════════ NOTICES ════════════ */}
                    {tab === "notices" && (
                        <>
                            <h2 className="text-white font-black text-lg uppercase tracking-tight">School Notices</h2>

                            {/* Assignments */}
                            {assignments.length > 0 && (
                                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                                    <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4 text-amber-400" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assignments ({assignments.length})</p>
                                    </div>
                                    {assignments.map((a: any, i: number) => {
                                        const ov = a.dueDate && new Date(a.dueDate) < new Date();
                                        return (
                                            <div key={a._id} className={`px-5 py-4 ${i < assignments.length - 1 ? "border-b border-white/5" : ""}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-black text-sm truncate">{a.title}</p>
                                                        <p className="text-slate-500 text-[9px] font-bold uppercase mt-0.5">
                                                            {a.subjectName || "—"} · {a.type || "Assignment"} · {a.totalMarks || 100} marks
                                                        </p>
                                                        {a.instructions && <p className="text-slate-400 text-[10px] font-medium mt-1 line-clamp-2">{a.instructions}</p>}
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase flex-shrink-0 ${ov ? "bg-rose-900/50 text-rose-400 border border-rose-500/20" : "bg-amber-900/50 text-amber-400 border border-amber-500/20"}`}>
                                                        {a.dueDate || "Open"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Announcements */}
                            {announcements.length === 0 && assignments.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                                    <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 text-xs font-black uppercase">No notices yet</p>
                                </div>
                            ) : announcements.map((ann: any) => (
                                <div key={ann._id} className={`rounded-3xl p-5 border ${ann.priority === "Urgent" ? "bg-rose-900/20 border-rose-500/20" : ann.isPinned ? "bg-indigo-900/20 border-indigo-500/20" : "bg-white/5 border-white/10"}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ann.priority === "Urgent" ? "bg-rose-900/50" : "bg-white/5"}`}>
                                            <Megaphone className={`w-4 h-4 ${ann.priority === "Urgent" ? "text-rose-400" : "text-purple-400"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${ann.priority === "Urgent" ? "bg-rose-500 text-white" : ann.priority === "Important" ? "bg-amber-500 text-white" : "bg-white/10 text-slate-400"}`}>
                                                    {ann.priority || "Notice"}
                                                </span>
                                                {ann.isPinned && <span className="text-[8px] text-indigo-400 font-black">📌</span>}
                                            </div>
                                            <p className="text-white font-black text-sm">{ann.title}</p>
                                            <p className="text-slate-400 text-[10px] font-medium mt-1 leading-relaxed">{ann.message}</p>
                                            <p className="text-slate-600 text-[8px] font-bold uppercase tracking-widest mt-2">{new Date(ann.createdAt).toLocaleDateString("en-GB")}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* ── Bottom Navigation — mobile only, sidebar on desktop ─── */}
            {/* Mobile bottom bar */}
            <div className="md:hidden fixed bottom-0 inset-x-0 z-30" style={{ background: "rgba(15,12,41,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
                    {NAV.map(n => {
                        const isActive = tab === n.key;
                        return (
                            <button key={n.key} onClick={() => setTab(n.key)}
                                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all relative ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}>
                                {n.badge ? (
                                    <div className="relative">
                                        <n.icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">
                                            {n.badge > 9 ? "9+" : n.badge}
                                        </span>
                                    </div>
                                ) : (
                                    <n.icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                                )}
                                <span className={`text-[8px] font-black uppercase tracking-wide ${isActive ? "text-indigo-300" : "text-slate-600"}`}>{n.label}</span>
                                {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-indigo-400" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Payment Modal ─────────────────────────────────────────────── */}
            {payingInvoice && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-[#1a1035] border border-white/10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

                        {/* Green top bar */}
                        <div className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-500" />

                        {paySuccess ? (
                            /* Success state */
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-900/50">
                                    <Check className="w-9 h-9 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-white mb-1">Payment Submitted!</h3>
                                <p className="text-slate-400 text-xs font-bold mb-1">Your payment has been recorded</p>
                                <p className="text-slate-500 text-[10px] font-bold mb-6">It will be verified by the school office within 24 hours.</p>
                                <button onClick={() => { setPayingInvoice(null); setPaySuccess(false); }}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all">
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h3 className="text-lg font-black text-white">Pay Invoice</h3>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase mt-0.5">{payingInvoice.invoice_no || payingInvoice.invoiceNo || "Invoice"}</p>
                                    </div>
                                    <button onClick={() => setPayingInvoice(null)} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Amount due */}
                                <div className="bg-rose-900/30 border border-rose-500/20 rounded-2xl p-4 text-center mb-5">
                                    <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest mb-0.5">Amount Due</p>
                                    <p className="text-3xl font-black text-white">KSh {Number(payingInvoice.balance || payingInvoice.outstanding || 0).toLocaleString()}</p>
                                </div>

                                {/* Payment method */}
                                <div className="grid grid-cols-3 gap-2 mb-5">
                                    {[
                                        { key: "MPESA", label: "M-PESA", icon: "📱" },
                                        { key: "BANK", label: "Bank", icon: "🏦" },
                                        { key: "CASH", label: "Cash", icon: "💵" },
                                    ].map(m => (
                                        <button key={m.key} onClick={() => setPayMethod(m.key)}
                                            className={`py-3 rounded-2xl border text-xs font-black uppercase tracking-wide transition-all flex flex-col items-center gap-1 ${payMethod === m.key ? "bg-green-500 border-green-400 text-white shadow-lg shadow-green-900/30" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}`}>
                                            <span className="text-lg">{m.icon}</span>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>

                                {/* M-PESA instructions */}
                                {payMethod === "MPESA" && (
                                    <div className="bg-green-900/30 border border-green-500/20 rounded-2xl p-4 mb-4 text-[10px] text-green-300 font-bold space-y-1">
                                        <p className="font-black text-green-200 uppercase tracking-widest text-[9px]">How to Pay via M-PESA</p>
                                        <p>1. Go to M-PESA on your phone</p>
                                        <p>2. Select <strong>Pay Bill</strong></p>
                                        <p>3. Business No: <strong className="text-white">123456</strong> (your school's paybill)</p>
                                        <p>4. Account No: <strong className="text-white">{student?.registrationNo || "Your Admission No"}</strong></p>
                                        <p>5. Amount: <strong className="text-white">KSh {Number(payingInvoice.balance || 0).toLocaleString()}</strong></p>
                                        <p>6. Enter your M-PESA PIN and confirm</p>
                                    </div>
                                )}

                                {/* Amount field */}
                                <div className="relative mb-4">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Amount Paying (KSh)</div>
                                    <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                        className="w-full h-11 px-4 bg-white/10 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-green-400 transition-all" />
                                </div>

                                {/* Phone (for M-PESA) */}
                                {payMethod === "MPESA" && (
                                    <div className="relative mb-4">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">M-PESA Phone Number</div>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input type="tel" value={payPhone} onChange={e => setPayPhone(e.target.value)} placeholder="e.g. 0712345678"
                                                className="w-full h-11 pl-11 pr-4 bg-white/10 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-green-400 transition-all placeholder-slate-600" />
                                        </div>
                                    </div>
                                )}

                                {/* Transaction reference */}
                                <div className="relative mb-5">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Transaction Code / Reference (after paying)</div>
                                    <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. RGH2XXXXX"
                                        className="w-full h-11 px-4 bg-white/10 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-green-400 transition-all placeholder-slate-600" />
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={() => {
                                        if (!payAmount || Number(payAmount) <= 0) { return; }
                                        payMutation.mutate({
                                            invoiceId: payingInvoice._id,
                                            invoiceNo: payingInvoice.invoice_no || payingInvoice.invoiceNo,
                                            amount: Number(payAmount),
                                            method: payMethod,
                                            reference: payRef,
                                            phone: payPhone,
                                            notes: `Student self-payment via ${payMethod}`,
                                        });
                                    }}
                                    disabled={payMutation.isPending || !payAmount}
                                    className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-green-900/40 active:scale-[0.98]"
                                >
                                    {payMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                                    {payMutation.isPending ? "Processing..." : `Submit Payment — KSh ${Number(payAmount || 0).toLocaleString()}`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Desktop sidebar nav */}
            <div className="hidden md:flex fixed left-0 top-14 bottom-0 w-52 z-30 flex-col py-4 px-3 space-y-1" style={{ background: "rgba(15,12,41,0.9)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-2">Navigation</p>
                {NAV.map(n => {
                    const isActive = tab === n.key;
                    return (
                        <button key={n.key} onClick={() => setTab(n.key)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all w-full text-left relative ${isActive ? "bg-white/10 border border-indigo-500/30" : "hover:bg-white/5 border border-transparent"}`}>
                            <div className="relative flex-shrink-0">
                                <n.icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                                {n.badge ? <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">{n.badge > 9 ? "9+" : n.badge}</span> : null}
                            </div>
                            <span className={`text-xs font-black uppercase tracking-wide ${isActive ? "text-indigo-200" : "text-slate-500"}`}>{n.label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                        </button>
                    );
                })}
                <div className="mt-auto pt-4 border-t border-white/10">
                    <div className="px-3">
                        <p className="text-white font-black text-xs truncate">{student.name}</p>
                        <p className="text-slate-500 text-[9px] font-bold uppercase mt-0.5">{student.class}</p>
                        <p className="text-slate-600 text-[8px] font-bold mt-0.5">ID: {student.registrationNo}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
