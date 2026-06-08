import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Check, Loader2, GraduationCap, ChevronRight, CheckSquare, Square } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const EXAM_TYPES = ["End Term", "Mid Term", "Opening / Opener", "CAT", "Assignment", "Mock", "KCSE", "KCPE", "Practical", "Oral", "Internal", "Other"];
const EXAM_MODES = ["Regular", "Special", "Make-up", "Remedial"];

export default function NewExamPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const qc = useQueryClient();
    const isEdit = !!id;

    const [form, setForm] = useState({
        examName: "", examCode: "", academicYear: "", term: "", termId: "",
        classLevel: "All Classes", startDate: "", endDate: "",
        type: "End Term", mode: "Regular",
        status: "Draft" as "Draft" | "Active" | "Archived",
        publishStatus: "Unpublished" as "Published" | "Unpublished",
        remarks: "",
        // Missing mark policy: how to treat subjects where no marks are entered
        // "skip"          → exclude from calculation (default — e.g. student wasn't examined on it)
        // "count_as_zero" → treat as 0/maxMarks (e.g. absent student should score 0)
        missingMarkPolicy: "skip" as "skip" | "count_as_zero",
    });

    // Subject configs: { subjectId, subjectName, maxMarks }
    const [subjectConfigs, setSubjectConfigs] = useState<{ subjectId: string; subjectName: string; maxMarks: number }[]>([]);
    const [loaded, setLoaded] = useState(false);

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: v2Terms = [] } = useQuery<any[]>({
        queryKey: ["v2_all_terms"],
        queryFn: async () => (await api.get("/v2/terms")).data || [],
    });
    const { data: v2Years = [] } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });
    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["classes"],
        queryFn: async () => (await api.get("/academics/classes")).data || [],
    });
    const { data: subjects = [] } = useQuery<any[]>({
        queryKey: ["subjects"],
        queryFn: async () => (await api.get("/subjects")).data || [],
    });

    // Load existing exam if editing
    const { data: existingExam } = useQuery({
        queryKey: ["exam_edit_data", id],
        queryFn: async () => (await api.get(`/academics/exams/${id}`)).data,
        enabled: isEdit,
        staleTime: Infinity, // don't re-fetch while editing
    });

    // Pre-fill form from fetched exam — useEffect replaces the removed onSuccess
    useEffect(() => {
        if (!existingExam || loaded) return;
        setLoaded(true);
        setForm({
            examName:           existingExam.examName           || "",
            examCode:           existingExam.examCode           || "",
            academicYear:       existingExam.academicYear       || "",
            term:               existingExam.term               || "",
            termId:             existingExam.termId             || "",
            classLevel:         existingExam.classLevel         || "All Classes",
            startDate:          existingExam.startDate?.split("T")[0] || "",
            endDate:            existingExam.endDate?.split("T")[0]   || "",
            type:               existingExam.type               || "End Term",
            mode:               existingExam.mode               || "Regular",
            status:             existingExam.status             || "Draft",
            publishStatus:      existingExam.publishStatus      || "Unpublished",
            remarks:            existingExam.remarks            || "",
            missingMarkPolicy:  existingExam.missingMarkPolicy  || "skip",
        });
        if (existingExam.subjectConfigs?.length) {
            setSubjectConfigs(existingExam.subjectConfigs);
        }
    }, [existingExam, loaded]);

    // Active term / year from V2
    const activeTerm = v2Terms.find((t: any) => t.isActive);
    const activeYear = v2Years.find((y: any) => y.isActive);

    // Pre-fill handled below by useEffect with prefilledRef guard

    const allTermsOrdered = v2Terms
        .map((t: any) => ({ ...t, yearObj: v2Years.find((y: any) => y._id === t.academicYearId) }))
        .sort((a: any, b: any) => Number(a.yearObj?.year || 0) - Number(b.yearObj?.year || 0) || Number(a.termNumber || 0) - Number(b.termNumber || 0));

    // Pre-fill active term ONCE using a ref guard — avoids the useMemo-with-setForm
    // anti-pattern that caused inputs to lose focus after every keystroke.
    const prefilledRef = useRef(false);
    useEffect(() => {
        if (!isEdit && activeTerm && activeYear && !prefilledRef.current) {
            prefilledRef.current = true;
            setForm(f => ({
                ...f,
                term:         f.term     || activeTerm.name,
                termId:       f.termId   || activeTerm._id,
                academicYear: f.academicYear || String(activeYear.year),
            }));
        }
    }, [activeTerm, activeYear, isEdit]);

    // ── Subject handling ──────────────────────────────────────────────────────
    const isSubjectSelected = (sid: string) => subjectConfigs.some(s => s.subjectId === sid);

    const toggleSubject = (sub: any) => {
        const sid = sub._id?.toString();
        if (isSubjectSelected(sid)) {
            setSubjectConfigs(prev => prev.filter(s => s.subjectId !== sid));
        } else {
            setSubjectConfigs(prev => [...prev, { subjectId: sid, subjectName: sub.name || sub.subjectName, maxMarks: 100 }]);
        }
    };

    const selectAll = () => {
        setSubjectConfigs(subjects.map((sub: any) => ({
            subjectId: sub._id?.toString(), subjectName: sub.name || sub.subjectName, maxMarks: 100
        })));
    };

    const clearAll = () => setSubjectConfigs([]);

    const updateMaxMarks = (sid: string, val: number) => {
        setSubjectConfigs(prev => prev.map(s => s.subjectId === sid ? { ...s, maxMarks: val } : s));
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const saveMut = useMutation({
        mutationFn: async (data: any) => isEdit
            ? api.patch(`/academics/exams/${id}`, data)
            : api.post("/academics/exams", data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["exams"] });
            qc.invalidateQueries({ queryKey: ["exam_detail", id] });
            qc.invalidateQueries({ queryKey: ["exam_edit_data", id] });
            toast.success(isEdit ? "Exam updated successfully!" : "Exam created!");
            // After edit → go back to the exam detail page; after create → exam list
            navigate(isEdit ? `/exams/${id}` : "/exams/create");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const handleSubmit = () => {
        if (!form.examName.trim()) { toast.error("Exam name is required"); return; }
        if (!form.startDate || !form.endDate) { toast.error("Start and end dates are required"); return; }
        saveMut.mutate({ ...form, subjectConfigs });
    };

    const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
            {children}
        </div>
    );

    const inputCls = "w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:border-[#5C67F2] transition-colors";
    const selectCls = inputCls + " appearance-none cursor-pointer";

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col pb-10">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(isEdit ? `/exams/${id}` : "/exams/create")} className="text-gray-400 hover:text-[#5C67F2] transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 font-medium text-sm cursor-pointer hover:text-[#5C67F2]" onClick={() => navigate(isEdit ? `/exams/${id}` : "/exams/create")}>
                        {isEdit ? (existingExam?.examName || "Exam") : "Exams"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    <span className="font-black text-[#5C67F2] text-sm">{isEdit ? "Edit Exam" : "New Exam"}</span>
                </div>
                {/* Active period badge */}
                {activeTerm && activeYear && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                            {activeTerm.name} · {activeYear.year}
                        </span>
                    </div>
                )}
            </div>

            <div className="max-w-4xl mx-auto w-full px-6 pt-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">{isEdit ? "Edit Exam" : "Create New Exam"}</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Schedule an examination and configure the subjects to be assessed.</p>
                </div>

                {/* ── Section 1: Exam Details ─────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <h2 className="text-sm font-black text-gray-800 border-b border-gray-100 pb-3">Exam Details</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Exam Name *">
                            <input value={form.examName} onChange={f("examName")} placeholder="e.g. End of Term 1 Examination"
                                className={inputCls} />
                        </Field>
                        <Field label="Exam Code">
                            <input value={form.examCode} onChange={f("examCode")} placeholder="e.g. EXAM-2026-T1"
                                className={inputCls} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Academic Year">
                            <select value={form.academicYear} onChange={f("academicYear")} className={selectCls}>
                                <option value="">— Select Year —</option>
                                {v2Years.map((y: any) => (
                                    <option key={y._id} value={String(y.year)}>
                                        {y.year}{y.isActive ? " (Active)" : ""}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Current Term">
                            {allTermsOrdered.length > 0 ? (
                                <select value={form.termId}
                                    onChange={e => {
                                        const t = allTermsOrdered.find((x: any) => x._id === e.target.value);
                                        setForm(prev => ({ ...prev, termId: e.target.value, term: t?.name || "" }));
                                    }}
                                    className={selectCls}>
                                    <option value="">— Select Term —</option>
                                    {allTermsOrdered.map((t: any) => (
                                        <option key={t._id} value={t._id}>
                                            {t.name} {t.yearObj?.year}{t.isActive ? " ★ Active" : ""}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="w-full h-11 px-4 border border-amber-200 rounded-xl text-sm font-bold text-amber-600 bg-amber-50 flex items-center gap-2">
                                    ⚠ No active term — set one in Learning Periods
                                </div>
                            )}
                        </Field>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Exam Type">
                            <select value={form.type} onChange={f("type")} className={selectCls}>
                                {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Field>
                        <Field label="Mode">
                            <select value={form.mode} onChange={f("mode")} className={selectCls}>
                                {EXAM_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </Field>
                        <Field label="Class">
                            <select value={form.classLevel} onChange={f("classLevel")} className={selectCls}>
                                <option value="All Classes">All Classes</option>
                                {classes.map((c: any) => <option key={c._id} value={c.levelName || c.name}>{c.levelName || c.name}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Start Date *">
                            <input type="date" value={form.startDate} onChange={f("startDate")} className={inputCls} />
                        </Field>
                        <Field label="End Date *">
                            <input type="date" value={form.endDate} onChange={f("endDate")} className={inputCls} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Status">
                            <select value={form.status} onChange={f("status")} className={selectCls}>
                                {["Draft","Active","Archived"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>
                        <Field label="Publish Status">
                            <select value={form.publishStatus} onChange={f("publishStatus")} className={selectCls}>
                                {["Unpublished","Published"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>
                    </div>

                    <Field label="Remarks (optional)">
                        <textarea value={form.remarks} onChange={f("remarks")} rows={2}
                            placeholder="Any notes about this examination..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:border-[#5C67F2] resize-none" />
                    </Field>

                    {/* Missing mark policy */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Missing Marks Policy
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                {
                                    value: "skip",
                                    title: "Skip / Exclude",
                                    desc: "Subjects with no marks entered are excluded from total and percentage calculations. Only scored subjects count.",
                                    example: "MATH 67 + ENG 67 = 134/200 = 67%",
                                    color: "#5C67F2",
                                },
                                {
                                    value: "count_as_zero",
                                    title: "Count as Zero",
                                    desc: "Subjects with no marks are treated as 0/maxMarks. Reflects students who were absent or did not attempt the paper.",
                                    example: "MATH 67 + ENG 67 + KISW 0 = 134/300 = 45%",
                                    color: "#EF4444",
                                },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, missingMarkPolicy: opt.value as any }))}
                                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                                        form.missingMarkPolicy === opt.value
                                            ? "border-[#5C67F2] bg-[#5C67F2]/5"
                                            : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.missingMarkPolicy === opt.value ? "border-[#5C67F2] bg-[#5C67F2]" : "border-gray-300"}`}>
                                            {form.missingMarkPolicy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-sm font-black text-gray-800">{opt.title}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed mb-2">{opt.desc}</p>
                                    <p className="text-[9px] font-mono font-bold text-gray-400 bg-gray-100 rounded px-2 py-1">
                                        e.g. {opt.example}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Section 2: Subjects to be Examined ─────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <div>
                            <h2 className="text-sm font-black text-gray-800">Subjects to be Examined</h2>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                Select subjects and set maximum marks — used for grading and report card calculations
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400">{subjectConfigs.length} selected</span>
                            <button onClick={selectAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5C67F2] text-white text-[10px] font-black uppercase rounded-lg hover:bg-[#4a54c4] transition-all">
                                <CheckSquare className="w-3 h-3" /> Select All
                            </button>
                            {subjectConfigs.length > 0 && (
                                <button onClick={clearAll}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-200 transition-all">
                                    <Square className="w-3 h-3" /> Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {subjects.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <p className="text-sm font-bold">No subjects configured</p>
                            <p className="text-xs mt-1">Add subjects in the Subjects module first</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {subjects.map((sub: any) => {
                                const sid = sub._id?.toString();
                                const selected = isSubjectSelected(sid);
                                const config = subjectConfigs.find(s => s.subjectId === sid);
                                return (
                                    <div key={sid}
                                        className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${selected ? "border-[#5C67F2]/30 bg-[#5C67F2]/5" : "border-gray-100 bg-gray-50/50 hover:border-gray-200"}`}>
                                        <button type="button" onClick={() => toggleSubject(sub)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "bg-[#5C67F2] border-[#5C67F2]" : "border-gray-300 hover:border-[#5C67F2]"}`}>
                                            {selected && <Check className="w-3 h-3 text-white" />}
                                        </button>
                                        <div className="flex-1" onClick={() => toggleSubject(sub)}>
                                            <p className={`text-sm font-bold cursor-pointer ${selected ? "text-[#5C67F2]" : "text-gray-700"}`}>
                                                {sub.name || sub.subjectName}
                                            </p>
                                            {sub.className && <p className="text-[10px] text-gray-400">{sub.className}</p>}
                                        </div>
                                        {selected && (
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wide">Max Marks</label>
                                                <input
                                                    type="number" min={1} max={1000}
                                                    value={config?.maxMarks ?? 100}
                                                    onChange={e => updateMaxMarks(sid, Number(e.target.value))}
                                                    onClick={e => e.stopPropagation()}
                                                    className="w-20 h-8 px-2 text-center border border-[#5C67F2]/30 rounded-lg text-sm font-black text-[#5C67F2] focus:outline-none focus:border-[#5C67F2]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Selected subjects summary */}
                    {subjectConfigs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-500">
                                {subjectConfigs.length} subjects · Total max: {subjectConfigs.reduce((s, c) => s + (c.maxMarks || 0), 0)} marks
                            </span>
                            <span className="text-[#5C67F2] font-black">
                                Avg per subject: {Math.round(subjectConfigs.reduce((s, c) => s + (c.maxMarks || 0), 0) / subjectConfigs.length)} marks
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Actions ─────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 pb-4">
                    <button onClick={() => navigate(isEdit ? `/exams/${id}` : "/exams/create")}
                        className="h-11 px-6 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saveMut.isPending}
                        className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 transition-all disabled:opacity-50">
                        {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isEdit ? "Save Changes" : "Create Exam"}
                    </button>
                </div>
            </div>
        </div>
    );
}
