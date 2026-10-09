import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2, ArrowLeft, RotateCw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// Second sign-in step: the 6-digit code emailed to the person.
export interface OtpChallenge { challengeId: string; sentTo: string; expiresInMinutes: number; canRemember?: boolean; trustDays?: number }

export default function OtpStep({ challenge, onDone, onBack, accent = "#1B5FE3" }: {
    challenge: OtpChallenge;
    onDone: (data: any) => void;   // the normal sign-in response (+ trustToken when remembered)
    onBack: () => void;
    accent?: string;
}) {
    const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
    const [remember, setRemember] = useState(true);
    const [busy, setBusy] = useState(false);
    const [cooldown, setCooldown] = useState(45);
    const [sentTo, setSentTo] = useState(challenge.sentTo);
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => { refs.current[0]?.focus(); }, []);
    useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);

    const code = digits.join("");
    const submit = async (c = code) => {
        if (c.length !== 6 || busy) return;
        setBusy(true);
        try {
            const r = await api.post("/auth/2fa/verify", { challengeId: challenge.challengeId, code: c, remember: remember && challenge.canRemember !== false });
            onDone(r.data);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Could not verify the code");
            if (e.response?.data?.expired) onBack();
            setDigits(Array(6).fill("")); refs.current[0]?.focus();
        } finally { setBusy(false); }
    };
    const set = (i: number, v: string) => {
        const only = v.replace(/\D/g, "");
        if (only.length > 1) {   // pasted the whole code
            const next = only.slice(0, 6).split("").concat(Array(6).fill("")).slice(0, 6);
            setDigits(next); refs.current[Math.min(5, only.length)]?.focus();
            if (only.length >= 6) submit(only.slice(0, 6));
            return;
        }
        const next = [...digits]; next[i] = only; setDigits(next);
        if (only && i < 5) refs.current[i + 1]?.focus();
        if (next.every(Boolean)) submit(next.join(""));
    };
    const resend = async () => {
        try { const r = await api.post("/auth/2fa/resend", { challengeId: challenge.challengeId }); setSentTo(r.data?.sentTo || sentTo); setCooldown(45); toast.success("A new code is on its way"); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not resend"); if (e.response?.data?.expired) onBack(); }
    };

    return (
        <div className="space-y-5">
            <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `${accent}14`, color: accent }}><ShieldCheck className="w-6 h-6" /></div>
                <h3 className="text-base font-bold text-gray-900">Check your email</h3>
                <p className="text-xs text-gray-500">We sent a 6-digit code to <b className="text-gray-700">{sentTo}</b>. It expires in {challenge.expiresInMinutes} minutes.</p>
            </div>
            <div className="flex justify-center gap-2">
                {digits.map((d, i) => (
                    <input key={i} ref={el => (refs.current[i] = el)} value={d} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={6}
                        onChange={e => set(i, e.target.value)}
                        onKeyDown={e => { if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus(); if (e.key === "Enter") submit(); }}
                        className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
                        style={{ ["--tw-ring-color" as any]: `${accent}55` }} />
                ))}
            </div>
            {challenge.canRemember !== false && (
                <label className="flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-500 cursor-pointer">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                    Don't ask again on this device for {challenge.trustDays || 30} days
                </label>
            )}
            <button type="button" onClick={() => submit()} disabled={code.length !== 6 || busy}
                className="w-full h-11 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-50 text-sm" style={{ background: accent }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Verify & sign in
            </button>
            <div className="flex items-center justify-between text-[11px] font-bold">
                <button type="button" onClick={onBack} className="text-gray-500 hover:text-gray-800 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
                <button type="button" onClick={resend} disabled={cooldown > 0} className="flex items-center gap-1 disabled:text-gray-300" style={{ color: cooldown > 0 ? undefined : accent }}>
                    <RotateCw className="w-3.5 h-3.5" /> {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
            </div>
        </div>
    );
}
