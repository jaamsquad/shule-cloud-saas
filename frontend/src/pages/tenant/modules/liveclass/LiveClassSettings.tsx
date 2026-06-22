import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Plug } from "lucide-react";
import { toast } from "sonner";
import { liveClass } from "@/lib/liveClassApi";

const PURPLE = "#5C67F2";

export default function LiveClassSettings() {
  const navigate = useNavigate();
  const { data: loaded, isLoading } = useQuery({ queryKey: ["live_settings"], queryFn: liveClass.getSettings });
  const [f, setF] = useState<any>(null);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => { if (loaded) setF(loaded); }, [loaded]);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const save = useMutation({ mutationFn: () => liveClass.saveSettings(f), onSuccess: () => toast.success("Settings saved"), onError: (e: any) => toast.error(e?.response?.data?.message || "Save failed") });
  const runTest = useMutation({ mutationFn: () => liveClass.testConnection(f), onSuccess: (r: any) => setTest(r), onError: (e: any) => setTest({ ok: false, message: e?.response?.data?.message || "Test failed" }) });

  if (isLoading || !f) return <div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const isBBB = f.provider === "bigbluebutton";

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
      <button onClick={() => navigate("/live-classes")} className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-4"><ArrowLeft className="w-4 h-4" /> Back to Live Classes</button>
      <h1 className="text-2xl font-black text-slate-900 mb-1">Live Class Settings</h1>
      <p className="text-sm text-slate-400 mb-6">Choose your meeting provider and configure it. Switch any time — no code changes.</p>

      <div className="max-w-2xl space-y-5">
        {/* Provider selection */}
        <Section title="Meeting Provider">
          <div className="grid sm:grid-cols-2 gap-3">
            {[{ k: "jitsi", t: "Jitsi Meet", d: "Free, instant rooms. Great default." }, { k: "bigbluebutton", t: "BigBlueButton", d: "Self-hosted, with server recordings." }].map(o => (
              <button key={o.k} onClick={() => { set("provider", o.k); setTest(null); }} className={`text-left p-4 rounded-xl border-2 transition-all ${f.provider === o.k ? "border-[#5C67F2] bg-indigo-50" : "border-slate-100 hover:border-indigo-200"}`}>
                <div className="flex items-center justify-between"><span className="font-black text-sm text-slate-800">{o.t}</span>{f.provider === o.k && <CheckCircle2 className="w-4 h-4" style={{ color: PURPLE }} />}</div>
                <p className="text-xs text-slate-400 mt-1">{o.d}</p>
              </button>
            ))}
          </div>
          <Toggle className="mt-4" label="Allow teachers to choose the provider per class" v={f.allowTeacherOverride} on={() => set("allowTeacherOverride", !f.allowTeacherOverride)} />
        </Section>

        {/* Provider config */}
        {isBBB ? (
          <Section title="BigBlueButton Configuration">
            <Field label="BBB Server URL"><input value={f.bbbUrl || ""} onChange={e => set("bbbUrl", e.target.value)} placeholder="https://bbb.yourschool.ac.ke/bigbluebutton" className="inp" /></Field>
            <Field label="BBB Secret"><input type="password" value={f.bbbSecret || ""} onChange={e => set("bbbSecret", e.target.value)} placeholder="from bbb-conf --secret" className="inp" /></Field>
            <Field label="Welcome message"><input value={f.bbbWelcome || ""} onChange={e => set("bbbWelcome", e.target.value)} className="inp" /></Field>
            <div className="flex flex-wrap gap-4 pt-1">
              <Toggle label="Allow recording" v={f.bbbAllowRecording} on={() => set("bbbAllowRecording", !f.bbbAllowRecording)} />
              <Toggle label="Auto-mute" v={f.bbbAutoMute} on={() => set("bbbAutoMute", !f.bbbAutoMute)} />
              <Toggle label="Lock viewers" v={f.bbbLockViewers} on={() => set("bbbLockViewers", !f.bbbLockViewers)} />
              <Toggle label="Guest access" v={f.bbbGuestAccess} on={() => set("bbbGuestAccess", !f.bbbGuestAccess)} />
            </div>
          </Section>
        ) : (
          <Section title="Jitsi Configuration">
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-[12px] text-amber-700 leading-snug">
              ⚠️ The free public <b>meet.jit.si</b> ends meetings after <b>5 minutes</b>. To remove the limit, either set up
              <b> 8x8 JaaS</b> (free tier at jaas.8x8.vc — paste the App ID + RSA private key below) or point the domain at your own <b>self-hosted Jitsi</b>.
            </div>
            <Field label="Jitsi Domain"><input value={f.jitsiDomain || ""} onChange={e => set("jitsiDomain", e.target.value)} placeholder="meet.jit.si or your self-hosted domain (ignored when using JaaS App ID)" className="inp" /></Field>
            <Field label="Room name prefix"><input value={f.jitsiRoomPrefix || ""} onChange={e => set("jitsiRoomPrefix", e.target.value)} placeholder="ShuleCloud" className="inp" /></Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="App ID (JaaS / JWT)"><input value={f.jitsiAppId || ""} onChange={e => set("jitsiAppId", e.target.value)} placeholder="vpaas-magic-cookie-…" className="inp" /></Field>
              <Field label="API Key / Private Key (JWT)"><input type="password" value={f.jitsiAppSecret || ""} onChange={e => set("jitsiAppSecret", e.target.value)} placeholder="RSA private key (JaaS) or shared secret" className="inp" /></Field>
            </div>
            <p className="text-[11px] text-slate-400">Leave the App ID/Key blank to use the free public server (5-min limit). Fill them in for unlimited, authenticated meetings.</p>
            <div className="flex flex-wrap gap-4 pt-1">
              <Toggle label="Lobby" v={f.jitsiEnableLobby} on={() => set("jitsiEnableLobby", !f.jitsiEnableLobby)} />
              <Toggle label="Password" v={f.jitsiEnablePassword} on={() => set("jitsiEnablePassword", !f.jitsiEnablePassword)} />
              <Toggle label="Recording" v={f.jitsiEnableRecording} on={() => set("jitsiEnableRecording", !f.jitsiEnableRecording)} />
            </div>
          </Section>
        )}

        {/* Shared */}
        <Section title="Recording, Attendance & Notifications">
          <div className="flex flex-wrap gap-4">
            <Toggle label="Recordings enabled" v={f.recordingEnabled} on={() => set("recordingEnabled", !f.recordingEnabled)} />
            <Toggle label="Track attendance" v={f.attendanceEnabled} on={() => set("attendanceEnabled", !f.attendanceEnabled)} />
            <Toggle label="Notify participants" v={f.notifyEnabled} on={() => set("notifyEnabled", !f.notifyEnabled)} />
          </div>
        </Section>

        {/* Test + save */}
        <div className="flex items-center gap-3">
          <button onClick={() => runTest.mutate()} disabled={runTest.isPending} className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-2">
            {runTest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Test connection
          </button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="h-11 px-6 rounded-xl text-white font-bold text-sm" style={{ background: PURPLE }}>{save.isPending ? "Saving…" : "Save settings"}</button>
        </div>
        {test && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2 ${test.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
            {test.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {test.message}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-slate-100 p-5"><h3 className="text-sm font-black text-slate-700 mb-4">{title}</h3><div className="space-y-3">{children}</div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-1">{label}</span>{children}</label>;
}
function Toggle({ label, v, on, className }: { label: string; v: boolean; on: () => void; className?: string }) {
  return (
    <button onClick={on} className={`flex items-center gap-2 text-sm font-bold text-slate-600 ${className || ""}`}>
      <span className={`w-9 h-5 rounded-full relative transition-colors ${v ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${v ? "left-4" : "left-0.5"}`} />
      </span>{label}
    </button>
  );
}
