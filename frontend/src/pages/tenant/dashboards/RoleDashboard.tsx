import { usePermissions } from "@/contexts/PermissionsContext";
import Dashboard from "@/pages/tenant/modules/Dashboard";
import TeacherDashboardNew from "./TeacherDashboardNew";
import { Loader2 } from "lucide-react";

/**
 * Routes to the correct dashboard based on the user's role:
 * - Admin / Super Admin / Principal → main Dashboard
 * - Teacher → TeacherDashboard (shows timetable, filtered actions)
 * - Others → main Dashboard (fallback)
 */
export default function RoleDashboard() {
    const perms = usePermissions();

    // While permissions are loading, show a spinner
    if (!perms.loaded) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    // Teacher role → Teacher Dashboard
    if (perms.isTeacher) {
        return <TeacherDashboardNew />;
    }

    // Admin / Principal / Others → Main Dashboard
    return <Dashboard />;
}
