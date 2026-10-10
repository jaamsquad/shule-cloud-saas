import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    GraduationCap, Eye, EyeOff, Lock, User, Users,
    GraduationCap as StudentIcon, Loader2, Building2
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { currentTenantSubdomain } from "@/lib/portal";
import { usePermissions } from "@/contexts/PermissionsContext";
import GoogleSignIn, { useGoogleConfig } from "@/components/auth/GoogleSignIn";
import OtpStep, { OtpChallenge } from "@/components/auth/OtpStep";

// ── Helpers ───────────────────────────────────────────────────────────────────
// Tenant subdomain for the current host. Correctly treats the apex (manwellstore.com)
// and www as NO tenant — a school is egerton.manwellstore.com / egerton.localhost.
function detectSubdomain(): string {
    return currentTenantSubdomain() || "";
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

// Host label for a school subdomain on the current domain (display only).
function subdomainHost(subdomain: string): string {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return `${subdomain}.localhost`;
    const parts = h.split(".");
    return `${subdomain}.${parts.length >= 2 ? parts.slice(-2).join(".") : h}`;
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
    const [otp, setOtp]               = useState<OtpChallenge | null>(null);
    const { data: googleCfg }         = useGoogleConfig();

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

    // ── Owner impersonation: a one-time token passed in the URL ──────────────
    useEffect(() => {
        const imp = searchParams.get("impersonate_token");
        if (imp) {
            localStorage.setItem("auth_token", imp);
            try {
                const p = JSON.parse(atob(imp.split(".")[1]));
                localStorage.setItem("user", JSON.stringify({ email: p.email, name: p.name, role: p.role, tenantId: p.tenantId, impersonated: true }));
            } catch { /* ignore */ }
            navigate("/dashboard", { replace: true });
        }
    }, [searchParams, navigate]);

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

    // ── After a successful sign-in (password, emailed code, or Google) ───────
    const trustKey = `trust_token_${activeSubdomain || "default"}`;
    const completeLogin = (data: any) => {
        const { token, access_token, user_type, user, parent, redirect, tenantSubdomain, redirectPortal, staffSso, canTeacherPortal, trustToken, twoFactorWarning } = data;
        if (trustToken) { try { localStorage.setItem(trustKey, trustToken); } catch { /* private mode */ } }
        if (twoFactorWarning) toast.warning(twoFactorWarning, { duration: 8000 });
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

        // Single-subdomain model: store the role's token + mark the active portal,
        // then reload to "/" so the right portal renders on THIS school subdomain.
        if (activeSubdomain) localStorage.setItem("tenant", JSON.stringify({ subdomain: activeSubdomain }));
        const enterPortal = (role: "student" | "parent" | "staff") => { localStorage.setItem("active_portal", role); window.location.href = "/"; };

        switch (user_type) {
            case "student":
                localStorage.setItem("student_token", authToken);
                localStorage.setItem("student_info", JSON.stringify(user));
                toast.success(`Welcome back, ${user.name}!`);
                enterPortal("student");
                return;

            case "parent":
                localStorage.setItem("parent_token", authToken);
                localStorage.setItem("parent_info", JSON.stringify(parent));
                toast.success(`Welcome, ${parent?.name}!`);
                enterPortal("parent");
                return;

            case "teacher":
            case "staff": {
                const sso = staffSso || { token: authToken, staff: { _id: user.id, name: user.name, designation: user.role, email: user.email } };
                // Teacher-only → straight to the teaching portal.
                if (redirectPortal === "staff") {
                    localStorage.setItem("staff_token", sso.token);
                    localStorage.setItem("staff_info", JSON.stringify(sso.staff));
                    toast.success(`Welcome, ${user.name}!`);
                    enterPortal("staff");
                    return;
                }
                // "Both" → land on the admin app first; stash SSO so the top bar
                // can show an "Open Teaching Portal" button.
                localStorage.setItem("auth_token", authToken);
                localStorage.setItem("user", JSON.stringify(user));
                localStorage.removeItem("active_portal");
                if (canTeacherPortal) {
                    localStorage.setItem("staff_token", sso.token);
                    localStorage.setItem("staff_info", JSON.stringify(sso.staff));
                    localStorage.setItem("can_teacher_portal", "1");
                } else {
                    localStorage.removeItem("can_teacher_portal");
                }
                refreshPermissions();
                toast.success(`Welcome back, ${user?.name || username}!`);
                goToDashboard(user?.landingPage || redirect || "/dashboard");
                return;
            }

            default: // admin
                localStorage.setItem("auth_token", authToken);
                localStorage.setItem("user", JSON.stringify(user));
                localStorage.removeItem("active_portal");
                localStorage.removeItem("can_teacher_portal");
                refreshPermissions();
                toast.success(`Welcome back, ${user?.name || username}!`);
                const dest = searchParams.get("redirect");
                goToDashboard(dest && dest !== "/login" ? dest : redirect || "/dashboard");
        }
    };

    // Continue with Google → the account at this school that linked this Google account
    const handleGoogle = async (credential: string) => {
        setIsLoading(true);
        try {
            const r = await api.post("/auth/google/login", { credential, subdomain: activeSubdomain || undefined });
            completeLogin(r.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Google sign-in failed", { duration: 9000 });
        } finally { setIsLoading(false); }
    };

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
                trustToken: (() => { try { return localStorage.getItem(trustKey) || undefined; } catch { return undefined; } })(),
            });

            if (res.data?.twoFactorRequired) { setOtp(res.data); return; }
            completeLogin(res.data);
        } catch (err: any) {
            const code = err.response?.data?.code;
            const msg  = err.response?.data?.message || "Login failed. Check your credentials.";
            if (code === "TENANT_PENDING") {
                // Account registered but not yet activated → waiting/activation page.
                const sub = activeSubdomain || "";
                navigate(`/activate?subdomain=${encodeURIComponent(sub)}&verified=${err.response?.data?.emailVerified ? "1" : "0"}`, { replace: true });
                return;
            }
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
                    <Loader2 className="w-8 h-8 animate-spin text-[#1B5FE3]" />
                    <p className="text-sm font-bold text-gray-500">Looking up <span className="text-[#1B5FE3]">{activeSubdomain}</span>…</p>
                </div>
            </div>
        );
    }

    // ── Invalid subdomain → redirect to the root domain with ?notfound= ──────
    if (schoolNotFound) {
        const { protocol, hostname, port } = window.location;
        const rootHost = (hostname === "localhost" || hostname.endsWith(".localhost"))
            ? "localhost"
            : hostname.split(".").slice(-2).join(".");   // manwellstore.com
        const base = `${protocol}//${rootHost}${port ? `:${port}` : ""}`;
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
                        <div>
                            <h1 className="text-3xl font-black mb-2" style={{ color: "#0A1B3F" }}>School Not Found</h1>
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
                                    <span className="text-[#1B5FE3] font-black mt-0.5">→</span>
                                    Check the URL — make sure you typed the subdomain correctly
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#1B5FE3] font-black mt-0.5">→</span>
                                    Ask your school admin for the correct login link
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#1B5FE3] font-black mt-0.5">→</span>
                                    Register your school on ShuleCloud below
                                </li>
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <a href="/register"
                                className="w-full h-12 bg-[#1B5FE3] hover:bg-[#1147B8] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-sm">
                                <Building2 className="w-4 h-4" />
                                Register Your School on ShuleCloud
                            </a>
                            <a href="/login"
                                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-gray-200 text-sm">
                                <GraduationCap className="w-4 h-4 text-[#1B5FE3]" />
                                Back to ShuleCloud Login
                            </a>
                        </div>

                        {/* Subdomain hint */}
                        <p className="text-[10px] text-gray-400 font-medium">
                            Looking for your school? Schools access ShuleCloud at
                            <span className="font-mono text-[#1B5FE3] mx-1">{subdomainHost("yourschool")}</span>
                        </p>
                    </div>
                </div>

                {/* Right: Brand panel */}
                <div className="hidden lg:flex w-[45%] bg-[#0A1B3F] flex-col items-center justify-center p-12 text-center text-white overflow-hidden relative">
                    <div className="relative z-10 space-y-4 max-w-sm">
                        <h2 className="text-3xl font-black tracking-tight">Join ShuleCloud</h2>
                        <p className="text-sm leading-relaxed font-medium" style={{ color: "#9DB6E8" }}>
                            The all-in-one cloud platform for running your school — academics, finance and communication. Register your school and go live in minutes.
                        </p>
                        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                            {["Free to start", "Setup in minutes", "Data isolated per school", "Mobile friendly"].map(t => (
                                <div key={t} className="bg-white/10 rounded-xl px-3 py-2.5">
                                    <span className="text-xs font-bold text-white/90">{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-64 overflow-hidden opacity-10">
                        <div className="w-96 h-96 rounded-full bg-[#1B5FE3] absolute -bottom-32 -left-16" />
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
                                    <div className="w-10 h-10 bg-[#1B5FE3] rounded-xl flex items-center justify-center text-white">
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
                                    shule<span className="text-[#1B5FE3]">cloud</span>
                                </h1>
                            </div>
                        )}
                        <p className="text-[11px] text-gray-500 font-medium">
                            One login for everyone — admins, teachers, students & parents.
                        </p>
                        <h2 className="text-base font-bold text-[#1B5FE3]">Welcome Back!</h2>
                    </div>

                    {otp ? (
                        <OtpStep challenge={otp} onBack={() => { setOtp(null); setPassword(""); }} onDone={data => { setOtp(null); completeLogin(data); }} />
                    ) : (<>
                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* School search — shown on bare localhost only */}
                        {!detectedSubdomain && (
                            <div className="relative">
                                <div className="relative group">
                                    <Building2 className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#1B5FE3] transition-colors" />
                                    <input
                                        type="text"
                                        value={schoolSearch}
                                        onChange={e => { setSchoolSearch(e.target.value); setShowSuggestions(true); }}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        placeholder="Search for your school (type 4+ letters)…"
                                        className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-4 focus:outline-none focus:border-[#1B5FE3] transition-all text-xs text-gray-700 font-medium"
                                    />
                                </div>
                                {showSuggestions && schoolSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden">
                                        {schoolSuggestions.map((s: any) => (
                                            <button key={s.subdomain} type="button"
                                                onClick={() => { window.location.href = buildSubdomainUrl(s.subdomain, "/login"); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1B5FE3]/5 text-left border-b border-gray-50 last:border-0 transition-colors">
                                                {s.logo ? (
                                                    <img src={s.logo} alt={s.name} className="w-8 h-8 rounded-lg object-contain border border-gray-100" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-[#1B5FE3]/10 flex items-center justify-center text-[#1B5FE3] font-black text-sm">{s.name.charAt(0)}</div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-black text-gray-800">{s.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono">{subdomainHost(s.subdomain)}</p>
                                                </div>
                                                <span className="ml-auto text-[10px] text-[#1B5FE3] font-black">Go →</span>
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
                            <div className="flex items-center gap-2 bg-[#1B5FE3]/8 border border-[#1B5FE3]/20 rounded-xl px-3 py-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                <span className="text-xs font-bold text-[#1B5FE3]">{schoolInfo.name}</span>
                                <span className="text-[10px] text-gray-400 ml-auto font-mono">{detectedSubdomain}</span>
                            </div>
                        )}

                        {/* Username/Password — only shown when on a school subdomain */}
                        {detectedSubdomain && (
                            <>
                                {/* Username / Email */}
                                <div className="relative group">
                                    <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#1B5FE3] transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Email, username, admission no. or phone"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        autoComplete="username"
                                        required
                                        className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-4 focus:outline-none focus:border-[#1B5FE3] transition-all text-xs text-gray-700 font-medium"
                                    />
                                    {hint && (
                                        <p className="text-[9px] text-[#1B5FE3] font-bold mt-0.5 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#1B5FE3] inline-block" />
                                            {hint}
                                        </p>
                                    )}
                                </div>

                                {/* Password */}
                                <div className="relative group">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#1B5FE3] transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        required
                                        className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-10 focus:outline-none focus:border-[#1B5FE3] transition-all text-xs text-gray-700 font-medium"
                                    />
                                    <button type="button" onClick={() => setShowPassword(p => !p)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B5FE3]">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="remember" className="w-3.5 h-3.5 rounded border-gray-300 text-[#1B5FE3] focus:ring-[#1B5FE3]" />
                                    <label htmlFor="remember" className="text-[11px] font-bold text-gray-400">Remember Me</label>
                                </div>

                                <button type="submit" disabled={isLoading}
                                    className="w-full h-11 bg-[#1B5FE3] hover:bg-[#1147B8] text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 text-sm">
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    {isLoading ? "Signing in..." : "Sign In"}
                                </button>

                                {googleCfg?.enabled && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                                            <span className="flex-1 h-px bg-gray-200" />or<span className="flex-1 h-px bg-gray-200" />
                                        </div>
                                        <GoogleSignIn onCredential={handleGoogle} disabled={isLoading} />
                                        <p className="text-[10px] text-gray-400 text-center">Admins & staff: link Google once from your profile, then sign in with one click.</p>
                                    </div>
                                )}
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
                        <Link to="/forgot-password" className="text-[11px] font-black text-gray-800 hover:text-[#1B5FE3] transition-colors">
                            Forgot your <span className="text-[#1B5FE3]">password?</span>
                        </Link>
                    </div>
                    )}
                    </>)}

                    {/* Organization sign-in — only when this school belongs to an org. */}
                    {schoolInfo?.organization && (
                        <div className="text-center mt-2">
                            <Link to="/org/login" className="text-[11px] font-bold text-slate-400 hover:text-[#5C67F2] transition-colors">
                                Manage multiple branches? <span className="text-[#5C67F2] font-black">Organization sign-in →</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right: Brand panel ──────────────────────────────────────── */}
            <div className="hidden lg:flex w-[45%] bg-[#0A1B3F] relative flex-col items-center justify-center p-12 text-center text-white overflow-hidden">
                {/* Sign-up is only offered on the main domain — a school's own address (kilimo.shulecloud.com …) is for signing in */}
                {!detectedSubdomain && (
                    <div className="absolute top-10 right-10 flex items-center gap-4">
                        <span className="text-sm font-medium text-blue-100">Don't have an account?</span>
                        <Link to="/register"
                            className="px-6 py-2 bg-[#1B5FE3] hover:bg-[#1147B8] rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
                            <User className="w-4 h-4" /> Sign Up
                        </Link>
                    </div>
                )}

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
                                <p className="text-sm text-blue-100 leading-relaxed font-medium">{schoolInfo.tagline}</p>
                            )}
                            {schoolInfo.address && (
                                <p className="text-xs text-blue-200 font-medium">{schoolInfo.address}</p>
                            )}
                            <p className="text-xs text-blue-200/60 font-bold uppercase tracking-widest">
                                Powered by shulecloud
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl font-black tracking-tight leading-tight">Continue Managing!</h2>
                            <p className="text-sm text-blue-100 leading-relaxed font-medium">
                                Pick up right where you left off. Sign in to the world's favorite fast, easy, and 100% cloud-based school management platform.
                            </p>
                        </>
                    )}
                </div>

                {/* Abstract decoration */}
                <div className="absolute bottom-0 left-0 right-0 h-64 overflow-hidden opacity-10">
                    <div className="w-96 h-96 rounded-full bg-[#1B5FE3] absolute -bottom-32 -left-16" />
                    <div className="w-64 h-64 rounded-full bg-purple-400 absolute -bottom-20 right-10" />
                </div>
            </div>
        </div>
    );
}
