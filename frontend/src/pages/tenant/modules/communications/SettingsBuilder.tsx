import { useState, useEffect, ReactNode, ComponentType } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export type FieldType = "toggle" | "text" | "number" | "textarea" | "select" | "date" | "time";
export interface SBField { k: string; label: string; type: FieldType; options?: string[] }
export interface SBSection { title: string; icon?: ComponentType<any>; fields: SBField[] }

interface Props {
    title: string;
    subtitle?: string;
    icon?: ComponentType<any>;
    collection: string;          // e.g. "notification_settings"
    sections: SBSection[];
    defaults?: Record<string, any>;
    extra?: ReactNode;           // rendered below the sections
    recordId?: string;           // edit a specific record (e.g. a term)
    recordField?: string;        // field that holds recordId (default "recordId")
    prefill?: Record<string, any>; // values to seed when creating (e.g. term basics)
}

// Generic config-driven settings page. Edits a single doc of `collection`, or a
// specific record when `recordId`/`recordField` are given (e.g. one per term).
export default function SettingsBuilder({ title, subtitle, icon: Icon, collection, sections, defaults = {}, extra, recordId, recordField = "recordId", prefill }: Props) {
    const qc = useQueryClient();
    const [docId, setDocId] = useState<string | null>(null);
    const [form, setForm] = useState<Record<string, any>>({ ...defaults, ...prefill });

    const { data, isLoading } = useQuery({
        queryKey: [collection, recordId || "single"],
        queryFn: async () => { const r = await api.get(`/${collection}`); return Array.isArray(r.data) ? r.data : (r.data ? [r.data] : []); },
    });

    useEffect(() => {
        const arr: any[] = Array.isArray(data) ? data : [];
        const doc = recordId ? arr.find(d => String(d[recordField]) === String(recordId)) : arr[0];
        if (doc) { setDocId(doc._id || doc.id); setForm({ ...defaults, ...prefill, ...doc }); }
        else { setDocId(null); setForm({ ...defaults, ...prefill }); }
    }, [data, recordId]); // eslint-disable-line

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const save = useMutation({
        mutationFn: async () => {
            const payload: any = { ...form, updatedAt: new Date() };
            if (recordId) payload[recordField] = recordId;
            return docId ? api.patch(`/${collection}/${docId}`, payload) : api.post(`/${collection}`, payload);
        },
        onSuccess: (res: any) => { if (!docId) setDocId(res.data?.id || res.data?._id); qc.invalidateQueries({ queryKey: [collection] }); toast.success("Settings saved"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });

    const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
        <button onClick={onClick} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? "bg-[#5C67F2]" : "bg-slate-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${on ? "translate-x-5" : ""}`} />
        </button>
    );

    const renderField = (f: SBField) => {
        const v = form[f.k];
        if (f.type === "toggle") return <Toggle on={!!v} onClick={() => set(f.k, !v)} />;
        if (f.type === "select") return <select value={v || ""} onChange={e => set(f.k, e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#5C67F2]"><option value="">— Select —</option>{f.options!.map(o => <option key={o}>{o}</option>)}</select>;
        if (f.type === "textarea") return <textarea value={v || ""} onChange={e => set(f.k, e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />;
        return <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"} value={v ?? ""} onChange={e => set(f.k, f.type === "number" ? Number(e.target.value) : e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />;
    };

    if (isLoading) return <div className="flex-1 flex items-center justify-center min-h-screen bg-[#f8fafc]"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>;

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen pb-16">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3 shadow-sm">
                {Icon && <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center"><Icon className="w-5 h-5 text-indigo-600" /></div>}
                <div className="flex-1">
                    <h1 className="text-lg font-black text-slate-800">{title}</h1>
                    {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                </div>
                <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#5C67F2] text-white text-xs font-black hover:opacity-90 disabled:opacity-50">
                    {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </button>
            </div>

            <div className="px-6 mt-5 space-y-5 max-w-5xl">
                {sections.map(sec => (
                    <div key={sec.title} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                            {sec.icon && <sec.icon className="w-4 h-4 text-[#5C67F2]" />}
                            <h2 className="text-sm font-black text-slate-700">{sec.title}</h2>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                            {sec.fields.map(f => (
                                <div key={f.k} className={`${f.type === "textarea" ? "md:col-span-2" : ""} ${f.type === "toggle" ? "flex items-center justify-between gap-3" : ""}`}>
                                    <label className={`text-xs font-bold text-slate-600 ${f.type === "toggle" ? "" : "block mb-1"}`}>{f.label}</label>
                                    {renderField(f)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {extra}
            </div>
        </div>
    );
}

// Helper to turn [key,label] pairs into toggle fields.
export const toggles = (pairs: [string, string][]): SBField[] => pairs.map(([k, label]) => ({ k, label, type: "toggle" as const }));
