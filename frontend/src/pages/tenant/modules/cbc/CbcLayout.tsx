import { NavLink, Outlet } from "react-router-dom";
import { BookOpenCheck } from "lucide-react";
import { CbcTermProvider } from "./cbcTerm";

const TABS = [
    { to: "/cbc", label: "Dashboard", end: true },
    { to: "/cbc/learning-areas", label: "Learning Areas" },
    { to: "/cbc/competencies", label: "Competencies" },
    { to: "/cbc/strands", label: "Strands" },
    { to: "/cbc/activities", label: "Activities" },
    { to: "/cbc/record", label: "Record Assessments" },
    { to: "/cbc/progress", label: "Learner Progress" },
    { to: "/cbc/report-cards", label: "Report Cards" },
    { to: "/cbc/comments", label: "Teacher Comments" },
    { to: "/cbc/analytics", label: "Analytics" },
    { to: "/cbc/reports", label: "Reports" },
    { to: "/cbc/settings", label: "Settings" },
];

export default function CbcLayout() {
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen">
            <div className="bg-white border-b border-slate-100 px-6 pt-5 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#7C3AED] flex items-center justify-center text-white"><BookOpenCheck className="w-5 h-5" /></div>
                    <div><h1 className="text-lg font-black text-slate-800">CBC Assessment</h1><p className="text-xs text-slate-500">Competency-based assessment, progress & report cards</p></div>
                </div>
                <div className="flex gap-1 overflow-x-auto -mx-1 px-1 [scrollbar-width:none]">
                    {TABS.map(t => <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `shrink-0 px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${isActive ? "border-[#7C3AED] text-[#7C3AED]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{t.label}</NavLink>)}
                </div>
            </div>
            <div className="p-6"><CbcTermProvider><Outlet /></CbcTermProvider></div>
        </div>
    );
}
