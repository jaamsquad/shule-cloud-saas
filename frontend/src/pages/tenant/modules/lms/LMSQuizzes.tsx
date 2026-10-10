import { useState } from "react";
import { Home, Plus, Check, X, Loader2, ClipboardList, Search, Trash2, Send, Lock, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

interface Question { question: string; type: "MCQ" | "True/False" | "Short Answer"; options: string[]; answer: string; marks: number; }

const emptyQ: Question = { question: "", type: "MCQ", options: ["", "", "", ""], answer: "", marks: 1 };
const emptyForm = { title: "", subjectId: "", subjectName: "", classId: "", className: "", duration: "30", totalMarks: "", dueDate: "", instructions: "", status: "Draft", questions: [{ ...emptyQ }] };

export default function LMSQuizzes() {
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<any>(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: quizzes = [], isLoading } = useQuery({ queryKey: ["lms_quizzes"], queryFn: async () => { const r = await api.get("/lms_quizzes"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; } });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/lms_quizzes/${editId}`, p) : api.post("/lms_quizzes", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lms_quizzes"] }); toast.success(editId ? "Quiz updated" : "Quiz created"); setShowModal(false); setForm(emptyForm); setEditId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/lms_quizzes/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lms_quizzes"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const statusMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/lms_quizzes/${id}`, { status }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lms_quizzes"] }); toast.success("Status updated"); },
    });

    const addQuestion = () => setForm((p: any) => ({ ...p, questions: [...p.questions, { ...emptyQ }] }));
    const removeQuestion = (i: number) => setForm((p: any) => ({ ...p, questions: p.questions.filter((_: any, j: number) => j !== i) }));
    const updateQuestion = (i: number, field: string, value: any) => setForm((p: any) => ({ ...p, questions: p.questions.map((q: any, j: number) => j === i ? { ...q, [field]: value } : q) }));
    const updateOption = (qi: number, oi: number, val: string) => setForm((p: any) => ({ ...p, questions: p.questions.map((q: any, j: number) => j === qi ? { ...q, options: q.options.map((o: string, k: number) => k === oi ? val : o) } : q) }));

    const totalCalc = form.questions.reduce((s: number, q: any) => s + Number(q.marks || 1), 0);

    const STATUS_COLORS: Record<string, string> = { Draft: "bg-slate-100 text-slate-500", Published: "bg-emerald-50 text-emerald-600", Closed: "bg-rose-50 text-rose-500" };
    const filtered = quizzes.filter((q: any) => !search || (q.title || "").toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">LMS</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Quizzes & Exams</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(emptyForm); setShowModal(true); }} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> New Quiz
                </button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Quizzes & Online Exams</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Create MCQ, True/False, and short-answer quizzes for students</p></div>

                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..." className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                </div>

                {isLoading ? <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                : filtered.length === 0 ? <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><ClipboardList className="w-10 h-10" />No quizzes yet</div>
                : (
                    <div className="space-y-4">
                        {filtered.map((q: any) => (
                            <div key={q._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0"><ClipboardList className="w-5 h-5 text-amber-600" /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-800">{q.title}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                            {q.subjectName || "—"} · {q.className || "All"} · {(q.questions || []).length} questions · {q.duration || 30} min · {q.totalMarks || 0} marks
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase ${STATUS_COLORS[q.status] || STATUS_COLORS.Draft}`}>{q.status || "Draft"}</span>
                                    <div className="flex gap-1.5">
                                        {q.status === "Draft" && <button onClick={() => statusMut.mutate({ id: q._id, status: "Published" })} className="h-8 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1"><Send className="w-3 h-3" />Publish</button>}
                                        {q.status === "Published" && <button onClick={() => statusMut.mutate({ id: q._id, status: "Closed" })} className="h-8 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1"><Lock className="w-3 h-3" />Close</button>}
                                        <button onClick={() => { setEditId(q._id); setForm({ title: q.title, subjectId: q.subjectId || "", subjectName: q.subjectName || "", classId: q.classId || "", className: q.className || "", duration: String(q.duration || 30), totalMarks: String(q.totalMarks || ""), dueDate: q.dueDate || "", instructions: q.instructions || "", status: q.status || "Draft", questions: q.questions || [{ ...emptyQ }] }); setShowModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                                        {confirmDelete === q._id ? (<><button onClick={() => delMut.mutate(q._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button><button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>) : (<button onClick={() => setConfirmDelete(q._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-white max-w-3xl w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit" : "New"} Quiz</h3><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>

                            {/* Basic info */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Quiz Title*</div>
                                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Subject</div>
                                    <select value={form.subjectId} onChange={e => { const s = subjects.find((s: any) => s._id === e.target.value); setForm({ ...form, subjectId: e.target.value, subjectName: s?.name || "" }); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Any —</option>{subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.subjectName}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class</div>
                                    <select value={form.classId} onChange={e => { const c = classes.find((c: any) => c._id === e.target.value); setForm({ ...form, classId: e.target.value, className: c?.className || "" }); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— All —</option>{classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.className || c.name}</option>)}
                                    </select>
                                </div>
                                {[{ label: "Duration (min)", field: "duration", type: "number" }, { label: "Due Date", field: "dueDate", type: "date" }].map(f => (
                                    <div key={f.field} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type={f.type} value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Instructions</div>
                                    <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                            </div>

                            {/* Questions */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Questions ({form.questions.length}) · Total: {totalCalc} marks</p>
                                    <button onClick={addQuestion} className="h-8 px-3 bg-[#5C67F2] text-white font-black text-[9px] uppercase rounded-xl flex items-center gap-1 hover:bg-indigo-600"><Plus className="w-3 h-3" />Add Question</button>
                                </div>
                                <div className="space-y-5 max-h-64 overflow-y-auto pr-1">
                                    {form.questions.map((q: any, i: number) => (
                                        <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="w-6 h-6 rounded-lg bg-[#5C67F2] text-white font-black text-[9px] flex items-center justify-center flex-shrink-0">Q{i + 1}</span>
                                                <select value={q.type} onChange={e => updateQuestion(i, "type", e.target.value)} className="h-7 px-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-slate-600 focus:outline-none">
                                                    {["MCQ", "True/False", "Short Answer"].map(t => <option key={t}>{t}</option>)}
                                                </select>
                                                <input type="number" value={q.marks} onChange={e => updateQuestion(i, "marks", Number(e.target.value))} min="1" className="w-16 h-7 px-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-slate-600 focus:outline-none text-center" />
                                                <span className="text-[8px] text-slate-400 font-bold">marks</span>
                                                <button onClick={() => removeQuestion(i)} className="ml-auto text-slate-300 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                            <textarea value={q.question} onChange={e => updateQuestion(i, "question", e.target.value)} placeholder="Enter question..." rows={2} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 resize-none focus:outline-none focus:border-[#5C67F2] mb-2" />
                                            {q.type === "MCQ" && (
                                                <div className="grid grid-cols-2 gap-1.5 mb-2">
                                                    {q.options.map((opt: string, oi: number) => (
                                                        <div key={oi} className="flex items-center gap-1.5">
                                                            <span className="text-[8px] font-black text-slate-400 w-4">{String.fromCharCode(65 + oi)}.</span>
                                                            <input type="text" value={opt} onChange={e => updateOption(i, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="flex-1 h-7 px-2 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {q.type === "True/False" && (
                                                <div className="flex gap-2 mb-2">
                                                    {["True", "False"].map(v => <button key={v} onClick={() => updateQuestion(i, "answer", v)} className={`px-3 h-7 rounded-lg text-[9px] font-black uppercase border transition-all ${q.answer === v ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-200"}`}>{v}</button>)}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black text-slate-400 uppercase">Correct Answer:</span>
                                                <input type="text" value={q.answer} onChange={e => updateQuestion(i, "answer", e.target.value)} placeholder={q.type === "MCQ" ? "e.g. A" : "Enter answer..."} className="flex-1 h-7 px-2 bg-emerald-50 border border-emerald-100 rounded-lg text-[9px] font-bold text-emerald-700 focus:outline-none" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.title) { toast.error("Title required"); return; } saveMut.mutate({ ...form, totalMarks: totalCalc }); }} disabled={saveMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editId ? "Save" : "Create Quiz"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
