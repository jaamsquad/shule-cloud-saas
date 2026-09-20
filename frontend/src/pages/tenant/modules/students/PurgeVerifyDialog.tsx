import { useState } from "react";
import { X, Loader2, ShieldAlert, Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * Deleting students for good: (1) the school administrator's password, (2) a 6-digit code emailed to the
 * administrator. Nothing is deleted until both pass on the server.
 */
export default function PurgeVerifyDialog({ ids, label, onClose, onDone }: { ids: string[]; label: string; onClose: () => void; onDone: (deleted: number) => void }) {
    const [step, setStep] = useState<"password" | "otp">("password");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [otp, setOtp] = useState("");
    const [sentTo, setSentTo] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const sendCode = async () => {
        setBusy(true); setError("");
        try {
            const r = await api.post("/students/trash/purge/request", { ids, password });
            setSentTo(r.data.sentTo); setOtp(""); setStep("otp");
            toast.success(`Code sent to ${r.data.sentTo}`);
        } catch (e: any) { setError(e.response?.data?.message || "Could not send the code."); } finally { setBusy(false); }
    };
    const confirm = async () => {
        setBusy(true); setError("");
        try {
            const r = await api.post("/students/trash/purge/confirm", { ids, otp: otp.trim() });
            setPassword("");   // don't keep it around
            onDone(r.data.deleted);
        } catch (e: any) {
            setError(e.response?.data?.message || "Could not delete.");
            if (["locked", "expired", "none"].includes(e.response?.data?.reason)) { setStep("password"); }
        } finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 bg-rose-50 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"><ShieldAlert className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg">Delete permanently</h3>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{label} will be erased for good — this cannot be undone.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-slate-500 flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button>
                </div>

                <div className="p-6 space-y-4">
                    {step === "password" ? (
                        <>
                            <p className="text-sm text-slate-600"><b>Step 1 of 2.</b> Enter the <b>school administrator's password</b>. We'll then email a 6-digit code to the administrator.</p>
                            <div className="relative">
                                <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && password && !busy && sendCode()} autoFocus placeholder="Administrator password"
                                    className="w-full h-11 px-4 pr-11 border border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 text-sm" />
                                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-slate-600 flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" /><span><b>Step 2 of 2.</b> Enter the 6-digit code emailed to <b>{sentTo}</b>. It expires in 10 minutes.</span></p>
                            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={e => e.key === "Enter" && otp.length === 6 && !busy && confirm()} autoFocus inputMode="numeric" placeholder="000000"
                                className="w-full h-14 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-rose-400 text-2xl font-black tracking-[0.5em] text-center" />
                            <button type="button" onClick={sendCode} disabled={busy} className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50">Didn't get it? Send a new code</button>
                        </>
                    )}
                    {error && <p className="text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                    {step === "password" ? (
                        <button onClick={sendCode} disabled={busy || !password} className="px-5 py-2.5 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors flex items-center gap-2 disabled:opacity-50">
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send code
                        </button>
                    ) : (
                        <button onClick={confirm} disabled={busy || otp.length !== 6} className="px-5 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Delete permanently
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
