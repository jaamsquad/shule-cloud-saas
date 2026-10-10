import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Presentation, Sprout, BookMarked, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import api from "@/lib/api";
import { usePermissions } from "@/contexts/PermissionsContext";
import Dashboard from "@/pages/tenant/modules/Dashboard";
import TeacherDashboardNew from "./TeacherDashboardNew";
import Exam844Dashboard from "./Exam844Dashboard";
import { CbcDashboard } from "@/pages/tenant/modules/cbc/CbcPages";
import { CbcTermProvider } from "@/pages/tenant/modules/cbc/cbcTerm";

/**
 * The dashboard, with a switcher between views:
 *   Admin  — the school overview (admins only)
 *   Teacher — timetable, assignments and the teacher's own subject classes' results
 *   CBC    — CBC assessment dashboard        (when CBC is switched on)
 *   8-4-4  — classes and published exam results (when 8-4-4 is switched on)
 * Admins get all of them; teachers who aren't admins get the Teacher view only; other staff
 * keep the overview filtered by their permissions. The choice is remembered on this device.
 */
type ViewKey = "admin" | "teacher" | "cbc" | "844";
const VIEWS: Record<ViewKey, { label: string; color: string; soft: string; icon: typeof ShieldCheck }> = {
    admin: { label: "Admin", color: "#1f2937", soft: "#f1f5f9", icon: ShieldCheck },
    teacher: { label: "Teacher", color: "#1f2937", soft: "#f1f5f9", icon: Presentation },
    cbc: { label: "CBC", color: "#1f2937", soft: "#f1f5f9", icon: Sprout },
    "844": { label: "8-4-4", color: "#1f2937", soft: "#f1f5f9", icon: BookMarked },
};
const STORE = "dashboard_view";

export default function RoleDashboard() {
    const perms = usePermissions();
    const { data: curricula = [] } = useQuery<{ code: string }[]>({
        queryKey: ["curricula_active"], staleTime: 60_000,
        queryFn: async () => { try { const r = await api.get("/curricula/active"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const active = new Set(curricula.map(c => String(c.code).toUpperCase()));

    const views: ViewKey[] = useMemo(() => {
        if (perms.isAdmin) return ["admin", "teacher", ...(active.has("CBC") ? ["cbc" as const] : []), ...(active.has("844") || !active.size ? ["844" as const] : [])];
        if (perms.isTeacher) return ["teacher"];
        return [];
    }, [perms.isAdmin, perms.isTeacher, curricula]); // eslint-disable-line react-hooks/exhaustive-deps

    const [view, setView] = useState<ViewKey | "">(() => { try { return (localStorage.getItem(STORE) as ViewKey) || ""; } catch { return ""; } });
    const current: ViewKey | null = views.length ? (views.includes(view as ViewKey) ? (view as ViewKey) : views[0]) : null;
    const pick = (v: ViewKey) => { setView(v); try { localStorage.setItem(STORE, v); } catch { /* private mode */ } };

    if (!perms.loaded) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading your dashboard...</p>
                </div>
            </div>
        );
    }
    // Other staff (bursar, librarian…): the overview, filtered by what they may see
    if (!current) return <Dashboard />;

    const body = current === "admin" ? <Dashboard />
        : current === "teacher" ? <><div className="px-4 sm:px-6 pt-4"><TeacherSubjectsCard /></div><TeacherDashboardNew /></>
        : current === "cbc" ? <div className="p-4 sm:p-6"><CbcTermProvider><CbcDashboard /></CbcTermProvider></div>
        : <div className="p-4 sm:p-6"><Exam844Dashboard /></div>;

    return (
        <div className="relative pb-24">
            {views.length > 1 && (
                <div className="px-4 sm:px-6 pt-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold rounded-full pl-1 pr-3 py-1" style={{ background: VIEWS[current].soft, color: VIEWS[current].color }}>
                        {(() => { const I = VIEWS[current].icon; return <span className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: VIEWS[current].color }}><I className="w-3.5 h-3.5" /></span>; })()}
                        {VIEWS[current].label} dashboard
                    </div>
                </div>
            )}
            {body}
            {views.length > 1 && (
                <nav aria-label="Dashboard view" className="fixed z-40 bottom-4 left-1/2 -translate-x-1/2 lg:left-[calc(50%+130px)] w-max whitespace-nowrap flex items-center gap-1 p-1.5 rounded-2xl bg-white/95 backdrop-blur shadow-lg" style={{ border: "0.5px solid #e5e7eb" }}>
                    {views.map(v => {
                        const m = VIEWS[v]; const on = v === current; const I = m.icon;
                        return (
                            <button key={v} onClick={() => pick(v)} aria-pressed={on} title={`${m.label} dashboard`}
                                className="h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors"
                                style={on ? { background: m.color, color: "#fff" } : { color: "#64748b" }}>
                                <I className="w-4 h-4" /><span className={on ? "" : "hidden sm:inline"}>{m.label}</span>
                            </button>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}

/** The signed-in teacher's subject classes with their latest published results. */
function TeacherSubjectsCard() {
    const nav = useNavigate();
    const { data, isLoading } = useQuery<{ assignments: { subject: string; className: string; stream: string; result: null | { exam: string; entries: number; meanMarks: number; meanPoints: number; grade: string; change: number | null } }[] }>({
        queryKey: ["dash_teacher"], queryFn: async () => (await api.get("/dashboard/teacher")).data,
    });
    const rows = data?.assignments || [];
    return (
        <div className="bg-white rounded-2xl p-4 sm:p-5" style={{ border: "0.5px solid #e5e7eb" }}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-[#1f2937]">My subject classes · latest published results</h3>
                <button onClick={() => nav("/exams/marks")} className="text-xs font-bold text-slate-600">Enter marks →</button>
            </div>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : !rows.length ? (
                <p className="text-sm text-slate-500">No subject classes assigned to you yet (Subjects → Teacher ↔ Subjects).</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {rows.map((r, i) => {
                        const ch = r.result?.change;
                        const Icon = ch === null || ch === undefined || ch === 0 ? Minus : ch > 0 ? ArrowUpRight : ArrowDownRight;
                        return (
                            <div key={i} className="rounded-xl p-3" style={{ border: "0.5px solid #e5e7eb", background: "#ffffff" }}>
                                <div className="flex items-start justify-between gap-2">
                                    <div><div className="font-black text-[#1f2937]">{r.subject}</div><div className="text-[11px] text-slate-500">{r.className}{r.stream ? ` ${r.stream}` : ""}</div></div>
                                    {r.result && <span className="text-lg font-black px-2 rounded-lg bg-white text-[#1f2937]" style={{ border: "0.5px solid #e5e7eb" }}>{r.result.grade}</span>}
                                </div>
                                {r.result ? (
                                    <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <span><b className="tabular-nums text-[#1f2937]">{r.result.meanPoints}</b> pts</span>
                                        <span><b className="tabular-nums text-[#1f2937]">{r.result.meanMarks}%</b></span>
                                        <span>{r.result.entries} students</span>
                                        <span className={`inline-flex items-center gap-0.5 font-bold ${!ch ? "text-slate-500" : ch > 0 ? "text-emerald-700" : "text-rose-700"}`}><Icon className="w-3.5 h-3.5" />{ch === null || ch === undefined ? "first" : `${ch > 0 ? "+" : ""}${ch}`}</span>
                                        <span className="w-full text-[10px] text-slate-400">{r.result.exam}</span>
                                    </div>
                                ) : <p className="text-[11px] text-slate-400 mt-2">No published results yet.</p>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
