import { Home, Bed, Building2, Users, CheckCircle2, AlertTriangle, TrendingUp, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

export default function HostelDashboard() {
    const navigate = useNavigate();

    const { data: stats, isLoading } = useQuery({
        queryKey: ["hostel_stats"],
        queryFn: async () => { const r = await api.get("/hostel/stats"); return r.data; },
        refetchInterval: 60000,
    });

    const occupancyPct = stats?.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0;
    const attendancePct = stats?.todayTotal > 0 ? Math.round((stats.todayPresent / stats.todayTotal) * 100) : 0;

    const kpis = [
        { label: "Total Beds", value: stats?.totalBeds || 0, icon: Bed, color: "text-[#5C67F2]", bg: "bg-indigo-50", path: "/hostel/beds" },
        { label: "Occupied", value: stats?.occupiedBeds || 0, icon: Users, color: "text-amber-600", bg: "bg-amber-50", path: "/hostel/allocation" },
        { label: "Available", value: stats?.availableBeds || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", path: "/hostel/beds" },
        { label: "Rooms", value: stats?.totalRooms || 0, icon: Building2, color: "text-blue-600", bg: "bg-blue-50", path: "/hostel/rooms" },
        { label: "Active Residents", value: stats?.activeAllocations || 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50", path: "/hostel/allocation" },
        { label: "Today Present", value: stats?.todayPresent || 0, icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50", path: "/hostel/attendance" },
    ];

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Hostel Management</span>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-[#5C67F2]" /> Hostel Dashboard
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Overview of hostel occupancy, attendance, and resident management</p>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {kpis.map(k => (
                        <button key={k.label} onClick={() => navigate(k.path)}
                            className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm text-left hover:shadow-md hover:border-indigo-100 transition-all group">
                            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
                                <k.icon className={`w-4 h-4 ${k.color}`} />
                            </div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{k.label}</p>
                            <p className={`text-xl font-black ${k.color}`}>{isLoading ? "—" : k.value}</p>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Occupancy gauge */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Bed Occupancy Rate</h3>
                        <div className="flex items-center gap-6">
                            <div className="relative w-28 h-28 flex-shrink-0">
                                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#5C67F2" strokeWidth="12"
                                        strokeDasharray={`${occupancyPct * 2.513} 251.3`} strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-[#5C67F2]">{occupancyPct}%</span>
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Occupied</span>
                                </div>
                            </div>
                            <div className="space-y-3 flex-1">
                                {[
                                    { label: "Total Beds", value: stats?.totalBeds || 0, color: "bg-slate-200" },
                                    { label: "Occupied", value: stats?.occupiedBeds || 0, color: "bg-[#5C67F2]" },
                                    { label: "Available", value: stats?.availableBeds || 0, color: "bg-emerald-400" },
                                ].map(r => (
                                    <div key={r.label} className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${r.color} flex-shrink-0`} />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-1">{r.label}</span>
                                        <span className="font-black text-slate-800 text-sm">{r.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Today's attendance */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Today's Attendance</h3>
                        {stats?.todayTotal > 0 ? (
                            <>
                                <div className="flex items-end gap-2 mb-4">
                                    <span className="text-5xl font-black text-emerald-600">{stats.todayPresent}</span>
                                    <span className="text-slate-400 font-bold text-lg mb-1">/ {stats.todayTotal}</span>
                                    <span className="ml-auto text-2xl font-black text-emerald-600">{attendancePct}%</span>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${attendancePct}%` }} />
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3">{stats.todayTotal - stats.todayPresent} absent today</p>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-24 gap-2 text-slate-300">
                                <AlertTriangle className="w-8 h-8" />
                                <p className="text-xs font-bold uppercase">No attendance taken today</p>
                                <button onClick={() => navigate("/hostel/attendance")} className="mt-2 h-9 px-4 bg-[#5C67F2] text-white font-black text-[9px] uppercase tracking-widest rounded-xl">Take Attendance</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hostels overview */}
                {(stats?.hostels || []).length > 0 && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7 mb-6">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5">Hostel Blocks</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats.hostels.map((h: any) => (
                                <div key={h._id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <Building2 className="w-5 h-5 text-[#5C67F2] mb-2" />
                                    <p className="text-xs font-black text-slate-800">{h.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{h.gender || "Mixed"} · {h.capacity || "—"} beds</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Allocate Bed", path: "/hostel/allocation", color: "bg-[#5C67F2] text-white" },
                        { label: "Take Attendance", path: "/hostel/attendance", color: "bg-emerald-500 text-white" },
                        { label: "Add Room", path: "/hostel/rooms", color: "bg-amber-500 text-white" },
                        { label: "Hostel Settings", path: "/hostel/settings", color: "bg-slate-700 text-white" },
                    ].map(a => (
                        <button key={a.label} onClick={() => navigate(a.path)}
                            className={`${a.color} h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:opacity-90 active:scale-95 shadow-md flex items-center justify-center gap-2`}>
                            <Plus className="w-4 h-4" />{a.label}
                        </button>
                    ))}
                </div>

                {/* Recent allocations */}
                {(stats?.recentAllocations || []).length > 0 && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7 mt-6">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#5C67F2]" /> Recent Allocations
                        </h3>
                        <div className="space-y-3">
                            {stats.recentAllocations.map((a: any) => (
                                <div key={a._id} className="flex items-center gap-3 py-2 border-b border-slate-50">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-[#5C67F2] text-sm flex-shrink-0">
                                        {(a.studentName || "?")[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-800 truncate">{a.studentName}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{a.hostelName} · Room {a.roomNumber} · Bed {a.bedNumber}</p>
                                    </div>
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase">{a.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
