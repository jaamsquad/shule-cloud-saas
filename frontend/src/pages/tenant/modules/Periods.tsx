/**
 * Academic Years & Terms — set a term's dates, see them in one table. Kept deliberately
 * simple (one form, one table — no wizards, no tabs): type a year (existing or new), pick
 * a term, set its dates, Save. The year is created automatically the first time a term is
 * saved for it. Which term is "current" is still computed automatically from these dates
 * elsewhere in the app (cbcTerm.ts) — this page is just where the dates are set.
 *
 * Accessible from BOTH:
 *   - General Settings → Learning Periods  (/academics/periods)
 *   - Academic System → Academic Years & Terms  (/academic-system/years)
 */
import { useState } from "react";
import { Calendar, Check, Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const TERM_NUMBERS = [1, 2, 3, 4];
const termLabel = (n: number | string) => `Term ${n}`;
const emptyForm = { year: "", termNumber: "1", startDate: "", endDate: "" };

export default function Periods() {
    const qc = useQueryClient();
    const [form, setForm] = useState({ ...emptyForm });
    const [editTermId, setEditTermId] = useState<string | null>(null);

    const { data: years = [] } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });
    const { data: allTerms = [], isLoading } = useQuery<any[]>({
        queryKey: ["v2_all_terms"],
        queryFn: async () => (await api.get("/v2/terms")).data || [],
    });

    // One row per term, newest year first, Term 1/2/3/4 in order within a year.
    const rows = [...allTerms].sort((a: any, b: any) =>
        Number(b.academicYear || 0) - Number(a.academicYear || 0) || Number(a.termNumber || 1) - Number(b.termNumber || 1));

    const resetForm = () => { setForm({ ...emptyForm }); setEditTermId(null); };

    const save = useMutation({
        mutationFn: async () => {
            const yearNum = Number(form.year);
            let year = years.find((y: any) => Number(y.year) === yearNum);
            if (!year) {
                const r = await api.post("/v2/academic-years", { year: yearNum, name: `Academic Year ${yearNum}` });
                year = { _id: r.data?.id || r.data?._id };
            }
            const payload = { academicYearId: year._id, name: termLabel(form.termNumber), termNumber: Number(form.termNumber), startDate: form.startDate, endDate: form.endDate };
            if (editTermId) return api.patch(`/v2/terms/${editTermId}`, payload);
            return api.post("/v2/terms", payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["v2_academic_years"] });
            qc.invalidateQueries({ queryKey: ["v2_all_terms"] });
            toast.success(editTermId ? "Term dates updated" : "Term dates saved");
            resetForm();
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const deleteTerm = useMutation({
        mutationFn: (id: string) => api.delete(`/v2/terms/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["v2_all_terms"] }); toast.success("Term removed"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to delete"),
    });

    const startEdit = (t: any) => {
        setEditTermId(t._id);
        setForm({ year: String(t.academicYear || ""), termNumber: String(t.termNumber || 1), startDate: t.startDate || "", endDate: t.endDate || "" });
    };

    const handleSave = () => {
        if (!form.year) { toast.error("Academic year is required"); return; }
        if (!form.termNumber) { toast.error("Term is required"); return; }
        if (!form.startDate || !form.endDate) { toast.error("Start and end dates are required"); return; }
        save.mutate();
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div>
                    <h1 className="text-base font-black text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#5C67F2]" /> Learning Periods
                    </h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Academic years & term dates</p>
                </div>
                {editTermId && (
                    <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-lg transition-all">
                        <Plus className="w-4 h-4" /> New Term Dates
                    </button>
                )}
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-6 space-y-5">
                {/* ── Set Term Dates ─────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-black text-gray-800 mb-4">{editTermId ? "Edit Term Dates" : "Set Term Dates"}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Academic Year</label>
                            <input type="number" list="academic-years-list" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                                placeholder="e.g. 2026"
                                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700" />
                            <datalist id="academic-years-list">
                                {years.map((y: any) => <option key={y._id} value={y.year} />)}
                            </datalist>
                            <p className="text-[10px] text-gray-400 mt-1">Pick an existing year or type a new one — it's created automatically.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Term</label>
                            <select value={form.termNumber} onChange={e => setForm(f => ({ ...f, termNumber: e.target.value }))}
                                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700">
                                {TERM_NUMBERS.map(n => <option key={n} value={n}>{termLabel(n)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
                            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
                            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-5">
                        {editTermId && <button onClick={resetForm} className="h-10 px-4 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50">Cancel</button>}
                        <button onClick={handleSave} disabled={save.isPending}
                            className="h-10 px-6 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50">
                            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                        </button>
                    </div>
                </div>

                {/* ── Term Dates table ────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-black text-gray-800">Term Dates</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-wide bg-gray-50">
                                    <th className="px-5 py-3">Academic Year</th>
                                    <th className="px-5 py-3">Term</th>
                                    <th className="px-5 py-3">Start Date</th>
                                    <th className="px-5 py-3">End Date</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="py-10 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-sm">No records found</td></tr>
                                ) : rows.map((t: any) => (
                                    <tr key={t._id} className={t.isActive ? "bg-emerald-50/50" : "hover:bg-gray-50/50"}>
                                        <td className="px-5 py-3 font-bold text-gray-700">{t.academicYear}</td>
                                        <td className="px-5 py-3 font-bold text-gray-700">
                                            {t.name}
                                            {t.isActive && <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded-full align-middle">Active</span>}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 font-medium">{t.startDate || "—"}</td>
                                        <td className="px-5 py-3 text-gray-500 font-medium">{t.endDate || "—"}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => startEdit(t)} className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-amber-50 text-gray-400 hover:text-amber-500 flex items-center justify-center border border-gray-100">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => { if (confirm(`Delete "${t.name} ${t.academicYear}"?`)) deleteTerm.mutate(t._id); }}
                                                    className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center border border-gray-100">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
