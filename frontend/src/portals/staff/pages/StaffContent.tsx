import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, X, FileText, Eye, Upload, Inbox, Check } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";
import { useAssignments, pairKey, parsePair } from "../useAssignments";
import FileViewer, { readFileLimited } from "../../FileViewer";

type FT = "text" | "textarea" | "select" | "date" | "number" | "classsubject" | "file";
interface F { k: string; label: string; type: FT; options?: string[] }

const ATTACH: F = { k: "attachment", label: "Attachment (PDF or image, max 2MB)", type: "file" };

export interface ContentConfig { type: string; title: string; fields: F[]; primary: string }

export const CONTENT: Record<string, ContentConfig> = {
    "lesson-plans": { type: "lesson-plans", title: "Lesson Plans", primary: "title", fields: [
        { k: "title", label: "Title", type: "text" },
        { k: "pair", label: "Class & Subject", type: "classsubject" },
        { k: "week", label: "Week", type: "text" },
        { k: "date", label: "Date", type: "date" },
        { k: "objectives", label: "Objectives", type: "textarea" },
        { k: "content", label: "Plan Content", type: "textarea" },
        ATTACH,
    ]},
    "schemes": { type: "schemes", title: "Schemes of Work", primary: "title", fields: [
        { k: "title", label: "Title", type: "text" },
        { k: "pair", label: "Class & Subject", type: "classsubject" },
        { k: "term", label: "Term", type: "text" },
        { k: "weeks", label: "Number of Weeks", type: "number" },
        { k: "content", label: "Scheme Content", type: "textarea" },
        ATTACH,
    ]},
    "resources": { type: "resources", title: "Notes & Resources", primary: "title", fields: [
        { k: "title", label: "Title", type: "text" },
        { k: "pair", label: "Class & Subject", type: "classsubject" },
        { k: "resourceType", label: "Type", type: "select", options: ["Notes", "Document", "Video", "Link", "Lesson Page"] },
        { k: "videoUrl", label: "Video URL", type: "text" },
        { k: "introduction", label: "Introduction", type: "textarea" },
        { k: "objectives", label: "Objectives", type: "textarea" },
        { k: "lessonNotes", label: "Lesson Notes", type: "textarea" },
        { k: "assignment", label: "Assignment / Activity", type: "textarea" },
        { k: "quizAvailable", label: "Quiz available", type: "select", options: ["Yes", "No"] },
        { k: "url", label: "URL / Link (optional)", type: "text" },
        ATTACH,
        { k: "description", label: "Description", type: "textarea" },
    ]},
    "assignments": { type: "assignments", title: "Assignments", primary: "title", fields: [
        { k: "title", label: "Title", type: "text" },
        { k: "pair", label: "Class & Subject", type: "classsubject" },
        { k: "totalMarks", label: "Total Marks", type: "number" },
        { k: "dueDate", label: "Due Date", type: "date" },
        { k: "status", label: "Status", type: "select", options: ["Draft", "Published"] },
        { k: "instructions", label: "Instructions", type: "textarea" },
        ATTACH,
    ]},
    "homework": { type: "homework", title: "Homework", primary: "title", fields: [
        { k: "title", label: "Title", type: "text" },
        { k: "pair", label: "Class & Subject", type: "classsubject" },
        { k: "dueDate", label: "Due Date", type: "date" },
        { k: "description", label: "Description", type: "textarea" },
        ATTACH,
    ]},
};

