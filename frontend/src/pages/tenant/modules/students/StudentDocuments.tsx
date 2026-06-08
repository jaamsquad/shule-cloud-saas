import { useState } from "react";
import { Home, Plus, Search, Check, X, Loader2, FolderOpen, ExternalLink, File, FileText, Image, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const DOC_TYPES = ["Birth Certificate", "National ID", "Passport", "Report Card", "Transfer Certificate", "Medical Certificate", "Admission Letter", "Photo", "Academic Certificate", "Other"];
const TYPE_ICONS: Record<string, any> = { "Photo": Image, "Report Card": FileText, "Transfer Certificate": FileText };

const empty = { studentId: "", studentName: "", admissionNo: "", currentClass: "", documentType: "Birth Certificate", title: "", url: "", description: "", uploadDate: new Date().toISOString().split("T")[0], isVerified: false };

export default function StudentDocuments() {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState<string | null>(null);
    const [studentSearch, setStudentSearch] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: docs = [], isLoading } = useQuery({ queryKey: ["student_documents"], queryFn: async () => { const r = await api.get("/student_documents"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/student_documents/${editId}`, p) : api.post("/student_documents", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_documents"] }); toast.success(editId ? "Updated" : "Document added"); setShowModal(false); setForm(empty); setEditId(null); setStudentSearch(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/student_documents/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_documents"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const filteredStudents = studentSearch.length >= 2 ? students.filter((s: any) => (s.studentName || `${s.firstName || ""} ${s.lastName || ""}`).toLowerCase().includes(studentSearch.toLowerCase())) : [];
    const filtered = docs.filter((d: any) => {
        const mQ = !search || (d.studentName || "").toLowerCase().includes(search.toLowerCase()) || (d.title || "").toLowerCase().includes(search.toLowerCase());
        const mT = typeFilter === "ALL" || d.documentType === typeFilter;
        return mQ && mT;
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Students</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Student Documents</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(empty); setStudentSearch(""); setShowModal(true); }} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> Add Document
                </button>
            </div>
            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><FolderOpen className="w-7 h-7 text-[#5C67F2]" />Student Documents</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Store and manage student document links and records (birth certs, IDs, transfer certs, etc.)</p></div>

                <div className="flex gap-3 mb-6 flex-wrap">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student or document..." className="w-full h-10 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                    </div>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-10 px-4 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] shadow-sm">
                        <option value="ALL">All Types</option>
                        {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                    {isLoading ? <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                    : filtered.length === 0 ? <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><FolderOpen className="w-8 h-8" />No documents found</div>
                    : <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-xs">
                        <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">{["Student", "Class", "Document Type", "Title", "Upload Date", "Verified", "Link", "Actions"].map(h => <th key={h} className="py-4 px-4">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((d: any) => {
                                const Icon = TYPE_ICONS[d.documentType] || File;
                                return (
                                    <tr key={d._id} className="hover:bg-slate-50/50">
                                        <td className="py-3 px-4 font-black text-slate-800">{d.studentName}</td>
                                        <td className="py-3 px-4 font-bold text-slate-600">{d.currentClass || "—"}</td>
                                        <td className="py-3 px-4"><span className="flex items-center gap-1.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600"><Icon className="w-3 h-3" />{d.documentType}</span></td>
                                        <td className="py-3 px-4 font-bold text-slate-700">{d.title || "—"}</td>
                                        <td className="py-3 px-4 font-bold text-slate-500">{d.uploadDate || "—"}</td>
                                        <td className="py-3 px-4 text-center">
                                            <button onClick={() => saveMut.mutate({ ...d, isVerified: !d.isVerified })} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${d.isVerified ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300 hover:bg-emerald-100"}`}><Check className="w-3.5 h-3.5" /></button>
                                        </td>
                                        <td className="py-3 px-4">
                                            {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-black text-[#5C67F2] hover:underline uppercase"><ExternalLink className="w-3 h-3" />Open</a> : <span className="text-slate-300 text-[9px] font-bold">No link</span>}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-1.5">
                                                <button onClick={() => { setEditId(d._id); setStudentSearch(d.studentName); setForm({ studentId: d.studentId || "", studentName: d.studentName, admissionNo: d.admissionNo || "", currentClass: d.currentClass || "", documentType: d.documentType, title: d.title || "", url: d.url || "", description: d.description || "", uploadDate: d.uploadDate || "", isVerified: d.isVerified || false }); setShowModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100"><File className="w-3.5 h-3.5" /></button>
                                                {confirmDelete === d._id ? (<><button onClick={() => delMut.mutate(d._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button><button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>) : (<button onClick={() => setConfirmDelete(d._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><X className="w-3.5 h-3.5" /></button>)}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table></div>}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit" : "Add"} Document</h3>
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(empty); }} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Student*</div>
                                    <input type="text" value={studentSearch} onChange={e => { setStudentSearch(e.target.value); if (form.studentId) setForm({ ...form, studentId: "", studentName: "" }); }} placeholder="Search student name..." className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    {filteredStudents.length > 0 && !form.studentId && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto">
                                            {filteredStudents.map((s: any) => { const name = s.studentName || `${s.firstName || ""} ${s.lastName || ""}`; return <div key={s._id} onClick={() => { setForm({ ...form, studentId: s._id, studentName: name, admissionNo: s.registrationNo || "", currentClass: s.studentClass || "" }); setStudentSearch(name); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50"><p className="text-xs font-black text-slate-700">{name}</p><p className="text-[9px] text-slate-400 font-bold">{s.registrationNo} · {s.studentClass}</p></div>; })}
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Document Type</div>
                                        <select value={form.documentType} onChange={e => setForm({ ...form, documentType: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">{DOC_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Upload Date</div>
                                        <input type="date" value={form.uploadDate} onChange={e => setForm({ ...form, uploadDate: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                </div>
                                {[{ label: "Document Title", field: "title" }, { label: "URL / Link (Google Drive, etc.)", field: "url" }, { label: "Description / Notes", field: "description" }].map(f => (
                                    <div key={f.field} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type="text" value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.isVerified} onChange={e => setForm({ ...form, isVerified: e.target.checked })} className="w-4 h-4 accent-[#5C67F2]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Document Verified</span>
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(empty); }} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.studentName) { toast.error("Select a student"); return; } saveMut.mutate(form); }} disabled={saveMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editId ? "Save" : "Add Document"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
