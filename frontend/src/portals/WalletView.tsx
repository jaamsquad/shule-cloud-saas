import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { Loader2, Wallet as WalletIcon, Plus, Lock, Unlock, X, ArrowDownLeft, ArrowUpRight, CreditCard, Phone, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "./PortalShell";

interface Props {
    api: AxiosInstance;
    base: string;            // "/student-portal" | "/parent-portal"
    canManage?: boolean;     // parent: freeze + limits
    canPayFees?: boolean;    // student: pay fees from wallet
    accent?: string;
}

type Stage = "form" | "sending" | "waiting" | "success" | "failed";

export default function WalletView({ api, base, canManage, canPayFees, accent = "#159a52" }: Props) {
    const qc = useQueryClient();
    const [topup, setTopup] = useState(false);
    const [amount, setAmount] = useState("");
    const [phone, setPhone] = useState("");
    const [limit, setLimit] = useState("");
    const [stage, setStage] = useState<Stage>("form");
    const [message, setMessage] = useState("");
    const pollRef = useRef<any>(null);

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

    useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

    const openTopup = () => { setTopup(true); setAmount(""); setPhone(""); setStage("form"); setMessage(""); };
    const closeTopup = () => { if (pollRef.current) clearTimeout(pollRef.current); setTopup(false); setStage("form"); };

    const pollTopup = (cid: string, attempt: number) => {
        if (attempt > 20) { setStage("failed"); setMessage("Timed out. If you completed the payment, your wallet will update shortly."); return; }
        pollRef.current = setTimeout(async () => {
            try {
                const r = await api.get(`${base}/mpesa-status?checkoutRequestId=${encodeURIComponent(cid)}`);
                const st = r.data?.status;
                if (st === "completed") { setStage("success"); invalidate(); return; }
                if (st === "failed") { setStage("failed"); setMessage(r.data?.message || "Payment was cancelled or failed."); return; }
            } catch { /* keep polling */ }
            pollTopup(cid, attempt + 1);
        }, 3000);
    };

    const startTopup = async () => {
        if (!amount || Number(amount) <= 0 || !phone) return;
        setStage("sending"); setMessage("");
        try {
            const r = await api.post(`${base}/wallet/topup`, { phone, amount: Number(amount) });
            setMessage(r.data?.message || "Enter your M-PESA PIN on your phone to top up.");
            setStage("waiting");
            pollTopup(r.data.checkoutRequestId, 0);
        } catch (e: any) {
            setStage("failed");
            setMessage(e.response?.data?.message || "Could not start the M-PESA top-up.");
        }
    };
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
                    </div>
                    {wallet?.code && (
                        <img alt="wallet code" className="w-20 h-20 rounded-lg bg-white p-1"
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(wallet.code)}`} />
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mt-5">
                    <button onClick={openTopup} className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-lg backdrop-blur">
                        <Plus className="w-4 h-4" /> Top Up
                    </button>
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

            {/* Top-up modal — M-PESA STK Push */}
            {topup && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-500" />
                        {stage === "success" ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-9 h-9 text-white" /></div>
                                <h3 className="text-xl font-black text-slate-800 mb-1">Wallet Topped Up!</h3>
                                <p className="text-slate-500 text-xs mb-6">Your wallet balance has been updated.</p>
                                <button onClick={closeTopup} className="w-full py-3 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-lg">Done</button>
                            </div>
                        ) : (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><img src="/payments/mpesa.svg" alt="M-PESA" className="h-5" /> Top Up Wallet</h3>
                                    <button onClick={closeTopup} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                                </div>

                                {stage === "waiting" ? (
                                    <div className="text-center py-6">
                                        <Loader2 className="w-10 h-10 animate-spin text-green-500 mx-auto mb-3" />
                                        <p className="font-bold text-slate-700 text-sm">Check your phone</p>
                                        <p className="text-xs text-slate-500 mt-1">{message}</p>
                                        <p className="text-[11px] text-slate-400 mt-3">Waiting for confirmation…</p>
                                    </div>
                                ) : stage === "failed" ? (
                                    <div className="text-center py-4">
                                        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-6 h-6 text-rose-500" /></div>
                                        <p className="text-sm font-bold text-slate-700">Top-up not completed</p>
                                        <p className="text-xs text-slate-500 mt-1 mb-4">{message}</p>
                                        <button onClick={() => setStage("form")} className="w-full py-2.5 bg-green-500 text-white font-bold text-xs rounded-lg">Try Again</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-3 text-[11px] text-green-700">
                                            Enter your M-PESA phone and amount. You'll get a prompt on your phone to enter your PIN.
                                        </div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Amount (KSh)</label>
                                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mb-3" />
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">M-PESA Phone</label>
                                        <div className="relative mb-4">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678" className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                        <button onClick={startTopup} disabled={stage === "sending" || !amount || !phone}
                                            className="w-full py-3 text-white font-black text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: accent }}>
                                            {stage === "sending" ? <Loader2 className="w-5 h-5 animate-spin" /> : <WalletIcon className="w-5 h-5" />} Top Up KSh {Number(amount || 0).toLocaleString()}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
