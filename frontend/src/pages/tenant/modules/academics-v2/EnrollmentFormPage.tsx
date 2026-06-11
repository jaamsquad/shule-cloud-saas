import { useState } from "react";
import { ArrowLeft, Search, Check, Loader2, Users, BookOpen, ChevronRight, X, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

export default function EnrollmentFormPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const qc = useQueryClient();

    const preStreamId = searchParams.get("streamId") || "";

    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
    const [form, setForm] = useState({ academicYearId: "", termId: "", classId: "", streamId: preStreamId });

    // ── Queries ─────────────────────────────────────────────────────────
    const { data: years = [] } = useQuery<any[]>({ queryKey: ["v2_academic_years"], queryFn: async () => (await api.get("/v2/academic-years")).data || [] });
    const { data: terms = [] } = useQuery<any[]>({
        queryKey: ["v2_terms_enroll", form.academicYearId],
        queryFn: async () => form.academicYearId ? (await api.get(`/v2/terms?academicYearId=${form.academicYearId}`)).data || [] : [],
        enabled: !!form.academicYearId,
    });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: streams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams_enroll", form.classId],
        queryFn: async () => form.classId ? (await api.get(`/v2/streams?classId=${form.classId}`)).data || [] : [],
        enabled: !!form.classId,
    });
    const { data: students = [] } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });

    const activeYear = years.find((y: any) => y.isActive);
    const activeTerm = terms.find((t: any) => t.isActive);

    const [preFilledYear, setPreFilledYear] = useState(false);
    if (activeYear && !form.academicYearId && !preFilledYear) {
        setPreFilledYear(true);
        setForm(f => ({ ...f, academicYearId: activeYear._id }));
    }

    const selectedClass = classes.find((c: any) => c._id === form.classId);
    const selectedStream = streams.find((s: any) => s._id === form.streamId);
    const selectedYear = years.find((y: any) => y._id === form.academicYearId);
    const selectedTerm = terms.find((t: any) => t._id === form.termId);

    const nameOf = (s: any) => s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student";
    const selectedIds = new Set(selectedStudents.map(s => s._id));

    const filteredStudents = studentSearch.length >= 1
        ? students.filter((s: any) => !selectedIds.has(s._id) && (
            nameOf(s).toLowerCase().includes(studentSearch.toLowerCase()) ||
            (s.registrationNo || "").toLowerCase().includes(studentSearch.toLowerCase())
          )).slice(0, 25)
        : [];

    const addStudent = (s: any) => { setSelectedStudents(prev => [...prev, s]); };
    const removeStudent = (id: string) => setSelectedStudents(prev => prev.filter(s => s._id !== id));

    // ── Bulk enroll ──────────────────────────────────────────────────────
    const enrollMut = useMutation({
        mutationFn: (p: any) => api.post("/v2/enrollments/bulk", p),
        onSuccess: (res: any) => {
            qc.invalidateQueries({ queryKey: ["v2_enrollments"] });
            const d = res.data || {};
            toast.success(`${d.enrolled ?? 0} student(s) enrolled${d.skipped ? ` · ${d.skipped} already enrolled` : ""}`);
            navigate("/academic-system/enrollments");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Enrollment failed"),
    });

    const handleSubmit = () => {
        if (selectedStudents.length === 0) { toast.error("Select at least one student"); return; }
        if (!form.academicYearId) { toast.error("Select an academic year"); return; }
        if (!form.classId) { toast.error("Select a class"); return; }
        if (!form.streamId) { toast.error("Select a stream"); return; }
        enrollMut.mutate({ studentIds: selectedStudents.map(s => s._id), academicYearId: form.academicYearId, termId: form.termId || null, classId: form.classId, streamId: form.streamId });
    };

    const isComplete = selectedStudents.length > 0 && form.academicYearId && form.classId && form.streamId;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                <button onClick={() => navigate("/academic-system/enrollments")} className="text-gray-400 hover:text-[#5C67F2] transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500 font-medium text-sm cursor-pointer hover:text-[#5C67F2]" onClick={() => navigate("/academic-system/enrollments")}>Student Enrollments</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="font-black text-[#5C67F2] text-sm">Enroll Students</span>
            </div>

            <div className="max-w-2xl mx-auto w-full px-6 pt-8 space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                    <BookOpen className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Immutable Enrollment Record</p>
                        <p className="text-[11px] text-amber-700 font-medium mt-0.5">New enrollment records are created. Historical records are <strong>NEVER overwritten</strong>.</p>
                    </div>
                </div>

                {activeYear && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <p className="text-[11px] font-bold text-emerald-700">Active Year: <strong>{activeYear.year}</strong>{activeTerm ? ` · Active Term: ${activeTerm.name}` : ""}</p>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white"><Users className="w-4 h-4" /></div>
                        <div>
                            <h2 className="text-sm font-black text-gray-900">Enrollment Form</h2>
                            <p className="text-[10px] text-gray-400 font-medium">Assign one or many students to a class for an academic year</p>
                        </div>
                    </div>

                    <div className="px-6 py-6 space-y-5">
                        {/* Step 1: Students (multi-select) */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-[#5C67F2] text-white flex items-center justify-center text-[9px] font-black">1</div>
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Students *</label>
                                </div>
                                <span className="text-[10px] font-black text-[#5C67F2]">{selectedStudents.length} selected</span>
                            </div>

                            {/* Selected chips */}
                            {selectedStudents.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedStudents.map(s => (
                                        <span key={s._id} className="inline-flex items-center gap-1.5 bg-[#5C67F2]/10 text-[#5C67F2] text-xs font-bold px-3 py-1.5 rounded-full">
                                            {nameOf(s)} <button onClick={() => removeStudent(s._id)} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                                    placeholder="Search by name or admission no…"
                                    className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2] placeholder-gray-300" />
                                {filteredStudents.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-56 overflow-y-auto">
                                        {filteredStudents.map((s: any) => (
                                            <button key={s._id} type="button" onClick={() => addStudent(s)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 transition-colors">
                                                <div className="w-7 h-7 bg-[#5C67F2]/10 rounded-lg flex items-center justify-center text-[#5C67F2] font-black text-xs">{nameOf(s).charAt(0)}</div>
                                                <div className="flex-1"><p className="text-sm font-bold text-gray-800">{nameOf(s)}</p><p className="text-[10px] text-gray-400">{s.registrationNo || s.studentClass || ""}</p></div>
                                                <Plus className="w-4 h-4 text-[#5C67F2]" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {students.length > 0 && selectedStudents.length === 0 && (
                                <button onClick={() => setSelectedStudents(students)} className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#5C67F2] hover:underline">+ Select all {students.length} students</button>
                            )}
                        </div>

                        {/* Step 2: Academic Year */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-black">2</div>
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Academic Year *</label>
                            </div>
                            <select value={form.academicYearId} onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value, termId: "" }))}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]">
                                <option value="">— Select Year —</option>
                                {years.map((y: any) => <option key={y._id} value={y._id}>{y.year}{y.isActive ? " (Active)" : ""}{y.name ? ` — ${y.name}` : ""}</option>)}
                            </select>
                        </div>

                        {/* Step 3: Term */}
                        {form.academicYearId && terms.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-400 text-white flex items-center justify-center text-[9px] font-black">3</div>
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Term <span className="text-gray-400 font-medium normal-case">(optional)</span></label>
                                </div>
                                <select value={form.termId} onChange={e => setForm(f => ({ ...f, termId: e.target.value }))}
                                    className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]">
                                    <option value="">— All Terms / Full Year —</option>
                                    {terms.map((t: any) => <option key={t._id} value={t._id}>{t.name}{t.isActive ? " (Current)" : ""}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Step 4: Class */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-[9px] font-black">4</div>
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Class / Grade *</label>
                            </div>
                            <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, streamId: "" }))}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]">
                                <option value="">— Select Class —</option>
                                {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Step 5: Stream */}
                        {form.classId && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-full bg-purple-400 text-white flex items-center justify-center text-[9px] font-black">5</div>
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Stream *</label>
                                </div>
                                {streams.length === 0 ? (
                                    <div className="text-xs text-gray-400 font-medium bg-gray-50 rounded-xl px-4 py-3 border border-dashed border-gray-200">No streams found for this class. Create streams first.</div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {streams.map((s: any) => (
                                            <button key={s._id} type="button" onClick={() => setForm(f => ({ ...f, streamId: s._id }))}
                                                className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${form.streamId === s._id ? "bg-[#5C67F2] border-[#5C67F2] text-white" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-[#5C67F2]/40"}`}>
                                                {selectedClass?.name} {s.name}{form.streamId === s._id && <Check className="w-3 h-3 inline ml-1.5" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {isComplete && (
                            <div className="bg-[#5C67F2]/5 border border-[#5C67F2]/20 rounded-2xl px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#5C67F2] mb-2">Summary</p>
                                <p className="text-xs font-bold text-gray-700">Enrolling <strong className="text-[#5C67F2]">{selectedStudents.length} student(s)</strong> into <strong>{selectedClass?.name} {selectedStream?.name}</strong> · {selectedYear?.year}{selectedTerm ? ` · ${selectedTerm.name}` : ""}</p>
                            </div>
                        )}
                    </div>

                    <div className="px-6 pb-6 flex gap-3">
                        <button onClick={() => navigate("/academic-system/enrollments")} className="h-11 px-6 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                        <button onClick={handleSubmit} disabled={!isComplete || enrollMut.isPending}
                            className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 transition-all">
                            {enrollMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Enroll {selectedStudents.length > 0 ? selectedStudents.length : ""} Student{selectedStudents.length === 1 ? "" : "s"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
