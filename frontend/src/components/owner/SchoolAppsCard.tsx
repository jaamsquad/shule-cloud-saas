import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Lock, AppWindow } from "lucide-react";
import api from "@/lib/api";
import { APPS, APP_CATEGORIES, CORE_APPS } from "@/lib/apps";

// Owner portal → a school → Apps: switch an app off for this school. It disappears
// for everyone there (admins included) on the web and the ShuleCloud 360 app, and its
// own server routes are refused. Switching it back on restores it as it was.
export default function SchoolAppsCard({ schoolId, disabledApps, color = "#534AB7" }: { schoolId: string; disabledApps: string[]; color?: string }) {
    const qc = useQueryClient();
    const [off, setOff] = useState<string[]>(disabledApps);
    useEffect(() => setOff(disabledApps), [disabledApps.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
    const dirty = useMemo(() => [...off].sort().join(",") !== [...disabledApps].sort().join(","), [off, disabledApps]);

    const save = useMutation({
        mutationFn: async () => api.post(`/owner/schools/${schoolId}/apps`, { disabledApps: off }),
        onSuccess: () => { toast.success(off.length ? `${off.length} app(s) switched off for this school` : "All apps are on for this school"); qc.invalidateQueries({ queryKey: ["school_detail", schoolId] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not save"),
    });
    const toggle = (k: string) => setOff(o => (o.includes(k) ? o.filter(x => x !== k) : [...o, k]));
    const apps = APPS.filter(a => a.key !== "more");

    return (
        <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}1a`, color }}><AppWindow className="w-4 h-4" /></span>
                    <div>
                        <h3 className="text-sm font-black text-slate-800">Apps</h3>
                        <p className="text-[11px] text-slate-400">Switch an app off and it disappears for everyone at this school — web and phone app.</p>
                    </div>
                </div>
                <button onClick={() => save.mutate()} disabled={!dirty || save.isPending} className="h-9 px-4 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40" style={{ background: color }}>
                    {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                </button>
            </div>
            <div className="space-y-4">
                {APP_CATEGORIES.map(cat => {
                    const rows = apps.filter(a => a.category === cat.key);
                    if (!rows.length) return null;
                    return (
                        <div key={cat.key}>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">{cat.key}</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                                {rows.map(a => {
                                    const core = CORE_APPS.includes(a.key);
                                    const on = !off.includes(a.key);
                                    const Icon = a.icon;
                                    return (
                                        <div key={a.key} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border ${on ? "border-slate-200" : "border-rose-200 bg-rose-50/50"}`}>
                                            <span className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: `${a.color}14`, color: a.color }}><Icon className="w-3.5 h-3.5" /></span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-800 truncate">{a.name}</p>
                                                <p className="text-[10.5px] text-slate-400 truncate">{core ? "Always on" : on ? "On" : "Off for this school"}</p>
                                            </div>
                                            {core ? <Lock className="w-3.5 h-3.5 text-slate-300" /> : (
                                                <button type="button" onClick={() => toggle(a.key)} aria-label={`${a.name} ${on ? "on" : "off"}`}
                                                    className={`w-9 h-5 rounded-full relative shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
                                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
                                                </button>
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
