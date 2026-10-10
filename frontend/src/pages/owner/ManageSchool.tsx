import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Users, Briefcase, Database, Power, LogIn, Loader2, Check, Layers,
    Mail, MessageCircle, Send, Pencil, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";
import SchoolAppsCard from "@/components/owner/SchoolAppsCard";
import SchoolPricingCard from "@/components/owner/SchoolPricingCard";

const PRIMARY = "#534AB7";
const ksh = (n: any) => `KES ${Number(n || 0).toLocaleString()}`;

// Restrictable modules (what a school may access). Matches sidebar module keys.
const MODULES: { key: string; label: string }[] = [
    { key: "library", label: "Library" }, { key: "hostel", label: "Hostel" },
    { key: "transport", label: "Transport" }, { key: "pos", label: "Point of Sale" },
    { key: "live_class", label: "Live Class & LMS" }, { key: "communications", label: "Communications" },
    { key: "fees", label: "Fees" }, { key: "accounts", label: "Accounts" }, { key: "salary", label: "Salary" },
    { key: "exams", label: "Exams" }, { key: "timetable", label: "Timetable" }, { key: "calendar", label: "Calendar" }, { key: "attendance", label: "Attendance" },
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

    // ── Edit details + convert to organization ───────────────────────────────
    const [showEdit, setShowEdit] = useState(false);
    const [edit, setEdit] = useState<any>({});
    useEffect(() => { if (school) setEdit({ name: school.name, email: school.email, phone: school.phone, subdomain: school.subdomain }); }, [school]);
    const saveDetails = useMutation({
        mutationFn: async () => api.patch(`/owner/schools/${id}`, edit),
        onSuccess: () => { toast.success("School details updated"); setShowEdit(false); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const [confirmOrg, setConfirmOrg] = useState(false);
    const makeOrg = useMutation({
        mutationFn: async () => (await api.post(`/owner/organizations/wrap-tenant/${id}`, {})).data,
        onSuccess: (d: any) => { setConfirmOrg(false); toast.success(d.reusedSchoolLogin ? "Organization created — the school admin is now the org owner (same login)." : "Organization created."); invalidate(); },
        onError: (e: any) => { setConfirmOrg(false); toast.error(e.response?.data?.message || "Failed"); },
    });
    const resetPw = useMutation({
        mutationFn: async (password?: string) => (await api.post(`/owner/schools/${id}/reset-password`, { password, email: true })).data,
        onSuccess: (d: any) => { toast.success(`New password: ${d.password}${d.emailed ? ` · emailed to ${d.sentTo}` : " (email not sent)"}`, { duration: 12000 }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

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
        <div className="min-h-screen bg-slate-50 p-6 relative">
            {/* Subtle school-admin themed backdrop */}
            <div
                className="pointer-events-none fixed inset-0 z-0 bg-no-repeat bg-right-bottom opacity-[0.06]"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=900&q=60')", backgroundSize: "min(40vw, 520px)" }}
            />
            <div className="max-w-5xl mx-auto space-y-6 relative z-10">
                <button onClick={() => navigate("/owner/dashboard")} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back to Schools</button>

                {/* Header */}
                <div className="bg-white rounded-xl p-5 flex items-center justify-between flex-wrap gap-4" style={{ border: "0.5px solid #e5e7eb" }}>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">{school.name}</h1>
                        <p className="text-xs text-slate-500 font-mono">{school.subdomain}.shulecloud.com · {school.email || "no email"}</p>
                        {school.shulecloudId && <p className="text-xs font-bold text-slate-700">School ID: <span className="font-mono">{school.shulecloudId}</span></p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${suspended ? "bg-rose-100 text-rose-700" : school.status === "trial" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{school.status}</span>
                        <button onClick={() => setStatus.mutate(suspended ? "active" : "suspended")} disabled={setStatus.isPending}
                            className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white ${suspended ? "bg-emerald-500" : "bg-rose-500"}`}>
                            <Power className="w-3.5 h-3.5" /> {suspended ? "Activate" : "Suspend"}
                        </button>
                        <button onClick={() => setShowEdit(true)} className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => { const p = prompt("New password (leave blank to auto-generate):"); if (p !== null) resetPw.mutate(p || undefined); }} disabled={resetPw.isPending}
                            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50">
                            {resetPw.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />} Reset Password
                        </button>
                        <button onClick={() => impersonate.mutate()} disabled={impersonate.isPending}
                            className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white" style={{ background: PRIMARY }}>
                            {impersonate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />} Login as Admin
                        </button>
                    </div>
                </div>

                {/* Organization */}
                <div className="bg-white rounded-xl p-5 flex items-center justify-between flex-wrap gap-3" style={{ border: "0.5px solid #e5e7eb" }}>
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5" style={{ color: PRIMARY }} />
                        <div>
                            <p className="font-black text-slate-800 text-sm">{school.organizationId ? "Part of an organization" : "Multi-branch organization"}</p>
                            <p className="text-xs text-slate-500">{school.organizationId ? "This school belongs to an organization (its admin can manage branches)." : "Turn this school into an organization. Its admin becomes the organization owner (same login) and can add branches."}</p>
                        </div>
                    </div>
                    {!school.organizationId && (
                        <button onClick={() => setConfirmOrg(true)} disabled={makeOrg.isPending} className="h-9 px-4 rounded-lg text-xs font-black flex items-center gap-1.5 text-white" style={{ background: PRIMARY }}>
                            {makeOrg.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />} Make Organization
                        </button>
                    )}
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
                            {(school.allPlans || []).map((p: any) => <option key={p._id} value={p._id}>{p.name} ({ksh(p.price)}{p.per || "/mo"})</option>)}
                        </select>
                        {school.plan && <span className="text-xs text-slate-500">Current: <b>{school.plan.name}</b> · {ksh(school.plan.price)}{school.plan.per || "/mo"}{school.plan.listPrice !== undefined && Number(school.plan.listPrice) !== Number(school.plan.price) ? <span className="text-emerald-600 font-bold"> (standard {ksh(school.plan.listPrice)})</span> : null} · {school.plan.maxStudents ?? "∞"} students</span>}
                    </div>
                </div>

                {/* This school's own prices + discount */}
                <SchoolPricingCard schoolId={String(id)} plans={school.allPlans || []} pricing={school.pricing} currentPlanId={school.plan?._id} />

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

                {/* Apps switched off for this school */}
                <SchoolAppsCard schoolId={String(id)} disabledApps={school.disabledApps || []} color={PRIMARY} />

                {/* Module access toggles */}
                <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                    <div className="flex items-center justify-between mb-3">
                        <div><h3 className="text-sm font-black text-slate-800">Plan modules</h3><p className="text-[11px] text-slate-400">Modules in this school’s plan — the rest show locked with an upgrade message</p></div>
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

            {/* Make Organization confirmation */}
            {confirmOrg && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmOrg(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `${PRIMARY}1a`, color: PRIMARY }}><Layers className="w-6 h-6" /></div>
                            <h2 className="font-black text-slate-800 text-lg">Make “{school.name}” an organization?</h2>
                            <ul className="text-sm text-slate-600 mt-2 space-y-1.5 list-disc list-inside">
                                <li>This school becomes the <b>first branch</b>. Nothing is moved or deleted.</li>
                                <li>Its admin (<b>{school.email || "school admin"}</b>) becomes the <b>organization owner</b>, using the <b>same login</b>.</li>
                                <li>You can then add more branches under this organization.</li>
                            </ul>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
                            <button onClick={() => setConfirmOrg(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                            <button onClick={() => makeOrg.mutate()} disabled={makeOrg.isPending} className="h-10 px-5 rounded-xl text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50" style={{ background: PRIMARY }}>
                                {makeOrg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />} Yes, make organization
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit details modal */}
            {showEdit && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-black text-slate-800">Edit School Details</h2></div>
                        <div className="p-5 space-y-3">
                            {[
                                ["School Name", "name", "text"], ["Email", "email", "email"],
                                ["Phone", "phone", "tel"], ["Subdomain", "subdomain", "text"],
                            ].map(([label, key, type]) => (
                                <div key={key}>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">{label}</label>
                                    <input type={type} value={edit[key] || ""} onChange={(e) => setEdit({ ...edit, [key]: key === "subdomain" ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") : e.target.value })}
                                        className={`w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#534AB7] ${key === "subdomain" ? "font-mono" : ""}`} />
                                    {key === "subdomain" && <p className="text-[10px] text-amber-600 mt-1">Changing the subdomain changes the school's login URL. The database is preserved.</p>}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
                            <button onClick={() => setShowEdit(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                            <button onClick={() => saveDetails.mutate()} disabled={saveDetails.isPending} className="h-10 px-5 rounded-xl text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50" style={{ background: PRIMARY }}>
                                {saveDetails.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
