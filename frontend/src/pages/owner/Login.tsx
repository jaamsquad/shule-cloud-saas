import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";

export default function OwnerLogin() {
  const [step, setStep] = useState<"login" | "otp">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [channelMsg, setChannelMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/owner/auth/login", { email, password });
      if (res.data?.access_token) {
        // Bootstrap super-owner path — logs straight in.
        localStorage.setItem("owner_token", res.data.access_token);
        toast.success("Welcome, Platform Admin");
        navigate("/owner/dashboard");
        return;
      }
      // OTP required
      setChannelMsg(res.data?.message || "We sent a 6-digit code.");
      setStep("otp");
      toast.success("Verification code sent");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/owner/auth/verify-otp", { email, code });
      localStorage.setItem("owner_token", res.data.access_token);
      if (res.data?.mustChangePassword) {
        toast.message("Please set a new password to continue");
        navigate("/owner/change-password?forced=1");
        return;
      }
      toast.success("Welcome, Platform Admin");
      navigate("/owner/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/owner/auth/resend-otp", { email });
      toast.success("A new code has been sent");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not resend");
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center relative"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80')" }}
    >
      {/* Dark overlay for legibility */}
      <div className="absolute inset-0 bg-slate-900/60" />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl px-8 py-10">
        {/* Brand */}
        <div className="text-center mb-7">
          <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: PRIMARY }}>
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">ShuleCloud</h1>
          <p className="text-sm text-slate-500">Owner Portal</p>
          <h2 className="text-2xl font-black text-slate-900 mt-3">{step === "login" ? "Login" : "Verify it's you"}</h2>
        </div>

        {step === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="Please enter"
                  className="w-full h-11 pl-10 pr-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as any]: PRIMARY }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="Please enter"
                  className="w-full h-11 pl-10 pr-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as any]: PRIMARY }}
                />
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full h-11 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: PRIMARY }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Authenticating…" : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-slate-500 text-center">{channelMsg}</p>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">6-Digit Code</label>
              <input
                type="text" inputMode="numeric" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus
                placeholder="••••••"
                className="w-full h-12 px-3 border border-slate-300 rounded-lg text-center text-2xl font-black tracking-[0.4em] text-slate-800 focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as any]: PRIMARY }}
              />
            </div>
            <button
              type="submit" disabled={loading || code.length < 6}
              className="w-full h-11 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: PRIMARY }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Verifying…" : "Verify & Login"}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => { setStep("login"); setCode(""); }} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 font-semibold">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button type="button" onClick={handleResend} disabled={resending} className="font-semibold hover:underline disabled:opacity-50" style={{ color: PRIMARY }}>
                {resending ? "Sending…" : "Resend code"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-7 text-center text-[11px] text-slate-400 font-mono tracking-widest uppercase">
          Authorized Access Only
        </p>
      </div>
    </div>
  );
}
