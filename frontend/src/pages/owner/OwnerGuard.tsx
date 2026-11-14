import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Guards the owner portal pages. Owners authenticate with `owner_token` (NOT the
// tenant `auth_token`), so the tenant DashboardLayout guard must not wrap these.
// Also renders a shared Back button on every owner page (except the dashboard).
export default function OwnerGuard() {
    const navigate = useNavigate();
    const location = useLocation();

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

    // The dashboard is the owner "home" — no back button there.
    const onHome = location.pathname === "/owner/dashboard" || location.pathname === "/owner";

    const goBack = () => {
        // Go to the previous page if there's history, otherwise the dashboard.
        if (window.history.length > 1) navigate(-1);
        else navigate("/owner/dashboard");
    };

    return (
        <>
            {!onHome && (
                <button
                    onClick={goBack}
                    title="Back"
                    className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-[#534AB7] hover:border-[#534AB7] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            )}
            <div className="rsp">
                <Outlet />
            </div>
        </>
    );
}
