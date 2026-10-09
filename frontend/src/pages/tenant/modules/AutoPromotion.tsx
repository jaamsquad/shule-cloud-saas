import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Home, ChevronRight, CalendarClock, ArrowRight, GraduationCap, AlertTriangle, Play, Pencil, Trash2, Ban,
    Undo2, ListChecks, Plus, Layers, CheckCircle2, Users, Settings2, RefreshCw, Clock,
} from "lucide-react";
import api from "@/lib/api";
import {
    FCard, FStat, FBadge, FButton, FField, FInput, FModal, FTable, td, FEmpty, FLoading, StudentPicker, PickedStudent, Tone,
} from "@/components/fees/FeesUI";

// Automatic promotion: pick a date & time, the whole school moves up by itself
// (Grade 1 East → Grade 2 East, the final class graduates). The map below is exactly
// what would happen if it ran now; anything that can't be placed with certainty is
// left in its class and listed so it can be fixed in class setup.

const STATUS: Record<string, { tone: Tone; label: string }> = {
    scheduled: { tone: "sky", label: "Scheduled" },
    running: { tone: "amber", label: "Running" },
    completed: { tone: "emerald", label: "Completed" },
    failed: { tone: "rose", label: "Failed" },
    cancelled: { tone: "slate", label: "Cancelled" },
    reverting: { tone: "amber", label: "Undoing" },
    reverted: { tone: "violet", label: "Undone" },
};
const fmtWhen = (d: any) => d ? new Date(d).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const targetYearFor = (d: Date) => String(d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear());

function countdown(to: any, now: number) {
    const ms = new Date(to).getTime() - now;
    if (ms <= 0) return "due now";
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    return d ? `in ${d}d ${h}h` : h ? `in ${h}h ${m}m` : `in ${m}m`;
}

interface FormState { id?: string; name: string; runAt: string; academicYear: string; classIds: string[]; createMissingStreams: boolean; graduateFinal: boolean; exclude: PickedStudent[] }
const blankForm = (): FormState => {
    // default: next 1 January at 06:00
    const d = new Date(new Date().getFullYear() + 1, 0, 1, 6, 0);
    return { name: "", runAt: toLocalInput(d), academicYear: targetYearFor(d), classIds: [], createMissingStreams: true, graduateFinal: true, exclude: [] };
};

function PlanMap({ plan, loading }: { plan: any; loading: boolean }) {
    if (loading) return <FLoading label="Working out the promotion map…" />;
    if (!plan) return null;
    const groups: any[] = plan.groups || [];
    if (!groups.length) return <FEmpty icon={Users} title="No active learners in classes" hint="Learners appear here once they are placed in a class and stream." />;
    return (
        <FTable head={["From", "", "To", "Learners", "How"]}>
            {groups.map((g: any) => (
                <tr key={g.key}>
                    <td className={`${td} font-semibold text-slate-800 whitespace-nowrap`}>{g.fromLabel}</td>
                    <td className={td}><ArrowRight className={`w-4 h-4 ${g.action === "unresolved" ? "text-rose-400" : "text-[#5C67F2]"}`} /></td>
                    <td className={`${td} whitespace-nowrap`}>
                        {g.action === "promote" && <span className="font-semibold text-slate-800">{g.toLabel}</span>}
                        {g.action === "promote" && g.createStream && <span className="ml-2"><FBadge tone="violet">new stream</FBadge></span>}
                        {g.action === "graduate" && <FBadge tone="amber"><GraduationCap className="w-3 h-3" /> Graduates</FBadge>}
                        {g.action === "unresolved" && <FBadge tone="rose"><AlertTriangle className="w-3 h-3" /> Stays — not placed</FBadge>}
                    </td>
                    <td className={`${td} font-bold`}>{g.count}</td>
                    <td className={`${td} text-xs`}>
                        {g.action === "unresolved"
                            ? <span className="text-rose-600">{g.reason} · <Link to="/academic-system/classes" className="underline font-semibold">Fix in class setup</Link></span>
                            : <span className="text-slate-400">{g.via}</span>}
                        {g.warning && <p className="text-amber-600 mt-0.5">{g.warning}</p>}
                    </td>
                </tr>
            ))}
        </FTable>
    );
}

