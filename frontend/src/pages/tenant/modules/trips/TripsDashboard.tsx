import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MapPin, Users, Clock, Wallet, UserCheck, ArrowRight, Loader2, Bus } from "lucide-react";
import api from "@/lib/api";

const ksh = (n: any) => `KSh ${Number(n || 0).toLocaleString()}`;

export default function TripsDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ["trips_dashboard"],
        queryFn: async () => { try { return (await api.get("/trips/summary/dashboard")).data?.data || {}; } catch { return {}; } },
    });
    const d = data || {};
    const tiles = [
        { label: "Upcoming Trips", value: d.upcomingTrips ?? 0, icon: MapPin, color: "#5C67F2" },
        { label: "Paid Participants", value: d.paidParticipants ?? 0, icon: Users, color: "#10b981" },
        { label: "Pending Payments", value: ksh(d.pendingPayments), icon: Clock, color: "#ef4444" },
        { label: "Total Revenue", value: ksh(d.totalRevenue), icon: Wallet, color: "#0ea5e9" },
        { label: "Teachers Assigned", value: d.teachersAssigned ?? 0, icon: UserCheck, color: "#8b5cf6" },
        { label: "Total Trips", value: d.totalTrips ?? 0, icon: Bus, color: "#f59e0b" },
    ];
    const links = [
        { label: "Create / Manage Trips", path: "/trips/manage", desc: "Destination, date, fee, consent" },
        { label: "Participants", path: "/trips/participants", desc: "Paid & pending students" },
        { label: "Trip Documents", path: "/trips/documents", desc: "Consent, itinerary, medical forms" },
        { label: "Trip Attendance", path: "/trips/attendance", desc: "Travel-day register" },
        { label: "Trip Reports", path: "/trips/reports", desc: "Participants, payment, consent" },
    ];
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white shadow-lg shadow-indigo-100"><MapPin className="w-7 h-7" /></div>
                    <div><h1 className="text-2xl font-black text-slate-800">Trips & Excursions</h1><p className="text-sm text-slate-500">Plan trips, collect consent & fees, track participants</p></div>
                </div>
                {isLoading ? (
                    <div className="flex items-center justify-center py-24 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading…</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            {tiles.map((t) => (
                                <div key={t.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                    <div className="flex items-center justify-between"><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t.label}</div><t.icon className="w-4 h-4" style={{ color: t.color }} /></div>
                                    <div className="text-2xl font-black text-slate-800 mt-1">{t.value}</div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Manage</h3>
                            <div className="grid sm:grid-cols-2 gap-2">
                                {links.map((l) => (
                                    <Link key={l.path} to={l.path} className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-[#5C67F2] transition-all">
                                        <div><div className="font-bold text-slate-700 text-sm">{l.label}</div><div className="text-[11px] text-slate-400">{l.desc}</div></div>
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#5C67F2]" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
