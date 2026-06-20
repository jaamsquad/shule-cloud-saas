import { NavLink, Outlet } from "react-router-dom";
import { Calculator } from "lucide-react";

const TABS = [
    { to: "/accounting", label: "Dashboard", end: true },
    { to: "/accounting/coa", label: "Chart of Accounts" },
    { to: "/accounting/journals", label: "Journal Entries" },
    { to: "/accounting/ledger", label: "General Ledger" },
    { to: "/accounting/trial-balance", label: "Trial Balance" },
    { to: "/accounting/income-statement", label: "Income Statement" },
    { to: "/accounting/balance-sheet", label: "Balance Sheet" },
    { to: "/accounting/cash-flow", label: "Cash Flow" },
    { to: "/accounting/receivables", label: "Receivables" },
    { to: "/accounting/payables", label: "Payables" },
    { to: "/accounting/budgeting", label: "Budgeting" },
    { to: "/accounting/reconciliation", label: "Reconciliation" },
    { to: "/accounting/periods", label: "Fiscal Periods" },
    { to: "/accounting/settings", label: "Settings" },
];

export default function AcctLayout() {
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen">
            <div className="bg-white border-b border-slate-100 px-6 pt-5 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#047857] flex items-center justify-center text-white"><Calculator className="w-5 h-5" /></div>
                    <div><h1 className="text-lg font-black text-slate-800">Accounting (General Ledger)</h1><p className="text-xs text-slate-500">Double-entry bookkeeping, statements & reconciliation</p></div>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                    {TABS.map(t => <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${isActive ? "border-[#047857] text-[#047857]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{t.label}</NavLink>)}
                </div>
            </div>
            <div className="p-6"><Outlet /></div>
        </div>
    );
}
