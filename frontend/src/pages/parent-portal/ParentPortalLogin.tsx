import { useState } from "react";
import { Eye, EyeOff, Loader2, Users, Phone, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

export default function ParentPortalLogin() {
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone.trim()) { toast.error("Enter your username or phone number"); return; }
        if (!password.trim()) { toast.error("Enter your password"); return; }
        setIsLoading(true);
        try {
            const r = await axios.post("/api/v1/auth/parent-login", { username: phone, phone, password });
            const { token, parent } = r.data;
            localStorage.setItem("parent_token", token);
            localStorage.setItem("parent_info", JSON.stringify(parent));
            toast.success(`Welcome, ${parent.name}!`);
            navigate("/parent-portal/dashboard");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Login failed. Check your phone number.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)" }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-20 w-64 h-64 bg-green-400/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-900/50">
                        <Users className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Parent Portal</h1>
                    <p className="text-emerald-300 text-sm font-bold mt-1">ShuleCloud School System</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-lg font-black text-white mb-1">Sign In</h2>
                    <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-6">Use your registered phone number</p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                                placeholder="Username or phone number"
                                className="w-full py-3.5 pl-12 pr-4 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-emerald-400/50 text-sm font-bold focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all" />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                            <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="Password (optional)"
                                className="w-full py-3.5 pl-12 pr-12 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-emerald-400/50 text-sm font-bold focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all" />
                            <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400/60 hover:text-emerald-300">
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="bg-emerald-900/40 border border-emerald-500/20 rounded-2xl px-4 py-3">
                            <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest">Default Credentials</p>
                            <p className="text-emerald-300 text-[10px] font-bold mt-0.5">
                                Username: your registered phone number<br />
                                Password: <code className="bg-emerald-900/50 px-1.5 py-0.5 rounded">parent@</code> + last 4 digits of phone<br />
                                <span className="opacity-70">e.g. phone 0712345<strong>5678</strong> → password <code className="bg-emerald-900/50 px-1 rounded">parent@5678</code></span>
                            </p>
                        </div>

                        <button type="submit" disabled={isLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-emerald-900/50 active:scale-[0.98]">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                            {isLoading ? "Signing in..." : "Sign In to Parent Portal"}
                        </button>
                    </form>

                    <p className="text-center text-emerald-600 text-[10px] font-bold uppercase tracking-widest mt-5">
                        Can't login? Contact your school admin.
                    </p>
                </div>
                <p className="text-center text-emerald-700 text-[10px] font-bold uppercase tracking-widest mt-4">Powered by ShuleCloud ERP</p>
            </div>
        </div>
    );
}
