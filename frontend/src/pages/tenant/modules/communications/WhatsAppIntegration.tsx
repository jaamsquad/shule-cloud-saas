import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import {
    MessageCircle, Loader2, RefreshCw, Power, Trash2, Plug, QrCode,
    CheckCircle2, Wifi, WifiOff, Smartphone, Clock,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";
import { currentTenantSubdomain } from "@/lib/portal";

type Status = "disconnected" | "qr" | "connecting" | "authenticated" | "connected" | "reconnecting" | "logged_out";

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
    connected:    { label: "Connected",    cls: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: Wifi },
    connecting:   { label: "Connecting",   cls: "bg-amber-50 text-amber-600 border-amber-200",       icon: Loader2 },
    reconnecting: { label: "Reconnecting", cls: "bg-amber-50 text-amber-600 border-amber-200",       icon: Loader2 },
    qr:           { label: "Scan QR",      cls: "bg-indigo-50 text-indigo-600 border-indigo-200",    icon: QrCode },
    authenticated:{ label: "Authenticating", cls: "bg-indigo-50 text-indigo-600 border-indigo-200",  icon: Loader2 },
    disconnected: { label: "Disconnected", cls: "bg-slate-100 text-slate-500 border-slate-200",      icon: WifiOff },
    logged_out:   { label: "Logged Out",   cls: "bg-rose-50 text-rose-600 border-rose-200",          icon: WifiOff },
};

