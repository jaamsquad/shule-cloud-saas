import { useState } from "react";
import { Home, Plus, Check, X, Loader2, Calendar, ChevronRight, Settings, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyYear = { year: "", name: "", startDate: "", endDate: "" };
const emptyTerm = { academicYearId: "", name: "", termNumber: "1", startDate: "", endDate: "" };

export default function AcademicYearsPage() {
    const qc = useQueryClient();
    const [showYearModal, setShowYearModal] = useState(false);
    const [showTermModal, setShowTermModal] = useState(false);
    const [yearForm, setYearForm] = useState(emptyYear);
    const [termForm, setTermForm] = useState(emptyTerm);
    const [editYearId, setEditYearId] = useState<string | null>(null);
    const [editTermId, setEditTermId] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<any>(null);

    const { data: years = [], isLoading } = useQuery({ queryKey: ["v2_academic_years"], queryFn: async () => { const r = await api.get("/v2/academic-years"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: terms = [] } = useQuery({ queryKey: ["v2_terms", selectedYear?._id], queryFn: async () => { if (!selectedYear) return []; const r = await api.get(`/v2/terms?academicYearId=${selectedYear._id}`); return Array.isArray(r.data) ? r.data : []; }, enabled: !!selectedYear });

    const yearMut = useMutation({
        mutationFn: (p: any) => editYearId ? api.patch(`/v2/academic-years/${editYearId}`, p) : api.post("/v2/academic-years", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["v2_academic_years"] }); toast.success(editYearId ? "Updated" : "Academic year created"); setShowYearModal(false); setYearForm(emptyYear); setEditYearId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const termMut = useMutation({
        mutationFn: (p: any) => editTermId ? api.patch(`/v2/terms/${editTermId}`, p) : api.post("/v2/terms", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["v2_terms"] }); toast.success(editTermId ? "Updated" : "Term created"); setShowTermModal(false); setTermForm(emptyTerm); setEditTermId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const setActiveMut = useMutation({
        mutationFn: ({ id, type }: { id: string; type: "year" | "term" }) =>
            type === "year" ? api.patch(`/v2/academic-years/${id}`, { isActive: true }) : api.patch(`/v2/terms/${id}`, { isActive: true }),
        onSuccess: (_, { type }) => { qc.invalidateQueries({ queryKey: [type === "year" ? "v2_academic_years" : "v2_terms"] }); toast.success("Set as active"); },
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academic System</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Academic Years & Terms</span>
                </div>
                <button onClick={() => { setEditYearId(null); setYearForm(emptyYear); setShowYearModal(true); }} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> New Academic Year
                </button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Calendar className="w-7 h-7 text-[#5C67F2]" />Academic Years & Terms</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Manage academic years and their terms. Every exam and enrollment must belong to a year/term.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Academic Years */}
                    <div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Academic Years ({years.length})</h3>
                        {isLoading ? <div className="flex items-center justify-center h-32 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" />Loading...</div>
                        : years.length === 0 ? <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 h-32 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs font-bold uppercase"><Calendar className="w-8 h-8" />No academic years yet</div>
                        : years.map((y: any) => (
                            <div key={y._id} onClick={() => setSelectedYear(y === selectedYear ? null : y)} className={`bg-white rounded-[1.5rem] border-2 p-5 mb-3 cursor-pointer transition-all hover:shadow-md ${selectedYear?._id === y._id ? "border-[#5C67F2] bg-indigo-50/20" : y.isActive ? "border-emerald-200 bg-emerald-50/10" : "border-slate-100 hover:border-slate-200"}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-slate-800 text-lg">{y.year}</p>
                                            {y.isActive && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded-full">Active</span>}
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold">{y.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!y.isActive && <button onClick={e => { e.stopPropagation(); setActiveMut.mutate({ id: y._id, type: "year" }); }} className="h-7 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase rounded-xl transition-colors">Set Active</button>}
                                        <button onClick={e => { e.stopPropagation(); setEditYearId(y._id); setYearForm({ year: String(y.year), name: y.name, startDate: y.startDate || "", endDate: y.endDate || "" }); setShowYearModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedYear?._id === y._id ? "rotate-90" : ""}`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Terms for selected year */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                {selectedYear ? `Terms for ${selectedYear.year} (${terms.length})` : "Select a year to manage terms"}
                            </h3>
                            {selectedYear && (
                                <button onClick={() => { setEditTermId(null); setTermForm({ ...emptyTerm, academicYearId: selectedYear._id }); setShowTermModal(true); }} className="h-8 px-4 bg-indigo-50 hover:bg-indigo-100 text-[#5C67F2] border border-indigo-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1 transition-colors">
                                    <Plus className="w-3 h-3" /> Add Term
                                </button>
                            )}
                        </div>
                        {!selectedYear ? (
                            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 h-32 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs font-bold uppercase"><Settings className="w-8 h-8" />Click a year to see its terms</div>
                        ) : terms.length === 0 ? (
                            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 h-32 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs font-bold uppercase"><Calendar className="w-8 h-8" />No terms yet — click Add Term</div>
                        ) : terms.map((t: any) => (
                            <div key={t._id} className={`bg-white rounded-[1.5rem] border-2 p-5 mb-3 transition-all ${t.isActive ? "border-emerald-200 bg-emerald-50/10" : "border-slate-100"}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-slate-800">{t.name}</p>
                                            {t.isActive && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded-full">Active</span>}
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Term {t.termNumber} · {t.startDate || "—"} to {t.endDate || "—"}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!t.isActive && <button onClick={() => setActiveMut.mutate({ id: t._id, type: "term" })} className="h-7 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase rounded-xl">Set Active</button>}
                                        <button onClick={() => { setEditTermId(t._id); setTermForm({ academicYearId: t.academicYearId, name: t.name, termNumber: String(t.termNumber), startDate: t.startDate || "", endDate: t.endDate || "" }); setShowTermModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Year Modal */}
            {showYearModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-md w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-black text-slate-900 uppercase">{editYearId ? "Edit" : "New"} Academic Year</h3><button onClick={() => setShowYearModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>
                            <div className="space-y-5">
                                {[{ label: "Year (e.g. 2026)*", field: "year", type: "number" }, { label: "Name (e.g. Academic Year 2026)", field: "name" }, { label: "Start Date", field: "startDate", type: "date" }, { label: "End Date", field: "endDate", type: "date" }].map(f => (
                                    <div key={f.field} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type={f.type || "text"} value={(yearForm as any)[f.field]} onChange={e => setYearForm({ ...yearForm, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowYearModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!yearForm.year) { toast.error("Year is required"); return; } yearMut.mutate({ ...yearForm, year: Number(yearForm.year) }); }} disabled={yearMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {yearMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editYearId ? "Save" : "Create Year"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Term Modal */}
            {showTermModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-md w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-black text-slate-900 uppercase">{editTermId ? "Edit" : "Add"} Term</h3><button onClick={() => setShowTermModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>
                            <div className="space-y-5">
                                {[{ label: "Term Name (e.g. Term 1)*", field: "name" }, { label: "Term Number", field: "termNumber", type: "number" }, { label: "Start Date", field: "startDate", type: "date" }, { label: "End Date", field: "endDate", type: "date" }].map(f => (
                                    <div key={f.field} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type={f.type || "text"} value={(termForm as any)[f.field]} onChange={e => setTermForm({ ...termForm, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowTermModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!termForm.name) { toast.error("Term name is required"); return; } termMut.mutate({ ...termForm, academicYearId: termForm.academicYearId || selectedYear?._id }); }} disabled={termMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {termMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editTermId ? "Save" : "Add Term"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
