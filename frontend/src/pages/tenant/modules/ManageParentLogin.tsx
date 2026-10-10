import { useState } from "react";
import {
    Home, Eye, EyeOff, Save, RefreshCcw, Key, Search,
    ExternalLink, Loader2, Users, Copy, CheckCircle2, Phone, Lock
} from "lucide-react";
import UsernameInput from "@/components/UsernameInput";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── Credential generators ─────────────────────────────────────────────────────
function generateParentUsername(student: any): string {
    const phone = student.parentPhone || student.phone || "";
    if (phone) return phone.replace(/\s+/g, "");
    return `P-${student.registrationNo || student._id?.slice(-6) || "000"}`;
}

function generateParentPassword(student: any): string {
    const phone = student.parentPhone || student.phone || "0000";
    const last4 = phone.slice(-4);
    return `parent@${last4}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ManageParentLogin() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const [editValues, setEditValues] = useState<Record<string, { username: string; password: string }>>({});
    const [copied, setCopied] = useState<string | null>(null);

    const { data: students = [], isLoading } = useQuery({
        queryKey: ["students"],
        queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; },
    });

    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return Array.isArray(r.data) ? r.data : []; },
    });

    // Only show students that have parent info
    const studentsWithParents = students.filter((s: any) =>
        s.parentPhone || s.phone || s.fatherName || s.motherName || s.parentName || s.guardianName
    );

    const filtered = studentsWithParents.filter((s: any) => {
        const name = (s.studentName || `${s.firstName || ""} ${s.lastName || ""}`).toLowerCase();
        const parent = (s.fatherName || s.motherName || s.parentName || s.guardianName || "").toLowerCase();
        const mQ = !search || name.includes(search.toLowerCase()) || parent.includes(search.toLowerCase()) || (s.registrationNo || "").toLowerCase().includes(search.toLowerCase());
        const mC = classFilter === "all" || s.studentClass === classFilter;
        return mQ && mC;
    });

    // Stats
    const withCreds = studentsWithParents.filter((s: any) => s.parentPortalUsername).length;
    const withoutCreds = studentsWithParents.length - withCreds;

    const classNames = [...new Set(students.map((s: any) => s.studentClass || s.currentClass).filter(Boolean))];

    const getDisplayValue = (student: any, field: "username" | "password") => {
        const edit = editValues[student._id];
        if (edit && edit[field] !== undefined) return edit[field];
        return field === "username"
            ? (student.parentPortalUsername || generateParentUsername(student))
            : (student.parentPortalPassword || generateParentPassword(student));
    };

    const setFieldValue = (id: string, field: "username" | "password", value: string) => {
        setEditValues(p => ({ ...p, [id]: { ...p[id], [field]: value } }));
    };

    const togglePassword = (id: string) => setVisiblePasswords(p => ({ ...p, [id]: !p[id] }));

    const saveMut = useMutation({
        mutationFn: async (student: any) => {
            const edit = editValues[student._id] || {};
            const username = edit.username ?? student.parentPortalUsername ?? generateParentUsername(student);
            const password = edit.password ?? student.parentPortalPassword ?? generateParentPassword(student);
            return api.patch(`/students/${student._id}/parent-credentials`, {
                parentPortalUsername: username,
                parentPortalPassword: password,
                parentCredentialsGenerated: true,
                parentCredentialsUpdatedAt: new Date().toISOString(),
            });
        },
        onSuccess: (_, student) => {
            qc.invalidateQueries({ queryKey: ["students"] });
            setEditValues(p => { const n = { ...p }; delete n[student._id]; return n; });
            toast.success(`Credentials saved for ${student.studentName}`);
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed — username may already be taken by another user"),
    });

    const generateSingleMut = useMutation({
        mutationFn: async (student: any) => {
            const username = generateParentUsername(student);
            const password = generateParentPassword(student);
            return api.patch(`/students/${student._id}/parent-credentials`, {
                parentPortalUsername: username,
                parentPortalPassword: password,
                parentCredentialsGenerated: true,
            });
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("Credentials generated!"); },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed — username may conflict with another user"),
    });

    const bulkGenerate = () => {
        const ungenerated = studentsWithParents.filter((s: any) => !s.parentPortalUsername);
        if (!ungenerated.length) { toast.info("All parents already have credentials"); return; }
        ungenerated.forEach((s: any) => generateSingleMut.mutate(s));
        toast.success(`Generating credentials for ${ungenerated.length} parents...`);
    };

    const copyPortalLink = () => {
        const url = `${window.location.origin}/parent-portal`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied("link");
            toast.success("Parent portal link copied!");
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const copyCredentials = (student: any) => {
        const u = getDisplayValue(student, "username");
        const p = getDisplayValue(student, "password");
        const text = `Parent Portal: ${window.location.origin}/parent-portal\nUsername: ${u}\nPassword: ${p}\nStudent: ${student.studentName}`;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(student._id);
            toast.success("Credentials copied to clipboard!");
            setTimeout(() => setCopied(null), 2000);
        });
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">Students</span>
                    <span className="text-gray-300">/</span>
                    <Home className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 font-medium text-sm">- Parent Login Management</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={copyPortalLink}
                        className="flex items-center gap-2 h-9 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all">
                        {copied === "link" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Portal Link
                    </button>
                    <a href="/parent-portal" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-100">
                        <ExternalLink className="w-3.5 h-3.5" /> Open Parent Portal
                    </a>
                </div>
            </div>

            <div className="px-6 pb-6">
                {/* Info banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 mb-5 flex items-start gap-3">
                    <Users className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">How Parent Login Works</p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                            Parents log in at <strong>/parent-portal</strong> using their username (defaults to phone number) and password.
                            Default password format: <code className="bg-emerald-100 px-1 rounded">parent@</code> + last 4 digits of parent phone.
                            E.g. phone 0712345678 → password <code className="bg-emerald-100 px-1 rounded">parent@5678</code>
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                    {[
                        { label: "Total Parents", value: studentsWithParents.length, color: "text-[#5C67F2]" },
                        { label: "Credentials Set", value: withCreds, color: "text-emerald-600" },
                        { label: "Pending Setup", value: withoutCreds, color: withoutCreds > 0 ? "text-amber-600" : "text-slate-400" },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap gap-4 items-center mb-5">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search student or parent name..."
                            className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                    </div>

                    {/* Class filter */}
                    <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                        className="h-11 px-4 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] shadow-sm">
                        <option value="all">All Classes</option>
                        {classNames.map((c: any) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Bulk generate */}
                    {withoutCreds > 0 && (
                        <button onClick={bulkGenerate}
                            className="h-11 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition-all">
                            <Key className="w-4 h-4" /> Generate All ({withoutCreds} pending)
                        </button>
                    )}

                    <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {filtered.length} parents
                    </span>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="py-4 px-4">Student</th>
                                    <th className="py-4 px-4">Class</th>
                                    <th className="py-4 px-4">Parent / Guardian</th>
                                    <th className="py-4 px-4">Phone</th>
                                    <th className="py-4 px-4 w-44">Username</th>
                                    <th className="py-4 px-4 w-44">Password</th>
                                    <th className="py-4 px-4 text-center">Status</th>
                                    <th className="py-4 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#5C67F2] mb-2" />Loading...
                                    </td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="py-12 text-center text-slate-300 text-xs font-bold uppercase">
                                        <Users className="w-8 h-8 mx-auto mb-2" />No parents found
                                    </td></tr>
                                ) : filtered.map((s: any) => {
                                    const parentName = s.fatherName || s.motherName || s.parentName || s.guardianName || "—";
                                    const parentPhone = s.parentPhone || s.phone || "—";
                                    const hasCredentials = !!s.parentPortalUsername;
                                    const isDirty = !!editValues[s._id];

                                    return (
                                        <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                                            {/* Student */}
                                            <td className="py-3 px-4">
                                                <p className="font-black text-slate-800">{s.studentName || `${s.firstName} ${s.lastName}`}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{s.registrationNo || s.admNo}</p>
                                            </td>

                                            {/* Class */}
                                            <td className="py-3 px-4 font-bold text-slate-600">{s.studentClass || "—"}</td>

                                            {/* Parent */}
                                            <td className="py-3 px-4">
                                                <p className="font-black text-slate-700">{parentName}</p>
                                                {s.fatherName && s.motherName && (
                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{s.motherName}</p>
                                                )}
                                            </td>

                                            {/* Phone */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1 font-bold text-slate-600">
                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                    {parentPhone}
                                                </div>
                                            </td>

                                            {/* Username — live uniqueness check */}
                                            <td className="py-3 px-4">
                                                <div className="relative pt-1">
                                                    <div className="absolute -top-1 left-3 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center z-10 text-white text-[8px] font-black">@</div>
                                                    <UsernameInput
                                                        value={getDisplayValue(s, "username")}
                                                        onChange={v => setFieldValue(s._id, "username", v)}
                                                        excludeId={s._id}
                                                        excludeType="parent"
                                                        className="bg-slate-50"
                                                    />
                                                </div>
                                            </td>

                                            {/* Password */}
                                            <td className="py-3 px-4">
                                                <div className="relative">
                                                    <div className="absolute -top-2.5 left-3 w-4 h-4 bg-[#5C67F2] rounded-full flex items-center justify-center z-10 text-white text-[8px] font-black"><Lock className="w-2.5 h-2.5" /></div>
                                                    <input
                                                        type={visiblePasswords[s._id] ? "text" : "password"}
                                                        value={getDisplayValue(s, "password")}
                                                        onChange={e => setFieldValue(s._id, "password", e.target.value)}
                                                        className="w-full h-9 px-3 pr-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                                                    />
                                                    <button onClick={() => togglePassword(s._id)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                                                        {visiblePasswords[s._id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-4 text-center">
                                                {isDirty ? (
                                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[8px] font-black uppercase">Unsaved</span>
                                                ) : hasCredentials ? (
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 justify-center">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-lg text-[8px] font-black uppercase">Default</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Save */}
                                                    <button
                                                        onClick={() => saveMut.mutate(s)}
                                                        disabled={saveMut.isPending}
                                                        title="Save credentials"
                                                        className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 flex items-center justify-center transition-colors"
                                                    >
                                                        {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                    </button>

                                                    {/* Reset to default */}
                                                    <button
                                                        onClick={() => {
                                                            setFieldValue(s._id, "username", generateParentUsername(s));
                                                            setFieldValue(s._id, "password", generateParentPassword(s));
                                                            saveMut.mutate({
                                                                ...s,
                                                                parentPortalUsername: generateParentUsername(s), parentPortalPassword: generateParentPassword(s),
                                                            });
                                                        }}
                                                        title="Reset to default credentials"
                                                        className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 flex items-center justify-center transition-colors"
                                                    >
                                                        <RefreshCcw className="w-3.5 h-3.5" />
                                                    </button>

                                                    {/* Copy credentials */}
                                                    <button
                                                        onClick={() => copyCredentials(s)}
                                                        title="Copy credentials to clipboard"
                                                        className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#5C67F2] border border-indigo-100 flex items-center justify-center transition-colors"
                                                    >
                                                        {copied === s._id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && filtered.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            <span>Showing {filtered.length} of {studentsWithParents.length} parents</span>
                            <span className="text-emerald-600">{withCreds} with active credentials</span>
                        </div>
                    )}
                </div>

                {/* Credential guide */}
                <div className="mt-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Credential Guide</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px]">
                        {[
                            {
                                title: "Default Username",
                                desc: "Parent's phone number (e.g. 0712345678)",
                                example: "0712345678",
                                color: "bg-blue-50 border-blue-100 text-blue-700",
                            },
                            {
                                title: "Default Password",
                                desc: "parent@ + last 4 digits of phone",
                                example: "parent@5678",
                                color: "bg-emerald-50 border-emerald-100 text-emerald-700",
                            },
                            {
                                title: "Portal URL",
                                desc: "Share this link with parents",
                                example: `${window.location.origin}/parent-portal`,
                                color: "bg-indigo-50 border-indigo-100 text-indigo-700",
                            },
                        ].map(g => (
                            <div key={g.title} className={`rounded-2xl border p-4 ${g.color}`}>
                                <p className="font-black uppercase tracking-widest text-[8px] mb-1">{g.title}</p>
                                <p className="font-bold mb-2">{g.desc}</p>
                                <code className="bg-white/60 px-2 py-1 rounded-lg font-black text-[10px] block">{g.example}</code>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Mini Save icon since it's not in the imports above
function Save({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
        </svg>
    );
}
