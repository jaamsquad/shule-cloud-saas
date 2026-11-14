import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, ChevronRight, CheckSquare, Square, AlertTriangle, FileText, Layers, Repeat, BarChart3 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

// Four kinds of exam a school creates — deliberately no "KCSE" entry: KCSE is a grading
// convention (lib/grading.ts), never a creatable exam type here.
type ExamCategory = "written_test" | "consolidated" | "supplementary" | "year_average";
const CATEGORIES: { key: ExamCategory; label: string; icon: any; blurb: string }[] = [
    { key: "written_test", label: "Written test", icon: FileText, blurb: "A normal sat exam — CAT, Opener, Mid Term, End Term, Mock, etc." },
    { key: "consolidated", label: "Consolidated Exam", icon: Layers, blurb: "Combine several written tests from a term into one ranked result." },
    { key: "supplementary", label: "Supplementary Exam", icon: Repeat, blurb: "A retake, for specific subjects and classes." },
    { key: "year_average", label: "Year Average", icon: BarChart3, blurb: "Rank a class on its average across the year's exams." },
];
const RANKING_CRITERIA = [
    { key: "meanMarks", label: "Rank by Mean marks" },
    { key: "oldKcsePoints", label: "Rank by Old KCSE points" },
    { key: "newKcsePoints", label: "Rank by New KCSE points" },
    { key: "meanPoints", label: "Rank by Mean points" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:border-[#5C67F2] transition-colors";
const selectCls = inputCls + " appearance-none cursor-pointer";
// Case/whitespace-normalized so "Grade 11" matches a source exam stored as "grade  11" or
// "GRADE 11 EAST" — written tests aren't always created through this exact flow (older ones,
// imports, admin edits), so their classLevel text can differ in case/spacing from the Form/
// Grade dropdown's value even when they mean the same class.
const levelOf = (name: string) => (String(name || "").match(/(form|grade)\s*\d+/i)?.[0] || String(name || "")).toLowerCase().replace(/\s+/g, " ").trim();
// Academic year is usually a plain year ("2027"), but exams created before this flow
// existed can carry a legacy composite value ("2026/2027") — match if the picked year
// appears anywhere in the exam's stored value, so those older exams still show up.
const yearMatches = (examYear: any, wantYear: string) => {
    if (!wantYear) return false;
    const years: string[] = String(examYear || "").match(/\d{4}/g) || [];
    return years.includes(String(wantYear).trim());
};
// Term is usually a bare name ("Term 1"), but legacy exams can carry "Term 1 (2026/2027)" —
// match on the leading "Term N" only.
const termKeyOf = (t: any) => String(t || "").match(/term\s*\d+/i)?.[0]?.toLowerCase().replace(/\s+/g, " ") || String(t || "").trim().toLowerCase();
const termMatches = (examTerm: any, wantTermName: string) => termKeyOf(examTerm) === termKeyOf(wantTermName);

export default function NewExamPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const qc = useQueryClient();
    const isEdit = !!id;

    const [category, setCategory] = useState<ExamCategory>("written_test");

    // ── Shared reference data ────────────────────────────────────────────────
    const { data: v2Terms = [] } = useQuery<any[]>({ queryKey: ["v2_all_terms"], queryFn: async () => (await api.get("/v2/terms")).data || [] });
    const { data: v2Years = [] } = useQuery<any[]>({ queryKey: ["v2_academic_years"], queryFn: async () => (await api.get("/v2/academic-years")).data || [] });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data || [] });
    const { data: gradingTemplates = [] } = useQuery<any[]>({ queryKey: ["grading_templates"], queryFn: async () => (await api.get("/grading-templates")).data || [] });
    const { data: allExams = [] } = useQuery<any[]>({ queryKey: ["academics_exams_all"], queryFn: async () => (await api.get("/academics/exams")).data || [] });

    const activeTerm = v2Terms.find((t: any) => t.isActive);
    const activeYear = v2Years.find((y: any) => y.isActive);

    // Load existing exam if editing (edit still uses the classic single-exam form).
    const { data: existingExam } = useQuery({
        queryKey: ["exam_edit_data", id],
        queryFn: async () => (await api.get(`/academics/exams/${id}`)).data,
        enabled: isEdit, staleTime: Infinity,
    });

    const createMany = useMutation({
        mutationFn: (docs: any[]) => Promise.all(docs.map(d => api.post("/academics/exams", d))),
        onSuccess: (_r, docs) => {
            qc.invalidateQueries({ queryKey: ["exams"] });
            qc.invalidateQueries({ queryKey: ["academics_exams_all"] });
            toast.success(`${docs.length > 1 ? `${docs.length} exams created` : "Exam created"}!`);
            navigate("/exams/create");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const updateOne = useMutation({
        mutationFn: (data: any) => api.patch(`/academics/exams/${id}`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["exams"] }); toast.success("Exam updated successfully!"); navigate(`/exams/${id}`); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    if (isEdit) return <EditExamForm existingExam={existingExam} classes={classes} subjects={subjects} saving={updateOne.isPending} onSave={d => updateOne.mutate(d)} onCancel={() => navigate(`/exams/${id}`)} />;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col pb-10">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate("/exams/create")} className="text-gray-400 hover:text-[#5C67F2] transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 font-medium text-sm cursor-pointer hover:text-[#5C67F2]" onClick={() => navigate("/exams/create")}>Exams</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    <span className="font-black text-[#5C67F2] text-sm">New Exam</span>
                </div>
                {activeTerm && activeYear && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">{activeTerm.name} · {activeYear.year}</span>
                    </div>
                )}
            </div>

            <div className="max-w-4xl mx-auto w-full px-6 pt-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Create New Exam</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Schedule an examination and configure the classes to be assessed.</p>
                </div>

                {/* Exam Type */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <h2 className="text-sm font-black text-gray-800 border-b border-gray-100 pb-3">Exam Type</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {CATEGORIES.map(c => (
                            <button key={c.key} type="button" onClick={() => setCategory(c.key)}
                                className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${category === c.key ? "border-[#5C67F2] bg-[#5C67F2]/5" : "border-gray-200 bg-gray-50/50 hover:border-gray-300"}`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${category === c.key ? "bg-[#5C67F2] text-white" : "bg-white text-gray-400 border border-gray-200"}`}><c.icon className="w-4.5 h-4.5" /></div>
                                <div>
                                    <p className={`text-sm font-black ${category === c.key ? "text-[#5C67F2]" : "text-gray-800"}`}>{c.label}</p>
                                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">{c.blurb}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {category === "written_test" && <WrittenTestForm v2Terms={v2Terms} v2Years={v2Years} classes={classes} subjects={subjects} activeTerm={activeTerm} activeYear={activeYear} saving={createMany.isPending} onCreate={docs => createMany.mutate(docs)} onCancel={() => navigate("/exams/create")} />}
                {category === "consolidated" && <ConsolidatedForm v2Terms={v2Terms} v2Years={v2Years} classes={classes} allExams={allExams} saving={createMany.isPending} onCreate={docs => createMany.mutate(docs)} onCancel={() => navigate("/exams/create")} />}
                {category === "supplementary" && <SupplementaryForm v2Terms={v2Terms} v2Years={v2Years} classes={classes} subjects={subjects} activeTerm={activeTerm} activeYear={activeYear} saving={createMany.isPending} onCreate={docs => createMany.mutate(docs)} onCancel={() => navigate("/exams/create")} />}
                {category === "year_average" && <YearAverageForm v2Terms={v2Terms} activeTerm={activeTerm} v2Years={v2Years} classes={classes} subjects={subjects} allExams={allExams} gradingTemplates={gradingTemplates} saving={createMany.isPending} onCreate={docs => createMany.mutate(docs)} onCancel={() => navigate("/exams/create")} />}
            </div>
        </div>
    );
}

// ── Written test ──────────────────────────────────────────────────────────────
function WrittenTestForm({ v2Terms, v2Years, classes, subjects, activeTerm, activeYear, saving, onCreate, onCancel }: any) {
    const [examName, setExamName] = useState("");
    const [termId, setTermId] = useState(activeTerm?._id || "");
    const [year, setYear] = useState(activeYear ? String(activeYear.year) : "");
    const [forms, setForms] = useState<Record<string, { checked: boolean; minSubjects: string }>>({});
    const [subjectConfigs, setSubjectConfigs] = useState<{ subjectId: string; subjectName: string; maxMarks: number }[]>([]);

    const term = v2Terms.find((t: any) => t._id === termId);
    const toggleForm = (name: string) => setForms(p => ({ ...p, [name]: { checked: !p[name]?.checked, minSubjects: p[name]?.minSubjects || "" } }));
    const setMin = (name: string, v: string) => setForms(p => ({ ...p, [name]: { checked: true, minSubjects: v } }));

    const isSubjectSelected = (sid: string) => subjectConfigs.some(s => s.subjectId === sid);
    const toggleSubject = (sub: any) => { const sid = sub._id?.toString(); setSubjectConfigs(prev => isSubjectSelected(sid) ? prev.filter(s => s.subjectId !== sid) : [...prev, { subjectId: sid, subjectName: sub.name || sub.subjectName, maxMarks: 100 }]); };
    const selectAllSubjects = () => setSubjectConfigs(subjects.map((s: any) => ({ subjectId: s._id?.toString(), subjectName: s.name || s.subjectName, maxMarks: 100 })));

    const submit = () => {
        if (!examName.trim()) { toast.error("Exam name is required"); return; }
        const picked = Object.entries(forms).filter(([, v]) => v.checked);
        if (!picked.length) { toast.error("Pick at least one form/grade"); return; }
        const docs = picked.map(([className, v]) => ({
            examCategory: "written_test", examName, type: examName, term: term?.name || "", termId, academicYear: year,
            classLevel: className, minSubjects: Number(v.minSubjects) || undefined, status: "Draft", publishStatus: "Unpublished",
            subjectConfigs, startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10),
        }));
        onCreate(docs);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-black text-gray-800 border-b border-gray-100 pb-3">Written Test</h2>
            <Field label="Exam Name *"><input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Opener Exam" className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Term">
                    <select value={termId} onChange={e => setTermId(e.target.value)} className={selectCls}>
                        <option value="">— Select Term —</option>
                        {v2Terms.map((t: any) => <option key={t._id} value={t._id}>{t.name}{t.isActive ? " · Active" : ""}</option>)}
                    </select>
                </Field>
                <Field label="Year">
                    <select value={year} onChange={e => setYear(e.target.value)} className={selectCls}>
                        <option value="">— Select Year —</option>
                        {v2Years.map((y: any) => <option key={y._id} value={String(y.year)}>{y.year}{y.isActive ? " (Active)" : ""}</option>)}
                    </select>
                </Field>
            </div>
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Form that sat for the exam</label>
                <div className="space-y-2">
                    {classes.map((c: any) => (
                        <div key={c._id} className="flex items-center gap-3">
                            <button type="button" onClick={() => toggleForm(c.name)} className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${forms[c.name]?.checked ? "bg-[#5C67F2] border-[#5C67F2]" : "border-gray-300"}`}>{forms[c.name]?.checked && <Check className="w-3 h-3 text-white" />}</button>
                            <span className="text-sm font-bold text-gray-700 w-32">{c.name}</span>
                            <input value={forms[c.name]?.minSubjects || ""} onChange={e => setMin(c.name, e.target.value)} type="number" min={0} placeholder="Minimum subjects that can be taken" className={inputCls + " flex-1"} />
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Subjects to be Examined</label>
                    <button onClick={selectAllSubjects} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5C67F2] text-white text-[10px] font-black uppercase rounded-lg"><CheckSquare className="w-3 h-3" /> Select All</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {subjects.map((sub: any) => {
                        const sid = sub._id?.toString(); const selected = isSubjectSelected(sid);
                        return <button key={sid} type="button" onClick={() => toggleSubject(sub)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${selected ? "bg-[#5C67F2]/10 border-[#5C67F2] text-[#5C67F2]" : "border-gray-200 text-gray-500"}`}>{sub.name || sub.subjectName}</button>;
                    })}
                </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
                <button onClick={onCancel} className="h-11 px-6 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl">Cancel</button>
                <button onClick={submit} disabled={saving} className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create
                </button>
            </div>
        </div>
    );
}

// ── Consolidated Exam ───────────────────────────────────────────────────────
function ConsolidatedForm({ v2Terms, v2Years, classes, allExams, saving, onCreate, onCancel }: any) {
    const [examName, setExamName] = useState("");
    const [year, setYear] = useState("");
    const [termNames, setTermNames] = useState<Set<string>>(new Set());
    const [form, setForm] = useState("");
    const [specifying, setSpecifying] = useState(false);
    const [sourceIds, setSourceIds] = useState<Set<string>>(new Set());

    const toggleTerm = (name: string) => setTermNames(p => { const n = new Set(p); if (n.has(name)) n.delete(name); else n.add(name); return n; });
    const candidates = useMemo(() => allExams.filter((e: any) =>
        (e.examCategory || "written_test") === "written_test" && yearMatches(e.academicYear, year)
        && levelOf(e.classLevel) === levelOf(form) && (termNames.size === 0 || [...termNames].some(tn => termMatches(e.term, tn)))
    ), [allExams, year, form, termNames]);

    // When a term ends up with exactly one candidate exam, pre-check it — nothing to
    // pick between. Terms with two or more stay manual checkboxes.
    useEffect(() => {
        if (!specifying) return;
        setSourceIds(prev => {
            const next = new Set(prev);
            let changed = false;
            for (const termName of new Set(candidates.map((e: any) => e.term || "—"))) {
                const matches = candidates.filter((e: any) => (e.term || "—") === termName);
                if (matches.length === 1 && !next.has(matches[0]._id)) { next.add(matches[0]._id); changed = true; }
            }
            return changed ? next : prev;
        });
    }, [candidates, specifying]);

    const submit = () => {
        if (!examName.trim()) { toast.error("Exam name is required"); return; }
        if (!form || !year) { toast.error("Pick a form/grade and academic year"); return; }
        if (!sourceIds.size) { toast.error("Pick at least one exam to consolidate"); return; }
        onCreate([{ examCategory: "consolidated", examName, type: examName, academicYear: year, term: [...termNames].join(" + "), classLevel: form, sourceExamIds: [...sourceIds], status: "Active", publishStatus: "Published" }]);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-black text-gray-800 border-b border-gray-100 pb-3">Consolidated Exams</h2>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Exam Name *"><input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Term 1 Consolidated" className={inputCls} /></Field>
                <Field label="Academic Year *">
                    <select value={year} onChange={e => setYear(e.target.value)} className={selectCls}>
                        <option value="">Academic Year</option>
                        {v2Years.map((y: any) => <option key={y._id} value={String(y.year)}>{y.year}</option>)}
                    </select>
                </Field>
            </div>
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Consolidate exams using:</label>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Select Term</p>
                        <div className="flex flex-wrap gap-3">
                            {[...new Set(v2Terms.map((t: any) => t.name))].map((name: any) => (
                                <label key={name} className="flex items-center gap-2 text-sm font-bold text-gray-700"><input type="checkbox" checked={termNames.has(name)} onChange={() => toggleTerm(name)} /> {name}</label>
                            ))}
                        </div>
                    </div>
                    <Field label="Form / Grade *">
                        <select value={form} onChange={e => { setForm(e.target.value); setSpecifying(false); setSourceIds(new Set()); }} className={selectCls}>
                            <option value="">Select Form / Grade</option>
                            {classes.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                        </select>
                    </Field>
                </div>
            </div>
            {!specifying ? (
                <div className="flex justify-end">
                    <button onClick={() => { if (!form || !year) { toast.error("Pick a form/grade and academic year first"); return; } setSpecifying(true); }} className="h-10 px-5 bg-[#5C67F2] text-white font-black text-xs uppercase rounded-xl">Specify Classes</button>
                </div>
            ) : (
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Exams to combine ({candidates.length} found)</label>
                    {candidates.length === 0 ? <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> No written-test exams found for this form, year and term(s) yet.</p> : (
                        <div className="space-y-3">
                            {/* One group per term that has matching exams — every term with 1+ exam shows them here, all selectable. */}
                            {[...new Set(candidates.map((e: any) => e.term || "—"))].map(termName => (
                                <div key={termName} className="border border-gray-100 rounded-xl overflow-hidden">
                                    <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">{termName}</div>
                                    <div className="divide-y divide-gray-50">
                                        {candidates.filter((e: any) => (e.term || "—") === termName).map((e: any) => (
                                            <label key={e._id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer">
                                                <input type="checkbox" checked={sourceIds.has(e._id)} onChange={() => setSourceIds(p => { const n = new Set(p); if (n.has(e._id)) n.delete(e._id); else n.add(e._id); return n; })} />
                                                <span className="text-sm font-bold text-gray-700">{e.examName}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase ml-auto">{e.classLevel}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <div className="flex items-center gap-3 pt-2">
                <button onClick={onCancel} className="h-11 px-6 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl">Cancel</button>
                <button onClick={submit} disabled={saving} className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create
                </button>
            </div>
        </div>
    );
}

// ── Supplementary Exam ──────────────────────────────────────────────────────
function SupplementaryForm({ v2Terms, v2Years, classes, subjects, activeTerm, activeYear, saving, onCreate, onCancel }: any) {
    const [examName, setExamName] = useState("");
    const [termId, setTermId] = useState(activeTerm?._id || "");
    const [year, setYear] = useState(activeYear ? String(activeYear.year) : "");
    const [subjectIds, setSubjectIds] = useState<Set<string>>(new Set());
    const [forms, setForms] = useState<Set<string>>(new Set());

    const term = v2Terms.find((t: any) => t._id === termId);
    const toggleSubject = (sid: string) => setSubjectIds(p => { const n = new Set(p); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });
    const toggleForm = (name: string) => setForms(p => { const n = new Set(p); if (n.has(name)) n.delete(name); else n.add(name); return n; });

    const submit = () => {
        if (!examName.trim()) { toast.error("Exam name is required"); return; }
        if (!forms.size) { toast.error("Pick at least one form/grade"); return; }
        const subjectConfigs = subjects.filter((s: any) => subjectIds.has(s._id?.toString())).map((s: any) => ({ subjectId: s._id?.toString(), subjectName: s.name || s.subjectName, maxMarks: 100 }));
        const docs = [...forms].map(className => ({
            examCategory: "supplementary", examName, type: examName, term: term?.name || "", termId, academicYear: year,
            classLevel: className, subjectConfigs, status: "Draft", publishStatus: "Unpublished",
            startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10),
        }));
        onCreate(docs);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-black text-gray-800 border-b border-gray-100 pb-3">Supplementary Exam</h2>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Year *">
                    <select value={year} onChange={e => setYear(e.target.value)} className={selectCls}>
                        <option value="">Select Year</option>
                        {v2Years.map((y: any) => <option key={y._id} value={String(y.year)}>{y.year}</option>)}
                    </select>
                </Field>
                <Field label="Term *">
                    <select value={termId} onChange={e => setTermId(e.target.value)} className={selectCls}>
                        <option value="">Select Term</option>
                        {v2Terms.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                </Field>
            </div>
            <Field label="Exam Name *"><input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Mathematics Supplementary" className={inputCls} /></Field>
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Select Subjects</label>
                <div className="grid grid-cols-4 gap-2">
                    {subjects.map((s: any) => { const sid = s._id?.toString(); return (
                        <label key={sid} className="flex items-center gap-2 text-sm font-bold text-gray-700"><input type="checkbox" checked={subjectIds.has(sid)} onChange={() => toggleSubject(sid)} /> {s.name || s.subjectName}</label>
                    ); })}
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Form that sat for the exam</label>
                <div className="flex flex-wrap gap-4">
                    {classes.map((c: any) => <label key={c._id} className="flex items-center gap-2 text-sm font-bold text-gray-700"><input type="checkbox" checked={forms.has(c.name)} onChange={() => toggleForm(c.name)} /> {c.name}</label>)}
                </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
                <button onClick={onCancel} className="h-11 px-6 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl">Cancel</button>
                <button onClick={submit} disabled={saving} className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create
                </button>
            </div>
        </div>
    );
}

// ── Year Average ─────────────────────────────────────────────────────────────
function YearAverageForm({ v2Terms, activeTerm, v2Years, classes, subjects, allExams, gradingTemplates, saving, onCreate, onCancel }: any) {
    const [form, setForm] = useState("");
    const [year, setYear] = useState("");
    const [termExamIds, setTermExamIds] = useState<Record<string, string[]>>({ "Term 1": [], "Term 2": [], "Term 3": [] });
    const [rankingCriteria, setRankingCriteria] = useState("meanMarks");
    const [minSubjects, setMinSubjects] = useState("7");
    const [overallGrading, setOverallGrading] = useState("");
    const [subjectGrading, setSubjectGrading] = useState<Record<string, string>>({});
    // A Year Average normally stands on its own ("Year" group in Manage Exams). Some
    // schools instead want it to COUNT AS a specific term's own exam (e.g. publish it as
    // this term's result) — this tags it with that term so it's grouped/treated as such.
    const [markAsTermId, setMarkAsTermId] = useState("");

    // Only real sat written tests are averageable sources — never another Consolidated/
    // Year Average exam, which would make the average compute from a computed result.
    const examsForFormYear = useMemo(() => allExams.filter((e: any) =>
        (e.examCategory || "written_test") === "written_test" && levelOf(e.classLevel) === levelOf(form) && yearMatches(e.academicYear, year)
    ), [allExams, form, year]);

    // When a term has exactly one matching written test, pick it automatically — nothing
    // to choose between. A term with two or more leaves every one of them selectable, so
    // any combination (just one, or all of them) can feed the average.
    useEffect(() => {
        setTermExamIds(prev => {
            let changed = false;
            const next = { ...prev };
            for (const term of Object.keys(prev)) {
                const matches = examsForFormYear.filter((e: any) => termMatches(e.term, term));
                const matchIds = new Set(matches.map((e: any) => e._id));
                const stillValid = prev[term].filter(id => matchIds.has(id));
                if (stillValid.length !== prev[term].length) { next[term] = stillValid; changed = true; }
                if (!next[term].length && matches.length === 1) { next[term] = [matches[0]._id]; changed = true; }
            }
            return changed ? next : prev;
        });
    }, [examsForFormYear]);
    const toggleTermExam = (term: string, examId: string) => setTermExamIds(p => {
        const cur = p[term];
        return { ...p, [term]: cur.includes(examId) ? cur.filter(id => id !== examId) : [...cur, examId] };
    });

    const markAsTerm = v2Terms?.find((t: any) => t._id === markAsTermId);

    const submit = () => {
        if (!form || !year) { toast.error("Pick a form/grade and academic year"); return; }
        const sourceExamIds = Object.values(termExamIds).flat();
        if (!sourceExamIds.length) { toast.error("Pick at least one exam to average"); return; }
        onCreate([{
            examCategory: "year_average", examName: `${form} Year Average ${year}`, type: "Year Average", academicYear: year,
            term: markAsTerm ? markAsTerm.name : "Year", termId: markAsTerm ? markAsTerm._id : undefined,
            classLevel: form, sourceExamIds, rankingCriteria, minSubjects: Number(minSubjects) || undefined,
            overallGradingTemplateId: overallGrading || null, subjectGradingTemplates: subjectGrading,
            status: "Active", publishStatus: "Published",
        }]);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-black text-gray-800 border-b border-gray-100 pb-3">Year Average</h2>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Form / Grade *">
                    <select value={form} onChange={e => setForm(e.target.value)} className={selectCls}>
                        <option value="">Select Form / Grade</option>
                        {classes.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                    </select>
                </Field>
                <Field label="Academic Year *">
                    <select value={year} onChange={e => setYear(e.target.value)} className={selectCls}>
                        <option value="">Select Academic Year</option>
                        {v2Years.map((y: any) => <option key={y._id} value={String(y.year)}>{y.year}</option>)}
                    </select>
                </Field>
            </div>

            <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={!!markAsTermId} onChange={e => setMarkAsTermId(e.target.checked ? (activeTerm?._id || v2Terms?.[0]?._id || "") : "")} />
                    Mark as a term's exam (groups it under that term in Manage Exams instead of its own "Year" group)
                </label>
                {markAsTermId && (
                    <select value={markAsTermId} onChange={e => setMarkAsTermId(e.target.value)} className={selectCls + " h-10 mt-2 max-w-xs"}>
                        {(v2Terms || []).map((t: any) => <option key={t._id} value={t._id}>{t.name}{t.isActive ? " · Active" : ""}</option>)}
                    </select>
                )}
            </div>

            {form && year && (
                <>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Select Exams — {form}</label>
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-2 bg-gray-50 px-4 py-2 text-[10px] font-black uppercase text-gray-400"><span>Term</span><span>Exam</span></div>
                            {Object.keys(termExamIds).map(term => {
                                const matches = examsForFormYear.filter((e: any) => termMatches(e.term, term));
                                return (
                                    <div key={term} className="grid grid-cols-2 items-start px-4 py-2.5 border-t border-gray-100">
                                        <span className="text-sm font-bold text-gray-700 pt-1.5">{term}</span>
                                        {matches.length === 0 ? (
                                            <span className="text-xs font-medium text-gray-400 py-2">No written-test exams found for this form, year and term yet.</span>
                                        ) : (
                                            <div className="space-y-1">
                                                {matches.map((e: any) => (
                                                    <label key={e._id} className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                                                        <input type="checkbox" checked={termExamIds[term].includes(e._id)} onChange={() => toggleTermExam(term, e._id)} />
                                                        {e.examName}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ranking Criteria</label>
                        <div className="grid grid-cols-2 gap-2">
                            {RANKING_CRITERIA.map(r => (
                                <label key={r.key} className="flex items-center gap-2 text-sm font-bold text-gray-700"><input type="radio" name="rankingCriteria" checked={rankingCriteria === r.key} onChange={() => setRankingCriteria(r.key)} /> {r.label}</label>
                            ))}
                        </div>
                    </div>

                    <Field label="Minimum number of subjects that can be taken"><input type="number" min={0} value={minSubjects} onChange={e => setMinSubjects(e.target.value)} className={inputCls} /></Field>

                    <Field label="Overall Grading System">
                        <select value={overallGrading} onChange={e => setOverallGrading(e.target.value)} className={selectCls}>
                            <option value="">Select</option>
                            {gradingTemplates.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </select>
                    </Field>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject grading system</label>
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-2 bg-gray-50 px-4 py-2 text-[10px] font-black uppercase text-gray-400"><span>Subject</span><span>Grading System</span></div>
                            {subjects.map((s: any) => { const sid = s._id?.toString(); return (
                                <div key={sid} className="grid grid-cols-2 items-center px-4 py-2.5 border-t border-gray-100">
                                    <span className="text-sm font-bold text-gray-700">{s.name || s.subjectName}</span>
                                    <select value={subjectGrading[sid] || ""} onChange={e => setSubjectGrading(p => ({ ...p, [sid]: e.target.value }))} className={selectCls + " h-10"}>
                                        <option value="">Select</option>
                                        {gradingTemplates.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
                                    </select>
                                </div>
                            ); })}
                        </div>
                    </div>
                </>
            )}

            <div className="flex items-center gap-3 pt-2">
                <button onClick={onCancel} className="h-11 px-6 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl">Cancel</button>
                <button onClick={submit} disabled={saving} className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create
                </button>
            </div>
        </div>
    );
}

// ── Edit (existing exam) — kept simple, classic single-record form ─────────────
function EditExamForm({ existingExam, classes, subjects, saving, onSave, onCancel }: any) {
    const [form, setForm] = useState<any>(null);
    const [subjectConfigs, setSubjectConfigs] = useState<{ subjectId: string; subjectName: string; maxMarks: number }[]>([]);
    useEffect(() => {
        if (!existingExam || form) return;
        setForm({
            examName: existingExam.examName || "", term: existingExam.term || "", academicYear: existingExam.academicYear || "",
            classLevel: existingExam.classLevel || "", status: existingExam.status || "Draft", remarks: existingExam.remarks || "",
        });
        if (existingExam.subjectConfigs?.length) setSubjectConfigs(existingExam.subjectConfigs);
    }, [existingExam, form]);

    if (!form) return <div className="flex-1 min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
    const isSubjectSelected = (sid: string) => subjectConfigs.some(s => s.subjectId === sid);
    const toggleSubject = (sub: any) => { const sid = sub._id?.toString(); setSubjectConfigs(prev => isSubjectSelected(sid) ? prev.filter(s => s.subjectId !== sid) : [...prev, { subjectId: sid, subjectName: sub.name || sub.subjectName, maxMarks: 100 }]); };
    const updateMaxMarks = (sid: string, val: number) => setSubjectConfigs(prev => prev.map(s => s.subjectId === sid ? { ...s, maxMarks: val } : s));

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col pb-10">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-2 shadow-sm sticky top-0 z-10">
                <button onClick={onCancel} className="text-gray-400 hover:text-[#5C67F2]"><ArrowLeft className="w-5 h-5" /></button>
                <span className="text-gray-300">|</span>
                <span className="font-black text-[#5C67F2] text-sm">Edit Exam</span>
            </div>
            <div className="max-w-4xl mx-auto w-full px-6 pt-6 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <Field label="Exam Name *"><input value={form.examName} onChange={e => setForm((f: any) => ({ ...f, examName: e.target.value }))} className={inputCls} /></Field>
                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Term"><input value={form.term} onChange={e => setForm((f: any) => ({ ...f, term: e.target.value }))} className={inputCls} /></Field>
                        <Field label="Academic Year"><input value={form.academicYear} onChange={e => setForm((f: any) => ({ ...f, academicYear: e.target.value }))} className={inputCls} /></Field>
                        <Field label="Class">
                            <select value={form.classLevel} onChange={e => setForm((f: any) => ({ ...f, classLevel: e.target.value }))} className={selectCls}>
                                <option value="">All Classes</option>
                                {classes.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Status">
                        <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className={selectCls}>
                            {["Draft", "Active", "Archived"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subjects to be Examined</label>
                    <div className="space-y-2">
                        {subjects.map((sub: any) => {
                            const sid = sub._id?.toString(); const selected = isSubjectSelected(sid); const config = subjectConfigs.find(s => s.subjectId === sid);
                            return (
                                <div key={sid} className={`flex items-center gap-4 p-3 rounded-xl border ${selected ? "border-[#5C67F2]/30 bg-[#5C67F2]/5" : "border-gray-100"}`}>
                                    <button type="button" onClick={() => toggleSubject(sub)} className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "bg-[#5C67F2] border-[#5C67F2]" : "border-gray-300"}`}>{selected && <Check className="w-3 h-3 text-white" />}</button>
                                    <span className="flex-1 text-sm font-bold text-gray-700">{sub.name || sub.subjectName}</span>
                                    {selected && <input type="number" min={1} value={config?.maxMarks ?? 100} onChange={e => updateMaxMarks(sid, Number(e.target.value))} className="w-20 h-8 px-2 text-center border border-[#5C67F2]/30 rounded-lg text-sm font-black text-[#5C67F2]" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center gap-3 pb-4">
                    <button onClick={onCancel} className="h-11 px-6 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl">Cancel</button>
                    <button onClick={() => onSave({ ...form, subjectConfigs })} disabled={saving} className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
