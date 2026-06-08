import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wallet, Search, Plus, Lock, Unlock, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AdminWallets() {
    const qc = useQueryClient();
    const [studentSearch, setStudentSearch] = useState("");
    const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
    const [amount, setAmount] = useState("");
    const [limit, setLimit] = useState("");

    const { data: summary } = useQuery({ queryKey: ["wallets_summary"], queryFn: async () => (await api.get("/wallets/summary")).data });
    const { data: wallets = [] } = useQuery({ queryKey: ["wallets"], queryFn: async () => { const r = await api.get("/wallets"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: students = [] } = useQuery({ queryKey: ["students_wallet"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });

    const { data: detail } = useQuery({
        queryKey: ["wallet_detail", selected?.id],
        queryFn: async () => (await api.get(`/wallets/student/${selected!.id}`)).data,
        enabled: !!selected,
    });

    const invalidate = () => { qc.invalidateQueries({ queryKey: ["wallets"] }); qc.invalidateQueries({ queryKey: ["wallets_summary"] }); qc.invalidateQueries({ queryKey: ["wallet_detail", selected?.id] }); };

    const topup = useMutation({
        mutationFn: async () => api.post(`/wallets/student/${selected!.id}/topup`, { amount: Number(amount), source: "Cash Deposit" }),
        onSuccess: () => { toast.success("Topped up"); setAmount(""); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const freeze = useMutation({
        mutationFn: async (status: string) => api.post(`/wallets/student/${selected!.id}/status`, { status }),
        onSuccess: () => { toast.success("Status updated"); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const setLimitMut = useMutation({
        mutationFn: async () => api.post(`/wallets/student/${selected!.id}/limits`, { dailyLimit: Number(limit) || 0 }),
        onSuccess: () => { toast.success("Limit saved"); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const matches = students.filter((s: any) =>
        (s.studentName || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.registrationNo || s.admNo || "").toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 6);

    const wallet = detail?.wallet;
    const frozen = wallet && wallet.status !== "Active";

    const cards = [
        { l: "Wallets", v: summary?.wallets ?? 0 },
        { l: "Total Balance", v: `KSh ${Number(summary?.totalBalance || 0).toLocaleString()}` },
        { l: "Top-Ups", v: `KSh ${Number(summary?.topups || 0).toLocaleString()}` },
        { l: "Spending", v: `KSh ${Number(summary?.spending || 0).toLocaleString()}` },
    ];

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center"><Wallet className="w-5 h-5 text-indigo-600" /></div>
                <div><h1 className="text-xl font-black text-slate-800">Student Wallets</h1><p className="text-xs text-slate-500">Top up, freeze and track student wallets</p></div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {cards.map(c => <div key={c.l} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><p className="text-lg font-black text-slate-800">{c.v}</p><p className="text-[11px] text-slate-500 font-bold uppercase">{c.l}</p></div>)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Wallet list */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 relative">
                        <div className="flex items-center border border-gray-200 rounded-lg px-3 h-10">
                            <Search className="w-4 h-4 text-slate-300" />
                            <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search a student to manage their wallet…" className="flex-1 px-2 text-sm focus:outline-none" />
                        </div>
                        {studentSearch && matches.length > 0 && (
                            <div className="absolute z-10 left-5 right-5 mt-1 bg-white border border-slate-100 rounded-lg shadow-lg overflow-hidden">
                                {matches.map((s: any) => (
                                    <button key={s._id} onClick={() => { setSelected({ id: s._id, name: s.studentName }); setStudentSearch(""); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 text-left">
                                        <span className="font-semibold text-slate-700">{s.studentName}</span>
                                        <span className="text-xs text-slate-400">{s.registrationNo || s.admNo}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50">
                                <th className="px-5 py-3">Student</th><th className="px-5 py-3">Wallet ID</th><th className="px-5 py-3 text-right">Balance</th><th className="px-5 py-3">Status</th>
                            </tr></thead>
                            <tbody>
                                {wallets.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center text-slate-400 py-8 text-sm">No wallets yet. Search a student above to create one.</td></tr>
                                ) : wallets.map((w: any) => (
                                    <tr key={w._id} onClick={() => setSelected({ id: w.studentId, name: w.studentName })} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                                        <td className="px-5 py-3 font-bold text-slate-700">{w.studentName || w.studentId}</td>
                                        <td className="px-5 py-3 font-mono text-xs text-slate-400">{w.walletId}</td>
                                        <td className="px-5 py-3 text-right font-black text-slate-800">KSh {Number(w.balance || 0).toLocaleString()}</td>
                                        <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${w.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{w.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail panel */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    {!selected ? (
                        <p className="text-center text-slate-400 text-sm py-10">Select a student to manage their wallet.</p>
                    ) : !wallet ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
                    ) : (
                        <>
                            <p className="font-black text-slate-800">{wallet.studentName || selected.name}</p>
                            <p className="text-xs text-slate-400 font-mono mb-1">{wallet.walletId} · {wallet.code}</p>
                            <p className="text-2xl font-black text-indigo-600 mb-4">KSh {Number(wallet.balance || 0).toLocaleString()}</p>

                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Top up (KSh)</label>
                            <div className="flex gap-2 mb-3">
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-sm" />
                                <button onClick={() => topup.mutate()} disabled={topup.isPending || !amount} className="h-9 px-3 bg-emerald-500 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1 disabled:opacity-50"><Plus className="w-3.5 h-3.5" /> Add</button>
                            </div>

                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Daily limit (KSh)</label>
                            <div className="flex gap-2 mb-3">
                                <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder={String(wallet.dailyLimit || 0)} className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-sm" />
                                <button onClick={() => setLimitMut.mutate()} disabled={setLimitMut.isPending} className="h-9 px-3 bg-slate-700 text-white text-xs font-bold rounded-lg">Save</button>
                            </div>

                            <button onClick={() => freeze.mutate(frozen ? "Active" : "Frozen")} disabled={freeze.isPending}
                                className={`w-full h-9 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 ${frozen ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                                {frozen ? <><Unlock className="w-3.5 h-3.5" /> Unfreeze</> : <><Lock className="w-3.5 h-3.5" /> Freeze</>}
                            </button>

                            <div className="mt-4 border-t border-slate-100 pt-3">
                                <p className="text-[11px] font-black text-slate-500 uppercase mb-2">Recent transactions</p>
                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {(detail?.transactions || []).length === 0 ? <p className="text-xs text-slate-400">None yet.</p> : detail.transactions.map((t: any) => (
                                        <div key={t._id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                                            <span className="flex items-center gap-1.5 text-slate-600">
                                                {t.type === "credit" ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />}
                                                {t.description || t.source || t.category}
                                            </span>
                                            <span className={`font-bold ${t.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>{t.type === "credit" ? "+" : "−"}{Number(t.amount).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
