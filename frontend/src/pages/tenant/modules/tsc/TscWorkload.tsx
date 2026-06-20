import { useQueries, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle, ArrowDown } from "lucide-react";
import { tsc } from "./tscApi";

const tone = (s: string) => /overload/i.test(s) ? "bg-rose-100 text-rose-700" : /underload/i.test(s) ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";

export default function TscWorkload() {
    const nav = useNavigate();
    const { data: teachers = [], isLoading } = useQuery({ queryKey: ["tsc_teachers"], queryFn: tsc.teachers });

    const loads = useQueries({
        queries: teachers.map((t: any) => ({ queryKey: ["tsc_workload", t._id], queryFn: () => tsc.workload(t._id), enabled: !isLoading })),
    });

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#1D4ED8]" /></div>;

    const rows = teachers.map((t: any, i: number) => ({ ...t, w: loads[i]?.data }));
    const over = rows.filter((r: any) => /overload/i.test(r.w?.status || "")).length;
    const under = rows.filter((r: any) => /underload/i.test(r.w?.status || "")).length;

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <div className="bg-white rounded-xl border border-slate-100 px-4 py-3"><div className="text-xl font-black text-rose-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {over}</div><div className="text-[11px] text-slate-400 font-bold">Overloaded</div></div>
                <div className="bg-white rounded-xl border border-slate-100 px-4 py-3"><div className="text-xl font-black text-amber-600 flex items-center gap-1"><ArrowDown className="w-4 h-4" /> {under}</div><div className="text-[11px] text-slate-400 font-bold">Underloaded</div></div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase"><th className="text-left px-4 py-3 font-black">Teacher</th><th className="text-left px-4 py-3 font-black">Lessons/Wk</th><th className="text-left px-4 py-3 font-black">Hours</th><th className="text-left px-4 py-3 font-black">Subjects</th><th className="text-left px-4 py-3 font-black">Classes</th><th className="text-left px-4 py-3 font-black">Status</th></tr></thead>
                    <tbody>
                        {rows.map((r: any) => (
                            <tr key={r._id} onClick={() => nav(`/tsc/teachers/${r._id}`)} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer">
                                <td className="px-4 py-3 font-bold text-slate-700">{r.name}</td>
                                <td className="px-4 py-3 text-slate-600">{r.w?.weeklyLessons ?? <Loader2 className="w-3 h-3 animate-spin inline" />}</td>
                                <td className="px-4 py-3 text-slate-600">{r.w?.hours ?? "—"}</td>
                                <td className="px-4 py-3 text-slate-600">{r.w?.subjects ?? "—"}</td>
                                <td className="px-4 py-3 text-slate-600">{r.w?.classes ?? "—"}</td>
                                <td className="px-4 py-3">{r.w?.status && <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${tone(r.w.status)}`}>{r.w.status}</span>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
