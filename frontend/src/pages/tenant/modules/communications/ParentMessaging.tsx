import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Send, MessageSquare, CalendarClock, FileBarChart, Mail } from "lucide-react";
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

    // v2 classes (Form 4) + streams for the chosen class.
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: streams = [] } = useQuery<any[]>({ queryKey: ["v2_streams", classId], enabled: !!classId, queryFn: async () => (await api.get("/v2/streams", { params: { classId } })).data || [] });
    const { data: students = [] } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });
    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data || [] });

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

    const send = useMutation({
        mutationFn: async () => (await api.post("/messaging/compose", {
            type, subject, body, sendSms,
            ...(scope === "student" ? { studentId } : { classId, className: cls?.name || "", streamId, streamName: stream?.name || "", classLabel }),
            ...(type === "Results" ? { examId } : {}),
        })).data,
        onSuccess: (d: any) => { toast.success(`Sent to ${d.sent} parent(s)${d.smsSent ? ` · ${d.smsSent} SMS` : ""}.`); setSubject(""); setBody(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not send"),
    });

    const ready = subject && (scope === "class" ? classId : studentId) && (type !== "Results" || examId);

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
                            <select value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!classId} className="h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                                <option value="">— Student —</option>
                                {classStudents.map((s: any) => <option key={s._id} value={s._id}>{s.studentName || s.name} · {s.registrationNo || s.admNo}</option>)}
                            </select>
                        )}
                    </div>
                    {scope === "class" && classId && (
                        <p className="text-[11px] text-slate-400 mt-1">{classStudents.length} student(s) in {classLabel || "this class"}.</p>
                    )}
                </div>

                {/* Results: pick exam to attach */}
                {type === "Results" && (
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Attach Results From</label>
                        <select value={examId} onChange={e => setExamId(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                            <option value="">— Exam —</option>
                            {exams.map((ex: any) => <option key={ex._id} value={ex._id}>{formatExamName(ex, classLabel || undefined)}</option>)}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">Each parent's message will include their child's results for this exam.</p>
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
                    <input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)} /> Also send SMS to parents (via Talksasa)
                </label>
                <button onClick={() => send.mutate()} disabled={send.isPending || !ready} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                    {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send to Parents
                </button>
            </div>
        </div>
    );
}
