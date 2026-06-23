import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Send, Info, MessageSquare, Paperclip, Clock, FileDown } from "lucide-react";
import { toast } from "sonner";
import { reqApi, statusStyle, PRIORITY_STYLES, ksh } from "@/lib/requestsApi";
import { Badge } from "./RequestsList";
import { useSchoolBrand, printBranded } from "@/lib/printDoc";

const PURPLE = "#5C67F2";

export default function RequestDetail() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const school = useSchoolBrand();
    const { data: r, isLoading } = useQuery({ queryKey: ["request", id], queryFn: () => reqApi.get(id) });
    const { data: offices = [] } = useQuery({ queryKey: ["req_offices"], queryFn: reqApi.offices });
    const { data: supervisors = [] } = useQuery({ queryKey: ["req_supervisors_d"], queryFn: reqApi.supervisors });
    const { data: me } = useQuery({ queryKey: ["req_stats_me"], queryFn: reqApi.stats });

    const [comment, setComment] = useState("");
    const [forwardTo, setForwardTo] = useState("");
    const [forwardUser, setForwardUser] = useState("");
    const [newComment, setNewComment] = useState("");

    const refresh = () => { qc.invalidateQueries({ queryKey: ["request", id] }); qc.invalidateQueries({ queryKey: ["requests"] }); qc.invalidateQueries({ queryKey: ["req_count"] }); };
    const act = (fn: () => Promise<any>, ok: string) => { fn().then(() => { toast.success(ok); setComment(""); setForwardTo(""); setForwardUser(""); refresh(); }).catch((e: any) => toast.error(e?.response?.data?.message || "Action failed")); };

    const approve = useMutation({ mutationFn: () => reqApi.approve(id, { comment, forwardTo: forwardTo || undefined, forwardUserId: forwardUser || undefined }) });
    const reject = useMutation({ mutationFn: () => reqApi.reject(id, comment) });
    const forward = useMutation({ mutationFn: () => reqApi.forward(id, { forwardTo: forwardTo || undefined, forwardUserId: forwardUser || undefined, comment }) });
    const info = useMutation({ mutationFn: () => reqApi.requestInfo(id, comment) });
    const stage = (a: string) => reqApi.stage(id, a, { comment });
    const complete = useMutation({ mutationFn: () => reqApi.complete(id, comment) });
    const postComment = useMutation({ mutationFn: () => reqApi.comment(id, newComment), onSuccess: () => { setNewComment(""); refresh(); } });

    if (isLoading || !r) return <div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

    const office = (me?.office || "").toLowerCase();
    const isProcurement = /procure/.test(office);
    const isFinance = /finance/.test(office);
    const closed = ["Completed", "Rejected", "Cancelled"].includes(r.status);
    const canAct = !closed; // backend is the source of truth; UI offers actions for open requests

    const printRequest = () => {
        const body = `
            <table><tbody>
            <tr><td class="lbl">Request No</td><td>${r.number}</td><td class="lbl">Status</td><td>${r.status}</td></tr>
            <tr><td class="lbl">Title</td><td colspan="3">${r.title}</td></tr>
            <tr><td class="lbl">Category</td><td>${r.category}</td><td class="lbl">Priority</td><td>${r.priority}</td></tr>
            <tr><td class="lbl">Requester</td><td>${r.requesterName || ""}</td><td class="lbl">Department</td><td>${r.department || "—"}</td></tr>
            <tr><td class="lbl">Quantity</td><td>${r.quantity ?? "—"}</td><td class="lbl">Estimated Cost</td><td>${ksh(r.estimatedCost)}</td></tr>
            <tr><td class="lbl">Description</td><td colspan="3">${r.description || "—"}</td></tr>
            </tbody></table>
            <div class="title" style="margin-top:18px">Approval Timeline</div>
            <table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Status</th><th>Note</th></tr></thead><tbody>
            ${r.history.map(h => `<tr><td>${new Date(h.at).toLocaleString("en-GB")}</td><td>${h.byName} ${h.office ? "(" + h.office + ")" : ""}</td><td>${h.action}</td><td>${h.toStatus}</td><td>${h.note || ""}</td></tr>`).join("")}
            </tbody></table>`;
        printBranded(school, `Request ${r.number}`, body, "#5C67F2");
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4" /> Back</button>
                <button onClick={printRequest} className="flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm"><FileDown className="w-4 h-4" /> Print / PDF</button>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
                {/* Main */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <span className="font-mono text-[11px] text-slate-400">{r.number}</span>
                                <h1 className="text-xl font-black text-slate-900">{r.title}</h1>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge text={r.status} map={{}} />
                                <Badge text={r.priority} map={PRIORITY_STYLES} />
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3 text-sm">
                            <Info2 label="Requester" value={r.requesterName} />
                            <Info2 label="Department" value={r.department || "—"} />
                            <Info2 label="Category" value={r.category} />
                            <Info2 label="Quantity" value={r.quantity ?? "—"} />
                            <Info2 label="Estimated Cost" value={ksh(r.estimatedCost)} />
                            <Info2 label="Current owner" value={r.currentOwnerName || r.currentOffice || "—"} />
                        </div>
                        {r.description && <p className="mt-4 text-sm text-slate-600 whitespace-pre-wrap">{r.description}</p>}
                        {r.rejectedReason && <div className="mt-3 bg-rose-50 text-rose-700 rounded-lg px-3 py-2 text-sm"><b>Rejected:</b> {r.rejectedReason}</div>}

                        {!!r.attachments?.length && (
                            <div className="mt-4">
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">Attachments</p>
                                <div className="flex flex-wrap gap-2">
                                    {r.attachments.map((a, i) => (
                                        <a key={i} href={a.url} download={a.name} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">
                                            <Paperclip className="w-3.5 h-3.5" /> {a.name}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comments</h3>
                        <div className="space-y-3 mb-4">
                            {r.comments.length === 0 && <p className="text-xs text-slate-400">No comments yet.</p>}
                            {r.comments.map((c, i) => (
                                <div key={i} className="border-l-2 border-slate-100 pl-3">
                                    <div className="flex items-center gap-2 text-xs"><span className="font-black text-slate-700">{c.byName}</span>{c.office && <span className="text-slate-400">· {c.office}</span>}<span className="text-slate-300">{new Date(c.at).toLocaleString("en-GB")}</span></div>
                                    <p className="text-sm text-slate-600">{c.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment…" className="inp flex-1" />
                            <button onClick={() => newComment && postComment.mutate()} className="h-11 px-4 rounded-xl text-white font-bold text-sm" style={{ background: PURPLE }}>Post</button>
                        </div>
                    </div>
                </div>

                {/* Side: timeline + actions */}
                <div className="space-y-5">
                    {canAct && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5">
                            <h3 className="text-sm font-black text-slate-700 mb-3">Take action</h3>
                            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Comment (required for reject / info)…" className="inp mb-3" />
                            <div className="mb-3">
                                <label className="block text-[11px] font-black text-slate-400 uppercase mb-1">Forward to (optional)</label>
                                <select value={forwardTo} onChange={e => { setForwardTo(e.target.value); setForwardUser(""); }} className="inp mb-2">
                                    <option value="">— Office —</option>
                                    {offices.map((o: any) => <option key={o._id} value={o.name}>{o.name} Office</option>)}
                                </select>
                                <select value={forwardUser} onChange={e => { setForwardUser(e.target.value); setForwardTo(""); }} className="inp">
                                    <option value="">— Or a specific user —</option>
                                    {supervisors.map((s: any) => <option key={s._id} value={s._id}>{s.name}{s.role ? ` – ${s.role}` : ""}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => act(() => approve.mutateAsync(), forwardTo || forwardUser ? "Approved & forwarded" : "Approved")} className="h-10 rounded-lg bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {forwardTo || forwardUser ? "Approve + Forward" : "Approve"}</button>
                                <button onClick={() => { if (!comment) return toast.error("Reason required"); act(() => reject.mutateAsync(), "Rejected"); }} className="h-10 rounded-lg bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4" /> Reject</button>
                                <button onClick={() => { if (!forwardTo && !forwardUser) return toast.error("Choose a destination"); act(() => forward.mutateAsync(), "Forwarded"); }} className="h-10 rounded-lg bg-purple-500 text-white font-bold text-sm flex items-center justify-center gap-1.5"><Send className="w-4 h-4" /> Forward</button>
                                <button onClick={() => { if (!comment) return toast.error("Say what you need"); act(() => info.mutateAsync(), "Info requested"); }} className="h-10 rounded-lg bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-1.5"><Info className="w-4 h-4" /> Need Info</button>
                            </div>

                            {isProcurement && (
                                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                                    <StageBtn label="Request Quotation" onClick={() => act(() => stage("request-quotation"), "Quotation requested")} />
                                    <StageBtn label="Mark Ordered" onClick={() => act(() => stage("mark-ordered"), "Marked ordered")} />
                                    <StageBtn label="Mark Purchased" onClick={() => act(() => stage("mark-purchased"), "Marked purchased")} />
                                </div>
                            )}
                            {isFinance && (
                                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                                    <StageBtn label="Approve Budget" onClick={() => act(() => stage("approve-budget"), "Budget approved")} />
                                    <StageBtn label="Approve Payment" onClick={() => act(() => stage("approve-payment"), "Payment approved")} />
                                    <StageBtn label="Mark Paid" onClick={() => act(() => stage("mark-paid"), "Marked paid")} />
                                </div>
                            )}
                            <button onClick={() => act(() => complete.mutateAsync(), "Completed")} className="mt-3 w-full h-10 rounded-lg bg-[#14532d] text-white font-bold text-sm">Mark Completed</button>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Approval Timeline</h3>
                        <div className="space-y-0">
                            {r.history.map((h, i) => {
                                const s = statusStyle(h.toStatus);
                                return (
                                    <div key={i} className="relative pl-5 pb-4 last:pb-0">
                                        <span className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full" style={{ background: s.fg }} />
                                        {i < r.history.length - 1 && <span className="absolute left-[4px] top-3 bottom-0 w-px bg-slate-200" />}
                                        <div className="text-xs font-black text-slate-700">{h.byName}{h.office ? ` · ${h.office}` : ""}</div>
                                        <div className="text-[11px] text-slate-500">{h.note || h.action} → <b style={{ color: s.fg }}>{h.toStatus}</b></div>
                                        <div className="text-[10px] text-slate-300">{new Date(h.at).toLocaleString("en-GB")}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Info2({ label, value }: { label: string; value: any }) {
    return <div><span className="block text-[10px] font-black text-slate-400 uppercase">{label}</span><span className="font-bold text-slate-700">{value}</span></div>;
}
function StageBtn({ label, onClick }: { label: string; onClick: () => void }) {
    return <button onClick={onClick} className="h-9 rounded-lg border border-slate-200 text-slate-600 font-bold text-[12px]">{label}</button>;
}
