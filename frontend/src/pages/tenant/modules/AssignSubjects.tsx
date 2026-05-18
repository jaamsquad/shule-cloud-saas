import { useState, useEffect } from "react";
import { Plus, Home, BookOpen, Loader2, Search, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AssignSubjects() {
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedSubjects, setSelectedSubjects] = useState<Array<{ _id: string; name: string; examMarks: number }>>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Fetch classes for the dropdown
    const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });

    // Fetch all registered curriculum subjects
    const { data: allSubjects = [], isLoading: isLoadingSubjects } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => { const r = await api.get("/academics/subjects"); return r.data; },
    });

    // Load existing class subjects when selectedClass changes
    useEffect(() => {
        if (!selectedClass) {
            setSelectedSubjects([]);
            return;
        }
        const cls = classes.find((c: any) => c.id === selectedClass || c._id === selectedClass);
        if (cls && Array.isArray(cls.subjects)) {
            setSelectedSubjects(cls.subjects.map((s: any) => ({
                _id: s.subjectId,
                name: s.subjectName,
                examMarks: s.examMarks || 100
            })));
        } else {
            setSelectedSubjects([]);
        }
    }, [selectedClass, classes]);

    const assignMutation = useMutation({
        mutationFn: async (data: { classId: string; subjects: any[] }) => {
            const response = await api.patch(`/academics/classes/${data.classId}`, {
                subjects: data.subjects
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["classes"] });
            toast.success("Subjects assigned to class successfully!");
            navigate("/subjects");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to assign subjects"),
    });

    const handleAssign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass) {
            toast.warning("Please select a class first");
            return;
        }

        assignMutation.mutate({
            classId: selectedClass,
            subjects: selectedSubjects.map(s => ({
                subjectId: s._id,
                subjectName: s.name,
                examMarks: s.examMarks
            }))
        });
    };

    // Filter registered subjects by search query
    const filteredSubjects = allSubjects.filter((s: any) => 
        (s.name || s.subjectName || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-lg mr-2">Subjects</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Assign Subjects to Class
                </span>
            </div>

            <div className="p-6">
                <div className="max-w-[800px] mx-auto bg-white rounded-[2rem] shadow-xl shadow-indigo-100/30 border border-gray-100 p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C67F2]/5 rounded-bl-[8rem] -mr-8 -mt-8"></div>
                    
                    <div className="text-center mb-10 relative z-10">
                        <div className="w-12 h-12 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-100">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Assign Subjects</h2>
                        <p className="text-slate-400 text-sm mt-1">Select a class and choose curriculum subjects with active marks</p>
                    </div>

                    <form onSubmit={handleAssign} className="space-y-8 relative z-10">
                        {/* Select Class */}
                        <div className="relative group">
                            <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md uppercase">
                                Select Target Class*
                            </div>
                            <select 
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                                required
                                className="w-full h-14 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer font-bold shadow-sm"
                            >
                                <option value="" disabled>Select target class...</option>
                                {classes.map((c: any) => (
                                    <option key={c._id || c.id} value={c._id || c.id}>
                                        {c.levelName} {c.streamName !== 'General' ? c.streamName : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        {selectedClass && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                    <h3 className="font-extrabold text-slate-800 text-base">Select Subjects & Exam Marks</h3>
                                    
                                    {/* Search Subjects */}
                                    <div className="relative w-full sm:w-64">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input 
                                            type="text" 
                                            placeholder="Search registered subjects..." 
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full h-9 pl-9 pr-4 border border-gray-200 rounded-full text-xs font-semibold focus:outline-none focus:border-[#5C67F2] bg-slate-50"
                                        />
                                    </div>
                                </div>

                                {isLoadingSubjects ? (
                                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div>
                                ) : filteredSubjects.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        No registered subjects found
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                                        {filteredSubjects.map((sub: any) => {
                                            const isChecked = selectedSubjects.some(s => s._id === sub._id);
                                            const currentSelection = selectedSubjects.find(s => s._id === sub._id);
                                            const marks = currentSelection ? currentSelection.examMarks : 100;
                                            
                                            return (
                                                <div 
                                                    key={sub._id} 
                                                    className={`border rounded-2xl p-4 transition-all duration-200 flex items-center justify-between ${isChecked ? 'border-[#5C67F2] bg-indigo-50/30 ring-1 ring-[#5C67F2]/10' : 'border-gray-100 hover:border-gray-200 hover:bg-slate-50 bg-white'}`}
                                                >
                                                    <label className="flex items-center gap-3 cursor-pointer flex-1 py-1">
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isChecked ? 'bg-[#5C67F2] border-[#5C67F2] text-white' : 'border-gray-300 bg-white'}`}>
                                                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                        </div>
                                                        <input 
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedSubjects([...selectedSubjects, { _id: sub._id, name: sub.name || sub.subjectName, examMarks: 100 }]);
                                                                } else {
                                                                    setSelectedSubjects(selectedSubjects.filter(s => s._id !== sub._id));
                                                                }
                                                            }}
                                                            className="hidden"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-800 text-sm">{sub.name || sub.subjectName}</span>
                                                            <span className="text-[9px] text-[#5C67F2] font-black uppercase tracking-wider mt-0.5">{sub.code || 'CORE'}</span>
                                                        </div>
                                                    </label>

                                                    {isChecked && (
                                                        <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marks:</span>
                                                            <input 
                                                                type="number"
                                                                value={marks}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setSelectedSubjects(selectedSubjects.map(s => s._id === sub._id ? { ...s, examMarks: val } : s));
                                                                }}
                                                                className="w-16 h-8 px-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 text-center focus:outline-none focus:border-[#5C67F2]"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-6 flex justify-center border-t border-gray-50">
                            <button 
                                type="submit"
                                disabled={assignMutation.isPending || !selectedClass}
                                className="h-12 px-10 bg-[#FF9A5A] hover:bg-[#FF8A40] text-white font-bold rounded-full shadow-lg shadow-orange-200 flex items-center gap-2 transition-all disabled:opacity-50 tracking-wide text-sm"
                            >
                                {assignMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5" /> Assign Subjects
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
