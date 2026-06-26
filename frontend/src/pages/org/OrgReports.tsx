import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileBarChart, Download } from "lucide-react";
import api from "@/lib/api";
import { isOrgUser } from "@/lib/orgContext";

const ksh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;
const METRICS = [
    { key: "enrollment", label: "Enrollment", col: "students", fmt: (v: any) => v },
    { key: "fees", label: "Fee Collection", col: "collected", fmt: ksh },
    { key: "finance", label: "Income / Expense", col: "net", fmt: ksh },
    { key: "staff", label: "Staff", col: "staff", fmt: (v: any) => v },
];

// Reports across single / multiple selected / all branches.
export default function OrgReports() {
    const [metric, setMetric] = useState("fees");
    const [selected, setSelected] = useState<string[]>([]);   // empty = all
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const { data: branches = [] } = useQuery({
        queryKey: ["org_branches_report"], enabled: isOrgUser(),
        queryFn: async () => (await api.get("/org/branches")).data,
    });

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["org_report", metric, selected, from, to],
        enabled: isOrgUser(),
        queryFn: async () => (await api.get("/org/report", { params: { metric, branchIds: selected.join(","), from: from || undefined, to: to || undefined } })).data,
    });

    const m = METRICS.find(x => x.key === metric)!;
    const rows = data?.data?.branches || [];
    const totals = data?.data?.totals || {};

    const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    const exportCsv = () => {
        const head = ["Branch", m.label];
        const lines = rows.map((r: any) => [r.branchName, r[m.col]]);
        const csv = [head, ...lines].map((row: any) => row.join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a"); a.href = url; a.download = `org-${metric}-report.csv`; a.click();
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><FileBarChart className="w-6 h-6 text-[#5C67F2]" /> Organization Reports</h1>
                <button onClick={exportCsv} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><Download className="w-4 h-4" /> CSV</button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5 space-y-3">
                <div className="flex flex-wrap gap-2">
                    {METRICS.map(x => (
                        <button key={x.key} onClick={() => setMetric(x.key)} className={`h-9 px-4 rounded-xl font-bold text-sm ${metric === x.key ? "bg-[#5C67F2] text-white" : "bg-slate-50 text-slate-600"}`}>{x.label}</button>
                    ))}
                </div>
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Branches ({selected.length ? `${selected.length} selected` : "all"})</p>
                    <div className="flex flex-wrap gap-2">
                        {branches.map((b: any) => (
                            <button key={b.id} onClick={() => toggle(b.id)} className={`h-8 px-3 rounded-lg text-xs font-bold border ${selected.includes(b.id) ? "bg-[#5C67F2]/10 border-[#5C67F2]/40 text-[#5C67F2]" : "border-slate-200 text-slate-500"}`}>{b.name}</button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm" />
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm" />
                    <button onClick={() => refetch()} className="h-9 px-4 rounded-lg bg-[#0E7490] text-white font-bold text-sm">{isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run"}</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div> : (
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">
                            <th className="text-left px-4 py-3 font-black">Branch</th>
                            <th className="text-right px-4 py-3 font-black">{m.label}</th>
                        </tr></thead>
                        <tbody>
                            {rows.map((r: any) => (
                                <tr key={r.branchId} className="border-b border-slate-50">
                                    <td className="px-4 py-3 font-bold text-slate-700">{r.branchName}</td>
                                    <td className="px-4 py-3 text-right font-black text-slate-800">{m.fmt(r[m.col])}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot><tr className="bg-slate-50 font-black text-slate-800">
                            <td className="px-4 py-3">Total</td>
                            <td className="px-4 py-3 text-right">{m.fmt(totals[m.col])}</td>
                        </tr></tfoot>
                    </table>
                )}
            </div>
        </div>
    );
}
