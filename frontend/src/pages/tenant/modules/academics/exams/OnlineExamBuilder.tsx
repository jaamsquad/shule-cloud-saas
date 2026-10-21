import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Trash2, ArrowLeft, Send, Settings, FileText, GripVertical, Check, Calendar } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const TYPES: { v: string; label: string; auto: boolean }[] = [
    { v: "mcq_single", label: "Multiple Choice (one answer)", auto: true },
    { v: "mcq_multiple", label: "Multiple Choice (many answers)", auto: true },
    { v: "true_false", label: "True / False", auto: true },
    { v: "short_answer", label: "Short Answer", auto: false },
    { v: "essay", label: "Long Answer / Essay", auto: false },
    { v: "fill_blank", label: "Fill in the Blank", auto: true },
    { v: "matching", label: "Matching", auto: true },
    { v: "ordering", label: "Ordering", auto: true },
    { v: "numeric", label: "Numeric (with tolerance)", auto: true },
    { v: "file_upload", label: "File Upload", auto: false },
];
const CATS = ["CAT", "Midterm", "End Term", "Holiday Assignment", "Mock", "Revision"];

function buildLocalTimestamp(date: string, time: string) {
    if (!date) return null;
    const local = `${date}T${time || "00:00"}`;
    const dt = new Date(local);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
}

// Teacher authoring for Online Examinations — create exams (scoped to class/stream/
// subject) and add questions of every type. Publishing makes them visible to students.
export default function OnlineExamBuilder() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<string | null>(null);   // examId being built

    const { data: exams = [], isLoading } = useQuery<any[]>({ queryKey: ["online_exams"], queryFn: async () => (await api.get("/online-exams")).data || [] });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["subjects"], queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; } });

    if (editing) return <ExamEditor examId={editing} classes={classes} subjects={subjects} onBack={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["online_exams"] }); }} />;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen p-6">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Online Examinations</h1>
                    <p className="text-sm text-slate-400">Create online exams students take in their portal.</p>
                </div>
                <NewExamButton classes={classes} subjects={subjects} onCreated={(id: string) => setEditing(id)} />
            </div>

            {isLoading ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#5C67F2]" /></div>
                : exams.length === 0 ? <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400 font-bold">No online exams yet — create one.</div>
                    : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {exams.map((e: any) => (
                                <div key={e._id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0">
                                            <h3 className="font-black text-slate-800 truncate">{e.examName}</h3>
                                            {e.parentExamName && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">under {e.parentExamName}</span>}
                                            <p className="text-xs text-slate-400 mt-0.5">{e.subjectName} · {e.className}{e.streamName ? ` ${e.streamName}` : ""}</p>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${e.status === "Published" ? "bg-emerald-100 text-emerald-700" : e.status === "Closed" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700"}`}>{e.status}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 font-bold">
                                        <span>{e.questionCount} Qs</span><span>{e.totalMarks} marks</span><span>{e.durationMinutes} min</span>
                                    </div>
                                    <button onClick={() => setEditing(e._id)} className="mt-3 w-full h-10 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center justify-center gap-1.5"><Settings className="w-4 h-4" /> Build / Edit</button>
                                </div>
                            ))}
                        </div>
                    )}
        </div>
    );
}

