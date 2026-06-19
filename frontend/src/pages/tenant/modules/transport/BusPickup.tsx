import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bus, Loader2, Search, ArrowDownToLine, ArrowUpFromLine, Bell, Clock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const time = (t: any) => (t ? new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—");

// Mark students picked up / dropped by the school bus; notifies parents on the
// channels enabled in Transport Settings.
export default function BusPickup() {
    const qc = useQueryClient();
    const [q, setQ] = useState("");
    const [zone, setZone] = useState("");

    const { data: students = [], isLoading } = useQuery({
        queryKey: ["transport_students"],
        queryFn: async () => { try { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const { data: pickups = [] } = useQuery({
        queryKey: ["transport_pickups"],
        queryFn: async () => { try { const r = await api.get("/transport/pickups"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
        refetchInterval: 20000,
    });

    // Only students assigned to a transport zone are on the bus.
    const onTransport = useMemo(() => students.filter((s: any) => s.transportZone), [students]);
    const zones = useMemo(() => Array.from(new Set(onTransport.map((s: any) => s.transportZone).filter(Boolean))), [onTransport]);

    const filtered = useMemo(() => onTransport.filter((s: any) => {
        const name = s.studentName || "";
        return (!q || `${name} ${s.registrationNo || ""}`.toLowerCase().includes(q.toLowerCase())) && (!zone || s.transportZone === zone);
    }), [onTransport, q, zone]);

    // Latest event per student today (so the row shows current state).
    const latestByStudent = useMemo(() => {
        const m: Record<string, any> = {};
        pickups.forEach((p: any) => { if (!m[p.studentId]) m[p.studentId] = p; });
        return m;
    }, [pickups]);

    const mark = useMutation({
        mutationFn: async ({ student, type }: { student: any; type: "pickup" | "drop" }) =>
            (await api.post("/transport/pickup", { studentId: student._id, studentName: student.studentName, type, busName: student.transportZone })).data,
        onSuccess: (d: any) => {
            const via = (d.notified || []).join(", ");
            toast.success(via ? `Recorded — parent notified via ${via}` : "Recorded");
            qc.invalidateQueries({ queryKey: ["transport_pickups"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white"><Bus className="w-6 h-6" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">Bus Pickup & Drop</h1><p className="text-xs text-slate-500">Mark students picked up or dropped — parents are notified automatically</p></div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student…" className="w-full h-10 pl-10 pr-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" /></div>
                    <select value={zone} onChange={(e) => setZone(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]">
                        <option value="">All zones</option>
                        {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#5C67F2]" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">No students on transport{zone ? ` in ${zone}` : ""}</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                <th className="py-3 px-4">Student</th><th className="py-3 px-4">Zone</th><th className="py-3 px-4">Today</th><th className="py-3 px-4 text-right">Action</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((s: any) => {
                                    const last = latestByStudent[s._id];
                                    return (
                                        <tr key={s._id} className="hover:bg-slate-50/50">
                                            <td className="py-3 px-4 font-bold text-slate-800">{s.studentName}<div className="text-[10px] text-slate-400 font-normal">{s.registrationNo || s.admNo || ""}</div></td>
                                            <td className="py-3 px-4 text-slate-500">{s.transportZone}</td>
                                            <td className="py-3 px-4">
                                                {last ? (
                                                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${last.type === "pickup" ? "text-emerald-600" : "text-amber-600"}`}>
                                                        <Clock className="w-3 h-3" /> {last.type === "pickup" ? "Picked up" : "Dropped"} {time(last.at)}
                                                    </span>
                                                ) : <span className="text-slate-300 text-xs">—</span>}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => mark.mutate({ student: s, type: "pickup" })} disabled={mark.isPending}
                                                        className="h-8 px-3 rounded-lg text-[11px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 disabled:opacity-50">
                                                        <ArrowUpFromLine className="w-3.5 h-3.5" /> Pick up
                                                    </button>
                                                    <button onClick={() => mark.mutate({ student: s, type: "drop" })} disabled={mark.isPending}
                                                        className="h-8 px-3 rounded-lg text-[11px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 disabled:opacity-50">
                                                        <ArrowDownToLine className="w-3.5 h-3.5" /> Drop
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Notification channels are configured in Transport → Settings.</p>
            </div>
        </div>
    );
}
