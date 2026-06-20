import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer, Search, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { nemis, toCSV, downloadFile, StudentValidation } from "./nemisApi";

const dot = (s: string) => s === "ready" ? "bg-emerald-500" : s === "warning" ? "bg-amber-400" : "bg-rose-500";

export default function NemisValidation() {
    const { data, isLoading } = useQuery({ queryKey: ["nemis_validate"], queryFn: () => nemis.validate() });
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState<string | null>(null);

    const validations: StudentValidation[] = data?.validations || [];
    const summary = data?.summary || {};
    const filtered = validations.filter(v => !search || `${v.studentName} ${v.admissionNo}`.toLowerCase().includes(search.toLowerCase()));

    const exportCSV = () => {
        const headers = ["Student", "Admission No", "Grade", "Score", "Missing Required", "Missing Recommended"];
        const rows = filtered.map(v => [v.studentName, v.admissionNo, v.grade, `${v.score}%`, v.missingRequired.join("; "), v.missingRecommended.join("; ")]);
        downloadFile(toCSV(headers, rows), `nemis_validation_${Date.now()}.csv`);
        toast.success("Validation report downloaded");
    };
    const print = () => {
        const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups");
        const body = filtered.map(v => `<tr><td>${v.studentName}</td><td>${v.admissionNo}</td><td>${v.grade}</td><td>${v.score}%</td><td>${v.missingRequired.join(", ") || "—"}</td></tr>`).join("");
        w.document.write(`<!DOCTYPE html><html><head><title>NEMIS Validation</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Arial}table{width:100%;border-collapse:collapse}th{background:#0F766E;color:#fff;padding:8px;text-align:left}td{padding:7px;border-bottom:1px solid #eee;font-size:12px}</style></head><body><h2>NEMIS Validation Report</h2><p>Average score: ${summary.averageScore}% · ${summary.ready}/${summary.count} ready</p><table><thead><tr><th>Student</th><th>Adm No</th><th>Grade</th><th>Score</th><th>Missing Required</th></tr></thead><tbody>${body}</tbody></table><script>onload=()=>print()</script></body></html>`);
        w.document.close();
    };

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
                    <div className="text-2xl font-black text-[#0F766E]">{summary.averageScore ?? 0}%</div>
                    <div className="text-[11px] text-slate-400 font-bold">Average validation score</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
                    <div className="text-2xl font-black text-emerald-600">{summary.ready ?? 0}<span className="text-slate-300">/{summary.count ?? 0}</span></div>
                    <div className="text-[11px] text-slate-400 font-bold">Ready for NEMIS</div>
                </div>
                <div className="flex-1" />
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" /></div>
                <button onClick={exportCSV} className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#0F766E]">CSV</button>
                <button onClick={print} className="h-10 px-4 bg-[#0F766E] text-white rounded-xl text-sm font-bold flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {filtered.map(v => (
                    <div key={v.studentId} className="border-b border-slate-50">
                        <button onClick={() => setOpen(open === v.studentId ? null : v.studentId)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 text-left">
                            {open === v.studentId ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <div className="flex-1"><p className="font-bold text-slate-800 text-sm">{v.studentName}</p><p className="text-[11px] text-slate-400">{v.admissionNo} · {v.grade}</p></div>
                            <span className={`text-xs font-black ${v.score >= 90 ? "text-emerald-600" : v.score >= 60 ? "text-amber-600" : "text-rose-600"}`}>{v.score}%</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${v.ready ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{v.ready ? "Ready" : "Incomplete"}</span>
                        </button>
                        {open === v.studentId && (
                            <div className="px-12 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                                {v.fields.map(f => (
                                    <div key={f.key} className="flex items-center gap-2 text-xs">
                                        <span className={`w-2 h-2 rounded-full ${dot(f.status)}`} />
                                        <span className="font-bold text-slate-600">{f.label}:</span>
                                        <span className="text-slate-400 truncate">{f.value || (f.severity === "required" ? "Missing" : "—")}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {filtered.length === 0 && <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase">No students</div>}
            </div>
        </div>
    );
}
