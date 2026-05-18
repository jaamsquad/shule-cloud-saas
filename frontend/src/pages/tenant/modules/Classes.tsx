import { useState } from "react";
import { Plus, Home, User, DollarSign, Loader2, Edit2, Trash2, GraduationCap, X, ChevronDown, Save, Eye } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

export default function Classes() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [editingClass, setEditingClass] = useState<any>(null);
    const [editName, setEditName] = useState("");
    const [editFees, setEditFees] = useState("");
    const [editTeacherId, setEditTeacherId] = useState("");
    
    const { data: classStreams = [], isLoading: isLoadingClasses } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });

    const { data: students = [] } = useQuery({
        queryKey: ["students"],
        queryFn: async () => { const r = await api.get("/students"); return r.data; },
    });

    const { data: staff = [] } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => { const r = await api.get("/staff"); return r.data; },
    });

    const teachers = staff.filter((s: any) => s.isTeachingStaff || s.designation?.toLowerCase().includes("teacher") || s.role?.toLowerCase().includes("teacher"));

    const getClassStudents = (cls: any) => {
        return students.filter((s: any) => s.studentClass === (cls.name || cls.levelName) || s.classId === cls._id);
    };

    const getGenderStats = (classStudents: any[]) => {
        const total = classStudents.length;
        const boys = classStudents.filter((s: any) => s.gender?.toLowerCase() === "male").length;
        const girls = classStudents.filter((s: any) => s.gender?.toLowerCase() === "female").length;
        const na = total - boys - girls;
        return {
            total,
            boys,
            girls,
            na,
            boysPct: total > 0 ? Math.round((boys / total) * 100) : 0,
            girlsPct: total > 0 ? Math.round((girls / total) * 100) : 0,
            naPct: total > 0 ? Math.round((na / total) * 100) : 0,
        };
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/classes/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["classes"] });
            toast.success("Class removed successfully");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to remove class"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/academics/classes/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["classes"] });
            toast.success("Class updated successfully");
            setEditingClass(null);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update class"),
    });

    const openEdit = (cls: any) => {
        setEditingClass(cls);
        setEditName(cls.name || cls.levelName || "");
        setEditFees(cls.monthlyFees?.toString() || "");
        setEditTeacherId(cls.classTeacher?._id || cls.classTeacherId || "");
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName.trim()) return;
        updateMutation.mutate({
            id: editingClass._id,
            data: {
                levelName: editName.trim(),
                monthlyFees: editFees,
                classTeacherId: editTeacherId === "" ? null : editTeacherId,
            },
        });
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-sm mr-2">Classes</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- All Classes</span>
            </div>

            <div className="p-6">
                <div className="animate-in fade-in duration-500">
                    {isLoadingClasses ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest animate-pulse">Syncing Classes...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {classStreams.map((cls: any) => {
                                const classStudents = getClassStudents(cls);
                                const stats = getGenderStats(classStudents);

                                return (
                                    <div 
                                        key={cls._id} 
                                        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col hover:shadow-lg transition-all group relative cursor-pointer"
                                        onClick={() => navigate(`/classes/${cls._id}`)}
                                    >
                                        {/* Header Row */}
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-base font-black text-slate-800 tracking-tight">{cls.name || cls.levelName}</h3>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openEdit(cls); }}
                                                    className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-[#5C67F2] hover:bg-indigo-50 transition-all"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if(confirm("Delete this class?")) deleteMutation.mutate(cls._id);
                                                    }}
                                                    className="p-1.5 bg-slate-50 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Student Count */}
                                        <div className="flex items-center gap-2.5 mb-4">
                                            <span className="text-2xl font-black text-slate-800">{stats.total}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Students</span>
                                            <div className="ml-auto w-8 h-8 bg-[#5C67F2]/10 rounded-lg flex items-center justify-center text-[#5C67F2]">
                                                <GraduationCap className="w-4 h-4" />
                                            </div>
                                        </div>

                                        {/* Gender Stats */}
                                        <div className="flex gap-2 mb-3">
                                            <div className="flex-1 bg-blue-50 rounded-xl p-2.5 text-center">
                                                <div className="text-sm font-black text-blue-600">{stats.boysPct}%</div>
                                                <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Boys</div>
                                                <div className="text-[9px] font-bold text-blue-300">{stats.boys}</div>
                                            </div>
                                            <div className="flex-1 bg-pink-50 rounded-xl p-2.5 text-center">
                                                <div className="text-sm font-black text-pink-600">{stats.girlsPct}%</div>
                                                <div className="text-[8px] font-black text-pink-400 uppercase tracking-widest">Girls</div>
                                                <div className="text-[9px] font-bold text-pink-300">{stats.girls}</div>
                                            </div>
                                        </div>

                                        {stats.na > 0 && (
                                            <div className="inline-flex self-start bg-slate-50 rounded-xl px-3 py-1.5 text-center">
                                                <div className="text-xs font-black text-slate-500">{stats.naPct}%</div>
                                                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1.5">N/A</div>
                                                <div className="text-[9px] font-bold text-slate-300 ml-1.5">{stats.na}</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Add New Card */}
                            <div 
                                onClick={() => navigate("/classes/new")}
                                className="border-2 border-dashed border-[#5C67F2]/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#5C67F2]/5 hover:border-[#5C67F2] transition-all bg-white min-h-[200px] group"
                            >
                                <div className="w-10 h-10 flex items-center justify-center text-[#5C67F2] mb-2 group-hover:scale-110 transition-transform">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <span className="text-slate-500 font-bold text-sm">Add New</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-[500px] mx-4 p-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C67F2]/5 rounded-bl-[8rem] -mr-8 -mt-8"></div>

                        <button 
                            onClick={() => setEditingClass(null)}
                            className="absolute top-6 right-6 p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all z-20"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="text-center mb-8 relative z-10">
                            <div className="w-12 h-12 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-100">
                                <Edit2 className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Edit Class</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Update class parameters</p>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-6 relative z-10">
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md uppercase">
                                    Class Name*
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Grade 4 West"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md uppercase">
                                    Monthly Fees (KES)
                                </div>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={editFees}
                                    onChange={e => setEditFees(e.target.value)}
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white"
                                />
                                <DollarSign className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-[#5C67F2] transition-colors" />
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md uppercase">
                                    Class Mentor
                                </div>
                                <select 
                                    value={editTeacherId}
                                    onChange={e => setEditTeacherId(e.target.value)}
                                    className="w-full h-12 px-6 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-900 bg-white cursor-pointer font-bold text-sm transition-all shadow-sm"
                                >
                                    <option value="" className="text-slate-500">No Mentor Assigned</option>
                                    {teachers.map((t: any) => (
                                        <option key={t._id} value={t._id} className="text-slate-900 bg-white">
                                            {t.firstName ? `${t.firstName} ${t.lastName}` : (t.employeeName || t.name || 'Unknown Staff')}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <ChevronDown className="w-5 h-5 text-slate-200 group-focus-within:text-[#5C67F2] transition-colors" />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setEditingClass(null)}
                                    className="flex-1 h-12 bg-slate-50 text-slate-400 font-black rounded-full flex items-center justify-center gap-2 transition-all tracking-widest text-xs uppercase hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="flex-1 h-12 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all tracking-widest text-xs uppercase hover:scale-[1.02] active:scale-95 disabled:opacity-70"
                                >
                                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {updateMutation.isPending ? "SAVING..." : "SAVE"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
