import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileText, Eye, Upload, X, Check, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import FileViewer, { readFileLimited } from "../../FileViewer";
import type { StudentCtx } from "../StudentLayout";

export default function StudentTasks({ type, title }: { type: "assignment" | "homework"; title: string }) {
    const { api } = useOutletContext<StudentCtx>();
    const qc = useQueryClient();
    const [viewing, setViewing] = useState<{ src: string; name?: string } | null>(null);
    const [submitting, setSubmitting] = useState<any | null>(null);
    const [answer, setAnswer] = useState("");
    const [file, setFile] = useState<{ data: string; name: string; type: string } | null>(null);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ["student_tasks", type],
        queryFn: async () => { const r = await api.get(`/student-portal/tasks/${type}`); return Array.isArray(r.data) ? r.data : []; },
    });

    const submit = useMutation({
        mutationFn: async () => api.post(`/student-portal/tasks/${type}/${submitting._id}/submit`, {
            answer, attachment: file?.data, attachmentName: file?.name, attachmentType: file?.type,
        }),
        onSuccess: () => { toast.success("Submitted"); setSubmitting(null); setAnswer(""); setFile(null); qc.invalidateQueries({ queryKey: ["student_tasks", type] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Submission failed"),
    });

    const openSubmit = (it: any) => { setSubmitting(it); setAnswer(it.submission?.answer || ""); setFile(it.submission?.attachment ? { data: it.submission.attachment, name: it.submission.attachmentName, type: it.submission.attachmentType } : null); };

    return (
        <>
            <PageTitle title={title} />
            <PanelCard title={`My ${title}`}>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-10 text-slate-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm font-semibold">No {title.toLowerCase()} for your class yet.</p></div>
                ) : (
                    <div className="space-y-3">
                        {items.map((it: any) => {
                            const overdue = it.dueDate && new Date(it.dueDate) < new Date() && !it.submission;
                            return (
                                <div key={it._id} className="border border-black/5 rounded-lg p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-700 text-sm">{it.title}</p>
                                            <p className="text-xs text-slate-400">{[it.subject, it.totalMarks ? `${it.totalMarks} marks` : "", it.teacherName].filter(Boolean).join(" · ")}</p>
                                            {(it.instructions || it.description) && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{it.instructions || it.description}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            {it.submission
                                                ? <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><Check className="w-3 h-3" /> Submitted</span>
                                                : <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${overdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}><Clock className="w-3 h-3" /> {it.dueDate ? `Due ${new Date(it.dueDate).toLocaleDateString("en-GB")}` : "Open"}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        {it.attachment && <button onClick={() => setViewing({ src: it.attachment, name: it.attachmentName })} className="inline-flex items-center gap-1 text-xs font-bold border border-slate-200 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-50"><Eye className="w-3.5 h-3.5" /> View Brief</button>}
                                        <button onClick={() => openSubmit(it)} className="inline-flex items-center gap-1 text-xs font-bold bg-[#159a52] text-white px-3 py-1.5 rounded">
                                            <Send className="w-3.5 h-3.5" /> {it.submission ? "Edit Submission" : "Do / Submit"}
                                        </button>
                                        {it.submission?.attachment && <button onClick={() => setViewing({ src: it.submission.attachment, name: it.submission.attachmentName })} className="inline-flex items-center gap-1 text-xs font-bold border border-slate-200 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-50"><Eye className="w-3.5 h-3.5" /> My Work</button>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </PanelCard>

            {/* Submit modal */}
            {submitting && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-8">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                            <h3 className="font-black text-slate-800 truncate">{submitting.title}</h3>
                            <button onClick={() => setSubmitting(null)} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Answer online (type your work)</label>
                                <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={5} placeholder="Type your answer here…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                            </div>
                            <div className="text-center text-xs text-slate-400 font-bold">— OR / AND —</div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Upload scanned work (PDF / image, max 2MB)</label>
                                {file ? (
                                    <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 mb-2 bg-slate-50">
                                        <span className="text-xs font-semibold text-slate-600 truncate flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {file.name}</span>
                                        <button onClick={() => setFile(null)} className="text-rose-500 text-xs font-bold">Remove</button>
                                    </div>
                                ) : null}
                                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
                                    <Upload className="w-3.5 h-3.5" /> {file ? "Replace file" : "Upload file"}
                                    <input type="file" accept="application/pdf,image/*" className="hidden"
                                        onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { setFile(await readFileLimited(f)); } catch (err: any) { toast.error(err.message); } e.currentTarget.value = ""; }} />
                                </label>
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={() => setSubmitting(null)} className="text-sm font-bold text-slate-500 px-4 py-2">Cancel</button>
                            <button onClick={() => submit.mutate()} disabled={submit.isPending || (!answer && !file)} className="inline-flex items-center gap-1.5 bg-[#159a52] text-white text-sm font-bold px-5 py-2 rounded disabled:opacity-50">
                                {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <FileViewer open={!!viewing} src={viewing?.src} name={viewing?.name} onClose={() => setViewing(null)} />
        </>
    );
}
