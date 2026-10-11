import { Home, BookOpen, ArrowLeft, Loader2, Search, Edit2, LayoutGrid, List } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

export default function AllSubjects() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [view, setView] = useState<"grid" | "list">("grid");
    const [editingSubject, setEditingSubject] = useState<any>(null);

    const { data: subjects = [], isLoading } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => { const r = await api.get("/academics/subjects"); return r.data; },
    });

    // Name is never sent — it's locked to the built-in catalog entry (Subjects → Subjects we offer).
    const updateMutation = useMutation({
        mutationFn: (data: { id: string; code: string; shortCode: string; category: string }) =>
            api.patch(`/academics/subjects/${data.id}`, { code: data.code, shortCode: data.shortCode, category: data.category }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Subject node updated successfully!");
            setEditingSubject(null);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update subject"),
    });

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate({
            id: editingSubject._id,
            code: editingSubject.code?.trim() || "",
            shortCode: (editingSubject.shortCode || "").trim().toUpperCase(),
            category: editingSubject.category || "Core",
        });
    };

    const filteredSubjects = subjects.filter((s: any) => {
        const isAcademic = !["Co-Curriculum", "Sports", "Talents"].includes(s?.category);
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              s.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "All" || s.category === selectedCategory;
        return isAcademic && matchesSearch && matchesCategory;
    });

    const categories = ["All", "Core", "Elective", "Vocational", "Extracurricular"];

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col relative">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-lg mr-2">Subjects</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">- Academic Subjects</span>
            </div>

            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="relative group flex-1 max-w-md">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#5C67F2] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Filter by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-11 pl-12 pr-6 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-[#5C67F2] shadow-sm text-slate-700 font-bold text-sm transition-all"
                        />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-1 flex shadow-sm">
                        <button onClick={() => setView("grid")} className={`px-3 h-9 rounded-lg ${view === "grid" ? "bg-[#5C67F2] text-white" : "text-slate-400"}`}><LayoutGrid className="w-4 h-4" /></button>
                        <button onClick={() => setView("list")} className={`px-3 h-9 rounded-lg ${view === "list" ? "bg-[#5C67F2] text-white" : "text-slate-400"}`}><List className="w-4 h-4" /></button>
                    </div>
                    <button
                        onClick={() => navigate("/subjects/offered")}
                        className="h-11 px-6 bg-[#1f2937] hover:bg-black text-white font-black rounded-xl shadow-sm flex items-center gap-2 transition-all uppercase tracking-widest text-[10px]"
                    >
                        <BookOpen className="w-4 h-4" /> Choose subjects we offer
                    </button>
                </div>

                {/* Category Filter Pills */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all whitespace-nowrap shadow-sm ${
                                selectedCategory === cat
                                    ? "bg-[#5C67F2] text-white shadow-indigo-100 shadow-md scale-105"
                                    : "bg-white text-slate-500 hover:bg-slate-50 border border-gray-100"
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="animate-in fade-in duration-500">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest animate-pulse">Syncing Subject Nodes...</p>
                        </div>
                    ) : view === "list" ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                                        <th className="text-left px-5 py-3 font-black">Subject</th>
                                        <th className="text-left px-3 py-3 font-black">Code</th>
                                        <th className="text-left px-3 py-3 font-black">Classification</th>
                                        <th className="text-right px-5 py-3 font-black">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubjects.length === 0 ? (
                                        <tr><td colSpan={4} className="py-10 text-center text-slate-400">No subjects found.</td></tr>
                                    ) : filteredSubjects.map((s: any) => (
                                        <tr key={s._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-5 py-3 font-bold text-slate-700">{s.name}</td>
                                            <td className="px-3 py-3 text-slate-500">{s.code || "—"}</td>
                                            <td className="px-3 py-3"><span className="px-2.5 py-0.5 bg-indigo-50 text-[#5C67F2] rounded-lg text-[10px] font-black uppercase">{s.category || "Core"}</span></td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => setEditingSubject(s)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5C67F2] flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredSubjects.map((s: any) => (
                                <div key={s._id} className="h-[160px] bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#5C67F2]/5 rounded-bl-[4rem] -mr-6 -mt-6 group-hover:bg-[#5C67F2]/10 transition-colors"></div>
                                    
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mb-4 group-hover:bg-[#5C67F2] group-hover:text-white transition-all">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    
                                    <h3 className="font-black text-sm text-slate-800 tracking-tight mb-2 truncate pr-10">
                                        {s.name}
                                    </h3>
                                    
                                    <div className="mt-auto flex justify-between items-center">
                                        <div className="flex gap-1.5 items-center">
                                            <span className="px-2.5 py-0.5 bg-slate-50 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100">
                                                {s.code || "NO CODE"}
                                            </span>
                                            <span className="px-2.5 py-0.5 bg-indigo-50 text-[#5C67F2] rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                                {s.category || "Core"}
                                            </span>
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setEditingSubject(s)}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Subject Modal */}
            {editingSubject && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C67F2]/5 rounded-bl-[8rem] -mr-8 -mt-8"></div>
                        
                        <div className="text-center mb-8 relative z-10">
                            <div className="w-12 h-12 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-100">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Edit Subject Node</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Modify Curriculum Unit</p>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-6 relative z-10">
                            {/* Subject Name — locked; it's picked from the built-in catalog under
                                Subjects → Subjects we offer, not renamed here. */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md uppercase">
                                    Subject Name
                                </div>
                                <input
                                    type="text"
                                    value={editingSubject.name}
                                    disabled
                                    title="The subject name comes from the built-in catalog (Subjects → Subjects we offer) and can't be changed here."
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl text-slate-500 bg-slate-100 font-bold text-sm cursor-not-allowed"
                                />
                            </div>

                            {/* Subject Code */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Subject Code*
                                </div>
                                <input
                                    type="text"
                                    placeholder="e.g. MATH101"
                                    value={editingSubject.code || ""}
                                    onChange={e => setEditingSubject({...editingSubject, code: e.target.value})}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                />
                            </div>

                            {/* Short Code — shown on merit list & analysis */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Short Code
                                </div>
                                <input
                                    type="text"
                                    placeholder="e.g. MAT"
                                    value={editingSubject.shortCode || ""}
                                    onChange={e => setEditingSubject({...editingSubject, shortCode: e.target.value.toUpperCase()})}
                                    maxLength={6}
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner uppercase"
                                />
                            </div>

                            {/* Classification */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Classification*
                                </div>
                                <select 
                                    value={editingSubject.category || "Core"}
                                    onChange={e => setEditingSubject({...editingSubject, category: e.target.value})}
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-900 bg-slate-50/50 appearance-none cursor-pointer font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                >
                                    <option value="Core" className="text-slate-900">Core / Compulsory</option>
                                    <option value="Elective" className="text-slate-900">Elective / Optional</option>
                                    <option value="Vocational" className="text-slate-900">Vocational / Skill-Based</option>
                                    <option value="Extracurricular" className="text-slate-900">Extracurricular</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setEditingSubject(null)}
                                    className="h-11 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-full text-xs uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="h-11 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-xl shadow-indigo-100 flex items-center gap-2 transition-all disabled:opacity-70 tracking-widest text-xs uppercase"
                                >
                                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {updateMutation.isPending ? "SAVING..." : "SAVE CHANGES"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
