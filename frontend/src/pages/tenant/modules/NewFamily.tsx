import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Home, Users, UserPlus, Search, Check, X, ArrowRight, 
    ArrowLeft, Save, Plus, Trash2, Mail, Phone, MapPin, 
    Shield, Briefcase, GraduationCap
} from "lucide-react";
import { useItems } from "@/hooks/useItems";
import api from "@/lib/api";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function NewFamily() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // Form State
    const [familyName, setFamilyName] = useState("");
    const [address, setAddress] = useState("");
    const [guardians, setGuardians] = useState([
        { type: "Father", name: "", phone: "", email: "", occupation: "", isPrimary: true }
    ]);
    const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    
    // Fetch students for selection
    const { items: allStudents } = useItems("students");
    
    const filteredStudents = allStudents?.filter((s: any) => 
        (s.studentName || `${s.firstName} ${s.lastName}`).toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.registrationNo || s.studentId)?.toLowerCase().includes(studentSearch.toLowerCase())
    ).slice(0, 5);

    const submitMutation = useMutation({
        mutationFn: async (payload: any) => api.post("/families", payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["families"] });
            toast.success("Family created and students linked successfully");
            navigate("/students/families");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create family")
    });

    const handleSubmit = () => {
        if (!familyName) return toast.error("Family Name is required");
        if (selectedStudents.length === 0) return toast.error("At least one student must be linked");
        
        submitMutation.mutate({
            familyName,
            address,
            guardians,
            studentIds: selectedStudents.map(s => s._id),
            studentNames: selectedStudents.map(s => s.studentName || `${s.firstName} ${s.lastName}`)
        });
    };

    const addGuardian = () => {
        setGuardians([...guardians, { type: "Mother", name: "", phone: "", email: "", occupation: "", isPrimary: false }]);
    };

    const removeGuardian = (index: number) => {
        setGuardians(guardians.filter((_, i) => i !== index));
    };

    const togglePrimary = (index: number) => {
        setGuardians(guardians.map((g, i) => ({ ...g, isPrimary: i === index })));
    };

    const addStudent = (student: any) => {
        if (selectedStudents.find(s => s._id === student._id)) return;
        setSelectedStudents([...selectedStudents, student]);
        setStudentSearch("");
    };

    const removeStudent = (id: string) => {
        setSelectedStudents(selectedStudents.filter(s => s._id !== id));
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20">
            {/* Header / Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Students</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-600 font-bold">Families</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">New Family Entry</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="px-4 py-2 text-gray-400 hover:text-gray-600 font-bold text-sm flex items-center gap-2">
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending}
                        className="px-8 py-2.5 bg-[#5C67F2] text-white rounded-full font-bold text-sm shadow-lg shadow-indigo-100 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        {submitMutation.isPending ? "Creating..." : <><Save className="w-4 h-4" /> Save Family Node</>}
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-4 pt-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    
                    {/* Left Column: Family & Guardians */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100/20 border border-slate-50 overflow-hidden">
                            <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white shadow-lg">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Family Particulars</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Define institutional family grouping</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-10 grid grid-cols-2 gap-8">
                                <div className="relative group col-span-2">
                                    <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Family Name (Node Name)*</div>
                                    <input 
                                        type="text" 
                                        value={familyName}
                                        onChange={(e) => setFamilyName(e.target.value)}
                                        placeholder="e.g. The Mohamed Family"
                                        className="w-full h-14 px-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all shadow-inner"
                                    />
                                </div>
                                <div className="relative group col-span-2">
                                    <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Family Address</div>
                                    <div className="relative">
                                        <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input 
                                            type="text" 
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Physical residential address"
                                            className="w-full h-14 pl-14 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guardians Section */}
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100/20 border border-slate-50 overflow-hidden">
                            <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Parental Nodes</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Assign primary and secondary guardians</p>
                                    </div>
                                </div>
                                <button onClick={addGuardian} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-10 space-y-10">
                                {guardians.map((g, i) => (
                                    <div key={i} className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 relative group animate-in fade-in slide-in-from-top-2 duration-300">
                                        {guardians.length > 1 && (
                                            <button onClick={() => removeGuardian(i)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        
                                        <div className="grid grid-cols-2 gap-8 mt-2">
                                            <div className="relative group">
                                                <div className="absolute -top-3 left-6 bg-slate-200 text-slate-600 text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 uppercase">Relationship</div>
                                                <select 
                                                    value={g.type}
                                                    onChange={(e) => setGuardians(guardians.map((item, idx) => idx === i ? { ...item, type: e.target.value } : item))}
                                                    className="w-full h-12 px-6 bg-white border border-slate-100 rounded-xl text-slate-700 font-bold text-xs focus:outline-none focus:border-[#5C67F2] transition-all appearance-none"
                                                >
                                                    <option>Father</option>
                                                    <option>Mother</option>
                                                    <option>Brother</option>
                                                    <option>Sister</option>
                                                    <option>Guardian</option>
                                                </select>
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute -top-3 left-6 bg-slate-200 text-slate-600 text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 uppercase">Guardian Name*</div>
                                                <input 
                                                    type="text" 
                                                    value={g.name}
                                                    onChange={(e) => setGuardians(guardians.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item))}
                                                    className="w-full h-12 px-6 bg-white border border-slate-100 rounded-xl text-slate-700 font-bold text-xs focus:outline-none focus:border-[#5C67F2] transition-all"
                                                />
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute -top-3 left-6 bg-slate-200 text-slate-600 text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 uppercase">Phone Number*</div>
                                                <input 
                                                    type="text" 
                                                    value={g.phone}
                                                    onChange={(e) => setGuardians(guardians.map((item, idx) => idx === i ? { ...item, phone: e.target.value } : item))}
                                                    className="w-full h-12 px-6 bg-white border border-slate-100 rounded-xl text-slate-700 font-bold text-xs focus:outline-none focus:border-[#5C67F2] transition-all"
                                                />
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute -top-3 left-6 bg-slate-200 text-slate-600 text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 uppercase">Email Address</div>
                                                <input 
                                                    type="email" 
                                                    value={g.email}
                                                    onChange={(e) => setGuardians(guardians.map((item, idx) => idx === i ? { ...item, email: e.target.value } : item))}
                                                    className="w-full h-12 px-6 bg-white border border-slate-100 rounded-xl text-slate-700 font-bold text-xs focus:outline-none focus:border-[#5C67F2] transition-all"
                                                />
                                            </div>
                                            <div className="col-span-2 flex items-center justify-between pt-4">
                                                <button 
                                                    onClick={() => togglePrimary(i)}
                                                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                        g.isPrimary 
                                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" 
                                                        : "bg-white text-slate-400 border border-slate-100 hover:text-emerald-500 hover:border-emerald-100"
                                                    }`}
                                                >
                                                    {g.isPrimary ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                                    {g.isPrimary ? "Primary Guardian" : "Set as Primary"}
                                                </button>
                                                <div className="flex items-center gap-3">
                                                    <Briefcase className="w-4 h-4 text-slate-300" />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Occupation"
                                                        value={g.occupation}
                                                        onChange={(e) => setGuardians(guardians.map((item, idx) => idx === i ? { ...item, occupation: e.target.value } : item))}
                                                        className="h-10 bg-transparent border-b border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:border-[#5C67F2] transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Linked Students */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100/20 border border-slate-50 p-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Bind Siblings</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Add students to this family</p>
                                </div>
                            </div>

                            {/* Student Search */}
                            <div className="relative mb-8 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#5C67F2] transition-colors" />
                                <input 
                                    type="text" 
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    placeholder="Search by name or ID..."
                                    className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700 transition-all"
                                />
                                
                                {studentSearch.length >= 2 && filteredStudents && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        {filteredStudents.map((s: any) => (
                                            <div 
                                                key={s._id}
                                                onClick={() => addStudent(s)}
                                                className="px-4 py-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between group transition-all"
                                            >
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-800 uppercase group-hover:text-[#5C67F2] transition-colors">{s.studentName || `${s.firstName} ${s.lastName}`}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">{s.registrationNo || s.studentId} · {s.studentClass}</p>
                                                </div>
                                                <Plus className="w-4 h-4 text-slate-300 group-hover:text-[#5C67F2] group-hover:scale-125 transition-all" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Students List */}
                            <div className="space-y-3">
                                {selectedStudents.length === 0 ? (
                                    <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <UserPlus className="w-10 h-10 text-slate-100 mb-4" />
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No students linked</p>
                                    </div>
                                ) : (
                                    selectedStudents.map((s) => (
                                        <div key={s._id} className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl flex items-center justify-between group animate-in zoom-in-95">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#5C67F2] font-black text-[10px] shadow-sm">
                                                    {(s.studentName || s.firstName)[0]}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-700 uppercase">{s.studentName || `${s.firstName} ${s.lastName}`}</p>
                                                    <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-tight">{s.registrationNo || s.studentId}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeStudent(s._id)} className="w-8 h-8 rounded-full flex items-center justify-center text-rose-300 hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-[#1E293B] rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-200">
                            <h3 className="text-lg font-black uppercase tracking-tight mb-6">Institutional Summary</h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center pb-4 border-b border-slate-700">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Siblings</span>
                                    <span className="text-xl font-black">{selectedStudents.length}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-slate-700">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guardians</span>
                                    <span className="text-xl font-black">{guardians.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Contact</span>
                                    <span className="text-[10px] font-black uppercase bg-[#5C67F2] px-3 py-1 rounded-full">
                                        {guardians.find(g => g.isPrimary)?.name || "Not Set"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