export default function WhatsAppIntegration() {
    const qc = useQueryClient();
    const socketRef = useRef<Socket | null>(null);

    const [status, setStatus] = useState<Status>("disconnected");
    const [qrImage, setQrImage] = useState<string | null>(null);   // data-URL
    const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [busy, setBusy] = useState<string | null>(null);
    const [info, setInfo] = useState<any>(null);
    const [justConnected, setJustConnected] = useState(false);

    // ── Initial status / info ────────────────────────────────────────────────
    const { data: initial, isLoading } = useQuery({
        queryKey: ["wa_status"],
        queryFn: async () => (await api.get("/whatsapp/status")).data,
        refetchInterval: false,
    });

    useEffect(() => {
        if (initial) {
            setStatus(initial.status || "disconnected");
            if (initial.status === "connected") loadInfo();
        }
    }, [initial]); // eslint-disable-line

    const loadInfo = async () => {
        try { setInfo((await api.get("/whatsapp/info")).data); } catch { /* ignore */ }
    };

    // ── Fetch a QR (REST) and show it ────────────────────────────────────────
    const fetchQR = async () => {
        try {
            const { data } = await api.get("/whatsapp/qr");
            if (data.connected) { setStatus("connected"); setQrImage(null); loadInfo(); return; }
            if (data.qr) {
                setQrImage(data.qr);
                setStatus("qr");
                setQrExpiresAt(data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 20000);
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to load QR");
        }
    };

    // ── Socket.IO live updates ───────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("auth_token") || "";
        const subdomain = currentTenantSubdomain() || "";
        const socket = io(`${API_ORIGIN}/whatsapp`, {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            auth: { token, subdomain },
        });
        socketRef.current = socket;

        socket.on("connect_error", () => { /* fall back to REST polling of QR */ });

        socket.on("qr", async (p: any) => {
            // Convert raw QR → data-URL on the client for instant swap.
            setStatus("qr");
            setQrExpiresAt(p.expiresAt ? new Date(p.expiresAt).getTime() : Date.now() + 20000);
            // Prefer the server-rendered image via REST for a crisp code.
            fetchQR();
        });
        socket.on("connecting", () => setStatus("connecting"));
        socket.on("reconnecting", () => { setStatus("reconnecting"); toast.message("Reconnecting to WhatsApp…"); });
        socket.on("authenticated", () => setStatus("authenticated"));
        socket.on("connected", (p: any) => {
            setStatus("connected"); setQrImage(null); setQrExpiresAt(null);
            setInfo((prev: any) => ({ ...prev, ...p, connected: true }));
            setJustConnected(true); setTimeout(() => setJustConnected(false), 2500);
            toast.success(`WhatsApp connected${p?.phoneNumber ? ` · +${p.phoneNumber}` : ""}`);
            loadInfo();
            qc.invalidateQueries({ queryKey: ["wa_status"] });
        });
        socket.on("session_expired", () => { toast.message("QR expired — fetching a new one"); fetchQR(); });
        socket.on("disconnected", (p: any) => { setStatus("disconnected"); if (p?.reason !== "deleted") toast.error("WhatsApp connection lost"); });
        socket.on("logout", () => { setStatus("logged_out"); setInfo(null); toast.error("Logged out from WhatsApp"); });

        return () => { socket.disconnect(); socketRef.current = null; };
    }, []); // eslint-disable-line

    // ── QR countdown + auto-refresh on expiry ────────────────────────────────
    useEffect(() => {
        if (status !== "qr" || !qrExpiresAt) { setCountdown(0); return; }
        const tick = () => {
            const left = Math.max(0, Math.round((qrExpiresAt - Date.now()) / 1000));
            setCountdown(left);
            if (left === 0) fetchQR();   // auto-regenerate
        };
        tick();
        const i = setInterval(tick, 1000);
        return () => clearInterval(i);
    }, [status, qrExpiresAt]); // eslint-disable-line

    // ── Actions ──────────────────────────────────────────────────────────────
    const doConnect = async () => {
        setBusy("connect");
        try { await api.post("/whatsapp/connect"); await fetchQR(); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed to connect"); }
        finally { setBusy(null); }
    };
    const doDisconnect = async () => {
        setBusy("disconnect");
        try { await api.post("/whatsapp/disconnect"); setStatus("logged_out"); setInfo(null); toast.success("Disconnected"); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
        finally { setBusy(null); }
    };
    const doDelete = async () => {
        if (!confirm("Delete this WhatsApp session completely? You'll need to re-scan to reconnect.")) return;
        setBusy("delete");
        try { await api.delete("/whatsapp/session"); setStatus("disconnected"); setInfo(null); setQrImage(null); toast.success("Session deleted"); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
        finally { setBusy(null); }
    };
    const doRefreshQR = async () => { setBusy("qr"); try { await fetchQR(); } finally { setBusy(null); } };

    const badge = STATUS_BADGE[status] || STATUS_BADGE.disconnected;
    const BadgeIcon = badge.icon;
    const isConnected = status === "connected";
    const connTime = useMemo(() => {
        const t = info?.connectedAt; return t ? new Date(t).toLocaleString("en-GB") : "—";
    }, [info]);

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen pb-16">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><MessageCircle className="w-5 h-5 text-emerald-600" /></div>
                <div className="flex-1">
                    <h1 className="text-lg font-black text-slate-800">WhatsApp Integration</h1>
                    <p className="text-xs text-slate-400">Connect your school's WhatsApp by scanning a QR code — like WhatsApp Web.</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-wide ${badge.cls}`}>
                    <BadgeIcon className={`w-3.5 h-3.5 ${status === "connecting" || status === "reconnecting" || status === "authenticated" ? "animate-spin" : ""}`} /> {badge.label}
                </span>
            </div>

            <div className="px-6 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                {/* Left card: QR or connected info */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[420px]">
                    {isLoading ? (
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                    ) : isConnected ? (
                        <div className={`flex flex-col items-center text-center transition-all ${justConnected ? "scale-105" : ""}`}>
                            <div className="relative">
                                {info?.profilePicUrl
                                    ? <img src={info.profilePicUrl} alt="" className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-100" />
                                    : <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center ring-4 ring-emerald-100"><Smartphone className="w-10 h-10 text-emerald-500" /></div>}
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center ring-4 ring-white"><CheckCircle2 className="w-5 h-5 text-white" /></div>
                            </div>
                            <p className="mt-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Connected as</p>
                            <p className="text-xl font-black text-slate-800 mt-1">{info?.phoneNumber ? `+${info.phoneNumber}` : "—"}</p>
                            {info?.profileName && <p className="text-sm font-bold text-emerald-600 mt-0.5">{info.profileName}</p>}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold mt-3"><Clock className="w-3.5 h-3.5" /> Connected {connTime}</div>
                        </div>
                    ) : qrImage && status === "qr" ? (
                        <div className="flex flex-col items-center">
                            <div className="relative p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-inner">
                                <img src={qrImage} alt="WhatsApp QR" className="w-64 h-64 transition-opacity duration-300" />
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                                <Clock className="w-4 h-4" />
                                <span>Expires in <b className={countdown <= 5 ? "text-rose-500" : "text-emerald-600"}>{countdown}s</b></span>
                            </div>
                            <p className="mt-2 text-[11px] text-slate-400 text-center max-w-xs">Open WhatsApp → <b>Linked Devices</b> → <b>Link a Device</b>, then point your phone at this code.</p>
                        </div>
                    ) : status === "connecting" || status === "authenticated" || status === "reconnecting" ? (
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                            <p className="text-sm font-bold">{badge.label}…</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center"><QrCode className="w-10 h-10 text-slate-300" /></div>
                            <p className="text-sm font-bold text-slate-500">Not connected</p>
                            <p className="text-xs text-slate-400 max-w-xs">Click <b>Connect</b> to generate a QR code and link your school's WhatsApp account.</p>
                            <button onClick={doConnect} disabled={busy === "connect"} className="mt-1 inline-flex items-center gap-2 h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl disabled:opacity-50">
                                {busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Connect
                            </button>
                        </div>
                    )}
                </div>

                {/* Right card: actions + how it works */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h2 className="text-sm font-black text-slate-700 mb-4">Session Controls</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <ActionBtn onClick={doConnect} disabled={busy !== null || isConnected} icon={Plug} label="Connect" tone="emerald" loading={busy === "connect"} />
                            <ActionBtn onClick={doRefreshQR} disabled={busy !== null || isConnected} icon={RefreshCw} label="Refresh QR" tone="indigo" loading={busy === "qr"} />
                            <ActionBtn onClick={doConnect} disabled={busy !== null || isConnected} icon={Wifi} label="Reconnect" tone="amber" loading={false} />
                            <ActionBtn onClick={doDisconnect} disabled={busy !== null || !isConnected} icon={Power} label="Disconnect" tone="slate" loading={busy === "disconnect"} />
                            <ActionBtn onClick={doDelete} disabled={busy !== null} icon={Trash2} label="Delete Session" tone="rose" loading={busy === "delete"} full />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h2 className="text-sm font-black text-slate-700 mb-3">How it works</h2>
                        <ol className="space-y-2.5 text-xs text-slate-500 font-medium list-decimal list-inside">
                            <li>Click <b>Connect</b> to generate a live QR code.</li>
                            <li>On your phone open <b>WhatsApp → Linked Devices → Link a Device</b>.</li>
                            <li>Scan the code. The status turns <b className="text-emerald-600">Connected</b> instantly.</li>
                            <li>The session is saved — you won't need to re-scan after a server restart.</li>
                        </ol>
                        <p className="mt-4 text-[11px] text-slate-400">Once connected, this WhatsApp powers broadcasts, fee reminders, exam results and parent messaging for your school.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionBtn({ onClick, disabled, icon: Icon, label, tone, loading, full }: any) {
    const tones: Record<string, string> = {
        emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
        indigo: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
        amber: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
        slate: "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200",
        rose: "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200",
    };
    return (
        <button onClick={onClick} disabled={disabled}
            className={`${full ? "col-span-2" : ""} inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border text-xs font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />} {label}
        </button>
    );
}
