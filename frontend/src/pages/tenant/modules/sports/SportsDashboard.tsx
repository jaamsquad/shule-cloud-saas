import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, Users, CalendarDays, UserCheck, Wallet, Clock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import api from "@/lib/api";

const ksh = (n: any) => `KSh ${Number(n || 0).toLocaleString()}`;

export default function SportsDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ["sports_dashboard"],
        queryFn: async () => {
            try { return (await api.get("/sports/summary/dashboard")).data?.data || {}; }
            catch { return {}; }
        },
    });

    const d = data || {};
    const tiles = [
        { label: "Total Sports", value: d.totalSports ?? 0, icon: Trophy, color: "#5C67F2" },
        { label: "Students Registered", value: d.totalRegistered ?? 0, icon: Users, color: "#0ea5e9" },
        { label: "Active Coaches", value: d.activeCoaches ?? 0, icon: UserCheck, color: "#8b5cf6" },
        { label: "Upcoming Events", value: d.upcomingEvents ?? 0, icon: CalendarDays, color: "#f59e0b" },
        { label: "Fees Collected", value: ksh(d.feesCollected), icon: Wallet, color: "#10b981" },
        { label: "Pending Payments", value: ksh(d.pendingPayments), icon: Clock, color: "#ef4444" },
        { label: "Awaiting Approval", value: d.awaitingApproval ?? 0, icon: AlertCircle, color: "#f43f5e" },
    ];
    const perSport = Array.isArray(d.participantsPerSport) ? d.participantsPerSport : [];
    const maxPart = Math.max(1, ...perSport.map((p: any) => Number(p.count || 0)));

    const links = [
        { label: "Sports Setup", path: "/sports/setup", desc: "Create sports, coaches, fees" },
        { label: "Participants", path: "/sports/participants", desc: "Registered students per sport" },
        { label: "Sports Attendance", path: "/sports/attendance", desc: "Coach attendance register" },
        { label: "Performance & Awards", path: "/sports/performance", desc: "Goals, medals, rankings" },
        { label: "Sports Reports", path: "/sports/reports", desc: "Participants, fees, attendance" },
    ];

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white shadow-lg shadow-indigo-100"><Trophy className="w-7 h-7" /></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Sports Management</h1>
                        <p className="text-sm text-slate-500">Teams, coaches, fees and performance — integrated with student records & fees</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-24 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading…</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {tiles.map((t) => (
                                <div key={t.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t.label}</div>
                                        <t.icon className="w-4 h-4" style={{ color: t.color }} />
                                    </div>
                                    <div className="text-2xl font-black text-slate-800 mt-1">{t.value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Participants Per Sport</h3>
                                {perSport.length === 0 ? (
                                    <p className="text-slate-400 text-xs font-bold py-8 text-center">No registrations yet</p>
                                ) : (
                                    <div className="space-y-3">
                                        {perSport.map((p: any) => (
                                            <div key={p.name} className="space-y-1">
                                                <div className="flex justify-between text-xs font-bold text-slate-600"><span>{p.name}</span><span>{p.count}</span></div>
                                                <div className="h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#5C67F2] rounded-full" style={{ width: `${(Number(p.count || 0) / maxPart) * 100}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Manage</h3>
                                <div className="space-y-2">
                                    {links.map((l) => (
                                        <Link key={l.path} to={l.path} className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-[#5C67F2] transition-all">
                                            <div><div className="font-bold text-slate-700 text-sm">{l.label}</div><div className="text-[11px] text-slate-400">{l.desc}</div></div>
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#5C67F2]" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
