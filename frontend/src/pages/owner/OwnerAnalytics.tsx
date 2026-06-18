import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { Building2, Users, TrendingUp, Clock, Loader2 } from "lucide-react";
import api from "@/lib/api";

const PRIMARY = "#534AB7";
const PLAN_COLORS: Record<string, string> = { Basic: "#94a3b8", Pro: "#534AB7", Enterprise: "#f59e0b" };
const ksh = (n: any) => `KES ${Number(n || 0).toLocaleString()}`;

export default function OwnerAnalytics() {
    const [plan, setPlan] = useState("");
    const [status, setStatus] = useState("");

    const { data: stats } = useQuery({
        queryKey: ["owner_stats"],
        queryFn: async () => { try { return (await api.get("/owner/stats")).data; } catch { return {}; } },
    });
    const { data: revenue = [] } = useQuery({
        queryKey: ["owner_revenue"],
        queryFn: async () => { try { const r = await api.get("/owner/revenue", { params: { period: "monthly" } }); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const { data: schools = [], isLoading } = useQuery({
        queryKey: ["owner_schools_summary"],
        queryFn: async () => { try { const r = await api.get("/owner/schools/summary"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    const filtered = useMemo(() => (schools as any[]).filter((s) =>
        (!plan || s.plan === plan) && (!status || s.status === status)
    ), [schools, plan, status]);

    const planDistribution = useMemo(() => {
        const m: Record<string, number> = {};
        filtered.forEach((s) => { m[s.plan || "Basic"] = (m[s.plan || "Basic"] || 0) + 1; });
        return Object.entries(m).map(([name, value]) => ({ name, value }));
    }, [filtered]);

    const topStudents = useMemo(() =>
        [...filtered].sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0)).slice(0, 10)
            .map((s) => ({ name: (s.name || "").slice(0, 14), students: s.studentCount || 0 })),
        [filtered]);

    const tiles = [
        { label: "Total Schools", value: stats?.totalSchools ?? 0, icon: Building2 },
        { label: "Active Accounts", value: stats?.activeSchools ?? 0, icon: Users },
        { label: "Monthly Revenue", value: ksh(stats?.monthlyRevenue), icon: TrendingUp },
        { label: "Expiring Soon", value: stats?.expiringSoon ?? 0, icon: Clock },
    ];

    const plans = Array.from(new Set((schools as any[]).map((s) => s.plan).filter(Boolean)));

    return (
        <div className="space-y-6">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {tiles.map((t) => (
                    <div key={t.label} className="bg-white rounded-xl p-4" style={{ border: "0.5px solid #e5e7eb" }}>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t.label}</span>
                            <t.icon className="w-4 h-4" style={{ color: PRIMARY }} />
                        </div>
                        <div className="text-2xl font-black text-slate-800 mt-1">{t.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className="h-9 px-3 rounded-lg text-sm font-bold text-slate-600" style={{ border: "0.5px solid #e5e7eb" }}>
                    <option value="">All Plans</option>
                    {plans.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 px-3 rounded-lg text-sm font-bold text-slate-600" style={{ border: "0.5px solid #e5e7eb" }}>
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Revenue line — full width */}
                    <div className="lg:col-span-3 bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                        <h3 className="text-sm font-black text-slate-800 mb-4">Monthly Revenue — Last 12 Months</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={revenue}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                                <Tooltip formatter={(v: any) => ksh(v)} />
                                <Line type="monotone" dataKey="amount" stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Plan distribution pie */}
                    <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                        <h3 className="text-sm font-black text-slate-800 mb-4">Plan Distribution</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={planDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {planDistribution.map((e, i) => <Cell key={i} fill={PLAN_COLORS[e.name] || PRIMARY} />)}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Students per school bar — top 10 */}
                    <div className="lg:col-span-2 bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                        <h3 className="text-sm font-black text-slate-800 mb-4">Students per School (Top 10)</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={topStudents}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-25} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                                <Tooltip />
                                <Bar dataKey="students" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
