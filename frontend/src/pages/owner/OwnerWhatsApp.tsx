import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
    MessageCircle, Loader2, RefreshCw, Power, Plug, QrCode,
    CheckCircle2, Wifi, WifiOff, Smartphone, Clock, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";

type Status = "disconnected" | "qr" | "connecting" | "authenticated" | "connected" | "reconnecting" | "logged_out";

const PRIMARY = "#534AB7";
const BADGE: Record<string, { label: string; cls: string; icon: any }> = {
    connected:    { label: "Connected",    cls: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: Wifi },
    connecting:   { label: "Connecting",   cls: "bg-amber-50 text-amber-600 border-amber-200",       icon: Loader2 },
    reconnecting: { label: "Reconnecting", cls: "bg-amber-50 text-amber-600 border-amber-200",       icon: Loader2 },
    qr:           { label: "Scan QR",      cls: "bg-indigo-50 text-indigo-600 border-indigo-200",    icon: QrCode },
    authenticated:{ label: "Authenticating", cls: "bg-indigo-50 text-indigo-600 border-indigo-200",  icon: Loader2 },
    disconnected: { label: "Disconnected", cls: "bg-slate-100 text-slate-500 border-slate-200",      icon: WifiOff },
    logged_out:   { label: "Logged Out",   cls: "bg-rose-50 text-rose-600 border-rose-200",          icon: WifiOff },
};

