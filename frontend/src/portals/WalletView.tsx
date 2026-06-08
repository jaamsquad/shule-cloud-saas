import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { Loader2, Wallet as WalletIcon, Plus, Lock, Unlock, X, ArrowDownLeft, ArrowUpRight, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "./PortalShell";

interface Props {
    api: AxiosInstance;
    base: string;            // "/student-portal" | "/parent-portal"
    canManage?: boolean;     // parent: freeze + limits
    canPayFees?: boolean;    // student: pay fees from wallet
    accent?: string;
}

export default function WalletView({ api, base, canManage, canPayFees, accent = "#159a52" }: Props) {
    const qc = useQueryClient();
    const [topup, setTopup] = useState(false);
    const [amount, setAmount] = useState("");
    const [reference, setReference] = useState("");
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

    const doTopup = useMutation({
        mutationFn: async () => (await api.post(`${base}/wallet/topup`, { amount: Number(amount), source: "M-PESA", reference })).data,
        onSuccess: () => { toast.success("Wallet topped up"); setTopup(false); setAmount(""); setReference(""); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Top-up failed"),
    });
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
        mutationFn: async () => (await api.post(`${base}/wallet/pay-fees`, { amount: Number(amount) })).data,
        onSuccess: () => { toast.success("Paid from wallet"); setTopup(false); setAmount(""); invalidate(); },
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
                    </div>
                    {wallet?.code && (
                        <img alt="wallet code" className="w-20 h-20 rounded-lg bg-white p-1"
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(wallet.code)}`} />
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mt-5">
                    <button onClick={() => { setTopup(true); setAmount(""); }} className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-lg backdrop-blur">
                        <Plus className="w-4 h-4" /> Top Up
                    </button>
                    {canPayFees && (
                        <button onClick={() => { setTopup(false); setAmount(String(balance)); payFees.mutate(); }} disabled={payFees.isPending || balance <= 0}
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

            {/* Top-up modal */}
            {topup && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-slate-800">Top Up Wallet</h3>
                            <button onClick={() => setTopup(false)} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-3 text-[11px] text-green-700">
                            Pay to Paybill <strong>123456</strong>, Account <strong>{wallet?.code}</strong>, then enter the amount &amp; M-PESA code.
                        </div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Amount (KSh)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mb-3" />
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">M-PESA Code</label>
                        <input value={reference} onChange={e => setReference(e.target.value)} placeholder="RGH2XXXXX" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mb-4" />
                        <button onClick={() => doTopup.mutate()} disabled={doTopup.isPending || !amount}
                            className="w-full py-3 text-white font-black text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: accent }}>
                            {doTopup.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <WalletIcon className="w-5 h-5" />} Top Up KSh {Number(amount || 0).toLocaleString()}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
