import { useEffect, useState } from "react";
import {
    BookOpen, Users, ClipboardList, Calendar, Bell,
    TrendingUp, ChevronRight, Video, FileText, CheckCircle2, Hand
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useModuleCrud } from "@/contexts/PermissionsContext";

export default function TeacherDashboardNew() {
    const navigate = useNavigate();
    const [teacher, setTeacher] = useState<any>(null);

    useEffect(() => {
        const user = localStorage.getItem("user");
        if (user) { try { setTeacher(JSON.parse(user)); } catch (_) {} }
    }, []);

    const examsCrud = useModuleCrud("exams");
    const attendanceCrud = useModuleCrud("attendance");
    const contentCrud = useModuleCrud("academics_content");

    const teacherName = teacher?.name || teacher?.email?.split("@")[0] || "Teacher";

    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => { const r = await api.get("/academics/classes"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: assignments = [] } = useQuery({ queryKey: ["academic_assignments"], queryFn: async () => { const r = await api.get("/academic_assignments?status=Published"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: announcements = [] } = useQuery({ queryKey: ["announcements"], queryFn: async () => { const r = await api.get("/announcements"); return Array.isArray(r.data) ? r.data.slice(0, 5) : []; } });
    const { data: timetableSlots = [] } = useQuery({ queryKey: ["timetable_slots"], queryFn: async () => { const r = await api.get("/timetable_slots"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: liveMeetings = [] } = useQuery({ queryKey: ["live_meetings"], queryFn: async () => { const r = await api.get("/live_meetings?status=active"); return Array.isArray(r.data) ? r.data : []; } });

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[new Date().getDay()];
    const todaySlots = timetableSlots
        .filter((s: any) => (s.day || "").toLowerCase() === today.toLowerCase())
        .sort((a: any, b: any) => (a.startTime || "").localeCompare(b.startTime || ""));

    const now = new Date();
    const greet = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

    const quickActions = [
        attendanceCrud.canCreate ? { label: "Take Attendance", path: "/attendance/students", icon: CheckCircle2, color: "bg-emerald-500 text-white" } : null,
        examsCrud.canUpdate ? { label: "Enter Marks", path: "/exams/marks", icon: TrendingUp, color: "bg-[#5C67F2] text-white" } : null,
        contentCrud.canCreate ? { label: "New Lesson Plan", path: "/academics/lesson-plans/new", icon: FileText, color: "bg-amber-500 text-white" } : null,
        { label: "Start Live Class", path: "/live", icon: Video, color: "bg-rose-500 text-white" },
        { label: "My Timetable", path: "/timetable/teacher", icon: Calendar, color: "bg-slate-700 text-white" },
        { label: "View Students", path: "/students", icon: Users, color: "bg-blue-500 text-white" },
    ].filter(Boolean) as any[];

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Welcome header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{greet}</p>
                        <h1 className="text-xl font-black text-slate-900">{teacherName} <Hand className="w-5 h-5 inline align-[-3px] text-slate-400" /></h1>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    <span className="px-3 py-1.5 bg-indigo-50 text-[#5C67F2] border border-indigo-100 rounded-2xl text-[9px] font-black uppercase tracking-widest">Teacher</span>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Students", value: students.length, icon: Users, color: "text-[#5C67F2]", bg: "bg-indigo-50", path: "/students" },
                        { label: "Classes", value: classes.length, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", path: "/classes" },
                        { label: "Assignments", value: assignments.length, icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50", path: "/academics/assignments" },
                        { label: "Live Meetings", value: liveMeetings.length, icon: Video, color: "text-rose-600", bg: "bg-rose-50", path: "/live" },
                    ].map(s => (
                        <button key={s.label} onClick={() => navigate(s.path)}
                            className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm text-left hover:shadow-md hover:border-indigo-100 transition-all">
                            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{s.label}</p>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Today's Timetable */}
                    <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#5C67F2]" /> Today's Classes — {today}
                            </h3>
                            <button onClick={() => navigate("/timetable/teacher")} className="text-[9px] text-[#5C67F2] font-black uppercase hover:underline flex items-center gap-1">
                                Full Timetable <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        {todaySlots.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-300 text-xs font-bold uppercase">
                                <Calendar className="w-8 h-8" />No classes scheduled today
                            </div>
                        ) : todaySlots.map((slot: any, i: number) => {
                            const startH = slot.startTime ? parseInt(slot.startTime.split(":")[0]) : -1;
                            const endH = slot.endTime ? parseInt(slot.endTime.split(":")[0]) : -1;
                            const curH = now.getHours();
                            const isNow = curH >= startH && curH < endH;
                            return (
                                <div key={slot._id || i} className={`flex items-center gap-4 p-4 rounded-2xl border mb-2 transition-all ${isNow ? "border-[#5C67F2] bg-indigo-50/30" : "border-slate-100 bg-slate-50"}`}>
                                    <div className={`w-1 h-10 rounded-full flex-shrink-0 ${isNow ? "bg-[#5C67F2]" : "bg-slate-200"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-800 text-sm">{slot.subject || slot.subjectName || "—"}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{slot.className || slot.class || "—"}{slot.room ? ` · Room ${slot.room}` : ""}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={`text-xs font-black ${isNow ? "text-[#5C67F2]" : "text-slate-600"}`}>{slot.startTime} – {slot.endTime}</p>
                                        {isNow && <span className="text-[8px] font-black text-[#5C67F2] uppercase animate-pulse">● Now</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Notices */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#5C67F2]" /> Notices
                        </h3>
                        {announcements.length === 0 ? (
                            <p className="text-slate-300 text-xs font-bold uppercase text-center py-8">No notices</p>
                        ) : announcements.map((a: any) => (
                            <div key={a._id} className={`p-3 rounded-2xl border mb-2 ${a.priority === "Urgent" ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${a.priority === "Urgent" ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-500"}`}>{a.priority || "Notice"}</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-800">{a.title}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5 line-clamp-2">{a.message}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {quickActions.map((action: any) => (
                            <button key={action.label} onClick={() => navigate(action.path)}
                                className={`${action.color} h-12 rounded-2xl font-black text-[9px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-95 shadow-md`}>
                                <action.icon className="w-3.5 h-3.5" />
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active assignments */}
                {assignments.length > 0 && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-[#5C67F2]" /> Active Assignments
                            </h3>
                            <button onClick={() => navigate("/academics/assignments")} className="text-[9px] text-[#5C67F2] font-black uppercase hover:underline flex items-center gap-1">
                                View All <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {assignments.slice(0, 4).map((a: any) => {
                                const overdue = a.dueDate && new Date(a.dueDate) < new Date();
                                return (
                                    <div key={a._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? "bg-rose-500" : "bg-amber-400"}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-800 truncate">{a.title}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{a.subjectName || "—"} · {a.className || "All"} · {a.totalMarks || 100} marks</p>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase flex-shrink-0 ${overdue ? "text-rose-500" : "text-amber-600"}`}>{a.dueDate || "Open"}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
