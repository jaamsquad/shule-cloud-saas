import { Home, BookOpen, Users, BookMarked, AlertTriangle, CheckCircle2, DollarSign, Library } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

export default function LibraryDashboard() {
    const navigate = useNavigate();

    const { data: stats, isLoading } = useQuery({
        queryKey: ["library_stats"],
        queryFn: async () => {
            const r = await api.get("/library/stats");
            return r.data;
        },
    });

    const kpis = [
        { label: "Total Books",     value: stats?.totalBooks || 0,        icon: BookOpen,      color: "text-[#5C67F2]", bg: "bg-indigo-50",  path: "/library/books" },
        { label: "Copies Available",value: stats?.availableCopies || 0,   icon: Library,       color: "text-emerald-600", bg: "bg-emerald-50", path: "/library/books" },
        { label: "Currently Issued",value: stats?.issued || 0,            icon: BookMarked,    color: "text-amber-600", bg: "bg-amber-50",   path: "/library/issue" },
        { label: "Overdue",         value: stats?.overdue || 0,           icon: AlertTriangle, color: "text-rose-600",  bg: "bg-rose-50",    path: "/library/overdue" },
        { label: "Total Members",   value: stats?.totalMembers || 0,      icon: Users,         color: "text-blue-600",  bg: "bg-blue-50",    path: "/library/members" },
        { label: "Returns (All)",   value: stats?.returned || 0,          icon: CheckCircle2,  color: "text-teal-600",  bg: "bg-teal-50",    path: "/library/return" },
        { label: "Fines Outstanding", value: `KSh ${(stats?.finesOutstanding || 0).toLocaleString()}`, icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", path: "/library/overdue" },
        { label: "Fines Collected", value: `KSh ${(stats?.finesPaid || 0).toLocaleString()}`,          icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", path: "/library/overdue" },
    ];

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Library</span>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <Library className="w-8 h-8 text-[#5C67F2]" /> Library Dashboard
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Overview of library activity, holdings, and member lending</p>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {kpis.map((k) => (
                        <button key={k.label} onClick={() => navigate(k.path)}
                            className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm text-left hover:shadow-md hover:border-indigo-100 transition-all group">
                            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
                                <k.icon className={`w-4 h-4 ${k.color}`} />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
                            <p className={`text-xl font-black ${k.color}`}>{isLoading ? "—" : k.value}</p>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Issues */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <BookMarked className="w-4 h-4 text-[#5C67F2]" /> Recent Lending Activity
                        </h3>
                        {(stats?.recentIssues || []).length === 0 ? (
                            <p className="text-slate-300 text-xs font-bold uppercase text-center py-10">No lending activity yet</p>
                        ) : (
                            <div className="space-y-3">
                                {(stats?.recentIssues || []).map((issue: any) => (
                                    <div key={issue._id} className="flex items-center gap-3 py-2 border-b border-slate-50">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                            <BookOpen className="w-4 h-4 text-[#5C67F2]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-800 truncate">{issue.bookTitle}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{issue.memberName} · Due: {issue.dueDate}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                                            issue.status === "RETURNED" ? "bg-emerald-50 text-emerald-600" :
                                            issue.status === "OVERDUE" ? "bg-rose-50 text-rose-500" :
                                            "bg-amber-50 text-amber-600"
                                        }`}>{issue.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Top Books */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#5C67F2]" /> Most Borrowed Books
                        </h3>
                        {(stats?.topBooks || []).length === 0 ? (
                            <p className="text-slate-300 text-xs font-bold uppercase text-center py-10">No data yet</p>
                        ) : (
                            <div className="space-y-3">
                                {(stats?.topBooks || []).map((b: any, i: number) => (
                                    <div key={b._id} className="flex items-center gap-3 py-2 border-b border-slate-50">
                                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 font-black text-[10px] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                        <p className="flex-1 text-xs font-black text-slate-800 truncate">{b._id}</p>
                                        <span className="text-xs font-black text-[#5C67F2]">{b.count}x</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {[
                        { label: "Issue Book",    path: "/library/issue",    color: "bg-[#5C67F2] text-white" },
                        { label: "Return Book",   path: "/library/return",   color: "bg-emerald-500 text-white" },
                        { label: "Add New Book",  path: "/library/books",    color: "bg-amber-500 text-white" },
                        { label: "View Overdue",  path: "/library/overdue",  color: "bg-rose-500 text-white" },
                    ].map(a => (
                        <button key={a.label} onClick={() => navigate(a.path)}
                            className={`${a.color} h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:opacity-90 active:scale-95 shadow-md`}>
                            {a.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
