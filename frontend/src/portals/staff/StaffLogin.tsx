import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PortalLogin from "../PortalLogin";
import { tenantDisplayName } from "../portal";
import { PORTAL_THEME } from "../theme";
import { useBranding } from "../useBranding";
import { staffApi } from "./staffApi";

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
        />
    );
}
