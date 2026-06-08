import { useState } from "react";
import { Home, Check, X, Loader2, ChevronRight, ArrowRight, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function PromotionWizard() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [fromYearId, setFromYearId] = useState("");
    const [fromClassId, setFromClassId] = useState("");
    const [fromStreamId, setFromStreamId] = useState("");
    const [toYearId, setToYearId] = useState("");
    const [toClassId, setToClassId] = useState("");
    const [toStreamId, setToStreamId] = useState("");
    const [preview, setPreview] = useState<any>(null);
    const [result, setResult] = useState<any>(null);

    const { data: years = [] } = useQuery({ queryKey: ["v2_academic_years"], queryFn: async () => { const r = await api.get("/v2/academic-years"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: classes = [] } = useQuery({ queryKey: ["v2_classes"], queryFn: async () => { const r = await api.get("/v2/classes"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: fromStreams = [] } = useQuery({ queryKey: ["v2_from_streams", fromClassId], queryFn: async () => { if (!fromClassId) return []; const r = await api.get(`/v2/streams?classId=${fromClassId}`); return Array.isArray(r.data) ? r.data : []; }, enabled: !!fromClassId });
    const { data: toStreams = [] } = useQuery({ queryKey: ["v2_to_streams", toClassId], queryFn: async () => { if (!toClassId) return []; const r = await api.get(`/v2/streams?classId=${toClassId}`); return Array.isArray(r.data) ? r.data : []; }, enabled: !!toClassId });

    const previewMut = useMutation({
        mutationFn: () => api.post("/v2/promotions/preview", { fromAcademicYearId: fromYearId, fromClassId, fromStreamId, toAcademicYearId: toYearId, toClassId, toStreamId }),
        onSuccess: (res) => { setPreview(res.data); setStep(2); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Preview failed"),
    });

    const promoteMut = useMutation({
        mutationFn: () => api.post("/v2/promotions", { fromAcademicYearId: fromYearId, fromClassId, fromStreamId, toAcademicYearId: toYearId, toClassId, toStreamId }),
        onSuccess: (res) => { setResult(res.data); setStep(3); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Promotion failed"),
    });

    const reset = () => { setStep(1); setFromYearId(""); setFromClassId(""); setFromStreamId(""); setToYearId(""); setToClassId(""); setToStreamId(""); setPreview(null); setResult(null); };

    const getYear = (id: string) => years.find((y: any) => y._id === id);
    const getClass = (id: string) => classes.find((c: any) => c._id === id);
    const getStream = (id: string, arr: any[]) => arr.find((s: any) => s._id === id);

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academic System</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Promotion Wizard</span>
                </div>
            </div>

            <div className="flex-1 max-w-3xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><ArrowRight className="w-7 h-7 text-[#5C67F2]" />Student Promotion Wizard</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Promote students to the next class/stream. Old records remain permanently intact.</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-8">
                    {[{ n: 1, label: "Configure" }, { n: 2, label: "Preview" }, { n: 3, label: "Complete" }].map((s, i) => (
                        <div key={s.n} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${step >= s.n ? "bg-[#5C67F2] text-white" : "bg-slate-100 text-slate-400"}`}>{step > s.n ? <Check className="w-4 h-4" /> : s.n}</div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${step === s.n ? "text-[#5C67F2]" : "text-slate-400"}`}>{s.label}</span>
                            {i < 2 && <div className={`flex-1 h-0.5 rounded-full mx-2 w-8 ${step > s.n ? "bg-[#5C67F2]" : "bg-slate-100"}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Configure */}
                {step === 1 && (
                    <div className="space-y-6">
                        {/* Critical warning */}
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Critical — Read Before Proceeding</p>
                                <p className="text-[10px] text-amber-700 font-bold mt-1">
                                    Promotion creates NEW enrollment records. Old class/stream records and exam marks are NEVER deleted or modified.
                                    A student promoted from Grade 1 East (2025) will still show Grade 1 results in their historical timeline forever.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* FROM */}
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Users className="w-3.5 h-3.5" />Promote FROM</p>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">From Year</div>
                                        <select value={fromYearId} onChange={e => { setFromYearId(e.target.value); setFromClassId(""); setFromStreamId(""); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-rose-400 text-xs font-bold text-slate-700">
                                            <option value="">— Select Year —</option>
                                            {years.map((y: any) => <option key={y._id} value={y._id}>{y.year}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">From Class</div>
                                        <select value={fromClassId} onChange={e => { setFromClassId(e.target.value); setFromStreamId(""); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-rose-400 text-xs font-bold text-slate-700">
                                            <option value="">— Select Class —</option>
                                            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    {fromClassId && (
                                        <div className="relative">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">From Stream</div>
                                            <select value={fromStreamId} onChange={e => setFromStreamId(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-rose-400 text-xs font-bold text-slate-700">
                                                <option value="">— Select Stream —</option>
                                                {fromStreams.map((s: any) => <option key={s._id} value={s._id}>{s.fullName || s.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* TO */}
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5" />Promote TO</p>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">To Year</div>
                                        <select value={toYearId} onChange={e => { setToYearId(e.target.value); setToClassId(""); setToStreamId(""); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-emerald-400 text-xs font-bold text-slate-700">
                                            <option value="">— Select Year —</option>
                                            {years.map((y: any) => <option key={y._id} value={y._id}>{y.year}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">To Class</div>
                                        <select value={toClassId} onChange={e => { setToClassId(e.target.value); setToStreamId(""); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-emerald-400 text-xs font-bold text-slate-700">
                                            <option value="">— Select Class —</option>
                                            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    {toClassId && (
                                        <div className="relative">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">To Stream</div>
                                            <select value={toStreamId} onChange={e => setToStreamId(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-emerald-400 text-xs font-bold text-slate-700">
                                                <option value="">— Select Stream —</option>
                                                {toStreams.map((s: any) => <option key={s._id} value={s._id}>{s.fullName || s.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button onClick={() => previewMut.mutate()} disabled={!fromYearId || !fromClassId || !fromStreamId || !toYearId || !toClassId || !toStreamId || previewMut.isPending}
                            className="w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                            {previewMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                            Preview Promotion
                        </button>
                    </div>
                )}

                {/* Step 2: Preview */}
                {step === 2 && preview && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Promotion Summary</h3>
                            <div className="flex items-center justify-center gap-6 mb-6">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-rose-500">{preview.fromClass}</p>
                                    <p className="text-sm font-bold text-rose-400">{preview.fromStream}</p>
                                </div>
                                <ArrowRight className="w-8 h-8 text-[#5C67F2]" />
                                <div className="text-center">
                                    <p className="text-2xl font-black text-emerald-600">{preview.toClass}</p>
                                    <p className="text-sm font-bold text-emerald-400">{preview.toStream}</p>
                                </div>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center mb-5">
                                <p className="text-3xl font-black text-[#5C67F2]">{preview.studentsToPromote}</p>
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Students will be promoted</p>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {(preview.students || []).map((s: any) => (
                                    <div key={s.studentId} className="flex items-center gap-3 py-2 border-b border-slate-50">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center font-black text-[#5C67F2] text-xs">{(s.name || "?")[0]}</div>
                                        <p className="text-xs font-black text-slate-700">{s.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-[10px] text-rose-700 font-bold">
                            ⚠️ This action will: Create {preview.studentsToPromote} new enrollment records. Mark old enrollments as "completed". All exam marks remain tied to old enrollments permanently.
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="flex-1 h-12 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">← Back</button>
                            <button onClick={() => promoteMut.mutate()} disabled={promoteMut.isPending}
                                className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all">
                                {promoteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Confirm Promotion
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Result */}
                {step === 3 && result && (
                    <div className="text-center space-y-5">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-200">
                            <CheckCircle2 className="w-11 h-11 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase">Promotion Complete!</h2>
                        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                            {[{ label: "Promoted", value: result.promoted, color: "text-emerald-600" }, { label: "Skipped", value: result.skipped, color: "text-amber-600" }, { label: "Total", value: result.total, color: "text-[#5C67F2]" }].map(s => (
                                <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">All historical records remain permanently intact.</p>
                        <button onClick={reset} className="h-11 px-8 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100">Do Another Promotion</button>
                    </div>
                )}
            </div>
        </div>
    );
}
