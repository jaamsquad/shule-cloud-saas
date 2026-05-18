import { useState, useEffect } from "react";
import {
    Home, Plus, List, Calendar, CheckCircle2,
    Trash2, Edit3, BookOpen, Loader2, X, Save,
    AlertCircle, ToggleLeft, ToggleRight, ChevronDown, RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Period {
    _id: string;
    name: string;
    type: "term" | "semester" | "quarter" | "trimester" | "custom";
    number: number;
    label: string;
    academicYear: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    isCurrent: boolean;
    createdAt: string;
}

const PERIOD_TYPES = [
    { value: "term",      label: "Term",      icon: "📚", example: "Term 1 / Term 2 / Term 3",    maxCount: 3 },
    { value: "semester",  label: "Semester",  icon: "🎓", example: "Semester 1 / Semester 2",       maxCount: 2 },
    { value: "quarter",   label: "Quarter",   icon: "📅", example: "Q1 / Q2 / Q3 / Q4",            maxCount: 4 },
    { value: "trimester", label: "Trimester", icon: "🗓️", example: "Trimester 1 / 2 / 3",          maxCount: 3 },
    { value: "custom",    label: "Custom",    icon: "✏️", example: "Name it yourself",              maxCount: 12 },
];

const TYPE_COLOR: Record<string, string> = {
    term:      "#5C67F2",
    semester:  "#10b981",
    quarter:   "#f59e0b",
    trimester: "#8b5cf6",
    custom:    "#ec4899",
};

const TYPE_BG: Record<string, string> = {
    term:      "#eef0fe",
    semester:  "#d1fae5",
    quarter:   "#fef3c7",
    trimester: "#ede9fe",
    custom:    "#fce7f3",
};

const ACADEMIC_YEARS = [
    "2025/2026",
    "2026/2027",
    "2027/2028",
    "2028/2029",
    "2029/2030",
    "2030/2031",
];

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Periods() {
    const [activeTab, setActiveTab]         = useState<"new" | "list" | "past">("list");
    const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [showCycleModal, setShowCycleModal] = useState(false);
    const queryClient = useQueryClient();

    const blankForm = () => ({
        type:        "term" as string,
        number:      1,
        customLabel: "",
        academicYear:`2026/2027`,
        startDate:   "",
        endDate:     "",
        isActive:    true,
        isCurrent:   false,
    });

    const [form, setForm]       = useState(blankForm());
    const [formError, setFormError] = useState("");

    // ── Queries ──────────────────────────────────────────────────────────────
    const { data: periods = [], isLoading } = useQuery<Period[]>({
        queryKey: ["periods"],
        queryFn: async () => {
            const r = await api.get("/academics/periods");
            return r.data;
        },
    });

    // ── Mutations ────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: async (data: any) => (await api.post("/academics/periods", data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["periods"] });
            setActiveTab("list");
            setForm(blankForm());
            toast.success("Period created successfully");
        },
        onError: () => setFormError("Failed to save period. Please try again."),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) =>
            (await api.patch(`/academics/periods/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["periods"] });
            setEditingPeriod(null);
            setActiveTab("list");
            setForm(blankForm());
            toast.success("Period updated successfully");
        },
        onError: () => setFormError("Update failed. Please try again."),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => { await api.delete(`/academics/periods/${id}`); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["periods"] });
            setDeleteConfirm(null);
            toast.success("Period deleted");
        },
    });

    const setCurrentMutation = useMutation({
        mutationFn: async (id: string) =>
            (await api.patch(`/academics/periods/${id}/set-current`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["periods"] });
            toast.success("Current period updated");
        },
    });

    const handleCycleTerm = () => {
        const curr = periods.find(p => p.isCurrent);
        if (!curr) {
            toast.error("No current period set to cycle from.");
            return;
        }
        const currentLabel = curr.label || "Term 1";
        const nextNumber = currentLabel.includes("1") ? 2 : currentLabel.includes("2") ? 3 : 1;
        const nextLabel = `Term ${nextNumber}`;
        
        let nextAcademicYear = curr.academicYear || "2026/2027";
        if (nextNumber === 1 && nextAcademicYear.includes('/')) {
            const parts = nextAcademicYear.split('/');
            if (parts.length === 2) {
                const yr1 = parseInt(parts[0]) + 1;
                const yr2 = parseInt(parts[1]) + 1;
                if (!isNaN(yr1) && !isNaN(yr2)) {
                    nextAcademicYear = `${yr1}/${yr2}`;
                }
            }
        }

        const existing = periods.find(p => p.label === nextLabel && p.academicYear === nextAcademicYear);

        if (existing) {
            setCurrentMutation.mutate(existing._id, {
                onSuccess: () => {
                    setShowCycleModal(false);
                    toast.success(`Successfully cycled to ${nextLabel} (${nextAcademicYear})!`);
                }
            });
        } else {
            createMutation.mutate({
                type: "term",
                number: nextNumber,
                label: nextLabel,
                academicYear: nextAcademicYear,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0],
                isActive: true,
                isCurrent: true
            }, {
                onSuccess: (newPeriodData: any) => {
                    if (newPeriodData?._id || newPeriodData?.insertedId) {
                        setCurrentMutation.mutate(newPeriodData._id || newPeriodData.insertedId, {
                            onSuccess: () => {
                                setShowCycleModal(false);
                                toast.success(`Created and cycled to ${nextLabel} (${nextAcademicYear})!`);
                            }
                        });
                    } else {
                        setShowCycleModal(false);
                        toast.success(`Created and cycled to ${nextLabel} (${nextAcademicYear})!`);
                    }
                }
            });
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getLabel = () => {
        if (form.type === "custom") return form.customLabel;
        const t = PERIOD_TYPES.find(p => p.value === form.type);
        return `${t?.label ?? ""} ${form.number}`;
    };

    const handleSubmit = () => {
        setFormError("");
        if (!form.startDate || !form.endDate) {
            setFormError("Start and end dates are required.");
            return;
        }
        if (new Date(form.startDate) >= new Date(form.endDate)) {
            setFormError("End date must be after start date.");
            return;
        }
        if (form.type === "custom" && !form.customLabel.trim()) {
            setFormError("Please enter a label for this custom period.");
            return;
        }
        const payload = {
            type:         form.type,
            number:       form.number,
            label:        getLabel(),
            academicYear: form.academicYear,
            startDate:    form.startDate,
            endDate:      form.endDate,
            isActive:     form.isActive,
            isCurrent:    form.isCurrent,
        };
        editingPeriod
            ? updateMutation.mutate({ id: editingPeriod._id, data: payload })
            : createMutation.mutate(payload);
    };

    const startEdit = (p: Period) => {
        setEditingPeriod(p);
        setForm({
            type:         p.type,
            number:       p.number,
            customLabel:  p.type === "custom" ? p.label : "",
            academicYear: p.academicYear,
            startDate:    p.startDate?.split("T")[0] ?? "",
            endDate:      p.endDate?.split("T")[0]   ?? "",
            isActive:     p.isActive,
            isCurrent:    p.isCurrent,
        });
        setFormError("");
        setActiveTab("new");
    };

    const cancelEdit = () => {
        setEditingPeriod(null);
        setForm(blankForm());
        setFormError("");
        setActiveTab("list");
    };

    const currentPeriod   = periods.find(p => p.isCurrent);
    const selectedTypeMeta = PERIOD_TYPES.find(t => t.value === form.type)!;
    const isSaving        = createMutation.isPending || updateMutation.isPending;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">

            {/* Top bar */}
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academics</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Learning Periods</span>
                </div>

                <div className="flex items-center gap-3">
                    {currentPeriod && (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse inline-block" />
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">
                                Active: {currentPeriod.label} · {currentPeriod.academicYear}
                            </span>
                        </div>
                    )}
                    <button 
                        onClick={() => setShowCycleModal(true)} 
                        className="px-5 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-[11px] tracking-widest uppercase flex items-center gap-2 shadow-md shadow-indigo-100 transition-all"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Cycle Current Term
                    </button>
                </div>
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-5xl mx-auto">

                {/* Page heading */}
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Learning Periods</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">
                        Configure terms, semesters, quarters and any other academic cycles used by your school.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 w-fit mb-8 shadow-sm">
                    {[
                        { id: "list", icon: <List className="w-3.5 h-3.5" />,  label: "Current Period" },
                        { id: "past", icon: <Calendar className="w-3.5 h-3.5" />, label: "Past / Other Periods" },
                        { id: "new",  icon: <Plus className="w-3.5 h-3.5" />,  label: editingPeriod ? "Edit Period" : "New Learning Phase" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (tab.id === "list" || tab.id === "past") { setActiveTab(tab.id as any); cancelEdit(); }
                                else { setActiveTab("new"); if (!editingPeriod) { setForm(blankForm()); setFormError(""); } }
                            }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all tracking-wider uppercase ${
                                activeTab === tab.id
                                    ? "bg-[#5C67F2] text-white shadow-md shadow-indigo-200"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════════════════════
                    TAB — NEW / EDIT FORM
                ══════════════════════════════════════════ */}
                {activeTab === "new" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                            {/* Form header */}
                            <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-black text-slate-800">
                                        {editingPeriod ? `Editing — ${editingPeriod.label}` : "Create New Learning Phase"}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        Choose a type, set the number, dates, and academic year.
                                    </p>
                                </div>
                                {editingPeriod && (
                                    <button
                                        onClick={cancelEdit}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 border border-gray-100 rounded-xl hover:border-red-100 hover:bg-red-50 transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" /> Cancel Edit
                                    </button>
                                )}
                            </div>

                            <div className="px-8 py-8 space-y-8">

                                {/* Step 1 — Period type */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                        Step 1 · Select Period Type
                                    </p>
                                    <div className="grid grid-cols-5 gap-3">
                                        {PERIOD_TYPES.map(t => (
                                            <button
                                                key={t.value}
                                                onClick={() => setForm(f => ({ ...f, type: t.value, number: 1, customLabel: "" }))}
                                                className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all text-center ${
                                                    form.type === t.value
                                                        ? "border-[#5C67F2] bg-indigo-50 shadow-sm"
                                                        : "border-gray-100 hover:border-gray-200 bg-gray-50/50"
                                                }`}
                                            >
                                                <span className="text-2xl leading-none">{t.icon}</span>
                                                <span className={`text-xs font-black ${form.type === t.value ? "text-[#5C67F2]" : "text-slate-500"}`}>
                                                    {t.label}
                                                </span>
                                                <span className="text-[9px] text-slate-300 font-medium leading-tight">{t.example}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 2 — Number / Label */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                        Step 2 · {form.type === "custom" ? "Name This Period" : "Which Number?"}
                                    </p>

                                    {form.type === "custom" ? (
                                        <input
                                            type="text"
                                            value={form.customLabel}
                                            onChange={e => setForm(f => ({ ...f, customLabel: e.target.value }))}
                                            placeholder="e.g. Rainy Season Term, Block A, Module 1…"
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-200"
                                        />
                                    ) : (
                                        <div className="flex gap-3 flex-wrap">
                                            {Array.from({ length: selectedTypeMeta.maxCount }, (_, i) => i + 1).map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setForm(f => ({ ...f, number: n }))}
                                                    className={`w-14 h-14 rounded-2xl border-2 font-black text-lg transition-all ${
                                                        form.number === n
                                                            ? "border-[#5C67F2] text-[#5C67F2] bg-indigo-50 shadow-sm"
                                                            : "border-gray-100 text-slate-300 hover:border-gray-200 hover:text-slate-500"
                                                    }`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Preview pill */}
                                    {(form.type !== "custom" || form.customLabel) && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <span className="text-xs text-slate-400 font-bold">Preview:</span>
                                            <span
                                                className="px-4 py-1.5 rounded-full text-xs font-black"
                                                style={{ background: TYPE_BG[form.type], color: TYPE_COLOR[form.type] }}
                                            >
                                                {getLabel()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Step 3 — Academic year + dates */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                        Step 3 · Academic Year &amp; Dates
                                    </p>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Academic Year</label>
                                            <select
                                                value={form.academicYear}
                                                onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))}
                                                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none cursor-pointer shadow-sm"
                                            >
                                                {ACADEMIC_YEARS.map(yr => (
                                                    <option key={yr} value={yr}>{yr}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                                            <input
                                                type="date"
                                                value={form.startDate}
                                                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                                            <input
                                                type="date"
                                                value={form.endDate}
                                                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Step 4 — Toggles */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                        Step 4 · Status
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all ${
                                                form.isActive
                                                    ? "border-emerald-200 bg-emerald-50"
                                                    : "border-gray-100 bg-gray-50/50"
                                            }`}
                                        >
                                            {form.isActive
                                                ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                                                : <ToggleLeft  className="w-5 h-5 text-slate-300" />}
                                            <div className="text-left">
                                                <p className={`text-xs font-black ${form.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                                                    {form.isActive ? "Active" : "Inactive"}
                                                </p>
                                                <p className="text-[10px] text-slate-300 font-medium">Period is enabled</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setForm(f => ({ ...f, isCurrent: !f.isCurrent }))}
                                            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all ${
                                                form.isCurrent
                                                    ? "border-[#5C67F2] bg-indigo-50"
                                                    : "border-gray-100 bg-gray-50/50"
                                            }`}
                                        >
                                            {form.isCurrent
                                                ? <ToggleRight className="w-5 h-5 text-[#5C67F2]" />
                                                : <ToggleLeft  className="w-5 h-5 text-slate-300" />}
                                            <div className="text-left">
                                                <p className={`text-xs font-black ${form.isCurrent ? "text-[#5C67F2]" : "text-slate-400"}`}>
                                                    {form.isCurrent ? "Set as Current" : "Not Current"}
                                                </p>
                                                <p className="text-[10px] text-slate-300 font-medium">Mark as ongoing period</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Error */}
                                {formError && (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <p className="text-xs font-bold text-red-500">{formError}</p>
                                    </div>
                                )}

                                {/* Submit */}
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSaving}
                                        className="h-11 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-60 text-white font-black rounded-xl text-xs tracking-widest uppercase shadow-lg shadow-indigo-200 flex items-center gap-2.5 transition-all"
                                    >
                                        {isSaving
                                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                                            : <><Save className="w-3.5 h-3.5" /> {editingPeriod ? "Update Period" : "Save Period"}</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    TAB — CURRENT PERIOD
                ══════════════════════════════════════════ */}
                {activeTab === "list" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {isLoading ? (
                            <div className="flex flex-col items-center py-24 gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                                <p className="text-slate-400 font-bold text-sm animate-pulse">Loading periods…</p>
                            </div>
                        ) : periods.filter(p => p.isCurrent).length === 0 ? (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-5">
                                <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center">
                                    <AlertCircle className="w-10 h-10 text-amber-500" />
                                </div>
                                <div className="text-center max-w-md">
                                    <h3 className="text-base font-black text-slate-700">No Current Period Set</h3>
                                    <p className="text-slate-400 text-sm font-medium mt-1">
                                        There is currently no active academic cycle. Please set a period as current from the Past / Other Periods tab or create a new learning phase.
                                    </p>
                                </div>
                                <div className="flex gap-3 mt-2">
                                    <button
                                        onClick={() => setActiveTab("past")}
                                        className="h-10 px-6 bg-white border border-gray-200 text-slate-600 font-black rounded-xl text-xs tracking-widest uppercase shadow-sm hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <Calendar className="w-3.5 h-3.5" /> View Past Periods
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("new")}
                                        className="h-10 px-6 bg-[#5C67F2] text-white font-black rounded-xl text-xs tracking-widest uppercase shadow-md shadow-indigo-200 flex items-center gap-2"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Create New Period
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Stats row */}
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    {[
                                        { label: "Total Periods",    value: periods.length,                         color: "#5C67F2", bg: "#eef0fe" },
                                        { label: "Active",           value: periods.filter(p => p.isActive).length, color: "#10b981", bg: "#d1fae5" },
                                        { label: "Inactive",         value: periods.filter(p => !p.isActive).length,color: "#94a3b8", bg: "#f1f5f9" },
                                        { label: "Current Period",   value: currentPeriod ? 1 : 0,                  color: "#f59e0b", bg: "#fef3c7" },
                                    ].map(s => (
                                        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                            <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Current Period card */}
                                {periods.filter(p => p.isCurrent).map((p) => (
                                    <div
                                        key={p._id}
                                        className={`bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md border-[#5C67F2]/30 ring-1 ring-[#5C67F2]/10`}
                                    >
                                        <div className="px-6 py-5 flex items-center gap-5">

                                            {/* Type badge */}
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                                                style={{ background: TYPE_BG[p.type] }}
                                            >
                                                {PERIOD_TYPES.find(t => t.value === p.type)?.icon ?? "📋"}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className="text-sm font-black text-slate-800">{p.label}</h3>
                                                    <span className="px-2.5 py-0.5 bg-[#5C67F2] text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                                                        Current
                                                    </span>
                                                    {!p.isActive && (
                                                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-400 text-[9px] font-black rounded-full uppercase tracking-wider">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold">
                                                    <span
                                                        className="px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider"
                                                        style={{ background: TYPE_BG[p.type], color: TYPE_COLOR[p.type] }}
                                                    >
                                                        {p.type}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {p.academicYear}
                                                    </span>
                                                    {p.startDate && p.endDate && (
                                                        <span>
                                                            {new Date(p.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                                            {" \u2192 "}
                                                            {new Date(p.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => startEdit(p)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-[#5C67F2] hover:bg-indigo-50 hover:text-[#5C67F2] text-slate-300 transition-all"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    TAB — PAST / OTHER PERIODS
                ══════════════════════════════════════════ */}
                {activeTab === "past" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {isLoading ? (
                            <div className="flex flex-col items-center py-24 gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                                <p className="text-slate-400 font-bold text-sm animate-pulse">Loading periods…</p>
                            </div>
                        ) : periods.filter(p => !p.isCurrent).length === 0 ? (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-5">
                                <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                                    <BookOpen className="w-10 h-10 text-[#5C67F2]" />
                                </div>
                                <div className="text-center max-w-md">
                                    <h3 className="text-base font-black text-slate-700">No Past / Other Periods Found</h3>
                                    <p className="text-slate-400 text-sm font-medium mt-1">
                                        All your saved learning phases are currently active or no other periods have been created yet.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab("new")}
                                    className="mt-2 h-10 px-6 bg-[#5C67F2] text-white font-black rounded-xl text-xs tracking-widest uppercase shadow-md shadow-indigo-200 flex items-center gap-2"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Create New Period
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Stats row */}
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    {[
                                        { label: "Total Periods",    value: periods.length,                         color: "#5C67F2", bg: "#eef0fe" },
                                        { label: "Active",           value: periods.filter(p => p.isActive).length, color: "#10b981", bg: "#d1fae5" },
                                        { label: "Inactive",         value: periods.filter(p => !p.isActive).length,color: "#94a3b8", bg: "#f1f5f9" },
                                        { label: "Current Period",   value: currentPeriod ? 1 : 0,                  color: "#f59e0b", bg: "#fef3c7" },
                                    ].map(s => (
                                        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                            <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Past Period cards */}
                                {periods.filter(p => !p.isCurrent).map((p) => (
                                    <div
                                        key={p._id}
                                        className={`bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md border-gray-100`}
                                    >
                                        <div className="px-6 py-5 flex items-center gap-5">

                                            {/* Type badge */}
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                                                style={{ background: TYPE_BG[p.type] }}
                                            >
                                                {PERIOD_TYPES.find(t => t.value === p.type)?.icon ?? "📋"}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className="text-sm font-black text-slate-800">{p.label}</h3>
                                                    {!p.isActive && (
                                                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-400 text-[9px] font-black rounded-full uppercase tracking-wider">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold">
                                                    <span
                                                        className="px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider"
                                                        style={{ background: TYPE_BG[p.type], color: TYPE_COLOR[p.type] }}
                                                    >
                                                        {p.type}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {p.academicYear}
                                                    </span>
                                                    {p.startDate && p.endDate && (
                                                        <span>
                                                            {new Date(p.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                                            {" \u2192 "}
                                                            {new Date(p.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => setCurrentMutation.mutate(p._id)}
                                                    disabled={setCurrentMutation.isPending}
                                                    title="Set as current period"
                                                    className="h-9 px-4 text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Set Current
                                                </button>
                                                <button
                                                    onClick={() => startEdit(p)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-[#5C67F2] hover:bg-indigo-50 hover:text-[#5C67F2] text-slate-300 transition-all"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(p._id)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 hover:text-red-400 text-slate-300 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Delete confirm inline */}
                                        {deleteConfirm === p._id && (
                                            <div className="mx-6 mb-5 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="flex items-center gap-3">
                                                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                    <p className="text-xs font-bold text-red-600">
                                                        Delete <span className="font-black">{p.label}</span>? This cannot be undone.
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="h-8 px-4 text-xs font-bold text-slate-400 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => deleteMutation.mutate(p._id)}
                                                        disabled={deleteMutation.isPending}
                                                        className="h-8 px-4 text-xs font-black text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all flex items-center gap-1.5"
                                                    >
                                                        {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Cycle Confirmation Modal */}
            {showCycleModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 border border-gray-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C67F2]/5 rounded-bl-[8rem] -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="text-center mb-6 relative z-10">
                            <div className="w-12 h-12 bg-indigo-50 text-[#5C67F2] rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-indigo-50/50">
                                <RefreshCw className="w-6 h-6 animate-spin" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Cycle Current Term</h3>
                            <p className="text-xs text-slate-500 font-medium mt-2">
                                You are about to advance the current academic term. E.g. from Term 1 to Term 2, Term 2 to Term 3, or Term 3 to Term 1.
                            </p>
                        </div>
                        
                        {currentPeriod ? (
                            (() => {
                                const nextNum = currentPeriod.label.includes("1") ? 2 : currentPeriod.label.includes("2") ? 3 : 1;
                                let nextModalYear = currentPeriod.academicYear || "2026/2027";
                                if (nextNum === 1 && nextModalYear.includes('/')) {
                                    const parts = nextModalYear.split('/');
                                    if (parts.length === 2) {
                                        const yr1 = parseInt(parts[0]) + 1;
                                        const yr2 = parseInt(parts[1]) + 1;
                                        if (!isNaN(yr1) && !isNaN(yr2)) {
                                            nextModalYear = `${yr1}/${yr2}`;
                                        }
                                    }
                                }
                                return (
                                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-gray-100 flex items-center justify-between text-xs font-bold text-slate-700">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">Current Term</span>
                                            <span className="text-sm font-black text-[#5C67F2]">{currentPeriod.label}</span> ({currentPeriod.academicYear})
                                        </div>
                                        <div className="text-slate-300 font-black text-lg">➔</div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">Next Term</span>
                                            <span className="text-sm font-black text-emerald-600">
                                                Term {nextNum}
                                            </span> ({nextModalYear})
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl font-semibold mb-6 text-center">
                                No active period set. Will initialize Term 1.
                            </p>
                        )}

                        <div className="flex items-center gap-3 relative z-10">
                            <button
                                onClick={() => setShowCycleModal(false)}
                                className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold rounded-full transition-all text-xs uppercase tracking-wider"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCycleTerm}
                                disabled={setCurrentMutation.isPending || createMutation.isPending}
                                className="flex-1 h-12 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-wider"
                            >
                                {(setCurrentMutation.isPending || createMutation.isPending) ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Moving...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" /> Confirm Advance
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
