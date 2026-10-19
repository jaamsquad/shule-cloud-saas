import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const sel = "h-10 px-3 border border-black/10 rounded text-sm bg-white";

// Skill-Based Reports → Assess learners, scoped to the classes & subjects this
// teacher is assigned (see /staff-portal/skills/* in auth.routes.ts). Mirrors
// the admin "Exams → Skill-Based Reports → Assess learners" page, reading the
// same skill_areas/skill_assessments data.
export default function StaffSkillsAssess() {
    const { api } = useOutletContext<StaffCtx>();
    const { data: scope } = useQuery<{ classes: { classId: string; className: string; subjects: string[] }[] }>({
        queryKey: ["staff_skills_scope"], queryFn: async () => (await api.get("/staff-portal/skills/scope")).data, retry: false,
    });
    const classes = scope?.classes || [];

    const [className, setClassName] = useState("");
    const [subject, setSubject] = useState("");
    const [term, setTerm] = useState(TERMS[0]);
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [areaId, setAreaId] = useState("");
    const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
    const [saving, setSaving] = useState(false);

    const subjectsForClass = classes.find(c => c.className === className)?.subjects || [];
    useEffect(() => { setSubject(""); setAreaId(""); }, [className]);
    useEffect(() => { setAreaId(""); }, [subject]);

    const { data: frameworks = [] } = useQuery<any[]>({
        queryKey: ["staff_skill_frameworks", subject], enabled: !!subject,
        queryFn: async () => (await api.get("/staff-portal/skills/frameworks", { params: { subject } })).data || [],
        retry: false,
    });
    const area = frameworks.find((a: any) => a._id === areaId) || frameworks[0];

    const { data, isFetching, refetch } = useQuery<any>({
        queryKey: ["staff_skill_assess", className, subject, term, year], enabled: !!className && !!subject,
        queryFn: async () => (await api.get("/staff-portal/skills/assessments", { params: { className, subject, term, year } })).data,
        retry: false,
    });
    useEffect(() => { setDraft({}); }, [className, subject, term, year]);

    // Rating options for this area's scale (mirrors backend SCALES — see note on SCALE_RATINGS below).
    const scaleCodes: { code: string; short: string }[] = useMemo(() => {
        const ratings = SCALE_RATINGS[area?.scale as string] || SCALE_RATINGS.mastery;
        return ratings;
    }, [area]);

    const value = (sid: string, skill: string) => draft[sid]?.[skill] ?? data?.ratings?.[sid]?.[skill] ?? "";
    const set = (sid: string, skill: string, v: string) => setDraft(d => ({ ...d, [sid]: { ...(d[sid] || {}), [skill]: v } }));
    const dirty = Object.values(draft).some(o => Object.keys(o).length);
    const fillColumn = (skill: string, v: string) => (data?.learners || []).forEach((l: any) => set(l._id, skill, v));

    const save = async () => {
        const records = Object.entries(draft).flatMap(([studentId, m]) => Object.entries(m).map(([skillId, rating]) => ({ studentId, skillId, rating })));
        if (!records.length) return; setSaving(true);
        try {
            const r = (await api.post("/staff-portal/skills/assessments/bulk", { className, subject, term, year, records })).data;
            toast.success(`Saved ${r.saved} rating${r.saved === 1 ? "" : "s"}${r.cleared ? ` · ${r.cleared} cleared` : ""}`);
            setDraft({}); refetch();
        } catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); } finally { setSaving(false); }
    };

    return (
        <>
            <PageTitle title="Skill-Based Reports — Assess Learners" />
            <PanelCard title="Pick a class, subject and term">
                <div className="grid sm:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Class</label>
                        <select className={`${sel} w-full`} value={className} onChange={e => setClassName(e.target.value)}>
                            <option value="">— Select —</option>
                            {classes.map(c => <option key={c.className} value={c.className}>{c.className}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Subject</label>
                        <select className={`${sel} w-full`} value={subject} onChange={e => setSubject(e.target.value)} disabled={!className}>
                            <option value="">— Select —</option>
                            {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Term</label>
                        <select className={`${sel} w-full`} value={term} onChange={e => setTerm(e.target.value)}>{TERMS.map(t => <option key={t}>{t}</option>)}</select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Year</label>
                        <input className={`${sel} w-full`} value={year} onChange={e => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                    </div>
                </div>
                {classes.length === 0 && <p className="text-xs text-slate-400 mt-3">You have no class/subject assignments yet — ask the office to assign you one.</p>}
            </PanelCard>

            {!className || !subject ? (
                <PanelCard title="Learners">
                    <div className="py-10 text-center text-slate-400 text-sm font-semibold">Choose a class and a subject above.</div>
                </PanelCard>
            ) : frameworks.length === 0 ? (
                <PanelCard title="Learners">
                    <div className="py-10 text-center text-slate-400 text-sm font-semibold">No skills have been set up for {subject} yet — ask an admin to add them under Exams → Skill-Based Reports.</div>
                </PanelCard>
            ) : (
                <PanelCard title={`${className} — ${subject}`} action={
                    <button onClick={save} disabled={!dirty || saving} className="h-9 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save ratings
                    </button>
                }>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {frameworks.map((a: any) => <button key={a._id} onClick={() => setAreaId(a._id)} className={`h-9 px-4 rounded-full text-xs font-bold ${area?._id === a._id ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{a.area}</button>)}
                    </div>
                    <div className="overflow-auto border border-slate-100 rounded-xl">
                        {isFetching && !data ? <div className="py-14 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
                            <table className="w-full text-sm">
                                <thead><tr className="bg-slate-50 text-[11px] text-slate-500 uppercase">
                                    <th className="text-left p-3 sticky left-0 bg-slate-50 min-w-[180px]">Learner</th>
                                    {area?.skills.map((s: any) => (
                                        <th key={s.id} className="p-3 min-w-[150px] align-top text-left normal-case font-bold text-slate-600">
                                            <div className="mb-1 leading-snug">{s.name}</div>
                                            <select value="" onChange={e => e.target.value && fillColumn(s.id, e.target.value === "__clear" ? "" : e.target.value)} className="h-7 text-[10px] border border-slate-200 rounded bg-white w-full">
                                                <option value="">Set everyone…</option>{scaleCodes.map(r => <option key={r.code} value={r.code}>{r.short}</option>)}<option value="__clear">Clear</option>
                                            </select>
                                        </th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {(data?.learners || []).map((l: any) => (
                                        <tr key={l._id} className="border-t border-slate-50">
                                            <td className="p-3 sticky left-0 bg-white font-bold text-slate-700">{l.name}<div className="text-[10px] text-slate-400 font-normal">{l.regNo}</div></td>
                                            {area?.skills.map((s: any) => (
                                                <td key={s.id} className="p-2">
                                                    <select value={value(l._id, s.id)} onChange={e => set(l._id, s.id, e.target.value)} className={`h-9 w-full px-2 border rounded-lg text-sm font-bold bg-white ${draft[l._id]?.[s.id] !== undefined ? "border-[#5C67F2]" : "border-slate-200"}`}>
                                                        <option value="">—</option>{scaleCodes.map(r => <option key={r.code} value={r.code}>{r.short}</option>)}
                                                    </select>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {(data?.learners || []).length === 0 && <tr><td colSpan={99} className="py-12 text-center text-slate-400 text-sm">No learners in this class.</td></tr>}
                                </tbody>
                            </table>
                        )}
                    </div>
                </PanelCard>
            )}
        </>
    );
}

// Same rating scales as backend/modules/skills/skills.routes.ts SCALES — short codes only
// (the picker doesn't need the full label).
const SCALE_RATINGS: Record<string, { code: string; short: string }[]> = {
    mastery: [{ code: "M", short: "Mastered" }, { code: "P", short: "Progressing" }, { code: "B", short: "Beginning" }],
    letters: ["A", "B", "C", "D", "E"].map(c => ({ code: c, short: c })),
    cbc: [{ code: "EE", short: "EE" }, { code: "ME", short: "ME" }, { code: "AE", short: "AE" }, { code: "BE", short: "BE" }],
    effort: [{ code: "EX", short: "Excellent" }, { code: "VG", short: "Very Good" }, { code: "G", short: "Good" }, { code: "F", short: "Fair" }, { code: "NI", short: "Needs Impr." }],
};
