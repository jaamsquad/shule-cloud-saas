import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, Search, Grid3X3, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const WEEKS = Array.from({ length: 14 }, (_, i) => `Week ${i + 1}`);

export default function SchemesOfWork() {
    const [search, setSearch] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: schemes = [], isLoading } = useQuery({
        queryKey: ["schemes_of_work"],
        queryFn: async () => {
            const r = await api.get("/schemes_of_work");
            return Array.isArray(r.data) ? r.data : [];
        },
    });


    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/schemes_of_work/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["schemes_of_work"] }); toast.success("Scheme deleted"); setConfirmDelete(null); },
    });


    const filtered = schemes.filter((s: any) =>
        !search || (s.title || s.subjectName || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academics</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Schemes of Work</span>
                </div>
                <button onClick={() => navigate("/academics/schemes-of-work/new")}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> New Scheme
                </button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Schemes of Work</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Term-by-term topic planning per subject and class — 14-week grid</p>
                </div>

                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search scheme..."
                        className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><Grid3X3 className="w-8 h-8" />No schemes of work yet</div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((scheme: any) => (
                            <div key={scheme._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === scheme._id ? null : scheme._id)}>
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <Grid3X3 className="w-5 h-5 text-[#5C67F2]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-slate-800">{scheme.title || scheme.subjectName || "Untitled Scheme"}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{scheme.subjectName || "—"} · {scheme.className || "—"} · {scheme.term} {scheme.year}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase ${scheme.status === "Completed" ? "bg-emerald-50 text-emerald-600" : scheme.status === "Active" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>{scheme.status}</span>
                                    <div className="flex gap-1.5">
                                        <button onClick={e => { e.stopPropagation(); navigate(`/academics/schemes-of-work/${scheme._id}/edit`); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                                        {confirmDelete === scheme._id ? (
                                            <><button onClick={e => { e.stopPropagation(); delMut.mutate(scheme._id); }} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                            <button onClick={e => { e.stopPropagation(); setConfirmDelete(null); }} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                        ) : (
                                            <button onClick={e => { e.stopPropagation(); setConfirmDelete(scheme._id); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                        )}
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === scheme._id ? "rotate-180" : ""}`} />
                                </div>

                                {expandedId === scheme._id && (
                                    <div className="border-t border-slate-50 overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-[10px]">
                                            <thead>
                                                <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                                    <th className="py-2 px-3 w-16">Week</th>
                                                    <th className="py-2 px-3">Topic</th>
                                                    <th className="py-2 px-3">Sub-Topic</th>
                                                    <th className="py-2 px-3">Objectives</th>
                                                    <th className="py-2 px-3">Activities</th>
                                                    <th className="py-2 px-3 w-16">Lessons</th>
                                                    <th className="py-2 px-3">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {(scheme.weeks || []).filter((w: any) => w.topic).map((w: any, i: number) => (
                                                    <tr key={i} className="hover:bg-slate-50/50">
                                                        <td className="py-2 px-3 font-black text-[#5C67F2]">{w.week}</td>
                                                        <td className="py-2 px-3 font-black text-slate-800">{w.topic}</td>
                                                        <td className="py-2 px-3 text-slate-600">{w.subTopic || "—"}</td>
                                                        <td className="py-2 px-3 text-slate-500 max-w-[160px] truncate">{w.objectives || "—"}</td>
                                                        <td className="py-2 px-3 text-slate-500 max-w-[160px] truncate">{w.activities || "—"}</td>
                                                        <td className="py-2 px-3 text-center font-black text-slate-600">{w.lessons || 2}</td>
                                                        <td className="py-2 px-3 text-slate-400">{w.remarks || "—"}</td>
                                                    </tr>
                                                ))}
                                                {!(scheme.weeks || []).some((w: any) => w.topic) && (
                                                    <tr><td colSpan={7} className="py-4 text-center text-slate-300 text-[9px] font-bold uppercase">No weekly topics filled yet</td></tr>
                                                )}
                                            </tbody>
                                        </table>
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
