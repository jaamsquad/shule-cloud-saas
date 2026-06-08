import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    User, ClipboardList, CalendarClock, FileText, ShieldCheck,
    Landmark, Receipt, Loader2, Award, CreditCard, Wallet, Video,
} from "lucide-react";
import { toast } from "sonner";
import PortalShell, { PortalNavSection } from "../PortalShell";
import { tenantDisplayName } from "../portal";
import { PORTAL_THEME } from "../theme";
import { useBranding } from "../useBranding";
import { studentApi, StudentInfo } from "./studentApi";

const NAV: PortalNavSection[] = [
    {
        label: "Dashboard",
        items: [{ to: "/", label: "Personal Profile", icon: User }],
    },
    {
        label: "Academics",
        items: [
            { to: "/registration", label: "Registration", icon: ClipboardList },
            { to: "/exam-results", label: "Exam Results", icon: Award },
            { to: "/live", label: "Live Classes", icon: Video },
            { to: "/timetable", label: "Print Timetable", icon: CalendarClock },
            { to: "/requisition", label: "Academic Requisition", icon: FileText },
            { to: "/clearance", label: "Clearance Request", icon: ShieldCheck },
        ],
    },
    {
        label: "Financials",
        items: [
            { to: "/fees/structure", label: "Fee Structure", icon: Landmark },
            { to: "/fees/pay", label: "Pay Fees", icon: CreditCard },
            { to: "/wallet", label: "My Wallet", icon: Wallet },
            { to: "/receipts", label: "Receipts", icon: Receipt },
        ],
    },
];

export interface StudentCtx {
    student: StudentInfo;
    api: typeof studentApi;
}

export default function StudentLayout() {
    const navigate = useNavigate();
    const [cached, setCached] = useState<StudentInfo | null>(null);
    const { data: brand } = useBranding(studentApi);

    useEffect(() => {
        const token = localStorage.getItem("student_token");
        const info = localStorage.getItem("student_info");
        if (!token) { navigate("/login"); return; }
        if (info) { try { setCached(JSON.parse(info)); } catch { /* ignore */ } }
    }, [navigate]);

    // Full profile from the server (basic info card needs more fields than login returns)
    const { data: profile, isLoading } = useQuery({
        queryKey: ["sp_me"],
        queryFn: async () => {
            const r = await studentApi.get("/student-portal/me");
            return r.data;
        },
        enabled: !!localStorage.getItem("student_token"),
        retry: false,
    });

    const handleLogout = () => {
        localStorage.removeItem("student_token");
        localStorage.removeItem("student_info");
        toast.success("Logged out");
        navigate("/login");
    };

    const student: StudentInfo | null = profile
        ? {
            ...profile,
            _id: profile._id,
            name: profile.studentName || profile.name || cached?.name || "Student",
            registrationNo: profile.registrationNo || profile.admNo || cached?.registrationNo,
            class: profile.studentClass || profile.currentClass || cached?.class,
            photo: profile.studentPhoto || profile.photo || cached?.photo || null,
        }
        : cached;

    if (!student) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#eef2f6]">
                <Loader2 className="w-6 h-6 animate-spin text-[#159a52]" />
            </div>
        );
    }

    return (
        <PortalShell
            brandName={brand?.name || student.schoolName || tenantDisplayName() || "Student Portal"}
            brandCrest={brand?.logo || student.schoolCrest || null}
            accent={PORTAL_THEME.student.accent}
            sections={NAV}
            user={{ name: student.name, subtitle: student.registrationNo, photo: student.photo }}
            onLogout={handleLogout}
        >
            <Outlet context={{ student, api: studentApi } satisfies StudentCtx} />
            {isLoading && !profile && (
                <p className="text-xs text-slate-400">Refreshing profile…</p>
            )}
        </PortalShell>
    );
}
