import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowDown, ArrowUp, FileCheck2, FolderOpen, Loader2, Pencil, Plus, Printer, RefreshCw, Save, Shuffle, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSchoolBrand } from "@/lib/printDoc";
import { outputHtmlDoc } from "@/lib/pdfDoc";
import { DEFAULT_NUMBERING, Numbering, Paper, PaperSection, paperHtml, paperTotal, questionMarks, questionNumbers, mainLabel } from "@/lib/paperNumbering";
import { QPShell, Panel, Label, inp, useQPSubjects, useQPClasses, useQPChapters, QuestionBody, QuestionEditor, QQuestion, TypeBadge, DiffBadge, TYPES } from "./qpShared";

const DEFAULT_RULES = [
    "Write your name, admission number and class in the spaces provided.",
    "Answer ALL the questions in the spaces provided.",
    "All working must be clearly shown where necessary.",
    "Candidates should check the question paper to make sure no pages are missing.",
];
interface SectionPlan { name: string; instructions: string; count: number; types: string[]; marksEach: string }
const blankPlan = (i: number): SectionPlan => ({ name: `SECTION ${String.fromCharCode(65 + i)}`, instructions: "", count: 10, types: [], marksEach: "" });

function A4Preview({ html }: { html: string }) {
    const box = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLIFrameElement>(null);
    const [scale, setScale] = useState(0.6);
    const [docH, setDocH] = useState(1123);
    useEffect(() => {
        const el = box.current; if (!el) return;
        const fit = () => setScale(Math.min(1, el.clientWidth / 794));
        fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
    }, []);
    const measure = () => { try { const h = frame.current?.contentDocument?.documentElement?.scrollHeight; if (h) setDocH(Math.max(1123, h + 40)); } catch { /* ignore */ } };
    return (
        <div ref={box} className="w-full max-h-[78vh] overflow-y-auto overflow-x-hidden rounded-xl bg-slate-100">
            <div style={{ height: docH * scale, width: 794 * scale, overflow: "hidden" }}>
                <iframe ref={frame} onLoad={measure} title="paper" srcDoc={html} className="bg-white border-0 origin-top-left" style={{ width: 794, height: docH, transform: `scale(${scale})` }} />
            </div>
        </div>
    );
}

