import { useState } from "react";
import { ArrowLeft, Search, Check, Loader2, Users, BookOpen, ChevronRight, User } from "lucide-react";
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
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [form, setForm] = useState({
        studentId: "",
        academicYearId: "",
        termId: "",
        classId: "",
        streamId: preStreamId,
    });

    // ── Queries ─────────────────────────────────────────────────────────
    const { data: years = [] } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });

    const { data: terms = [] } = useQuery<any[]>({
        queryKey: ["v2_terms_enroll", form.academicYearId],
        queryFn: async () => {
            if (!form.academicYearId) return [];
            return (await api.get(`/v2/terms?academicYearId=${form.academicYearId}`)).data || [];
        },
        enabled: !!form.academicYearId,
    });

    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["v2_classes"],
        queryFn: async () => (await api.get("/v2/classes")).data || [],
    });

    const { data: streams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams_enroll", form.classId],
        queryFn: async () => {
            if (!form.classId) return [];
            return (await api.get(`/v2/streams?classId=${form.classId}`)).data || [];
        },
        enabled: !!form.classId,
    });

    const { data: students = [] } = useQuery<any[]>({
        queryKey: ["students"],
        queryFn: async () => (await api.get("/students")).data || [],
    });

    const activeYear = years.find((y: any) => y.isActive);
    const activeTerm = terms.find((t: any) => t.isActive);

    // Pre-fill active year/term when they load
    const [preFilledYear, setPreFilledYear] = useState(false);
    if (activeYear && !form.academicYearId && !preFilledYear) {
        setPreFilledYear(true);
        setForm(f => ({ ...f, academicYearId: activeYear._id }));
    }

    const selectedClass = classes.find((c: any) => c._id === form.classId);
    const selectedStream = streams.find((s: any) => s._id === form.streamId);
    const selectedYear = years.find((y: any) => y._id === form.academicYearId);
    const selectedTerm = terms.find((t: any) => t._id === form.termId);

    const filteredStudents = studentSearch.length >= 2
        ? students.filter((s: any) =>
            (s.studentName || `${s.firstName || ""} ${s.lastName || ""}`)
                .toLowerCase().includes(studentSearch.toLowerCase()) ||
            (s.registrationNo || "").toLowerCase().includes(studentSearch.toLowerCase())
          )
        : [];

    // ── Enrollment mutation ──────────────────────────────────────────────
    const enrollMut = useMutation({
        mutationFn: (p: any) => api.post("/v2/enrollments", p),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["v2_enrollments"] });
            toast.success(`${selectedStudent?.studentName || "Student"} enrolled successfully`);
            navigate("/academic-system/enrollments");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Enrollment failed"),
    });

    const handleSubmit = () => {
        if (!form.studentId) { toast.error("Please select a student"); return; }
        if (!form.academicYearId) { toast.error("Please select an academic year"); return; }
        if (!form.classId) { toast.error("Please select a class"); return; }
        if (!form.streamId) { toast.error("Please select a stream"); return; }
        enrollMut.mutate({
            ...form,
            studentName: selectedStudent?.studentName || `${selectedStudent?.firstName || ""} ${selectedStudent?.lastName || ""}`.trim(),
            className: selectedClass?.name,
            streamName: selectedStream?.name,
            academicYear: selectedYear?.year,
            termName: selectedTerm?.name,
        });
    };

    const isComplete = form.studentId && form.academicYearId && form.classId && form.streamId;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                <button onClick={() => navigate("/academic-system/enrollments")}
                    className="text-gray-400 hover:text-[#5C67F2] transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500 font-medium text-sm cursor-pointer hover:text-[#5C67F2]"
                    onClick={() => navigate("/academic-system/enrollments")}>
                    Student Enrollments
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="font-black text-[#5C67F2] text-sm">Enroll Student</span>
            </div>

            <div className="max-w-2xl mx-auto w-full px-6 pt-8 space-y-6">

                {/* ── Info banner ───────────────────────────────────────── */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                    <BookOpen className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Immutable Enrollment Record</p>
                        <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                            A new enrollment record will be created. Historical records are <strong>NEVER overwritten</strong> — this preserves academic integrity for promotions and report cards.
                        </p>
                    </div>
                </div>

                {/* ── Active period summary ─────────────────────────────── */}
                {activeYear && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <p className="text-[11px] font-bold text-emerald-700">
                            Active Year: <strong>{activeYear.year}</strong>
                            {activeTerm ? ` · Active Term: ${activeTerm.name}` : " · No active term"}
                        </p>
                    </div>
                )}

                {/* ── Form card ─────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-gray-900">Enrollment Form</h2>
                            <p className="text-[10px] text-gray-400 font-medium">Assign a student to a class for a specific academic year</p>
                        </div>
                    </div>

                    <div className="px-6 py-6 space-y-5">

                        {/* Step 1: Student search ───────────────── */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full bg-[#5C67F2] text-white flex items-center justify-center text-[9px] font-black">1</div>
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Student *</label>
                            </div>

                            {selectedStudent ? (
                                <div className="flex items-center gap-3 p-3 bg-[#5C67F2]/5 border border-[#5C67F2]/20 rounded-xl">
                                    <div className="w-9 h-9 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white font-black text-xs">
                                        {(selectedStudent.studentName || selectedStudent.firstName || "S").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-gray-900">
                                            {selectedStudent.studentName || `${selectedStudent.firstName || ""} ${selectedStudent.lastName || ""}`.trim()}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-bold">{selectedStudent.registrationNo || "No reg. number"}</p>
                                    </div>
                                    <button onClick={() => { setSelectedStudent(null); setForm(f => ({ ...f, studentId: "" })); setStudentSearch(""); }}
                                        className="text-gray-400 hover:text-red-500 transition-colors text-xs font-bold">
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={studentSearch}
                                        onChange={e => setStudentSearch(e.target.value)}
                                        placeholder="Search by name or admission no…"
                                        className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2] placeholder-gray-300"
                                    />
                                    {filteredStudents.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                                            {filteredStudents.map((s: any) => {
                                                const name = s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student";
                                                return (
                                                    <button key={s._id} type="button"
                                                        onClick={() => { setSelectedStudent(s); setForm(f => ({ ...f, studentId: s._id })); setStudentSearch(""); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 transition-colors">
                                                        <div className="w-7 h-7 bg-[#5C67F2]/10 rounded-lg flex items-center justify-center text-[#5C67F2] font-black text-xs">
                                                            {name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{name}</p>
                                                            <p className="text-[10px] text-gray-400">{s.registrationNo || s.studentClass || ""}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {studentSearch.length >= 2 && filteredStudents.length === 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 px-4 py-3 text-xs text-gray-400 font-medium">
                                            No students found for "{studentSearch}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Step 2: Academic Year ────────────────── */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-black">2</div>
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Academic Year *</label>
                            </div>
                            <select value={form.academicYearId}
                                onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value, termId: "" }))}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]">
                                <option value="">— Select Year —</option>
                                {years.map((y: any) => (
                                    <option key={y._id} value={y._id}>
                                        {y.year}{y.isActive ? " (Active)" : ""}{y.name ? ` — ${y.name}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Step 3: Term (optional) ─────────────── */}
                        {form.academicYearId && terms.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-400 text-white flex items-center justify-center text-[9px] font-black">3</div>
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Term <span className="text-gray-400 font-medium normal-case">(optional)</span></label>
                                </div>
                                <select value={form.termId}
                                    onChange={e => setForm(f => ({ ...f, termId: e.target.value }))}
                                    className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]">
                                    <option value="">— All Terms / Full Year —</option>
                                    {terms.map((t: any) => (
                                        <option key={t._id} value={t._id}>
                                            {t.name}{t.isActive ? " (Current)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Step 4: Class ───────────────────────── */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-[9px] font-black">4</div>
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Class / Grade *</label>
                            </div>
                            <select value={form.classId}
                                onChange={e => setForm(f => ({ ...f, classId: e.target.value, streamId: "" }))}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]">
                                <option value="">— Select Class —</option>
                                {classes.map((c: any) => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Step 5: Stream ──────────────────────── */}
                        {form.classId && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-full bg-purple-400 text-white flex items-center justify-center text-[9px] font-black">5</div>
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-wide">Stream *</label>
                                </div>
                                {streams.length === 0 ? (
                                    <div className="text-xs text-gray-400 font-medium bg-gray-50 rounded-xl px-4 py-3 border border-dashed border-gray-200">
                                        No streams found for this class. Create streams first.
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {streams.map((s: any) => (
                                            <button key={s._id} type="button"
                                                onClick={() => setForm(f => ({ ...f, streamId: s._id }))}
                                                className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${
                                                    form.streamId === s._id
                                                        ? "bg-[#5C67F2] border-[#5C67F2] text-white"
                                                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-[#5C67F2]/40"
                                                }`}>
                                                {selectedClass?.name} {s.name}
                                                {form.streamId === s._id && <Check className="w-3 h-3 inline ml-1.5" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Summary ─────────────────────────────── */}
                        {isComplete && (
                            <div className="bg-[#5C67F2]/5 border border-[#5C67F2]/20 rounded-2xl px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#5C67F2] mb-3">Enrollment Summary</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase text-[9px]">Student</p>
                                        <p className="font-black text-gray-800">{selectedStudent?.studentName || `${selectedStudent?.firstName || ""} ${selectedStudent?.lastName || ""}`.trim()}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase text-[9px]">Academic Year</p>
                                        <p className="font-black text-gray-800">{selectedYear?.year}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase text-[9px]">Class</p>
                                        <p className="font-black text-gray-800">{selectedClass?.name} {selectedStream?.name}</p>
                                    </div>
                                    {selectedTerm && (
                                        <div>
                                            <p className="text-gray-400 font-bold uppercase text-[9px]">Term</p>
                                            <p className="font-black text-gray-800">{selectedTerm.name}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="px-6 pb-6 flex gap-3">
                        <button onClick={() => navigate("/academic-system/enrollments")}
                            className="h-11 px-6 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button onClick={handleSubmit}
                            disabled={!isComplete || enrollMut.isPending}
                            className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 transition-all">
                            {enrollMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Enroll Student
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
