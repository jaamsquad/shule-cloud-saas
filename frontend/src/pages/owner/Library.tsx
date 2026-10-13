import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UploadCloud, Trash2, FileText, Library as LibraryIcon, BookOpen, Sparkles } from "lucide-react";

const GRADES = ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Form 1", "Form 2", "Form 3", "Form 4"];
const RES_TYPES = ["Notes", "Worksheet", "Document", "Image", "Diagram", "External Link", "Video", "Other"];

// Built-in subject catalogue (Kenyan 8-4-4 and CBC senior school) — mirrors
// backend/src/lib/subjectCatalog.ts's SUBJECT_CATALOG names, grouped the same way, so the
// owner picks from the same subject list schools do rather than free-typing a name.
const SUBJECT_GROUPS: { group: string; subjects: string[] }[] = [
    { group: "Mathematics", subjects: ["Mathematics", "Essential Mathematics", "Core Mathematics"] },
    { group: "Languages", subjects: ["English", "Kiswahili", "Kenyan Sign Language", "Literature", "Literature In English", "Fasihi Ya Kiswahili", "Indigenous Languages"] },
    { group: "Sciences", subjects: ["Biology", "Physics", "Chemistry"] },
    { group: "Humanities", subjects: ["History and Government", "Geography", "C.R.E.", "I.R.E.", "H.R.E.", "History and Citizenship", "Community Service Learning"] },
    { group: "Technicals", subjects: ["Home Science", "Art and Design", "Agriculture", "Woodwork", "Metalwork", "Building Construction", "Power Mechanics", "Electricity", "Drawing and Design", "Aviation", "Computer Studies", "Music", "Braille", "Business Studies", "Economics", "Technical Sign Language", "Music & Dance", "Fine Arts", "Theatre & Film", "Sports and Recreation", "Media Technology", "Marine and Fisheries"] },
    { group: "Optionals", subjects: ["Mathematics - Option B", "Fasihi", "Biology for the Blind", "General Science", "French", "German", "Arabic", "Mandarin", "Computer Literacy", "Adapted Home Science", "Adapted Agriculture", "P.E", "Library", "Pastoral", "Life Skills", "Latin", "Sign Language", "Catechism"] },
    { group: "Support Subjects", subjects: ["Learner Personal/Group Study", "Pastoral/Religious Programme Instruction", "Information Communication Technology", "Physical Education"] },
];

export default function OwnerLibrary() {
    const [tab, setTab] = useState<"questions" | "resources">("questions");
    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><LibraryIcon className="w-6 h-6" /> Shared Library</h1>
                <p className="text-muted-foreground">Upload once — every school can use it. Question bank content and teaching resources you add here are available across all schools.</p>
            </div>
            <div className="flex gap-2">
                <Button variant={tab === "questions" ? "default" : "outline"} onClick={() => setTab("questions")}><BookOpen className="w-4 h-4 mr-2" /> Question Bank</Button>
                <Button variant={tab === "resources" ? "default" : "outline"} onClick={() => setTab("resources")}><FileText className="w-4 h-4 mr-2" /> Teaching Resources</Button>
            </div>
            {tab === "questions" ? <QuestionBankTab /> : <ResourcesTab />}
        </div>
    );
}

