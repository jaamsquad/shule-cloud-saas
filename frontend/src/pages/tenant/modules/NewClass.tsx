import { useState } from "react";
import { Plus, Home, User, DollarSign, GraduationCap, ArrowLeft, Loader2, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

export default function NewClass() {
    const navigate = useNavigate();
    const [className, setClassName] = useState("");
    const [fees, setFees] = useState("");
    const [teacherId, setTeacherId] = useState("");

    const queryClient = useQueryClient();

    const { data: staff = [], isLoading: isLoadingStaff } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => { const r = await api.get("/staff"); return r.data; },
    });

    const { data: classStreams = [], isLoading: isLoadingClasses } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });

    const teachers = staff.filter((s: any) => s.isTeachingStaff || s.designation?.toLowerCase().includes("teacher") || s.role?.toLowerCase().includes("teacher"));

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/classes", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["classes"] });
            toast.success("Class node initialized successfully!");
            navigate("/classes");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create class"),
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!className.trim()) return;
        createMutation.mutate({ 
            levelType: 'CBC', 
            levelName: className.trim(), 
            streamName: 'General',
            capacity: 40, 
            monthlyFees: fees,
            classTeacherId: teacherId === "" ? null : teacherId,
        });
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-lg mr-2">Classes</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Add New Class
                </span>
            </div>

            <div className="p-6">
                <div className="max-w-[600px] mx-auto animate-in zoom-in-95 fade-in duration-500">
                    <button 
                        onClick={() => navigate("/classes")}
                        className="mb-6 px-5 py-1.5 bg-white border border-gray-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <ArrowLeft className="w-3 h-3" /> Back to Nodes
                    </button>

                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100/30 border border-gray-100 p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C67F2]/5 rounded-bl-[8rem] -mr-8 -mt-8"></div>
                        
                        <div className="text-center mb-10 relative z-10">
                            <div className="w-12 h-12 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-100">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Add New Class</h2>
                            <div className="flex items-center justify-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-[#5C67F2] text-[9px] font-black uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 bg-[#5C67F2] rounded-full animate-pulse"></div>
                                    Required*
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-300 text-[9px] font-black uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                                    Optional
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-8 relative z-10">
                            {/* Class Name */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Class Identity*
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Grade 4 West"
                                    value={className}
                                    onChange={e => setClassName(e.target.value)}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 placeholder-slate-200 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                />
                            </div>

                            {/* Monthly Tuition Fees */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Monthly Fees (KES)*
                                </div>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={fees}
                                    onChange={e => setFees(e.target.value)}
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 placeholder-slate-200 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                />
                                <DollarSign className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-[#5C67F2] transition-colors" />
                            </div>

                            {/* Select Class Teacher */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Class Mentor*
                                </div>
                                <select 
                                    value={teacherId}
                                    onChange={e => setTeacherId(e.target.value)}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-900 bg-white cursor-pointer font-bold text-sm transition-all shadow-sm"
                                >
                                    <option value="" disabled className="text-slate-500">Select Mentor...</option>
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

                            <div className="pt-6 flex justify-center">
                                <button 
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="h-12 px-12 bg-[#FF9A5A] hover:bg-[#FF8A40] text-white font-black rounded-full shadow-xl shadow-orange-100 flex items-center gap-2 transition-all disabled:opacity-70 tracking-widest text-xs uppercase hover:scale-105 active:scale-95"
                                >
                                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    {createMutation.isPending ? "INITIALIZING..." : "CREATE CLASS"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
