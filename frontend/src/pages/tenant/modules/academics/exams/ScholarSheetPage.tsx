import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { GraduationCap, FileText, Printer, Users, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { formatExamName } from "@/lib/examName";
import ScholarSheetReportCard from "./ScholarSheetReportCard";

// ScholarSheet entry: pick a class → exam → student (or the whole class), then
// render/print the A4 card(s). Print outputs ONLY the report(s) — sidebar, header
// and toolbar are hidden via the print stylesheet below.
export default function ScholarSheetPage() {
    // Class + stream are SEPARATE (v2 model): pick Form 4, then East/South.
    const [classId, setClassId] = useState("");
    const [streamId, setStreamId] = useState("");
    const [examId, setExamId] = useState("");
    const [studentId, setStudentId] = useState("");
    const [studentSearch, setStudentSearch] = useState("");   // searchable student box
    const [studentOpen, setStudentOpen] = useState(false);
    const [wholeClass, setWholeClass] = useState(false);
    // KCPE field visibility toggles.
    const [showKcpe, setShowKcpe] = useState(true);
    // Deep-link from a student's Academic History: ?studentId=&examId= opens that
    // exact card directly (used for viewing previous-class ScholarSheets).
    const [deepLink, setDeepLink] = useState<{ studentId: string; examId: string } | null>(null);
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const s = p.get("studentId");
        const e = p.get("examId");
        const c = p.get("classId");
        const stream = p.get("streamId");
        const w = p.get("wholeClass");

        if (c) {
            setClassId(c);
            setStudentId("");
            setStudentSearch("");
        }
        if (stream) {
            setStreamId(stream);
        }
        if (w === "true") {
            setWholeClass(true);
        }
        if (s && e) {
            setDeepLink({ studentId: s, examId: e });
            setExamId(e);
            setStudentId(s);
        } else if (e) {
            setExamId(e);
        }
    }, []);

    // v2 classes (levels) + streams for the chosen class.
    const { data: v2classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: legacyClasses = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data || [] });
    const resolvedClass = useMemo(() => {
        const foundV2 = v2classes.find((c: any) => String(c._id) === String(classId));
        if (foundV2) return foundV2;
        const legacy = legacyClasses.find((c: any) => String(c._id) === String(classId));
        if (legacy) {
            return v2classes.find((c: any) => {
                const legacyName = norm(legacy.name || legacy.levelName || legacy.className);
                return norm(c.name) === legacyName || norm(c.levelName) === legacyName || norm(c.className) === legacyName;
            }) || legacy;
        }
        return null;
    }, [classId, v2classes, legacyClasses]);
    const effectiveClassId = String(resolvedClass?._id || classId || "");
    const { data: v2streams = [] } = useQuery<any[]>({ queryKey: ["v2_streams", effectiveClassId], enabled: !!effectiveClassId, queryFn: async () => (await api.get("/v2/streams", { params: { classId: effectiveClassId } })).data || [] });
    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data || [] });
    const { data: students = [] } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });

    const cls = v2classes.find((c: any) => String(c._id) === String(classId));
    const legacyClass = legacyClasses.find((c: any) => String(c._id) === String(classId));
    const stream = v2streams.find((s: any) => String(s._id) === String(streamId));
    const classNameSource = cls || legacyClass;
    const classLabel = classNameSource ? (stream ? (stream.fullName || `${classNameSource.name || classNameSource.levelName || classNameSource.className} ${stream.name}`) : (classNameSource.name || classNameSource.levelName || classNameSource.className)) : "";

    // Student membership: match by v2 classId/streamId when present, else fall
    // back to a normalized comparison of the student's class/stream TEXT.
    const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const classStudents = useMemo(() => {
        if (!classId || (!cls && !legacyClass)) return [];
        const source = cls || legacyClass;
        const wantClass = new Set([norm(source.name), norm(source.className), norm(source.levelName), norm(source.level)].filter(Boolean));
        const wantStream = stream ? norm(stream.name) : "";
        return students.filter((s: any) => {
            const idClassMatch = String(s.classId) === String(classId);
            const idStreamMatch = !streamId || String(s.streamId) === String(streamId);
            if (idClassMatch) return idStreamMatch;
            const sc = norm(s.studentClass || s.currentClass || s.class || s.className);
            const ss = norm(s.stream || s.streamName);
            const classOk = [...wantClass].some(w => w && (sc === w || sc.startsWith(w)));
            if (!classOk && sc !== norm(classLabel)) return false;
            if (wantStream) return ss === wantStream || sc.endsWith(wantStream) || sc === norm(classLabel);
            return true;
        });
    }, [students, classId, streamId, cls, legacyClass, stream, classLabel]);

    // Filtered list for the searchable student box.
    const studentMatches = useMemo(() => {
        const q = norm(studentSearch);
        if (!q) return classStudents;
        return classStudents.filter((s: any) =>
            norm(`${s.studentName || s.name} ${s.registrationNo || s.admNo || ""}`).includes(q));
    }, [classStudents, studentSearch]);

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
    // A card is "not ready" when its class has no generated report card for this term.
    const isNotReady = (i: number) => cardQueries[i]?.data?.notReady === true;
    const notReadyCount = cardQueries.filter(q => q.data?.notReady === true).length;
    const readyCount = cardQueries.filter(q => q.isSuccess && !q.data?.notReady).length;
    const noneReady = allLoaded && cardQueries.length > 0 && readyCount === 0;

    // Reliable print: copy the rendered cards' HTML into a fresh window with a
    // forced page-break after each, then print THAT window. This avoids the
    // browser quirks of @media print on the live app (the cause of "1 sheet").
    const printRef = useRef<HTMLDivElement>(null);
    const printAll = () => {
        const area = printRef.current;
        if (!area) { window.print(); return; }
        // Only print cards that are ready — skip "not ready" (ungenerated) ones.
        const printable = Array.from(area.querySelectorAll(".ss-card:not(.ss-not-ready)"));
        if (printable.length === 0) return;
        const w = window.open("", "_blank", "width=900,height=1000");
        if (!w) { window.print(); return; }   // popups blocked → fall back
        const cards = printable.map(el => `<div class="page">${(el as HTMLElement).innerHTML}</div>`).join("");
        w.document.write(`<!DOCTYPE html><html><head><title>Report Cards</title><style>
            @page { size: A4 portrait; margin: 8mm; }
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { page-break-after: always; break-after: page; }
            .page:last-child { page-break-after: auto; break-after: auto; }
            img { max-width: 100%; }
        </style></head><body>${cards}<script>window.onload=function(){setTimeout(function(){window.print();},300);}</script></body></html>`);
        w.document.close();
    };

    // Deep-link mode: render exactly the requested student's card for the exam.
    if (deepLink) {
        return (
            <div className="flex-1 bg-[#F5F5F5] min-h-screen p-4">
                <div className="ss-no-print mb-3 flex items-center justify-between">
                    <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-[#2E7D32]" /> ScholarSheet</h1>
                    <button onClick={() => { setDeepLink(null); }} className="text-sm font-bold text-[#5C67F2]">Open full ScholarSheet →</button>
                </div>
                <div className="ss-card bg-white shadow-sm max-w-[210mm] mx-auto">
                    <ScholarSheetReportCard studentId={deepLink.studentId} examId={deepLink.examId} showKcpe={showKcpe} />
                </div>
            </div>
        );
    }

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
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
                    {/* Class (Form 4) */}
                    <select value={classId} onChange={e => { setClassId(e.target.value); setStreamId(""); setStudentId(""); setStudentSearch(""); }} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                        <option value="">— Class —</option>
                        {v2classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    {/* Stream (East / South) */}
                    <select value={streamId} onChange={e => { setStreamId(e.target.value); setStudentId(""); setStudentSearch(""); }} disabled={!classId} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                        <option value="">All streams</option>
                        {v2streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    {/* Exam */}
                    <select value={examId} onChange={e => setExamId(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                        <option value="">— Exam —</option>
                        {exams.map((ex: any) => <option key={ex._id} value={ex._id}>{formatExamName(ex, classLabel || undefined)}</option>)}
                    </select>
                    {/* Searchable student box */}
                    <div className="relative">
                        <input
                            value={studentSearch}
                            onChange={e => { setStudentSearch(e.target.value); setStudentOpen(true); if (studentId) setStudentId(""); }}
                            onFocus={() => setStudentOpen(true)}
                            onBlur={() => setTimeout(() => setStudentOpen(false), 150)}
                            disabled={!classId || wholeClass}
                            placeholder={studentId ? "" : "Search student…"}
                            className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50"
                        />
                        {studentId && !studentSearch && (() => {
                            const s = classStudents.find((x: any) => x._id === studentId);
                            return s ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-700">{s.studentName || s.name} · {s.registrationNo || s.admNo}</span> : null;
                        })()}
                        {studentOpen && !wholeClass && classId && (
                            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                                {studentMatches.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No students</div>}
                                {studentMatches.map((s: any) => (
                                    <button
                                        key={s._id}
                                        onMouseDown={e => { e.preventDefault(); setStudentId(s._id); setStudentSearch(""); setStudentOpen(false); }}
                                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${s._id === studentId ? "bg-slate-100 font-bold" : ""}`}
                                    >
                                        {s.studentName || s.name} · {s.registrationNo || s.admNo}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <input type="checkbox" checked={wholeClass} onChange={e => { setWholeClass(e.target.checked); setStudentId(""); }} /> <Users className="w-4 h-4" /> Whole class ({classStudents.length})
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <input type="checkbox" checked={showKcpe} onChange={e => setShowKcpe(e.target.checked)} /> Show KCPE fields
                    </label>
                    <button onClick={printAll} disabled={!ready || !allLoaded || noneReady} className="ml-auto h-10 px-5 rounded-xl bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
                        {ready && !allLoaded ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        {ready && !allLoaded ? `Loading ${loadedCount}/${renderList.length}…` : `Print ${wholeClass ? `Class (${readyCount} ready)` : "Report"}`}
                    </button>
                </div>

                {/* Generation status banner for whole-class printing. */}
                {ready && allLoaded && notReadyCount > 0 && (
                    <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-bold border ${noneReady ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                        {noneReady
                            ? "Result not ready yet for this term — generate this class's report cards in Exams → Generate Report Cards, then print."
                            : `${readyCount} of ${renderList.length} report cards are ready. ${notReadyCount} student(s) aren't generated yet and will be skipped when printing.`}
                    </div>
                )}
            </div>

            {ready ? (
                <div ref={printRef} className="ss-print-area p-4 print:p-0">
                    {renderList.map((s: any, i: number) => (
                        <div key={s._id} className={`ss-card bg-white shadow-sm max-w-[210mm] mx-auto mb-4 print:shadow-none print:mb-0 ${isNotReady(i) ? "ss-not-ready" : ""}`}>
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
