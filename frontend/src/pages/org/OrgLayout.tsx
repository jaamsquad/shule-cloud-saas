import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { LogOut, Layers, LayoutDashboard, Building2, ArrowRightLeft, FileBarChart, Wallet, Users, Settings, ShieldCheck, MessageSquare } from "lucide-react";
import api from "@/lib/api";
import { isOrgUser, getOrgUser, getOrgInfo, orgPrimary, orgLogout } from "@/lib/orgContext";
import BranchSwitcher from "@/components/BranchSwitcher";

// Branded shell for the organization portal. Applies the org's own logo, name
// and primary color (from Organization.branding), shared across all org pages.
const NAV = [
    { to: "/org/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/org/branches", label: "Branches", icon: Building2 },
    { to: "/org/transfers", label: "Transfers", icon: ArrowRightLeft },
    { to: "/org/reports", label: "Reports", icon: FileBarChart },
    { to: "/org/expenses", label: "Expenses", icon: Wallet },
    { to: "/org/communications", label: "Communications", icon: MessageSquare },
    { to: "/org/users", label: "Users", icon: Users },
    { to: "/org/settings", label: "Settings", icon: Settings },
    { to: "/org/audit", label: "Audit", icon: ShieldCheck },
];

export default function OrgLayout() {
    const navigate = useNavigate();
    const [org, setOrg] = useState(getOrgInfo());

    useEffect(() => {
        if (!isOrgUser()) { navigate("/org/login", { replace: true }); return; }
        // Refresh org info/branding in the background.
        api.get("/org/me").then(r => {
            if (r.data?.organization) { localStorage.setItem("org_info", JSON.stringify(r.data.organization)); setOrg(r.data.organization); }
        }).catch(() => { });
    }, [navigate]);

    const accent = orgPrimary();
    const user = getOrgUser();
    const logo = org.branding?.logo;
    const name = org.name || user?.organizationName || "Organization";

    return (
        <div className="min-h-screen bg-[#F8FAFC]" style={{ ["--org-accent" as any]: accent }}>
            {/* Branded top bar */}
            <header className="h-16 bg-white border-b border-slate-100 flex items-center px-4 sm:px-6 sticky top-0 z-40 shadow-sm">
                <button onClick={() => navigate("/org/dashboard")} className="flex items-center gap-2.5">
                    {logo ? (
                        <img src={logo} alt={name} className="w-9 h-9 rounded-xl object-contain border border-slate-100" />
                    ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: accent }}><Layers className="w-5 h-5" /></div>
                    )}
                    <div className="text-left">
                        <div className="font-black text-slate-900 leading-tight">{name}</div>
                        {org.branding?.motto && <div className="text-[10px] text-slate-400 -mt-0.5">{org.branding.motto}</div>}
                    </div>
                </button>

                <div className="ml-auto flex items-center gap-3">
                    <BranchSwitcher />
                    <div className="hidden sm:flex flex-col items-end leading-tight">
                        <span className="text-xs font-bold text-slate-700">{user?.name || user?.email}</span>
                        <span className="text-[10px] text-slate-400">{(user?.role || "").replace("ORG_", "").replace("_", " ")}</span>
                    </div>
                    <button onClick={() => navigate("/org/switch")} title="Switch account" className="text-slate-400 hover:text-slate-700"><Layers className="w-5 h-5" /></button>
                    <button onClick={() => { orgLogout(); navigate("/org/login"); }} title="Sign out" className="text-slate-400 hover:text-rose-500"><LogOut className="w-5 h-5" /></button>
                </div>
            </header>

            <div className="flex">
                {/* Branded side nav */}
                <aside className="hidden md:block w-56 shrink-0 bg-white border-r border-slate-100 min-h-[calc(100vh-4rem)] p-3">
                    <nav className="space-y-1">
                        {NAV.map(n => (
                            <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${isActive ? "text-white" : "text-slate-500 hover:bg-slate-50"}`} style={({ isActive }: any) => isActive ? { background: accent } : {}}>
                                <n.icon className="w-4 h-4" /> {n.label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                <main className="rsp flex-1 min-w-0"><Outlet /></main>
            </div>
        </div>
    );
}
