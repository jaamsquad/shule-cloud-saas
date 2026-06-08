import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, Users, CalendarClock, Megaphone, Loader2, PencilLine, BarChart3, CalendarCheck, UserCheck, Video } from "lucide-react";
import { toast } from "sonner";
import PortalShell, { PortalNavSection } from "../PortalShell";
import { tenantDisplayName } from "../portal";
import { PORTAL_THEME } from "../theme";
import { useBranding } from "../useBranding";
import { staffApi, StaffInfo } from "./staffApi";

const NAV: PortalNavSection[] = [
    {
        label: "Dashboard",
        items: [
            { to: "/", label: "My Profile", icon: User },
            { to: "/my-attendance", label: "My Attendance", icon: UserCheck },
        ],
    },
    {
        label: "Academics",
        items: [
            { to: "/classes", label: "My Classes", icon: Users },
            { to: "/timetable", label: "My Timetable", icon: CalendarClock },
            { to: "/marks", label: "Marks Entry", icon: PencilLine },
            { to: "/results", label: "Results", icon: BarChart3 },
            { to: "/attendance", label: "Mark Attendance", icon: CalendarCheck },
            { to: "/live", label: "Live Classes", icon: Video },
        ],
    },
    { label: "Communication", items: [{ to: "/announcements", label: "Announcements", icon: Megaphone }] },
];

export interface StaffCtx {
    staff: StaffInfo;
    api: typeof staffApi;
}

export default function StaffLayout() {
    const navigate = useNavigate();
    const [cached, setCached] = useState<StaffInfo | null>(null);
    const { data: brand } = useBranding(staffApi);

    useEffect(() => {
        if (!localStorage.getItem("staff_token")) { navigate("/login"); return; }
        const info = localStorage.getItem("staff_info");
        if (info) { try { setCached(JSON.parse(info)); } catch { /* ignore */ } }
    }, [navigate]);

    const { data: profile } = useQuery({
        queryKey: ["staff_me"],
        queryFn: async () => (await staffApi.get("/staff-portal/me")).data,
        enabled: !!localStorage.getItem("staff_token"),
        retry: false,
    });

    const handleLogout = () => {
        localStorage.removeItem("staff_token");
        localStorage.removeItem("staff_info");
        toast.success("Logged out");
        navigate("/login");
    };

    const staff: StaffInfo | null = profile
        ? {
            ...profile,
            name: profile.employeeName || profile.name || cached?.name || "Staff",
            designation: profile.designation || cached?.designation,
            photo: profile.staffPhoto || profile.photo || cached?.photo || null,
        }
        : cached;

    if (!staff) {
        return <div className="min-h-screen flex items-center justify-center bg-[#eef2f6]"><Loader2 className="w-6 h-6 animate-spin text-[#159a52]" /></div>;
    }

    return (
        <PortalShell
            brandName={brand?.name || staff.schoolName || tenantDisplayName() || "Staff Portal"}
            brandCrest={brand?.logo || staff.schoolCrest || null}
            accent={PORTAL_THEME.staff.accent}
            sections={NAV}
            user={{ name: staff.name, subtitle: staff.designation, photo: staff.photo }}
            onLogout={handleLogout}
        >
            <Outlet context={{ staff, api: staffApi } satisfies StaffCtx} />
        </PortalShell>
    );
}