// ─── Question Bank ───────────────────────────────────────────────────────────
function QuestionBankTab() {
    const qc = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [scheme, setScheme] = useState<File | null>(null);
    const [subjectName, setSubjectName] = useState("");
    const [className, setClassName] = useState("");
    const [extracting, setExtracting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<any[] | null>(null);

    const extract = async () => {
        if (!file) { toast.error("Choose a paper to upload"); return; }
        setExtracting(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            if (scheme) fd.append("scheme", scheme);
            const r = await api.post("/owner/library/questions/extract", fd, { headers: { "Content-Type": "multipart/form-data" } });
            setPreview(r.data.questions || []);
            toast.success(`Extracted ${r.data.questions?.length || 0} question(s) — review, then save`);
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not read this file"); }
        finally { setExtracting(false); }
    };
    const save = async () => {
        if (!preview?.length) return;
        if (!subjectName.trim()) { toast.error("Enter the subject"); return; }
        if (!className) { toast.error("Choose the grade/class"); return; }
        setSaving(true);
        try {
            const r = await api.post("/owner/library/questions/save", { subjectName, className, questions: preview });
            toast.success(`Saved ${r.data.saved} question(s)${r.data.skipped ? ` · ${r.data.skipped} duplicate(s) skipped` : ""}`);
            setPreview(null); setFile(null); setScheme(null);
            qc.invalidateQueries({ queryKey: ["owner_global_questions"] });
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not save"); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Upload a past paper</CardTitle>
                    <CardDescription>Extracts questions automatically (the same engine schools use), then saves them to the shared bank for the grade you choose.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Paper file (.docx / .pdf / .txt) *</label>
                            <input type="file" accept=".docx,.pdf,.txt" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Marking scheme (optional)</label>
                            <input type="file" accept=".docx,.pdf,.txt" onChange={e => setScheme(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
                        </div>
                    </div>
                    <Button onClick={extract} disabled={extracting || !file}>{extracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />} Extract questions</Button>

                    {preview && (
                        <div className="space-y-3 border-t pt-4">
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground">Subject *</label>
                                    <Input value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. Mathematics" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground">Grade / class *</label>
                                    <select value={className} onChange={e => setClassName(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                                        <option value="">Choose grade…</option>
                                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
                                {preview.map((q, i) => (
                                    <div key={i} className="p-3 text-sm flex gap-2">
                                        <span className="font-bold text-muted-foreground">{i + 1}.</span>
                                        <div className="flex-1">
                                            <p>{q.text || q.questionText}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{q.type || q.questionType} · {q.marks ?? "?"} mk{q.marks === 1 ? "" : "s"} · {(q.difficulty || "MEDIUM").toLowerCase()}</p>
                                        </div>
                                    </div>
                                ))}
                                {!preview.length && <p className="p-4 text-sm text-muted-foreground">No questions found in that file.</p>}
                            </div>
                            <Button onClick={save} disabled={saving || !preview.length}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Save {preview.length} to shared bank</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <GlobalQuestionsList />
        </div>
    );
}

function GlobalQuestionsList() {
    const [className, setClassName] = useState("");
    const [subject, setSubject] = useState("");
    const { data: rows = [], isLoading, refetch } = useQuery<any[]>({
        queryKey: ["owner_global_questions", className, subject],
        queryFn: async () => (await api.get("/owner/library/questions", { params: { className, subject } })).data || [],
    });
    const del = async (id: string) => {
        if (!confirm("Remove this question from the shared bank?")) return;
        try { await api.delete(`/owner/library/questions/${id}`); toast.success("Removed"); refetch(); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not remove"); }
    };
    return (
        <Card>
            <CardHeader>
                <CardTitle>Shared bank ({rows.length})</CardTitle>
                <CardDescription>What every school already sees in their own Question Bank, labelled "ShuleCloud Library".</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <select value={className} onChange={e => setClassName(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-background text-sm"><option value="">All grades</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Filter by subject…" className="w-56 h-9" />
                </div>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : !rows.length ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No questions in the shared bank for this filter yet.</p>
                ) : (
                    <div className="divide-y border rounded-lg max-h-96 overflow-y-auto">
                        {rows.map((r: any) => (
                            <div key={r._id} className="p-3 text-sm flex gap-3 items-start">
                                <div className="flex-1">
                                    <p>{r.text || r.questionText}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{r.subjectName} · {r.className} · {r.type || r.questionType}</p>
                                </div>
                                <button onClick={() => del(r._id)} className="text-muted-foreground hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Teaching Resources ──────────────────────────────────────────────────────
function ResourcesTab() {
    const qc = useQueryClient();
    const [form, setForm] = useState({ title: "", type: "Notes", subjectName: "", className: "", description: "", url: "", videoUrl: "" });
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const { data: rows = [], isLoading, refetch } = useQuery<any[]>({ queryKey: ["owner_global_resources"], queryFn: async () => (await api.get("/owner/library/resources")).data || [] });

    const upload = async () => {
        if (!form.title.trim()) { toast.error("Give this resource a title"); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (file) fd.append("file", file);
            await api.post("/owner/library/resources", fd, { headers: { "Content-Type": "multipart/form-data" } });
            toast.success("Resource shared with every school");
            setForm({ title: "", type: "Notes", subjectName: "", className: "", description: "", url: "", videoUrl: "" }); setFile(null);
            qc.invalidateQueries({ queryKey: ["owner_global_resources"] }); refetch();
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not upload"); }
        finally { setUploading(false); }
    };
    const del = async (id: string) => {
        if (!confirm("Remove this resource for every school?")) return;
        try { await api.delete(`/owner/library/resources/${id}`); toast.success("Removed"); refetch(); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not remove"); }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Share a teaching resource</CardTitle>
                    <CardDescription>Notes, worksheets, PDFs, images, diagrams or YouTube videos here appear to every school's teachers (Staff Portal → Resources), students (Student Portal → Resources), and admins (Academics → Notes & Resources) — only where that school offers the subject and has the class you choose below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold text-muted-foreground">Title *</label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Type</label>
                            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">{RES_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Subject</label>
                            <select value={form.subjectName} onChange={e => setForm(f => ({ ...f, subjectName: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                                <option value="">Every subject</option>
                                {SUBJECT_GROUPS.map(g => (
                                    <optgroup key={g.group} label={g.group}>
                                        {g.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Grade / class</label>
                            <select value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"><option value="">All grades</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select>
                        </div>
                    </div>
                    {(form.subjectName || form.className) && (
                        <p className="text-xs text-muted-foreground">Only shown to schools that {form.subjectName && <>offer <b>{form.subjectName}</b></>}{form.subjectName && form.className && " and "}{form.className && <>have a <b>{form.className}</b> class</>}.</p>
                    )}
                    <div><label className="text-xs font-bold text-muted-foreground">Description</label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                    {form.type === "Video" ? (
                        <div><label className="text-xs font-bold text-muted-foreground">YouTube (or other video) URL</label><Input value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=…" /></div>
                    ) : form.type === "External Link" ? (
                        <div><label className="text-xs font-bold text-muted-foreground">URL</label><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" /></div>
                    ) : (
                        <div><label className="text-xs font-bold text-muted-foreground">File {form.type === "Image" || form.type === "Diagram" ? "(image)" : "(PDF, doc…)"}</label><input type="file" accept={form.type === "Image" || form.type === "Diagram" ? "image/*" : undefined} onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" /></div>
                    )}
                    <Button onClick={upload} disabled={uploading}>{uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />} Share with every school</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Shared resources ({rows.length})</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : !rows.length ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">Nothing shared yet.</p>
                    ) : (
                        <div className="divide-y border rounded-lg">
                            {rows.map((r: any) => (
                                <div key={r._id} className="p-3 text-sm flex gap-3 items-center">
                                    <div className="flex-1">
                                        <p className="font-semibold">{r.title}</p>
                                        <p className="text-xs text-muted-foreground">{r.type}{r.subjectName ? ` · ${r.subjectName}` : ""}{r.className ? ` · ${r.className}` : " · All grades"}</p>
                                    </div>
                                    <button onClick={() => del(r._id)} className="text-muted-foreground hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
