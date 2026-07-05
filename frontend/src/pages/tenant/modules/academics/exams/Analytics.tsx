import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
    LineChart, Line, Legend, CartesianGrid,
} from "recharts";
import { Loader2, ChevronRight, ArrowLeft, Trophy, TrendingUp, Users, Award, ChevronDown, Printer } from "lucide-react";
import api from "@/lib/api";

// Zeraki-style teacher/admin analytics. Two views:
//  1) My Classes — cards per form (mean pts/%/grade, grade breakdown bars, Analyze)
//  2) Form Analytics — class averages, stream comparison, subject performance,
//     performance over time, grade breakdown, merit + most-improved.
const GREEN = "#2E7D32", LIGHT = "#81C784";
const STREAM_COLORS = ["#2E7D32", "#1565C0", "#C62828", "#F9A825", "#6A1B9A", "#00838F", "#4E342E"];

// Shared school identity (name + logo) for print headers. Reads the tenant profile.
function useSchool() {
    const { data } = useQuery({ queryKey: ["tenant_profile_analytics"], queryFn: async () => (await api.get("/auth/tenant/profile")).data });
    return {
        name: data?.instituteName || data?.name || data?.schoolName || "",
        logo: data?.logo || data?.logoUrl || data?.badge || "",
        box: data?.poBox || data?.address || "",
        tel: data?.phone || data?.tel || "",
    };
}

