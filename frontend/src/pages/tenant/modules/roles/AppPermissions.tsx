import { useMemo, useState } from "react";
import { ChevronDown, Check, Search, Ban, Plus, Pencil, Trash2 } from "lucide-react";
import { APPS, APP_CATEGORIES, appModuleKeys } from "@/lib/apps";
import { CAPABILITIES } from "@/lib/permissions";
import { PAGE_PERMISSIONS } from "@/components/navItems";
import { usePermissions } from "@/contexts/PermissionsContext";

// Roles & Permissions, one card per app:
//   • Access switch   → "app.<key>": the whole app (every section and page)
//   • Can also        → create / edit / delete in the app (saved per module for the server)
//   • Capabilities    → finer rights inside the app (record payments, enter marks…)
//   • Pages           → only some pages; in a section with any page ticked, only those show
// Apps the platform owner switched off for this school are shown but can't be given.
type Crud = Record<string, string[]>;
const ACTIONS: { key: "create" | "update" | "delete"; label: string; icon: any }[] = [
    { key: "create", label: "Create", icon: Plus }, { key: "update", label: "Edit", icon: Pencil }, { key: "delete", label: "Delete", icon: Trash2 },
];

export default function AppPermissions({ perms, setPerms, crud, setCrud, disabled }: {
    perms: string[]; setPerms: (fn: (p: string[]) => string[]) => void;
    crud: Crud; setCrud: (fn: (c: Crud) => Crud) => void;
    disabled?: boolean;
}) {
    const { disabledApps = [] } = usePermissions();
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const isAll = perms.includes("*");
    const has = (c: string) => isAll || perms.includes(c);

    const catalog = useMemo(() => APPS.map(app => {
        const pages = PAGE_PERMISSIONS.filter(g => app.groups.includes(g.group));
        const caps = CAPABILITIES.filter(c => c.app === app.key);
        const modules = appModuleKeys(app).filter(m => m !== "dashboard");
        return { app, pages, caps, modules, codes: [...pages.flatMap(g => g.perms.map(p => p.code)), ...caps.map(c => c.code)] };
    }), []);

    const set = (fn: (p: string[]) => string[]) => setPerms(p => fn(p.filter(x => x !== "*")));
    const toggleCode = (c: string) => set(p => (p.includes(c) ? p.filter(x => x !== c) : [...p, c]));
    const setMany = (codes: string[], on: boolean) => set(p => on ? Array.from(new Set([...p, ...codes])) : p.filter(x => !codes.includes(x)));
    const actionOn = (mods: string[], act: string) => isAll || (mods.length > 0 && mods.every(m => (crud[m] || []).includes(act)));
    const setAction = (mods: string[], act: string, on: boolean) => setCrud(c => {
        const next = { ...c };
        for (const m of mods) {
            const cur = new Set(next[m] || []);
            on ? cur.add(act) : cur.delete(act);
            next[m] = Array.from(cur);
        }
        return next;
    });
    const setApp = (key: string, codes: string[], mods: string[], on: boolean) => {
        set(p => on ? Array.from(new Set([...p, `app.${key}`])) : p.filter(x => x !== `app.${key}` && !codes.includes(x)));
        if (!on) setCrud(c => { const next = { ...c }; for (const m of mods) delete next[m]; return next; });
    };

    const visible = catalog.filter(c => !q || `${c.app.name} ${c.app.description}`.toLowerCase().includes(q.toLowerCase()));
    const appsGiven = catalog.filter(c => has(`app.${c.app.key}`) || c.codes.some(has)).length;

    return (
        <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
            <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps" className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">{isAll ? "All apps" : `${appsGiven} app${appsGiven === 1 ? "" : "s"} given`}</span>
            </div>
            <div className="space-y-5">
                {APP_CATEGORIES.map(cat => {
                    const rows = visible.filter(c => c.app.category === cat.key);
                    if (!rows.length) return null;
                    return (
                        <div key={cat.key}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{cat.key}</p>
                            <div className="space-y-2">
                                {rows.map(({ app, pages, caps, modules, codes }) => {
                                    const off = disabledApps.includes(app.key);
                                    const whole = has(`app.${app.key}`);
                                    const pageCodes = pages.flatMap(g => g.perms.map(p => p.code));
                                    const pagesOn = pageCodes.filter(has).length;
                                    const capsOn = caps.filter(c => has(c.code)).length;
                                    const acts = ACTIONS.filter(a => actionOn(modules, a.key)).map(a => a.label.toLowerCase());
                                    const state = off ? "Turned off for this school by ShuleCloud"
                                        : whole ? (pagesOn ? `Whole app, limited to ${pagesOn} page${pagesOn === 1 ? "" : "s"}` : "Whole app")
                                        : pagesOn ? `${pagesOn} page${pagesOn === 1 ? "" : "s"}`
                                        : capsOn ? `${capsOn} capabilit${capsOn === 1 ? "y" : "ies"}` : "No access";
                                    const given = !off && (whole || pagesOn > 0 || capsOn > 0);
                                    const Icon = app.icon;
                                    const open = openKey === app.key && !off;
                                    return (
                                        <div key={app.key} className={`rounded-xl border ${off ? "border-slate-200 bg-slate-50 opacity-70" : given ? "border-[#5C67F2]/40 bg-indigo-50/30" : "border-slate-200"}`}>
                                            <div className="flex items-center gap-3 px-3 py-2.5">
                                                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${app.color}14`, color: app.color }}>{off ? <Ban className="w-4 h-4" /> : <Icon className="w-4 h-4" />}</span>
                                                <button type="button" disabled={off} onClick={() => setOpenKey(open ? null : app.key)} className="flex-1 min-w-0 text-left">
                                                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">{app.name}{!off && <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "" : "-rotate-90"}`} />}</p>
                                                    <p className="text-[11.5px] text-slate-500 truncate">{state}{given && acts.length ? ` · can ${acts.join(", ")}` : ""}</p>
                                                </button>
                                                <button type="button" disabled={off} onClick={() => setApp(app.key, codes, modules, !whole)} aria-label={`${app.name} access`}
                                                    className={`w-10 h-5 rounded-full relative shrink-0 disabled:cursor-not-allowed ${whole && !off ? "bg-[#5C67F2]" : "bg-slate-300"}`}>
                                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${whole && !off ? "left-5" : "left-0.5"}`} />
                                                </button>
                                            </div>
                                            {open && (
                                                <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
                                                    <p className="text-[11.5px] text-slate-500">The switch gives the whole app. Or tick single pages or capabilities — in a section where any page is ticked, only the ticked pages show.</p>
                                                    {modules.length > 0 && (
                                                        <div>
                                                            <p className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">Can also</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {ACTIONS.map(a => {
                                                                    const on = actionOn(modules, a.key);
                                                                    return (
                                                                        <button key={a.key} type="button" onClick={() => setAction(modules, a.key, !on)}
                                                                            className={`inline-flex items-center gap-1 text-[11.5px] font-medium px-2.5 py-1 rounded-full border ${on ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-500"}`}>
                                                                            {on ? <Check className="w-3 h-3" /> : <a.icon className="w-3 h-3" />} {a.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-1">Viewing is allowed wherever the app is open. These add creating, editing or deleting records.</p>
                                                        </div>
                                                    )}
                                                    {caps.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <p className="text-[11px] font-bold uppercase text-slate-400">Capabilities</p>
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
