import { useState } from "react";
import {
    Plus, Search, Edit3, Trash2, Archive, BookOpen, Calendar, Loader2,
    CheckCircle, XCircle, AlertCircle, MoreHorizontal, ChevronRight,
    GraduationCap, Eye, Copy, Home, Layers, ExternalLink, Settings
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Exam {
    _id: string;
    examName: string;
    examCode: string;
    academicYear: string;
    term: string;
    classLevel: string;
    startDate: string;
    endDate: string;
    type: string;
    mode: string;
    status: "Active" | "Draft" | "Archived";
    publishStatus: "Published" | "Unpublished";
    remarks?: string;
    createdAt: string;
}

interface FormState {
    examName: string;
    examCode: string;
    academicYear: string;
    term: string;
    classLevel: string;
    startDate: string;
    endDate: string;
    type: string;
    mode: string;
    status: "Active" | "Draft" | "Archived";
    publishStatus: "Published" | "Unpublished";
    remarks: string;
}

const BLANK_FORM: FormState = {
    examName: "", examCode: "", academicYear: "2026/2027", term: "",
    classLevel: "", startDate: "", endDate: "", type: "End Term",
    mode: "Regular", status: "Draft", publishStatus: "Unpublished", remarks: ""
};


const STATUS_COLORS: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Draft: "bg-amber-50 text-amber-700 border-amber-200",
    Archived: "bg-slate-100 text-slate-500 border-slate-200",
};

