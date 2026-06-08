import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, Search, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyForm = {
    name: "", sku: "", description: "", categoryId: "", categoryName: "",
    price: "", costPrice: "", stock: "", taxId: "", taxName: "", taxRate: "",
    isActive: true,
};

export default function StoreProducts() {
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: products = [], isLoading } = useQuery({
        queryKey: ["pos_products"],
        queryFn: async () => {
            const r = await api.get("/pos/products");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: categories = [] } = useQuery({
        queryKey: ["pos_categories"],
        queryFn: async () => {
            const r = await api.get("/pos/categories");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: taxes = [] } = useQuery({
        queryKey: ["pos_taxes"],
        queryFn: async () => {
            const r = await api.get("/pos/taxes");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const saveMutation = useMutation({
        mutationFn: (payload: any) => editId
            ? api.patch(`/pos/products/${editId}`, payload)
            : api.post("/pos/products", payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pos_products"] });
            toast.success(editId ? "Product updated" : "Product created");
            setShowModal(false); setForm(emptyForm); setEditId(null);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/pos/products/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos_products"] }); toast.success("Product deleted"); setConfirmDelete(null); },
        onError: () => toast.error("Failed to delete"),
    });

    const handleSubmit = () => {
        if (!form.name.trim()) { toast.error("Product name required"); return; }
        if (!form.price || Number(form.price) <= 0) { toast.error("Valid price required"); return; }

        const selectedTax = taxes.find((t: any) => t._id === form.taxId);
        const selectedCat = categories.find((c: any) => c._id === form.categoryId);

        saveMutation.mutate({
            name: form.name.trim(),
            sku: form.sku.trim(),
            description: form.description.trim(),
            categoryId: form.categoryId,
            categoryName: selectedCat?.name || "",
            price: Number(form.price),
            costPrice: Number(form.costPrice) || 0,
            stock: Number(form.stock) || 0,
            taxId: form.taxId,
            taxName: selectedTax?.name || "",
            taxRate: Number(selectedTax?.rate) || 0,
            isActive: form.isActive,
        });
    };

    const openEdit = (p: any) => {
        setEditId(p._id);
        setForm({
            name: p.name, sku: p.sku || "", description: p.description || "",
            categoryId: p.categoryId || "", categoryName: p.categoryName || "",
            price: String(p.price), costPrice: String(p.costPrice || ""),
            stock: String(p.stock), taxId: p.taxId || "",
            taxName: p.taxName || "", taxRate: String(p.taxRate || ""),
            isActive: p.isActive !== false,
        });
        setShowModal(true);
    };

    const filtered = products.filter((p: any) =>
        (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.sku || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Online Store & POS</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Products</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(emptyForm); setShowModal(true); }}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> Add Product
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Products</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Manage your store product catalogue</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
                        className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                </div>

                {/* Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase">
                            <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading products...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase">
                            <Package className="w-8 h-8 opacity-20" />
                            {search ? "No products match your search" : "No products yet — click Add Product"}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-4">Product</th>
                                        <th className="py-4 px-4">SKU</th>
                                        <th className="py-4 px-4">Category</th>
                                        <th className="py-4 px-4 text-right">Price (KSh)</th>
                                        <th className="py-4 px-4 text-right">Stock</th>
                                        <th className="py-4 px-4 text-center">Tax</th>
                                        <th className="py-4 px-4 text-center">Status</th>
                                        <th className="py-4 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((p: any) => (
                                        <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <p className="font-black text-slate-800">{p.name}</p>
                                                {p.description && <p className="text-[9px] text-slate-400 font-medium truncate max-w-[180px]">{p.description}</p>}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{p.sku || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{p.categoryName || "—"}</td>
                                            <td className="py-3 px-4 text-right font-black text-slate-800">{Number(p.price || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right">
                                                <span className={`font-black ${Number(p.stock) <= 0 ? "text-rose-500" : Number(p.stock) <= 5 ? "text-amber-500" : "text-emerald-600"}`}>
                                                    {p.stock ?? 0}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-slate-500">{p.taxName ? `${p.taxName} (${p.taxRate}%)` : "—"}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${p.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                                    {p.isActive !== false ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 transition-colors">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    {confirmDelete === p._id ? (
                                                        <>
                                                            <button onClick={() => deleteMutation.mutate(p._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center">
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button onClick={() => setConfirmDelete(p._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-2xl w-full rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{editId ? "Edit Product" : "Add New Product"}</h3>
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(emptyForm); }} className="text-slate-400 hover:text-rose-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                {[
                                    { label: "Product Name*", field: "name", type: "text", placeholder: "e.g. Blue Pen" },
                                    { label: "SKU / Code", field: "sku", type: "text", placeholder: "e.g. PEN-001" },
                                    { label: "Selling Price (KSh)*", field: "price", type: "number", placeholder: "0" },
                                    { label: "Cost Price (KSh)", field: "costPrice", type: "number", placeholder: "0" },
                                    { label: "Stock Quantity", field: "stock", type: "number", placeholder: "0" },
                                ].map((f) => (
                                    <div key={f.field} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type={f.type} value={(form as any)[f.field]} onChange={(e) => setForm({ ...form, [f.field]: e.target.value })}
                                            placeholder={f.placeholder}
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Category</div>
                                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— None —</option>
                                        {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Tax Rate</div>
                                    <select value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— No Tax —</option>
                                        {taxes.map((t: any) => <option key={t._id} value={t._id}>{t.name} ({t.rate}%)</option>)}
                                    </select>
                                </div>
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Description</div>
                                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                                        placeholder="Optional product description..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Active / Visible in Store</span>
                                    <button onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                        className={`w-11 h-6 rounded-full transition-all relative ${form.isActive ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? "right-0.5" : "left-0.5"}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 mt-6">
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(emptyForm); }}
                                    className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleSubmit} disabled={saveMutation.isPending}
                                    className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editId ? "Save Changes" : "Create Product"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
