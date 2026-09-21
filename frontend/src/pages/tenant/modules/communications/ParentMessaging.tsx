import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Send, MessageSquare, CalendarClock, FileBarChart, Mail, Search, CalendarDays, Link2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatExamName } from "@/lib/examName";

// Admin/teacher composes parent inbox messages: Meeting | Results | General, to a
// whole class or one student. Results messages auto-attach the student's exam
// results (handled server-side).
const TYPES = [
    { v: "General", label: "General", icon: Mail, color: "#64748b" },
    { v: "Meeting", label: "Meeting", icon: CalendarClock, color: "#1e3a8a" },
    { v: "Results", label: "Results", icon: FileBarChart, color: "#0284c7" },
];

export default function ParentMessaging() {
    // Deep-link: ?tab=send-results preselects the Results type.
    const initialType = new URLSearchParams(window.location.search).get("tab") === "send-results" ? "Results" : "General";
    const [type, setType] = useState(initialType);
    const [scope, setScope] = useState<"class" | "student">("class");
    const [classId, setClassId] = useState("");
    const [streamId, setStreamId] = useState("");     // v2 stream (East/South)
    const [studentId, setStudentId] = useState("");
    const [examId, setExamId] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sendSms, setSendSms] = useState(true);   // also send an SMS via the gateway
    const [includeLink, setIncludeLink] = useState(true);            // online result link (Results only)
    const [email, setEmail] = useState<"none" | "pdf" | "text">("none");   // Results only
    const [kind, setKind] = useState<"exam" | "year">("exam");   // Results: one exam, or the whole-year report (Term 3 only)
    const [termKey, setTermKey] = useState("");       // "" = current term · "all" · "<year>|<term>" (admins only)
    const [studentQuery, setStudentQuery] = useState("");
    const [studentOpen, setStudentOpen] = useState(false);

    // v2 classes (Form 4) + streams for the chosen class.
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: streams = [] } = useQuery<any[]>({ queryKey: ["v2_streams", classId], enabled: !!classId, queryFn: async () => (await api.get("/v2/streams", { params: { classId } })).data || [] });
    const { data: students = [] } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });
    // Exams for the chosen term. Everyone starts on the CURRENT term; only admins can pick another one
    // (the server enforces it, so a teacher can't widen it from the browser).
    const [tYear, tName] = termKey && termKey !== "all" ? termKey.split("|") : ["", termKey];
    const { data: examData } = useQuery<any>({
        queryKey: ["messaging_exams", termKey],
        queryFn: async () => (await api.get("/messaging/exams", { params: termKey ? { term: tName, year: tYear } : {} })).data,
    });
    const exams: any[] = examData?.exams || [];
    const terms: any[] = examData?.terms || [];
    const canChoose = !!examData?.canChoose;
    const currentTerm = examData?.current;
    const yearlyInfo = examData?.yearly;   // { allowed, year, reason }

    const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const cls = classes.find((c: any) => String(c._id) === String(classId));
    const stream = streams.find((s: any) => String(s._id) === String(streamId));
    // Label for headers + exam naming: "Form 4 East" or "Form 4".
    const classLabel = cls ? (stream ? (stream.fullName || `${cls.name} ${stream.name}`) : cls.name) : "";
    const classStudents = students.filter((s: any) => {
        if (!classId) return true;
        const classOk = String(s.classId) === String(classId) || norm(s.studentClass || s.currentClass) === norm(cls?.name);
        if (!classOk) return false;
        if (!streamId) return true;
        return String(s.streamId) === String(streamId) || norm(s.stream || s.streamName) === norm(stream?.name);
    });

    const q = studentQuery.trim().toLowerCase();
    const studentMatches = useMemo(() => classStudents.filter((s: any) => !q || `${s.studentName || s.name || ""} ${s.registrationNo || s.admNo || ""}`.toLowerCase().includes(q)).slice(0, 40), [classStudents, q]);
    const pickedStudent = students.find((s: any) => String(s._id) === String(studentId));

    const send = useMutation({
        mutationFn: async () => (await api.post("/messaging/compose", {
            type, subject, body, sendSms,
            ...(scope === "student" ? { studentId } : { classId, className: cls?.name || "", streamId, streamName: stream?.name || "", classLabel }),
            ...(type === "Results" ? (kind === "year" ? { yearly: true, year: yearlyInfo?.year, includeLink, email } : { examId, includeLink, email, ...(termKey ? { term: tName, year: tYear } : {}) }) : {}),
        })).data,
        onSuccess: (d: any) => {
            toast.success(`Sent to ${d.sent} parent(s)${d.smsSent ? ` · ${d.smsSent} SMS` : ""}${d.emailSent ? ` · ${d.emailSent} email` : ""}.`);
            if (d.emailFailed) toast.error(`${d.emailFailed} email(s) failed${d.emailError ? `: ${d.emailError}` : ""}`);
            else if (d.emailSkipped) toast.info(`${d.emailSkipped} parent(s) have no email address on file.`);
            setSubject(""); setBody("");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not send"),
    });

    const ready = subject && (scope === "class" ? classId : studentId) && (type !== "Results" || (kind === "year" ? !!yearlyInfo?.allowed : !!examId));

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-5"><MessageSquare className="w-6 h-6 text-[#5C67F2]" /> Message Parents</h1>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 max-w-2xl space-y-4">
                {/* Type */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Message Type</label>
                    <div className="flex gap-2">
                        {TYPES.map(t => (
                            <button key={t.v} onClick={() => setType(t.v)} className={`h-10 px-4 rounded-xl font-bold text-sm flex items-center gap-1.5 ${type === t.v ? "text-white" : "bg-slate-50 text-slate-600"}`} style={type === t.v ? { background: t.color } : {}}>
                                <t.icon className="w-4 h-4" /> {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recipient */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Send To</label>
                    <div className="flex gap-2 mb-2">
                        <button onClick={() => setScope("class")} className={`h-9 px-3 rounded-lg text-sm font-bold ${scope === "class" ? "bg-[#5C67F2] text-white" : "bg-slate-50 text-slate-600"}`}>Whole Class</button>
                        <button onClick={() => setScope("student")} className={`h-9 px-3 rounded-lg text-sm font-bold ${scope === "student" ? "bg-[#5C67F2] text-white" : "bg-slate-50 text-slate-600"}`}>One Student</button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Class (Form 4) */}
                        <select value={classId} onChange={e => { setClassId(e.target.value); setStreamId(""); setStudentId(""); }} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                            <option value="">— Class —</option>
                            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name || "Unnamed"}</option>)}
                        </select>
                        {/* Stream (East/South) */}
                        <select value={streamId} onChange={e => { setStreamId(e.target.value); setStudentId(""); }} disabled={!classId} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                            <option value="">All streams</option>
                            {streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                        {scope === "student" && (
                            <div className="relative col-span-2 lg:col-span-3">
                                {pickedStudent ? (
                                    <div className="h-11 px-3 rounded-xl border border-[#5C67F2] bg-indigo-50/40 flex items-center justify-between text-sm font-bold text-slate-700">
                                        <span>{pickedStudent.studentName || pickedStudent.name} · {pickedStudent.registrationNo || pickedStudent.admNo}</span>
                                        <button onClick={() => { setStudentId(""); setStudentQuery(""); }} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                        <input value={studentQuery} onChange={e => { setStudentQuery(e.target.value); setStudentOpen(true); }} onFocus={() => setStudentOpen(true)} onBlur={() => setTimeout(() => setStudentOpen(false), 150)}
                                            placeholder={classId ? "Search student by name or admission no…" : "Search any student by name or admission no…"} className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#5C67F2]" />
                                        {studentOpen && (
                                            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                                                {studentMatches.length === 0 ? <div className="p-3 text-sm text-slate-400">No student found.</div> : studentMatches.map((s: any) => (
                                                    <button key={s._id} onMouseDown={e => e.preventDefault()} onClick={() => { setStudentId(String(s._id)); setStudentOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex justify-between gap-3">
                                                        <span className="font-semibold text-slate-700">{s.studentName || s.name}</span><span className="text-xs text-slate-400">{s.registrationNo || s.admNo} · {s.studentClass || s.currentClass || ""}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {scope === "class" && classId && (
                        <p className="text-[11px] text-slate-400 mt-1">{classStudents.length} student(s) in {classLabel || "this class"}.</p>
                    )}
                </div>

                {/* Results: term → exam to attach, how it goes out */}
                {type === "Results" && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <button onClick={() => setKind("exam")} className={`h-10 px-4 rounded-xl text-sm font-bold ${kind === "exam" ? "bg-[#5C67F2] text-white" : "bg-slate-50 text-slate-600"}`}>Exam result</button>
                            <button onClick={() => yearlyInfo?.allowed && setKind("year")} disabled={!yearlyInfo?.allowed} title={yearlyInfo?.allowed ? "" : yearlyInfo?.reason} className={`h-10 px-4 rounded-xl text-sm font-bold ${kind === "year" ? "bg-[#5C67F2] text-white" : "bg-slate-50 text-slate-600"} disabled:opacity-50 disabled:cursor-not-allowed`}>Whole-year report</button>
                        </div>
                        {kind === "year" ? (
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm text-slate-600">
                                <b className="text-slate-800">{yearlyInfo?.year} annual report</b> — each parent gets their child's Term 1, Term 2 and Term 3 results side by side, with the year average.
                            </div>
                        ) : !yearlyInfo?.allowed && (
                            <p className="text-[11px] text-slate-400 -mt-2">The whole-year report becomes available in Term 3.</p>
                        )}
                        {kind === "exam" && (<>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Term</label>
                            {canChoose ? (
                                <div className="relative">
                                    <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                    <select value={termKey || (currentTerm ? `${currentTerm.year}|${currentTerm.term}` : "all")} onChange={e => { setTermKey(e.target.value); setExamId(""); }} className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm bg-white">
                                        {terms.map((t: any) => <option key={`${t.year}|${t.term}`} value={`${t.year}|${t.term}`}>{t.label}{t.isCurrent ? " (Current)" : ""}</option>)}
                                        <option value="all">All terms</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" /> {currentTerm?.label || "Current term"} <span className="text-[10px] font-semibold text-slate-400 ml-auto">Only the current term can be sent</span></div>
                            )}
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Attach Results From</label>
                            <select value={examId} onChange={e => setExamId(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                                <option value="">— Exam —</option>
                                {exams.map((ex: any) => <option key={ex._id} value={ex._id}>{formatExamName(ex, classLabel || undefined)}</option>)}
                            </select>
                            <p className="text-[11px] text-slate-400 mt-1">{exams.length ? "Each parent's message will include their child's results for this exam." : "No exams in this term yet."}</p>
                        </div>
                        </>)}
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2.5">
                            <label className="flex items-start gap-2 text-sm font-bold text-slate-600">
                                <input type="checkbox" className="mt-1" checked={includeLink} onChange={e => setIncludeLink(e.target.checked)} />
                                <span className="flex items-center gap-1.5"><Link2 className="w-4 h-4 text-[#5C67F2]" /> Include a link to check the result online<span className="block text-[11px] font-medium text-slate-400 w-full">A private, verified link for that student and exam is added to the message, SMS and email.</span></span>
                            </label>
                            <div>
                                <div className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Also email the result</div>
                                <div className="flex flex-wrap gap-2">
                                    {([["none", "Don't email"], ["pdf", "Email with PDF report card"], ["text", "Email as plain text"]] as const).map(([v, l]) => (
                                        <button key={v} onClick={() => setEmail(v)} className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 ${email === v ? "bg-[#5C67F2] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{v === "pdf" && <FileText className="w-3.5 h-3.5" />}{l}</button>
                                    ))}
                                </div>
                                {email !== "none" && <p className="text-[11px] text-slate-400 mt-1.5">Sent to each parent's email on file{email === "pdf" ? "; the report card PDF is attached (whole classes can take a little while)" : "; the marks arrive as a neat text table"}.</p>}
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Subject</label>
                    <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Parents' Meeting on Friday" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Message</label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Write your message…" className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                </div>

                <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)} /> Also send SMS to parents
                </label>
                <button onClick={() => send.mutate()} disabled={send.isPending || !ready} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                    {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send to Parents
                </button>
            </div>
        </div>
    );
}