// Owner/platform WhatsApp — drives login OTPs, owner broadcasts and new-user credentials.
export default function OwnerWhatsApp() {
    const socketRef = useRef<Socket | null>(null);
    const [status, setStatus] = useState<Status>("disconnected");
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [busy, setBusy] = useState<string | null>(null);
    const [info, setInfo] = useState<any>(null);

    const loadStatus = async () => {
        try { const d = (await api.get("/whatsapp/platform/status")).data; setStatus(d.status || "disconnected"); if (d.status === "connected") loadInfo(); } catch { /* ignore */ }
    };
    const loadInfo = async () => { try { setInfo((await api.get("/whatsapp/platform/info")).data); } catch { /* ignore */ } };

    const fetchQR = async () => {
        try {
            const { data } = await api.get("/whatsapp/platform/qr");
            if (data.connected) { setStatus("connected"); setQrImage(null); loadInfo(); return; }
            if (data.qr) { setQrImage(data.qr); setStatus("qr"); setQrExpiresAt(data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 20000); }
        } catch (e: any) { toast.error(e.response?.data?.message || "Failed to load QR"); }
    };

    useEffect(() => { loadStatus(); }, []); // eslint-disable-line

    // Socket — owner token, subdomain 'platform'
    useEffect(() => {
        const token = localStorage.getItem("owner_token") || "";
        const socket = io(`${API_ORIGIN}/whatsapp`, { path: "/socket.io", transports: ["websocket", "polling"], auth: { token, subdomain: "platform" } });
        socketRef.current = socket;
        socket.on("qr", () => { setStatus("qr"); fetchQR(); });
        socket.on("connecting", () => setStatus("connecting"));
        socket.on("reconnecting", () => setStatus("reconnecting"));
        socket.on("authenticated", () => setStatus("authenticated"));
        socket.on("connected", (p: any) => { setStatus("connected"); setQrImage(null); setQrExpiresAt(null); setInfo((prev: any) => ({ ...prev, ...p, connected: true })); toast.success(`WhatsApp connected${p?.phoneNumber ? ` · +${p.phoneNumber}` : ""}`); loadInfo(); });
        socket.on("session_expired", () => { toast.message("QR expired — fetching a new one"); fetchQR(); });
        socket.on("disconnected", (p: any) => { setStatus("disconnected"); if (p?.reason !== "deleted") toast.error("WhatsApp connection lost"); });
        socket.on("logout", () => { setStatus("logged_out"); setInfo(null); toast.error("Logged out from WhatsApp"); });
        return () => { socket.disconnect(); socketRef.current = null; };
    }, []); // eslint-disable-line

    useEffect(() => {
        if (status !== "qr" || !qrExpiresAt) { setCountdown(0); return; }
        const tick = () => { const left = Math.max(0, Math.round((qrExpiresAt - Date.now()) / 1000)); setCountdown(left); if (left === 0) fetchQR(); };
        tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
    }, [status, qrExpiresAt]); // eslint-disable-line

    const doConnect = async () => { setBusy("connect"); try { await api.post("/whatsapp/platform/connect"); await fetchQR(); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setBusy(null); } };
    const doDisconnect = async () => { setBusy("disconnect"); try { await api.post("/whatsapp/platform/disconnect"); setStatus("logged_out"); setInfo(null); toast.success("Disconnected"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setBusy(null); } };
    const doDelete = async () => { if (!confirm("Delete the platform WhatsApp session?")) return; setBusy("delete"); try { await api.delete("/whatsapp/platform/session"); setStatus("disconnected"); setInfo(null); setQrImage(null); toast.success("Session deleted"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setBusy(null); } };

    const badge = BADGE[status] || BADGE.disconnected;
    const BadgeIcon = badge.icon;
    const isConnected = status === "connected";
    const connTime = useMemo(() => { const t = info?.connectedAt; return t ? new Date(t).toLocaleString("en-GB") : "—"; }, [info]);

    return (
        <div className="space-y-5 max-w-4xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><MessageCircle className="w-5 h-5 text-emerald-600" /></div>
                    <div>
                        <h2 className="text-base font-black text-slate-800">Platform WhatsApp</h2>
                        <p className="text-xs text-slate-500">Powers owner login codes, broadcasts and new-user credentials. Scan to connect — like WhatsApp Web.</p>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase ${badge.cls}`}>
                    <BadgeIcon className={`w-3.5 h-3.5 ${["connecting", "reconnecting", "authenticated"].includes(status) ? "animate-spin" : ""}`} /> {badge.label}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[380px]">
                    {isConnected ? (
                        <div className="flex flex-col items-center text-center">
                            <div className="relative">
                                {info?.profilePicUrl ? <img src={info.profilePicUrl} alt="" className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-100" /> : <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center ring-4 ring-emerald-100"><Smartphone className="w-10 h-10 text-emerald-500" /></div>}
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center ring-4 ring-white"><CheckCircle2 className="w-5 h-5 text-white" /></div>
                            </div>
                            <p className="mt-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Connected as</p>
                            <p className="text-xl font-black text-slate-800 mt-1">{info?.phoneNumber ? `+${info.phoneNumber}` : "—"}</p>
                            {info?.profileName && <p className="text-sm font-bold text-emerald-600 mt-0.5">{info.profileName}</p>}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold mt-3"><Clock className="w-3.5 h-3.5" /> Connected {connTime}</div>
                        </div>
                    ) : qrImage && status === "qr" ? (
                        <div className="flex flex-col items-center">
                            <div className="p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-inner"><img src={qrImage} alt="QR" className="w-64 h-64" /></div>
                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500"><Clock className="w-4 h-4" /> Expires in <b className={countdown <= 5 ? "text-rose-500" : "text-emerald-600"}>{countdown}s</b></div>
                            <p className="mt-2 text-[11px] text-slate-400 text-center max-w-xs">Open WhatsApp → <b>Linked Devices</b> → <b>Link a Device</b>, then scan.</p>
                        </div>
                    ) : ["connecting", "authenticated", "reconnecting"].includes(status) ? (
                        <div className="flex flex-col items-center gap-3 text-slate-400"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /><p className="text-sm font-bold">{badge.label}…</p></div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center"><QrCode className="w-10 h-10 text-slate-300" /></div>
                            <p className="text-sm font-bold text-slate-500">Not connected</p>
                            <button onClick={doConnect} disabled={busy === "connect"} className="inline-flex items-center gap-2 h-11 px-6 text-white font-black text-sm rounded-xl disabled:opacity-50" style={{ background: PRIMARY }}>
                                {busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Connect
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-sm font-black text-slate-700 mb-4">Session Controls</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={doConnect} disabled={busy !== null || isConnected} className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border text-xs font-black bg-emerald-50 text-emerald-700 border-emerald-200 disabled:opacity-40">{busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Connect</button>
                        <button onClick={fetchQR} disabled={busy !== null || isConnected} className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border text-xs font-black bg-indigo-50 text-indigo-700 border-indigo-200 disabled:opacity-40"><RefreshCw className="w-4 h-4" /> Refresh QR</button>
                        <button onClick={doDisconnect} disabled={busy !== null || !isConnected} className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border text-xs font-black bg-slate-50 text-slate-600 border-slate-200 disabled:opacity-40">{busy === "disconnect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />} Disconnect</button>
                        <button onClick={doDelete} disabled={busy !== null} className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border text-xs font-black bg-rose-50 text-rose-700 border-rose-200 disabled:opacity-40">{busy === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete</button>
                    </div>
                    <p className="mt-4 text-[11px] text-slate-400">Once connected, owner login codes and new-user welcome messages are also delivered over this WhatsApp.</p>
                </div>
            </div>
        </div>
    );
}
