import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Search, Loader2 } from "lucide-react";
import api from "@/lib/api";

const time = (t: any) => (t ? new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function CanteenTransactions() {
    const [q, setQ] = useState("");
    const { data: rows = [], isLoading } = useQuery({ queryKey: ["canteen_sales"], queryFn: async () => (await api.get("/canteen/sales")).data || [] });
    const filtered = rows.filter((r: any) => !q || (r.studentName || "").toLowerCase().includes(q.toLowerCase()) || (r.orderNo || "").toLowerCase().includes(q.toLowerCase()));
    const total = filtered.reduce((s: number, r: any) => s + (r.total || 0), 0);

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3"><div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center text-white"><Receipt className="w-5 h-5" /></div>
                        <div><h1 className="text-xl font-black text-slate-800">Canteen Transactions</h1><p className="text-xs text-slate-500">All canteen sales &amp; wallet purchases</p></div></div>
                    <span className="px-3 py-1.5 rounded-full bg-white border border-slate-100 text-xs font-bold text-slate-500">Total: <b className="text-emerald-600">KES {total.toLocaleString()}</b></span>
                </div>

                <div className="relative max-w-sm mb-5"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search order or student…" className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" /></div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-500 text-[11px] uppercase"><th className="text-left px-5 py-3 font-black">Order</th><th className="text-left px-3 py-3 font-black">Student</th><th className="text-left px-3 py-3 font-black">Items</th><th className="text-right px-3 py-3 font-black">Total</th><th className="text-left px-3 py-3 font-black">Mode</th><th className="text-left px-5 py-3 font-black">When</th></tr></thead>
                        <tbody>
                            {isLoading ? <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" /></td></tr>
                                : filtered.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-slate-400 text-xs font-bold uppercase">No transactions yet</td></tr>
                                    : filtered.map((r: any) => (
                                        <tr key={r._id} className="border-b border-slate-50">
                                            <td className="px-5 py-3 font-bold text-slate-700">{r.orderNo}</td>
                                            <td className="px-3 py-3 text-slate-600">{r.studentName}</td>
                                            <td className="px-3 py-3 text-slate-500">{(r.items || []).map((i: any) => `${i.name}×${i.qty}`).join(", ")}</td>
                                            <td className="px-3 py-3 text-right font-black text-emerald-600">KES {Number(r.total || 0).toLocaleString()}</td>
                                            <td className="px-3 py-3"><span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{r.paymentMode}</span></td>
                                            <td className="px-5 py-3 text-slate-500">{time(r.createdAt)}</td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
