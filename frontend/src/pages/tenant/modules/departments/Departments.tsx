import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/contexts/PermissionsContext";
import {
    Building2, Plus, Loader2, X, Users, Crown, CalendarDays, FileText, Trash2,
    Check, Clock, UserPlus, Pencil, ClipboardCheck, ShieldCheck, History as HistoryIcon,
    FolderOpen, Bell, Download, Package, Sparkles, AlertTriangle,
    ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
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

export const DEPT_TABS = ["overview", "members", "marks", "analysis", "supervision", "exams", "cbc", "timetable", "resources", "notices", "reports", "assets", "meetings", "leave", "audit"] as const;
export type DeptTab = typeof DEPT_TABS[number];
export const deptTabLabel = (t: string) => t === "marks" ? "Marks Approval" : t === "cbc" ? "CBC" : t === "notices" ? "Notices" : t.charAt(0).toUpperCase() + t.slice(1);

export default function Departments() {
    const qc = useQueryClient();
    const { isAdmin } = usePermissions();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selected, setSelected] = useState<any | null>(null);
    // Active tab is driven by ?tab= so the sidebar can deep-link to it.
    const urlTab = (searchParams.get("tab") || "overview") as DeptTab;
    const tab: DeptTab = DEPT_TABS.includes(urlTab) ? urlTab : "overview";
    const setTab = (t: DeptTab) => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set("tab", t); return p; }, { replace: true });
    const [editDept, setEditDept] = useState<any | null>(null);

    const { data: summary } = useQuery({ queryKey: ["dept_summary"], queryFn: async () => (await api.get("/departments/summary")).data, enabled: isAdmin });
    const { data: departments = [], isLoading } = useQuery({ queryKey: ["departments"], queryFn: async () => { const r = await api.get("/departments"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: staff = [] } = useQuery({ queryKey: ["staff_for_dept"], queryFn: async () => { const r = await api.get("/staff"); return Array.isArray(r.data) ? r.data : []; } });

    // A department head (non-admin) is scoped by the API to their own department(s).
    // Auto-select it and hide the picker so they land straight on their data.
    const isHodView = !isAdmin && departments.length <= 1;
    useEffect(() => {
        if (isHodView && departments.length === 1 && !selected) { setSelected(departments[0]); }
    }, [isHodView, departments, selected]);

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
                    <div><h1 className="text-xl font-black text-slate-800">{isHodView ? "My Department" : "Department Management"}</h1><p className="text-xs text-slate-500">{isHodView ? "Your department's data, analysis, marks & supervision" : "Departments, HODs, members, meetings & leave"}</p></div>
                </div>
                {isAdmin && <button onClick={() => setEditDept({})} className="inline-flex items-center gap-2 bg-[#5C67F2] text-white text-sm font-bold px-4 py-2 rounded-lg"><Plus className="w-4 h-4" /> New Department</button>}
            </div>

            {/* Admin-only summary stats */}
            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <Stat label="Departments" value={summary?.total ?? "—"} color="text-slate-800" />
                    <Stat label="Active" value={summary?.active ?? "—"} color="text-emerald-600" />
                    <Stat label="Staff Assigned" value={summary?.totalStaffAssigned ?? "—"} color="text-indigo-600" />
                    <Stat label="Pending Leave" value={summary?.pendingLeave ?? "—"} color="text-amber-600" />
                </div>
            )}

            {/* Department picker — a horizontal strip ON TOP (admins, or an HOD with >1 dept).
                A single-department HOD skips this and goes straight to their data. */}
            {!isHodView && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
                    <p className="text-xs font-black text-slate-400 uppercase mb-3">Departments</p>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> : departments.length === 0 ? (
                        <p className="text-sm text-slate-400 py-4 text-center">No departments yet.</p>
                    ) : (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {departments.map((d: any) => (
                                <button key={d._id} onClick={() => { setSelected(d); }}
                                    className={`text-left p-3 rounded-xl border transition-colors flex-shrink-0 w-60 ${selected?._id === d._id ? "border-[#5C67F2] bg-[#5C67F2]/5" : "border-slate-100 hover:bg-slate-50"}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-bold text-slate-700 text-sm truncate">{d.name}</p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${d.status === "Inactive" ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>{d.status || "Active"}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">{d.code || d.type || ""} · {d.memberCount || 0} members{d.headName ? ` · HOD: ${d.headName}` : ""}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="w-full">
                {/* Detail — full width */}
                <div className="min-w-0 w-full">
                    {!selected ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 text-sm">Select a department to manage it.</div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="font-black text-slate-800">{selected.name}</h2>
                                    <p className="text-xs text-slate-400">{[selected.code, selected.type].filter(Boolean).join(" · ")}</p>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditDept(selected)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5C67F2] flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => { if (confirm(`Delete ${selected.name}?`)) delDept.mutate(selected._id); }} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>
                            <div className="flex border-b border-slate-100 px-3 overflow-x-auto">
                                {DEPT_TABS.map(t => (
                                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-xs font-bold capitalize border-b-2 whitespace-nowrap ${tab === t ? "border-[#5C67F2] text-[#5C67F2]" : "border-transparent text-slate-400 hover:text-slate-600"}`}>{deptTabLabel(t)}</button>
                                ))}
                            </div>
                            <div className="p-5">
                                {tab === "overview" && <Overview dept={selected} staff={staff} onChange={() => { invalidate(); }} />}
                                {tab === "members" && <Members dept={selected} staff={staff} />}
                                {tab === "marks" && <MarksApproval dept={selected} />}
                                {tab === "analysis" && <Analysis dept={selected} />}
                                {tab === "supervision" && <Supervision dept={selected} />}
                                {tab === "exams" && <Examinations dept={selected} />}
                                {tab === "cbc" && <CBCAssessment dept={selected} />}
                                {tab === "timetable" && <DeptTimetable dept={selected} />}
                                {tab === "resources" && <Resources dept={selected} />}
                                {tab === "notices" && <Notices dept={selected} />}
                                {tab === "reports" && <Reports dept={selected} />}
                                {tab === "assets" && <Assets dept={selected} />}
                                {tab === "meetings" && <Meetings dept={selected} />}
                                {tab === "leave" && <Leave dept={selected} />}
                                {tab === "audit" && <AuditTrail dept={selected} />}
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
    const [form, setForm] = useState<any>({ status: "Active", subjects: [], ...initial });
    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
    const { data: allSubjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; } });
    const subjectNames: string[] = Array.from(new Set(allSubjects.map((s: any) => s.name || s.subjectName || s.title).filter(Boolean))) as string[];
    const selected: string[] = Array.isArray(form.subjects) ? form.subjects : [];
    const toggleSubject = (name: string) => set("subjects", selected.includes(name) ? selected.filter(s => s !== name) : [...selected, name]);
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
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Department Subjects <span className="font-normal text-slate-400">— power the HOD dashboard</span></label>
                        {subjectNames.length === 0 ? (
                            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-dashed border-slate-200">No subjects found. Create subjects first, then edit this department.</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                                {subjectNames.map(name => {
                                    const on = selected.includes(name);
                                    return (
                                        <button key={name} type="button" onClick={() => toggleSubject(name)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${on ? "bg-[#5C67F2] border-[#5C67F2] text-white" : "bg-white border-slate-200 text-slate-600 hover:border-[#5C67F2]"}`}>
                                            {on && <Check className="w-3 h-3 inline mr-1" />}{name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {selected.length > 0 && <p className="text-[11px] text-slate-400 mt-1">{selected.length} subject{selected.length !== 1 ? "s" : ""} assigned</p>}
                    </div>
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
    const { isAdmin } = usePermissions();
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
            {/* Only administrators may (re)assign the Head of Department. */}
            {isAdmin && (
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
            )}
        </div>
    );
}

function Members({ dept, staff }: { dept: any; staff: any[] }) {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { isAdmin } = usePermissions();
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
                        <div key={m._id} className="flex items-center justify-between border-b border-slate-50 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                            <button
                                onClick={() => { if (isAdmin && m.staffId) navigate(`/staff/profile/${m.staffId}?dept=${dept._id}`); }}
                                disabled={!isAdmin || !m.staffId}
                                className={`flex items-center gap-2 flex-1 min-w-0 text-left px-2 ${isAdmin && m.staffId ? "cursor-pointer" : "cursor-default"}`}>
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-[#5C67F2] font-black text-xs">{(m.staffName || "?").charAt(0)}</div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5 truncate">{m.staffName} {m.isHead && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}</p>
                                    <p className="text-xs text-slate-400">{m.role}{m.subjects?.length ? ` · ${m.subjects.join(", ")}` : ""}</p>
                                </div>
                                {isAdmin && m.staffId && <ChevronRightIcon className="w-4 h-4 text-slate-300 flex-shrink-0 ml-auto" />}
                            </button>
                            <button onClick={() => remove.mutate(m._id)} className="text-slate-400 hover:text-rose-500 px-2 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
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

// ── Examination Management ───────────────────────────────────────────────────
function Examinations({ dept }: { dept: any }) {
    const qc = useQueryClient();
    const [view, setView] = useState<"bank" | "moderation" | "papers" | "schedule" | "online">("bank");
    const { data, isLoading } = useQuery({
        queryKey: ["dept_exams", dept._id],
        queryFn: async () => (await api.get(`/departments/${dept._id}/examinations`)).data,
    });
    const moderate = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: string }) => api.patch(`/departments/${dept._id}/questions/${id}/${action}`),
        onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["dept_exams", dept._id] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const s = data?.summary || {};
    const pill = (st: string) => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${/(approv)/i.test(st) ? "bg-emerald-100 text-emerald-700" : /(reject)/i.test(st) ? "bg-rose-100 text-rose-700" : /(pending|draft)/i.test(st) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{st}</span>;

    if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;
    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <Stat label="Questions" value={s.questions ?? 0} color="text-indigo-600" />
                <Stat label="Pending Qs" value={s.questionsPending ?? 0} color="text-amber-600" />
                <Stat label="Papers" value={s.papers ?? 0} color="text-slate-800" />
                <Stat label="Schedules" value={s.schedules ?? 0} color="text-emerald-600" />
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
                {([["bank", "Question Bank"], ["moderation", "Moderation"], ["papers", "Papers"], ["schedule", "Schedule"], ["online", "Online Exams"]] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setView(v as any)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === v ? "bg-[#5C67F2] text-white" : "bg-slate-100 text-slate-600"}`}>{l}</button>
                ))}
            </div>

            {view === "bank" && (
                (data?.questionBank || []).length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No questions for department subjects.</p> : (
                    <div className="space-y-1.5">
                        {data.questionBank.map((b: any) => (
                            <div key={b.subject} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2.5">
                                <p className="text-sm font-bold text-slate-700">{b.subject}</p>
                                <div className="flex items-center gap-2 text-[11px]">
                                    <span className="text-slate-400">{b.total} total</span>
                                    <span className="text-emerald-600 font-bold">{b.approved} ✓</span>
                                    <span className="text-amber-600 font-bold">{b.pending} ⏳</span>
                                    <span className="text-rose-500 font-bold">{b.rejected} ✕</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {view === "moderation" && (
                (data?.pendingQuestions || []).length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No questions awaiting moderation. 🎉</p> : (
                    <div className="space-y-1.5">
                        {data.pendingQuestions.map((q: any) => (
                            <div key={q.id} className="border border-slate-100 rounded-xl px-3 py-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0"><p className="text-sm text-slate-700 line-clamp-2">{q.text || "(no text)"}</p><p className="text-[11px] text-slate-400 mt-0.5">{[q.subject, q.type, q.difficulty].filter(Boolean).join(" · ")}</p></div>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        <button onClick={() => moderate.mutate({ id: q.id, action: "approve" })} className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded">Approve</button>
                                        <button onClick={() => moderate.mutate({ id: q.id, action: "reject" })} className="text-[10px] font-bold border border-rose-200 text-rose-600 px-2.5 py-1 rounded">Reject</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {view === "papers" && (
                (data?.papers || []).length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No question papers for department subjects.</p> : (
                    <div className="space-y-1.5">
                        {data.papers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2.5">
                                <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{p.title || "(untitled)"}</p><p className="text-[11px] text-slate-400">{[p.subject, p.totalMarks ? `${p.totalMarks} marks` : ""].filter(Boolean).join(" · ")}</p></div>
                                {pill(p.status)}
                            </div>
                        ))}
                    </div>
                )
            )}

            {view === "schedule" && (
                (data?.schedules || []).length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No exam schedules for department subjects.</p> : (
                    <div className="space-y-1.5">
                        {data.schedules.map((sc: any) => (
                            <div key={sc.id} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2.5">
                                <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{sc.subject}{sc.className ? ` · ${sc.className}` : ""}</p><p className="text-[11px] text-slate-400">{[sc.date, [sc.startTime, sc.endTime].filter(Boolean).join("–"), sc.room].filter(Boolean).join(" · ")}</p></div>
                                {sc.invigilator && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">{sc.invigilator}</span>}
                            </div>
                        ))}
                    </div>
                )
            )}

            {view === "online" && (
                (data?.onlineExams || []).length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No online exams for department subjects.</p> : (
                    <div className="space-y-1.5">
                        {data.onlineExams.map((e: any) => (
                            <div key={e.id} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2.5">
                                <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{e.title || "(untitled)"}</p><p className="text-[11px] text-slate-400">{[e.subject, e.startAt].filter(Boolean).join(" · ")}</p></div>
                                {e.status && pill(e.status)}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

// ── Lesson & Teacher Supervision ─────────────────────────────────────────────
function Supervision({ dept }: { dept: any }) {
    const [view, setView] = useState<"teachers" | "schemes" | "plans">("teachers");
    const { data, isLoading } = useQuery({
        queryKey: ["dept_supervision", dept._id],
        queryFn: async () => (await api.get(`/departments/${dept._id}/supervision`)).data,
    });
    const s = data?.summary || {};
    const bar = (pct: number) => <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 65 ? "#16a34a" : pct >= 40 ? "#f59e0b" : "#dc2626" }} /></div>;
    const statusPill = (st: string) => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[st] || (/(not sub|draft)/i.test(st) ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700")}`}>{st}</span>;

    if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;
    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <Stat label="Schemes" value={`${s.schemesCompleted ?? 0}/${s.schemes ?? 0}`} color="text-indigo-600" />
                <Stat label="Lesson Plans" value={`${s.lessonPlansCompleted ?? 0}/${s.lessonPlans ?? 0}`} color="text-indigo-600" />
                <Stat label="Avg Coverage" value={`${s.avgCoverage ?? 0}%`} color="text-emerald-600" />
                <Stat label="Teachers" value={s.teachers ?? 0} color="text-slate-800" />
            </div>
            <div className="flex gap-1.5 mb-3">
                {(["teachers", "schemes", "plans"] as const).map(v => (
                    <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${view === v ? "bg-[#5C67F2] text-white" : "bg-slate-100 text-slate-600"}`}>{v === "plans" ? "Lesson Plans" : v}</button>
                ))}
            </div>

            {view === "teachers" && (
                (data?.teacherSupervision || []).length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No teachers to supervise. Assign members with dept subjects.</p> : (
                    <div className="space-y-2">
                        {data.teacherSupervision.map((t: any) => (
                            <div key={t.staffId} className="border border-slate-100 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">{t.staffName}{t.isHead && <Crown className="w-3.5 h-3.5 text-amber-500" />}</p>
                                    <div className="flex items-center gap-2">{bar(t.coverage)}<span className="text-[11px] font-black text-slate-500">{t.coverage}%</span></div>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                                    <span>Subjects: <b className="text-slate-600">{t.subjects.join(", ") || "—"}</b></span>
                                    <span>Classes: <b className="text-slate-600">{t.classes.join(", ") || "—"}</b></span>
                                    <span>Schemes: <b className="text-slate-600">{t.schemesDone}/{t.schemes}</b></span>
                                    <span>Plans: <b className="text-slate-600">{t.lessonPlansDone}/{t.lessonPlans}</b></span>
                                </div>
                                {t.markSubmission?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {t.subjects.map((sub: string, i: number) => (
                                            <span key={sub} className="inline-flex items-center gap-1 text-[10px] text-slate-500">{sub}: {statusPill(t.markSubmission[i] || "Not submitted")}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {view === "schemes" && (
                (data?.schemes || []).length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No schemes of work for department subjects.</p> : (
                    <div className="space-y-1.5">
                        {data.schemes.map((sc: any) => (
                            <div key={sc.id} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2.5">
                                <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{sc.subject}{sc.className ? ` · ${sc.className}` : ""}</p><p className="text-[11px] text-slate-400">{[sc.term, sc.year].filter(Boolean).join(" · ")}</p></div>
                                <div className="flex items-center gap-2 flex-shrink-0">{bar(sc.coverage)}<span className="text-[11px] font-black text-slate-500 w-9 text-right">{sc.coverage}%</span>{statusPill(sc.status)}</div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {view === "plans" && (
                (data?.lessonPlans || []).length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No lesson plans for department subjects.</p> : (
                    <div className="space-y-1.5">
                        {data.lessonPlans.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2.5">
                                <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{p.topic || "(untitled)"}</p><p className="text-[11px] text-slate-400">{[p.subject, p.className, p.date].filter(Boolean).join(" · ")}</p></div>
                                {statusPill(p.status)}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

// ── Department Academic Analysis ─────────────────────────────────────────────
const barColor = (v: number) => v >= 65 ? "#16a34a" : v >= 50 ? "#f59e0b" : "#dc2626";

function Analysis({ dept }: { dept: any }) {
    const [examId, setExamId] = useState("");
    const [compareId, setCompareId] = useState("");
    const { data: exams = [] } = useQuery({ queryKey: ["exams_for_analysis"], queryFn: async () => { const r = await api.get("/academics/exams"); return Array.isArray(r.data) ? r.data : []; } });
    const activeExam = examId || exams[0]?._id || "";
    const { data, isLoading } = useQuery({
        queryKey: ["dept_analysis", dept._id, activeExam, compareId],
        enabled: !!activeExam,
        queryFn: async () => (await api.get(`/departments/${dept._id}/analysis`, { params: { examId: activeExam, compareExamId: compareId || undefined } })).data,
    });

    const HBar = ({ rows, labelKey }: { rows: any[]; labelKey: string }) => (
        <div style={{ height: Math.max(120, (rows?.length || 1) * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey={labelKey} width={110} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "Mean"]} />
                    <Bar dataKey="meanPct" radius={[0, 4, 4, 0]}>
                        {(rows || []).map((r: any, i: number) => <Cell key={i} fill={barColor(r.meanPct)} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <select value={activeExam} onChange={e => setExamId(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="">— Exam —</option>
                    {exams.map((e: any) => <option key={e._id} value={e._id}>{e.examName || e.name} {e.term ? `· ${e.term}` : ""}</option>)}
                </select>
                <select value={compareId} onChange={e => setCompareId(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="">— Compare with (term/year)… —</option>
                    {exams.filter((e: any) => e._id !== activeExam).map((e: any) => <option key={e._id} value={e._id}>{e.examName || e.name} {e.term ? `· ${e.term}` : ""}</option>)}
                </select>
            </div>

            {!activeExam ? <p className="text-sm text-slate-400 text-center py-6">Choose an exam to analyse.</p> : isLoading || !data ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
            ) : (
                <div className="space-y-5">
                    {/* Overall */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Stat label="Dept Mean %" value={`${data.overall?.meanPct ?? 0}%`} color="text-emerald-600" />
                        <Stat label="Mean Points" value={data.overall?.meanPoints ?? 0} color="text-indigo-600" />
                        <Stat label="Students" value={data.overall?.students ?? 0} color="text-slate-800" />
                        <Stat label="Subjects" value={data.overall?.subjects ?? 0} color="text-slate-800" />
                    </div>

                    {/* Comparison */}
                    {data.comparison && (
                        <div className="bg-white rounded-xl border border-slate-100 p-4">
                            <p className="text-xs font-black text-slate-500 uppercase mb-2">Comparison</p>
                            <div className="flex items-center gap-4">
                                <div className="text-lg font-black text-slate-800">{data.comparison.currentMeanPct}% <span className="text-sm text-slate-400">vs {data.comparison.previousMeanPct}%</span></div>
                                <span className={`text-sm font-bold ${data.comparison.change >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{data.comparison.change >= 0 ? "▲ +" : "▼ "}{data.comparison.change}%</span>
                            </div>
                        </div>
                    )}

                    <Panel title="Subject Performance">{data.subjectPerformance?.length ? <HBar rows={data.subjectPerformance} labelKey="subject" /> : <Muted />}</Panel>
                    <Panel title="Class Performance">{data.classPerformance?.length ? <HBar rows={data.classPerformance} labelKey="className" /> : <Muted />}</Panel>
                    <Panel title="Stream Performance">{data.streamPerformance?.length ? <HBar rows={data.streamPerformance} labelKey="stream" /> : <Muted />}</Panel>
                    <Panel title="Teacher Performance">
                        {data.teacherPerformance?.length ? (
                            <div className="space-y-1.5">
                                {data.teacherPerformance.map((t: any) => (
                                    <div key={t.teacher} className="flex items-center justify-between border-b border-slate-50 py-2">
                                        <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{t.teacher}</p><p className="text-[11px] text-slate-400 truncate">{t.subjects.join(", ")}</p></div>
                                        <span className="text-sm font-black" style={{ color: barColor(t.meanPct) }}>{t.meanPct}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : <Muted />}
                    </Panel>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Panel title="Top Students">
                            <RankList rows={data.topStudents} />
                        </Panel>
                        <Panel title="Weak Students">
                            <RankList rows={data.weakStudents} />
                        </Panel>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Panel title="Top Classes"><ClassList rows={data.topClasses} /></Panel>
                        <Panel title="Weak Classes"><ClassList rows={data.weakClasses} /></Panel>
                    </div>

                    <Panel title="Grading Distribution">
                        <div className="flex flex-wrap gap-2">
                            {(data.gradingDistribution || []).sort((a: any, b: any) => b.count - a.count).map((g: any) => (
                                <div key={g.grade} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-center min-w-[54px]">
                                    <p className="text-base font-black text-slate-800">{g.count}</p><p className="text-[10px] font-bold text-slate-400">{g.grade}</p>
                                </div>
                            ))}
                            {(data.gradingDistribution || []).length === 0 && <Muted />}
                        </div>
                    </Panel>
                </div>
            )}
        </div>
    );
}
const Panel = ({ title, children }: { title: string; children: any }) => (
    <div className="bg-white rounded-xl border border-slate-100 p-4"><p className="text-xs font-black text-slate-500 uppercase mb-3">{title}</p>{children}</div>
);
const Muted = () => <p className="text-sm text-slate-400 text-center py-4">No data.</p>;
const RankList = ({ rows }: { rows: any[] }) => (
    (rows || []).length === 0 ? <Muted /> : (
        <div className="space-y-1">
            {rows.map((s: any, i: number) => (
                <div key={`${s.adm}-${i}`} className="flex items-center justify-between border-b border-slate-50 py-1.5">
                    <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{s.name}</p><p className="text-[11px] text-slate-400 truncate">{s.adm} · {s.className}{s.stream ? ` · ${s.stream}` : ""}</p></div>
                    <span className="text-sm font-black" style={{ color: barColor(s.meanPct) }}>{s.meanPct}%</span>
                </div>
            ))}
        </div>
    )
);
const ClassList = ({ rows }: { rows: any[] }) => (
    (rows || []).length === 0 ? <Muted /> : (
        <div className="space-y-1">
            {rows.map((c: any) => (
                <div key={c.className} className="flex items-center justify-between border-b border-slate-50 py-1.5">
                    <span className="text-sm font-bold text-slate-700">{c.className}</span>
                    <span className="text-sm font-black" style={{ color: barColor(c.meanPct) }}>{c.meanPct}% <span className="text-[11px] text-slate-400 font-normal">({c.students})</span></span>
                </div>
            ))}
        </div>
    )
);

// ── Marks Approval (HOD moderation) ──────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
    Approved: "bg-emerald-100 text-emerald-700", Submitted: "bg-blue-100 text-blue-700",
    Returned: "bg-amber-100 text-amber-700", Rejected: "bg-rose-100 text-rose-700",
    Resubmitted: "bg-violet-100 text-violet-700",
    Locked: "bg-slate-800 text-white", Draft: "bg-slate-100 text-slate-500", Missing: "bg-rose-50 text-rose-600",
};

function MarksApproval({ dept }: { dept: any }) {
    const qc = useQueryClient();
    const [examId, setExamId] = useState("");
    const [historyFor, setHistoryFor] = useState<any | null>(null);

    const { data: exams = [] } = useQuery({ queryKey: ["exams_for_approval"], queryFn: async () => { const r = await api.get("/academics/exams"); return Array.isArray(r.data) ? r.data : []; } });
    const activeExam = examId || exams[0]?._id || "";
    const { data: overview, isLoading } = useQuery({
        queryKey: ["mark_overview", activeExam, dept._id],
        enabled: !!activeExam,
        queryFn: async () => (await api.get(`/mark-approvals/overview`, { params: { examId: activeExam, departmentId: dept._id } })).data,
    });
    const { data: batches = [] } = useQuery({
        queryKey: ["mark_batches", activeExam],
        enabled: !!activeExam,
        queryFn: async () => { const r = await api.get(`/mark-approvals`, { params: { examId: activeExam } }); return Array.isArray(r.data) ? r.data : []; },
    });
    const batchBySubject: Record<string, any> = {};
    batches.forEach((b: any) => { batchBySubject[(b.subject || "").toLowerCase().trim()] = b; });

    const refetchApproval = () => { qc.invalidateQueries({ queryKey: ["mark_overview", activeExam, dept._id] }); qc.invalidateQueries({ queryKey: ["mark_batches", activeExam] }); };
    const act = useMutation({
        mutationFn: async ({ id, action, note }: { id: string; action: string; note?: string }) => api.patch(`/mark-approvals/${id}/${action}`, { note }),
        onSuccess: () => { toast.success("Updated"); refetchApproval(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    // Direct moderation by subject — works even for "Draft" subjects that have marks
    // but were never formally submitted (creates the batch on the fly).
    const activeExamObj = exams.find((e: any) => e._id === activeExam);
    const directModerate = useMutation({
        mutationFn: async ({ subject, action, note }: { subject: string; action: string; note?: string }) =>
            api.post(`/mark-approvals/moderate`, { examId: activeExam, examName: activeExamObj?.examName || activeExamObj?.name || "", subject, className: activeExamObj?.classLevel || "", action, note }),
        onSuccess: () => { toast.success("Updated"); refetchApproval(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const c = overview?.counts || {};
    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <ClipboardCheck className="w-4 h-4 text-[#5C67F2]" />
                <select value={activeExam} onChange={e => setExamId(e.target.value)} className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="">— Select exam —</option>
                    {exams.map((e: any) => <option key={e._id} value={e._id}>{e.examName || e.name} {e.term ? `· ${e.term}` : ""}</option>)}
                </select>
            </div>

            {!activeExam ? <p className="text-sm text-slate-400 text-center py-6">Choose an exam to review its marks.</p> : isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                        <Stat label="Submitted" value={c.submitted ?? 0} color="text-blue-600" />
                        <Stat label="Approved" value={c.approved ?? 0} color="text-emerald-600" />
                        <Stat label="Pending" value={c.pending ?? 0} color="text-amber-600" />
                        <Stat label="Locked" value={c.locked ?? 0} color="text-slate-800" />
                        <Stat label="Missing" value={c.missing ?? 0} color="text-rose-600" />
                    </div>
                    <div className="space-y-1.5">
                        {(overview?.subjects || []).map((s: any) => {
                            const batch = batchBySubject[(s.subject || "").toLowerCase().trim()];
                            return (
                                <div key={s.subject} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2.5">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-700 truncate">{s.subject}</p>
                                        <p className="text-[11px] text-slate-400">{s.entries} entries{batch?.submittedBy ? ` · by ${batch.submittedBy}` : ""}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status] || "bg-slate-100 text-slate-500"}`}>{s.status}</span>
                                        {/* Approve/Reject available whenever marks exist and aren't locked —
                                            including Draft (marks saved but never submitted). Uses the
                                            direct-moderate endpoint when there's no batch yet. */}
                                        {s.hasMarks && !["Approved", "Locked"].includes(s.status) && (
                                            <>
                                                <button onClick={() => batch ? act.mutate({ id: batch._id, action: "approve" }) : directModerate.mutate({ subject: s.subject, action: "approve" })} className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Approve</button>
                                                <button onClick={() => batch ? act.mutate({ id: batch._id, action: "return", note: "Please correct" }) : directModerate.mutate({ subject: s.subject, action: "return", note: "Please correct" })} className="text-[10px] font-bold border border-amber-200 text-amber-600 px-2.5 py-1 rounded">Return</button>
                                                <button onClick={() => batch ? act.mutate({ id: batch._id, action: "reject" }) : directModerate.mutate({ subject: s.subject, action: "reject" })} className="text-[10px] font-bold border border-rose-200 text-rose-600 px-2.5 py-1 rounded">Reject</button>
                                            </>
                                        )}
                                        {s.status === "Approved" && <button onClick={() => batch ? act.mutate({ id: batch._id, action: "lock" }) : directModerate.mutate({ subject: s.subject, action: "lock" })} className="text-[10px] font-bold bg-slate-800 text-white px-2.5 py-1 rounded">Lock</button>}
                                        {s.status === "Locked" && <button onClick={() => batch ? act.mutate({ id: batch._id, action: "unlock" }) : directModerate.mutate({ subject: s.subject, action: "unlock" })} className="text-[10px] font-bold border border-slate-300 text-slate-600 px-2.5 py-1 rounded">Unlock</button>}
                                        {batch && <button onClick={() => setHistoryFor(batch)} title="Moderation history" className="text-slate-400 hover:text-[#5C67F2]"><HistoryIcon className="w-3.5 h-3.5" /></button>}
                                    </div>
                                </div>
                            );
                        })}
                        {(overview?.subjects || []).length === 0 && <p className="text-sm text-slate-400 text-center py-6">No marks or expected subjects for this exam.</p>}
                    </div>
                </>
            )}
            {historyFor && <HistoryModal batch={historyFor} onClose={() => setHistoryFor(null)} />}
        </div>
    );
}

function HistoryModal({ batch, onClose }: { batch: any; onClose: () => void }) {
    const { data } = useQuery({ queryKey: ["mark_history", batch._id], queryFn: async () => (await api.get(`/mark-approvals/${batch._id}/history`)).data });
    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <h3 className="font-black text-slate-800">{data?.subject || batch.subject} · Moderation History</h3>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 max-h-96 overflow-y-auto">
                    {(data?.history || []).length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No history.</p> : (
                        <div className="space-y-2">
                            {(data?.history || []).map((h: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 border-l-2 border-slate-100 pl-3 py-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[h.action] || "bg-slate-100 text-slate-500"}`}>{h.action}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-700">{h.by}</p>
                                        <p className="text-[11px] text-slate-400">{new Date(h.at).toLocaleString()}{h.note ? ` · ${h.note}` : ""}</p>
                                        {Array.isArray(h.changes) && h.changes.length > 0 && (
                                            <div className="mt-1.5 rounded-lg bg-violet-50/70 border border-violet-100 p-2 space-y-0.5">
                                                <p className="text-[9px] font-black uppercase tracking-wider text-violet-500 mb-1">Marks changed</p>
                                                {h.changes.map((c: any, j: number) => (
                                                    <div key={j} className="flex items-center justify-between gap-2 text-[11px]">
                                                        <span className="font-semibold text-slate-600 truncate">{c.name}</span>
                                                        <span className="font-mono font-bold flex-shrink-0">
                                                            <span className="text-slate-400">{c.from == null ? "—" : c.from}</span>
                                                            <span className="text-slate-300 mx-1">→</span>
                                                            <span className="text-violet-700">{c.to}</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Audit Trail (read) ───────────────────────────────────────────────────────
function AuditTrail({ dept }: { dept: any }) {
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ["audit_logs", dept._id],
        queryFn: async () => { const r = await api.get(`/audit-logs`, { params: { departmentId: dept._id, limit: 100 } }); return Array.isArray(r.data) ? r.data : []; },
    });
    const badge = (a: string) => STATUS_BADGE[a] || (/(delete|reject)/i.test(a) ? "bg-rose-100 text-rose-700" : /(create|approv|submit)/i.test(a) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600");
    if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;
    return logs.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No audited actions for this department yet.</p> : (
        <div className="space-y-1.5">
            {logs.map((l: any) => (
                <div key={l._id} className="flex items-start justify-between border-b border-slate-50 py-2">
                    <div className="flex items-start gap-2 min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge(l.action)}`}>{l.action}</span>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{l.entity}{l.meta?.subject ? ` · ${l.meta.subject}` : ""}</p>
                            <p className="text-[11px] text-slate-400 truncate">{l.userName} · {new Date(l.at).toLocaleString()} · {l.ip || "—"}</p>
                        </div>
                    </div>
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

// ── CSV export helper (shared) ───────────────────────────────────────────────
function exportCSV(filename: string, columns: string[], rows: any[][]) {
    const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [columns.join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── CBC Assessment ───────────────────────────────────────────────────────────
const CBC_COLOR: Record<string, string> = { EE: "#10B981", ME: "#1D4ED8", AE: "#F59E0B", BE: "#EF4444" };
function CBCAssessment({ dept }: { dept: any }) {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ["dept_cbc", dept._id], queryFn: async () => (await api.get(`/departments/${dept._id}/cbc`)).data });
    const moderate = useMutation({
        mutationFn: async ({ area, action }: { area: string; action: string }) => api.patch(`/departments/${dept._id}/cbc/${action}`, { area }),
        onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["dept_cbc", dept._id] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;
    if (!data?.isCbc) return <p className="text-sm text-slate-400 text-center py-6">No CBC learning areas or activities for this department. (Applies to CBC-curriculum schools.)</p>;
    const s = data.summary || {};
    const approvalFor = (area: string) => (data.approvals || []).find((a: any) => a.area?.toLowerCase().trim() === area.toLowerCase().trim());
    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <Stat label="Learning Areas" value={s.learningAreas ?? 0} color="text-indigo-600" />
                <Stat label="Activities" value={s.activities ?? 0} color="text-slate-800" />
                <Stat label="Assessments" value={s.assessments ?? 0} color="text-emerald-600" />
                <Stat label="Learners" value={s.learners ?? 0} color="text-slate-800" />
            </div>
            <Panel title="Rubric — Competency Levels">
                <div className="flex flex-wrap gap-2">
                    {(data.rubric || []).map((r: any) => (
                        <div key={r.code} className="px-3 py-2 rounded-lg border text-center min-w-[70px]" style={{ borderColor: CBC_COLOR[r.code], background: `${CBC_COLOR[r.code]}12` }}>
                            <p className="text-base font-black" style={{ color: CBC_COLOR[r.code] }}>{r.count}</p><p className="text-[10px] font-bold text-slate-500">{r.code}</p>
                        </div>
                    ))}
                </div>
            </Panel>
            <div className="mt-4"><Panel title="Competency Report by Learning Area">
                {(data.competencyReport || []).length === 0 ? <Muted /> : (
                    <div className="space-y-2">
                        {data.competencyReport.map((c: any) => {
                            const ap = approvalFor(c.area);
                            return (
                                <div key={c.area} className="border border-slate-100 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-bold text-slate-700">{c.area}</p>
                                        <div className="flex items-center gap-2">
                                            {ap && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ap.status === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{ap.status}</span>}
                                            <button onClick={() => moderate.mutate({ area: c.area, action: "approve" })} className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded">Approve</button>
                                            <button onClick={() => moderate.mutate({ area: c.area, action: "reject" })} className="text-[10px] font-bold border border-rose-200 text-rose-600 px-2.5 py-1 rounded">Reject</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                                            {c.levels.map((lv: any) => lv.count > 0 && <div key={lv.code} style={{ width: `${(lv.count / c.assessed) * 100}%`, background: CBC_COLOR[lv.code] }} title={`${lv.code}: ${lv.count}`} />)}
                                        </div>
                                        <span className="text-[11px] text-slate-400">{c.learners} learners · {c.assessed} assessed</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Panel></div>
        </div>
    );
}

// ── Department Timetable + conflicts ─────────────────────────────────────────
function DeptTimetable({ dept }: { dept: any }) {
    const { data, isLoading } = useQuery({ queryKey: ["dept_timetable", dept._id], queryFn: async () => (await api.get(`/departments/${dept._id}/timetable`)).data });
    if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;
    const s = data?.summary || {};
    return (
        <div>
            <div className="grid grid-cols-3 gap-2 mb-4">
                <Stat label="Lessons" value={s.lessons ?? 0} color="text-indigo-600" />
                <Stat label="Teachers" value={s.teachers ?? 0} color="text-slate-800" />
                <Stat label="Conflicts" value={s.conflicts ?? 0} color={s.conflicts ? "text-rose-600" : "text-emerald-600"} />
            </div>
            {(data?.conflicts || []).length > 0 && (
                <Panel title="⚠️ Timetable Conflicts">
                    <div className="space-y-1.5">
                        {data.conflicts.map((c: any, i: number) => (
                            <div key={i} className="border border-rose-100 bg-rose-50/40 rounded-xl px-3 py-2">
                                <p className="text-sm font-bold text-rose-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {c.teacher} · {c.day} · {c.period}</p>
                                <p className="text-[11px] text-slate-500">{c.clashes.map((x: any) => `${x.subject}${x.className ? ` (${x.className})` : ""}`).join(" ⨯ ")}</p>
                            </div>
                        ))}
                    </div>
                </Panel>
            )}
            <div className="mt-4"><Panel title="Teaching Load">
                {(data?.teachingLoad || []).length === 0 ? <Muted /> : (
                    <div className="space-y-1.5">
                        {data.teachingLoad.map((t: any) => (
                            <div key={t.teacher} className="flex items-center justify-between border-b border-slate-50 py-2">
                                <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{t.teacher}</p><p className="text-[11px] text-slate-400 truncate">{t.subjects.join(", ")}</p></div>
                                <span className="text-sm font-black text-indigo-600">{t.lessons} <span className="text-[11px] text-slate-400 font-normal">lessons</span></span>
                            </div>
                        ))}
                    </div>
                )}
            </Panel></div>
        </div>
    );
}

// ── Resources / Documents ────────────────────────────────────────────────────
const RESOURCE_CATS = ["Past Paper", "Marking Scheme", "Lesson Notes", "Revision Material", "Policy", "Teaching Guide", "Research", "Circular", "Document"];
function Resources({ dept }: { dept: any }) {
    const qc = useQueryClient();
    const [show, setShow] = useState(false);
    const [form, setForm] = useState<any>({ category: "Document" });
    const { data: items = [] } = useQuery({ queryKey: ["dept_resources", dept._id], queryFn: async () => { const r = await api.get(`/departments/${dept._id}/resources`); return Array.isArray(r.data) ? r.data : []; } });
    const add = useMutation({
        mutationFn: async () => api.post(`/departments/${dept._id}/resources`, form),
        onSuccess: () => { toast.success("Uploaded"); setShow(false); setForm({ category: "Document" }); qc.invalidateQueries({ queryKey: ["dept_resources", dept._id] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const del = useMutation({ mutationFn: async (id: string) => api.delete(`/departments/${dept._id}/resources/${id}`), onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["dept_resources", dept._id] }); } });
    const onFile = (e: any) => { const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => setForm((p: any) => ({ ...p, fileData: rd.result, fileName: f.name, fileType: f.type })); rd.readAsDataURL(f); };
    return (
        <div>
            <button onClick={() => setShow(s => !s)} className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold bg-[#5C67F2] text-white px-3 py-2 rounded-lg"><Plus className="w-3.5 h-3.5" /> Upload Resource</button>
            {show && (
                <div className="border border-slate-100 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input placeholder="Title" value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm sm:col-span-2" />
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white">{RESOURCE_CATS.map(c => <option key={c}>{c}</option>)}</select>
                    <input type="file" onChange={onFile} className="h-10 text-xs pt-2" />
                    <button onClick={() => add.mutate()} disabled={!form.title || add.isPending} className="bg-[#159a52] text-white text-xs font-bold px-4 py-2 rounded-lg sm:col-span-2 disabled:opacity-50">Save Resource</button>
                </div>
            )}
            {items.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No resources uploaded yet.</p> : (
                <div className="space-y-1.5">
                    {items.map((r: any) => (
                        <div key={r._id} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2 min-w-0"><FolderOpen className="w-4 h-4 text-slate-300 flex-shrink-0" /><div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{r.title}</p><p className="text-[11px] text-slate-400">{[r.category, r.uploadedBy].filter(Boolean).join(" · ")}</p></div></div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {r.fileData && <a href={r.fileData} download={r.fileName} className="text-slate-400 hover:text-[#5C67F2]"><Download className="w-4 h-4" /></a>}
                                <button onClick={() => del.mutate(r._id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Notices / Notifications ──────────────────────────────────────────────────
function Notices({ dept }: { dept: any }) {
    const qc = useQueryClient();
    const [form, setForm] = useState<any>({ kind: "Announcement" });
    const { data: items = [] } = useQuery({ queryKey: ["dept_notices", dept._id], queryFn: async () => { const r = await api.get(`/departments/${dept._id}/notifications`); return Array.isArray(r.data) ? r.data : []; } });
    const add = useMutation({
        mutationFn: async () => api.post(`/departments/${dept._id}/notifications`, form),
        onSuccess: () => { toast.success("Published"); setForm({ kind: "Announcement" }); qc.invalidateQueries({ queryKey: ["dept_notices", dept._id] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    return (
        <div>
            <div className="border border-slate-100 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input placeholder="Notice title" value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white">{["Announcement", "Meeting", "Exam Deadline", "Mark Deadline", "Document", "Assignment"].map(k => <option key={k}>{k}</option>)}</select>
                <textarea placeholder="Message" value={form.body || ""} onChange={e => setForm({ ...form, body: e.target.value })} rows={2} className="px-3 py-2 border border-slate-200 rounded-lg text-sm sm:col-span-2" />
                <button onClick={() => add.mutate()} disabled={!form.title || add.isPending} className="bg-[#5C67F2] text-white text-xs font-bold px-4 py-2 rounded-lg sm:col-span-2 disabled:opacity-50 inline-flex items-center justify-center gap-1"><Bell className="w-3.5 h-3.5" /> Publish Notice</button>
            </div>
            {items.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No notices yet.</p> : (
                <div className="space-y-1.5">
                    {items.map((n: any) => (
                        <div key={n._id} className="border border-slate-100 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{n.kind}</span><p className="text-sm font-bold text-slate-700">{n.title}</p></div>
                            {n.body && <p className="text-[11px] text-slate-500 mt-1">{n.body}</p>}
                            <p className="text-[10px] text-slate-400 mt-0.5">{n.createdBy} · {new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Reports (export) ─────────────────────────────────────────────────────────
function Reports({ dept }: { dept: any }) {
    const [kind, setKind] = useState("coverage");
    const KINDS = [["coverage", "Teaching Coverage"], ["activities", "Department Activities"], ["inventory", "Department Inventory"]];
    const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ["dept_report", dept._id, kind], queryFn: async () => (await api.get(`/departments/${dept._id}/reports/${kind}`)).data, enabled: false });
    const run = () => refetch();
    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <select value={kind} onChange={e => setKind(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white">{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <button onClick={run} disabled={isFetching} className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#5C67F2] text-white px-4 py-2.5 rounded-lg disabled:opacity-50">{isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Generate</button>
                {data && <button onClick={() => exportCSV(`${dept.name}-${kind}.csv`, data.columns, data.rows)} className="inline-flex items-center gap-1.5 text-xs font-bold border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-lg"><Download className="w-3.5 h-3.5" /> Export CSV</button>}
            </div>
            {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div> : !data ? <p className="text-sm text-slate-400 text-center py-6">Choose a report and click Generate.</p> : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-xs">
                        <thead><tr className="bg-slate-50 text-slate-500 uppercase">{data.columns.map((c: string) => <th key={c} className="text-left px-3 py-2">{c}</th>)}</tr></thead>
                        <tbody>
                            {data.rows.length === 0 ? <tr><td colSpan={data.columns.length} className="text-center text-slate-400 py-4">No data.</td></tr> :
                                data.rows.map((row: any[], i: number) => <tr key={i} className="border-t border-slate-50">{row.map((cell, j) => <td key={j} className="px-3 py-1.5 text-slate-600">{String(cell)}</td>)}</tr>)}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Assets / Inventory (future features) ─────────────────────────────────────
function Assets({ dept }: { dept: any }) {
    const qc = useQueryClient();
    const [form, setForm] = useState<any>({ quantity: 1, condition: "Good" });
    const { data: items = [] } = useQuery({ queryKey: ["dept_assets", dept._id], queryFn: async () => { const r = await api.get(`/departments/${dept._id}/assets`); return Array.isArray(r.data) ? r.data : []; } });
    const add = useMutation({
        mutationFn: async () => api.post(`/departments/${dept._id}/assets`, form),
        onSuccess: () => { toast.success("Added"); setForm({ quantity: 1, condition: "Good" }); qc.invalidateQueries({ queryKey: ["dept_assets", dept._id] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const del = useMutation({ mutationFn: async (id: string) => api.delete(`/departments/${dept._id}/assets/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["dept_assets", dept._id] }) });
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-3 text-[11px] text-slate-400"><Sparkles className="w-3.5 h-3.5" /> Department asset & inventory tracking</div>
            <div className="border border-slate-100 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input placeholder="Asset name" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm col-span-2" />
                <input placeholder="Category" value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                <input type="number" placeholder="Qty" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                <input placeholder="Location" value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm col-span-2" />
                <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white">{["Good", "Fair", "Needs Repair", "Damaged"].map(c => <option key={c}>{c}</option>)}</select>
                <button onClick={() => add.mutate()} disabled={!form.name || add.isPending} className="bg-[#5C67F2] text-white text-xs font-bold px-4 rounded-lg disabled:opacity-50 inline-flex items-center justify-center gap-1"><Package className="w-3.5 h-3.5" /> Add</button>
            </div>
            {items.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No assets tracked yet.</p> : (
                <div className="space-y-1.5">
                    {items.map((a: any) => (
                        <div key={a._id} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2.5">
                            <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{a.name} <span className="text-[11px] text-slate-400 font-normal">×{a.quantity ?? 1}</span></p><p className="text-[11px] text-slate-400">{[a.category, a.location, a.condition].filter(Boolean).join(" · ")}</p></div>
                            <button onClick={() => del.mutate(a._id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
