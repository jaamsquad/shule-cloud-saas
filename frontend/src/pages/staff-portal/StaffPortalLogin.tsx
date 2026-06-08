import { useState } from "react";
import { Eye, EyeOff, Loader2, Briefcase, User, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

export default function StaffPortalLogin() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) { toast.error("Enter your username and password"); return; }
        setIsLoading(true);
        try {
            const r = await axios.post("/api/v1/auth/staff-login", { username, password });
            const { token, staff } = r.data;
            localStorage.setItem("staff_portal_token", token);
            localStorage.setItem("staff_portal_info", JSON.stringify(staff));
            // Also set as main auth token so staff can access the main dashboard
            localStorage.setItem("auth_token", token);
            toast.success(`Welcome, ${staff.name}!`);
            navigate("/dashboard");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Login failed. Check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)" }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-900/50">
                        <Briefcase className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Staff Portal</h1>
                    <p className="text-indigo-300 text-sm font-bold mt-1">ShuleCloud School System</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-lg font-black text-white mb-1">Sign In</h2>
                    <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-6">Use your staff portal credentials</p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                                placeholder="Portal username"
                                className="w-full py-3.5 pl-12 pr-4 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-indigo-400/50 text-sm font-bold focus:outline-none focus:border-indigo-400 focus:bg-white/15 transition-all" />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                            <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full py-3.5 pl-12 pr-12 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-indigo-400/50 text-sm font-bold focus:outline-none focus:border-indigo-400 focus:bg-white/15 transition-all" />
                            <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400/60 hover:text-indigo-300">
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="bg-indigo-900/40 border border-indigo-500/20 rounded-2xl px-4 py-3">
                            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Staff Portal Credentials</p>
                            <p className="text-indigo-300 text-[10px] font-bold mt-0.5">Your credentials are managed by the school admin. Find them at Employees → Manage Login.</p>
                        </div>

                        <button type="submit" disabled={isLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-indigo-900/50 active:scale-[0.98]">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Briefcase className="w-5 h-5" />}
                            {isLoading ? "Signing in..." : "Sign In to Staff Portal"}
                        </button>
                    </form>
                    <p className="text-center text-indigo-600 text-[10px] font-bold uppercase tracking-widest mt-5">Contact admin if you can't login.</p>
                </div>
                <p className="text-center text-indigo-700 text-[10px] font-bold uppercase tracking-widest mt-4">Powered by ShuleCloud ERP</p>
            </div>
        </div>
    );
}
