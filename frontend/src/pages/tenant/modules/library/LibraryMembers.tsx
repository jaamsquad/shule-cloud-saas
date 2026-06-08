import { useState } from "react";
import { Home, Plus, Search, Pencil, Trash2, Check, X, Loader2, Users, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyForm = { name: "", memberType: "student", admissionNo: "", class: "", phone: "", email: "", isActive: true };

export default function LibraryMembers() {
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [showImport, setShowImport] = useState(false);
    const qc = useQueryClient();

    const { data: members = [], isLoading } = useQuery({
        queryKey: ["library_members"],
        queryFn: async () => {
            const r = await api.get("/library/members");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: students = [] } = useQuery({
        queryKey: ["students"],
        queryFn: async () => {
            const r = await api.get("/students");
            return Array.isArray(r.data) ? r.data : [];
        },
        enabled: showImport,
    });

    const { data: staff = [] } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => {
            const r = await api.get("/staff");
            return Array.isArray(r.data) ? r.data : [];
        },
        enabled: showImport,
    });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/library/members/${editId}`, p) : api.post("/library/members", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["library_members"] }); qc.invalidateQueries({ queryKey: ["library_stats"] }); toast.success(editId ? "Member updated" : "Member registered"); setShowModal(false); setForm(emptyForm); setEditId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/library/members/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["library_members"] }); toast.success("Member removed"); setConfirmDelete(null); },
    });

    const importMut = useMutation({
        mutationFn: (members: any[]) => Promise.all(members.map(m => api.post("/library/members", m))),
        onSuccess: (_, members) => { qc.invalidateQueries({ queryKey: ["library_members"] }); toast.success(`${members.length} members imported`); setShowImport(false); },
        onError: () => toast.error("Import failed"),
    });

    const importFromStudents = () => {
        const existingIds = members.map((m: any) => m.admissionNo);
        const toImport = students.filter((s: any) => !existingIds.includes(s.registrationNo || s.studentId))
            .map((s: any) => ({ name: s.studentName || `${s.firstName} ${s.lastName}`, memberType: "student", admissionNo: s.registrationNo || s.studentId || "", class: s.studentClass || s.currentClass || "", phone: s.phone || "", email: s.email || "", isActive: true }));
        if (toImport.length === 0) { toast.info("All students already imported"); return; }
        importMut.mutate(toImport);
    };

    const importFromStaff = () => {
        const existingNames = members.map((m: any) => m.name.toLowerCase());
        const toImport = staff.filter((s: any) => !existingNames.includes((s.employeeName || s.name || "").toLowerCase()))
            .map((s: any) => ({ name: s.employeeName || s.name || "", memberType: "staff", admissionNo: s.nationalId || "", class: s.designation || "", phone: s.phone || "", email: s.email || "", isActive: true }));
        if (toImport.length === 0) { toast.info("All staff already imported"); return; }
        importMut.mutate(toImport);
    };

    const filtered = members.filter((m: any) =>
        (m.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.admissionNo || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Library</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Members</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowImport(!showImport)} className="h-10 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all">
                        <UserPlus className="w-4 h-4" /> Import
                    </button>
                    <button onClick={() => { setEditId(null); setForm(emptyForm); setShowModal(true); }} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-100">
                        <Plus className="w-4 h-4" /> Add Member
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Library Members</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{members.length} registered members</p>
                </div>

                {/* Import panel */}
                {showImport && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 mb-6 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-xs font-black text-indigo-800 uppercase tracking-widest">Quick Import from School Records</p>
                            <p className="text-[9px] text-indigo-500 font-bold uppercase mt-0.5">Only new records will be imported (no duplicates)</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={importFromStudents} disabled={importMut.isPending} className="h-9 px-4 bg-[#5C67F2] text-white font-black text-xs uppercase rounded-xl flex items-center gap-2 hover:bg-indigo-600 transition-all">
                                {importMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />} Import All Students ({students.length})
                            </button>
                            <button onClick={importFromStaff} disabled={importMut.isPending} className="h-9 px-4 bg-purple-600 text-white font-black text-xs uppercase rounded-xl flex items-center gap-2 hover:bg-purple-700 transition-all">
                                {importMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />} Import All Staff ({staff.length})
                            </button>
                        </div>
                    </div>
                )}

                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or admission no..."
                        className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><Users className="w-8 h-8" />{search ? "No members match" : "No members yet"}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-4">Name</th>
                                        <th className="py-4 px-4">Type</th>
                                        <th className="py-4 px-4">Admission / ID No</th>
                                        <th className="py-4 px-4">Class / Role</th>
                                        <th className="py-4 px-4">Contact</th>
                                        <th className="py-4 px-4 text-center">Status</th>
                                        <th className="py-4 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((m: any) => (
                                        <tr key={m._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 font-black text-slate-800">{m.name}</td>
                                            <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${m.memberType === "student" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>{m.memberType}</span></td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{m.admissionNo || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{m.class || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{m.phone || m.email || "—"}</td>
                                            <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${m.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{m.isActive !== false ? "Active" : "Inactive"}</span></td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => { setEditId(m._id); setForm({ name: m.name, memberType: m.memberType || "student", admissionNo: m.admissionNo || "", class: m.class || "", phone: m.phone || "", email: m.email || "", isActive: m.isActive !== false }); setShowModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                                    {confirmDelete === m._id ? (
                                                        <><button onClick={() => delMut.mutate(m._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                                    ) : (
                                                        <button onClick={() => setConfirmDelete(m._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit Member" : "Add Member"}</h3>
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(emptyForm); }} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Full Name*</div>
                                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Member Type</div>
                                    <select value={form.memberType} onChange={e => setForm({ ...form, memberType: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="student">Student</option>
                                        <option value="staff">Staff</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Admission / ID No</div>
                                    <input type="text" value={form.admissionNo} onChange={e => setForm({ ...form, admissionNo: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class / Designation</div>
                                    <input type="text" value={form.class} onChange={e => setForm({ ...form, class: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Phone</div>
                                    <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Email</div>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Active Membership</span>
                                    <button onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`w-11 h-6 rounded-full transition-all relative ${form.isActive ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? "right-0.5" : "left-0.5"}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => { setShowModal(false); setEditId(null); setForm(emptyForm); }} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                                <button onClick={() => { if (!form.name.trim()) { toast.error("Name required"); return; } saveMut.mutate({ ...form, name: form.name.trim() }); }} disabled={saveMut.isPending}
                                    className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editId ? "Save Changes" : "Register Member"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
