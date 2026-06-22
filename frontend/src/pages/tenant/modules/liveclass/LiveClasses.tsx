import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video, Plus, Play, Pencil, Copy, Trash2, Users, Film, X, Calendar, Clock,
  Radio, CheckCircle2, Loader2, Settings as SettingsIcon, Download,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { liveClass, type LiveClass } from "@/lib/liveClassApi";

const PURPLE = "#5C67F2";
const fmtDate = (d?: string) => d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

const ProviderBadge = ({ p }: { p: string }) => (
  <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={p === "bigbluebutton" ? { background: "#fee2e2", color: "#b91c1c" } : { background: "#e0e7ff", color: "#4338ca" }}>
    {p === "bigbluebutton" ? "BigBlueButton" : "Jitsi"}
  </span>
);
const StatusBadge = ({ s }: { s: string }) => {
  const map: any = { live: ["bg-rose-100 text-rose-700", "● Live"], scheduled: ["bg-amber-100 text-amber-700", "Scheduled"], ended: ["bg-slate-100 text-slate-500", "Ended"], cancelled: ["bg-slate-100 text-slate-400", "Cancelled"] };
  const [cls, label] = map[s] || map.scheduled;
  return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};

export default function LiveClasses() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"upcoming" | "live" | "completed">("upcoming");
  const [editing, setEditing] = useState<LiveClass | "new" | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<LiveClass | null>(null);
  const [recordingsFor, setRecordingsFor] = useState<LiveClass | null>(null);

  const { data: classes = [], isLoading } = useQuery({ queryKey: ["live_classes"], queryFn: () => liveClass.list(), refetchInterval: 30000 });
  const { data: stats } = useQuery({ queryKey: ["live_classes_stats"], queryFn: liveClass.stats });

  const del = useMutation({ mutationFn: (id: string) => liveClass.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["live_classes"] }); toast.success("Deleted"); } });
  const dup = useMutation({ mutationFn: (id: string) => liveClass.duplicate(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["live_classes"] }); toast.success("Duplicated"); } });
  const cancel = useMutation({ mutationFn: (id: string) => liveClass.update(id, { status: "cancelled" }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["live_classes"] }); } });
  const start = useMutation({
    mutationFn: (id: string) => liveClass.start(id),
    onSuccess: (_d, id) => { qc.invalidateQueries({ queryKey: ["live_classes"] }); navigate(`/live-classes/room/${id}?role=moderator&name=${encodeURIComponent("Teacher")}`); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not start the class"),
  });

  const now = Date.now();
  const filtered = classes.filter(c => {
    if (tab === "live") return c.status === "live";
    if (tab === "completed") return c.status === "ended" || c.status === "cancelled";
    return c.status === "scheduled" || (c.status === "live"); // upcoming includes live
  }).filter(c => tab !== "upcoming" || new Date(c.endAt || c.startAt).getTime() > now - 6 * 3600000 || c.status !== "ended");

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Video className="w-6 h-6" style={{ color: PURPLE }} /> Live Classes</h1>
          <p className="text-sm text-slate-400">Schedule and run live sessions via Jitsi or BigBlueButton.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/live-classes/settings")} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Settings</button>
          <button onClick={() => setEditing("new")} className="h-10 px-5 rounded-xl text-white font-bold text-sm flex items-center gap-2" style={{ background: PURPLE }}><Plus className="w-4 h-4" /> New Live Class</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { l: "Today", v: stats?.today ?? 0, icon: Calendar },
          { l: "Live now", v: stats?.live ?? 0, icon: Radio },
          { l: "Completed", v: stats?.ended ?? 0, icon: CheckCircle2 },
          { l: "Total", v: stats?.total ?? 0, icon: Video },
        ].map(c => (
          <div key={c.l} className="bg-white rounded-2xl border border-slate-100 p-4">
            <c.icon className="w-5 h-5 mb-2" style={{ color: PURPLE }} />
            <p className="text-2xl font-black text-slate-800">{c.v}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{c.l}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
        {(["upcoming", "live", "completed"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize ${tab === t ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>{t}</button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400 text-sm">No {tab} classes.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <div key={c._id} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-slate-800 truncate">{c.title}</h3>
                  <StatusBadge s={c.status} /><ProviderBadge p={c.provider} />
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                  {c.subjectName && <span>{c.subjectName}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDate(c.startAt)}</span>
                  <span>{c.durationMinutes || 60} min</span>
                  <span>{c.teacherName}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {c.status !== "ended" && c.status !== "cancelled" && (
                  <button onClick={() => start.mutate(c._id)} disabled={start.isPending} className="h-9 px-4 rounded-lg text-white font-bold text-xs flex items-center gap-1.5" style={{ background: "#16a34a" }}><Play className="w-3.5 h-3.5" /> {c.status === "live" ? "Rejoin" : "Start"}</button>
                )}
                <button onClick={() => setAttendanceFor(c)} title="Attendance" className="h-9 px-3 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold flex items-center gap-1"><Users className="w-3.5 h-3.5" /></button>
                <button onClick={() => setRecordingsFor(c)} title="Recordings" className="h-9 px-3 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold flex items-center gap-1"><Film className="w-3.5 h-3.5" /></button>
                {c.status === "scheduled" && <button onClick={() => setEditing(c)} title="Edit" className="h-9 w-9 rounded-lg border border-slate-200 text-slate-400 flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>}
                <button onClick={() => dup.mutate(c._id)} title="Duplicate" className="h-9 w-9 rounded-lg border border-slate-200 text-slate-400 flex items-center justify-center"><Copy className="w-3.5 h-3.5" /></button>
                {c.status === "scheduled" && <button onClick={() => confirm("Cancel this class?") && cancel.mutate(c._id)} title="Cancel" className="h-9 w-9 rounded-lg border border-slate-200 text-amber-500 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>}
                <button onClick={() => confirm("Delete this class?") && del.mutate(c._id)} title="Delete" className="h-9 w-9 rounded-lg border border-slate-200 text-rose-500 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ScheduleModal value={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ["live_classes"] }); setEditing(null); }} />}
      {attendanceFor && <AttendanceModal lc={attendanceFor} onClose={() => setAttendanceFor(null)} />}
      {recordingsFor && <RecordingsModal lc={recordingsFor} onClose={() => setRecordingsFor(null)} />}
    </div>
  );
}

// ─── Schedule / edit modal ────────────────────────────────────────────────────
function ScheduleModal({ value, onClose, onSaved }: { value: LiveClass | null; onClose: () => void; onSaved: () => void }) {
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects_min"], queryFn: async () => { const r = await api.get("/subjects").catch(() => ({ data: [] })); return Array.isArray(r.data) ? r.data : []; } });
  const { data: settings } = useQuery({ queryKey: ["live_settings"], queryFn: liveClass.getSettings });
  const [f, setF] = useState<any>(value || {
    title: "", description: "", subjectId: "", startAt: "", durationMinutes: 60,
    recordingEnabled: false, waitingRoom: true, autoMute: true, provider: settings?.provider || "jitsi",
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const subj = subjects.find((s: any) => s._id === f.subjectId);
      const body = { ...f, subjectName: subj?.name || subj?.subjectName || "", startAt: new Date(f.startAt).toISOString() };
      return value ? liveClass.update(value._id, body) : liveClass.create(body);
    },
    onSuccess: () => { toast.success(value ? "Updated" : "Class scheduled"); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Save failed"),
  });

  const toLocal = (iso?: string) => iso ? new Date(iso).toISOString().slice(0, 16) : "";

  return (
    <Modal title={value ? "Edit live class" : "New live class"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Title"><input value={f.title} onChange={e => set("title", e.target.value)} className="inp" placeholder="e.g. Algebra — Unit 3 recap" /></Field>
        <Field label="Subject">
          <select value={f.subjectId} onChange={e => set("subjectId", e.target.value)} className="inp">
            <option value="">— none —</option>
            {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.subjectName}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start"><input type="datetime-local" value={toLocal(f.startAt)} onChange={e => set("startAt", e.target.value)} className="inp" /></Field>
          <Field label="Duration (min)"><input type="number" value={f.durationMinutes} onChange={e => set("durationMinutes", Number(e.target.value))} className="inp" /></Field>
        </div>
        <Field label="Description"><textarea value={f.description} onChange={e => set("description", e.target.value)} rows={2} className="inp" /></Field>
        {settings?.allowTeacherOverride && settings?.bbbAllowedForSchools && (
          <Field label="Meeting provider">
            <select value={f.provider} onChange={e => set("provider", e.target.value)} className="inp">
              <option value="jitsi">Jitsi Meet</option>
              <option value="bigbluebutton">BigBlueButton</option>
            </select>
          </Field>
        )}
        <div className="flex flex-wrap gap-4 pt-1">
          <Toggle label="Record" v={f.recordingEnabled} on={() => set("recordingEnabled", !f.recordingEnabled)} />
          <Toggle label="Waiting room" v={f.waitingRoom} on={() => set("waitingRoom", !f.waitingRoom)} />
          <Toggle label="Mute on join" v={f.autoMute} on={() => set("autoMute", !f.autoMute)} />
        </div>
        <button onClick={() => f.title && f.startAt ? save.mutate() : toast.error("Title and start time are required")} disabled={save.isPending}
          className="w-full h-11 rounded-xl text-white font-bold text-sm mt-2" style={{ background: PURPLE }}>
          {save.isPending ? "Saving…" : value ? "Save changes" : "Schedule class"}
        </button>
      </div>
    </Modal>
  );
}

function AttendanceModal({ lc, onClose }: { lc: LiveClass; onClose: () => void }) {
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["lc_attendance", lc._id], queryFn: () => liveClass.attendance(lc._id) });
  const exportCsv = () => {
    const head = ["Name", "Admission No", "Joined", "Left", "Duration (min)"];
    const body = rows.map((r: any) => [r.name, r.admissionNo || "", r.joinedAt ? new Date(r.joinedAt).toLocaleString() : "", r.leftAt ? new Date(r.leftAt).toLocaleString() : "", r.durationSec ? Math.round(r.durationSec / 60) : ""]);
    const csv = [head, ...body].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${lc.title}-attendance.csv`; a.click();
  };
  return (
    <Modal title={`Attendance — ${lc.title}`} onClose={onClose}>
      <div className="flex justify-end mb-2"><button onClick={exportCsv} disabled={!rows.length} className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> CSV</button></div>
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto my-6 text-slate-400" /> : rows.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No attendance recorded yet.</p> : (
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
          {rows.map((r: any) => (
            <div key={r._id} className="flex items-center justify-between py-2.5">
              <div><p className="text-sm font-bold text-slate-700">{r.name}</p><p className="text-[11px] text-slate-400">{r.admissionNo || ""} · joined {r.joinedAt ? new Date(r.joinedAt).toLocaleTimeString() : ""}</p></div>
              <span className="text-xs font-bold text-slate-500">{r.durationSec ? `${Math.round(r.durationSec / 60)} min` : "in class"}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function RecordingsModal({ lc, onClose }: { lc: LiveClass; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: recs = [], isLoading } = useQuery({ queryKey: ["lc_recordings", lc._id], queryFn: () => liveClass.recordings(lc._id) });
  const [url, setUrl] = useState("");
  const add = useMutation({ mutationFn: () => liveClass.addRecording(lc._id, { url }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["lc_recordings", lc._id] }); setUrl(""); toast.success("Recording added"); } });
  const del = useMutation({ mutationFn: (recId: string) => liveClass.deleteRecording(recId), onSuccess: () => qc.invalidateQueries({ queryKey: ["lc_recordings", lc._id] }) });
  return (
    <Modal title={`Recordings — ${lc.title}`} onClose={onClose}>
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto my-6 text-slate-400" /> : recs.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No recordings yet.</p> : (
        <div className="space-y-2 mb-4">
          {recs.map((r: any, i: number) => (
            <div key={r.id || r._id || i} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
              <a href={r.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#5C67F2] hover:underline truncate">{r.name || "Recording"}</a>
              {(r._id) && <button onClick={() => del.mutate(r._id)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a recording URL…" className="inp flex-1" />
        <button onClick={() => url && add.mutate()} className="h-10 px-4 rounded-lg text-white font-bold text-sm" style={{ background: PURPLE }}>Add</button>
      </div>
    </Modal>
  );
}

// ─── shared bits ──────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-1">{label}</span>{children}</label>;
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: () => void }) {
  return (
    <button onClick={on} className="flex items-center gap-2 text-sm font-bold text-slate-600">
      <span className={`w-9 h-5 rounded-full relative transition-colors ${v ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${v ? "left-4" : "left-0.5"}`} />
      </span>{label}
    </button>
  );
}
