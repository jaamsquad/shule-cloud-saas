import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PortalLogin from "../PortalLogin";
import { tenantDisplayName } from "../portal";
import { PORTAL_THEME } from "../theme";
import { useBranding } from "../useBranding";
import { parentApi } from "./parentApi";

export default function ParentLogin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { data: brand } = useBranding(parentApi);

    const handleLogin = async (username: string, password: string) => {
        if (!username || !password) { setError("Enter your username/phone and password"); return; }
        setLoading(true);
        setError(null);
        try {
            const r = await parentApi.post("/parent-login", { username, password });
            const { token, parent } = r.data;
            localStorage.setItem("parent_token", token);
            localStorage.setItem("parent_info", JSON.stringify(parent));
            toast.success(`Welcome, ${parent.name}!`);
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed. Check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PortalLogin
            portalName="Parent Portal"
            brandName={brand?.name || tenantDisplayName() || undefined}
            brandCrest={brand?.logo || undefined}
            icon={PORTAL_THEME.parent.icon}
            accent={PORTAL_THEME.parent.accent}
            usernameLabel="Username / Phone"
            loading={loading}
            error={error}
            onSubmit={handleLogin}
            onForgot={() => toast.info("Contact the school office to reset your password.")}
        />
    );
}
