import { NavLink, Outlet } from "react-router-dom";
import { Wallet } from "lucide-react";

const TABS = [
    { to: "/expense", label: "Dashboard", end: true },
    { to: "/expense/list", label: "Expenses" },
    { to: "/expense/categories", label: "Categories" },
    { to: "/expense/budgets", label: "Budget Control" },
    { to: "/expense/requests", label: "Purchase Requests" },
    { to: "/expense/orders", label: "Purchase Orders" },
    { to: "/expense/suppliers", label: "Suppliers" },
    { to: "/expense/payments", label: "Payments" },
    { to: "/expense/recurring", label: "Recurring" },
    { to: "/expense/approvals", label: "Approvals" },
    { to: "/expense/reports", label: "Reports" },
    { to: "/expense/settings", label: "Settings" },
];

export default function ExpenseLayout() {
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen">
            <div className="bg-white border-b border-slate-100 px-6 pt-5 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#B45309] flex items-center justify-center text-white"><Wallet className="w-5 h-5" /></div>
                    <div><h1 className="text-lg font-black text-slate-800">Expense Management</h1><p className="text-xs text-slate-500">Plan, record, approve and report all school expenditure</p></div>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                    {TABS.map(t => (
                        <NavLink key={t.to} to={t.to} end={t.end}
                            className={({ isActive }) => `px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${isActive ? "border-[#B45309] text-[#B45309]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                            {t.label}
                        </NavLink>
                    ))}
                </div>
            </div>
            <div className="p-6"><Outlet /></div>
        </div>
    );
}
