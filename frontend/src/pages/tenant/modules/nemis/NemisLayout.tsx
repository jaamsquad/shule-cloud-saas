import { NavLink, Outlet } from "react-router-dom";
import { Landmark } from "lucide-react";

const TABS = [
    { to: "/nemis", label: "Dashboard", end: true },
    { to: "/nemis/validation", label: "Validation" },
    { to: "/nemis/missing", label: "Missing Info" },
    { to: "/nemis/export", label: "Export" },
    { to: "/nemis/import", label: "Import" },
    { to: "/nemis/transfers", label: "Transfers" },
    { to: "/nemis/data-entry", label: "Data Entry" },
    { to: "/nemis/history", label: "Sync History" },
    { to: "/nemis/settings", label: "Settings" },
];

export default function NemisLayout() {
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen">
            <div className="bg-white border-b border-slate-100 px-6 pt-5 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#0F766E] flex items-center justify-center text-white"><Landmark className="w-5 h-5" /></div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800">NEMIS Assistant</h1>
                        <p className="text-xs text-slate-500">Prepare, validate and export your data for the NEMIS portal</p>
                    </div>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                    {TABS.map(t => (
                        <NavLink key={t.to} to={t.to} end={t.end}
                            className={({ isActive }) => `px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${isActive ? "border-[#0F766E] text-[#0F766E]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                            {t.label}
                        </NavLink>
                    ))}
                </div>
            </div>
            <div className="p-6"><Outlet /></div>
        </div>
    );
}
