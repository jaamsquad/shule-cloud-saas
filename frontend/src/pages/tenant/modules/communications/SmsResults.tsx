import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GraduationCap, FileText, BookOpenCheck, Send, Loader2, CheckCircle2, ListChecks, Mail } from "lucide-react";
import { toast } from "sonner";
import { sms } from "@/lib/smsApi";
import api from "@/lib/api";

const PURPLE = "#5C67F2";
const TERMS = ["Term 1", "Term 2", "Term 3"];

type SourceType = "exam" | "classTest" | "cbc" | "skillReport";

const TYPES: { key: SourceType; label: string; icon: any; desc: string }[] = [
  { key: "exam", label: "Exam Results", icon: GraduationCap, desc: "Send subject scores, mean & grade per learner" },
  { key: "classTest", label: "Class Test", icon: FileText, desc: "Send a single test score per learner" },
  { key: "cbc", label: "CBC Assessment", icon: BookOpenCheck, desc: "Send competency achievement level per learner" },
  { key: "skillReport", label: "Skill-Based Report", icon: ListChecks, desc: "Email a PDF of each learner's skill ratings to their parent" },
];

export default function SmsResults() {
  const [type, setType] = useState<SourceType>("exam");
  const [id, setId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  // Optional class + stream filter (leave blank = whole school).
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState("");
  // Skill-Based Report: emails a PDF (not SMS), so it needs a term + year instead of an id.
  const [term, setTerm] = useState(TERMS[0]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [subjects, setSubjects] = useState<string[]>([]);

  const { data: sources, isLoading } = useQuery({ queryKey: ["sms_result_sources"], queryFn: sms.resultSources, enabled: type !== "skillReport" });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
  const { data: streams = [] } = useQuery<any[]>({ queryKey: ["v2_streams", classId], enabled: !!classId, queryFn: async () => (await api.get("/v2/streams", { params: { classId } })).data || [] });
  const cls = classes.find((c: any) => String(c._id) === classId);
  const stream = streams.find((s: any) => String(s._id) === streamId);
  const className = stream?.fullName || cls?.name || "";

  const { data: frameworks = [] } = useQuery<any[]>({ queryKey: ["skill_frameworks"], enabled: type === "skillReport", queryFn: async () => (await api.get("/skills/frameworks")).data || [] });
  const availableSubjects = Array.from(new Set(frameworks.map((f: any) => f.subject))) as string[];

  const list = type === "exam" ? (sources?.exams || []) : type === "classTest" ? (sources?.classTests || []) : type === "cbc" ? (sources?.cbcActivities || []) : [];

  const send = useMutation({
    mutationFn: () => sms.sendResults({
      type, id, scheduledAt: scheduledAt || null,
      classId: classId || undefined, className: cls?.name || undefined,
      streamId: streamId || undefined, streamName: stream?.name || undefined,
    }),
    onSuccess: (r: any) => {
      toast.success(scheduledAt
        ? `Scheduled results for ${r.recipients} learner(s).`
        : `Results queued to ${r.recipients} parent(s)${r.provider === "device" ? " via your connected phone" : ""}.`);
      setId("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not send results"),
  });

  const emailSkills = useMutation({
    mutationFn: () => api.post("/skills/email-report", { className, term, year, subjects: subjects.length ? subjects : undefined }).then(r => r.data),
    onSuccess: (r: any) => toast.success(`Emailed ${r.sent} report(s)${r.skipped ? ` · ${r.skipped} skipped (no parent email)` : ""}${r.failed ? ` · ${r.failed} failed` : ""}`),
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not email the reports"),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Type picker */}
      <div className="lg:col-span-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Result Type</h3>
        <div className="space-y-2">
          {TYPES.map(t => (
            <button key={t.key} onClick={() => { setType(t.key); setId(""); }}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${type === t.key ? "border-[#5C67F2] bg-indigo-50" : "border-slate-100 bg-white hover:border-indigo-200"}`}>
              <t.icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: PURPLE }} />
              <div>
                <span className="text-sm font-bold text-slate-700 block">{t.label}</span>
                <span className="text-[11px] text-slate-400">{t.desc}</span>
              </div>
              {type === t.key && <CheckCircle2 className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: PURPLE }} />}
            </button>
          ))}
        </div>
        <div className="mt-4 bg-indigo-50 rounded-2xl p-3 border border-indigo-100">
          <p className="text-[10px] text-indigo-600 font-bold leading-relaxed">
            {type === "skillReport"
              ? "A PDF of each learner's skill ratings is generated and emailed to their parent/guardian's email address."
              : "A personalised SMS is generated for each learner and sent to their parent/guardian's number."}
          </p>
        </div>
      </div>

      {/* Source + send */}
      <div className="lg:col-span-2 space-y-5">
        {type === "skillReport" ? (
          <>
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Class, term &amp; year</h3>
              <div className="grid grid-cols-2 gap-3">
                <select value={classId} onChange={e => { setClassId(e.target.value); setStreamId(""); }} className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                  <option value="">— Select class —</option>
                  {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!classId} className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] disabled:opacity-50">
                  <option value="">All streams</option>
                  {streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <select value={term} onChange={e => setTerm(e.target.value)} className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
                <input value={year} onChange={e => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" placeholder="Year" />
              </div>
            </div>
            {availableSubjects.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Subjects <span className="font-normal normal-case">(none ticked = all)</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {availableSubjects.map(s => { const on = subjects.includes(s); return <button key={s} type="button" onClick={() => setSubjects(on ? subjects.filter(x => x !== s) : [...subjects, s])} className={`px-2.5 h-7 rounded-full text-[11px] font-bold border ${on ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-200"}`}>{s}</button>; })}
                </div>
              </div>
            )}
            <button onClick={() => className && emailSkills.mutate()} disabled={!className || emailSkills.isPending}
              className="w-full h-14 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 transition-all">
              {emailSkills.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
              Email PDF to Parents
            </button>
          </>
        ) : (
          <>
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Choose {type === "exam" ? "Exam" : type === "classTest" ? "Class Test" : "CBC Activity"}</h3>
              {isLoading ? (
                <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
              ) : list.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No {type === "exam" ? "exams" : type === "classTest" ? "class tests" : "CBC activities"} found yet.</p>
              ) : (
                <select value={id} onChange={e => setId(e.target.value)} className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                  <option value="">— Select —</option>
                  {list.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.subject ? ` · ${s.subject}` : ""}{s.learningArea ? ` · ${s.learningArea}` : ""}{s.term ? ` · ${s.term} ${s.year || ""}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Class + stream filter (optional) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Send To (optional — leave blank for all)</p>
              <div className="grid grid-cols-2 gap-3">
                <select value={classId} onChange={e => { setClassId(e.target.value); setStreamId(""); }} className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                  <option value="">All classes</option>
                  {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!classId} className="h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] disabled:opacity-50">
                  <option value="">All streams</option>
                  {streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {classId ? `Only ${cls?.name || "class"}${stream ? ` ${stream.name}` : " (all streams)"} parents.` : "Results go to every learner's parent."}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Schedule (optional)</p>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
              <p className="text-[10px] text-slate-400 mt-1.5">Leave empty to send now.</p>
            </div>

            <button onClick={() => id && send.mutate()} disabled={!id || send.isPending}
              className="w-full h-14 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 transition-all">
              {send.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {scheduledAt ? "Schedule Results" : "Send Results to Parents"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
