import { useState } from "react";
import { Home, Plus, Search, Pencil, Trash2, Check, X, Loader2, BookOpen, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyForm = {
    title: "", author: "", isbn: "", categoryId: "", categoryName: "",
    publisher: "", publishYear: "", totalCopies: "1", shelfLocation: "",
    language: "English", description: "", isActive: true,
};

export default function LibraryBooks() {
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: books = [], isLoading, refetch } = useQuery({
        queryKey: ["library_books"],
        queryFn: async () => {
            const r = await api.get("/library/books");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: categories = [] } = useQuery({
        queryKey: ["library_categories"],
        queryFn: async () => {
            const r = await api.get("/library/categories");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const saveMutation = useMutation({
        mutationFn: (payload: any) => editId
            ? api.patch(`/library/books/${editId}`, payload)
            : api.post("/library/books", payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["library_books"] });
            qc.invalidateQueries({ queryKey: ["library_stats"] });
            toast.success(editId ? "Book updated" : "Book added to catalog");
            setShowModal(false); setForm(emptyForm); setEditId(null);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/library/books/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["library_books"] }); toast.success("Book removed"); setConfirmDelete(null); },
        onError: () => toast.error("Failed to delete"),
    });

    const handleSubmit = () => {
        if (!form.title.trim()) { toast.error("Title is required"); return; }
        if (Number(form.totalCopies) < 1) { toast.error("At least 1 copy required"); return; }
        const cat = categories.find((c: any) => c._id === form.categoryId);
        saveMutation.mutate({
            title: form.title.trim(), author: form.author.trim(), isbn: form.isbn.trim(),
            categoryId: form.categoryId, categoryName: cat?.name || "",
            publisher: form.publisher.trim(), publishYear: Number(form.publishYear) || null,
            totalCopies: Number(form.totalCopies),
            shelfLocation: form.shelfLocation.trim(), language: form.language,
            description: form.description.trim(), isActive: form.isActive,
        });
    };

    const openEdit = (b: any) => {
        setEditId(b._id);
        setForm({ title: b.title, author: b.author || "", isbn: b.isbn || "", categoryId: b.categoryId || "", categoryName: b.categoryName || "", publisher: b.publisher || "", publishYear: String(b.publishYear || ""), totalCopies: String(b.totalCopies || 1), shelfLocation: b.shelfLocation || "", language: b.language || "English", description: b.description || "", isActive: b.isActive !== false });
        setShowModal(true);
    };

    const filtered = books.filter((b: any) =>
        (b.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.author || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.isbn || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Library</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Books</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(emptyForm); setShowModal(true); }}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> Add Book
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Book Catalog</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{books.length} books in library</p>
                    </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, ISBN..."
                            className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                    </div>
                    <button onClick={() => refetch()} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading catalog...</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><BookOpen className="w-8 h-8" />{search ? "No books match your search" : "No books added yet"}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-4">Title / Author</th>
                                        <th className="py-4 px-4">ISBN</th>
                                        <th className="py-4 px-4">Category</th>
                                        <th className="py-4 px-4">Shelf</th>
                                        <th className="py-4 px-4 text-center">Total</th>
                                        <th className="py-4 px-4 text-center">Available</th>
                                        <th className="py-4 px-4 text-center">Status</th>
                                        <th className="py-4 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((b: any) => (
                                        <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <p className="font-black text-slate-800">{b.title}</p>
                                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{b.author || "—"}{b.publishYear ? ` · ${b.publishYear}` : ""}</p>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{b.isbn || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{b.categoryName || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{b.shelfLocation || "—"}</td>
                                            <td className="py-3 px-4 text-center font-black text-slate-800">{b.totalCopies || 1}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`font-black text-sm ${(b.availableCopies || 0) === 0 ? "text-rose-500" : (b.availableCopies || 0) <= 2 ? "text-amber-500" : "text-emerald-600"}`}>{b.availableCopies ?? b.totalCopies}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${b.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{b.isActive !== false ? "Active" : "Inactive"}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => openEdit(b)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                                    {confirmDelete === b._id ? (
                                                        <>
                                                            <button onClick={() => deleteMutation.mutate(b._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                                            <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                                                        </>
                                                    ) : (
                                                        <button onClick={() => setConfirmDelete(b._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white max-w-2xl w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit Book" : "Add New Book"}</h3>
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(emptyForm); }} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                {[
                                    { label: "Title*", field: "title", col: 2 },
                                    { label: "Author", field: "author", col: 1 },
                                    { label: "ISBN", field: "isbn", col: 1 },
                                    { label: "Publisher", field: "publisher", col: 1 },
                                    { label: "Publish Year", field: "publishYear", col: 1, type: "number" },
                                    { label: "Total Copies*", field: "totalCopies", col: 1, type: "number" },
                                    { label: "Shelf Location", field: "shelfLocation", col: 1 },
                                ].map(f => (
                                    <div key={f.field} className={`relative ${f.col === 2 ? "col-span-2" : ""}`}>
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type={f.type || "text"} value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })}
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Category</div>
                                    <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— None —</option>
                                        {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Language</div>
                                    <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        {["English", "Swahili", "French", "Arabic", "Other"].map(l => <option key={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Description</div>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Active / Available for borrowing</span>
                                    <button onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                        className={`w-11 h-6 rounded-full transition-all relative ${form.isActive ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? "right-0.5" : "left-0.5"}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 mt-6">
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(emptyForm); }} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                                <button onClick={handleSubmit} disabled={saveMutation.isPending}
                                    className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editId ? "Save Changes" : "Add Book"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
