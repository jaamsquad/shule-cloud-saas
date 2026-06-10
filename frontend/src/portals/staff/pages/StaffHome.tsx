import { useOutletContext, Link } from "react-router-dom";
import {
    Users, CalendarClock, PencilLine, BarChart3, CalendarCheck, NotebookPen,
    Banknote, Calculator, Briefcase, GraduationCap, Library, Bus, BedDouble, HeartPulse, ShieldCheck,
} from "lucide-react";
import { PageTitle } from "../../PortalShell";
import { can, permName } from "@/lib/permissions";
import type { StaffCtx } from "../StaffLayout";

const CARDS: { perm: string; to: string; title: string; desc: string; icon: any; color: string }[] = [
    { perm: "academics.view", to: "/classes", title: "My Classes", desc: "Classes & subjects you teach", icon: Users, color: "#159a52" },
    { perm: "academics.view", to: "/timetable", title: "My Timetable", desc: "Your weekly schedule", icon: CalendarClock, color: "#0ea5e9" },
    { perm: "results.entry", to: "/marks", title: "Marks Entry", desc: "Enter exam marks", icon: PencilLine, color: "#7c3aed" },
    { perm: "results.view", to: "/results", title: "Results", desc: "Class & subject results", icon: BarChart3, color: "#f59e0b" },
    { perm: "attendance.mark", to: "/attendance", title: "Mark Attendance", desc: "Daily / subject attendance", icon: CalendarCheck, color: "#ef4444" },
    { perm: "content.manage", to: "/assignments", title: "Academic Content", desc: "Lesson plans, assignments, homework", icon: NotebookPen, color: "#0f2942" },
    { perm: "finance.view", to: "/module/finance", title: "Fees & Payments", desc: "Collections, invoices, wallets", icon: Banknote, color: "#16a34a" },
    { perm: "accounting.income", to: "/module/accounting", title: "Accounting", desc: "Income, expenses, budgets", icon: Calculator, color: "#0891b2" },
    { perm: "hr.manage", to: "/module/hr", title: "Human Resources", desc: "Staff & HR management", icon: Briefcase, color: "#9333ea" },
    { perm: "admissions.manage", to: "/module/admissions", title: "Admissions", desc: "Enrolments & registrations", icon: GraduationCap, color: "#2563eb" },
    { perm: "library.manage", to: "/module/library", title: "Library", desc: "Catalogue & circulation", icon: Library, color: "#ca8a04" },
    { perm: "transport.manage", to: "/module/transport", title: "Transport", desc: "Routes & vehicles", icon: Bus, color: "#dc2626" },
    { perm: "boarding.manage", to: "/module/boarding", title: "Boarding", desc: "Dormitories & boarders", icon: BedDouble, color: "#4f46e5" },
    { perm: "health.manage", to: "/module/health", title: "Health / Clinic", desc: "Medical records & visits", icon: HeartPulse, color: "#e11d48" },
    { perm: "reports.view", to: "/module/reports", title: "Reports", desc: "Analytics & exports", icon: BarChart3, color: "#475569" },
];

export default function StaffHome() {
    const { staff, permissions } = useOutletContext<StaffCtx>();
    const visible = CARDS.filter(c => can(permissions, c.perm));
    const roles: string[] = (staff as any).roles?.length ? (staff as any).roles : [staff.designation].filter(Boolean);

    return (
        <>
            <PageTitle title={`Welcome, ${staff.name}`} />

            <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: "linear-gradient(135deg, #159a52, #0f2942)" }}>
                <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-5 h-5" /> <p className="font-black text-lg">Your Workspace</p></div>
                <p className="text-white/80 text-sm">Your dashboard adapts to your role{roles.length > 1 ? "s" : ""}. You see only what you're permitted to.</p>
                <div className="flex flex-wrap gap-2 mt-3">
                    {roles.map((r: string) => <span key={r} className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{r}</span>)}
                </div>
            </div>

            {visible.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">No modules assigned to your role yet. Contact your administrator.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map(c => (
                        <Link key={c.to + c.title} to={c.to} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: c.color }}><c.icon className="w-5 h-5" /></div>
                            <p className="font-black text-slate-800">{c.title}</p>
                            <p className="text-xs text-slate-400">{c.desc}</p>
                        </Link>
                    ))}
                </div>
            )}

            <div className="mt-6 bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-xs font-black text-slate-400 uppercase mb-3">Your Permissions</p>
                <div className="flex flex-wrap gap-1.5">
                    {permissions.includes("*")
                        ? <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">Full access (all permissions)</span>
                        : permissions.length === 0
                            ? <span className="text-xs text-slate-400">No permissions assigned.</span>
                            : permissions.map(p => <span key={p} className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{permName(p)}</span>)}
                </div>
            </div>
        </>
    );
}
