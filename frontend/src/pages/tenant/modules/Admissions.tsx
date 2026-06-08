import { useState } from "react";
import {
    Home, Plus, Search, Check, X, Loader2, UserPlus, Eye,
    Calendar, Phone, User, BookOpen, GraduationCap, Users, Pencil, Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS: Record<string, { color: string; dot: string; bg: string }> = {
    Pending:   { color: "text-amber-700",   dot: "bg-amber-400",   bg: "bg-amber-50 border-amber-200"   },
    Reviewing: { color: "text-blue-700",    dot: "bg-blue-400",    bg: "bg-blue-50 border-blue-200"     },
    Approved:  { color: "text-emerald-700", dot: "bg-emerald-400", bg: "bg-emerald-50 border-emerald-200" },
    Enrolled:  { color: "text-indigo-700",  dot: "bg-indigo-400",  bg: "bg-indigo-50 border-indigo-200" },
    Rejected:  { color: "text-rose-600",    dot: "bg-rose-400",    bg: "bg-rose-50 border-rose-200"     },
};

const empty = {
    firstName: "", lastName: "", gender: "Male", dob: "",
    admissionNumber: "", classApplied: "", previousSchool: "",
    parentName: "", parentPhone: "", parentEmail: "", parentRelation: "Father",
    address: "", notes: "", status: "Pending",
    applicationDate: new Date().toISOString().split("T")[0],
};

// ─── Component ────────────────────────────────────────────────────────────
export default function Admissions() {
    const [search, setSearch]           = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showModal, setShowModal]     = useState(false);
    const [form, setForm]               = useState(empty);
    const [editId, setEditId]           = useState<string | null>(null);
    const [viewRecord, setViewRecord]   = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [step, setStep]               = useState<1 | 2>(1);
    const qc = useQueryClient();

    // ── Queries ──────────────────────────────────────────────────────────
    const { data: admissions = [], isLoading } = useQuery({
        queryKey: ["admissions"],
        queryFn: async () => { const r = await api.get("/admissions"); return Array.isArray(r.data) ? r.data : []; },
    });

    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; },
    });

    // ── Mutations ─────────────────────────────────────────────────────────
    const saveMut = useMutation({
        mutationFn: (p: any) => editId
            ? api.patch(`/admissions/${editId}`, p)
            : api.post("/admissions", p),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admissions"] });
            toast.success(editId ? "Application updated" : "Application submitted successfully");
            setShowModal(false); setForm(empty); setEditId(null); setStep(1);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/admissions/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admissions"] }); toast.success("Record removed"); setConfirmDelete(null); },
    });

    const statusMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admissions/${id}`, { status }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admissions"] }); },
    });

    const enrollMut = useMutation({
        mutationFn: async (rec: any) => {
            await api.post("/students", {
                studentName: `${rec.firstName} ${rec.lastName}`,
                firstName: rec.firstName, lastName: rec.lastName,
                gender: rec.gender, dob: rec.dob,
                registrationNo: rec.admissionNumber || `ADM${Date.now()}`,
                studentClass: rec.classApplied,
                fatherName: rec.parentRelation === "Father" ? rec.parentName : "",
                motherName: rec.parentRelation === "Mother" ? rec.parentName : "",
                phone: rec.parentPhone, email: rec.parentEmail, address: rec.address,
                admissionDate: new Date().toISOString().split("T")[0],
                previousSchool: rec.previousSchool,
            });
            return api.patch(`/admissions/${rec._id}`, { status: "Enrolled" });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admissions"] });
            toast.success("🎉 Student enrolled and added to All Students!");
            setViewRecord(null);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Enrollment failed"),
    });

    // ── Filtering ─────────────────────────────────────────────────────────
    const filtered = admissions.filter((a: any) => {
        const name = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
        const mQ = !search || name.includes(search.toLowerCase()) || (a.admissionNumber || "").toLowerCase().includes(search.toLowerCase());
        const mS = statusFilter === "All" || a.status === statusFilter;
        return mQ && mS;
    });

    const counts: Record<string, number> = { All: admissions.length };
    Object.keys(STATUS).forEach(s => { counts[s] = admissions.filter((a: any) => a.status === s).length; });

    const openEdit = (a: any) => {
        setEditId(a._id);
        setForm({
            firstName: a.firstName || "", lastName: a.lastName || "", gender: a.gender || "Male",
            dob: a.dob || "", admissionNumber: a.admissionNumber || "", classApplied: a.classApplied || "",
            previousSchool: a.previousSchool || "", parentName: a.parentName || "",
            parentPhone: a.parentPhone || "", parentEmail: a.parentEmail || "",
            parentRelation: a.parentRelation || "Father", address: a.address || "",
            notes: a.notes || "", status: a.status || "Pending",
            applicationDate: a.applicationDate || new Date().toISOString().split("T")[0],
        });
        setStep(1); setShowModal(true);
    };

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-500">Students</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Admissions</span>
                </div>
                <button onClick={() => { setEditId(null); setForm(empty); setStep(1); setShowModal(true); }}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition-all">
                    <Plus className="w-4 h-4" /> New Application
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">

                {/* Page title */}
                <div className="mb-7">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <GraduationCap className="w-8 h-8 text-[#5C67F2]" /> Student Admissions
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                        Review applications, track status, and enroll approved students
                    </p>
                </div>

                {/* Status filter pills */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {["All", ...Object.keys(STATUS)].map(s => {
                        const sc = STATUS[s];
                        return (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wide border transition-all ${
                                    statusFilter === s
                                        ? s === "All" ? "bg-[#5C67F2] text-white border-[#5C67F2] shadow-md shadow-indigo-100"
                                                      : `${sc.bg} ${sc.color} shadow-sm`
                                        : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
                                }`}>
                                {sc && <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />}
                                {s} <span className="opacity-60">({counts[s] ?? 0})</span>
                            </button>
                        );
                    })}
                </div>

                {/* Search + count */}
                <div className="flex items-center gap-4 mb-5">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or admission no..."
                            className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} applications</span>
                </div>

                {/* Applications table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48 gap-2 text-slate-400 text-xs font-bold uppercase">
                            <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading applications...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-300">
                            <UserPlus className="w-12 h-12" />
                            <p className="text-xs font-black uppercase tracking-widest">
                                {search || statusFilter !== "All" ? "No applications match your filters" : "No applications yet — click New Application to start"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-5">Applicant</th>
                                        <th className="py-4 px-5">Adm. No</th>
                                        <th className="py-4 px-5">Class Applied</th>
                                        <th className="py-4 px-5">Parent / Guardian</th>
                                        <th className="py-4 px-5">Contact</th>
                                        <th className="py-4 px-5">Date</th>
                                        <th className="py-4 px-5 text-center">Status</th>
                                        <th className="py-4 px-5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((a: any) => {
                                        const sc = STATUS[a.status] || STATUS.Pending;
                                        const initials = `${(a.firstName || "?")[0]}${(a.lastName || "?")[0]}`.toUpperCase();
                                        return (
                                            <tr key={a._id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3.5 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${a.gender === "Female" ? "bg-pink-100 text-pink-600" : "bg-indigo-100 text-[#5C67F2]"}`}>
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-800">{a.firstName} {a.lastName}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{a.gender} {a.dob ? `· ${a.dob}` : ""}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-5 font-bold text-slate-600">{a.admissionNumber || "—"}</td>
                                                <td className="py-3.5 px-5">
                                                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                                                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                                        {a.classApplied || "Not set"}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 font-bold text-slate-700">{a.parentName || "—"}</td>
                                                <td className="py-3.5 px-5 font-bold text-slate-500">{a.parentPhone || "—"}</td>
                                                <td className="py-3.5 px-5 font-bold text-slate-500">{a.applicationDate || "—"}</td>
                                                <td className="py-3.5 px-5 text-center">
                                                    <select
                                                        value={a.status || "Pending"}
                                                        onChange={e => statusMut.mutate({ id: a._id, status: e.target.value })}
                                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border cursor-pointer focus:outline-none ${sc.bg} ${sc.color}`}
                                                    >
                                                        {Object.keys(STATUS).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button onClick={() => setViewRecord(a)} title="View details"
                                                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-[#5C67F2] flex items-center justify-center border border-slate-100 hover:border-indigo-200 transition-all">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => openEdit(a)} title="Edit"
                                                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 hover:border-amber-200 transition-all">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        {confirmDelete === a._id ? (
                                                            <>
                                                                <button onClick={() => delMut.mutate(a._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => setConfirmDelete(a._id)} title="Delete"
                                                                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 hover:border-rose-200 transition-all">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── View / Enroll modal ──────────────────────────────────── */}
            {viewRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-md w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative overflow-hidden">
                        {/* Color bar based on status */}
                        <div className={`h-1.5 w-full ${viewRecord.status === "Approved" || viewRecord.status === "Enrolled" ? "bg-gradient-to-r from-emerald-400 to-teal-500" : viewRecord.status === "Rejected" ? "bg-gradient-to-r from-rose-400 to-rose-600" : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"}`} />
                        <div className="p-7">
                            {/* Student header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${viewRecord.gender === "Female" ? "bg-pink-100 text-pink-600" : "bg-indigo-100 text-[#5C67F2]"}`}>
                                        {`${(viewRecord.firstName || "?")[0]}${(viewRecord.lastName || "?")[0]}`.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-900">{viewRecord.firstName} {viewRecord.lastName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${STATUS[viewRecord.status]?.bg || "bg-slate-50"} ${STATUS[viewRecord.status]?.color || "text-slate-500"}`}>{viewRecord.status}</span>
                                            {viewRecord.admissionNumber && <span className="text-[9px] text-slate-400 font-black uppercase">{viewRecord.admissionNumber}</span>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setViewRecord(null)} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {[
                                    ["Date of Birth", viewRecord.dob],
                                    ["Gender", viewRecord.gender],
                                    ["Class Applied", viewRecord.classApplied],
                                    ["Previous School", viewRecord.previousSchool],
                                    ["Parent / Guardian", viewRecord.parentName],
                                    ["Relation", viewRecord.parentRelation],
                                    ["Phone", viewRecord.parentPhone],
                                    ["Email", viewRecord.parentEmail],
                                    ["Application Date", viewRecord.applicationDate],
                                    ["Address", viewRecord.address],
                                ].filter(([, v]) => v).map(([label, value]) => (
                                    <div key={label} className="bg-slate-50 rounded-2xl px-4 py-3">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                                        <p className="text-xs font-black text-slate-700 mt-0.5 truncate">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {viewRecord.notes && (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-5">
                                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Notes</p>
                                    <p className="text-xs text-amber-700 font-medium mt-0.5">{viewRecord.notes}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                {viewRecord.status === "Approved" && (
                                    <button onClick={() => enrollMut.mutate(viewRecord)} disabled={enrollMut.isPending}
                                        className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-100 transition-all">
                                        {enrollMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Enroll Student
                                    </button>
                                )}
                                <button onClick={() => { openEdit(viewRecord); setViewRecord(null); }}
                                    className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all">
                                    Edit Application
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── New / Edit Application modal ─────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-white max-w-2xl w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase">{editId ? "Edit" : "New"} Application</h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Step {step} of 2 — {step === 1 ? "Student Information" : "Parent / Guardian"}</p>
                                </div>
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(empty); setStep(1); }} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            {/* Progress dots */}
                            <div className="flex items-center gap-2 mb-7">
                                {[1, 2].map(n => (
                                    <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${step >= n ? "bg-[#5C67F2]" : "bg-slate-100"}`} />
                                ))}
                            </div>

                            {/* Step 1: Student info */}
                            {step === 1 && (
                                <div className="grid grid-cols-2 gap-5">
                                    {[
                                        { label: "First Name*", field: "firstName" },
                                        { label: "Last Name*", field: "lastName" },
                                        { label: "Admission Number", field: "admissionNumber" },
                                        { label: "Date of Birth", field: "dob", type: "date" },
                                        { label: "Previous School", field: "previousSchool" },
                                        { label: "Application Date", field: "applicationDate", type: "date" },
                                    ].map(f => (
                                        <div key={f.field} className="relative">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                            <input type={f.type || "text"} value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 transition-all" />
                                        </div>
                                    ))}
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Gender</div>
                                        <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            {["Male", "Female", "Other"].map(g => <option key={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class Applied</div>
                                        <select value={form.classApplied} onChange={e => setForm({ ...form, classApplied: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            <option value="">— Select Class —</option>
                                            {classes.map((c: any) => <option key={c._id} value={c.levelName || c.className || c.name}>{c.levelName || c.className || c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Status</div>
                                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            {Object.keys(STATUS).map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative col-span-2">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Notes / Remarks</div>
                                        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none transition-all" />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Parent info */}
                            {step === 2 && (
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="relative col-span-2">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Parent / Guardian Full Name*</div>
                                        <input type="text" value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })}
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 transition-all" />
                                    </div>
                                    {[
                                        { label: "Phone Number*", field: "parentPhone" },
                                        { label: "Email Address", field: "parentEmail" },
                                    ].map(f => (
                                        <div key={f.field} className="relative">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                            <input type="text" value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 transition-all" />
                                        </div>
                                    ))}
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Relation to Student</div>
                                        <select value={form.parentRelation} onChange={e => setForm({ ...form, parentRelation: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                            {["Father", "Mother", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"].map(r => <option key={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative col-span-2">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Physical Address</div>
                                        <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 transition-all" />
                                    </div>
                                </div>
                            )}

                            {/* Footer actions */}
                            <div className="flex items-center justify-between mt-7">
                                <div>
                                    {step === 2 && (
                                        <button onClick={() => setStep(1)} className="px-5 py-2.5 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2">
                                            ← Back
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => { setShowModal(false); setEditId(null); setForm(empty); setStep(1); }} className="px-5 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                                        Cancel
                                    </button>
                                    {step === 1 ? (
                                        <button onClick={() => { if (!form.firstName || !form.lastName) { toast.error("First and last name are required"); return; } setStep(2); }}
                                            className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                                            Next: Parent Info →
                                        </button>
                                    ) : (
                                        <button onClick={() => { if (!form.parentPhone) { toast.error("Parent phone is required"); return; } saveMut.mutate(form); }}
                                            disabled={saveMut.isPending}
                                            className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                                            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            {editId ? "Save Changes" : "Submit Application"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
