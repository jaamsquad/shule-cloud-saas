import { NavLink, Outlet } from "react-router-dom";
import { GraduationCap } from "lucide-react";

const TABS = [
    { to: "/tsc", label: "Dashboard", end: true },
    { to: "/tsc/teachers", label: "Teachers" },
    { to: "/tsc/records", label: "TSC Records" },
    { to: "/tsc/workload", label: "Workload" },
    { to: "/tsc/qualifications", label: "Qualifications" },
    { to: "/tsc/deployment", label: "Deployment" },
    { to: "/tsc/leave", label: "Leave" },
    { to: "/tsc/performance", label: "Performance" },
    { to: "/tsc/reports", label: "Reports" },
    { to: "/tsc/settings", label: "Settings" },
];

export default function TscLayout() {
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen">
            <div className="bg-white border-b border-slate-100 px-6 pt-5 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#1D4ED8] flex items-center justify-center text-white"><GraduationCap className="w-5 h-5" /></div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800">Teacher Service Commission</h1>
                        <p className="text-xs text-slate-500">Manage TSC & BoM teachers — records, workload, leave, performance</p>
                    </div>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                    {TABS.map(t => (
                        <NavLink key={t.to} to={t.to} end={t.end}
                            className={({ isActive }) => `px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${isActive ? "border-[#1D4ED8] text-[#1D4ED8]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                            {t.label}
                        </NavLink>
                    ))}
                </div>
            </div>
            <div className="p-6"><Outlet /></div>
        </div>
    );
}
