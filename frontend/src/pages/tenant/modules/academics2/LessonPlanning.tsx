import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, BookOpen, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-500",
    "In Progress": "bg-amber-50 text-amber-600",
    Completed: "bg-emerald-50 text-emerald-600",
};


export default function LessonPlanning() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: lessons = [], isLoading } = useQuery({
        queryKey: ["lesson_plans"],
        queryFn: async () => {
            const r = await api.get("/lesson_plans");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/lesson_plans/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lesson_plans"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const filtered = lessons.filter((l: any) => {
        const matchS = !search || (l.topic || "").toLowerCase().includes(search.toLowerCase()) || (l.subjectName || "").toLowerCase().includes(search.toLowerCase());
        const matchSt = statusFilter === "ALL" || l.status === statusFilter;
        return matchS && matchSt;
    });


    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academics</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Lesson Planning</span>
                </div>
                <button onClick={() => navigate("/academics/lesson-plans/new")}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> New Lesson Plan
                </button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Lesson Planning</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Create and manage structured lesson plans per subject and class</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                        { label: "Total Plans", value: lessons.length, color: "text-[#5C67F2]" },
                        { label: "In Progress", value: lessons.filter((l: any) => l.status === "In Progress").length, color: "text-amber-600" },
                        { label: "Completed", value: lessons.filter((l: any) => l.status === "Completed").length, color: "text-emerald-600" },
                    ].map(s => (
                        <div key={s.label} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by topic or subject..."
                            className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                    </div>
                    <div className="flex gap-2">
                        {["ALL", "Draft", "In Progress", "Completed"].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${statusFilter === s ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lesson Plan Cards */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><BookOpen className="w-8 h-8" />No lesson plans found</div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((l: any) => (
                            <div key={l._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                {/* Header row */}
                                <div className="px-6 py-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === l._id ? null : l._id)}>
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <BookOpen className="w-5 h-5 text-[#5C67F2]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-800">{l.topic}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                            {l.subjectName || "—"} · {l.className || "—"} · {l.date || "No date"} · {l.duration || 40} min
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase flex-shrink-0 ${STATUS_COLORS[l.status] || "bg-slate-100 text-slate-500"}`}>{l.status}</span>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        <button onClick={e => { e.stopPropagation(); navigate(`/academics/lesson-plans/${l._id}/edit`); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                        {confirmDelete === l._id ? (
                                            <><button onClick={e => { e.stopPropagation(); delMut.mutate(l._id); }} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                            <button onClick={e => { e.stopPropagation(); setConfirmDelete(null); }} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                        ) : (
                                            <button onClick={e => { e.stopPropagation(); setConfirmDelete(l._id); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {expandedId === l._id && (
                                    <div className="px-6 pb-6 border-t border-slate-50 grid grid-cols-2 gap-4 pt-4">
                                        {[
                                            { label: "Learning Objectives", value: l.objectives },
                                            { label: "Teaching Aids / Resources", value: l.teachingAids },
                                            { label: "Introduction", value: l.introduction },
                                            { label: "Development / Main Activity", value: l.development },
                                            { label: "Conclusion", value: l.conclusion },
                                            { label: "Assessment Method", value: l.assessment },
                                            { label: "Homework / Assignment", value: l.homework },
                                            { label: "Teacher Notes / Reflection", value: l.teacherNotes },
                                        ].filter(f => f.value).map(f => (
                                            <div key={f.label} className="bg-slate-50 rounded-2xl p-4">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                                                <p className="text-xs text-slate-700 font-medium">{f.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
