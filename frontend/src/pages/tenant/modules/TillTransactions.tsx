import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Smartphone, Search, X, Download, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useSchoolBrand, printBranded } from "@/lib/printDoc";

const ksh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;
const fmt = (d: any) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// All M-PESA payments received on the school's integrated Till/Paybill,
// filterable by transaction code, payer phone, or payer name.
export default function TillTransactions() {
    const school = useSchoolBrand();
    const [code, setCode] = useState("");
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    // Applied filters (only sent to the server when "Search" is pressed).
    const [params, setParams] = useState<Record<string, string>>({});

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["till_transactions", params],
        queryFn: async () => (await api.get("/fees/till-transactions", { params })).data,
    });
    // M-PESA integration status — to explain WHY direct till payments may be missing.
    const { data: mpesa } = useQuery({
        queryKey: ["mpesa_settings"],
        queryFn: async () => (await api.get("/integrations/mpesa/settings")).data,
    });
    const rows: any[] = data?.data || [];
    const summary = data?.summary || { count: 0, total: 0 };
    // Did any directly-paid (C2B) transaction come through?
    const hasC2B = rows.some(r => r.source === "C2B");

    const apply = () => setParams({
        ...(code && { code }), ...(phone && { phone }), ...(name && { name }),
        ...(from && { from }), ...(to && { to }),
    });
    const clear = () => { setCode(""); setPhone(""); setName(""); setFrom(""); setTo(""); setParams({}); };

    const exportCsv = () => {
        const head = ["Code", "Phone", "Name", "Account", "Amount", "Source", "Paid At"];
        const lines = rows.map(r => [r.code, r.phone, r.name, r.account, r.amount, r.source, fmt(r.paidAt)]);
        const csv = [head, ...lines].map(row => row.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = "Till-Transactions.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const printList = () => {
        const body = `<p style="font-size:12px;color:#475569">${summary.count} transactions · Total ${ksh(summary.total)}</p>
            <table><thead><tr><th>Code</th><th>Phone</th><th>Name</th><th>Account</th><th>Amount</th><th>Paid At</th></tr></thead><tbody>
            ${rows.map(r => `<tr><td>${r.code}</td><td>${r.phone}</td><td>${r.name}</td><td>${r.account}</td><td>${ksh(r.amount)}</td><td>${fmt(r.paidAt)}</td></tr>`).join("")}</tbody></table>`;
        printBranded(school, "M-PESA Till / Paybill Transactions", body, "#0E7490");
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Smartphone className="w-5 h-5" /></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Till / Paybill Transactions</h1>
                        <p className="text-sm text-slate-400">M-PESA payments received on your integrated Till/Paybill{data?.shortcodes?.length ? ` (${data.shortcodes.join(", ")})` : ""}.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => refetch()} className="h-10 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5">{isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh</button>
                    <button onClick={exportCsv} className="h-10 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><Download className="w-4 h-4" /> CSV</button>
                    <button onClick={printList} className="h-10 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">Print / PDF</button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <div className="bg-white rounded-2xl border border-slate-100 p-4"><div className="text-2xl font-black text-slate-800">{summary.count}</div><div className="text-[11px] font-bold text-slate-400">Transactions</div></div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4"><div className="text-2xl font-black text-emerald-600">{ksh(summary.total)}</div><div className="text-[11px] font-bold text-slate-400">Total Received</div></div>
            </div>

            {/* Direct-payment (C2B) capture status — explains why manual till payments may be missing */}
            {mpesa && !hasC2B && (
                mpesa.registered ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-5 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-emerald-800">
                            <p className="font-bold">Direct payment capture is ON.</p>
                            <p className="text-emerald-700/80 mt-0.5">Your C2B URLs are registered with Safaricom, so payments made directly to your {mpesa.txType === "CustomerBuyGoodsOnline" ? "Till" : "Paybill"} will appear here automatically. If a recent one is missing, it can take a moment — hit Refresh. (Note: Safaricom only sends these notifications in <b>Production</b>, and many <b>Till/Buy-Goods</b> shortcodes don't deliver C2B — Paybills do.)</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-bold">Payments made directly to your Till/Paybill aren't being captured yet.</p>
                            <p className="text-amber-700/80 mt-0.5">To pull in transactions customers make on their own phones (Lipa na M-PESA → Paybill/Buy Goods), you must register your C2B notification URLs with Safaricom — one click.</p>
                            <Link to="/integrations/daraja" className="inline-flex items-center gap-1.5 mt-2 h-9 px-4 rounded-xl bg-amber-600 text-white font-bold text-xs">Go to M-PESA Integration → Register C2B URLs</Link>
                        </div>
                    </div>
                )
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5">
                <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <Input icon value={code} onChange={setCode} placeholder="M-PESA code (TransID)" />
                    <Input value={phone} onChange={setPhone} placeholder="Phone (07…)" />
                    <Input value={name} onChange={setName} placeholder="Payer name" />
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm" />
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm" />
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <button onClick={apply} className="h-10 px-5 rounded-xl bg-[#0E7490] text-white font-bold text-sm flex items-center gap-1.5"><Search className="w-4 h-4" /> Search</button>
                    {(code || phone || name || from || to) && <button onClick={clear} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm flex items-center gap-1.5"><X className="w-4 h-4" /> Clear</button>}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                ) : rows.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <Smartphone className="w-10 h-10 mx-auto mb-2" />
                        <p className="font-bold">No transactions found</p>
                        {data && !data.configured && <p className="text-sm">No M-PESA Paybill/Till configured — set it up under Settings → M-PESA Integration.</p>}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">
                                <th className="text-left px-4 py-3 font-black">Code</th>
                                <th className="text-left px-4 py-3 font-black">Phone</th>
                                <th className="text-left px-4 py-3 font-black">Name</th>
                                <th className="text-left px-4 py-3 font-black">Account</th>
                                <th className="text-right px-4 py-3 font-black">Amount</th>
                                <th className="text-left px-4 py-3 font-black">Source</th>
                                <th className="text-left px-4 py-3 font-black">Paid At</th>
                            </tr></thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={r.code + i} className="border-b border-slate-50 hover:bg-slate-50/60">
                                        <td className="px-4 py-3 font-mono text-xs font-bold text-[#0E7490]">{r.code || "—"}</td>
                                        <td className="px-4 py-3 text-slate-600">{r.phone || "—"}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700">{r.name}</td>
                                        <td className="px-4 py-3 text-slate-500">{r.account || "—"}</td>
                                        <td className="px-4 py-3 text-right font-black text-emerald-700">{ksh(r.amount)}</td>
                                        <td className="px-4 py-3"><span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{r.source || "M-PESA"}</span></td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{fmt(r.paidAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function Input({ value, onChange, placeholder, icon }: { value: string; onChange: (v: string) => void; placeholder: string; icon?: boolean }) {
    return (
        <div className="relative">
            {icon && <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
            <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className={`w-full h-10 ${icon ? "pl-9" : "pl-3"} pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0E7490]`} />
        </div>
    );
}
