import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Save, PencilLine, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";
import { useAssignments, pairKey, parsePair } from "../useAssignments";

export default function StaffMarksEntry() {
    const { api } = useOutletContext<StaffCtx>();
    const { data: assign } = useAssignments();
    const pairs = assign?.assignments || [];

    const [examId, setExamId] = useState("");
    const [pair, setPair] = useState("");
    const [paperId, setPaperId] = useState("");
    const [rows, setRows] = useState<any[]>([]);

    // Marks entry is open for this term's exams only (the server lists only those).
    const { data: win } = useQuery<any>({
        queryKey: ["staff_marks_window"],
        queryFn: async () => (await api.get("/staff-portal/marks-window")).data,
    });
    const { data: exams = [] } = useQuery({
        queryKey: ["staff_exams"],
        queryFn: async () => (await api.get("/staff-portal/exams")).data,
        retry: false,
    });

    const { className, subject } = pair ? parsePair(pair) : { className: "", subject: "" };
    useEffect(() => { setPaperId(""); }, [pair]);

    const { data: roster, isFetching, refetch } = useQuery({
        queryKey: ["staff_roster", examId, pair, paperId],
        queryFn: async () => (await api.get(`/staff-portal/roster?examId=${examId}&className=${encodeURIComponent(className)}&subject=${encodeURIComponent(subject)}${paperId ? `&paperId=${paperId}` : ""}`)).data,
        enabled: !!examId && !!pair,
        retry: false,
    });
    const papers: { _id: string; label: string; outOf: number }[] = roster?.papers || [];
    const paper = papers.find(p => p._id === paperId);

    useEffect(() => { if (roster) setRows((roster.rows || []).map((r: any) => ({ ...r }))); }, [roster]);

    const exam = exams.find((e: any) => e._id === examId);
    // A configured paper is marked out of its own total; otherwise the exam's Total Marks setting.
    const outOf = paper ? paper.outOf : (Number(exam?.totalMarks) || 100);

    // Approval status of this (exam × subject) — locked marks can't be edited.
    const { data: markStatus, refetch: refetchStatus } = useQuery({
        queryKey: ["staff_marks_status", examId, subject],
        enabled: !!examId && !!subject,
        queryFn: async () => (await api.get(`/staff-portal/marks-status`, { params: { examId, subject } })).data,
    });
    const isLocked = !!markStatus?.locked;
    const statusLabel = markStatus?.status || "";
    // Submitted marks are pending approval; editing them re-submits for re-approval.
    const isSubmitted = statusLabel === "Submitted";
    const isApproved = statusLabel === "Approved";

    const save = useMutation({
        mutationFn: async () => (await api.post("/staff-portal/marks", {
            examId, examName: exam?.name, term: exam?.term, className, subject, outOf,
            paperId: paperId || undefined, paperLabel: paper?.label,
            marks: rows.map(r => ({ studentId: r.studentId, marks: r.marks })),
        })).data,
        onSuccess: (d: any) => {
            toast.success(d.resubmitted ? "Saved — changes resent for approval" : (d.message || "Saved"));
            refetch(); refetchStatus();
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });

    // Submit the saved marks to the HOD/admin approval queue.
    const submit = useMutation({
        mutationFn: async () => (await api.post("/staff-portal/marks/submit", {
            examId, examName: exam?.name, className, subject,
        })).data,
        onSuccess: (d: any) => { toast.success(d.message || "Submitted for approval"); refetchStatus(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Submit failed"),
    });

    return (
        <>
            <PageTitle title="Exam Marks Entry" />
            {win?.restricted && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>You can record marks for <b>{win.label}</b> exams. Earlier exams are managed by the school administrator.</span>
                </div>
            )}

            <PanelCard title="Select Exam, Class & Subject">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Exam</label>
                        <select value={examId} onChange={e => setExamId(e.target.value)}
                            className="w-full h-10 px-3 border border-black/10 rounded text-sm bg-white">
                            <option value="">— Select exam —</option>
                            {exams.map((e: any) => <option key={e._id} value={e._id}>{e.name}{e.term ? ` · ${e.term}` : ""}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Class &amp; Subject</label>
                        <select value={pair} onChange={e => setPair(e.target.value)}
                            className="w-full h-10 px-3 border border-black/10 rounded text-sm bg-white">
                            <option value="">— Select —</option>
                            {pairs.map(p => <option key={pairKey(p)} value={pairKey(p)}>{p.className} — {p.subject}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Out Of</label>
                        <div className="w-full h-10 px-3 border border-black/10 rounded text-sm bg-slate-50 text-slate-600 font-bold flex items-center">
                            {examId ? `${outOf} marks` : "— select an exam —"}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Set in the exam's Total Marks setting</p>
                    </div>
                </div>
                {pairs.length === 0 && (
                    <p className="text-xs text-amber-600 mt-3">You have no class/subject assignments yet. Ask the admin to assign you.</p>
                )}
            </PanelCard>

            {examId && pair && papers.length > 0 && (
                <PanelCard title="Which paper?">
                    <div className="flex flex-wrap gap-2">
                        {papers.map(p => (
                            <button key={p._id} onClick={() => setPaperId(p._id)}
                                className={`h-9 px-3.5 rounded-lg text-xs font-bold border ${paperId === p._id ? "bg-[#159a52] text-white border-[#159a52]" : "bg-white text-slate-600 border-black/10"}`}>
                                {p.label} <span className="opacity-70">/{p.outOf}</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">Each paper is marked separately; the subject's overall score is combined automatically from the ratios set in General Settings.</p>
                </PanelCard>
            )}

            {examId && pair && (papers.length === 0 || paperId) && (
                <PanelCard title={`${className} — ${subject}${paper ? ` (${paper.label})` : ""}`}
                    action={
                        <div className="flex items-center gap-2">
                            {statusLabel && statusLabel !== "Draft" && (
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isLocked ? "bg-slate-800 text-white" : statusLabel === "Returned" || statusLabel === "Rejected" ? "bg-amber-100 text-amber-700" : statusLabel === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{statusLabel}</span>
                            )}
                            <button disabled={save.isPending || rows.length === 0 || isLocked} onClick={() => save.mutate()}
                                title={isLocked ? "Locked by HOD — ask them to unlock to edit" : ""}
                                className="inline-flex items-center gap-1.5 bg-white text-[#0f5132] text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50">
                                {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} {isLocked ? "Locked" : "Save Marks"}
                            </button>
                            {!isLocked && !isSubmitted && (
                                <button disabled={submit.isPending || save.isPending || rows.length === 0} onClick={() => submit.mutate()}
                                    title="Send these marks to the HOD/admin for approval"
                                    className="inline-flex items-center gap-1.5 bg-[#159a52] text-white text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50">
                                    {submit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Submit for Approval
                                </button>
                            )}
                        </div>
                    }>
                    {/* Workflow hints so the teacher understands the approval state. */}
                    {isSubmitted && (
                        <div className="mb-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-[11px] text-blue-700">
                            These marks are <b>submitted and awaiting approval</b>. You can still edit them — any change will be re-sent to the HOD for approval, and they'll see exactly what you changed.
                        </div>
                    )}
                    {(statusLabel === "Returned" || statusLabel === "Rejected") && (
                        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] text-amber-700">
                            The HOD <b>{statusLabel === "Rejected" ? "rejected" : "returned"}</b> these marks. Fix them, then click <b>Submit for Approval</b> again.
                        </div>
                    )}
                    {isApproved && (
                        <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-[11px] text-emerald-700">
                            These marks are <b>approved</b>. Editing is locked — ask the HOD to unlock if a change is needed.
                        </div>
                    )}
                    {isFetching ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading roster…
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-8">No students found in this class.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-500 border-b border-black/10">
                                        <th className="py-2">#</th>
                                        <th className="py-2">Reg. No</th>
                                        <th className="py-2">Student</th>
                                        <th className="py-2 w-32">Marks (/{outOf})</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={r.studentId} className="border-b border-black/5">
                                            <td className="py-2 text-slate-400">{i + 1}</td>
                                            <td className="py-2 text-slate-500 font-mono text-xs">{r.registrationNo || "—"}</td>
                                            <td className="py-2 font-semibold text-slate-700">{r.name}</td>
                                            <td className="py-2">
                                                <div className="flex items-center gap-1">
                                                    <PencilLine className="w-3.5 h-3.5 text-slate-300" />
                                                    <input type="number" min={0} max={outOf} value={r.marks} disabled={isLocked}
                                                        onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, marks: e.target.value } : x))}
                                                        className="w-20 h-9 px-2 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#159a52]/40 disabled:bg-slate-50 disabled:text-slate-400" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </PanelCard>
            )}
        </>
    );
}
