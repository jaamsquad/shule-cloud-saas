/**
 * Grouped grade/level checklist (built-in class list — backend lib/classCatalog), used by
 * Classes → Classes we offer.
 */
import { useMemo } from "react";
import type { ClassCatalog } from "@/lib/classCatalog";

const ACC = "#475569";

export default function ClassPicker({ catalog, value, onChange }: {
    catalog: ClassCatalog | undefined;
    value: Set<string>;
    onChange: (next: Set<string>) => void;
}) {
    const groups = useMemo(() => {
        const list = catalog?.classes || [];
        return (catalog?.groups || []).map(g => ({ g, items: list.filter(c => c.group === g) })).filter(x => x.items.length);
    }, [catalog]);
    const toggle = (k: string) => { const n = new Set(value); if (n.has(k)) n.delete(k); else n.add(k); onChange(n); };
    const setGroup = (keys: string[], on: boolean) => { const n = new Set(value); keys.forEach(k => (on ? n.add(k) : n.delete(k))); onChange(n); };

    if (!groups.length) return <p className="text-sm text-slate-400">No grades found.</p>;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
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
                            {items.map(c => (
                                <label key={c.key} className="grid grid-cols-[16px_minmax(0,1fr)] items-start gap-2 text-sm text-slate-700 cursor-pointer py-0.5">
                                    <input type="checkbox" checked={value.has(c.key)} onChange={() => toggle(c.key)} className="mt-0.5 w-4 h-4 m-0 accent-slate-700" />
                                    <span className="leading-tight">{c.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
