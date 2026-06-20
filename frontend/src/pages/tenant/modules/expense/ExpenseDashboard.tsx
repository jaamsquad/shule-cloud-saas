import { useQuery } from "@tanstack/react-query";
import { Calendar, CalendarDays, CalendarRange, Clock, CheckCircle2, XCircle, Wallet, PieChart as PieIcon, TrendingUp, Loader2 } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { exp, ksh } from "./expenseApi";

const ACCENT = "#B45309";
const COLORS = ["#B45309", "#1D4ED8", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#0F766E"];
const toData = (o: Record<string, number> = {}) => Object.entries(o).map(([name, value]) => ({ name, value }));

export default function ExpenseDashboard() {
    const { data, isLoading } = useQuery({ queryKey: ["exp_stats"], queryFn: exp.stats });
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#B45309]" /></div>;
    const c = data?.cards || {}; const ch = data?.charts || {};

    const cards = [
        { label: "Today", value: ksh(c.today), icon: Calendar, tone: "bg-amber-50 text-amber-600" },
        { label: "This Month", value: ksh(c.month), icon: CalendarDays, tone: "bg-amber-50 text-amber-600" },
        { label: "This Year", value: ksh(c.year), icon: CalendarRange, tone: "bg-amber-50 text-amber-600" },
        { label: "Pending Approvals", value: c.pendingApprovals, icon: Clock, tone: "bg-blue-50 text-blue-600" },
        { label: "Approved", value: c.approved, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
        { label: "Rejected", value: c.rejected, icon: XCircle, tone: "bg-rose-50 text-rose-600" },
        { label: "Outstanding Supplier", value: ksh(c.outstandingSupplier), icon: Wallet, tone: "bg-rose-50 text-rose-600" },
        { label: "Budget Used", value: `${c.budgetUtilization || 0}%`, icon: PieIcon, tone: "bg-indigo-50 text-indigo-600" },
        { label: "Remaining Budget", value: ksh(c.remainingBudget), icon: TrendingUp, tone: "bg-emerald-50 text-emerald-600" },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {cards.map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${card.tone}`}><card.icon className="w-4 h-4" /></div>
                        <div className="text-lg font-black text-slate-800">{card.value ?? 0}</div>
                        <div className="text-[11px] text-slate-400 font-bold">{card.label}</div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Monthly Expenses"><ResponsiveContainer width="100%" height={240}><BarChart data={toData(ch.byMonth)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: any) => ksh(v)} /><Bar dataKey="value" fill={ACCENT} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
                <Card title="Expenses by Category"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={toData(ch.byCat)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.byCat).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip formatter={(v: any) => ksh(v)} /></PieChart></ResponsiveContainer></Card>
                <Card title="Department Spending"><ResponsiveContainer width="100%" height={240}><BarChart data={toData(ch.byDept)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: any) => ksh(v)} /><Bar dataKey="value" fill="#1D4ED8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
                <Card title="Payment Methods"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={toData(ch.byMethod)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.byMethod).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip formatter={(v: any) => ksh(v)} /></PieChart></ResponsiveContainer></Card>
            </div>
        </div>
    );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 className="text-sm font-black text-slate-700 mb-3">{title}</h3>{children}</div>;
}
