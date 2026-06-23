import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Search, FileText } from "lucide-react";
import { reqApi, statusStyle, STATUS_STYLES, PRIORITY_STYLES, ksh, RequestDoc } from "@/lib/requestsApi";
import { useSchoolBrand, printBranded } from "@/lib/printDoc";

type Source = "mine" | "inbox" | "all";

export function Badge({ text, map }: { text?: string; map: Record<string, { bg: string; fg: string }> }) {
    if (!text) return <span className="text-slate-300">—</span>;
    const s = map[text] || statusStyle(text);
    return <span className="text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.fg }}>{text}</span>;
}

/** Reusable list. `source` picks the endpoint; `statusFilter` pre-filters (e.g. supervisor "Approved"). */
export default function RequestsList({
    source, title, subtitle, statusFilter, showCreate,
}: { source: Source; title: string; subtitle?: string; statusFilter?: string; showCreate?: boolean }) {
    const navigate = useNavigate();
    const school = useSchoolBrand();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState(statusFilter || "all");
    const [priority, setPriority] = useState("all");

    const params: any = {};
    if (status !== "all") params.status = status;
    if (priority !== "all") params.priority = priority;
    const fn = source === "mine" ? reqApi.mine : source === "inbox" ? reqApi.inbox : reqApi.all;
    const { data: rows = [], isLoading } = useQuery({ queryKey: ["requests", source, params], queryFn: () => fn(params) });

    const filtered = rows.filter((r: RequestDoc) =>
        !q || `${r.number} ${r.title} ${r.requesterName} ${r.category}`.toLowerCase().includes(q.toLowerCase()));

    const exportPdf = () => {
        const body = `<table><thead><tr><th>No</th><th>Title</th><th>Requester</th><th>Category</th><th>Priority</th><th>Status</th><th>Est. Cost</th><th>Date</th></tr></thead><tbody>${filtered.map(r => `<tr><td>${r.number}</td><td>${r.title}</td><td>${r.requesterName || ""}</td><td>${r.category}</td><td>${r.priority}</td><td>${r.status}</td><td>${ksh(r.estimatedCost)}</td><td>${new Date(r.createdAt).toLocaleDateString("en-GB")}</td></tr>`).join("")}</tbody></table>`;
        printBranded(school, title, body, "#5C67F2");
    };
    const exportCsv = () => {
        const head = ["No", "Title", "Requester", "Category", "Priority", "Status", "Est. Cost", "Date"];
        const lines = filtered.map(r => [r.number, r.title, r.requesterName, r.category, r.priority, r.status, r.estimatedCost, new Date(r.createdAt).toLocaleDateString("en-GB")]);
        const csv = [head, ...lines].map(row => row.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = `${title}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">{title}</h1>
                    {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportCsv} className="h-10 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">Excel</button>
                    <button onClick={exportPdf} className="h-10 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">PDF</button>
                    {showCreate && <button onClick={() => navigate("/requests/new")} className="h-10 px-4 rounded-xl text-white font-bold text-sm flex items-center gap-2" style={{ background: "#5C67F2" }}><Plus className="w-4 h-4" /> New Request</button>}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search number, title, requester…" className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm" />
                </div>
                {!statusFilter && (
                    <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
                        {["all", "Submitted", "Seen", "Pending Approval", "Approved", "Rejected", "Forwarded", "Processing", "Completed", "Cancelled"].map(s => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
                    </select>
                )}
                <select value={priority} onChange={e => setPriority(e.target.value)} className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
                    {["all", "Low", "Medium", "High", "Urgent"].map(p => <option key={p} value={p}>{p === "all" ? "All priorities" : p}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <FileText className="w-10 h-10 mb-2" /><p className="text-sm font-bold">No requests</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">
                                <th className="text-left px-4 py-3 font-black">No.</th>
                                <th className="text-left px-4 py-3 font-black">Title</th>
                                {source !== "mine" && <th className="text-left px-4 py-3 font-black">Requester</th>}
                                <th className="text-left px-4 py-3 font-black">Category</th>
                                <th className="text-left px-4 py-3 font-black">Priority</th>
                                <th className="text-left px-4 py-3 font-black">Status</th>
                                {source === "all" && <th className="text-left px-4 py-3 font-black">Current</th>}
                                <th className="text-left px-4 py-3 font-black">Date</th>
                            </tr></thead>
                            <tbody>
                                {filtered.map((r: RequestDoc) => (
                                    <tr key={r._id} onClick={() => navigate(`/requests/${r._id}`)} className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer">
                                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{r.number}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700 max-w-[260px] truncate">{r.title}</td>
                                        {source !== "mine" && <td className="px-4 py-3 text-slate-500">{r.requesterName || "—"}</td>}
                                        <td className="px-4 py-3 text-slate-500">{r.category}</td>
                                        <td className="px-4 py-3"><Badge text={r.priority} map={PRIORITY_STYLES} /></td>
                                        <td className="px-4 py-3"><Badge text={r.status} map={STATUS_STYLES} /></td>
                                        {source === "all" && <td className="px-4 py-3 text-slate-500 text-xs">{r.currentOwnerName || r.currentOffice || "—"}</td>}
                                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(r.createdAt).toLocaleDateString("en-GB")}</td>
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
