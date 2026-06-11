import { Home, Check, Search, ChevronDown, User, Loader2, Sparkles, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { useItems } from "@/hooks/useItems";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function PromoteStudents() {
    const { items: students, isLoading, updateItem } = useItems("students");
    const [searchTerm, setSearchTerm] = useState("");
    const [sourceClass, setSourceClass] = useState("all");
    const [targetClass, setTargetClass] = useState("");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [promoting, setPromoting] = useState(false);

    const filteredStudents = students?.filter((s: any) => {
        const matchesClass = sourceClass === "all" || s.studentClass === sourceClass;
        const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.registrationNo.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const { data: classesData = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });

    const uniqueClasses = classesData.map((cls: any) => cls.name || cls.levelName).filter(Boolean);

    // Smart Suggestion Logic - Reactive
    useEffect(() => {
        if (sourceClass !== "all" && uniqueClasses.length > 0) {
            const match = sourceClass.match(/(\d+)/);
            if (match) {
                const currentGrade = parseInt(match[0]);
                const nextGrade = currentGrade + 1;
                const suggestion = sourceClass.replace(match[0], nextGrade.toString());
                
                // If the suggested class exists in our class list, select it
                if (uniqueClasses.includes(suggestion)) {
                    setTargetClass(suggestion);
                } else {
                    setTargetClass(""); // Reset if no logical match found
                }
            }
        }
    }, [sourceClass, uniqueClasses]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudentIds(filteredStudents?.map((s: any) => s._id) || []);
        } else {
            setSelectedStudentIds([]);
        }
    };

    const toggleStudentSelection = (id: string) => {
        setSelectedStudentIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handlePromote = async () => {
        if (!targetClass) return toast.error("Please select a destination class");
        if (selectedStudentIds.length === 0) return toast.error("No students selected");

        setPromoting(true);
        try {
            await Promise.all(
                selectedStudentIds.map(id => updateItem({ id, studentClass: targetClass }))
            );
            toast.success(`Successfully promoted ${selectedStudentIds.length} students to ${targetClass}!`);
            setSelectedStudentIds([]);
        } catch (err) {
            toast.error("Promotion failed. Please try again.");
        } finally {
            setPromoting(false);
        }
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-lg mr-2">Students</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Promote Students
                </span>
            </div>

            <div className="p-6 pt-0 grid grid-cols-1 xl:grid-cols-[280px_1fr_280px] gap-6 items-start">
                {/* Column 1: Search Sidebar Card */}
                <div className="w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mt-4 animate-in fade-in slide-in-from-left-4 duration-500">
                    <h3 className="text-xl font-black text-center text-slate-800 mb-8 flex items-center justify-center gap-3">
                        <Search className="w-6 h-6 text-[#5C67F2]" />
                        Search
                    </h3>
                    
                    <div className="space-y-8">
                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-lg shadow-indigo-100">
                                SEARCH STUDENT*
                            </div>
                            <input 
                                type="text" 
                                placeholder="Name or Registration..."
                                className="w-full h-12 px-6 border border-[#5C67F2]/20 rounded-full focus:outline-none focus:border-[#5C67F2] text-slate-700 placeholder-slate-300 bg-white text-sm font-bold shadow-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-lg shadow-indigo-100">
                                SOURCE CLASS*
                            </div>
                            <select 
                                value={sourceClass}
                                onChange={(e) => setSourceClass(e.target.value)}
                                className="w-full h-12 px-6 border border-[#5C67F2]/20 rounded-full focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-white appearance-none cursor-pointer text-sm font-black shadow-sm"
                            >
                                <option value="all">All Classes</option>
                                {uniqueClasses.map((c: any) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>

                        <div className="text-center pt-2">
                            <button 
                                onClick={() => { setSearchTerm(""); setSourceClass("all"); }}
                                className="text-[#5C67F2] font-black text-xs uppercase tracking-widest hover:text-[#4a54c4] transition-colors"
                            >
                                or, Reload All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Column 2: Main Table Card */}
                <div className="w-full min-w-0 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mt-4 overflow-x-auto animate-in fade-in duration-700">
                    <div className="overflow-hidden rounded-2xl border border-slate-50 shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400">
                                <tr>
                                    <th className="px-6 py-5 font-black uppercase text-[10px] tracking-widest">ID</th>
                                    <th className="px-6 py-5 font-black uppercase text-[10px] tracking-widest">Student Name</th>
                                    <th className="px-6 py-5 font-black uppercase text-[10px] tracking-widest">Current Class</th>
                                    <th className="px-6 py-5 font-black uppercase text-[10px] tracking-widest text-center">
                                        <label className="flex items-center justify-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 rounded-lg border-slate-200 text-[#5C67F2] focus:ring-[#5C67F2] transition-all cursor-pointer" 
                                                onChange={handleSelectAll}
                                                checked={selectedStudentIds.length === filteredStudents?.length && filteredStudents?.length > 0}
                                            />
                                            <span className="text-slate-400 font-black group-hover:text-[#5C67F2] transition-colors">Select All</span>
                                        </label>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                                                <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Scanning Student Database...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredStudents && filteredStudents.length > 0 ? (
                                    filteredStudents.map((s: any) => (
                                        <tr key={s._id} className={`hover:bg-slate-50/50 transition-colors group ${selectedStudentIds.includes(s._id) ? 'bg-indigo-50/30' : ''}`}>
                                            <td className="px-6 py-6 text-slate-400 font-bold">{s.registrationNo}</td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#5C67F2] font-black text-xs shadow-sm">
                                                        {s.studentName.charAt(0)}
                                                    </div>
                                                    <span className="text-slate-800 font-black text-sm">{s.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className="px-4 py-1.5 bg-slate-50 text-slate-500 rounded-full text-[10px] font-black uppercase border border-slate-100">
                                                    {s.studentClass}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 rounded-lg border-slate-200 text-[#5C67F2] focus:ring-[#5C67F2] transition-all cursor-pointer" 
                                                    checked={selectedStudentIds.includes(s._id)}
                                                    onChange={() => toggleStudentSelection(s._id)}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <User className="w-12 h-12 text-slate-100" />
                                                <p className="text-slate-300 font-black text-xs uppercase tracking-widest">No nodes found for promotion</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Column 3: Promote in Card */}
                <div className="w-full lg:w-72 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex-shrink-0 mt-4 text-center animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-[#868DF4]/10 rounded-2xl flex items-center justify-center text-[#868DF4]">
                            <Sparkles className="w-8 h-8" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Promote in</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Bulk Move Operation</p>
                    
                    <div className="relative mb-8 text-left">
                        <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-lg shadow-indigo-100">
                            TARGET CLASS*
                        </div>
                        <select 
                            value={targetClass}
                            onChange={(e) => setTargetClass(e.target.value)}
                            className="w-full h-12 px-6 border border-[#5C67F2]/20 rounded-full focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-white appearance-none cursor-pointer text-sm font-black shadow-sm"
                        >
                            <option value="">Select Target...</option>
                            <option value="Graduated">Graduated (Exit)</option>
                            {uniqueClasses.map((c: any) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected</span>
                            <span className="text-lg font-black text-[#5C67F2]">{selectedStudentIds.length}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[#5C67F2] transition-all duration-500" 
                                style={{ width: `${(selectedStudentIds.length / (filteredStudents?.length || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <button 
                        onClick={handlePromote}
                        disabled={promoting || selectedStudentIds.length === 0}
                        className={`h-14 px-8 w-full rounded-full shadow-lg flex items-center justify-center gap-3 transition-all text-sm font-black tracking-widest ${
                            promoting || selectedStudentIds.length === 0 
                            ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed' 
                            : 'bg-[#5C67F2] hover:bg-[#4a54c4] text-white shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                    >
                        {promoting ? <Loader2 className="w-5 h-5 animate-spin" /> : <GraduationCap className="w-5 h-5" />}
                        {promoting ? 'PROMOTING...' : 'SAVE CHANGES'}
                    </button>
                </div>
            </div>
        </div>
    );
}
