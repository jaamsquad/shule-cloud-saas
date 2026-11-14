/**
 * Student profile → Other details: SHA number, exam numbers, entry details, extra contacts and comments
 * (the fields the bulk import and admission form fill in that the NEMIS card doesn't cover).
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Save, IdCard } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const FIELDS: { key: string; label: string; alt?: string[] }[] = [
    { key: "shaNumber", label: "SHA number", alt: ["sha", "nhifNumber"] },
    { key: "indexNumber", label: "KCSE / KJSEA index no." },
    { key: "placeOfBirth", label: "Place of birth" },
    { key: "enrollmentForm", label: "Joined in (class)" },
    { key: "entryPosition", label: "Entry position" },
    { key: "kcpeYear", label: "KCPE / KPSEA year" },
    { key: "kcpeScore", label: "KCPE / KPSEA score", alt: ["kcpe", "kcpeMarks"] },
    { key: "kcpeIndex", label: "KCPE / KPSEA index" },
    { key: "kcpeGrade", label: "KCPE grade" },
    { key: "primarySchool", label: "Primary school" },
    { key: "previousSchool", label: "Previous school" },
    { key: "guardianRelation", label: "Guardian relation" },
    { key: "parentPhone2", label: "Primary phone 2" },
    { key: "secondaryPhone", label: "Secondary phone" },
    { key: "secondaryPhone2", label: "Secondary phone 2" },
    { key: "comments", label: "General comments" },
];
const valueOf = (s: any, f: { key: string; alt?: string[] }) => { for (const k of [f.key, ...(f.alt || [])]) if (s?.[k] !== undefined && s?.[k] !== null && String(s[k]).trim() !== "") return String(s[k]); return ""; };

export default function OtherDetailsCard({ student, canEdit }: { student: any; canEdit: boolean }) {
    const qc = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const start = () => { setForm(Object.fromEntries(FIELDS.map(f => [f.key, valueOf(student, f)]))); setEditing(true); };
    const save = async () => {
        setSaving(true);
        try {
            await api.patch(`/students/${student._id}`, Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])));
            toast.success("Details saved");
            qc.invalidateQueries({ queryKey: ["students"] });
            setEditing(false);
        } catch (e: unknown) { toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not save"); }
        finally { setSaving(false); }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-[#868DF4] font-black flex items-center gap-2"><IdCard className="w-4 h-4" /> Other details</h3>
                {canEdit && (editing ? (
                    <div className="flex gap-2">
                        <button onClick={() => setEditing(false)} className="h-9 px-3 rounded-lg text-xs font-bold text-slate-600 border border-slate-200">Cancel</button>
                        <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg bg-[#868DF4] hover:bg-[#6f77e8] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save</button>
                    </div>
                ) : <button onClick={start} className="h-9 px-4 rounded-lg bg-[#868DF4] hover:bg-[#6f77e8] text-white text-xs font-bold flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit</button>)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {FIELDS.map(f => (
                    <div key={f.key} className={`min-w-0 ${f.key === "comments" ? "sm:col-span-2" : ""}`}>
                        <div className="text-[11px] font-bold text-slate-500 mb-0.5">{f.label}</div>
                        {editing
                            ? (f.key === "comments"
                                ? <textarea rows={2} value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
                                : <input value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm" />)
                            : <div className="text-sm font-semibold text-slate-700 break-words">{valueOf(student, f) || <span className="text-slate-300 font-normal">—</span>}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}
