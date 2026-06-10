import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    GraduationCap, Eye, EyeOff, Lock, User, Users,
    GraduationCap as StudentIcon, Loader2, Building2
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermissions } from "@/contexts/PermissionsContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectSubdomain(): string {
    const host = window.location.hostname;   // e.g. "muzamila.localhost" or "muzamila.shulecloud.com"
    const parts = host.split(".");
    const reserved = new Set(["www", "app", "owner", "api", "admin", "support", "mail", "localhost"]);
    // 2+ parts, first part is not reserved, not bare "localhost"
    if (parts.length >= 2 && !reserved.has(parts[0])) return parts[0];
    return "";
}

function buildSubdomainUrl(subdomain: string, path: string): string {
    const { protocol, hostname, port } = window.location;
    // On localhost dev: http://sub.localhost:8080/path
    // On production:    https://sub.school.com/path
    const hostParts = hostname.split(".");
    let baseHost: string;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
        baseHost = `${subdomain}.localhost`;
    } else {
        // Remove any existing subdomain, replace with new one
        const domain = hostParts.length >= 2 ? hostParts.slice(-2).join(".") : hostname;
        baseHost = `${subdomain}.${domain}`;
    }

    return `${protocol}//${baseHost}${port ? `:${port}` : ""}${path}`;
}

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { refreshPermissions } = usePermissions();

    const [username, setUsername]     = useState("");
    const [password, setPassword]     = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading]   = useState(false);
    const [hint, setHint]             = useState<string | null>(null);

    const detectedSubdomain = detectSubdomain();
    const activeSubdomain   = detectedSubdomain;

    // ── School search (shown on bare localhost with no subdomain) ─────────────
    const [schoolSearch, setSchoolSearch] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    const { data: schoolSuggestions = [] } = useQuery<any[]>({
        queryKey: ["school_search", schoolSearch],
        queryFn: async () => {
            if (schoolSearch.trim().length < 4) return [];
            const r = await api.get(`/onboard/search-schools?q=${encodeURIComponent(schoolSearch.trim())}`);
            return r.data || [];
        },
        enabled: !detectedSubdomain && schoolSearch.trim().length >= 4,
    });

    // ── Fetch school branding when a subdomain is known ─────────────────────
    const { data: schoolInfo, isLoading: schoolLoading, isFetched: schoolFetched } = useQuery<any>({
        queryKey: ["public_school_info", activeSubdomain],
        queryFn: async () => {
            if (!activeSubdomain) return null;
            const r = await api.get(`/public/school/${activeSubdomain}`);
            return r.data;
        },
        enabled: !!activeSubdomain,
        staleTime: 5 * 60 * 1000,
        retry: false, // don't retry 404s
    });

    // School not found = on a subdomain, fetch completed, no data returned
    const schoolNotFound = !!activeSubdomain && schoolFetched && !schoolInfo && !schoolLoading;

    // ── Redirect if already authenticated ───────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                if (payload.exp && Date.now() / 1000 < payload.exp) {
                    navigate(searchParams.get("redirect") || "/dashboard", { replace: true });
                    return;
                }
            } catch (_) {}
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
        }
        if (searchParams.get("session") === "expired") {
            toast.error("Your session has expired. Please log in again.");
        }
        const urlError = searchParams.get("error");
        if (urlError) toast.error(decodeURIComponent(urlError));
    }, []);

    // ── Hint text while typing username ─────────────────────────────────────
    useEffect(() => {
        if (!username) { setHint(null); return; }
        if (username.includes("@")) setHint("Signing in as school admin / teacher");
        else if (/^\+?[\d\s]{7,}$/.test(username)) setHint("Signing in as parent (phone number)");
        else setHint("Signing in as student or staff (portal username)");
    }, [username]);

    // ── Login handler ────────────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) { toast.error("Enter your email or username"); return; }
        if (!password.trim()) { toast.error("Enter your password"); return; }

        setIsLoading(true);
        try {
            const res = await api.post("/auth/smart-login", {
                username: username.trim(),
                password,
                subdomain: activeSubdomain || undefined,
            });

            const { token, access_token, user_type, user, parent, redirect, tenantSubdomain } = res.data;
            const authToken = access_token || token;

            // Helper: after storing the token, navigate to the right place.
            // If the user logged in from bare localhost and we know their subdomain,
            // redirect to subdomain.localhost:8080 so tenant context is correct.
            const goToDashboard = (dest: string) => {
                const targetSubdomain = tenantSubdomain || activeSubdomain;
                if (targetSubdomain && !detectedSubdomain) {
                    // Currently on bare localhost → jump to the school's subdomain
                    window.location.href = buildSubdomainUrl(targetSubdomain, dest || "/dashboard");
                } else {
                    navigate(dest || "/dashboard", { replace: true });
                }
            };

            switch (user_type) {
                case "student":
                    localStorage.setItem("student_token", authToken);
                    localStorage.setItem("student_info", JSON.stringify(user));
                    toast.success(`Welcome back, ${user.name}!`);
                    goToDashboard(redirect || "/student-portal/dashboard");
                    break;

                case "parent":
                    localStorage.setItem("parent_token", authToken);
                    localStorage.setItem("parent_info", JSON.stringify(parent));
                    toast.success(`Welcome, ${parent?.name}!`);
                    goToDashboard(redirect || "/parent-portal/dashboard");
                    break;

                case "teacher":
                case "staff": {
                    // Staff assigned to the staff portal are redirected there (SSO).
                    const { redirectPortal, staffSso } = res.data;
                    if (redirectPortal === "staff" && staffSso) {
                        const sub = tenantSubdomain || activeSubdomain;
                        const { protocol, hostname, port } = window.location;
                        const p = port ? `:${port}` : "";
                        const rootDomain = (hostname === "localhost" || hostname.endsWith(".localhost"))
                            ? "localhost"
                            : (hostname.split(".").length > 2 ? hostname.split(".").slice(1).join(".") : hostname);
                        const hash = `#sso=${encodeURIComponent(JSON.stringify(staffSso))}`;
                        toast.success(`Welcome, ${user.name}! Opening your teacher portal…`);
                        window.location.href = `${protocol}//teacher.${sub}.${rootDomain}${p}/login${hash}`;
                        return;
                    }
                    localStorage.setItem("auth_token", authToken);
                    localStorage.setItem("user", JSON.stringify(user));
                    if (activeSubdomain) localStorage.setItem("tenant", JSON.stringify({ subdomain: activeSubdomain }));
                    refreshPermissions();
                    toast.success(`Welcome back, ${user.name}!`);
                    goToDashboard(redirect || "/dashboard");
                    break;
                }

                default: // admin
                    localStorage.setItem("auth_token", authToken);
                    localStorage.setItem("user", JSON.stringify(user));
                    if (activeSubdomain) localStorage.setItem("tenant", JSON.stringify({ subdomain: activeSubdomain }));
                    refreshPermissions();
                    toast.success(`Welcome back, ${user?.name || username}!`);
                    const dest = searchParams.get("redirect");
                    goToDashboard(dest && dest !== "/login" ? dest : redirect || "/dashboard");
            }
        } catch (err: any) {
            const code = err.response?.data?.code;
            const msg  = err.response?.data?.message || "Login failed. Check your credentials.";
            if (code === "CROSS_TENANT_BLOCKED") {
                // Show a friendlier message for wrong-school attempts
                toast.error(msg, { duration: 8000 });
            } else {
                toast.error(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ── Loading state (checking if subdomain exists) ─────────────────────────
    if (activeSubdomain && schoolLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#f0f2ff]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
                    <p className="text-sm font-bold text-gray-500">Looking up <span className="text-[#5C67F2]">{activeSubdomain}</span>…</p>
                </div>
            </div>
        );
    }

    // ── Invalid subdomain → redirect to localhost with ?notfound= ────────────
    if (schoolNotFound) {
        const { protocol, port } = window.location;
        const base = `${protocol}//localhost${port ? `:${port}` : ""}`;
        window.location.replace(`${base}/login?notfound=${encodeURIComponent(activeSubdomain)}`);
        return null;
    }

    // ── School Not Found page (rendered at localhost when ?notfound= present) ─
    const notFoundSubdomain = searchParams.get("notfound");
    if (notFoundSubdomain && !activeSubdomain) {
        return (
            <div className="h-screen flex bg-[#f0f2ff] font-sans">
                {/* Left: Not Found panel */}
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                    <div className="max-w-sm w-full space-y-6">
                        {/* Icon */}
                        <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto">
                            <span className="text-4xl">🏫</span>
                        </div>

                        <div>
                            <h1 className="text-2xl font-black text-gray-900 mb-2">School Not Found</h1>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                We couldn't find a school registered under
                                <span className="font-black text-rose-600 mx-1 font-mono">"{notFoundSubdomain}"</span>.
                                The subdomain may be incorrect or the school may not be registered yet.
                            </p>
                        </div>

                        {/* Info card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">What can I do?</p>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-[#5C67F2] font-black mt-0.5">→</span>
                                    Check the URL — make sure you typed the subdomain correctly
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#5C67F2] font-black mt-0.5">→</span>
                                    Ask your school admin for the correct login link
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#5C67F2] font-black mt-0.5">→</span>
                                    Register your school on ShuleCloud below
                                </li>
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <a href="/register"
                                className="w-full h-12 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-sm">
                                <Building2 className="w-4 h-4" />
                                Register Your School on ShuleCloud
                            </a>
                            <a href="http://localhost:8080/login"
                                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-gray-200 text-sm">
                                <GraduationCap className="w-4 h-4 text-[#5C67F2]" />
                                Back to ShuleCloud Login
                            </a>
                        </div>

                        {/* Subdomain hint */}
                        <p className="text-[10px] text-gray-400 font-medium">
                            Looking for your school? Schools access ShuleCloud at
                            <span className="font-mono text-[#5C67F2] mx-1">yourschool.localhost:8080</span>
                        </p>
                    </div>
                </div>

                {/* Right: Brand panel */}
                <div className="hidden lg:flex w-[45%] bg-[#241B5C] flex-col items-center justify-center p-12 text-center text-white overflow-hidden relative">
                    <div className="relative z-10 space-y-4 max-w-sm">
                        <div className="text-6xl mb-4">🌍</div>
                        <h2 className="text-3xl font-black tracking-tight">Join ShuleCloud</h2>
                        <p className="text-sm text-purple-200 leading-relaxed font-medium">
                            The world's fastest-growing cloud-based School Management Platform.
                            Register your school today and go live in minutes.
                        </p>
                        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                            {[
                                { icon: "✅", text: "Free to start" },
                                { icon: "🚀", text: "Setup in minutes" },
                                { icon: "🔒", text: "Data isolated per school" },
                                { icon: "📱", text: "Mobile friendly" },
                            ].map(f => (
                                <div key={f.text} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                                    <span className="text-base">{f.icon}</span>
                                    <span className="text-xs font-bold text-purple-100">{f.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-64 overflow-hidden opacity-10">
                        <div className="w-96 h-96 rounded-full bg-[#5C67F2] absolute -bottom-32 -left-16" />
                        <div className="w-64 h-64 rounded-full bg-purple-400 absolute -bottom-20 right-10" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex bg-white font-sans overflow-hidden">

            {/* ── Left: Form ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col justify-center items-center px-8 lg:px-12 bg-[#f0f2ff]">
                <div className="w-full max-w-[360px] space-y-6">

                    {/* Logo / School branding */}
                    <div className="space-y-1">
                        {schoolInfo ? (
                            /* School-branded header */
                            <div className="flex items-center gap-3">
                                {schoolInfo.logo ? (
                                    <img src={schoolInfo.logo} alt={schoolInfo.name} className="w-10 h-10 rounded-xl object-contain border border-gray-100 bg-white p-0.5" />
                                ) : (
                                    <div className="w-10 h-10 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-lg font-black text-gray-800 leading-tight">{schoolInfo.name}</h1>
                                    {schoolInfo.tagline && <p className="text-[10px] text-gray-400 font-medium">{schoolInfo.tagline}</p>}
                                </div>
                            </div>
                        ) : (
                            /* Default ShuleCloud header */
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-white">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <h1 className="text-xl font-black tracking-tight text-gray-800">
                                    shule<span className="text-[#5C67F2]">cloud</span>
                                </h1>
                            </div>
                        )}
                        <p className="text-[11px] text-gray-500 font-medium">
                            One login for everyone — admins, teachers, students & parents.
                        </p>
                        <h2 className="text-base font-bold text-[#5C67F2]">Welcome Back! 👋</h2>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* School search — shown on bare localhost only */}
                        {!detectedSubdomain && (
                            <div className="relative">
                                <div className="relative group">
                                    <Building2 className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                                    <input
                                        type="text"
                                        value={schoolSearch}
                                        onChange={e => { setSchoolSearch(e.target.value); setShowSuggestions(true); }}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        placeholder="Search for your school (type 4+ letters)…"
                                        className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-4 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                                    />
                                </div>
                                {showSuggestions && schoolSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden">
                                        {schoolSuggestions.map((s: any) => (
                                            <button key={s.subdomain} type="button"
                                                onClick={() => {
                                                    const { protocol, port } = window.location;
                                                    const portStr = port ? `:${port}` : "";
                                                    window.location.href = `${protocol}//${s.subdomain}.localhost${portStr}/login`;
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#5C67F2]/5 text-left border-b border-gray-50 last:border-0 transition-colors">
                                                {s.logo ? (
                                                    <img src={s.logo} alt={s.name} className="w-8 h-8 rounded-lg object-contain border border-gray-100" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-[#5C67F2]/10 flex items-center justify-center text-[#5C67F2] font-black text-sm">{s.name.charAt(0)}</div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-black text-gray-800">{s.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono">{s.subdomain}.localhost</p>
                                                </div>
                                                <span className="ml-auto text-[10px] text-[#5C67F2] font-black">Go →</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {!detectedSubdomain && schoolSearch.trim().length >= 4 && schoolSuggestions.length === 0 && (
                                    <p className="text-[9px] text-gray-400 font-medium mt-1">No schools found for "{schoolSearch}"</p>
                                )}
                                {!detectedSubdomain && schoolSearch.trim().length < 4 && schoolSearch.trim().length > 0 && (
                                    <p className="text-[9px] text-gray-400 font-medium mt-1">Type at least 4 letters to search</p>
                                )}
                            </div>
                        )}

                        {/* Subdomain badge when already on a subdomain */}
                        {detectedSubdomain && schoolInfo && (
                            <div className="flex items-center gap-2 bg-[#5C67F2]/8 border border-[#5C67F2]/20 rounded-xl px-3 py-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                <span className="text-xs font-bold text-[#5C67F2]">{schoolInfo.name}</span>
                                <span className="text-[10px] text-gray-400 ml-auto font-mono">{detectedSubdomain}</span>
                            </div>
                        )}

                        {/* Username/Password — only shown when on a school subdomain */}
                        {detectedSubdomain && (
                            <>
                                {/* Username / Email */}
                                <div className="relative group">
                                    <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Email, username, admission no. or phone"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        autoComplete="username"
                                        required
                                        className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-4 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                                    />
                                    {hint && (
                                        <p className="text-[9px] text-[#5C67F2] font-bold mt-0.5 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#5C67F2] inline-block" />
                                            {hint}
                                        </p>
                                    )}
                                </div>

                                {/* Password */}
                                <div className="relative group">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        required
                                        className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-10 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                                    />
                                    <button type="button" onClick={() => setShowPassword(p => !p)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5C67F2]">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="remember" className="w-3.5 h-3.5 rounded border-gray-300 text-[#5C67F2] focus:ring-[#5C67F2]" />
                                    <label htmlFor="remember" className="text-[11px] font-bold text-gray-400">Remember Me</label>
                                </div>

                                <button type="submit" disabled={isLoading}
                                    className="w-full h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 text-sm">
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    {isLoading ? "Signing in..." : "Sign In"}
                                </button>
                            </>
                        )}

                        {/* On bare localhost — show a hint to search for school */}
                        {!detectedSubdomain && !schoolSearch && (
                            <div className="text-center py-4">
                                <p className="text-xs text-gray-400 font-medium">
                                    Search for your school above to continue
                                </p>
                                <p className="text-[10px] text-gray-300 mt-1">
                                    You'll be redirected to your school's login page
                                </p>
                            </div>
                        )}
                    </form>

                    {/* Forgot password — only on subdomain */}
                    {detectedSubdomain && (
                    <div className="text-center">
                        <Link to="/forgot-password" className="text-[11px] font-black text-gray-800 hover:text-[#5C67F2] transition-colors">
                            Forgot your <span className="text-[#5C67F2]">password?</span>
                        </Link>
                    </div>
                    )}

                    {/* Direct portal links — only on subdomain */}
                    {detectedSubdomain && (
                        <div className="border-t border-gray-200 pt-4 space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Direct Portal Links</p>
                            <div className="grid grid-cols-3 gap-2">
                                <a href="/student-portal"
                                    className="h-9 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-[9px] uppercase tracking-wide rounded-xl flex items-center justify-center gap-1 border border-indigo-100 transition-all">
                                    <StudentIcon className="w-3 h-3" /> Student
                                </a>
                                <a href="/parent-portal"
                                    className="h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-black text-[9px] uppercase tracking-wide rounded-xl flex items-center justify-center gap-1 border border-emerald-100 transition-all">
                                    <Users className="w-3 h-3" /> Parent
                                </a>
                                <a href="/staff-portal"
                                    className="h-9 bg-purple-50 hover:bg-purple-100 text-purple-600 font-black text-[9px] uppercase tracking-wide rounded-xl flex items-center justify-center gap-1 border border-purple-100 transition-all">
                                    <Users className="w-3 h-3" /> Staff
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right: Brand panel ──────────────────────────────────────── */}
            <div className="hidden lg:flex w-[45%] bg-[#241B5C] relative flex-col items-center justify-center p-12 text-center text-white overflow-hidden">
                <div className="absolute top-10 right-10 flex items-center gap-4">
                    <span className="text-sm font-medium text-purple-200">Don't have an account?</span>
                    <Link to="/register"
                        className="px-6 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
                        <User className="w-4 h-4" /> Sign Up
                    </Link>
                </div>

                <div className="relative z-10 space-y-6 max-w-sm mt-12">
                    {/* School logo in the right panel when on subdomain */}
                    {schoolInfo?.logo && (
                        <div className="flex justify-center">
                            <img src={schoolInfo.logo} alt={schoolInfo.name}
                                className="w-20 h-20 rounded-2xl object-contain bg-white/10 border border-white/20 p-2" />
                        </div>
                    )}

                    {schoolInfo ? (
                        <>
                            <h2 className="text-3xl font-black tracking-tight leading-tight">{schoolInfo.name}</h2>
                            {schoolInfo.tagline && (
                                <p className="text-sm text-purple-200 leading-relaxed font-medium">{schoolInfo.tagline}</p>
                            )}
                            {schoolInfo.address && (
                                <p className="text-xs text-purple-300 font-medium">{schoolInfo.address}</p>
                            )}
                            <p className="text-xs text-purple-300/60 font-bold uppercase tracking-widest">
                                Powered by shulecloud
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl font-black tracking-tight leading-tight">Continue Managing!</h2>
                            <p className="text-sm text-purple-200 leading-relaxed font-medium">
                                Pick up right where you left off. Sign in to the world's favorite fast, easy, and 100% cloud-based school management platform.
                            </p>
                        </>
                    )}
                </div>

                {/* Abstract decoration */}
                <div className="absolute bottom-0 left-0 right-0 h-64 overflow-hidden opacity-10">
                    <div className="w-96 h-96 rounded-full bg-[#5C67F2] absolute -bottom-32 -left-16" />
                    <div className="w-64 h-64 rounded-full bg-purple-400 absolute -bottom-20 right-10" />
                </div>
            </div>
        </div>
    );
}
