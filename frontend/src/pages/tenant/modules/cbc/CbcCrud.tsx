import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Trash2, Pencil, X, Search } from "lucide-react";
import { toast } from "sonner";
import { cbc } from "./cbcApi";

export type Fld = { k: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea"; options?: string[] | (() => string[]); required?: boolean };
const ACCENT = "#7C3AED";

export default function CbcCrud({ collection, title, addLabel = "Add", fields, columns, searchKeys }: { collection: string; title: string; addLabel?: string; fields: Fld[]; columns: { k: string; label: string }[]; searchKeys?: string[] }) {
    const qc = useQueryClient();
    const { data: rows = [], isLoading } = useQuery({ queryKey: ["cbc", collection], queryFn: () => cbc.list(collection) });
    const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [editId, setEditId] = useState<string | null>(null); const [form, setForm] = useState<Record<string, any>>({}); const [saving, setSaving] = useState(false);
    const opts = (f: Fld) => (typeof f.options === "function" ? f.options() : f.options) || [];
    const sKeys = searchKeys || columns.map(c => c.k);
    const filtered = rows.filter((r: any) => !q || sKeys.some(k => String(r[k] ?? "").toLowerCase().includes(q.toLowerCase())));

    const save = async () => {
        for (const f of fields) if (f.required && !form[f.k]) return toast.error(`${f.label} is required`);
        setSaving(true);
        try { if (editId) await cbc.update(collection, editId, form); else await cbc.add(collection, form); toast.success(editId ? "Updated" : "Saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["cbc", collection] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); }
    };
    const del = async (id: string) => { if (!confirm("Delete this record?")) return; await cbc.remove(collection, id); qc.invalidateQueries({ queryKey: ["cbc", collection] }); toast.success("Deleted"); };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-base font-black text-slate-800">{title} <span className="text-slate-300">· {filtered.length}</span></h2>
                <div className="flex gap-2">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" /></div>
                    <button onClick={() => { setEditId(null); setForm({}); setOpen(true); }} className="h-10 px-4 text-white rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: ACCENT }}><Plus className="w-4 h-4" /> {addLabel}</button>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                {isLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#7C3AED]" /></div> : (
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">{columns.map(c => <th key={c.k} className="text-left px-4 py-3 font-black">{c.label}</th>)}<th className="px-4 py-3" /></tr></thead>
                        <tbody>
                            {filtered.map((r: any) => (
                                <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    {columns.map(c => <td key={c.k} className="px-4 py-3 text-slate-600">{r[c.k] ?? "—"}</td>)}
                                    <td className="px-4 py-3 text-right"><div className="flex gap-1 justify-end"><button onClick={() => { setEditId(r._id); setForm({ ...r }); setOpen(true); }} className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:text-[#7C3AED] flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => del(r._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={columns.length + 1} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">No records</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-800">{editId ? "Edit" : addLabel}</h2><button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button></div>
                        <div className="grid grid-cols-2 gap-3">
                            {fields.map(f => (
                                <div key={f.k} className={f.type === "textarea" ? "col-span-2" : ""}>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{f.label}{f.required && " *"}</label>
                                    {f.type === "select" ? <select value={form[f.k] ?? ""} onChange={e => setForm(s => ({ ...s, [f.k]: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#7C3AED]"><option value="">Select…</option>{opts(f).map(o => <option key={o}>{o}</option>)}</select>
                                        : f.type === "textarea" ? <textarea value={form[f.k] ?? ""} onChange={e => setForm(s => ({ ...s, [f.k]: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#7C3AED]" />
                                            : <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={form[f.k] ?? ""} onChange={e => setForm(s => ({ ...s, [f.k]: f.type === "number" ? Number(e.target.value) : e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#7C3AED]" />}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-5"><button onClick={() => setOpen(false)} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Cancel</button><button onClick={save} disabled={saving} className="flex-1 h-10 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editId ? "Update" : "Save"}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
