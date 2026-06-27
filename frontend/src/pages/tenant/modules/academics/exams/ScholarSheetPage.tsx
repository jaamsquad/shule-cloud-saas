import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, FileText } from "lucide-react";
import api from "@/lib/api";
import { formatExamName } from "@/lib/examName";
import ScholarSheetReportCard from "./ScholarSheetReportCard";

// ScholarSheet entry: pick a class → exam → student, then render the A4 card.
export default function ScholarSheetPage() {
    const [classId, setClassId] = useState("");
    const [examId, setExamId] = useState("");
    const [studentId, setStudentId] = useState("");

    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data || [] });
    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data || [] });
    const { data: students = [] } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });

    const cls = classes.find((c: any) => c._id === classId);
    const classStudents = useMemo(() => students.filter((s: any) =>
        !classId || s.classId === classId || s.studentClass === cls?.name || s.currentClass === cls?.name
    ), [students, classId, cls]);

    return (
        <div className="flex-1 bg-[#F5F5F5] min-h-screen">
            <div className="print:hidden bg-white border-b border-slate-100 p-4">
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-[#2E7D32]" /> ScholarSheet — Report Card</h1>
                <div className="grid sm:grid-cols-3 gap-3 max-w-3xl">
                    <select value={classId} onChange={e => { setClassId(e.target.value); setStudentId(""); }} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                        <option value="">— Class —</option>
                        {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}{c.stream ? ` ${c.stream}` : ""}</option>)}
                    </select>
                    <select value={examId} onChange={e => setExamId(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                        <option value="">— Exam —</option>
                        {exams.map((ex: any) => <option key={ex._id} value={ex._id}>{formatExamName(ex, cls ? `${cls.name} ${cls.stream || ""}` : undefined)}</option>)}
                    </select>
                    <select value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!classId} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                        <option value="">— Student —</option>
                        {classStudents.map((s: any) => <option key={s._id} value={s._id}>{s.studentName || s.name} · {s.registrationNo || s.admNo}</option>)}
                    </select>
                </div>
            </div>

            {studentId && examId ? (
                <div className="p-4 print:p-0">
                    <div className="bg-white shadow-sm max-w-[210mm] mx-auto print:shadow-none print:max-w-none">
                        <ScholarSheetReportCard studentId={studentId} examId={examId} />
                    </div>
                </div>
            ) : (
                <div className="py-24 text-center text-slate-400 print:hidden">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2" />
                    <p className="font-bold">Select a class, exam and student to generate the report card.</p>
                </div>
            )}
        </div>
    );
}
