import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Users, Briefcase, Database, Power, LogIn, Loader2, Check, Layers,
    Mail, MessageCircle, Send,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";

const PRIMARY = "#534AB7";
const ksh = (n: any) => `KES ${Number(n || 0).toLocaleString()}`;

// Restrictable modules (what a school may access). Matches sidebar module keys.
const MODULES: { key: string; label: string }[] = [
    { key: "library", label: "Library" }, { key: "hostel", label: "Hostel" },
    { key: "transport", label: "Transport" }, { key: "pos", label: "Point of Sale" },
    { key: "live_class", label: "Live Class & LMS" }, { key: "communications", label: "Communications" },
    { key: "fees", label: "Fees" }, { key: "accounts", label: "Accounts" }, { key: "salary", label: "Salary" },
    { key: "exams", label: "Exams" }, { key: "timetable", label: "Timetable" }, { key: "attendance", label: "Attendance" },
    { key: "cafeteria", label: "Cafeteria" }, { key: "sports", label: "Sports" }, { key: "trips", label: "Trips" },
    { key: "frontdesk", label: "Front Desk" }, { key: "secretary", label: "Secretary" }, { key: "certificates", label: "Certificates" },
    { key: "reports", label: "Reports" },
    { key: "academic_system", label: "Academic System" }, { key: "academics_content", label: "Academic Content" },
    { key: "behaviour", label: "Behaviour & Skills" }, { key: "question_paper", label: "Question Paper" },
    { key: "integrations", label: "Integrations" }, { key: "custom_domain", label: "Custom Domain & Branding" },
    { key: "nemis", label: "NEMIS Assistant" }, { key: "expenses", label: "Expense Management" }, { key: "cbc", label: "CBC Assessment" }, { key: "procurement", label: "Procurement" }, { key: "accounting", label: "Accounting (GL)" },
];

