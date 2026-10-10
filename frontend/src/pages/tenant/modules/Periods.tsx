/**
 * Unified Academic Periods & Terms management.
 * Single source of truth: V2 academic years + terms (via /v2/academic-years and /v2/terms).
 * Accessible from BOTH:
 *   - General Settings → Learning Periods  (/academics/periods)
 *   - Academic System → Academic Years & Terms  (/academic-system/years)
 */
import { useState, useMemo } from "react";
import {
    Plus, Check, X, Loader2, Calendar, ChevronDown, ChevronRight,
    Settings, Edit2, Trash2, AlertCircle, BookOpen, RefreshCw,
    ChevronLeft, ArrowRight, ArrowLeft, Wand2, Lock, Eye, EyeOff, Target
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyYear = { year: new Date().getFullYear().toString(), name: "", startDate: "", endDate: "", numTerms: 3, termType: "term", holidayWeeks: 2 };
const emptyTerm = { name: "", termNumber: "1", startDate: "", endDate: "", type: "term" };

// Auto-compute term date ranges given a year range and term count
function autoTermDates(startDate: string, endDate: string, numTerms: number, holidayWeeks: number, termType: string): { name: string; startDate: string; endDate: string; termNumber: number; type: string }[] {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end   = new Date(endDate);
    const totalMs = end.getTime() - start.getTime();
    if (totalMs <= 0) return [];

    const holidayMs  = holidayWeeks * 7 * 24 * 60 * 60 * 1000;
    const gapCount   = numTerms - 1;
    const totalGapMs = gapCount * holidayMs;
    const termMs     = (totalMs - totalGapMs) / numTerms;

    const labels: Record<string, string[]> = {
        term:      ["Term 1", "Term 2", "Term 3", "Term 4"],
        semester:  ["Semester 1", "Semester 2", "Semester 3", "Semester 4"],
        quarter:   ["Quarter 1 (Q1)", "Quarter 2 (Q2)", "Quarter 3 (Q3)", "Quarter 4 (Q4)"],
        trimester: ["Trimester 1", "Trimester 2", "Trimester 3", "Trimester 4"],
        custom:    ["Period 1", "Period 2", "Period 3", "Period 4"],
    };
    const names = labels[termType] || labels.term;

    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const terms = [];
    let cursor = start.getTime();
    for (let i = 0; i < numTerms; i++) {
        const tStart = new Date(cursor);
        const tEnd   = new Date(cursor + termMs - 1);
        terms.push({ name: names[i] || `Term ${i + 1}`, startDate: fmt(tStart), endDate: fmt(tEnd), termNumber: i + 1, type: termType });
        cursor += termMs + (i < gapCount ? holidayMs : 0);
    }
    return terms;
}

const TERM_TYPES = [
    { value: "term",      label: "Term" },
    { value: "semester",  label: "Semester" },
    { value: "quarter",   label: "Quarter" },
    { value: "trimester", label: "Trimester" },
    { value: "custom",    label: "Custom" },
];

export default function Periods() {
    const qc = useQueryClient();

    const navigate = useNavigate();

    // ── State ─────────────────────────────────────────────────────────────────
    const [tab, setTab] = useState<"current" | "all" | "new">("current");
    const [expandedYearId, setExpandedYearId] = useState<string | null>(null);
    const [selectedYearId, setSelectedYearId] = useState<string | null>(null);

    // Year modal
    const [showYearModal, setShowYearModal] = useState(false);
    const [editYearId, setEditYearId] = useState<string | null>(null);
    const [yearForm, setYearForm] = useState({ ...emptyYear });

    // Advance-term confirm modal (with password auth)
    const [advanceTarget, setAdvanceTarget] = useState<{ termId: string; yearId: string; label: string } | null>(null);
    const [advancePassword, setAdvancePassword] = useState("");
    const [showAdvancePwd, setShowAdvancePwd] = useState(false);
    const [advanceError, setAdvanceError] = useState("");

    // Term modal
    const [showTermModal, setShowTermModal] = useState(false);
    const [editTermId, setEditTermId] = useState<string | null>(null);
    const [termParentYearId, setTermParentYearId] = useState<string | null>(null);
    const [termForm, setTermForm] = useState({ ...emptyTerm });

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: years = [], isLoading: loadingYears } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });

    const { data: curriculumSettings } = useQuery<any>({
        queryKey: ["curriculum_settings"],
        queryFn: async () => {
            const r = await api.get("/curriculum_settings");
            const arr = Array.isArray(r.data) ? r.data : [];
            return arr[0] || null;
        },
    });

    // Default term count based on curriculum
    const defaultTermCount = useMemo(() => {
        const c = curriculumSettings?.curriculumId;
        if (c === "Cambridge" || c === "IB") return 2;
        if (c === "844" || c === "CBC") return 3;
        if (curriculumSettings?.assessments?.length) return Math.min(curriculumSettings.assessments.length, 4);
        return 3;
    }, [curriculumSettings]);

    const { data: allTerms = [] } = useQuery<any[]>({
        queryKey: ["v2_all_terms"],
        queryFn: async () => (await api.get("/v2/terms")).data || [],
    });

    const getTermsForYear = (yearId: string) =>
        allTerms.filter((t: any) => t.academicYearId === yearId);

    const activeYear = years.find((y: any) => y.isActive);
    const activeTerm = allTerms.find((t: any) => t.isActive);
    const activeYearForTerm = activeTerm
        ? years.find((y: any) => y._id === activeTerm.academicYearId)
        : null;

    // ── Build a flat ordered sequence of ALL terms across all years ───────────
    // Sorted: year ASC, then termNumber ASC within each year
    const termSequence: { term: any; year: any }[] = [...years]
        .sort((a: any, b: any) => Number(a.year) - Number(b.year))
        .flatMap((y: any) =>
            [...allTerms]
                .filter((t: any) => t.academicYearId === y._id)
                .sort((a: any, b: any) => Number(a.termNumber || 1) - Number(b.termNumber || 1))
                .map(t => ({ term: t, year: y }))
        );

    const currentSeqIdx = activeTerm
        ? termSequence.findIndex(s => s.term._id === activeTerm._id)
        : -1;

    const prevEntry = currentSeqIdx > 0 ? termSequence[currentSeqIdx - 1] : null;
    const nextEntry = currentSeqIdx >= 0 && currentSeqIdx < termSequence.length - 1
        ? termSequence[currentSeqIdx + 1]
        : null;

    const termsInActiveYear = activeYearForTerm
        ? allTerms.filter((t: any) => t.academicYearId === activeYearForTerm._id)
            .sort((a: any, b: any) => Number(a.termNumber || 1) - Number(b.termNumber || 1))
        : [];
    const termPosInYear = activeTerm
        ? termsInActiveYear.findIndex((t: any) => t._id === activeTerm._id) + 1
        : 0;

    // ── Mutations ─────────────────────────────────────────────────────────────
    const yearMut = useMutation({
        mutationFn: async (p: any) => {
            const { _terms, ...yearData } = p;
            let yearId: string;
            if (editYearId) {
                await api.patch(`/v2/academic-years/${editYearId}`, yearData);
                yearId = editYearId;
            } else {
                const res = await api.post("/v2/academic-years", yearData);
                yearId = res.data?._id || res.data?.id;
                // Auto-create terms
                if (_terms?.length && yearId) {
                    for (const t of _terms) {
                        await api.post("/v2/terms", { ...t, academicYearId: yearId });
                    }
                }
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["v2_academic_years"] });
            qc.invalidateQueries({ queryKey: ["v2_all_terms"] });
            toast.success(editYearId ? "Academic year updated" : "Academic year and terms created");
            setShowYearModal(false);
            setYearForm({ ...emptyYear, numTerms: defaultTermCount });
            setEditYearId(null);
            setTab("all");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const termMut = useMutation({
        mutationFn: (p: any) => editTermId
            ? api.patch(`/v2/terms/${editTermId}`, p)
            : api.post("/v2/terms", p),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["v2_all_terms"] });
            toast.success(editTermId ? "Term updated" : "Term created");
            setShowTermModal(false);
            setTermForm({ ...emptyTerm });
            setEditTermId(null);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const setActiveMut = useMutation({
        mutationFn: async ({ termId, yearId }: { termId: string; yearId: string }) => {
            // Deactivate all years and terms first, then activate this one
            await Promise.all([
                api.patch(`/v2/academic-years/${yearId}`, { isActive: true }),
                api.patch(`/v2/terms/${termId}`, { isActive: true }),
            ]);
            // Also sync to legacy /periods collection so the rest of the system picks it up
            const term = allTerms.find((t: any) => t._id === termId);
            const year = years.find((y: any) => y._id === yearId);
            if (term && year) {
                await api.patch("/academics/periods/current", {
                    label: `${term.name} ${year.year}`,
                    academicYear: String(year.year),
                    term: term.name,
                    termId,
                    yearId,
                    isCurrent: true,
                }).catch(() => {}); // non-fatal if legacy route doesn't exist
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["v2_academic_years"] });
            qc.invalidateQueries({ queryKey: ["v2_all_terms"] });
            qc.invalidateQueries({ queryKey: ["periods"] });
            toast.success("Current learning period updated");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to set current period"),
    });

    const deleteYearMut = useMutation({
        mutationFn: (id: string) => api.delete(`/v2/academic-years/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["v2_academic_years"] }); toast.success("Year removed"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const deleteTermMut = useMutation({
        mutationFn: (id: string) => api.delete(`/v2/terms/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["v2_all_terms"] }); toast.success("Term removed"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    // Verify admin password then execute the term advance
    const handleAdvanceConfirm = async () => {
        if (!advanceTarget || !advancePassword.trim()) return;
        setAdvanceError("");
        try {
            // Verify password by attempting a re-auth against our own email
            const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
            const email = user.email || "";
            await api.post("/auth/smart-login", { username: email, password: advancePassword });
        } catch {
            setAdvanceError("Incorrect password. Please try again.");
            return;
        }
        // Password verified — execute the advance
        setActiveMut.mutate({ termId: advanceTarget.termId, yearId: advanceTarget.yearId });
        setAdvanceTarget(null);
        setAdvancePassword("");
    };

    const openAddTerm = (yearId: string) => {
        setEditTermId(null);
        setTermParentYearId(yearId);
        setTermForm({ ...emptyTerm });
        setShowTermModal(true);
    };

    const openEditTerm = (t: any) => {
        setEditTermId(t._id);
        setTermParentYearId(t.academicYearId);
        setTermForm({ name: t.name, termNumber: String(t.termNumber || 1), startDate: t.startDate || "", endDate: t.endDate || "", type: t.type || "term" });
        setShowTermModal(true);
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">

            {/* ── Sticky header ─────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div>
                    <h1 className="text-base font-black text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#5C67F2]" /> Learning Periods
                    </h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Academic years, terms & current active period — single source of truth
                    </p>
                </div>
                <button
                    onClick={() => { setEditYearId(null); setYearForm({ ...emptyYear }); setShowYearModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold rounded-lg shadow-sm transition-all">
                    <Plus className="w-4 h-4" /> New Academic Year
                </button>
            </div>

            {/* ── Tabs ──────────────────────────────────────────────────── */}
            <div className="px-6 pt-4 flex items-center gap-1 border-b border-gray-100 bg-white">
                {([
                    { id: "current", label: "Current Period", icon: Target },
                    { id: "all",     label: "All Years & Terms", icon: Calendar },
                ] as const).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wide border-b-2 transition-all -mb-px ${
                            tab === t.id
                                ? "border-[#5C67F2] text-[#5C67F2]"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}>
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-6">

                {/* ── Tab: Current Period ─────────────────────────────────── */}
                {tab === "current" && (
                    <div className="space-y-4">
                        {activeTerm && activeYearForTerm ? (
                            <>
                                {/* ── Active period card + navigator ───────────── */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                                    {/* Progress track — shows position across all terms in sequence */}
                                    {termSequence.length > 0 && (
                                        <div className="px-6 pt-5 pb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    Academic Timeline — {termSequence.length} period{termSequence.length !== 1 ? "s" : ""} total
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-500">
                                                    Step {currentSeqIdx + 1} of {termSequence.length}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 overflow-x-auto pb-1">
                                                {termSequence.map((s, idx) => {
                                                    const isCurrent = idx === currentSeqIdx;
                                                    const isPast = idx < currentSeqIdx;
                                                    const yearChanged = idx > 0 && termSequence[idx - 1].year._id !== s.year._id;
                                                    return (
                                                        <div key={s.term._id} className="flex items-center gap-1 flex-shrink-0">
                                                            {yearChanged && (
                                                                <div className="h-4 border-l-2 border-dashed border-gray-200 mx-1" />
                                                            )}
                                                            <button
                                                                onClick={() => !isCurrent && setAdvanceTarget({ termId: s.term._id, yearId: s.year._id, label: `${s.term.name} ${s.year.year}` })}
                                                                title={`${s.term.name} ${s.year.year}`}
                                                                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all text-[9px] font-black border ${
                                                                    isCurrent
                                                                        ? "bg-[#5C67F2] border-[#5C67F2] text-white shadow-md"
                                                                        : isPast
                                                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                                                        : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                                                } ${setActiveMut.isPending ? "opacity-50 cursor-not-allowed" : isCurrent ? "cursor-default" : "cursor-pointer"}`}>
                                                                <span>{s.term.name}</span>
                                                                <span className={`text-[8px] font-bold ${isCurrent ? "text-white/70" : "text-gray-400"}`}>{s.year.year}</span>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Current period info */}
                                    <div className="px-6 py-5 bg-emerald-50/50 border-t border-emerald-100 flex items-start gap-4">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Check className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h2 className="text-xl font-black text-gray-900">{activeTerm.name}</h2>
                                                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-full">Active</span>
                                                {termsInActiveYear.length > 0 && (
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-bold rounded-full">
                                                        {termPosInYear} of {termsInActiveYear.length} in {activeYearForTerm.year}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-emerald-700">
                                                {activeYearForTerm.year} — {activeYearForTerm.name || `Academic Year ${activeYearForTerm.year}`}
                                            </p>
                                            {activeTerm.startDate && (
                                                <p className="text-xs text-gray-500 font-medium mt-1">
                                                    {activeTerm.startDate} → {activeTerm.endDate || "ongoing"}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Prev / Next navigation ───────────────── */}
                                    <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                                        {/* Previous term */}
                                        <div className={`p-4 ${prevEntry ? "hover:bg-gray-50 cursor-pointer transition-all group" : "opacity-40"}`}
                                            onClick={() => prevEntry && !setActiveMut.isPending &&
                                                setAdvanceTarget({ termId: prevEntry.term._id, yearId: prevEntry.year._id, label: `${prevEntry.term.name} ${prevEntry.year.year}` })}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <ArrowLeft className={`w-4 h-4 ${prevEntry ? "text-gray-400 group-hover:text-[#5C67F2] transition-colors" : "text-gray-300"}`} />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Previous Period</span>
                                            </div>
                                            {prevEntry ? (
                                                <div>
                                                    <p className="text-sm font-black text-gray-800 group-hover:text-[#5C67F2] transition-colors">
                                                        {prevEntry.term.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-bold">
                                                        {prevEntry.year.year}
                                                        {prevEntry.year._id !== activeYearForTerm._id && (
                                                            <span className="ml-1 text-amber-600">← Previous year</span>
                                                        )}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-300 font-medium">No earlier period</p>
                                            )}
                                        </div>

                                        {/* Next term */}
                                        <div className={`p-4 ${nextEntry ? "hover:bg-[#5C67F2]/5 cursor-pointer transition-all group" : "opacity-40"}`}
                                            onClick={() => nextEntry && !setActiveMut.isPending &&
                                                setAdvanceTarget({ termId: nextEntry.term._id, yearId: nextEntry.year._id, label: `${nextEntry.term.name} ${nextEntry.year.year}` })}>
                                            <div className="flex items-center justify-end gap-2 mb-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Next Period</span>
                                                <ArrowRight className={`w-4 h-4 ${nextEntry ? "text-gray-400 group-hover:text-[#5C67F2] transition-colors" : "text-gray-300"}`} />
                                            </div>
                                            {nextEntry ? (
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-gray-800 group-hover:text-[#5C67F2] transition-colors">
                                                        {nextEntry.term.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-bold">
                                                        {nextEntry.year.year}
                                                        {nextEntry.year._id !== activeYearForTerm._id && (
                                                            <span className="ml-1 text-blue-600">Next year →</span>
                                                        )}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-300 font-medium text-right">No later period</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cycle button — quick forward */}
                                    {nextEntry && (
                                        <div className="px-6 pb-5 pt-3 border-t border-gray-50">
                                            <button
                                                onClick={() => setAdvanceTarget({ termId: nextEntry.term._id, yearId: nextEntry.year._id, label: `${nextEntry.term.name} ${nextEntry.year.year}` })}
                                                disabled={setActiveMut.isPending}
                                                className="w-full h-10 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-100">
                                                {setActiveMut.isPending
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <ArrowRight className="w-4 h-4" />}
                                                Advance to {nextEntry.term.name} {nextEntry.year.year}
                                                {nextEntry.year._id !== activeYearForTerm._id && (
                                                    <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-[9px]">New Year</span>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Info banner */}
                                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-700 font-medium">
                                        This is the system-wide active period. Exams, fees, attendance, salary, and report cards all default to <strong>{activeTerm.name} {activeYearForTerm.year}</strong>.
                                        Click any pill above to jump to any period, or use Prev/Next to step through.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 flex flex-col items-center text-center gap-3">
                                <AlertCircle className="w-10 h-10 text-amber-500" />
                                <h3 className="text-base font-black text-gray-800">No Current Period Set</h3>
                                <p className="text-sm text-gray-500 max-w-xs">
                                    There is no active academic term. Go to <strong>All Years & Terms</strong>, expand a year, and click <strong>Set as Current</strong> on a term.
                                </p>
                                <button onClick={() => setTab("all")}
                                    className="mt-2 px-6 py-2.5 bg-[#5C67F2] text-white font-bold text-sm rounded-xl hover:bg-[#4a54c4] transition-all">
                                    Go to All Years & Terms →
                                </button>
                            </div>
                        )}

                        {/* Years overview grid */}
                        {years.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">All Academic Years</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {years.map((y: any) => {
                                        const yTerms = getTermsForYear(y._id);
                                        const activeTermInYear = yTerms.find((t: any) => t.isActive);
                                        return (
                                            <div key={y._id}
                                                onClick={() => { setTab("all"); setExpandedYearId(y._id); }}
                                                className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all ${y.isActive ? "border-emerald-300 bg-emerald-50/30" : "border-gray-100"}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-base font-black text-gray-900">{y.year}</span>
                                                    {y.isActive && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                                                </div>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase">{yTerms.length} term{yTerms.length !== 1 ? "s" : ""}</p>
                                                {activeTermInYear && (
                                                    <p className="text-[9px] text-emerald-600 font-black mt-1">● {activeTermInYear.name}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: All Years & Terms ──────────────────────────────── */}
                {tab === "all" && (
                    <div>
                        {loadingYears ? (
                            <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />
                                <span className="text-xs font-bold uppercase">Loading…</span>
                            </div>
                        ) : years.length === 0 ? (
                            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 flex flex-col items-center text-center gap-3">
                                <Calendar className="w-10 h-10 text-gray-300" />
                                <h3 className="font-black text-gray-600">No Academic Years Yet</h3>
                                <p className="text-sm text-gray-400">Create your first academic year to get started.</p>
                                <button onClick={() => setShowYearModal(true)}
                                    className="mt-2 px-6 py-2.5 bg-[#5C67F2] text-white font-bold text-sm rounded-xl hover:bg-[#4a54c4] transition-all flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> New Academic Year
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {years.map((y: any) => {
                                    const yTerms = getTermsForYear(y._id);
                                    const isExpanded = expandedYearId === y._id;
                                    return (
                                        <div key={y._id} className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${y.isActive ? "border-emerald-200" : "border-gray-100"}`}>
                                            {/* Year row */}
                                            <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-all"
                                                onClick={() => setExpandedYearId(isExpanded ? null : y._id)}>
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${y.isActive ? "bg-emerald-100" : "bg-gray-100"}`}>
                                                    <Calendar className={`w-5 h-5 ${y.isActive ? "text-emerald-600" : "text-gray-500"}`} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base font-black text-gray-900">{y.year}</span>
                                                        {y.isActive && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded-full">Active Year</span>}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold">
                                                        {y.name || `Academic Year ${y.year}`} · {yTerms.length} term{yTerms.length !== 1 ? "s" : ""}
                                                        {y.startDate && ` · ${y.startDate} → ${y.endDate || "ongoing"}`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => openAddTerm(y._id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase text-[#5C67F2] bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition-all">
                                                        <Plus className="w-3 h-3" /> Term
                                                    </button>
                                                    <button onClick={() => { setEditYearId(y._id); setYearForm({ year: String(y.year), name: y.name || "", startDate: y.startDate || "", endDate: y.endDate || "" }); setShowYearModal(true); }}
                                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-amber-50 text-gray-400 hover:text-amber-500 flex items-center justify-center border border-gray-100 transition-all">
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={() => { if (confirm(`Delete academic year ${y.year}? All its terms will also be removed.`)) deleteYearMut.mutate(y._id); }}
                                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center border border-gray-100 transition-all">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                            </div>

                                            {/* Terms list */}
                                            {isExpanded && (
                                                <div className="border-t border-gray-100 divide-y divide-gray-50">
                                                    {yTerms.length === 0 ? (
                                                        <div className="flex items-center justify-center py-6 gap-2 text-gray-300">
                                                            <BookOpen className="w-4 h-4" />
                                                            <span className="text-xs font-bold uppercase">No terms yet — click "+ Term" above</span>
                                                        </div>
                                                    ) : yTerms.map((t: any) => (
                                                        <div key={t._id} className={`flex items-center gap-3 px-5 py-3 ${t.isActive ? "bg-emerald-50/40" : "bg-white hover:bg-gray-50/50"} transition-all`}>
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.isActive ? "bg-emerald-500" : "bg-gray-200"}`} />
                                                            <div className="flex-1 pl-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-black text-gray-800">{t.name}</span>
                                                                    {t.isActive && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded-full tracking-wide">Current</span>}
                                                                </div>
                                                                {/* Inline editable start/end dates */}
                                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                    <span className="text-[9px] text-gray-400 font-bold uppercase">{t.type || "Term"} {t.termNumber}</span>
                                                                    <span className="text-[9px] text-gray-300">·</span>
                                                                    <input type="date" defaultValue={t.startDate || ""}
                                                                        onBlur={e => { if (e.target.value !== (t.startDate || "")) termMut.mutate({ ...t, startDate: e.target.value }); }}
                                                                        className="text-[9px] font-bold text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#5C67F2] bg-white w-28" />
                                                                    <span className="text-[9px] text-gray-300">→</span>
                                                                    <input type="date" defaultValue={t.endDate || ""}
                                                                        onBlur={e => { if (e.target.value !== (t.endDate || "")) termMut.mutate({ ...t, endDate: e.target.value }); }}
                                                                        className="text-[9px] font-bold text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#5C67F2] bg-white w-28" />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                {!t.isActive && (
                                                                    <button
                                                                        onClick={() => setAdvanceTarget({ termId: t._id, yearId: y._id, label: `${t.name} ${y.year}` })}
                                                                        disabled={setActiveMut.isPending}
                                                                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all disabled:opacity-50">
                                                                        {setActiveMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                        Set as Current
                                                                    </button>
                                                                )}
                                                                <button onClick={() => navigate(`/settings/term-settings/${t._id}`)} title="Term settings"
                                                                    className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-500 flex items-center justify-center border border-gray-100 transition-all">
                                                                    <Settings className="w-3 h-3" />
                                                                </button>
                                                                <button onClick={() => openEditTerm(t)}
                                                                    className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-amber-50 text-gray-400 hover:text-amber-500 flex items-center justify-center border border-gray-100 transition-all">
                                                                    <Edit2 className="w-3 h-3" />
                                                                </button>
                                                                <button onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteTermMut.mutate(t._id); }}
                                                                    className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center border border-gray-100 transition-all">
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Advance Term Confirm Modal (with password) ───────────────── */}
            {advanceTarget && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-[#5C67F2] to-indigo-600 px-6 py-4">
                            <h3 className="text-base font-black text-white">Advance to {advanceTarget.label}</h3>
                            <p className="text-[10px] text-white/70 font-medium mt-0.5">This will become the system-wide active period</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 font-medium">
                                    Advancing the term affects exams, fees, attendance, salary, and report cards across the entire school.
                                    Enter your admin password to confirm.
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                                    Admin Password *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type={showAdvancePwd ? "text" : "password"}
                                        value={advancePassword}
                                        onChange={e => { setAdvancePassword(e.target.value); setAdvanceError(""); }}
                                        onKeyDown={e => { if (e.key === "Enter") handleAdvanceConfirm(); }}
                                        placeholder="Enter your password"
                                        autoFocus
                                        className={`w-full h-11 pl-10 pr-10 border rounded-xl text-sm font-medium focus:outline-none focus:border-[#5C67F2] ${advanceError ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                                    />
                                    <button type="button" onClick={() => setShowAdvancePwd(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showAdvancePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {advanceError && <p className="text-xs text-red-500 font-bold mt-1">{advanceError}</p>}
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => { setAdvanceTarget(null); setAdvancePassword(""); setAdvanceError(""); }}
                                    className="flex-1 h-11 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleAdvanceConfirm}
                                    disabled={!advancePassword.trim() || setActiveMut.isPending}
                                    className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-50 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all">
                                    {setActiveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                    Advance Term
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Academic Year Modal ──────────────────────────────────────── */}
            {showYearModal && (() => {
                const generatedTerms = !editYearId
                    ? autoTermDates(yearForm.startDate, yearForm.endDate, yearForm.numTerms, yearForm.holidayWeeks, yearForm.termType)
                    : [];
                const canPreview = generatedTerms.length > 0;

                return (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-[2rem] shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        <div className="p-7">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900">{editYearId ? "Edit" : "New"} Academic Year</h3>
                                    {!editYearId && <p className="text-[10px] text-gray-400 font-medium mt-0.5">Set the dates and terms will be auto-generated</p>}
                                </div>
                                <button onClick={() => setShowYearModal(false)} className="text-gray-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="space-y-4">
                                {/* Year + Name */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <div className="absolute -top-2.5 left-4 bg-gray-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">Year*</div>
                                        <input type="number" value={yearForm.year}
                                            onChange={e => setYearForm({ ...yearForm, year: e.target.value,
                                                name: yearForm.name || `Academic Year ${e.target.value}/${Number(e.target.value)+1}` })}
                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700 text-center" />
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-2.5 left-4 bg-gray-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">Name (optional)</div>
                                        <input type="text" value={yearForm.name}
                                            onChange={e => setYearForm({ ...yearForm, name: e.target.value })}
                                            placeholder={`Academic Year ${yearForm.year}`}
                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700" />
                                    </div>
                                </div>

                                {/* Start + End dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <div className="absolute -top-2.5 left-4 bg-[#5C67F2] text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">Year Start Date*</div>
                                        <input type="date" value={yearForm.startDate}
                                            onChange={e => setYearForm({ ...yearForm, startDate: e.target.value })}
                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700" />
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-2.5 left-4 bg-[#5C67F2] text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">Year End Date*</div>
                                        <input type="date" value={yearForm.endDate}
                                            onChange={e => setYearForm({ ...yearForm, endDate: e.target.value })}
                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700" />
                                    </div>
                                </div>

                                {/* Term configuration (new year only) */}
                                {!editYearId && (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Wand2 className="w-4 h-4 text-[#5C67F2]" />
                                            <p className="text-xs font-black text-[#5C67F2] uppercase tracking-wide">Auto-generate Terms</p>
                                            {curriculumSettings?.curriculumId && (
                                                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                    {curriculumSettings.curriculumId} default: {defaultTermCount} terms
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="relative">
                                                <div className="absolute -top-2.5 left-3 bg-indigo-700 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black z-10">Number of Terms</div>
                                                <div className="flex border border-indigo-200 rounded-xl overflow-hidden bg-white">
                                                    {[2,3,4].map(n => (
                                                        <button key={n} type="button" onClick={() => setYearForm(f => ({ ...f, numTerms: n }))}
                                                            className={`flex-1 py-2 text-xs font-black transition-all ${yearForm.numTerms === n ? "bg-[#5C67F2] text-white" : "text-gray-500 hover:bg-indigo-50"}`}>
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -top-2.5 left-3 bg-indigo-700 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black z-10">Type</div>
                                                <select value={yearForm.termType}
                                                    onChange={e => setYearForm(f => ({ ...f, termType: e.target.value }))}
                                                    className="w-full h-10 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2]">
                                                    {TERM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -top-2.5 left-3 bg-indigo-700 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black z-10">Holiday Weeks</div>
                                                <div className="flex border border-indigo-200 rounded-xl overflow-hidden bg-white">
                                                    {[1,2,3,4].map(n => (
                                                        <button key={n} type="button" onClick={() => setYearForm(f => ({ ...f, holidayWeeks: n }))}
                                                            className={`flex-1 py-2 text-xs font-black transition-all ${yearForm.holidayWeeks === n ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-indigo-50"}`}>
                                                            {n}w
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Auto-generated preview */}
                                        {canPreview ? (
                                            <div className="space-y-1.5 mt-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Preview — {generatedTerms.length} terms will be created:</p>
                                                {generatedTerms.map((t, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-indigo-100">
                                                        <span className="text-xs font-black text-indigo-800">{t.name}</span>
                                                        <span className="text-[10px] text-gray-500 font-bold font-mono">{t.startDate} → {t.endDate}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-indigo-400 font-medium text-center py-2">
                                                Set start and end dates above to preview auto-generated terms
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowYearModal(false)} className="flex-1 h-11 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                                <button
                                    onClick={() => {
                                        if (!yearForm.year) { toast.error("Year is required"); return; }
                                        if (!yearForm.startDate || !yearForm.endDate) { toast.error("Start and end dates are required"); return; }
                                        const payload: any = { year: Number(yearForm.year), name: yearForm.name || `Academic Year ${yearForm.year}`, startDate: yearForm.startDate, endDate: yearForm.endDate };
                                        if (!editYearId && generatedTerms.length > 0) payload._terms = generatedTerms;
                                        yearMut.mutate(payload);
                                    }}
                                    disabled={yearMut.isPending}
                                    className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                    {yearMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editYearId ? "Save Changes" : canPreview ? `Create Year + ${generatedTerms.length} Terms` : "Create Year"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* ── Term Modal ────────────────────────────────────────────────── */}
            {showTermModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white max-w-md w-full rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
                        <div className="p-7">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-gray-900">{editTermId ? "Edit" : "Add"} Term</h3>
                                <button onClick={() => setShowTermModal(false)} className="text-gray-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-5">
                                <div className="relative">
                                    <div className="absolute -top-2.5 left-4 bg-gray-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">Term Name* (e.g. Term 1, Semester 2)</div>
                                    <input type="text" value={termForm.name} onChange={e => setTermForm({ ...termForm, name: e.target.value })}
                                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <div className="absolute -top-2.5 left-3 bg-gray-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">Type</div>
                                        <select value={termForm.type} onChange={e => setTermForm({ ...termForm, type: e.target.value })}
                                            className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700">
                                            {TERM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-2.5 left-3 bg-gray-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">Number</div>
                                        <input type="number" value={termForm.termNumber} onChange={e => setTermForm({ ...termForm, termNumber: e.target.value })}
                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700 text-center" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ l: "Start Date", f: "startDate" }, { l: "End Date", f: "endDate" }].map(f => (
                                        <div key={f.f} className="relative">
                                            <div className="absolute -top-2.5 left-3 bg-gray-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">{f.l}</div>
                                            <input type="date" value={(termForm as any)[f.f]} onChange={e => setTermForm({ ...termForm, [f.f]: e.target.value })}
                                                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowTermModal(false)} className="flex-1 h-11 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                                <button
                                    onClick={() => {
                                        if (!termForm.name) { toast.error("Term name is required"); return; }
                                        termMut.mutate({ ...termForm, academicYearId: termParentYearId, termNumber: Number(termForm.termNumber) });
                                    }}
                                    disabled={termMut.isPending}
                                    className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                    {termMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editTermId ? "Save" : "Add Term"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
