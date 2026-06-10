import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Building2, Plus, Loader2, X, Users, Crown, CalendarDays, FileText, Trash2,
    Check, Clock, UserPlus, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const DEPT_TYPES = [
    "Administration", "Academic Affairs", "Mathematics Department", "Languages Department",
    "Sciences Department", "Humanities Department", "ICT Department", "Library Department",
    "Finance Department", "Human Resources Department", "Sports Department", "Guidance & Counseling Department",
    "Transport Department", "Boarding Department", "Security Department", "Maintenance Department",
];
const DEPT_ROLES = ["Department Head", "Deputy Head", "Senior Teacher", "Teacher", "Accountant", "Librarian", "Counselor", "Technician", "Support Staff"];

const Stat = ({ label, value, color }: { label: string; value: any; color: string }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
    </div>
);

export default function Departments() {
    const qc = useQueryClient();
    const [selected, setSelected] = useState<any | null>(null);
    const [tab, setTab] = useState<"overview" | "members" | "meetings" | "leave">("overview");
    const [editDept, setEditDept] = useState<any | null>(null);

    const { data: summary } = useQuery({ queryKey: ["dept_summary"], queryFn: async () => (await api.get("/departments/summary")).data });
    const { data: departments = [], isLoading } = useQuery({ queryKey: ["departments"], queryFn: async () => { const r = await api.get("/departments"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: staff = [] } = useQuery({ queryKey: ["staff_for_dept"], queryFn: async () => { const r = await api.get("/staff"); return Array.isArray(r.data) ? r.data : []; } });

    const invalidate = () => { qc.invalidateQueries({ queryKey: ["departments"] }); qc.invalidateQueries({ queryKey: ["dept_summary"] }); };

    const delDept = useMutation({
        mutationFn: async (id: string) => api.delete(`/departments/${id}`),
        onSuccess: () => { toast.success("Department deleted"); setSelected(null); invalidate(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center"><Building2 className="w-5 h-5 text-indigo-600" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">Department Management</h1><p className="text-xs text-slate-500">Departments, HODs, members, meetings & leave</p></div>
                </div>
                <button onClick={() => setEditDept({})} className="inline-flex items-center gap-2 bg-[#5C67F2] text-white text-sm font-bold px-4 py-2 rounded-lg"><Plus className="w-4 h-4" /> New Department</button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Stat label="Departments" value={summary?.total ?? "—"} color="text-slate-800" />
                <Stat label="Active" value={summary?.active ?? "—"} color="text-emerald-600" />
                <Stat label="Staff Assigned" value={summary?.totalStaffAssigned ?? "—"} color="text-indigo-600" />
                <Stat label="Pending Leave" value={summary?.pendingLeave ?? "—"} color="text-amber-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* List */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-fit">
                    <p className="text-xs font-black text-slate-400 uppercase mb-3">Departments</p>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> : departments.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">No departments yet.</p>
                    ) : departments.map((d: any) => (
                        <button key={d._id} onClick={() => { setSelected(d); setTab("overview"); }}
                            className={`w-full text-left p-3 rounded-xl mb-1.5 border transition-colors ${selected?._id === d._id ? "border-[#5C67F2] bg-[#5C67F2]/5" : "border-transparent hover:bg-slate-50"}`}>
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-slate-700 text-sm">{d.name}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.status === "Inactive" ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>{d.status || "Active"}</span>
                            </div>
                            <p className="text-xs text-slate-400">{d.code || d.type || ""} · {d.memberCount || 0} members{d.headName ? ` · HOD: ${d.headName}` : ""}</p>
                        </button>
                    ))}
                </div>

                {/* Detail */}
                <div className="lg:col-span-2">
                    {!selected ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 text-sm">Select a department to manage it.</div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="font-black text-slate-800">{selected.name}</h2>
                                    <p className="text-xs text-slate-400">{[selected.code, selected.type].filter(Boolean).join(" · ")}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditDept(selected)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5C67F2] flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => { if (confirm(`Delete ${selected.name}?`)) delDept.mutate(selected._id); }} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="flex border-b border-slate-100 px-3">
                                {(["overview", "members", "meetings", "leave"] as const).map(t => (
                                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-xs font-bold capitalize border-b-2 ${tab === t ? "border-[#5C67F2] text-[#5C67F2]" : "border-transparent text-slate-400 hover:text-slate-600"}`}>{t}</button>
                                ))}
                            </div>
                            <div className="p-5">
                                {tab === "overview" && <Overview dept={selected} staff={staff} onChange={() => { invalidate(); }} />}
                                {tab === "members" && <Members dept={selected} staff={staff} />}
                                {tab === "meetings" && <Meetings dept={selected} />}
                                {tab === "leave" && <Leave dept={selected} />}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {editDept && <DeptForm initial={editDept} onClose={() => setEditDept(null)} onSaved={(d) => { invalidate(); setEditDept(null); if (d) setSelected(d); }} />}
        </div>
    );
}

function DeptForm({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: (d?: any) => void }) {
    const [form, setForm] = useState<any>({ status: "Active", ...initial });
    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
    const save = useMutation({
        mutationFn: async () => form._id ? api.patch(`/departments/${form._id}`, form) : api.post("/departments", form),
        onSuccess: (r: any) => { toast.success("Saved"); onSaved(r.data?._id ? r.data : form); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-8">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <h3 className="font-black text-slate-800">{form._id ? "Edit" : "New"} Department</h3>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Department Name *</label><input value={form.name || ""} onChange={e => set("name", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Code</label><input value={form.code || ""} onChange={e => set("code", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Type</label><select value={form.type || ""} onChange={e => set("type", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"><option value="">— Select —</option>{DEPT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Status</label><select value={form.status} onChange={e => set("status", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"><option>Active</option><option>Inactive</option></select></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Description</label><textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="text-sm font-bold text-slate-500 px-4 py-2">Cancel</button>
                    <button onClick={() => save.mutate()} disabled={save.isPending || !form.name} className="bg-[#5C67F2] text-white text-sm font-bold px-5 py-2 rounded disabled:opacity-50">Save</button>
                </div>
            </div>
        </div>
    );
}

function Overview({ dept, staff, onChange }: { dept: any; staff: any[]; onChange: () => void }) {
    const { data } = useQuery({ queryKey: ["dept_dash", dept._id], queryFn: async () => (await api.get(`/departments/${dept._id}/dashboard`)).data });
    const [hod, setHod] = useState("");
    const qc = useQueryClient();
    const setHead = useMutation({
        mutationFn: async () => { const s = staff.find((x: any) => x._id === hod); return api.post(`/departments/${dept._id}/head`, { staffId: hod, staffName: s?.employeeName, appointmentDate: new Date().toISOString().slice(0, 10) }); },
        onSuccess: () => { toast.success("HOD assigned"); qc.invalidateQueries({ queryKey: ["dept_dash", dept._id] }); qc.invalidateQueries({ queryKey: ["dept_members", dept._id] }); onChange(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Members" value={data?.totalStaff ?? "—"} color="text-slate-800" />
                <Stat label="Pending Leave" value={data?.pendingLeave ?? "—"} color="text-amber-600" />
                <Stat label="Upcoming Meetings" value={data?.upcomingMeetings ?? "—"} color="text-indigo-600" />
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p className="text-sm font-black text-slate-800 flex items-center gap-1"><Crown className="w-4 h-4 text-amber-500" /> {data?.head || "No HOD"}</p><p className="text-xs font-bold text-slate-400 uppercase">Head</p></div>
            </div>
            <div className="border border-slate-100 rounded-xl p-4">
                <p className="text-xs font-black text-slate-500 uppercase mb-2">Assign Head of Department</p>
                <div className="flex gap-2">
                    <select value={hod} onChange={e => setHod(e.target.value)} className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white">
                        <option value="">— Select staff —</option>
                        {staff.map((s: any) => <option key={s._id} value={s._id}>{s.employeeName} {s.designation ? `(${s.designation})` : ""}</option>)}
                    </select>
                    <button onClick={() => setHead.mutate()} disabled={!hod || setHead.isPending} className="bg-amber-500 text-white text-xs font-bold px-4 rounded-lg disabled:opacity-50 inline-flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> Set HOD</button>
                </div>
            </div>
        </div>
    );
}

function Members({ dept, staff }: { dept: any; staff: any[] }) {
    const qc = useQueryClient();
    const [staffId, setStaffId] = useState("");
    const [role, setRole] = useState("Teacher");
    const { data: members = [] } = useQuery({ queryKey: ["dept_members", dept._id], queryFn: async () => { const r = await api.get(`/departments/${dept._id}/members`); return Array.isArray(r.data) ? r.data : []; } });
    const add = useMutation({
        mutationFn: async () => { const s = staff.find((x: any) => x._id === staffId); return api.post(`/departments/${dept._id}/members`, { staffId, staffName: s?.employeeName, role }); },
        onSuccess: () => { toast.success("Member added"); setStaffId(""); qc.invalidateQueries({ queryKey: ["dept_members", dept._id] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const remove = useMutation({
        mutationFn: async (id: string) => api.delete(`/departments/${dept._id}/members/${id}`),
        onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["dept_members", dept._id] }); },
    });
    return (
        <div>
            <div className="flex gap-2 mb-4">
                <select value={staffId} onChange={e => setStaffId(e.target.value)} className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"><option value="">— Select staff —</option>{staff.map((s: any) => <option key={s._id} value={s._id}>{s.employeeName}</option>)}</select>
                <select value={role} onChange={e => setRole(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white">{DEPT_ROLES.map(r => <option key={r}>{r}</option>)}</select>
                <button onClick={() => add.mutate()} disabled={!staffId || add.isPending} className="bg-[#5C67F2] text-white text-xs font-bold px-4 rounded-lg disabled:opacity-50 inline-flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> Add</button>
            </div>
            {members.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No members yet.</p> : (
                <div className="space-y-1.5">
                    {members.map((m: any) => (
                        <div key={m._id} className="flex items-center justify-between border-b border-slate-50 py-2.5">
                            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-300" /><div><p className="text-sm font-bold text-slate-700">{m.staffName} {m.isHead && <Crown className="w-3.5 h-3.5 text-amber-500 inline" />}</p><p className="text-xs text-slate-400">{m.role}</p></div></div>
                            <button onClick={() => remove.mutate(m._id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Meetings({ dept }: { dept: any }) {
    const qc = useQueryClient();
    const [show, setShow] = useState(false);
    const [form, setForm] = useState<any>({});
    const { data: meetings = [] } = useQuery({ queryKey: ["dept_meetings", dept._id], queryFn: async () => { const r = await api.get(`/departments/${dept._id}/meetings`); return Array.isArray(r.data) ? r.data : []; } });
    const create = useMutation({
        mutationFn: async () => api.post(`/departments/${dept._id}/meetings`, form),
        onSuccess: () => { toast.success("Meeting added"); setShow(false); setForm({}); qc.invalidateQueries({ queryKey: ["dept_meetings", dept._id] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const del = useMutation({ mutationFn: async (id: string) => api.delete(`/departments/${dept._id}/meetings/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["dept_meetings", dept._id] }) });
    return (
        <div>
            <button onClick={() => setShow(s => !s)} className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold bg-[#5C67F2] text-white px-3 py-2 rounded-lg"><Plus className="w-3.5 h-3.5" /> Schedule Meeting</button>
            {show && (
                <div className="border border-slate-100 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input placeholder="Title" value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm sm:col-span-2" />
                    <input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                    <input type="time" value={form.time || ""} onChange={e => setForm({ ...form, time: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                    <input placeholder="Venue" value={form.venue || ""} onChange={e => setForm({ ...form, venue: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm sm:col-span-2" />
                    <textarea placeholder="Agenda" value={form.agenda || ""} onChange={e => setForm({ ...form, agenda: e.target.value })} rows={2} className="px-3 py-2 border border-slate-200 rounded-lg text-sm sm:col-span-2" />
                    <button onClick={() => create.mutate()} disabled={!form.title || create.isPending} className="bg-[#159a52] text-white text-xs font-bold px-4 py-2 rounded-lg sm:col-span-2 disabled:opacity-50">Save Meeting</button>
                </div>
            )}
            {meetings.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No meetings.</p> : meetings.map((m: any) => (
                <div key={m._id} className="flex items-center justify-between border-b border-slate-50 py-2.5">
                    <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-300" /><div><p className="text-sm font-bold text-slate-700">{m.title}</p><p className="text-xs text-slate-400">{[m.date, m.time, m.venue].filter(Boolean).join(" · ")}</p></div></div>
                    <button onClick={() => del.mutate(m._id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
            ))}
        </div>
    );
}

function Leave({ dept }: { dept: any }) {
    const qc = useQueryClient();
    const { data: leaves = [] } = useQuery({ queryKey: ["dept_leave", dept._id], queryFn: async () => { const r = await api.get(`/leave-requests?departmentId=${dept._id}`); return Array.isArray(r.data) ? r.data : []; } });
    const act = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: string }) => api.patch(`/leave-requests/${id}`, { action, by: "Admin" }),
        onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["dept_leave", dept._id] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const badge = (s: string) => s === "Approved" ? "bg-emerald-100 text-emerald-700" : s === "Rejected" ? "bg-rose-100 text-rose-700" : s === "HOD Approved" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";
    return (
        <div>
            {leaves.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No leave requests. Staff submit leave from the staff portal; it routes HOD → HR here.</p> : leaves.map((l: any) => (
                <div key={l._id} className="border border-slate-100 rounded-xl p-3 mb-2">
                    <div className="flex items-center justify-between">
                        <div><p className="text-sm font-bold text-slate-700">{l.staffName} <span className="text-xs font-normal text-slate-400">· {l.type}</span></p><p className="text-xs text-slate-400">{l.startDate} → {l.endDate} · {l.reason}</p></div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge(l.status)}`}>{l.status}</span>
                    </div>
                    {l.status !== "Approved" && l.status !== "Rejected" && (
                        <div className="flex gap-2 mt-2">
                            {l.status === "Pending" && <button onClick={() => act.mutate({ id: l._id, action: "hod-approve" })} className="text-[11px] font-bold bg-blue-500 text-white px-3 py-1.5 rounded inline-flex items-center gap-1"><Clock className="w-3 h-3" /> HOD Approve</button>}
                            {l.status === "HOD Approved" && <button onClick={() => act.mutate({ id: l._id, action: "hr-approve" })} className="text-[11px] font-bold bg-emerald-500 text-white px-3 py-1.5 rounded inline-flex items-center gap-1"><Check className="w-3 h-3" /> HR Approve</button>}
                            <button onClick={() => act.mutate({ id: l._id, action: "reject" })} className="text-[11px] font-bold border border-rose-200 text-rose-600 px-3 py-1.5 rounded">Reject</button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
