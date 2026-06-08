import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, Search, Send, Lock, Eye, Calendar, ClipboardList } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
    Draft:     { label: "Draft",     color: "bg-slate-100 text-slate-500",  icon: Eye },
    Published: { label: "Published", color: "bg-emerald-50 text-emerald-600", icon: Send },
    Closed:    { label: "Closed",    color: "bg-rose-50 text-rose-500",     icon: Lock },
};

const emptyForm = {
    title: "", subjectId: "", subjectName: "", classId: "", className: "",
    instructions: "", dueDate: "", totalMarks: "100", type: "Homework",
    status: "Draft", notes: "",
};

export default function AssignmentsManagement() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: assignments = [], isLoading } = useQuery({
        queryKey: ["academic_assignments"],
        queryFn: async () => {
            const r = await api.get("/academic_assignments");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: subjects = [] } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; },
    });

    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; },
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/academic_assignments/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_assignments"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const publishMut = useMutation({
        mutationFn: (id: string) => api.patch(`/academic_assignments/${id}/publish`, {}),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_assignments"] }); toast.success("Assignment published to students"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const closeMut = useMutation({
        mutationFn: (id: string) => api.patch(`/academic_assignments/${id}/close`, {}),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_assignments"] }); toast.success("Assignment closed"); },
        onError: () => toast.error("Failed"),
    });

    const filtered = assignments.filter((a: any) => {
        const matchQ = !search || (a.title || "").toLowerCase().includes(search.toLowerCase()) || (a.subjectName || "").toLowerCase().includes(search.toLowerCase());
        const matchS = statusFilter === "ALL" || a.status === statusFilter;
        return matchQ && matchS;
    });


    const stats = {
        total: assignments.length,
        draft: assignments.filter((a: any) => a.status === "Draft").length,
        published: assignments.filter((a: any) => a.status === "Published").length,
        closed: assignments.filter((a: any) => a.status === "Closed").length,
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academics</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Assignments</span>
                </div>
                <button onClick={() => navigate("/academics/assignments/new")}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> New Assignment
                </button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Assignments Management</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Create, publish, and manage assignments — Draft → Published → Closed</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { label: "Total", value: stats.total, color: "text-[#5C67F2]" },
                        { label: "Draft", value: stats.draft, color: "text-slate-500" },
                        { label: "Published", value: stats.published, color: "text-emerald-600" },
                        { label: "Closed", value: stats.closed, color: "text-rose-500" },
                    ].map(s => (
                        <div key={s.label} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6 flex-wrap">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignments..."
                            className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                    </div>
                    <div className="flex gap-2">
                        {["ALL", "Draft", "Published", "Closed"].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${statusFilter === s ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Assignment Cards */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><ClipboardList className="w-8 h-8" />No assignments found</div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((a: any) => {
                            const sc = STATUS_MAP[a.status] || STATUS_MAP.Draft;
                            const StatusIcon = sc.icon;
                            const isOverdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status === "Published";
                            return (
                                <div key={a._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                            <ClipboardList className="w-5 h-5 text-[#5C67F2]" />
                                        </div>
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === a._id ? null : a._id)}>
                                            <p className="text-sm font-black text-slate-800">{a.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{a.subjectName || "—"} · {a.className || "—"} · {a.type}</p>
                                                {a.dueDate && (
                                                    <span className={`flex items-center gap-1 text-[9px] font-black uppercase ${isOverdue ? "text-rose-500" : "text-slate-400"}`}>
                                                        <Calendar className="w-3 h-3" />Due: {a.dueDate}
                                                        {isOverdue && " (OVERDUE)"}
                                                    </span>
                                                )}
                                                <span className="text-[9px] text-slate-400 font-bold">{a.totalMarks || 100} marks</span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 flex-shrink-0 ${sc.color}`}>
                                            <StatusIcon className="w-3 h-3" />{sc.label}
                                        </span>

                                        {/* Action buttons */}
                                        <div className="flex gap-1.5 flex-shrink-0">
                                            {a.status === "Draft" && (
                                                <button onClick={() => publishMut.mutate(a._id)} disabled={publishMut.isPending}
                                                    className="h-8 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1 transition-colors">
                                                    {publishMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Publish
                                                </button>
                                            )}
                                            {a.status === "Published" && (
                                                <button onClick={() => closeMut.mutate(a._id)} disabled={closeMut.isPending}
                                                    className="h-8 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1 transition-colors">
                                                    {closeMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />} Close
                                                </button>
                                            )}
                                            <button onClick={() => navigate(`/academics/assignments/${a._id}/edit`)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                            {confirmDelete === a._id ? (
                                                <><button onClick={() => delMut.mutate(a._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                            ) : (
                                                <button onClick={() => setConfirmDelete(a._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                            )}
                                        </div>
                                    </div>

                                    {expandedId === a._id && a.instructions && (
                                        <div className="px-6 pb-5 border-t border-slate-50 pt-4 grid grid-cols-2 gap-4">
                                            {[
                                                { label: "Instructions", value: a.instructions },
                                                { label: "Notes to Teacher", value: a.notes },
                                            ].filter(f => f.value).map(f => (
                                                <div key={f.label} className="bg-slate-50 rounded-2xl p-4">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                                                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{f.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}
