import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { isOrgUser } from "@/lib/orgContext";

const fmt = (d: any) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// Organization audit trail — every transfer, finance and admin action with the
// user, branch, IP, device, and before/after values.
export default function OrgAudit() {
    const { data: rows = [], isLoading } = useQuery({
        queryKey: ["org_audit"], enabled: isOrgUser(),
        queryFn: async () => (await api.get("/org/audit", { params: { limit: 500 } })).data,
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-5"><ShieldCheck className="w-6 h-6 text-[#5C67F2]" /> Audit Trail</h1>
            {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div> : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">
                                <th className="text-left px-4 py-3 font-black">When</th>
                                <th className="text-left px-4 py-3 font-black">Action</th>
                                <th className="text-left px-4 py-3 font-black">User</th>
                                <th className="text-left px-4 py-3 font-black">Old → New</th>
                                <th className="text-left px-4 py-3 font-black">IP / Device</th>
                            </tr></thead>
                            <tbody>
                                {rows.map((r: any) => (
                                    <tr key={r._id} className="border-b border-slate-50 align-top">
                                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmt(r.ts)}</td>
                                        <td className="px-4 py-3"><span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{r.action}</span></td>
                                        <td className="px-4 py-3 font-bold text-slate-700">{r.userName || r.userId || "—"}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {r.oldValue ? <span className="text-rose-500">{JSON.stringify(r.oldValue)}</span> : null}
                                            {r.oldValue && r.newValue ? " → " : ""}
                                            {r.newValue ? <span className="text-emerald-600">{JSON.stringify(r.newValue)}</span> : null}
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-slate-400">{r.ip}<br />{String(r.device || "").slice(0, 40)}</td>
                                    </tr>
                                ))}
                                {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 font-bold">No audit entries yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