// Open a print window with a branded header (logo + school name + report title),
// then the supplied body HTML. Shared by every printable analytics view.
function printDoc(school: { name: string; logo: string; box?: string; tel?: string }, title: string, subtitle: string, bodyHtml: string, landscape = false) {
    const w = window.open("", "_blank", `width=${landscape ? 1100 : 900},height=820`);
    if (!w) return;
    const header = `
        <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px">
            ${school.logo ? `<img src="${school.logo}" style="width:54px;height:54px;object-fit:contain"/>` : ""}
            <div style="flex:1">
                <div style="font-size:20px;font-weight:800;letter-spacing:.5px">${school.name || "SCHOOL NAME"}</div>
                <div style="font-size:10px">${[school.box, school.tel ? `Tel: ${school.tel}` : ""].filter(Boolean).join(" · ")}</div>
                <div style="font-size:13px;font-weight:700;margin-top:2px">${title}</div>
            </div>
            <div style="text-align:right;font-size:10px">Issued: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        ${subtitle ? `<div style="font-size:11px;margin-bottom:6px">${subtitle}</div>` : ""}`;
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
        @page{size:A4 ${landscape ? "landscape" : "portrait"};margin:10mm}
        body{font-family:'Times New Roman',serif;color:#000;font-size:11px;-webkit-print-color-adjust:exact}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border:.6px solid #000;padding:2px 5px;text-align:center}
        th{background:#eee}
    </style></head><body>${header}${bodyHtml}<script>onload=()=>print()</script></body></html>`);
    w.document.close();
}

export default function Analytics() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [examId, setExamId] = useState("");
    // The selected class/form is URL-driven: /exams/analytics?class=Form%204&tab=merit
    const form = searchParams.get("class");   // null = My Classes view
    const setForm = (f: string | null) => setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        if (f) p.set("class", f); else { p.delete("class"); p.delete("tab"); }
        return p;
    });
    const [examOpen, setExamOpen] = useState(false);

    const { data: examData } = useQuery({ queryKey: ["an_exams"], queryFn: async () => (await api.get("/analytics/exams")).data });
    const exams = examData?.exams || [];
    const groups = examData?.groups || {};
    const current = exams.find((e: any) => e.id === examId) || exams[0];
    const activeExamId = examId || current?.id || "";

    return (
        <div className="flex-1 bg-[#F5F5F5] min-h-screen">
            {/* Header bar */}
            <div className="text-white px-5 py-4 flex items-center justify-between" style={{ background: GREEN }}>
                <div className="flex items-center gap-2">
                    {form && <button onClick={() => setForm(null)} className="mr-1"><ArrowLeft className="w-5 h-5" /></button>}
                    <h1 className="text-lg font-black">{form ? `${form} Analytics` : "Analysis"}</h1>
                </div>
                {/* Exam selector (grouped by term) */}
                <div className="relative">
                    <button onClick={() => setExamOpen(o => !o)} className="h-9 px-3 rounded-lg bg-white/15 text-white text-sm font-bold flex items-center gap-1.5 max-w-[18rem]">
                        <span className="truncate">{current?.title || "Select exam"}</span><ChevronDown className="w-4 h-4" />
                    </button>
                    {examOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setExamOpen(false)} />
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-20 max-h-96 overflow-y-auto">
                                {Object.entries(groups).map(([term, list]: any) => (
                                    <div key={term}>
                                        <p className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{term}</p>
                                        {list.map((e: any) => (
                                            <button key={e.id} onClick={() => { setExamId(e.id); setExamOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-left">
                                                <span className={`w-3.5 h-3.5 rounded-full border-2 ${e.id === activeExamId ? "border-[#2E7D32]" : "border-slate-300"} flex items-center justify-center`}>{e.id === activeExamId && <span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />}</span>
                                                <span className="text-sm text-slate-700">{e.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                ))}
                                {exams.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No exams yet.</p>}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="p-4">
                {!activeExamId ? (
                    <div className="py-24 text-center text-slate-400 font-bold">Create an exam and enter marks to see analytics.</div>
                ) : form ? (
                    <FormAnalytics examId={activeExamId} form={form} />
                ) : (
                    <MyClasses examId={activeExamId} onAnalyze={setForm} />
                )}
            </div>
        </div>
    );
}

function MyClasses({ examId, onAnalyze }: { examId: string; onAnalyze: (f: string) => void }) {
    const [curFilter, setCurFilter] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["an_overview", examId], queryFn: async () => (await api.get("/analytics/overview", { params: { examId } })).data });
    if (isLoading) return <Spin />;
    const allClasses = data?.classes || [];
    const grades = data?.grades || [];
    if (!allClasses.length) return <Empty msg="No marks recorded for this exam yet." />;
    // Curriculum filter — the backend tags each class with its curriculum.
    const curricula: string[] = Array.from(new Set(allClasses.map((c: any) => c.curriculum).filter(Boolean)));
    const classes = curFilter ? allClasses.filter((c: any) => c.curriculum === curFilter) : allClasses;
    const curBadge = (cur: string) => cur === "CBC" ? "bg-emerald-100 text-emerald-700" : cur === "Cambridge" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700";

    return (
        <>
            {curricula.length > 1 && (
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-[11px] font-black uppercase text-slate-400">Curriculum</span>
                    <button onClick={() => setCurFilter("")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!curFilter ? "bg-[#2E7D32] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>All</button>
                    {curricula.map(cur => (
                        <button key={cur} onClick={() => setCurFilter(cur)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${curFilter === cur ? "bg-[#2E7D32] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{cur}</button>
                    ))}
                </div>
            )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c: any) => (
                <div key={c.name} className={`bg-white rounded-2xl border p-5 ${c.noMarks ? "border-dashed border-slate-200" : "border-slate-100"}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-800">{c.name}</h3>
                            {c.curriculum && <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${curBadge(c.curriculum)}`}>{c.curriculum}</span>}
                        </div>
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.students}</span>
                    </div>
                    {c.noMarks ? (
                        <div className="py-6 text-center">
                            <p className="text-sm font-bold text-slate-400">No marks entered yet</p>
                            <p className="text-[11px] text-slate-400 mt-1">This class sat the exam but marks are pending.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <Stat label="Mean Pts" value={c.meanPoints} />
                                <Stat label="Mean %" value={`${c.meanPct}`} />
                                <Stat label="Grade" value={c.meanGrade} />
                            </div>
                            {/* Grade breakdown bars */}
                            <div className="h-20">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={grades.map((g: string) => ({ grade: g, n: c.breakdown[g] || 0 }))}>
                                        <XAxis dataKey="grade" tick={{ fontSize: 8 }} interval={0} />
                                        <Tooltip />
                                        <Bar dataKey="n" fill={LIGHT} radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                    <button onClick={() => onAnalyze(c.name)} disabled={c.noMarks} className="w-full mt-3 h-9 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40" style={{ background: GREEN }}>
                        Analyze <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
        </>
    );
}

const FORM_TABS = ["overview", "merit", "comparison", "subjects", "classes", "improved"] as const;
type FormTab = typeof FORM_TABS[number];
const FORM_TAB_LABELS: Record<FormTab, string> = { overview: "Overview", merit: "Merit List", comparison: "Comparison", subjects: "Subjects", classes: "Class & Stream", improved: "Most Improved" };

function FormAnalytics({ examId, form }: { examId: string; form: string }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlTab = (searchParams.get("tab") || "overview") as FormTab;
    const tab: FormTab = FORM_TABS.includes(urlTab) ? urlTab : "overview";
    const setTab = (t: FormTab) => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set("tab", t); return p; });
    const { data, isLoading } = useQuery({ queryKey: ["an_form", examId, form], queryFn: async () => (await api.get("/analytics/form", { params: { examId, form } })).data });
    const { data: ot } = useQuery({ queryKey: ["an_ot", form], queryFn: async () => (await api.get("/analytics/over-time", { params: { form } })).data });
    const { data: cmp } = useQuery({ queryKey: ["an_compare", examId, form], queryFn: async () => (await api.get("/analytics/compare", { params: { examId, form } })).data });
    if (isLoading) return <Spin />;
    if (!data) return <Empty msg="No data." />;

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <p className="text-xs text-slate-400 font-bold">{data.examTitle}</p>
                <div className="grid grid-cols-3 gap-3 mt-2">
                    <Stat label="Mean Points" value={data.averages.meanPoints} big />
                    <Stat label="Mean Marks" value={`${data.averages.meanPct}%`} big />
                    <Stat label="Mean Grade" value={data.averages.meanGrade} big />
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {data.satCount} students sat this exam</p>
            </div>

            <div className="flex gap-2 flex-wrap">
                {FORM_TABS.map(k => (
                    <button key={k} onClick={() => setTab(k)} className={`h-9 px-4 rounded-lg font-bold text-sm ${tab === k ? "text-white" : "bg-white text-slate-600 border border-slate-200"}`} style={tab === k ? { background: GREEN } : {}}>{FORM_TAB_LABELS[k]}</button>
                ))}
            </div>

            {tab === "overview" && (
                <>
                    {/* Current vs Previous exam */}
                    {cmp && (
                        <Card title="This Exam vs Previous">
                            {!cmp.previous ? <Empty msg="No previous exam to compare." /> : (
                                <>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Mean Points</div>
                                            <div className="text-lg font-black text-slate-800">{cmp.current.meanPoints} <span className="text-slate-300 text-xs">vs {cmp.previous.meanPoints}</span></div>
                                            <Delta v={cmp.delta.meanPoints} />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Mean Marks</div>
                                            <div className="text-lg font-black text-slate-800">{cmp.current.meanPct}% <span className="text-slate-300 text-xs">vs {cmp.previous.meanPct}%</span></div>
                                            <Delta v={cmp.delta.meanPct} />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Students</div>
                                            <div className="text-lg font-black text-slate-800">{cmp.current.students}</div>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-2 text-center">Compared to <b>{cmp.previousExam}</b></p>
                                </>
                            )}
                        </Card>
                    )}

                    {/* Per-subject current vs previous */}
                    {cmp?.subjects?.length > 0 && (
                        <Card title="Subject Comparison (Mean % — This vs Previous)">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="text-slate-400 text-[11px] uppercase"><th className="text-left py-1">Subject</th><th className="text-center">This</th><th className="text-center">Previous</th><th className="text-center">Change</th></tr></thead>
                                    <tbody>
                                        {cmp.subjects.map((s: any) => (
                                            <tr key={s.name} className="border-t border-slate-50">
                                                <td className="py-1.5 font-bold text-slate-700">{s.name}</td>
                                                <td className="text-center">{s.current != null ? `${s.current}%` : "—"}</td>
                                                <td className="text-center text-slate-400">{s.previous != null ? `${s.previous}%` : "—"}</td>
                                                <td className="text-center">{s.change != null ? <Delta v={s.change} /> : <span className="text-slate-300">—</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Stream comparison */}
                    <Card title="Stream Comparison (Mean Points)">
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.streams}>
                                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="stream" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
                                    <Area type="monotone" dataKey="meanPoints" stroke={GREEN} fill={LIGHT} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Performance over time (multi-line per stream + overall) */}
                    <Card title="Performance Over Time">
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={ot?.series || []}>
                                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="exam" tick={{ fontSize: 9 }} hide /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                                    {(ot?.streams || []).map((s: string, i: number) => <Line key={s} type="monotone" dataKey={s} stroke={s === "Overall" ? "#000" : STREAM_COLORS[i % STREAM_COLORS.length]} strokeWidth={s === "Overall" ? 2.5 : 1.5} dot={false} />)}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Subject performance table */}
                    <Card title="Subject Performance">
                        <table className="w-full text-sm">
                            <thead><tr className="text-slate-400 text-[11px] uppercase"><th className="text-left py-2">Subject</th><th className="text-right">Points</th><th className="text-center">Change</th><th className="text-center">Grade</th></tr></thead>
                            <tbody>
                                {data.subjects.map((s: any) => (
                                    <tr key={s.name} className="border-t border-slate-50">
                                        <td className="py-2 font-bold text-slate-700">{s.name}</td>
                                        <td className="text-right">{s.points}</td>
                                        <td className="text-center"><Delta v={s.change} /></td>
                                        <td className="text-center font-bold">{s.grade}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {/* Grade breakdown (streams rows × grades cols) */}
                    <Card title="Grade Breakdown">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead><tr className="text-slate-400 uppercase"><th className="text-left py-1">Stream</th>{data.grades.map((g: string) => <th key={g} className="text-center px-1">{g}</th>)}</tr></thead>
                                <tbody>
                                    {data.breakdown.map((row: any) => (
                                        <tr key={row.stream} className="border-t border-slate-50">
                                            <td className="py-1.5 font-bold text-slate-700">{row.stream}</td>
                                            {data.grades.map((g: string) => <td key={g} className="text-center">{row.counts[g] || 0}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}

            {/* Comparison tab — Subject Comparison (This vs Previous) + Subject Performance */}
            {tab === "comparison" && (
                <>
                    <Card title="Subject Comparison (Mean % — This vs Previous)">
                        {!(cmp?.subjects?.length > 0) ? <Empty msg="No previous exam to compare." /> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="text-slate-400 text-[11px] uppercase"><th className="text-left py-2">Subject</th><th className="text-center">This</th><th className="text-center">Previous</th><th className="text-center">Change</th></tr></thead>
                                    <tbody>
                                        {cmp.subjects.map((s: any) => (
                                            <tr key={s.name} className="border-t border-slate-50">
                                                <td className="py-2 font-bold text-slate-700 uppercase">{s.name}</td>
                                                <td className="text-center font-bold">{s.current != null ? `${s.current}%` : "—"}</td>
                                                <td className="text-center text-slate-400">{s.previous != null ? `${s.previous}%` : "—"}</td>
                                                <td className="text-center">{s.change != null ? <Delta v={s.change} /> : <span className="text-slate-300">—</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                    <Card title="Subject Performance">
                        <table className="w-full text-sm">
                            <thead><tr className="text-slate-400 text-[11px] uppercase"><th className="text-left py-2">Subject</th><th className="text-right">Points</th><th className="text-center">Change</th><th className="text-center">Grade</th></tr></thead>
                            <tbody>
                                {(data.subjects || []).map((s: any) => (
                                    <tr key={s.name} className="border-t border-slate-50">
                                        <td className="py-2 font-bold text-slate-700 uppercase">{s.name}</td>
                                        <td className="text-right font-bold">{s.points}</td>
                                        <td className="text-center"><Delta v={s.change} /></td>
                                        <td className="text-center font-bold">{s.grade}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </>
            )}

            {tab === "merit" && <MeritList examId={examId} form={form} />}
            {tab === "subjects" && <SubjectSheet examId={examId} form={form} />}
            {tab === "classes" && <ClassLevels examId={examId} form={form} />}
            {tab === "improved" && <MostImproved examId={examId} />}
        </div>
    );
}

// Subject performance — pick a subject, see every student ranked (score/grade/pos).
function SubjectSheet({ examId, form }: { examId: string; form: string }) {
    const school = useSchool();
    const [subject, setSubject] = useState("");
    const [streamFilter, setStreamFilter] = useState("");
    const { data: subs } = useQuery({ queryKey: ["an_subjects", examId, form], queryFn: async () => (await api.get("/analytics/subjects", { params: { examId, form } })).data });
    const subjects: string[] = subs?.subjects || [];
    const active = subject || subjects[0] || "";
    const { data, isLoading } = useQuery({ queryKey: ["an_subject_sheet", examId, form, active], enabled: !!active, queryFn: async () => (await api.get("/analytics/subject-sheet", { params: { examId, form, subject: active } })).data });
    const allStudents = data?.students || [];
    const streamOpts = streamOptions(allStudents);
    // Filter by stream, then re-rank within the stream so positions read 1..n.
    const students = (streamFilter ? allStudents.filter((s: any) => norm(s.stream) === norm(streamFilter)) : allStudents)
        .map((s: any, i: number) => ({ ...s, position: streamFilter ? i + 1 : s.position }));
    const average = streamFilter && students.length
        ? Math.round(students.reduce((a: number, s: any) => a + (Number(s.marks) || 0), 0) / students.length)
        : (data?.average ?? 0);

    const print = () => {
        const rows = students.map((s: any) => `<tr><td>${s.position}</td><td>${s.adm}</td><td style="text-align:left">${s.name}</td><td>${s.stream || ""}</td><td>${s.marks}</td><td>${s.grade}</td><td>${s.points}</td></tr>`).join("");
        const body = `<table><thead><tr><th>#</th><th>Adm</th><th style="text-align:left">Name</th><th>Stream</th><th>Marks</th><th>Grade</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table>`;
        printDoc(school, `${active.toUpperCase()} — ${form || "All"}${streamFilter ? ` (${streamFilter})` : ""}`, `Average: ${average}% · ${students.length} students`, body);
    };

    return (
        <Card title={<span className="flex items-center justify-between w-full"><span>Subject Performance</span><button onClick={print} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5" style={{ background: GREEN }}><Printer className="w-3.5 h-3.5" /> Print</button></span>}>
            <div className="flex flex-wrap items-center gap-3 mb-3">
                <select value={active} onChange={e => setSubject(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white">
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <StreamFilter value={streamFilter} onChange={setStreamFilter} streams={streamOpts} count={students.length} />
            </div>
            {isLoading ? <Spin /> : students.length === 0 ? <Empty msg="No marks for this subject." /> : (
                <table className="w-full text-sm">
                    <thead><tr className="text-slate-400 text-[11px] uppercase"><th className="text-left py-1">#</th><th className="text-left">Adm</th><th className="text-left">Name</th><th className="text-left">Stream</th><th className="text-center">Marks</th><th className="text-center">Grade</th><th className="text-center">Pts</th></tr></thead>
                    <tbody>
                        {students.map((s: any) => (
                            <tr key={s.adm} className="border-t border-slate-50">
                                <td className="py-1.5 font-black">{s.position}</td><td>{s.adm}</td><td className="font-bold text-slate-700">{s.name}</td><td>{s.stream}</td>
                                <td className="text-center">{s.marks}</td><td className="text-center font-bold">{s.grade}</td><td className="text-center">{s.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}

// Class & stream rollup — a class level (Form 4) with its streams (4 East/West…).
// When a form is selected (drill-down), show ONLY that level.
function ClassLevels({ examId, form }: { examId: string; form?: string | null }) {
    const school = useSchool();
    const { data, isLoading } = useQuery({ queryKey: ["an_class_levels", examId], queryFn: async () => (await api.get("/analytics/class-levels", { params: { examId } })).data });
    if (isLoading) return <Spin />;
    let classes = data?.classes || [];
    if (form) {
        const f = String(form).toLowerCase().replace(/\s+/g, " ").trim();
        classes = classes.filter((c: any) => String(c.level).toLowerCase().replace(/\s+/g, " ").trim() === f);
    }
    if (!classes.length) return <Empty msg="No data." />;

    const print = () => {
        const body = classes.map((c: any) => `
            <h3 style="margin:10px 0 0">${c.level} (overall) — ${c.students} students · Mean ${c.meanPoints} pts · ${c.meanPct}% · ${c.meanGrade}</h3>
            <table><thead><tr><th style="text-align:left">Stream</th><th>Students</th><th>Mean Pts</th><th>Mean %</th><th>Grade</th></tr></thead>
            <tbody>${c.streams.map((s: any, i: number) => `<tr><td style="text-align:left">${i + 1}. ${s.stream}</td><td>${s.students}</td><td><b>${s.meanPoints}</b></td><td>${s.meanPct}%</td><td>${s.meanGrade}</td></tr>`).join("")}</tbody></table>
        `).join("");
        printDoc(school, "CLASS & STREAM ANALYSIS", form ? `${form}` : "All classes", body);
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <button onClick={print} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5" style={{ background: GREEN }}><Printer className="w-3.5 h-3.5" /> Print</button>
            </div>
            {classes.map((c: any) => (
                <Card key={c.level} title={<span className="flex items-center justify-between w-full"><span>{c.level} (overall)</span><span className="text-xs font-normal text-slate-400">{c.students} students</span></span>}>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <Stat label="Mean Points" value={c.meanPoints} />
                        <Stat label="Mean Marks" value={`${c.meanPct}%`} />
                        <Stat label="Mean Grade" value={c.meanGrade} />
                    </div>
                    <table className="w-full text-sm">
                        <thead><tr className="text-slate-400 text-[11px] uppercase"><th className="text-left py-1">Stream</th><th className="text-center">Students</th><th className="text-center">Mean Pts</th><th className="text-center">Mean %</th><th className="text-center">Grade</th></tr></thead>
                        <tbody>
                            {c.streams.map((s: any, i: number) => (
                                <tr key={s.stream} className="border-t border-slate-50">
                                    <td className="py-1.5 font-bold text-slate-700">{i + 1}. {s.stream}</td>
                                    <td className="text-center">{s.students}</td><td className="text-center font-bold">{s.meanPoints}</td><td className="text-center">{s.meanPct}%</td><td className="text-center">{s.meanGrade}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            ))}
        </div>
    );
}

function MeritList({ examId, form }: { examId: string; form: string }) {
    const school = useSchool();
    const [streamFilter, setStreamFilter] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["an_merit", examId, form], queryFn: async () => (await api.get("/analytics/merit-list", { params: { examId, form } })).data });
    // Column toggles from Report Card Settings → Analysis Page.
    const { data: settings } = useQuery({ queryKey: ["rc_settings"], queryFn: async () => (await api.get("/report-card-settings")).data, staleTime: 30_000 });
    const a = settings?.analysis || {};
    const show = (k: string) => a[k] !== false;   // default on

    if (isLoading) return <Spin />;
    const allStudents = data?.students || [];
    const streamOpts = streamOptions(allStudents);
    const students = (streamFilter ? allStudents.filter((s: any) => norm(s.stream) === norm(streamFilter)) : allStudents)
        .map((s: any, i: number) => ({ ...s, position: streamFilter ? i + 1 : s.position }));
    const subjects = Array.from(new Set(students.flatMap((s: any) => s.subjects.map((x: any) => x.name)))) as string[];

    const print = () => {
        const extra = `${show("avg") ? "<th>AVG</th>" : ""}${show("tm") ? "<th>TM</th>" : ""}${show("mg") ? "<th>MG</th>" : ""}${show("pg") ? "<th>PG</th>" : ""}`;
        const head = `<tr><th>#</th><th>Adm</th><th style="text-align:left">Name</th>${show("stream") ? "<th>Stream</th>" : ""}${show("subjects") ? subjects.map(s => `<th>${s}</th>`).join("") : ""}<th>Pts</th>${extra}</tr>`;
        const rows = students.map((st: any) => `<tr><td>${st.position}</td><td>${st.adm}</td><td style="text-align:left">${st.name}</td>${show("stream") ? `<td>${st.stream || ""}</td>` : ""}${show("subjects") ? subjects.map(s => { const sub = st.subjects.find((x: any) => x.name === s); return `<td>${sub ? `${sub.marks}<br/><small>${sub.grade}</small>` : "-"}</td>`; }).join("") : ""}<td><b>${st.totalPoints}</b></td>${show("avg") ? `<td>${st.avg ?? "-"}%</td>` : ""}${show("tm") ? `<td>${st.totalMarks ?? "-"}</td>` : ""}${show("mg") ? `<td>${st.meanGrade ?? "-"}</td>` : ""}${show("pg") ? `<td>${st.prevGrade ?? "-"}</td>` : ""}</tr>`).join("");
        const body = `<table><thead>${head}</thead><tbody>${rows}</tbody></table>`;
        printDoc(school, `MERIT LIST — ${form || "All"}${streamFilter ? ` (${streamFilter})` : ""}`, `${streamFilter || form || "All classes"} · ${students.length} students`, body, true);
    };

    return (
        <Card title={<span className="flex items-center justify-between w-full"><span className="flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: GREEN }} /> Merit List</span><button onClick={print} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5" style={{ background: GREEN }}><Printer className="w-3.5 h-3.5" /> Print</button></span>}>
            <StreamFilter value={streamFilter} onChange={setStreamFilter} streams={streamOpts} count={students.length} />
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead><tr className="text-slate-400 uppercase">
                        <th className="text-left py-1">#</th><th className="text-left">Adm</th><th className="text-left">Name</th>
                        {show("stream") && <th className="text-left">Stream</th>}
                        {show("subjects") && subjects.map(s => <th key={s} className="text-center px-1">{s.slice(0, 4)}</th>)}
                        <th className="text-center">Pts</th>
                        {show("avg") && <th className="text-center">AVG</th>}
                        {show("tm") && <th className="text-center">TM</th>}
                        {show("mg") && <th className="text-center">MG</th>}
                        {show("pg") && <th className="text-center">PG</th>}
                    </tr></thead>
                    <tbody>
                        {students.map((st: any) => (
                            <tr key={st.adm} className="border-t border-slate-50">
                                <td className="py-1.5 font-black">{st.position}</td><td>{st.adm}</td><td className="font-bold text-slate-700">{st.name}</td>
                                {show("stream") && <td>{st.stream}</td>}
                                {show("subjects") && subjects.map(s => { const sub = st.subjects.find((x: any) => x.name === s); return <td key={s} className="text-center">{sub ? <div>{sub.marks}<div className="text-[9px] text-slate-400">{sub.grade}</div></div> : "-"}</td>; })}
                                <td className="text-center font-black">{st.totalPoints}</td>
                                {show("avg") && <td className="text-center">{st.avg != null ? `${st.avg}%` : "-"}</td>}
                                {show("tm") && <td className="text-center">{st.totalMarks ?? "-"}</td>}
                                {show("mg") && <td className="text-center font-bold">{st.meanGrade ?? "-"}</td>}
                                {show("pg") && <td className="text-center text-slate-500">{st.prevGrade ?? "-"}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function MostImproved({ examId }: { examId: string }) {
    const school = useSchool();
    const [streamFilter, setStreamFilter] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["an_improved", examId], queryFn: async () => (await api.get("/analytics/most-improved", { params: { examId } })).data });
    if (isLoading) return <Spin />;
    const allStudents = data?.students || [];
    const streamOpts = streamOptions(allStudents);
    const students = streamFilter ? allStudents.filter((s: any) => norm(s.stream) === norm(streamFilter)) : allStudents;

    const print = () => {
        const rows = students.map((s: any, i: number) => `<tr><td>${i + 1}</td><td>${s.adm}</td><td style="text-align:left">${s.name}</td><td>${s.stream || ""}</td><td>${s.from} → ${s.to}</td><td><b>${s.change > 0 ? "+" : ""}${s.change}</b></td></tr>`).join("");
        const body = `<table><thead><tr><th>#</th><th>Adm</th><th style="text-align:left">Name</th><th>Stream</th><th>From → To</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table>`;
        printDoc(school, `MOST IMPROVED STUDENTS${streamFilter ? ` (${streamFilter})` : ""}`, data?.comparedTo ? `Compared to ${data.comparedTo}` : "", body);
    };

    return (
        <Card title={<span className="flex items-center justify-between w-full"><span className="flex items-center gap-2"><Award className="w-4 h-4" style={{ color: GREEN }} /> Most Improved {data?.comparedTo ? <span className="text-[11px] text-slate-400 font-normal">vs {data.comparedTo}</span> : null}</span>{students.length > 0 && <button onClick={print} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5" style={{ background: GREEN }}><Printer className="w-3.5 h-3.5" /> Print</button>}</span>}>
            <StreamFilter value={streamFilter} onChange={setStreamFilter} streams={streamOpts} count={students.length} />
            {allStudents.length === 0 ? <Empty msg="No previous exam to compare, or no improvement yet." /> : (
                <table className="w-full text-sm">
                    <thead><tr className="text-slate-400 text-[11px] uppercase"><th className="text-left py-2">Adm</th><th className="text-left">Name</th><th className="text-left">Stream</th><th className="text-right">From → To</th><th className="text-center">Change</th></tr></thead>
                    <tbody>
                        {students.map((s: any) => (
                            <tr key={s.adm} className="border-t border-slate-50">
                                <td className="py-2">{s.adm}</td><td className="font-bold text-slate-700">{s.name}</td><td>{s.stream}</td>
                                <td className="text-right text-slate-500">{s.from} → {s.to}</td>
                                <td className="text-center"><Delta v={s.change} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}

// ── Bits ──
const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
// Distinct, sorted stream labels present in a list of student rows.
const streamOptions = (rows: any[]): string[] =>
    Array.from(new Set((rows || []).map((s: any) => String(s.stream || "").trim()).filter(Boolean))).sort();
// Reusable "filter by stream" dropdown used by Merit / Subjects / Most Improved.
const StreamFilter = ({ value, onChange, streams, count }: { value: string; onChange: (v: string) => void; streams: string[]; count?: number }) => {
    if (streams.length <= 1) return null;   // nothing to filter when a single (or no) stream
    return (
        <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Stream</span>
            <select value={value} onChange={e => onChange(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white font-bold text-slate-700">
                <option value="">All Streams</option>
                {streams.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {count != null && <span className="text-[11px] text-slate-400">{count} student{count !== 1 ? "s" : ""}</span>}
        </div>
    );
};
const Spin = () => <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
const Empty = ({ msg }: { msg: string }) => <div className="py-16 text-center text-slate-400 font-bold">{msg}</div>;
const Card = ({ title, children }: any) => <div className="bg-white rounded-2xl border border-slate-100 p-4"><h3 className="font-black text-slate-700 text-sm mb-3">{title}</h3>{children}</div>;
const Stat = ({ label, value, big }: any) => (
    <div className="text-center">
        <div className={`font-black text-slate-800 ${big ? "text-2xl" : "text-lg"}`} style={{ color: GREEN }}>{value}</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase">{label}</div>
    </div>
);
const Delta = ({ v }: { v: number }) => {
    if (!v) return <span className="text-slate-300">—</span>;
    const up = v > 0;
    return <span className={`inline-flex items-center gap-0.5 font-bold ${up ? "text-emerald-600" : "text-rose-500"}`}><TrendingUp className={`w-3 h-3 ${up ? "" : "rotate-180"}`} />{up ? "+" : ""}{v}</span>;
};
