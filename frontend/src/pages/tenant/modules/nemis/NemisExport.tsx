import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { nemis, toCSV, downloadFile } from "./nemisApi";
import { openPrintDoc } from "@/lib/pdfDoc";

export default function NemisExport() {
    const [grade, setGrade] = useState("");
    const [year, setYear] = useState("");
    const [busy, setBusy] = useState("");
    const [last, setLast] = useState<{ count: number; incomplete: number } | null>(null);

    // Build the class list from students' actual classes (matches how grade is read).
    const { data: students = [] } = useQuery({
        queryKey: ["nemis_export_students"],
        queryFn: async () => { try { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const classes = useMemo(
        () => Array.from(new Set(students.map((s: any) => s.currentClass || s.studentClass || s.grade).filter(Boolean))).sort() as string[],
        [students],
    );

    const fetchData = async () => {
        const params = new URLSearchParams();
        if (grade) params.set("grade", grade);
        if (year) params.set("year", year);
        const data = await nemis.export(params.toString() ? `?${params}` : "");
        setLast({ count: data.count, incomplete: data.incomplete });
        if (data.incomplete > 0) toast.warning(`${data.incomplete} record(s) are incomplete — they're exported but may be rejected by NEMIS.`);
        return data;
    };

    const exportCSV = async () => { setBusy("csv"); try { const d = await fetchData(); downloadFile(toCSV(d.headers, d.rows), `nemis_students_${Date.now()}.csv`); toast.success("CSV downloaded"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setBusy(""); } };
    const exportExcel = async () => {
        setBusy("xlsx");
        try {
            const d = await fetchData();
            const { utils, writeFile } = await import("xlsx");
            const ws = utils.aoa_to_sheet([d.headers, ...d.rows]);
            const wb = utils.book_new(); utils.book_append_sheet(wb, ws, "NEMIS");
            writeFile(wb, `nemis_students_${Date.now()}.xlsx`); toast.success("Excel downloaded");
        } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setBusy(""); }
    };
    const exportPDF = async () => {
        setBusy("pdf");
        try {
            const d = await fetchData();
            const w = openPrintDoc(); if (!w) return toast.error("Allow pop-ups");
            const head = d.headers.map((h: string) => `<th>${h}</th>`).join("");
            const body = d.rows.map((r: any[]) => `<tr>${r.map((c: any) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("");
            w.document.write(`<!DOCTYPE html><html><head><title>NEMIS Export</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#0F766E;color:#fff;padding:5px;text-align:left}td{padding:4px;border-bottom:1px solid #eee}</style></head><body><h2>NEMIS Students Export</h2><p>${d.count} records</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><script>onload=()=>print()</script></body></html>`);
            w.document.close();
        } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setBusy(""); }
    };

    return (
        <div className="max-w-3xl space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-700 mb-1">Export Students for NEMIS</h3>
                <p className="text-xs text-slate-400 mb-4">Exports follow the official NEMIS field order. Validation runs automatically before download.</p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Class / Grade (optional)</label>
                        <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#0F766E]">
                            <option value="">All classes</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Admission Year (optional)</label><input value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2026" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0F766E]" /></div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={exportCSV} disabled={!!busy} className="h-11 px-5 bg-[#0F766E] text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">{busy === "csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} CSV</button>
                    <button onClick={exportExcel} disabled={!!busy} className="h-11 px-5 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">{busy === "xlsx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Excel</button>
                    <button onClick={exportPDF} disabled={!!busy} className="h-11 px-5 bg-slate-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">{busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF Summary</button>
                </div>
            </div>
            {last && (
                <div className={`rounded-2xl border p-4 flex items-center gap-3 ${last.incomplete ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                    {last.incomplete ? <AlertTriangle className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                    <p className="text-sm font-bold">{last.count} records exported · {last.incomplete} incomplete</p>
                </div>
            )}
        </div>
    );
}
