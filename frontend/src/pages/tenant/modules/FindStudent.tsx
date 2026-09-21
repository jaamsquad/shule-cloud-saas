import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, Loader2, User, ChevronRight } from "lucide-react";
import api from "@/lib/api";

// Type a name, admission number, class or parent's phone → click the learner to open their profile.
export default function FindStudent() {
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const { data: students = [], isLoading } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : r.data?.data || []; } });

    const term = q.trim().toLowerCase();
    const matches = useMemo(() => {
        if (!term) return [];
        const words = term.split(/\s+/);
        return students.filter((s: any) => {
            const hay = `${s.studentName || s.name || ""} ${s.registrationNo || s.admNo || ""} ${s.studentClass || s.currentClass || ""} ${s.parentPhone || s.fatherPhone || s.motherPhone || ""}`.toLowerCase();
            return words.every(w => hay.includes(w));
        }).slice(0, 40);
    }, [students, term]);

    const open = (s: any) => navigate(`/students/report/${s._id}`);

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex items-center gap-2 text-sm mb-5"><Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span><span className="font-bold text-gray-600">Students</span><span className="text-gray-300">/</span><span className="font-black text-[#5C67F2]">Find Student</span></div>
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-black text-slate-900 mb-1">Find a student</h1>
                <p className="text-sm text-slate-400 mb-5">Search by name, admission number, class or parent's phone, then click the learner to open their profile.</p>
                <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
                    <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && matches.length === 1) open(matches[0]); }}
                        placeholder="Start typing a student's name…" className="w-full h-13 py-3.5 pl-12 pr-4 rounded-2xl border border-slate-200 bg-white text-base shadow-sm focus:outline-none focus:border-[#5C67F2]" />
                </div>

                <div className="mt-4">
                    {isLoading ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div>
                        : !term ? <p className="text-center text-sm text-slate-400 py-10">{students.length} students in the school. Type to search.</p>
                        : matches.length === 0 ? <p className="text-center text-sm text-slate-400 py-10">No student matches "{q}".</p>
                        : (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
                                {matches.map((s: any) => (
                                    <button key={s._id} onClick={() => open(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/60 transition-colors">
                                        {s.studentPhoto || s.photo ? <img src={s.studentPhoto || s.photo} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-indigo-50 text-[#5C67F2] flex items-center justify-center"><User className="w-5 h-5" /></div>}
                                        <div className="flex-1 min-w-0"><div className="font-bold text-slate-800 truncate">{s.studentName || s.name}</div><div className="text-xs text-slate-400">{[s.registrationNo || s.admNo, s.studentClass || s.currentClass].filter(Boolean).join(" · ") || "No class"}</div></div>
                                        {s.status && String(s.status).toLowerCase() !== "active" && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{s.status}</span>}
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    </button>
                                ))}
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}
