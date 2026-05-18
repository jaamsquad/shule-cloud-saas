import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
    Calendar, Users, Printer, Download, RefreshCw, 
    TrendingUp, Award, UserX, BookOpen, AlertTriangle, UserCheck 
} from "lucide-react";
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from "recharts";

interface StudentReportData {
    analytics: {
        total_days: number;
        present: number;
        absent: number;
        late: number;
        excused: number;
        percentage: number;
    };
    trend: { date: string; status: string }[];
    records: {
        id: string;
        date: string;
        day: string;
        period_name: string;
        status: string;
        check_in: string;
        remarks: string;
    }[];
}

interface LowAttendanceStudent {
    student_id: string;
    student_name: string;
    class_name: string;
    percentage: number;
    absent_count: number;
}

export default function StudentsAttendanceReport() {
    const [classId, setClassId] = useState("");
    const [studentId, setStudentId] = useState("");
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [activeTab, setActiveTab] = useState<"individual" | "low_attendance">("individual");
    const [threshold, setThreshold] = useState("75");

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ["classes_report_students"],
        queryFn: async () => {
            const r = await api.get("/classes");
            return r.data;
        }
    });

    useEffect(() => {
        if (classes.length > 0 && !classId) setClassId(classes[0]._id);
    }, [classes]);

    // Fetch students in selected class
    const { data: students = [] } = useQuery({
        queryKey: ["students_in_class", classId],
        queryFn: async () => {
            if (!classId) return [];
            const r = await api.get("/students", { params: { classId } });
            return r.data;
        },
        enabled: !!classId
    });

    useEffect(() => {
        if (students.length > 0) setStudentId(students[0]._id);
        else setStudentId("");
    }, [students]);

    // Fetch individual report
    const { data: reportData, isLoading, refetch, isFetching } = useQuery<StudentReportData | null>({
        queryKey: ["attendance_student_individual", studentId, classId, fromDate, toDate, statusFilter],
        queryFn: async () => {
            if (!studentId || !fromDate || !toDate) return null;
            const r = await api.get("/schools/default/attendance/reports/students", {
                params: { student_id: studentId, class_id: classId, from: fromDate, to: toDate, status: statusFilter }
            });
            return r.data?.data || null;
        },
        enabled: !!studentId && !!fromDate && !!toDate && activeTab === "individual"
    });

    // Fetch low attendance list
    const { data: lowAttendanceList = [], isLoading: loadingLow, refetch: refetchLow } = useQuery<LowAttendanceStudent[]>({
        queryKey: ["attendance_low_students", classId, threshold, fromDate, toDate],
        queryFn: async () => {
            if (!classId || !fromDate || !toDate) return [];
            const r = await api.get("/schools/default/attendance/reports/students/low-attendance", {
                params: { class_id: classId, threshold, from: fromDate, to: toDate }
            });
            return r.data?.data || [];
        },
        enabled: !!classId && !!fromDate && !!toDate && activeTab === "low_attendance"
    });

    const handleExport = async (format: "pdf" | "excel") => {
        try {
            const r = await api.get("/schools/default/attendance/reports/students/export", {
                params: { student_id: studentId, class_id: classId, from: fromDate, to: toDate, format }
            });
            toast.success(`Exported successfully to ${format.toUpperCase()}`);
            window.open(r.data?.data?.download_url || "#", "_blank");
        } catch (e) {
            toast.error("Failed to export report");
        }
    };

    // Chart data mapping
    const chartData = [
        { name: "Present", count: reportData?.analytics.present || 0, color: "#10B981" },
        { name: "Absent", count: reportData?.analytics.absent || 0, color: "#F43F5E" },
        { name: "Late", count: reportData?.analytics.late || 0, color: "#F59E0B" },
        { name: "Excused", count: reportData?.analytics.excused || 0, color: "#3B82F6" },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <UserCheck className="w-7 h-7 text-[#5C67F2]" /> Students Attendance Report
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Deep dive analytics, visual trend distribution, and low attendance alerts</p>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => handleExport("pdf")} className="group relative bg-white hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-md">
                        <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
                        Export PDF
                        <span className="absolute -top-2 -right-2 text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full tracking-wide">A4</span>
                    </button>
                    <button onClick={() => handleExport("excel")} className="group relative bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border border-gray-200 hover:border-emerald-300 shadow-sm hover:shadow-md">
                        <Download className="w-4 h-4 transition-transform group-hover:scale-110" />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab("individual")}
                    className={`pb-3 px-4 text-sm font-extrabold transition-all border-b-2 ${activeTab === "individual" ? "border-[#5C67F2] text-[#5C67F2]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                    Individual Student Analytics
                </button>
                <button 
                    onClick={() => setActiveTab("low_attendance")}
                    className={`pb-3 px-4 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 ${activeTab === "low_attendance" ? "border-rose-500 text-rose-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                    <AlertTriangle className="w-4 h-4" /> Low Attendance Alerts
                </button>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Class</label>
                    <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none">
                        {classes.map((c: any) => {
                            const fullClassName = c.levelName ? `${c.levelName} ${c.streamName !== 'General' && c.streamName ? c.streamName : ''}`.trim() : (c.name || "Class");
                            return <option key={c._id} value={c._id}>{fullClassName}</option>;
                        })}
                    </select>
                </div>

                {activeTab === "individual" ? (
                    <>
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Student</label>
                            <select value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none">
                                {students.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.studentName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status Filter</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none">
                                <option value="ALL">All Statuses</option>
                                <option value="PRESENT">Present Only</option>
                                <option value="ABSENT">Absent Only</option>
                                <option value="LATE">Late Only</option>
                                <option value="EXCUSED">Excused Only</option>
                            </select>
                        </div>
                    </>
                ) : (
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Alert Threshold %</label>
                        <select value={threshold} onChange={e => setThreshold(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-rose-500 outline-none">
                            <option value="90">Below 90%</option>
                            <option value="85">Below 85%</option>
                            <option value="80">Below 80%</option>
                            <option value="75">Below 75%</option>
                            <option value="70">Below 70%</option>
                            <option value="60">Below 60%</option>
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">From Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">To Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none" />
                    </div>
                </div>

                <button onClick={() => activeTab === "individual" ? refetch() : refetchLow()} disabled={isFetching || loadingLow} className="w-full h-11 bg-[#5C67F2] hover:bg-[#4b54db] text-white font-extrabold rounded-xl shadow-md shadow-[#5C67F2]/20 flex items-center justify-center gap-2 transition-all text-sm md:col-span-5">
                    <RefreshCw className={`w-4 h-4 ${isFetching || loadingLow ? 'animate-spin' : ''}`} />
                    {activeTab === "individual" ? "Generate Individual Report" : "Scan Low Attendance Alerts"}
                </button>
            </div>

            {/* TAB 1: INDIVIDUAL STUDENT ANALYTICS */}
            {activeTab === "individual" && reportData && (
                <div className="space-y-6">
                    {/* Summary Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { icon: <BookOpen className="w-5 h-5" />, bg: "bg-indigo-50 text-[#5C67F2]", label: "Total Days Evaluated", value: `${reportData.analytics.total_days} days` },
                            { icon: <TrendingUp className="w-5 h-5" />, bg: "bg-emerald-50 text-emerald-500", label: "Present Count", value: `${reportData.analytics.present} days` },
                            { icon: <UserX className="w-5 h-5" />, bg: "bg-rose-50 text-rose-500", label: "Absent Count", value: `${reportData.analytics.absent} days` },
                            { icon: <Award className="w-5 h-5" />, bg: "bg-amber-50 text-amber-500", label: "Attendance %", value: `${reportData.analytics.percentage}%` },
                        ].map(({ icon, bg, label, value }) => (
                            <div key={label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>{icon}</div>
                                <div className="overflow-hidden">
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{label}</p>
                                    <h4 className="text-lg font-extrabold text-gray-800 mt-0.5 leading-tight truncate">{value}</h4>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Visual Chart & Detailed Records */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Status Distribution Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                            <h3 className="font-extrabold text-gray-900 text-base">Status Distribution</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} />
                                        <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: 'rgba(92, 103, 242, 0.05)' }} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Detailed Records Table */}
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-extrabold text-gray-900 text-base">Attendance Records Log</h3>
                                <span className="text-xs font-bold text-gray-500">{reportData.records.length} records found</span>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar max-h-[400px]">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500 sticky top-0 bg-gray-50 z-10">
                                            <th className="py-3 px-6 w-12 text-center">#</th>
                                            <th className="py-3 px-6 w-32">Date</th>
                                            <th className="py-3 px-6 w-28">Day</th>
                                            <th className="py-3 px-6 w-32">Scope</th>
                                            <th className="py-3 px-6 w-28 text-center">Status</th>
                                            <th className="py-3 px-6 w-28 text-center">Check In</th>
                                            <th className="py-3 px-6">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.records.map((rec, idx) => {
                                            const statusColors: Record<string, string> = {
                                                PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
                                                ABSENT: "bg-rose-50 text-rose-700 border-rose-200",
                                                LATE: "bg-amber-50 text-amber-700 border-amber-200",
                                                EXCUSED: "bg-blue-50 text-blue-700 border-blue-200"
                                            };

                                            return (
                                                <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                    <td className="py-3 px-6 text-center font-bold text-xs text-gray-500">{idx + 1}</td>
                                                    <td className="py-3 px-6 font-mono text-xs font-bold text-gray-800">{rec.date}</td>
                                                    <td className="py-3 px-6 text-xs font-semibold text-gray-600">{rec.day}</td>
                                                    <td className="py-3 px-6 text-xs font-bold text-gray-700">{rec.period_name}</td>
                                                    <td className="py-3 px-6 text-center">
                                                        <span className={`font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border shadow-sm ${statusColors[rec.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                                            {rec.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-6 text-center font-mono text-xs font-semibold text-gray-600">{rec.check_in || "N/A"}</td>
                                                    <td className="py-3 px-6 text-xs text-gray-600 italic">{rec.remarks || "—"}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: LOW ATTENDANCE ALERTS */}
            {activeTab === "low_attendance" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-rose-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shadow-sm">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-gray-900 text-lg">Low Attendance Roster (Below {threshold}%)</h3>
                                <p className="text-xs text-rose-600 font-semibold mt-0.5">Students requiring immediate academic/parental intervention</p>
                            </div>
                        </div>
                        <span className="text-xs font-black bg-rose-600 text-white px-3 py-1.5 rounded-xl shadow-sm">
                            {lowAttendanceList.length} Students Alerted
                        </span>
                    </div>

                    {loadingLow ? (
                        <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-rose-500" /></div>
                    ) : lowAttendanceList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                            <Award className="w-12 h-12 text-emerald-400" />
                            <p className="text-base font-bold text-gray-800">Excellent Class Attendance</p>
                            <p className="text-sm text-gray-500">No students found falling below the {threshold}% threshold.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500">
                                        <th className="py-4 px-6 w-12 text-center">#</th>
                                        <th className="py-4 px-6 min-w-[200px]">Student Name</th>
                                        <th className="py-4 px-6 w-40">Class</th>
                                        <th className="py-4 px-6 w-32 text-center text-rose-600">Absent Days</th>
                                        <th className="py-4 px-6 w-32 text-center">Current %</th>
                                        <th className="py-4 px-6 w-32 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowAttendanceList.map((student, idx) => (
                                        <tr key={student.student_id} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                                            <td className="py-4 px-6 text-center font-bold text-sm text-gray-500">{idx + 1}</td>
                                            <td className="py-4 px-6 font-bold text-sm text-gray-900">{student.student_name}</td>
                                            <td className="py-4 px-6 text-xs font-semibold text-gray-600">{student.class_name}</td>
                                            <td className="py-4 px-6 text-center font-bold text-sm text-rose-600">{student.absent_count}</td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="font-extrabold text-xs px-3 py-1 rounded-full border shadow-sm bg-rose-50 text-rose-700 border-rose-200">
                                                    {student.percentage}%
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button 
                                                    onClick={() => {
                                                        setStudentId(student.student_id);
                                                        setActiveTab("individual");
                                                    }}
                                                    className="h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 mx-auto transition-colors shadow-sm"
                                                >
                                                    Deep Dive
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
