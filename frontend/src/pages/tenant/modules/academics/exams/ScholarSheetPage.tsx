import { useState, useMemo, useRef } from "react";
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

    // Robust class membership: match by classId, OR by a normalized comparison of
    // the student's class/stream text against the selected class's label/name.
    const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const classStudents = useMemo(() => {
        if (!classId || !cls) return [];
        const want = new Set([norm(clsLabel(cls)), norm(cls.levelName), norm(cls.name), norm(cls.className)].filter(Boolean));
        const wantStream = norm(cls.stream);
        return students.filter((s: any) => {
            if (String(s.classId) === String(classId)) return true;
            const sc = norm(s.studentClass || s.currentClass || s.class);
            const ss = norm(s.stream || s.streamName);
            // Match the full label, or (class-level matches AND stream matches).
            if (want.has(sc)) return true;
            if (wantStream && ss && wantStream === ss && [...want].some(w => w.includes(norm(cls.levelName || cls.name)))) return true;
            // Last resort: the student's class text equals the selected label.
            return want.has(sc) || sc === norm(clsLabel(cls));
        });
    }, [students, classId, cls]);

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

    // Reliable print: copy the rendered cards' HTML into a fresh window with a
    // forced page-break after each, then print THAT window. This avoids the
    // browser quirks of @media print on the live app (the cause of "1 sheet").
    const printRef = useRef<HTMLDivElement>(null);
    const printAll = () => {
        const area = printRef.current;
        if (!area) { window.print(); return; }
        const w = window.open("", "_blank", "width=900,height=1000");
        if (!w) { window.print(); return; }   // popups blocked → fall back
        const cards = Array.from(area.querySelectorAll(".ss-card")).map(el => `<div class="page">${(el as HTMLElement).innerHTML}</div>`).join("");
        w.document.write(`<!DOCTYPE html><html><head><title>Report Cards</title><style>
            @page { size: A4 portrait; margin: 8mm; }
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { page-break-after: always; break-after: page; }
            .page:last-child { page-break-after: auto; break-after: auto; }
            img { max-width: 100%; }
        </style></head><body>${cards}<script>window.onload=function(){setTimeout(function(){window.print();},300);}</script></body></html>`);
        w.document.close();
    };

    return (
        <div className="flex-1 bg-[#F5F5F5] min-h-screen">
            {/* Print rules: show only .ss-print-area; hide app chrome + toolbar.
                Every report card prints on its OWN page. */}
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 8mm; }
                    /* Hide all app chrome; reveal only the print area — kept in NORMAL
                       flow (no absolute positioning) so page-breaks actually apply. */
                    body * { visibility: hidden !important; }
                    .ss-print-area, .ss-print-area * { visibility: visible !important; }
                    .ss-no-print { display: none !important; }
                    /* One card per page. min-height fills the A4 content box so a short
                       card still pushes the next student onto a fresh page. */
                    .ss-card {
                        page-break-after: always; break-after: page;
                        page-break-inside: avoid; break-inside: avoid;
                        box-shadow: none !important; margin: 0 auto !important;
                        min-height: 275mm;
                    }
                    .ss-card:last-child { page-break-after: avoid; break-after: avoid; min-height: 0; }
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
                    <button onClick={printAll} disabled={!ready || !allLoaded} className="ml-auto h-10 px-5 rounded-xl bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
                        {ready && !allLoaded ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        {ready && !allLoaded ? `Loading ${loadedCount}/${renderList.length}…` : `Print ${wholeClass ? `Class (${classStudents.length})` : "Report"}`}
                    </button>
                </div>
            </div>

            {ready ? (
                <div ref={printRef} className="ss-print-area p-4 print:p-0">
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
