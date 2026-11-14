import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Pencil, Save, Sparkles, Trash2, UploadCloud, X, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { QPShell, Panel, Label, inp, useQPSubjects, useQPGrades, useQPChapters, QuestionBody, QuestionEditor, QQuestion, DiffBadge, TypeBadge } from "./qpShared";

/** Question Paper → Import: upload a past paper, check the questions found, save them to the subject's bank. */
export default function PaperImport() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { data: subjects = [] } = useQPSubjects();
    const { data: classes = [] } = useQPGrades();
    const { data: chapters = [] } = useQPChapters();
    const [subject, setSubject] = useState("");
    const [classId, setClassId] = useState("");
    const [chapterId, setChapterId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [scheme, setScheme] = useState<File | null>(null);   // optional marking scheme for the same paper
    const [aiBusy, setAiBusy] = useState(false);
    const schemeInput = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ filename: string; header: string[]; instructions: string[]; warnings: string[]; scheme?: { filename: string; matched: number; unmatched: number[] } | null } | null>(null);
    const [questions, setQuestions] = useState<QQuestion[]>([]);
    const [keep, setKeep] = useState<Set<number>>(new Set());
    const [editing, setEditing] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [drag, setDrag] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    const subj = subjects.find((s: any) => s.key === subject);
    const subjChapters = useMemo(() => chapters.filter((c: any) => !subj || String(c.subjectId) === subj.id || String(c.subjectName || "").toLowerCase() === subj.key), [chapters, subj]);
    const totalMarks = questions.filter((_, i) => keep.has(i)).reduce((a, q) => a + (q.marks || 0), 0);

    const pick = (f: File | null | undefined) => {
        if (!f) return;
        if (!/\.(docx|pdf|txt)$/i.test(f.name)) { toast.error("Upload a Word (.docx), PDF or text file. Old .doc files: save as .docx first."); return; }
        setFile(f); setResult(null); setQuestions([]);
    };
    const extract = async () => {
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData(); fd.append("file", file);
            if (scheme) fd.append("scheme", scheme);
            const r = (await api.post("/qp/extract", fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
            setResult(r);
            const qs: QQuestion[] = (r.questions || []).map((q: any) => ({ ...q, markingScheme: q.markingScheme || "" }));
            setQuestions(qs); setKeep(new Set(qs.map((_, i) => i)));
            if (qs.length) toast.success(`${qs.length} question${qs.length === 1 ? "" : "s"} found — check them, then save`);
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not read this file"); } finally { setBusy(false); }
    };
    // AI writes the answer + marking scheme for the ticked questions that don't have one yet
    const aiAnswers = async () => {
        const idx = questions.map((q, i) => i).filter(i => keep.has(i) && !String(questions[i].markingScheme || "").trim());
        if (!idx.length) { toast.message("All ticked questions already have a marking scheme"); return; }
        setAiBusy(true);
        try {
            const cls = classes.find((c: any) => c.id === classId || c.name === classId);
            const r = (await api.post("/qp/ai-answers", { subject: subj?.name || "", className: cls?.name || "", questions: idx.map(i => questions[i]) })).data;
            setQuestions(qs => qs.map((q, i) => { const k = idx.indexOf(i); const a = k >= 0 ? r.results[k] : null; return a && (a.answer || a.markingScheme) ? { ...q, answer: q.answer || a.answer, markingScheme: a.markingScheme } : q; }));
            toast.success(`AI wrote answers and marking schemes for ${idx.length - (r.failed || 0)} question${idx.length === 1 ? "" : "s"} — check them before saving`);
        } catch (e: any) { toast.error(e?.response?.data?.message || "The AI could not answer right now"); } finally { setAiBusy(false); }
    };
    const save = async () => {
        if (!subj) { toast.error("Choose the subject first"); return; }
        if (!classId) { toast.error("Choose the class (grade) these questions are for"); return; }
        const list = questions.filter((_, i) => keep.has(i));
        if (!list.length) { toast.error("Tick at least one question"); return; }
        setSaving(true);
        try {
            const cls = classes.find((c: any) => c.id === classId || c.name === classId);
            const ch = subjChapters.find((c: any) => String(c._id) === chapterId);
            const r = (await api.post("/qp/bank", { subjectId: subj.id, subjectName: subj.name, classId: cls?.id || "", className: cls?.name || "", chapterId, chapterName: ch?.chapterName || "", sourceDocument: result?.filename, questions: list })).data;
            toast.success(`${r.saved} saved to ${r.subject}${r.skipped ? ` · ${r.skipped} already in the bank` : ""}`);
            qc.invalidateQueries({ queryKey: ["qp_bank"] }); qc.invalidateQueries({ queryKey: ["qp_subjects"] });
            setFile(null); setResult(null); setQuestions([]);
            navigate(`/papers/questions?subject=${encodeURIComponent(subj.key)}`);
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not save"); } finally { setSaving(false); }
    };

    return (
        <QPShell title="Import a past paper" subtitle="Upload a Word or PDF paper — every question is read out with its parts, choices and marks, then saved to that subject's question bank.">
            <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
                <div className="space-y-4 lg:sticky lg:top-4">
                    <Panel title="1 · Where the questions go">
                        <div className="space-y-3">
                            <div><Label>Subject *</Label>
                                <select value={subject} onChange={e => { setSubject(e.target.value); setChapterId(""); }} className={inp}>
                                    <option value="">Choose subject…</option>
                                    {subjects.map((s: any) => <option key={s.key} value={s.key}>{s.name}{s.count ? ` · ${s.count} in bank` : ""}</option>)}
                                </select></div>
                            <div><Label>Class (grade) *</Label>
                                <select value={classId} onChange={e => setClassId(e.target.value)} className={inp}><option value="">Choose class…</option>{classes.map((c: any) => <option key={c.name} value={c.id || c.name}>{c.name}</option>)}</select>
                                <p className="text-[10px] text-slate-400 mt-1">Papers for this grade (any stream) are made only from its own questions.</p></div>
                            <div><Label>Chapter / topic (optional)</Label>
                                <select value={chapterId} onChange={e => setChapterId(e.target.value)} className={inp} disabled={!subject}><option value="">—</option>{subjChapters.map((c: any) => <option key={c._id} value={c._id}>{c.chapterName}</option>)}</select></div>
                        </div>
                    </Panel>
                    <Panel title="2 · The paper">
                        <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
                            onClick={() => input.current?.click()}
                            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}>
                            <UploadCloud className="w-9 h-9 mx-auto text-indigo-500" />
                            <p className="mt-2 text-sm font-bold text-slate-700">{file ? file.name : "Drop the paper here or click to choose"}</p>
                            <p className="text-[11px] text-slate-400 mt-1">Word (.docx) · PDF with text · .txt — up to 25 MB</p>
                            <input ref={input} type="file" accept=".docx,.pdf,.txt" className="hidden" onChange={e => pick(e.target.files?.[0])} />
                        </div>
                        <div onClick={() => schemeInput.current?.click()} className="mt-3 cursor-pointer rounded-xl border border-dashed border-slate-200 px-3 py-2.5 flex items-center gap-2 hover:bg-slate-50">
                            <FileCheck2 className="w-5 h-5 text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{scheme ? scheme.name : "Marking scheme (optional)"}</p><p className="text-[10px] text-slate-400">Same numbering as the paper — answers are matched to each question</p></div>
                            {scheme && <button onClick={e => { e.stopPropagation(); setScheme(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
                            <input ref={schemeInput} type="file" accept=".docx,.pdf,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f && /\.(docx|pdf|txt)$/i.test(f.name)) setScheme(f); else if (f) toast.error("Upload a Word (.docx), PDF or text file"); }} />
                        </div>
                        <button onClick={extract} disabled={!file || busy} className="mt-3 w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} Read questions
                        </button>
                        <p className="text-[11px] text-slate-400 mt-2">Questions should be numbered (1. 2. 3. or "Question 1"); parts as (a) (b) and (i) (ii); choices as A. B. C. D. Marks like "(3 marks)" are picked up.</p>
                    </Panel>
                </div>

                <div className="space-y-4">
                    {!result ? (
                        <Panel><div className="py-16 text-center"><FileUp className="w-10 h-10 mx-auto text-slate-300" /><p className="mt-3 font-bold text-slate-500">Choose a subject, add the paper and press <span className="text-indigo-600">Read questions</span>.</p><p className="text-sm text-slate-400 mt-1">Nothing is saved until you check the questions and press Save.</p></div></Panel>
                    ) : (
                        <>
                            <Panel title={`${questions.length} question${questions.length === 1 ? "" : "s"} found`} sub={result.filename}
                                right={<button onClick={() => { setResult(null); setQuestions([]); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}>
                                {result.header.length > 0 && <p className="text-xs text-slate-500"><b>Paper header:</b> {result.header.slice(0, 4).join(" · ")}</p>}
                                {result.instructions.length > 0 && <p className="text-xs text-slate-500 mt-1"><b>Instructions:</b> {result.instructions.join(" ")}</p>}
                                {result.scheme && <p className="mt-2 text-xs font-bold text-slate-600 flex items-center gap-1.5"><FileCheck2 className="w-3.5 h-3.5 text-slate-400" />Marking scheme: answers found for {result.scheme.matched} of {questions.length} questions</p>}
                                {result.warnings.map((w, i) => <p key={i} className="mt-2 text-xs font-bold text-amber-700 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{w}</p>)}
                            </Panel>
                            {questions.map((q, i) => (
                                <div key={i} className={`bg-white rounded-2xl border shadow-sm p-4 ${keep.has(i) ? "border-slate-200" : "border-dashed border-slate-200 opacity-50"}`}>
                                    <div className="flex items-start gap-3">
                                        <input type="checkbox" checked={keep.has(i)} onChange={() => setKeep(k => { const n = new Set(k); if (n.has(i)) n.delete(i); else n.add(i); return n; })} className="mt-1 w-4 h-4 accent-indigo-600" />
                                        <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">{q.number}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5"><TypeBadge t={q.type} /><DiffBadge d={q.difficulty} />{q.section && <span className="text-[10px] font-bold text-slate-400">{q.section}</span>}<span className="ml-auto text-xs font-black text-slate-600">{q.marks ?? "?"} mk{q.marks === 1 ? "" : "s"}</span></div>
                                            {editing === i ? <QuestionEditor value={q} onChange={v => setQuestions(qs => qs.map((x, k) => k === i ? v : x))} /> : <QuestionBody q={q} showAnswer />}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => setEditing(editing === i ? null : i)} title={editing === i ? "Done" : "Edit"} className={`p-2 rounded-lg ${editing === i ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:bg-slate-100"}`}>{editing === i ? <CheckCircle2 className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}</button>
                                            <button onClick={() => { setQuestions(qs => qs.filter((_, k) => k !== i)); setKeep(k => new Set([...k].filter(x => x !== i).map(x => x > i ? x - 1 : x))); setEditing(null); }} title="Remove" className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {questions.length > 0 && (
                                <div className="sticky bottom-3 bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-lg p-3 flex flex-wrap items-center gap-3">
                                    <span className="text-sm font-bold text-slate-600">{keep.size} of {questions.length} selected · {totalMarks} marks</span>
                                    <span className="text-xs text-slate-400">{subj ? `→ ${subj.name} bank` : "Choose the subject on the left"}</span>
                                    <button onClick={aiAnswers} disabled={aiBusy || !keep.size} title="AI writes the answer and a marking scheme for ticked questions without one" className="ml-auto h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                                        {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-slate-500" />} AI answers & marking scheme
                                    </button>
                                    <button onClick={save} disabled={saving || !subj || !classId || !keep.size} className=" h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save to question bank
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </QPShell>
    );
}
