import { NavLink, Outlet } from "react-router-dom";
import { ShoppingCart } from "lucide-react";

const TABS = [
    { to: "/procurement", label: "Dashboard", end: true },
    { to: "/procurement/requests", label: "Purchase Requests" },
    { to: "/procurement/orders", label: "Purchase Orders" },
    { to: "/procurement/suppliers", label: "Suppliers" },
    { to: "/procurement/quotations", label: "Quotations" },
    { to: "/procurement/grn", label: "Goods Received" },
    { to: "/procurement/matching", label: "Invoice Matching" },
    { to: "/procurement/contracts", label: "Contracts" },
    { to: "/procurement/tenders", label: "Tenders" },
    { to: "/procurement/reports", label: "Reports" },
    { to: "/procurement/settings", label: "Settings" },
];

export default function ProcLayout() {
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen">
            <div className="bg-white border-b border-slate-100 px-6 pt-5 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#0E7490] flex items-center justify-center text-white"><ShoppingCart className="w-5 h-5" /></div>
                    <div><h1 className="text-lg font-black text-slate-800">Procurement</h1><p className="text-xs text-slate-500">Request → PO → goods → invoice → payment</p></div>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                    {TABS.map(t => <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${isActive ? "border-[#0E7490] text-[#0E7490]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{t.label}</NavLink>)}
                </div>
            </div>
            <div className="p-6"><Outlet /></div>
        </div>
    );
}
