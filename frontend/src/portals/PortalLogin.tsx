import type React from "react";
import { useState, FormEvent } from "react";
import { Loader2, Lock, type LucideIcon } from "lucide-react";

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
}

interface PortalLoginProps {
    portalName: string;            // "Student Portal"
    brandName?: string;            // school name
    brandCrest?: string | null;
    usernameLabel?: string;
    loading?: boolean;
    error?: string | null;
    icon?: LucideIcon;             // role icon shown in the crest circle
    accent?: string;              // panel + button colour
    onSubmit: (username: string, password: string, remember: boolean) => void;
    onForgot?: () => void;
    extra?: React.ReactNode;       // optional block under the form (e.g. Continue with Google)
}

// Egerton-style two-tone login card (gold greeting band over a coloured form panel).
export default function PortalLogin({
    portalName, brandName, brandCrest, usernameLabel = "Username",
    loading, error, icon: Icon, accent = "#159a52", onSubmit, onForgot, extra,
}: PortalLoginProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(username.trim(), password, remember);
    };

    return (
        <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl">
                {/* Gold greeting band */}
                <div className="bg-[#c4a35a] px-7 pt-7 pb-10 relative">
                    <h1 className="text-2xl font-black text-[#143d2b]">{greeting()} !</h1>
                    <p className="text-[#2a4a37] text-sm font-semibold mt-1">
                        Login to continue to {portalName}.
                    </p>
                    {brandName && (
                        <p className="text-[#2a4a37]/80 text-xs font-bold mt-0.5">{brandName}</p>
                    )}
                </div>

                {/* Crest / role icon */}
                <div className="relative" style={{ backgroundColor: accent }}>
                    <div className="absolute -top-7 left-7 h-14 w-14 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden border-2 border-white">
                        {brandCrest ? (
                            <img src={brandCrest} alt={brandName || portalName} className="h-12 w-12 object-contain" />
                        ) : Icon ? (
                            <Icon className="h-7 w-7" style={{ color: accent }} />
                        ) : (
                            <span className="font-black text-lg" style={{ color: accent }}>{(brandName || portalName)[0]}</span>
                        )}
                    </div>

                    <form onSubmit={submit} className="px-7 pt-12 pb-8 space-y-5">
                        {error && (
                            <div className="bg-rose-100 border border-rose-300 text-rose-700 text-xs font-semibold rounded-md px-3 py-2">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-white text-sm font-bold mb-1.5">{usernameLabel}</label>
                            <input
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder={`Enter ${usernameLabel.toLowerCase()}`}
                                autoComplete="username"
                                className="w-full h-11 px-3 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/60"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm font-bold mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter password"
                                autoComplete="current-password"
                                className="w-full h-11 px-3 rounded-md bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/60"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-white text-sm font-semibold cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={e => setRemember(e.target.checked)}
                                className="h-4 w-4 rounded"
                                style={{ accentColor: accent }}
                            />
                            Remember me
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-[#0f2942] hover:bg-[#15395c] disabled:opacity-60 text-white font-bold text-sm rounded-md flex items-center justify-center gap-2 transition-colors"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? "Signing in..." : "Log In"}
                        </button>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onForgot}
                                className="flex items-center gap-1 text-[#0f2942] text-xs font-bold hover:underline"
                            >
                                <Lock className="w-3 h-3" /> Forgot your password?
                            </button>
                        </div>
                    </form>
                    {extra}
                </div>
            </div>
        </div>
    );
}
