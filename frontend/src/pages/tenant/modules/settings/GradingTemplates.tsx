import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Plus, Loader2, Trash2, Pencil, X, Check, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// Grading Scale Templates — create named scales (e.g. "KCSE 12-Point", "Junior
// School"), assign classes to them, and reuse across many classes. A class assigned
// to a template uses that template's scale on report cards & analytics.
const DEFAULT_BANDS = [
    { grade: "A", from: 80, upto: 100, points: 12, remark: "EXCELLENT" },
    { grade: "A-", from: 75, upto: 79, points: 11, remark: "V.GOOD" },
    { grade: "B+", from: 70, upto: 74, points: 10, remark: "GOOD" },
    { grade: "B", from: 65, upto: 69, points: 9, remark: "GOOD" },
    { grade: "B-", from: 60, upto: 64, points: 8, remark: "GOOD" },
    { grade: "C+", from: 55, upto: 59, points: 7, remark: "FAIR" },
    { grade: "C", from: 50, upto: 54, points: 6, remark: "FAIR" },
    { grade: "C-", from: 45, upto: 49, points: 5, remark: "AVERAGE" },
    { grade: "D+", from: 40, upto: 44, points: 4, remark: "BELOW AVG" },
    { grade: "D", from: 35, upto: 39, points: 3, remark: "WEAK" },
    { grade: "D-", from: 30, upto: 34, points: 2, remark: "WEAK" },
    { grade: "E", from: 0, upto: 29, points: 1, remark: "POOR" },
];

export default function GradingTemplates() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<any | null>(null);
    const [assignFor, setAssignFor] = useState<any | null>(null);

    const { data: templates = [], isLoading } = useQuery({ queryKey: ["grading_templates"], queryFn: async () => { const r = await api.get("/grading-templates"); return Array.isArray(r.data) ? r.data : []; } });
    const invalidate = () => qc.invalidateQueries({ queryKey: ["grading_templates"] });

    const del = useMutation({
        mutationFn: async (id: string) => api.delete(`/grading-templates/${id}`),
        onSuccess: () => { toast.success("Template deleted"); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center"><Award className="w-5 h-5 text-indigo-600" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">Grading Scale Templates</h1><p className="text-xs text-slate-500">Create named grading scales and assign classes. Many classes can share one template.</p></div>
                </div>
                <button onClick={() => setEditing({ name: "", grades: DEFAULT_BANDS })} className="inline-flex items-center gap-2 bg-[#5C67F2] text-white text-sm font-bold px-4 py-2 rounded-lg"><Plus className="w-4 h-4" /> New Template</button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            ) : templates.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
                    <Award className="w-10 h-10 mx-auto mb-2" /><p className="font-bold text-sm">No grading templates yet.</p>
                    <p className="text-xs">Create one and assign classes to it.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {templates.map((t: any) => (
                        <div key={t._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div><h3 className="font-black text-slate-800">{t.name}</h3><p className="text-[11px] text-slate-400">{t.grades?.length || 0} bands</p></div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => setEditing(t)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-[#5C67F2] flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => { if (confirm(`Delete "${t.name}"? Assigned classes fall back to the global scale.`)) del.mutate(t._id); }} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                                {(t.grades || []).slice(0, 12).map((g: any, i: number) => (
                                    <span key={i} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{g.grade} {g.from}-{g.upto}</span>
                                ))}
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {t.assignedClasses || 0} class{t.assignedClasses !== 1 ? "es" : ""}</span>
                                <button onClick={() => setAssignFor(t)} className="text-[11px] font-black text-[#5C67F2] hover:underline">Assign classes →</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing && <TemplateForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { invalidate(); setEditing(null); }} />}
            {assignFor && <AssignModal template={assignFor} onClose={() => setAssignFor(null)} onSaved={() => { invalidate(); setAssignFor(null); }} />}
        </div>
    );
}