function NewExamButton({ classes, subjects, onCreated }: any) {
    const [open, setOpen] = useState(false);
    const [f, setF] = useState({
        examName: "", parentExamId: "", category: "CAT", classId: "", streamId: "", subjectId: "",
        durationMinutes: 60, passMark: 0,
        academicYear: "", term: "", termId: "",
        startDate: "", startTime: "09:00", endDate: "", endTime: "10:00",
    });
    // Parent (main) assessments: real exams (from the Exams module) this online exam
    // rolls up into. Every subject's online exam under the same parent shares one
    // column. Cards on this page are *online exams* (a different collection) — they
    // never count as a parent on their own, so any real written-test/supplementary
    // exam is offered here, not just ones whose name happens to say "CAT"/"Mid Term".
    const { data: allExams = [] } = useQuery<any[]>({ queryKey: ["exams_for_parent"], queryFn: async () => (await api.get("/academics/exams")).data || [] });
    const parentExams = allExams.filter((e: any) => e.examCategory === "written_test" || e.examCategory === "supplementary" || /cat|mid\s*term|midterm|mock|assignment/i.test(String(e.type || e.examType || e.examName || "")));
    const { data: years = [] } = useQuery<any[]>({ queryKey: ["v2_academic_years"], queryFn: async () => (await api.get("/v2/academic-years")).data || [] });
    const { data: terms = [] } = useQuery<any[]>({ queryKey: ["v2_terms"], queryFn: async () => (await api.get("/v2/terms")).data || [] });
    const activeYear = years.find((y: any) => y.isActive);
    const activeTerm = terms.find((t: any) => t.isActive);
    const yearTermOptions = terms.filter((t: any) => {
        if (!f.academicYear) return true;
        const year = years.find((y: any) => String(y._id) === String(t.academicYearId));
        return String(year?.year) === String(f.academicYear);
    });
    useEffect(() => {
        if (!open || !activeYear || !activeTerm) return;
        if (!f.academicYear && !f.termId) {
            setF(prev => ({ ...prev,
                academicYear: String(activeYear.year),
                term: activeTerm.name,
                termId: activeTerm._id,
            }));
        }
    }, [open, activeYear, activeTerm, f.academicYear, f.termId]);
    const { data: streams = [] } = useQuery<any[]>({ queryKey: ["v2_streams", f.classId], enabled: !!f.classId, queryFn: async () => (await api.get("/v2/streams", { params: { classId: f.classId } })).data || [] });
    const create = useMutation({
        mutationFn: async () => {
            const cls = classes.find((c: any) => String(c._id) === f.classId);
            const stream = streams.find((s: any) => String(s._id) === f.streamId);
            const subject = subjects.find((s: any) => String(s._id) === f.subjectId);
            const startAt = f.startDate ? buildLocalTimestamp(f.startDate, f.startTime || "00:00") : null;
            const endAt = f.endDate ? buildLocalTimestamp(f.endDate, f.endTime || "23:59") : null;
            if (f.startDate && !startAt) throw new Error("Invalid exam start date/time");
            if (f.endDate && !endAt) throw new Error("Invalid exam end date/time");
            return (await api.post("/online-exams", {
                examName: f.examName,
                parentExamId: f.parentExamId,
                category: f.category,
                durationMinutes: Number(f.durationMinutes),
                passMark: Number(f.passMark),
                classId: f.classId,
                className: cls?.name || "",
                streamId: f.streamId || "",
                streamName: stream?.name || "",
                subjectId: f.subjectId,
                subjectName: subject?.name || subject?.subjectName || "",
                academicYear: f.academicYear,
                term: f.term,
                termId: f.termId,
                startAt,
                endAt,
            })).data;
        },
        onSuccess: (d: any) => { toast.success("Exam created — add questions."); setOpen(false); onCreated(d._id); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    if (!open) return <button onClick={() => setOpen(true)} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Online Exam</button>;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <h2 className="text-lg font-black text-slate-800 mb-1">New Online Exam</h2>
                <p className="text-xs text-slate-400 mb-4">Attach this to a main assessment so every subject's marks roll up together.</p>
                <div className="space-y-3">
                    {/* Parent (main) assessment — required */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-amber-700 tracking-wide">Main Assessment (CAT / Mid Term) *</label>
                        <select value={f.parentExamId} onChange={e => { const p = parentExams.find((x: any) => x._id === e.target.value); setF({ ...f, parentExamId: e.target.value, category: p?.type || p?.examType || f.category }); }} className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                            <option value="">— Select main assessment —</option>
                            {parentExams.map((e: any) => <option key={e._id} value={e._id}>{e.examName || e.name} · {e.type || e.examType}{e.term ? ` · ${e.term}` : ""}</option>)}
                        </select>
                        {parentExams.length === 0 && <p className="text-[11px] text-rose-500 mt-1">No exam found to attach to. Create one first in Create Exam (e.g. a CAT or Mid Term), then add your online exams under it here.</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Exam Name</label>
                        <input value={f.examName} onChange={e => setF({ ...f, examName: e.target.value })} placeholder="This exam's name (e.g. Biology CAT)" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Category</label>
                            <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">{CATS.map(c => <option key={c}>{c}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Subject</label>
                            <select value={f.subjectId} onChange={e => setF({ ...f, subjectId: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white"><option value="">— Subject —</option>{subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.subjectName}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Class</label>
                            <select value={f.classId} onChange={e => setF({ ...f, classId: e.target.value, streamId: "" })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white"><option value="">— Class —</option>{classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Stream</label>
                            <select value={f.streamId} onChange={e => setF({ ...f, streamId: e.target.value })} disabled={!f.classId} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50"><option value="">All streams</option>{streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Duration (min)</label>
                            <input value={f.durationMinutes} onChange={e => setF({ ...f, durationMinutes: Number(e.target.value) })} type="number" placeholder="Duration (min)" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pass Mark</label>
                            <input value={f.passMark} onChange={e => setF({ ...f, passMark: Number(e.target.value) })} type="number" placeholder="Pass mark" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Academic Year</label>
                            <select value={f.academicYear} onChange={e => setF({ ...f, academicYear: e.target.value, termId: "", term: "" })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                                <option value="">— Academic Year —</option>
                                {years.map((y: any) => <option key={y._id} value={String(y.year)}>{y.year}{y.isActive ? " (Active)" : ""}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Term</label>
                            <select value={f.termId} onChange={e => {
                                const term = terms.find((t: any) => String(t._id) === e.target.value);
                                const year = years.find((y: any) => String(y._id) === String(term?.academicYearId));
                                setF({ ...f, termId: e.target.value, term: term?.name || "", academicYear: year ? String(year.year) : f.academicYear });
                            }} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                                <option value="">— Term —</option>
                                {yearTermOptions.map((t: any) => {
                                    const year = years.find((y: any) => String(y._id) === String(t.academicYearId));
                                    return <option key={t._id} value={t._id}>{t.name}{year ? ` · ${year.year}` : ""}{t.isActive ? " (Active)" : ""}</option>;
                                })}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Start</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} type="date" className="h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                                <input value={f.startTime} onChange={e => setF({ ...f, startTime: e.target.value })} type="time" className="h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">End</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input value={f.endDate} onChange={e => setF({ ...f, endDate: e.target.value })} type="date" className="h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                                <input value={f.endTime} onChange={e => setF({ ...f, endTime: e.target.value })} type="time" className="h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 mt-5">
                    <button onClick={() => setOpen(false)} className="h-11 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                    <button onClick={() => f.parentExamId && f.examName && f.classId && f.subjectId ? create.mutate() : toast.error("Main assessment, name, class & subject required")} disabled={create.isPending} className="flex-1 h-11 rounded-xl bg-[#5C67F2] text-white font-bold text-sm">{create.isPending ? "Creating…" : "Create & Add Questions"}</button>
                </div>
            </div>
        </div>
    );
}

function ExamEditor({ examId, classes, subjects, onBack }: any) {
    const qc = useQueryClient();
    const [view, setView] = useState<"build" | "mark">("build");
    const [showSchedule, setShowSchedule] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ startDate: "", startTime: "", endDate: "", endTime: "" });
    const { data: exam, refetch } = useQuery({ queryKey: ["online_exam", examId], queryFn: async () => (await api.get(`/online-exams/${examId}`)).data });
    const questions: any[] = exam?.questions || [];
    
    const now_ms = Date.now();
    const examStarted = exam?.startAt && new Date(exam.startAt).getTime() <= now_ms;

    const setStatus = useMutation({
        mutationFn: async (status: string) => (await api.post(`/online-exams/${examId}/status`, { status })).data,
        onSuccess: () => { toast.success("Status updated"); refetch(); qc.invalidateQueries({ queryKey: ["online_exams"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const delQ = useMutation({
        mutationFn: async (qid: string) => (await api.delete(`/online-exams/${examId}/questions/${qid}`)).data,
        onSuccess: () => refetch(),
    });
    // Push scored attempts into exam_marks so ScholarSheet + analytics show them.
    const publishResults = useMutation({
        mutationFn: async () => (await api.post(`/online-exams/${examId}/publish-results`)).data,
        onSuccess: (d: any) => toast.success(d.message || "Results published to report cards"),
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    
    const updateSchedule = useMutation({
        mutationFn: async () => {
            const startAt = scheduleForm.startDate ? buildLocalTimestamp(scheduleForm.startDate, scheduleForm.startTime || "00:00") : null;
            const endAt = scheduleForm.endDate ? buildLocalTimestamp(scheduleForm.endDate, scheduleForm.endTime || "23:59") : null;
            if (scheduleForm.startDate && !startAt) throw new Error("Invalid start time");
            if (scheduleForm.endDate && !endAt) throw new Error("Invalid end time");
            return (await api.patch(`/online-exams/${examId}`, { startAt, endAt })).data;
        },
        onSuccess: () => { toast.success("Schedule updated"); setShowSchedule(false); refetch(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    // Attach an existing online exam to a parent (main) assessment so its marks roll
    // up with the others. Parents = any real exam from the Exams module.
    const { data: allExams = [] } = useQuery<any[]>({ queryKey: ["exams_for_parent"], queryFn: async () => (await api.get("/academics/exams")).data || [] });
    const parentExams = allExams.filter((e: any) => e.examCategory === "written_test" || e.examCategory === "supplementary" || /cat|mid\s*term|midterm|mock|assignment/i.test(String(e.type || e.examType || e.examName || "")));
    const attachParent = useMutation({
        mutationFn: async (parentExamId: string) => {
            const p = parentExams.find((x: any) => x._id === parentExamId);
            return (await api.patch(`/online-exams/${examId}`, { parentExamId, parentExamName: p?.examName || p?.name || "" })).data;
        },
        onSuccess: () => { toast.success("Attached to main assessment"); refetch(); qc.invalidateQueries({ queryKey: ["online_exams"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen p-6">
            <button onClick={onBack} className="text-sm font-bold text-slate-500 flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Back to exams</button>
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-slate-800">{exam?.examName}</h1>
                        <p className="text-xs text-slate-400">{exam?.subjectName} · {exam?.className}{exam?.streamName ? ` ${exam.streamName}` : ""} · {questions.length} questions · {exam?.totalMarks} marks</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        {!examStarted && <button onClick={() => { if (!showSchedule) { setScheduleForm({ startDate: exam?.startAt ? exam.startAt.split("T")[0] : "", startTime: exam?.startAt ? exam.startAt.split("T")[1]?.slice(0, 5) : "00:00", endDate: exam?.endAt ? exam.endAt.split("T")[0] : "", endTime: exam?.endAt ? exam.endAt.split("T")[1]?.slice(0, 5) : "23:59" }); } setShowSchedule(!showSchedule); }} className="h-10 px-4 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center gap-1.5"><Settings className="w-4 h-4" /> {showSchedule ? "Cancel" : "Edit Schedule"}</button>}
                        {exam?.status !== "Published" && <button onClick={() => setStatus.mutate("Published")} className="h-10 px-4 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center gap-1.5"><Send className="w-4 h-4" /> Publish</button>}
                        {exam?.status === "Published" && <button onClick={() => setStatus.mutate("Closed")} className="h-10 px-4 rounded-xl bg-slate-700 text-white font-bold text-sm">Close</button>}
                        {(exam?.status === "Published" || exam?.status === "Closed") && (
                            <button onClick={() => publishResults.mutate()} disabled={publishResults.isPending} className="h-10 px-4 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50" title="Send scores to ScholarSheet & Analytics">
                                {publishResults.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Publish to Report Cards
                            </button>
                        )}
                    </div>
                </div>

                {/* Main assessment (parent) — attach/change so marks roll up together */}
                <div className={`rounded-2xl border p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 ${exam?.parentExamId ? "bg-indigo-50/50 border-indigo-100" : "bg-amber-50 border-amber-200"}`}>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Main Assessment</p>
                        {exam?.parentExamId
                            ? <p className="text-sm font-bold text-indigo-700">Rolls up into: {exam.parentExamName || "main assessment"}</p>
                            : <p className="text-sm font-bold text-amber-700">Not attached — marks won't roll up with other subjects until you attach a CAT / Mid Term.</p>}
                    </div>
                    <select value={exam?.parentExamId || ""} onChange={e => e.target.value && attachParent.mutate(e.target.value)} disabled={attachParent.isPending} className="h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white sm:w-64">
                        <option value="">{exam?.parentExamId ? "Change main assessment…" : "Attach to main assessment…"}</option>
                        {parentExams.map((e: any) => <option key={e._id} value={e._id}>{e.examName || e.name} · {e.type || e.examType}{e.term ? ` · ${e.term}` : ""}</option>)}
                    </select>
                </div>

                {/* Schedule edit form */}
                {showSchedule && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4">
                        <h3 className="font-black text-slate-800 mb-3">Edit Exam Schedule</h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Start</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" value={scheduleForm.startDate} onChange={e => setScheduleForm(f => ({ ...f, startDate: e.target.value }))} className="h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                                    <input type="time" value={scheduleForm.startTime} onChange={e => setScheduleForm(f => ({ ...f, startTime: e.target.value }))} className="h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">End</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" value={scheduleForm.endDate} onChange={e => setScheduleForm(f => ({ ...f, endDate: e.target.value }))} className="h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                                    <input type="time" value={scheduleForm.endTime} onChange={e => setScheduleForm(f => ({ ...f, endTime: e.target.value }))} className="h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                                </div>
                            </div>
                        </div>
                        <button onClick={() => scheduleForm.startDate && scheduleForm.endDate ? updateSchedule.mutate() : toast.error("Pick both start and end dates")} disabled={updateSchedule.isPending} className="h-10 px-4 rounded-xl bg-blue-500 text-white font-bold text-sm disabled:opacity-50">{updateSchedule.isPending ? "Saving..." : "Save Schedule"}</button>
                    </div>
                )}

                {/* Build / Mark toggle */}
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setView("build")} className={`h-9 px-4 rounded-lg font-bold text-sm ${view === "build" ? "bg-[#5C67F2] text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Questions</button>
                    <button onClick={() => setView("mark")} className={`h-9 px-4 rounded-lg font-bold text-sm ${view === "mark" ? "bg-[#5C67F2] text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Mark Submissions</button>
                </div>

                {/* Schedule display */}
                {exam?.startAt && exam?.endAt && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-4 text-xs font-bold text-slate-600">
                        <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /><strong>Start:</strong> {new Date(exam.startAt).toLocaleString()}</p>
                        <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /><strong>End:</strong> {new Date(exam.endAt).toLocaleString()}</p>
                    </div>
                )}

                {view === "build" ? (
                    <>
                        <div className="space-y-2 mb-4">
                            {questions.map((q: any, i: number) => (
                                <div key={q._id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-start gap-3">
                                    <GripVertical className="w-4 h-4 text-slate-300 mt-1" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-[#5C67F2] uppercase">{TYPES.find(t => t.v === q.type)?.label || q.type}</span>
                                            <span className="text-[10px] text-slate-400">{q.marks} mk</span>
                                        </div>
                                        <p className="text-sm text-slate-700 truncate">{i + 1}. {q.questionText}</p>
                                    </div>
                                    <button onClick={() => delQ.mutate(q._id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                        <AddQuestion examId={examId} onAdded={refetch} />
                    </>
                ) : (
                    <MarkingPanel examId={examId} />
                )}
            </div>
        </div>
    );
}

// Manual marking — grade essay/short/file answers per student, then save (recomputes
// final score = auto + manual). Auto-only exams show nothing to mark here.
function MarkingPanel({ examId }: { examId: string }) {
    const { data, refetch, isLoading } = useQuery({ queryKey: ["online_marking", examId], queryFn: async () => (await api.get(`/online-exams/${examId}/marking`)).data });
    const manualQs: any[] = data?.manualQuestions || [];
    const autoQs: any[] = data?.autoQuestions || [];
    const attempts: any[] = data?.attempts || [];
    const [open, setOpen] = useState<string>("");   // attemptId being marked
    const [marks, setMarks] = useState<Record<string, any>>({});
    const [comments, setComments] = useState<Record<string, string>>({});

    const save = useMutation({
        mutationFn: async (attemptId: string) => (await api.post(`/online-exams/${examId}/marking/${attemptId}`, { marks, comments })).data,
        onSuccess: (d: any) => { toast.success(`Saved · final ${d.finalScore}`); setOpen(""); refetch(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    if (isLoading) return <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#5C67F2]" /></div>;
    if (attempts.length === 0) return <div className="bg-white rounded-2xl border border-slate-100 py-10 text-center text-slate-400 font-bold">No submissions yet.</div>;

    // When every question is auto-marked there's nothing to mark manually — but we
    // still SHOW the submissions and their scores (read-only) so you can review them.
    const autoOnly = manualQs.length === 0;

    return (
        <div className="space-y-2">
            {autoOnly && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-bold text-blue-700 mb-2">
                    All questions are auto-marked — scores below are final. Use “Publish to Report Cards” to release them.
                </div>
            )}
            {attempts.map((a: any) => {
                const editing = open === a._id;
                return (
                    <div key={a._id} className="bg-white rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-800">{a.studentName}</p>
                                <p className="text-[11px] text-slate-400">Auto {a.autoScore ?? 0}{a.finalScore != null ? ` · Final ${a.finalScore}` : a.needsManual ? " · awaiting marking" : ""}</p>
                                {autoQs.length > 0 && a.perQuestion && (
                                    <p className="text-[11px] text-slate-400">Auto questions: {autoQs.filter(q => a.perQuestion?.[q._id]?.correct === true).length}/{autoQs.length} correct</p>
                                )}
                            </div>
                            {/* Only offer manual marking when there ARE manual questions. */}
                            {!autoOnly
                                ? <button onClick={() => { if (editing) setOpen(""); else { setOpen(a._id); setMarks(a.marks || {}); setComments(a.comments || {}); } }} className="h-9 px-4 rounded-lg bg-[#5C67F2] text-white font-bold text-sm">{editing ? "Close" : "Mark"}</button>
                                : <span className="text-lg font-black text-emerald-600">{a.finalScore ?? a.autoScore ?? 0}</span>}
                        </div>
                        {editing && (
                            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                                {autoQs.length > 0 && a.perQuestion && (
                                    <div className="space-y-3 border-t border-slate-100 pt-3">
                                        <h3 className="text-sm font-bold text-slate-800">Auto-marked questions</h3>
                                        {autoQs.map((q: any) => {
                                            const pq = a.perQuestion?.[q._id] || { awarded: 0, correct: null };
                                            return (
                                                <div key={q._id} className="bg-slate-50 rounded-xl p-3">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <p className="text-xs font-bold text-slate-600 truncate">{q.questionText}</p>
                                                        <span className="text-[11px] font-bold text-slate-500">{pq.awarded}/{q.marks}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500">{pq.correct === true ? "Correct" : pq.correct === false ? "Incorrect" : "Reviewed"}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {manualQs.map((q: any) => (
                                    <div key={q._id} className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs font-bold text-slate-600 mb-1">{q.questionText} <span className="text-slate-400">({q.marks} marks)</span></p>
                                        {q.rubric && <p className="text-[11px] text-slate-400 mb-2">Rubric: {q.rubric}</p>}
                                        <div className="bg-white rounded-lg border border-slate-200 p-2 text-sm text-slate-700 whitespace-pre-wrap mb-2 max-h-40 overflow-auto">{a.answers[q._id] || <span className="text-slate-300">No answer</span>}</div>
                                        <div className="flex items-center gap-2">
                                            <input type="number" min={0} max={q.marks} value={marks[q._id] ?? ""} onChange={e => setMarks(m => ({ ...m, [q._id]: e.target.value }))} placeholder={`/ ${q.marks}`} className="w-24 h-9 px-2 rounded-lg border border-slate-200 text-sm text-center" />
                                            <input value={comments[q._id] ?? ""} onChange={e => setComments(c => ({ ...c, [q._id]: e.target.value }))} placeholder="Comment (optional)" className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm" />
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => save.mutate(a._id)} disabled={save.isPending} className="h-10 px-5 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                                    {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Marks
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function AddQuestion({ examId, onAdded }: { examId: string; onAdded: () => void }) {
    const [type, setType] = useState("mcq_single");
    const [q, setQ] = useState<any>({ questionText: "", marks: 1, options: ["", "", "", ""], correctAnswer: "", correctAnswers: [], tolerance: 0, pairs: [{ left: "", right: "" }], items: [{ id: "1", text: "" }], explanation: "" });

    const add = useMutation({
        mutationFn: async () => {
            const body: any = { type, questionText: q.questionText, marks: Number(q.marks) || 1, explanation: q.explanation };
            if (type === "mcq_single") { body.options = q.options.filter((o: string) => o.trim()); body.correctAnswer = q.correctAnswer; }
            if (type === "mcq_multiple") { body.options = q.options.filter((o: string) => o.trim()); body.correctAnswers = q.correctAnswers; }
            if (type === "true_false") body.correctAnswer = q.correctAnswer;
            if (type === "fill_blank") body.correctAnswers = String(q.correctAnswer).split("|").map((s: string) => s.trim()).filter(Boolean);
            if (type === "numeric") { body.correctAnswer = q.correctAnswer; body.tolerance = Number(q.tolerance) || 0; }
            if (type === "matching") body.pairs = q.pairs.filter((p: any) => p.left && p.right);
            if (type === "ordering") { body.items = q.items.filter((it: any) => it.text); body.correctOrder = body.items.map((it: any) => it.id); }
            return (await api.post(`/online-exams/${examId}/questions`, body)).data;
        },
        onSuccess: () => { toast.success("Question added"); setQ({ questionText: "", marks: 1, options: ["", "", "", ""], correctAnswer: "", correctAnswers: [], tolerance: 0, pairs: [{ left: "", right: "" }], items: [{ id: "1", text: "" }], explanation: "" }); onAdded(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const setOpt = (i: number, v: string) => setQ({ ...q, options: q.options.map((o: string, j: number) => j === i ? v : o) });

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-[#5C67F2]" /> Add Question</h3>
            <div className="grid grid-cols-[1fr_auto] gap-3 mb-3">
                <select value={type} onChange={e => setType(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">{TYPES.map(t => <option key={t.v} value={t.v}>{t.label}{t.auto ? "" : " (manual)"}</option>)}</select>
                <input value={q.marks} onChange={e => setQ({ ...q, marks: e.target.value })} type="number" className="w-24 h-11 px-3 rounded-xl border border-slate-200 text-sm" placeholder="Marks" />
            </div>
            <textarea value={q.questionText} onChange={e => setQ({ ...q, questionText: e.target.value })} rows={2} placeholder="Question text…" className="w-full p-3 rounded-xl border border-slate-200 text-sm mb-3" />

            {(type === "mcq_single" || type === "mcq_multiple") && (
                <div className="space-y-2 mb-3">
                    {q.options.map((o: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                            {type === "mcq_single"
                                ? <input type="radio" checked={q.correctAnswer === o && o !== ""} onChange={() => setQ({ ...q, correctAnswer: o })} />
                                : <input type="checkbox" checked={q.correctAnswers.includes(o) && o !== ""} onChange={() => setQ({ ...q, correctAnswers: q.correctAnswers.includes(o) ? q.correctAnswers.filter((x: string) => x !== o) : [...q.correctAnswers, o] })} />}
                            <input value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Option ${i + 1}`} className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm" />
                        </div>
                    ))}
                    <button onClick={() => setQ({ ...q, options: [...q.options, ""] })} className="text-xs font-bold text-[#5C67F2]">+ Add option</button>
                    <p className="text-[11px] text-slate-400">Tick the correct option{type === "mcq_multiple" ? "s" : ""}.</p>
                </div>
            )}
            {type === "true_false" && (
                <div className="flex gap-2 mb-3">{["True", "False"].map(o => <button key={o} onClick={() => setQ({ ...q, correctAnswer: o })} className={`h-10 px-5 rounded-xl font-bold text-sm ${q.correctAnswer === o ? "bg-[#5C67F2] text-white" : "bg-slate-100 text-slate-600"}`}>{o}</button>)}</div>
            )}
            {type === "fill_blank" && <input value={q.correctAnswer} onChange={e => setQ({ ...q, correctAnswer: e.target.value })} placeholder="Acceptable answers, separated by |" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm mb-3" />}
            {type === "numeric" && <div className="grid grid-cols-2 gap-3 mb-3"><input value={q.correctAnswer} onChange={e => setQ({ ...q, correctAnswer: e.target.value })} type="number" placeholder="Correct value" className="h-11 px-3 rounded-xl border border-slate-200 text-sm" /><input value={q.tolerance} onChange={e => setQ({ ...q, tolerance: e.target.value })} type="number" placeholder="± tolerance" className="h-11 px-3 rounded-xl border border-slate-200 text-sm" /></div>}
            {type === "matching" && (
                <div className="space-y-2 mb-3">
                    {q.pairs.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                            <input value={p.left} onChange={e => setQ({ ...q, pairs: q.pairs.map((x: any, j: number) => j === i ? { ...x, left: e.target.value } : x) })} placeholder="Left" className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm" />
                            <span className="text-slate-300">→</span>
                            <input value={p.right} onChange={e => setQ({ ...q, pairs: q.pairs.map((x: any, j: number) => j === i ? { ...x, right: e.target.value } : x) })} placeholder="Right (match)" className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm" />
                        </div>
                    ))}
                    <button onClick={() => setQ({ ...q, pairs: [...q.pairs, { left: "", right: "" }] })} className="text-xs font-bold text-[#5C67F2]">+ Add pair</button>
                </div>
            )}
            {type === "ordering" && (
                <div className="space-y-2 mb-3">
                    {q.items.map((it: any, i: number) => (
                        <div key={i} className="flex items-center gap-2"><span className="w-6 text-center text-sm font-black text-slate-400">{i + 1}</span>
                            <input value={it.text} onChange={e => setQ({ ...q, items: q.items.map((x: any, j: number) => j === i ? { ...x, text: e.target.value } : x) })} placeholder={`Item ${i + 1} (correct order)`} className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm" /></div>
                    ))}
                    <button onClick={() => setQ({ ...q, items: [...q.items, { id: String(q.items.length + 1), text: "" }] })} className="text-xs font-bold text-[#5C67F2]">+ Add item</button>
                    <p className="text-[11px] text-slate-400">Enter items in the CORRECT order; students will see them shuffled.</p>
                </div>
            )}
            {(type === "short_answer" || type === "essay" || type === "file_upload") && <p className="text-[11px] text-amber-500 font-bold mb-3 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> This type is marked manually by the teacher.</p>}

            <button onClick={() => q.questionText ? add.mutate() : toast.error("Enter the question text")} disabled={add.isPending} className="w-full h-11 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Add Question
            </button>
        </div>
    );
}
