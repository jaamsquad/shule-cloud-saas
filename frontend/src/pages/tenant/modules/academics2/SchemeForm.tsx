import { useState, useEffect } from "react";
import { Home, Check, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const WEEKS = Array.from({ length: 14 }, (_, i) => `Week ${i + 1}`);
const makeWeeks = () => WEEKS.map(w => ({ week: w, topic: "", subTopic: "", objectives: "", activities: "", assessment: "", remarks: "", lessons: "2" }));

export default function SchemeForm() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const isEdit = !!id;

    const [form, setForm] = useState({ title: "", subjectId: "", subjectName: "", classId: "", className: "", term: "Term 1", year: String(new Date().getFullYear()), status: "Draft", weeks: makeWeeks() });

    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; } });
    // Curriculum-aware terminology: resolve the selected class's curriculum from the
    // backend and relabel "Subject" → "Learning Area" for CBC. No frontend guessing.
    const { data: curriculum } = useQuery({
        queryKey: ["class_curriculum", form.classId],
        enabled: !!form.classId,
        queryFn: async () => (await api.get(`/class/${form.classId}/curriculum`)).data,
    });
    const subjectTerm = curriculum?.config?.terminology?.subject || "Subject";

    const { data: existing, isLoading: loadingExisting } = useQuery({
        queryKey: ["scheme_single", id],
        queryFn: async () => { const r = await api.get(`/schemes_of_work/${id}`); return r.data; },
        enabled: isEdit,
    });

    useEffect(() => {
        if (existing) {
            const weeks = WEEKS.map((w, i) => {
                const ex = (existing.weeks || [])[i] || {};
                return { week: w, topic: ex.topic || "", subTopic: ex.subTopic || "", objectives: ex.objectives || "", activities: ex.activities || "", assessment: ex.assessment || "", remarks: ex.remarks || "", lessons: ex.lessons || "2" };
            });
            setForm({ title: existing.title || "", subjectId: existing.subjectId || "", subjectName: existing.subjectName || "", classId: existing.classId || "", className: existing.className || "", term: existing.term || "Term 1", year: String(existing.year || new Date().getFullYear()), status: existing.status || "Draft", weeks });
        }
    }, [existing]);

    const updateWeek = (i: number, field: string, value: string) => setForm(p => ({ ...p, weeks: p.weeks.map((w, idx) => idx === i ? { ...w, [field]: value } : w) }));

    const saveMut = useMutation({
        mutationFn: (payload: any) => isEdit ? api.patch(`/schemes_of_work/${id}`, payload) : api.post("/schemes_of_work", payload),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["schemes_of_work"] }); toast.success(isEdit ? "Scheme updated" : "Scheme created"); navigate("/academics/schemes-of-work"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const handleSubmit = () => {
        const subj = subjects.find((s: any) => s._id === form.subjectId);
        const cls = classes.find((c: any) => c._id === form.classId);
        saveMut.mutate({ ...form, subjectName: subj?.name || subj?.subjectName || form.subjectName, className: cls?.className || cls?.name || form.className });
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <button onClick={() => navigate("/academics/schemes-of-work")} className="font-bold text-gray-500 hover:text-[#5C67F2]">Schemes of Work</button>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">{isEdit ? "Edit Scheme" : "New Scheme"}</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate("/academics/schemes-of-work")} className="h-10 px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saveMut.isPending} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition-all">
                        {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isEdit ? "Save Changes" : "Create Scheme"}
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{isEdit ? "Edit Scheme of Work" : "New Scheme of Work"}</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">14-week term planner — fill in the topics for each week</p>
                </div>

                {isEdit && loadingExisting ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                ) : (
                    <div className="space-y-6">
                        {/* Basic info */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Scheme Details</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Title</div>
                                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mathematics Scheme — Form 2 Term 1" className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{subjectTerm}</div>
                                    <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select {subjectTerm} —</option>
                                        {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.subjectName}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class</div>
                                    <select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Class —</option>
                                        {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.className || c.name}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Term</div>
                                    <select value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        {["Term 1", "Term 2", "Term 3"].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Year</div>
                                        <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Status</div>
                                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            {["Draft", "Active", "Completed"].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weekly grid */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Weekly Breakdown (fill in weeks you want to plan)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[11px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                            {["Week", "Topic*", "Sub-Topic", "Learning Objectives", "Activities", "Lessons", "Remarks"].map(h => (
                                                <th key={h} className="py-3 px-3 border-b border-slate-100">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.weeks.map((w, i) => (
                                            <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                                                <td className="py-2 px-3">
                                                    <span className="font-black text-[#5C67F2] text-[10px] whitespace-nowrap">{w.week}</span>
                                                </td>
                                                {(["topic", "subTopic", "objectives", "activities"] as const).map(field => (
                                                    <td key={field} className="py-1.5 px-2">
                                                        <input type="text" value={w[field]} onChange={e => updateWeek(i, field, e.target.value)}
                                                            className="w-full h-9 px-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] min-w-[110px]" />
                                                    </td>
                                                ))}
                                                <td className="py-1.5 px-2 w-16">
                                                    <input type="number" value={w.lessons} onChange={e => updateWeek(i, "lessons", e.target.value)} className="w-full h-9 px-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] text-center" />
                                                </td>
                                                <td className="py-1.5 px-2">
                                                    <input type="text" value={w.remarks} onChange={e => updateWeek(i, "remarks", e.target.value)} className="w-full h-9 px-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] min-w-[110px]" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pb-8">
                            <button onClick={() => navigate("/academics/schemes-of-work")} className="h-12 px-8 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                            <button onClick={handleSubmit} disabled={saveMut.isPending} className="h-12 px-8 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                                {saveMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                {isEdit ? "Save Changes" : "Create Scheme"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
