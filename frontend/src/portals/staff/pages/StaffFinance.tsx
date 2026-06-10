import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Banknote, TrendingUp, AlertTriangle, Wallet, ShieldCheck } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import { can } from "@/lib/permissions";
import type { StaffCtx } from "../StaffLayout";

const ksh = (n: number) => `KSh ${Number(n || 0).toLocaleString()}`;

export default function StaffFinance() {
    const { api, permissions } = useOutletContext<StaffCtx>();
    const allowed = can(permissions, "finance.view");

    const { data, isLoading } = useQuery({
        queryKey: ["staff_finance_summary"],
        queryFn: async () => (await api.get("/staff-portal/finance/summary")).data,
        enabled: allowed,
        retry: false,
    });

    if (!allowed) {
        return <PanelCard title="Access Denied"><div className="text-center py-10 text-slate-400"><ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm font-semibold">You don't have finance access.</p></div></PanelCard>;
    }

    const cards = [
        { label: "Today's Collections", value: ksh(data?.todayCollections), icon: Banknote, color: "#16a34a" },
        { label: "Total Collected", value: ksh(data?.totalCollected), icon: TrendingUp, color: "#0ea5e9" },
        { label: "Outstanding Balance", value: ksh(data?.outstanding), icon: Wallet, color: "#f59e0b" },
        { label: "Fee Defaulters", value: data?.defaulters ?? 0, icon: AlertTriangle, color: "#ef4444" },
    ];

    return (
        <>
            <PageTitle title="Fees & Payments" />
            {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading finance data…</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {cards.map(c => (
                            <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: c.color }}><c.icon className="w-5 h-5" /></div>
                                <p className="text-xl font-black text-slate-800">{c.value}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase">{c.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2">
                            <PanelCard title="Recent Payments">
                                {(!data?.recentPayments?.length) ? <p className="text-sm text-slate-400 text-center py-6">No payments recorded yet.</p> : (
                                    <div className="space-y-1">
                                        {data.recentPayments.map((p: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                                <div><p className="text-sm font-bold text-slate-700">{p.name || "—"}</p><p className="text-xs text-slate-400">{p.method || "Payment"}{p.reference ? ` · ${p.reference}` : ""}{p.date ? ` · ${new Date(p.date).toLocaleDateString("en-GB")}` : ""}</p></div>
                                                <span className="text-sm font-black text-emerald-600">{ksh(p.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </PanelCard>
                        </div>
                        <PanelCard title="Billing Overview">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm"><span className="text-slate-500">Total Billed</span><b className="text-slate-800">{ksh(data?.billed)}</b></div>
                                <div className="flex justify-between text-sm"><span className="text-slate-500">Total Paid</span><b className="text-emerald-600">{ksh(data?.paid)}</b></div>
                                <div className="flex justify-between text-sm border-t border-slate-100 pt-3"><span className="text-slate-500">Outstanding</span><b className="text-rose-600">{ksh(data?.outstanding)}</b></div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${data?.billed ? Math.min(100, (data.paid / data.billed) * 100) : 0}%` }} />
                                </div>
                                <p className="text-xs text-slate-400">{data?.billed ? Math.round((data.paid / data.billed) * 100) : 0}% collected</p>
                            </div>
                        </PanelCard>
                    </div>
                </>
            )}
        </>
    );
}
