import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Save, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { nemis, FieldStatus } from "../nemis/nemisApi";

// Every NEMIS detail of the learner, read-only until Edit is pressed. Fields that live elsewhere in the
// student's record (admission no., name, class, photo) are changed from the student's edit page.
const EDITABLE: Record<string, { type?: "date" | "select"; options?: string[] }> = {
    upi: {}, birthCertNo: {}, dob: { type: "date" }, gender: { type: "select", options: ["Male", "Female"] }, nationality: {},
    county: {}, subCounty: {}, ward: {}, admissionDate: { type: "date" }, disability: {},
    parentName: {}, parentPhone: {}, guardianName: {}, guardianPhone: {},
};
const DOT: Record<string, string> = { ready: "bg-emerald-500", warning: "bg-amber-400", missing: "bg-rose-500" };
const ISO = /^\d{4}-\d{2}-\d{2}/;

export default function NemisDetailsCard({ studentId, canEdit }: { studentId: string; canEdit: boolean }) {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery<any>({ queryKey: ["nemis_student", studentId], queryFn: () => nemis.student(studentId), enabled: !!studentId });
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const fields: FieldStatus[] = data?.validation?.fields || [];
    const score: number | undefined = data?.validation?.score;

    const start = () => { setForm(Object.fromEntries(fields.filter(f => f.key in EDITABLE).map(f => [f.key, f.value || ""]))); setEditing(true); };
    const save = async () => {
        setSaving(true);
        try {
            await nemis.updateStudent(studentId, form);
            toast.success("Details saved");
            await qc.invalidateQueries({ queryKey: ["nemis_student", studentId] });
            qc.invalidateQueries({ queryKey: ["students"] });
            setEditing(false);
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not save"); } finally { setSaving(false); }
    };

    const show = (f: FieldStatus) => f.key === "passportPhoto" ? (f.value ? "Uploaded" : "—") : (f.value || (f.status === "missing" ? "Missing" : "—"));

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-[#868DF4] font-black flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Learner details (NEMIS){score != null && <span className={`ml-2 text-[10px] font-black px-2 py-0.5 rounded-full ${score >= 90 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{score}% complete</span>}</h3>
                {canEdit && !editing && fields.length > 0 && <button onClick={start} className="h-9 px-4 rounded-lg bg-[#868DF4] hover:bg-[#6f77e8] text-white text-xs font-bold flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
            </div>

            {isLoading ? <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#868DF4]" /></div> : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                        {fields.map(f => {
                            const ed = editing && f.key in EDITABLE;
                            const cfg = EDITABLE[f.key] || {};
                            return (
                                <div key={f.key} className="min-w-0">
                                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 mb-0.5"><span className={`w-1.5 h-1.5 rounded-full ${DOT[f.status]}`} />{f.label}</div>
                                    {ed ? (
                                        cfg.type === "select"
                                            ? <select value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="">Select…</option>{cfg.options!.map(o => <option key={o}>{o}</option>)}</select>
                                            : cfg.type === "date" && (!form[f.key] || ISO.test(form[f.key]))
                                                ? <input type="date" value={(form[f.key] || "").slice(0, 10)} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                                                : <input value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                                    ) : (
                                        <div className={`text-sm font-semibold break-words ${f.value ? "text-slate-800" : f.status === "missing" ? "text-rose-500" : "text-slate-400"}`}>{show(f)}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {editing && (
                        <div className="mt-5 flex gap-2">
                            <button onClick={save} disabled={saving} className="h-10 px-5 rounded-lg bg-[#868DF4] hover:bg-[#6f77e8] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button>
                            <button onClick={() => setEditing(false)} className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <span className="text-[11px] text-slate-400 self-center ml-1">Name, admission no., class and photo are changed from Edit Student.</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
