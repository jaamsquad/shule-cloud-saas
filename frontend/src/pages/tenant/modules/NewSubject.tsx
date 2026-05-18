import { useState } from "react";
import { Plus, Home, BookOpen, ArrowLeft, Loader2, Sparkles, LayoutGrid, Type } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

export default function NewSubject() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [category, setCategory] = useState("Core");

    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/subjects", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Subject node initialized successfully!");
            navigate("/subjects/all");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create subject"),
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        createMutation.mutate({ 
            name: name.trim(), 
            code: code.trim(),
            category
        });
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-lg mr-2">Subjects</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Add New Subject
                </span>
            </div>

            <div className="p-6">
                <div className="max-w-[600px] mx-auto animate-in zoom-in-95 fade-in duration-500">
                    <button 
                        onClick={() => navigate("/subjects/all")}
                        className="mb-6 px-5 py-1.5 bg-white border border-gray-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <ArrowLeft className="w-3 h-3" /> Back to Nodes
                    </button>

                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100/30 border border-gray-100 p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C67F2]/5 rounded-bl-[8rem] -mr-8 -mt-8"></div>
                        
                        <div className="text-center mb-10 relative z-10">
                            <div className="w-12 h-12 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-100">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">New Subject Node</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Initialize Curriculum Unit</p>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-8 relative z-10">
                            {/* Subject Name */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Subject Name*
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Mathematics"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 placeholder-slate-200 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                />
                                <Type className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-[#5C67F2] transition-colors" />
                            </div>

                            {/* Subject Code */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Subject Code*
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g. MATH101"
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    required
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 placeholder-slate-200 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                />
                                <Sparkles className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-[#5C67F2] transition-colors" />
                            </div>

                            {/* Subject Category */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md shadow-indigo-100 uppercase">
                                    Classification*
                                </div>
                                <select 
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-900 bg-slate-50/50 appearance-none cursor-pointer font-bold text-sm transition-all focus:bg-white focus:shadow-inner"
                                >
                                    <option value="Core" className="text-slate-900">Core / Compulsory</option>
                                    <option value="Elective" className="text-slate-900">Elective / Optional</option>
                                    <option value="Vocational" className="text-slate-900">Vocational / Skill-Based</option>
                                    <option value="Extracurricular" className="text-slate-900">Extracurricular</option>
                                </select>
                                <LayoutGrid className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-[#5C67F2] pointer-events-none transition-colors" />
                            </div>

                            <div className="pt-6 flex justify-center">
                                <button 
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="h-12 px-12 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-xl shadow-indigo-100 flex items-center gap-2 transition-all disabled:opacity-70 tracking-widest text-xs uppercase hover:scale-105 active:scale-95"
                                >
                                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    {createMutation.isPending ? "INITIALIZING..." : "CREATE SUBJECT"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
