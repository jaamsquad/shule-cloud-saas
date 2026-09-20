import { useEffect, useState } from "react";
import { Home, Loader2, Save, Hash } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { useModuleCrud } from "@/contexts/PermissionsContext";

export type NumberingRule = { enabled: boolean; prefix: string; separator: string; useYear: boolean; padding: number; next: number; preview?: string };
export type NumberingConfig = { student: NumberingRule; staff: NumberingRule };
export const NUMBERING_KEY = ["numbering_settings"];

// The numbering rules — used here and by the add forms (to know if a number is automatic).
export function useNumbering() {
    return useQuery<NumberingConfig>({ queryKey: NUMBERING_KEY, queryFn: async () => (await api.get("/settings/numbering")).data, staleTime: 30_000 });
}

// Same formatting as the server, for the live example.
const example = (r: NumberingRule, n: number) =>
    [r.prefix, r.useYear ? String(new Date().getFullYear()) : "", String(n).padStart(r.padding, "0")].filter(Boolean).join(r.separator);

const SEPARATORS = [{ v: "", l: "None" }, { v: "-", l: "Dash ( - )" }, { v: "/", l: "Slash ( / )" }, { v: "_", l: "Underscore ( _ )" }];

function RuleCard({ title, hint, rule, onChange, disabled }: { title: string; hint: string; rule: NumberingRule; onChange: (r: NumberingRule) => void; disabled: boolean }) {
    const set = (patch: Partial<NumberingRule>) => onChange({ ...rule, ...patch });
    const input = "h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white font-medium text-gray-700 w-full disabled:bg-gray-50";
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-black text-gray-800">{title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer select-none">
                    <input type="checkbox" checked={rule.enabled} disabled={disabled} onChange={e => set({ enabled: e.target.checked })} className="w-4 h-4 accent-[#5C67F2]" />
                    Generate automatically
                </label>
            </div>

            <div className={`mt-5 grid grid-cols-2 md:grid-cols-5 gap-4 transition-opacity ${rule.enabled ? "" : "opacity-40 pointer-events-none"}`}>
                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Prefix</label>
                    <input value={rule.prefix} disabled={disabled} maxLength={12} onChange={e => set({ prefix: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() })} placeholder="e.g. KHS" className={input} />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Separator</label>
                    <select value={rule.separator} disabled={disabled} onChange={e => set({ separator: e.target.value })} className={input}>
                        {SEPARATORS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Include year</label>
                    <select value={rule.useYear ? "yes" : "no"} disabled={disabled} onChange={e => set({ useYear: e.target.value === "yes" })} className={input}>
                        <option value="no">No</option>
                        <option value="yes">Yes ({new Date().getFullYear()})</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Digits</label>
                    <input type="number" min={1} max={8} value={rule.padding} disabled={disabled} onChange={e => set({ padding: Math.min(8, Math.max(1, Number(e.target.value) || 1)) })} className={input} />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Next number</label>
                    <input type="number" min={1} value={rule.next} disabled={disabled} onChange={e => set({ next: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} className={input} />
                </div>
            </div>

            <div className="mt-5 flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <Hash className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Next ones</span>
                <span className="font-mono text-sm font-black text-[#5C67F2]">
                    {rule.enabled ? [0, 1, 2].map(i => example(rule, rule.next + i)).join("  ·  ") : "Automatic numbering is off — numbers are typed in by hand."}
                </span>
            </div>
        </div>
    );
}

export default function NumberingSettings() {
    const qc = useQueryClient();
    const { canUpdate } = useModuleCrud("settings");
    const { data, isLoading } = useNumbering();
    const [form, setForm] = useState<NumberingConfig | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (data && !form) setForm({ student: data.student, staff: data.staff }); }, [data, form]);

    const save = async () => {
        if (!form) return;
        setSaving(true);
        try {
            const res = await api.put("/settings/numbering", form);
            qc.setQueryData(NUMBERING_KEY, res.data);
            setForm({ student: res.data.student, staff: res.data.staff });
            toast.success("Registration number settings saved");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to save settings");
        } finally { setSaving(false); }
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-sm mr-2">General Settings</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- Registration Numbers</span>
            </div>

            <div className="p-6 pt-0 w-full max-w-5xl space-y-5">
                <div>
                    <h2 className="text-xl font-black text-gray-800">Registration Numbers</h2>
                    <p className="text-sm text-gray-500 mt-1">Turn on automatic numbering and each new student or employee gets the next number in the format you choose. Records that already have a number keep it.</p>
                </div>

                {isLoading || !form ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>
                ) : (
                    <>
                        <RuleCard title="Student registration numbers" hint="Used when a student is admitted, added quickly, or imported without a registration number." rule={form.student} disabled={!canUpdate} onChange={r => setForm({ ...form, student: r })} />
                        <RuleCard title="Employee numbers" hint="Used when an employee is added or imported without an employee number." rule={form.staff} disabled={!canUpdate} onChange={r => setForm({ ...form, staff: r })} />
                        {canUpdate && (
                            <div className="flex justify-end">
                                <button onClick={save} disabled={saving} className="h-11 px-6 bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold rounded-full shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save settings
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