/** Question Paper → Create paper: auto-generate from the bank, adjust, print. */
export default function PaperBuilder() {
    const qc = useQueryClient();
    const brand = useSchoolBrand();
    const [params, setParams] = useSearchParams();
    const { data: subjects = [] } = useQPSubjects();
    const { data: classes = [] } = useQPClasses();
    const { data: chapters = [] } = useQPChapters();

    const [paperId, setPaperId] = useState<string | null>(null);
    const [subject, setSubject] = useState(params.get("subject") || "");
    const [classId, setClassId] = useState("");
    const [chapterIds, setChapterIds] = useState<string[]>([]);
    const [plans, setPlans] = useState<SectionPlan[]>([{ ...blankPlan(0), name: "" }]);
    const [useMix, setUseMix] = useState(true);
    const [mix, setMix] = useState({ EASY: 30, MEDIUM: 50, HARD: 20 });
    const [title, setTitle] = useState("END TERM EXAMINATION");
    const [term, setTerm] = useState("");
    const [duration, setDuration] = useState("2 hours");
    const [candidate, setCandidate] = useState(true);
    const [rules, setRules] = useState<string[]>(DEFAULT_RULES);
    const [numbering, setNumbering] = useState<Numbering>(DEFAULT_NUMBERING);
    const [sections, setSections] = useState<PaperSection[]>([]);
    const [shortages, setShortages] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editQ, setEditQ] = useState<{ s: number; q: number } | null>(null);
    const [showSaved, setShowSaved] = useState(false);

    const subj = subjects.find((s: any) => s.key === subject);
    const cls = classes.find((c: any) => c.id === classId);
    const subjChapters = useMemo(() => chapters.filter((c: any) => subj && (String(c.subjectId) === subj.id || String(c.subjectName || "").toLowerCase() === subj.key)), [chapters, subj]);
    const paper: Paper = {
        header: { school: brand.name, logo: brand.logo, title, subject: subj?.name || "", className: cls?.name || "", duration, term, showCandidateFields: candidate },
        rules: rules.filter(r => r.trim()), numbering, sections,
    };
    const html = useMemo(() => paperHtml(paper), [JSON.stringify(paper)]); // eslint-disable-line react-hooks/exhaustive-deps
    const total = paperTotal(sections);
    const nums = questionNumbers(sections, numbering);
    const allIds = sections.flatMap(s => s.questions.map(q => q._id)).filter(Boolean) as string[];

    const generate = async () => {
        if (!subj) { toast.error("Choose a subject"); return; }
        setBusy(true);
        try {
            const r = (await api.post("/qp/generate", {
                subject: subj.name, subjectId: subj.id, classId, chapterIds,
                difficulty: useMix ? mix : undefined,
                sections: plans.map(p => ({ name: p.name, instructions: p.instructions, count: p.count, types: p.types, marksEach: p.marksEach ? Number(p.marksEach) : undefined })),
            })).data;
            setSections(r.sections.map((s: any) => ({ name: s.name, instructions: s.instructions, questions: s.questions })));
            const short = r.sections.filter((s: any) => s.short).map((s: any) => `${s.name || "The paper"}: only ${s.questions.length} of ${s.wanted} found${s.questions.length < s.wanted ? " — add more questions to the bank or relax the types/chapters" : ""}`);
            setShortages(short);
            if (!r.available) toast.error(`No ${subj.name} questions in the bank yet — import a paper first`);
            else toast.success(`Paper generated from ${r.available} ${subj.name} question${r.available === 1 ? "" : "s"}`);
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not generate"); } finally { setBusy(false); }
    };
    const replace = async (si: number, qi: number) => {
        const cur = sections[si].questions[qi];
        const plan = plans[si];
        try {
            const r = (await api.post("/qp/generate", { subject: subj?.name, subjectId: subj?.id, classId, chapterIds, exclude: allIds, sections: [{ count: 1, types: cur.type ? [cur.type] : plan?.types || [] }] })).data;
            const nq = r.sections[0]?.questions?.[0];
            if (!nq) { toast.info("No other question of this type in the bank"); return; }
            setSections(ss => ss.map((s, i) => i !== si ? s : { ...s, questions: s.questions.map((q, k) => k === qi ? nq : q) }));
        } catch { toast.error("Could not replace"); }
    };
    const move = (si: number, qi: number, d: number) => setSections(ss => ss.map((s, i) => { if (i !== si) return s; const qs = [...s.questions]; const j = qi + d; if (j < 0 || j >= qs.length) return s; [qs[qi], qs[j]] = [qs[j], qs[qi]]; return { ...s, questions: qs }; }));
    const removeQ = (si: number, qi: number) => setSections(ss => ss.map((s, i) => i !== si ? s : { ...s, questions: s.questions.filter((_, k) => k !== qi) }));
    const shuffle = () => setSections(ss => ss.map(s => ({ ...s, questions: [...s.questions].sort(() => Math.random() - 0.5) })));

    const body = () => ({ paperTitle: title, subject: subj?.name || "", subjectId: subj?.id || "", classId, className: cls?.name || "", header: paper.header, rules: paper.rules, numbering, sections, totalMarks: total, duration });
    const save = async () => {
        if (!sections.some(s => s.questions.length)) { toast.error("Generate the paper first"); return; }
        setSaving(true);
        try {
            if (paperId) await api.put(`/qp/papers/${paperId}`, body());
            else { const r = (await api.post("/qp/papers", body())).data; setPaperId(String(r._id)); setParams(p => { const n = new URLSearchParams(p); n.set("id", String(r._id)); return n; }); }
            toast.success("Paper saved"); qc.invalidateQueries({ queryKey: ["qp_papers"] });
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not save"); } finally { setSaving(false); }
    };
    const print = (answers: boolean) => {
        if (!sections.some(s => s.questions.length)) { toast.error("Generate the paper first"); return; }
        const h = paperHtml(paper, answers).replace("</body>", "<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body>");
        outputHtmlDoc(`${subj?.name || "Paper"} ${title}${answers ? " - marking scheme" : ""}`, h, { fileName: `${subj?.name || "paper"}-${answers ? "marking-scheme" : "paper"}` });
    };

    // open a saved paper (?id=)
    const { data: saved = [] } = useQuery<any[]>({ queryKey: ["qp_papers"], queryFn: async () => (await api.get("/qp/papers")).data || [] });
    const openPaper = async (id: string) => {
        try {
            const p = (await api.get(`/qp/papers/${id}`)).data;
            setPaperId(String(p._id)); setTitle(p.header?.title || p.paperTitle || ""); setTerm(p.header?.term || ""); setDuration(p.header?.duration || p.duration || "");
            setCandidate(p.header?.showCandidateFields !== false); setRules(p.rules || []); setNumbering({ ...DEFAULT_NUMBERING, ...(p.numbering || {}) }); setSections(p.sections || []);
            const s = subjects.find((x: any) => x.name === p.subject || x.id === p.subjectId); if (s) setSubject(s.key); setClassId(p.classId || "");
            setShowSaved(false); setShortages([]);
        } catch { toast.error("Could not open the paper"); }
    };
    useEffect(() => { const id = params.get("id"); if (id && subjects.length && id !== paperId) openPaper(id); }, [subjects.length]); // eslint-disable-line react-hooks/exhaustive-deps
    const delPaper = async (id: string) => { if (!confirm("Delete this saved paper?")) return; await api.delete(`/qp/papers/${id}`); qc.invalidateQueries({ queryKey: ["qp_papers"] }); if (id === paperId) setPaperId(null); };
    const newPaper = () => { setPaperId(null); setSections([]); setShortages([]); setParams(p => { const n = new URLSearchParams(p); n.delete("id"); return n; }); };

    const setPlan = (i: number, patch: Partial<SectionPlan>) => setPlans(ps => ps.map((p, k) => k === i ? { ...p, ...patch } : p));
    const NumSel = ({ k, label, opts }: { k: keyof Numbering; label: string; opts: string[] }) => (
        <div><Label>{label}</Label><select value={String(numbering[k])} onChange={e => setNumbering({ ...numbering, [k]: e.target.value } as any)} className={inp}>{opts.map(o => <option key={o} value={o}>{o === "hidden" ? "Don't show" : o}</option>)}</select></div>
    );

    return (
        <QPShell title={paperId ? "Edit question paper" : "Create a question paper"} subtitle="Pick the subject and how many questions — the paper is generated from the question bank, numbered correctly and ready to print."
            actions={<>
                <button onClick={() => setShowSaved(true)} className="h-10 px-4 rounded-xl bg-white/15 text-white text-sm font-bold flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Saved papers ({saved.length})</button>
                {paperId && <button onClick={newPaper} className="h-10 px-4 rounded-xl bg-white/15 text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> New</button>}
            </>}>
            <div className="grid xl:grid-cols-[400px_minmax(0,1fr)] gap-6 items-start">
                {/* ─── settings ─── */}
                <div className="space-y-4">
                    <Panel title="1 · Subject & questions">
                        <div className="space-y-3">
                            <div><Label>Subject *</Label><select value={subject} onChange={e => { setSubject(e.target.value); setChapterIds([]); }} className={inp}><option value="">Choose subject…</option>{subjects.map((s: any) => <option key={s.key} value={s.key}>{s.name} · {s.count} question{s.count === 1 ? "" : "s"}</option>)}</select></div>
                            <div><Label>Class</Label><select value={classId} onChange={e => setClassId(e.target.value)} className={inp}><option value="">Any class</option>{classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            {subjChapters.length > 0 && (
                                <div><Label>Chapters (none = all)</Label><div className="flex flex-wrap gap-1.5">{subjChapters.map((c: any) => { const on = chapterIds.includes(String(c._id)); return <button key={c._id} onClick={() => setChapterIds(ids => on ? ids.filter(x => x !== String(c._id)) : [...ids, String(c._id)])} className={`px-2.5 h-7 rounded-full text-[11px] font-bold border ${on ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>{c.chapterName}</button>; })}</div></div>
                            )}
                            {plans.map((p, i) => (
                                <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                                    <div className="flex gap-2 items-center">
                                        <input value={p.name} onChange={e => setPlan(i, { name: e.target.value })} placeholder={plans.length > 1 ? "Section name" : "Section name (optional)"} className={inp + " flex-1"} />
                                        {plans.length > 1 && <button onClick={() => setPlans(ps => ps.filter((_, k) => k !== i))} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><Label>Number of questions</Label><input type="number" min={1} max={200} value={p.count} onChange={e => setPlan(i, { count: Math.max(1, Number(e.target.value) || 1) })} className={inp} /></div>
                                        <div><Label>Marks each (optional)</Label><input type="number" min={0} value={p.marksEach} onChange={e => setPlan(i, { marksEach: e.target.value })} placeholder="as in bank" className={inp} /></div>
                                    </div>
                                    <div><Label>Question types (none = any)</Label><div className="flex flex-wrap gap-1.5">{TYPES.map(t => { const on = p.types.includes(t); return <button key={t} onClick={() => setPlan(i, { types: on ? p.types.filter(x => x !== t) : [...p.types, t] })} className={`px-2.5 h-7 rounded-full text-[11px] font-bold border ${on ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>{t}</button>; })}</div></div>
                                    <input value={p.instructions} onChange={e => setPlan(i, { instructions: e.target.value })} placeholder="Section instructions (optional), e.g. Answer ALL questions" className={inp} />
                                </div>
                            ))}
                            <button onClick={() => setPlans(ps => [...(ps.length === 1 && !ps[0].name ? [{ ...ps[0], name: "SECTION A" }] : ps), blankPlan(ps.length)])} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add a section</button>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={useMix} onChange={e => setUseMix(e.target.checked)} className="w-4 h-4 accent-indigo-600" /> Mix of difficulty</label>
                                {useMix && <div className="grid grid-cols-3 gap-2 mt-2">{(["EASY", "MEDIUM", "HARD"] as const).map(k => (
                                    <div key={k}><Label>{k.toLowerCase()} %</Label><input type="number" min={0} max={100} value={mix[k]} onChange={e => setMix({ ...mix, [k]: Number(e.target.value) || 0 })} className={inp} /></div>
                                ))}</div>}
                            </div>
                            <button onClick={generate} disabled={busy || !subj} className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {sections.length ? "Generate again" : "Auto-generate paper"}
                            </button>
                        </div>
                    </Panel>

                    <Panel title="2 · Paper header & exam rules">
                        <div className="space-y-3">
                            <div><Label>Exam title</Label><input value={title} onChange={e => setTitle(e.target.value)} className={inp} /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><Label>Term / year</Label><input value={term} onChange={e => setTerm(e.target.value)} placeholder="Term 2, 2027" className={inp} /></div>
                                <div><Label>Time allowed</Label><input value={duration} onChange={e => setDuration(e.target.value)} className={inp} /></div>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={candidate} onChange={e => setCandidate(e.target.checked)} className="w-4 h-4 accent-indigo-600" /> Name / Adm No / Class lines</label>
                            <div>
                                <Label>Instructions to candidates</Label>
                                <div className="space-y-1.5">{rules.map((r, i) => (
                                    <div key={i} className="flex gap-1.5 items-center"><span className="text-xs font-black text-slate-400 w-5">{i + 1}.</span><input value={r} onChange={e => setRules(rs => rs.map((x, k) => k === i ? e.target.value : x))} className={inp + " h-9"} /><button onClick={() => setRules(rs => rs.filter((_, k) => k !== i))} className="p-1.5 text-slate-300 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button></div>
                                ))}</div>
                                <button onClick={() => setRules(rs => [...rs, ""])} className="mt-1.5 text-xs font-bold text-indigo-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add rule</button>
                            </div>
                        </div>
                    </Panel>

                    <Panel title="3 · Numbering">
                        <div className="grid grid-cols-2 gap-2">
                            <NumSel k="main" label="Questions" opts={["1.", "1)", "Q1.", "Question 1", "I.", "A."]} />
                            <NumSel k="part" label="Parts" opts={["(a)", "a)", "a.", "(i)", "i.", "(A)"]} />
                            <NumSel k="sub" label="Sub-parts" opts={["(i)", "i.", "(a)", "a.", "•"]} />
                            <NumSel k="option" label="Choices" opts={["A.", "(A)", "(a)", "a)"]} />
                            <NumSel k="marks" label="Marks shown as" opts={["(5 marks)", "[5]", "(5mks)", "hidden"]} />
                            <div><Label>Start at</Label><input type="number" min={1} value={numbering.startAt} onChange={e => setNumbering({ ...numbering, startAt: Math.max(1, Number(e.target.value) || 1) })} className={inp} /></div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={numbering.restartEachSection} onChange={e => setNumbering({ ...numbering, restartEachSection: e.target.checked })} className="w-4 h-4 accent-indigo-600" /> Start numbering again in each section</label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={numbering.answerLines} onChange={e => setNumbering({ ...numbering, answerLines: e.target.checked })} className="w-4 h-4 accent-indigo-600" /> Answer lines under questions</label>
                        </div>
                    </Panel>
                </div>

                {/* ─── paper ─── */}
                <div className="space-y-4 min-w-0">
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-3 flex flex-wrap items-center gap-2 xl:sticky xl:top-4 z-10">
                        <span className="text-sm font-black text-slate-700">{sections.reduce((a, s) => a + s.questions.length, 0)} questions · {total} marks</span>
                        <div className="ml-auto flex flex-wrap gap-2">
                            <button onClick={shuffle} disabled={!sections.length} className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-40"><Shuffle className="w-3.5 h-3.5" /> Shuffle</button>
                            <button onClick={() => print(true)} disabled={!sections.length} className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-40"><FileCheck2 className="w-3.5 h-3.5" /> Marking scheme</button>
                            <button onClick={() => print(false)} disabled={!sections.length} className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-40"><Printer className="w-3.5 h-3.5" /> Print / PDF</button>
                            <button onClick={save} disabled={saving || !sections.length} className="h-9 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {paperId ? "Save changes" : "Save paper"}</button>
                        </div>
                    </div>
                    {shortages.map((s, i) => <p key={i} className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{s}</p>)}
                    {!sections.length ? (
                        <Panel><div className="py-16 text-center"><Wand2 className="w-10 h-10 mx-auto text-slate-300" /><p className="mt-3 font-bold text-slate-500">Choose the subject and number of questions, then press <span className="text-indigo-600">Auto-generate paper</span>.</p><p className="text-sm text-slate-400 mt-1">You can then replace, reorder, edit or remove any question before printing.</p></div></Panel>
                    ) : (
                        <div className="grid 2xl:grid-cols-2 gap-4 items-start [&>*]:min-w-0">
                            <div className="space-y-3 min-w-0">
                                {sections.map((s, si) => (
                                    <div key={si} className="space-y-2">
                                        {s.name && <div className="text-xs font-black uppercase tracking-widest text-indigo-600 pt-1">{s.name}{s.instructions ? <span className="normal-case tracking-normal font-semibold text-slate-400"> — {s.instructions}</span> : null}</div>}
                                        {!s.questions.length && <p className="text-xs text-slate-400">No questions in this section.</p>}
                                        {s.questions.map((q, qi) => (
                                            <div key={`${q._id || ""}-${qi}`} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-3 flex gap-3">
                                                <span className="min-w-[2.25rem] h-8 px-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">{mainLabel(nums[si][qi], numbering.main)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5 mb-1"><TypeBadge t={q.type || "Short Answer"} /><DiffBadge d={(q as any).difficulty || "MEDIUM"} /><span className="ml-auto text-xs font-black text-slate-600">{questionMarks(q)} mk{questionMarks(q) === 1 ? "" : "s"}</span></div>
                                                    <QuestionBody q={q as any} />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <button title="Move up" onClick={() => move(si, qi, -1)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><ArrowUp className="w-3.5 h-3.5" /></button>
                                                    <button title="Move down" onClick={() => move(si, qi, 1)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><ArrowDown className="w-3.5 h-3.5" /></button>
                                                    <button title="Replace with another question" onClick={() => replace(si, qi)} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"><RefreshCw className="w-3.5 h-3.5" /></button>
                                                    <button title="Edit for this paper" onClick={() => setEditQ({ s: si, q: qi })} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                                                    <button title="Remove" onClick={() => removeQ(si, qi)} className="p-1.5 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <Panel className="min-w-0 overflow-hidden" title="Print preview" sub="Exactly as it prints (A4)"><A4Preview html={html} /></Panel>
                        </div>
                    )}
                </div>
            </div>

            {editQ && (() => {
                const q = sections[editQ.s]?.questions[editQ.q] as any;
                if (!q) return null;
                const val: QQuestion = { text: q.text || "", marks: q.marks ?? null, type: q.type || "Short Answer", difficulty: q.difficulty || "MEDIUM", parts: q.parts || [], options: q.options || [], answer: q.answer || "", markingScheme: q.markingScheme || "", images: q.images || [], _id: q._id };
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40" onClick={() => setEditQ(null)}>
                        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black text-slate-800">Edit question {mainLabel(nums[editQ.s][editQ.q], numbering.main)}</h2><p className="text-xs text-slate-400">Changes apply to this paper only — the bank copy stays as it is.</p></div><button onClick={() => setEditQ(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                            <div className="p-5 overflow-y-auto"><QuestionEditor value={val} onChange={v => setSections(ss => ss.map((s, i) => i !== editQ.s ? s : { ...s, questions: s.questions.map((x, k) => k === editQ.q ? { ...x, ...v } : x) }))} /></div>
                            <div className="p-5 border-t border-slate-100"><button onClick={() => setEditQ(null)} className="w-full h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm">Done</button></div>
                        </div>
                    </div>
                );
            })()}

            {showSaved && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40" onClick={() => setShowSaved(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between"><h2 className="font-black text-slate-800">Saved papers</h2><button onClick={() => setShowSaved(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                        <div className="p-3 overflow-y-auto divide-y divide-slate-100">
                            {!saved.length && <p className="py-10 text-center text-sm text-slate-400">No saved papers yet.</p>}
                            {saved.map((p: any) => (
                                <div key={p._id} className="flex items-center gap-3 px-2 py-3">
                                    <div className="flex-1 min-w-0"><div className="font-bold text-slate-800 truncate">{p.subject} — {p.header?.title || p.paperTitle}</div><div className="text-xs text-slate-400">{[p.className, p.header?.term, `${p.totalMarks} marks`, new Date(p.updatedAt || p.createdAt).toLocaleDateString()].filter(Boolean).join(" · ")}</div></div>
                                    <button onClick={() => { setParams(x => { const n = new URLSearchParams(x); n.set("id", String(p._id)); return n; }); openPaper(String(p._id)); }} className="h-8 px-3 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">Open</button>
                                    <button onClick={() => delPaper(String(p._id))} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </QPShell>
    );
}
