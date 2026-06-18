import { useState, useMemo } from "react";
import { Home, Search, RotateCcw, ChevronDown, Calendar, Loader2, RefreshCw } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const KSh = (n: any) => `KSh ${(parseFloat(n) || 0).toLocaleString()}`;
const dval = (v: any) => (v ? new Date(v).getTime() : 0);
const isoDay = (d: Date) => d.toISOString().split("T")[0];

export default function AccountStatement() {
    const qc = useQueryClient();
    const { items: income, isLoading: loadingIncome } = useItems("income");
    const { items: expenses, isLoading: loadingExpenses } = useItems("expenses");
    // Fee payments count as real income on the statement.
    const { data: feeTxns = [], isFetching: loadingTxns } = useQuery({ queryKey: ["acct_fee_txns"], queryFn: async () => { const r = await api.get("/transactions"); return Array.isArray(r.data) ? r.data : []; } });

    const isLoading = loadingIncome || loadingExpenses;

    // ── Filters (all wired) ──────────────────────────────────────────────
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const [from, setFrom] = useState(isoDay(monthStart));
    const [to, setTo] = useState(isoDay(today));
    const [showRefs, setShowRefs] = useState(false);
    const [search, setSearch] = useState("");
    const [showDate, setShowDate] = useState(false);

    const feeIncome = feeTxns.map((t: any) => ({ date: t.date || t.createdAt, description: `Fee Payment — ${t.studentName || "Student"}`, reference: t.reference || t.receiptNo || t.mpesaCode || "", amount: Number(t.amount || t.paidAmount || 0), type: "income" }));

    // Build the ledger oldest→newest for a running balance, then display newest first.
    const fullLedger = useMemo(() => [
        ...income.map((i: any) => ({ ...i, type: "income" })),
        ...feeIncome,
        ...expenses.map((e: any) => ({ ...e, type: "expense" })),
    ].sort((a, b) => dval(a.date) - dval(b.date)), [income, expenses, feeTxns]);

    // Date-range + search filter
    const fromMs = from ? new Date(from).setHours(0, 0, 0, 0) : 0;
    const toMs = to ? new Date(to).setHours(23, 59, 59, 999) : Infinity;
    const term = search.trim().toLowerCase();
    const filtered = fullLedger.filter((r: any) => {
        const t = dval(r.date);
        if (t && (t < fromMs || t > toMs)) return false;
        if (!term) return true;
        return [r.description, r.category, r.reference].filter(Boolean).join(" ").toLowerCase().includes(term);
    });

    let running = 0;
    const withBalance = filtered.map((r: any) => { running += r.type === "income" ? (parseFloat(r.amount) || 0) : -(parseFloat(r.amount) || 0); return { ...r, balance: running }; });
    const statement = [...withBalance].reverse();   // newest first for display

    const totalIncome = filtered.filter((r: any) => r.type === "income").reduce((a: number, i: any) => a + (parseFloat(i.amount) || 0), 0);
    const totalExpense = filtered.filter((r: any) => r.type === "expense").reduce((a: number, e: any) => a + (parseFloat(e.amount) || 0), 0);
    const netBalance = totalIncome - totalExpense;

    const dateLabel = (() => {
        const f = from ? new Date(from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Start";
        const t = to ? new Date(to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Today";
        return `${f} – ${t}`;
    })();

    // ── Export helpers ───────────────────────────────────────────────────
    const headers = ["Date", "Description", ...(showRefs ? ["Reference"] : []), "Debit", "Credit", "Net Balance"];
    const rows = statement.map((r: any) => [
        r.date ? new Date(r.date).toLocaleDateString() : "—",
        r.description || r.category || "—",
        ...(showRefs ? [r.reference || "—"] : []),
        r.type === "expense" ? String(parseFloat(r.amount) || 0) : "",
        r.type === "income" ? String(parseFloat(r.amount) || 0) : "",
        String(r.balance),
    ]);

    const copyTable = async () => {
        const tsv = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
        try { await navigator.clipboard.writeText(tsv); toast.success("Copied to clipboard"); }
        catch { toast.error("Could not access clipboard"); }
    };
    const downloadBlob = (content: string, filename: string, mime: string) => {
        const url = URL.createObjectURL(new Blob([content], { type: mime }));
        const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const exportCSV = () => {
        const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
        const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
        downloadBlob(csv, `account-statement-${from}_${to}.csv`, "text/csv;charset=utf-8;");
        toast.success("CSV downloaded");
    };
    const exportExcel = async () => {
        try {
            const { utils, writeFile } = await import("xlsx");
            const ws = utils.aoa_to_sheet([headers, ...rows, [], ["TOTALS", "", ...(showRefs ? [""] : []), String(totalExpense), String(totalIncome), String(netBalance)]]);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Statement");
            writeFile(wb, `account-statement-${from}_${to}.xlsx`);
            toast.success("Excel downloaded");
        } catch { toast.error("Excel export failed"); }
    };
    const printable = () => {
        const w = window.open("", "_blank");
        if (!w) { toast.error("Allow popups to print"); return; }
        const body = rows.map(r => `<tr>${r.map((c, i) => `<td style="${i >= r.length - 3 ? 'text-align:right' : ''}">${c}</td>`).join("")}</tr>`).join("");
        w.document.write(`<!DOCTYPE html><html><head><title>Account Statement</title>
        <style>body{font-family:Arial;padding:32px;color:#1e293b}h1{color:#5C67F2;font-size:18px}
        p{color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
        th{background:#5C67F2;color:#fff;padding:8px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #eee}
        tfoot td{font-weight:900;border-top:2px solid #5C67F2}@media print{@page{margin:14mm}}</style></head><body>
        <h1>Account Statement</h1><p>${dateLabel}</p>
        <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody>
        <tfoot><tr><td colspan="${showRefs ? 3 : 2}">TOTALS</td><td style="text-align:right">${totalExpense.toLocaleString()}</td><td style="text-align:right">${totalIncome.toLocaleString()}</td><td style="text-align:right">${netBalance.toLocaleString()}</td></tr></tfoot>
        </table><script>window.onload=()=>window.print()</script></body></html>`);
        w.document.close();
    };
    const exportPDF = printable;   // print dialog → "Save as PDF"

    const resetFilters = () => {
        setFrom(isoDay(monthStart)); setTo(isoDay(today)); setSearch(""); setShowRefs(false);
        toast.success("Filters reset");
    };
    const refresh = () => {
        qc.invalidateQueries({ queryKey: ["acct_fee_txns"] });
        qc.invalidateQueries({ queryKey: ["income"] });
        qc.invalidateQueries({ queryKey: ["expenses"] });
        toast.success("Refreshed");
    };

    const exportBtns: Record<string, () => void> = { Copy: copyTable, CSV: exportCSV, Excel: exportExcel, PDF: exportPDF, Print: printable };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Accounts</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Account statement
                </span>
            </div>

            <div className="p-6 pt-0 w-full mt-4">

                {/* Filters & Actions Bar */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-wrap items-center gap-6 relative">
                    {/* Date Picker Pill */}
                    <div className="relative">
                        <button onClick={() => setShowDate(s => !s)} className="bg-[#5C67F2] text-white px-6 py-2.5 rounded-full flex items-center gap-3 shadow-md cursor-pointer hover:bg-[#4a54c4] transition-colors">
                            <Calendar className="w-5 h-5" />
                            <span className="font-bold text-sm">{dateLabel}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showDate ? "rotate-180" : ""}`} />
                        </button>
                        {showDate && (
                            <div className="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-30 flex flex-col gap-3 w-72">
                                <div>
                                    <label className="block text-[10px] font-black text-[#5C67F2] uppercase tracking-widest mb-1">From</label>
                                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[#5C67F2] uppercase tracking-widest mb-1">To</label>
                                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
                                </div>
                                <button onClick={() => setShowDate(false)} className="h-9 bg-[#5C67F2] text-white text-xs font-bold rounded-lg">Apply</button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        <button onClick={() => setShowRefs(s => !s)} className="flex items-center gap-2" type="button">
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${showRefs ? "bg-[#5C67F2]" : "bg-gray-200"}`}>
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showRefs ? "left-6" : "left-1"}`}></div>
                            </div>
                            <span className="text-sm font-bold text-gray-600">Show References</span>
                        </button>

                        <button onClick={resetFilters} className="h-10 px-6 border-2 border-[#5C67F2] text-[#5C67F2] font-bold rounded-xl hover:bg-[#5C67F2] hover:text-white transition-all flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Reset Filters
                        </button>

                        <button onClick={refresh} className="h-10 px-6 border-2 border-emerald-500 text-emerald-600 font-bold rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2">
                            <RefreshCw className={`w-4 h-4 ${loadingTxns ? "animate-spin" : ""}`} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Main Table Area */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                        <div className="flex gap-2">
                            {['Copy', 'CSV', 'Excel', 'PDF', 'Print'].map(btn => (
                                <button key={btn} onClick={exportBtns[btn]} className="px-5 py-2 bg-gray-100 hover:bg-[#5C67F2] hover:text-white text-gray-600 text-xs font-bold rounded-full transition-colors">
                                    {btn}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 font-bold">Search:</span>
                            <div className="relative">
                                <input
                                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Description or reference…"
                                    className="h-10 px-4 pr-10 border border-gray-200 rounded-full focus:outline-none focus:border-[#5C67F2] text-sm w-64"
                                />
                                <Search className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-100/50">
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider rounded-l-2xl">Date</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Description</th>
                                    {showRefs && <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Reference</th>}
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Debit</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Credit</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider rounded-r-2xl">Net Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={showRefs ? 6 : 5} className="px-6 py-10 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#5C67F2]" />
                                        </td>
                                    </tr>
                                ) : statement.length === 0 ? (
                                    <tr>
                                        <td colSpan={showRefs ? 6 : 5} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                                            No data available in table
                                        </td>
                                    </tr>
                                ) : (
                                    statement.map((row: any, idx) => (
                                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-sm text-gray-600 font-medium">
                                            <td className="px-6 py-4">{row.date ? new Date(row.date).toLocaleDateString() : "—"}</td>
                                            <td className="px-6 py-4">{row.description || row.category || "—"}</td>
                                            {showRefs && <td className="px-6 py-4 text-gray-400">{row.reference || "—"}</td>}
                                            <td className="px-6 py-4 text-rose-500">{row.type === 'expense' ? KSh(row.amount) : '-'}</td>
                                            <td className="px-6 py-4 text-emerald-500">{row.type === 'income' ? KSh(row.amount) : '-'}</td>
                                            <td className={`px-6 py-4 font-bold ${row.balance < 0 ? "text-rose-600" : "text-slate-800"}`}>{KSh(row.balance)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-gray-100 font-black text-gray-800">
                                    <td colSpan={showRefs ? 3 : 2} className="px-6 py-4">TOTALS</td>
                                    <td className="px-6 py-4 text-rose-600">{KSh(totalExpense)}</td>
                                    <td className="px-6 py-4 text-emerald-600">{KSh(totalIncome)}</td>
                                    <td className={`px-6 py-4 bg-gray-50/50 ${netBalance < 0 ? "text-rose-600" : ""}`}>{KSh(netBalance)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="mt-8 flex justify-between items-center text-sm text-gray-500 font-bold">
                        <p>Showing {statement.length} entries</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
