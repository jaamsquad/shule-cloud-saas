import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

// Guards the owner portal pages. Owners authenticate with `owner_token` (NOT the
// tenant `auth_token`), so the tenant DashboardLayout guard must not wrap these.
export default function OwnerGuard() {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("owner_token");
        if (!token) { navigate("/owner/login", { replace: true }); return; }
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            if (payload.exp && Date.now() / 1000 > payload.exp) {
                localStorage.removeItem("owner_token");
                navigate("/owner/login?session=expired", { replace: true });
            }
        } catch {
            localStorage.removeItem("owner_token");
            navigate("/owner/login", { replace: true });
        }
    }, [navigate]);

    return <Outlet />;
}
