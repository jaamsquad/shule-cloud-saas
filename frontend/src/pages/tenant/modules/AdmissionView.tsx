import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, ArrowLeft, Loader2, Check, X, Printer, UserPlus, FileText, ShieldCheck, Phone, Mail, MapPin, Calendar, BookOpen, GraduationCap, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useSchoolBrand } from "@/lib/printDoc";
import { outputHtmlDoc } from "@/lib/pdfDoc";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNumbering } from "./NumberingSettings";
import { normAdmission, AdmissionView as AV } from "./admissionShape";

const STATUS: Record<string, string> = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200", Reviewing: "bg-blue-50 text-blue-700 border-blue-200", Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Enrolled: "bg-indigo-50 text-indigo-700 border-indigo-200", Rejected: "bg-rose-50 text-rose-600 border-rose-200",
};
const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const fmt = (v: any) => { if (!v) return "—"; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
const normTxt = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const TITLES = ["Principal", "Deputy Principal", "Head Teacher", "Admissions Officer", "Registrar", "School Administrator"];

export default function AdmissionView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const school = useSchoolBrand();
    const me = useCurrentUser();
    const { data: numbering } = useNumbering();
    const autoReg = !!(numbering as any)?.student?.enabled;

    const { data: raw, isLoading } = useQuery<any>({ queryKey: ["admission", id], enabled: !!id, queryFn: async () => (await api.get(`/admissions/${id}`)).data });
    const { data: v2Classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes_add"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: v2Streams = [] } = useQuery<any[]>({ queryKey: ["v2_streams_all"], queryFn: async () => (await api.get("/v2/streams")).data || [] });
    const a: AV | null = useMemo(() => (raw && raw._id ? normAdmission(raw) : null), [raw]);

    const [signOpen, setSignOpen] = useState(false);
    const [sign, setSign] = useState({ by: me?.name || "", title: TITLES[0], confirm: false });
    const [enrollOpen, setEnrollOpen] = useState(false);
    const [enroll, setEnroll] = useState({ cls: "", reg: "", date: new Date().toISOString().slice(0, 10), letter: true });

    const refresh = () => { qc.invalidateQueries({ queryKey: ["admission", id] }); qc.invalidateQueries({ queryKey: ["admissions"] }); };
    const patch = useMutation({ mutationFn: (p: any) => api.patch(`/admissions/${id}`, p), onSuccess: refresh, onError: (e: any) => toast.error(e.response?.data?.message || "Could not update the application") });

    // Class options: each created class, then its streams
    const classOptions = useMemo(() => v2Classes.map((c: any) => ({ name: c.name, streams: v2Streams.filter((s: any) => String(s.classId) === String(c._id)) })), [v2Classes, v2Streams]);
    const resolveClass = (text: string) => {
        const t = normTxt(text); if (!t) return null;
        const stream = v2Streams.find((s: any) => normTxt(s.fullName || `${s.className || ""} ${s.name}`) === t);
        const cls = stream ? v2Classes.find((c: any) => String(c._id) === String(stream.classId)) : v2Classes.find((c: any) => normTxt(c.name) === t);
        if (!cls) return null;
        return { classId: String(cls._id), className: cls.name, streamId: stream ? String(stream._id) : null, stream: stream?.name || "", streamName: stream?.name || "", studentClass: stream ? (stream.fullName || `${cls.name} ${stream.name}`) : cls.name };
    };

    const approve = async () => {
        if (!a) return;
        if (!sign.by.trim() || !sign.confirm) { toast.error("Enter your name and tick the confirmation to sign."); return; }
        await patch.mutateAsync({ status: "Approved", approval: { by: sign.by.trim(), title: sign.title, signedAt: new Date().toISOString() } });
        toast.success("Approved and signed");
        setSignOpen(false);
        setEnroll(e => ({ ...e, cls: resolveClass(a.classApplied)?.studentClass || e.cls }));
        setEnrollOpen(true);     // ask straight away whether to turn the applicant into a student
    };

    const printLetter = (cls?: string) => {
        if (!a) return;
        const contacts = [school.address, school.phone && `Tel: ${school.phone}`, school.email].filter(Boolean);
        const year = new Date().getFullYear();
        const klass = cls || a.enrolledClass || a.classApplied || "the class applied for";
        const ap = raw?.approval || a.approval;
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admission letter — ${esc(a.name)}</title><style>
          @page{size:A4;margin:16mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;font-size:13.5px;line-height:1.6;margin:0}
          .top{display:flex;gap:14px;align-items:center;padding-bottom:12px;border-bottom:3px solid #1e3a8a}.top img{height:70px;width:auto;object-fit:contain}
          .top h1{margin:0;font-size:21px;text-transform:uppercase;color:#0f172a}.top p{margin:1px 0;font-size:12px;color:#475569}
          .meta{display:flex;justify-content:space-between;margin:22px 0 14px;font-size:13px}
          h2{text-align:center;font-size:17px;letter-spacing:1.5px;text-transform:uppercase;color:#1e3a8a;margin:20px 0 14px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:8px 0}
          .box{background:#f8fafc;border-left:3px solid #1e3a8a;padding:10px 14px;margin:14px 0}.box div{display:flex;gap:10px;padding:2px 0}.box span{width:150px;color:#64748b}
          .sig{margin-top:56px;display:flex;justify-content:space-between;gap:40px}.sig>div{flex:1}.line{border-top:1px solid #111;padding-top:4px;font-size:12px;color:#475569}
          .stamp{font-size:11px;color:#059669;margin-top:2px}
          .sigbox{position:relative;height:70px}.sigimg{position:absolute;left:8px;bottom:2px;max-height:64px;max-width:200px;object-fit:contain}.stampimg{position:absolute;left:150px;bottom:-14px;width:96px;height:96px;object-fit:contain;opacity:.88;transform:rotate(-8deg)}
        </style></head><body>
        <div class="top">${school.logo ? `<img src="${esc(school.logo)}" alt=""/>` : ""}<div><h1>${esc(school.name)}</h1>${contacts.map(c => `<p>${esc(c)}</p>`).join("")}</div></div>
        <div class="meta"><div><b>Ref:</b> ${esc(a.appNo || a.id.slice(-6).toUpperCase())}</div><div><b>Date:</b> ${fmt(new Date())}</div></div>
        <p>The Parent / Guardian${a.parentName ? `,<br/><b>${esc(a.parentName)}</b>` : ""}${a.address ? `<br/>${esc(a.address)}` : ""}</p>
        <p>Dear ${a.parentName ? esc(a.parentName) : "Parent / Guardian"},</p>
        <h2>Offer of Admission</h2>
        <p>We are pleased to inform you that, following the review of your application, <b>${esc(a.name)}</b> has been offered a place at <b>${esc(school.name)}</b> in <b>${esc(klass)}</b> for the ${year} academic year.</p>
        <div class="box"><div><span>Learner</span><b>${esc(a.name)}</b></div>${a.dob ? `<div><span>Date of birth</span>${esc(fmt(a.dob))}</div>` : ""}<div><span>Class</span><b>${esc(klass)}</b></div><div><span>Application no.</span>${esc(a.appNo || "—")}</div></div>
        <p>Kindly confirm acceptance of this offer and complete the registration process at the school office, including payment of the fees for the term. Please bring the learner's birth certificate, the previous school's report or transfer documents, and passport-size photographs.</p>
        <p>We look forward to welcoming ${esc(a.firstName || a.name)} to our school community.</p>
        <div class="sig"><div><div class="sigbox">${school.signature ? `<img class="sigimg" src="${esc(school.signature)}" alt=""/>` : ""}${school.stamp ? `<img class="stampimg" src="${esc(school.stamp)}" alt=""/>` : ""}</div><div class="line"><b>${esc(school.signerName || ap?.by || "")}</b>${(school.signerName || ap?.by) ? "<br/>" : ""}${esc(school.signerTitle || ap?.title || "Principal")}, ${esc(school.name)}</div>${ap?.signedAt ? `<div class="stamp">Approved &amp; signed electronically on ${esc(fmt(ap.signedAt))}</div>` : ""}</div>
        <div><div style="height:38px"></div><div class="line">Parent / Guardian acceptance (signature &amp; date)</div></div></div>
        </body></html>`;
        void outputHtmlDoc(`Admission letter — ${a.name}`, html, { fileName: `Admission-letter-${a.name}` });
    };

    const convert = useMutation({
        mutationFn: async () => {
            if (!a) return "";
            const link = resolveClass(enroll.cls);
            if (!link) throw new Error("Choose the class to enrol the student in.");
            const reg = enroll.reg.trim();
            const rel = normTxt(a.relation);
            const student: any = {
                studentName: a.name, firstName: a.firstName, lastName: a.lastName, gender: a.gender, dob: a.dob, address: a.address, previousSchool: a.previousSchool,
                registrationNo: reg, admissionDate: enroll.date, ...link,
                parentName: a.parentName, parentPhone: a.phone, parentEmail: a.email,
                ...(rel === "mother" ? { motherName: a.parentName, motherPhone: a.phone, motherEmail: a.email } : rel === "father" || !rel ? { fatherName: a.parentName, fatherPhone: a.phone, fatherEmail: a.email } : { guardianName: a.parentName, guardianPhone: a.phone, guardianEmail: a.email }),
            };
            if (reg) { student.portalUsername = reg; student.portalPassword = `shule@${reg.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`; student.credentialsGenerated = true; student.lastPasswordReset = new Date().toISOString(); }
            const r = await api.post("/students", student);
            const sid = String(r.data?._id || r.data?.data?._id || r.data?.insertedId || "");
            await api.patch(`/admissions/${id}`, { status: "Enrolled", studentId: sid, enrolledClass: link.studentClass, enrolledAt: new Date().toISOString() });
            return sid;
        },
        onSuccess: sid => {
            refresh(); qc.invalidateQueries({ queryKey: ["students"] });
            toast.success("Enrolled — the student now appears in All Students.");
            setEnrollOpen(false);
            if (enroll.letter) printLetter(enroll.cls);
            if (sid) navigate(`/students/report/${sid}`);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || e.message || "Enrolment failed"),
    });

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>;
    if (!a) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400 font-black uppercase text-xs tracking-widest"><AlertCircle className="w-12 h-12 mb-4" /> Application not found</div>;

    const approved = a.status === "Approved", enrolled = a.status === "Enrolled", closed = a.status === "Rejected";
    const initials = a.name.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    const ap = raw?.approval || a.approval;
    const Field = ({ icon: I, label, value }: { icon?: any; label: string; value: any }) => (
        <div className="py-2.5 flex items-start gap-3 border-b border-slate-50 last:border-0">
            {I ? <I className="w-4 h-4 text-slate-300 mt-0.5" /> : <span className="w-4" />}
            <div className="flex-1"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div><div className="text-sm font-bold text-slate-800 break-words">{value || "—"}</div></div>
        </div>
    );
    const isImg = a.document.startsWith("data:image");

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen pb-16">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm"><Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span><span className="font-bold text-gray-500">Students</span><span className="text-gray-300">/</span>
                    <button onClick={() => navigate("/students/admissions")} className="font-bold text-gray-500 hover:text-[#5C67F2]">Admissions</button><span className="text-gray-300">/</span><span className="font-black text-[#5C67F2]">{a.name}</span></div>
                <button onClick={() => navigate("/students/admissions")} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#5C67F2]"><ArrowLeft className="w-4 h-4" /> Back to list</button>
            </div>

            <div className="max-w-5xl mx-auto px-6 pt-8 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-wrap items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl ${a.gender === "Female" ? "bg-pink-100 text-pink-600" : "bg-indigo-100 text-indigo-600"}`}>{initials}</div>
                    <div className="flex-1 min-w-[220px]">
                        <h1 className="text-2xl font-black text-slate-900">{a.name}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${STATUS[a.status] || STATUS.Pending}`}>{a.status}</span>
                            {a.appNo && <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">{a.appNo}</span>}
                            <span className="text-[11px] text-slate-400 font-bold">Applied {fmt(a.date)}{a.source === "public" ? " · online form" : ""}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {!approved && !enrolled && !closed && <button onClick={() => { setSign(s => ({ ...s, by: s.by || me?.name || "" })); setSignOpen(true); }} className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Approve &amp; sign</button>}
                        {!enrolled && !closed && !approved && <button onClick={() => patch.mutate({ status: "Rejected" }, { onSuccess: () => toast.success("Application rejected") })} className="h-11 px-5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-xs uppercase tracking-widest flex items-center gap-2"><X className="w-4 h-4" /> Reject</button>}
                        {approved && <button onClick={() => { setEnroll(e => ({ ...e, cls: resolveClass(a.classApplied)?.studentClass || e.cls })); setEnrollOpen(true); }} className="h-11 px-5 rounded-xl bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-xs uppercase tracking-widest flex items-center gap-2"><UserPlus className="w-4 h-4" /> Convert to student</button>}
                        {(approved || enrolled) && <button onClick={() => printLetter()} className="h-11 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-xs uppercase tracking-widest flex items-center gap-2"><Printer className="w-4 h-4" /> Admission letter</button>}
                        {enrolled && a.studentId && <button onClick={() => navigate(`/students/report/${a.studentId}`)} className="h-11 px-5 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs uppercase tracking-widest flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Open student</button>}
                    </div>
                </div>

                {ap && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-3 text-sm text-emerald-800">
                        <ShieldCheck className="w-5 h-5" /> Approved and signed by <b>{ap.by}</b>, {ap.title} · {fmt(ap.signedAt)}
                        {enrolled && a.enrolledClass && <span className="ml-auto font-bold">Enrolled in {a.enrolledClass}</span>}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#5C67F2] mb-2">Applicant</h3>
                        <Field label="Full name" value={a.name} /><Field icon={Calendar} label="Date of birth" value={a.dob ? fmt(a.dob) : ""} /><Field label="Gender" value={a.gender} />
                        <Field icon={BookOpen} label="Class applied for" value={a.classApplied} /><Field icon={GraduationCap} label="Previous school" value={a.previousSchool} />
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#5C67F2] mb-2">Parent / guardian</h3>
                        <Field label="Name" value={a.parentName} />{a.relation && <Field label="Relation" value={a.relation} />}
                        <Field icon={Phone} label="Phone" value={a.phone} /><Field icon={Mail} label="Email" value={a.email} /><Field icon={MapPin} label="Address" value={a.address} />
                    </div>
                </div>

                {a.notes && <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5"><div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Notes from the applicant</div><p className="text-sm text-amber-900 whitespace-pre-wrap">{a.notes}</p></div>}

                {a.document && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#5C67F2] mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Attached document{a.documentName ? ` — ${a.documentName}` : ""}</h3>
                        {isImg ? <img src={a.document} alt="Attachment" className="max-h-[420px] rounded-xl border border-slate-100" /> : <a href={a.document} download={a.documentName || "document"} className="inline-flex h-10 px-4 items-center rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700">Download document</a>}
                    </div>
                )}
            </div>

            {/* Approve & sign */}
            {signOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-7 shadow-2xl">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" /> Approve &amp; sign</h3>
                        <p className="text-xs text-slate-400 mt-1">Your name and position will appear on the admission letter.</p>
                        <div className="mt-4 space-y-3">
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Approved by</label><input value={sign.by} onChange={e => setSign({ ...sign, by: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" /></div>
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Position</label><select value={sign.title} onChange={e => setSign({ ...sign, title: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">{TITLES.map(t => <option key={t}>{t}</option>)}</select></div>
                            <label className="flex items-start gap-2 text-sm text-slate-600"><input type="checkbox" className="mt-1" checked={sign.confirm} onChange={e => setSign({ ...sign, confirm: e.target.checked })} /> I approve this admission and sign it electronically.</label>
                        </div>
                        <div className="flex justify-end gap-2 mt-6"><button onClick={() => setSignOpen(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
                            <button onClick={approve} disabled={patch.isPending} className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black flex items-center gap-2 disabled:opacity-60">{patch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve &amp; sign</button></div>
                    </div>
                </div>
            )}

            {/* Convert to student */}
            {enrollOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-7 shadow-2xl">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#5C67F2]" /> Convert to student?</h3>
                        <p className="text-xs text-slate-400 mt-1">Add <b>{a.name}</b> to All Students and enrol them in a class.</p>
                        <div className="mt-4 space-y-3">
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Class to enrol in</label>
                                <select value={enroll.cls} onChange={e => setEnroll({ ...enroll, cls: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                                    <option value="">— Select class —</option>
                                    {classOptions.map((g: any) => g.streams.length
                                        ? <optgroup key={g.name} label={g.name}>{g.streams.map((s: any) => <option key={s._id} value={s.fullName || `${g.name} ${s.name}`}>{s.fullName || `${g.name} ${s.name}`}</option>)}</optgroup>
                                        : <option key={g.name} value={g.name}>{g.name}</option>)}
                                </select>
                                {a.classApplied && <p className="text-[11px] text-slate-400 mt-1">Applied for: {a.classApplied}</p>}</div>
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Registration no.</label><input value={enroll.reg} onChange={e => setEnroll({ ...enroll, reg: e.target.value })} placeholder={autoReg ? "Automatic — leave blank" : "e.g. BS120"} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" /></div>
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Date of admission</label><input type="date" value={enroll.date} onChange={e => setEnroll({ ...enroll, date: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" /></div>
                            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={enroll.letter} onChange={e => setEnroll({ ...enroll, letter: e.target.checked })} /> Print the admission letter after enrolling</label>
                        </div>
                        <div className="flex justify-end gap-2 mt-6"><button onClick={() => setEnrollOpen(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Not now</button>
                            <button onClick={() => convert.mutate()} disabled={convert.isPending || !enroll.cls} className="h-10 px-5 rounded-xl bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-black flex items-center gap-2 disabled:opacity-50">{convert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enrol student</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
