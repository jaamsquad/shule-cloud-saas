import { useState } from "react";
import { Home, Check, Loader2, Search, BookOpen, Lock, Unlock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

function grade(pct: number) {
    if (pct >= 80) return "A"; if (pct >= 70) return "B+"; if (pct >= 60) return "B";
    if (pct >= 50) return "C+"; if (pct >= 40) return "C"; if (pct >= 33) return "D"; return "F";
}

export default function V2MarksEntry() {
    const qc = useQueryClient();
    const [selectedExam, setSelectedExam] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [entries, setEntries] = useState<Record<string, string>>({});
    const [outOf, setOutOf] = useState("100");
    const [isSaving, setIsSaving] = useState(false);

    const { data: years = [] } = useQuery({ queryKey: ["v2_academic_years"], queryFn: async () => { const r = await api.get("/v2/academic-years"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: exams = [] } = useQuery({ queryKey: ["v2_exams"], queryFn: async () => { const r = await api.get("/v2/exams"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: subjects = [] } = useQuery({ queryKey: ["v2_subjects"], queryFn: async () => { const r = await api.get("/v2/subjects"); return Array.isArray(r.data) ? r.data : []; } });

    const exam = exams.find((e: any) => e._id === selectedExam);

    // Fetch enrollments for this exam's stream
    const { data: enrollments = [], isLoading: loadEnroll } = useQuery({
        queryKey: ["v2_enrollments_marks", exam?.streamId, exam?.academicYearId],
        queryFn: async () => {
            if (!exam) return [];
            const r = await api.get(`/v2/enrollments?streamId=${exam.streamId}&academicYearId=${exam.academicYearId}&status=active`);
            return Array.isArray(r.data) ? r.data : [];
        },
        enabled: !!exam,
    });

    // Fetch existing marks for this exam/subject
    const { data: existingMarks = [] } = useQuery({
        queryKey: ["v2_marks", selectedExam, selectedSubject],
        queryFn: async () => {
            if (!selectedExam || !selectedSubject) return [];
            const r = await api.get(`/v2/marks?examId=${selectedExam}&subjectId=${selectedSubject}`);
            return Array.isArray(r.data) ? r.data : [];
        },
        enabled: !!selectedExam && !!selectedSubject,
        onSuccess: (data: any[]) => {
            const map: Record<string, string> = {};
            data.forEach((m: any) => { map[m.enrollmentId] = String(m.marksObtained); });
            setEntries(map);
        },
    });

    const lockMut = useMutation({
        mutationFn: () => api.patch(`/v2/exams/${selectedExam}/lock-all`, {}),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["v2_exams"] }); toast.success("All marks locked for this exam"); },
    });

    const handleSaveAll = async () => {
        if (!selectedExam || !selectedSubject) { toast.error("Select exam and subject"); return; }
        const sub = subjects.find((s: any) => s._id === selectedSubject);
        setIsSaving(true);
        const marks = enrollments.map((enroll: any) => {
            const val = entries[enroll._id];
            if (val === undefined || val === "") return null;
            return { studentId: enroll.studentId, enrollmentId: enroll._id, examId: selectedExam, subjectId: selectedSubject, subjectName: sub?.name || "", marksObtained: Number(val), totalMarks: Number(outOf) || 100 };
        }).filter(Boolean);

        try {
            await api.post("/v2/marks/bulk", { marks });
            qc.invalidateQueries({ queryKey: ["v2_marks"] });
            toast.success(`Marks saved for ${marks.length} students`);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to save marks");
        } finally {
            setIsSaving(false);
        }
    };

    const subjectsForClass = exam?.classId ? subjects.filter((s: any) => !s.classId || s.classId === exam.classId) : subjects;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academic System</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Marks Entry (V2)</span>
                </div>
                <div className="flex gap-2">
                    {selectedExam && !exam?.isLocked && (
                        <button onClick={() => lockMut.mutate()} disabled={lockMut.isPending} className="h-9 px-4 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> Lock All Marks
                        </button>
                    )}
                    <button onClick={handleSaveAll} disabled={isSaving || !selectedExam || !selectedSubject || exam?.isLocked}
                        className="h-9 px-5 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Save All Marks
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><BookOpen className="w-7 h-7 text-[#5C67F2]" />Marks Entry (Enrollment-Based)</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Marks are permanently tied to enrollmentId — results never change after promotion.</p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-5 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-6">
                    <div className="relative w-64">
                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Exam*</div>
                        <select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setEntries({}); setSelectedSubject(""); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                            <option value="">— Select Exam —</option>
                            {exams.map((e: any) => <option key={e._id} value={e._id}>{e.name} · {e.fullClassName} · {e.academicYear}</option>)}
                        </select>
                    </div>
                    {selectedExam && (
                        <div className="relative w-52">
                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Subject*</div>
                            <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setEntries({}); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                <option value="">— Select Subject —</option>
                                {subjectsForClass.map((s: any) => <option key={s._id} value={s._id}>{s.name} {s.code ? `(${s.code})` : ""}</option>)}
                            </select>
                        </div>
                    )}
                    {selectedExam && selectedSubject && (
                        <div className="relative w-28">
                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Out Of</div>
                            <input type="number" value={outOf} onChange={e => setOutOf(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 text-center" />
                        </div>
                    )}
                    {exam && (
                        <div className="flex items-center gap-2 ml-auto">
                            {exam.isLocked ? <span className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-[9px] font-black text-rose-600 uppercase"><Lock className="w-3 h-3" />Marks Locked</span>
                            : <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[9px] font-black text-emerald-600 uppercase"><Unlock className="w-3 h-3" />Entry Open</span>}
                        </div>
                    )}
                </div>

                {/* Marks table */}
                {!selectedExam || !selectedSubject ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center h-48 gap-2 text-slate-300 text-xs font-bold uppercase">
                        <BookOpen className="w-10 h-10" />Select an exam and subject to enter marks
                    </div>
                ) : loadEnroll ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading students...</div>
                ) : enrollments.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center h-48 gap-2 text-slate-300 text-xs font-bold uppercase">
                        <Search className="w-10 h-10" />No active enrollments found for this exam's stream/year
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-wider">{enrollments.length} Students — {exam?.fullClassName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Entered: {Object.values(entries).filter(v => v !== "").length}/{enrollments.length}</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-3 px-4">#</th>
                                        <th className="py-3 px-4">Student</th>
                                        <th className="py-3 px-4">Class/Stream</th>
                                        <th className="py-3 px-4 w-32 text-center">Marks / {outOf}</th>
                                        <th className="py-3 px-4 text-center">%</th>
                                        <th className="py-3 px-4 text-center">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {enrollments.map((enroll: any, i: number) => {
                                        const val = entries[enroll._id] ?? "";
                                        const pct = val !== "" && Number(outOf) > 0 ? (Number(val) / Number(outOf)) * 100 : null;
                                        return (
                                            <tr key={enroll._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-4 text-slate-400 font-bold">{i + 1}</td>
                                                <td className="py-3 px-4 font-black text-slate-800">{enroll.studentName}</td>
                                                <td className="py-3 px-4 font-bold text-slate-500">{enroll.fullClassName || `${enroll.className} ${enroll.streamName}`}</td>
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="number" min="0" max={outOf}
                                                        value={val}
                                                        onChange={e => setEntries(p => ({ ...p, [enroll._id]: e.target.value }))}
                                                        disabled={exam?.isLocked}
                                                        placeholder="—"
                                                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 text-center focus:outline-none focus:border-[#5C67F2] disabled:opacity-50"
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-slate-600">{pct !== null ? `${pct.toFixed(1)}%` : "—"}</td>
                                                <td className="py-3 px-4 text-center">
                                                    {pct !== null && <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${pct >= 70 ? "bg-emerald-50 text-emerald-600" : pct >= 50 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-500"}`}>{grade(pct)}</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
