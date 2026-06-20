import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Printer, Download, Users, BookOpen, ClipboardCheck, Clock, CheckCircle2, Gauge, AlertTriangle, MessageSquare, Search } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import CbcCrud, { Fld } from "./CbcCrud";
import { cbc, LEVELS, levelColor, toCSV, download } from "./cbcApi";
import { useSchoolBrand, printBranded } from "@/lib/printDoc";

const ACCENT = "#7C3AED";
const COLORS = ["#7C3AED", "#1D4ED8", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4"];
const toData = (o: Record<string, number> = {}) => Object.entries(o).map(([name, value]) => ({ name, value }));
const useAreas = () => { const { data = [] } = useQuery({ queryKey: ["cbc", "cbc_learning_areas"], queryFn: () => cbc.list("cbc_learning_areas") }); return data.map((a: any) => a.name).filter(Boolean); };
const useStudents = () => { const { data = [] } = useQuery({ queryKey: ["cbc_students"], queryFn: cbc.students }); return data; };
// Classes from the school's class list (used for Grade/Class dropdowns).
const useClasses = () => {
    const { data = [] } = useQuery({ queryKey: ["cbc_classes"], queryFn: async () => { try { const r = await (await import("@/lib/api")).default.get("/academics/classes"); return r.data || []; } catch { return []; } } });
    return Array.from(new Set(data.map((c: any) => c.name || c.levelName || c.className).filter(Boolean))) as string[];
};
// Teachers (staff with a teaching designation) for teacher dropdowns.
const useTeachers = () => {
    const { data = [] } = useQuery({ queryKey: ["cbc_teachers"], queryFn: async () => { try { const r = await (await import("@/lib/api")).default.get("/staff"); return r.data || []; } catch { return []; } } });
    return data.filter((s: any) => /teacher|tutor|instructor|hod/i.test(`${s.designation || ""} ${(s.roles || []).join(" ")}`)).map((s: any) => s.employeeName || s.name).filter(Boolean) as string[];
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function CbcDashboard() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ["cbc_stats"], queryFn: cbc.stats });
    const seed = async () => { await cbc.seed(); toast.success("CBC competencies & learning areas loaded"); qc.invalidateQueries(); };
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>;
    const c = data?.cards || {}; const ch = data?.charts || {};
    const cards = [
        { label: "Total Learners", value: c.totalLearners, icon: Users }, { label: "Learning Areas", value: c.learningAreas, icon: BookOpen },
        { label: "Assessments", value: c.assessmentsConducted, icon: ClipboardCheck }, { label: "Pending", value: c.pending, icon: Clock },
        { label: "Completed", value: c.completed, icon: CheckCircle2 }, { label: "Avg Score", value: `${c.averageScore || 0}%`, icon: Gauge },
        { label: "Need Support", value: c.needSupport, icon: AlertTriangle }, { label: "Outstanding Comments", value: c.outstandingComments, icon: MessageSquare },
    ];
    return (
        <div className="space-y-6">
            <div className="flex justify-end"><button onClick={seed} className="h-9 px-4 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-[#7C3AED]">Load CBC defaults</button></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cards.map(card => <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-2"><card.icon className="w-4 h-4" /></div><div className="text-2xl font-black text-slate-800">{card.value ?? 0}</div><div className="text-[11px] text-slate-400 font-bold">{card.label}</div></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Performance by Grade"><ResponsiveContainer width="100%" height={240}><BarChart data={toData(ch.byGrade)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill={ACCENT} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
                <Card title="Competency Achievement"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={toData(ch.competencyAchievement)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.competencyAchievement).map((d, i) => <Cell key={i} fill={levelColor(d.name) || COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></Card>
                <Card title="Learning Area Performance"><ResponsiveContainer width="100%" height={240}><BarChart data={toData(ch.byArea)}><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill="#1D4ED8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
                <Card title="Assessment Completion"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={toData(ch.completionRate)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.completionRate).map((_, i) => <Cell key={i} fill={["#10B981", "#F59E0B"][i % 2]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></Card>
            </div>
        </div>
    );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 className="text-sm font-black text-slate-700 mb-3">{title}</h3>{children}</div>; }

// ── Config CRUD pages ─────────────────────────────────────────────────────────
export function LearningAreasPage() {
    const classes = useClasses(); const teachers = useTeachers();
    return <CbcCrud collection="cbc_learning_areas" title="Learning Areas" addLabel="New Learning Area"
        fields={[{ k: "name", label: "Name", required: true }, { k: "grade", label: "Grade Level", type: "select", options: () => classes }, { k: "code", label: "Code" }, { k: "description", label: "Description", type: "textarea" }, { k: "teacher", label: "Assigned Teacher", type: "select", options: () => teachers }, { k: "active", label: "Status", type: "select", options: ["Active", "Inactive"] }]}
        columns={[{ k: "name", label: "Learning Area" }, { k: "grade", label: "Grade" }, { k: "code", label: "Code" }, { k: "teacher", label: "Teacher" }]} />;
}
export function CompetenciesPage() {
    return <CbcCrud collection="cbc_competencies" title="Core Competencies" addLabel="New Competency"
        fields={[{ k: "name", label: "Competency", required: true }, { k: "indicators", label: "Indicators", type: "textarea" }, { k: "active", label: "Status", type: "select", options: ["Active", "Inactive"] }]}
        columns={[{ k: "name", label: "Competency" }, { k: "indicators", label: "Indicators" }]} />;
}
export function StrandsPage() {
    const areas = useAreas();
    return <CbcCrud collection="cbc_strands" title="Strands & Sub-Strands" addLabel="New Strand"
        fields={[{ k: "learningArea", label: "Learning Area", type: "select", options: () => areas, required: true }, { k: "strand", label: "Strand", required: true }, { k: "subStrand", label: "Sub-Strand" }, { k: "outcomes", label: "Learning Outcomes", type: "textarea" }, { k: "criteria", label: "Assessment Criteria", type: "textarea" }, { k: "activities", label: "Suggested Activities", type: "textarea" }, { k: "competencies", label: "Competencies Covered" }]}
        columns={[{ k: "learningArea", label: "Learning Area" }, { k: "strand", label: "Strand" }, { k: "subStrand", label: "Sub-Strand" }]} />;
}
export function ActivitiesPage() {
    const areas = useAreas(); const classes = useClasses();
    const { data: strandRows = [] } = useQuery({ queryKey: ["cbc", "cbc_strands"], queryFn: () => cbc.list("cbc_strands") });
    const strands = Array.from(new Set(strandRows.map((s: any) => s.strand).filter(Boolean))) as string[];
    const types = ["Observation", "Practical Activity", "Oral Assessment", "Project", "Portfolio", "Written Exercise", "Quiz", "Group Work", "Presentation", "Experiment"];
    return <CbcCrud collection="cbc_activities" title="Assessment Activities" addLabel="New Activity"
        fields={[{ k: "title", label: "Title", required: true }, { k: "type", label: "Type", type: "select", options: types, required: true }, { k: "learningArea", label: "Learning Area", type: "select", options: () => areas, required: true }, { k: "grade", label: "Grade", type: "select", options: () => classes }, { k: "class", label: "Class", type: "select", options: () => classes }, { k: "strand", label: "Strand", type: "select", options: () => strands }, { k: "subStrand", label: "Sub-Strand" }, { k: "date", label: "Date", type: "date" }, { k: "maxScore", label: "Max Score", type: "number" }, { k: "instructions", label: "Instructions", type: "textarea" }]}
        columns={[{ k: "title", label: "Title" }, { k: "type", label: "Type" }, { k: "learningArea", label: "Area" }, { k: "grade", label: "Grade" }, { k: "date", label: "Date" }]} />;
}
export function CommentsPage() {
    const students = useStudents();
    return <CbcCrud collection="cbc_comments" title="Teacher Comments" addLabel="New Comment"
        fields={[{ k: "studentName", label: "Learner", type: "select", options: () => students.map((s: any) => s.studentName || s.name).filter(Boolean), required: true }, { k: "type", label: "Type", type: "select", options: ["Teacher", "Head Teacher"] }, { k: "strengths", label: "Strengths", type: "textarea" }, { k: "improvement", label: "Areas to Improve", type: "textarea" }, { k: "recommendations", label: "Recommendations", type: "textarea" }, { k: "text", label: "General Remarks", type: "textarea" }]}
        columns={[{ k: "studentName", label: "Learner" }, { k: "type", label: "Type" }, { k: "text", label: "Remarks" }]} />;
}

// ── Record Assessments (bulk class entry) ─────────────────────────────────────
export function RecordPage() {
    const qc = useQueryClient();
    const { data: activities = [] } = useQuery({ queryKey: ["cbc", "cbc_activities"], queryFn: () => cbc.list("cbc_activities") });
    const students = useStudents();
    const [activityId, setActivityId] = useState("");
    const [marks, setMarks] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const activity = activities.find((a: any) => a._id === activityId);
    const roster = useMemo(() => activity?.grade ? students.filter((s: any) => (s.currentClass || s.studentClass || "") === activity.grade || (s.currentClass || s.studentClass || "").includes(activity.grade)) : students, [students, activity]);

    const save = async () => {
        if (!activityId) return toast.error("Select an activity");
        const records = roster.filter((s: any) => marks[s._id]).map((s: any) => ({ studentId: s._id, studentName: s.studentName || s.name, grade: s.currentClass || s.studentClass, learningArea: activity.learningArea, strand: activity.strand, activityId, level: marks[s._id], term: activity.term, year: activity.year }));
        if (!records.length) return toast.error("Mark at least one learner");
        setSaving(true);
        try { const r = await cbc.bulkAssess(activityId, records); toast.success(`Saved ${r.saved} assessments`); setMarks({}); qc.invalidateQueries({ queryKey: ["cbc_stats"] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); }
    };
    const setAll = (lvl: string) => { const m: Record<string, string> = {}; roster.forEach((s: any) => m[s._id] = lvl); setMarks(m); };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[240px]"><label className="block text-[11px] font-bold text-slate-600 mb-1">Assessment Activity *</label><select value={activityId} onChange={e => { setActivityId(e.target.value); setMarks({}); }} className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#7C3AED]"><option value="">Select activity…</option>{activities.map((a: any) => <option key={a._id} value={a._id}>{a.title} · {a.learningArea} {a.grade ? `· ${a.grade}` : ""}</option>)}</select></div>
                {activityId && <div className="flex gap-1.5">{LEVELS.map(l => <button key={l.code} onClick={() => setAll(l.code)} className="h-9 px-3 rounded-lg text-xs font-bold text-white" style={{ background: l.color }}>All {l.code}</button>)}</div>}
            </div>
            {!activityId ? <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400 text-xs font-bold uppercase">Select an activity to load the class roster</div> : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100"><p className="text-xs font-black text-slate-600 uppercase">{roster.length} learners</p><p className="text-[10px] text-slate-400">EE=Exceeding · ME=Meeting · AE=Approaching · BE=Below</p></div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-50">
                            {roster.map((s: any, i: number) => (
                                <tr key={s._id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 text-slate-400 w-10">{i + 1}</td>
                                    <td className="py-3 px-4 font-bold text-slate-800">{s.studentName || s.name}<div className="text-[10px] text-slate-400 font-normal">{s.registrationNo || s.admNo || ""}</div></td>
                                    <td className="py-3 px-4 w-72"><div className="flex gap-1.5 justify-end">{LEVELS.map(l => <button key={l.code} onClick={() => setMarks(m => ({ ...m, [s._id]: l.code }))} className={`px-3 py-1.5 rounded-lg text-[11px] font-black ${marks[s._id] === l.code ? "text-white" : "bg-slate-100 text-slate-500"}`} style={marks[s._id] === l.code ? { background: l.color } : {}}>{l.code}</button>)}</div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-4 border-t border-slate-100 flex justify-end"><button onClick={save} disabled={saving} className="h-10 px-6 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Assessments</button></div>
                </div>
            )}
        </div>
    );
}

// ── Learner Progress ──────────────────────────────────────────────────────────
export function ProgressPage() {
    const students = useStudents();
    const [sid, setSid] = useState(""); const [search, setSearch] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["cbc_progress", sid], queryFn: () => cbc.progress(sid), enabled: !!sid });
    const filtered = students.filter((s: any) => !search || `${s.studentName || s.name} ${s.registrationNo || s.admNo}`.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learner…" className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" /></div>
                <select value={sid} onChange={e => setSid(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold min-w-[240px]"><option value="">Select learner…</option>{filtered.map((s: any) => <option key={s._id} value={s._id}>{s.studentName || s.name} ({s.registrationNo || s.admNo})</option>)}</select>
            </div>
            {!sid ? <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400 text-xs font-bold uppercase">Select a learner</div> : isLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /> : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="text-sm font-black text-slate-700 mb-3">Learning Areas</h3>
                        {(data?.areas || []).length === 0 ? <p className="text-xs text-slate-400">No assessments yet.</p> : (data?.areas || []).map((a: any) => (
                            <div key={a.area} className="flex items-center justify-between py-2 border-b border-slate-50"><span className="font-bold text-slate-700 text-sm">{a.area}</span><span className="text-[11px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: levelColor(a.level) }}>{a.level} · {a.levelLabel}</span></div>
                        ))}
                    </div>
                    <div className="space-y-3">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h4 className="text-xs font-black text-emerald-600 uppercase mb-2">Strengths</h4>{(data?.strengths || []).length ? (data.strengths).map((s: string) => <p key={s} className="text-xs text-slate-600">• {s}</p>) : <p className="text-xs text-slate-400">—</p>}</div>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h4 className="text-xs font-black text-amber-600 uppercase mb-2">Areas to Improve</h4>{(data?.improvement || []).length ? (data.improvement).map((s: string) => <p key={s} className="text-xs text-slate-600">• {s}</p>) : <p className="text-xs text-slate-400">—</p>}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Report Cards ──────────────────────────────────────────────────────────────
export function ReportCardsPage() {
    const students = useStudents();
    const [sid, setSid] = useState(""); const [search, setSearch] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["cbc_rc", sid], queryFn: () => cbc.reportCard(sid), enabled: !!sid });
    const filtered = students.filter((s: any) => !search || `${s.studentName || s.name} ${s.registrationNo || s.admNo}`.toLowerCase().includes(search.toLowerCase()));
    const print = () => {
        if (!data) return; const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups");
        const areas = (data.learningAreas || []).map((a: any) => `<tr><td>${a.area}</td><td>${a.level} — ${a.levelLabel}</td><td>${(a.strands || []).map((s: any) => `${s.strand}: ${s.level}`).join("<br/>") || "—"}</td></tr>`).join("");
        w.document.write(`<!DOCTYPE html><html><head><title>CBC Report Card</title><style>@page{margin:15mm}body{font-family:Arial;color:#1e293b}.h{text-align:center;border-bottom:3px solid #7C3AED;padding-bottom:12px;margin-bottom:16px}h1{color:#7C3AED;font-size:20px;margin:4px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#7C3AED;color:#fff;padding:8px;text-align:left;font-size:11px}td{padding:8px;border-bottom:1px solid #eee;font-size:12px}.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:12px}.cm{border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:14px}</style></head><body>
        <div class="h">${data.school.logo ? `<img src="${data.school.logo}" style="height:50px"/>` : ""}<h1>${data.school.name}</h1><div style="color:#7C3AED;font-weight:600">CBC Learner Report Card</div></div>
        <div class="info"><div><b>Learner:</b> ${data.student.name}</div><div><b>Adm No:</b> ${data.student.admissionNo || "—"}</div><div><b>Grade:</b> ${data.student.grade || "—"}</div><div><b>Term:</b> ${data.term} ${data.year}</div></div>
        <table><thead><tr><th>Learning Area</th><th>Achievement Level</th><th>Strands</th></tr></thead><tbody>${areas || '<tr><td colspan="3">No assessments recorded.</td></tr>'}</tbody></table>
        <div class="cm"><b>Class Teacher's Comment:</b><br/>${data.teacherComment || "—"}</div>
        <div class="cm"><b>Head Teacher's Comment:</b><br/>${data.headComment || "—"}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:48px"><div style="border-top:1px solid #94a3b8;padding-top:4px;font-size:10px">Principal Signature</div><div style="border-top:1px solid #94a3b8;padding-top:4px;font-size:10px">School Stamp</div></div>
        <script>onload=()=>print()</script></body></html>`);
        w.document.close();
    };
    return (
        <div className="space-y-4">
            <div className="flex gap-3 flex-wrap items-end">
                <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learner…" className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" /></div>
                <select value={sid} onChange={e => setSid(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold min-w-[240px]"><option value="">Select learner…</option>{filtered.map((s: any) => <option key={s._id} value={s._id}>{s.studentName || s.name} ({s.registrationNo || s.admNo})</option>)}</select>
                {sid && <button onClick={print} className="h-10 px-5 text-white rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: ACCENT }}><Printer className="w-4 h-4" /> Print Report Card</button>}
            </div>
            {sid && (isLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /> : data && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-lg font-black text-slate-800">{data.student.name} <span className="text-slate-300 text-sm">· {data.student.grade}</span></h3>
                    <table className="w-full text-sm mt-3"><thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase"><th className="text-left px-4 py-2 font-black">Learning Area</th><th className="text-left px-4 py-2 font-black">Level</th></tr></thead><tbody>{(data.learningAreas || []).map((a: any) => <tr key={a.area} className="border-b border-slate-50"><td className="px-4 py-2 font-bold text-slate-700">{a.area}</td><td className="px-4 py-2"><span className="text-[11px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: levelColor(a.level) }}>{a.level} · {a.levelLabel}</span></td></tr>)}{(data.learningAreas || []).length === 0 && <tr><td colSpan={2} className="py-6 text-center text-slate-400 text-xs">No assessments yet</td></tr>}</tbody></table>
                </div>
            ))}
        </div>
    );
}

// ── Analytics + Reports (reuse the report endpoint) ───────────────────────────
export function AnalyticsPage() {
    const { data, isLoading } = useQuery({ queryKey: ["cbc_stats"], queryFn: cbc.stats });
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />;
    const ch = data?.charts || {};
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Gender Comparison"><ResponsiveContainer width="100%" height={260}><BarChart data={toData(ch.byGender)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill={ACCENT} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
            <Card title="Learning Area Analysis"><ResponsiveContainer width="100%" height={260}><BarChart data={toData(ch.byArea)}><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill="#1D4ED8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
            <Card title="Competency Achievement"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={toData(ch.competencyAchievement)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>{toData(ch.competencyAchievement).map((d, i) => <Cell key={i} fill={levelColor(d.name) || COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></Card>
            <Card title="Performance by Grade"><ResponsiveContainer width="100%" height={260}><BarChart data={toData(ch.byGrade)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
        </div>
    );
}

const REPORTS = [{ k: "progress", l: "Learner Progress" }, { k: "competency", l: "Competency" }, { k: "learning-area", l: "Learning Area" }];
export function ReportsPage() {
    const [active, setActive] = useState("progress");
    const school = useSchoolBrand();
    const { data, isLoading } = useQuery({ queryKey: ["cbc_report", active], queryFn: () => cbc.report(active) });
    const cols = data?.columns || []; const rows = data?.rows || [];
    const csv = () => download(toCSV(cols.map((c: any) => c.label), rows.map((r: any) => cols.map((c: any) => r[c.key] ?? ""))), `${data.title}.csv`);
    const print = () => { const head = cols.map((c: any) => `<th>${c.label}</th>`).join(""); const body = rows.map((r: any) => `<tr>${cols.map((c: any) => `<td>${r[c.key] ?? ""}</td>`).join("")}</tr>`).join(""); printBranded(school, data.title, `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`, ACCENT); };
    return (
        <div className="space-y-4">
            <div className="flex gap-2">{REPORTS.map(r => <button key={r.k} onClick={() => setActive(r.k)} className={`h-9 px-4 rounded-lg text-sm font-bold ${active === r.k ? "text-white" : "bg-white border border-slate-200 text-slate-600"}`} style={active === r.k ? { background: ACCENT } : {}}>{r.l}</button>)}</div>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /> : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100"><h3 className="font-black text-slate-800">{data?.title} · {rows.length}</h3><div className="flex gap-2"><button onClick={csv} className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> CSV</button><button onClick={print} className="h-9 px-3 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: ACCENT }}><Printer className="w-3.5 h-3.5" /> Print</button></div></div>
                    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">{cols.map((c: any) => <th key={c.key} className="text-left px-4 py-3 font-black">{c.label}</th>)}</tr></thead><tbody>{rows.map((r: any, i: number) => <tr key={i} className="border-b border-slate-50">{cols.map((c: any) => <td key={c.key} className="px-4 py-2.5 text-slate-600">{r[c.key] ?? "—"}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={cols.length} className="py-10 text-center text-slate-400 text-xs font-bold uppercase">No data</td></tr>}</tbody></table></div>
                </div>
            )}
        </div>
    );
}

export function SettingsPage() {
    const { data, isLoading } = useQuery({ queryKey: ["cbc_settings"], queryFn: cbc.settings });
    const [form, setForm] = useState<any>({}); const [saving, setSaving] = useState(false);
    if (!isLoading && Object.keys(form).length === 0 && data) setForm(data);
    const save = async () => { setSaving(true); try { await cbc.setSettings(form); toast.success("Saved"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); } };
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />;
    return (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Assessment Types (comma-separated)</label><input value={(form.assessmentTypes || []).join(", ")} onChange={e => setForm((f: any) => ({ ...f, assessmentTypes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={!!form.parentAccess} onChange={e => setForm((f: any) => ({ ...f, parentAccess: e.target.checked }))} /> Allow parents to view CBC report cards</label>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-xs text-violet-700">Achievement levels: <b>EE</b> Exceeding · <b>ME</b> Meeting · <b>AE</b> Approaching · <b>BE</b> Below Expectation (fixed CBC scale).</div>
            <button onClick={save} disabled={saving} className="h-10 px-5 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings</button>
        </div>
    );
}
