/**
 * Exams → Printouts. A hub of printable documents; the exam ones (merit list, analysis report,
 * transcripts) are built here from PUBLISHED results (backend /exam-printouts/*) and shown in a
 * preview that prints / saves as PDF exactly as displayed.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ListOrdered, LineChart, ScrollText, FileText, Sheet, Users, CalendarCheck, Award, ArrowLeft, Printer, Download, Loader2, Upload, Wand2, BookOpenCheck,
} from "lucide-react";
import api from "@/lib/api";
import { useSchoolBrand } from "@/lib/printDoc";
import { outputHtmlDoc, downloadHtmlAsPdf } from "@/lib/pdfDoc";
import { reportQr } from "@/lib/reportQr";
import { prepareTransparentImage } from "@/lib/imageClean";
import { meritHtml, analysisHtml, transcriptsHtml, filteredStudents, type MeritOpts, type TranscriptOpts } from "./docs";

const INK = "#1f2937";
const ACC = "#0f766e";
const border = { border: "0.5px solid #e5e7eb" };
const sel = "h-10 px-3 rounded-xl text-sm bg-white w-full outline-none";
type View = "merit" | "analysis" | "transcripts";

const CARDS: { key: string; title: string; desc: string; icon: typeof ListOrdered; view?: View; to?: string; tint: string }[] = [
    { key: "merit", title: "Merit List", desc: "Student ranking, grade breakdown and class grade summary", icon: ListOrdered, view: "merit", tint: "#f1f5f9" },
    { key: "analysis", title: "Analysis Report", desc: "Full exam analysis: subjects, streams, gender, top students", icon: LineChart, view: "analysis", tint: "#f1f5f9" },
    { key: "transcripts", title: "Transcripts", desc: "Each learner's results across past exams, with QR, signature and stamp", icon: ScrollText, view: "transcripts", tint: "#f1f5f9" },
    { key: "reports", title: "Report Forms", desc: "Student or whole-class report cards", icon: FileText, to: "/exams/scholar-sheet", tint: "#f1f5f9" },
    { key: "score", title: "Score Sheet", desc: "Blank marks sheet for teachers to fill", icon: Sheet, to: "/exams/blank-award-list", tint: "#f1f5f9" },
    { key: "class", title: "Class List", desc: "Print the list of students in a class", icon: Users, to: "/students/print", tint: "#f1f5f9" },
    { key: "attendance", title: "Attendance Reports", desc: "Class-wise attendance report", icon: CalendarCheck, to: "/attendance/reports/class-wise", tint: "#f1f5f9" },
    { key: "certificates", title: "Certificates", desc: "Leaving and other student certificates", icon: Award, to: "/certificates/generate", tint: "#f1f5f9" },
    { key: "school-rules", title: "School Rules", desc: "Edit once, print the school's rules of conduct", icon: BookOpenCheck, to: "/exams/school-rules", tint: "#f1f5f9" },
];

export default function Printouts() {
    const [params, setParams] = useSearchParams();
    const nav = useNavigate();
    const view = (params.get("view") as View | null) || (params.get("exam") ? "merit" : null);
    if (!view) {
        return (
            <div className="min-h-screen bg-[#f6f7fb] p-4 sm:p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ background: INK }}><Printer className="w-5 h-5" /></div>
                        <div><h1 className="text-xl font-black" style={{ color: INK }}>Printouts</h1><p className="text-xs text-slate-500">Choose what to print. Exam printouts use published results only.</p></div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                        {CARDS.map(c => (
                            <button key={c.key} onClick={() => (c.view ? setParams({ view: c.view }) : nav(c.to!))} className="text-left bg-white rounded-2xl p-3 sm:p-4 hover:-translate-y-0.5 hover:shadow-md transition-all" style={border}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.tint }}><c.icon className="w-5 h-5 text-slate-600" /></div>
                                <div className="font-black text-sm" style={{ color: INK }}>{c.title}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{c.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    return <Builder view={view} onBack={() => setParams({})} />;
}

function Builder({ view, onBack }: { view: View; onBack: () => void }) {
    const [params, setParams] = useSearchParams();
    const school = useSchoolBrand();
    const qc = useQueryClient();
    const level = params.get("class") || "";
    const examId = params.get("exam") || "";
    const set = (k: string, v: string) => setParams(prev => { const p = new URLSearchParams(prev); if (v) p.set(k, v); else p.delete(k); p.set("view", view); return p; });
    const [stream, setStream] = useState(params.get("stream") || "");
    const [rankBy, setRankBy] = useState<"points" | "marks">("points");
    const [merit, setMerit] = useState<MeritOpts>({ section: "ranking", gender: "all", stream: "", cols: { upi: false, stream: true, kcpe: false, gender: true } });
    const [mode, setMode] = useState<"term" | "all">("term");
    const [tOpts, setTOpts] = useState<TranscriptOpts>({ showMarks: true, showRank: true, showGender: false, remarksDos: true, remarksPrincipal: true, signatures: true });
    const [qrs, setQrs] = useState<Record<string, string>>({});

    // a class level coming from Manage Exams may be "Form 3 East" → its level is "Form 3"
    const { data: opts } = useQuery({ queryKey: ["printout_opts", level], queryFn: async () => (await api.get("/exam-printouts/options", { params: { level: level || undefined } })).data });
    const levels: { name: string; streams: string[] }[] = opts?.levels || [];
    const levelObj = levels.find(l => l.name.toLowerCase() === level.toLowerCase());
    useEffect(() => { if (!level && levels.length) set("class", levels[0].name); }, [levels.length]); // eslint-disable-line react-hooks/exhaustive-deps
    const exams: { _id: string; title: string; term: string; academicYear: string }[] = opts?.exams || [];
    useEffect(() => { if (view !== "transcripts" && level && exams.length && !exams.some(e => e._id === examId)) set("exam", exams[0]._id); }, [exams, level]); // eslint-disable-line react-hooks/exhaustive-deps

    const report = useQuery({
        queryKey: ["printout_report", examId, level, rankBy],
        enabled: view !== "transcripts" && !!examId && !!level,
        retry: false,
        queryFn: async () => (await api.get("/exam-printouts/report", { params: { examId, level, rankBy } })).data,
    });
    const tdata = useQuery({
        queryKey: ["printout_transcripts", level, stream, mode],
        enabled: view === "transcripts" && !!level,
        retry: false,
        queryFn: async () => (await api.get("/exam-printouts/transcripts", { params: { level, stream: stream || undefined, mode } })).data,
    });
    // a signed verification QR per transcript
    useEffect(() => {
        let alive = true;
        const list = tdata.data?.students || [];
        if (view !== "transcripts" || !list.length) return;
        (async () => {
            const out: Record<string, string> = {};
            for (let i = 0; i < list.length; i += 6) {
                await Promise.all(list.slice(i, i + 6).map(async (s: { studentId: string; className: string; columns: { term: string; year: string; meanMarks: number; grade: string }[] }) => {
                    const last = s.columns[s.columns.length - 1];
                    out[s.studentId] = await reportQr({ studentId: s.studentId, className: s.className, term: last?.term, year: last?.year, exam: "Academic transcript", average: last?.meanMarks ?? null, grade: last?.grade || "" });
                }));
            }
            if (alive) setQrs(out);
        })();
        return () => { alive = false; };
    }, [tdata.data, view]);

    const html = useMemo(() => {
        if (view === "transcripts") return tdata.data ? transcriptsHtml(school, tdata.data, tOpts, qrs) : "";
        if (!report.data) return "";
        return view === "merit" ? meritHtml(school, report.data, { ...merit, stream }) : analysisHtml(school, report.data, { stream });
    }, [view, report.data, tdata.data, merit, stream, tOpts, qrs, school]);
    const title = view === "transcripts" ? `Transcripts ${level} ${stream}`.trim() : `${level} ${stream} ${report.data?.exam?.title || ""} ${view === "merit" ? "Merit list" : "Analysis report"}`.replace(/\s+/g, " ").trim();
    const loading = view === "transcripts" ? tdata.isFetching : report.isFetching;
    const error = (view === "transcripts" ? tdata.error : report.error) as { response?: { data?: { message?: string } } } | null;

    // Preview: the page is laid out at A4 width; on narrow screens it is scaled down to fit.
    const frame = useRef<HTMLIFrameElement>(null);
    const box = useRef<HTMLDivElement>(null);
    const [boxW, setBoxW] = useState(0);
    const [docH, setDocH] = useState(600);
    const [actual, setActual] = useState(false);   // phones: fit the page to the screen, or show it at full size
    useEffect(() => {
        const el = box.current; if (!el) return;
        const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
        ro.observe(el); setBoxW(el.clientWidth);
        return () => ro.disconnect();
    }, [html, loading]);
    const fit = () => { const d = frame.current?.contentDocument; if (d) setDocH(Math.max(500, d.documentElement.scrollHeight + 20)); };
    useEffect(() => { const t = setTimeout(fit, 60); return () => clearTimeout(t); }, [boxW, html]);
    const landscape = view !== "transcripts" && !(view === "merit" && merit.section === "breakdown");

    const upload = (field: "principalSignature" | "schoolStamp") => async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; e.target.value = "";
        if (!file) return;
        try {
            const url = await prepareTransparentImage(file, field === "schoolStamp" ? 480 : 560);
            await api.patch("/auth/tenant/profile", { [field]: url });
            await qc.invalidateQueries({ queryKey: ["tenant_profile_global"] });
            toast.success(field === "schoolStamp" ? "Stamp saved" : "Signature saved");
        } catch (err: unknown) { toast.error((err as Error)?.message || "Could not save that image"); }
    };

    const Check = ({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) => (
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer"><input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} className="accent-slate-700 w-4 h-4" />{label}</label>
    );
    const head = { merit: "Merit List", analysis: "Analysis Report", transcripts: "Transcripts" }[view];
    const meritCount = view === "merit" && report.data ? filteredStudents(report.data, { ...merit, stream }).length : 0;

    return (
        <div className="min-h-screen bg-[#f6f7fb] p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center" style={border}><ArrowLeft className="w-4 h-4" /></button>
                        <div><h1 className="text-lg font-black" style={{ color: INK }}>{head}</h1><p className="text-[11px] text-slate-500">Printouts · published results only</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button disabled={!html || loading} onClick={() => outputHtmlDoc(title, html, { fileName: title })} className="h-10 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: INK }}><Printer className="w-4 h-4" /> Print</button>
                        <button disabled={!html || loading} onClick={() => downloadHtmlAsPdf(title, html, title)} className="h-10 px-4 rounded-xl text-sm font-bold bg-white flex items-center gap-1.5 disabled:opacity-50" style={{ ...border, color: INK }}><Download className="w-4 h-4" /> PDF</button>
                    </div>
                </div>

                {/* selection */}
                <div className="bg-white rounded-2xl p-4" style={border}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <label className="block"><span className="text-[11px] font-bold text-slate-500">Form / grade</span>
                            <select className={sel} style={border} value={levelObj?.name || level} onChange={e => { set("class", e.target.value); setStream(""); }}>
                                {!levelObj && level && <option value={level}>{level}</option>}
                                {levels.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                            </select></label>
                        <label className="block"><span className="text-[11px] font-bold text-slate-500">Stream</span>
                            <select className={sel} style={border} value={stream} onChange={e => setStream(e.target.value)}>
                                <option value="">All streams</option>
                                {(levelObj?.streams || report.data?.streams || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
                            </select></label>
                        {view !== "transcripts" ? (
                            <>
                                <label className="block"><span className="text-[11px] font-bold text-slate-500">Exam (published)</span>
                                    <select className={sel} style={border} value={examId} onChange={e => set("exam", e.target.value)}>
                                        {!exams.length && <option value="">No published exams for this class</option>}
                                        {exams.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
                                    </select></label>
                                <label className="block"><span className="text-[11px] font-bold text-slate-500">Rank by</span>
                                    <select className={sel} style={border} value={rankBy} onChange={e => setRankBy(e.target.value as "points" | "marks")}>
                                        <option value="points">Mean points</option><option value="marks">Total marks</option>
                                    </select></label>
                            </>
                        ) : (
                            <label className="block sm:col-span-2"><span className="text-[11px] font-bold text-slate-500">Columns</span>
                                <select className={sel} style={border} value={mode} onChange={e => setMode(e.target.value as "term" | "all")}>
                                    <option value="term">One per term (end-of-term exam)</option><option value="all">Every published exam</option>
                                </select></label>
                        )}
                    </div>

                    {view === "merit" && (
                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                            <div className="flex rounded-xl p-1 bg-slate-100">
                                {(["ranking", "breakdown", "summary", "all"] as const).map(s => (
                                    <button key={s} onClick={() => setMerit(m => ({ ...m, section: s }))} className={`px-3 h-8 rounded-lg text-xs font-bold ${merit.section === s ? "bg-white shadow-sm" : "text-slate-500"}`} style={merit.section === s ? { color: ACC } : {}}>
                                        {{ ranking: "Student ranking", breakdown: "Grade breakdown", summary: "Class grade summary", all: "Everything" }[s]}
                                    </button>
                                ))}
                            </div>
                            <select className="h-9 px-3 rounded-xl text-xs font-bold bg-white" style={border} value={merit.gender} onChange={e => setMerit(m => ({ ...m, gender: e.target.value as MeritOpts["gender"] }))}>
                                <option value="all">All students</option><option value="Male">Boys</option><option value="Female">Girls</option>
                            </select>
                            <Check on={merit.cols.upi} label="UPI" onChange={v => setMerit(m => ({ ...m, cols: { ...m.cols, upi: v } }))} />
                            <Check on={merit.cols.stream} label="Stream" onChange={v => setMerit(m => ({ ...m, cols: { ...m.cols, stream: v } }))} />
                            <Check on={merit.cols.kcpe} label="KCPE marks" onChange={v => setMerit(m => ({ ...m, cols: { ...m.cols, kcpe: v } }))} />
                            <Check on={merit.cols.gender} label="Gender" onChange={v => setMerit(m => ({ ...m, cols: { ...m.cols, gender: v } }))} />
                            {report.data && <span className="text-[11px] text-slate-500">{meritCount} students</span>}
                        </div>
                    )}

                    {view === "transcripts" && (
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                                <Check on={tOpts.showMarks} label="Show marks / points" onChange={v => setTOpts(o => ({ ...o, showMarks: v }))} />
                                <Check on={tOpts.showRank} label="Show overall rank" onChange={v => setTOpts(o => ({ ...o, showRank: v }))} />
                                <Check on={tOpts.showGender} label="Show gender" onChange={v => setTOpts(o => ({ ...o, showGender: v }))} />
                                <Check on={tOpts.remarksDos} label="Dean of Studies remarks" onChange={v => setTOpts(o => ({ ...o, remarksDos: v }))} />
                                <Check on={tOpts.remarksPrincipal} label={`${school.signerTitle || "Principal"} remarks`} onChange={v => setTOpts(o => ({ ...o, remarksPrincipal: v }))} />
                                <Check on={tOpts.signatures} label="Signature & stamp" onChange={v => setTOpts(o => ({ ...o, signatures: v }))} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(["principalSignature", "schoolStamp"] as const).map(f => {
                                    const img = f === "schoolStamp" ? school.stamp : school.signature;
                                    return (
                                        <label key={f} className="flex items-center gap-2 h-12 pl-1.5 pr-3 rounded-xl bg-white cursor-pointer" style={border} title="Upload a photo or scan — the background is removed automatically">
                                            <span className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">{img ? <img src={img} alt="" className="max-w-full max-h-full object-contain" /> : <Upload className="w-4 h-4 text-slate-400" />}</span>
                                            <span className="text-xs font-bold" style={{ color: INK }}>{img ? "Change" : "Upload"} {f === "schoolStamp" ? "stamp" : "signature"}</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={upload(f)} />
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* preview */}
                <div className="bg-white rounded-2xl p-2 sm:p-4" style={border}>
                    {loading ? (
                        <div className="py-24 flex flex-col items-center gap-2 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs">Building {head.toLowerCase()}…</span></div>
                    ) : error ? (
                        <div className="py-16 text-center text-sm text-slate-500">{error.response?.data?.message || "Could not build this printout."}</div>
                    ) : !html ? (
                        <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center gap-2"><Wand2 className="w-6 h-6 text-slate-300" />{view === "transcripts" ? "Pick a class." : exams.length ? "Pick a class and an exam." : "No published exams for this class yet — publish results under Exams → Manage Exams."}</div>
                    ) : (
                        <div ref={box} className={`w-full ${actual ? "overflow-x-auto" : "overflow-hidden"}`}>
                            {(() => {
                                const docW = boxW >= (landscape ? 1000 : 760) ? Math.min(boxW, landscape ? 1180 : 840) : (landscape ? 1120 : 820);
                                const fitScale = boxW && boxW < docW ? boxW / docW : 1;
                                const scale = actual ? 1 : fitScale;
                                return (
                                    <>
                                    {fitScale < 1 && (
                                        <div className="flex justify-end mb-2 sticky left-0">
                                            <div className="flex rounded-lg p-0.5 bg-slate-100 text-[11px] font-bold">
                                                <button onClick={() => setActual(false)} className={`px-2.5 h-7 rounded-md ${!actual ? "bg-white shadow-sm" : "text-slate-500"}`} style={!actual ? { color: INK } : {}}>Fit</button>
                                                <button onClick={() => setActual(true)} className={`px-2.5 h-7 rounded-md ${actual ? "bg-white shadow-sm" : "text-slate-500"}`} style={actual ? { color: INK } : {}}>Actual size</button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mx-auto" style={{ width: docW * scale, height: docH * scale }}>
                                        <iframe ref={frame} title="preview" srcDoc={html} onLoad={fit} className="block bg-white" style={{ width: docW, height: docH, border: 0, transform: `scale(${scale})`, transformOrigin: "top left" }} />
                                    </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
