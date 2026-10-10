import { useMemo, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { APPS, APP_CATEGORIES, appForCode } from "@/lib/apps";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { PAGE_PERMISSIONS } from "@/components/navItems";

// Roles & Permissions, organised by app:
//   • switch an app on  → "app.<key>": the whole app (every page, every section)
//   • or pick pages     → only those pages show in that section
//   • capabilities      → finer rights used inside the app (e.g. record payments)
export default function AppPermissions({ perms, setPerms, disabled }: { perms: string[]; setPerms: (fn: (p: string[]) => string[]) => void; disabled?: boolean }) {
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const isAll = perms.includes("*");
    const has = (c: string) => isAll || perms.includes(c);

    const catalog = useMemo(() => APPS.map(app => {
        const pages = PAGE_PERMISSIONS.filter(g => app.groups.includes(g.group));
        const caps = PERMISSION_GROUPS.filter(g => !g.group.endsWith("— Pages")).flatMap(g => g.perms).filter(p => appForCode(p.code) === app.key);
        return { app, pages, caps, codes: [...pages.flatMap(g => g.perms.map(p => p.code)), ...caps.map(c => c.code)] };
    }), []);

    const set = (fn: (p: string[]) => string[]) => setPerms(p => fn(p.filter(x => x !== "*")));
    const toggleCode = (c: string) => set(p => (p.includes(c) ? p.filter(x => x !== c) : [...p, c]));
    const setApp = (key: string, codes: string[], on: boolean) => set(p => on ? Array.from(new Set([...p, `app.${key}`])) : p.filter(x => x !== `app.${key}` && !codes.includes(x)));
    const setMany = (codes: string[], on: boolean) => set(p => on ? Array.from(new Set([...p, ...codes])) : p.filter(x => !codes.includes(x)));

    const visible = catalog.filter(c => !q || `${c.app.name} ${c.app.description}`.toLowerCase().includes(q.toLowerCase()));

    return (
        <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
            <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps" className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
            </div>
            <div className="space-y-5">
                {APP_CATEGORIES.map(cat => {
                    const rows = visible.filter(c => c.app.category === cat.key);
                    if (!rows.length) return null;
                    return (
                        <div key={cat.key}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{cat.key}</p>
                            <div className="space-y-2">
                                {rows.map(({ app, pages, caps, codes }) => {
                                    const whole = has(`app.${app.key}`);
                                    const some = codes.filter(has).length;
                                    const pageCodes = pages.flatMap(g => g.perms.map(p => p.code));
                                    const pagesOn = pageCodes.filter(has).length;
                                    const state = whole ? (pagesOn ? `Whole app · ${pagesOn} page limit` : "Whole app") : some ? `${some} item${some === 1 ? "" : "s"}` : "No access";
                                    const Icon = app.icon;
                                    const open = openKey === app.key;
                                    return (
                                        <div key={app.key} className={`rounded-xl border ${whole || some ? "border-[#5C67F2]/40 bg-indigo-50/30" : "border-slate-200"}`}>
                                            <div className="flex items-center gap-3 px-3 py-2.5">
                                                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${app.color}14`, color: app.color }}><Icon className="w-4 h-4" /></span>
                                                <button type="button" onClick={() => setOpenKey(open ? null : app.key)} className="flex-1 min-w-0 text-left">
                                                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">{app.name}<ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "" : "-rotate-90"}`} /></p>
                                                    <p className="text-[11.5px] text-slate-500 truncate">{state} · {app.description}</p>
                                                </button>
                                                <button type="button" onClick={() => setApp(app.key, codes, !whole)} aria-label={`${app.name} access`}
                                                    className={`w-10 h-5 rounded-full relative shrink-0 ${whole ? "bg-[#5C67F2]" : "bg-slate-300"}`}>
                                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${whole ? "left-5" : "left-0.5"}`} />
                                                </button>
                                            </div>
                                            {open && (
                                                <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
                                                    <p className="text-[11.5px] text-slate-500">
                                                        The switch gives the whole app. To allow only some pages, tick them below — in a section where any page is ticked, only the ticked pages show.
                                                    </p>
                                                    {caps.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <p className="text-[11px] font-bold uppercase text-slate-400">What they can do</p>
                                                                <button type="button" onClick={() => setMany(caps.map(c => c.code), !caps.every(c => has(c.code)))} className="text-[11px] font-semibold text-[#5C67F2]">{caps.every(c => has(c.code)) ? "Clear" : "All"}</button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {caps.map(c => <Chip key={c.code} on={has(c.code)} label={c.name} onClick={() => toggleCode(c.code)} />)}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {pages.map(g => (
                                                        <div key={g.group}>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <p className="text-[11px] font-bold uppercase text-slate-400">{g.group} — pages</p>
                                                                <button type="button" onClick={() => setMany(g.perms.map(p => p.code), !g.perms.every(p => has(p.code)))} className="text-[11px] font-semibold text-[#5C67F2]">{g.perms.every(p => has(p.code)) ? "Clear" : "All"}</button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {g.perms.map(p => <Chip key={p.code} on={has(p.code)} label={p.name} onClick={() => toggleCode(p.code)} />)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 text-[11.5px] font-medium px-2.5 py-1 rounded-full border ${on ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-600 border-slate-200 hover:border-[#5C67F2]"}`}>
            {on && <Check className="w-3 h-3" />} {label}
        </button>
    );
}
