import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Loader2 } from "lucide-react";

// ─── Route → Module key mapping ──────────────────────────────────────────────
const ROUTE_MODULE_MAP: Record<string, string> = {
    // Students
    "/students": "students",
    "/admissions": "students",

    // Employees / Staff
    "/staff": "employees",

    // Academics
    "/classes": "classes",
    "/subjects": "subjects",
    "/academic-system": "academics_content",
    "/academics": "academics_content",

    // Exams
    "/exams": "exams",
    "/reports/report-cards": "exams",
    "/reports/student-progress": "reports",

    // Fees & Finance
    "/fees": "fees",
    "/fees/collect": "fees",
    "/fees/invoices": "fees",

    // Accounts
    "/accounts": "accounts",

    // Salary
    "/salary": "salary",

    // Attendance
    "/attendance": "attendance",

    // Transport
    "/transport": "transport",

    // Timetable
    "/timetable": "timetable",

    // Homework
    "/homework": "homework",

    // Behaviour
    "/behaviour": "behaviour",
    "/skills": "behaviour",

    // Library
    "/library": "library",

    // Hostel
    "/hostel": "hostel",

    // Live Class / LMS
    "/live": "live_class",
    "/lms": "live_class",

    // Communications
    "/communications": "communications",

    // Reports
    "/reports": "reports",

    // Point of Sale
    "/pos-admin": "pos",

    // Certificates
    "/certificates": "certificates",

    // Roles & Permissions (admin only)
    "/roles": "roles",

    // Integrations (admin only)
    "/integrations": "integrations",

    // Settings (admin only)
    "/settings": "settings",

    // Question papers
    "/papers": "question_paper",
};

/** Resolve which module key this path belongs to */
function resolveModuleKey(pathname: string): string | null {
    // Exact match first
    if (ROUTE_MODULE_MAP[pathname]) return ROUTE_MODULE_MAP[pathname];

    // Prefix match (longest prefix wins)
    let bestMatch = "";
    let bestKey: string | null = null;
    for (const [prefix, key] of Object.entries(ROUTE_MODULE_MAP)) {
        if (pathname.startsWith(prefix) && prefix.length > bestMatch.length) {
            bestMatch = prefix;
            bestKey = key;
        }
    }
    return bestKey;
}

interface Props {
    children: ReactNode;
    moduleKey?: string; // override auto-detection
}

/**
 * Wraps a route and redirects to /access-denied if the current user
 * doesn't have permission to access the resolved module.
 *
 * Admin roles bypass all checks.
 */
export default function PermissionGuard({ children, moduleKey }: Props) {
    const { modules, isAdmin, loaded } = usePermissions();
    const location = useLocation();

    // Admins always have access — no check needed
    if (isAdmin) return <>{children}</>;

    // Resolve which module this route belongs to
    const resolvedKey = moduleKey || resolveModuleKey(location.pathname);

    // No module mapping for this path → allow (e.g. /dashboard, /profile)
    if (!resolvedKey) return <>{children}</>;

    // If permissions haven't loaded from DB yet, use the JWT-derived defaults
    // (already populated synchronously). Only block if clearly not allowed.
    const isAllowed =
        modules.includes("*") || modules.includes(resolvedKey);

    if (!isAllowed && loaded) {
        // Permissions fully loaded and this module is NOT in the list → deny
        return <Navigate to="/access-denied" replace state={{ from: location.pathname, module: resolvedKey }} />;
    }

    if (!isAllowed && !loaded) {
        // Still waiting for DB confirmation — show subtle spinner, don't flash content
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] min-h-[300px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" />
            </div>
        );
    }

    return <>{children}</>;
}
