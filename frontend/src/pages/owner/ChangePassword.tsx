import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";

// First-login (forced) and voluntary password change for owner-portal users.
export default function OwnerChangePassword() {
  const navigate = useNavigate();
  const forced = new URLSearchParams(window.location.search).get("forced") === "1";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post("/owner/auth/change-password", { currentPassword: forced ? undefined : currentPassword, newPassword });
      toast.success("Password updated");
      navigate("/owner/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl px-8 py-10">
        <div className="text-center mb-7">
          <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: PRIMARY }}>
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">{forced ? "Set your password" : "Change password"}</h2>
          <p className="text-sm text-slate-500 mt-1">{forced ? "For security, please set a new password before continuing." : "Update your owner-portal password."}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {!forced && (
            <Field label="Current Password" value={currentPassword} onChange={setCurrentPassword} />
          )}
          <Field label="New Password" value={newPassword} onChange={setNewPassword} />
          <Field label="Confirm New Password" value={confirm} onChange={setConfirm} />
          <button type="submit" disabled={loading}
            className="w-full h-11 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: PRIMARY }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Saving…" : "Save Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="password" value={value} onChange={(e) => onChange(e.target.value)} required
          className="w-full h-11 pl-10 pr-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as any]: PRIMARY }} />
      </div>
    </div>
  );
}
