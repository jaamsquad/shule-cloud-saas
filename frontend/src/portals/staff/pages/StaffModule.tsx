import { useParams, useOutletContext, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Briefcase, GraduationCap, Library, Bus, BedDouble, HeartPulse, BarChart3, ShieldCheck, Check, Loader2 } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import { can, permName } from "@/lib/permissions";
import type { StaffCtx } from "../StaffLayout";

const MODULES: Record<string, { title: string; icon: any; guard: string; capabilities: string[] }> = {
    accounting: { title: "Accounting", icon: Calculator, guard: "accounting.income", capabilities: ["accounting.income", "accounting.expenses", "accounting.payroll", "accounting.budget"] },
    hr: { title: "Human Resources", icon: Briefcase, guard: "hr.manage", capabilities: ["staff.view", "hr.manage", "accounting.payroll"] },
    admissions: { title: "Admissions", icon: GraduationCap, guard: "admissions.manage", capabilities: ["students.view", "students.manage", "admissions.manage"] },
    library: { title: "Library", icon: Library, guard: "library.manage", capabilities: ["library.manage"] },
    transport: { title: "Transport", icon: Bus, guard: "transport.manage", capabilities: ["transport.manage"] },
    boarding: { title: "Boarding", icon: BedDouble, guard: "boarding.manage", capabilities: ["boarding.manage", "attendance.view"] },
    health: { title: "Health / Clinic", icon: HeartPulse, guard: "health.manage", capabilities: ["health.manage"] },
    reports: { title: "Reports", icon: BarChart3, guard: "reports.view", capabilities: ["reports.view", "audit.view"] },
};

const CARD_COLORS = ["#16a34a", "#0ea5e9", "#f59e0b", "#7c3aed", "#ef4444"];

export default function StaffModule() {
    const { key } = useParams();
    const { api, permissions } = useOutletContext<StaffCtx>();
    const mod = key ? MODULES[key] : undefined;

    const { data, isLoading } = useQuery({
        queryKey: ["staff_module", key],
        queryFn: async () => (await api.get(`/staff-portal/module/${key}/summary`)).data,
        enabled: !!mod && can(permissions, mod?.guard || ""),
        retry: false,
    });

    if (!mod) return <Navigate to="/dashboard" replace />;
    if (!can(permissions, mod.guard)) {
        return (
            <PanelCard title="Access Denied">
                <div className="text-center py-10 text-slate-400"><ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm font-semibold">You don't have permission to access {mod.title}.</p></div>
            </PanelCard>
        );
    }

    const granted = mod.capabilities.filter(c => can(permissions, c));
    const stats: any[] = data?.stats || [];
    const recent: any[] = data?.recent || [];

    return (
        <>
            <PageTitle title={mod.title} />
            <div className="rounded-2xl p-6 mb-6 text-white flex items-center gap-3" style={{ background: "linear-gradient(135deg, #159a52, #0f2942)" }}>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><mod.icon className="w-6 h-6" /></div>
                <div><p className="font-black text-lg">{mod.title}</p><p className="text-white/80 text-sm">Live overview for your role.</p></div>
            </div>

            {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
            ) : (
                <>
                    {stats.length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {stats.map((s: any, i: number) => (
                                <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <div className="w-2.5 h-2.5 rounded-full mb-3" style={{ background: CARD_COLORS[i % CARD_COLORS.length] }} />
                                    <p className="text-xl font-black text-slate-800">{s.value}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2">
                            <PanelCard title="Recent Activity">
                                {recent.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No recent records.</p> : (
                                    <div className="space-y-1">
                                        {recent.map((r: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                                <div><p className="text-sm font-bold text-slate-700">{r.title}</p><p className="text-xs text-slate-400">{r.subtitle}</p></div>
                                                <span className="text-sm font-bold text-slate-600">{r.right}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </PanelCard>
                        </div>
                        <PanelCard title="What you can do here">
                            <div className="space-y-2">
                                {granted.map(c => <div key={c} className="flex items-center gap-2 text-sm text-slate-700"><Check className="w-4 h-4 text-emerald-500" /> {permName(c)}</div>)}
                            </div>
                        </PanelCard>
                    </div>
                </>
            )}
        </>
    );
}
