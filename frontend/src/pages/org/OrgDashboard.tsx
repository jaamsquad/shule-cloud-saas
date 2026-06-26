import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2, Users, GraduationCap, Wallet, TrendingUp, ArrowRightLeft, Layers, ShieldCheck, FileBarChart, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { getOrgUser, isOrgUser } from "@/lib/orgContext";

const ksh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;

// Organization Finance / Overview Dashboard — aggregates every branch the user
// can read. Each metric is a sum across branch DBs with a per-branch breakdown.
export default function OrgDashboard() {
    const user = getOrgUser();
    const [range] = useState<{ from?: string; to?: string }>({});

    const { data, isLoading } = useQuery({
        queryKey: ["org_overview", range],
        enabled: isOrgUser(),
        queryFn: async () => (await api.get("/org/aggregate/overview", { params: range })).data,
    });

    if (!isOrgUser()) return <div className="p-10 text-center text-slate-400">Organization sign-in required. <Link to="/org/login" className="text-[#5C67F2] font-bold">Sign in</Link></div>;

    const enroll = data?.enrollment, fees = data?.fees, fin = data?.finance, staff = data?.staff;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#5C67F2] text-white flex items-center justify-center"><Layers className="w-6 h-6" /></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">{user?.organizationName || "Organization"} — All Branches</h1>
                        <p className="text-sm text-slate-400">Combined view across {data?.branchCount ?? "…"} branches.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link to="/org/transfers" className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><ArrowRightLeft className="w-4 h-4" /> Transfers</Link>
                    <Link to="/org/branches" className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Branches</Link>
                    <Link to="/org/reports" className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><FileBarChart className="w-4 h-4" /> Reports</Link>
                    <Link to="/org/expenses" className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Expenses</Link>
                    <Link to="/org/users" className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><Users className="w-4 h-4" /> Users</Link>
                    <Link to="/org/settings" className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><Settings className="w-4 h-4" /> Settings</Link>
                    <Link to="/org/audit" className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Audit</Link>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-slate-300" /></div>
            ) : (
                <>
                    {/* Headline metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Metric icon={GraduationCap} color="#5C67F2" label="Students" value={enroll?.totals?.students ?? 0} />
                        <Metric icon={Users} color="#0EA5E9" label="Staff" value={staff?.totals?.staff ?? 0} />
                        <Metric icon={Wallet} color="#10B981" label="Fees Collected" value={ksh(fees?.totals?.collected)} />
                        <Metric icon={TrendingUp} color="#F59E0B" label="Net (Inc − Exp)" value={ksh(fin?.totals?.net)} />
                    </div>

                    {/* Per-branch breakdown table */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100"><h2 className="font-black text-slate-700 text-sm">Branch Breakdown</h2></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">
                                    <th className="text-left px-4 py-3 font-black">Branch</th>
                                    <th className="text-right px-4 py-3 font-black">Students</th>
                                    <th className="text-right px-4 py-3 font-black">Staff</th>
                                    <th className="text-right px-4 py-3 font-black">Fees Collected</th>
                                    <th className="text-right px-4 py-3 font-black">Income</th>
                                    <th className="text-right px-4 py-3 font-black">Expense</th>
                                    <th className="text-right px-4 py-3 font-black">Net</th>
                                </tr></thead>
                                <tbody>
                                    {(enroll?.branches || []).map((b: any) => {
                                        const s = staff?.branches?.find((x: any) => x.branchId === b.branchId);
                                        const f = fees?.branches?.find((x: any) => x.branchId === b.branchId);
                                        const fi = fin?.branches?.find((x: any) => x.branchId === b.branchId);
                                        return (
                                            <tr key={b.branchId} className="border-b border-slate-50">
                                                <td className="px-4 py-3 font-bold text-slate-700">{b.branchName}</td>
                                                <td className="px-4 py-3 text-right">{b.students}</td>
                                                <td className="px-4 py-3 text-right">{s?.staff ?? 0}</td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-700">{ksh(f?.collected)}</td>
                                                <td className="px-4 py-3 text-right">{ksh(fi?.income)}</td>
                                                <td className="px-4 py-3 text-right">{ksh(fi?.expense)}</td>
                                                <td className={`px-4 py-3 text-right font-black ${(fi?.net ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{ksh(fi?.net)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot><tr className="bg-slate-50 font-black text-slate-800">
                                    <td className="px-4 py-3">Total</td>
                                    <td className="px-4 py-3 text-right">{enroll?.totals?.students ?? 0}</td>
                                    <td className="px-4 py-3 text-right">{staff?.totals?.staff ?? 0}</td>
                                    <td className="px-4 py-3 text-right text-emerald-700">{ksh(fees?.totals?.collected)}</td>
                                    <td className="px-4 py-3 text-right">{ksh(fin?.totals?.income)}</td>
                                    <td className="px-4 py-3 text-right">{ksh(fin?.totals?.expense)}</td>
                                    <td className="px-4 py-3 text-right">{ksh(fin?.totals?.net)}</td>
                                </tr></tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function Metric({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: any }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}1a`, color }}><Icon className="w-5 h-5" /></div>
            <div className="text-2xl font-black text-slate-800">{value}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</div>
        </div>
    );
}
