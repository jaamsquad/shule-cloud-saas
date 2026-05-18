import { useState } from "react";
import {
    Search, Printer, Download, Home, User, Award, GraduationCap,
    Loader2, ChevronDown, BarChart3, BookOpen
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function ResultCard() {
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [search, setSearch] = useState("");

    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data });
    const { data: periods = [] } = useQuery<any[]>({ queryKey: ["periods"], queryFn: async () => (await api.get("/academics/periods")).data });
    const currentPeriod = periods.find((p: any) => p.isCurrent) || periods[0];

    const { data: allStudents = [] } = useQuery<any[]>({
        queryKey: ["students"],
        queryFn: async () => (await api.get("/students")).data,
    });

    const students = selectedClass
        ? allStudents.filter((s: any) =>
            s.classId === selectedClass._id ||
            s.studentClass === (selectedClass.levelName || selectedClass.name)
          )
        : [];

    const { data: marks = [], isLoading: loadingMarks } = useQuery<any[]>({
        queryKey: ["result-card", selectedExam?._id, selectedStudent?._id],
        queryFn: async () => selectedExam && selectedStudent
            ? (await api.get(`/academics/exam-marks?examId=${selectedExam._id}&studentId=${selectedStudent._id}`)).data
            : [],
        enabled: !!selectedExam && !!selectedStudent,
    });

    const { data: tenantProfile } = useQuery<any>({
        queryKey: ["tenant_profile"],
        queryFn: async () => (await api.get("/tenant/profile")).data,
    });

    const filteredStudents = students.filter((s: any) => {
        const name = s.studentName || (s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : null) || s.fullName || s.name || "";
        const adm = s.admissionNumber || s.admNo || s.registrationNo || "";
        return name.toLowerCase().includes(search.toLowerCase()) || adm.toLowerCase().includes(search.toLowerCase());
    });

    const getStudentName = (s: any) =>
        s.studentName ||
        (s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : null) ||
        s.fullName || s.name || s.admNo || "Student";
    const getAdmNo = (s: any) => s.admissionNumber || s.admNo || s.registrationNo || "—";

    const totalObtained = marks.reduce((sum: number, m: any) => sum + (Number(m.marksObtained) || 0), 0);
    const totalMax = marks.reduce((sum: number, m: any) => sum + (Number(m.totalMarks) || 100), 0);
    const overall = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

    const { data: gradingConfig } = useQuery<any>({
        queryKey: ["grading_criteria"],
        queryFn: async () => (await api.get("/grading_criteria")).data?.[0],
    });
    const gradeTiers: Array<{ grade: string; from: number; upto: number; status: string }> =
        gradingConfig?.grades || [];

    const overallGrade = (() => {
        if (gradeTiers.length > 0) {
            const sorted = [...gradeTiers].sort((a, b) => b.from - a.from);
            const match = sorted.find(t => overall >= t.from && overall <= t.upto);
            if (match) return match.grade;
        }
        if (overall >= 80) return "A+";
        if (overall >= 70) return "A";
        if (overall >= 60) return "B+";
        if (overall >= 50) return "B";
        if (overall >= 40) return "C";
        if (overall >= 33) return "D";
        return "F";
    })();


    const schoolName = tenantProfile?.name || "ShuleCloud School";
    const schoolTagline = tenantProfile?.tagline || "Excellence in Education";

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Exams</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Result Card</span>
                </div>
                {selectedStudent && marks.length > 0 && (
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md transition-all">
                        <Printer className="w-3.5 h-3.5" /> Print Result Card
                    </button>
                )}
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-6xl mx-auto">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Result Card</h1>
                <p className="text-slate-400 text-sm font-medium mb-8">Generate individual student result cards with full academic performance.</p>

                {/* Selectors */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {/* Exam */}
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Exam</label>
                        <select
                            value={selectedExam?._id || ""}
                            onChange={e => setSelectedExam(exams.find((o: any) => o._id === e.target.value) || null)}
                            className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none"
                        >
                            <option value="">— Select Exam —</option>
                            {exams.map((o: any) => (
                                <option key={o._id} value={o._id}>
                                    {o.examName || o.name || o.label || "Unnamed Exam"}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 bottom-4 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Class */}
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Class</label>
                        <select
                            value={selectedClass?._id || ""}
                            onChange={e => { setSelectedClass(classes.find((o: any) => o._id === e.target.value) || null); setSelectedStudent(null); setSearch(""); }}
                            className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none"
                        >
                            <option value="">— Select Class —</option>
                                {classes.map((o: any) => (
                                <option key={o._id} value={o._id}>
                                    {o.levelName || o.name || "—"}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 bottom-4 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Student search */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Student</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…" className="w-full h-12 pl-12 pr-4 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-300" />
                        </div>
                        {search && filteredStudents.length > 0 && (
                            <div className="absolute mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto w-full max-w-xs">
                                {filteredStudents.map((s: any) => (
                        <button key={s._id} onClick={() => { setSelectedStudent(s); setSearch(""); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-[#5C67F2] flex items-center gap-2 transition-colors">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-[#5C67F2] text-[10px] font-black">{getStudentName(s)[0]}</div>
                                        {getStudentName(s)} <span className="text-slate-400 text-xs font-normal">({getAdmNo(s)})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Result Card */}
                {selectedStudent && selectedExam ? (
                    loadingMarks ? (
                        <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>
                    ) : (
                        <div id="result-card" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:rounded-none print:border-0">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-[#5C67F2] to-indigo-500 px-8 py-6 text-white text-center relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mx-auto mb-3">
                                    <GraduationCap className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-xl font-black uppercase tracking-widest">{schoolName}</h2>
                                <p className="text-white/70 text-xs font-medium mt-1">{schoolTagline}</p>
                                <div className="mt-4 inline-block px-5 py-2 bg-white/20 rounded-full">
                                    <p className="text-sm font-black uppercase tracking-widest">STUDENT RESULT CARD</p>
                                </div>
                            </div>

                            {/* Student Info */}
                            <div className="px-8 py-5 bg-slate-50 border-b border-gray-100">
                                <div className="grid grid-cols-4 gap-4">
                                    {[
                                        { label: "Student Name", value: getStudentName(selectedStudent) },
                                        { label: "Admission No.", value: getAdmNo(selectedStudent) },
                                        { label: "Class", value: selectedClass?.levelName || selectedClass?.name || selectedStudent?.class || "—" },
                                        { label: "Academic Period", value: currentPeriod ? `${currentPeriod.label} · ${currentPeriod.academicYear}` : selectedExam.academicYear || "—" },
                                        { label: "Exam", value: selectedExam.examName },
                                        { label: "Exam Date", value: selectedExam.startDate ? new Date(selectedExam.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                                        { label: "Total Subjects", value: marks.length },
                                        { label: "Overall Result", value: overall >= 50 ? "✅ PASSED" : "❌ NOT PASSED" },
                                    ].map(item => (
                                        <div key={item.label}>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">{item.label}</p>
                                            <p className="text-sm font-black text-slate-800">{String(item.value)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Marks Table */}
                            <div className="px-8 py-6">
                                {marks.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 font-bold text-sm">
                                        <BookOpen className="w-8 h-8 mx-auto mb-3 text-slate-200" />
                                        No marks found for this student and exam.
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-[#5C67F2] to-indigo-400 text-white">
                                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest rounded-tl-xl">#</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Subject</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Max Marks</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Obtained</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">%</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Grade</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest rounded-tr-xl">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {marks.map((m: any, i: number) => {
                                                const pct = m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0;
                                                return (
                                                    <tr key={m._id || i} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-400">{i + 1}</td>
                                                        <td className="px-4 py-3 text-sm font-black text-slate-800">{m.subjectName || "—"}</td>
                                                        <td className="px-4 py-3 text-center text-sm font-bold text-slate-600">{m.totalMarks}</td>
                                                        <td className="px-4 py-3 text-center text-sm font-black text-[#5C67F2]">{m.marksObtained}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`text-xs font-black ${pct >= 50 ? "text-emerald-600" : "text-red-500"}`}>{pct}%</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-50 text-[#5C67F2]">{m.grade || "—"}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-500">{m.attendanceStatus === "Absent" ? "🔴 Absent" : m.remarks || "—"}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                                                <td colSpan={2} className="px-4 py-3 text-sm font-black uppercase tracking-wider rounded-bl-xl">TOTAL / OVERALL</td>
                                                <td className="px-4 py-3 text-center font-black">{totalMax}</td>
                                                <td className="px-4 py-3 text-center font-black text-yellow-400">{totalObtained}</td>
                                                <td className="px-4 py-3 text-center font-black text-yellow-400">{overall}%</td>
                                                <td className="px-4 py-3 text-center"><span className="font-black text-yellow-400 text-lg">{overallGrade}</span></td>
                                                <td className="px-4 py-3 font-black rounded-br-xl">{overall >= 50 ? "✅ PASS" : "❌ FAIL"}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>

                            {/* Signature section */}
                            <div className="px-8 py-6 border-t border-gray-100 grid grid-cols-3 gap-8">
                                {["Class Teacher", "Principal / Head", "Parent / Guardian"].map(role => (
                                    <div key={role} className="text-center">
                                        <div className="h-10 border-b border-dashed border-slate-300 mb-2" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-4">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                            <Award className="w-10 h-10 text-[#5C67F2]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-black text-slate-700">Select Exam & Student</h3>
                            <p className="text-slate-400 text-sm font-medium mt-1">Choose an exam, class, and student to generate their result card.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
