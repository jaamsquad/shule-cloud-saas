import { Home, Eye, EyeOff, Save, Mail, Key, RefreshCcw, ExternalLink, Loader2, Search } from "lucide-react";
import { useState } from "react";
import UsernameInput from "@/components/UsernameInput";
import { useItems } from "@/hooks/useItems";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

function generatePassword(id: string): string {
    const clean = id?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "staff";
    return `shule@${clean}`;
}

function generateUsername(id: string, name: string): string {
    if (id) return id;
    return name?.toLowerCase().replace(/\s+/g, ".").slice(0, 15) || "staff";
}

export default function StaffManageLogin() {
    const queryClient = useQueryClient();
    const { items: staffList = [], isLoading } = useItems("staff");
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const [editValues, setEditValues] = useState<Record<string, { username: string; password: string }>>({});

    const filtered = (staffList as any[]).filter((s: any) => {
        const name = (s.employeeName || s.name || "").toLowerCase();
        const matchSearch = name.includes(searchTerm.toLowerCase()) || (s.nationalId || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchRole = roleFilter === "all" || (s.designation || "").toLowerCase() === roleFilter.toLowerCase();
        return matchSearch && matchRole;
    });

    const togglePassword = (id: string) => setVisiblePasswords(p => ({ ...p, [id]: !p[id] }));

    const getDisplayValue = (staff: any, field: "username" | "password") => {
        const edit = editValues[staff._id];
        if (edit && edit[field] !== undefined) return edit[field];
        return field === "username" ? (staff.portalUsername || "") : (staff.portalPassword || "");
    };

    const setFieldValue = (staffId: string, field: "username" | "password", value: string) => {
        setEditValues(p => ({ ...p, [staffId]: { ...p[staffId], [field]: value } }));
    };

    const saveMut = useMutation({
        mutationFn: async (staff: any) => {
            const edit = editValues[staff._id] || {};
            const username = edit.username !== undefined ? edit.username : staff.portalUsername;
            const password = edit.password !== undefined ? edit.password : staff.portalPassword;
            return api.patch(`/staff/${staff._id}/portal-credentials`, { portalUsername: username, portalPassword: password, credentialsGenerated: true });
        },
        onSuccess: (_, staff) => {
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            setEditValues(p => { const n = { ...p }; delete n[staff._id]; return n; });
            toast.success("Credentials saved!");
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save"),
    });

    const generateMut = useMutation({
        mutationFn: async (staff: any) => {
            const username = generateUsername(staff.nationalId || staff._id.slice(-6), staff.employeeName || staff.name || "staff");
            const password = generatePassword(staff.nationalId || staff._id.slice(-6));
            return api.patch(`/staff/${staff._id}/portal-credentials`, { portalUsername: username, portalPassword: password, credentialsGenerated: true });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); toast.success("Credentials generated!"); },
    });

    const resetMut = useMutation({
        mutationFn: async (staff: any) => {
            const password = generatePassword(staff.nationalId || staff._id.slice(-6));
            return api.patch(`/staff/${staff._id}/portal-credentials`, { portalPassword: password });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); toast.success("Password reset!"); },
    });

    const bulkGenerate = () => {
        const ungenerated = (staffList as any[]).filter((s: any) => !s.portalUsername);
        if (!ungenerated.length) { toast.info("All staff already have credentials"); return; }
        ungenerated.forEach((s: any) => generateMut.mutate(s));
        toast.success(`Generating credentials for ${ungenerated.length} staff...`);
    };

    const designations = [...new Set((staffList as any[]).map((s: any) => s.designation).filter(Boolean))];

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">Employees</span>
                    <span className="text-gray-300">/</span>
                    <Home className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 font-medium text-sm">Manage Login</span>
                </div>
                <a href="/staff-portal" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 h-9 px-4 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Staff Portal ↗
                </a>
            </div>

            <div className="p-6 pt-0 flex flex-col gap-5">
                {/* Top: search bar (horizontal) */}
                <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-3">
                        <div className="flex items-center gap-2 text-slate-700"><Search className="w-4 h-4 text-[#5C67F2]" /><span className="font-black text-sm">Search</span></div>
                        <div className="flex-1">
                            <label className="block text-[9px] font-black text-[#5C67F2] uppercase tracking-widest mb-1">Search Staff</label>
                            <input type="text" placeholder="Name or ID…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-10 px-4 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm text-slate-700" />
                        </div>
                        <div className="w-full md:w-56">
                            <label className="block text-[9px] font-black text-[#5C67F2] uppercase tracking-widest mb-1">Designation</label>
                            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full h-10 px-4 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm text-slate-700 bg-white">
                                <option value="all">All Roles</option>
                                {designations.map((d: any) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <button onClick={bulkGenerate} className="h-10 px-6 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
                            <Key className="w-3.5 h-3.5" /> Generate All
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="py-4 px-4">ID</th>
                                    <th className="py-4 px-4">Staff Name</th>
                                    <th className="py-4 px-4">Role</th>
                                    <th className="py-4 px-4 w-44">Portal Username</th>
                                    <th className="py-4 px-4 w-48">Password</th>
                                    <th className="py-4 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#5C67F2] mb-2" />Loading staff...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">No staff found</td></tr>
                                ) : filtered.map((s: any) => (
                                    <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-500">{s.nationalId || s._id?.slice(-6)}</td>
                                        <td className="py-3 px-4 font-black text-slate-800">{s.employeeName || s.name}</td>
                                        <td className="py-3 px-4 font-bold text-slate-600">{s.designation || "Staff"}</td>
                                        {/* Username — real-time uniqueness check */}
                                        <td className="py-3 px-4">
                                            <div className="relative pt-1">
                                                <div className="absolute -top-1 left-3 w-4 h-4 bg-[#868DF4] rounded-full flex items-center justify-center z-10 text-white text-[8px]">@</div>
                                                <UsernameInput
                                                    value={getDisplayValue(s, "username")}
                                                    onChange={v => setFieldValue(s._id, "username", v)}
                                                    excludeId={s._id}
                                                    excludeType="staff"
                                                    placeholder="Set username..."
                                                />
                                            </div>
                                        </td>
                                        {/* Password */}
                                        <td className="py-3 px-4">
                                            <div className="relative">
                                                <div className="absolute -top-2 left-3 w-4 h-4 bg-[#868DF4] rounded-full flex items-center justify-center z-10 text-white text-[8px]">🔒</div>
                                                <input type={visiblePasswords[s._id] ? "text" : "password"}
                                                    value={getDisplayValue(s, "password")} onChange={e => setFieldValue(s._id, "password", e.target.value)}
                                                    className="w-full h-9 px-3 pr-9 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                                                    placeholder="Set password..." />
                                                <button onClick={() => togglePassword(s._id)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                                    {visiblePasswords[s._id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </td>
                                        {/* Actions */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => saveMut.mutate(s)} title="Save credentials"
                                                    className="w-8 h-8 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center transition-colors">
                                                    {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                </button>
                                                <button onClick={() => resetMut.mutate(s)} title="Reset password"
                                                    className="w-8 h-8 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-xl flex items-center justify-center transition-colors">
                                                    <RefreshCcw className="w-3.5 h-3.5" />
                                                </button>
                                                {!s.portalUsername && (
                                                    <button onClick={() => generateMut.mutate(s)} title="Generate credentials"
                                                        className="w-8 h-8 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center transition-colors">
                                                        <Key className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {!isLoading && (
                        <div className="px-4 py-3 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Showing {filtered.length} of {(staffList as any[]).length} staff · {(staffList as any[]).filter((s: any) => s.portalUsername).length} have credentials
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
