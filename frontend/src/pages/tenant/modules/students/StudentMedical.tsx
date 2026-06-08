import { useState } from "react";
import { Home, Plus, Search, Check, X, Loader2, Heart, Activity } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const VISIT_TYPES = ["Routine Check", "Illness", "Injury", "Vaccination", "Follow-up", "Emergency", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

const empty = { studentId: "", studentName: "", admissionNo: "", currentClass: "", date: new Date().toISOString().split("T")[0], visitType: "Routine Check", complaint: "", diagnosis: "", treatment: "", medication: "", attendedBy: "", followUpDate: "", bloodGroup: "", allergies: "", conditions: "", notes: "" };

export default function StudentMedical() {
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState<string | null>(null);
    const [studentSearch, setStudentSearch] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [tab, setTab] = useState<"visits" | "profiles">("visits");
    const qc = useQueryClient();

    const { data: records = [], isLoading } = useQuery({ queryKey: ["student_medical"], queryFn: async () => { const r = await api.get("/student_medical"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/student_medical/${editId}`, p) : api.post("/student_medical", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_medical"] }); toast.success(editId ? "Updated" : "Medical record created"); setShowModal(false); setForm(empty); setEditId(null); setStudentSearch(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/student_medical/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_medical"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const filteredStudents = studentSearch.length >= 2 ? students.filter((s: any) => (s.studentName || `${s.firstName || ""} ${s.lastName || ""}`).toLowerCase().includes(studentSearch.toLowerCase())) : [];
    const visits = records.filter((r: any) => r.visitType && (!search || (r.studentName || "").toLowerCase().includes(search.toLowerCase())));
    const profiles = records.filter((r: any) => r.bloodGroup && (!search || (r.studentName || "").toLowerCase().includes(search.toLowerCase())));

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Students</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Medical Records</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(empty); setStudentSearch(""); setShowModal(true); }} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> New Record
                </button>
            </div>
            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Heart className="w-7 h-7 text-rose-500" />Medical Records</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Track student clinic visits, health conditions, and medical history</p></div>

                <div className="flex gap-3 mb-6">
                    {[{ key: "visits", label: "Clinic Visits" }, { key: "profiles", label: "Health Profiles" }].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)} className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide border transition-all ${tab === t.key ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>{t.label}</button>
                    ))}
                </div>

                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                    {isLoading ? <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                    : (tab === "visits" ? visits : profiles).length === 0 ? <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><Activity className="w-8 h-8" />No {tab === "visits" ? "clinic visits" : "health profiles"} recorded</div>
                    : <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-xs">
                        <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            {(tab === "visits" ? ["Date", "Student", "Class", "Visit Type", "Complaint", "Diagnosis", "Treatment", "Attended By", "Follow-Up", "Actions"] : ["Student", "Class", "Blood Group", "Allergies", "Conditions", "Actions"])
                            .map(h => <th key={h} className="py-4 px-4">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {(tab === "visits" ? visits : profiles).map((r: any) => (
                                <tr key={r._id} className="hover:bg-slate-50/50">
                                    {tab === "visits" ? <>
                                        <td className="py-3 px-4 font-bold text-slate-500 whitespace-nowrap">{r.date}</td>
                                        <td className="py-3 px-4 font-black text-slate-800">{r.studentName}</td>
                                        <td className="py-3 px-4 font-bold text-slate-600">{r.currentClass || "—"}</td>
                                        <td className="py-3 px-4"><span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase">{r.visitType}</span></td>
                                        <td className="py-3 px-4 text-slate-600 max-w-[120px] truncate">{r.complaint || "—"}</td>
                                        <td className="py-3 px-4 font-bold text-slate-700 max-w-[120px] truncate">{r.diagnosis || "—"}</td>
                                        <td className="py-3 px-4 text-slate-600 max-w-[120px] truncate">{r.treatment || "—"}</td>
                                        <td className="py-3 px-4 font-bold text-slate-500">{r.attendedBy || "—"}</td>
                                        <td className="py-3 px-4 font-bold text-slate-500">{r.followUpDate || "—"}</td>
                                    </> : <>
                                        <td className="py-3 px-4 font-black text-slate-800">{r.studentName}</td>
                                        <td className="py-3 px-4 font-bold text-slate-600">{r.currentClass || "—"}</td>
                                        <td className="py-3 px-4"><span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase">{r.bloodGroup || "—"}</span></td>
                                        <td className="py-3 px-4 text-slate-600 max-w-[160px] truncate">{r.allergies || "—"}</td>
                                        <td className="py-3 px-4 text-slate-600 max-w-[160px] truncate">{r.conditions || "—"}</td>
                                    </>}
                                    <td className="py-3 px-4">
                                        <div className="flex gap-1.5">
                                            <button onClick={() => { setEditId(r._id); setStudentSearch(r.studentName); setForm({ studentId: r.studentId || "", studentName: r.studentName, admissionNo: r.admissionNo || "", currentClass: r.currentClass || "", date: r.date || "", visitType: r.visitType || "Routine Check", complaint: r.complaint || "", diagnosis: r.diagnosis || "", treatment: r.treatment || "", medication: r.medication || "", attendedBy: r.attendedBy || "", followUpDate: r.followUpDate || "", bloodGroup: r.bloodGroup || "", allergies: r.allergies || "", conditions: r.conditions || "", notes: r.notes || "" }); setShowModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><Heart className="w-3.5 h-3.5" /></button>
                                            {confirmDelete === r._id ? (<><button onClick={() => delMut.mutate(r._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button><button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>) : (<button onClick={() => setConfirmDelete(r._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><X className="w-3.5 h-3.5" /></button>)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white max-w-xl w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">Medical Record</h3>
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(empty); }} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Student*</div>
                                    <input type="text" value={studentSearch} onChange={e => { setStudentSearch(e.target.value); if (form.studentId) setForm({ ...form, studentId: "", studentName: "" }); }} placeholder="Search student..." className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    {filteredStudents.length > 0 && !form.studentId && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto">
                                            {filteredStudents.map((s: any) => { const name = s.studentName || `${s.firstName || ""} ${s.lastName || ""}`; return <div key={s._id} onClick={() => { setForm({ ...form, studentId: s._id, studentName: name, admissionNo: s.registrationNo || "", currentClass: s.studentClass || "" }); setStudentSearch(name); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50"><p className="text-xs font-black text-slate-700">{name}</p><p className="text-[9px] text-slate-400 font-bold">{s.registrationNo} · {s.studentClass}</p></div>; })}
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[{ label: "Date", field: "date", type: "date" }, { label: "Visit Type", field: "visitType", type: "select", opts: VISIT_TYPES }, { label: "Blood Group", field: "bloodGroup", type: "select", opts: BLOOD_GROUPS }, { label: "Attended By", field: "attendedBy" }, { label: "Follow-Up Date", field: "followUpDate", type: "date" }, { label: "Medication", field: "medication" }].map((f: any) => (
                                        <div key={f.field} className="relative">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                            {f.type === "select" ? <select value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">{f.opts.map((o: string) => <option key={o}>{o}</option>)}</select>
                                            : <input type={f.type || "text"} value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />}
                                        </div>
                                    ))}
                                </div>
                                {["complaint", "diagnosis", "treatment", "allergies", "conditions", "notes"].map(f => (
                                    <div key={f} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.charAt(0).toUpperCase() + f.slice(1)}</div>
                                        <input type="text" value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(empty); }} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.studentName) { toast.error("Select a student"); return; } saveMut.mutate(form); }} disabled={saveMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editId ? "Save" : "Save Record"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
