import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    Users, CheckCircle2, Fingerprint, FileText, UserX, Shield, Image as ImageIcon,
    AlertTriangle, ArrowRightLeft, Loader2, PlayCircle, Download, FileDown, Upload, ClipboardList,
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { nemis } from "./nemisApi";

const TEAL = "#0F766E";
const COLORS = ["#0F766E", "#2563EB", "#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#EC4899", "#06B6D4"];
const toData = (obj: Record<string, number> = {}) => Object.entries(obj).map(([name, value]) => ({ name, value }));

export default function NemisDashboard() {
    const navigate = useNavigate();
    const { data, isLoading } = useQuery({ queryKey: ["nemis_stats"], queryFn: nemis.stats });

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" /></div>;
    const c = data?.cards || {};
    const ch = data?.charts || {};

    const cards = [
        { label: "Total Students", value: c.totalStudents, icon: Users, tone: "bg-slate-100 text-slate-600" },
        { label: "Ready for NEMIS", value: c.readyForNemis, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
        { label: "Missing UPI", value: c.missingUpi, icon: Fingerprint, tone: "bg-amber-50 text-amber-600" },
        { label: "Missing Birth Cert", value: c.missingBirthCert, icon: FileText, tone: "bg-rose-50 text-rose-600" },
        { label: "Missing Parent Info", value: c.missingParent, icon: UserX, tone: "bg-amber-50 text-amber-600" },
        { label: "Missing Guardian Info", value: c.missingGuardian, icon: Shield, tone: "bg-amber-50 text-amber-600" },
        { label: "Missing Photos", value: c.missingPhoto, icon: ImageIcon, tone: "bg-amber-50 text-amber-600" },
        { label: "Incomplete Profiles", value: c.incompleteProfiles, icon: AlertTriangle, tone: "bg-rose-50 text-rose-600" },
        { label: "Pending Transfers", value: c.pendingTransfers, icon: ArrowRightLeft, tone: "bg-indigo-50 text-indigo-600" },
    ];

    const actions = [
        { label: "Validate All Students", icon: PlayCircle, to: "/nemis/validation" },
        { label: "Export All Students", icon: Download, to: "/nemis/export" },
        { label: "Import Updates", icon: Upload, to: "/nemis/import" },
        { label: "Data Entry Assistant", icon: ClipboardList, to: "/nemis/data-entry" },
        { label: "Missing Information", icon: FileDown, to: "/nemis/missing" },
    ];

    return (
        <div className="space-y-6">
            {/* Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {cards.map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${card.tone}`}><card.icon className="w-4 h-4" /></div>
                        <div className="text-2xl font-black text-slate-800">{card.value ?? 0}</div>
                        <div className="text-[11px] text-slate-400 font-bold">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
                {actions.map(a => (
                    <button key={a.label} onClick={() => navigate(a.to)}
                        className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:border-[#0F766E] hover:text-[#0F766E] flex items-center gap-2">
                        <a.icon className="w-4 h-4" /> {a.label}
                    </button>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Students by Grade">
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={toData(ch.byGrade)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={TEAL} radius={[6, 6, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Students by Gender">
                    <ResponsiveContainer width="100%" height={240}>
                        <PieChart><Pie data={toData(ch.byGender)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.byGender).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Validation Status">
                    <ResponsiveContainer width="100%" height={240}>
                        <PieChart><Pie data={toData(ch.validationErrors)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.validationErrors).map((_, i) => <Cell key={i} fill={["#10B981", "#F59E0B", "#EF4444"][i % 3]} />)}</Pie><Legend /><Tooltip /></PieChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Missing Information Breakdown">
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={toData(ch.missingBreakdown)} layout="vertical" margin={{ left: 30 }}><XAxis type="number" fontSize={11} allowDecimals={false} /><YAxis type="category" dataKey="name" fontSize={10} width={120} /><Tooltip /><Bar dataKey="value" fill="#F59E0B" radius={[0, 6, 6, 0]} /></BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-black text-slate-700 mb-3">{title}</h3>
            {children}
        </div>
    );
}
