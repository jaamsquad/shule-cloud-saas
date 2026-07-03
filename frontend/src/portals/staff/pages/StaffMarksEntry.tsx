import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Save, PencilLine, Lock } from "lucide-react";
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
    const [rows, setRows] = useState<any[]>([]);

    const { data: exams = [] } = useQuery({
        queryKey: ["staff_exams"],
        queryFn: async () => (await api.get("/staff-portal/exams")).data,
        retry: false,
    });

    const { className, subject } = pair ? parsePair(pair) : { className: "", subject: "" };

    const { data: roster, isFetching, refetch } = useQuery({
        queryKey: ["staff_roster", examId, pair],
        queryFn: async () => (await api.get(`/staff-portal/roster?examId=${examId}&className=${encodeURIComponent(className)}&subject=${encodeURIComponent(subject)}`)).data,
        enabled: !!examId && !!pair,
        retry: false,
    });

    useEffect(() => { if (roster) setRows(roster.map((r: any) => ({ ...r }))); }, [roster]);

    const exam = exams.find((e: any) => e._id === examId);
    const outOf = Number(exam?.totalMarks) || 100;   // from the exam's Total Marks setting

    // Approval status of this (exam × subject) — locked marks can't be edited.
    const { data: markStatus } = useQuery({
        queryKey: ["staff_marks_status", examId, subject],
        enabled: !!examId && !!subject,
        queryFn: async () => (await api.get(`/staff-portal/marks-status`, { params: { examId, subject } })).data,
    });
    const isLocked = !!markStatus?.locked;
    const statusLabel = markStatus?.status || "";

    const save = useMutation({
        mutationFn: async () => (await api.post("/staff-portal/marks", {
            examId, examName: exam?.name, term: exam?.term, className, subject, outOf,
            marks: rows.map(r => ({ studentId: r.studentId, marks: r.marks })),
        })).data,
        onSuccess: (d: any) => { toast.success(d.message || "Saved"); refetch(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });

    return (
        <>
            <PageTitle title="Exam Marks Entry" />

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

            {examId && pair && (
                <PanelCard title={`${className} — ${subject}`}
                    action={
                        <div className="flex items-center gap-2">
                            {statusLabel && statusLabel !== "Draft" && (
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isLocked ? "bg-slate-800 text-white" : statusLabel === "Returned" || statusLabel === "Rejected" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{statusLabel}</span>
                            )}
                            <button disabled={save.isPending || rows.length === 0 || isLocked} onClick={() => save.mutate()}
                                title={isLocked ? "Locked by HOD — ask them to unlock to edit" : ""}
                                className="inline-flex items-center gap-1.5 bg-white text-[#0f5132] text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50">
                                {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} {isLocked ? "Locked" : "Save Marks"}
                            </button>
                        </div>
                    }>
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
                                                    <input type="number" min={0} max={outOf} value={r.marks}
                                                        onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, marks: e.target.value } : x))}
                                                        className="w-20 h-9 px-2 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#159a52]/40" />
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
