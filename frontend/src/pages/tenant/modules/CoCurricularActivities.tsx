import { Plus, Home, BookOpen, Loader2, Search, Trash2, Edit2, Sparkles, LayoutGrid, Type } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

export default function CoCurricularActivities() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    
    // Modals state
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCode, setNewCode] = useState("");
    const [newCategory, setNewCategory] = useState("Co-Curriculum");
    
    const [editingActivity, setEditingActivity] = useState<any>(null);

    const { data: subjects = [], isLoading } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => { const r = await api.get("/academics/subjects"); return r.data; },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/subjects", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Activity node initialized successfully!");
            setIsCreating(false);
            setNewName("");
            setNewCode("");
            setNewCategory("Co-Curriculum");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create activity"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/subjects/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Activity node removed successfully!");
        },
        onError: () => toast.error("Failed to delete activity"),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; name: string; code: string; category: string }) => 
            api.patch(`/academics/subjects/${data.id}`, { name: data.name, code: data.code, category: data.category }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Activity node updated successfully!");
            setEditingActivity(null);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update activity"),
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        createMutation.mutate({ 
            name: newName.trim(), 
            code: newCode.trim(),
            category: newCategory
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingActivity?.name.trim()) return;
        updateMutation.mutate({
            id: editingActivity._id,
            name: editingActivity.name.trim(),
            code: editingActivity.code?.trim() || "",
            category: editingActivity.category || "Co-Curriculum",
        });
    };

    const filteredActivities = subjects.filter((s: any) => {
        const isActivity = ["Co-Curriculum", "Sports", "Talents"].includes(s?.category);
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              s.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "All" || s.category === selectedCategory;
        return isActivity && matchesSearch && matchesCategory;
    });

    const categories = ["All", "Co-Curriculum", "Sports", "Talents"];

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col relative">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-lg mr-2">Subjects</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">- Co-Curricular & Talents</span>
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
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="h-11 px-6 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all uppercase tracking-widest text-[10px]"
                    >
                        <Plus className="w-4 h-4" /> New Activity
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
                            {cat === "Co-Curriculum" ? "Co-Curriculum Activities" : cat === "Sports" ? "Sports & Athletics" : cat === "Talents" ? "Talents & Clubs" : cat}
                        </button>
                    ))}
                </div>

                <div className="animate-in fade-in duration-500">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest animate-pulse">Syncing Activity Nodes...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredActivities.map((s: any) => (
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
                                                {s.category === "Co-Curriculum" ? "Co-Curriculum" : s.category === "Sports" ? "Sports" : "Talents"}
                                            </span>
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setEditingActivity(s)}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => deleteMutation.mutate(s._id)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Activity Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C67F2]/5 rounded-bl-[8rem] -mr-8 -mt-8"></div>
                        
                        <div className="text-center mb-8 relative z-10">
                            <div className="w-12 h-12 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-100">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">New Activity Node</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Initialize Co-Curricular Unit</p>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6 relative z-10">
                            {/* Activity Name */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Activity Name*
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Football Team"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                />
                            </div>

                            {/* Activity Code */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Activity Code*
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g. FB101"
                                    value={newCode}
                                    onChange={e => setNewCode(e.target.value)}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                />
                            </div>

                            {/* Classification */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Classification*
                                </div>
                                <select 
                                    value={newCategory}
                                    onChange={e => setNewCategory(e.target.value)}
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-900 bg-slate-50/50 appearance-none cursor-pointer font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                >
                                    <option value="Co-Curriculum" className="text-slate-900">Co-Curriculum Activities</option>
                                    <option value="Sports" className="text-slate-900">Sports & Athletics</option>
                                    <option value="Talents" className="text-slate-900">Talents & Clubs</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="h-11 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-full text-xs uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="h-11 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-xl shadow-indigo-100 flex items-center gap-2 transition-all disabled:opacity-70 tracking-widest text-xs uppercase"
                                >
                                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    {createMutation.isPending ? "INITIALIZING..." : "CREATE ACTIVITY"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Activity Modal */}
            {editingActivity && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C67F2]/5 rounded-bl-[8rem] -mr-8 -mt-8"></div>
                        
                        <div className="text-center mb-8 relative z-10">
                            <div className="w-12 h-12 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-100">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Edit Activity Node</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Modify Co-Curricular Unit</p>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-6 relative z-10">
                            {/* Activity Name */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Activity Name*
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Football Team"
                                    value={editingActivity.name}
                                    onChange={e => setEditingActivity({...editingActivity, name: e.target.value})}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                />
                            </div>

                            {/* Activity Code */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Activity Code*
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g. FB101"
                                    value={editingActivity.code || ""}
                                    onChange={e => setEditingActivity({...editingActivity, code: e.target.value})}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                />
                            </div>

                            {/* Classification */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Classification*
                                </div>
                                <select 
                                    value={editingActivity.category || "Co-Curriculum"}
                                    onChange={e => setEditingActivity({...editingActivity, category: e.target.value})}
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-900 bg-slate-50/50 appearance-none cursor-pointer font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                >
                                    <option value="Co-Curriculum" className="text-slate-900">Co-Curriculum Activities</option>
                                    <option value="Sports" className="text-slate-900">Sports & Athletics</option>
                                    <option value="Talents" className="text-slate-900">Talents & Clubs</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setEditingActivity(null)}
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
