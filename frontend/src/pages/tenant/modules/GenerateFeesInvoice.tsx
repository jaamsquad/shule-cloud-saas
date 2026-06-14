import { useState, useEffect } from "react";
import { 
    Home, Search, Calendar, Landmark, User, Users, 
    ArrowRight, Printer, Loader2, Check, AlertCircle,
    ChevronDown, CreditCard, Building2, Receipt, FileText,
    Eye, ShieldAlert, RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function GenerateFeesInvoice() {
    const [academicYearId, setAcademicYearId] = useState("");
    const [semesterId, setSemesterId] = useState("");
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [fineAmount, setFineAmount] = useState("200");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dupInfo, setDupInfo] = useState<{ totalStudents: number; existing: number } | null>(null);

    const queryClient = useQueryClient();

    // Fetch periods
    // Academic years & terms come from the academic system (v2), which is where
    // they are actually created. (The legacy "periods" collection is only filled
    // when a term is marked current, so it can't be relied on here.)
    const { data: academicYears = [] } = useQuery({
        queryKey: ["v2_academic_years"],
        queryFn: async () => { const r = await api.get("/v2/academic-years"); return Array.isArray(r.data) ? r.data : (r.data?.data || []); },
    });
    const { data: allTerms = [] } = useQuery({
        queryKey: ["v2_terms"],
        queryFn: async () => { const r = await api.get("/v2/terms"); return Array.isArray(r.data) ? r.data : (r.data?.data || []); },
    });

    const termsForYear = allTerms.filter((t: any) => String(t.academicYearId) === String(academicYearId));

    // Default to the active (or first) year and its active/first term.
    useEffect(() => {
        if (!academicYearId && academicYears.length > 0) {
            const y = academicYears.find((y: any) => y.isActive) || academicYears[0];
            setAcademicYearId(String(y._id));
        }
    }, [academicYears, academicYearId]);

    useEffect(() => {
        if (academicYearId && termsForYear.length > 0 && !termsForYear.some((t: any) => String(t._id) === String(semesterId))) {
            const t = termsForYear.find((t: any) => t.isActive) || termsForYear[0];
            setSemesterId(String(t._id));
        }
    }, [academicYearId, allTerms]); // eslint-disable-line

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ["academics_classes"],
        queryFn: async () => {
            const r = await api.get("/academics/classes");
            return r.data;
        }
    });

    // Fetch invoice jobs
    const { data: jobsRes, isLoading: loadingJobs, refetch: refetchJobs } = useQuery({
        queryKey: ["invoice_generation_jobs"],
        queryFn: async () => {
            const r = await api.get("/schools/default/fees/invoice-jobs");
            return r.data;
        },
        refetchInterval: 3000 // Poll every 3 seconds for active job progress!
    });

    const jobs = jobsRes?.data || [];

    const handleToggleClass = (classId: string) => {
        setSelectedClasses(prev => 
            prev.includes(classId) 
            ? prev.filter(id => id !== classId)
            : [...prev, classId]
        );
    };

    const handleSelectAllClasses = () => {
        if (selectedClasses.length === classes.length) {
            setSelectedClasses([]);
        } else {
            setSelectedClasses(classes.map((c: any) => c.name || c.levelName));
        }
    };

    const runJob = async (mode: "skip" | "overwrite") => {
        setIsSubmitting(true);
        setDupInfo(null);
        try {
            await api.post("/schools/default/fees/invoice-jobs", {
                academic_year_id: academicYearId, semester_id: semesterId,
                class_ids: selectedClasses, due_date: dueDate, fine_amount: parseFloat(fineAmount) || 0, mode,
            });
            toast.success(`Invoice generation started (${mode === "overwrite" ? "rewriting duplicates" : "skipping duplicates"})`);
            setSelectedClasses([]);
            setTimeout(refetchJobs, 800);
        } catch (err: any) {
            toast.error(err.response?.data?.errors?.[0]?.message || "Failed to start generation job");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTriggerGenerationJob = async () => {
        if (selectedClasses.length === 0) { toast.error("Please select at least one class"); return; }
        setIsSubmitting(true);
        try {
            // Pre-check: any students already invoiced for this term?
            const r = await api.post("/schools/default/fees/invoice-jobs/precheck", {
                academic_year_id: academicYearId, semester_id: semesterId, class_ids: selectedClasses,
            });
            const info = r.data?.data || { totalStudents: 0, existing: 0 };
            setIsSubmitting(false);
            if (info.existing > 0) { setDupInfo(info); return; }   // show skip/overwrite modal
            await runJob("skip");
        } catch (err: any) {
            setIsSubmitting(false);
            toast.error(err.response?.data?.errors?.[0]?.message || "Failed to check existing invoices");
        }
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Fees</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Generate Fees Invoice</span>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10">
                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        Bulk Invoice Generator
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Deploy background processing jobs to generate term invoices and notify parents</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Panel: Generation Job configuration */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#5C67F2] to-amber-500" />
                            
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                Configure New Generation Run
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Academic Year */}
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Academic Year*</div>
                                    {academicYears.length === 0 ? (
                                        <a href="/academics/periods" className="flex items-center justify-between w-full h-11 px-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
                                            No academic year — create one <span className="underline">in Learning Periods →</span>
                                        </a>
                                    ) : (
                                        <select value={academicYearId} onChange={e => { setAcademicYearId(e.target.value); setSemesterId(""); }}
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                                            {academicYears.map((y: any) => (
                                                <option key={y._id} value={y._id}>{y.name || `Academic Year ${y.year}`}{y.isActive ? " (Current)" : ""}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Semester */}
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Semester / Term*</div>
                                    <select value={semesterId} onChange={e => setSemesterId(e.target.value)} disabled={termsForYear.length === 0}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] disabled:bg-slate-100 disabled:text-slate-400">
                                        {termsForYear.length === 0 ? (
                                            <option value="">No terms for this year</option>
                                        ) : termsForYear.map((t: any) => (
                                            <option key={t._id} value={t._id}>{t.name}{t.isActive ? " (Current)" : ""}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Due Date */}
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Invoice Due Date*</div>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                                    />
                                </div>

                                {/* Fine Amount */}
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Overdue Fine (KSh)</div>
                                    <input
                                        type="number"
                                        value={fineAmount}
                                        onChange={(e) => setFineAmount(e.target.value)}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                                        placeholder="200"
                                    />
                                </div>
                            </div>

                            {/* Class Selection Pills/Grid */}
                            <div className="space-y-3 mb-8">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Target Classes ({selectedClasses.length} selected)*</p>
                                    <button 
                                        onClick={handleSelectAllClasses}
                                        className="text-[9px] font-black text-[#5C67F2] uppercase tracking-widest hover:underline"
                                    >
                                        {selectedClasses.length === classes.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>

                                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    {classes.map((c: any) => {
                                        const label = c.name || c.levelName;
                                        const isSelected = selectedClasses.includes(label);
                                        return (
                                            <label key={c._id} onClick={() => handleToggleClass(label)}
                                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-xs font-bold uppercase transition-colors ${isSelected ? "bg-indigo-50/50 text-[#5C67F2]" : "text-slate-600 hover:bg-slate-50"}`}>
                                                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-[#5C67F2] border-[#5C67F2] text-white" : "border-slate-300"}`}>
                                                    {isSelected && <Check className="w-3 h-3" />}
                                                </span>
                                                {label}
                                            </label>
                                        );
                                    })}
                                    {classes.length === 0 && <p className="px-4 py-6 text-center text-[10px] text-slate-400 uppercase font-bold">No classes found</p>}
                                </div>
                            </div>

                            {/* Trigger Job Action */}
                            <button
                                onClick={handleTriggerGenerationJob}
                                disabled={isSubmitting || selectedClasses.length === 0}
                                className="w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                Start Invoice Generation Job
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Active/Recent Background jobs status */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col h-full min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    Background Job Logs
                                </h3>
                                <button 
                                    onClick={() => refetchJobs()}
                                    className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="space-y-6 flex-1 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                                {jobs.map((job: any) => (
                                    <div key={job.id} className="p-4 border border-slate-50 hover:border-slate-100 rounded-2xl bg-slate-50/50 space-y-3">
                                        <div className="flex items-center justify-between text-[9px] font-black uppercase">
                                            <span className="text-slate-500">Job: {job.id.slice(-6).toUpperCase()}</span>
                                            <span className={`px-2 py-0.5 rounded-full border ${
                                                job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600 border-emerald-250' :
                                                job.status === 'RUNNING' ? 'bg-indigo-100 text-[#5C67F2] border-indigo-200 animate-pulse' :
                                                'bg-slate-105 text-slate-600 border-slate-200'
                                            }`}>
                                                {job.status}
                                            </span>
                                        </div>

                                        <div className="text-[10px] font-bold text-slate-700 uppercase space-y-1">
                                            <p>Period: {job.semester_id} ({job.academic_year_id})</p>
                                            <p>Classes: {job.class_ids.join(", ")}</p>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[9px] font-black text-slate-400">
                                                <span>Progress</span>
                                                <span>{job.progress}% ({job.processed_count}/{job.total_count})</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-300 ${job.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-[#5C67F2]'}`}
                                                    style={{ width: `${job.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {job.status === 'COMPLETED' && (
                                            <div className="text-[8px] font-black text-emerald-600 uppercase flex items-center justify-between pt-1 border-t border-slate-200/40">
                                                <span>Duration: {job.duration_ms ? `${(job.duration_ms / 1000).toFixed(1)}s` : 'N/A'}</span>
                                                <span>{job.total_count} Invoices Generated</span>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {jobs.length === 0 && (
                                    <div className="text-center py-16 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        No generation runs recorded
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Duplicate handling modal */}
            {dupInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDupInfo(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-7 h-7 text-amber-500" /></div>
                        <h3 className="text-lg font-black text-slate-800">Existing invoices found</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-6"><b className="text-slate-700">{dupInfo.existing}</b> of {dupInfo.totalStudents} students already have an invoice for this term. How should we handle them?</p>
                        <div className="space-y-2.5">
                            <button onClick={() => runJob("skip")} disabled={isSubmitting} className="w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl">Skip existing — invoice only the rest</button>
                            <button onClick={() => runJob("overwrite")} disabled={isSubmitting} className="w-full h-12 bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-xs uppercase tracking-widest rounded-xl">Rewrite — replace existing invoices</button>
                            <button onClick={() => setDupInfo(null)} className="w-full h-10 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
