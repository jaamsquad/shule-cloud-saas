import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, BadgeCheck, Building, GraduationCap, CalendarOff, AlertTriangle, FileWarning, Clock, Loader2 } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { tsc } from "./tscApi";

const BLUE = "#1D4ED8";
const COLORS = ["#1D4ED8", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#0F766E"];
const toData = (o: Record<string, number> = {}) => Object.entries(o).map(([name, value]) => ({ name, value }));

export default function TscDashboard() {
    const { data, isLoading } = useQuery({ queryKey: ["tsc_stats"], queryFn: tsc.stats });
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#1D4ED8]" /></div>;
    const c = data?.cards || {}; const ch = data?.charts || {};

    const cards = [
        { label: "Total Teachers", value: c.totalTeachers, icon: Users, tone: "bg-slate-100 text-slate-600" },
        { label: "TSC Teachers", value: c.tscTeachers, icon: BadgeCheck, tone: "bg-blue-50 text-blue-600" },
        { label: "BoM Teachers", value: c.bomTeachers, icon: Building, tone: "bg-indigo-50 text-indigo-600" },
        { label: "Intern Teachers", value: c.internTeachers, icon: GraduationCap, tone: "bg-emerald-50 text-emerald-600" },
        { label: "On Leave", value: c.onLeave, icon: CalendarOff, tone: "bg-amber-50 text-amber-600" },
        { label: "Missing TSC No", value: c.missingTsc, icon: AlertTriangle, tone: "bg-rose-50 text-rose-600" },
        { label: "Incomplete Profiles", value: c.incompleteProfiles, icon: FileWarning, tone: "bg-rose-50 text-rose-600" },
        { label: "Teaching Hours / Week", value: c.teachingHoursThisWeek, icon: Clock, tone: "bg-blue-50 text-blue-600" },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cards.map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${card.tone}`}><card.icon className="w-4 h-4" /></div>
                        <div className="text-2xl font-black text-slate-800">{card.value ?? 0}</div>
                        <div className="text-[11px] text-slate-400 font-bold">{card.label}</div>
                    </div>
                ))}
            </div>

            <PendingLeaveCard />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Teachers by Department">
                    <ResponsiveContainer width="100%" height={240}><BarChart data={toData(ch.byDept)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={BLUE} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
                </Card>
                <Card title="Employment Type">
                    <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={toData(ch.byType)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.byType).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer>
                </Card>
                <Card title="Workload Distribution">
                    <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={toData(ch.workloadDist)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.workloadDist).map((_, i) => <Cell key={i} fill={["#10B981", "#1D4ED8", "#EF4444"][i % 3]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer>
                </Card>
                <Card title="Qualification Levels">
                    <ResponsiveContainer width="100%" height={240}><BarChart data={toData(ch.byQual)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 className="text-sm font-black text-slate-700 mb-3">{title}</h3>{children}</div>;
}

function PendingLeaveCard() {
    const { data: reqs = [] } = useQuery({ queryKey: ["tsc_leave_requests"], queryFn: () => tsc.leaveRequests("pending") });
    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
    if (!reqs.length) return null;
    return (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-amber-800">Pending Staff Leave Requests ({reqs.length})</h3>
                <Link to="/tsc/leave" className="text-xs font-black text-amber-700 hover:underline">Review →</Link>
            </div>
            <div className="space-y-1.5">
                {reqs.slice(0, 4).map((r: any) => (
                    <div key={r._id} className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-700">{r.staffName} · {r.type}</span>
                        <span className="text-xs text-slate-500">{fmt(r.startDate)} → {fmt(r.endDate)} ({r.days}d)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
