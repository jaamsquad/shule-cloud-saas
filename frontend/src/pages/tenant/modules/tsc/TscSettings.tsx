import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { tsc } from "./tscApi";

const BLUE = "#1D4ED8";

export default function TscSettings() {
    const { data, isLoading } = useQuery({ queryKey: ["tsc_settings"], queryFn: tsc.settings });
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    useEffect(() => { if (data) setForm(data); }, [data]);

    const save = async () => { setSaving(true); try { await tsc.setSettings(form); toast.success("Settings saved"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); } };
    const setList = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v.split(",").map(s => s.trim()).filter(Boolean) }));

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#1D4ED8]" /></div>;

    return (
        <div className="max-w-2xl space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-700">Workload Rules</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[["maxLessonsPerWeek", "Max Lessons/Week"], ["minLessonsPerWeek", "Min Lessons/Week"], ["lessonMinutes", "Lesson Minutes"]].map(([k, l]) => (
                        <div key={k}><label className="block text-[11px] font-bold text-slate-600 mb-1">{l}</label><input type="number" value={form[k] ?? ""} onChange={e => setForm((f: any) => ({ ...f, [k]: Number(e.target.value) }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1D4ED8]" /></div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-700">Lists (comma-separated)</h3>
                {[["employmentTypes", "Employment Types"], ["leaveTypes", "Leave Types"], ["jobGroups", "Job Groups"], ["qualificationCategories", "Qualification Categories"]].map(([k, l]) => (
                    <div key={k}><label className="block text-[11px] font-bold text-slate-600 mb-1">{l}</label><input value={(form[k] || []).join(", ")} onChange={e => setList(k, e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1D4ED8]" /></div>
                ))}
            </div>

            <button onClick={save} disabled={saving} className="h-10 px-5 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: BLUE }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings</button>
        </div>
    );
}
