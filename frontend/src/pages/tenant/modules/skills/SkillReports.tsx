import { useEffect, useMemo, useState } from "react";
import { Home, Loader2, Plus, Trash2, Pencil, Save, Printer, X, ListChecks, Settings2, FileText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSchoolBrand } from "@/lib/printDoc";
import { outputHtmlDoc } from "@/lib/pdfDoc";
import { SKILL_TEMPLATES, SKILL_THEMES, skillReportHtml, SkillPrint } from "./skillTemplates";

const TABS = [{ k: "setup", l: "1 · Skills setup", i: Settings2 }, { k: "assess", l: "2 · Assess learners", i: ListChecks }, { k: "print", l: "3 · Print reports", i: FileText }] as const;
const inp = "h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#5C67F2]";
const TERMS = ["Term 1", "Term 2", "Term 3"];

function useLists() {
    const classes = useQuery<any[]>({ queryKey: ["skills_streams"], queryFn: async () => (await api.get("/v2/streams")).data || [] });
    const subjects = useQuery<string[]>({ queryKey: ["skills_subjects"], queryFn: async () => { try { const r = await api.get("/subjects"); return Array.from(new Set((Array.isArray(r.data) ? r.data : []).map((s: any) => s.name || s.subjectName).filter(Boolean))) as string[]; } catch { return []; } } });
    const scales = useQuery<Record<string, any>>({ queryKey: ["skill_scales"], queryFn: async () => (await api.get("/skills/scales")).data });
    const frameworks = useQuery<any[]>({ queryKey: ["skill_frameworks"], queryFn: async () => (await api.get("/skills/frameworks")).data || [] });
    return { classes: classes.data || [], subjects: subjects.data || [], scales: scales.data || {}, frameworks: frameworks.data || [] };
}

export default function SkillReports() {
    const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("setup");
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Exams</span><span className="text-gray-300 mx-2">|</span><Home className="w-4 h-4 text-gray-500 mr-2" /><span className="text-gray-500 font-medium">- Skill-Based Reports</span>
            </div>
            <div className="p-6 pt-0 w-full space-y-5">
                <div className="flex flex-wrap gap-2">
                    {TABS.map(t => <button key={t.k} onClick={() => setTab(t.k)} className={`h-10 px-4 rounded-full text-sm font-bold flex items-center gap-2 ${tab === t.k ? "bg-[#5C67F2] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-[#5C67F2]"}`}><t.i className="w-4 h-4" />{t.l}</button>)}
                </div>
                {tab === "setup" && <Setup />}{tab === "assess" && <Assess />}{tab === "print" && <PrintTab />}
            </div>
        </div>
    );
}

