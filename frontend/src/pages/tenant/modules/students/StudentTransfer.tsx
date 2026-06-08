import { useState } from "react";
import { Home, Plus, Search, Check, X, Loader2, ArrowRightLeft, ArrowRight, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const TYPES = ["Transfer Out", "Transfer In"];
const STATUS_COLORS: Record<string, string> = {
    Pending: "bg-amber-50 text-amber-600",
    Approved: "bg-emerald-50 text-emerald-600",
    Rejected: "bg-rose-50 text-rose-500",
    Completed: "bg-blue-50 text-blue-600",
};

const emptyForm = {
    studentId: "", studentName: "", admissionNo: "", currentClass: "",
    transferType: "Transfer Out", toFromSchool: "", reason: "", date: new Date().toISOString().split("T")[0],
    newClass: "", status: "Pending", notes: "",
};

export default function StudentTransfer() {
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [studentSearch, setStudentSearch] = useState("");
    const qc = useQueryClient();

    const { data: transfers = [], isLoading } = useQuery({
        queryKey: ["student_transfers"],
        queryFn: async () => { const r = await api.get("/student_transfers"); return Array.isArray(r.data) ? r.data : []; },
    });

    const { data: students = [] } = useQuery({
        queryKey: ["students"],
        queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; },
    });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/student_transfers/${editId}`, p) : api.post("/student_transfers", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_transfers"] }); toast.success(editId ? "Updated" : "Transfer record created"); setShowModal(false); setForm(emptyForm); setEditId(null); setStudentSearch(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/student_transfers/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_transfers"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const statusMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/student_transfers/${id}`, { status }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_transfers"] }); toast.success("Status updated"); },
    });

    const filteredStudents = studentSearch.length >= 2
        ? students.filter((s: any) => (s.studentName || `${s.firstName} ${s.lastName}` || "").toLowerCase().includes(studentSearch.toLowerCase()) || (s.registrationNo || "").toLowerCase().includes(studentSearch.toLowerCase()))
        : [];

    const filtered = transfers.filter((t: any) =>
        !search || (t.studentName || "").toLowerCase().includes(search.toLowerCase()) || (t.admissionNo || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Students</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Transfer Management</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(emptyForm); setStudentSearch(""); setShowModal(true); }}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> New Transfer
                </button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><ArrowRightLeft className="w-7 h-7 text-[#5C67F2]" />Transfer Management</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Track students transferring in or out of the institution</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { label: "Transfer Out", value: transfers.filter((t: any) => t.transferType === "Transfer Out").length, icon: ArrowRight, color: "text-rose-600" },
                        { label: "Transfer In", value: transfers.filter((t: any) => t.transferType === "Transfer In").length, icon: ArrowLeft, color: "text-emerald-600" },
                        { label: "Pending", value: transfers.filter((t: any) => t.status === "Pending").length, color: "text-amber-600", icon: ArrowRightLeft },
                        { label: "Completed", value: transfers.filter((t: any) => t.status === "Completed").length, color: "text-blue-600", icon: Check },
                    ].map(s => (
                        <div key={s.label} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student name or admission no..."
                        className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><ArrowRightLeft className="w-8 h-8" />No transfer records</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        {["Student", "Admission No", "Class", "Type", "To/From School", "Date", "Status", "Actions"].map(h => <th key={h} className="py-4 px-4">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((t: any) => (
                                        <tr key={t._id} className="hover:bg-slate-50/50">
                                            <td className="py-3 px-4 font-black text-slate-800">{t.studentName}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{t.admissionNo || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{t.currentClass || "—"}</td>
                                            <td className="py-3 px-4">
                                                <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${t.transferType === "Transfer Out" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                                                    {t.transferType === "Transfer Out" ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}{t.transferType}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-600 max-w-[140px] truncate">{t.toFromSchool || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{t.date || "—"}</td>
                                            <td className="py-3 px-4">
                                                <select value={t.status} onChange={e => statusMut.mutate({ id: t._id, status: e.target.value })}
                                                    className={`px-2 py-1 rounded-xl text-[9px] font-black uppercase border-0 focus:outline-none cursor-pointer ${STATUS_COLORS[t.status] || "bg-slate-100 text-slate-500"}`}>
                                                    {["Pending", "Approved", "Rejected", "Completed"].map(s => <option key={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => { setEditId(t._id); setForm({ studentId: t.studentId || "", studentName: t.studentName, admissionNo: t.admissionNo || "", currentClass: t.currentClass || "", transferType: t.transferType, toFromSchool: t.toFromSchool || "", reason: t.reason || "", date: t.date || "", newClass: t.newClass || "", status: t.status, notes: t.notes || "" }); setStudentSearch(t.studentName); setShowModal(true); }}
                                                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100"><ArrowRightLeft className="w-3.5 h-3.5" /></button>
                                                    {confirmDelete === t._id ? (
                                                        <><button onClick={() => delMut.mutate(t._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                                    ) : (
                                                        <button onClick={() => setConfirmDelete(t._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><X className="w-3.5 h-3.5" /></button>
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
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit" : "New"} Transfer Record</h3>
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(emptyForm); }} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-5">
                                {/* Student search */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Student*</div>
                                    <input type="text" value={studentSearch} onChange={e => { setStudentSearch(e.target.value); if (form.studentId) setForm({ ...form, studentId: "", studentName: "" }); }}
                                        placeholder="Search student name..." className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    {filteredStudents.length > 0 && !form.studentId && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                                            {filteredStudents.map((s: any) => (
                                                <div key={s._id} onClick={() => { setForm({ ...form, studentId: s._id, studentName: s.studentName || `${s.firstName} ${s.lastName}`, admissionNo: s.registrationNo || s.studentId || "", currentClass: s.studentClass || s.currentClass || "" }); setStudentSearch(s.studentName || `${s.firstName} ${s.lastName}`); }}
                                                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                                                    <p className="text-xs font-black text-slate-700">{s.studentName || `${s.firstName} ${s.lastName}`}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold">{s.registrationNo} · {s.studentClass || s.currentClass}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Transfer Type</div>
                                        <select value={form.transferType} onChange={e => setForm({ ...form, transferType: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            {TYPES.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Date</div>
                                        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                </div>
                                {[
                                    { label: `${form.transferType === "Transfer Out" ? "To" : "From"} School / Institution`, field: "toFromSchool" },
                                    { label: "Reason for Transfer", field: "reason" },
                                    { label: "New Class (if Transfer In)", field: "newClass" },
                                    { label: "Notes", field: "notes" },
                                ].map(f => (
                                    <div key={f.field} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type="text" value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(emptyForm); }} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.studentName.trim()) { toast.error("Select a student"); return; } saveMut.mutate(form); }} disabled={saveMut.isPending}
                                    className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editId ? "Save Changes" : "Create Record"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
