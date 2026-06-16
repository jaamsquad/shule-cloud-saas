import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardList, UserPlus, FileBadge, Wallet, CalendarClock, ArrowRight, Loader2 } from "lucide-react";
import api from "@/lib/api";

const ksh = (n: any) => `KSh ${Number(n || 0).toLocaleString()}`;

export default function SecretaryDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ["secretary_dashboard"],
        queryFn: async () => { try { return (await api.get("/secretary/summary/dashboard")).data?.data || {}; } catch { return {}; } },
    });
    const d = data || {};
    const tiles = [
        { label: "Admissions Today", value: d.admissionsToday ?? 0, icon: UserPlus, color: "#5C67F2" },
        { label: "Total Students", value: d.totalStudents ?? 0, icon: ClipboardList, color: "#0ea5e9" },
        { label: "Pending Certificates", value: d.pendingCertificates ?? 0, icon: FileBadge, color: "#f59e0b" },
        { label: "Fee Balances", value: ksh(d.feeBalances), icon: Wallet, color: "#ef4444" },
        { label: "Upcoming Meetings", value: d.upcomingMeetings ?? 0, icon: CalendarClock, color: "#8b5cf6" },
    ];
    const links = [
        { label: "Student Records", path: "/students", desc: "Create, edit, transfer, archive" },
        { label: "Communication Center", path: "/communications/announcements", desc: "SMS, email, notifications" },
        { label: "Admission Letters", path: "/students/admission-letter", desc: "Generate admission letters" },
        { label: "Certificates", path: "/certificates/generate", desc: "Leaving & recommendation letters" },
        { label: "Fee Statements", path: "/accounts/statement", desc: "Student fee statements" },
        { label: "Meeting Management", path: "/secretary/meetings", desc: "Staff, board & PTA meetings" },
        { label: "Secretary Reports", path: "/secretary/reports", desc: "Admissions, movement, transfers" },
    ];
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white shadow-lg shadow-indigo-100"><ClipboardList className="w-7 h-7" /></div>
                    <div><h1 className="text-2xl font-black text-slate-800">Secretary Office</h1><p className="text-sm text-slate-500">Records, communication, documents and meetings</p></div>
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
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Quick Actions</h3>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
