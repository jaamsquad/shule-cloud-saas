import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, FileBarChart, ArrowRight, Pencil, Check, X, Sparkles } from "lucide-react";
import { REPORT_MODULES, reportPath } from "./reportsConfig";

const COLOR_SWATCHES = ["#2563EB", "#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6", "#F97316", "#EF4444", "#06B6D4", "#475569", "#0F172A", "#DC2626"];

type Override = { name?: string; color?: string };
const loadOverrides = (): Record<string, Override> => {
  try { return JSON.parse(localStorage.getItem("reportCategoryOverrides") || "{}"); } catch { return {}; }
};

export default function ReportsCenter() {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();

  // Admin customization: rename modules + choose their colour (persisted).
  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Override>>(loadOverrides);
  useEffect(() => { localStorage.setItem("reportCategoryOverrides", JSON.stringify(overrides)); }, [overrides]);
  const nameOf = (key: string) => overrides[key]?.name || key;
  const colorOf = (key: string, fallback: string) => overrides[key]?.color || fallback;
  const setName = (key: string, name: string) => setOverrides(o => ({ ...o, [key]: { ...o[key], name } }));
  const setColor = (key: string, color: string) => setOverrides(o => ({ ...o, [key]: { ...o[key], color } }));

  const mods = REPORT_MODULES.map(m => ({
    ...m,
    reports: m.reports.filter(r => !q || r.label.toLowerCase().includes(q) || nameOf(m.key).toLowerCase().includes(q)),
  })).filter(m => m.reports.length);

  const total = REPORT_MODULES.reduce((n, m) => n + m.reports.length, 0);
  const moduleCount = REPORT_MODULES.length;

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white shadow-lg shadow-blue-200"><FileBarChart className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Reports Center</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-500" /> {total} reports · all live · across {moduleCount} modules
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search any report…"
                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#2563EB] shadow-sm" />
            </div>
            <button onClick={() => setEditMode(v => !v)}
              className={`h-11 px-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm ${editMode ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
              {editMode ? <><Check className="w-4 h-4" /> Done</> : <><Pencil className="w-4 h-4" /> Customize</>}
            </button>
          </div>
        </div>

        {/* Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {mods.map(m => (
            <div key={m.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: colorOf(m.key, m.color) }}><m.icon className="w-4.5 h-4.5" /></div>
                {editMode ? (
                  <input value={nameOf(m.key)} onChange={e => setName(m.key, e.target.value)}
                    className="font-black text-slate-800 text-sm border border-slate-200 rounded-lg px-2 h-8 flex-1 min-w-0 focus:outline-none focus:border-[#2563EB]" />
                ) : (
                  <h2 className="font-black text-slate-800 text-sm">{nameOf(m.key)}</h2>
                )}
                <span className="ml-auto text-[10px] font-black text-slate-300">{m.reports.length}</span>
              </div>
              {editMode && (
                <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-50 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Colour</span>
                  {COLOR_SWATCHES.map(sw => (
                    <button key={sw} onClick={() => setColor(m.key, sw)}
                      className={`w-5 h-5 rounded-full border-2 ${colorOf(m.key, m.color) === sw ? "border-slate-800" : "border-white"}`} style={{ background: sw }} />
                  ))}
                  {overrides[m.key] && <button onClick={() => setOverrides(o => { const n = { ...o }; delete n[m.key]; return n; })} className="ml-1 text-[10px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-0.5"><X className="w-3 h-3" /> reset</button>}
                </div>
              )}
              <div className="divide-y divide-slate-50">
                {m.reports.map((r, i) => (
                  <Link key={`${r.key}-${i}`} to={reportPath(r)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] transition-colors group">
                    {r.label}
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" title="Live" />
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        {mods.length === 0 && <p className="text-center text-slate-400 font-bold py-16">No reports match "{search}"</p>}
      </div>
    </div>
  );
}
