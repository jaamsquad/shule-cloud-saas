import { Home, GraduationCap, Loader2, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";

function graduationCohort(s: any): { className: string; year: string; leftAt?: string } {
    const hist = Array.isArray(s.classHistory) ? s.classHistory : [];
    const entry = [...hist].reverse().find((h: any) => h.reason === "Graduated");
    const className = entry?.className || s.statusPrevClass?.className || s.statusPrevClass?.studentClass
        || s.studentClass || s.currentClass || "Unknown Class";
    const year = entry?.academicYear || s.academicYear
        || (entry?.leftAt ? new Date(entry.leftAt).getFullYear() : new Date(s.statusChangedAt || s.updatedAt || Date.now()).getFullYear());
    return { className, year: String(year), leftAt: entry?.leftAt };
}

export default function GraduatedClassDetail() {
    const { className = "", year = "" } = useParams();
    const navigate = useNavigate();
    const decodedClass = decodeURIComponent(className);
    const decodedYear = decodeURIComponent(year);

    const { data: students = [], isLoading } = useQuery<any[]>({
        queryKey: ["graduated_students"],
        queryFn: async () => { const r = await api.get("/students", { params: { status: "Graduated" } }); return Array.isArray(r.data) ? r.data : []; },
    });

    const cohortStudents = students.filter(s => {
        const c = graduationCohort(s);
        return c.className === decodedClass && c.year === decodedYear;
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate("/classes/graduated")} className="w-7 h-7 rounded-lg border border-gray-200 text-slate-400 hover:text-[#5C67F2] hover:border-[#5C67F2] flex items-center justify-center mr-1"><ArrowLeft className="w-3.5 h-3.5" /></button>
                    <span className="font-bold text-gray-800 text-sm">Classes</span>
                    <span className="text-gray-300">|</span>
                    <Home className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-500 font-medium text-sm">- Graduated Classes - {decodedClass} Class of {decodedYear}</span>
                    <span className="ml-2 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-full border border-emerald-100">
                        {cohortStudents.length} students
                    </span>
                </div>
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Loading...</p>
                    </div>
                ) : cohortStudents.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center justify-center gap-3">
                        <GraduationCap className="w-12 h-12 text-slate-200" />
                        <p className="text-slate-400 font-bold">No graduated students found for this cohort.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                                    <th className="text-left px-5 py-3 font-black">Student</th>
                                    <th className="text-left px-3 py-3 font-black">Reg No</th>
                                    <th className="text-left px-3 py-3 font-black">Gender</th>
                                    <th className="text-left px-3 py-3 font-black">Graduated On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cohortStudents.map(s => {
                                    const { leftAt } = graduationCohort(s);
                                    return (
                                        <tr key={s._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-5 py-3">
                                                <Link to={`/students/${s._id}`} className="font-bold text-slate-700 hover:text-[#5C67F2]">
                                                    {s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim()}
                                                </Link>
                                            </td>
                                            <td className="px-3 py-3 text-slate-500">{s.registrationNo || s.admNo || "—"}</td>
                                            <td className="px-3 py-3 text-slate-500">{s.gender || "—"}</td>
                                            <td className="px-3 py-3 text-slate-500">{leftAt ? new Date(leftAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
