import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PortalLogin from "../PortalLogin";
import { tenantDisplayName } from "../portal";
import { PORTAL_THEME } from "../theme";
import { useBranding } from "../useBranding";
import { staffApi } from "./staffApi";
import GoogleSignIn, { useGoogleConfig } from "@/components/auth/GoogleSignIn";

export default function StaffLogin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { data: brand } = useBranding(staffApi);

    // SSO: when redirected here from the main login, auto-log-in from the hash.
    useEffect(() => {
        const m = window.location.hash.match(/sso=([^&]+)/);
        if (!m) return;
        try {
            const sso = JSON.parse(decodeURIComponent(m[1]));
            if (sso?.token) {
                localStorage.setItem("staff_token", sso.token);
                localStorage.setItem("staff_info", JSON.stringify(sso.staff || {}));
                history.replaceState(null, "", window.location.pathname);
                navigate("/");
            }
        } catch { /* ignore malformed SSO */ }
    }, [navigate]);

    const { data: googleCfg } = useGoogleConfig();
    // Continue with Google — for teachers who linked Google from their profile
    const handleGoogle = async (credential: string) => {
        setLoading(true); setError(null);
        try {
            const r = await staffApi.post("/google/login", { credential, app: "teacher" });
            localStorage.setItem("staff_token", r.data.token);
            localStorage.setItem("staff_info", JSON.stringify(r.data.staff));
            toast.success(`Welcome, ${r.data.staff?.name || ""}!`);
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.message || "Google sign-in failed");
        } finally { setLoading(false); }
    };

    const handleLogin = async (username: string, password: string) => {
        if (!username || !password) { setError("Enter your username and password"); return; }
        setLoading(true);
        setError(null);
        try {
            const r = await staffApi.post("/staff-login", { username, password });
            const { token, staff } = r.data;
            localStorage.setItem("staff_token", token);
            localStorage.setItem("staff_info", JSON.stringify(staff));
            toast.success(`Welcome, ${staff.name}!`);
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed. Check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PortalLogin
            portalName="Teacher Portal"
            brandName={brand?.name || tenantDisplayName() || undefined}
            brandCrest={brand?.logo || undefined}
            icon={PORTAL_THEME.staff.icon}
            accent={PORTAL_THEME.staff.accent}
            usernameLabel="Username"
            loading={loading}
            error={error}
            onSubmit={handleLogin}
            onForgot={() => toast.info("Contact your ICT administrator to reset your password.")}
            extra={googleCfg?.enabled ? (
                <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-300 uppercase tracking-wider"><span className="flex-1 h-px bg-slate-200" />or<span className="flex-1 h-px bg-slate-200" /></div>
                    <GoogleSignIn onCredential={handleGoogle} disabled={loading} width={300} />
                </div>
            ) : null}
        />
    );
}
