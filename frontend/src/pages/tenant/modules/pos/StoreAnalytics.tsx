import { useState } from "react";
import { Home, TrendingUp, ShoppingCart, Package, DollarSign, AlertTriangle, BarChart2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function StoreAnalytics() {
    const [period, setPeriod] = useState("30");

    const { data, isLoading } = useQuery({
        queryKey: ["pos_analytics", period],
        queryFn: async () => {
            const r = await api.get(`/pos/analytics?period=${period}`);
            return r.data;
        },
    });

    const totalRevenue: number = data?.totalRevenue || 0;
    const totalOrders: number = data?.totalOrders || 0;
    const totalItems: number = data?.totalItems || 0;
    const todayRevenue: number = data?.todayRevenue || 0;
    const todayOrders: number = data?.todayOrders || 0;
    const topProducts: any[] = data?.topProducts || [];
    const daily: any[] = data?.daily || [];
    const lowStock: any[] = data?.lowStock || [];
    const paymentBreakdown: Record<string, number> = data?.paymentBreakdown || {};

    const stats = [
        { label: "Total Revenue", value: `KSh ${totalRevenue.toLocaleString()}`, sub: `Last ${period} days`, icon: DollarSign, color: "text-[#5C67F2]", bg: "bg-indigo-50" },
        { label: "Total Orders", value: totalOrders.toLocaleString(), sub: `Last ${period} days`, icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Items Sold", value: totalItems.toLocaleString(), sub: `Last ${period} days`, icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Today's Revenue", value: `KSh ${todayRevenue.toLocaleString()}`, sub: `${todayOrders} orders today`, icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50" },
    ];

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Online Store & POS</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Store Analytics</span>
                </div>
                <select value={period} onChange={(e) => setPeriod(e.target.value)}
                    className="h-9 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                </select>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Store Analytics</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Sales performance, top products, and stock alerts</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map((s) => (
                        <div key={s.label} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                                <s.icon className={`w-4 h-4 ${s.color}`} />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{s.sub}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Revenue Chart */}
                    <div className="lg:col-span-2 bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-[#5C67F2]" /> Daily Revenue
                        </h3>
                        {daily.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={daily} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(v: any) => `KSh ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: "12px", fontSize: "11px", fontWeight: 700 }} />
                                    <Bar dataKey="revenue" fill="#5C67F2" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[220px] flex items-center justify-center text-slate-300 text-xs font-bold uppercase">No sales data yet</div>
                        )}
                    </div>

                    {/* Payment Breakdown */}
                    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Payment Methods</h3>
                        {Object.keys(paymentBreakdown).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(paymentBreakdown).map(([method, amount]) => {
                                    const pct = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
                                    return (
                                        <div key={method}>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[10px] font-black text-slate-600 uppercase">{method}</span>
                                                <span className="text-[10px] font-black text-slate-800">KSh {amount.toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#5C67F2] rounded-full" style={{ width: `${pct}%` }} />
                                            </div>
                                            <p className="text-[8px] text-slate-400 font-bold mt-0.5">{pct}%</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-slate-300 text-xs font-bold text-center py-8">No data</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Products */}
                    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Top Products</h3>
                        {topProducts.length > 0 ? (
                            <div className="space-y-3">
                                {topProducts.map((p, i) => (
                                    <div key={p.name} className="flex items-center gap-3 py-2 border-b border-slate-50">
                                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 font-black text-[10px] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-800 truncate">{p.name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold">{p.qty} units sold</p>
                                        </div>
                                        <span className="font-black text-xs text-[#5C67F2] flex-shrink-0">KSh {Number(p.revenue).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-300 text-xs font-bold text-center py-8">No sales data</p>
                        )}
                    </div>

                    {/* Low Stock Alerts */}
                    <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
                        </h3>
                        {lowStock.length > 0 ? (
                            <div className="space-y-3">
                                {lowStock.map((p: any) => (
                                    <div key={p._id} className="flex items-center justify-between py-2 border-b border-slate-50">
                                        <div>
                                            <p className="text-xs font-black text-slate-800">{p.name}</p>
                                            {p.sku && <p className="text-[9px] text-slate-400 font-bold uppercase">SKU: {p.sku}</p>}
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                                            p.stock === 0 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                                        }`}>
                                            {p.stock === 0 ? "Out of Stock" : `${p.stock} left`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32 gap-2 text-emerald-500">
                                <Package className="w-5 h-5" />
                                <p className="text-xs font-black uppercase">All products well stocked</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
