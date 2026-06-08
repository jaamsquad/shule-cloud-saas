import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const empty = { name: "", description: "", isActive: true };

export default function ProductCategories() {
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: categories = [], isLoading } = useQuery({
        queryKey: ["pos_categories"],
        queryFn: async () => {
            const r = await api.get("/pos/categories");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const saveMutation = useMutation({
        mutationFn: (payload: any) => editId
            ? api.patch(`/pos/categories/${editId}`, payload)
            : api.post("/pos/categories", payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pos_categories"] });
            toast.success(editId ? "Category updated" : "Category created");
            setForm(empty); setEditId(null);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/pos/categories/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos_categories"] }); toast.success("Category deleted"); setConfirmDelete(null); },
        onError: () => toast.error("Failed to delete"),
    });

    const handleSubmit = () => {
        if (!form.name.trim()) { toast.error("Category name is required"); return; }
        saveMutation.mutate({ name: form.name.trim(), description: form.description.trim(), isActive: form.isActive });
    };

    const startEdit = (cat: any) => {
        setEditId(cat._id);
        setForm({ name: cat.name, description: cat.description || "", isActive: cat.isActive !== false });
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Online Store & POS</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Product Categories</span>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Product Categories</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Organise your products into categories</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                    {/* Form */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7 relative">
                            <div className={`absolute -top-3 left-6 text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 uppercase ${editId ? "bg-amber-500" : "bg-[#5C67F2]"}`}>
                                {editId ? "Edit Category" : "Add Category"}
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
                                        placeholder="e.g. Stationery, Uniforms..."
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
                                    {editId ? "Save Changes" : "Add Category"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="md:col-span-3 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{categories.length} categories</p>
                        {isLoading ? (
                            <div className="bg-white rounded-[2rem] border border-slate-100 h-32 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase">
                                <Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" /> Loading...
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 h-32 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase">
                                <Tag className="w-6 h-6 opacity-30" /> No categories yet
                            </div>
                        ) : categories.map((cat: any) => (
                            <div key={cat._id} className={`bg-white rounded-[1.5rem] border shadow-sm px-6 py-4 flex items-center justify-between gap-4 ${editId === cat._id ? "border-amber-200 bg-amber-50/20" : "border-slate-100"}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <Tag className="w-4 h-4 text-[#5C67F2]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-800 uppercase">{cat.name}</p>
                                        {cat.description && <p className="text-[9px] text-slate-400 font-medium truncate">{cat.description}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${cat.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                        {cat.isActive !== false ? "Active" : "Inactive"}
                                    </span>
                                    <button onClick={() => startEdit(cat)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 hover:border-amber-100 transition-colors">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    {confirmDelete === cat._id ? (
                                        <div className="flex gap-1">
                                            <button onClick={() => deleteMutation.mutate(cat._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center">
                                                {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setConfirmDelete(cat._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 hover:border-rose-100 transition-colors">
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
