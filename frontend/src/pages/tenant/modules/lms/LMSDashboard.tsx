import { Home, BookOpen, Video, ClipboardList, Users, Plus, Play, FileText, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

export default function LMSDashboard() {
    const navigate = useNavigate();

    const { data: courses = [] } = useQuery({ queryKey: ["lms_courses"], queryFn: async () => { const r = await api.get("/lms_courses"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: quizzes = [] } = useQuery({ queryKey: ["lms_quizzes"], queryFn: async () => { const r = await api.get("/lms_quizzes"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: lessons = [] } = useQuery({ queryKey: ["lms_lessons"], queryFn: async () => { const r = await api.get("/lms_lessons"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: assignments = [] } = useQuery({ queryKey: ["academic_assignments"], queryFn: async () => { const r = await api.get("/academic_assignments"); return Array.isArray(r.data) ? r.data : []; } });

    const kpis = [
        { label: "Active Courses", value: courses.filter((c: any) => c.isActive !== false).length, icon: BookOpen, color: "text-[#5C67F2]", bg: "bg-indigo-50", path: "/lms/courses" },
        { label: "Video Lessons", value: lessons.filter((l: any) => l.type === "video").length, icon: Video, color: "text-rose-600", bg: "bg-rose-50", path: "/lms/lessons" },
        { label: "Active Quizzes", value: quizzes.filter((q: any) => q.status === "Published").length, icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50", path: "/lms/quizzes" },
        { label: "Assignments", value: assignments.filter((a: any) => a.status === "Published").length, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50", path: "/academics/assignments" },
    ];

    const quickActions = [
        { label: "Create Course", path: "/lms/courses/new", icon: BookOpen, color: "bg-[#5C67F2] text-white" },
        { label: "Add Video Lesson", path: "/lms/lessons/new", icon: Video, color: "bg-rose-500 text-white" },
        { label: "New Quiz", path: "/lms/quizzes/new", icon: ClipboardList, color: "bg-amber-500 text-white" },
        { label: "Start Live Class", path: "/live", icon: Zap, color: "bg-emerald-500 text-white" },
    ];

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">E-Learning / LMS</span>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-[#5C67F2]" /> Learning Management System
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Manage online courses, video lessons, quizzes, and learning materials</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {kpis.map(k => (
                        <button key={k.label} onClick={() => navigate(k.path)}
                            className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm text-left hover:shadow-md hover:border-indigo-100 transition-all">
                            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{k.label}</p>
                            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                        </button>
                    ))}
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {quickActions.map(a => (
                        <button key={a.label} onClick={() => navigate(a.path)}
                            className={`${a.color} h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:opacity-90 active:scale-95 shadow-md flex items-center justify-center gap-2`}>
                            <a.icon className="w-4 h-4" />{a.label}
                        </button>
                    ))}
                </div>

                {/* Recent courses */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center justify-between">
                            Recent Courses
                            <button onClick={() => navigate("/lms/courses")} className="text-[9px] text-[#5C67F2] font-black uppercase">View All</button>
                        </h3>
                        {courses.slice(0, 5).length === 0 ? (
                            <div className="text-center py-8"><p className="text-slate-300 text-xs font-bold uppercase">No courses yet</p>
                                <button onClick={() => navigate("/lms/courses/new")} className="mt-3 h-9 px-4 bg-[#5C67F2] text-white font-black text-[9px] uppercase rounded-xl">Create First Course</button></div>
                        ) : courses.slice(0, 5).map((c: any) => (
                            <div key={c._id} className="flex items-center gap-3 py-2.5 border-b border-slate-50">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0"><BookOpen className="w-4 h-4 text-[#5C67F2]" /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 truncate">{c.title}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{c.subjectName || "—"} · {c.className || "—"}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${c.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{c.isActive !== false ? "Active" : "Draft"}</span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center justify-between">
                            Recent Quizzes
                            <button onClick={() => navigate("/lms/quizzes")} className="text-[9px] text-[#5C67F2] font-black uppercase">View All</button>
                        </h3>
                        {quizzes.slice(0, 5).length === 0 ? (
                            <div className="text-center py-8"><p className="text-slate-300 text-xs font-bold uppercase">No quizzes yet</p>
                                <button onClick={() => navigate("/lms/quizzes/new")} className="mt-3 h-9 px-4 bg-amber-500 text-white font-black text-[9px] uppercase rounded-xl">Create First Quiz</button></div>
                        ) : quizzes.slice(0, 5).map((q: any) => (
                            <div key={q._id} className="flex items-center gap-3 py-2.5 border-b border-slate-50">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0"><ClipboardList className="w-4 h-4 text-amber-600" /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 truncate">{q.title}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{q.subjectName || "—"} · {(q.questions || []).length} questions</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${q.status === "Published" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{q.status || "Draft"}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