function TemplateForm({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState(initial.name || "");
    const [grades, setGrades] = useState<any[]>(initial.grades?.length ? initial.grades : DEFAULT_BANDS);
    const save = useMutation({
        mutationFn: async () => initial._id ? api.patch(`/grading-templates/${initial._id}`, { name, grades }) : api.post("/grading-templates", { name, grades }),
        onSuccess: () => { toast.success("Saved"); onSaved(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const setBand = (i: number, k: string, v: any) => setGrades(g => g.map((b, idx) => idx === i ? { ...b, [k]: k === "grade" || k === "remark" ? v : Number(v) } : b));
    const addBand = () => setGrades(g => [...g, { grade: "", from: 0, upto: 0, points: g.length ? 0 : 1, remark: "" }]);
    const rmBand = (i: number) => setGrades(g => g.filter((_, idx) => idx !== i));

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-8">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <h3 className="font-black text-slate-800">{initial._id ? "Edit" : "New"} Grading Template</h3>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Template Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. KCSE 12-Point, Junior School" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mb-4" />
                    <div className="grid grid-cols-[1fr_70px_70px_70px_1.4fr_32px] gap-2 text-[10px] font-black uppercase text-slate-400 mb-1 px-1">
                        <span>Grade</span><span>From %</span><span>Upto %</span><span>Points</span><span>Remark</span><span></span>
                    </div>
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                        {grades.map((b, i) => (
                            <div key={i} className="grid grid-cols-[1fr_70px_70px_70px_1.4fr_32px] gap-2 items-center">
                                <input value={b.grade} onChange={e => setBand(i, "grade", e.target.value)} className="h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                                <input type="number" value={b.from} onChange={e => setBand(i, "from", e.target.value)} className="h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                                <input type="number" value={b.upto} onChange={e => setBand(i, "upto", e.target.value)} className="h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                                <input type="number" value={b.points} onChange={e => setBand(i, "points", e.target.value)} className="h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                                <input value={b.remark} onChange={e => setBand(i, "remark", e.target.value)} className="h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                                <button onClick={() => rmBand(i)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addBand} className="mt-2 text-xs font-bold text-[#5C67F2] hover:underline">+ Add band</button>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="text-sm font-bold text-slate-500 px-4 py-2">Cancel</button>
                    <button onClick={() => name.trim() ? save.mutate() : toast.error("Name required")} disabled={save.isPending} className="bg-[#5C67F2] text-white text-sm font-bold px-5 py-2 rounded disabled:opacity-50 inline-flex items-center gap-1.5">{save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save</button>
                </div>
            </div>
        </div>
    );
}

function AssignModal({ template, onClose, onSaved }: { template: any; onClose: () => void; onSaved: () => void }) {
    const { data: classes = [] } = useQuery({ queryKey: ["v2_classes_for_grading"], queryFn: async () => { const r = await api.get("/v2/classes"); return Array.isArray(r.data) ? r.data : []; } });
    const [selected, setSelected] = useState<string[]>([]);
    // Seed the selection from classes already on this template, once they load.
    useEffect(() => {
        if (classes.length) setSelected(classes.filter((c: any) => String(c.gradingTemplateId) === String(template._id)).map((c: any) => String(c._id)));
    }, [classes, template._id]);
    const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const save = useMutation({
        mutationFn: async () => api.post(`/grading-templates/${template._id}/assign`, { classIds: selected }),
        onSuccess: () => { toast.success("Classes assigned"); onSaved(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <h3 className="font-black text-slate-800">Assign to “{template.name}”</h3>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 max-h-80 overflow-y-auto space-y-1.5">
                    {classes.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No classes found.</p> : classes.map((c: any) => {
                        const on = selected.includes(String(c._id));
                        const otherTemplate = c.gradingTemplateId && String(c.gradingTemplateId) !== String(template._id);
                        return (
                            <button key={c._id} onClick={() => toggle(String(c._id))} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${on ? "border-[#5C67F2] bg-[#5C67F2]/5" : "border-slate-100 hover:bg-slate-50"}`}>
                                <span className="text-sm font-bold text-slate-700">{c.name} {c.curriculumType ? <span className="text-[9px] text-slate-400">· {c.curriculumType}</span> : null}</span>
                                <span className="flex items-center gap-2">{otherTemplate && !on && <span className="text-[9px] text-amber-500">assigned elsewhere</span>}{on && <Check className="w-4 h-4 text-[#5C67F2]" />}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="text-sm font-bold text-slate-500 px-4 py-2">Cancel</button>
                    <button onClick={() => save.mutate()} disabled={save.isPending} className="bg-[#5C67F2] text-white text-sm font-bold px-5 py-2 rounded disabled:opacity-50">Save Assignment</button>
                </div>
            </div>
        </div>
    );
}
