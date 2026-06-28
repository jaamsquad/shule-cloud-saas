import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Clock, FileText, CheckCircle2, AlertTriangle, Flag, ChevronLeft, ChevronRight, Send, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import type { StudentCtx } from "../StudentLayout";

type Tab = "available" | "upcoming" | "completed" | "missed";

// Online Examinations — student view. Lists exams, then runs the take-exam flow:
// instructions gate -> question navigator with autosave + countdown + anti-cheat ->
// manual/auto submit. The same page is reused by teachers to self-test their exams.
export default function OnlineExams() {
    const { api } = useOutletContext<StudentCtx>();
    const [active, setActive] = useState<any>(null);   // the exam being taken

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["online_exams_list"],
        queryFn: async () => (await api.get("/student-portal/online-exams")).data,
        enabled: !active,
        retry: false,
    });

    if (active) return <TakeExam api={api} examId={active._id} onExit={() => { setActive(null); refetch(); }} />;

    const [tab, setTab] = useState<Tab>("available");
    const groups: Record<Tab, any[]> = { available: data?.available || [], upcoming: data?.upcoming || [], completed: data?.completed || [], missed: data?.missed || [] };
    const list = groups[tab];

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-xl font-bold text-slate-700 mb-4">Online Examinations</h1>
            <div className="flex gap-2 flex-wrap mb-4">
                {(["available", "upcoming", "completed", "missed"] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`h-9 px-4 rounded-lg text-sm font-bold capitalize ${tab === t ? "bg-[#159a52] text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{t} ({groups[t].length})</button>
                ))}
            </div>
            {isLoading ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#159a52]" /></div>
                : list.length === 0 ? <div className="py-16 text-center text-slate-400 font-bold">No {tab} exams.</div>
                    : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {list.map((e: any) => (
                                <div key={e._id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                                    <h3 className="font-black text-slate-800">{e.examName}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{e.subjectName} · {e.category}</p>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 font-bold">
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{e.durationMinutes} min</span>
                                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{e.totalMarks} marks</span>
                                    </div>
                                    {tab === "available" && <button onClick={() => setActive(e)} className="mt-3 w-full h-10 rounded-xl bg-[#159a52] text-white font-bold text-sm">Start Exam</button>}
                                    {tab === "upcoming" && <p className="mt-3 text-xs text-slate-400">Opens {e.startAt ? new Date(e.startAt).toLocaleString() : "soon"}</p>}
                                    {tab === "completed" && <p className="mt-3 text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Submitted</p>}
                                    {tab === "missed" && <p className="mt-3 text-xs text-rose-500 font-bold">Missed</p>}
                                </div>
                            ))}
                        </div>
                    )}
        </div>
    );
}

// ── Take exam ────────────────────────────────────────────────────────────────
function TakeExam({ api, examId, onExit }: { api: any; examId: string; onExit: () => void }) {
    const [phase, setPhase] = useState<"loading" | "instructions" | "running" | "done">("loading");
    const [exam, setExam] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [flagged, setFlagged] = useState<string[]>([]);
    const [idx, setIdx] = useState(0);
    const [deadline, setDeadline] = useState<number>(0);
    const [remaining, setRemaining] = useState(0);
    const [online, setOnline] = useState(navigator.onLine);
    const [savedAt, setSavedAt] = useState<string>("");
    const [warnings, setWarnings] = useState(0);
    const submittedRef = useRef(false);

    // Load / resume the attempt.
    useEffect(() => {
        (async () => {
            try {
                const r = await api.post(`/student-portal/online-exams/${examId}/start`);
                setExam(r.data.exam); setQuestions(r.data.questions);
                setAnswers(r.data.attempt.answers || {}); setFlagged(r.data.attempt.flagged || []);
                setDeadline(new Date(r.data.attempt.deadlineAt).getTime());
                setPhase("instructions");
            } catch (e: any) { toast.error(e.response?.data?.message || "Cannot start exam"); onExit(); }
        })();
    }, [examId]);

    const settings = exam?.settings || {};

    // Submit (manual or auto). Guarded so it only fires once.
    const submit = useCallback(async (auto: boolean) => {
        if (submittedRef.current) return; submittedRef.current = true;
        try {
            const r = await api.post(`/student-portal/online-exams/${examId}/submit`, { answers, auto });
            setPhase("done");
            toast.success(auto ? "Time up — exam auto-submitted." : "Exam submitted.");
            if (r.data.score != null) toast.success(`Score: ${r.data.score}/${r.data.totalMarks}`);
        } catch { toast.error("Submit failed — retrying may help."); submittedRef.current = false; }
    }, [api, examId, answers]);

    // Countdown + auto-submit on expiry.
    useEffect(() => {
        if (phase !== "running") return;
        const t = setInterval(() => {
            const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
            setRemaining(left);
            if (left <= 0) { clearInterval(t); submit(true); }
        }, 1000);
        return () => clearInterval(t);
    }, [phase, deadline, submit]);

    // Autosave every 8s while running.
    useEffect(() => {
        if (phase !== "running" || !settings.autosave) return;
        const t = setInterval(async () => {
            try { const r = await api.post(`/student-portal/online-exams/${examId}/autosave`, { answers, flagged }); setSavedAt(new Date(r.data.savedAt).toLocaleTimeString()); } catch { /* offline — keep local */ }
        }, 8000);
        return () => clearInterval(t);
    }, [phase, answers, flagged, settings.autosave, api, examId]);

    // Connection status.
    useEffect(() => {
        const on = () => setOnline(true), off = () => setOnline(false);
        window.addEventListener("online", on); window.addEventListener("offline", off);
        return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    }, []);

    // Anti-cheat: tab switch / fullscreen exit -> warn, then record violation.
    useEffect(() => {
        if (phase !== "running") return;
        const onViolation = async (kind: string) => {
            try {
                const r = await api.post(`/student-portal/online-exams/${examId}/violation`, { kind });
                setWarnings(w => w + 1);
                if (r.data.autoSubmitted) { toast.error("Exam auto-submitted due to repeated violations."); submit(true); }
                else toast.warning(`Warning: ${kind.replace("_", " ")}. ${r.data.warningsLeft} left before auto-submit.`);
            } catch { /* ignore */ }
        };
        const onVis = () => { if (document.hidden) onViolation("tab_switch"); };
        const onBlur = () => onViolation("window_blur");
        document.addEventListener("visibilitychange", onVis);
        if (settings.strictMode) window.addEventListener("blur", onBlur);
        return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("blur", onBlur); };
    }, [phase, settings.strictMode, api, examId, submit]);

    // Copy/paste/right-click guards.
    useEffect(() => {
        if (phase !== "running") return;
        const block = (e: Event) => e.preventDefault();
        if (settings.preventCopy) document.addEventListener("copy", block);
        if (settings.preventPaste) document.addEventListener("paste", block);
        if (settings.preventRightClick) document.addEventListener("contextmenu", block);
        return () => { document.removeEventListener("copy", block); document.removeEventListener("paste", block); document.removeEventListener("contextmenu", block); };
    }, [phase, settings]);

    const begin = async () => {
        if (settings.requireFullScreen) { try { await document.documentElement.requestFullscreen(); } catch { /* ignore */ } }
        setPhase("running");
    };
    const setAns = (qid: string, val: any) => setAnswers(a => ({ ...a, [qid]: val }));
    const toggleFlag = (qid: string) => setFlagged(f => f.includes(qid) ? f.filter(x => x !== qid) : [...f, qid]);
    const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    const answeredCount = questions.filter(q => answers[q._id] !== undefined && answers[q._id] !== "" && !(Array.isArray(answers[q._id]) && answers[q._id].length === 0)).length;

    if (phase === "loading") return <div className="py-20 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-[#159a52]" /></div>;

    if (phase === "instructions") return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h1 className="text-xl font-black text-slate-800">{exam.examName}</h1>
                <p className="text-sm text-slate-400">{exam.subjectName}</p>
                <div className="grid grid-cols-3 gap-3 my-5">
                    <Stat label="Duration" value={`${exam.durationMinutes} min`} />
                    <Stat label="Questions" value={questions.length} />
                    <Stat label="Total Marks" value={exam.totalMarks} />
                </div>
                {exam.instructions && <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 whitespace-pre-wrap mb-4">{exam.instructions}</div>}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-bold flex items-start gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>Once you begin, the timer starts and cannot be paused.{settings.strictMode ? " Leaving the exam or switching tabs is recorded and may auto-submit your exam." : ""}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={onExit} className="h-11 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                    <button onClick={begin} className="flex-1 h-11 rounded-xl bg-[#159a52] text-white font-bold text-sm">I understand the rules and begin examination</button>
                </div>
            </div>
        </div>
    );

    if (phase === "done") return (
        <div className="max-w-lg mx-auto p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3"><CheckCircle2 className="w-7 h-7" /></div>
            <h1 className="text-lg font-black text-slate-800">Exam submitted</h1>
            <p className="text-sm text-slate-500 mt-1">Your answers have been recorded. Results will appear once released.</p>
            <button onClick={onExit} className="mt-5 h-11 px-5 rounded-xl bg-[#159a52] text-white font-bold text-sm">Back to exams</button>
        </div>
    );

    // Running.
    const q = questions[idx];
    return (
        <div className="max-w-5xl mx-auto p-4 select-none" style={settings.disableTextSelection ? { userSelect: "none" } : {}}>
            {/* Top bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center justify-between mb-3 sticky top-2 z-10">
                <div className="min-w-0">
                    <p className="font-black text-slate-800 truncate text-sm">{exam.examName}</p>
                    <p className="text-[11px] text-slate-400">{answeredCount}/{questions.length} answered{savedAt ? ` · saved ${savedAt}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold flex items-center gap-1 ${online ? "text-emerald-600" : "text-rose-500"}`}>{online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}</span>
                    {settings.showRemainingTime && <span className={`text-sm font-black tabular-nums px-2 py-1 rounded-lg ${remaining < 60 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-700"}`}><Clock className="w-3.5 h-3.5 inline mr-1" />{fmt(remaining)}</span>}
                </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_220px] gap-3">
                {/* Question */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-slate-400 uppercase">Question {idx + 1} of {questions.length} · {q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                        <button onClick={() => toggleFlag(q._id)} className={`text-xs font-bold flex items-center gap-1 ${flagged.includes(q._id) ? "text-amber-500" : "text-slate-400"}`}><Flag className="w-3.5 h-3.5" /> {flagged.includes(q._id) ? "Flagged" : "Flag"}</button>
                    </div>
                    <div className="text-sm text-slate-800 font-medium mb-4 whitespace-pre-wrap">{q.questionText}</div>
                    {(q.media || []).map((m: any, i: number) => m.type === "image" ? <img key={i} src={m.url} className="max-w-full rounded-lg mb-3" /> : null)}
                    <QuestionInput q={q} value={answers[q._id]} onChange={(v: any) => setAns(q._id, v)} />
                    <div className="flex justify-between mt-5">
                        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0 || settings.allowPrevious === false} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /> Prev</button>
                        {idx < questions.length - 1
                            ? <button onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))} disabled={settings.allowNext === false} className="h-10 px-4 rounded-xl bg-slate-800 text-white font-bold text-sm flex items-center gap-1 disabled:opacity-40">Next <ChevronRight className="w-4 h-4" /></button>
                            : <button onClick={() => { if (confirm(`Submit exam? ${answeredCount}/${questions.length} answered.`)) submit(false); }} className="h-10 px-5 rounded-xl bg-[#159a52] text-white font-bold text-sm flex items-center gap-1.5"><Send className="w-4 h-4" /> Submit</button>}
                    </div>
                </div>

                {/* Navigator */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-fit">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Questions</p>
                    <div className="grid grid-cols-5 gap-1.5">
                        {questions.map((qq, i) => {
                            const ans = answers[qq._id] !== undefined && answers[qq._id] !== "" && !(Array.isArray(answers[qq._id]) && answers[qq._id].length === 0);
                            const fl = flagged.includes(qq._id);
                            return <button key={qq._id} onClick={() => setIdx(i)} className={`h-8 rounded-lg text-xs font-bold ${i === idx ? "ring-2 ring-[#159a52]" : ""} ${fl ? "bg-amber-100 text-amber-700" : ans ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{i + 1}</button>;
                        })}
                    </div>
                    <button onClick={() => { if (confirm(`Submit exam? ${answeredCount}/${questions.length} answered.`)) submit(false); }} className="mt-4 w-full h-10 rounded-xl bg-[#159a52] text-white font-bold text-sm">Submit Exam</button>
                </div>
            </div>
        </div>
    );
}

// Per-type answer input.
function QuestionInput({ q, value, onChange }: { q: any; value: any; onChange: (v: any) => void }) {
    switch (q.type) {
        case "mcq_single":
        case "true_false": {
            const opts = q.type === "true_false" ? ["True", "False"] : (q.options || []);
            return <div className="space-y-2">{opts.map((o: string, i: number) => (
                <label key={i} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer ${value === o ? "border-[#159a52] bg-emerald-50" : "border-slate-200"}`}>
                    <input type="radio" checked={value === o} onChange={() => onChange(o)} /> <span className="text-sm">{o}</span>
                </label>))}</div>;
        }
        case "mcq_multiple": {
            const arr: string[] = Array.isArray(value) ? value : [];
            return <div className="space-y-2">{(q.options || []).map((o: string, i: number) => (
                <label key={i} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer ${arr.includes(o) ? "border-[#159a52] bg-emerald-50" : "border-slate-200"}`}>
                    <input type="checkbox" checked={arr.includes(o)} onChange={() => onChange(arr.includes(o) ? arr.filter(x => x !== o) : [...arr, o])} /> <span className="text-sm">{o}</span>
                </label>))}</div>;
        }
        case "short_answer":
        case "fill_blank":
        case "numeric":
            return <input value={value ?? ""} onChange={e => onChange(e.target.value)} type={q.type === "numeric" ? "number" : "text"} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" placeholder="Your answer…" />;
        case "essay":
            return <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} rows={6} className="w-full p-3 rounded-xl border border-slate-200 text-sm" placeholder="Write your answer…" />;
        case "matching":
            return <div className="space-y-2">{(q.lefts || []).map((l: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-600 flex-1">{l}</span>
                    <select value={value?.[l] ?? ""} onChange={e => onChange({ ...(value || {}), [l]: e.target.value })} className="h-10 px-2 rounded-lg border border-slate-200 text-sm bg-white">
                        <option value="">—</option>{(q.rights || []).map((r: string, j: number) => <option key={j} value={r}>{r}</option>)}
                    </select>
                </div>))}</div>;
        case "ordering":
            return <div className="space-y-2">{(q.items || []).map((it: any, i: number) => {
                const order: string[] = Array.isArray(value) ? value : (q.items || []).map((x: any) => x.id || x);
                const id = it.id || it; const pos = order.indexOf(id);
                return <div key={i} className="flex items-center gap-2"><span className="w-7 text-center text-sm font-black text-slate-400">{pos + 1}</span><span className="text-sm flex-1">{it.text || it}</span>
                    <button onClick={() => { const o = [...order]; if (pos > 0) { [o[pos - 1], o[pos]] = [o[pos], o[pos - 1]]; onChange(o); } }} className="text-slate-400">↑</button>
                    <button onClick={() => { const o = [...order]; if (pos < o.length - 1) { [o[pos + 1], o[pos]] = [o[pos], o[pos + 1]]; onChange(o); } }} className="text-slate-400">↓</button></div>;
            })}</div>;
        case "file_upload":
            return <p className="text-xs text-slate-400">File upload questions are answered by uploading from a device; ask your teacher if unavailable here.</p>;
        default:
            return <input value={value ?? ""} onChange={e => onChange(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />;
    }
}

const Stat = ({ label, value }: { label: string; value: any }) => (
    <div className="text-center bg-slate-50 rounded-xl py-3">
        <div className="text-lg font-black text-slate-800">{value}</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase">{label}</div>
    </div>
);
