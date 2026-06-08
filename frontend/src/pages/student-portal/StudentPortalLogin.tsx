import { useState } from "react";
import { Eye, EyeOff, Loader2, BookOpen, GraduationCap, Lock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

export default function StudentPortalLogin() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            toast.error("Enter your username and password");
            return;
        }
        setIsLoading(true);
        try {
            const r = await axios.post("/api/v1/auth/student-login", { username, password });
            const { token, student } = r.data;
            localStorage.setItem("student_token", token);
            localStorage.setItem("student_info", JSON.stringify(student));
            toast.success(`Welcome back, ${student.name}!`);
            navigate("/student-portal/dashboard");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Login failed. Check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center p-4 font-sans">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-900/50">
                        <GraduationCap className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Student Portal</h1>
                    <p className="text-indigo-300 text-sm font-bold mt-1">ShuleCloud Learning Platform</p>
                </div>

                {/* Login card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-lg font-black text-white mb-1">Sign In</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Use your school portal credentials</p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Username */}
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <User className="w-4 h-4 text-indigo-400" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Portal username / Admission number"
                                autoComplete="username"
                                className="w-full h-13 py-3.5 pl-12 pr-4 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm font-bold focus:outline-none focus:border-indigo-500 focus:bg-white/15 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <Lock className="w-4 h-4 text-indigo-400" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                                autoComplete="current-password"
                                className="w-full h-13 py-3.5 pl-12 pr-12 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-slate-500 text-sm font-bold focus:outline-none focus:border-indigo-500 focus:bg-white/15 transition-all"
                            />
                            <button type="button" onClick={() => setShowPassword(p => !p)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Default password hint */}
                        <div className="bg-indigo-900/40 border border-indigo-500/20 rounded-2xl px-4 py-3 flex items-start gap-3">
                            <div className="w-5 h-5 rounded-lg bg-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-indigo-300 text-[10px] font-black">?</span>
                            </div>
                            <div>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Default Password Format</p>
                                <p className="text-indigo-300 text-[10px] font-bold mt-0.5">
                                    <code className="bg-indigo-900/50 px-1.5 py-0.5 rounded">shule@</code> followed by your admission number
                                    <br />e.g. <code className="bg-indigo-900/50 px-1.5 py-0.5 rounded">shule@001</code>
                                </p>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-13 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-indigo-900/50 active:scale-[0.98]"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
                            {isLoading ? "Signing in..." : "Sign In to Portal"}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-6">
                        Forgot your password? Contact your school admin.
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-6">
                    Powered by ShuleCloud ERP
                </p>
            </div>
        </div>
    );
}
