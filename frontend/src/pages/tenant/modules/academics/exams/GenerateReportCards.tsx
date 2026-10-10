/**
 * Generate Report Cards — step-by-step wizard
 *
 * Step 1  Select Academic Year → Term → Exams (one End Term + several CATs / Mid Term)
 * Step 2  Choose Class → Choose Stream (or All) → Generate
 * Step 3  Success screen → "Learn more / view generated reports"
 * Step 4  All reports for term & year → Choose Class → Choose Stream → Search
 *
 * Exams are picked ONCE in step 1 and applied to the class/stream chosen in step 2.
 */
import { useState, useMemo } from "react";
import {
    CheckCircle2, AlertCircle, Loader2, ChevronRight, ChevronLeft,
    Eye, FileText, GraduationCap, Home, Search, ArrowRight, Circle, Zap, RefreshCw, Trash2, Check
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/contexts/PermissionsContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { outputHtmlDoc } from "@/lib/pdfDoc";

const INTERNAL_TYPES = new Set(["cat", "assignment", "mid term", "midterm", "opening", "opener", "opening / opener", "mock", "homework", "quiz", "internal"]);
const isInternal = (e: any) => {
    const t = (e.type || e.examType || "").toLowerCase().trim();
    return INTERNAL_TYPES.has(t) || Array.from(INTERNAL_TYPES).some(it => t.includes(it));
};

// "Whole Year" in the Term list = the yearly report (Term 1 | Term 2 | Term 3 | year average). Term 3 only.
const YEAR_TERM = "__YEAR__";
const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export default function GenerateReportCards() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { isAdmin } = usePermissions();

    // Wizard step: 1=select exams, 2=choose class, 3=success, 4=browse reports
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Step 1 selections
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedTerm, setSelectedTerm] = useState<string>("");
    const [endTermExamId, setEndTermExamId] = useState<string>("");
    const [internalExamIds, setInternalExamIds] = useState<string[]>([]);

    // Step 2 selections
    const [classId, setClassId] = useState<string>("");
    const [streamId, setStreamId] = useState<string>(""); // "" = All streams

    // Step 4 (browse) selections
    const [browseClassId, setBrowseClassId] = useState<string>("");
    const [browseStreamId, setBrowseStreamId] = useState<string>("");
    const [browseSubmitted, setBrowseSubmitted] = useState(false);

    const [generating, setGenerating] = useState(false);
    const [genSummary, setGenSummary] = useState<{ count: number; className: string } | null>(null);
    const isYearly = selectedTerm === YEAR_TERM;

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["classes"],
        queryFn: async () => (await api.get("/academics/classes")).data || [],
    });
    const { data: exams = [] } = useQuery<any[]>({
        queryKey: ["exams"],
        queryFn: async () => (await api.get("/academics/exams")).data || [],
    });
    const { data: v2Terms = [] } = useQuery<any[]>({
        queryKey: ["v2_all_terms"],
        queryFn: async () => (await api.get("/v2/terms")).data || [],
    });
    const { data: v2Years = [] } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });
    const { data: v2Classes = [] } = useQuery<any[]>({
        queryKey: ["v2_classes"],
        queryFn: async () => (await api.get("/v2/classes")).data || [],
    });
    const { data: allStreams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams_all"],
        queryFn: async () => (await api.get("/v2/streams")).data || [],
    });
    const { data: generations = [] } = useQuery<any[]>({
        queryKey: ["report_card_generations"],
        queryFn: async () => (await api.get("/report_card_generations")).data || [],
    });

    // Is the yearly report allowed yet for the chosen year? (server rule: Term 3 of that year, or later)
    const { data: yearly } = useQuery<any>({
        queryKey: ["yearly_status", selectedYear],
        queryFn: async () => (await api.get("/reports/yearly/status", { params: selectedYear ? { year: selectedYear } : {} })).data,
    });

    // ── Derived ────────────────────────────────────────────────────────────
    const activeTerm = v2Terms.find((t: any) => t.isActive);
    const activeYear = v2Years.find((y: any) => y.isActive);
    const currentTermLabel = activeTerm ? activeTerm.name : "";

    // Terms of the chosen year, each once (the terms list holds every year's Term 1/2/3, so it repeated)
    const termOptions = useMemo(() => {
        const ofYear = selectedYear ? v2Terms.filter((t: any) => String(t.academicYear) === selectedYear) : [];
        const seen = new Set<string>();
        return (ofYear.length ? ofYear : v2Terms)
            .filter((t: any) => { const k = norm(t.name); if (seen.has(k)) return false; seen.add(k); return true; })
            .sort((a: any, b: any) => (Number(a.termNumber) || 0) - (Number(b.termNumber) || 0));
    }, [v2Terms, selectedYear]);

    // Exams matching the chosen year + term
    const termExams = useMemo(() => exams.filter((e: any) =>
        (!selectedTerm || norm(e.term) === norm(selectedTerm)) &&
        (!selectedYear || String(e.academicYear) === selectedYear)),
        [exams, selectedTerm, selectedYear]);

    const endTermExams = useMemo(() => termExams.filter((e: any) => !isInternal(e)), [termExams]);
    const internalExams = useMemo(() => termExams.filter((e: any) => isInternal(e)), [termExams]);

    const endTermExam = exams.find((e: any) => e._id === endTermExamId);

    const streamsForClass = (cid: string) => allStreams.filter((s: any) => !cid || String(s.classId) === cid);

    // Existing generation matching the current Step-2 selection (class + stream + term + year).
    // Used to show an "Already generated → Regenerate?" state on the class step.
    const existingGeneration = useMemo(() => {
        if (!classId) return null;
        const v2c = v2Classes.find((c: any) => String(c._id) === classId);
        const targetName = v2c ? norm(v2c.name || v2c.levelName || "") : "";
        const selStream = streamId ? allStreams.find((s: any) => String(s._id) === streamId) : null;
        const streamName = selStream ? norm(selStream.name) : "";
        const termLabel = norm(isYearly ? "Whole Year" : (selectedTerm || endTermExam?.term || currentTermLabel));
        const yearLabel = String(selectedYear || endTermExam?.academicYear || activeYear?.year || "");
        return generations.find((g: any) => {
            const cn = norm(g.className);
            const classMatch = targetName && (cn.includes(targetName) || targetName.includes(cn));
            if (!classMatch) return false;
            if (streamId) {
                // Chosen stream: match by streamId AND the record's className must match the
                // chosen stream (guards against stale records whose class ≠ their stream).
                if (String(g.streamId) !== String(streamId)) return false;
                if (streamName && !cn.includes(streamName)) return false;
            } else if (g.streamId) return false;  // "All streams" → only stream-less records
            if (termLabel && norm(g.term) !== termLabel) return false;
            if (yearLabel && String(g.academicYear) !== yearLabel) return false;
            return true;
        }) || null;
    }, [classId, streamId, selectedTerm, selectedYear, endTermExam, currentTermLabel, activeYear, generations, v2Classes, allStreams, isYearly]);

    // Classes shown in step 2 — match the v2 class picker to the legacy /academics/classes rows
    const matchLegacyClasses = (v2ClassId: string) => {
        const v2c = v2Classes.find((c: any) => String(c._id) === v2ClassId);
        if (!v2c) return [];
        const target = norm(v2c.name || v2c.levelName || "");
        return classes.filter((cls: any) => {
            const cn = norm(cls.levelName || cls.name);
            return cn.includes(target) || target.includes(cn);
        });
    };

    // ── Generate ───────────────────────────────────────────────────────────────
    const generateOne = (cls: any, streamMeta: { id: string | null; name: string | null }) => {
        const className = cls.levelName || cls.name;
        const matchedV2Class = v2Classes.find((c: any) =>
            norm(c.name) === norm(className) || norm(c.levelName) === norm(className) || norm(c.className) === norm(className));
        if (isYearly) return api.post("/report_card_generations", {
            kind: "yearly", classId: cls._id, classV2Id: matchedV2Class?._id || null, className,
            academicYear: selectedYear || yearly?.year || activeYear?.year || "", streamId: streamMeta.id, streamName: streamMeta.name,
        });
        return api.post("/report_card_generations", {
            classId: cls._id,
            classV2Id: matchedV2Class?._id || null,
            className,
            mainExamId: endTermExamId,
            mainExamName: endTermExam?.examName || endTermExam?.name || "",
            additionalExamIds: internalExamIds,
            term: selectedTerm || endTermExam?.term || currentTermLabel,
            academicYear: selectedYear || endTermExam?.academicYear || activeYear?.year || "",
            streamId: streamMeta.id,
            streamName: streamMeta.name,
            generatedAt: new Date().toISOString(),
        });
    };

    // Find the ONE legacy class row that corresponds to a specific stream, e.g.
    // v2 class "FORM 1" + stream "North" → legacy "Form 1 North". Falls back to a
    // synthetic row so we always attribute the generation to the right class+stream.
    const legacyClassForStream = (v2ClassId: string, stream: any) => {
        const v2c = v2Classes.find((c: any) => String(c._id) === v2ClassId);
        const base = norm(v2c?.name || v2c?.levelName || "");
        const want = norm(`${v2c?.name || ""} ${stream.name}`);
        const exact = classes.find((cls: any) => norm(cls.levelName || cls.name) === want);
        if (exact) return exact;
        // A legacy row that includes both the class base AND the stream name.
        const both = classes.find((cls: any) => { const cn = norm(cls.levelName || cls.name); return cn.includes(base) && cn.includes(norm(stream.name)); });
        return both || { _id: `${v2ClassId}:${stream._id}`, name: `${v2c?.name || ""} ${stream.name}`.trim(), levelName: `${v2c?.name || ""} ${stream.name}`.trim() };
    };

    const generateMut = useMutation({
        mutationFn: async () => {
            const v2ClassName = v2Classes.find((c: any) => String(c._id) === classId)?.name || "";
            if (streamId) {
                // ── Specific stream → exactly ONE record for THAT stream ──
                const stream = allStreams.find((s: any) => String(s._id) === streamId);
                if (!stream) throw new Error("Stream not found");
                const cls = legacyClassForStream(classId, stream);
                await generateOne(cls, { id: String(stream._id), name: stream.name });
                return { count: 1, className: v2ClassName };
            }
            // ── "All streams" → one record PER stream (each correctly attributed) ──
            const streams = streamsForClass(classId);
            if (streams.length > 0) {
                await Promise.all(streams.map((s: any) => generateOne(legacyClassForStream(classId, s), { id: String(s._id), name: s.name })));
                return { count: streams.length, className: v2ClassName };
            }
            // No streams at all → a single class-level record.
            const targetClasses = matchLegacyClasses(classId);
            if (targetClasses.length === 0) throw new Error("No matching class found to generate");
            await generateOne(targetClasses[0], { id: null, name: null });
            return { count: 1, className: v2ClassName };
        },
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["report_card_generations"] });
            setGenSummary(res);
            setGenerating(false);
            setStep(3);
        },
        onError: (e: any) => {
            toast.error(e.response?.data?.message || e.message || "Failed to generate");
            setGenerating(false);
        },
    });

    const handleGenerate = () => {
        if (isYearly) { if (!yearly?.allowed) { toast.error(yearly?.reason || "The yearly report is only available in Term 3."); return; } }
        else if (!endTermExamId) { toast.error("Select an End Term exam first"); return; }
        if (!classId) { toast.error("Choose a class"); return; }
        setGenerating(true);
        generateMut.mutate();
    };

    const toggleInternal = (id: string) => {
        setInternalExamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Open the actual Report Form (scholar sheet) for a generated record
    const handleViewCard = async (g: any) => {
        if (g.kind === "yearly") {   // yearly report: Term 1 | Term 2 | Term 3 | year average, one page per learner
            try {
                const r = await api.get(`/report_card_generations/${g._id}/yearly-html`);
                void outputHtmlDoc(`${g.mainExamName || "Annual report"} — ${g.className}`, r.data.html, { fileName: `Annual-report-${g.className}-${g.academicYear}` });
            } catch (e: any) { toast.error(e.response?.data?.message || "Could not open the yearly report"); }
            return;
        }
        const classIdParam = g.classV2Id || g.classId;
        const params = new URLSearchParams({
            examId: g.mainExamId,
            classId: classIdParam,
            wholeClass: "true",
        });
        if (g.streamId) params.set("streamId", g.streamId);
        navigate(`/exams/scholar-sheet?${params.toString()}`, {
            state: { className: g.className, examName: g.mainExamName }
        });
    };

    // Delete a generated report (admin only).
    const deleteGen = useMutation({
        mutationFn: async (id: string) => api.delete(`/report_card_generations/${id}`),
        onSuccess: () => { toast.success("Report deleted"); qc.invalidateQueries({ queryKey: ["report_card_generations"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to delete"),
    });

    const resetWizard = () => {
        setStep(1);
        setEndTermExamId("");
        setInternalExamIds([]);
        setClassId("");
        setStreamId("");
        setGenSummary(null);
    };

    // ── Browse (step 4) results ─────────────────────────────────────────────────
    const browseResults = useMemo(() => {
        if (!browseSubmitted) return [];
        const bc = browseClassId ? v2Classes.find((c: any) => String(c._id) === browseClassId) : null;
        const bcName = bc ? norm(bc.name || bc.levelName || "") : "";
        const bs = browseStreamId ? allStreams.find((s: any) => String(s._id) === browseStreamId) : null;
        return generations.filter((g: any) => {
            if (selectedYear && String(g.academicYear) !== selectedYear) return false;
            if (selectedTerm && norm(g.term) !== norm(isYearly ? "Whole Year" : selectedTerm)) return false;
            if (bc && !norm(g.className).includes(bcName) && !bcName.includes(norm(g.className))) return false;
            if (bs && String(g.streamId) !== String(bs._id)) return false;
            return true;
        });
    }, [browseSubmitted, browseClassId, browseStreamId, generations, v2Classes, allStreams, selectedYear, selectedTerm, isYearly]);

    // ── Step indicator ───────────────────────────────────────────────────────────
    const steps = [
        { n: 1, label: "Select Exams" },
        { n: 2, label: "Choose Class" },
        { n: 3, label: "Generate" },
    ];

    // Continue only when every required field is chosen: Year, Term, and an End Term exam.
    // (CATs / Mid Term stay optional.)
    const canContinueStep1 = isYearly ? (!!selectedYear && !!yearly?.allowed) : (!!selectedYear && !!selectedTerm && !!endTermExamId);

    // ── UI ───────────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col pb-10">

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 min-w-0">
                    <Home className="w-4 h-4 text-[#5C67F2] flex-shrink-0" />
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    <span className="text-gray-500 font-medium text-sm cursor-pointer hover:text-[#5C67F2] truncate" onClick={() => navigate("/exams/create")}>Exams</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    <span className="font-black text-[#5C67F2] text-sm truncate">Generate Report Cards</span>
                </div>
                {activeTerm && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full flex-shrink-0">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                            {activeTerm.name} · {activeYear?.year}
                        </span>
                    </div>
                )}
            </div>

            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-6">

                {/* Top action: browse reports */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => { setStep(prev => (prev === 4 ? 1 : 4)); setBrowseSubmitted(false); }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all">
                        <Zap className="w-4 h-4" />
                        {step === 4 ? "Back to Generator" : "View Generated Reports"}
                    </button>
                    {step !== 4 && (
                        <button onClick={resetWizard} className="text-[11px] font-bold uppercase text-slate-400 hover:text-slate-600">
                            Start over
                        </button>
                    )}
                </div>

                {/* Step indicator (hidden while browsing) */}
                {step !== 4 && (
                    <div className="flex items-center justify-center gap-2 sm:gap-4">
                        {steps.map((s, i) => {
                            const done = step > s.n;
                            const current = step === s.n;
                            return (
                                <div key={s.n} className="flex items-center gap-2 sm:gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                                            ${done ? "bg-emerald-500 text-white" : current ? "bg-[#5C67F2] text-white ring-4 ring-indigo-100" : "bg-white text-slate-300 border border-slate-200"}`}>
                                            {done ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-wide hidden sm:inline ${current ? "text-[#5C67F2]" : done ? "text-emerald-600" : "text-slate-400"}`}>
                                            {s.label}
                                        </span>
                                    </div>
                                    {i < steps.length - 1 && <div className={`h-0.5 w-6 sm:w-10 rounded ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── STEP 1: Select exams ──────────────────────────────────────── */}
                {step === 1 && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 text-center border-b-4 border-slate-800 inline-block mx-auto w-full pb-3">
                            Select Exams To Use to Generate The report cards
                        </h1>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                            <div>
                                <label className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Select Academic Year</label>
                                <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setEndTermExamId(""); setInternalExamIds([]); }}
                                    className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#5C67F2]">
                                    <option value="">— Choose Year —</option>
                                    {v2Years.map((y: any) => <option key={y._id || y.year} value={String(y.year)}>{y.year}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Select Term</label>
                                <select value={selectedTerm} onChange={e => { setSelectedTerm(e.target.value); setEndTermExamId(""); setInternalExamIds([]); }}
                                    className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#5C67F2]">
                                    <option value="">— Choose Term —</option>
                                    {termOptions.map((t: any) => <option key={t._id || t.name} value={t.name}>{t.name}</option>)}
                                    <option value={YEAR_TERM} disabled={!yearly?.allowed}>Whole Year — yearly report{yearly?.allowed ? "" : " (available in Term 3)"}</option>
                                </select>
                            </div>
                        </div>

                        {/* Exams in that term */}
                        <div className="mt-8">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-sm font-black text-slate-700 uppercase tracking-wide">Exams</span>
                                <span className="text-[10px] font-bold text-slate-400">in {selectedTerm || "the selected term"}</span>
                            </div>

                            {isYearly ? (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-5 text-sm text-slate-700">
                                    <p className="font-black text-slate-800 mb-1">Yearly report — {selectedYear || yearly?.year}</p>
                                    <p>Every subject is shown for <b>Term 1</b>, <b>Term 2</b> and <b>Term 3</b> side by side, with the <b>average for the whole year</b>. Each term's result comes from that term's generated report cards (or its exams if none were generated).</p>
                                    {!yearly?.allowed && <p className="mt-2 text-rose-600 font-bold">{yearly?.reason}</p>}
                                </div>
                            ) : !selectedYear || !selectedTerm ? (
                                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-10 flex flex-col items-center gap-2 text-slate-400">
                                    <AlertCircle className="w-8 h-8" />
                                    <p className="text-xs font-bold">Choose an Academic Year and Term above to list exams.</p>
                                </div>
                            ) : termExams.length === 0 ? (
                                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-10 flex flex-col items-center gap-2 text-slate-400">
                                    <FileText className="w-8 h-8" />
                                    <p className="text-xs font-bold">No exams for this year & term. Create exams first.</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* End Term — single select */}
                                    <div>
                                        <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wide mb-2">
                                            Pick ONE End Term / Final Exam <span className="text-rose-500">*</span>
                                        </p>
                                        {endTermExams.length === 0 ? (
                                            <p className="text-xs text-slate-400 font-medium bg-slate-50 rounded-xl px-4 py-3 border border-dashed border-slate-200">
                                                No End Term / Final exam found for this term.
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {endTermExams.map((e: any) => {
                                                    const sel = endTermExamId === e._id;
                                                    return (
                                                        <button key={e._id} type="button" onClick={() => setEndTermExamId(sel ? "" : e._id)}
                                                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left border-2 transition-all
                                                                ${sel ? "bg-emerald-50 border-emerald-400" : "bg-white border-slate-200 hover:border-emerald-300"}`}>
                                                            {sel ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                                                            <span className="flex-1 min-w-0">
                                                                <span className="block text-sm font-bold text-slate-800 truncate">{e.examName || e.name}</span>
                                                                <span className="block text-[10px] text-slate-400 uppercase">{e.type || "End Term"} · {e.term}</span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Internal assessments — multi select */}
                                    <div>
                                        <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide mb-2">
                                            Add CATs / Mid Term (optional — choose several)
                                        </p>
                                        {internalExams.length === 0 ? (
                                            <p className="text-xs text-slate-400 font-medium bg-slate-50 rounded-xl px-4 py-3 border border-dashed border-slate-200">
                                                No CAT / Mid Term assessments for this term.
                                            </p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {internalExams.map((e: any) => {
                                                    const sel = internalExamIds.includes(e._id);
                                                    return (
                                                        <button key={e._id} type="button" onClick={() => toggleInternal(e._id)}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all
                                                                ${sel ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"}`}>
                                                            {sel && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                                                            {e.examName || e.name}
                                                            <span className="text-[9px] font-black uppercase opacity-60">{e.type}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 mt-8">
                            {!canContinueStep1 && (
                                <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Choose {[!selectedYear && "Academic Year", !selectedTerm && "Term", !isYearly && !endTermExamId && "an End Term exam", isYearly && !yearly?.allowed && "a year that has reached Term 3"].filter(Boolean).join(", ")} to continue
                                </p>
                            )}
                            <button
                                onClick={() => setStep(2)}
                                disabled={!canContinueStep1}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wide rounded-lg shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                Continue <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Choose class ──────────────────────────────────────── */}
                {step === 2 && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                        {/* Chosen exams recap */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-8">
                            <p className="text-[10px] font-black text-[#5C67F2] uppercase tracking-wide mb-1">Selected Exams</p>
                            <p className="text-sm font-bold text-slate-800">
                                {isYearly ? `Whole-year report ${selectedYear} — Term 1, Term 2, Term 3 and year average` : (endTermExam?.examName || endTermExam?.name)}
                                {!isYearly && internalExamIds.length > 0 && (
                                    <span className="text-amber-700"> + {internalExamIds.length} CAT/Mid Term</span>
                                )}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{selectedYear || activeYear?.year} · {selectedTerm || currentTermLabel}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Choose Class</label>
                                <select value={classId} onChange={e => { setClassId(e.target.value); setStreamId(""); }}
                                    className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#5C67F2]">
                                    <option value="">— Choose Class —</option>
                                    {v2Classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Choose Stream or All</label>
                                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!classId}
                                    className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 text-sm focus:outline-none focus:border-[#5C67F2]">
                                    <option value="">All Streams</option>
                                    {streamsForClass(classId).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Already-generated notice for this class + stream + term + year */}
                        {existingGeneration && (
                            <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4 flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-emerald-800">Already Generated</p>
                                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                        Report cards for <strong>{existingGeneration.className}</strong>
                                        {existingGeneration.streamName ? ` · ${existingGeneration.streamName}` : " · All streams"}
                                        {" "}({existingGeneration.academicYear} · {existingGeneration.term}) already exist
                                        {existingGeneration.mainExamName ? <> using <strong>{existingGeneration.mainExamName}</strong></> : null}.
                                        Regenerating replaces them with your current exam selection.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-10">
                            <button onClick={() => setStep(1)}
                                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            {existingGeneration ? (
                                <button
                                    onClick={handleGenerate}
                                    disabled={!classId || generating}
                                    className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    Regenerate Again?
                                </button>
                            ) : (
                                <button
                                    onClick={handleGenerate}
                                    disabled={!classId || generating}
                                    className="flex items-center gap-2 px-8 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-sm uppercase tracking-widest rounded-full shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                    Generate
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Success ───────────────────────────────────────────── */}
                {step === 3 && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-12 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full border-4 border-emerald-500 flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-14 h-14 text-emerald-600" strokeWidth={2} />
                        </div>
                        <p className="text-lg font-black text-slate-800 uppercase tracking-wide">Successfully Generated</p>
                        {genSummary && (
                            <p className="text-sm text-slate-500 mt-2">
                                Report cards for <strong className="text-slate-700">{genSummary.className}</strong>
                                {streamId ? ` · ${allStreams.find((s: any) => String(s._id) === streamId)?.name}` : " · All streams"}
                                {" "}({selectedYear || activeYear?.year} · {selectedTerm || currentTermLabel}) are ready.
                            </p>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
                            <button
                                onClick={() => { setStep(4); setBrowseClassId(classId); setBrowseStreamId(streamId); setBrowseSubmitted(true); }}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-black text-white font-black text-sm uppercase tracking-wide rounded-full shadow-md transition-all">
                                <ChevronRight className="w-4 h-4" /> Learn More — View Generated Reports
                            </button>
                            <button onClick={resetWizard}
                                className="px-5 py-3 text-xs font-black uppercase text-slate-500 hover:text-slate-800">
                                Generate Another
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: Browse generated reports ──────────────────────────── */}
                {step === 4 && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 mb-6">
                            All Reports for Term {selectedTerm ? `“${selectedTerm}”` : ""} and Year {selectedYear || activeYear?.year || ""}
                        </h2>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                            <div className="flex-1 flex items-center gap-2 bg-white border-2 border-slate-200 rounded-full px-4 py-2">
                                <select value={browseClassId} onChange={e => { setBrowseClassId(e.target.value); setBrowseStreamId(""); setBrowseSubmitted(false); }}
                                    className="flex-1 h-9 bg-transparent text-sm font-bold text-slate-700 focus:outline-none">
                                    <option value="">Choose Class</option>
                                    {v2Classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                                <div className="w-px h-6 bg-slate-200" />
                                <select value={browseStreamId} onChange={e => { setBrowseStreamId(e.target.value); setBrowseSubmitted(false); }} disabled={!browseClassId}
                                    className="flex-1 h-9 bg-transparent text-sm font-bold text-slate-700 focus:outline-none disabled:text-slate-300">
                                    <option value="">Choose Stream</option>
                                    {streamsForClass(browseClassId).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                                <Search className="w-4 h-4 text-slate-400" />
                            </div>
                            <button
                                onClick={() => setBrowseSubmitted(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-black text-sm uppercase tracking-wide rounded-xl shadow-md transition-all">
                                Search <Search className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Results */}
                        <div className="mt-8">
                            {!browseSubmitted ? (
                                <p className="text-center text-slate-400 text-sm font-medium py-8">Choose a class and stream, then Search.</p>
                            ) : browseResults.length === 0 ? (
                                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-12 flex flex-col items-center gap-2 text-slate-400">
                                    <GraduationCap className="w-10 h-10" />
                                    <p className="text-sm font-bold">No generated reports match this class, stream, term & year.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {browseResults.map((g: any) => (
                                        <div key={g._id} className="bg-white rounded-2xl border-2 border-emerald-200 px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-black text-gray-900">{g.className}</span>
                                                    {g.streamName && <span className="text-[10px] font-bold text-slate-500">· {g.streamName}</span>}
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full"><Check className="w-3 h-3" />Generated</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                    {g.mainExamName}{g.additionalExamIds?.length > 0 ? ` + ${g.additionalExamIds.length} internal` : ""} · {g.term} {g.academicYear}
                                                </p>
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => { if (confirm(`Delete the generated report for ${g.className}${g.streamName ? ` · ${g.streamName}` : ""}?`)) deleteGen.mutate(String(g._id)); }}
                                                    disabled={deleteGen.isPending}
                                                    title="Delete this report"
                                                    className="flex items-center justify-center w-9 h-9 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition-all flex-shrink-0 disabled:opacity-50">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleViewCard(g)}
                                                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase text-[#5C67F2] bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition-all flex-shrink-0">
                                                <Eye className="w-3 h-3" /> <span className="hidden sm:inline">View Cards</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Info banner (generator only) */}
                {step !== 4 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 font-medium">
                            Pick <strong>one End Term</strong> exam and any number of <strong>CAT / Mid Term</strong> assessments from the same term,
                            choose the class &amp; stream, then Generate. Generated cards appear in <strong>Class Report Cards</strong> and <strong>Result Card</strong>.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
