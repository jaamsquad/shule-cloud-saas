import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, Search, Loader2, ArrowLeft, FileBarChart } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { openPrintDoc } from "@/lib/pdfDoc";
import { COLLECTION_REPORTS, type Col } from "./reportsConfig";

const fmtDate = (v: any) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : (/^\d+(\.\d+)?$/.test(String(v)) ? parseFloat(String(v)) : NaN);
  let d: Date;
  if (!isNaN(n) && n > 20000 && n < 90000) d = new Date(Math.round((n - 25569) * 86400 * 1000));
  else d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtMoney = (v: any) => `KSh ${(parseFloat(v) || 0).toLocaleString()}`;
const cell = (row: any, c: Col) => { const v = row[c.key]; return c.type === "date" ? fmtDate(v) : c.type === "money" ? fmtMoney(v) : (v ?? "—"); };

// Keys that represent a student's class/grade — enables the "sort by class" filter.
const CLASS_KEYS = ["studentClass", "currentClass", "className", "grade", "class", "transportZone", "hostelName"];

export function GenericReportView({ reportKey }: { reportKey: string }) {
  const cfg = COLLECTION_REPORTS[reportKey];
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["generic_report", cfg?.collection],
    queryFn: async () => { const r = await api.get(`/${cfg!.collection}`); return Array.isArray(r.data) ? r.data : []; },
    enabled: !!cfg,
  });
  const { data: schoolRaw } = useQuery({ queryKey: ["tenant_profile_global"], queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; } });
  const school = Array.isArray(schoolRaw) ? schoolRaw[0] : (schoolRaw || {});
  const schoolName = school?.name || school?.instituteName || "School";
  const schoolLogo = school?.logo || school?.schoolLogo || "";

  if (!cfg) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
      <FileBarChart className="w-12 h-12" /><p className="font-bold">This report isn't configured yet.</p>
      <Link to="/reports" className="text-[#2563EB] font-black text-sm">← Back to Reports Center</Link>
    </div>
  );

  // Detect a class/grade column on this report (if any) to offer sort-by-class.
  const classCol = cfg.columns.find(c => CLASS_KEYS.includes(c.key))?.key
    || (rows[0] && CLASS_KEYS.find(k => k in rows[0]));
  const classes: string[] = classCol ? Array.from(new Set(rows.map((r: any) => String(r[classCol] ?? "")).filter(Boolean))).sort() : [];

  let filtered = rows.filter((r: any) => !search || cfg.columns.some(c => String(r[c.key] ?? "").toLowerCase().includes(search.toLowerCase())));
  if (classCol && classFilter) filtered = filtered.filter((r: any) => String(r[classCol] ?? "") === classFilter);
  // Sort by class when a class column exists, then by the first column.
  if (classCol) filtered = [...filtered].sort((a: any, b: any) =>
    String(a[classCol] ?? "").localeCompare(String(b[classCol] ?? "")) ||
    String(a[cfg.columns[0].key] ?? "").localeCompare(String(b[cfg.columns[0].key] ?? "")));

  const print = () => {
    const head = cfg.columns.map(c => `<th style="background:#2563EB;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase">${c.label}</th>`).join("");
    const body = filtered.map((r: any, i: number) => `<tr style="background:${i % 2 ? "#F8FAFC" : "#fff"}">${cfg.columns.map(c => `<td style="padding:9px 12px;border-bottom:1px solid #E2E8F0;font-size:11px">${cell(r, c)}</td>`).join("")}</tr>`).join("");
    const html = `<!DOCTYPE html><html><head><title>${cfg.title}</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Inter,Arial,sans-serif;color:#0F172A}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.h{text-align:center;border-bottom:3px solid #2563EB;padding-bottom:12px;margin-bottom:18px}table{width:100%;border-collapse:collapse}</style></head><body><div class="h">${schoolLogo ? `<img src="${schoolLogo}" style="height:50px;margin-bottom:6px"/>` : ""}<h1 style="margin:0;font-size:22px;text-transform:uppercase">${schoolName}</h1><div style="color:#2563EB;font-weight:600;margin-top:4px">${cfg.title}</div></div><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><p style="margin-top:24px;font-size:10px;color:#94A3B8;text-align:right">${filtered.length} records · Printed ${new Date().toLocaleDateString()}</p></body></html>`;
    const w = openPrintDoc();
    if (!w) { toast.error("Allow pop-ups to print"); return; }
    w.document.write(html); w.document.close(); w.focus(); w.onload = () => w.print();
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Link to="/reports" className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-[#2563EB] uppercase tracking-widest mb-2"><ArrowLeft className="w-3.5 h-3.5" /> Reports Center</Link>
            <h1 className="text-2xl font-black text-slate-900">{cfg.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {classCol && classes.length > 0 && (
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#2563EB]">
                <option value="">All classes</option>
                {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
              </select>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#2563EB]" />
            </div>
            <button onClick={print} disabled={!filtered.length} className="h-10 px-5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md"><Printer className="w-4 h-4" /> Print / Export</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">{cfg.columns.map(c => <th key={c.key} className="text-left px-5 py-3 font-black">{c.label}</th>)}</tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={cfg.columns.length} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={cfg.columns.length} className="py-12 text-center text-slate-400 font-bold text-xs uppercase">No records found</td></tr>
              ) : filtered.map((r: any, i: number) => (
                <tr key={r._id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  {cfg.columns.map(c => <td key={c.key} className={`px-5 py-3 ${c.key === cfg.columns[0].key ? "font-bold text-slate-700" : "text-slate-500"}`}>{cell(r, c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 font-bold mt-3">{filtered.length} records</p>
      </div>
    </div>
  );
}

export default function GenericReport() {
  const { key = "" } = useParams();
  return <GenericReportView reportKey={key} />;
}
