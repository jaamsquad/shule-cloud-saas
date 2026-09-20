import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Check, X, MessageSquare } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

// Integrations that send SMS through an HTTP API and take part in the priority order.
export const SMS_API_KEYS = ["africas_talking", "talksasa"];

export type SmsProvider = { key: string; name: string; configured: boolean; enabled: boolean; ready: boolean };
export type SmsProvidersState = { providers: SmsProvider[]; priority: string[]; order: string[]; active: string | null };
export type SmsChoice = { priority: string[]; disable: string[] };

export const SMS_PROVIDERS_KEY = ["sms_providers"];
export function useSmsProviders(enabled: boolean) {
    return useQuery<SmsProvidersState>({ queryKey: SMS_PROVIDERS_KEY, enabled, queryFn: async () => (await api.get("/communications/sms/providers")).data });
}

// Small ordered list with up/down arrows. `keys` is the order, first = tried first.
function OrderList({ keys, names, onChange }: { keys: string[]; names: Record<string, string>; onChange: (k: string[]) => void }) {
    const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= keys.length) return; const n = keys.slice(); [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
    return (
        <div className="space-y-2">
            {keys.map((k, i) => (
                <div key={k} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#5C67F2] text-white text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm font-bold text-gray-700">{names[k] || k}</span>
                    {i === 0 && <span className="text-[10px] font-black uppercase text-emerald-600">Used first</span>}
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-500 disabled:opacity-30 flex items-center justify-center"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === keys.length - 1} className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-500 disabled:opacity-30 flex items-center justify-center"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
            ))}
        </div>
    );
}

/**
 * Shown when an admin switches an SMS gateway ON while others are already on:
 * either turn the others off, or keep them all and choose which is used first.
 */
export function SmsChoiceDialog({ thisKey, thisName, others, onCancel, onConfirm }: {
    thisKey: string; thisName: string; others: SmsProvider[]; onCancel: () => void; onConfirm: (c: SmsChoice) => void;
}) {
    const [mode, setMode] = useState<"only" | "priority">("only");
    const names: Record<string, string> = { [thisKey]: thisName, ...Object.fromEntries(others.map(o => [o.key, o.name])) };
    const [order, setOrder] = useState<string[]>([thisKey, ...others.map(o => o.key)]);

    const confirm = () => {
        if (mode === "only") onConfirm({ disable: others.map(o => o.key), priority: [thisKey, ...others.map(o => o.key)] });
        else onConfirm({ disable: [], priority: order });
    };
    const opt = (active: boolean) => `w-full text-left p-4 rounded-xl border-2 transition-all ${active ? "border-[#5C67F2] bg-indigo-50/60" : "border-gray-100 hover:border-indigo-200"}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-slate-50 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-[#5C67F2] flex items-center justify-center shrink-0"><MessageSquare className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-black text-gray-800 text-lg">Other SMS providers are on</h3>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">
                                {others.map(o => o.name).join(" and ")} {others.length === 1 ? "is" : "are"} already sending SMS for this school. How should {thisName} work alongside {others.length === 1 ? "it" : "them"}?
                            </p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button>
                </div>

                <div className="p-6 space-y-3">
                    <button type="button" onClick={() => setMode("only")} className={opt(mode === "only")}>
                        <p className="text-sm font-black text-gray-800">Use {thisName} only</p>
                        <p className="text-xs text-gray-500 mt-0.5">Turn off {others.map(o => o.name).join(" and ")}. Every SMS goes through {thisName}.</p>
                    </button>
                    <button type="button" onClick={() => setMode("priority")} className={opt(mode === "priority")}>
                        <p className="text-sm font-black text-gray-800">Keep them all on and choose the order</p>
                        <p className="text-xs text-gray-500 mt-0.5">The first one is used. If it can't send (out of credit, unreachable) the next one takes over.</p>
                    </button>
                    {mode === "priority" && <div className="pt-1"><OrderList keys={order} names={names} onChange={setOrder} /></div>}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                    <button onClick={confirm} className="px-5 py-2.5 rounded-xl font-bold text-white bg-[#5C67F2] hover:bg-[#4a54c4] transition-colors flex items-center gap-2"><Check className="w-4 h-4" /> Continue</button>
                </div>
            </div>
        </div>
    );
}

/** On an SMS integration page: the order the school's SMS gateways are tried in (when more than one is on). */
export function SmsPriorityCard() {
    const qc = useQueryClient();
    const { data } = useSmsProviders(true);
    const [draft, setDraft] = useState<string[] | null>(null);
    const [saving, setSaving] = useState(false);

    const ready = (data?.providers || []).filter(p => p.ready);
    if (!data || ready.length < 2) return null;

    const names = Object.fromEntries(data.providers.map(p => [p.key, p.name]));
    const keys = draft || data.order;
    const save = async () => {
        setSaving(true);
        try {
            // Rank the ready ones as chosen; the rest keep their place after them.
            await api.put("/communications/sms/providers", { priority: [...keys, ...data.priority.filter(k => !keys.includes(k))] });
            await qc.invalidateQueries({ queryKey: SMS_PROVIDERS_KEY });
            setDraft(null);
            toast.success("SMS provider order saved");
        } catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); } finally { setSaving(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-black text-gray-800 mb-1">SMS provider order</h2>
            <p className="text-xs text-gray-500 font-medium mb-4">More than one SMS provider is on. The first is used; if it can't send, the next one takes over.</p>
            <OrderList keys={keys} names={names} onChange={setDraft} />
            {draft && (
                <button onClick={save} disabled={saving} className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold text-sm rounded-xl disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save order
                </button>
            )}
        </div>
    );
}
