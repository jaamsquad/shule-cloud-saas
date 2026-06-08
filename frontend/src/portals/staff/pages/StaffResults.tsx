import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3 } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";
import { useAssignments, pairKey, parsePair } from "../useAssignments";

export default function StaffResults() {
    const { api } = useOutletContext<StaffCtx>();
    const { data: assign } = useAssignments();
    const pairs = assign?.assignments || [];
    const [pair, setPair] = useState("");
    const { className, subject } = pair ? parsePair(pair) : { className: "", subject: "" };

    const { data, isFetching } = useQuery({
        queryKey: ["staff_results", pair],
        queryFn: async () => (await api.get(`/staff-portal/results?className=${encodeURIComponent(className)}&subject=${encodeURIComponent(subject)}`)).data,
        enabled: !!pair,
        retry: false,
    });

    const students = data?.students || [];

    return (
        <>
            <PageTitle title="Results" />

            <PanelCard title="View Results by Class & Subject">
                <select value={pair} onChange={e => setPair(e.target.value)}
                    className="w-full md:w-96 h-10 px-3 border border-black/10 rounded text-sm bg-white">
                    <option value="">— Select class &amp; subject —</option>
                    {pairs.map(p => <option key={pairKey(p)} value={pairKey(p)}>{p.className} — {p.subject}</option>)}
                </select>
            </PanelCard>

            {pair && (
                <PanelCard title={`${className} — ${subject}`}
                    action={data ? <span className="text-white text-xs font-bold">Class Avg: {data.classAverage}%</span> : undefined}>
                    {isFetching ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-semibold">No results recorded for this class yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-500 border-b border-black/10">
                                        <th className="py-2">Pos</th>
                                        <th className="py-2">Student</th>
                                        <th className="py-2 text-center">Exams</th>
                                        <th className="py-2 text-right">Average</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s: any) => (
                                        <tr key={s.studentId} className="border-b border-black/5">
                                            <td className="py-2.5 font-bold text-slate-400">{s.position}</td>
                                            <td className="py-2.5 font-semibold text-slate-700">{s.name}</td>
                                            <td className="py-2.5 text-center text-slate-500">{s.examsTaken}</td>
                                            <td className="py-2.5 text-right">
                                                <span className={`font-black ${s.average >= 70 ? "text-emerald-600" : s.average >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                                                    {s.average}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </PanelCard>
            )}
        </>
    );
}
