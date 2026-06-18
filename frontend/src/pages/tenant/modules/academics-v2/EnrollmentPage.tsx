import { useState } from "react";
import { Home, Plus, Search, Check, X, Loader2, Users, BookOpen, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

export default function EnrollmentPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [filterYear, setFilterYear] = useState("");
    const [filterClass, setFilterClass] = useState("");
    const [filterStream, setFilterStream] = useState("");
    const [form, setForm] = useState({ studentId: "", academicYearId: "", termId: "", classId: "", streamId: "" });

    const { data: years = [] } = useQuery({ queryKey: ["v2_academic_years"], queryFn: async () => { const r = await api.get("/v2/academic-years"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: terms = [] } = useQuery({ queryKey: ["v2_terms", form.academicYearId], queryFn: async () => { if (!form.academicYearId) return []; const r = await api.get(`/v2/terms?academicYearId=${form.academicYearId}`); return Array.isArray(r.data) ? r.data : []; }, enabled: !!form.academicYearId });
    const { data: classes = [] } = useQuery({ queryKey: ["v2_classes"], queryFn: async () => { const r = await api.get("/v2/classes"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: streams = [] } = useQuery({ queryKey: ["v2_streams", form.classId], queryFn: async () => { if (!form.classId) return []; const r = await api.get(`/v2/streams?classId=${form.classId}`); return Array.isArray(r.data) ? r.data : []; }, enabled: !!form.classId });
    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });

    const enrollQuery: string[] = [];
    if (filterYear) enrollQuery.push(`academicYearId=${filterYear}`);
    if (filterClass) enrollQuery.push(`classId=${filterClass}`);
    if (filterStream) enrollQuery.push(`streamId=${filterStream}`);
    const { data: enrollments = [], isLoading } = useQuery({ queryKey: ["v2_enrollments", filterYear, filterClass, filterStream], queryFn: async () => { const r = await api.get(`/v2/enrollments?status=active${enrollQuery.length ? "&" + enrollQuery.join("&") : ""}`); return Array.isArray(r.data) ? r.data : []; } });

    const enrollMut = useMutation({
        mutationFn: (p: any) => api.post("/v2/enrollments", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["v2_enrollments"] }); toast.success("Student enrolled successfully"); setShowModal(false); setForm({ studentId: "", academicYearId: "", termId: "", classId: "", streamId: "" }); setSelectedStudent(null); setStudentSearch(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Enrollment failed"),
    });

    const filteredStudents = studentSearch.length >= 2 ? students.filter((s: any) => (s.studentName || `${s.firstName} ${s.lastName}`).toLowerCase().includes(studentSearch.toLowerCase()) || (s.registrationNo || "").toLowerCase().includes(studentSearch.toLowerCase())) : [];
    const filterStreams = streams;

    // Get active year info
    const activeYear = years.find((y: any) => y.isActive);

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academic System</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Student Enrollments</span>
                </div>
                <button onClick={() => navigate("/academic-system/enroll")} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> Enroll Student
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Users className="w-7 h-7 text-[#5C67F2]" />Student Enrollments</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                        Enrollment is the bridge between students and academic years/classes. Each enrollment is permanent and historical.
                    </p>
                </div>

                {/* Active year info */}
                {activeYear && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 mb-6 flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Active Academic Year: <span className="text-indigo-900">{activeYear.year} — {activeYear.name}</span></p>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm mb-6">
                    <div className="relative w-44">
                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Year</div>
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                            <option value="">All Years</option>
                            {years.map((y: any) => <option key={y._id} value={y._id}>{y.year}</option>)}
                        </select>
                    </div>
                    <div className="relative w-44">
                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class</div>
                        <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterStream(""); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                            <option value="">All Classes</option>
                            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    <span className="self-center text-[10px] font-black text-slate-400 uppercase tracking-widest ml-auto">{enrollments.length} active enrollments</span>
                </div>

                {/* Enrollments table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                    {isLoading ? <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading enrollments...</div>
                    : enrollments.length === 0 ? <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><Users className="w-8 h-8" />No active enrollments found</div>
                    : <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    {["Student", "Academic Year", "Class", "Stream", "Enrollment Date", "Status", "History"].map(h => <th key={h} className="py-4 px-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {enrollments.map((e: any) => (
                                    <tr key={e._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4 font-black text-slate-800">{e.studentName}</td>
                                        <td className="py-3 px-4 font-bold text-slate-600">{e.academicYear}</td>
                                        <td className="py-3 px-4 font-bold text-slate-700">{e.currentClass || e.className}</td>
                                        <td className="py-3 px-4"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[9px] font-black uppercase">{e.currentClass || e.fullClassName || `${e.className} ${e.streamName}`}</span></td>
                                        <td className="py-3 px-4 font-bold text-slate-500">{e.enrollmentDate ? new Date(e.enrollmentDate).toLocaleDateString("en-GB") : "—"}</td>
                                        <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${e.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{e.status}</span></td>
                                        <td className="py-3 px-4">
                                            <a href={`/academic-system/student-history/${e.studentId}`} className="flex items-center gap-1 text-[9px] text-[#5C67F2] font-black uppercase hover:underline"><History className="w-3 h-3" />View History</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>}
                </div>
            </div>

            {/* Enroll Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-black text-slate-900 uppercase">Enroll Student</h3><button onClick={() => { setShowModal(false); setSelectedStudent(null); setStudentSearch(""); }} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>

                            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-5 text-[10px] font-bold text-amber-700">
                                ⚠️ A new enrollment record will be created. Historical records are NEVER overwritten.
                            </div>

                            <div className="space-y-5">
                                {/* Student search */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Student*</div>
                                    <input type="text" value={studentSearch} onChange={e => { setStudentSearch(e.target.value); if (selectedStudent) setSelectedStudent(null); }} placeholder="Search student name or admission no..." className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    {filteredStudents.length > 0 && !selectedStudent && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-44 overflow-y-auto">
                                            {filteredStudents.map((s: any) => { const name = s.studentName || `${s.firstName} ${s.lastName}`; return <div key={s._id} onClick={() => { setSelectedStudent(s); setStudentSearch(name); setForm(p => ({ ...p, studentId: s._id })); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50"><p className="text-xs font-black text-slate-700">{name}</p><p className="text-[9px] text-slate-400 font-bold">{s.registrationNo} · {s.studentClass}</p></div>; })}
                                        </div>
                                    )}
                                    {selectedStudent && <div className="mt-2 flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-100"><div className="w-6 h-6 rounded-lg bg-[#5C67F2] text-white font-black text-[9px] flex items-center justify-center">{selectedStudent.studentName?.[0] || "S"}</div><p className="text-[10px] font-black text-indigo-700">{selectedStudent.studentName} · {selectedStudent.registrationNo}</p><button onClick={() => { setSelectedStudent(null); setStudentSearch(""); setForm(p => ({ ...p, studentId: "" })); }} className="ml-auto text-indigo-300 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button></div>}
                                </div>

                                {/* Year */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Academic Year*</div>
                                    <select value={form.academicYearId} onChange={e => setForm({ ...form, academicYearId: e.target.value, termId: "", classId: "", streamId: "" })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Year —</option>
                                        {years.map((y: any) => <option key={y._id} value={y._id}>{y.year} — {y.name}{y.isActive ? " (Active)" : ""}</option>)}
                                    </select>
                                </div>

                                {/* Term */}
                                {form.academicYearId && (
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Term (optional)</div>
                                        <select value={form.termId} onChange={e => setForm({ ...form, termId: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            <option value="">— All terms / Whole year —</option>
                                            {terms.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Class */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class*</div>
                                    <select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value, streamId: "" })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Class —</option>
                                        {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>

                                {/* Stream */}
                                {form.classId && (
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Stream*</div>
                                        <select value={form.streamId} onChange={e => setForm({ ...form, streamId: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            <option value="">— Select Stream —</option>
                                            {filterStreams.map((s: any) => <option key={s._id} value={s._id}>{s.fullName || `${classes.find((c: any) => c._id === s.classId)?.name} ${s.name}`}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => { setShowModal(false); setSelectedStudent(null); setStudentSearch(""); }} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.studentId || !form.academicYearId || !form.classId || !form.streamId) { toast.error("Student, year, class, and stream are all required"); return; } enrollMut.mutate(form); }} disabled={enrollMut.isPending}
                                    className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {enrollMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Enroll Student
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
