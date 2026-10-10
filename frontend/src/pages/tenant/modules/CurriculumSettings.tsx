import { useState, useEffect } from "react";
import {
    BookOpen, Check, Loader2, Plus, Trash2, Save, AlertCircle,
    ChevronDown, GraduationCap, Settings, ToggleLeft, ToggleRight,
    BarChart3, Scale, FileText, MapPin
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// ── Curriculum presets ─────────────────────────────────────────────────────

const CURRICULUM_TYPES = [
    {
        id: "CBC",
        label: "CBC",
        fullName: "Competency Based Curriculum",
        country: "Kenya",
        color: "#10B981",
        description: "Learner-centered approach with competency levels",
        gradingScale: [
            { grade: "EE", label: "Exceeds Expectation",   min: 80, max: 100, points: 4, color: "#10B981" },
            { grade: "ME", label: "Meets Expectation",     min: 60, max: 79,  points: 3, color: "#5C67F2" },
            { grade: "AE", label: "Approaches Expectation",min: 40, max: 59,  points: 2, color: "#F59E0B" },
            { grade: "BE", label: "Below Expectation",     min: 0,  max: 39,  points: 1, color: "#EF4444" },
        ],
        assessmentTypes: [
            { name: "Formative Assessment", weight: 40 },
            { name: "Summative Assessment", weight: 60 },
        ],
    },
    {
        id: "844",
        label: "8-4-4",
        fullName: "8-4-4 System (KCSE / KCPE)",
        country: "Kenya",
        color: "#5C67F2",
        description: "Traditional KCSE letter grades with points system",
        gradingScale: [
            { grade: "A",  label: "Excellent",  min: 80, max: 100, points: 12, color: "#10B981" },
            { grade: "A-", label: "Very Good",  min: 75, max: 79,  points: 11, color: "#10B981" },
            { grade: "B+", label: "Good",       min: 70, max: 74,  points: 10, color: "#5C67F2" },
            { grade: "B",  label: "Good",       min: 65, max: 69,  points: 9,  color: "#5C67F2" },
            { grade: "B-", label: "Average",    min: 60, max: 64,  points: 8,  color: "#5C67F2" },
            { grade: "C+", label: "Average",    min: 55, max: 59,  points: 7,  color: "#F59E0B" },
            { grade: "C",  label: "Average",    min: 50, max: 54,  points: 6,  color: "#F59E0B" },
            { grade: "C-", label: "Pass",       min: 45, max: 49,  points: 5,  color: "#F59E0B" },
            { grade: "D+", label: "Pass",       min: 40, max: 44,  points: 4,  color: "#EF4444" },
            { grade: "D",  label: "Pass",       min: 35, max: 39,  points: 3,  color: "#EF4444" },
            { grade: "D-", label: "Fail",       min: 30, max: 34,  points: 2,  color: "#EF4444" },
            { grade: "E",  label: "Fail",       min: 0,  max: 29,  points: 1,  color: "#EF4444" },
        ],
        assessmentTypes: [
            { name: "CAT / Opener",   weight: 20 },
            { name: "Mid-Term",       weight: 20 },
            { name: "End-of-Term",    weight: 60 },
        ],
    },
    {
        id: "Cambridge",
        label: "Cambridge",
        fullName: "Cambridge International",
        country: "International",
        color: "#8B5CF6",
        description: "Cambridge IGCSE / A-Level grading",
        gradingScale: [
            { grade: "A*", label: "Outstanding", min: 90, max: 100, points: 8, color: "#10B981" },
            { grade: "A",  label: "Excellent",   min: 80, max: 89,  points: 7, color: "#10B981" },
            { grade: "B",  label: "Very Good",   min: 70, max: 79,  points: 6, color: "#5C67F2" },
            { grade: "C",  label: "Good",        min: 60, max: 69,  points: 5, color: "#5C67F2" },
            { grade: "D",  label: "Satisfactory",min: 50, max: 59,  points: 4, color: "#F59E0B" },
            { grade: "E",  label: "Acceptable",  min: 40, max: 49,  points: 3, color: "#F59E0B" },
            { grade: "F",  label: "Fail",        min: 20, max: 39,  points: 2, color: "#EF4444" },
            { grade: "U",  label: "Ungraded",    min: 0,  max: 19,  points: 1, color: "#EF4444" },
        ],
        assessmentTypes: [
            { name: "Coursework",   weight: 30 },
            { name: "Written Exam", weight: 70 },
        ],
    },
    {
        id: "IB",
        label: "IB",
        fullName: "International Baccalaureate",
        country: "International",
        color: "#EC4899",
        description: "IB 1–7 point scale with bilingual diploma",
        gradingScale: [
            { grade: "7", label: "Excellent",    min: 88, max: 100, points: 7, color: "#10B981" },
            { grade: "6", label: "Very Good",    min: 76, max: 87,  points: 6, color: "#10B981" },
            { grade: "5", label: "Good",         min: 64, max: 75,  points: 5, color: "#5C67F2" },
            { grade: "4", label: "Satisfactory", min: 52, max: 63,  points: 4, color: "#5C67F2" },
            { grade: "3", label: "Mediocre",     min: 40, max: 51,  points: 3, color: "#F59E0B" },
            { grade: "2", label: "Poor",         min: 28, max: 39,  points: 2, color: "#EF4444" },
            { grade: "1", label: "Very Poor",    min: 0,  max: 27,  points: 1, color: "#EF4444" },
        ],
        assessmentTypes: [
            { name: "Internal Assessment", weight: 20 },
            { name: "Extended Essay",      weight: 20 },
            { name: "Final Exams",         weight: 60 },
        ],
    },
    {
        id: "Custom",
        label: "Custom",
        fullName: "Custom Grading System",
        country: "Flexible",
        color: "#F59E0B",
        description: "Define your own grading scale and assessment types",
        gradingScale: [],
        assessmentTypes: [],
    },
];

const emptyGrade = { grade: "", label: "", min: 0, max: 100, points: 1, color: "#5C67F2" };
const emptyAssessment = { name: "", weight: 0 };

export default function CurriculumSettings() {
    const qc = useQueryClient();

    // ── Load saved settings ────────────────────────────────────────────────
    const { data: saved, isLoading } = useQuery<any>({
        queryKey: ["curriculum_settings"],
        queryFn: async () => {
            const r = await api.get("/curriculum_settings");
            const arr = Array.isArray(r.data) ? r.data : [];
            return arr[0] || null;
        },
    });

    // ── Local state ────────────────────────────────────────────────────────
    const [curriculumId, setCurriculumId]     = useState("CBC");
    const [gradingScale, setGradingScale]     = useState<any[]>([]);
    const [assessments, setAssessments]       = useState<any[]>([]);
    const [passMark, setPassMark]             = useState(50);
    const [showRanking, setShowRanking]       = useState(true);
    const [showPercentage, setShowPercentage] = useState(true);
    const [showPoints, setShowPoints]         = useState(true);
    const [teacherComments, setTeacherComments] = useState(true);
    const [principalComments, setPrincipalComments] = useState(true);
    const [isDirty, setIsDirty]               = useState(false);
    const [settingsId, setSettingsId]         = useState<string | null>(null);
    const [activeSection, setActiveSection]   = useState<"curriculum" | "grading" | "assessment" | "report">("curriculum");

    // Load saved values
    useEffect(() => {
        if (!saved) {
            // No config yet → preload the default (CBC) preset so the Grading
            // Scale / Assessment tabs are never empty.
            const preset = CURRICULUM_TYPES.find(c => c.id === "CBC");
            if (preset) { setGradingScale([...preset.gradingScale]); setAssessments([...preset.assessmentTypes]); }
            return;
        }
        if (saved._id) setSettingsId(saved._id);
        if (saved.curriculumId) setCurriculumId(saved.curriculumId);
        // Fall back to the curriculum's preset scale if the saved doc has none.
        const preset = CURRICULUM_TYPES.find(c => c.id === (saved.curriculumId || "CBC"));
        setGradingScale(saved.gradingScale?.length ? saved.gradingScale : [...(preset?.gradingScale || [])]);
        setAssessments(saved.assessments?.length ? saved.assessments : [...(preset?.assessmentTypes || [])]);
        if (saved.passMark !== undefined) setPassMark(saved.passMark);
        if (saved.showRanking !== undefined) setShowRanking(saved.showRanking);
        if (saved.showPercentage !== undefined) setShowPercentage(saved.showPercentage);
        if (saved.showPoints !== undefined) setShowPoints(saved.showPoints);
        if (saved.teacherComments !== undefined) setTeacherComments(saved.teacherComments);
        if (saved.principalComments !== undefined) setPrincipalComments(saved.principalComments);
    }, [saved]);

    const selectedPreset = CURRICULUM_TYPES.find(c => c.id === curriculumId);

    // When a curriculum type is selected, load its preset grading scale
    const handleSelectCurriculum = (id: string) => {
        setCurriculumId(id);
        const preset = CURRICULUM_TYPES.find(c => c.id === id);
        if (preset) {
            setGradingScale([...preset.gradingScale]);
            setAssessments([...preset.assessmentTypes]);
        }
        setIsDirty(true);
    };

    // ── Save mutation ──────────────────────────────────────────────────────
    const saveMut = useMutation({
        mutationFn: async (data: any) => {
            const res = settingsId
                ? await api.patch(`/curriculum_settings/${settingsId}`, data)
                : await api.post("/curriculum_settings", data);
            // Mirror the grading scale into grading_criteria so the Marks Grading
            // page (Settings → Marks Grading) shares the same data.
            try {
                const grades = (data.gradingScale || []).map((g: any) => ({
                    grade: g.grade,
                    from: Number(g.min) || 0,
                    upto: Number(g.max) || 0,
                    status: g.label || (Number(g.min) >= Number(data.passMark ?? 50) ? "PASS" : "FAIL"),
                }));
                const existing = await api.get("/grading_criteria");
                const cur = Array.isArray(existing.data) ? existing.data[0] : null;
                if (cur?._id) await api.patch(`/grading_criteria/${cur._id}`, { grades });
                else await api.post("/grading_criteria", { grades, type: "Global", failCriteria: { overallPercent: Number(data.passMark ?? 40), subjectPercent: 33, minSubjects: 1 } });
            } catch { /* non-fatal */ }
            return res;
        },
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["curriculum_settings"] });
            qc.invalidateQueries({ queryKey: ["grading_criteria"] });
            if (!settingsId) setSettingsId(res.data?.id || res.data?._id);
            toast.success("Curriculum settings saved");
            setIsDirty(false);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const handleSave = () => {
        // Validate assessment weights sum to 100
        const totalWeight = assessments.reduce((sum, a) => sum + Number(a.weight || 0), 0);
        if (assessments.length > 0 && totalWeight !== 100) {
            toast.error(`Assessment weights must total 100% (currently ${totalWeight}%)`);
            return;
        }
        saveMut.mutate({ curriculumId, gradingScale, assessments, passMark, showRanking, showPercentage, showPoints, teacherComments, principalComments });
    };

    const totalWeight = assessments.reduce((sum, a) => sum + Number(a.weight || 0), 0);

    const Mark = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
        <button onClick={() => { onToggle(); setIsDirty(true); }} className="transition-colors">
            {on ? <ToggleRight className="w-6 h-6 text-[#5C67F2]" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
        </button>
    );

    const SECTIONS = [
        { id: "curriculum", label: "Curriculum Type",     icon: GraduationCap },
        { id: "grading",    label: "Grading Scale",       icon: BarChart3 },
        { id: "assessment", label: "Assessment Weights",  icon: Scale },
        { id: "report",     label: "Report Card Options", icon: FileText },
    ] as const;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-[#5C67F2]" />
                    <div>
                        <h1 className="text-base font-black text-gray-900">Curriculum Settings</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            {saved?.curriculumId
                                ? `Currently: ${CURRICULUM_TYPES.find(c => c.id === saved.curriculumId)?.fullName}`
                                : "No curriculum configured yet"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saveMut.isPending || !isDirty}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                        isDirty
                            ? "bg-[#5C67F2] hover:bg-[#4a54c4] text-white shadow-sm"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}>
                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isDirty ? "Save Settings" : "All Saved"}
                </button>
            </div>

            {/* ── Section tabs ─────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 px-6 flex gap-1">
                {SECTIONS.map(s => (
                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wide border-b-2 transition-all -mb-px ${
                            activeSection === s.id
                                ? "border-[#5C67F2] text-[#5C67F2]"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}>
                        <s.icon className="w-3.5 h-3.5" /> {s.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />
                    <span className="text-xs font-bold uppercase">Loading…</span>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto w-full px-6 pt-6 space-y-6">

                    {/* ── Section 1: Curriculum Type ───────────────────── */}
                    {activeSection === "curriculum" && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 font-medium">
                                    Selecting a curriculum type automatically loads the standard grading scale and assessment structure for that system.
                                    You can customise them in the next tabs.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {CURRICULUM_TYPES.map(c => (
                                    <button key={c.id} onClick={() => handleSelectCurriculum(c.id)}
                                        className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-md group ${
                                            curriculumId === c.id
                                                ? "border-[#5C67F2] bg-[#5C67F2]/5 shadow-sm"
                                                : "border-gray-100 bg-white hover:border-gray-200"
                                        }`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
                                                style={{ backgroundColor: c.color }}>
                                                {c.label}
                                            </div>
                                            {curriculumId === c.id && (
                                                <div className="w-5 h-5 bg-[#5C67F2] rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-black text-gray-900 text-sm mb-1">{c.fullName}</h3>
                                        <p className="text-[10px] text-gray-400 font-medium mb-2">{c.description}</p>
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ backgroundColor: `${c.color}15`, color: c.color }}>
                                            <MapPin className="w-3 h-3" /> {c.country}
                                        </span>
                                        <div className="mt-3 text-[9px] text-gray-400 font-bold">
                                            {c.gradingScale.length} grade levels · {c.assessmentTypes.length} assessment types
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Section 2: Grading Scale ─────────────────────── */}
                    {activeSection === "grading" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-black text-gray-900">Grading Scale — {selectedPreset?.fullName}</h2>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Define what mark range maps to each grade and its label</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-wide">Pass Mark</label>
                                        <input type="number" value={passMark} min={0} max={100}
                                            onChange={e => { setPassMark(Number(e.target.value)); setIsDirty(true); }}
                                            className="w-16 h-8 px-2 text-center border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]" />
                                        <span className="text-xs text-gray-400 font-bold">%</span>
                                    </div>
                                    <button onClick={() => { setGradingScale([...gradingScale, { ...emptyGrade }]); setIsDirty(true); }}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-[#5C67F2] text-white text-xs font-bold rounded-lg hover:bg-[#4a54c4] transition-all shadow-sm">
                                        <Plus className="w-3.5 h-3.5" /> Add Grade
                                    </button>
                                </div>
                            </div>

                            {gradingScale.length === 0 ? (
                                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-12 flex flex-col items-center gap-3 text-gray-300">
                                    <GraduationCap className="w-8 h-8" />
                                    <p className="text-xs font-bold uppercase">Select a curriculum type to load its grading scale, or add grades manually</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                    {/* Table header */}
                                    <div className="grid grid-cols-[80px_1fr_80px_80px_80px_80px_40px] gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400">
                                        <span>Grade</span>
                                        <span>Label / Description</span>
                                        <span>Min %</span>
                                        <span>Max %</span>
                                        <span>Points</span>
                                        <span>Color</span>
                                        <span />
                                    </div>
                                    {gradingScale.map((g, idx) => (
                                        <div key={idx} className={`grid grid-cols-[80px_1fr_80px_80px_80px_80px_40px] gap-3 px-4 py-3 items-center border-b border-gray-50 ${g.min <= passMark && idx === gradingScale.length - 1 ? "bg-red-50/30" : ""}`}>
                                            <input value={g.grade}
                                                onChange={e => { const n = [...gradingScale]; n[idx] = { ...n[idx], grade: e.target.value }; setGradingScale(n); setIsDirty(true); }}
                                                className="h-8 px-2 text-center border border-gray-200 rounded-lg text-xs font-black text-gray-800 focus:outline-none focus:border-[#5C67F2]" />
                                            <input value={g.label}
                                                onChange={e => { const n = [...gradingScale]; n[idx] = { ...n[idx], label: e.target.value }; setGradingScale(n); setIsDirty(true); }}
                                                className="h-8 px-3 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]" />
                                            <input type="number" value={g.min}
                                                onChange={e => { const n = [...gradingScale]; n[idx] = { ...n[idx], min: Number(e.target.value) }; setGradingScale(n); setIsDirty(true); }}
                                                className="h-8 px-2 text-center border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]" />
                                            <input type="number" value={g.max}
                                                onChange={e => { const n = [...gradingScale]; n[idx] = { ...n[idx], max: Number(e.target.value) }; setGradingScale(n); setIsDirty(true); }}
                                                className="h-8 px-2 text-center border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]" />
                                            <input type="number" value={g.points}
                                                onChange={e => { const n = [...gradingScale]; n[idx] = { ...n[idx], points: Number(e.target.value) }; setGradingScale(n); setIsDirty(true); }}
                                                className="h-8 px-2 text-center border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]" />
                                            <input type="color" value={g.color || "#5C67F2"}
                                                onChange={e => { const n = [...gradingScale]; n[idx] = { ...n[idx], color: e.target.value }; setGradingScale(n); setIsDirty(true); }}
                                                className="h-8 w-full rounded-lg border border-gray-200 cursor-pointer" />
                                            <button onClick={() => { setGradingScale(gradingScale.filter((_, i) => i !== idx)); setIsDirty(true); }}
                                                className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-all">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Preview chips */}
                                    <div className="px-4 py-3 flex flex-wrap gap-2 bg-gray-50/50 border-t border-gray-100">
                                        {gradingScale.map((g, i) => (
                                            <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border" style={{ backgroundColor: `${g.color}15`, borderColor: `${g.color}40`, color: g.color }}>
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                                                {g.grade} ({g.min}–{g.max}%)
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Section 3: Assessment Weights ────────────────── */}
                    {activeSection === "assessment" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-black text-gray-900">Assessment Weights</h2>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Define how different assessments contribute to the final grade</p>
                                </div>
                                <button onClick={() => { setAssessments([...assessments, { ...emptyAssessment }]); setIsDirty(true); }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-[#5C67F2] text-white text-xs font-bold rounded-lg hover:bg-[#4a54c4] transition-all shadow-sm">
                                    <Plus className="w-3.5 h-3.5" /> Add Assessment
                                </button>
                            </div>

                            {/* Weight indicator */}
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                                totalWeight === 100 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                            }`}>
                                <div className={`w-2 h-2 rounded-full ${totalWeight === 100 ? "bg-emerald-500" : "bg-amber-500"}`} />
                                <p className={`text-xs font-black ${totalWeight === 100 ? "text-emerald-700" : "text-amber-700"}`}>
                                    Total weight: <strong>{totalWeight}%</strong>
                                    {totalWeight === 100 ? <> <Check className="inline w-3.5 h-3.5 -mt-0.5" /> Perfect</> : totalWeight > 100 ? ` — ${totalWeight - 100}% over budget` : ` — needs ${100 - totalWeight}% more`}
                                </p>
                            </div>

                            {assessments.length === 0 ? (
                                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-12 flex flex-col items-center gap-3 text-gray-300">
                                    <Settings className="w-8 h-8" />
                                    <p className="text-xs font-bold uppercase">No assessment types configured</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {assessments.map((a, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex items-center gap-4">
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black uppercase tracking-wide text-gray-400 block mb-1">Assessment Name</label>
                                                <input value={a.name}
                                                    onChange={e => { const n = [...assessments]; n[idx] = { ...n[idx], name: e.target.value }; setAssessments(n); setIsDirty(true); }}
                                                    placeholder="e.g. CAT, Mid-Term Exam, End-of-Year Exam…"
                                                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]" />
                                            </div>
                                            <div className="w-28">
                                                <label className="text-[9px] font-black uppercase tracking-wide text-gray-400 block mb-1">Weight (%)</label>
                                                <input type="number" min={0} max={100} value={a.weight}
                                                    onChange={e => { const n = [...assessments]; n[idx] = { ...n[idx], weight: Number(e.target.value) }; setAssessments(n); setIsDirty(true); }}
                                                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 text-center focus:outline-none focus:border-[#5C67F2]" />
                                            </div>
                                            {/* Weight bar */}
                                            <div className="w-20">
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#5C67F2] rounded-full transition-all" style={{ width: `${Math.min(100, a.weight)}%` }} />
                                                </div>
                                                <p className="text-[9px] font-bold text-gray-400 text-center mt-0.5">{a.weight}%</p>
                                            </div>
                                            <button onClick={() => { setAssessments(assessments.filter((_, i) => i !== idx)); setIsDirty(true); }}
                                                className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Section 4: Report Card Options ───────────────── */}
                    {activeSection === "report" && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-black text-gray-900">Report Card Display Options</h2>
                            <p className="text-[10px] text-gray-500 font-medium -mt-2">Control what information appears on student report cards</p>

                            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                                {[
                                    { label: "Show Class Ranking",         sub: "Display student position in class on report",        val: showRanking,         set: setShowRanking },
                                    { label: "Show Percentage Score",      sub: "Display raw percentage alongside grade letter",      val: showPercentage,      set: setShowPercentage },
                                    { label: "Show Grade Points",          sub: "Display numeric points (e.g. 12 pts for A in KCSE)", val: showPoints,          set: setShowPoints },
                                    { label: "Class Teacher Comment",      sub: "Include class teacher's remarks section",           val: teacherComments,     set: setTeacherComments },
                                    { label: "Principal / HOD Comment",    sub: "Include principal's remarks and signature section",  val: principalComments,   set: setPrincipalComments },
                                ].map(opt => (
                                    <div key={opt.label} className="flex items-center justify-between px-5 py-4">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{opt.label}</p>
                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{opt.sub}</p>
                                        </div>
                                        <Mark on={opt.val} onToggle={() => opt.set(!opt.val)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Sticky save reminder ─────────────────────────── */}
                    {isDirty && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
                            <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                Unsaved changes
                                <button onClick={handleSave} disabled={saveMut.isPending}
                                    className="ml-2 px-4 py-1.5 bg-[#5C67F2] hover:bg-[#4a54c4] rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center gap-1.5 disabled:opacity-50">
                                    {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Now
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
