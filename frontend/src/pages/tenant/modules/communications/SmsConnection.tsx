import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Laptop, Smartphone, CheckCircle2, XCircle, MessageSquare, Send, Settings2,
  Loader2, Inbox, BatteryMedium,
} from "lucide-react";
import { toast } from "sonner";
import { sms } from "@/lib/smsApi";

const PURPLE = "#5C67F2";

/**
 * SMS connection / readiness page (eSkooly-style): shows whether the web portal
 * and the gateway (Android app or API) are connected and ready, the connected
 * device's details, credit/sent/pending/failed stats, and a test-SMS sender.
 * `onOpenDashboard` switches the parent BulkSMS tab to "devices".
 */
export default function SmsConnection({ onOpenDashboard }: { onOpenDashboard?: () => void }) {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["sms_status"], queryFn: sms.status, refetchInterval: 15000 });
  // Talksasa SMS unit balance (when the school uses the Talksasa vendor).
  const { data: bal } = useQuery({ queryKey: ["sms_balance"], queryFn: async () => { try { return (await (await import("@/lib/api")).default.get("/communications/sms/balance")).data; } catch { return null; } }, refetchInterval: 60000 });
  const [testOpen, setTestOpen] = useState(false);
  const [phone, setPhone] = useState("");

  const test = useMutation({
    mutationFn: () => sms.test(phone.trim()),
    onSuccess: (r: any) => {
      if (r.provider === "device") toast.success("Test queued to your connected phone — it should arrive shortly.");
      else toast.success(`Test sent (${r.sent || 0} ok, ${r.failed || 0} failed).`);
      setTestOpen(false); setPhone(""); refetch();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not send test SMS"),
  });

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const ready = data?.ready;
  const device = data?.device;
  const stats = data?.stats || {};
  const isApi = data?.provider === "api";

  const statCards = [
    { label: "Available", value: bal?.configured ? (typeof bal.balance === "object" ? "—" : (bal.balance ?? "—")) : (isApi ? "—" : "Unlimited"), icon: MessageSquare, color: PURPLE, sub: bal?.configured ? (bal.vendor === "africas_talking" ? "Africa's Talking credit" : "Talksasa SMS units") : (isApi ? "Depends on API balance" : "Uses your SIM bundle") },
    { label: "Sent", value: stats.sentToday ?? 0, icon: CheckCircle2, color: "#16a34a" },
    { label: "Pending", value: (stats.queued ?? 0) + (stats.sending ?? 0), icon: Inbox, color: "#d97706" },
    { label: "Failed", value: stats.failed ?? 0, icon: XCircle, color: "#dc2626" },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7 grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: headline */}
        <div>
          <span className="inline-block text-[10px] font-black uppercase tracking-widest text-white px-3 py-1 rounded-full mb-4" style={{ background: PURPLE }}>Send unlimited free SMS on mobiles</span>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Your SMS gateway</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md">
            {isApi
              ? "This school sends SMS through a bulk-SMS API. Send a test message to confirm it's configured correctly."
              : "This school sends SMS straight from a connected Android phone's SIM — no per-message gateway fees. Keep the ShuleCloud SMS app running on the paired phone."}
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={() => setTestOpen(true)} className="h-11 px-5 rounded-full text-white font-bold text-sm flex items-center gap-2" style={{ background: PURPLE }}>
              <Send className="w-4 h-4" /> Send Test SMS
            </button>
            {onOpenDashboard && (
              <button onClick={onOpenDashboard} className="h-11 px-5 rounded-full border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Gateway Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Right: connection diagram + device + stats */}
        <div>
          {/* Diagram */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center"><Laptop className="w-8 h-8 text-slate-600" /></div>
              <span className="text-[10px] font-black text-slate-400 mt-1 uppercase">Web</span>
            </div>
            <div className="flex-1 relative h-px bg-slate-200 max-w-[120px]">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: ready ? "#16a34a" : "#e2e8f0" }}>
                {ready ? <CheckCircle2 className="w-4 h-4 text-white" /> : <XCircle className="w-4 h-4 text-slate-400" />}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: data?.deviceConnected ? "#ede9fe" : "#f1f5f9" }}>
                <Smartphone className="w-8 h-8" style={{ color: data?.deviceConnected ? PURPLE : "#94a3b8" }} />
              </div>
              <span className="text-[10px] font-black text-slate-400 mt-1 uppercase">{isApi ? "API" : "Phone"}</span>
            </div>
          </div>

          {/* Status line */}
          <div className="text-center mb-5">
            {ready ? (
              <p className="font-black text-emerald-600 flex items-center justify-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Connected & ready to send</p>
            ) : (
              <p className="font-black text-rose-500 flex items-center justify-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> {isApi ? "API not configured" : "No phone connected"}</p>
            )}
            {!isApi && device && (
              <>
                <p className="text-sm font-bold text-slate-700 mt-1">{device.name || "Android device"}</p>
                <p className="text-[11px] text-slate-400">
                  {device.simOperator ? `SIM: ${device.simOperator}` : "SIM info pending"}{device.phone ? ` · ${device.phone}` : ""}{device.battery != null && <> · <BatteryMedium className="w-3 h-3 inline-block align-[-2px]" /> {device.battery}%</>}
                </p>
              </>
            )}
            {!isApi && !device && <p className="text-[11px] text-slate-400 mt-1">Pair a phone under the Gateway Dashboard.</p>}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(c => (
              <div key={c.label} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{c.label}</span>
                  <c.icon className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <p className="text-2xl font-black mt-1" style={{ color: c.color }}>{c.value}</p>
                {c.sub && <p className="text-[9px] text-slate-400 font-bold">{c.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test SMS modal */}
      {testOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setTestOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7">
            <h3 className="text-lg font-black text-slate-800 mb-1">Send a test SMS</h3>
            <p className="text-sm text-slate-500 mb-4">We'll send a short confirmation message to this number.</p>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX XXX XXX" className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2] mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setTestOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">Cancel</button>
              <button onClick={() => phone.trim() && test.mutate()} disabled={test.isPending || !phone.trim()} className="flex-1 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: PURPLE }}>
                {test.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
