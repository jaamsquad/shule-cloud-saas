import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, ArrowLeft, Link2, X, Search, UserPlus, Star } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type FT = "text" | "number" | "select" | "date" | "textarea" | "password";
interface F { k: string; label: string; type: FT; options?: string[] }
const F = (k: string, label: string, type: FT, options?: string[]): F => ({ k, label, type, options });

const SECTIONS: { title: string; fields: F[] }[] = [
    { title: "Parent Information", fields: [
        F("fullName", "Full Name", "text"),
        F("gender", "Gender", "select", ["Male", "Female", "Other"]),
        F("nationalId", "National ID / Passport", "text"),
        F("dateOfBirth", "Date of Birth", "date"),
        F("relationship", "Relationship to Student", "select", ["Father", "Mother", "Guardian", "Sponsor", "Relative"]),
        F("maritalStatus", "Marital Status", "select", ["Single", "Married", "Divorced", "Widowed"]),
    ]},
    { title: "Contact Information", fields: [
        F("primaryPhone", "Primary Phone Number", "text"),
        F("secondaryPhone", "Secondary Phone Number", "text"),
        F("whatsappNumber", "WhatsApp Number", "text"),
        F("email", "Email Address", "text"),
        F("physicalAddress", "Physical Address", "text"),
        F("postalAddress", "Postal Address", "text"),
        F("city", "City / Town", "text"),
        F("county", "County / State", "text"),
        F("country", "Country", "text"),
    ]},
    { title: "Employment Information", fields: [
        F("occupation", "Occupation", "text"),
        F("employerName", "Employer Name", "text"),
        F("employerAddress", "Employer Address", "text"),
        F("workPhone", "Work Phone Number", "text"),
        F("monthlyIncome", "Monthly Income Range", "select", ["< 20,000", "20,000 – 50,000", "50,000 – 100,000", "100,000 – 250,000", "250,000+"]),
    ]},
    { title: "Emergency Contact", fields: [
        F("emergencyContactName", "Emergency Contact Name", "text"),
        F("emergencyContactRelationship", "Emergency Contact Relationship", "text"),
        F("emergencyContactPhone", "Emergency Contact Phone", "text"),
        F("emergencyContactAddress", "Emergency Contact Address", "text"),
    ]},
    { title: "Financial Management", fields: [
        F("billingAccount", "Linked Billing Account", "text"),
        F("paymentMethod", "Payment Method", "select", ["M-PESA", "Bank Transfer", "Cash", "Cheque", "Card"]),
        F("sponsorship", "Sponsorship Information", "text"),
        F("financialResponsibility", "Financial Responsibility (%)", "number"),
    ]},
    { title: "Medical & Welfare", fields: [
        F("emergencyMedicalContact", "Emergency Medical Contact", "text"),
        F("authorizedPickup", "Authorized Pickup Persons", "text"),
        F("medicalNotes", "Medical Notes", "textarea"),
        F("allergies", "Allergies Information", "textarea"),
        F("specialNeeds", "Special Student Needs", "textarea"),
    ]},
    { title: "Parent Portal Access", fields: [
        F("loginUsername", "Login Username", "text"),
        F("loginPassword", "Login Password", "password"),
        F("status", "Account Status", "select", ["Active", "Inactive", "Suspended", "Blacklisted", "Archived"]),
    ]},
];

const PERMISSIONS = [
    ["viewProfile", "View Student Profile"], ["viewAttendance", "View Attendance"], ["viewResults", "View Academic Results"],
    ["viewFees", "View Fee Statements"], ["viewTimetable", "View Timetable"], ["viewHomework", "View Homework"],
    ["viewDiscipline", "View Discipline Records"], ["viewMedical", "View Medical Records"],
    ["downloadReportCards", "Download Report Cards"], ["receiveAnnouncements", "Receive School Announcements"],
];
const COMMS = [
    ["sms", "SMS Notifications"], ["email", "Email Notifications"], ["whatsapp", "WhatsApp Notifications"],
    ["attendanceAlerts", "Attendance Alerts"], ["feeAlerts", "Fee Balance Alerts"], ["examAlerts", "Exam Results Alerts"],
    ["eventAlerts", "Event Notifications"], ["emergencyAlerts", "Emergency Notifications"],
];
const RELATIONSHIPS = ["Father", "Mother", "Guardian", "Sponsor", "Relative"];
const CUSTODY = ["Full", "Joint", "Partial", "None"];

