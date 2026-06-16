import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function TripParticipants() {
    const qc = useQueryClient();
    const { data: rows = [], isLoading } = useQuery({
        queryKey: ["trip_participants"],
        queryFn: async () => { try { const r = await api.get("/trip-participants"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const confirm = useMutation({
        mutationFn: async (id: string) => api.patch(`/trip-participants/${id}`, { paid: true, status: "confirmed" }),
        onSuccess: () => { toast.success("Marked as paid / confirmed"); qc.invalidateQueries({ queryKey: ["trip_participants"] }); },
    });
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white"><Users className="w-6 h-6" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">Trip Participants</h1><p className="text-xs text-slate-500">Confirmed & pending students per trip</p></div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-3 px-4">Student</th><th className="py-3 px-4">Class</th><th className="py-3 px-4">Trip</th><th className="py-3 px-4">Fee</th><th className="py-3 px-4">Paid</th><th className="py-3 px-4">Status</th><th className="py-3 px-4" />
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center text-slate-400 text-xs font-bold uppercase">No participants yet</td></tr>
                            ) : rows.map((r: any) => (
                                <tr key={r._id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 font-bold text-slate-800">{r.studentName || "—"}</td>
                                    <td className="py-3 px-4 text-slate-500">{r.studentClass || "—"}</td>
                                    <td className="py-3 px-4">{r.tripName}</td>
                                    <td className="py-3 px-4">KSh {Number(r.fee || 0).toLocaleString()}</td>
                                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.paid ? "Yes" : "No"}</span></td>
                                    <td className="py-3 px-4 text-slate-600">{(r.status || "").replace(/_/g, " ")}</td>
                                    <td className="py-3 px-4">{!r.paid && r.status !== "declined" && <button onClick={() => confirm.mutate(r._id)} className="h-8 px-3 bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Confirm</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
