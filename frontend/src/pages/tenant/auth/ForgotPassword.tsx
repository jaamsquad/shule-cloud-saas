import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Building2, Mail, ArrowLeft, CheckCircle2, Loader2, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { currentTenantSubdomain } from "@/lib/portal";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const activeSubdomain = currentTenantSubdomain() || "";

  const { data: schoolInfo } = useQuery<any>({
    queryKey: ["public_school_info", activeSubdomain],
    queryFn: async () => { if (!activeSubdomain) return null; const r = await api.get(`/public/school/${activeSubdomain}`); return r.data; },
    enabled: !!activeSubdomain,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email, subdomain: activeSubdomain || undefined }).catch(() => {});
      setSent(true);
      toast({ title: "Reset link sent!", description: "Check your email for the password reset link." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-white font-sans overflow-hidden">

      {/* ── Left: Form ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 lg:px-12 bg-[#f0f2ff]">
        <div className="w-full max-w-[360px] space-y-6">

          {/* Logo / School branding */}
          <div className="space-y-1">
            {schoolInfo ? (
              <div className="flex items-center gap-3">
                {schoolInfo.logo ? (
                  <img src={schoolInfo.logo} alt={schoolInfo.name} className="w-10 h-10 rounded-xl object-contain border border-gray-100 bg-white p-0.5" />
                ) : (
                  <div className="w-10 h-10 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white"><Building2 className="w-5 h-5" /></div>
                )}
                <div>
                  <h1 className="text-lg font-black text-gray-800 leading-tight">{schoolInfo.name}</h1>
                  {schoolInfo.tagline && <p className="text-[10px] text-gray-400 font-medium">{schoolInfo.tagline}</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-white"><GraduationCap className="w-6 h-6" /></div>
                <h1 className="text-xl font-black tracking-tight text-gray-800">shule<span className="text-[#5C67F2]">cloud</span></h1>
              </div>
            )}
            <p className="text-[11px] text-gray-500 font-medium">{sent ? "Check your inbox for the reset link." : "We'll email you a link to reset your password."}</p>
            <h2 className="text-base font-bold text-[#5C67F2]">{sent ? "Email Sent ✉️" : "Reset Password 🔑"}</h2>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative group">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                  placeholder="Your email address"
                  className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-4 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 text-sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Send Reset Link
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-emerald-700 font-semibold">If an account exists for that email, a reset link is on its way.</p>
              </div>
            </div>
          )}

          <div className="text-center">
            <Link to="/login" className="text-[11px] font-black text-gray-800 hover:text-[#5C67F2] transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to <span className="text-[#5C67F2]">Sign In</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Right: Brand panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex w-[45%] bg-[#241B5C] relative flex-col items-center justify-center p-12 text-center text-white overflow-hidden">
        <div className="absolute top-10 right-10 flex items-center gap-4">
          <span className="text-sm font-medium text-purple-200">Remembered it?</span>
          <Link to="/login" className="px-6 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
            <User className="w-4 h-4" /> Sign In
          </Link>
        </div>

        <div className="relative z-10 space-y-6 max-w-sm mt-12">
          {schoolInfo?.logo && (
            <div className="flex justify-center">
              <img src={schoolInfo.logo} alt={schoolInfo.name} className="w-20 h-20 rounded-2xl object-contain bg-white/10 border border-white/20 p-2" />
            </div>
          )}
          {schoolInfo ? (
            <>
              <h2 className="text-3xl font-black tracking-tight leading-tight">{schoolInfo.name}</h2>
              {schoolInfo.tagline && <p className="text-sm text-purple-200 leading-relaxed font-medium">{schoolInfo.tagline}</p>}
              {schoolInfo.address && <p className="text-xs text-purple-300 font-medium">{schoolInfo.address}</p>}
              <p className="text-xs text-purple-300/60 font-bold uppercase tracking-widest">Powered by shulecloud</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black tracking-tight leading-tight">Forgot your password?</h2>
              <p className="text-sm text-purple-200 leading-relaxed font-medium">No worries — enter your email and we'll send you a secure link to set a new one.</p>
            </>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-64 overflow-hidden opacity-10">
          <div className="w-96 h-96 rounded-full bg-[#5C67F2] absolute -bottom-32 -left-16" />
          <div className="w-64 h-64 rounded-full bg-purple-400 absolute -bottom-20 right-10" />
        </div>
      </div>
    </div>
  );
}
