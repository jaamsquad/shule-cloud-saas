/**
 * 8-4-4 dashboard (dashboard switcher → "8-4-4"): the school at a glance from its classes and
 * PUBLISHED exam results — latest exam per class, subject performance, demographics, class
 * sizes and this week's attendance. Data: /dashboard/exam-overview, /dashboard/exam-subjects.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LabelList } from "recharts";
import { Users, GraduationCap, Briefcase, Layers, ArrowUpRight, ArrowDownRight, Minus, BarChart3, Printer, Loader2 } from "lucide-react";
import api from "@/lib/api";

const INK = "#1e1b4b";
const ACC = "#b45309";                    // 8-4-4 view accent (amber)
const S1 = "#2a78d6", S2 = "#eb6834";      // validated categorical slots 1–2
const GRID = "#e5e7eb", MUTED = "#6b7280";
const border = { border: "0.5px solid #e5e7eb" };
const card = "bg-white rounded-2xl p-4 sm:p-5";

type Level = { level: string; exam: { _id: string; title: string } | null; entries?: number; meanPoints?: number; meanMarks?: number; grade?: string; change?: number | null; exams?: { _id: string; title: string }[] };
type Overview = {
    counts: { students: number; boys: number; girls: number; teachers: number; staff: number; classes: number; streams: number };
    classAnalysis: { avgClassSize: number; streams: number; studentTeacherRatio: number | null };
    classes: { _id: string; name: string; streams: number; students: number; boys: number; girls: number }[];
    levels: Level[]; attendance: { date: string; present: number; absent: number }[];
};

const tip = { contentStyle: { borderRadius: 10, border: "0.5px solid #e5e7eb", fontSize: 12 }, cursor: { fill: "rgba(30,27,75,.05)" } };

function Change({ v }: { v: number | null | undefined }) {
    if (v === null || v === undefined) return <span className="text-[11px] text-slate-400">first exam</span>;
    const up = v > 0, flat = v === 0;
    const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
    return <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${flat ? "text-slate-500" : up ? "text-emerald-700" : "text-rose-700"}`}><Icon className="w-3.5 h-3.5" />{up ? "+" : ""}{v} pts</span>;
}

export default function Exam844Dashboard() {
    const nav = useNavigate();
    const { data, isLoading } = useQuery<Overview>({ queryKey: ["dash_844"], queryFn: async () => (await api.get("/dashboard/exam-overview")).data });
    const withExam = (data?.levels || []).filter(l => l.exam);
    const [level, setLevel] = useState("");
    const [examId, setExamId] = useState("");
    const [mode, setMode] = useState<"top" | "low">("top");
    useEffect(() => { if (!level && withExam.length) setLevel(withExam[0].level); }, [withExam.length]); // eslint-disable-line react-hooks/exhaustive-deps
    const lvl = withExam.find(l => l.level === level);
    const { data: subj, isFetching: subjLoading } = useQuery({
        queryKey: ["dash_844_subj", level, examId], enabled: !!level,
        queryFn: async () => (await api.get("/dashboard/exam-subjects", { params: { level, examId: examId || undefined } })).data,
    });
    const subjects = useMemo(() => {
        const list = [...(subj?.subjects || [])] as { name: string; short: string; meanPoints: number; grade: string }[];
        const sorted = list.sort((a, b) => b.meanPoints - a.meanPoints);
        return (mode === "top" ? sorted.slice(0, 6) : sorted.slice(-6).reverse()).map(s => ({ ...s, label: s.short || s.name }));
    }, [subj, mode]);

    if (isLoading || !data) return <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    const c = data.counts;
    const girlsPct = c.boys + c.girls ? Math.round((c.girls / (c.boys + c.girls)) * 100) : 0;
    const tiles = [
        { label: "Students", value: c.students, icon: Users, to: "/students" },
        { label: "Teachers", value: c.teachers, icon: GraduationCap, to: "/staff" },
        { label: "Non-teaching staff", value: c.staff, icon: Briefcase, to: "/staff" },
        { label: "Streams", value: c.streams || c.classes, icon: Layers, to: "/academic-system/classes" },
    ];
    const attendance = data.attendance.map(a => ({ ...a, day: new Date(`${a.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }) }));

    return (
        <div className="space-y-4">
            {/* headline numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {tiles.map(t => (
                    <button key={t.label} onClick={() => nav(t.to)} className={`${card} text-left hover:shadow-sm transition-shadow`} style={border}>
                        <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{t.label}</span><t.icon className="w-4 h-4" style={{ color: ACC }} /></div>
                        <div className="text-3xl font-black mt-1 tabular-nums" style={{ color: INK }}>{t.value.toLocaleString()}</div>
                    </button>
                ))}
            </div>

            {/* latest published exam per class */}
            <div className={card} style={border}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black" style={{ color: INK }}>Class performance · latest published exam</h3>
                    <button onClick={() => nav("/exams/manage")} className="text-xs font-bold" style={{ color: ACC }}>Manage exams →</button>
                </div>
                {!withExam.length ? <p className="text-sm text-slate-500">No published results yet. Publish an exam's results under Exams → Manage Exams and they'll show here.</p> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {withExam.map(l => (
                            <div key={l.level} className="rounded-xl p-4" style={{ ...border, background: "#fffbeb" }}>
                                <div className="flex items-start justify-between gap-2">
                                    <div><div className="font-black" style={{ color: INK }}>{l.level}</div><div className="text-[11px] text-slate-500">{l.exam?.title}</div></div>
                                    <span className="text-xl font-black px-2 rounded-lg bg-white" style={{ color: INK, ...border }}>{l.grade}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                    <div><div className="text-[10px] uppercase font-bold text-slate-500">Mean points</div><div className="text-lg font-black tabular-nums" style={{ color: INK }}>{l.meanPoints}</div><Change v={l.change} /></div>
                                    <div><div className="text-[10px] uppercase font-bold text-slate-500">Mean marks</div><div className="text-lg font-black tabular-nums" style={{ color: INK }}>{l.meanMarks}%</div></div>
                                    <div><div className="text-[10px] uppercase font-bold text-slate-500">Students</div><div className="text-lg font-black tabular-nums" style={{ color: INK }}>{l.entries}</div></div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => nav(`/exams/analytics?exam=${l.exam?._id}&class=${encodeURIComponent(l.level)}`)} className="flex-1 h-8 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1" style={{ background: INK }}><BarChart3 className="w-3.5 h-3.5" /> View analysis</button>
                                    <button onClick={() => nav(`/exams/printouts?view=merit&exam=${l.exam?._id}&class=${encodeURIComponent(l.level)}`)} className="h-8 px-3 rounded-lg text-xs font-bold bg-white flex items-center gap-1" style={{ ...border, color: INK }}><Printer className="w-3.5 h-3.5" /> Merit list</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* subject performance */}
                <div className={`${card} lg:col-span-2`} style={border}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-sm font-black" style={{ color: INK }}>Subject performance <span className="text-slate-400 font-bold">(mean points)</span></h3>
                        <div className="flex flex-wrap gap-2">
                            <select value={level} onChange={e => { setLevel(e.target.value); setExamId(""); }} className="h-8 px-2 rounded-lg text-xs bg-white" style={border}>{withExam.map(l => <option key={l.level}>{l.level}</option>)}</select>
                            <select value={examId || lvl?.exam?._id || ""} onChange={e => setExamId(e.target.value)} className="h-8 px-2 rounded-lg text-xs bg-white max-w-[200px]" style={border}>{(lvl?.exams || []).map(e => <option key={e._id} value={e._id}>{e.title}</option>)}</select>
                            <div className="flex rounded-lg p-0.5 bg-slate-100">{(["top", "low"] as const).map(m => <button key={m} onClick={() => setMode(m)} className={`px-2.5 h-7 rounded-md text-[11px] font-bold ${mode === m ? "bg-white shadow-sm" : "text-slate-500"}`} style={mode === m ? { color: INK } : {}}>{m === "top" ? "Top" : "Lowest"}</button>)}</div>
                        </div>
                    </div>
                    {subjLoading ? <div className="h-[260px] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div> : !subjects.length ? <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">No published results.</div> : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={subjects} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }} barCategoryGap={6}>
                                <CartesianGrid horizontal={false} stroke={GRID} />
                                <XAxis type="number" domain={[0, 12]} ticks={[0, 3, 6, 9, 12]} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: INK }} axisLine={false} tickLine={false} />
                                <Tooltip {...tip} formatter={(v: number, _n, p: { payload?: { grade?: string } }) => [`${v} (${p?.payload?.grade || ""})`, "Mean points"]} />
                                <Bar dataKey="meanPoints" fill={S1} radius={[0, 4, 4, 0]} maxBarSize={22}>
                                    <LabelList dataKey="grade" position="right" style={{ fontSize: 11, fontWeight: 700, fill: INK }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* demographics + class analysis */}
                <div className="space-y-4">
                    <div className={card} style={border}>
                        <h3 className="text-sm font-black mb-3" style={{ color: INK }}>Student demographics</h3>
                        <div className="flex items-end justify-between mb-2">
                            <div><div className="text-2xl font-black tabular-nums" style={{ color: INK }}>{c.boys}</div><div className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: S1 }} />Boys</div></div>
                            <div className="text-right"><div className="text-2xl font-black tabular-nums" style={{ color: INK }}>{c.girls}</div><div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 justify-end"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: S2 }} />Girls</div></div>
                        </div>
                        <div className="flex h-3 rounded-full overflow-hidden gap-[2px] bg-white" title={`${100 - girlsPct}% boys · ${girlsPct}% girls`}>
                            <div style={{ width: `${100 - girlsPct}%`, background: S1 }} /><div style={{ width: `${girlsPct}%`, background: S2 }} />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5">{100 - girlsPct}% boys · {girlsPct}% girls</div>
                    </div>
                    <div className={card} style={border}>
                        <h3 className="text-sm font-black mb-3" style={{ color: INK }}>Class analysis</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl p-3" style={border}><div className="text-[11px] font-bold text-slate-500">Average class size</div><div className="text-xl font-black tabular-nums" style={{ color: INK }}>{data.classAnalysis.avgClassSize}</div><div className="text-[10px] text-slate-400">{data.classAnalysis.streams} streams</div></div>
                            <div className="rounded-xl p-3" style={border}><div className="text-[11px] font-bold text-slate-500">Students per teacher</div><div className="text-xl font-black tabular-nums" style={{ color: INK }}>{data.classAnalysis.studentTeacherRatio ?? "—"}</div><div className="text-[10px] text-slate-400">{c.teachers} teachers</div></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={card} style={border}>
                    <h3 className="text-sm font-black mb-2" style={{ color: INK }}>Students per class</h3>
                    {!data.classes.length ? <p className="text-sm text-slate-500">No classes yet.</p> : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={data.classes} margin={{ left: -12, right: 8, top: 8 }} barGap={2}>
                                <CartesianGrid vertical={false} stroke={GRID} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: INK }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                                <Tooltip {...tip} />
                                <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="boys" name="Boys" fill={S1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="girls" name="Girls" fill={S2} radius={[4, 4, 0, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <div className={card} style={border}>
                    <h3 className="text-sm font-black mb-2" style={{ color: INK }}>Attendance this week <span className="text-slate-400 font-bold">(class register)</span></h3>
                    {!attendance.length ? <div className="h-[240px] flex items-center justify-center text-sm text-slate-500">No attendance marked this week.</div> : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={attendance} margin={{ left: -12, right: 8, top: 8 }} barGap={2}>
                                <CartesianGrid vertical={false} stroke={GRID} />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: INK }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                                <Tooltip {...tip} />
                                <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="present" name="In school" fill={S1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="absent" name="Out of school" fill={S2} radius={[4, 4, 0, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