const PUBLISH_COLORS: Record<string, string> = {
    Published: "bg-blue-50 text-blue-700 border-blue-200",
    Unpublished: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function CreateExam() {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [form, setForm] = useState<FormState>(BLANK_FORM);
    const [search, setSearch] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [filterYear, setFilterYear]   = useState("");   // "" = all years
    const [filterTerm, setFilterTerm]   = useState("");   // "" = all terms
    const [prefilledFilter, setPrefilledFilter] = useState(false);
    const queryClient = useQueryClient();

    const { data: exams = [], isLoading } = useQuery<Exam[]>({
        queryKey: ["exams"],
        queryFn: async () => (await api.get("/academics/exams")).data,
    });

    // V2 terms (primary source of truth for current term)
    const { data: v2Terms = [] } = useQuery<any[]>({
        queryKey: ["v2_all_terms"],
        queryFn: async () => (await api.get("/v2/terms")).data || [],
    });
    const { data: v2Years = [] } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });

    // Legacy periods fallback
    const { data: periods = [] } = useQuery<any[]>({
        queryKey: ["periods"],
        queryFn: async () => (await api.get("/academics/periods")).data || [],
    });

    // Current term: prefer V2 active term, fall back to legacy
    const v2ActiveTerm = v2Terms.find((t: any) => t.isActive);
    const v2ActiveYear = v2Years.find((y: any) => y.isActive);
    const legacyPeriod = periods.find((p: any) => p.isCurrent);
    const currentPeriod = v2ActiveTerm
        ? { label: v2ActiveTerm.name, academicYear: v2ActiveYear?.year || "" }
        : legacyPeriod;

    // Pre-select filter to active year/term (once, when data loads)
    if (!prefilledFilter && (v2ActiveYear || v2ActiveTerm)) {
        setPrefilledFilter(true);
        if (v2ActiveYear) setFilterYear(String(v2ActiveYear.year));
        if (v2ActiveTerm) setFilterTerm(v2ActiveTerm.name);
    }

    // ── Exam status helper ────────────────────────────────────────────────────
    // Shows "Past" when the exam's endDate is before today (regardless of stored status)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const examDisplayStatus = (exam: any) => {
        if (exam.endDate && new Date(exam.endDate) < today && exam.status === "Active") {
            return { label: "Past", cls: "bg-slate-100 text-slate-600 border-slate-200" };
        }
        return exam.status === "Active"
            ? { label: "Active",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
            : exam.status === "Archived"
            ? { label: "Archived", cls: "bg-slate-100 text-slate-500 border-slate-200" }
            : { label: "Draft",    cls: "bg-amber-50 text-amber-700 border-amber-200" };
    };

    // Unique years and terms from exams for filter dropdowns
    const uniqueYears = [...new Set(exams.map((e: any) => e.academicYear).filter(Boolean))].sort().reverse();
    const uniqueTerms = [...new Set(exams.map((e: any) => e.term).filter(Boolean))].sort();

    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["classes"],
        queryFn: async () => (await api.get("/academics/classes")).data,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/exams", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exams"] });
            setShowModal(false);
            setForm(BLANK_FORM);
            toast.success("Exam created successfully!");
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create exam"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: any) => api.patch(`/academics/exams/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exams"] });
            setEditingExam(null);
            setShowModal(false);
            toast.success("Exam updated!");
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update exam"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/exams/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exams"] });
            setDeleteConfirm(null);
            toast.success("Exam deleted");
        },
    });

    const handleOpen = (exam?: Exam) => {
        if (exam) {
            setEditingExam(exam);
            setForm({
                examName: exam.examName || "", examCode: exam.examCode || "",
                academicYear: exam.academicYear || "2026/2027", term: exam.term || "",
                classLevel: exam.classLevel || "", startDate: exam.startDate?.split("T")[0] || "",
                endDate: exam.endDate?.split("T")[0] || "", type: exam.type || "End Term",
                mode: exam.mode || "Regular", status: exam.status || "Draft",
                publishStatus: exam.publishStatus || "Unpublished", remarks: exam.remarks || ""
            });
        } else {
            setEditingExam(null);
            setForm({
                ...BLANK_FORM,
                term: currentPeriod ? `${currentPeriod.label} (${currentPeriod.academicYear})` : "",
                academicYear: currentPeriod?.academicYear || "2026/2027",
            });
        }
        setShowModal(true);
    };

    const handleSubmit = () => {
        if (!form.examName.trim()) return toast.error("Exam name is required");
        if (!form.startDate || !form.endDate) return toast.error("Start and end dates are required");
        if (new Date(form.endDate) < new Date(form.startDate)) return toast.error("End date cannot be before start date");

        // Duplicate exam validation: CAT and Assignment are allowed multiple times.
        // Others (End Term, Mid Term, Mock, KCSE, KCPE, Practical, etc.) are allowed once per term.
        const normalizedType = (form.type || "").trim().toLowerCase();
        const isMultipleAllowed = normalizedType === "cat" || normalizedType === "assignment";
        if (!isMultipleAllowed) {
            const hasDuplicate = exams.some(e =>
                e.term === form.term &&
                e.academicYear === form.academicYear &&
                (e.type || "").trim().toLowerCase() === normalizedType &&
                (!editingExam || e._id !== editingExam._id)
            );
            if (hasDuplicate) {
                return toast.error(`An exam of type "${form.type}" already exists for ${form.term || "this term"}. Only CAT and Assignment can be created multiple times.`);
            }
        }

        if (editingExam) updateMutation.mutate({ id: editingExam._id, data: form });
        else createMutation.mutate(form);
    };

    const filtered = exams.filter((e: any) => {
        const matchSearch = (e.examName || "").toLowerCase().includes(search.toLowerCase()) ||
                            (e.examCode || "").toLowerCase().includes(search.toLowerCase());
        const matchYear   = !filterYear || (e.academicYear || "").includes(filterYear);
        const matchTerm   = !filterTerm || (e.term || "").toLowerCase().includes(filterTerm.toLowerCase());
        return matchSearch && matchYear && matchTerm;
    });

    const stats = [
        { label: "Total Exams", value: exams.length, color: "#5C67F2", bg: "#eef0fe" },
        { label: "Active", value: exams.filter((e: any) => e.status === "Active" && !(e.endDate && new Date(e.endDate) < today)).length, color: "#10b981", bg: "#d1fae5" },
        { label: "Past", value: exams.filter((e: any) => e.endDate && new Date(e.endDate) < today && e.status === "Active").length, color: "#64748b", bg: "#f1f5f9" },
        { label: "Draft", value: exams.filter((e: any) => e.status === "Draft").length, color: "#f59e0b", bg: "#fef3c7" },
    ];

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            {/* Top bar */}
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Exams</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Create New Exam</span>
                </div>
                {currentPeriod && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse inline-block" />
                        <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">
                            {currentPeriod.label} · {currentPeriod.academicYear}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Create New Exam</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">Schedule and manage your school examinations.</p>
                    </div>
                    <button
                        onClick={() => navigate("/exams/new")}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-indigo-100 transition-all"
                    >
                        <Plus className="w-4 h-4" /> New Exam
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {stats.map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filter bar */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {/* Year filter */}
                    <div className="relative">
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                            className="h-10 pl-3 pr-8 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none shadow-sm">
                            <option value="">All Years</option>
                            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none rotate-90" />
                    </div>
                    {/* Term filter */}
                    <div className="relative">
                        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
                            className="h-10 pl-3 pr-8 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none shadow-sm">
                            <option value="">All Terms</option>
                            {uniqueTerms.map(t => <option key={t} value={t}>{t}</option>)}
                            {/* V2 terms from active year */}
                            {v2Terms
                                .filter((t: any) => !filterYear || String(v2Years.find((y: any) => y._id === t.academicYearId)?.year) === filterYear)
                                .map((t: any) => (
                                    !uniqueTerms.includes(t.name) && <option key={t._id} value={t.name}>{t.name}</option>
                                ))}
                        </select>
                        <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none rotate-90" />
                    </div>
                    {/* Active indicators */}
                    {(filterYear || filterTerm) && (
                        <button onClick={() => { setFilterYear(""); setFilterTerm(""); }}
                            className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors px-2 py-1">
                            ✕ Clear
                        </button>
                    )}
                    {currentPeriod && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                                {currentPeriod.label} · {currentPeriod.academicYear}
                            </span>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search exams by name or code..."
                        className="w-full h-12 pl-12 pr-4 bg-white border border-gray-100 rounded-2xl text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-300"
                    />
                </div>

                {/* Exam List */}
                {isLoading ? (
                    <div className="flex flex-col items-center py-24 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                        <p className="text-slate-400 font-bold text-sm">Loading exams…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-5">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                            <GraduationCap className="w-10 h-10 text-[#5C67F2]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-black text-slate-700">No Exams Yet</h3>
                            <p className="text-slate-400 text-sm font-medium mt-1">Create your first examination to get started.</p>
                        </div>
                        <button onClick={() => navigate("/exams/new")} className="h-10 px-6 bg-[#5C67F2] text-white font-black rounded-xl text-xs tracking-widest uppercase shadow-md shadow-indigo-200 flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5" /> Create First Exam
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(exam => (
                            <motion.div
                                key={exam._id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#5C67F2]/20 transition-all px-6 py-4 cursor-pointer group"
                                onClick={() => navigate(`/exams/${exam._id}`)}
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <GraduationCap className="w-6 h-6 text-[#5C67F2]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="text-sm font-black text-slate-800">{exam.examName}</h3>
                                            {exam.examCode && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">{exam.examCode}</span>}
                                            {(() => { const ds = examDisplayStatus(exam); return <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-black uppercase ${ds.cls}`}>{ds.label}</span>; })()}
                                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-black uppercase ${PUBLISH_COLORS[exam.publishStatus] || PUBLISH_COLORS.Unpublished}`}>{exam.publishStatus}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold">
                                            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{exam.type}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{exam.term} · {exam.academicYear}</span>
                                            {exam.startDate && <span>{new Date(exam.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} → {exam.endDate ? new Date(exam.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={e => { e.stopPropagation(); navigate(`/exams/${exam._id}/settings`); }} title="Exam settings" className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-[#5C67F2] hover:bg-indigo-50 hover:text-[#5C67F2] text-slate-300 transition-all">
                                            <Settings className="w-4 h-4" />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); navigate(`/exams/edit/${exam._id}`); }} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-[#5C67F2] hover:bg-indigo-50 hover:text-[#5C67F2] text-slate-300 transition-all">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setDeleteConfirm(exam._id)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 hover:text-red-400 text-slate-300 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {deleteConfirm === exam._id && (
                                    <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-400" />
                                            <p className="text-xs font-bold text-red-600">Delete <span className="font-black">{exam.examName}</span>? This cannot be undone.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setDeleteConfirm(null)} className="h-8 px-4 text-xs font-bold text-slate-400 bg-white border border-gray-200 rounded-lg">Cancel</button>
                                            <button onClick={() => deleteMutation.mutate(exam._id)} disabled={deleteMutation.isPending} className="h-8 px-4 text-xs font-black text-white bg-red-500 hover:bg-red-600 rounded-lg flex items-center gap-1.5">
                                                {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">{editingExam ? "Edit Exam" : "Create New Exam"}</h2>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">Fill in the exam details below.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all">
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="px-8 py-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Exam Name *</label>
                                        <input value={form.examName} onChange={e => setForm(f => ({ ...f, examName: e.target.value }))} placeholder="e.g. End of Term 1 Examination" className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Exam Code</label>
                                        <input value={form.examCode} onChange={e => setForm(f => ({ ...f, examCode: e.target.value }))} placeholder="e.g. EXAM-2026-T1" className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-200" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Academic Year</label>
                                        <div className="w-full h-11 px-4 border border-gray-100 rounded-xl text-sm font-bold text-slate-600 bg-slate-50 flex items-center">
                                            {form.academicYear || "—"}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Term</label>
                                        {currentPeriod ? (
                                            <div className="w-full h-11 px-4 border border-emerald-200 rounded-xl text-sm font-black text-emerald-700 bg-emerald-50 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block flex-shrink-0" />
                                                {currentPeriod.label} ({currentPeriod.academicYear})
                                            </div>
                                        ) : (
                                            <div className="w-full h-11 px-4 border border-amber-200 rounded-xl text-sm font-bold text-amber-600 bg-amber-50 flex items-center gap-2">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                No active term set
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Exam Type</label>
                                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                            {["End Term", "Mid Term", "CAT", "Mock", "KCSE", "KCPE", "Assignment", "Practical"].map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mode</label>
                                        <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                            {["Regular", "Online", "Hybrid"].map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Class</label>
                                        <select
                                            value={form.classLevel}
                                            onChange={e => setForm(f => ({ ...f, classLevel: e.target.value }))}
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]"
                                        >
                                            <option value="">All Classes</option>
                                            {classes.map((c: any) => (
                                                <option key={c._id} value={c.levelName || c.name || c._id}>
                                                    {c.levelName || c.name || "—"}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date *</label>
                                        <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">End Date *</label>
                                        <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                                        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                            {["Active", "Draft", "Archived"].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Publish Status</label>
                                        <select value={form.publishStatus} onChange={e => setForm(f => ({ ...f, publishStatus: e.target.value as any }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                            {["Published", "Unpublished"].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Remarks</label>
                                    <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={3} placeholder="Optional notes or instructions..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-200 resize-none" />
                                </div>
                            </div>
                            <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-end gap-3">
                                <button onClick={() => setShowModal(false)} className="h-11 px-6 bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold rounded-full transition-all text-xs uppercase tracking-wider">Cancel</button>
                                <button onClick={handleSubmit} disabled={isPending} className="h-11 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-wider">
                                    {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle className="w-4 h-4" /> {editingExam ? "Update Exam" : "Save Exam"}</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
