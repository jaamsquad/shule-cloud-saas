import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Layers, CheckCircle2, AlertTriangle, Loader2, RefreshCw, Play, Users, Receipt, ChevronDown, ChevronUp, Settings2, CalendarClock, Mail,
} from "lucide-react";
import api from "@/lib/api";
import { FeesPage, FCard, FStat, FBadge, FButton, FField, FInput, FModal, FEmpty, FLoading, money, Tone } from "@/components/fees/FeesUI";
import { useTerms, TermPicker } from "@/components/fees/TermPicker";

// Generate term invoices for whole classes. Each learner is billed from the fee structure
// set for THEIR class and THIS term (never another term's), with transport by zone and
// tuition by class — the same rules as "Per Student".

const jobTone = (s: string): Tone => (s === "COMPLETED" ? "emerald" : s === "FAILED" ? "rose" : s === "RUNNING" || s === "PENDING" ? "indigo" : "slate");
const in14 = () => new Date(Date.now() + 14 * 864e5).toISOString().split("T")[0];

function JobCard({ job }: { job: any }) {
    const [open, setOpen] = useState(false);
    const errs: any[] = job.errors || [];
    const running = job.status === "RUNNING" || job.status === "PENDING";
    return (
        <div className="rounded-xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{[job.term_label, job.year_label].filter(Boolean).join(" · ") || "Term run"}</p>
                    <p className="text-xs text-slate-500 truncate" title={(job.class_ids || []).join(", ")}>{(job.class_ids || []).join(", ")}</p>
                </div>
                <FBadge tone={jobTone(job.status)}>{running && <Loader2 className="w-3 h-3 animate-spin" />}{job.status?.toLowerCase()}</FBadge>
            </div>
            <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1"><span>{job.processed_count || 0} of {job.total_count || 0} learners</span><span>{job.progress || 0}%</span></div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full transition-all ${job.status === "FAILED" ? "bg-rose-500" : job.status === "COMPLETED" ? "bg-emerald-500" : "bg-[#5C67F2]"}`} style={{ width: `${job.progress || 0}%` }} /></div>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center">
                {[["Created", job.created_count ?? (job.status === "COMPLETED" ? job.total_count : 0), "text-emerald-600"], ["Skipped", job.skipped_count || 0, "text-slate-600"], ["Replaced", job.replaced_count || 0, "text-amber-600"], ["Problems", job.failed_count ?? errs.length, errs.length ? "text-rose-600" : "text-slate-600"]].map(([l, v, c]) => (
                    <div key={l as string} className="rounded-lg bg-slate-50 py-1.5"><p className={`text-sm font-extrabold ${c}`}>{v as any}</p><p className="text-[10px] text-slate-400">{l}</p></div>
                ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{new Date(job.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{job.duration_ms ? ` · ${(job.duration_ms / 1000).toFixed(1)}s` : ""}</span>
                {job.total_billed > 0 && <span className="font-semibold text-slate-600">Billed {money(job.total_billed)}</span>}
            </div>
            {errs.length > 0 && (
                <div>
                    <button onClick={() => setOpen(o => !o)} className="text-xs font-semibold text-rose-600 flex items-center gap-1">{open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} {errs.length} learner(s) not invoiced</button>
                    {open && (
                        <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                            {errs.map((e, i) => <p key={i} className="text-[11px] text-slate-600"><b>{e.student_name || "—"}</b>{e.class_name ? ` (${e.class_name})` : ""}: {e.message}</p>)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function GenerateFeesInvoice() {
    const qc = useQueryClient();
    const t = useTerms();
    const [selected, setSelected] = useState<string[]>([]);
    const [dueDate, setDueDate] = useState(in14());
    const [fine, setFine] = useState("0");
    const [notify, setNotify] = useState(false);
    const [busy, setBusy] = useState(false);
    const [dup, setDup] = useState<{ totalStudents: number; existing: number } | null>(null);

    const { data: cov, isLoading: loadingCov, refetch: refetchCov } = useQuery<any>({
        queryKey: ["term_coverage", t.yearId, t.termId], enabled: !!t.yearId && !!t.termId,
        queryFn: async () => (await api.get("/schools/default/fees/term-coverage", { params: { academic_year_id: t.yearId, semester_id: t.termId } })).data?.data,
    });
    const rows: any[] = cov?.classes || [];
    const { data: jobs = [], refetch: refetchJobs } = useQuery<any[]>({
        queryKey: ["invoice_generation_jobs"],
        queryFn: async () => (await api.get("/schools/default/fees/invoice-jobs")).data?.data || [],
        refetchInterval: q => ((q.state.data as any[] | undefined)?.some(j => j.status === "RUNNING" || j.status === "PENDING") ? 2000 : false),
    });
    const anyRunning = jobs.some(j => j.status === "RUNNING" || j.status === "PENDING");
    useEffect(() => { if (!anyRunning) { refetchCov(); qc.invalidateQueries({ queryKey: ["generated_invoices"] }); } }, [anyRunning]); // eslint-disable-line
    useEffect(() => { setSelected([]); }, [t.yearId, t.termId]);

    const ready = rows.filter(r => r.structure && r.students > 0);
    const chosen = rows.filter(r => selected.includes(r.className));
    const sum = useMemo(() => chosen.reduce((m, r) => {
        const todo = Math.max(0, r.students - r.invoiced);
        m.learners += r.students; m.todo += r.structure ? todo : 0; m.problems += r.structure ? 0 : r.students;
        m.amount += r.structure ? todo * (r.structure.total || 0) : 0;
        return m;
    }, { learners: 0, todo: 0, problems: 0, amount: 0 }), [chosen]);
    const toggle = (c: string) => setSelected(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]);

    const run = async (mode: "skip" | "overwrite") => {
        setBusy(true); setDup(null);
        try {
            await api.post("/schools/default/fees/invoice-jobs", { academic_year_id: t.yearId, semester_id: t.termId, class_ids: selected, due_date: dueDate, fine_amount: parseFloat(fine) || 0, mode, notify_parents: notify });
            toast.success(`Generating invoices for ${t.label} — progress shows on the right.`);
            setSelected([]); refetchJobs();
        } catch (e: any) { toast.error(e.response?.data?.errors?.[0]?.message || "Could not start"); }
        finally { setBusy(false); }
    };
    const start = async () => {
        if (!selected.length) return toast.error("Tick at least one class");
        setBusy(true);
        try {
            const r = await api.post("/schools/default/fees/invoice-jobs/precheck", { academic_year_id: t.yearId, semester_id: t.termId, class_ids: selected });
            const info = r.data?.data || { totalStudents: 0, existing: 0 };
            setBusy(false);
            if (info.existing > 0) return setDup(info);
            run("skip");
        } catch (e: any) { setBusy(false); toast.error(e.response?.data?.errors?.[0]?.message || "Could not check existing invoices"); }
    };

    return (
        <FeesPage wide title="Generate Invoices" icon={Layers}
            subtitle="Bill whole classes for a term. Each learner gets the fee structure set for their class and that term."
            actions={<TermPicker t={t} />}>
            <div className="grid xl:grid-cols-[1fr_380px] gap-5">
                <div className="space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <FStat label="Classes ready" value={`${ready.length}/${rows.length}`} icon={CheckCircle2} tone="emerald" loading={loadingCov} hint="have a fee structure" />
                        <FStat label="Learners" value={rows.reduce((s, r) => s + r.students, 0)} icon={Users} loading={loadingCov} hint="active in all classes" />
                        <FStat label="Already invoiced" value={rows.reduce((s, r) => s + r.invoiced, 0)} icon={Receipt} tone="sky" loading={loadingCov} hint={t.label} />
                        <FStat label="Need a structure" value={rows.filter(r => !r.structure && r.students > 0).length} icon={AlertTriangle} tone={rows.some(r => !r.structure && r.students > 0) ? "rose" : "slate"} loading={loadingCov} hint="classes with learners" />
                    </div>

                    <FCard title="1 · Choose classes" subtitle={t.label ? `Fee structures for ${t.label}` : "Pick a term"} icon={Users} bodyClassName="p-0"
                        actions={<div className="flex gap-1.5">
                            <FButton size="sm" variant="ghost" onClick={() => setSelected(ready.filter(r => r.invoiced < r.students).map(r => r.className))}>Select not invoiced</FButton>
                            <FButton size="sm" variant="ghost" onClick={() => setSelected(selected.length ? [] : ready.map(r => r.className))}>{selected.length ? "Clear" : "Select all ready"}</FButton>
                        </div>}>
                        {loadingCov || t.loading ? <FLoading /> : !rows.length ? <FEmpty icon={Users} title="No classes yet" hint={<Link to="/classes" className="text-[#5C67F2] underline">Create classes</Link>} /> : (
                            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                                {rows.map(r => {
                                    const on = selected.includes(r.className);
                                    const pct = r.students ? Math.round((r.invoiced / r.students) * 100) : 0;
                                    const disabled = !r.students;
                                    return (
                                        <label key={r.className} className={`flex items-center gap-3 px-5 py-3 ${disabled ? "opacity-50" : "cursor-pointer hover:bg-slate-50/70"} ${on ? "bg-indigo-50/50" : ""}`}>
                                            <input type="checkbox" disabled={disabled} checked={on} onChange={() => toggle(r.className)} className="w-4 h-4 accent-[#5C67F2]" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800">{r.className}</p>
                                                {r.structure
                                                    ? <p className="text-xs text-slate-500 truncate">{r.structure.name} · <b className="text-slate-700">{money(r.structure.total)}</b> <span className="text-slate-400">· {r.structure.how}</span></p>
                                                    : <p className="text-xs text-rose-600 font-medium">{r.students ? r.problem : "No active learners"} {r.students > 0 && <Link to="/settings/fees-structure" className="underline" onClick={e => e.stopPropagation()}>Set one up</Link>}</p>}
                                            </div>
                                            <div className="w-36 shrink-0 hidden sm:block">
                                                <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>{r.invoiced}/{r.students} invoiced</span><span>{pct}%</span></div>
                                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#5C67F2]"}`} style={{ width: `${pct}%` }} /></div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </FCard>

                    <FCard title="2 · Invoice settings" icon={Settings2}>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <FField label="Due date" required><FInput type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></FField>
                            <FField label="Overdue fine (KSh)" hint="Recorded on the invoice"><FInput type="number" min={0} value={fine} onChange={e => setFine(e.target.value)} /></FField>
                            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 cursor-pointer self-end">
                                <input type="checkbox" className="mt-0.5" checked={notify} onChange={e => setNotify(e.target.checked)} />
                                <span><span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email parents</span><span className="text-xs text-slate-500">Send each invoice to the parent's email</span></span>
                            </label>
                        </div>
                        <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-sm text-slate-600">
                                {selected.length ? <>
                                    <b className="text-slate-800">{sum.todo}</b> new invoice{sum.todo === 1 ? "" : "s"} for <b className="text-slate-800">{selected.length}</b> class{selected.length === 1 ? "" : "es"} · about <b className="text-slate-800">{money(sum.amount)}</b>
                                    {sum.problems > 0 && <p className="text-xs text-rose-600 mt-0.5">{sum.problems} learner(s) in classes without a structure will be listed as problems.</p>}
                                    <p className="text-xs text-slate-400 mt-0.5">Scholarships and carried-over credit are applied automatically.</p>
                                </> : "Tick the classes to bill."}
                            </div>
                            <FButton icon={Play} loading={busy} disabled={!selected.length || !t.termId || anyRunning} onClick={start}>
                                {anyRunning ? "A run is in progress…" : `Generate for ${t.term?.name || "term"}`}
                            </FButton>
                        </div>
                    </FCard>
                </div>

                <FCard title="Runs" subtitle="Progress and results" icon={CalendarClock} actions={<FButton size="sm" variant="ghost" icon={RefreshCw} onClick={() => refetchJobs()} />}>
                    {!jobs.length ? <FEmpty icon={CalendarClock} title="No runs yet" hint="Each class-wide run shows here with what it created." /> : (
                        <div className="space-y-3 max-h-[780px] overflow-y-auto pr-1">{jobs.map(j => <JobCard key={j.id || j._id} job={j} />)}</div>
                    )}
                </FCard>
            </div>

            <FModal open={!!dup} onClose={() => setDup(null)} title="Some learners already have this term's invoice"
                subtitle={dup ? `${dup.existing} of ${dup.totalStudents} learners in the chosen classes are already invoiced for ${t.label}.` : ""}
                footer={<FButton variant="secondary" onClick={() => setDup(null)}>Cancel</FButton>}>
                <div className="space-y-3">
                    <button onClick={() => run("skip")} disabled={busy} className="w-full text-left rounded-xl border-2 border-[#5C67F2] bg-indigo-50/50 p-4">
                        <p className="text-sm font-bold text-slate-800">Skip them — invoice only the rest (recommended)</p>
                        <p className="text-xs text-slate-500 mt-0.5">Existing invoices stay exactly as they are.</p>
                    </button>
                    <button onClick={() => { if (confirm("Replace existing unpaid invoices for this term?")) run("overwrite"); }} disabled={busy} className="w-full text-left rounded-xl border border-rose-200 p-4 hover:bg-rose-50">
                        <p className="text-sm font-bold text-rose-700">Replace them with fresh invoices</p>
                        <p className="text-xs text-slate-500 mt-0.5">Old invoices are voided. Any invoice that already has a payment is never replaced.</p>
                    </button>
                </div>
            </FModal>
        </FeesPage>
    );
}