export default function ParentForm() {
    const { id } = useParams();
    const editing = !!id;
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [form, setForm] = useState<any>({ status: "Active", country: "Kenya", permissions: {}, communications: {}, linkedStudents: [] });
    const [studentSearch, setStudentSearch] = useState("");

    const { data: parent, isLoading } = useQuery({
        queryKey: ["parent", id],
        queryFn: async () => (await api.get(`/parents/${id}`)).data,
        enabled: editing,
    });
    const { data: students = [] } = useQuery({
        queryKey: ["students_for_link"],
        queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; },
    });

    useEffect(() => {
        if (parent) setForm({ permissions: {}, communications: {}, linkedStudents: [], ...parent });
    }, [parent]);

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
    const setNested = (group: string, k: string, v: any) => setForm((f: any) => ({ ...f, [group]: { ...(f[group] || {}), [k]: v } }));

    const save = useMutation({
        mutationFn: async () => {
            const payload = { ...form };
            if (!editing) { payload.parentId = `PRNT-${Date.now().toString().slice(-6)}`; payload.createdAt = new Date(); }
            payload.updatedAt = new Date();
            return editing ? api.patch(`/parents/${id}`, payload) : api.post("/parents", payload);
        },
        onSuccess: () => { toast.success(editing ? "Parent updated" : "Parent created"); qc.invalidateQueries({ queryKey: ["parents"] }); navigate("/parents"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });

    const linked: any[] = form.linkedStudents || [];
    const linkedIds = new Set(linked.map((l: any) => String(l.studentId)));
    const matchStudents = students.filter((s: any) =>
        !linkedIds.has(String(s._id)) &&
        ((s.studentName || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
            (s.registrationNo || s.admNo || "").toLowerCase().includes(studentSearch.toLowerCase()))
    ).slice(0, 6);

    const linkStudent = (s: any) => setForm((f: any) => ({
        ...f,
        linkedStudents: [...(f.linkedStudents || []), {
            studentId: String(s._id), studentName: s.studentName, admissionNo: s.registrationNo || s.admNo,
            relationship: f.relationship || "Guardian", isPrimary: (f.linkedStudents || []).length === 0,
            feeResponsibility: 0, custodyType: "Joint",
        }],
    }));
    const updateLink = (i: number, k: string, v: any) =>
        setForm((f: any) => ({ ...f, linkedStudents: f.linkedStudents.map((l: any, j: number) => j === i ? { ...l, [k]: v } : l) }));
    const removeLink = (i: number) =>
        setForm((f: any) => ({ ...f, linkedStudents: f.linkedStudents.filter((_: any, j: number) => j !== i) }));

    if (editing && isLoading) return <div className="flex-1 flex items-center justify-center min-h-screen bg-[#f8fafc]"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>;

    const renderField = (f: F) => {
        const v = form[f.k];
        if (f.type === "select")
            return <select value={v || ""} onChange={e => set(f.k, e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#5C67F2]"><option value="">— Select —</option>{f.options!.map(o => <option key={o}>{o}</option>)}</select>;
        if (f.type === "textarea")
            return <textarea value={v || ""} onChange={e => set(f.k, e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />;
        return <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "password" ? "text" : "text"} value={v ?? ""} onChange={e => set(f.k, f.type === "number" ? Number(e.target.value) : e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />;
    };

    const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
        <button onClick={onClick} className={`relative w-11 h-6 rounded-full transition-colors ${on ? "bg-[#5C67F2]" : "bg-slate-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${on ? "translate-x-5" : ""}`} />
        </button>
    );

    const totalFee = linked.reduce((s: number, l: any) => s + (Number(l.feeResponsibility) || 0), 0);

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen pb-16">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex flex-wrap items-center gap-3 shadow-sm">
                <button onClick={() => navigate("/parents")} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ArrowLeft className="w-4 h-4" /></button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-black text-slate-800 truncate">{editing ? form.fullName || "Edit Parent" : "New Parent"}</h1>
                    <p className="text-xs text-slate-400">{form.parentId || "ID auto-generated on save"}</p>
                </div>
                <button onClick={() => save.mutate()} disabled={save.isPending || !form.fullName} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#5C67F2] text-white text-xs font-black hover:opacity-90 disabled:opacity-50">
                    {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Parent
                </button>
            </div>

            <div className="px-6 mt-5 space-y-5 max-w-5xl">
                {SECTIONS.map(sec => (
                    <div key={sec.title} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60"><h2 className="text-sm font-black text-slate-700">{sec.title}</h2></div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {sec.fields.map(f => (
                                <div key={f.k} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
                                    {renderField(f)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Student Linking */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-[#5C67F2]" />
                        <h2 className="text-sm font-black text-slate-700">Student Linking</h2>
                        <span className={`ml-auto text-xs font-bold ${totalFee === 100 ? "text-emerald-600" : "text-amber-600"}`}>Fee Responsibility total: {totalFee}%</span>
                    </div>
                    <div className="p-5">
                        <div className="relative mb-4">
                            <div className="flex items-center border border-gray-200 rounded-lg px-3 h-10">
                                <Search className="w-4 h-4 text-slate-300" />
                                <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student by name or admission no…" className="flex-1 px-2 text-sm focus:outline-none" />
                            </div>
                            {studentSearch && matchStudents.length > 0 && (
                                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-lg overflow-hidden">
                                    {matchStudents.map((s: any) => (
                                        <button key={s._id} onClick={() => { linkStudent(s); setStudentSearch(""); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 text-left">
                                            <UserPlus className="w-4 h-4 text-emerald-500" />
                                            <span className="font-semibold text-slate-700">{s.studentName}</span>
                                            <span className="text-xs text-slate-400">{s.registrationNo || s.admNo} · {s.studentClass || s.currentClass}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {linked.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-6">No students linked. Search above to link a child.</p>
                        ) : (
                            <div className="space-y-2">
                                {linked.map((l: any, i: number) => (
                                    <div key={l.studentId} className="border border-slate-100 rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                        <div className="md:col-span-3">
                                            <p className="font-bold text-slate-700 text-sm">{l.studentName}</p>
                                            <p className="text-xs text-slate-400">{l.admissionNo}</p>
                                        </div>
                                        <select value={l.relationship} onChange={e => updateLink(i, "relationship", e.target.value)} className="md:col-span-2 h-9 px-2 border border-gray-200 rounded text-xs bg-white">
                                            {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                                        </select>
                                        <select value={l.custodyType} onChange={e => updateLink(i, "custodyType", e.target.value)} className="md:col-span-2 h-9 px-2 border border-gray-200 rounded text-xs bg-white">
                                            {CUSTODY.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                        <div className="md:col-span-2 flex items-center gap-1">
                                            <input type="number" value={l.feeResponsibility} onChange={e => updateLink(i, "feeResponsibility", Number(e.target.value))} className="w-16 h-9 px-2 border border-gray-200 rounded text-xs" />
                                            <span className="text-xs text-slate-400">% fee</span>
                                        </div>
                                        <button onClick={() => updateLink(i, "isPrimary", !l.isPrimary)} title="Primary guardian" className={`md:col-span-2 inline-flex items-center justify-center gap-1 h-9 rounded text-xs font-bold border ${l.isPrimary ? "bg-amber-50 border-amber-300 text-amber-700" : "border-slate-200 text-slate-400"}`}>
                                            <Star className={`w-3.5 h-3.5 ${l.isPrimary ? "fill-amber-400 text-amber-400" : ""}`} /> {l.isPrimary ? "Primary" : "Secondary"}
                                        </button>
                                        <button onClick={() => removeLink(i)} className="md:col-span-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 mx-auto"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60"><h2 className="text-sm font-black text-slate-700">Permissions Settings</h2></div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        {PERMISSIONS.map(([k, label]) => (
                            <div key={k} className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">{label}</span>
                                <Toggle on={!!form.permissions?.[k]} onClick={() => setNested("permissions", k, !form.permissions?.[k])} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Communications */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60"><h2 className="text-sm font-black text-slate-700">Communication Settings</h2></div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        {COMMS.map(([k, label]) => (
                            <div key={k} className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">{label}</span>
                                <Toggle on={!!form.communications?.[k]} onClick={() => setNested("communications", k, !form.communications?.[k])} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
