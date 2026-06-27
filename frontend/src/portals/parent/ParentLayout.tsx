import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Award, CreditCard, Megaphone, Loader2, CalendarClock, CalendarCheck, Receipt, Users, Wallet, MapPin, Trophy, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import PortalShell, { PortalNavSection } from "../PortalShell";
import { tenantDisplayName } from "../portal";
import { PORTAL_THEME } from "../theme";
import { useBranding } from "../useBranding";
import { parentApi, ParentInfo, ParentChild } from "./parentApi";

const NAV: PortalNavSection[] = [
    { label: "Overview", items: [{ to: "/", label: "My Child", icon: GraduationCap }] },
    {
        label: "Academics",
        items: [
            { to: "/results", label: "Exam Results", icon: Award },
            { to: "/analytics", label: "Analytics", icon: TrendingUp },
            { to: "/timetable", label: "Timetable", icon: CalendarClock },
            { to: "/attendance", label: "Attendance", icon: CalendarCheck },
        ],
    },
    {
        label: "Financials",
        items: [
            { to: "/fees", label: "Fees & Payment", icon: CreditCard },
            { to: "/wallet", label: "Wallet", icon: Wallet },
            { to: "/receipts", label: "Receipts", icon: Receipt },
        ],
    },
    { label: "Activities", items: [{ to: "/trips", label: "Trips & Excursions", icon: MapPin }, { to: "/sports", label: "Sports", icon: Trophy }] },
    { label: "Communication", items: [{ to: "/announcements", label: "Announcements", icon: Megaphone }] },
];

export interface ParentCtx {
    parent: ParentInfo;          // parent.student is the ACTIVE child
    child: ParentChild;
    api: typeof parentApi;
}

export default function ParentLayout() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [parent, setParent] = useState<ParentInfo | null>(null);
    const [activeId, setActiveId] = useState<string>("");
    const { data: brand } = useBranding(parentApi);

    useEffect(() => {
        if (!localStorage.getItem("parent_token")) { navigate("/login"); return; }
        const info = localStorage.getItem("parent_info");
        if (!info) return;
        try {
            const p: ParentInfo = JSON.parse(info);
            setParent(p);
            const children = p.children || (p.student ? [p.student] : []);
            const stored = localStorage.getItem("parent_active_child");
            const initial = stored && children.some(c => c._id === stored) ? stored : (children[0]?._id || "");
            setActiveId(initial);
            if (initial) localStorage.setItem("parent_active_child", initial);
        } catch { /* ignore */ }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("parent_token");
        localStorage.removeItem("parent_info");
        localStorage.removeItem("parent_active_child");
        localStorage.removeItem("active_portal");
        toast.success("Logged out");
        window.location.href = "/login";
    };

    const switchChild = (id: string) => {
        setActiveId(id);
        localStorage.setItem("parent_active_child", id);
        qc.invalidateQueries();   // all child-scoped queries refetch with the new id
    };

    if (!parent) {
        return <div className="min-h-screen flex items-center justify-center bg-[#eef2f6]"><Loader2 className="w-6 h-6 animate-spin text-[#159a52]" /></div>;
    }

    const children = parent.children || (parent.student ? [parent.student] : []);
    const child = children.find(c => c._id === activeId) || children[0] || parent.student;
    const ctxParent: ParentInfo = { ...parent, student: child };

    return (
        <PortalShell
            brandName={brand?.name || tenantDisplayName() || "Parent Portal"}
            brandCrest={brand?.logo || null}
            accent={PORTAL_THEME.parent.accent}
            sections={NAV}
            user={{ name: parent.name, subtitle: child?.name }}
            onLogout={handleLogout}
        >
            {children.length > 1 && (
                <div className="mb-5 bg-white rounded-md shadow-sm border border-black/5 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Users className="w-4 h-4" style={{ color: PORTAL_THEME.parent.accent }} /> Viewing child:
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {children.map(c => (
                            <button key={c._id} onClick={() => switchChild(c._id)}
                                className="text-sm font-bold px-3 py-1.5 rounded border transition-colors"
                                style={c._id === activeId
                                    ? { backgroundColor: PORTAL_THEME.parent.accent, borderColor: PORTAL_THEME.parent.accent, color: "white" }
                                    : { borderColor: "#e2e8f0", color: "#475569" }}>
                                {c.name}{c.class ? ` · ${c.class}` : ""}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <Outlet context={{ parent: ctxParent, child, api: parentApi } satisfies ParentCtx} />
        </PortalShell>
    );
}