export default function StaffContent({ type }: { type: string }) {
    const cfg = CONTENT[type];
    const { api } = useOutletContext<StaffCtx>();
    const qc = useQueryClient();
    const { data: assign } = useAssignments();
    const pairs = assign?.assignments || [];
    const [editing, setEditing] = useState<any | null>(null);
    const [viewing, setViewing] = useState<{ src: string; name?: string } | null>(null);
    const [submissionsItem, setSubmissionsItem] = useState<any | null>(null);
    const hasSubmissions = type === "assignments" || type === "homework";

    const { data: items = [], isLoading } = useQuery({
        queryKey: ["staff_content", type],
        queryFn: async () => { const r = await api.get(`/staff-portal/content/${type}`); return Array.isArray(r.data) ? r.data : []; },
    });

    const save = useMutation({
        mutationFn: async (doc: any) => doc._id ? api.patch(`/staff-portal/content/${type}/${doc._id}`, doc) : api.post(`/staff-portal/content/${type}`, doc),
        onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["staff_content", type] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });
    const del = useMutation({
        mutationFn: async (id: string) => api.delete(`/staff-portal/content/${type}/${id}`),
        onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["staff_content", type] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Delete failed"),
    });

    if (!cfg) return null;

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <PageTitle title={cfg.title} />
                <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 bg-[#0f2942] hover:bg-[#15395c] text-white text-sm font-bold px-4 py-2 rounded">
                    <Plus className="w-4 h-4" /> New {cfg.title.replace(/s$/, "")}
                </button>
            </div>

            <PanelCard title={`My ${cfg.title}`}>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-10 text-slate-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm font-semibold">Nothing here yet. Create your first {cfg.title.replace(/s$/, "").toLowerCase()}.</p></div>
                ) : (
                    <div className="space-y-3">
                        {items.map((it: any) => {
                            const isResources = type === "resources";
                            return (
                                <div key={it._id} className={`rounded-2xl border border-slate-200/70 p-4 ${isResources ? "bg-slate-50/80" : "bg-white"}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-black text-slate-800 text-sm truncate">{it[cfg.primary] || "Untitled"}</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {[it.className, it.subject, it.dueDate, it.week, it.term, it.status].filter(Boolean).join(" · ")}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {hasSubmissions && (
                                                <button onClick={() => setSubmissionsItem(it)} title="View submissions" className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:text-indigo-500"><Inbox className="w-4 h-4" /> Submissions</button>
                                            )}
                                            {(it.attachment || it.url) && (
                                                <button onClick={() => setViewing({ src: it.attachment || it.url, name: it.attachmentName })} title="View" className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-500"><Eye className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={() => setEditing(it)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-[#159a52]"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => del.mutate(it._id)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    {isResources && (
                                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                                            {it.introduction && <p className="text-xs text-slate-500">{it.introduction}</p>}
                                            {it.objectives && <p className="text-[11px] text-slate-500"><span className="font-black text-slate-700">Objectives:</span> {it.objectives}</p>}
                                            {it.lessonNotes && <p className="text-[11px] text-slate-500 line-clamp-3">{it.lessonNotes}</p>}
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {it.assignment && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase">Assignment</span>}
                                                {it.quizAvailable && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">Quiz</span>}
                                                {it.videoUrl && <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase">Video</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </PanelCard>

            {editing && (
                <ContentForm cfg={cfg} pairs={pairs} initial={editing} onClose={() => setEditing(null)} onSave={d => save.mutate(d)} saving={save.isPending} />
            )}
            {submissionsItem && (
                <SubmissionsModal api={api} type={type} item={submissionsItem} onClose={() => setSubmissionsItem(null)} onView={setViewing} />
            )}
            <FileViewer open={!!viewing} src={viewing?.src} name={viewing?.name} onClose={() => setViewing(null)} />
        </>
    );
}

function SubmissionsModal({ api, type, item, onClose, onView }:
    { api: any; type: string; item: any; onClose: () => void; onView: (v: { src: string; name?: string }) => void }) {
    const qc = useQueryClient();
    const [marks, setMarks] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState<Record<string, string>>({});

    const { data, isLoading } = useQuery({
        queryKey: ["submissions", type, item._id],
        queryFn: async () => (await api.get(`/staff-portal/content/${type}/${item._id}/submissions`)).data,
    });
    const subs: any[] = data?.submissions || [];
    const totalMarks = data?.item?.totalMarks;

    const grade = useMutation({
        mutationFn: async (s: any) => api.post(`/staff-portal/submissions/${s._id}/grade`, { marks: marks[s._id] ?? s.marks, feedback: feedback[s._id] ?? s.feedback }),
        onSuccess: () => { toast.success("Graded"); qc.invalidateQueries({ queryKey: ["submissions", type, item._id] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-8">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <div>
                        <h3 className="font-black text-slate-800 truncate">{item.title} — Submissions</h3>
                        <p className="text-xs text-slate-400">{[item.className, item.subject, totalMarks ? `out of ${totalMarks}` : ""].filter(Boolean).join(" · ")}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
                    ) : subs.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-8">No submissions yet.</p>
                    ) : subs.map((s: any) => (
                        <div key={s._id} className="border border-slate-100 rounded-lg p-4 mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">{s.studentName}</p>
                                    <p className="text-xs text-slate-400">{s.registrationNo} · {s.submittedAt ? new Date(s.submittedAt).toLocaleString("en-GB") : ""}</p>
                                </div>
                                {s.status === "Graded" && <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><Check className="w-3 h-3" /> Graded</span>}
                            </div>
                            {s.answer && <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-2 whitespace-pre-wrap">{s.answer}</div>}
                            {s.attachment && <button onClick={() => onView({ src: s.attachment, name: s.attachmentName })} className="inline-flex items-center gap-1 text-xs font-bold border border-slate-200 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-50 mb-2"><Eye className="w-3.5 h-3.5" /> View Submitted Work</button>}
                            <div className="flex items-end gap-2 mt-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Marks{totalMarks ? ` / ${totalMarks}` : ""}</label>
                                    <input type="number" defaultValue={s.marks ?? ""} onChange={e => setMarks(m => ({ ...m, [s._id]: e.target.value }))} className="w-24 h-9 px-2 border border-slate-200 rounded text-sm" />
                                </div>
                                <input defaultValue={s.feedback ?? ""} onChange={e => setFeedback(f => ({ ...f, [s._id]: e.target.value }))} placeholder="Feedback (optional)" className="flex-1 h-9 px-3 border border-slate-200 rounded text-sm" />
                                <button onClick={() => grade.mutate(s)} disabled={grade.isPending} className="h-9 px-4 bg-[#159a52] text-white text-xs font-bold rounded">Save</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ContentForm({ cfg, pairs, initial, onClose, onSave, saving }:
    { cfg: ContentConfig; pairs: any[]; initial: any; onClose: () => void; onSave: (d: any) => void; saving: boolean }) {
    const [form, setForm] = useState<any>(initial);
    useEffect(() => { setForm(initial); }, [initial]);
    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
    const currentPair = form.className && form.subject ? `${form.className}|||${form.subject}` : "";

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-8">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <h3 className="font-black text-slate-800">{form._id ? "Edit" : "New"} {cfg.title.replace(/s$/, "")}</h3>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                    {cfg.fields.map(f => (
                        <div key={f.k}>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
                            {f.type === "classsubject" ? (
                                <select value={currentPair} onChange={e => { const { className, subject } = parsePair(e.target.value); set("className", className); set("subject", subject); }}
                                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white">
                                    <option value="">— Select class &amp; subject —</option>
                                    {pairs.map(p => <option key={pairKey(p)} value={pairKey(p)}>{p.className} — {p.subject}</option>)}
                                </select>
                            ) : f.type === "select" ? (
                                <select value={form[f.k] || ""} onChange={e => set(f.k, e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white">
                                    <option value="">— Select —</option>{f.options!.map(o => <option key={o}>{o}</option>)}
                                </select>
                            ) : f.type === "file" ? (
                                <div>
                                    {form.attachment ? (
                                        <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 mb-2 bg-slate-50">
                                            <span className="text-xs font-semibold text-slate-600 truncate flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {form.attachmentName || "Attached file"}</span>
                                            <button onClick={() => { set("attachment", ""); set("attachmentName", ""); set("attachmentType", ""); }} className="text-rose-500 text-xs font-bold">Remove</button>
                                        </div>
                                    ) : null}
                                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
                                        <Upload className="w-3.5 h-3.5" /> {form.attachment ? "Replace file" : "Upload PDF / image"}
                                        <input type="file" accept="application/pdf,image/*" className="hidden"
                                            onChange={async e => {
                                                const file = e.target.files?.[0]; if (!file) return;
                                                try { const r = await readFileLimited(file); set("attachment", r.data); set("attachmentName", r.name); set("attachmentType", r.type); }
                                                catch (err: any) { toast.error(err.message); }
                                                e.currentTarget.value = "";
                                            }} />
                                    </label>
                                    <p className="text-[10px] text-slate-400 mt-1">Max 2MB. PDF or image.</p>
                                </div>
                            ) : f.type === "textarea" ? (
                                <textarea value={form[f.k] || ""} onChange={e => set(f.k, e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                            ) : (
                                <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={form[f.k] ?? ""} onChange={e => set(f.k, f.type === "number" ? Number(e.target.value) : e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm" />
                            )}
                        </div>
                    ))}
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="text-sm font-bold text-slate-500 px-4 py-2">Cancel</button>
                    <button onClick={() => onSave(form)} disabled={saving || !form[cfg.primary]} className="inline-flex items-center gap-1.5 bg-[#159a52] text-white text-sm font-bold px-5 py-2 rounded disabled:opacity-50">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
                    </button>
                </div>
            </div>
        </div>
    );
}
