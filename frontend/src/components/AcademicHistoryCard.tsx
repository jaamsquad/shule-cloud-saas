import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { GraduationCap, FileText, ChevronRight } from "lucide-react";
import api from "@/lib/api";

// Academic History — lists every class a student has been in (previous classes
// after promotion + current), and the exams sat in each, each linking to that
// exam's ScholarSheet. Past-class results stay accessible forever.
export default function AcademicHistoryCard({ studentId }: { studentId: string }) {
    const { data } = useQuery({
        queryKey: ["academic_history", studentId],
        enabled: !!studentId,
        queryFn: async () => (await api.get(`/reports/student-academic-history/${studentId}`)).data,
    });
    const classes: any[] = data?.classes || [];
    if (!classes.length) return null;

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4">
                <GraduationCap className="w-4 h-4 text-[#5C67F2]" /> Academic History
            </h3>
            <div className="space-y-4">
                {classes.map((c: any) => (
                    <div key={c.className} className="border border-slate-100 rounded-2xl overflow-hidden">
                        <div className={`px-4 py-2.5 flex items-center justify-between ${c.isCurrent ? "bg-indigo-50" : "bg-slate-50"}`}>
                            <span className="text-sm font-black text-slate-700">{c.className}</span>
                            {c.isCurrent && <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-[#5C67F2] text-white rounded-full">Current</span>}
                        </div>
                        <div className="divide-y divide-slate-50">
                            {c.exams.length === 0 && <p className="px-4 py-3 text-xs text-slate-400">No exams recorded.</p>}
                            {c.exams.map((ex: any) => (
                                <Link
                                    key={ex.examId}
                                    to={`/exams/scholar-sheet?studentId=${studentId}&examId=${ex.examId}`}
                                    className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#5C67F2] flex-shrink-0" />
                                        <span className="text-xs font-bold text-slate-600 truncate">{ex.name}</span>
                                        {(ex.term || ex.year) && <span className="text-[10px] text-slate-400 flex-shrink-0">· {ex.term} {ex.year}</span>}
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#5C67F2] flex-shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
