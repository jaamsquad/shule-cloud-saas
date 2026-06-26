import { useState } from "react";
import { Home, TrendingUp, Users, DollarSign, Minus, BarChart2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from "recharts";

export default function SalaryReport() {
    const now = new Date();
    const [year, setYear] = useState(String(now.getFullYear()));

    const { data: report, isLoading } = useQuery({
        queryKey: ["salary_report", year],
        queryFn: async () => {
            const r = await api.get(`/salary/report?year=${year}`);
            return r.data;
        },
    });

    const monthly: any[] = report?.monthly || [];
    const totalGross: number = report?.totalGross || 0;
    const totalNet: number = report?.totalNet || 0;
    const totalPaid: number = report?.totalPaid || 0;
    const total: number = report?.total || 0;
    const totalDeductions = totalGross - totalNet;

    const chartData = monthly.map((m: any) => ({
        month: m.month.slice(5),
        Gross: m.gross,
        Net: m.net,
        Deductions: m.deductions,
    }));

    const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

    const stats = [
        {
            label: "Total Gross Paid",
            value: `KSh ${totalGross.toLocaleString()}`,
            icon: TrendingUp,
            color: "text-slate-800",
            bg: "bg-slate-50",
        },
        {
            label: "Total Deductions",
            value: `KSh ${totalDeductions.toLocaleString()}`,
            icon: Minus,
            color: "text-rose-500",
            bg: "bg-rose-50",
        },
        {
            label: "Total Net Salary",
            value: `KSh ${totalNet.toLocaleString()}`,
            icon: DollarSign,
            color: "text-[#5C67F2]",
            bg: "bg-indigo-50",
        },
        {
            label: "Payments Processed",
            value: `${totalPaid} Paid / ${total} Records`,
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
    ];

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Salary</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Salary Report</span>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Salary Report</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                            Annual salary analytics — gross pay, deductions, and net expense by month
                        </p>
                    </div>
                    <div className="relative w-32">
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm appearance-none cursor-pointer"
                        >
                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map((s) => (
                        <div key={s.label} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                                <s.icon className={`w-4 h-4 ${s.color}`} />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                            <p className={`text-sm font-black ${s.color} leading-tight`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Bar Chart */}
                {chartData.length > 0 ? (
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm mb-8">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-[#5C67F2]" />
                            Monthly Salary Trends — {year}
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    formatter={(v: any) => [`KSh ${Number(v).toLocaleString()}`, undefined]}
                                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 700 }}
                                />
                                <Legend wrapperStyle={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }} />
                                <Bar dataKey="Gross" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Net" fill="#5C67F2" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Deductions" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : !isLoading && (
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex items-center justify-center h-56 mb-8">
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No data to chart for {year}</p>
                    </div>
                )}

                {/* Monthly Breakdown Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6">Monthly Breakdown</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="py-4 px-6">Month</th>
                                    <th className="py-4 px-6 text-right">Staff</th>
                                    <th className="py-4 px-6 text-right">Gross (KSh)</th>
                                    <th className="py-4 px-6 text-right">Deductions (KSh)</th>
                                    <th className="py-4 px-6 text-right">Net (KSh)</th>
                                    <th className="py-4 px-6 text-center">Paid Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {monthly.map((m: any) => (
                                    <tr key={m.month} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6 font-black text-slate-800">{m.month}</td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-600">{m.count}</td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-800">{(Number(m.gross) || 0).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-right font-bold text-rose-500">{(Number(m.deductions) || 0).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-right font-black text-[#5C67F2]">{(Number(m.net) || 0).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                m.paid === m.count
                                                    ? "bg-emerald-50 text-emerald-600"
                                                    : m.paid > 0
                                                    ? "bg-amber-50 text-amber-600"
                                                    : "bg-slate-100 text-slate-500"
                                            }`}>
                                                {m.paid}/{m.count} Paid
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {/* Totals row */}
                                {monthly.length > 0 && (
                                    <tr className="bg-slate-50 border-t-2 border-slate-100 font-black">
                                        <td className="py-4 px-6 uppercase text-slate-500 tracking-wider">Year Total</td>
                                        <td className="py-4 px-6 text-right text-slate-700">
                                            {monthly.reduce((s: number, m: any) => s + m.count, 0)}
                                        </td>
                                        <td className="py-4 px-6 text-right text-slate-800">{totalGross.toLocaleString()}</td>
                                        <td className="py-4 px-6 text-right text-rose-500">{totalDeductions.toLocaleString()}</td>
                                        <td className="py-4 px-6 text-right text-[#5C67F2]">{totalNet.toLocaleString()}</td>
                                        <td></td>
                                    </tr>
                                )}

                                {monthly.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-16 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                            {isLoading ? "Loading report data..." : `No salary data found for ${year}`}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
