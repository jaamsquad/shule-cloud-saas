import { useState, useEffect } from "react";
import { Home, Check, Loader2, ArrowLeft, FileText, Video, Link2, File, Download, ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const TYPES = [
    { key: "Notes", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { key: "Worksheet", icon: File, color: "text-indigo-600", bg: "bg-indigo-50" },
    { key: "Video", icon: Video, color: "text-rose-600", bg: "bg-rose-50" },
    { key: "External Link", icon: Link2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { key: "Document", icon: Download, color: "text-amber-600", bg: "bg-amber-50" },
    { key: "Other", icon: ExternalLink, color: "text-slate-600", bg: "bg-slate-50" },
];

export default function ResourceForm() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const isEdit = !!id;

    const [form, setForm] = useState({
        title: "",
        type: "Notes",
        subjectId: "",
        subjectName: "",
        classId: "",
        className: "",
        url: "",
        videoUrl: "",
        introduction: "",
        objectives: "",
        lessonNotes: "",
        assignment: "",
        quizAvailable: false,
        description: "",
        isPublic: true,
        fileData: "",
        fileName: "",
        fileType: "",
    });

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ok = /\.(pdf|docx?|pptx?|jpe?g|png|gif|webp)$/i.test(file.name) || /(image\/|application\/(pdf|msword|vnd))/.test(file.type);
        if (!ok) { toast.error("Allowed: PDF, Word, PowerPoint, or image"); return; }
        if (file.size > 4 * 1024 * 1024) { toast.error("File must be under 4MB"); return; }
        const reader = new FileReader();
        reader.onloadend = () => setForm(f => ({ ...f, fileData: String(reader.result), fileName: file.name, fileType: file.type }));
        reader.readAsDataURL(file);
    };

    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; } });

    const { data: existing, isLoading } = useQuery({
        queryKey: ["academic_resource_single", id],
        queryFn: async () => { const r = await api.get(`/academic_resources/${id}`); return r.data; },
        enabled: isEdit,
    });

    useEffect(() => {
        if (existing) setForm({
            title: existing.title || "",
            type: existing.type || "Notes",
            subjectId: existing.subjectId || "",
            subjectName: existing.subjectName || "",
            classId: existing.classId || "",
            className: existing.className || "",
            url: existing.url || "",
            videoUrl: existing.videoUrl || "",
            introduction: existing.introduction || "",
            objectives: existing.objectives || "",
            lessonNotes: existing.lessonNotes || "",
            assignment: existing.assignment || "",
            quizAvailable: existing.quizAvailable || false,
            description: existing.description || "",
            isPublic: existing.isPublic !== false,
            fileData: existing.fileData || "",
            fileName: existing.fileName || "",
            fileType: existing.fileType || "",
        });
    }, [existing]);

    const saveMut = useMutation({
        mutationFn: (p: any) => isEdit ? api.patch(`/academic_resources/${id}`, p) : api.post("/academic_resources", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_resources"] }); toast.success(isEdit ? "Resource updated" : "Resource added"); navigate("/academics/resources"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const handleSubmit = () => {
        if (!form.title.trim()) { toast.error("Title is required"); return; }
        const subj = subjects.find((s: any) => s._id === form.subjectId);
        const cls = classes.find((c: any) => c._id === form.classId);
        saveMut.mutate({ ...form, subjectName: subj?.name || subj?.subjectName || "", className: cls?.className || cls?.name || "" });
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <button onClick={() => navigate("/academics/resources")} className="font-bold text-gray-500 hover:text-[#5C67F2]">Notes & Resources</button>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">{isEdit ? "Edit Resource" : "Upload Resource"}</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate("/academics/resources")} className="h-10 px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saveMut.isPending} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition-all">
                        {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isEdit ? "Save Changes" : "Add Resource"}
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-2xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{isEdit ? "Edit Resource" : "Upload Resource"}</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Share notes, worksheets, videos, and external links</p>
                </div>

                {isEdit && isLoading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
                            <div className="grid gap-6">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Title*</div>
                                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Introduction to Fractions" className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>

                                <div className="grid md:grid-cols-2 gap-5">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Subject</div>
                                        <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            <option value="">— All Subjects —</option>
                                            {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.subjectName}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class</div>
                                        <select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            <option value="">— All Classes —</option>
                                            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.className || c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Resource Format</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {TYPES.map(t => (
                                            <button key={t.key} onClick={() => setForm({ ...form, type: t.key })}
                                                className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all ${form.type === t.key ? `${t.bg} ${t.color} border-current shadow-sm` : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>
                                                <t.icon className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-[10px] font-black uppercase tracking-wide">{t.key}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Lesson Page</p>
                                    <p className="text-[10px] text-slate-400">Write a complete lesson page that students and teachers can view inside the portal.</p>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
                                    {form.quizAvailable ? "Quiz available" : "No quiz"}
                                </div>
                            </div>

                            <div className="grid gap-5">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Introduction</div>
                                    <textarea value={form.introduction} onChange={e => setForm({ ...form, introduction: e.target.value })} rows={4} placeholder="Add a short introduction to the lesson..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Objectives</div>
                                    <textarea value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} rows={4} placeholder="List learning objectives, separated by bullets or lines..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Lesson Notes</div>
                                    <textarea value={form.lessonNotes} onChange={e => setForm({ ...form, lessonNotes: e.target.value })} rows={6} placeholder="Write the lesson notes, explanations, examples and teacher tips..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="grid md:grid-cols-2 gap-5">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Video Link</div>
                                        <input type="url" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="YouTube or lesson video link" className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Assignment / Activity</div>
                                        <textarea value={form.assignment} onChange={e => setForm({ ...form, assignment: e.target.value })} rows={3} placeholder="Add assignment instructions or attached activity details..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Quiz</div>
                                    <button onClick={() => setForm({ ...form, quizAvailable: !form.quizAvailable })} className={`w-16 h-8 rounded-full transition-all ${form.quizAvailable ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                                        <div className={`h-6 w-6 rounded-full bg-white shadow transition-all ${form.quizAvailable ? "translate-x-8" : "translate-x-0"}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Attachments & Links</p>
                                    <p className="text-[10px] text-slate-400">Upload lesson resources or add a direct link.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">File Upload</div>
                                    {form.fileData ? (
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 h-11">
                                            <File className="w-4 h-4 text-[#5C67F2]" />
                                            <span className="text-xs font-bold text-slate-600 flex-1 truncate">{form.fileName}</span>
                                            <button type="button" onClick={() => setForm(f => ({ ...f, fileData: "", fileName: "", fileType: "" }))} className="text-slate-400 hover:text-rose-500 text-[10px] font-black uppercase">Remove</button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center gap-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 h-11 cursor-pointer hover:border-[#5C67F2] text-slate-500 text-xs font-bold">
                                            <Download className="w-4 h-4" /> Choose a file…
                                            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" onChange={onFile} className="hidden" />
                                        </label>
                                    )}
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">External / Video Link</div>
                                    <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="Resource link / document URL" className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pb-8">
                            <button onClick={() => navigate("/academics/resources")} className="h-12 px-8 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                            <button onClick={handleSubmit} disabled={saveMut.isPending} className="h-12 px-8 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                                {saveMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                {isEdit ? "Save Changes" : "Create Lesson Page"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
