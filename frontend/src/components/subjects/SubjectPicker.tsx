/**
 * Grouped subject checklist (built-in subject list — backend lib/subjectCatalog), used by
 * Subjects → Subjects we offer and Classes → New Class.
 */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Catalog } from "@/lib/subjectCatalog";

const ACC = "#0f766e";

export default function SubjectPicker({ catalog, value, onChange, only, columns = 4 }: {
    catalog: Catalog | undefined;
    value: Set<string>;
    onChange: (next: Set<string>) => void;
    /** limit to these catalogue keys (e.g. the subjects the school offers) */
    only?: Set<string> | null;
    columns?: 2 | 3 | 4;
}) {
    const [q, setQ] = useState("");
    const groups = useMemo(() => {
        const list = (catalog?.subjects || []).filter(s => (!only || only.has(s.key)) && (!q || `${s.name} ${s.short} ${s.code || ""}`.toLowerCase().includes(q.toLowerCase())));
        return (catalog?.groups || []).map(g => ({ g, items: list.filter(s => s.group === g) })).filter(x => x.items.length);
    }, [catalog, only, q]);
    const toggle = (k: string) => { const n = new Set(value); if (n.has(k)) n.delete(k); else n.add(k); onChange(n); };
    const setGroup = (keys: string[], on: boolean) => { const n = new Set(value); keys.forEach(k => (on ? n.add(k) : n.delete(k))); onChange(n); };
    const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];

    return (
        <div>
            <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white mb-4 max-w-sm" style={{ border: "0.5px solid #e5e7eb" }}>
                <Search className="w-4 h-4 text-slate-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search subjects" className="flex-1 text-sm outline-none bg-transparent" />
            </label>
            {!groups.length && <p className="text-sm text-slate-400">No subjects{only ? " — tick the subjects your school offers first (Subjects → Subjects we offer)" : ""}.</p>}
            <div className={`grid grid-cols-1 ${cols} gap-x-6 gap-y-5`}>
                {groups.map(({ g, items }) => {
                    const keys = items.map(i => i.key);
                    const all = keys.every(k => value.has(k));
                    return (
                        <div key={g}>
                            <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-xs font-black uppercase tracking-wide text-slate-700">{g}</h4>
                                <button type="button" onClick={() => setGroup(keys, !all)} className="text-[10px] font-bold" style={{ color: ACC }}>{all ? "Clear" : "All"}</button>
                            </div>
                            <div className="space-y-1">
                                {items.map(s => (
                                    <label key={s.key} className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer py-0.5">
                                        <input type="checkbox" checked={value.has(s.key)} onChange={() => toggle(s.key)} className="mt-0.5 w-4 h-4 accent-[#0f766e] shrink-0" />
                                        <span className="leading-tight">{s.name}{s.code ? <span className="text-[10px] text-slate-400"> · {s.code}</span> : null}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
