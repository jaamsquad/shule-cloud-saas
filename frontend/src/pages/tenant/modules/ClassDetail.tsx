import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Home, ArrowLeft, Loader2, User, BookOpen, GraduationCap,
    Users, Mail, Phone, Briefcase
} from "lucide-react";
import api from "@/lib/api";

const tabs = ["Students", "Teacher", "Subjects"] as const;
type Tab = typeof tabs[number];

export default function ClassDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>("Students");

    const { data: classData, isLoading: isLoadingClass } = useQuery({
        queryKey: ["class-detail", id],
        queryFn: async () => {
            const r = await api.get("/academics/classes");
            return (r.data as any[]).find((c: any) => c._id === id);
        },
    });

    const { data: students = [] } = useQuery({
        queryKey: ["students"],
        queryFn: async () => { const r = await api.get("/students"); return r.data; },
    });

    const { data: subjects = [] } = useQuery({
        queryKey: ["subjects-all"],
        queryFn: async () => { const r = await api.get("/academics/subjects"); return r.data; },
    });

    const { data: staff = [] } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => { const r = await api.get("/staff"); return r.data; },
    });

    const className = classData?.name || classData?.levelName || "Class";
    const classStudents = students.filter((s: any) => s.studentClass === className || s.classId === id);
    
    const assignedSubIds = Array.isArray(classData?.subjects) ? classData.subjects.map((s: any) => s.subjectId) : [];
    const classSubjectsFromColl = subjects.filter((s: any) => 
        s.classId === id || 
        s.className === className || 
        s.class === className ||
        assignedSubIds.includes(s._id) ||
        (s.name && Array.isArray(classData?.subjects) && classData.subjects.some((sub: any) => sub.subjectName === s.name))
    );
    const existingIds = classSubjectsFromColl.map((s: any) => s._id);
    const extraSubjects = Array.isArray(classData?.subjects) 
        ? classData.subjects
            .filter((s: any) => !existingIds.includes(s.subjectId))
            .map((s: any) => ({
                _id: s.subjectId || Math.random().toString(),
                name: s.subjectName,
                code: s.code || s.subjectCode || "CORE",
                category: s.category || "Core"
            }))
        : [];
    const classSubjects = [...classSubjectsFromColl, ...extraSubjects];

    const teacher = classData?.classTeacher || staff.find((s: any) => s._id === (classData?.classTeacherId || classData?.classTeacher));


    if (isLoadingClass) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f4f7f6]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2] mx-auto mb-3" />
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest animate-pulse">Loading Class Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-sm mr-2">Classes</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- {className}</span>
            </div>

            <div className="px-6 pb-6">
                <button 
                    onClick={() => navigate("/classes")}
                    className="mb-4 px-4 py-1 bg-white border border-gray-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm"
                >
                    <ArrowLeft className="w-3 h-3" /> Back to Classes
                </button>

                {/* Class Header Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 mb-5 flex items-center gap-5">
                    <div className="w-11 h-11 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white shadow-md">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-lg font-black text-slate-800 tracking-tight">{className}</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {classStudents.length} Students • {classSubjects.length} Subjects • KES {classData?.monthlyFees || 0}/month
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-50 mb-5">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab 
                                    ? "bg-[#5C67F2] text-white shadow-md" 
                                    : "text-slate-400 hover:bg-slate-50"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in duration-300">

                    {/* Students Tab */}
                    {activeTab === "Students" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
                            {classStudents.length === 0 ? (
                                <div className="py-16 text-center">
                                    <Users className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No students enrolled in this class</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-50">
                                            <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                            <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Student Name</th>
                                            <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reg No.</th>
                                            <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Gender</th>
                                            <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classStudents.map((s: any, i: number) => (
                                            <tr key={s._id} className="border-b border-slate-50/80 hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-2.5 text-xs text-slate-300 font-bold">{i + 1}</td>
                                                <td className="px-5 py-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                            <User className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{s.studentName || `${s.firstName} ${s.lastName}`}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-2.5 text-xs text-slate-500 font-medium">{s.registrationNo || s.admissionNo || '—'}</td>
                                                <td className="px-5 py-2.5 text-xs text-slate-500 font-medium">{s.gender || '—'}</td>
                                                <td className="px-5 py-2.5">
                                                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-md text-[9px] font-black uppercase tracking-widest">Active</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Teacher Tab */}
                    {activeTab === "Teacher" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
                            {!teacher ? (
                                <div className="py-16 text-center">
                                    <User className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No teacher assigned to this class</p>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="w-20 h-20 bg-[#5C67F2]/10 rounded-2xl flex items-center justify-center text-[#5C67F2] shrink-0">
                                        <User className="w-10 h-10" strokeWidth={1.5} />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h3 className="text-base font-black text-slate-800 tracking-tight">
                                                {teacher.firstName ? `${teacher.firstName} ${teacher.lastName}` : (teacher.employeeName || teacher.name || "Unknown")}
                                            </h3>
                                            <p className="text-[9px] font-black text-[#5C67F2] uppercase tracking-widest">{teacher.designation || "Class Teacher"}</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
                                                <Mail className="w-4 h-4 text-slate-300" />
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Email</p>
                                                    <p className="text-xs font-bold text-slate-600">{teacher.email || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
                                                <Phone className="w-4 h-4 text-slate-300" />
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Phone</p>
                                                    <p className="text-xs font-bold text-slate-600">{teacher.phone || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
                                                <Briefcase className="w-4 h-4 text-slate-300" />
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Department</p>
                                                    <p className="text-xs font-bold text-slate-600">{teacher.department || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
                                                <GraduationCap className="w-4 h-4 text-slate-300" />
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Staff ID</p>
                                                    <p className="text-xs font-bold text-slate-600">{teacher.employeeId || teacher._id?.slice(-6) || "—"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Subjects Tab */}
                    {activeTab === "Subjects" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
                            {classSubjects.length === 0 ? (
                                <div className="py-16 text-center">
                                    <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No subjects assigned to this class</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-50">
                                            <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                            <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Subject Name</th>
                                            <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Code</th>
                                            <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classSubjects.map((s: any, i: number) => (
                                            <tr key={s._id} className="border-b border-slate-50/80 hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-2.5 text-xs text-slate-300 font-bold">{i + 1}</td>
                                                <td className="px-5 py-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-[#5C67F2]">
                                                            <BookOpen className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{s.name || s.subjectName || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-2.5 text-xs text-slate-500 font-medium">{s.code || s.subjectCode || '—'}</td>
                                                <td className="px-5 py-2.5 text-xs text-slate-500 font-medium">{s.category || s.type || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
