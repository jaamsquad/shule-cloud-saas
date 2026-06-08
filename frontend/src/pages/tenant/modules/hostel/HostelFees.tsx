import { useState } from "react";
import { Home, Plus, Check, X, Loader2, DollarSign, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyForm = { name: "", amount: "", period: "Termly", hostelId: "", hostelName: "", description: "", isActive: true };

export default function HostelFees() {
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"ALL" | "Unpaid" | "Paid">("ALL");
    const qc = useQueryClient();

    const { data: feeDefs = [], isLoading: loadF } = useQuery({ queryKey: ["hostel_fees"], queryFn: async () => { const r = await api.get("/hostel_fees"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: hostels = [] } = useQuery({ queryKey: ["hostels"], queryFn: async () => { const r = await api.get("/hostels"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: allocations = [], isLoading: loadA } = useQuery({ queryKey: ["hostel_allocations"], queryFn: async () => { const r = await api.get("/hostel_allocations?status=Active"); return Array.isArray(r.data) ? r.data : []; } });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/hostel_fees/${editId}`, p) : api.post("/hostel_fees", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["hostel_fees"] }); toast.success(editId ? "Fee updated" : "Fee structure added"); setShowModal(false); setForm(emptyForm); setEditId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/hostel_fees/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["hostel_fees"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const payMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/hostel_allocations/${id}`, { paymentStatus: status }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["hostel_allocations"] }); toast.success("Payment status updated"); },
    });

    const filtered = allocations.filter((a: any) => statusFilter === "ALL" || a.paymentStatus === statusFilter);
    const totalOwed = allocations.reduce((s: number, a: any) => s + (a.fee || 0), 0);
    const totalPaid = allocations.filter((a: any) => a.paymentStatus === "Paid").reduce((s: number, a: any) => s + (a.fee || 0), 0);

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Hostel</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Hostel Fees</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(emptyForm); setShowModal(true); }} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> Add Fee Structure
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Hostel Fees</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Manage hostel fee structures and track resident payment status</p></div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[{ label: "Total Owed", value: `KSh ${totalOwed.toLocaleString()}`, color: "text-[#5C67F2]" }, { label: "Total Collected", value: `KSh ${totalPaid.toLocaleString()}`, color: "text-emerald-600" }, { label: "Outstanding", value: `KSh ${(totalOwed - totalPaid).toLocaleString()}`, color: "text-rose-600" }].map(s => (
                        <div key={s.label} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm text-center">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-2"><DollarSign className={`w-4 h-4 ${s.color}`} /></div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                            <p className={`text-lg font-black mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Fee structures */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7 mb-8">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Defined Fee Structures</h3>
                    {loadF ? <div className="flex items-center justify-center h-20 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" />Loading...</div>
                    : feeDefs.length === 0 ? <p className="text-slate-300 text-xs font-bold uppercase text-center py-6">No fee structures defined — click Add Fee Structure</p>
                    : <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {feeDefs.map((f: any) => (
                            <div key={f._id} className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <p className="font-black text-slate-800 text-sm">{f.name}</p>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditId(f._id); setForm({ name: f.name, amount: String(f.amount), period: f.period, hostelId: f.hostelId || "", hostelName: f.hostelName || "", description: f.description || "", isActive: f.isActive !== false }); setShowModal(true); }} className="w-7 h-7 rounded-xl bg-white hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-200"><Pencil className="w-3 h-3" /></button>
                                        {confirmDelete === f._id ? (<><button onClick={() => delMut.mutate(f._id)} className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3 h-3" /></button><button onClick={() => setConfirmDelete(null)} className="w-7 h-7 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3 h-3" /></button></>) : <button onClick={() => setConfirmDelete(f._id)} className="w-7 h-7 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-200"><Trash2 className="w-3 h-3" /></button>}
                                    </div>
                                </div>
                                <p className="text-xl font-black text-[#5C67F2]">KSh {Number(f.amount).toLocaleString()}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{f.period} · {f.hostelName || "All Hostels"}</p>
                            </div>
                        ))}
                    </div>}
                </div>

                {/* Payment tracking */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-7">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Resident Payment Status</h3>
                        <div className="flex gap-2">
                            {["ALL", "Paid", "Unpaid"].map(s => <button key={s} onClick={() => setStatusFilter(s as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${statusFilter === s ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>{s}</button>)}
                        </div>
                    </div>
                    {loadA ? <div className="flex items-center justify-center h-32 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                    : filtered.length === 0 ? <div className="text-center text-slate-300 text-xs font-bold uppercase py-12">No residents found</div>
                    : <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-xs">
                        <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            {["Student", "Room", "Bed", "Fee (KSh)", "Status", "Action"].map(h => <th key={h} className="py-4 px-4">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((a: any) => (
                                <tr key={a._id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 font-black text-slate-800">{a.studentName}</td>
                                    <td className="py-3 px-4 font-bold text-slate-600">Room {a.roomNumber}</td>
                                    <td className="py-3 px-4 font-bold text-slate-600">Bed {a.bedNumber}</td>
                                    <td className="py-3 px-4 font-black text-[#5C67F2]">{a.fee ? Number(a.fee).toLocaleString() : "—"}</td>
                                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${a.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>{a.paymentStatus || "Unpaid"}</span></td>
                                    <td className="py-3 px-4">
                                        <button onClick={() => payMut.mutate({ id: a._id, status: a.paymentStatus === "Paid" ? "Unpaid" : "Paid" })}
                                            className={`h-8 px-3 font-black text-[9px] uppercase rounded-xl border transition-colors ${a.paymentStatus === "Paid" ? "bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"}`}>
                                            {a.paymentStatus === "Paid" ? "Mark Unpaid" : "Mark Paid"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-md w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit" : "Add"} Fee Structure</h3><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>
                            <div className="space-y-5">
                                {[{ label: "Fee Name*", field: "name" }, { label: "Amount (KSh)*", field: "amount", type: "number" }, { label: "Description", field: "description" }].map(f => (
                                    <div key={f.field} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type={f.type || "text"} value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Period</div>
                                        <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            {["Monthly", "Termly", "Annual", "One-time"].map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Hostel</div>
                                        <select value={form.hostelId} onChange={e => { const h = hostels.find((h: any) => h._id === e.target.value); setForm({ ...form, hostelId: e.target.value, hostelName: h?.name || "" }); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            <option value="">All Hostels</option>
                                            {hostels.map((h: any) => <option key={h._id} value={h._id}>{h.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.name || !form.amount) { toast.error("Name and amount required"); return; } saveMut.mutate({ ...form, amount: Number(form.amount) }); }} disabled={saveMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editId ? "Save" : "Add Fee"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
