import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Home, Loader2, Search, ArrowLeft, ShieldCheck, Undo2, XCircle, Lock, Unlock, ClipboardCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

const STATUS_BADGE: Record<string, string> = {
    Submitted: "bg-blue-100 text-blue-700", Approved: "bg-emerald-100 text-emerald-700",
    Returned: "bg-amber-100 text-amber-700", Rejected: "bg-rose-100 text-rose-700",
    Resubmitted: "bg-violet-100 text-violet-700", Locked: "bg-slate-800 text-white", Draft: "bg-slate-100 text-slate-500",
    Unlocked: "bg-slate-100 text-slate-600",
};
const Badge = ({ s }: { s: string }) => <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_BADGE[s] || "bg-slate-100 text-slate-500"}`}>{s}</span>;

const TABS = ["Submitted", "Returned", "Rejected", "Approved", "Locked", "All"] as const;

function Breadcrumb({ trail }: { trail: string }) {
    return (
        <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
            <span className="font-bold text-gray-800 text-sm mr-2">Marks Approval</span>
            <span className="text-gray-300 mx-2">|</span>
            <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
            <span className="text-gray-500 font-medium text-sm">- {trail}</span>
        </div>
    );
}

// ── List: every marks batch teachers have submitted ──────────────────────────
export function MarksApprovalList() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<(typeof TABS)[number]>("Submitted");
    const [search, setSearch] = useState("");

    const { data: batches = [], isLoading } = useQuery<any[]>({
        queryKey: ["marks_approvals"],
        queryFn: async () => { const r = await api.get("/mark-approvals"); return Array.isArray(r.data) ? r.data : []; },
    });

    const counts = useMemo(() => {
        const c: Record<string, number> = { All: batches.length };
        batches.forEach(b => { c[b.status] = (c[b.status] || 0) + 1; });
        return c;
    }, [batches]);

    const rows = batches.filter(b => {
        if (tab !== "All" && b.status !== tab) return false;
        const q = search.trim().toLowerCase();
        return !q || `${b.subject} ${b.examName} ${b.className} ${b.submittedBy}`.toLowerCase().includes(q);
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <Breadcrumb trail="Review & approve" />
            <div className="p-6 pt-0 w-full space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        {TABS.map(t => (
                            <button key={t} onClick={() => setTab(t)} className={`h-9 px-4 rounded-full text-xs font-bold transition-colors ${tab === t ? "bg-[#5C67F2] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-[#5C67F2]"}`}>
                                {t} <span className={tab === t ? "text-white/70" : "text-gray-400"}>{counts[t] || 0}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject, exam, teacher…" className="h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white w-full md:w-72" />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                {["Subject", "Exam", "Class", "Submitted by", "Entries", "Status", ""].map(h => <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} className="p-10 text-center"><Loader2 className="w-7 h-7 animate-spin text-[#5C67F2] mx-auto" /></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center text-sm font-bold text-gray-400">{tab === "Submitted" ? "Nothing is waiting for approval." : `No ${tab === "All" ? "" : tab.toLowerCase() + " "}marks.`}</td></tr>
                            ) : rows.map(b => (
                                <tr key={b._id} onClick={() => navigate(`/marks-approval/${b._id}`)} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors">
                                    <td className="p-4 text-sm font-bold text-gray-800">{b.subject}</td>
                                    <td className="p-4 text-xs text-gray-600">{b.examName || "—"}</td>
                                    <td className="p-4 text-xs text-gray-600">{b.className || "—"}</td>
                                    <td className="p-4 text-xs text-gray-600">{b.submittedBy || "—"}{b.submittedAt ? <div className="text-[10px] text-gray-400">{new Date(b.submittedAt).toLocaleDateString()}</div> : null}</td>
                                    <td className="p-4 text-xs font-bold text-gray-700">{b.entries ?? 0}</td>
                                    <td className="p-4"><Badge s={b.status} /></td>
                                    <td className="p-4 text-right"><Link to={`/marks-approval/${b._id}`} onClick={e => e.stopPropagation()} className="text-xs font-black text-[#5C67F2] hover:underline">Review →</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Review one batch: see the marks, then approve / return / reject / lock ────
export function MarksApprovalReview() {
    const { id } = useParams();
    const qc = useQueryClient();
    const [note, setNote] = useState("");

    const { data, isLoading, error } = useQuery({
        queryKey: ["marks_approval", id],
        queryFn: async () => (await api.get(`/mark-approvals/${id}`)).data,
        enabled: !!id,
    });

    const act = useMutation({
        mutationFn: async (action: string) => (await api.patch(`/mark-approvals/${id}/${action}`, { note: note.trim() })).data,
        onSuccess: (res) => {
            toast.success(res?.message || "Updated");
            setNote("");
            qc.invalidateQueries({ queryKey: ["marks_approval", id] });
            qc.invalidateQueries({ queryKey: ["marks_approvals"] });
            qc.invalidateQueries({ queryKey: ["dashboard_pending_marks"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Action failed"),
    });

    // Return / Reject go back to the teacher, so they need to know why.
    const run = (action: "approve" | "return" | "reject" | "lock" | "unlock") => {
        if ((action === "return" || action === "reject") && !note.trim()) { toast.error(`Add a note so the teacher knows why you're ${action === "return" ? "returning" : "rejecting"} these marks.`); return; }
        if (action === "reject" && !confirm("Reject these marks? The teacher will be emailed.")) return;
        act.mutate(action);
    };

    if (isLoading) return <div className="flex-1 bg-[#f4f7f6] min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>;
    if (error || !data) {
        return (
            <div className="flex-1 bg-[#f4f7f6] min-h-screen flex items-center justify-center">
                <div className="bg-white p-10 rounded-2xl shadow text-center space-y-3 border border-gray-100">
                    <p className="font-black text-slate-800">Couldn't open these marks</p>
                    <p className="text-sm text-slate-500">{(error as any)?.response?.data?.message || "They may have been removed, or you may not have access."}</p>
                    <Link to="/marks-approval" className="inline-block text-sm font-bold text-[#5C67F2] hover:underline">← Back to list</Link>
                </div>
            </div>
        );
    }

    const { batch, marks, stats } = data;
    const status: string = batch.status;
    const locked = status === "Locked", approved = status === "Approved";
    const btn = "h-10 px-5 rounded-full text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50";

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <Breadcrumb trail={`${batch.subject} — ${batch.examName || "Exam"}`} />
            <div className="p-6 pt-0 w-full space-y-5">
                <Link to="/marks-approval" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#5C67F2]"><ArrowLeft className="w-3.5 h-3.5" /> All submissions</Link>

                {/* Header + actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><ClipboardCheck className="w-6 h-6" /></div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-xl font-black text-gray-800">{batch.subject}</h2>
                                    <Badge s={status} />
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{[batch.examName, batch.className].filter(Boolean).join(" · ") || "—"}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Submitted by {batch.submittedBy || "—"}{batch.submittedAt ? ` on ${new Date(batch.submittedAt).toLocaleString()}` : ""}</p>
                            </div>
                        </div>

                        <div className="w-full lg:w-[420px] space-y-3">
                            {!locked && (
                                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Note to the teacher (required to return or reject)"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm bg-white text-gray-700 resize-none" />
                            )}
                            <div className="flex flex-wrap gap-2">
                                {!approved && !locked && (
                                    <button onClick={() => run("approve")} disabled={act.isPending} className={`${btn} bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm`}><ShieldCheck className="w-4 h-4" /> Approve</button>
                                )}
                                {!locked && (
                                    <button onClick={() => run("return")} disabled={act.isPending} className={`${btn} bg-white border border-amber-300 text-amber-700 hover:bg-amber-50`}><Undo2 className="w-4 h-4" /> Return</button>
                                )}
                                {!approved && !locked && (
                                    <button onClick={() => run("reject")} disabled={act.isPending} className={`${btn} bg-white border border-rose-300 text-rose-600 hover:bg-rose-50`}><XCircle className="w-4 h-4" /> Reject</button>
                                )}
                                {approved && (
                                    <button onClick={() => run("lock")} disabled={act.isPending} className={`${btn} bg-slate-800 hover:bg-slate-900 text-white shadow-sm`}><Lock className="w-4 h-4" /> Lock</button>
                                )}
                                {locked && (
                                    <button onClick={() => run("unlock")} disabled={act.isPending} className={`${btn} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}><Unlock className="w-4 h-4" /> Unlock</button>
                                )}
                                {act.isPending && <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2] self-center" />}
                            </div>
                            <p className="text-[11px] text-gray-400">
                                {locked ? "Locked — teachers can't change these marks until you unlock them."
                                    : approved ? "Approved — students can see these marks. Lock them to stop any further edits."
                                    : "Approve makes the marks visible to students. Return or Reject sends them back to the teacher with your note."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[["Entries", stats.count], ["Mean", stats.mean != null ? `${stats.mean}%` : "—"], ["Highest", stats.highest != null ? `${stats.highest}%` : "—"], ["Lowest", stats.lowest != null ? `${stats.lowest}%` : "—"]].map(([l, v]) => (
                        <div key={l as string} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <div className="text-2xl font-black text-gray-800">{v}</div>
                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{l}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    {/* Marks */}
                    <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="max-h-[60vh] overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-50">
                                    <tr>{["#", "Student", "Reg no.", "Class", "Marks", "Out of", "%"].map(h => <th key={h} className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {marks.length === 0 ? (
                                        <tr><td colSpan={7} className="p-10 text-center text-sm font-bold text-gray-400">No marks have been entered.</td></tr>
                                    ) : marks.map((m: any, i: number) => (
                                        <tr key={m.studentId} className="border-b border-gray-50">
                                            <td className="p-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="p-3 text-sm font-bold text-gray-800">{m.name}</td>
                                            <td className="p-3 text-xs text-gray-600">{m.regNo || "—"}</td>
                                            <td className="p-3 text-xs text-gray-600">{m.className || "—"}</td>
                                            <td className="p-3 text-sm font-black text-[#5C67F2]">{m.marksObtained ?? "—"}</td>
                                            <td className="p-3 text-xs text-gray-500">{m.totalMarks}</td>
                                            <td className="p-3 text-xs font-bold text-gray-700">{m.percentage != null ? `${m.percentage}%` : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* History */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-black text-gray-800 text-sm mb-3">History</h3>
                        {(batch.history || []).length === 0 ? <p className="text-xs text-gray-400">No activity yet.</p> : (
                            <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                                {batch.history.map((h: any, i: number) => (
                                    <div key={i} className="border-l-2 border-gray-100 pl-3">
                                        <div className="flex items-center gap-2"><Badge s={h.action} /><span className="text-xs font-bold text-gray-700">{h.by}</span></div>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{new Date(h.at).toLocaleString()}</p>
                                        {h.note && <p className="text-xs text-gray-600 mt-1">“{h.note}”</p>}
                                        {Array.isArray(h.changes) && h.changes.length > 0 && (
                                            <div className="mt-1.5 rounded-lg bg-violet-50/70 border border-violet-100 p-2 space-y-0.5">
                                                <p className="text-[9px] font-black uppercase tracking-wider text-violet-500">Marks changed</p>
                                                {h.changes.map((c: any, j: number) => (
                                                    <div key={j} className="flex items-center justify-between gap-2 text-[11px]">
                                                        <span className="font-semibold text-slate-600 truncate">{c.name}</span>
                                                        <span className="font-mono font-bold shrink-0"><span className="text-slate-400">{c.from ?? "—"}</span><span className="text-slate-300 mx-1">→</span><span className="text-violet-700">{c.to}</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
