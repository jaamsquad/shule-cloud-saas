import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { nemis, StudentValidation } from "./nemisApi";

export default function NemisMissing() {
    const qc = useQueryClient();
    const { data: rows = [], isLoading } = useQuery({ queryKey: ["nemis_missing"], queryFn: nemis.missing });
    const [search, setSearch] = useState("");
    const [grade, setGrade] = useState("");
    const [editId, setEditId] = useState<string | null>(null);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const grades = useMemo(() => Array.from(new Set(rows.map(r => r.grade).filter(Boolean))), [rows]);
    const filtered = rows.filter(r =>
        (!search || `${r.studentName} ${r.admissionNo}`.toLowerCase().includes(search.toLowerCase())) &&
        (!grade || r.grade === grade));

    const startEdit = (v: StudentValidation) => {
        setEditId(v.studentId);
        const d: Record<string, string> = {};
        v.fields.filter(f => f.status !== "ready").forEach(f => { d[f.key] = ""; });
        setDraft(d);
    };
    const save = async (v: StudentValidation) => {
        const payload = Object.fromEntries(Object.entries(draft).filter(([, val]) => val.trim()));
        if (!Object.keys(payload).length) { setEditId(null); return; }
        setSaving(true);
        try { await nemis.updateStudent(v.studentId, payload); toast.success("Saved"); setEditId(null); qc.invalidateQueries({ queryKey: ["nemis_missing"] }); qc.invalidateQueries({ queryKey: ["nemis_stats"] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
        finally { setSaving(false); }
    };

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, adm…" className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" /></div>
                <select value={grade} onChange={e => setGrade(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold">
                    <option value="">All grades</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wide"><th className="text-left px-4 py-3 font-black">Student</th><th className="text-left px-4 py-3 font-black">Adm No</th><th className="text-left px-4 py-3 font-black">Grade</th><th className="text-left px-4 py-3 font-black">Missing</th><th className="text-left px-4 py-3 font-black">Score</th><th className="px-4 py-3" /></tr></thead>
                    <tbody>
                        {filtered.map(v => (
                            <>
                                <tr key={v.studentId} className="border-b border-slate-50">
                                    <td className="px-4 py-3 font-bold text-slate-800">{v.studentName}</td>
                                    <td className="px-4 py-3 text-slate-500">{v.admissionNo || "—"}</td>
                                    <td className="px-4 py-3 text-slate-500">{v.grade || "—"}</td>
                                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{[...v.missingRequired, ...v.missingRecommended].slice(0, 4).map(m => <span key={m} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.missingRequired.includes(m) ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>{m}</span>)}{[...v.missingRequired, ...v.missingRecommended].length > 4 && <span className="text-[10px] text-slate-400">+{[...v.missingRequired, ...v.missingRecommended].length - 4}</span>}</div></td>
                                    <td className="px-4 py-3"><span className={`text-xs font-black ${v.score >= 90 ? "text-emerald-600" : v.score >= 60 ? "text-amber-600" : "text-rose-600"}`}>{v.score}%</span></td>
                                    <td className="px-4 py-3 text-right">
                                        {editId === v.studentId
                                            ? <div className="flex gap-1 justify-end"><button onClick={() => save(v)} disabled={saving} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}</button><button onClick={() => setEditId(null)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></div>
                                            : <button onClick={() => startEdit(v)} className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-[#0F766E]/10 text-slate-400 hover:text-[#0F766E] flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>}
                                    </td>
                                </tr>
                                {editId === v.studentId && (
                                    <tr className="bg-slate-50/50"><td colSpan={6} className="px-4 py-3">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {v.fields.filter(f => f.status !== "ready").map(f => (
                                                <div key={f.key}>
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{f.label}{f.severity === "required" && " *"}</label>
                                                    <input value={draft[f.key] ?? ""} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} className="w-full h-9 px-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0F766E]" />
                                                </div>
                                            ))}
                                        </div>
                                    </td></tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase">All students complete 🎉</div>}
            </div>
        </div>
    );
}
