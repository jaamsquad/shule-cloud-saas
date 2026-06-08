import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, Percent } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const empty = { name: "", rate: "", description: "", isActive: true };

export default function ProductTax() {
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: taxes = [], isLoading } = useQuery({
        queryKey: ["pos_taxes"],
        queryFn: async () => {
            const r = await api.get("/pos/taxes");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const saveMutation = useMutation({
        mutationFn: (payload: any) => editId
            ? api.patch(`/pos/taxes/${editId}`, payload)
            : api.post("/pos/taxes", payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pos_taxes"] });
            toast.success(editId ? "Tax rate updated" : "Tax rate created");
            setForm(empty); setEditId(null);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/pos/taxes/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos_taxes"] }); toast.success("Tax rate deleted"); setConfirmDelete(null); },
        onError: () => toast.error("Failed to delete"),
    });

    const handleSubmit = () => {
        if (!form.name.trim()) { toast.error("Tax name is required"); return; }
        const rate = Number(form.rate);
        if (isNaN(rate) || rate < 0 || rate > 100) { toast.error("Rate must be between 0 and 100"); return; }
        saveMutation.mutate({ name: form.name.trim(), rate, description: form.description.trim(), isActive: form.isActive });
    };

    const startEdit = (tax: any) => {
        setEditId(tax._id);
        setForm({ name: tax.name, rate: String(tax.rate ?? ""), description: tax.description || "", isActive: tax.isActive !== false });
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Online Store & POS</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Product Tax</span>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Product Tax</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Define tax rates to apply to your products</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                    {/* Form */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7 relative">
                            <div className={`absolute -top-3 left-6 text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 uppercase ${editId ? "bg-amber-500" : "bg-[#5C67F2]"}`}>
                                {editId ? "Edit Tax Rate" : "Add Tax Rate"}
                            </div>
                            {editId && (
                                <button onClick={() => { setEditId(null); setForm(empty); }} className="absolute top-5 right-5 text-slate-300 hover:text-rose-400">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <div className="space-y-5 mt-2">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Name*</div>
                                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g. VAT, Zero-Rated..."
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Rate (%)*</div>
                                    <input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })}
                                        placeholder="e.g. 16" min="0" max="100" step="0.01"
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Description</div>
                                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        rows={2} placeholder="Optional..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Active</span>
                                    <button onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                        className={`w-11 h-6 rounded-full transition-all relative ${form.isActive ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? "right-0.5" : "left-0.5"}`} />
                                    </button>
                                </div>
                                <button onClick={handleSubmit} disabled={saveMutation.isPending}
                                    className="w-full h-11 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    {editId ? "Save Changes" : "Add Tax Rate"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="md:col-span-3 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{taxes.length} tax rates</p>
                        {isLoading ? (
                            <div className="bg-white rounded-[2rem] border border-slate-100 h-32 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase">
                                <Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" /> Loading...
                            </div>
                        ) : taxes.length === 0 ? (
                            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 h-32 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase">
                                <Percent className="w-6 h-6 opacity-30" /> No tax rates yet
                            </div>
                        ) : taxes.map((tax: any) => (
                            <div key={tax._id} className={`bg-white rounded-[1.5rem] border shadow-sm px-6 py-4 flex items-center justify-between gap-4 ${editId === tax._id ? "border-amber-200 bg-amber-50/20" : "border-slate-100"}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                                        <Percent className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase">{tax.name}</p>
                                        {tax.description && <p className="text-[9px] text-slate-400 font-medium">{tax.description}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-center">
                                        <p className="text-lg font-black text-amber-600">{tax.rate}%</p>
                                        <p className="text-[8px] text-slate-400 font-black uppercase">{tax.isActive !== false ? "Active" : "Inactive"}</p>
                                    </div>
                                    <button onClick={() => startEdit(tax)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 hover:border-amber-100 transition-colors">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    {confirmDelete === tax._id ? (
                                        <div className="flex gap-1">
                                            <button onClick={() => deleteMutation.mutate(tax._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center">
                                                {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setConfirmDelete(tax._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 hover:border-rose-100 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
