import { useState } from "react";
import { Loader2, Printer, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { tsc, toCSV, download } from "./tscApi";

const REPORTS = [
    { kind: "register", label: "Teacher Register" },
    { kind: "register", label: "TSC Teachers", type: "tsc" },
    { kind: "register", label: "BoM Teachers", type: "bom" },
    { kind: "workload", label: "Teacher Workload Report" },
    { kind: "qualifications", label: "Teacher Qualification Report" },
    { kind: "leave", label: "Leave Summary" },
    { kind: "contacts", label: "Staff Contact List" },
];

export default function TscReports() {
    const [active, setActive] = useState<any>(null);
    const [data, setData] = useState<any>(null);
    const [busy, setBusy] = useState(false);

    const run = async (r: any) => {
        setActive(r); setBusy(true);
        try { setData(await tsc.report(r.kind, r.type)); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setBusy(false); }
    };
    const exportCSV = () => { if (!data) return; download(toCSV(data.columns.map((c: any) => c.label), data.rows.map((row: any) => data.columns.map((c: any) => row[c.key] ?? ""))), `${data.title}.csv`); };
    const exportExcel = async () => { if (!data) return; const { utils, writeFile } = await import("xlsx"); const ws = utils.aoa_to_sheet([data.columns.map((c: any) => c.label), ...data.rows.map((row: any) => data.columns.map((c: any) => row[c.key] ?? ""))]); const wb = utils.book_new(); utils.book_append_sheet(wb, ws, "Report"); writeFile(wb, `${data.title}.xlsx`); };
    const print = () => {
        if (!data) return; const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups");
        const head = data.columns.map((c: any) => `<th>${c.label}</th>`).join("");
        const body = data.rows.map((r: any) => `<tr>${data.columns.map((c: any) => `<td>${r[c.key] ?? ""}</td>`).join("")}</tr>`).join("");
        w.document.write(`<!DOCTYPE html><html><head><title>${data.title}</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Arial}table{width:100%;border-collapse:collapse}th{background:#1D4ED8;color:#fff;padding:8px;text-align:left}td{padding:7px;border-bottom:1px solid #eee;font-size:12px}</style></head><body><h2>${data.title}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><script>onload=()=>print()</script></body></html>`);
        w.document.close();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {REPORTS.map(r => <button key={r.label} onClick={() => run(r)} className={`h-9 px-4 rounded-lg text-sm font-bold ${active?.label === r.label ? "bg-[#1D4ED8] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-[#1D4ED8]"}`}>{r.label}</button>)}
            </div>

            {busy ? <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-[#1D4ED8]" /></div> : data ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h3 className="font-black text-slate-800">{data.title} <span className="text-slate-300 font-bold">· {data.rows.length}</span></h3>
                        <div className="flex gap-2">
                            <button onClick={exportCSV} className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> CSV</button>
                            <button onClick={exportExcel} className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</button>
                            <button onClick={print} className="h-9 px-3 bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Print</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">{data.columns.map((c: any) => <th key={c.key} className="text-left px-4 py-3 font-black">{c.label}</th>)}</tr></thead>
                            <tbody>{data.rows.map((row: any, i: number) => <tr key={i} className="border-b border-slate-50">{data.columns.map((c: any) => <td key={c.key} className="px-4 py-2.5 text-slate-600">{row[c.key] ?? "—"}</td>)}</tr>)}{data.rows.length === 0 && <tr><td colSpan={data.columns.length} className="py-10 text-center text-slate-400 text-xs font-bold uppercase">No data</td></tr>}</tbody>
                        </table>
                    </div>
                </div>
            ) : <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400 text-xs font-bold uppercase">Choose a report above</div>}
        </div>
    );
}
