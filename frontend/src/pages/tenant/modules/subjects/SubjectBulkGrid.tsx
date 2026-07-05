import { useState } from "react";
import { Plus, Trash2, Loader2, Save, X, ClipboardPaste } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

interface Row { name: string; code: string; shortCode: string; category: string }
const CATEGORIES = ["Core", "Elective", "Vocational", "Extracurricular"];
const emptyRow = (): Row => ({ name: "", code: "", shortCode: "", category: "Core" });
const blankRows = (n: number) => Array.from({ length: n }, emptyRow);

// A spreadsheet-style grid for adding many subjects at once. Supports pasting
// rows straight from Excel/Sheets (tab + newline separated) and one bulk save.
export default function SubjectBulkGrid({ onSaved }: { onSaved?: () => void }) {
    const qc = useQueryClient();
    const [rows, setRows] = useState<Row[]>(blankRows(6));
    const [saving, setSaving] = useState(false);

    const setCell = (i: number, key: keyof Row, v: string) =>
        setRows(rs => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

    const addRow = () => setRows(rs => [...rs, emptyRow()]);
    const removeRow = (i: number) => setRows(rs => (rs.length > 1 ? rs.filter((_, j) => j !== i) : blankRows(1)));
    const clearAll = () => setRows(blankRows(6));

    // Paste tab/newline-delimited data from Excel into the grid, starting at (rowIdx).
    const handlePaste = (rowIdx: number, e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData("text");
        if (!text || !/[\t\n]/.test(text)) return;     // single value → let it paste normally
        e.preventDefault();
        const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim() !== "");
        setRows(rs => {
            const next = [...rs];
            lines.forEach((line, k) => {
                const [name = "", code = "", shortCode = "", category = ""] = line.split("\t").map(c => c.trim());
                const idx = rowIdx + k;
                const cat = CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase()) || "Core";
                const row: Row = { name, code, shortCode: shortCode.toUpperCase(), category: cat };
                if (idx < next.length) next[idx] = row;
                else next.push(row);
            });
            return next;
        });
    };

    const validRows = rows.filter(r => r.name.trim());

    const saveAll = async () => {
        if (validRows.length === 0) { toast.error("Enter at least one subject name"); return; }
        setSaving(true);
        const results = await Promise.allSettled(
            validRows.map(r => api.post("/academics/subjects", { name: r.name.trim(), code: r.code.trim(), shortCode: r.shortCode.trim(), category: r.category }))
        );
        const ok = results.filter(r => r.status === "fulfilled").length;
        const failed = results.length - ok;
        setSaving(false);
        qc.invalidateQueries({ queryKey: ["subjects"] });
        if (ok) toast.success(`${ok} subject${ok > 1 ? "s" : ""} saved${failed ? `, ${failed} failed` : ""}`);
        else toast.error("Failed to save subjects");
        if (ok) { setRows(blankRows(6)); onSaved?.(); }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ClipboardPaste className="w-4 h-4 text-[#5C67F2]" />
                    <span>Type rows, or <b>paste straight from Excel</b> (Name · Code · Short Code · Classification). {validRows.length} ready.</span>
                </div>
                <button onClick={clearAll} className="text-[11px] font-bold text-slate-400 hover:text-rose-500 inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Clear</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#5C67F2] text-white text-[11px] uppercase tracking-wide">
                            <th className="w-10 py-2.5 font-black">#</th>
                            <th className="text-left px-3 py-2.5 font-black">Subject Name *</th>
                            <th className="text-left px-3 py-2.5 font-black">Subject Code</th>
                            <th className="text-left px-3 py-2.5 font-black">Short Code</th>
                            <th className="text-left px-3 py-2.5 font-black">Classification</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/40">
                                <td className="text-center text-xs text-slate-400 font-bold">{i + 1}</td>
                                <td className="px-2 py-1">
                                    <input value={r.name} onChange={e => setCell(i, "name", e.target.value)} onPaste={e => handlePaste(i, e)}
                                        placeholder="e.g. Mathematics" className="w-full h-9 px-2 rounded border border-transparent hover:border-slate-200 focus:border-[#5C67F2] focus:outline-none text-sm" />
                                </td>
                                <td className="px-2 py-1">
                                    <input value={r.code} onChange={e => setCell(i, "code", e.target.value)} onPaste={e => handlePaste(i, e)}
                                        placeholder="e.g. MATH101" className="w-full h-9 px-2 rounded border border-transparent hover:border-slate-200 focus:border-[#5C67F2] focus:outline-none text-sm" />
                                </td>
                                <td className="px-2 py-1">
                                    <input value={r.shortCode} onChange={e => setCell(i, "shortCode", e.target.value.toUpperCase())} onPaste={e => handlePaste(i, e)}
                                        placeholder="e.g. MAT" maxLength={6} className="w-full h-9 px-2 rounded border border-transparent hover:border-slate-200 focus:border-[#5C67F2] focus:outline-none text-sm uppercase" />
                                </td>
                                <td className="px-2 py-1">
                                    <select value={r.category} onChange={e => setCell(i, "category", e.target.value)}
                                        className="w-full h-9 px-2 rounded border border-transparent hover:border-slate-200 focus:border-[#5C67F2] focus:outline-none text-sm bg-white">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </td>
                                <td className="text-center">
                                    <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <button onClick={addRow} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C67F2] hover:text-[#4a54c4]"><Plus className="w-4 h-4" /> Add Row</button>
                <button onClick={saveAll} disabled={saving || validRows.length === 0}
                    className="inline-flex items-center gap-2 h-10 px-6 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-xs uppercase tracking-widest rounded-lg disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save All ({validRows.length})
                </button>
            </div>
        </div>
    );
}
