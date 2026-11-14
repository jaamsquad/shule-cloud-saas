import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
    BookOpen, Users, GraduationCap, ClipboardCheck, TrendingUp, AlertTriangle,
    CalendarDays, FileWarning, Crown, Loader2, Building2, ChevronDown,
} from "lucide-react";
import api from "@/lib/api";

const GREEN = "#2E7D32";

// HOD home page. Aggregates one department into a single dashboard:
// subjects, teachers, students taking dept subjects, exams awaiting approval,
// average performance, teachers with missing marks, upcoming meetings, teaching
// progress and subject-by-subject charts. The department is resolved from the
// department list — defaulting to the one the current user heads.
export default function HODDashboard() {
    const [deptId, setDeptId] = useState<string>("");
    const [picker, setPicker] = useState(false);

    // Who am I? Read the logged-in user from localStorage to auto-select the
    // department this user heads (staff _id is stored as user.id).
    const myStaffId = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("user") || "{}")?.id || ""; } catch { return ""; }
    }, []);
    const { data: departments = [] } = useQuery({
        queryKey: ["departments_hod"],
        queryFn: async () => { const r = await api.get("/departments"); return Array.isArray(r.data) ? r.data : []; },
    });

    // Auto-pick: the department whose head is me, else the first department.
    useEffect(() => {
        if (deptId || departments.length === 0) return;
        const mine = departments.find((d: any) => myStaffId && String(d.headOfDepartment) === String(myStaffId));
        setDeptId((mine || departments[0])._id);
    }, [departments, myStaffId, deptId]);

    const dept = departments.find((d: any) => d._id === deptId);
    const { data, isLoading } = useQuery({
        queryKey: ["hod_dashboard", deptId],
        enabled: !!deptId,
        queryFn: async () => (await api.get(`/departments/${deptId}/hod-dashboard`)).data,
    });

    const c = data?.counts || {};
    const chartData = useMemo(() =>
        (data?.subjectPerformance || []).map((s: any) => ({ name: s.subject, value: s.meanPct, grade: s.grade })),
        [data]);
    const barColor = (v: number) => v >= 65 ? "#16a34a" : v >= 50 ? "#f59e0b" : "#dc2626";

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen">
            {/* Header */}
            <div className="text-white px-5 py-4 flex items-center justify-between" style={{ background: GREEN }}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                    <div>
                        <h1 className="text-lg font-black">HOD Dashboard</h1>
                        <p className="text-xs text-white/70">{dept?.name || "Department"}{data?.department?.head ? ` · HOD: ${data.department.head}` : ""}</p>
                    </div>
                </div>
                {/* Department switcher */}
                {departments.length > 0 && (
                    <div className="relative">
                        <button onClick={() => setPicker(p => !p)} className="h-9 px-3 rounded-lg bg-white/15 text-sm font-bold flex items-center gap-1.5 max-w-[16rem]">
                            <span className="truncate">{dept?.name || "Select department"}</span><ChevronDown className="w-4 h-4" />
                        </button>
                        {picker && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setPicker(false)} />
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-20 max-h-80 overflow-y-auto">
                                    {departments.map((d: any) => (
                                        <button key={d._id} onClick={() => { setDeptId(d._id); setPicker(false); }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${d._id === deptId ? "font-bold text-[#2E7D32]" : "text-slate-700"}`}>
                                            {d.name}{d.headName ? <span className="block text-[11px] text-slate-400">HOD: {d.headName}</span> : null}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="p-6 space-y-6">
                {isLoading || !data ? (
                    <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-slate-300" /></div>
                ) : (
                    <>
                        {/* Stat cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <Stat icon={BookOpen} label="Subjects" value={c.subjects ?? 0} tone="indigo" />
                            <Stat icon={Users} label="Teachers" value={c.teachers ?? 0} tone="indigo" />
                            <Stat icon={GraduationCap} label="Students" value={c.students ?? 0} tone="slate" />
                            <Stat icon={ClipboardCheck} label="Exams Awaiting Approval" value={c.examsAwaitingApproval ?? 0} tone="amber" />
                            <Stat icon={FileWarning} label="Teachers Missing Marks" value={c.teachersMissingMarks ?? 0} tone="rose" />
                            <Stat icon={CalendarDays} label="Upcoming Meetings" value={c.upcomingMeetings ?? 0} tone="emerald" />
                        </div>

                        {/* Average performance banner */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#2E7D3215" }}><TrendingUp className="w-6 h-6" style={{ color: GREEN }} /></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Department Average Performance</p>
                                    <p className="text-2xl font-black text-slate-800">{data.avgPerformance?.meanPct ?? 0}% <span className="text-lg" style={{ color: GREEN }}>· {data.avgPerformance?.grade || "—"}</span></p>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400">Across {data.subjectPerformance?.reduce((a: number, s: any) => a + s.entries, 0) || 0} mark entries in {data.subjectPerformance?.length || 0} subjects</div>
                        </div>

                        {/* Subject-by-subject performance chart */}
                        <Card title="Subject-by-Subject Performance">
                            {chartData.length === 0 ? (
                                <Empty msg="No marks recorded for this department's subjects yet." />
                            ) : (
                                <div style={{ height: Math.max(180, chartData.length * 38) }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(v: any, _n, p: any) => [`${v}% (${p.payload.grade})`, "Mean"]} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {chartData.map((d: any, i: number) => <Cell key={i} fill={barColor(d.value)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Teachers missing marks */}
                            <Card title={<span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /> Teachers Who Haven't Submitted Marks</span>}>
                                {(data.teachersMissingMarks || []).length === 0 ? (
                                    <Empty msg="All department teachers have submitted marks." />
                                ) : (
                                    <div className="space-y-1.5">
                                        {data.teachersMissingMarks.map((t: any) => (
                                            <div key={t.staffId} className="flex items-center justify-between border-b border-slate-50 py-2">
                                                <span className="text-sm font-bold text-slate-700">{t.staffName}</span>
                                                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{t.role || "Teacher"}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>

                            {/* Teachers assigned + upcoming meetings */}
                            <div className="space-y-6">
                                <Card title={<span className="flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Teachers Assigned</span>}>
                                    {(data.teachers || []).length === 0 ? <Empty msg="No teachers assigned yet." /> : (
                                        <div className="space-y-1.5">
                                            {data.teachers.map((t: any) => (
                                                <div key={t.staffId} className="flex items-center justify-between border-b border-slate-50 py-2">
                                                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">{t.staffName}{t.isHead && <Crown className="w-3.5 h-3.5 text-amber-500" />}</span>
                                                    <span className="text-[11px] text-slate-400">{t.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                <Card title={<span className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-emerald-500" /> Upcoming Meetings</span>}>
                                    {(data.upcomingMeetings || []).length === 0 ? <Empty msg="No upcoming meetings." /> : (
                                        <div className="space-y-1.5">
                                            {data.upcomingMeetings.map((m: any) => (
                                                <div key={m._id} className="border-b border-slate-50 py-2">
                                                    <p className="text-sm font-bold text-slate-700">{m.title}</p>
                                                    <p className="text-xs text-slate-400">{[m.date, m.time, m.venue].filter(Boolean).join(" · ")}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>

                        {/* Teaching progress */}
                        <Card title={<span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-500" /> Teaching Progress</span>}>
                            {!data.teachingProgress?.tracked ? (
                                <Empty msg="Schemes of work & lesson plans aren't tracked for this department yet." />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <ProgressRow label="Schemes of Work" total={data.teachingProgress.schemes.total} done={data.teachingProgress.schemes.completed} />
                                    <ProgressRow label="Lesson Plans" total={data.teachingProgress.lessonPlans.total} done={data.teachingProgress.lessonPlans.completed} />
                                    <div>
                                        <div className="flex justify-between text-sm mb-1"><span className="font-bold text-slate-700">Scheme Coverage</span><span className="text-xs text-slate-400">{data.teachingProgress.coverage ?? 0}%</span></div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${data.teachingProgress.coverage ?? 0}%`, background: GREEN }} /></div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}

const TONES: Record<string, string> = {
    indigo: "text-indigo-600", slate: "text-slate-800", amber: "text-amber-600",
    rose: "text-rose-600", emerald: "text-emerald-600",
};
function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: string }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 ${TONES[tone]}`} />
            </div>
            <p className={`text-2xl font-black ${TONES[tone]}`}>{value}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase leading-tight">{label}</p>
        </div>
    );
}
function Card({ title, children }: { title: any; children: any }) {
    return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 className="font-black text-slate-700 text-sm mb-3">{title}</h3>{children}</div>;
}
function Empty({ msg }: { msg: string }) {
    return <p className="text-sm text-slate-400 text-center py-8">{msg}</p>;
}
function ProgressRow({ label, total, done }: { label: string; total: number; done: number }) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1"><span className="font-bold text-slate-700">{label}</span><span className="text-xs text-slate-400">{done}/{total} · {pct}%</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: GREEN }} /></div>
        </div>
    );
}
