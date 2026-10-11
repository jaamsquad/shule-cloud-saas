/**
 * Student profile → Analysis: the student's published exam results.
 * Pick an exam; compare with the previous exam or with the student's targets; subject table,
 * subject chart (student vs class mean vs previous/target), highlights and performance over time.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ComposedChart, LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ArrowDownRight, ArrowUpRight, BarChart3, ChevronDown, Download, FileText, Info, Loader2, Minus, Pencil, Printer, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import api from "@/lib/api";
import { printElementToPdf } from "@/lib/pdfDoc";

const INK = "#1f2937";
const STUDENT = "#2a78d6";     // the student
const COMPARE = "#eb6834";     // previous exam / target
const CLASS_FILL = "#e5e7eb", CLASS_LINE = "#9ca3af";   // class mean (neutral)
const border = { border: "0.5px solid #e5e7eb" };

type Subject = { key: string; name: string; short: string; pct: number; grade: string; points: number; rank: number | null; rankOf: number; streamRank: number | null; streamOf: number; classMean: number; dev: number | null; prevPct: number | null; target: number | null; devTarget: number | null };
type Exam = { _id: string; title: string; name: string; term: string; academicYear: string };
type Analysis = {
    exams: Exam[];
    current: null | {
        exam: Exam; previousExam: Exam | null; level: string; stream: string; grade: string; prevGrade: string | null;
        meanMarks: number; meanMarksDev: number | null; meanPoints: number; meanPointsDev: number | null;
        totalPoints: number; totalPointsMax: number; totalPointsDev: number | null; totalMarks: number; totalMax: number;
        overallPos: number | null; overallOf: number; overallPosDev: number | null; streamPos: number | null; streamOf: number; streamPosDev: number | null;
        classMean: number; targetMean: number | null; subjects: Subject[];
    };
    overTime: { examId: string; label: string; term: string; year: string; meanMarks: number; classMean: number; grade: string; overallPos: number | null; overallOf: number }[];
    targets: { meanMarks: number | null; subjects: Record<string, number> };
    highlights: { tone: "up" | "down" | "info"; text: string }[];
};

/** A change with an arrow. For positions, + means moved up. */
function Delta({ v, suffix = "", none = "—" }: { v: number | null | undefined; suffix?: string; none?: string }) {
    if (v === null || v === undefined) return <span className="text-xs text-slate-400">{none}</span>;
    const I = v > 0 ? ArrowUpRight : v < 0 ? ArrowDownRight : Minus;
    const tone = v > 0 ? "text-emerald-700" : v < 0 ? "text-rose-700" : "text-slate-500";
    return <span className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums ${tone}`}><I className="w-3.5 h-3.5" />{v > 0 ? "+" : ""}{Number.isInteger(v) ? v : v.toFixed(2)}{suffix}</span>;
}

export default function StudentAnalysis({ studentId, studentName, canEdit }: { studentId: string; studentName: string; canEdit: boolean }) {
    const qc = useQueryClient();
    const nav = useNavigate();
    const [examId, setExamId] = useState("");
    const [mode, setMode] = useState<"previous" | "targets">("previous");
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [draftMean, setDraftMean] = useState("");
    const [saving, setSaving] = useState(false);
    const [menu, setMenu] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, isFetching } = useQuery<Analysis>({
        queryKey: ["student_analysis", studentId, examId],
        queryFn: async () => (await api.get(`/students/${studentId}/analysis`, { params: examId ? { examId } : {} })).data,
        placeholderData: prev => prev,
    });
    const c = data?.current;
    useEffect(() => { if (c && !examId) setExamId(c.exam._id); }, [c, examId]);
    useEffect(() => { if (mode !== "targets") setEditing(false); }, [mode]);

    const startEdit = () => {
        if (!c) return;
        setDraft(Object.fromEntries(c.subjects.map(s => [s.key, s.target !== null ? String(s.target) : ""])));
        setDraftMean(c.targetMean !== null ? String(c.targetMean) : "");
        setEditing(true);
    };
    const saveTargets = async () => {
        setSaving(true);
        try {
            await api.put(`/students/${studentId}/targets`, { subjects: draft, meanMarks: draftMean });
            toast.success("Targets saved"); setEditing(false);
            qc.invalidateQueries({ queryKey: ["student_analysis", studentId] });
        } catch (e: unknown) { toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not save targets"); }
        finally { setSaving(false); }
    };

    // exams grouped by year → term for the picker
    const groups = useMemo(() => {
        const g = new Map<string, Exam[]>();
        (data?.exams || []).forEach(e => { const k = [e.academicYear, e.term].filter(Boolean).join(" · ") || "Exams"; g.set(k, [...(g.get(k) || []), e]); });
        return [...g.entries()];
    }, [data?.exams]);

    const chart = (c?.subjects || []).map(s => ({ name: s.short, full: s.name, student: s.pct, classMean: s.classMean, compare: mode === "targets" ? s.target : s.prevPct }));
    const compareLabel = mode === "targets" ? "Target" : c?.previousExam ? c.previousExam.name : "Previous exam";
    const hasCompare = chart.some(r => r.compare !== null && r.compare !== undefined);

    if (isLoading) return <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    if (!data?.exams.length || !c) {
        return (
            <div className="bg-white rounded-2xl p-10 text-center" style={border}>
                <BarChart3 className="w-8 h-8 mx-auto text-slate-400" />
                <h3 className="mt-3 font-black" style={{ color: INK }}>No published results yet</h3>
                <p className="text-sm text-slate-500 mt-1">Results show here once an exam {studentName.split(" ")[0]} sat has been published (Exams → Manage Exams).</p>
            </div>
        );
    }

    const statCards = [
        { label: "Mean marks", value: `${c.meanMarks}%`, dev: mode === "targets" ? (c.targetMean !== null ? Math.round((c.meanMarks - c.targetMean) * 100) / 100 : null) : c.meanMarksDev, sub: mode === "targets" ? (c.targetMean !== null ? `target ${c.targetMean}%` : "no target set") : `class ${c.classMean}%` },
        { label: "Total points", value: `${c.totalPoints} / ${c.totalPointsMax}`, dev: mode === "targets" ? null : c.totalPointsDev, sub: `mean ${c.meanPoints}` },
        { label: "Overall position", value: c.overallPos ? `${c.overallPos} / ${c.overallOf}` : "—", dev: mode === "targets" ? null : c.overallPosDev, sub: c.level },
        { label: "Stream position", value: c.streamPos ? `${c.streamPos} / ${c.streamOf}` : "—", dev: mode === "targets" ? null : c.streamPosDev, sub: `${c.level} ${c.stream}`.trim() },
    ];

    return (
        <div ref={printRef} className="space-y-4">
            {/* toolbar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-end gap-3" style={border}>
                <div className="min-w-0 mr-auto">
                    <h3 className="text-lg font-black" style={{ color: INK }}>Analysis</h3>
                    <p className="text-xs text-slate-500">{studentName}'s exam performance · published results only</p>
                </div>
                <label className="text-xs font-semibold text-slate-500 w-full sm:w-auto">
                    <span className="block mb-1">Exam</span>
                    <select value={examId || c.exam._id} onChange={e => setExamId(e.target.value)} className="h-10 w-full sm:w-64 rounded-xl px-3 text-sm font-semibold bg-white" style={{ ...border, color: INK }}>
                        {groups.map(([g, list]) => <optgroup key={g} label={g}>{list.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}</optgroup>)}
                    </select>
                </label>
                <div className="relative" data-noprint>
                    <button onClick={() => setMenu(m => !m)} className="h-10 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ background: INK }}>
                        <Download className="w-4 h-4" /> Download <ChevronDown className="w-4 h-4" />
                    </button>
                    {menu && (
                        <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl z-20 overflow-hidden" style={border} onMouseLeave={() => setMenu(false)}>
                            <button onClick={() => { setMenu(false); printElementToPdf(printRef.current, `Analysis — ${studentName}`, { fileName: `Analysis-${studentName}` }); }} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Printer className="w-4 h-4 text-slate-500" /> This analysis (PDF)</button>
                            <button onClick={() => nav(`/exams/printouts?doc=transcripts&level=${encodeURIComponent(c.level)}`)} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"><FileText className="w-4 h-4 text-slate-500" /> Transcripts</button>
                            <button onClick={() => nav(`/exams/printouts?doc=analysis&exam=${c.exam._id}&level=${encodeURIComponent(c.level)}`)} className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"><BarChart3 className="w-4 h-4 text-slate-500" /> Class analysis report</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
                {/* left: grade, compare, stats, highlights */}
                <div className="space-y-4">
                    <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: INK }}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-xs font-semibold text-white/60">Mean grade</div>
                                <div className="text-5xl font-black leading-none mt-1.5">{c.grade}</div>
                                {c.prevGrade && <div className="text-xs text-white/60 mt-2">was {c.prevGrade} in {c.previousExam?.name}</div>}
                            </div>
                            <div className="text-right text-xs text-white/70 leading-relaxed">
                                <div className="font-bold text-white">{c.exam.name}</div>
                                <div>{[c.exam.term, c.exam.academicYear].filter(Boolean).join(" · ")}</div>
                                <div>{c.level}{c.stream ? ` ${c.stream}` : ""}</div>
                                {isFetching && <Loader2 className="w-4 h-4 animate-spin ml-auto mt-1" />}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-slate-500 mb-2">Compare with</div>
                        <div className="grid grid-cols-2 gap-2" data-noprint>
                            {([["previous", "Previous exam"], ["targets", "Student targets"]] as const).map(([k, l]) => (
                                <button key={k} onClick={() => setMode(k)} className={`h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === k ? "bg-white" : "bg-slate-50 text-slate-500"}`}
                                    style={mode === k ? { border: `1.5px solid ${INK}`, color: INK } : border}>
                                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${mode === k ? "border-[5px]" : ""}`} style={{ borderColor: mode === k ? INK : "#cbd5e1" }} /> {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {statCards.map(s => (
                            <div key={s.label} className="bg-white rounded-xl p-3.5" style={border}>
                                <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
                                <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                                    <span className="text-xl font-black tabular-nums" style={{ color: INK }}>{s.value}</span>
                                    <Delta v={s.dev} suffix={s.label === "Mean marks" ? "%" : ""} none={mode === "targets" && s.label !== "Mean marks" ? "" : "—"} />
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 truncate">{s.sub}</div>
                            </div>
                        ))}
                    </div>

                    {!!data.highlights.length && (
                        <div className="bg-white rounded-2xl p-4" style={border}>
                            <div className="text-xs font-bold text-slate-500 mb-2">Highlights</div>
                            <ul className="space-y-2">
                                {data.highlights.map((h, i) => {
                                    const I = h.tone === "up" ? TrendingUp : h.tone === "down" ? TrendingDown : Info;
                                    return <li key={i} className="flex gap-2.5 text-sm text-slate-700"><I className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" /><span>{h.text}</span></li>;
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {/* right: subject chart */}
                <div className="bg-white rounded-2xl p-4 sm:p-5" style={border}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h4 className="text-sm font-black" style={{ color: INK }}>Subjects · {c.exam.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0.5 rounded" style={{ background: STUDENT }} />{studentName.split(" ")[0]}</span>
                            {hasCompare && <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: COMPARE }} />{compareLabel}</span>}
                            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: CLASS_FILL, border: `1px solid ${CLASS_LINE}` }} />Class mean</span>
                        </div>
                    </div>
                    <div className="h-[300px] sm:h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} interval={0} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} labelFormatter={(_, p) => p?.[0]?.payload?.full || ""}
                                    formatter={(v: number, k: string) => [`${v}%`, k === "student" ? studentName.split(" ")[0] : k === "classMean" ? "Class mean" : compareLabel]} />
                                <Area type="monotone" dataKey="classMean" fill={CLASS_FILL} stroke={CLASS_LINE} strokeWidth={1.5} fillOpacity={0.9} dot={{ r: 3, fill: CLASS_LINE, strokeWidth: 0 }} />
                                {hasCompare && <Line type="monotone" dataKey="compare" stroke={COMPARE} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, fill: COMPARE, stroke: "#fff", strokeWidth: 2 }} connectNulls />}
                                <Line type="monotone" dataKey="student" stroke={STUDENT} strokeWidth={2.5} dot={{ r: 5, fill: STUDENT, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    {mode === "targets" && !hasCompare && <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> No targets set yet{canEdit ? " — use Set targets below." : "."}</p>}
                </div>
            </div>

            {/* subject table */}
            <div className="bg-white rounded-2xl overflow-hidden" style={border}>
                <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
                    <h4 className="text-sm font-black" style={{ color: INK }}>Subject performance</h4>
                    {mode === "targets" && canEdit && (editing ? (
                        <div className="flex items-center gap-2" data-noprint>
                            <label className="text-xs text-slate-500 flex items-center gap-1.5">Mean target <input value={draftMean} onChange={e => setDraftMean(e.target.value.replace(/[^\d]/g, "").slice(0, 3))} inputMode="numeric" className="w-14 h-8 rounded-lg px-2 text-sm text-center" style={border} />%</label>
                            <button onClick={() => setEditing(false)} className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
                            <button onClick={saveTargets} disabled={saving} className="h-8 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: INK }}>{saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save targets</button>
                        </div>
                    ) : <button onClick={startEdit} data-noprint className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ ...border, color: INK }}><Pencil className="w-3.5 h-3.5" /> Set targets</button>)}
                </div>
                {/* desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] font-semibold text-slate-500 bg-slate-50/60">
                                <th className="px-5 py-2.5">Subject</th><th className="px-3 py-2.5">Marks</th><th className="px-3 py-2.5">Grade</th>
                                <th className="px-3 py-2.5" title="Change since the previous exam">Dev exam</th><th className="px-3 py-2.5">Target</th><th className="px-3 py-2.5" title="Marks minus target">Dev target</th>
                                <th className="px-3 py-2.5">Class mean</th><th className="px-3 py-2.5">Class rank</th><th className="px-5 py-2.5">Stream rank</th>
                            </tr>
                        </thead>
                        <tbody>
                            {c.subjects.map(s => (
                                <tr key={s.key} className="border-t border-slate-100">
                                    <td className="px-5 py-3 font-bold" style={{ color: INK }}>{s.name}</td>
                                    <td className="px-3 py-3 tabular-nums font-semibold" style={{ color: INK }}>{s.pct}%</td>
                                    <td className="px-3 py-3 font-bold" style={{ color: INK }}>{s.grade}</td>
                                    <td className="px-3 py-3"><Delta v={s.dev} /></td>
                                    <td className="px-3 py-3 tabular-nums text-slate-600">
                                        {editing ? <input value={draft[s.key] ?? ""} onChange={e => setDraft(d => ({ ...d, [s.key]: e.target.value.replace(/[^\d]/g, "").slice(0, 3) }))} inputMode="numeric" placeholder="—" className="w-16 h-8 rounded-lg px-2 text-sm text-center" style={border} /> : s.target !== null ? `${s.target}%` : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-3 py-3"><Delta v={s.devTarget} /></td>
                                    <td className="px-3 py-3 tabular-nums text-slate-600">{s.classMean}%</td>
                                    <td className="px-3 py-3 tabular-nums text-slate-700">{s.rank ? `${s.rank} / ${s.rankOf}` : "—"}</td>
                                    <td className="px-5 py-3 tabular-nums text-slate-700">{s.streamRank ? `${s.streamRank} / ${s.streamOf}` : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* phone cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {c.subjects.map(s => (
                        <div key={s.key} className="px-4 py-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-sm" style={{ color: INK }}>{s.name}</span>
                                <span className="text-sm font-black tabular-nums" style={{ color: INK }}>{s.pct}% <span className="ml-1 px-1.5 rounded-md bg-slate-100">{s.grade}</span></span>
                            </div>
                            <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                                <div>Dev exam<div><Delta v={s.dev} /></div></div>
                                <div>Class rank<div className="font-bold text-slate-700 text-xs">{s.rank ? `${s.rank}/${s.rankOf}` : "—"}</div></div>
                                <div>Class mean<div className="font-bold text-slate-700 text-xs">{s.classMean}%</div></div>
                            </div>
                            {(mode === "targets" || s.target !== null) && (
                                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                                    <span>Target {editing ? <input value={draft[s.key] ?? ""} onChange={e => setDraft(d => ({ ...d, [s.key]: e.target.value.replace(/[^\d]/g, "").slice(0, 3) }))} inputMode="numeric" className="w-14 h-7 rounded-md px-1.5 text-xs text-center ml-1" style={border} /> : <b className="text-slate-700">{s.target !== null ? `${s.target}%` : "—"}</b>}</span>
                                    <Delta v={s.devTarget} none="" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* performance over time */}
            <div className="bg-white rounded-2xl p-4 sm:p-5" style={border}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h4 className="text-sm font-black" style={{ color: INK }}>Performance over time</h4>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0.5 rounded" style={{ background: STUDENT }} />Mean marks</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0.5 rounded" style={{ background: CLASS_LINE }} />Class mean</span>
                        {c.targetMean !== null && <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: COMPARE }} />Target</span>}
                    </div>
                </div>
                {data.overTime.length < 2 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">The trend shows once there are results from two or more published exams.</p>
                ) : (
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.overTime} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                                    labelFormatter={(_, p) => { const r = p?.[0]?.payload; return r ? `${r.label} · ${[r.term, r.year].filter(Boolean).join(" ")}` : ""; }}
                                    formatter={(v: number, k: string, p: { payload?: { grade?: string; overallPos?: number; overallOf?: number } }) => [k === "meanMarks" ? `${v}% · ${p.payload?.grade} · pos ${p.payload?.overallPos ?? "—"}/${p.payload?.overallOf}` : `${v}%`, k === "meanMarks" ? "Mean marks" : "Class mean"]} />
                                {c.targetMean !== null && <ReferenceLine y={c.targetMean} stroke={COMPARE} strokeDasharray="5 4" strokeWidth={1.5} />}
                                <Line type="monotone" dataKey="classMean" stroke={CLASS_LINE} strokeWidth={2} dot={{ r: 3, fill: CLASS_LINE, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="meanMarks" stroke={STUDENT} strokeWidth={2.5} dot={{ r: 5, fill: STUDENT, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
                {data.overTime.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-xs min-w-[420px]">
                            <thead><tr className="text-left text-slate-500"><th className="py-1.5 pr-3 font-semibold">Exam</th><th className="py-1.5 pr-3 font-semibold">Mean</th><th className="py-1.5 pr-3 font-semibold">Grade</th><th className="py-1.5 pr-3 font-semibold">Class mean</th><th className="py-1.5 font-semibold">Position</th></tr></thead>
                            <tbody>
                                {[...data.overTime].reverse().map(r => (
                                    <tr key={r.examId} className={`border-t border-slate-100 ${r.examId === c.exam._id ? "font-bold" : ""}`} style={{ color: INK }}>
                                        <td className="py-1.5 pr-3">{r.label} <span className="text-slate-400 font-normal">{[r.term, r.year].filter(Boolean).join(" ")}</span></td>
                                        <td className="py-1.5 pr-3 tabular-nums">{r.meanMarks}%</td><td className="py-1.5 pr-3">{r.grade}</td>
                                        <td className="py-1.5 pr-3 tabular-nums text-slate-500">{r.classMean}%</td><td className="py-1.5 tabular-nums">{r.overallPos ? `${r.overallPos} / ${r.overallOf}` : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
