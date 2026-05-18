import { useState } from "react";
import { Home, Printer, ChevronDown, Loader2, BookOpen, GraduationCap, ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function BlankAwardList() {
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [totalMarks, setTotalMarks] = useState("100");

    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data });
    const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data });
    const { data: tenantProfile } = useQuery<any>({ queryKey: ["tenant_profile"], queryFn: async () => (await api.get("/tenant/profile")).data });

    const { data: allStudents = [], isLoading } = useQuery<any[]>({
        queryKey: ["students"],
        queryFn: async () => (await api.get("/students")).data,
    });

    const students = selectedClass
        ? allStudents.filter((s: any) =>
            s.classId === selectedClass._id ||
            s.studentClass === (selectedClass.levelName || selectedClass.name)
          )
        : [];

    const schoolName = tenantProfile?.name || "ShuleCloud School";
    const ready = selectedExam && selectedClass && students.length > 0;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 print:hidden">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Exams</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Blank Award List</span>
                </div>
                {ready && (
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md transition-all">
                        <Printer className="w-3.5 h-3.5" /> Print Award List
                    </button>
                )}
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-5xl mx-auto">
                <div className="print:hidden">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Blank Award List</h1>
                    <p className="text-slate-400 text-sm font-medium mb-8">Generate printable blank mark entry sheets for subject teachers.</p>

                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Exam</label>
                            <select value={selectedExam?._id || ""} onChange={e => setSelectedExam(exams.find((o: any) => o._id === e.target.value) || null)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                <option value="">— Select Exam —</option>
                                {exams.map((e: any) => <option key={e._id} value={e._id}>{e.examName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Class</label>
                            <select value={selectedClass?._id || ""} onChange={e => setSelectedClass(classes.find((o: any) => o._id === e.target.value) || null)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                <option value="">— Select Class —</option>
                                {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.name || "—"}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                            <select value={selectedSubject?._id || ""} onChange={e => setSelectedSubject(subjects.find((o: any) => o._id === e.target.value) || null)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                <option value="">All Subjects</option>
                                {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Marks</label>
                            <input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} min="1" className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                        </div>
                    </div>
                </div>

                {!ready ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-4 print:hidden">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center"><ClipboardList className="w-10 h-10 text-[#5C67F2]" /></div>
                        <div className="text-center"><h3 className="text-base font-black text-slate-700">Select Exam & Class</h3><p className="text-slate-400 text-sm font-medium mt-1">Choose an exam and class to generate the blank award list.</p></div>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>
                ) : (
                    <div id="award-list" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden print:rounded-none print:border-0">
                        {/* Printable Header */}
                        <div className="text-center border-b-2 border-slate-800 px-8 py-6">
                            <div className="flex items-center justify-center gap-4 mb-3">
                                <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center">
                                    <GraduationCap className="w-7 h-7 text-slate-800" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">{schoolName}</h2>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Excellence in Education</p>
                                </div>
                            </div>
                            <div className="mt-3 inline-block border-2 border-slate-800 rounded-lg px-6 py-1.5">
                                <p className="text-sm font-black uppercase tracking-widest text-slate-800">BLANK AWARD LIST / MARK SHEET</p>
                            </div>
                        </div>

                        {/* Exam Info */}
                        <div className="px-8 py-4 border-b border-gray-100 grid grid-cols-4 gap-4 bg-slate-50">
                            {[
                                { label: "Examination", value: selectedExam?.examName },
                                { label: "Class", value: selectedClass?.levelName || selectedClass?.name },
                                { label: "Subject", value: selectedSubject?.name || "All Subjects" },
                                { label: "Total Marks", value: totalMarks },
                            ].map(item => (
                                <div key={item.label} className="border-b border-dashed border-slate-400 pb-1">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{item.label}</p>
                                    <p className="text-sm font-black text-slate-800 mt-0.5">{item.value || "—"}</p>
                                </div>
                            ))}
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #1e293b" }}>
                                        {["#", "Admission No.", "Student Name", "Marks Obtained", "Remarks", "Signature"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-700 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s: any, i: number) => (
                                        <tr key={s._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td className="px-4 py-3 text-sm font-bold text-slate-400">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-slate-600">{s.admissionNumber || s.admNo || s.registrationNo || "—"}</td>
                                            <td className="px-4 py-3 text-sm font-black text-slate-800">
                                                {s.studentName ||
                                                 (s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : null) ||
                                                 s.fullName || s.name || "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div style={{ borderBottom: "1px dotted #94a3b8", minWidth: "80px", height: "24px" }} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div style={{ borderBottom: "1px dotted #94a3b8", minWidth: "120px", height: "24px" }} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div style={{ borderBottom: "1px dotted #94a3b8", minWidth: "100px", height: "24px" }} />
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Empty rows for walkups */}
                                    {[...Array(3)].map((_, i) => (
                                        <tr key={`empty-${i}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            {[...Array(6)].map((_, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div style={{ borderBottom: j > 0 ? "1px dotted #94a3b8" : "none", minWidth: j === 0 ? "30px" : j === 2 ? "160px" : "80px", height: "24px" }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary & Signature Footer */}
                        <div className="px-8 py-5 border-t-2 border-dashed border-slate-300">
                            <div className="grid grid-cols-3 gap-6 mb-6">
                                {[["Total Students", students.length.toString()], ["Papers Marked", "                "], ["Submitted To", "                "]].map(([label, val]) => (
                                    <div key={label}>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">{label}</p>
                                        <div className="border-b border-dotted border-slate-400 pb-1">
                                            <p className="text-sm font-black text-slate-700">{val}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-8 mt-8">
                                {["Subject Teacher", "Head of Department", "Principal"].map(role => (
                                    <div key={role} className="text-center">
                                        <div className="h-12 border-b border-dashed border-slate-400 mb-2" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
                                        <p className="text-[8px] text-slate-300 font-medium mt-0.5">Signature & Date</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
