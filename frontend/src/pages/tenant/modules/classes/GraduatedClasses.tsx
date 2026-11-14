import { Home, GraduationCap, Loader2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

// A graduated student's class/year at the time they left is recorded in
// classHistory (reason: "Graduated") — statusPrevClass only snapshots the
// class fields, not the academic year, so classHistory is the source of truth.
function graduationCohort(s: any): { className: string; year: string } {
    const hist = Array.isArray(s.classHistory) ? s.classHistory : [];
    const entry = [...hist].reverse().find((h: any) => h.reason === "Graduated");
    const className = entry?.className || s.statusPrevClass?.className || s.statusPrevClass?.studentClass
        || s.studentClass || s.currentClass || "Unknown Class";
    const year = entry?.academicYear || s.academicYear
        || (entry?.leftAt ? new Date(entry.leftAt).getFullYear() : new Date(s.statusChangedAt || s.updatedAt || Date.now()).getFullYear());
    return { className, year: String(year) };
}

export default function GraduatedClasses() {
    const navigate = useNavigate();
    const { data: students = [], isLoading } = useQuery<any[]>({
        queryKey: ["graduated_students"],
        queryFn: async () => { const r = await api.get("/students", { params: { status: "Graduated" } }); return Array.isArray(r.data) ? r.data : []; },
    });

    const cohorts = new Map<string, { className: string; year: string; count: number }>();
    students.forEach(s => {
        const { className, year } = graduationCohort(s);
        const key = `${className}__${year}`;
        const existing = cohorts.get(key);
        if (existing) existing.count += 1;
        else cohorts.set(key, { className, year, count: 1 });
    });
    const sortedCohorts = Array.from(cohorts.values()).sort((a, b) => Number(b.year) - Number(a.year) || a.className.localeCompare(b.className));

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">Classes</span>
                    <span className="text-gray-300">|</span>
                    <Home className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-500 font-medium text-sm">- Graduated Classes</span>
                    <span className="ml-2 px-2.5 py-0.5 bg-indigo-50 text-[#5C67F2] text-[9px] font-black uppercase rounded-full border border-indigo-100">
                        {sortedCohorts.length} cohorts
                    </span>
                </div>
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Loading graduated classes...</p>
                    </div>
                ) : sortedCohorts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center justify-center gap-3">
                        <GraduationCap className="w-12 h-12 text-slate-200" />
                        <p className="text-slate-400 font-bold">No graduated classes yet.</p>
                        <p className="text-xs text-slate-300 max-w-sm text-center">When students are marked "Graduated" from Manage Student, their class and year appear here as a cohort.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {sortedCohorts.map(c => (
                            <div key={`${c.className}__${c.year}`}
                                onClick={() => navigate(`/classes/graduated/${encodeURIComponent(c.className)}/${encodeURIComponent(c.year)}`)}
                                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col hover:shadow-lg transition-all group cursor-pointer">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-full border border-emerald-100">Graduated</span>
                                </div>
                                <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug">{c.className}</h3>
                                <p className="text-xs font-bold text-slate-400 mb-4">Class of {c.year}</p>
                                <div className="mt-auto flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                    <Users className="w-3.5 h-3.5" /> {c.count} student{c.count === 1 ? "" : "s"}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
