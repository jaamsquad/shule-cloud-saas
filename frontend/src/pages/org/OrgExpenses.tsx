import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wallet, Check, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { isOrgUser } from "@/lib/orgContext";

const ksh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;
const fmt = (d: any) => d ? new Date(d).toLocaleDateString("en-GB") : "—";

// Cross-branch expense approval — Org Finance Manager sees every branch's pending
// expenses and approves/rejects, writing back to the originating branch.
export default function OrgExpenses() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ["org_pending_expenses"], enabled: isOrgUser(), refetchInterval: 30000,
        queryFn: async () => (await api.get("/org/expenses/pending")).data,
    });
    const rows: any[] = data?.data || [];

    const decide = useMutation({
        mutationFn: async ({ branchId, id, decision }: any) => (await api.post(`/org/expenses/${branchId}/${id}/decision`, { decision })).data,
        onSuccess: (d: any) => { toast.success(d.message); qc.invalidateQueries({ queryKey: ["org_pending_expenses"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Wallet className="w-6 h-6 text-[#5C67F2]" /> Cross-Branch Expense Approvals</h1>
                <div className="text-sm font-bold text-slate-500">Pending total: <span className="text-rose-600">{ksh(data?.total)}</span></div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div> : rows.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 font-bold flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-400" />No pending expenses across branches</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">
                            <th className="text-left px-4 py-3 font-black">Branch</th>
                            <th className="text-left px-4 py-3 font-black">Description</th>
                            <th className="text-left px-4 py-3 font-black">Category</th>
                            <th className="text-right px-4 py-3 font-black">Amount</th>
                            <th className="text-left px-4 py-3 font-black">Date</th>
                            <th className="text-right px-4 py-3 font-black">Decision</th>
                        </tr></thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r._id} className="border-b border-slate-50">
                                    <td className="px-4 py-3 font-bold text-slate-700">{r.branchName}</td>
                                    <td className="px-4 py-3 text-slate-600">{r.description || "—"}</td>
                                    <td className="px-4 py-3 text-slate-500">{r.category || "—"}</td>
                                    <td className="px-4 py-3 text-right font-black text-slate-800">{ksh(r.amount)}</td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{fmt(r.date)}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => decide.mutate({ branchId: r.branchId, id: r._id, decision: "approved" })} className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs mr-3"><Check className="w-3.5 h-3.5" /> Approve</button>
                                        <button onClick={() => decide.mutate({ branchId: r.branchId, id: r._id, decision: "rejected" })} className="inline-flex items-center gap-1 text-rose-500 font-bold text-xs"><X className="w-3.5 h-3.5" /> Reject</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
