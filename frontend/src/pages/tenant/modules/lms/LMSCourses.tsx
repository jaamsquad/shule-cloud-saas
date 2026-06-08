import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, BookOpen, Search, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyForm = {
    title: "", subjectId: "", subjectName: "", classId: "", className: "",
    description: "", coverImageUrl: "", googleClassroomId: "",
    duration: "", level: "Beginner", isActive: true,
};

export default function LMSCourses() {
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();
    const navigate = useNavigate();

    const { data: courses = [], isLoading } = useQuery({ queryKey: ["lms_courses"], queryFn: async () => { const r = await api.get("/lms_courses"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; } });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/lms_courses/${editId}`, p) : api.post("/lms_courses", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lms_courses"] }); toast.success(editId ? "Course updated" : "Course created"); setShowModal(false); setForm(emptyForm); setEditId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/lms_courses/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lms_courses"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const filtered = courses.filter((c: any) => !search || (c.title || "").toLowerCase().includes(search.toLowerCase()) || (c.subjectName || "").toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">LMS</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Courses</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(emptyForm); setShowModal(true); }}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> New Course
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Online Courses</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Create and manage e-learning courses per subject and class</p></div>

                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                </div>

                {isLoading ? <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                : filtered.length === 0 ? <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><BookOpen className="w-10 h-10" />No courses yet — click New Course</div>
                : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map((c: any) => (
                            <div key={c._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative">
                                    {c.coverImageUrl ? <img src={c.coverImageUrl} className="w-full h-full object-cover absolute inset-0" alt="" /> : <BookOpen className="w-10 h-10 text-white/50" />}
                                    <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${c.isActive !== false ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"}`}>{c.isActive !== false ? "Active" : "Draft"}</span>
                                </div>
                                <div className="p-5">
                                    <p className="font-black text-slate-800 text-sm mb-1 truncate">{c.title}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-3">{c.subjectName || "—"} · {c.className || "All Classes"} · {c.level}</p>
                                    {c.description && <p className="text-[10px] text-slate-500 font-medium mb-3 line-clamp-2">{c.description}</p>}
                                    {c.googleClassroomId && (
                                        <a href={`https://classroom.google.com/c/${c.googleClassroomId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] text-blue-600 font-black uppercase mb-3 hover:underline">
                                            <ExternalLink className="w-3 h-3" />Open in Google Classroom
                                        </a>
                                    )}
                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                                        <button onClick={() => { setEditId(c._id); setForm({ title: c.title, subjectId: c.subjectId || "", subjectName: c.subjectName || "", classId: c.classId || "", className: c.className || "", description: c.description || "", coverImageUrl: c.coverImageUrl || "", googleClassroomId: c.googleClassroomId || "", duration: c.duration || "", level: c.level || "Beginner", isActive: c.isActive !== false }); setShowModal(true); }} className="flex-1 h-8 bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-500 border border-slate-100 rounded-xl flex items-center justify-center gap-1 font-black text-[9px] uppercase transition-colors"><Pencil className="w-3 h-3" />Edit</button>
                                        {confirmDelete === c._id ? (
                                            <><button onClick={() => delMut.mutate(c._id)} className="flex-1 h-8 bg-rose-500 text-white rounded-xl flex items-center justify-center gap-1 font-black text-[9px] uppercase"><Check className="w-3 h-3" />Confirm</button>
                                            <button onClick={() => setConfirmDelete(null)} className="h-8 w-8 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center"><X className="w-3 h-3" /></button></>
                                        ) : <button onClick={() => setConfirmDelete(c._id)} className="h-8 w-8 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-100 rounded-xl flex items-center justify-center transition-colors"><Trash2 className="w-3 h-3" /></button>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white max-w-xl w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit" : "New"} Course</h3><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Course Title*</div>
                                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Subject</div>
                                    <select value={form.subjectId} onChange={e => { const s = subjects.find((s: any) => s._id === e.target.value); setForm({ ...form, subjectId: e.target.value, subjectName: s?.name || s?.subjectName || "" }); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Any Subject —</option>
                                        {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.subjectName}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class</div>
                                    <select value={form.classId} onChange={e => { const c = classes.find((c: any) => c._id === e.target.value); setForm({ ...form, classId: e.target.value, className: c?.className || c?.name || "" }); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— All Classes —</option>
                                        {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.className || c.name}</option>)}
                                    </select>
                                </div>
                                {[{ label: "Duration (e.g. 8 weeks)", field: "duration" }, { label: "Cover Image URL", field: "coverImageUrl", col: 2 }, { label: "Google Classroom ID (optional)", field: "googleClassroomId", col: 2 }].map((f: any) => (
                                    <div key={f.field} className={`relative ${f.col === 2 ? "col-span-2" : ""}`}>
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type="text" value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Level</div>
                                    <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        {["Beginner", "Intermediate", "Advanced"].map(l => <option key={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Description</div>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="col-span-2 flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Active / Visible to Students</span>
                                    <button onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`w-11 h-6 rounded-full transition-all relative ${form.isActive ? "bg-[#5C67F2]" : "bg-slate-200"}`}><div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? "right-0.5" : "left-0.5"}`} /></button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.title) { toast.error("Title required"); return; } saveMut.mutate(form); }} disabled={saveMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editId ? "Save" : "Create Course"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
