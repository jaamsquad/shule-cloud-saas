import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopHeader from "./TopHeader";
import PermissionGuard from "./PermissionGuard";
import SmartAssistant from "./SmartAssistant";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

// ─── Auth Guard (with subdomain-tenant enforcement) ───────────────────────────
function useAuthGuard() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if (!token) {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            if (payload.exp && Date.now() / 1000 > payload.exp) {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("user");
                localStorage.removeItem("tenant");
                navigate("/login?session=expired", { replace: true });
                return;
            }
            const hostname = window.location.hostname;
            // Tenant from the URL — apex (manwellstore.com) & www are NOT tenants.
            const isLocal = hostname === "localhost" || hostname.endsWith(".localhost");
            const parts = hostname.split(".");
            const reserved = new Set(["www", "app", "owner", "api", "admin", "localhost"]);
            const urlSubdomain = ((isLocal && parts.length >= 2) || (!isLocal && parts.length >= 3)) && !reserved.has(parts[0])
                ? parts[0]
                : null;
            // Organization mode: when a branch was entered from the org switcher,
            // the active-branch override scopes everything to that branch DB even
            // though the URL stays on the org's address. Don't bounce in that case.
            const activeBranch = localStorage.getItem("active_branch_subdomain");
            const inOrgBranch = activeBranch && payload.tenantSubdomain && activeBranch === payload.tenantSubdomain;
            if (!inOrgBranch && urlSubdomain && payload.tenantSubdomain && payload.tenantSubdomain !== urlSubdomain) {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("user");
                localStorage.removeItem("tenant");
                const { protocol, port } = window.location;
                const portStr = port ? `:${port}` : "";
                window.location.href = `${protocol}//${payload.tenantSubdomain}.${parts.slice(1).join(".")}${portStr}/login`;
                return;
            }
        } catch (_) {
            localStorage.removeItem("auth_token");
            navigate("/login", { replace: true });
        }
    }, [location.pathname]);
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function DashboardLayout() {
    // Desktop: sidebar starts open. Mobile: starts closed.
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
    const location = useLocation();
    useAuthGuard();

    // Close sidebar on route change on mobile
    useEffect(() => {
        if (window.innerWidth < 768) setSidebarOpen(false);
    }, [location.pathname]);

    const { data: theme } = useQuery({
        queryKey: ["theme_settings"],
        queryFn: async () => {
            const r = await api.get("/theme_settings");
            return r.data?.[0];
        }
    });

    const isRTL = theme?.themePlacement === "RTL";

    return (
        <div className="flex flex-col h-screen w-full bg-[#f8fafc] overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
            <div data-app-chrome><TopHeader onMenuClick={() => setSidebarOpen(v => !v)} /></div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* ── Mobile overlay backdrop ─────────────────────────────── */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-20 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                {/* Desktop: pushes content. Mobile: overlays as drawer from left. */}
                <div data-app-chrome className={`
                    transition-all duration-300 ease-in-out flex-shrink-0
                    md:relative md:top-0 md:z-auto
                    fixed left-0 top-16 bottom-0 z-30
                    ${sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden"}
                `}>
                    <AppSidebar />
                </div>

                {/* ── Main content ─────────────────────────────────────────── */}
                <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50/10">
                        <PermissionGuard>
                            <Outlet />
                        </PermissionGuard>
                    </div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#5C67F2]/5 rounded-full blur-[100px] pointer-events-none -mr-48 -mt-48" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFC165]/5 rounded-full blur-[100px] pointer-events-none -ml-48 -mb-48" />
                </main>
            </div>
            {/* Global floating Smart Assistant — button-driven live insights */}
            <SmartAssistant />
        </div>
    );
}
