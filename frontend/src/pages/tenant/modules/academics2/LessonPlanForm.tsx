import { useState, useEffect } from "react";
import { Home, Check, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyForm = {
    subjectId: "", subjectName: "", classId: "", className: "",
    date: "", duration: "40", topic: "", strand: "",
    objectives: "", teachingAids: "", introduction: "",
    development: "", conclusion: "", assessment: "", homework: "",
    teacherNotes: "", status: "Draft",
};

export default function LessonPlanForm() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const isEdit = !!id;

    const [form, setForm] = useState(emptyForm);

    const { data: subjects = [] } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; },
    });

    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; },
    });
    // Curriculum-aware terminology (Subject vs Learning Area), resolved from backend.
    const { data: curriculum } = useQuery({
        queryKey: ["class_curriculum", form.classId],
        enabled: !!form.classId,
        queryFn: async () => (await api.get(`/class/${form.classId}/curriculum`)).data,
    });
    const subjectTerm = curriculum?.config?.terminology?.subject || "Subject";

    const { data: existing, isLoading: loadingExisting } = useQuery({
        queryKey: ["lesson_plan_single", id],
        queryFn: async () => {
            const r = await api.get(`/lesson_plans/${id}`);
            return r.data;
        },
        enabled: isEdit,
    });

    useEffect(() => {
        if (existing) {
            setForm({
                subjectId: existing.subjectId || "",
                subjectName: existing.subjectName || "",
                classId: existing.classId || "",
                className: existing.className || "",
                date: existing.date || "",
                duration: String(existing.duration || 40),
                topic: existing.topic || "",
                strand: existing.strand || "",
                objectives: existing.objectives || "",
                teachingAids: existing.teachingAids || "",
                introduction: existing.introduction || "",
                development: existing.development || "",
                conclusion: existing.conclusion || "",
                assessment: existing.assessment || "",
                homework: existing.homework || "",
                teacherNotes: existing.teacherNotes || "",
                status: existing.status || "Draft",
            });
        }
    }, [existing]);

    const saveMut = useMutation({
        mutationFn: (payload: any) => isEdit
            ? api.patch(`/lesson_plans/${id}`, payload)
            : api.post("/lesson_plans", payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["lesson_plans"] });
            toast.success(isEdit ? "Lesson plan updated" : "Lesson plan created");
            navigate("/academics/lesson-plans");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const handleSubmit = () => {
        if (!form.topic.trim()) { toast.error("Topic / Lesson Title is required"); return; }
        const subj = subjects.find((s: any) => s._id === form.subjectId);
        const cls = classes.find((c: any) => c._id === form.classId);
        saveMut.mutate({
            ...form,
            subjectName: subj?.name || subj?.subjectName || form.subjectName,
            className: cls?.className || cls?.name || form.className,
            duration: Number(form.duration) || 40,
        });
    };

    const F = ({ label, field, type = "text", options, textarea, col }: any) => (
        <div className={`relative ${col === 2 ? "col-span-2" : ""}`}>
            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{label}</div>
            {type === "select" ? (
                <select value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                    {options.map((o: string) => <option key={o}>{o}</option>)}
                </select>
            ) : textarea ? (
                <textarea value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
            ) : (
                <input type={type} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
            )}
        </div>
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <button onClick={() => navigate("/academics/lesson-plans")} className="font-bold text-gray-500 hover:text-[#5C67F2] transition-colors">Lesson Plans</button>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">{isEdit ? "Edit Lesson Plan" : "New Lesson Plan"}</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate("/academics/lesson-plans")}
                        className="h-10 px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saveMut.isPending}
                        className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition-all">
                        {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isEdit ? "Save Changes" : "Create Lesson Plan"}
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                        {isEdit ? "Edit Lesson Plan" : "New Lesson Plan"}
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                        {isEdit ? "Update the lesson plan details below" : "Fill in the structured lesson plan form below"}
                    </p>
                </div>

                {isEdit && loadingExisting ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase">
                        <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading lesson plan...
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Section 1: Basic Info */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-6">
                                {/* Subject */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{subjectTerm}</div>
                                    <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Subject —</option>
                                        {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.subjectName}</option>)}
                                    </select>
                                </div>
                                {/* Class */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class</div>
                                    <select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Class —</option>
                                        {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.className || c.name}</option>)}
                                    </select>
                                </div>

                                <F label="Topic / Lesson Title*" field="topic" col={2} />
                                <F label="Strand / Theme" field="strand" />
                                <F label="Date" field="date" type="date" />
                                <F label="Duration (minutes)" field="duration" type="number" />
                                <F label="Status" field="status" type="select" options={["Draft", "In Progress", "Completed"]} />
                            </div>
                        </div>

                        {/* Section 2: Learning Objectives */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Learning Objectives & Resources</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <F label="Learning Objectives / Expected Outcomes*" field="objectives" textarea col={2} />
                                <F label="Teaching Aids / Materials Needed" field="teachingAids" textarea col={2} />
                            </div>
                        </div>

                        {/* Section 3: Lesson Phases */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Lesson Phases</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Introduction (10%)</div>
                                    <textarea value={form.introduction} onChange={e => setForm({ ...form, introduction: e.target.value })} rows={4}
                                        placeholder="Hook / motivating activity to engage students..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-[#5C67F2] text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Development / Main Activity (70%)</div>
                                    <textarea value={form.development} onChange={e => setForm({ ...form, development: e.target.value })} rows={4}
                                        placeholder="Main teaching activities, explanations, demonstrations..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-amber-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Conclusion (20%)</div>
                                    <textarea value={form.conclusion} onChange={e => setForm({ ...form, conclusion: e.target.value })} rows={4}
                                        placeholder="Summary, recap, wrap-up activity..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-rose-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Assessment Method</div>
                                    <textarea value={form.assessment} onChange={e => setForm({ ...form, assessment: e.target.value })} rows={4}
                                        placeholder="How will you assess student learning? (quiz, observation, etc.)"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-rose-500 text-xs font-bold text-slate-700 resize-none" />
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Follow-up */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Follow-up & Reflection</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <F label="Homework / Assignment" field="homework" textarea />
                                <F label="Teacher Notes & Reflection" field="teacherNotes" textarea />
                            </div>
                        </div>

                        {/* Bottom save */}
                        <div className="flex justify-end gap-4 pb-8">
                            <button onClick={() => navigate("/academics/lesson-plans")}
                                className="h-12 px-8 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all">
                                Cancel
                            </button>
                            <button onClick={handleSubmit} disabled={saveMut.isPending}
                                className="h-12 px-8 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                                {saveMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                {isEdit ? "Save Changes" : "Create Lesson Plan"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
