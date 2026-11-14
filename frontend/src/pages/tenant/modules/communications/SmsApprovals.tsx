/**
 * Communications → Bulk SMS → Approvals: who's allowed to send SMS, whether every send
 * needs an admin's sign-off first, and the queue of messages waiting on that sign-off.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function SmsApprovals() {
    const qc = useQueryClient();
    const { data: policy, isLoading: loadingPolicy } = useQuery({
        queryKey: ["sms_policy"],
        queryFn: async () => (await api.get("/communications/sms/policy")).data,
    });
    const { data: staff = [] } = useQuery<any[]>({ queryKey: ["staff"], queryFn: async () => (await api.get("/staff")).data || [] });
    const { data: pending = [], isLoading: loadingPending } = useQuery<any[]>({
        queryKey: ["sms_approvals_pending"],
        queryFn: async () => (await api.get("/communications/sms/approvals")).data || [],
        refetchInterval: 10000,
    });

    const [allowed, setAllowed] = useState<string[] | null>(null);
    const [approvalRequired, setApprovalRequired] = useState<boolean | null>(null);
    const effAllowed = allowed ?? policy?.allowedStaffIds ?? [];
    const effRequired = approvalRequired ?? policy?.approvalRequired ?? false;
    const dirty = allowed !== null || approvalRequired !== null;

    const save = useMutation({
        mutationFn: () => api.put("/communications/sms/policy", { allowedStaffIds: effAllowed, approvalRequired: effRequired }),
        onSuccess: () => { toast.success("SMS settings saved"); qc.invalidateQueries({ queryKey: ["sms_policy"] }); setAllowed(null); setApprovalRequired(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not save"),
    });

    const decide = useMutation({
        mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) => api.post(`/communications/sms/approvals/${id}/${action}`),
        onSuccess: (_d, v) => { toast.success(v.action === "approve" ? "Approved and sent" : "Rejected"); qc.invalidateQueries({ queryKey: ["sms_approvals_pending"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not update"),
    });

    const toggleStaff = (id: string) => setAllowed([...(allowed ?? policy?.allowedStaffIds ?? [])].includes(id)
        ? (allowed ?? policy?.allowedStaffIds ?? []).filter((x: string) => x !== id)
        : [...(allowed ?? policy?.allowedStaffIds ?? []), id]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-4 h-4 text-[#5C67F2]" /><h3 className="text-sm font-semibold text-slate-800">Who can send SMS</h3></div>
                <p className="text-xs text-slate-400 mb-4">Admins can always send. Leave empty to let anyone with Communication access send.</p>
                {loadingPolicy ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : (
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto mb-4">
                        {staff.map((s: any) => {
                            const name = s.employeeName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.name || "Staff";
                            const on = effAllowed.includes(String(s._id));
                            return (
                                <button key={s._id} type="button" onClick={() => toggleStaff(String(s._id))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${on ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                                    {name}
                                </button>
                            );
                        })}
                        {!staff.length && <p className="text-xs text-slate-400">No staff found.</p>}
                    </div>
                )}
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer mb-4">
                    <input type="checkbox" checked={effRequired} onChange={e => setApprovalRequired(e.target.checked)} className="w-4 h-4" />
                    Require admin approval before every SMS is sent
                </label>
                <button disabled={!dirty || save.isPending} onClick={() => save.mutate()}
                    className="h-10 px-5 rounded-lg bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2">
                    {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Pending approval ({pending.length})</h3>
                <p className="text-xs text-slate-400 mb-4">Messages staff submitted that are waiting on your sign-off.</p>
                {loadingPending ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : !pending.length ? (
                    <p className="text-xs text-slate-400">Nothing pending.</p>
                ) : (
                    <div className="space-y-3">
                        {pending.map((p: any) => (
                            <div key={p._id} className="border border-slate-100 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-700">{p.requestedBy?.name || "Staff"} · {p.numbers?.length || 0} recipient{p.numbers?.length === 1 ? "" : "s"}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-slate-600 mb-3">{p.message}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => decide.mutate({ id: p._id, action: "approve" })} disabled={decide.isPending}
                                        className="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                                        <Check className="w-3.5 h-3.5" /> Approve & send
                                    </button>
                                    <button onClick={() => decide.mutate({ id: p._id, action: "reject" })} disabled={decide.isPending}
                                        className="h-8 px-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                                        <X className="w-3.5 h-3.5" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
