import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Smartphone, Battery, Signal, Wifi, Trash2, RotateCcw, Plus, X, Copy, Check,
  CheckCircle2, XCircle, Loader2, Server,
} from "lucide-react";
import { toast } from "sonner";
import { sms } from "@/lib/smsApi";

const PURPLE = "#5C67F2";

function timeAgo(d?: string) {
  if (!d) return "never";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString("en-GB");
}

export default function SmsDevices() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["sms_devices"], queryFn: sms.devices, refetchInterval: 15000 });
  const [pairing, setPairing] = useState<{ pairingCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const settingsQ = useQuery({ queryKey: ["sms_settings"], queryFn: sms.getSettings });

  const pair = useMutation({ mutationFn: () => sms.pair(), onSuccess: (d) => { setPairing(d); qc.invalidateQueries({ queryKey: ["sms_devices"] }); } });
  const reset = useMutation({ mutationFn: (id: string) => sms.resetDevice(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["sms_devices"] }); toast.success("Device reset — it must pair again"); } });
  const del = useMutation({ mutationFn: (id: string) => sms.deleteDevice(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["sms_devices"] }); toast.success("Device removed"); } });
  const saveProvider = useMutation({ mutationFn: (provider: string) => sms.saveSettings({ provider }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["sms_settings"] }); toast.success("SMS provider updated"); } });

  const stats = data?.stats || {};
  const devices = data?.devices || [];
  const provider = settingsQ.data?.provider || "device";

  const statCards = [
    { label: "Sent today", value: stats.sentToday ?? 0 },
    { label: "Delivered", value: stats.delivered ?? 0 },
    { label: "Queued", value: stats.queued ?? 0 },
    { label: "Sending", value: stats.sending ?? 0 },
    { label: "Failed", value: stats.failed ?? 0 },
    { label: "Total", value: stats.total ?? 0 },
  ];

  const copy = (code: string) => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="space-y-5">
      {/* Provider switch */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2"><Server className="w-4 h-4" style={{ color: PURPLE }} /> SMS Provider</h3>
        <p className="text-xs text-slate-400 mb-4">Choose how this school sends SMS. The mobile gateway uses an Android phone's SIM; the API gateway uses a bulk-SMS provider.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[{ k: "device", t: "Mobile App Gateway", d: "Send via a connected Android phone & SIM card" }, { k: "api", t: "API Gateway", d: "Send via Africa's Talking / bulk SMS API" }].map(o => (
            <button key={o.k} onClick={() => saveProvider.mutate(o.k)} className={`text-left p-4 rounded-xl border-2 transition-all ${provider === o.k ? "border-[#5C67F2] bg-indigo-50" : "border-slate-100 hover:border-indigo-200"}`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-slate-800">{o.t}</span>
                {provider === o.k && <CheckCircle2 className="w-4 h-4" style={{ color: PURPLE }} />}
              </div>
              <p className="text-xs text-slate-400 mt-1">{o.d}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {statCards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-black text-slate-800">{c.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Devices */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Smartphone className="w-4 h-4" style={{ color: PURPLE }} /> Connected Devices</h3>
          <button onClick={() => pair.mutate()} disabled={pair.isPending} className="h-9 px-4 rounded-xl text-white font-bold text-sm flex items-center gap-2" style={{ background: PURPLE }}>
            {pair.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Connect a phone
          </button>
        </div>

        {isLoading ? <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div> :
          devices.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              No phones connected yet. Install the <b>ShuleCloud SMS</b> app, then tap “Connect a phone” to get a pairing code.
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((d: any) => (
                <div key={d._id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: d.online ? "#dcfce7" : "#f1f5f9" }}>
                    <Smartphone className="w-5 h-5" style={{ color: d.online ? "#16a34a" : "#94a3b8" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-800 truncate">{d.name || "Android device"}</p>
                      {d.revoked ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">RESET</span>
                        : d.online ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Online</span>
                          : <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> Offline</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-bold flex-wrap">
                      {d.simOperator && <span>{d.simOperator}</span>}
                      {d.phone && <span>{d.phone}</span>}
                      {d.battery != null && <span className="flex items-center gap-1"><Battery className="w-3 h-3" /> {d.battery}%</span>}
                      {d.network && <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> {d.network}</span>}
                      {d.signal != null && <span className="flex items-center gap-1"><Signal className="w-3 h-3" /> {d.signal}</span>}
                      <span>seen {timeAgo(d.lastSeen)}</span>
                      {!d.paired && d.pairingCode && <span className="text-[#5C67F2]">code {d.pairingCode}</span>}
                    </div>
                  </div>
                  {!d.revoked && <button title="Reset pairing" onClick={() => confirm("Reset this device? It will need to pair again.") && reset.mutate(d._id)} className="p-2 text-slate-400 hover:text-amber-600"><RotateCcw className="w-4 h-4" /></button>}
                  <button title="Remove" onClick={() => confirm("Remove this device?") && del.mutate(d._id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Pairing modal */}
      {pairing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setPairing(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 text-center">
            <button onClick={() => setPairing(null)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5" /></button>
            <Smartphone className="w-10 h-10 mx-auto mb-3" style={{ color: PURPLE }} />
            <h3 className="text-xl font-black text-slate-800 mb-1">Pair your phone</h3>
            <p className="text-sm text-slate-500 mb-5">Open the <b>ShuleCloud SMS</b> app, sign in with your school subdomain, and enter this code:</p>
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="text-4xl font-black tracking-[0.3em]" style={{ color: PURPLE }}>{pairing.pairingCode}</span>
              <button onClick={() => copy(pairing.pairingCode)} className="p-2 rounded-lg bg-slate-100">{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}</button>
            </div>
            <p className="text-xs text-slate-400">This code expires in 15 minutes.</p>
          </div>
        </div>
      )}
    </div>
  );
}
