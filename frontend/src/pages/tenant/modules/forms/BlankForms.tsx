import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Printer, FileDown, Copy, Trash2, Pencil, X, FileText, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSchoolBrand } from "@/lib/printDoc";
import { outputHtmlDoc } from "@/lib/pdfDoc";
import { FormTemplate, FormField, FieldType, FIELD_LABELS, newField, uid, renderFormHtml } from "./formTemplate";

const PURPLE = "#5C67F2";
const ADD_TYPES: FieldType[] = ["section", "text", "date", "lines", "checkbox", "signature", "photo", "spacer"];

export default function BlankForms() {
    const qc = useQueryClient();
    const school = useSchoolBrand();
    const { data: templates = [], isLoading } = useQuery({ queryKey: ["form_templates"], queryFn: async () => (await api.get("/form_templates")).data as FormTemplate[] });
    const [editing, setEditing] = useState<FormTemplate | null>(null);

    const blank = (): FormTemplate => ({ name: "", title: "", version: "1.0", revision: "0", showPhoto: false, fields: [newField("section")] });

    const save = useMutation({
        mutationFn: async (t: FormTemplate) => {
            if (t._id) return api.patch(`/form_templates/${t._id}`, t);
            return api.post("/form_templates", t);
        },
        onSuccess: () => { toast.success("Template saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["form_templates"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Save failed"),
    });
    const del = useMutation({ mutationFn: (id: string) => api.delete(`/form_templates/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["form_templates"] }) });
    const duplicate = (t: FormTemplate) => save.mutate({ ...t, _id: undefined, name: `${t.name} (copy)`, fields: t.fields.map(f => ({ ...f, id: uid() })) } as any);

    const printForm = (t: FormTemplate) => outputHtmlDoc(t.title || t.name, renderFormHtml(t, school), { fileName: t.name, mode: "print" });
    const downloadForm = (t: FormTemplate) => outputHtmlDoc(t.title || t.name, renderFormHtml(t, school), { fileName: t.name, mode: "pdf" });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Blank Forms</h1>
                    <p className="text-sm text-slate-400">Design printable forms once, save as templates, and print or download A4 PDFs anytime. The school logo & details are added automatically.</p>
                </div>
                <button onClick={() => setEditing(blank())} className="h-10 px-4 rounded-xl text-white font-bold text-sm flex items-center gap-2" style={{ background: PURPLE }}><Plus className="w-4 h-4" /> New Form</button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : templates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2" /><p className="font-bold">No form templates yet</p><p className="text-sm">Click “New Form” to design your first printable form.</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(t => (
                        <div key={t._id} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col">
                            <div className="flex items-start justify-between">
                                <div className="min-w-0">
                                    <h3 className="font-black text-slate-800 truncate">{t.name}</h3>
                                    <p className="text-xs text-slate-400 truncate">{t.title || "—"}</p>
                                </div>
                                <span className="text-[10px] font-black text-slate-400">{t.fields?.length || 0} fields</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <button onClick={() => printForm(t)} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Print</button>
                                <button onClick={() => downloadForm(t)} className="h-9 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5"><FileDown className="w-3.5 h-3.5" /> PDF</button>
                                <button onClick={() => setEditing(t)} className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => duplicate(t)} className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { if (confirm(`Delete "${t.name}"?`)) del.mutate(t._id!); }} className="h-9 w-9 rounded-lg border border-rose-100 bg-rose-50 text-rose-400 flex items-center justify-center" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing && <Builder template={editing} school={school} onClose={() => setEditing(null)} onSave={t => save.mutate(t)} saving={save.isPending} addTypes={ADD_TYPES}
                onPreview={t => outputHtmlDoc(t.title || t.name, renderFormHtml(t, school), { fileName: t.name, mode: "print" })} />}
        </div>
    );
}

function Builder({ template, onClose, onSave, saving, addTypes, onPreview }: { template: FormTemplate; school: any; onClose: () => void; onSave: (t: FormTemplate) => void; saving: boolean; addTypes: FieldType[]; onPreview: (t: FormTemplate) => void }) {
    const [t, setT] = useState<FormTemplate>(JSON.parse(JSON.stringify(template)));
    const set = (patch: Partial<FormTemplate>) => setT(p => ({ ...p, ...patch }));
    const setField = (id: string, patch: Partial<FormField>) => setT(p => ({ ...p, fields: p.fields.map(f => f.id === id ? { ...f, ...patch } : f) }));
    const addField = (type: FieldType) => setT(p => ({ ...p, fields: [...p.fields, newField(type)] }));
    const removeField = (id: string) => setT(p => ({ ...p, fields: p.fields.filter(f => f.id !== id) }));
    const move = (i: number, dir: -1 | 1) => setT(p => { const arr = [...p.fields]; const j = i + dir; if (j < 0 || j >= arr.length) return p; [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...p, fields: arr }; });

    const canSave = t.name.trim() && t.fields.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="font-black text-slate-800">{t._id ? "Edit Form" : "New Form"}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Template meta */}
                    <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="Template name *"><input value={t.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Student Admission Form" className="inp" /></Field>
                        <Field label="Document title (printed)"><input value={t.title} onChange={e => set({ title: e.target.value })} placeholder="STUDENT ADMISSION FORM" className="inp" /></Field>
                        <Field label="Reference No. (optional)"><input value={t.reference || ""} onChange={e => set({ reference: e.target.value })} className="inp" /></Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Version"><input value={t.version || ""} onChange={e => set({ version: e.target.value })} className="inp" /></Field>
                            <Field label="Revision"><input value={t.revision || ""} onChange={e => set({ revision: e.target.value })} className="inp" /></Field>
                        </div>
                        <Field label="Footer note"><input value={t.footerNote || ""} onChange={e => set({ footerNote: e.target.value })} placeholder="Defaults to school name" className="inp" /></Field>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 mt-6"><input type="checkbox" checked={!!t.showPhoto} onChange={e => set({ showPhoto: e.target.checked })} /> Header passport-photo box</label>
                    </div>
                    <Field label="Instructions / description (optional)"><textarea value={t.description || ""} onChange={e => set({ description: e.target.value })} rows={2} className="inp" /></Field>

                    {/* Fields */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-black text-slate-700">Form Fields</h3>
                            <span className="text-xs text-slate-400">{t.fields.length} fields</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {addTypes.map(ty => (
                                <button key={ty} onClick={() => addField(ty)} className="h-8 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:border-[#5C67F2] hover:text-[#5C67F2]">+ {FIELD_LABELS[ty]}</button>
                            ))}
                        </div>
                        <div className="space-y-2">
                            {t.fields.map((f, i) => (
                                <div key={f.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/40">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400 bg-white border border-slate-200 rounded px-2 py-0.5">{FIELD_LABELS[f.type]}</span>
                                        <div className="ml-auto flex gap-1">
                                            <button onClick={() => move(i, -1)} className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 flex items-center justify-center"><ArrowUp className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => move(i, 1)} className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 flex items-center justify-center"><ArrowDown className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => removeField(f.id)} className="w-7 h-7 rounded-lg border border-rose-100 bg-rose-50 text-rose-400 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    {f.type !== "spacer" && (
                                        <input value={f.label} onChange={e => setField(f.id, { label: e.target.value })} placeholder="Field label" className="inp mb-2" />
                                    )}
                                    <div className="flex flex-wrap items-center gap-3">
                                        {(f.type === "lines" || f.type === "spacer") && (
                                            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">{f.type === "spacer" ? "Height" : "Lines"}: <input type="number" min={1} max={20} value={f.lines || 3} onChange={e => setField(f.id, { lines: Number(e.target.value) })} className="w-16 h-8 px-2 border border-slate-200 rounded-lg text-sm" /></label>
                                        )}
                                        {f.type === "checkbox" && (
                                            <input value={(f.options || []).join(", ")} onChange={e => setField(f.id, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="Comma-separated options" className="inp flex-1" />
                                        )}
                                        {["text", "date", "signature", "photo"].includes(f.type) && (
                                            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">Width:
                                                <select value={f.span || 2} onChange={e => setField(f.id, { span: Number(e.target.value) as 1 | 2 })} className="h-8 px-2 border border-slate-200 rounded-lg text-sm">
                                                    <option value={1}>Half</option><option value={2}>Full</option>
                                                </select>
                                            </label>
                                        )}
                                        {f.type !== "section" && f.type !== "spacer" && (
                                            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><input type="checkbox" checked={!!f.required} onChange={e => setField(f.id, { required: e.target.checked })} /> Required *</label>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-2">
                    <button onClick={onClose} className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">Cancel</button>
                    <button onClick={() => onPreview(t)} disabled={!canSave} className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-2 disabled:opacity-50"><Printer className="w-4 h-4" /> Preview / Print</button>
                    <button onClick={() => onSave(t)} disabled={!canSave || saving} className="h-11 px-6 rounded-xl text-white font-bold text-sm flex items-center gap-2 ml-auto disabled:opacity-50" style={{ background: PURPLE }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Template</button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="block"><span className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-1">{label}</span>{children}</label>;
}
