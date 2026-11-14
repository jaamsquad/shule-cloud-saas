import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import { useBranding } from "../../useBranding";
import { outputHtmlDoc } from "@/lib/pdfDoc";
import { SKILL_TEMPLATES, SKILL_THEMES, skillReportHtml, SkillPrint } from "@/pages/tenant/modules/skills/skillTemplates";
import type { StaffCtx } from "../StaffLayout";

const sel = "h-10 px-3 border border-black/10 rounded text-sm bg-white";
const TERMS = ["Term 1", "Term 2", "Term 3"];

// Skill-Based Reports → Print reports, scoped to the teacher's own classes
// (see /staff-portal/skills/report in auth.routes.ts). Reuses the same print
// templates as the admin page — the data is simply pre-filtered server-side.
export default function StaffSkillsReports() {
    const { api } = useOutletContext<StaffCtx>();
    const { data: brand } = useBranding(api);
    const { data: scope } = useQuery<{ classes: { classId: string; className: string; subjects: string[] }[] }>({
        queryKey: ["staff_skills_scope"], queryFn: async () => (await api.get("/staff-portal/skills/scope")).data, retry: false,
    });
    const classes = scope?.classes || [];

    const [className, setClassName] = useState("");
    const [studentId, setStudentId] = useState("");
    const [template, setTemplate] = useState("checklist");
    const [theme, setTheme] = useState("blue");
    const [term, setTerm] = useState(TERMS[0]);
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [pick, setPick] = useState<string[]>([]);
    const [title, setTitle] = useState("Skill Based Report");
    const [comment, setComment] = useState(true);
    const [sigs, setSigs] = useState("Class Teacher");
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState("");

    const mySubjects = classes.find(c => c.className === className)?.subjects || [];
    const tpl = SKILL_TEMPLATES.find(t => t.key === template)!;

    // Roster, for the "single learner" picker — any one subject is enough, since
    // the class roster doesn't depend on which subject is chosen.
    const { data: roster } = useQuery<any>({
        queryKey: ["staff_skill_roster", className], enabled: !!className && !!mySubjects[0],
        queryFn: async () => (await api.get("/staff-portal/skills/assessments", { params: { className, subject: mySubjects[0], term: "Term 1", year } })).data,
    });
    const learners: any[] = roster?.learners || [];

    const build = async (): Promise<string | null> => {
        if (!className) { toast.error("Choose a class."); return null; }
        const subjects = pick.length ? pick : mySubjects;
        const rep = (await api.get("/staff-portal/skills/report", { params: { className, year, subjects: subjects.join(",") } })).data;
        let reports = rep.reports || [];
        if (studentId) reports = reports.filter((r: any) => r.student._id === studentId);
        if (!reports.length) { toast.error("No learners found."); return null; }
        const p: SkillPrint = {
            reports, scales: rep.scales, template, theme, term: tpl.perTerm ? term : "", year, terms: rep.terms,
            school: { name: brand?.name || "School", logo: brand?.logo || "" }, qr: {}, title,
            signatories: sigs.split(",").map(s => ({ title: s.trim() })).filter(s => s.title), showComment: comment,
        };
        return skillReportHtml(p);
    };
    const run = async (mode: "print" | "preview") => {
        setBusy(true);
        try { const html = await build(); if (!html) return; if (mode === "print") outputHtmlDoc(title, html, { fileName: title }); else setPreview(html); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not build the report"); } finally { setBusy(false); }
    };
    return (
        <>
            <PageTitle title="Skill-Based Reports — Print Reports" />
            <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-5">
                <PanelCard title="Report settings">
                    <div className="space-y-4">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Design</div>
                            <div className="grid grid-cols-2 gap-2">
                                {SKILL_TEMPLATES.map(t => <button key={t.key} onClick={() => setTemplate(t.key)} className={`text-left p-3 rounded-xl border-2 ${template === t.key ? "border-[#5C67F2] bg-indigo-50" : "border-gray-100 hover:border-indigo-200"}`}>
                                    <div className="text-xs font-black text-slate-800">{t.label}</div><div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{t.note}</div>
                                </button>)}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Colour</div>
                            <div className="flex gap-2">{Object.entries(SKILL_THEMES).map(([k, t]) => <button key={k} onClick={() => setTheme(k)} title={t.label} className={`w-8 h-8 rounded-full border-2 ${theme === k ? "border-slate-800 scale-110" : "border-white shadow"}`} style={{ background: t.head }} />)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Class</label>
                                <select className={`${sel} w-full`} value={className} onChange={e => { setClassName(e.target.value); setStudentId(""); setPick([]); }}>
                                    <option value="">Select…</option>{classes.map(c => <option key={c.className} value={c.className}>{c.className}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Learner <span className="font-normal text-slate-400">(blank = the whole class)</span></label>
                                <select className={`${sel} w-full`} value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!className}>
                                    <option value="">Whole class ({learners.length})</option>{learners.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                                </select>
                            </div>
                            {tpl.perTerm && <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Term</label><select className={`${sel} w-full`} value={term} onChange={e => setTerm(e.target.value)}>{TERMS.map(t => <option key={t}>{t}</option>)}</select></div>}
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Year</label><input className={`${sel} w-full`} value={year} onChange={e => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
                            <div className="col-span-2"><label className="block text-[11px] font-bold text-slate-500 mb-1">Report title</label><input className={`${sel} w-full`} value={title} onChange={e => setTitle(e.target.value)} /></div>
                        </div>
                        {className && (
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subjects <span className="font-normal normal-case">(none ticked = all you teach in this class)</span></div>
                                <div className="flex flex-wrap gap-1.5">{mySubjects.map(s => { const on = pick.includes(s); return <button key={s} onClick={() => setPick(on ? pick.filter(x => x !== s) : [...pick, s])} className={`px-2.5 h-7 rounded-full text-[11px] font-bold border ${on ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-200"}`}>{s}</button>; })}</div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 items-end">
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Signature lines</label><input className={`${sel} w-full`} value={sigs} onChange={e => setSigs(e.target.value)} /></div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 pb-2"><input type="checkbox" checked={comment} onChange={e => setComment(e.target.checked)} /> Comment lines</label>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => run("preview")} disabled={busy} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50">Preview</button>
                            <button onClick={() => run("print")} disabled={busy} className="h-10 px-5 rounded-xl bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Print / save PDF</button>
                        </div>
                    </div>
                </PanelCard>
                <PanelCard title="Preview">
                    {preview ? (
                        <div className="relative">
                            <button onClick={() => setPreview("")} className="absolute right-2 top-2 z-10 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
                            <iframe title="preview" srcDoc={preview} className="w-full border-0 rounded-lg" style={{ height: "80vh" }} />
                        </div>
                    ) : <div className="min-h-[480px] flex items-center justify-center text-slate-400 text-sm font-bold text-center px-6">Choose a class and a design, then press Preview.</div>}
                </PanelCard>
            </div>
        </>
    );
}
