/**
 * Money received, one row per receipt (fee payments + other income): click a row to see who
 * paid, what for, and how (M-PESA, cash, bank…). Server: GET /accounts/revenue (lib/revenueLedger).
 */
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import api from "@/lib/api";

export interface RevenueRow { id: string; kind: "fee" | "income"; date: string; amount: number; mode: string; reference: string; source: string; description: string; details: Record<string, any> }
export interface RevenueData { total: number; fees: number; otherIncome: number; byMode: { mode: string; amount: number; count: number }[]; rows: RevenueRow[] }

export const ksh = (n: any) => `KSh ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const MODE_TONE: Record<string, string> = { "M-PESA": "bg-emerald-100 text-emerald-700", Cash: "bg-amber-100 text-amber-700", Bank: "bg-sky-100 text-sky-700", "Bank transfer": "bg-sky-100 text-sky-700", Cheque: "bg-indigo-100 text-indigo-700", Sponsor: "bg-fuchsia-100 text-fuchsia-700", Wallet: "bg-teal-100 text-teal-700" };
export const ModeBadge = ({ mode }: { mode: string }) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${MODE_TONE[mode] || "bg-slate-100 text-slate-600"}`}>{mode}</span>;

export function useRevenue(from: string, to: string) {
    return useQuery<RevenueData>({
        queryKey: ["revenue_ledger", from, to],
        queryFn: async () => (await api.get("/accounts/revenue", { params: { from, to } })).data,
    });
}

/** The details shown when a revenue row is opened. */
export function RevenueDetails({ r }: { r: RevenueRow }) {
    const d = r.details || {};
    const items: [string, any][] = r.kind === "fee"
        ? [["Paid by / for", d.student], ["Adm No", d.admNo], ["Class", d.className], ["Payment mode", r.mode], ["Reference / code", r.reference], ["Receipt No", d.receiptNo], ["Invoice", d.invoiceNo], ["Invoice covers", d.invoiceFor], ["Payer phone", d.payerPhone], ["Sponsor", d.sponsor], ["Remarks", d.remarks]]
        : [["Source", r.source], ["Received from", d.receivedFrom], ["Description", r.description], ["Payment mode", r.mode], ["Reference", r.reference], ["Remarks", d.remarks]];
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
            {items.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "").map(([k, v]) => (
                <div key={k}><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k}</div><div className="font-bold text-slate-700 break-words">{String(v)}</div></div>
            ))}
            <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Received</div><div className="font-bold text-slate-700">{fmt(r.date)}</div></div>
            <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Amount</div><div className="font-black text-emerald-600">{ksh(r.amount)}</div></div>
        </div>
    );
}

export function RevenueList({ data, loading }: { data?: RevenueData; loading?: boolean }) {
    const [open, setOpen] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [mode, setMode] = useState("");
    if (loading || !data) return <div className="py-14 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div>;
    const t = q.trim().toLowerCase();
    const rows = data.rows.filter(r => (!mode || r.mode === mode) && (!t || [r.source, r.description, r.reference, r.mode, r.details?.admNo, r.details?.receiptNo, r.details?.invoiceNo].join(" ").toLowerCase().includes(t)));
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100"><div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Total received</div><div className="text-xl font-black text-emerald-700">{ksh(data.total)}</div></div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fee payments</div><div className="text-xl font-black text-slate-800">{ksh(data.fees)}</div></div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Other income</div><div className="text-xl font-black text-slate-800">{ksh(data.otherIncome)}</div></div>
            </div>
            {data.byMode.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setMode("")} className={`h-8 px-3 rounded-full text-[11px] font-black ${!mode ? "bg-[#5C67F2] text-white" : "bg-slate-100 text-slate-600"}`}>All modes</button>
                    {data.byMode.map(m => (
                        <button key={m.mode} onClick={() => setMode(m.mode === mode ? "" : m.mode)} className={`h-8 px-3 rounded-full text-[11px] font-black ${mode === m.mode ? "bg-[#5C67F2] text-white" : "bg-slate-100 text-slate-600"}`}>
                            {m.mode} · {ksh(m.amount)} ({m.count})
                        </button>
                    ))}
                </div>
            )}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search student, adm, receipt, code…" className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" />
            </div>
            <div className="border border-slate-100 rounded-2xl overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                    <thead><tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                        <th className="py-3 px-4">Date</th><th className="py-3 px-2">From</th><th className="py-3 px-2">Mode</th><th className="py-3 px-2">Reference</th><th className="py-3 px-4 text-right">Amount</th><th className="w-8" />
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.length === 0 ? (
                            <tr><td colSpan={6} className="py-12 text-center text-xs font-bold uppercase text-slate-400">No money received in this period</td></tr>
                        ) : rows.map(r => (
                            <Fragment key={`${r.kind}-${r.id}`}>
                                <tr onClick={() => setOpen(open === r.id ? null : r.id)} className="cursor-pointer hover:bg-slate-50">
                                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{fmt(r.date)}</td>
                                    <td className="py-2.5 px-2"><div className="font-bold text-slate-800">{r.source}</div>{r.description && <div className="text-[11px] text-slate-400">{r.description}</div>}</td>
                                    <td className="py-2.5 px-2"><ModeBadge mode={r.mode} /></td>
                                    <td className="py-2.5 px-2 text-slate-500 text-xs">{r.reference || r.details?.receiptNo || "—"}</td>
                                    <td className="py-2.5 px-4 text-right font-black text-emerald-600 whitespace-nowrap">{ksh(r.amount)}</td>
                                    <td className="pr-3"><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open === r.id ? "rotate-180" : ""}`} /></td>
                                </tr>
                                {open === r.id && <tr><td colSpan={6} className="px-4 py-4 bg-indigo-50/40"><RevenueDetails r={r} /></td></tr>}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** Pop-up list of money received in a period (dashboard Revenue card). */
export function RevenueModal({ from, to, title, onClose }: { from: string; to: string; title: string; onClose: () => void }) {
    const { data, isLoading } = useRevenue(from, to);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div><h3 className="font-black text-slate-800 text-lg">{title}</h3><p className="text-xs font-bold text-slate-500">Every payment received — click one to see where it came from and how it was paid.</p></div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 overflow-y-auto"><RevenueList data={data} loading={isLoading} /></div>
            </div>
        </div>
    );
}
