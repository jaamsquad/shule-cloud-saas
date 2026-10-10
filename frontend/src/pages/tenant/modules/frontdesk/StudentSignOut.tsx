import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Loader2, Search, Send, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import CrudListPage from "../shared/CrudListPage";

const inp = "w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#5C67F2]";
const nameOf = (s: any) => s?.studentName || `${s?.firstName || ""} ${s?.lastName || ""}`.trim() || s?.name || "—";
const admOf = (s: any) => s?.registrationNo || s?.admissionNumber || s?.admNo || "";
const classOf = (s: any) => s?.studentClass || s?.currentClass || "";
const LEFT_SCHOOL = /graduat|transfer|left|withdraw|expel|deceas|alumni/i;
const nowTime = () => new Date().toTimeString().slice(0, 5);

/** Sign a student out: search for them, record who is picking them, and (optionally) confirm with a code sent to the parent. */
function SignOutModal({ onClose }: { onClose: () => void }) {
    const qc = useQueryClient();
    const { data: students = [], isLoading } = useQuery<any[]>({
        queryKey: ["signout_students"],
        queryFn: async () => { try { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const [q, setQ] = useState("");
    const [student, setStudent] = useState<any>(null);
    const [f, setF] = useState({ parentName: "", parentPhone: "", idNumber: "", reason: "", date: new Date().toISOString().slice(0, 10), timeOut: nowTime() });
    const [sentTo, setSentTo] = useState<string[] | null>(null);
    const [code, setCode] = useState("");
    const [sending, setSending] = useState(false);
    const [saving, setSaving] = useState(false);

    const matches = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return [];
        return students.filter((s: any) => !LEFT_SCHOOL.test(String(s.status || "")) && `${nameOf(s)} ${admOf(s)} ${classOf(s)}`.toLowerCase().includes(t)).slice(0, 12);
    }, [q, students]);
    const phones = student ? [student.parentPhone, student.fatherPhone, student.motherPhone, student.guardianPhone].filter(Boolean) : [];

    const pick = (s: any) => {
        setStudent(s); setQ(""); setSentTo(null); setCode("");
        const parent = s.fatherName || s.motherName || s.guardianName || s.parentName || "";
        setF(p => ({ ...p, parentName: p.parentName || parent, parentPhone: p.parentPhone || s.parentPhone || s.fatherPhone || s.motherPhone || s.guardianPhone || "" }));
    };
    const sendCode = async () => {
        if (!student) return;
        setSending(true);
        try {
            const r = (await api.post("/student-signouts/otp/send", { studentId: student._id, pickedBy: f.parentName, reason: f.reason })).data;
            setSentTo(r.sentTo || []);
            toast.success(`Code sent to ${(r.sentTo || []).join(", ")}`);
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not send the code"); } finally { setSending(false); }
    };
    const save = async () => {
        if (!student) { toast.error("Search for and pick the student"); return; }
        if (!f.parentName.trim()) { toast.error("Who is picking the student?"); return; }
        if (sentTo && !code.trim() && !confirm("A code was sent to the parent but not entered. Sign out without parent confirmation?")) return;
        setSaving(true);
        try {
            const r = (await api.post("/student-signouts/record", { studentId: student._id, ...f, otpCode: code.trim() })).data;
            toast.success(r.otpVerified === "Yes" ? `${r.studentName} signed out — parent confirmed by code` : `${r.studentName} signed out`);
            qc.invalidateQueries({ queryKey: ["student_signouts"] });
            onClose();
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not save"); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[94vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-black text-slate-800">Sign Out Student</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Student <span className="text-rose-500">*</span></label>
                        {student ? (
                            <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#5C67F2]/30 bg-indigo-50/40">
                                <div className="flex-1 min-w-0"><div className="font-black text-slate-800 truncate">{nameOf(student)}</div><div className="text-xs text-slate-500">{[admOf(student), classOf(student)].filter(Boolean).join(" · ")}</div></div>
                                <button onClick={() => { setStudent(null); setSentTo(null); setCode(""); }} className="text-xs font-bold text-[#5C67F2] hover:underline">Change</button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={isLoading ? "Loading students…" : "Type a name, admission no. or class…"} className={inp + " pl-9"} />
                                {q.trim() && (
                                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                        {matches.length === 0 ? <p className="px-4 py-3 text-xs font-bold text-slate-400">No student matches</p> : matches.map((s: any) => (
                                            <button key={s._id} onClick={() => pick(s)} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3">
                                                <span className="font-bold text-slate-800 text-sm flex-1 truncate">{nameOf(s)}</span>
                                                <span className="text-xs text-slate-400 shrink-0">{[admOf(s), classOf(s)].filter(Boolean).join(" · ")}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Parent / picking person <span className="text-rose-500">*</span></label><input className={inp} value={f.parentName} onChange={e => setF({ ...f, parentName: e.target.value })} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Their phone</label><input className={inp} value={f.parentPhone} onChange={e => setF({ ...f, parentPhone: e.target.value })} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">ID number</label><input className={inp} value={f.idNumber} onChange={e => setF({ ...f, idNumber: e.target.value })} /></div>
                        <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Reason</label><input className={inp} placeholder="Medical / Family" value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Date</label><input type="date" className={inp} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Time out</label><input type="time" className={inp} value={f.timeOut} onChange={e => setF({ ...f, timeOut: e.target.value })} /></div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /><span className="text-sm font-black text-slate-700">Parent confirmation (optional)</span></div>
                        <p className="text-xs text-slate-500">Send a one-time code to the parent's phone{phones.length ? ` (${phones.length} number${phones.length > 1 ? "s" : ""} on file)` : ""} and email on record. The parent reads the code back; enter it here to confirm.</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={sendCode} disabled={!student || sending} className="h-9 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {sentTo ? "Resend code" : "Send OTP to parent"}
                            </button>
                            {sentTo && <span className="text-[11px] font-bold text-emerald-700">Sent to {sentTo.join(", ")}</span>}
                        </div>
                        {sentTo && <input inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Enter the 6-digit code" className={inp + " tracking-[0.4em] font-black text-center"} />}
                    </div>
                </div>
                <div className="p-5 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 h-10 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm">Cancel</button>
                    <button onClick={save} disabled={saving} className="flex-1 h-10 bg-[#5C67F2] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />} {code.length === 6 ? "Verify & sign out" : "Sign out"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StudentSignOut() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <CrudListPage
                title="Student Sign Out"
                subtitle="Record students leaving school early — confirm with a code sent to the parent"
                icon={<LogOut className="w-6 h-6" />}
                endpoint="/student-signouts"
                queryKey="student_signouts"
                moduleKey="frontdesk"
                addLabel="Sign Out Student"
                onAdd={() => setOpen(true)}
                fields={[
                    { key: "studentName", label: "Student", type: "studentSelect", required: true, fillClassKey: "studentClass" },
                    { key: "studentClass", label: "Class" },
                    { key: "parentName", label: "Parent / Picking Person", required: true },
                    { key: "reason", label: "Reason", placeholder: "Medical / Family" },
                    { key: "date", label: "Date", type: "date" },
                    { key: "timeOut", label: "Time Out", placeholder: "11:30" },
                ]}
                columns={[
                    { key: "studentName", label: "Student" },
                    { key: "studentClass", label: "Class" },
                    { key: "parentName", label: "Picked By" },
                    { key: "reason", label: "Reason" },
                    { key: "timeOut", label: "Time Out" },
                    { key: "otpVerified", label: "OTP", render: (r) => r.otpVerified === "Yes"
                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">Verified</span>
                        : <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500">No</span> },
                ]}
            />
            {open && <SignOutModal onClose={() => setOpen(false)} />}
        </>
    );
}
