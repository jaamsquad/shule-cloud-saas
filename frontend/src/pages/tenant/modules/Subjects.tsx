import { useState, useEffect } from "react";
import { Plus, Home, Edit2, Folder, BookOpen, X, Check, Search, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Subjects() {
    const queryClient = useQueryClient();
    const [editingClass, setEditingClass] = useState<any>(null);
    const [selectedSubjects, setSelectedSubjects] = useState<Array<{ _id: string; name: string; examMarks: number }>>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch classes for display
    const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });

    // Fetch all registered subjects
    const { data: allSubjects = [], isLoading: isLoadingSubjects } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => { const r = await api.get("/academics/subjects"); return r.data; },
    });

    // Load selected subjects when opening edit modal
    useEffect(() => {
        if (editingClass) {
            setSelectedSubjects(
                (editingClass.subjects || []).map((s: any) => ({
                    _id: s.subjectId,
                    name: s.subjectName,
                    examMarks: s.examMarks || 100
                }))
            );
        } else {
            setSelectedSubjects([]);
        }
    }, [editingClass]);

    // Update class subjects mutation
    const updateMutation = useMutation({
        mutationFn: async (data: { classId: string; subjects: any[] }) => {
            const response = await api.patch(`/academics/classes/${data.classId}`, {
                subjects: data.subjects
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["classes"] });
            toast.success("Class subjects updated successfully!");
            setEditingClass(null);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update subjects"),
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClass) return;

        updateMutation.mutate({
            classId: editingClass._id || editingClass.id,
            subjects: selectedSubjects.map(s => ({
                subjectId: s._id,
                subjectName: s.name,
                examMarks: s.examMarks
            }))
        });
    };

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
                    - Classes With Subjects
                </span>
            </div>

            <div className="p-6">
                {isLoadingClasses ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-6">
                        {classes.map((c: any) => {
                            const totalSubjects = c.subjects?.length || 0;
                            const totalMarks = c.subjects?.reduce((sum: number, s: any) => sum + (parseInt(s.examMarks) || 0), 0) || 0;
                            
                            return (
                                <div key={c._id || c.id} className="w-[260px] border border-gray-100 rounded-3xl flex flex-col p-6 bg-white shadow-sm relative hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="font-bold text-lg text-gray-700">
                                            {c.levelName} {c.streamName !== 'General' && c.streamName ? c.streamName : ''}
                                        </span>
                                        <button 
                                            onClick={() => setEditingClass(c)}
                                            className="p-1 hover:bg-slate-50 rounded-md transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5 text-[#5C67F2]" />
                                        </button>
                                    </div>
                                    
                                    <div className="absolute top-6 right-6">
                                        <Folder className="w-6 h-6 text-[#5C67F2] fill-current opacity-20" />
                                    </div>

                                    <div className="flex flex-col gap-3 mt-2">
                                        <div>
                                            <div className="text-2xl font-black text-slate-800 leading-none">{totalSubjects}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Subjects</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-[#5C67F2] leading-none">{totalMarks}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Exam Marks</div>
                                        </div>
                                    </div>

                                    <div className="mt-6 border-t border-slate-50 pt-4 flex flex-col">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Assigned Curriculum</span>
                                        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                                            {c.subjects && c.subjects.length > 0 ? (
                                                c.subjects.map((sub: any) => (
                                                    <span key={sub.subjectId} className="px-2.5 py-1 bg-indigo-50/50 border border-indigo-100/30 text-[#5C67F2] text-[10px] font-bold rounded-lg flex items-center justify-between gap-2">
                                                        <span>{sub.subjectName}</span>
                                                        <span className="bg-[#5C67F2] text-white text-[8px] px-1 rounded font-black">{sub.examMarks}</span>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs font-medium text-gray-400 italic">No subjects assigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Assign Subjects Link Card */}
                        <Link 
                            to="/subjects/assign"
                            className="w-[260px] min-h-[220px] border-2 border-dashed border-[#5C67F2]/40 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#5C67F2]/5 transition-all bg-white shadow-sm hover:border-[#5C67F2]"
                        >
                            <Plus className="w-8 h-8 text-[#5C67F2] mb-2 font-light" />
                            <span className="text-[#5C67F2] font-bold text-base">Assign Subjects</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Add to class</span>
                        </Link>
                    </div>
                )}
            </div>

            {/* ── Edit Modal ─────────────────────────────────────────── */}
            {editingClass && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100">
                        <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-[#5C67F2]" /> Edit Subjects - {editingClass.levelName} {editingClass.streamName !== 'General' && editingClass.streamName ? editingClass.streamName : ''}
                            </h3>
                            <button onClick={() => setEditingClass(null)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400 hover:text-gray-700" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-3">
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Registered Curriculum</span>
                                {/* Search Bar */}
                                <div className="relative w-48">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <input 
                                        type="text" 
                                        placeholder="Search subjects..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full h-8 pl-8 pr-3 border border-gray-200 rounded-full text-xs font-semibold focus:outline-none focus:border-[#5C67F2] bg-slate-50"
                                    />
                                </div>
                            </div>

                            {isLoadingSubjects ? (
                                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div>
                            ) : filteredSubjects.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    No registered subjects found
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 max-h-[260px] overflow-y-auto pr-1">
                                    {filteredSubjects.map((sub: any) => {
                                        const isChecked = selectedSubjects.some(s => s._id === sub._id);
                                        const currentSelection = selectedSubjects.find(s => s._id === sub._id);
                                        const marks = currentSelection ? currentSelection.examMarks : 100;
                                        
                                        return (
                                            <div 
                                                key={sub._id} 
                                                className={`border rounded-2xl p-3.5 transition-all duration-200 flex items-center justify-between ${isChecked ? 'border-[#5C67F2] bg-indigo-50/20 ring-1 ring-[#5C67F2]/10' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 bg-white'}`}
                                            >
                                                <label className="flex items-center gap-3 cursor-pointer flex-1 py-0.5">
                                                    <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${isChecked ? 'bg-[#5C67F2] border-[#5C67F2] text-white' : 'border-gray-300 bg-white'}`}>
                                                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
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
                                                        <span className="font-bold text-gray-750 text-xs">{sub.name || sub.subjectName}</span>
                                                        <span className="text-[8px] text-[#5C67F2] font-black uppercase tracking-wider mt-0.5">{sub.code || 'CORE'}</span>
                                                    </div>
                                                </label>

                                                {isChecked && (
                                                    <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Marks:</span>
                                                        <input 
                                                            type="number"
                                                            value={marks}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setSelectedSubjects(selectedSubjects.map(s => s._id === sub._id ? { ...s, examMarks: val } : s));
                                                            }}
                                                            className="w-14 h-7 px-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 text-center focus:outline-none focus:border-[#5C67F2]"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                                <button 
                                    type="button" 
                                    onClick={() => setEditingClass(null)}
                                    className="px-5 py-2.5 text-xs font-black text-gray-500 hover:bg-slate-50 rounded-full transition-colors uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="bg-[#5C67F2] hover:bg-[#4b54db] text-white px-7 py-2.5 rounded-full text-xs font-black shadow-md flex items-center gap-2 transition-colors disabled:opacity-50 uppercase tracking-wider"
                                >
                                    {updateMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
