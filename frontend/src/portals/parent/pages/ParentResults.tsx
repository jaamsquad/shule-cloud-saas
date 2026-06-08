import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Award } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { ParentCtx } from "../ParentLayout";

export default function ParentResults() {
    const { api } = useOutletContext<ParentCtx>();

    const { data = [], isLoading } = useQuery({
        queryKey: ["parent_results"],
        queryFn: async () => {
            const r = await api.get("/parent-portal/exam-results");
            return Array.isArray(r.data) ? r.data : [];
        },
        retry: false,
    });

    return (
        <>
            <PageTitle title="Exam Results" />
            <PanelCard title="Examination Performance">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No exam results published yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.map((exam: any) => (
                            <div key={exam.examId} className="border border-black/10 rounded-md overflow-hidden">
                                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{exam.examName}</p>
                                        <p className="text-xs text-slate-500">{exam.term} {exam.academicYear}</p>
                                    </div>
                                    <span className="text-lg font-black text-[#159a52]">{Number(exam.average || 0).toFixed(1)}%</span>
                                </div>
                                {exam.subjects?.length > 0 && (
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {exam.subjects.map((sub: any, i: number) => (
                                                <tr key={i} className="border-t border-black/5">
                                                    <td className="py-2 px-4 text-slate-700">{sub.name}</td>
                                                    <td className="py-2 px-4 text-right text-slate-600">{sub.marks}/{sub.outOf}</td>
                                                    <td className="py-2 px-4 text-right w-16 font-bold text-[#b08642]">{sub.grade}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </PanelCard>
        </>
    );
}
