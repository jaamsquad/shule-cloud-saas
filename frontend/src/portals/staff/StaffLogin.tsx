import { useState } from "react";
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
            portalName="Staff Portal"
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
