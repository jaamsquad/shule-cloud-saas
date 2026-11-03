import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { Loader2, Lock, Unlock, ArrowDownLeft, ArrowUpRight, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "./PortalShell";

interface Props {
    api: AxiosInstance;
    base: string;            // "/student-portal" | "/parent-portal"
    canManage?: boolean;     // parent: freeze + limits
    canPayFees?: boolean;    // student: pay fees from wallet
    accent?: string;
}

// Online self-service top-up isn't offered — ask the school office to credit
// the wallet after you pay them directly (cash, bank, Till/Paybill).
export default function WalletView({ api, base, canManage, canPayFees, accent = "#159a52" }: Props) {
    const qc = useQueryClient();
    const [limit, setLimit] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["wallet", base],
        queryFn: async () => (await api.get(`${base}/wallet`)).data,
        retry: false,
    });
    const wallet = data?.wallet;
    const txns: any[] = data?.transactions || [];
    const balance = Number(wallet?.balance || 0);
    const frozen = wallet && wallet.status !== "Active";

    const invalidate = () => qc.invalidateQueries({ queryKey: ["wallet", base] });

    const toggleFreeze = useMutation({
        mutationFn: async () => (await api.post(`${base}/wallet/status`, { status: frozen ? "Active" : "Frozen" })).data,
        onSuccess: () => { toast.success(frozen ? "Wallet unfrozen" : "Wallet frozen"); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const saveLimit = useMutation({
        mutationFn: async () => (await api.post(`${base}/wallet/limits`, { dailyLimit: Number(limit) || 0 })).data,
        onSuccess: () => { toast.success("Daily limit updated"); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const payFees = useMutation({
        mutationFn: async () => (await api.post(`${base}/wallet/pay-fees`, {})).data,   // backend pays only the due balance
        onSuccess: (d: any) => { toast.success(d?.message || "Fees paid from wallet"); invalidate(); qc.invalidateQueries({ queryKey: ["fees_summary", base] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Payment failed"),
    });

    if (isLoading) return <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading wallet…</div>;

    return (
        <>
            <PageTitle title="Student Wallet" />

            {/* Wallet card */}
            <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}, #0f2942)` }}>
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Wallet Balance</p>
                        <p className="text-3xl font-black mt-1">KSh {balance.toLocaleString()}</p>
                        <p className="text-white/60 text-xs mt-2 font-mono">{wallet?.walletId} · {wallet?.code}</p>
                        {frozen && <span className="inline-block mt-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{wallet.status}</span>}
                        <p className="text-white/70 text-[11px] mt-2">To top up, pay the school office directly (cash, bank, or Till/Paybill) and ask them to credit your wallet.</p>
                    </div>
                    {wallet?.code && (
                        <img alt="wallet code" className="w-20 h-20 rounded-lg bg-white p-1"
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(wallet.code)}`} />
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mt-5">
                    {canPayFees && (
                        <button onClick={() => payFees.mutate()} disabled={payFees.isPending || balance <= 0}
                            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-lg backdrop-blur disabled:opacity-50">
                            <CreditCard className="w-4 h-4" /> Pay Fees from Wallet
                        </button>
                    )}
                    {canManage && (
                        <button onClick={() => toggleFreeze.mutate()} disabled={toggleFreeze.isPending}
                            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-lg backdrop-blur">
                            {frozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} {frozen ? "Unfreeze" : "Freeze"}
                        </button>
                    )}
                </div>
            </div>

            {/* Parent controls */}
            {canManage && (
                <PanelCard title="Spending Controls">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Daily Spending Limit (KSh)</label>
                            <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder={String(wallet?.dailyLimit || 0)}
                                className="w-full h-10 px-3 border border-black/10 rounded text-sm" />
                        </div>
                        <button onClick={() => saveLimit.mutate()} disabled={saveLimit.isPending}
                            className="h-10 px-4 bg-[#0f2942] text-white text-sm font-bold rounded">Save Limit</button>
                    </div>
                </PanelCard>
            )}

            {/* Transactions */}
            <PanelCard title="Transactions">
                {txns.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-6">No transactions yet.</p>
                ) : (
                    <div className="space-y-1">
                        {txns.map((t: any) => (
                            <div key={t._id} className="flex items-center justify-between py-2.5 border-b border-black/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === "credit" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                                        {t.type === "credit" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{t.description || t.source || t.category || (t.type === "credit" ? "Top-up" : "Purchase")}</p>
                                        <p className="text-[11px] text-slate-400">{t.createdAt ? new Date(t.createdAt).toLocaleString("en-GB") : ""}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-black ${t.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>{t.type === "credit" ? "+" : "−"}KSh {Number(t.amount).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400">Bal: {Number(t.balanceAfter).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </PanelCard>
        </>
    );
}
