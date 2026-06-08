import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarCheck } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { ParentCtx } from "../ParentLayout";

export default function ParentAttendance() {
    const { api } = useOutletContext<ParentCtx>();

    const { data, isLoading } = useQuery({
        queryKey: ["parent_attendance"],
        queryFn: async () => (await api.get("/parent-portal/attendance")).data,
        retry: false,
    });

    const records = data?.records || [];

    return (
        <>
            <PageTitle title="Attendance" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { l: "Days", v: data?.total ?? 0, c: "text-slate-800" },
                    { l: "Present", v: data?.present ?? 0, c: "text-emerald-600" },
                    { l: "Absent", v: data?.absent ?? 0, c: "text-rose-600" },
                    { l: "Rate", v: `${data?.rate ?? 0}%`, c: "text-[#159a52]" },
                ].map(s => (
                    <div key={s.l} className="bg-white rounded-md shadow-sm border border-black/5 p-4 text-center">
                        <p className={`text-lg font-black ${s.c}`}>{s.v}</p>
                        <p className="text-[11px] text-slate-500 font-bold uppercase">{s.l}</p>
                    </div>
                ))}
            </div>

            <PanelCard title="Attendance History">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No attendance records yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-black/10">
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Subject</th>
                                    <th className="py-2 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r: any, i: number) => (
                                    <tr key={i} className="border-b border-black/5">
                                        <td className="py-2.5 text-slate-600">{r.date ? new Date(r.date).toLocaleDateString("en-GB") : "—"}</td>
                                        <td className="py-2.5 text-slate-500">{r.subject}</td>
                                        <td className="py-2.5 text-right">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${/present/i.test(r.status) ? "bg-emerald-100 text-emerald-700" : /late/i.test(r.status) ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </PanelCard>
        </>
    );
}
