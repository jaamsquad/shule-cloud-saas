import { useState } from "react";
import { Home, Plus, Trash2, Check, X, Loader2, Megaphone, Search, Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const AUDIENCE_OPTS = ["All", "Students", "Parents", "Staff", "Teachers", "Class-specific"];
const PRIORITY_COLORS: Record<string, string> = {
    Normal: "bg-slate-100 text-slate-600",
    Important: "bg-amber-50 text-amber-600",
    Urgent: "bg-rose-50 text-rose-600",
};

const empty = { title: "", message: "", audience: "All", priority: "Normal", expiryDate: "", isPinned: false };

export default function Announcements() {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [audienceFilter, setAudienceFilter] = useState("All");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: announcements = [], isLoading } = useQuery({
        queryKey: ["announcements"],
        queryFn: async () => { const r = await api.get("/announcements"); return Array.isArray(r.data) ? r.data : []; },
    });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/announcements/${editId}`, p) : api.post("/announcements", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success(editId ? "Updated" : "Announcement published"); setShowModal(false); setForm(empty); setEditId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/announcements/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const filtered = announcements.filter((a: any) => {
        const mQ = !search || (a.title || "").toLowerCase().includes(search.toLowerCase());
        const mA = audienceFilter === "All" || a.audience === audienceFilter;
        return mQ && mA;
    }).sort((a: any, b: any) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Communications</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Announcements</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(empty); setShowModal(true); }}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> New Announcement
                </button>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <Megaphone className="w-7 h-7 text-[#5C67F2]" /> Announcements Board
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Publish school-wide and targeted announcements</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm mb-6">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search announcements..."
                            className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {["All", "Students", "Parents", "Staff"].map(a => (
                            <button key={a} onClick={() => setAudienceFilter(a)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${audienceFilter === a ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>
                                {a}
                            </button>
                        ))}
                    </div>
                    <span className="ml-auto text-[10px] font-black text-slate-400 uppercase">{filtered.length} announcements</span>
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><Megaphone className="w-10 h-10" />No announcements found</div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((ann: any) => (
                            <div key={ann._id} className={`bg-white rounded-[2rem] border-2 shadow-sm p-6 transition-all ${ann.isPinned ? "border-[#5C67F2] bg-indigo-50/20" : "border-slate-100"}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${ann.isPinned ? "bg-[#5C67F2]" : "bg-slate-100"}`}>
                                            {ann.isPinned ? <Bell className="w-5 h-5 text-white" /> : <Megaphone className="w-5 h-5 text-slate-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                {ann.isPinned && <span className="px-2 py-0.5 bg-[#5C67F2] text-white text-[8px] font-black uppercase rounded-full">📌 Pinned</span>}
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${PRIORITY_COLORS[ann.priority] || PRIORITY_COLORS.Normal}`}>{ann.priority}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-lg">{ann.audience}</span>
                                            </div>
                                            <h3 className="text-sm font-black text-slate-800 mb-1">{ann.title}</h3>
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed">{ann.message}</p>
                                            <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-400 font-bold uppercase">
                                                <span>{new Date(ann.createdAt).toLocaleDateString("en-GB")}</span>
                                                {ann.expiryDate && <span>Expires: {ann.expiryDate}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        <button onClick={() => { setEditId(ann._id); setForm({ title: ann.title, message: ann.message, audience: ann.audience, priority: ann.priority, expiryDate: ann.expiryDate || "", isPinned: ann.isPinned || false }); setShowModal(true); }}
                                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100">
                                            ✎
                                        </button>
                                        {confirmDelete === ann._id ? (
                                            <><button onClick={() => delMut.mutate(ann._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                        ) : (
                                            <button onClick={() => setConfirmDelete(ann._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit" : "New"} Announcement</h3>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-5">
                                {[{ label: "Title*", field: "title" }].map(f => (
                                    <div key={f.field} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type="text" value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Message*</div>
                                    <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Audience</div>
                                        <select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            {AUDIENCE_OPTS.map(a => <option key={a}>{a}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Priority</div>
                                        <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            {["Normal", "Important", "Urgent"].map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Expiry Date</div>
                                        <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 h-11 border border-slate-100">
                                        <span className="text-[9px] font-black uppercase text-slate-500">📌 Pin to Top</span>
                                        <button onClick={() => setForm({ ...form, isPinned: !form.isPinned })} className={`w-10 h-5 rounded-full transition-all relative ${form.isPinned ? "bg-[#5C67F2]" : "bg-slate-200"}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isPinned ? "right-0.5" : "left-0.5"}`} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.title || !form.message) { toast.error("Title and message required"); return; } saveMut.mutate(form); }} disabled={saveMut.isPending}
                                    className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editId ? "Save" : "Publish"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
