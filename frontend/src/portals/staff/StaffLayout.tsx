import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, Users, CalendarClock, Megaphone, Loader2, PencilLine, BarChart3, CalendarCheck, UserCheck, Video, BookOpen, ClipboardList, FileText, NotebookPen, BookMarked, CalendarPlus, CalendarDays, ClipboardCheck as ClipboardCheckIcon, MessageSquare, ListChecks, Printer, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import PortalShell, { PortalNavSection } from "../PortalShell";
import { tenantDisplayName } from "../portal";
import { PORTAL_THEME } from "../theme";
import { useBranding } from "../useBranding";
import { staffApi, StaffInfo } from "./staffApi";

// Teacher Portal — a focused portal for teaching staff only.
const NAV: PortalNavSection[] = [
    { label: "Dashboard", items: [
        { to: "/", label: "My Profile", icon: User },
        { to: "/my-attendance", label: "My Attendance", icon: UserCheck },
        { to: "/leave", label: "Leave Requests", icon: CalendarPlus },
    ]},
    { label: "Teaching", items: [
        { to: "/classes", label: "My Classes", icon: Users },
        { to: "/timetable", label: "My Timetable", icon: CalendarClock },
        { to: "/live", label: "Live Classes", icon: Video },
    ]},
    { label: "Assessment", items: [
        { to: "/marks", label: "Marks Entry", icon: PencilLine },
        { to: "/cbc", label: "CBC Assessment", icon: ClipboardCheckIcon },
        { to: "/skills/assess", label: "Assess Learners (Skills)", icon: ListChecks },
        { to: "/skills/print", label: "Print Skill Reports", icon: Printer },
        { to: "/results", label: "Results", icon: BarChart3 },
    ]},
    { label: "Attendance", items: [
        { to: "/attendance", label: "Mark Attendance", icon: CalendarCheck },
    ]},
    { label: "Planning", items: [
        { to: "/calendar", label: "School Calendar", icon: CalendarDays },
    ]},
    { label: "Academic Content", items: [
        { to: "/lesson-plans", label: "Lesson Plans", icon: NotebookPen },
        { to: "/schemes", label: "Schemes of Work", icon: BookMarked },
        { to: "/resources", label: "My Resources", icon: BookOpen },
        { to: "/shared-resources", label: "Shared Library", icon: BookMarked },
        { to: "/assignments", label: "Assignments", icon: ClipboardList },
        { to: "/homework", label: "Homework", icon: FileText },
        { to: "/cbc-materials", label: "CBC Materials", icon: GraduationCap },
    ]},
    { label: "Communication", items: [
        { to: "/announcements", label: "Announcements", icon: Megaphone },
        { to: "/message-parents", label: "Message Parents", icon: MessageSquare },
    ]},
];

export interface StaffCtx {
    staff: StaffInfo;
    api: typeof staffApi;
    permissions: string[];
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
        localStorage.removeItem("active_portal");
        toast.success("Logged out");
        window.location.href = "/login";   // back to the school's unified login
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

    const permissions: string[] = profile?.permissions || [];

    return (
        <PortalShell
            brandName={brand?.name || staff.schoolName || tenantDisplayName() || "Teacher Portal"}
            brandCrest={brand?.logo || staff.schoolCrest || null}
            accent={PORTAL_THEME.staff.accent}
            sections={NAV}
            user={{ name: staff.name, subtitle: staff.designation, photo: staff.photo }}
            onLogout={handleLogout}
        >
            <Outlet context={{ staff, api: staffApi, permissions } satisfies StaffCtx} />
        </PortalShell>
    );
}
