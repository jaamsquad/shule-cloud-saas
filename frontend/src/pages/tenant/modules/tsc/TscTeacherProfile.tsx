import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, User, Loader2, Save, Pencil, Plus, Trash2, FileText, Upload, Award, MapPin,
    CalendarDays, ClipboardCheck, BadgeCheck, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { tsc } from "./tscApi";
import { KENYA_COUNTIES } from "@/lib/kenyaCounties";

const BLUE = "#1D4ED8";
const SECTIONS = ["Personal", "Employment", "TSC Records", "Subjects", "Workload", "Qualifications", "Deployment", "Leave", "Performance", "Documents"] as const;
type Section = typeof SECTIONS[number];

export default function TscTeacherProfile() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Section>("Personal");

    const { data, isLoading } = useQuery({ queryKey: ["tsc_teacher", id], queryFn: () => tsc.teacher(id) });
    const { data: settings } = useQuery({ queryKey: ["tsc_settings"], queryFn: tsc.settings });
    const { data: balances = [] } = useQuery({ queryKey: ["tsc_balances", id], queryFn: () => tsc.leaveBalances(id), enabled: tab === "Leave" });

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#1D4ED8]" /></div>;
    if (!data) return <div className="p-8 text-center text-slate-400">Teacher not found.</div>;
    const s = data.staff || {};
    const refetch = () => qc.invalidateQueries({ queryKey: ["tsc_teacher", id] });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-5xl mx-auto space-y-5">
                <button onClick={() => nav("/tsc/teachers")} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back to Teachers</button>

                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                    {s.photo || s.avatar ? <img src={s.photo || s.avatar} className="w-16 h-16 rounded-2xl object-cover" /> : <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400"><User className="w-8 h-8" /></div>}
                    <div className="flex-1">
                        <h2 className="text-xl font-black text-slate-800">{s.employeeName || s.name}</h2>
                        <p className="text-xs text-slate-500">{s.designation} · {s.department || "No department"}</p>
                        <div className="flex gap-2 mt-1.5">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{s.employmentType}</span>
                            {s.tscNumber ? <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> TSC {s.tscNumber}</span> : <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">No TSC No</span>}
                        </div>
                    </div>
                </div>

                {/* Section tabs */}
                <div className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-slate-100 p-1">
                    {SECTIONS.map(sec => <button key={sec} onClick={() => setTab(sec)} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${tab === sec ? "bg-[#1D4ED8] text-white" : "text-slate-500 hover:bg-slate-50"}`}>{sec}</button>)}
                </div>

                {tab === "Personal" && <EditFields id={id} staff={s} onSaved={refetch} fields={[["nationalId", "National ID"], ["kraPin", "KRA PIN"], ["nhifNo", "NHIF Number"], ["nssfNo", "NSSF Number"], ["phone", "Phone"], ["email", "Email"], ["address", "Physical Address"], ["emergencyContact", "Emergency Contact"]]} readOnly={["phone", "email"]} />}
                {tab === "Employment" && <EditFields id={id} staff={s} onSaved={refetch} fields={[["employmentType", "Employment Type", settings?.employmentTypes], ["dateOfEmployment", "Date of Employment", undefined, "date"], ["dateConfirmed", "Date Confirmed", undefined, "date"], ["jobGroup", "Job Group", settings?.jobGroups], ["salaryScale", "Salary Scale"], ["payrollNumber", "Payroll Number"], ["department", "Department"], ["position", "Position"], ["reportingOfficer", "Reporting Officer"], ["status", "Current Status", ["Active", "On Leave", "Suspended", "Retired", "Inactive"]]]} />}
                {tab === "TSC Records" && <EditFields id={id} staff={s} onSaved={refetch} fields={[["tscNumber", "TSC Number"], ["registrationDate", "Registration Date", undefined, "date"], ["registrationStatus", "Registration Status", ["Registered", "Pending", "Deregistered"]], ["currentSchool", "Current School"], ["previousSchool", "Previous School"], ["county", "County"], ["subCounty", "Sub County"], ["ward", "Ward"], ["zone", "Zone"], ["institutionCode", "Institution Code"], ["verificationStatus", "Verification Status", ["Verified", "Unverified", "Pending"]]]} />}

                {tab === "Subjects" && <SubjectsPanel staff={s} />}
                {tab === "Workload" && <WorkloadPanel workload={data.workload} subjects={data.subjects} />}
                {tab === "Qualifications" && <LinkedList col="tsc_qualifications" staffId={id} title="Qualifications" icon={Award} fields={[["category", "Category", settings?.qualificationCategories], ["level", "Level", settings?.qualificationCategories], ["course", "Course"], ["institution", "Institution"], ["year", "Year Completed"], ["certificateNo", "Certificate Number"], ["certificate", "Upload Certificate"]]} columns={["level", "course", "institution", "year"]} fileKeys={["certificate"]} />}
                {tab === "Deployment" && <LinkedList col="tsc_deployment" staffId={id} title="Deployment History" icon={MapPin} timeline fields={[["schoolName", "School Name"], ["county", "County"], ["subCounty", "Sub County"], ["ward", "Ward"], ["institutionCode", "Institution Code"], ["position", "Position"], ["startDate", "Start Date", undefined, "date"], ["endDate", "End Date", undefined, "date"], ["reason", "Reason for Transfer"], ["promotion", "Promotion", ["Yes", "No"]], ["letter", "Deployment Letter"]]} columns={["schoolName", "position", "startDate", "endDate"]} fileKeys={["letter"]} />}
                {tab === "Leave" && <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">{balances.map((b: any) => <div key={b.type} className="bg-white rounded-xl border border-slate-100 p-3"><div className="text-lg font-black text-slate-800">{b.balance}<span className="text-[10px] text-slate-300">/{b.entitled}</span></div><div className="text-[10px] text-slate-400 font-bold">{b.type} left</div></div>)}</div>
                    <LinkedList col="tsc_leave" staffId={id} title="Leave Records" icon={CalendarDays} fields={[["type", "Leave Type", settings?.leaveTypes], ["startDate", "Start Date", undefined, "date"], ["endDate", "End Date", undefined, "date"], ["totalDays", "Total Days"], ["reason", "Reason"], ["status", "Approval Status", ["Pending", "Approved", "Rejected"]], ["approvedBy", "Approved By"], ["returnDate", "Return Date", undefined, "date"], ["attachment", "Attachment"]]} columns={["type", "startDate", "endDate", "totalDays", "status"]} fileKeys={["attachment"]} />
                </>}
                {tab === "Performance" && <LinkedList col="tsc_performance" staffId={id} title="Performance Records" icon={ClipboardCheck} fields={[["period", "Period"], ["appraisalScore", "Appraisal Score"], ["classroomObservation", "Classroom Observation"], ["cbcImplementation", "CBC Implementation"], ["principalReview", "Principal Review"], ["awards", "Awards"], ["disciplinary", "Disciplinary Cases"], ["document", "Appraisal Document"]]} columns={["period", "appraisalScore", "principalReview"]} fileKeys={["document"]} />}
                {tab === "Documents" && <LinkedList col="tsc_documents" staffId={id} title="Documents" icon={FileText} fields={[["docType", "Document Type"], ["title", "Title"], ["file", "Upload File"]]} columns={["docType", "title"]} fileKeys={["file"]} />}
            </div>
        </div>
    );
}

// ── Editable staff fields (TSC core data) ─────────────────────────────────────
// Field = [key, label, options?, type?]. options enables a dropdown; type 'date'
// renders a date picker. county/subCounty/ward use the Kenya dataset + cascade.
type EField = [string, string, (string[] | undefined)?, ("date" | "text")?];
function EditFields({ id, staff, fields, onSaved, readOnly = [] }: { id: string; staff: any; fields: EField[]; onSaved: () => void; readOnly?: string[] }) {
    const [form, setForm] = useState<Record<string, any>>(Object.fromEntries(fields.map(([k]) => [k, staff[k] ?? ""])));
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);   // the details show read-only until Edit is pressed
    const reset = () => setForm(Object.fromEntries(fields.map(([k]) => [k, staff[k] ?? ""])));
    const set = (k: string, v: any) => setForm(f => {
        const next = { ...f, [k]: v };
        if (k === "county") { next.subCounty = ""; next.ward = ""; }
        if (k === "subCounty") next.ward = "";
        return next;
    });
    const save = async () => { setSaving(true); try { await tsc.updateTeacher(id, form); toast.success("Saved"); onSaved(); setEditing(false); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); } };

    const render = (k: string, label: string, options?: string[], type?: string) => {
        // Kenya location cascade.
        if (k === "county") options = KENYA_COUNTIES.map(c => c.name);
        if (k === "subCounty") options = (KENYA_COUNTIES.find(c => c.name === form.county)?.subCounties.map(s => s.name)) || [];
        if (k === "ward") options = (KENYA_COUNTIES.find(c => c.name === form.county)?.subCounties.find(s => s.name === form.subCounty)?.wards) || [];
        const base = "w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1D4ED8] disabled:bg-slate-50 disabled:text-slate-500";
        if (options) return <select value={form[k] ?? ""} onChange={e => set(k, e.target.value)} className={`${base} bg-white`}><option value="">Select…</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
        if (type === "date") return <input type="date" value={(form[k] || "").slice(0, 10)} onChange={e => set(k, e.target.value)} className={base} />;
        return <input value={form[k] ?? ""} disabled={readOnly.includes(k)} onChange={e => set(k, e.target.value)} className={base} />;
    };

    const shown = (k: string, type?: string) => { const v = staff[k]; if (v == null || v === "") return "—"; if (type === "date") { const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); } return String(v); };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            {!editing ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {fields.map(([k, label, , type]) => (
                            <div key={k}><div className="text-[11px] font-bold text-slate-500 mb-0.5">{label}</div><div className="text-sm font-semibold text-slate-800 break-words">{shown(k, type)}</div></div>
                        ))}
                    </div>
                    <button onClick={() => { reset(); setEditing(true); }} className="mt-5 h-10 px-5 text-white rounded-lg text-sm font-bold flex items-center gap-2" style={{ background: BLUE }}><Pencil className="w-4 h-4" /> Edit</button>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fields.map(([k, label, options, type]) => (
                            <div key={k}><label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>{render(k, label, options, type)}</div>
                        ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button onClick={save} disabled={saving} className="h-10 px-5 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: BLUE }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button>
                        <button onClick={() => { reset(); setEditing(false); }} className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Subjects panel — reads the SAME staff.subjectAssignments shown on
//    /staff/teachers, so the two views never disagree. ─────────────────────────
function SubjectsPanel({ staff }: { staff: any }) {
    const assignments: any[] = staff.subjectAssignments || [];
    const grouped: Record<string, string[]> = {};
    assignments.forEach((a: any) => { (grouped[a.subjectName] ||= []); if (a.className) grouped[a.subjectName].push(a.className); });
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-[#1D4ED8]" /> Teaching Subjects</h3>
            {Object.keys(grouped).length === 0 ? (
                <p className="text-xs text-slate-400">No subjects assigned yet. Assign subjects from <b>Employees → Teachers</b> (the “Assign” button on the teacher card).</p>
            ) : (
                <div className="space-y-2">
                    {Object.entries(grouped).map(([sub, classes]) => (
                        <div key={sub} className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black text-[#1D4ED8] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">{sub}</span>
                            {classes.map(cn => <span key={cn} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{cn}</span>)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Workload panel ────────────────────────────────────────────────────────────
function WorkloadPanel({ workload, subjects }: { workload: any; subjects: any[] }) {
    const cards = [["Weekly Lessons", workload?.weeklyLessons], ["Total Hours", workload?.hours], ["Subjects", workload?.subjects], ["Classes", workload?.classes]];
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{cards.map(([l, v]) => <div key={l as string} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><Clock className="w-4 h-4" /></div><div className="text-2xl font-black text-slate-800">{v ?? 0}</div><div className="text-[11px] text-slate-400 font-bold">{l as string}</div></div>)}</div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-black text-slate-700 mb-2">Timetable-derived workload</h3>
                <p className="text-xs text-slate-500">Subjects: {(workload?.subjectNames || []).join(", ") || "—"}</p>
                <p className="text-xs text-slate-500 mt-1">Classes: {(workload?.classNames || []).join(", ") || "—"}</p>
                {subjects?.length > 0 && <p className="text-[11px] text-slate-400 mt-2">{subjects.length} subject assignment(s) on record.</p>}
            </div>
        </div>
    );
}

// ── Generic linked-record list with add modal + file uploads ──────────────────
// Field tuple: [key, label, options?, type?]. options → dropdown; type 'date' →
// date picker. county/subCounty/ward auto-cascade off the Kenya dataset.
type LField = [string, string, (string[] | undefined)?, ("date")?];
function LinkedList({ col, staffId, title, icon: Icon, fields, columns, fileKeys = [], timeline }: { col: string; staffId: string; title: string; icon: any; fields: LField[]; columns: string[]; fileKeys?: string[]; timeline?: boolean }) {
    const qc = useQueryClient();
    const { data: rows = [], isLoading } = useQuery({ queryKey: ["tsc_linked", col, staffId], queryFn: () => tsc.list(col, staffId) });
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);

    const add = async () => {
        setSaving(true);
        try { await tsc.add(col, { ...form, staffId }); toast.success("Added"); setOpen(false); setForm({}); qc.invalidateQueries({ queryKey: ["tsc_linked", col, staffId] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); }
    };
    const del = async (id: string) => { if (!confirm("Delete this record?")) return; await tsc.remove(col, id); qc.invalidateQueries({ queryKey: ["tsc_linked", col, staffId] }); };
    const onFile = (key: string, file: File) => { if (file.size > 8 * 1024 * 1024) return toast.error("Max 8MB"); const r = new FileReader(); r.onloadend = () => setForm(f => ({ ...f, [key]: String(r.result), [`${key}Name`]: file.name })); r.readAsDataURL(file); };
    const openFile = (v: string) => { if (v?.startsWith("data:")) { const w = window.open(); if (w) w.document.write(`<iframe src="${v}" style="border:0;width:100%;height:100%"></iframe>`); } else if (v) window.open(v, "_blank"); };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2"><Icon className="w-4 h-4 text-[#1D4ED8]" /> {title}</h3>
                <button onClick={() => setOpen(true)} className="h-9 px-4 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: BLUE }}><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#1D4ED8] mx-auto my-6" /> : timeline ? (
                <div className="space-y-3">
                    {rows.length === 0 && <p className="text-center text-slate-400 text-xs font-bold uppercase py-6">No records</p>}
                    {rows.map((r: any) => (
                        <div key={r._id} className="relative pl-6 border-l-2 border-slate-100">
                            <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#1D4ED8]" />
                            <div className="flex items-start justify-between">
                                <div><p className="font-bold text-slate-800 text-sm">{r.schoolName} · {r.position}</p><p className="text-[11px] text-slate-400">{r.startDate} → {r.endDate || "present"} {r.reason ? `· ${r.reason}` : ""}</p>{r.letter && <button onClick={() => openFile(r.letter)} className="text-[11px] font-bold text-[#1D4ED8]">View letter</button>}</div>
                                <button onClick={() => del(r._id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">{columns.map(c => <th key={c} className="text-left px-3 py-2 font-black">{fields.find(f => f[0] === c)?.[1] || c}</th>)}<th className="px-3 py-2" /></tr></thead>
                        <tbody>
                            {rows.map((r: any) => (
                                <tr key={r._id} className="border-b border-slate-50">
                                    {columns.map(c => <td key={c} className="px-3 py-2 text-slate-600">{r[c] ?? "—"}</td>)}
                                    <td className="px-3 py-2 text-right"><div className="flex gap-1 justify-end">{fileKeys.map(fk => r[fk] && <button key={fk} onClick={() => openFile(r[fk])} className="text-[10px] font-bold text-[#1D4ED8]">View</button>)}<button onClick={() => del(r._id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={columns.length + 1} className="py-8 text-center text-slate-400 text-xs font-bold uppercase">No records</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="font-black text-slate-800 mb-4">Add — {title}</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {fields.map(([k, label, options, type]) => {
                                if (fileKeys.includes(k)) return <label key={k} className="col-span-2 flex items-center gap-2 h-11 px-3 border border-dashed border-slate-300 rounded-lg cursor-pointer text-sm text-slate-500"><Upload className="w-4 h-4" />{form[`${k}Name`] || label}<input type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(k, f); }} /></label>;
                                let opts = options;
                                if (k === "county") opts = KENYA_COUNTIES.map(c => c.name);
                                if (k === "subCounty") opts = KENYA_COUNTIES.find(c => c.name === form.county)?.subCounties.map(s => s.name) || [];
                                if (k === "ward") opts = KENYA_COUNTIES.find(c => c.name === form.county)?.subCounties.find(s => s.name === form.subCounty)?.wards || [];
                                const setF = (v: any) => setForm(f => { const n = { ...f, [k]: v }; if (k === "county") { n.subCounty = ""; n.ward = ""; } if (k === "subCounty") n.ward = ""; return n; });
                                const base = "w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1D4ED8]";
                                return (
                                    <div key={k}><label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
                                        {opts ? <select value={form[k] ?? ""} onChange={e => setF(e.target.value)} className={`${base} bg-white`}><option value="">Select…</option>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select>
                                            : type === "date" ? <input type="date" value={(form[k] || "").slice(0, 10)} onChange={e => setF(e.target.value)} className={base} />
                                                : <input value={form[k] ?? ""} onChange={e => setF(e.target.value)} className={base} />}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-2 mt-5"><button onClick={() => setOpen(false)} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Cancel</button><button onClick={add} disabled={saving} className="flex-1 h-10 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: BLUE }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