export default function ManageSchool() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [modules, setModules] = useState<string[]>([]);

    const { data: school, isLoading } = useQuery({
        queryKey: ["school_detail", id],
        queryFn: async () => (await api.get(`/owner/schools/${id}`)).data,
    });
    useEffect(() => { if (school?.enabledModules) setModules(school.enabledModules); }, [school]);

    const invalidate = () => qc.invalidateQueries({ queryKey: ["school_detail", id] });

    const assignPlan = useMutation({
        mutationFn: async (planId: string) => api.post(`/owner/schools/${id}/plan`, { planId }),
        onSuccess: () => { toast.success("Plan assigned"); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const setStatus = useMutation({
        mutationFn: async (status: string) => api.post(`/owner/schools/${id}/status`, { status }),
        onSuccess: () => { toast.success("Status updated"); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const saveModules = useMutation({
        mutationFn: async () => api.post(`/owner/schools/${id}/modules`, { modules }),
        onSuccess: () => { toast.success("Module access saved"); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const impersonate = useMutation({
        mutationFn: async () => api.post(`/owner/schools/${id}/impersonate`, {}),
        onSuccess: (res: any) => {
            const { access_token, subdomain } = res.data || {};
            if (!access_token) return toast.error("Could not impersonate");
            // Open the school's app on ITS subdomain. localStorage is per-origin,
            // so we pass the token in the URL — the tenant app reads & stores it.
            const host = window.location.hostname;
            const root = host.endsWith(".localhost") || host === "localhost" ? "localhost" : host.split(".").slice(-2).join(".");
            const port = window.location.port ? `:${window.location.port}` : "";
            const url = `${window.location.protocol}//${subdomain}.${root}${port}/login?impersonate_token=${encodeURIComponent(access_token)}`;
            window.open(url, "_blank");
            toast.success(`Opening ${subdomain} as admin…`);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const toggle = (k: string) => setModules((m) => m.includes(k) ? m.filter((x) => x !== k) : [...m, k]);

    // ── Message the school directly (email / WhatsApp / both) ────────────────
    const [msgChannel, setMsgChannel] = useState<"both" | "email" | "whatsapp">("email");
    const [msgSubject, setMsgSubject] = useState("");
    const [msgBody, setMsgBody] = useState("");
    const messageSchool = useMutation({
        mutationFn: async () => api.post(`/owner/schools/${id}/message`, { channel: msgChannel, subject: msgSubject, message: msgBody }),
        onSuccess: (res: any) => {
            const d = res.data?.delivery;
            const via = d ? [d.email && "email", d.whatsapp && "WhatsApp"].filter(Boolean).join(" & ") : "";
            toast.success(via ? `Sent via ${via}` : "Message sent");
            setMsgSubject(""); setMsgBody("");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to send", { duration: 7000 }),
    });

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
    if (!school) return <div className="p-8 text-center text-slate-400">School not found.</div>;

    const suspended = school.status === "suspended";

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <button onClick={() => navigate("/owner/dashboard")} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back to Schools</button>

                {/* Header */}
                <div className="bg-white rounded-xl p-5 flex items-center justify-between flex-wrap gap-4" style={{ border: "0.5px solid #e5e7eb" }}>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">{school.name}</h1>
                        <p className="text-xs text-slate-500 font-mono">{school.subdomain}.shulecloud.com · {school.email || "no email"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${suspended ? "bg-rose-100 text-rose-700" : school.status === "trial" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{school.status}</span>
                        <button onClick={() => setStatus.mutate(suspended ? "active" : "suspended")} disabled={setStatus.isPending}
                            className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white ${suspended ? "bg-emerald-500" : "bg-rose-500"}`}>
                            <Power className="w-3.5 h-3.5" /> {suspended ? "Activate" : "Suspend"}
                        </button>
                        <button onClick={() => impersonate.mutate()} disabled={impersonate.isPending}
                            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white" style={{ background: PRIMARY }}>
                            {impersonate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />} Login as Admin
                        </button>
                    </div>
                </div>

                {/* Counts + DB usage */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Students", value: school.counts?.students ?? 0, icon: Users, sub: school.plan?.maxStudents ? `of ${school.plan.maxStudents} max` : "unlimited" },
                        { label: "Staff", value: school.counts?.staff ?? 0, icon: Briefcase, sub: "active" },
                        { label: "DB Usage", value: `${school.dbUsage?.sizeMB ?? 0} MB`, icon: Database, sub: `${school.dbUsage?.collections ?? 0} collections` },
                        { label: "Modules", value: modules.length, icon: Layers, sub: "enabled" },
                    ].map((t) => (
                        <div key={t.label} className="bg-white rounded-xl p-4" style={{ border: "0.5px solid #e5e7eb" }}>
                            <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t.label}</span><t.icon className="w-4 h-4" style={{ color: PRIMARY }} /></div>
                            <div className="text-2xl font-black text-slate-800 mt-1">{t.value}</div>
                            <div className="text-[10px] text-slate-400">{t.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Plan assignment */}
                <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                    <h3 className="text-sm font-black text-slate-800 mb-3">Subscription Plan</h3>
                    <div className="flex items-center gap-3 flex-wrap">
                        <select value={school.plan?._id || ""} onChange={(e) => assignPlan.mutate(e.target.value)}
                            className="h-10 px-3 rounded-lg text-sm font-bold text-slate-700 min-w-[200px]" style={{ border: "0.5px solid #e5e7eb" }}>
                            <option value="">— No plan —</option>
                            {(school.allPlans || []).map((p: any) => <option key={p._id} value={p._id}>{p.name} ({ksh(p.price)}/mo)</option>)}
                        </select>
                        {school.plan && <span className="text-xs text-slate-500">Current: <b>{school.plan.name}</b> · {ksh(school.plan.price)}/mo · {school.plan.maxStudents ?? "∞"} students</span>}
                    </div>
                </div>

                {/* Message the school directly */}
                <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                    <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="w-4 h-4" style={{ color: PRIMARY }} />
                        <h3 className="text-sm font-black text-slate-800">Message This School</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">
                        Email: <b>{school.email || "none on file"}</b> · WhatsApp: <b>{school.phone || "none on file"}</b>
                    </p>
                    <div className="flex gap-2 mb-3">
                        {([["email", "Email", Mail], ["whatsapp", "WhatsApp", MessageCircle], ["both", "Both", Send]] as const).map(([k, label, Icon]) => (
                            <button key={k} onClick={() => setMsgChannel(k)}
                                className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 ${msgChannel === k ? "text-white" : "text-slate-600"}`}
                                style={msgChannel === k ? { background: PRIMARY } : { border: "0.5px solid #e5e7eb" }}>
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </button>
                        ))}
                    </div>
                    {msgChannel !== "whatsapp" && (
                        <input value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} placeholder="Subject (email)"
                            className="w-full h-10 px-3 rounded-lg text-sm mb-2 focus:outline-none" style={{ border: "0.5px solid #e5e7eb" }} />
                    )}
                    <textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="Type your message to the school…" rows={4}
                        className="w-full px-3 py-2 rounded-lg text-sm mb-3 focus:outline-none" style={{ border: "0.5px solid #e5e7eb" }} />
                    <button onClick={() => { if (!msgBody.trim()) return toast.error("Write a message"); messageSchool.mutate(); }}
                        disabled={messageSchool.isPending}
                        className="h-10 px-5 text-white rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>
                        {messageSchool.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Message
                    </button>
                </div>

                {/* Module access toggles */}
                <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                    <div className="flex items-center justify-between mb-3">
                        <div><h3 className="text-sm font-black text-slate-800">Module Access</h3><p className="text-[11px] text-slate-400">Restrict which modules this school can use</p></div>
                        <button onClick={() => saveModules.mutate()} disabled={saveModules.isPending} className="h-9 px-4 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: PRIMARY }}>{saveModules.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {MODULES.map((m) => {
                            const on = modules.includes(m.key);
                            return <button key={m.key} onClick={() => toggle(m.key)} className={`text-xs font-bold px-3 py-1.5 rounded-full border ${on ? "text-white" : "bg-white text-slate-600 border-slate-200"}`} style={on ? { background: PRIMARY, borderColor: PRIMARY } : {}}>{on && <Check className="w-3 h-3 inline mr-1" />}{m.label}</button>;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
