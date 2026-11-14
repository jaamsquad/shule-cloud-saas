import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Library, Loader2, Pencil, Plus, Search, Trash2, X, Sparkles, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useModuleCrud } from "@/contexts/PermissionsContext";
import { QPShell, Panel, Label, inp, useQPSubjects, useQPGrades, QuestionBody, QuestionEditor, QQuestion, DiffBadge, TypeBadge, TYPES, DIFFS, blankQuestion } from "./qpShared";

/** Question Paper → Question bank: every saved question, by subject. */
export default function QuestionBankPage() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const crud = useModuleCrud("question_paper");
    const [params, setParams] = useSearchParams();
    const { data: subjects = [], isLoading: loadingSubjects } = useQPSubjects();
    const { data: classes = [] } = useQPGrades();
    const subject = params.get("subject") || "";
    const setSubject = (k: string) => setParams(p => { const n = new URLSearchParams(p); if (k) n.set("subject", k); else n.delete("subject"); return n; });
    useEffect(() => { if (!subject && subjects.length) { const first = subjects.find((s: any) => s.count) || subjects[0]; setSubject(first.key); } }, [subjects]); // eslint-disable-line react-hooks/exhaustive-deps
    const subj = subjects.find((s: any) => s.key === subject);

    const [classId, setClassId] = useState(""); const [type, setType] = useState(""); const [difficulty, setDifficulty] = useState(""); const [q, setQ] = useState("");
    const { data: rows = [], isLoading } = useQuery<QQuestion[]>({
        queryKey: ["qp_bank", subject, classId, type, difficulty],
        enabled: !!subject,
        // classId holds the grade name here; "__none" = questions not yet given a class
        queryFn: async () => (await api.get("/qp/bank", { params: { subject: subj?.name || subject, subjectId: subj?.id, ...(classId === "__none" ? { unassigned: 1 } : classId ? { className: classId } : {}), type, difficulty } })).data || [],
    });
    const shown = useMemo(() => { const t = q.trim().toLowerCase(); return t ? rows.filter(r => JSON.stringify([r.text, r.parts, r.options]).toLowerCase().includes(t)) : rows; }, [rows, q]);
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [edit, setEdit] = useState<QQuestion | null>(null);
    const [saving, setSaving] = useState(false);
    const [showGlobal, setShowGlobal] = useState(true);
    const [adopting, setAdopting] = useState<string | null>(null);

    // ShuleCloud Library — the owner-uploaded shared bank, filtered the same way as our own.
    const { data: globalRows = [], isLoading: loadingGlobal } = useQuery<QQuestion[]>({
        queryKey: ["qp_bank_global", subject, classId, type, difficulty],
        enabled: !!subject && showGlobal,
        queryFn: async () => (await api.get("/qp/bank/global", { params: { subject: subj?.name || subject, ...(classId === "__none" ? {} : classId ? { className: classId } : {}), type, difficulty } })).data || [],
    });
    const globalShown = useMemo(() => { const t = q.trim().toLowerCase(); return t ? globalRows.filter(r => JSON.stringify([r.text, r.parts, r.options]).toLowerCase().includes(t)) : globalRows; }, [globalRows, q]);
    const adopt = async (id: string) => {
        setAdopting(id);
        try { const r = (await api.post("/qp/bank/adopt", { ids: [id] })).data; toast.success(r.added ? "Added to our bank" : "Already in our bank"); refresh(); }
        catch (e: any) { toast.error(e?.response?.data?.message || "Could not add"); } finally { setAdopting(null); }
    };

    const refresh = () => { qc.invalidateQueries({ queryKey: ["qp_bank"] }); qc.invalidateQueries({ queryKey: ["qp_bank_global"] }); qc.invalidateQueries({ queryKey: ["qp_subjects"] }); };
    const [bulkClass, setBulkClass] = useState("");
    const [aiBusy, setAiBusy] = useState(false);
    const assignClass = async () => {
        const cls = classes.find((c: any) => c.name === bulkClass); if (!cls || !sel.size) return;
        try { const r = (await api.post("/qp/bank/assign-class", { ids: [...sel], classId: cls.id, className: cls.name })).data; toast.success(`${r.updated} question${r.updated === 1 ? "" : "s"} moved to ${cls.name}`); setSel(new Set()); setBulkClass(""); refresh(); }
        catch (e: any) { toast.error(e?.response?.data?.message || "Could not assign"); }
    };
    const aiSchemes = async () => {
        if (!sel.size) return;
        setAiBusy(true);
        try { const r = (await api.post("/qp/bank/ai-answers", { ids: [...sel] })).data; toast.success(r.updated ? `AI wrote marking schemes for ${r.updated} question${r.updated === 1 ? "" : "s"} — check them` : (r.message || "Nothing to do")); refresh(); }
        catch (e: any) { toast.error(e?.response?.data?.message || "The AI could not answer right now"); } finally { setAiBusy(false); }
    };
    const saveEdit = async () => {
        if (!edit || !subj) return;
        if (!edit.text.trim() && !edit.parts.length) { toast.error("Write the question"); return; }
        const cls = classes.find((c: any) => c.name === ((edit as any).classPick ?? edit.className));
        if (!cls) { toast.error("Choose the class (grade) this question is for"); return; }
        setSaving(true);
        try {
            if (edit._id) await api.put(`/qp/bank/${edit._id}`, { ...edit, subjectId: subj.id, subjectName: subj.name, classId: cls.id, className: cls.name });
            else await api.post("/qp/bank", { subjectId: subj.id, subjectName: subj.name, classId: cls.id, className: cls.name, questions: [edit] });
            toast.success("Question saved"); setEdit(null); refresh();
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not save"); } finally { setSaving(false); }
    };
    const remove = async (ids: string[]) => {
        if (!ids.length || !confirm(`Delete ${ids.length} question${ids.length === 1 ? "" : "s"} from the bank?`)) return;
        try { await api.post("/qp/bank/delete", { ids }); toast.success("Deleted"); setSel(new Set()); refresh(); }
        catch (e: any) { toast.error(e?.response?.data?.message || "Could not delete"); }
    };
    const totalMarks = shown.reduce((a, r) => a + (r.marks || 0), 0);

    return (
        <QPShell title="Question bank" subtitle="All saved questions, by subject — add, edit, or use them to build a paper."
            actions={<>
                {crud.canCreate && <button onClick={() => subj ? setEdit(blankQuestion()) : toast.error("Choose a subject")} className="h-10 px-4 rounded-xl bg-white text-indigo-700 text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Add question</button>}
                <button onClick={() => navigate(`/papers/create?subject=${encodeURIComponent(subject)}`)} className="h-10 px-4 rounded-xl bg-white/15 text-white text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Build a paper</button>
            </>}>
            <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-start">
                <Panel title="Subjects" className="lg:sticky lg:top-4">
                    {loadingSubjects ? <Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" /> : (
                        <div className="-mx-2 max-h-[60vh] overflow-y-auto">
                            {subjects.map((s: any) => (
                                <button key={s.key} onClick={() => { setSubject(s.key); setSel(new Set()); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left ${s.key === subject ? "bg-indigo-50 text-indigo-700 font-black" : "text-slate-600 hover:bg-slate-50 font-semibold"}`}>
                                    <span className="truncate">{s.name}</span><span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${s.count ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"}`}>{s.count}</span>
                                </button>
                            ))}
                            {!subjects.length && <p className="text-xs text-slate-400 px-3">No subjects yet — add them under Subjects.</p>}
                        </div>
                    )}
                </Panel>

                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-3 flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search questions…" className={inp + " pl-9"} /></div>
                        <select value={classId} onChange={e => setClassId(e.target.value)} className={inp.replace("w-full", "w-full sm:w-44")}><option value="">All classes</option>{classes.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}<option value="__none">No class yet</option></select>
                        <select value={type} onChange={e => setType(e.target.value)} className={inp.replace("w-full", "w-full sm:w-44")}><option value="">All types</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
                        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={inp.replace("w-full", "w-full sm:w-44")}><option value="">Any difficulty</option>{DIFFS.map(d => <option key={d} value={d}>{d.toLowerCase()}</option>)}</select>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-black text-slate-700">{subj?.name || "—"}</span>
                        <span className="text-slate-400">{shown.length} question{shown.length === 1 ? "" : "s"} · {totalMarks} marks</span>
                        {sel.size > 0 && (
                            <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">{sel.size} selected</span>
                                {crud.canUpdate && <>
                                    <select value={bulkClass} onChange={e => setBulkClass(e.target.value)} className="h-9 px-2 rounded-xl border border-slate-200 text-xs bg-white"><option value="">Move to class…</option>{classes.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
                                    <button disabled={!bulkClass} onClick={assignClass} className="h-9 px-3 rounded-xl bg-slate-800 text-white text-xs font-bold disabled:opacity-40">Assign</button>
                                    <button disabled={aiBusy} onClick={aiSchemes} title="AI writes answers and marking schemes for selected questions without one" className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">{aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-slate-500" />} AI marking scheme</button>
                                </>}
                                {crud.canDelete && <button onClick={() => remove([...sel])} className="h-9 px-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete {sel.size}</button>}
                            </div>
                        )}
                    </div>
                    {isLoading ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div> : !shown.length ? (
                        <Panel><div className="py-14 text-center"><Library className="w-10 h-10 mx-auto text-slate-300" /><p className="mt-3 font-bold text-slate-500">No questions here yet.</p><p className="text-sm text-slate-400">Import a past paper, or add questions one by one.</p>
                            <button onClick={() => navigate("/papers/import")} className="mt-4 h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold">Import a paper</button></div></Panel>
                    ) : shown.map((r, i) => (
                        <div key={r._id} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 flex gap-3">
                            <input type="checkbox" checked={sel.has(r._id!)} onChange={() => setSel(s => { const n = new Set(s); if (n.has(r._id!)) n.delete(r._id!); else n.add(r._id!); return n; })} className="mt-1 w-4 h-4 accent-indigo-600" />
                            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-black text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5"><TypeBadge t={r.type} /><DiffBadge d={r.difficulty || "MEDIUM"} />{r.className ? <span className="text-[10px] font-bold text-slate-500">{r.className}</span> : <span className="text-[10px] font-bold text-amber-700">No class — not used in generated papers</span>}{r.chapterName && <span className="text-[10px] font-bold text-slate-400">· {r.chapterName}</span>}{r.timesUsed ? <span className="text-[10px] font-bold text-violet-500">used in {r.timesUsed} paper{r.timesUsed === 1 ? "" : "s"}</span> : null}<span className="ml-auto text-xs font-black text-slate-600">{r.marks ?? "?"} mk{r.marks === 1 ? "" : "s"}</span></div>
                                <QuestionBody q={r} showAnswer />
                            </div>
                            <div className="flex flex-col gap-1">
                                {crud.canUpdate && <button onClick={() => setEdit({ ...r })} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>}
                                {crud.canDelete && <button onClick={() => remove([r._id!])} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>}
                            </div>
                        </div>
                    ))}

                    {subject && (
                        <div className="pt-2">
                            <button onClick={() => setShowGlobal(s => !s)} className="flex items-center gap-2 text-sm font-black text-indigo-600 mb-2">
                                <GraduationCap className="w-4 h-4" /> ShuleCloud Library {showGlobal ? "▾" : "▸"} {globalShown.length > 0 && <span className="text-xs font-bold text-slate-400">({globalShown.length})</span>}
                            </button>
                            {showGlobal && (
                                loadingGlobal ? <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
                                : !globalShown.length ? <p className="text-xs text-slate-400 px-1">No shared questions for this subject/class yet.</p>
                                : globalShown.map((r, i) => (
                                    <div key={r._id} className="bg-indigo-50/40 rounded-2xl border border-indigo-100 p-4 flex gap-3 mb-3">
                                        <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5"><TypeBadge t={r.type} /><DiffBadge d={r.difficulty || "MEDIUM"} /><span className="text-[10px] font-black text-indigo-500 uppercase">ShuleCloud Library</span>{r.className && <span className="text-[10px] font-bold text-slate-500">{r.className}</span>}<span className="ml-auto text-xs font-black text-slate-600">{r.marks ?? "?"} mk{r.marks === 1 ? "" : "s"}</span></div>
                                            <QuestionBody q={r} showAnswer />
                                        </div>
                                        {crud.canCreate && <button onClick={() => adopt(r._id!)} disabled={adopting === r._id} className="h-8 px-3 shrink-0 self-start rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">{adopting === r._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add to our bank"}</button>}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {edit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40" onClick={() => setEdit(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between"><h2 className="font-black text-slate-800">{edit._id ? "Edit question" : `New ${subj?.name || ""} question`}</h2><button onClick={() => setEdit(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                        <div className="p-5 overflow-y-auto space-y-3">
                            <div><Label>Class (grade) *</Label><select value={(edit as any).classPick ?? (classes.find((c: any) => c.name.toLowerCase() === String(edit.className || "").toLowerCase())?.name || "")} onChange={e => setEdit({ ...edit, classPick: e.target.value } as any)} className={inp}><option value="">Choose class…</option>{classes.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}</select></div>
                            <QuestionEditor value={edit} onChange={setEdit} />
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-3"><button onClick={() => setEdit(null)} className="flex-1 h-10 border border-slate-200 rounded-xl font-bold text-sm text-slate-600">Cancel</button>
                            <button onClick={saveEdit} disabled={saving} className="flex-1 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</button></div>
                    </div>
                </div>
            )}
        </QPShell>
    );
}