// ── 1. Setup: subject → field of study → skills ───────────────────────────────
function Setup() {
    const qc = useQueryClient(); const { classes, subjects, scales, frameworks } = useLists();
    const blank = { subject: "", area: "", scale: "mastery", skills: "", levels: [] as string[] };
    const [f, setF] = useState<any>(blank); const [editId, setEditId] = useState<string | null>(null); const [saving, setSaving] = useState(false);
    const levels = useMemo(() => Array.from(new Set(classes.map((s: any) => s.className).filter(Boolean))) as string[], [classes]);
    const grouped = useMemo(() => { const m: Record<string, any[]> = {}; frameworks.forEach(x => (m[x.subject] ||= []).push(x)); return m; }, [frameworks]);
    const refresh = () => qc.invalidateQueries({ queryKey: ["skill_frameworks"] });

    const save = async () => {
        if (!f.subject.trim() || !f.area.trim()) { toast.error("Give the subject and the field of study."); return; }
        const skills = String(f.skills).split("\n").map(x => x.trim()).filter(Boolean);
        if (!skills.length) { toast.error("Add at least one skill (one per line)."); return; }
        setSaving(true);
        try { const body = { ...f, skills }; if (editId) await api.put(`/skills/frameworks/${editId}`, body); else await api.post("/skills/frameworks", body); toast.success("Saved"); setF({ ...blank, subject: f.subject }); setEditId(null); refresh(); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); } finally { setSaving(false); }
    };
    const edit = (x: any) => { setEditId(x._id); setF({ subject: x.subject, area: x.area, scale: x.scale, skills: (x.skills || []).map((s: any) => s.name).join("\n"), levels: x.levels || [] }); window.scrollTo({ top: 0, behavior: "smooth" }); };
    const del = async (x: any) => { if (!confirm(`Delete "${x.area}" (${x.subject}) and all ratings given for its skills?`)) return; try { await api.delete(`/skills/frameworks/${x._id}`); refresh(); toast.success("Deleted"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 h-fit">
                <h3 className="font-black text-slate-800">{editId ? "Edit field of study" : "Add a field of study"}</h3>
                <p className="text-xs text-slate-400">Example: subject <b>English</b> → field <b>Reading</b> → skills "Reads grade-appropriate text independently".</p>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Subject</label><input list="sk-subjects" className={`${inp} w-full`} value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} placeholder="Pick or type" /><datalist id="sk-subjects">{subjects.map(s => <option key={s} value={s} />)}</datalist></div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Field of study / strand</label><input className={`${inp} w-full`} value={f.area} onChange={e => setF({ ...f, area: e.target.value })} placeholder="e.g. Phonics, Spelling and Vocabulary" /></div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">How it is rated</label>
                    <select className={`${inp} w-full`} value={f.scale} onChange={e => setF({ ...f, scale: e.target.value })}>{Object.entries(scales).map(([k, s]: any) => <option key={k} value={k}>{s.label}</option>)}</select></div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Skills (one per line)</label><textarea rows={6} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" value={f.skills} onChange={e => setF({ ...f, skills: e.target.value })} /></div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Classes it applies to <span className="font-normal text-slate-400">(none ticked = all)</span></label>
                    <div className="flex flex-wrap gap-1.5">{levels.map(l => { const on = f.levels.includes(l); return <button key={l} type="button" onClick={() => setF({ ...f, levels: on ? f.levels.filter((x: string) => x !== l) : [...f.levels, l] })} className={`px-2.5 h-7 rounded-full text-[11px] font-bold border ${on ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-200"}`}>{l}</button>; })}</div></div>
                <div className="flex gap-2 pt-1">
                    <button onClick={save} disabled={saving} className="h-10 px-5 rounded-xl bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{editId ? "Save changes" : "Add"}</button>
                    {editId && <button onClick={() => { setEditId(null); setF(blank); }} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>}
                </div>
            </div>
            <div className="space-y-4">
                {Object.keys(grouped).length === 0 && <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400 text-sm font-bold">No skills set up yet. Add your first field of study on the left.</div>}
                {Object.entries(grouped).map(([subject, list]) => (
                    <div key={subject} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 font-black text-slate-800">{subject}</div>
                        {list.map(x => (
                            <div key={x._id} className="px-5 py-3 border-t border-slate-50">
                                <div className="flex items-center justify-between gap-3"><div><span className="font-bold text-slate-700">{x.area}</span> <span className="text-[10px] font-black uppercase text-slate-400 ml-2">{scales[x.scale]?.label?.split(" (")[0] || x.scale}{x.levels?.length ? ` · ${x.levels.join(", ")}` : " · all classes"}</span></div>
                                    <div className="flex gap-1"><button onClick={() => edit(x)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5C67F2] flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => del(x)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button></div></div>
                                <ul className="mt-1.5 text-xs text-slate-500 list-disc list-inside columns-1 md:columns-2">{(x.skills || []).map((s: any) => <li key={s.id}>{s.name}</li>)}</ul>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── 2. Assess: learners × skills for a class, subject and term ────────────────
function Assess() {
    const { classes, scales, frameworks } = useLists();
    const [cls, setCls] = useState(""); const [subject, setSubject] = useState(""); const [term, setTerm] = useState(TERMS[0]); const [year, setYear] = useState(String(new Date().getFullYear()));
    const [areaId, setAreaId] = useState(""); const [draft, setDraft] = useState<Record<string, Record<string, string>>>({}); const [saving, setSaving] = useState(false);
    const subjects = useMemo(() => Array.from(new Set(frameworks.map(f => f.subject))) as string[], [frameworks]);
    const areas = useMemo(() => frameworks.filter(f => f.subject === subject), [frameworks, subject]);
    const area = areas.find(a => a._id === areaId) || areas[0];

    const { data, isFetching, refetch } = useQuery<any>({
        queryKey: ["skill_assess", cls, subject, term, year], enabled: !!cls && !!subject,
        queryFn: async () => (await api.get("/skills/assessments", { params: { className: cls, subject, term, year } })).data,
    });
    useEffect(() => { setDraft({}); }, [cls, subject, term, year]);
    useEffect(() => { setAreaId(""); }, [subject]);

    const value = (sid: string, skill: string) => draft[sid]?.[skill] ?? data?.ratings?.[sid]?.[skill] ?? "";
    const set = (sid: string, skill: string, v: string) => setDraft(d => ({ ...d, [sid]: { ...(d[sid] || {}), [skill]: v } }));
    const dirty = Object.values(draft).some(o => Object.keys(o).length);
    const fillColumn = (skill: string, v: string) => (data?.learners || []).forEach((l: any) => set(l._id, skill, v));

    const save = async () => {
        const records = Object.entries(draft).flatMap(([studentId, m]) => Object.entries(m).map(([skillId, rating]) => ({ studentId, skillId, rating })));
        if (!records.length) return; setSaving(true);
        try { const r = (await api.post("/skills/assessments/bulk", { subject, term, year, records })).data; toast.success(`Saved ${r.saved} rating${r.saved === 1 ? "" : "s"}${r.cleared ? ` · ${r.cleared} cleared` : ""}`); setDraft({}); refetch(); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); } finally { setSaving(false); }
    };
    const sc = area ? scales[area.scale]?.ratings || [] : [];

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Class</label><select className={inp} value={cls} onChange={e => setCls(e.target.value)}><option value="">Select…</option>{classes.map((s: any) => <option key={s._id} value={s.fullName}>{s.fullName}</option>)}</select></div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Subject</label><select className={inp} value={subject} onChange={e => setSubject(e.target.value)}><option value="">Select…</option>{subjects.map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Term</label><select className={inp} value={term} onChange={e => setTerm(e.target.value)}>{TERMS.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Year</label><input className={`${inp} w-24`} value={year} onChange={e => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
                <div className="flex-1" />
                <button onClick={save} disabled={!dirty || saving} className="h-10 px-5 rounded-xl bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save ratings</button>
            </div>

            {subjects.length === 0 ? <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center text-slate-400 text-sm font-bold">Set up skills first (step 1).</div>
                : !cls || !subject ? <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center text-slate-400 text-sm font-bold">Choose a class and a subject.</div>
                : (
                    <>
                        <div className="flex flex-wrap gap-2">{areas.map(a => <button key={a._id} onClick={() => setAreaId(a._id)} className={`h-9 px-4 rounded-full text-xs font-bold ${area?._id === a._id ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{a.area}</button>)}</div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                            {isFetching && !data ? <div className="py-14 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div> : (
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-slate-50 text-[11px] text-slate-500 uppercase">
                                        <th className="text-left p-3 sticky left-0 bg-slate-50 min-w-[200px]">Learner</th>
                                        {area?.skills.map((s: any) => (
                                            <th key={s.id} className="p-3 min-w-[150px] align-top text-left normal-case font-bold text-slate-600"><div className="mb-1 leading-snug">{s.name}</div>
                                                <select value="" onChange={e => e.target.value && fillColumn(s.id, e.target.value === "__clear" ? "" : e.target.value)} className="h-7 text-[10px] border border-slate-200 rounded bg-white w-full"><option value="">Set everyone…</option>{sc.map((r: any) => <option key={r.code} value={r.code}>{r.short}</option>)}<option value="__clear">Clear</option></select></th>
                                        ))}
                                    </tr></thead>
                                    <tbody>
                                        {(data?.learners || []).map((l: any) => (
                                            <tr key={l._id} className="border-t border-slate-50">
                                                <td className="p-3 sticky left-0 bg-white font-bold text-slate-700">{l.name}<div className="text-[10px] text-slate-400 font-normal">{l.regNo}</div></td>
                                                {area?.skills.map((s: any) => (
                                                    <td key={s.id} className="p-2"><select value={value(l._id, s.id)} onChange={e => set(l._id, s.id, e.target.value)} className={`h-9 w-full px-2 border rounded-lg text-sm font-bold bg-white ${draft[l._id]?.[s.id] !== undefined ? "border-[#5C67F2]" : "border-slate-200"}`}>
                                                        <option value="">—</option>{sc.map((r: any) => <option key={r.code} value={r.code}>{r.short}</option>)}</select></td>
                                                ))}
                                            </tr>
                                        ))}
                                        {(data?.learners || []).length === 0 && <tr><td colSpan={99} className="py-12 text-center text-slate-400 text-sm">No learners in this class.</td></tr>}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
        </div>
    );
}

// ── 3. Print: choose a design and print a class (or one learner) ──────────────
function PrintTab() {
    const { classes, subjects: _s, frameworks } = useLists(); const school = useSchoolBrand();
    const [cls, setCls] = useState(""); const [studentId, setStudentId] = useState(""); const [template, setTemplate] = useState("checklist"); const [theme, setTheme] = useState("blue");
    const [term, setTerm] = useState(TERMS[0]); const [year, setYear] = useState(String(new Date().getFullYear())); const [pick, setPick] = useState<string[]>([]);
    const [title, setTitle] = useState("Skill Based Report"); const [comment, setComment] = useState(true); const [sigs, setSigs] = useState("Class Teacher, Principal"); const [busy, setBusy] = useState(false);
    const subjects = useMemo(() => Array.from(new Set(frameworks.map(f => f.subject))) as string[], [frameworks]);
    const { data: roster } = useQuery<any>({ queryKey: ["skill_roster", cls], enabled: !!cls, queryFn: async () => (await api.get("/skills/assessments", { params: { className: cls, subject: subjects[0] || "x", term: TERMS[0], year } })).data });
    const learners: any[] = roster?.learners || [];
    const tpl = SKILL_TEMPLATES.find(t => t.key === template)!;

    const build = async (): Promise<string | null> => {
        if (!cls && !studentId) { toast.error("Choose a class."); return null; }
        const params: any = { year, ...(pick.length ? { subjects: pick.join(",") } : {}), ...(studentId ? { studentId } : { className: cls }) };
        const rep = (await api.get("/skills/report", { params })).data;
        if (!rep.reports.length) { toast.error("No learners found."); return null; }
        // a QR on every page, verifying the report online
        const qr: Record<string, string> = {};
        for (let i = 0; i < rep.reports.length; i += 6) await Promise.all(rep.reports.slice(i, i + 6).map(async (r: any) => {
            try { const url = (await api.post("/reports/verify-link", { studentId: r.student._id, term: tpl.perTerm ? term : "", year, exam: title, className: r.student.className })).data.url; qr[r.student._id] = await QRCode.toDataURL(url, { margin: 1, width: 180 }); } catch { /* the page prints without a QR */ }
        }));
        const p: SkillPrint = { reports: rep.reports, scales: rep.scales, template, theme, term, year, terms: rep.terms, school: { name: school.name, logo: school.logo, address: school.address }, qr, title, signatories: sigs.split(",").map(s => ({ title: s.trim() })).filter(s => s.title), showComment: comment };
        return skillReportHtml(p);
    };
    const run = async (mode: "print" | "preview") => {
        setBusy(true);
        try { const html = await build(); if (!html) return; if (mode === "print") outputHtmlDoc(title, html, { fileName: title }); else setPreview(html); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not build the report"); } finally { setBusy(false); }
    };
    const [preview, setPreview] = useState("");

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 h-fit">
                <div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Design</div>
                    <div className="grid grid-cols-2 gap-2">{SKILL_TEMPLATES.map(t => <button key={t.key} onClick={() => setTemplate(t.key)} className={`text-left p-3 rounded-xl border-2 ${template === t.key ? "border-[#5C67F2] bg-indigo-50" : "border-gray-100 hover:border-indigo-200"}`}><div className="text-xs font-black text-slate-800">{t.label}</div><div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{t.note}</div></button>)}</div></div>
                <div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Colour</div><div className="flex gap-2">{Object.entries(SKILL_THEMES).map(([k, t]) => <button key={k} onClick={() => setTheme(k)} title={t.label} className={`w-8 h-8 rounded-full border-2 ${theme === k ? "border-slate-800 scale-110" : "border-white shadow"}`} style={{ background: t.head }} />)}</div></div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="block text-[11px] font-bold text-slate-500 mb-1">Class</label><select className={`${inp} w-full`} value={cls} onChange={e => { setCls(e.target.value); setStudentId(""); }}><option value="">Select…</option>{classes.map((s: any) => <option key={s._id} value={s.fullName}>{s.fullName}</option>)}</select></div>
                    <div className="col-span-2"><label className="block text-[11px] font-bold text-slate-500 mb-1">Learner <span className="font-normal text-slate-400">(blank = the whole class)</span></label><select className={`${inp} w-full`} value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!cls}><option value="">Whole class ({learners.length})</option>{learners.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}</select></div>
                    {tpl.perTerm && <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Term</label><select className={`${inp} w-full`} value={term} onChange={e => setTerm(e.target.value)}>{TERMS.map(t => <option key={t}>{t}</option>)}</select></div>}
                    <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Year</label><input className={`${inp} w-full`} value={year} onChange={e => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
                    <div className="col-span-2"><label className="block text-[11px] font-bold text-slate-500 mb-1">Report title</label><input className={`${inp} w-full`} value={title} onChange={e => setTitle(e.target.value)} /></div>
                </div>
                <div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subjects <span className="font-normal normal-case">(none ticked = all)</span></div>
                    <div className="flex flex-wrap gap-1.5">{subjects.map(s => { const on = pick.includes(s); return <button key={s} onClick={() => setPick(on ? pick.filter(x => x !== s) : [...pick, s])} className={`px-2.5 h-7 rounded-full text-[11px] font-bold border ${on ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-200"}`}>{s}</button>; })}</div></div>
                <div className="grid grid-cols-2 gap-3 items-end">
                    <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Signature lines</label><input className={`${inp} w-full`} value={sigs} onChange={e => setSigs(e.target.value)} /></div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 pb-2"><input type="checkbox" checked={comment} onChange={e => setComment(e.target.checked)} /> Teacher's comment lines</label>
                </div>
                <div className="flex gap-2 pt-1">
                    <button onClick={() => run("preview")} disabled={busy} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50">Preview</button>
                    <button onClick={() => run("print")} disabled={busy} className="h-10 px-5 rounded-xl bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Print / save PDF</button>
                </div>
                <p className="text-[11px] text-slate-400">Every page carries a QR code; scanning it confirms the report is genuine.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 min-h-[500px]">
                {preview ? (<div className="relative"><button onClick={() => setPreview("")} className="absolute right-2 top-2 z-10 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center"><X className="w-4 h-4" /></button><iframe title="preview" srcDoc={preview.replace(/<script>[\s\S]*?<\/script>/, "")} className="w-full border-0 rounded-lg" style={{ height: "80vh" }} /></div>)
                    : <div className="h-full min-h-[480px] flex items-center justify-center text-slate-400 text-sm font-bold text-center px-6">Choose a class and a design, then press Preview.</div>}
            </div>
        </div>
    );
}
