import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" }); return; }
    if (password !== confirm) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, email, password });
      setDone(true);
      toast({ title: "Password reset!", description: "You can now sign in with your new password." });
      setTimeout(() => navigate("/login"), 1800);
    } catch (err: any) {
      toast({ title: "Couldn't reset password", description: err?.response?.data?.message || "The link may have expired.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2ff] px-6 font-sans">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-lg border border-slate-100 p-7 space-y-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-800">Shule<span className="text-[#5C67F2]">Cloud</span></h1>
          <p className="text-sm text-slate-500 mt-1">{done ? "All set — redirecting to sign in." : "Choose a new password for your account."}</p>
        </div>

        {!token ? (
          <p className="text-sm text-rose-600">This reset link is missing its token. Please use the link from your email, or request a new one.</p>
        ) : done ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-emerald-700 font-semibold">Password updated.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus
                placeholder="New password" className="w-full h-11 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                placeholder="Confirm new password" className="w-full h-11 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Reset password
            </button>
          </form>
        )}

        <Link to="/login" className="text-xs font-bold text-gray-700 hover:text-[#5C67F2] inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
