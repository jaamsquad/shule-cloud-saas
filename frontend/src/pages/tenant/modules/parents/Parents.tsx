import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Pencil, Trash2, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const statusBadge = (s: string) => {
    const m: Record<string, string> = {
        Active: "bg-emerald-100 text-emerald-700", Inactive: "bg-slate-100 text-slate-600",
        Suspended: "bg-amber-100 text-amber-700", Blacklisted: "bg-rose-100 text-rose-700",
        Archived: "bg-slate-100 text-slate-500",
    };
    return m[s] || "bg-slate-100 text-slate-600";
};

export default function Parents() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [confirm, setConfirm] = useState<string | null>(null);

    const { data = [], isLoading } = useQuery({
        queryKey: ["parents"],
        queryFn: async () => {
            const r = await api.get("/parents");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const del = useMutation({
        mutationFn: async (id: string) => api.delete(`/parents/${id}`),
        onSuccess: () => { toast.success("Parent removed"); setConfirm(null); qc.invalidateQueries({ queryKey: ["parents"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Delete failed"),
    });

    const filtered = data.filter((p: any) =>
        (p.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.primaryPhone || "").includes(search) ||
        (p.parentId || "").toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Parents & Guardians</h1>
                        <p className="text-xs text-slate-500">{data.length} record{data.length === 1 ? "" : "s"} · linked to students</p>
                    </div>
                </div>
                <button onClick={() => navigate("/parents/new")}
                    className="inline-flex items-center gap-2 h-10 px-5 bg-[#5C67F2] text-white font-black rounded-xl text-xs uppercase tracking-widest">
                    <Plus className="w-4 h-4" /> Add Parent
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-4 flex items-center px-4 h-12">
                <Search className="w-4 h-4 text-slate-300" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or parent ID…"
                    className="flex-1 px-3 text-sm focus:outline-none bg-transparent" />
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-slate-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm font-semibold">No parents yet.</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50">
                                    <th className="px-5 py-3">Parent ID</th>
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">Relationship</th>
                                    <th className="px-5 py-3">Phone</th>
                                    <th className="px-5 py-3 text-center">Students</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p: any) => (
                                    <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.parentId || "—"}</td>
                                        <td className="px-5 py-3 font-bold text-slate-700">{p.fullName}</td>
                                        <td className="px-5 py-3 text-slate-600">{p.relationship || "—"}</td>
                                        <td className="px-5 py-3 text-slate-600">{p.primaryPhone || "—"}</td>
                                        <td className="px-5 py-3 text-center font-bold text-indigo-600">{(p.linkedStudents || []).length}</td>
                                        <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusBadge(p.status || "Active")}`}>{p.status || "Active"}</span></td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => navigate(`/parents/edit/${p._id}`)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-100 hover:border-[#5C67F2] hover:text-[#5C67F2] text-slate-300"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => setConfirm(p._id)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-100 hover:border-rose-200 hover:text-rose-400 text-slate-300"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            {confirm === p._id && (
                                                <div className="mt-2 flex items-center gap-2 justify-end">
                                                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600"><AlertCircle className="w-3.5 h-3.5" /> Delete?</span>
                                                    <button onClick={() => setConfirm(null)} className="text-[11px] font-bold px-2 py-1 border border-slate-200 rounded">No</button>
                                                    <button onClick={() => del.mutate(p._id)} className="text-[11px] font-bold px-2 py-1 bg-rose-500 text-white rounded">Yes</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
