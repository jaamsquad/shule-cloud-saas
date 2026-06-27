import { useState, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { GraduationCap, FileText, Printer, Users, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { formatExamName } from "@/lib/examName";
import ScholarSheetReportCard from "./ScholarSheetReportCard";

// ScholarSheet entry: pick a class → exam → student (or the whole class), then
// render/print the A4 card(s). Print outputs ONLY the report(s) — sidebar, header
// and toolbar are hidden via the print stylesheet below.
export default function ScholarSheetPage() {
    const [classId, setClassId] = useState("");
    const [examId, setExamId] = useState("");
    const [studentId, setStudentId] = useState("");
    const [wholeClass, setWholeClass] = useState(false);
    // KCPE field visibility toggles.
    const [showKcpe, setShowKcpe] = useState(true);

    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data || [] });
    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data || [] });
    const { data: students = [] } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });

    const clsLabel = (c: any) => `${c.levelName || c.name || c.className || ""}${c.stream ? ` ${c.stream}` : ""}`.trim();
    const cls = classes.find((c: any) => c._id === classId);
    const classLabel = cls ? clsLabel(cls) : "";

    const classStudents = useMemo(() => students.filter((s: any) =>
        !classId || s.classId === classId || s.studentClass === (cls?.levelName || cls?.name) || s.currentClass === (cls?.levelName || cls?.name)
    ), [students, classId, cls]);

    const ready = examId && (wholeClass ? classStudents.length > 0 : !!studentId);
    const renderList = wholeClass ? classStudents : (studentId ? classStudents.filter((s: any) => s._id === studentId) : []);

    // Prefetch EVERY card's data up-front so the whole class is fully rendered
    // before printing — otherwise lazily-loading cards get skipped in the print.
    const cardQueries = useQueries({
        queries: (examId ? renderList : []).map((s: any) => ({
            queryKey: ["scholar_sheet", s._id, examId],
            queryFn: async () => (await api.get(`/reports/scholar-sheet/${s._id}`, { params: { examId } })).data,
            staleTime: 5 * 60 * 1000,
        })),
    });
    const allLoaded = cardQueries.length > 0 && cardQueries.every(q => q.isSuccess || q.isError);
    const loadedCount = cardQueries.filter(q => q.isSuccess).length;

    return (
        <div className="flex-1 bg-[#F5F5F5] min-h-screen">
            {/* Print rules: show only .ss-print-area; hide app chrome + toolbar.
                Every report card prints on its OWN page. */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    .ss-print-area, .ss-print-area * { visibility: visible !important; }
                    .ss-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .ss-no-print { display: none !important; }
                    @page { size: A4 portrait; margin: 8mm; }
                    /* One card per page: never split a card, always break after each. */
                    .ss-card { page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; box-shadow: none !important; margin: 0 !important; }
                    .ss-card:last-child { page-break-after: auto; break-after: auto; }
                }
            `}</style>

            <div className="ss-no-print bg-white border-b border-slate-100 p-4">
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-[#2E7D32]" /> ScholarSheet — Report Card</h1>
                <div className="grid sm:grid-cols-3 gap-3 max-w-3xl">
                    <select value={classId} onChange={e => { setClassId(e.target.value); setStudentId(""); }} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                        <option value="">— Class —</option>
                        {classes.map((c: any) => <option key={c._id} value={c._id}>{clsLabel(c) || "Unnamed class"}</option>)}
                    </select>
                    <select value={examId} onChange={e => setExamId(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                        <option value="">— Exam —</option>
                        {exams.map((ex: any) => <option key={ex._id} value={ex._id}>{formatExamName(ex, classLabel || undefined)}</option>)}
                    </select>
                    <select value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!classId || wholeClass} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                        <option value="">— Student —</option>
                        {classStudents.map((s: any) => <option key={s._id} value={s._id}>{s.studentName || s.name} · {s.registrationNo || s.admNo}</option>)}
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <input type="checkbox" checked={wholeClass} onChange={e => { setWholeClass(e.target.checked); setStudentId(""); }} /> <Users className="w-4 h-4" /> Whole class ({classStudents.length})
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <input type="checkbox" checked={showKcpe} onChange={e => setShowKcpe(e.target.checked)} /> Show KCPE fields
                    </label>
                    <button onClick={() => window.print()} disabled={!ready || !allLoaded} className="ml-auto h-10 px-5 rounded-xl bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
                        {ready && !allLoaded ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        {ready && !allLoaded ? `Loading ${loadedCount}/${renderList.length}…` : `Print ${wholeClass ? `Class (${classStudents.length})` : "Report"}`}
                    </button>
                </div>
            </div>

            {ready ? (
                <div className="ss-print-area p-4 print:p-0">
                    {renderList.map((s: any, i: number) => (
                        <div key={s._id} className="ss-card bg-white shadow-sm max-w-[210mm] mx-auto mb-4 print:shadow-none print:mb-0">
                            <ScholarSheetReportCard studentId={s._id} examId={examId} showKcpe={showKcpe} hideToolbar preloaded={cardQueries[i]?.data} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="ss-no-print py-24 text-center text-slate-400">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2" />
                    <p className="font-bold">Pick a class &amp; exam, then a student — or tick “Whole class” to generate all report cards.</p>
                </div>
            )}
        </div>
    );
}
