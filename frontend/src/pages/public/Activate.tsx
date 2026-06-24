import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Clock, ShieldCheck, KeyRound, RefreshCw, ArrowRight, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// Shown when a registered-but-not-activated school tries to log in (or completes
// registration). Lets them verify email (OTP) and enter the owner-issued code.
export default function Activate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const subdomain = (params.get("subdomain") || "").toLowerCase();

  const [emailVerified, setEmailVerified] = useState(params.get("verified") === "1");
  const [status, setStatus] = useState<string>("pending");
  const [otp, setOtp] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Poll the registration status (auto-advance if the owner activates remotely).
  useEffect(() => {
    if (!subdomain) return;
    let alive = true;
    const check = async () => {
      try {
        const r = await api.get("/onboard/registration-status", { params: { subdomain } });
        if (!alive) return;
        setStatus(r.data?.status || "pending");
        setEmailVerified(!!r.data?.emailVerified);
        if (r.data?.status === "active") { toast.success("Your account is active! Please log in."); navigate("/login", { replace: true }); }
      } catch { /* ignore */ }
    };
    check();
    const id = setInterval(check, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [subdomain, navigate]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/onboard/verify-email", { subdomain, otp }); setEmailVerified(true); toast.success("Email verified."); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Verification failed."); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    try { await api.post("/onboard/resend-otp", { subdomain }); toast.success("New code sent to your email."); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Could not resend."); }
  };
  const activate = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/onboard/activate", { subdomain, code }); toast.success("Activated! You can now log in."); navigate("/login", { replace: true }); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Invalid activation code."); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2ff] p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-white"><GraduationCap className="w-6 h-6" /></div>
          <h1 className="text-xl font-black tracking-tight text-gray-800">shule<span className="text-[#5C67F2]">cloud</span></h1>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h2 className="font-black text-amber-800 text-base">Account Awaiting Activation</h2>
          <p className="text-[12px] text-amber-700 mt-1">
            {subdomain ? <>School: <b>{subdomain}</b>. </> : null}
            Your account is registered but not yet active. Verify your email, then enter the activation code provided by ShuleCloud.
          </p>
        </div>

        {/* Step A — email OTP (if not verified) */}
        {!emailVerified && (
          <form onSubmit={verify} className="space-y-3">
            <div className="flex items-center gap-2 text-[#5C67F2]"><ShieldCheck className="w-5 h-5" /><h3 className="font-black text-sm">Verify your email</h3></div>
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="● ● ● ● ● ●" inputMode="numeric"
              className="w-full text-center tracking-[0.5em] text-lg font-black bg-transparent border-b-2 border-gray-300 py-2 focus:outline-none focus:border-[#5C67F2]" />
            <button type="submit" disabled={busy || otp.length < 6} className="w-full h-11 bg-[#5C67F2] text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm"><ShieldCheck className="w-4 h-4" /> {busy ? "VERIFYING…" : "Verify Email"}</button>
            <button type="button" onClick={resend} className="w-full text-[11px] font-bold text-gray-500 flex items-center justify-center gap-1.5"><RefreshCw className="w-3 h-3" /> Resend code</button>
          </form>
        )}

        {/* Step B — activation code (after email verified) */}
        {emailVerified && (
          <form onSubmit={activate} className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600"><ShieldCheck className="w-5 h-5" /><span className="text-xs font-bold">Email verified ✓</span></div>
            <div className="relative">
              <KeyRound className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Activation code (e.g. SCH-4827)"
                className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 focus:outline-none focus:border-[#5C67F2] text-sm font-bold tracking-wide text-gray-700" />
            </div>
            <button type="submit" disabled={busy || !code} className="w-full h-11 bg-[#5C67F2] text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm"><ArrowRight className="w-4 h-4" /> {busy ? "ACTIVATING…" : "Activate Account"}</button>
            <p className="text-[10px] text-gray-400 text-center">Waiting for review — this page updates automatically when an administrator activates your school.</p>
          </form>
        )}

        <div className="text-center pt-1">
          <Link to="/login" className="text-[11px] font-black text-gray-800 hover:text-[#5C67F2]">Back to <span className="text-[#5C67F2]">Login</span></Link>
        </div>
      </div>
    </div>
  );
}
