import { useState, useMemo } from "react";
import { Home, ArrowRight, ArrowLeft, Loader2, Check, Users, GraduationCap, AlertTriangle, CalendarClock, Undo2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { FBadge, Tone } from "@/components/fees/FeesUI";

const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Grade 1 → Grade 2, Form 4 → null (graduates), PP2 → Grade 1 — mirrors the backend's
 *  resolveClassRoute (promotion.service.ts) so the destination can be previewed here before
 *  the server resolves it for real. */
function nextClassName(name: string): string | null | undefined {
    const label = String(name || "").trim();
    const v = label.toLowerCase();
    if (v === "pp1") return "PP2";
    if (v === "pp2") return "Grade 1";
    const m = label.match(/^(.*?)(\d+)\s*$/);
    if (!m) return undefined;
    const prefix = m[1].trim(); const n = Number(m[2]);
    const cap = /^form/i.test(prefix) ? 4 : /^grade/i.test(prefix) ? 12 : 0;
    if (cap && n >= cap) return null;
    return `${prefix} ${n + 1}`.trim();
}

type ClassRoute = { action: "promote"; toClass: any } | { action: "graduate" } | { action: "unresolved"; reason: string };

function resolveClassRoute(cls: any, classes: any[]): ClassRoute {
    const live = classes.filter((c: any) => !c.deletedAt && c.isActive !== false);
    const cur = norm(cls.curriculumType || "844");
    const sameCurriculum = (c: any) => norm(c.curriculumType || "844") === cur;
    if (cls.isFinal) return { action: "graduate" };
    if (cls.nextClassId) {
        const t = live.find((c: any) => String(c._id) === String(cls.nextClassId));
        if (t && String(t._id) !== String(cls._id)) {
            if (!sameCurriculum(t)) return { action: "unresolved", reason: `The class set to follow it (${t.name}) is a different curriculum — update class setup` };
            return { action: "promote", toClass: t };
        }
        return { action: "unresolved", reason: "The class set to follow it no longer exists" };
    }
    const next = nextClassName(cls.name);
    if (next === null) return { action: "graduate" };
    if (next) {
        const byName = live.filter((c: any) => norm(c.name) === norm(next) && String(c._id) !== String(cls._id) && sameCurriculum(c));
        if (byName.length === 1) return { action: "promote", toClass: byName[0] };
        if (byName.length > 1) return { action: "unresolved", reason: `More than one class is named ${next}` };
    }
    const lvl = Number(cls.level);
    if (Number.isFinite(lvl)) {
        const up = live.filter((c: any) => Number(c.level) === lvl + 1 && sameCurriculum(c) && String(c._id) !== String(cls._id));
        if (up.length === 1) return { action: "promote", toClass: up[0] };
        if (up.length > 1) return { action: "unresolved", reason: `Several classes are at level ${lvl + 1} — choose one in class setup` };
        const maxLvl = Math.max(0, ...live.filter(sameCurriculum).map((c: any) => Number(c.level) || 0));
        if (lvl >= maxLvl) return { action: "graduate" };
    }
    return { action: "unresolved", reason: next ? `No class named ${next} — create it or choose the next class in class setup` : "No next class — set one in class setup or mark it final" };
}

const STATUS: Record<string, { tone: Tone; label: string }> = {
    completed: { tone: "emerald", label: "Completed" },
    reverting: { tone: "amber", label: "Undoing" },
    reverted: { tone: "violet", label: "Undone" },
};
const relTime = (d: any) => {
    const ms = Date.now() - new Date(d).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
};

// Recent promotions, newest first — shows the last few runs (manual or scheduled)
// with a one-click Undo for anything still "completed" (reverted ones show as such).
function RecentPromotions() {
    const qc = useQueryClient();
    const [busy, setBusy] = useState<string | null>(null);
    const { data: runs = [] } = useQuery<any[]>({ queryKey: ["promotion_schedules"], queryFn: async () => (await api.get("/v2/promotion-schedules")).data || [] });
    const recent = runs.filter((r: any) => ["completed", "reverting", "reverted"].includes(r.status)).slice(0, 5);
    if (!recent.length) return null;

    const undo = async (r: any) => {
        if (!confirm(`Undo "${r.name}"? Every student it moved goes back to their previous class (anyone moved again since is left alone).`)) return;
        setBusy(r._id);
        try {
            const res = await api.post(`/v2/promotion-schedules/${r._id}/revert`);
            toast.success(`Undone for ${res.data?.reverted || 0} student(s)`);
            qc.invalidateQueries({ queryKey: ["promotion_schedules"] });
            qc.invalidateQueries({ queryKey: ["students"] });
            qc.invalidateQueries({ queryKey: ["students-list"] });
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not undo"); }
        finally { setBusy(null); }
    };

    return (
        <div className="mb-5 rounded-xl border border-slate-100 bg-white p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Recent Promotions</p>
            <div className="divide-y divide-slate-50">
                {recent.map((r: any) => (
                    <div key={r._id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{r.name}</p>
                            <p className="text-xs text-slate-400">{relTime(r.finishedAt || r.runAt)} · {r.result?.promoted ?? 0} promoted{r.result?.graduated ? `, ${r.result.graduated} graduated` : ""}</p>
                        </div>
                        <FBadge tone={STATUS[r.status]?.tone || "slate"}>{STATUS[r.status]?.label || r.status}</FBadge>
                        {r.status === "completed" && (
                            <button onClick={() => undo(r)} disabled={busy === r._id} className="h-8 px-3 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 font-bold text-xs flex items-center gap-1.5 disabled:opacity-40">
                                {busy === r._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />} Undo
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Promote Students — a guided flow:
//   1) Pick a source class+stream
//   2) See its students, choose who to promote
//   3) Pick a destination class+stream, confirm (with a progress bar) → promote
// Enrollment-free: updates each student's current class and appends class history.
// Past results stay attached to the old class (exam_marks carry classAtTime).
export default function PromoteStudents() {
    const qc = useQueryClient();
    const [step, setStep] = useState(1);
    // Source
    const [fromClassId, setFromClassId] = useState("");
    const [fromStreamId, setFromStreamId] = useState("");
    // Selection
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [promoting, setPromoting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [undoing, setUndoing] = useState(false);

    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: fromStreams = [] } = useQuery<any[]>({ queryKey: ["v2_streams", fromClassId], enabled: !!fromClassId, queryFn: async () => (await api.get("/v2/streams", { params: { classId: fromClassId } })).data || [] });
    const { data: students = [], isLoading: loadingStudents } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });

    const fromCls = classes.find((c: any) => String(c._id) === fromClassId);
    const fromStream = fromStreams.find((s: any) => String(s._id) === fromStreamId);
    // Destination is never picked manually — it follows the same class ladder (next class
    // by setup, then by name, then by level) the automatic/scheduled promotion uses, and
    // each student keeps their own stream name (created in the destination class if new).
    const route = useMemo<ClassRoute>(() => fromCls ? resolveClassRoute(fromCls, classes) : { action: "unresolved", reason: "" }, [fromCls, classes]);
    const destLabel = route.action === "graduate" ? "Graduates (final class)" : route.action === "promote" ? `${route.toClass.name} (same stream)` : "";

    // Students in the chosen source class + stream.
    const roster = useMemo(() => {
        if (!fromCls) return [];
        return students.filter((s: any) => {
            const classOk = String(s.classId) === fromClassId || norm(s.studentClass || s.currentClass) === norm(fromCls.name) || norm(s.studentClass).startsWith(norm(fromCls.name));
            if (!classOk) return false;
            if (!fromStreamId) return true;
            return String(s.streamId) === fromStreamId || norm(s.stream || s.streamName) === norm(fromStream?.name);
        });
    }, [students, fromClassId, fromStreamId, fromCls, fromStream]);

    const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const allSelected = roster.length > 0 && roster.every((s: any) => selected.has(s._id));
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(roster.map((s: any) => s._id)));

    const promote = async () => {
        setPromoting(true); setProgress(8);
        const tick = setInterval(() => setProgress(p => Math.min(90, p + 12)), 250);
        try {
            const r = await api.post("/v2/promotions", {
                studentIds: Array.from(selected),
                fromClassId,
                academicYear: String(new Date().getFullYear()),
            });
            clearInterval(tick); setProgress(100);
            setResult(r.data);
            qc.invalidateQueries({ queryKey: ["students"] });
            qc.invalidateQueries({ queryKey: ["students-list"] });
            qc.invalidateQueries({ queryKey: ["promotion_schedules"] });
            toast.success(`Promoted ${r.data.promoted} student(s) to ${r.data.destination}.${r.data.streamsCreated ? ` Created ${r.data.streamsCreated} new stream(s).` : ""}`);
            setStep(4);
        } catch (e: any) {
            clearInterval(tick); setProgress(0);
            toast.error(e.response?.data?.message || "Promotion failed");
        } finally { setPromoting(false); }
    };

    const reset = () => { setStep(1); setFromClassId(""); setFromStreamId(""); setSelected(new Set()); setProgress(0); setResult(null); };

    const undoJustDone = async () => {
        if (!result?.runId) return;
        if (!confirm(`Undo this promotion? All ${result.promoted} student(s) go back to their previous class.`)) return;
        setUndoing(true);
        try {
            const r = await api.post(`/v2/promotion-schedules/${result.runId}/revert`);
            toast.success(`Undone for ${r.data?.reverted || 0} student(s)`);
            qc.invalidateQueries({ queryKey: ["students"] });
            qc.invalidateQueries({ queryKey: ["students-list"] });
            qc.invalidateQueries({ queryKey: ["promotion_schedules"] });
            reset();
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not undo"); }
        finally { setUndoing(false); }
    };

    const Stepper = () => (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
            {["Pick Class", "Choose Students", "Confirm", "Done"].map((label, i) => {
                const n = i + 1; const active = step === n; const done = step > n;
                return (
                    <div key={label} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${done ? "bg-emerald-500 text-white" : active ? "bg-[#5C67F2] text-white" : "bg-slate-100 text-slate-400"}`}>{done ? <Check className="w-4 h-4" /> : n}</div>
                        <span className={`text-xs font-bold ${active ? "text-[#5C67F2]" : "text-slate-400"}`}>{label}</span>
                        {n < 4 && <div className="w-8 h-px bg-slate-200" />}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="bg-white border border-slate-100 rounded-xl px-5 py-3 flex items-center gap-2 mb-5 shadow-sm">
                <span className="font-bold text-slate-800 text-sm">Students</span>
                <span className="text-slate-300">|</span>
                <Home className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500 text-sm">Promote Students</span>
            </div>

            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-1"><GraduationCap className="w-6 h-6 text-[#5C67F2]" /> Promote Students</h1>
                <p className="text-sm text-slate-400 mb-3">Move a class up. Previous classes & results stay intact and remain viewable on each student's profile.</p>
                <Link to="/students/promote/auto" className="mb-5 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 hover:bg-indigo-50">
                    <CalendarClock className="w-5 h-5 text-[#5C67F2] shrink-0" />
                    <span className="text-sm text-slate-600 flex-1"><b className="text-slate-800">Promote the whole school automatically</b> — set a date & time and every class moves up (Grade 1 East → Grade 2 East).</span>
                    <ArrowRight className="w-4 h-4 text-[#5C67F2]" />
                </Link>
                <RecentPromotions />
                <Stepper />

                {/* Step 1 — pick source class + stream */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Class to promote *</label>
                                <select value={fromClassId} onChange={e => { setFromClassId(e.target.value); setFromStreamId(""); setSelected(new Set()); }} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                                    <option value="">— Select Class —</option>
                                    {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Stream</label>
                                <select value={fromStreamId} onChange={e => { setFromStreamId(e.target.value); setSelected(new Set()); }} disabled={!fromClassId} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                                    <option value="">All streams</option>
                                    {fromStreams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        {fromClassId && <p className="text-sm text-slate-500">{roster.length} student(s) in {fromCls?.name}{fromStream ? ` ${fromStream.name}` : ""}.</p>}
                        <div className="flex justify-end">
                            <button onClick={() => { setSelected(new Set(roster.map((s: any) => s._id))); setStep(2); }} disabled={!fromClassId || roster.length === 0} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-40">Continue <ArrowRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}

                {/* Step 2 — choose students */}
                {step === 2 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select all ({roster.length})</label>
                            <span className="text-xs font-bold text-[#5C67F2]">{selected.size} selected</span>
                        </div>
                        <div className="border border-slate-100 rounded-xl max-h-80 overflow-auto divide-y divide-slate-50">
                            {loadingStudents ? <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
                                : roster.map((s: any) => (
                                    <label key={s._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                                        <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggle(s._id)} />
                                        <span className="text-sm font-bold text-slate-700 flex-1">{s.studentName || s.name}</span>
                                        <span className="text-xs text-slate-400">{s.registrationNo || s.admNo}</span>
                                    </label>
                                ))}
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setStep(1)} className="h-11 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
                            <button onClick={() => setStep(3)} disabled={selected.size === 0} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-40">Continue <ArrowRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}

                {/* Step 3 — confirm (destination follows the class ladder automatically) */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                            <p className="text-xs text-amber-700 font-bold">Promoting <b>{selected.size}</b> student(s) from <b>{fromCls?.name}{fromStream ? ` ${fromStream.name}` : ""}</b>. Their previous class & results stay intact and viewable on each profile.</p>
                        </div>

                        {route.action === "unresolved" ? (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5" />
                                <p className="text-xs text-rose-700 font-bold">Can't tell what class follows {fromCls?.name}: {route.reason}. Fix this in Class setup (set its next class or level), then come back here.</p>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Destination (resolved automatically)</p>
                                <p className="text-sm text-slate-600 font-bold flex items-center gap-2 flex-wrap">{fromCls?.name}{fromStream ? ` ${fromStream.name}` : ""} <ArrowRight className="w-4 h-4 text-[#5C67F2]" /> {destLabel}</p>
                                {route.action === "promote" && <p className="text-xs text-slate-400 mt-1">Each student keeps their own stream name; it's created under {route.toClass.name} automatically if it doesn't exist yet.</p>}
                            </div>
                        )}

                        {(promoting || progress > 0) && (
                            <div>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#5C67F2] transition-all duration-300" style={{ width: `${progress}%` }} /></div>
                                <p className="text-[11px] text-slate-400 mt-1">{progress < 100 ? "Promoting…" : "Done"}</p>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <button onClick={() => setStep(2)} disabled={promoting} className="h-11 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
                            <button onClick={() => { if (confirm(`Promote ${selected.size} student(s) to ${destLabel}?`)) promote(); }} disabled={route.action === "unresolved" || promoting} className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-40">
                                {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm & Promote
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4 — done */}
                {step === 4 && result && (
                    <div className="text-center py-8">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3"><Check className="w-7 h-7" /></div>
                        <h2 className="text-lg font-black text-slate-800">Promotion complete</h2>
                        <p className="text-sm text-slate-500 mt-1">Promoted <b>{result.promoted}</b> student(s) to <b>{result.destination}</b>{result.skipped ? ` · ${result.skipped} skipped` : ""}.</p>
                        <p className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5" /> Their previous class results remain on each student's Academic History.</p>
                        <div className="flex items-center justify-center gap-2.5 mt-5">
                            <button onClick={undoJustDone} disabled={undoing} className="h-11 px-5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 font-bold text-sm flex items-center gap-1.5 disabled:opacity-40">
                                {undoing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />} Undo this promotion
                            </button>
                            <button onClick={reset} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm">Promote another class</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
