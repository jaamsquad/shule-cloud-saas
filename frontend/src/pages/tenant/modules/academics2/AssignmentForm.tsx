import { useState, useEffect, useCallback } from "react";
import { Home, Check, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// Module-level field (stable identity → inputs keep focus while typing).
function AssignField({ label, field, type = "text", options, textarea, col, form, setForm }: { label: string; field: string; type?: string; options?: string[]; textarea?: boolean; col?: number; form: any; setForm: (f: any) => void }) {
    return (
        <div className={`relative ${col === 2 ? "col-span-2" : ""}`}>
            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{label}</div>
            {type === "select" ? (
                <select value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                    {(options || []).map((o: string) => <option key={o}>{o}</option>)}
                </select>
            ) : textarea ? (
                <textarea value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
            ) : (
                <input type={type} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
            )}
        </div>
    );
}

export default function AssignmentForm() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const isEdit = !!id;

    const [form, setForm] = useState({ title: "", subjectId: "", subjectName: "", classId: "", className: "", instructions: "", dueDate: "", totalMarks: "100", type: "Homework", status: "Draft", notes: "" });

    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; } });

    const { data: existing, isLoading } = useQuery({
        queryKey: ["assignment_single", id],
        queryFn: async () => { const r = await api.get(`/academic_assignments/${id}`); return r.data; },
        enabled: isEdit,
    });

    useEffect(() => {
        if (existing) setForm({ title: existing.title || "", subjectId: existing.subjectId || "", subjectName: existing.subjectName || "", classId: existing.classId || "", className: existing.className || "", instructions: existing.instructions || "", dueDate: existing.dueDate || "", totalMarks: String(existing.totalMarks || 100), type: existing.type || "Homework", status: existing.status || "Draft", notes: existing.notes || "" });
    }, [existing]);

    const saveMut = useMutation({
        mutationFn: (p: any) => isEdit ? api.patch(`/academic_assignments/${id}`, p) : api.post("/academic_assignments", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_assignments"] }); toast.success(isEdit ? "Assignment updated" : "Assignment created"); navigate("/academics/assignments"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const handleSubmit = () => {
        if (!form.title.trim()) { toast.error("Title is required"); return; }
        const subj = subjects.find((s: any) => s._id === form.subjectId);
        const cls = classes.find((c: any) => c._id === form.classId);
        saveMut.mutate({ ...form, subjectName: subj?.name || subj?.subjectName || form.subjectName, className: cls?.className || cls?.name || form.className, totalMarks: Number(form.totalMarks) || 100 });
    };

    // Stable wrapper around the module-level AssignField so typed inputs keep focus.
    const Field = useCallback(
        (props: { label: string; field: string; type?: string; options?: string[]; textarea?: boolean; col?: number }) =>
            <AssignField {...props} form={form} setForm={setForm} />,
        [form],
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <button onClick={() => navigate("/academics/assignments")} className="font-bold text-gray-500 hover:text-[#5C67F2]">Assignments</button>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">{isEdit ? "Edit Assignment" : "New Assignment"}</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate("/academics/assignments")} className="h-10 px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saveMut.isPending} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition-all">
                        {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isEdit ? "Save Changes" : "Create Assignment"}
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-3xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{isEdit ? "Edit Assignment" : "New Assignment"}</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Create assignment → Save as Draft → Publish when ready → Close after deadline</p>
                </div>

                {isEdit && isLoading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Assignment Details</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <Field label="Assignment Title*" field="title" col={2} />
                                {/* Subject */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Subject</div>
                                    <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Subject —</option>
                                        {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.subjectName}</option>)}
                                    </select>
                                </div>
                                {/* Class */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class</div>
                                    <select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Class —</option>
                                        {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.className || c.name}</option>)}
                                    </select>
                                </div>
                                <Field label="Assignment Type" field="type" type="select" options={["Homework", "CAT", "Project", "Research", "Practical", "Other"]} />
                                <Field label="Due Date" field="dueDate" type="date" />
                                <Field label="Total Marks" field="totalMarks" type="number" />
                                <Field label="Status" field="status" type="select" options={["Draft", "Published", "Closed"]} />
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Content & Instructions</h3>
                            <div className="space-y-6">
                                <Field label="Instructions / Description (shown to students)" field="instructions" textarea col={2} />
                                <Field label="Teacher Notes (private — not shown to students)" field="notes" textarea col={2} />
                            </div>
                        </div>

                        {/* Status workflow info */}
                        <div className="bg-indigo-50 rounded-[1.5rem] border border-indigo-100 px-6 py-4">
                            <p className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-1">Assignment Workflow</p>
                            <p className="text-[10px] text-indigo-500 font-bold">
                                <strong>Draft</strong> → only visible to teachers · <strong>Published</strong> → visible to students · <strong>Closed</strong> → no more submissions
                            </p>
                        </div>

                        <div className="flex justify-end gap-4 pb-8">
                            <button onClick={() => navigate("/academics/assignments")} className="h-12 px-8 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                            <button onClick={handleSubmit} disabled={saveMut.isPending} className="h-12 px-8 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                                {saveMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                {isEdit ? "Save Changes" : "Create Assignment"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
