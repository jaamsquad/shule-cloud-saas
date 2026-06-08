import { useState } from "react";
import { Home, BarChart2, TrendingUp, BookOpen, Users, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#5C67F2", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function LibraryReports() {
    const [period, setPeriod] = useState("30");

    const { data: report, isLoading } = useQuery({
        queryKey: ["library_reports", period],
        queryFn: async () => {
            const r = await api.get(`/library/reports?period=${period}`);
            return r.data;
        },
    });

    const { data: stats } = useQuery({
        queryKey: ["library_stats"],
        queryFn: async () => {
            const r = await api.get("/library/stats");
            return r.data;
        },
    });

    const byStatus: Record<string, number> = report?.byStatus || {};
    const topBorrowers: any[] = report?.topBorrowers || [];
    const topBooks: any[] = report?.topBooks || [];
    const totalFines: number = report?.totalFines || 0;
    const finesPaid: number = report?.finesPaid || 0;
    const finesOutstanding = totalFines - finesPaid;

    const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

    const kpis = [
        { label: "Total Lending",     value: report?.total || 0,               icon: BookOpen,   color: "text-[#5C67F2]",  bg: "bg-indigo-50" },
        { label: "Currently Issued",  value: byStatus["ISSUED"] || 0,          icon: TrendingUp, color: "text-amber-600",  bg: "bg-amber-50" },
        { label: "Returned",          value: byStatus["RETURNED"] || 0,        icon: BarChart2,  color: "text-emerald-600",bg: "bg-emerald-50" },
        { label: "Overdue",           value: byStatus["OVERDUE"] || 0,         icon: Users,      color: "text-rose-600",   bg: "bg-rose-50" },
        { label: "Fines Collected",   value: `KSh ${finesPaid.toLocaleString()}`,    icon: DollarSign, color: "text-emerald-600",bg: "bg-emerald-50" },
        { label: "Fines Outstanding", value: `KSh ${finesOutstanding.toLocaleString()}`, icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50" },
    ];

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Library</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Reports</span>
                </div>
                <select value={period} onChange={e => setPeriod(e.target.value)}
                    className="h-9 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                </select>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Library Reports</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Lending statistics, borrower activity, and fine collection analytics</p>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {kpis.map(k => (
                        <div key={k.label} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
                            <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center mb-2`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{k.label}</p>
                            <p className={`text-base font-black ${k.color}`}>{isLoading ? "—" : k.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Status breakdown pie */}
                    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Issue Status Breakdown</h3>
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => [v, undefined]} contentStyle={{ borderRadius: "12px", fontSize: "11px", fontWeight: 700 }} />
                                    <Legend wrapperStyle={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="h-[200px] flex items-center justify-center text-slate-300 text-xs font-bold uppercase">No data</div>}
                    </div>

                    {/* Top books */}
                    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Most Borrowed Books</h3>
                        {topBooks.length === 0 ? <p className="text-slate-300 text-xs font-bold uppercase text-center py-12">No data</p> : (
                            <div className="space-y-3">
                                {topBooks.map((b: any, i: number) => (
                                    <div key={b.title} className="flex items-center gap-3">
                                        <span className="w-5 h-5 rounded-lg bg-slate-100 text-slate-500 font-black text-[9px] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-800 truncate">{b.title}</p>
                                            <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                <div className="h-full bg-[#5C67F2] rounded-full" style={{ width: `${topBooks[0]?.count > 0 ? (b.count / topBooks[0].count) * 100 : 0}%` }} />
                                            </div>
                                        </div>
                                        <span className="font-black text-[10px] text-[#5C67F2] flex-shrink-0">{b.count}x</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Fines breakdown */}
                    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Fines Summary</h3>
                        <div className="space-y-4">
                            {[
                                { label: "Total Fines Levied", value: totalFines, color: "text-slate-800", bar: "bg-slate-300" },
                                { label: "Fines Paid", value: finesPaid, color: "text-emerald-600", bar: "bg-emerald-400" },
                                { label: "Outstanding", value: finesOutstanding, color: "text-rose-600", bar: "bg-rose-400" },
                            ].map(f => (
                                <div key={f.label}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{f.label}</span>
                                        <span className={`text-[10px] font-black ${f.color}`}>KSh {f.value.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${f.bar} rounded-full`} style={{ width: totalFines > 0 ? `${(f.value / totalFines) * 100}%` : "0%" }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Collection Rate</p>
                            <p className="text-2xl font-black text-[#5C67F2] mt-1">
                                {totalFines > 0 ? Math.round((finesPaid / totalFines) * 100) : 0}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Top Borrowers */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Top Borrowers</h3>
                    {topBorrowers.length === 0 ? (
                        <p className="text-slate-300 text-xs font-bold uppercase text-center py-8">No borrowing activity in this period</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-3 px-4">#</th>
                                        <th className="py-3 px-4">Member Name</th>
                                        <th className="py-3 px-4">Class / Role</th>
                                        <th className="py-3 px-4 text-right">Books Borrowed</th>
                                        <th className="py-3 px-4">Activity Bar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topBorrowers.map((b: any, i: number) => (
                                        <tr key={b.name} className="hover:bg-slate-50/50">
                                            <td className="py-3 px-4 text-slate-400 font-bold">{i + 1}</td>
                                            <td className="py-3 px-4 font-black text-slate-800">{b.name}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{b.class || "—"}</td>
                                            <td className="py-3 px-4 text-right font-black text-[#5C67F2]">{b.count}</td>
                                            <td className="py-3 px-4 w-40">
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#5C67F2] rounded-full" style={{ width: `${topBorrowers[0]?.count > 0 ? (b.count / topBorrowers[0].count) * 100 : 0}%` }} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