function PlanStats({ plan, loading }: { plan: any; loading: boolean }) {
    const s = plan?.summary || {};
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <FStat label="Move up" value={s.promote ?? 0} icon={ArrowRight} tone="indigo" loading={loading} hint={plan ? `into ${plan.targetYear}` : undefined} />
            <FStat label="Graduate" value={s.graduate ?? 0} icon={GraduationCap} tone="amber" loading={loading} hint="final classes" />
            <FStat label="Not placed" value={s.unresolved ?? 0} icon={AlertTriangle} tone={s.unresolved ? "rose" : "emerald"} loading={loading} hint={s.unresolved ? "stay in class — fix setup" : "everyone has a destination"} />
            <FStat label="New streams" value={s.newStreams ?? 0} icon={Layers} tone="violet" loading={loading} hint={`${s.excluded || 0} held back · ${s.alreadyDone || 0} already moved`} />
        </div>
    );
}

export default function AutoPromotion() {
    const qc = useQueryClient();
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);

    const [form, setForm] = useState<FormState | null>(null);
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [itemsFor, setItemsFor] = useState<any>(null);

    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: schedules = [], isLoading: loadingSch, refetch: refetchSch } = useQuery<any[]>({
        queryKey: ["promotion_schedules"], queryFn: async () => (await api.get("/v2/promotion-schedules")).data || [],
        refetchInterval: (q: any) => ((q?.state?.data || []).some((s: any) => s.status === "running") ? 5000 : false),
    });
    const { data: plan, isFetching: loadingPlan, refetch: refetchPlan } = useQuery<any>({
        queryKey: ["promotion_plan"], queryFn: async () => (await api.get("/v2/promotion-plan")).data,
    });

    // Live preview for the form being edited (same options the run will use)
    const formKey = form ? JSON.stringify([form.academicYear, form.classIds, form.createMissingStreams, form.graduateFinal, form.exclude.map(e => e._id)]) : "";
    const { data: formPlan, isFetching: loadingFormPlan } = useQuery<any>({
        queryKey: ["promotion_plan_form", formKey], enabled: !!form,
        queryFn: async () => (await api.get("/v2/promotion-plan", { params: {
            academicYear: form!.academicYear, classIds: form!.classIds.join(","), createMissingStreams: form!.createMissingStreams, graduateFinal: form!.graduateFinal, excludeStudentIds: form!.exclude.map(e => e._id).join(","),
        } })).data,
    });
    const { data: items = [], isLoading: loadingItems } = useQuery<any[]>({
        queryKey: ["promotion_items", itemsFor?._id], enabled: !!itemsFor,
        queryFn: async () => (await api.get(`/v2/promotion-schedules/${itemsFor._id}/items`)).data || [],
    });

    const next = useMemo(() => schedules.filter(s => s.status === "scheduled").sort((a, b) => +new Date(a.runAt) - +new Date(b.runAt))[0], [schedules]);
    const refreshAll = () => { qc.invalidateQueries({ queryKey: ["promotion_schedules"] }); qc.invalidateQueries({ queryKey: ["promotion_plan"] }); qc.invalidateQueries({ queryKey: ["students"] }); qc.invalidateQueries({ queryKey: ["students-list"] }); };

    const save = async () => {
        if (!form) return;
        if (!form.runAt) return toast.error("Choose the date and time");
        setSaving(true);
        try {
            const body = { name: form.name || `Promotion to ${form.academicYear}`, runAt: new Date(form.runAt).toISOString(), academicYear: form.academicYear, classIds: form.classIds, createMissingStreams: form.createMissingStreams, graduateFinal: form.graduateFinal, excludeStudentIds: form.exclude.map(e => e._id), heldBack: form.exclude };
            if (form.id) await api.put(`/v2/promotion-schedules/${form.id}`, body); else await api.post("/v2/promotion-schedules", body);
            toast.success(form.id ? "Promotion updated" : `Promotion scheduled for ${fmtWhen(body.runAt)}`);
            setForm(null); refreshAll();
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not save"); }
        finally { setSaving(false); }
    };

    const act = async (s: any, kind: "run" | "cancel" | "delete" | "revert") => {
        const ask = {
            run: `Run "${s.name}" now? Every class moves up immediately.`,
            cancel: `Cancel "${s.name}"? It will not run.`,
            delete: `Delete "${s.name}"?`,
            revert: `Undo "${s.name}"? Every learner it moved goes back to their previous class (learners moved again since are left alone).`,
        }[kind];
        if (!confirm(ask)) return;
        setBusy(`${s._id}:${kind}`);
        try {
            if (kind === "run") {
                const r = await api.post(`/v2/promotion-schedules/${s._id}/run-now`);
                const x = r.data?.result || {};
                toast.success(`Promoted ${x.promoted || 0}, graduated ${x.graduated || 0}${x.skipped ? ` · ${x.skipped} not placed` : ""}`);
            } else if (kind === "cancel") { await api.post(`/v2/promotion-schedules/${s._id}/cancel`); toast.success("Cancelled"); }
            else if (kind === "delete") { await api.delete(`/v2/promotion-schedules/${s._id}`); toast.success("Deleted"); }
            else { const r = await api.post(`/v2/promotion-schedules/${s._id}/revert`); toast.success(`Undone for ${r.data?.reverted || 0} learner(s)`); }
            refreshAll();
        } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
        finally { setBusy(null); }
    };

    const edit = (s: any) => {
        const d = new Date(s.runAt);
        setForm({ id: s._id, name: s.name, runAt: toLocalInput(d < new Date() ? new Date(Date.now() + 3600e3) : d), academicYear: s.options?.academicYear || targetYearFor(d), classIds: s.options?.classIds || [], createMissingStreams: s.options?.createMissingStreams !== false, graduateFinal: s.options?.graduateFinal !== false, exclude: (s.options?.excludeStudentIds || []).map((id: string) => (s.heldBack || []).find((h: any) => h._id === id) || ({ _id: id, name: "Held-back learner", reg: "", cls: "" })) });
    };

    const sortedClasses = [...classes].sort((a: any, b: any) => (a.level - b.level) || String(a.name).localeCompare(b.name));

    return (
        <div className="flex-1 min-h-screen bg-[#F8FAFC] pb-16">
            <div className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <Home className="w-3.5 h-3.5 text-[#5C67F2]" /><ChevronRight className="w-3 h-3" />
                    <span>Students</span><ChevronRight className="w-3 h-3" />
                    <Link to="/students/promote" className="hover:text-slate-600">Promote</Link><ChevronRight className="w-3 h-3" />
                    <span className="text-slate-700">Automatic Promotion</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#5C67F2]/10 text-[#5C67F2] flex items-center justify-center"><CalendarClock className="w-5 h-5" /></div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Automatic Promotion</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Set a date & time — every class moves up on its own. Grade 1 East becomes Grade 2 East.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link to="/academic-system/classes"><FButton variant="secondary" icon={Settings2}>Class setup</FButton></Link>
                        <Link to="/students/promote"><FButton variant="secondary" icon={Users}>Manual promotion</FButton></Link>
                        <FButton icon={Plus} onClick={() => setForm(blankForm())}>Schedule promotion</FButton>
                    </div>
                </div>

                {next && (
                    <div className="rounded-2xl bg-gradient-to-r from-[#5C67F2] to-indigo-500 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-white/70">Next promotion · {countdown(next.runAt, now)}</p>
                                <p className="text-lg font-extrabold">{next.name}</p>
                                <p className="text-sm text-white/80">{fmtWhen(next.runAt)} · into {next.options?.academicYear}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <FButton variant="secondary" size="sm" icon={Pencil} onClick={() => edit(next)}>Edit</FButton>
                            <FButton variant="secondary" size="sm" icon={Play} loading={busy === `${next._id}:run`} onClick={() => act(next, "run")}>Run now</FButton>
                        </div>
                    </div>
                )}

                <div className="grid sm:grid-cols-3 gap-3">
                    {[
                        { icon: Settings2, t: "1 · Set up classes", d: "Each class knows the next one — by name (Grade 1 → Grade 2), by level, or chosen in class setup. Mark the last class as final." },
                        { icon: CalendarClock, t: "2 · Pick a date & time", d: "e.g. 1 January, 6:00 am. Hold back repeaters. The map shows exactly who goes where." },
                        { icon: CheckCircle2, t: "3 · It runs by itself", d: "Streams keep their name, history & results stay on each learner, and it can be undone." },
                    ].map(x => (
                        <div key={x.t} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3">
                            <x.icon className="w-5 h-5 text-[#5C67F2] shrink-0 mt-0.5" />
                            <div><p className="text-sm font-bold text-slate-800">{x.t}</p><p className="text-xs text-slate-500 mt-0.5">{x.d}</p></div>
                        </div>
                    ))}
                </div>

                <FCard title="Promotions" subtitle="Scheduled, completed and undone" icon={ListChecks}
                    actions={<FButton variant="ghost" size="sm" icon={RefreshCw} onClick={() => refetchSch()}>Refresh</FButton>} bodyClassName="">
                    {loadingSch ? <FLoading /> : !schedules.length
                        ? <FEmpty icon={CalendarClock} title="No promotion scheduled" hint="Schedule one to move every class up automatically." action={<FButton icon={Plus} onClick={() => setForm(blankForm())}>Schedule promotion</FButton>} />
                        : (
                            <FTable head={["Promotion", "Runs", "Into", "Status", "Result", ""]}>
                                {schedules.map((s: any) => {
                                    const st = STATUS[s.status] || { tone: "slate" as Tone, label: s.status };
                                    const r = s.result;
                                    return (
                                        <tr key={s._id}>
                                            <td className={td}>
                                                <p className="font-semibold text-slate-800">{s.name}</p>
                                                <p className="text-[11px] text-slate-400">{s.options?.classIds?.length ? `${s.options.classIds.length} class(es)` : "All classes"}{s.options?.excludeStudentIds?.length ? ` · ${s.options.excludeStudentIds.length} held back` : ""}</p>
                                            </td>
                                            <td className={`${td} whitespace-nowrap`}>{fmtWhen(s.runAt)}{s.status === "scheduled" && <p className="text-[11px] text-[#5C67F2] font-semibold">{countdown(s.runAt, now)}</p>}</td>
                                            <td className={`${td} font-bold`}>{s.options?.academicYear}</td>
                                            <td className={td}><FBadge tone={st.tone}>{st.label}</FBadge>{s.error && <p className="text-[11px] text-rose-500 mt-0.5 max-w-[220px]">{s.error}</p>}</td>
                                            <td className={`${td} text-xs whitespace-nowrap`}>
                                                {r ? <>
                                                    <span className="font-semibold text-slate-700">{r.promoted} moved · {r.graduated} graduated</span>
                                                    {(r.skipped > 0 || r.changed > 0) && <p className="text-amber-600">{r.skipped} not placed{r.changed ? ` · ${r.changed} changed` : ""}</p>}
                                                    {r.streamsCreated?.length > 0 && <p className="text-violet-600">{r.streamsCreated.length} stream(s) created</p>}
                                                    {s.revertResult && <p className="text-violet-600">{s.revertResult.reverted} put back</p>}
                                                </> : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className={`${td} text-right whitespace-nowrap`}>
                                                <div className="inline-flex gap-1.5">
                                                    {["scheduled", "failed", "cancelled"].includes(s.status) && <FButton variant="secondary" size="sm" icon={Pencil} onClick={() => edit(s)}>Edit</FButton>}
                                                    {["scheduled", "failed"].includes(s.status) && <FButton variant="success" size="sm" icon={Play} loading={busy === `${s._id}:run`} onClick={() => act(s, "run")}>Run now</FButton>}
                                                    {s.status === "scheduled" && <FButton variant="ghost" size="sm" icon={Ban} loading={busy === `${s._id}:cancel`} onClick={() => act(s, "cancel")}>Cancel</FButton>}
                                                    {["completed", "reverted"].includes(s.status) && <FButton variant="secondary" size="sm" icon={ListChecks} onClick={() => setItemsFor(s)}>Learners</FButton>}
                                                    {s.status === "completed" && <FButton variant="ghost" size="sm" icon={Undo2} loading={busy === `${s._id}:revert`} onClick={() => act(s, "revert")}>Undo</FButton>}
                                                    {["scheduled", "cancelled"].includes(s.status) && <FButton variant="ghost" size="sm" icon={Trash2} loading={busy === `${s._id}:delete`} onClick={() => act(s, "delete")} />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </FTable>
                        )}
                </FCard>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Promotion map</h2>
                            <p className="text-xs text-slate-400">What would happen if every class were promoted right now.</p>
                        </div>
                        <FButton variant="secondary" size="sm" icon={RefreshCw} loading={loadingPlan} onClick={() => refetchPlan()}>Refresh</FButton>
                    </div>
                    <PlanStats plan={plan} loading={loadingPlan && !plan} />
                    <FCard bodyClassName="">
                        <PlanMap plan={plan} loading={loadingPlan && !plan} />
                        {plan?.unplaced?.length > 0 && (
                            <div className="px-5 py-3 border-t border-slate-100 text-xs text-amber-700 bg-amber-50/60">
                                <b>{plan.unplaced.length}</b> learner(s) have a class that isn't in class setup ({[...new Set(plan.unplaced.map((u: any) => u.className))].slice(0, 5).join(", ")}) and will not be moved.
                            </div>
                        )}
                    </FCard>
                </div>
            </div>

            {/* Schedule / edit */}
            <FModal open={!!form} onClose={() => setForm(null)} width="max-w-3xl"
                title={form?.id ? "Edit promotion" : "Schedule promotion"}
                subtitle="It runs by itself at the time you set. You can run it early or cancel it any time before."
                footer={<>
                    <FButton variant="secondary" onClick={() => setForm(null)}>Close</FButton>
                    <FButton icon={CalendarClock} loading={saving} onClick={save}>{form?.id ? "Save changes" : "Schedule"}</FButton>
                </>}>
                {form && (
                    <div className="space-y-5">
                        <div className="grid sm:grid-cols-3 gap-4">
                            <FField label="Name" className="sm:col-span-3"><FInput value={form.name} placeholder={`Promotion to ${form.academicYear}`} onChange={e => setForm({ ...form, name: e.target.value })} /></FField>
                            <FField label="Date & time" required className="sm:col-span-2">
                                <FInput type="datetime-local" value={form.runAt} onChange={e => { const v = e.target.value; const d = new Date(v); setForm({ ...form, runAt: v, academicYear: isNaN(d.getTime()) ? form.academicYear : targetYearFor(d) }); }} />
                            </FField>
                            <FField label="Academic year they move into" required><FInput inputMode="numeric" maxLength={4} value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value.replace(/\D/g, "") })} /></FField>
                        </div>

                        <FField label="Classes" hint="Leave all unticked to promote the whole school.">
                            <div className="flex flex-wrap gap-2 mt-1">
                                {sortedClasses.map((c: any) => {
                                    const on = form.classIds.includes(c._id);
                                    return (
                                        <button type="button" key={c._id} onClick={() => setForm({ ...form, classIds: on ? form.classIds.filter(x => x !== c._id) : [...form.classIds, c._id] })}
                                            className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${on ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>{c.name}</button>
                                    );
                                })}
                            </div>
                        </FField>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 cursor-pointer">
                                <input type="checkbox" className="mt-0.5" checked={form.createMissingStreams} onChange={e => setForm({ ...form, createMissingStreams: e.target.checked })} />
                                <span><span className="block text-sm font-semibold text-slate-800">Create missing streams</span><span className="text-xs text-slate-500">If Grade 2 has no West stream, Grade 1 West creates it. Off: those learners stay.</span></span>
                            </label>
                            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 cursor-pointer">
                                <input type="checkbox" className="mt-0.5" checked={form.graduateFinal} onChange={e => setForm({ ...form, graduateFinal: e.target.checked })} />
                                <span><span className="block text-sm font-semibold text-slate-800">Graduate the final class</span><span className="text-xs text-slate-500">Learners in the last class are marked Graduated.</span></span>
                            </label>
                        </div>

                        <FField label="Hold back (repeating learners)" hint="These learners stay in their current class.">
                            <StudentPicker multiple value={form.exclude} onChange={v => setForm({ ...form, exclude: v })} />
                        </FField>

                        <div className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</p>
                            <PlanStats plan={formPlan} loading={loadingFormPlan && !formPlan} />
                            <div className="rounded-2xl border border-slate-100 max-h-72 overflow-auto"><PlanMap plan={formPlan} loading={loadingFormPlan && !formPlan} /></div>
                        </div>
                    </div>
                )}
            </FModal>

            {/* Learners moved by a run */}
            <FModal open={!!itemsFor} onClose={() => setItemsFor(null)} width="max-w-3xl" title={itemsFor?.name || "Learners"} subtitle={itemsFor ? `Ran ${fmtWhen(itemsFor.completedAt || itemsFor.startedAt)}` : ""}>
                {loadingItems ? <FLoading /> : !items.length ? <FEmpty icon={Users} title="No learners were moved" /> : (
                    <FTable head={["Learner", "From", "To", ""]}>
                        {items.map((it: any) => (
                            <tr key={it._id}>
                                <td className={td}><p className="font-semibold text-slate-800">{it.name}</p><p className="text-[11px] text-slate-400">{it.adm}</p></td>
                                <td className={td}>{it.from?.label}</td>
                                <td className={td}>{it.action === "graduate" ? <FBadge tone="amber">Graduated</FBadge> : it.to?.label}</td>
                                <td className={td}>{it.revertedAt && <FBadge tone="violet">Put back</FBadge>}</td>
                            </tr>
                        ))}
                    </FTable>
                )}
            </FModal>
        </div>
    );
}
