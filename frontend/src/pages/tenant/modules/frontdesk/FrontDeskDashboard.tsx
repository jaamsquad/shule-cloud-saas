import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DoorOpen, LogOut, Package, CalendarClock, Siren, ArrowRight, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function FrontDeskDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ["frontdesk_dashboard"],
        queryFn: async () => { try { return (await api.get("/frontdesk/summary/dashboard")).data?.data || {}; } catch { return {}; } },
    });
    const d = data || {};
    const tiles = [
        { label: "Visitors Today", value: d.visitorsToday ?? 0, icon: DoorOpen, color: "#5C67F2" },
        { label: "Students Signed Out", value: d.studentsSignedOut ?? 0, icon: LogOut, color: "#0ea5e9" },
        { label: "Deliveries", value: d.deliveries ?? 0, icon: Package, color: "#f59e0b" },
        { label: "Appointments", value: d.appointments ?? 0, icon: CalendarClock, color: "#8b5cf6" },
        { label: "Emergency Cases", value: d.emergencyCases ?? 0, icon: Siren, color: "#ef4444" },
    ];
    const links = [
        { label: "Visitor Management", path: "/frontdesk/visitors", desc: "Sign in/out, generate badge" },
        { label: "Student Sign Out", path: "/frontdesk/signout", desc: "Record early pickups" },
        { label: "Delivery Register", path: "/frontdesk/deliveries", desc: "Books, supplies, parcels" },
        { label: "Appointments", path: "/frontdesk/appointments", desc: "Bookings with staff" },
        { label: "Reception Reports", path: "/frontdesk/reports", desc: "Visitor, exit, appointments" },
    ];
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white shadow-lg shadow-indigo-100"><DoorOpen className="w-7 h-7" /></div>
                    <div><h1 className="text-2xl font-black text-slate-800">Front Desk / Reception</h1><p className="text-sm text-slate-500">Visitors, sign-outs, deliveries and appointments</p></div>
                </div>
                {isLoading ? (
                    <div className="flex items-center justify-center py-24 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading…</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
