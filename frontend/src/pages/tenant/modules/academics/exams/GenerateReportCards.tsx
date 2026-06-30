/**
 * Generate Report Cards per Class
 * Admin selects the End Term exam for each class, optionally adds internal
 * assessments (CAT, Mid Term, etc.), then generates the report cards.
 * Once generated, the class becomes unlocked for viewing.
 */
import { useState, useMemo } from "react";
import {
    CheckCircle2, AlertCircle, Loader2, Plus, X, ChevronDown,
    Printer, Eye, FileText, GraduationCap, Home, ChevronRight, Settings, Zap
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const INTERNAL_TYPES = new Set(["cat","assignment","mid term","midterm","opening","opener","opening / opener","mock","homework","quiz","internal"]);
const isInternal = (e: any) => {
    const t = (e.type || e.examType || "").toLowerCase().trim();
    return INTERNAL_TYPES.has(t) || Array.from(INTERNAL_TYPES).some(it => t.includes(it));
};

export default function GenerateReportCards() {
    const navigate = useNavigate();
    const qc = useQueryClient();

    // Per-class configuration state: { classId → { mainExamId, additionalExamIds[] } }
    const [configs, setConfigs] = useState<Record<string, { mainExamId: string; additionalIds: string[] }>>({});
    const [generating, setGenerating] = useState<string | null>(null); // classId being generated
    const [expandedClass, setExpandedClass] = useState<string | null>(null);

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

    // Saved generations (which classes have been generated)
    const { data: generations = [] } = useQuery<any[]>({
        queryKey: ["report_card_generations"],
        queryFn: async () => (await api.get("/report_card_generations")).data || [],
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    const activeTerm = v2Terms.find((t: any) => t.isActive);
    const activeYear = v2Years.find((y: any) => y.isActive);
    const currentTermLabel = activeTerm ? activeTerm.name : "";

    // Main (End Term / Final) exams — not internal assessments
    const mainExams = useMemo(() => exams.filter((e: any) => !isInternal(e)), [exams]);
    // Internal exams for a given term
    const internalExamsForTerm = (term: string) =>
        exams.filter((e: any) => isInternal(e) && (!term || (e.term || "").toLowerCase().includes(term.toLowerCase())));

    const getGeneration = (classId: string) =>
        generations.find((g: any) => g.classId === classId || g.className === classId);

    const getConfig = (classId: string) => configs[classId] || { mainExamId: "", additionalIds: [] };

    const setMainExam = (classId: string, examId: string) => {
        setConfigs(prev => ({
            ...prev,
            [classId]: { ...getConfig(classId), mainExamId: examId, additionalIds: [] }
        }));
    };

    const toggleAdditional = (classId: string, examId: string) => {
        const cfg = getConfig(classId);
        const next = cfg.additionalIds.includes(examId)
            ? cfg.additionalIds.filter(id => id !== examId)
            : [...cfg.additionalIds, examId];
        setConfigs(prev => ({ ...prev, [classId]: { ...cfg, additionalIds: next } }));
    };

    // Get the term of the selected main exam for a class
    const getSelectedTerm = (classId: string) => {
        const examId = getConfig(classId).mainExamId;
        const exam   = exams.find((e: any) => e._id === examId);
        return exam?.term || "";
    };

    // ── Generate mutation ─────────────────────────────────────────────────────
    const generateMut = useMutation({
        mutationFn: async ({ classId, className, mainExamId, additionalIds }: any) => {
            const exam = exams.find((e: any) => e._id === mainExamId);
            return api.post("/report_card_generations", {
                classId, className,
                mainExamId, mainExamName: exam?.examName || "",
                additionalExamIds: additionalIds,
                term: exam?.term || currentTermLabel,
                academicYear: exam?.academicYear || activeYear?.year || "",
                generatedAt: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["report_card_generations"] });
            toast.success("Report cards generated successfully!");
            setGenerating(null);
        },
        onError: (e: any) => { toast.error(e.response?.data?.message || "Failed to generate"); setGenerating(null); },
    });

    const handleGenerate = async (cls: any) => {
        const cfg = getConfig(cls._id);
        if (!cfg.mainExamId) { toast.error("Please select the main exam first"); return; }
        setGenerating(cls._id);
        generateMut.mutate({ classId: cls._id, className: cls.levelName || cls.name, mainExamId: cfg.mainExamId, additionalIds: cfg.additionalIds });
    };

    const Field = ({ label, children }: any) => (
        <div className="relative">
            <div className="absolute -top-2.5 left-4 bg-gray-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">{label}</div>
            {children}
        </div>
    );

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

            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800">Generate Report Cards</h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Select the End Term exam for each class, add optional internal assessments, then generate.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/exams/generated-reports")}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all whitespace-nowrap flex-shrink-0">
                        <Zap className="w-4 h-4" />
                        <span>View Generated</span>
                    </button>
                </div>

                {/* Info banner */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 font-medium">
                        Report cards are generated per class. Each class needs its End Term exam selected.
                        Internal assessments (CAT, Mid Term, etc.) from the same term can be included to show combined scores.
                        Once generated, report cards appear in <strong>Class Report Cards</strong> and <strong>Result Card</strong>.
                    </p>
                </div>

                {/* Class cards */}
                {classes.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 flex flex-col items-center gap-3 text-gray-300">
                        <GraduationCap className="w-10 h-10" />
                        <p className="font-bold text-sm">No classes found — create classes first</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {classes.map((cls: any) => {
                            const classId   = cls._id;
                            const className = cls.levelName || cls.name;
                            const cfg       = getConfig(classId);
                            const gen       = getGeneration(classId);
                            const isGenerated = !!gen;
                            const isExpanded  = expandedClass === classId;
                            const selectedTerm = getSelectedTerm(classId);
                            const internals    = internalExamsForTerm(selectedTerm || currentTermLabel);
                            const isGening     = generating === classId;
                            const selectedMain = exams.find((e: any) => e._id === cfg.mainExamId);

                            return (
                                <div key={classId}
                                    className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${isGenerated ? "border-emerald-200" : "border-gray-100 shadow-sm"}`}>

                                    {/* Class row header */}
                                    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        onClick={() => setExpandedClass(isExpanded ? null : classId)}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isGenerated ? "bg-emerald-100" : "bg-indigo-50"}`}>
                                            {isGenerated
                                                ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                : <GraduationCap className="w-5 h-5 text-[#5C67F2]" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-black text-gray-900">{className}</span>
                                                {isGenerated && (
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                                        ✓ Generated
                                                    </span>
                                                )}
                                                {!isGenerated && cfg.mainExamId && (
                                                    <span className="text-[9px] font-bold text-[#5C67F2] bg-indigo-50 px-2 py-0.5 rounded-full">
                                                        {selectedMain?.examName}
                                                        {cfg.additionalIds.length > 0 ? ` + ${cfg.additionalIds.length} internal` : ""}
                                                    </span>
                                                )}
                                            </div>
                                            {isGenerated ? (
                                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                    {gen.mainExamName}{gen.additionalExamIds?.length > 0 ? ` + ${gen.additionalExamIds.length} internal` : ""} · {gen.term} {gen.academicYear}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                    {cfg.mainExamId ? "Ready to generate" : "Select exam to configure"}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                            {isGenerated && (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/exams/class-reports`)}
                                                        className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase text-[#5C67F2] bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition-all">
                                                        <Eye className="w-3 h-3" />
                                                        <span className="hidden sm:inline">View Cards</span>
                                                    </button>
                                                    <button
                                                        onClick={() => { setExpandedClass(isExpanded ? null : classId); }}
                                                        className="flex items-center gap-1 px-3 py-2 text-[10px] font-black uppercase text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all">
                                                        <Settings className="w-3 h-3" />
                                                        <span className="hidden sm:inline">Regenerate</span>
                                                    </button>
                                                </>
                                            )}
                                            {!isGenerated && cfg.mainExamId && (
                                                <button
                                                    onClick={() => handleGenerate(cls)}
                                                    disabled={isGening}
                                                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase text-white bg-[#5C67F2] hover:bg-[#4a54c4] rounded-xl shadow-sm transition-all disabled:opacity-50">
                                                    {isGening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                    <span className="hidden sm:inline">Generate</span>
                                                </button>
                                            )}
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                        </div>
                                    </div>

                                    {/* Expanded config panel */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 px-4 sm:px-5 py-5 space-y-5 bg-gray-50/30">

                                            {/* Main exam selector */}
                                            <Field label="End Term Exam *">
                                                <div className="relative">
                                                    <select value={cfg.mainExamId}
                                                        onChange={e => setMainExam(classId, e.target.value)}
                                                        className="w-full h-11 px-4 pr-8 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2] appearance-none">
                                                        <option value="">— Select End Term / Main Exam —</option>
                                                        {mainExams.map((e: any) => (
                                                            <option key={e._id} value={e._id}>
                                                                {e.examName} · {e.term || e.academicYear}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                </div>
                                            </Field>

                                            {/* Internal assessments */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <p className="text-xs font-black text-gray-600 uppercase tracking-wide">
                                                        Internal Assessments (optional)
                                                    </p>
                                                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        CAT · Mid Term · Opener · Mock
                                                    </span>
                                                </div>

                                                {internals.length === 0 ? (
                                                    <p className="text-xs text-gray-400 font-medium bg-gray-50 rounded-xl px-4 py-3 border border-dashed border-gray-200">
                                                        No internal assessments found for this term.
                                                        Create CAT/Mid Term exams with the same term as the End Term exam.
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {internals.map((e: any) => {
                                                            const sel = cfg.additionalIds.includes(e._id);
                                                            return (
                                                                <button key={e._id} type="button"
                                                                    onClick={() => toggleAdditional(classId, e._id)}
                                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${sel ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-white border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                                                                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                                                                    {e.examName}
                                                                    <span className="text-[9px] font-black uppercase opacity-60">{e.type}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Summary + Generate */}
                                            {cfg.mainExamId && (
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                                                    <div className="text-xs text-gray-500 font-medium">
                                                        <strong className="text-gray-800">{selectedMain?.examName}</strong>
                                                        {cfg.additionalIds.length > 0 && (
                                                            <span className="ml-1 text-amber-700">+ {cfg.additionalIds.length} internal assessment{cfg.additionalIds.length > 1 ? "s" : ""}</span>
                                                        )}
                                                        {" "} will be used to generate <strong>{className}</strong> report cards.
                                                    </div>
                                                    <button
                                                        onClick={() => handleGenerate(cls)}
                                                        disabled={isGening}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-sm transition-all disabled:opacity-50 whitespace-nowrap">
                                                        {isGening ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                                        {isGenerated ? "Regenerate Report Cards" : "Generate Report Cards"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Not configured → show "not available" hint */}
                                    {!isExpanded && !isGenerated && !cfg.mainExamId && (
                                        <div className="px-5 pb-3">
                                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                                <p className="text-[10px] font-bold text-amber-700">
                                                    Report cards not generated yet — click to configure
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
