import { useState } from "react";
import { Home, Plus, Search, Check, X, Loader2, Shield, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const INCIDENT_TYPES = ["Bullying", "Misconduct", "Absenteeism", "Cheating", "Vandalism", "Substance Abuse", "Violence", "Insubordination", "Other"];
const ACTIONS = ["Verbal Warning", "Written Warning", "Parent Meeting", "Detention", "Suspension", "Expulsion", "Community Service", "Counseling", "Other"];
const SEVERITY = ["Low", "Medium", "High", "Critical"];

const empty = { studentId: "", studentName: "", admissionNo: "", currentClass: "", date: new Date().toISOString().split("T")[0], incidentType: "Misconduct", severity: "Low", description: "", actionTaken: "Verbal Warning", handledBy: "", parentInformed: false, resolved: false, notes: "" };

export default function StudentDiscipline() {
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState<string | null>(null);
    const [studentSearch, setStudentSearch] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: records = [], isLoading } = useQuery({ queryKey: ["student_discipline"], queryFn: async () => { const r = await api.get("/student_discipline"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: async () => { const r = await api.get("/staff"); return Array.isArray(r.data) ? r.data : []; } });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/student_discipline/${editId}`, p) : api.post("/student_discipline", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_discipline"] }); toast.success(editId ? "Record updated" : "Discipline record created"); setShowModal(false); setForm(empty); setEditId(null); setStudentSearch(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/student_discipline/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_discipline"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const filteredStudents = studentSearch.length >= 2 ? students.filter((s: any) => (s.studentName || `${s.firstName || ""} ${s.lastName || ""}`).toLowerCase().includes(studentSearch.toLowerCase())) : [];
    const filtered = records.filter((r: any) => !search || (r.studentName || "").toLowerCase().includes(search.toLowerCase()));
    const SEVERITY_COLOR: Record<string, string> = { Low: "bg-slate-100 text-slate-500", Medium: "bg-amber-50 text-amber-600", High: "bg-orange-50 text-orange-600", Critical: "bg-rose-50 text-rose-600" };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Students</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Discipline Records</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(empty); setStudentSearch(""); setShowModal(true); }} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> Log Incident
                </button>
            </div>
            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Shield className="w-7 h-7 text-[#5C67F2]" />Discipline Records</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Track student incidents, actions taken, and resolution status</p></div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[{ label: "Total Incidents", value: records.length, color: "text-[#5C67F2]" }, { label: "Unresolved", value: records.filter((r: any) => !r.resolved).length, color: "text-rose-600" }, { label: "High/Critical", value: records.filter((r: any) => r.severity === "High" || r.severity === "Critical").length, color: "text-orange-600" }, { label: "This Month", value: records.filter((r: any) => r.date?.startsWith(new Date().toISOString().slice(0, 7))).length, color: "text-amber-600" }].map(s => (
                        <div key={s.label} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                    {isLoading ? <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                    : filtered.length === 0 ? <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><Shield className="w-8 h-8" />No discipline records</div>
                    : <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-xs">
                        <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">{["Date", "Student", "Class", "Incident", "Severity", "Action Taken", "Resolved", "Actions"].map(h => <th key={h} className="py-4 px-4">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((r: any) => (
                                <tr key={r._id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 font-bold text-slate-500">{r.date}</td>
                                    <td className="py-3 px-4 font-black text-slate-800">{r.studentName}</td>
                                    <td className="py-3 px-4 font-bold text-slate-600">{r.currentClass || "—"}</td>
                                    <td className="py-3 px-4 font-bold text-slate-700">{r.incidentType}</td>
                                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${SEVERITY_COLOR[r.severity] || "bg-slate-100 text-slate-500"}`}>{r.severity}</span></td>
                                    <td className="py-3 px-4 font-bold text-slate-600">{r.actionTaken}</td>
                                    <td className="py-3 px-4 text-center">
                                        <button onClick={() => saveMut.mutate({ ...r, resolved: !r.resolved })} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${r.resolved ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300 hover:bg-emerald-100"}`}>
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex gap-1.5">
                                            <button onClick={() => { setEditId(r._id); setStudentSearch(r.studentName); setForm({ studentId: r.studentId || "", studentName: r.studentName, admissionNo: r.admissionNo || "", currentClass: r.currentClass || "", date: r.date, incidentType: r.incidentType, severity: r.severity, description: r.description || "", actionTaken: r.actionTaken, handledBy: r.handledBy || "", parentInformed: r.parentInformed || false, resolved: r.resolved || false, notes: r.notes || "" }); setShowModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100"><AlertTriangle className="w-3.5 h-3.5" /></button>
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
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit" : "Log"} Incident</h3>
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(empty); }} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Student*</div>
                                    <input type="text" value={studentSearch} onChange={e => { setStudentSearch(e.target.value); if (form.studentId) setForm({ ...form, studentId: "", studentName: "" }); }} placeholder="Type student name..." className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    {filteredStudents.length > 0 && !form.studentId && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto">
                                            {filteredStudents.map((s: any) => (<div key={s._id} onClick={() => { const name = s.studentName || `${s.firstName || ""} ${s.lastName || ""}`; setForm({ ...form, studentId: s._id, studentName: name, admissionNo: s.registrationNo || "", currentClass: s.studentClass || s.currentClass || "" }); setStudentSearch(name); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50"><p className="text-xs font-black text-slate-700">{s.studentName || `${s.firstName} ${s.lastName}`}</p><p className="text-[9px] text-slate-400 font-bold">{s.registrationNo} · {s.studentClass}</p></div>))}
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: "Date", field: "date", type: "date" },
                                        { label: "Severity", field: "severity", type: "select", opts: SEVERITY },
                                        { label: "Incident Type", field: "incidentType", type: "select", opts: INCIDENT_TYPES },
                                        { label: "Action Taken", field: "actionTaken", type: "select", opts: ACTIONS },
                                        { label: "Handled By", field: "handledBy", type: "text" },
                                    ].map((f: any) => (
                                        <div key={f.field} className="relative">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                            {f.type === "select" ? <select value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">{f.opts.map((o: string) => <option key={o}>{o}</option>)}</select>
                                            : <input type={f.type} value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />}
                                        </div>
                                    ))}
                                </div>
                                {["description", "notes"].map(f => (
                                    <div key={f} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f === "description" ? "Description of Incident" : "Notes"}</div>
                                        <textarea value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                    </div>
                                ))}
                                <div className="flex items-center gap-6">
                                    {[{ label: "Parent Informed", field: "parentInformed" }, { label: "Resolved", field: "resolved" }].map(f => (
                                        <label key={f.field} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.checked })} className="w-4 h-4 accent-[#5C67F2]" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{f.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(empty); }} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.studentName) { toast.error("Select a student"); return; } saveMut.mutate(form); }} disabled={saveMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editId ? "Save" : "Log Incident"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
