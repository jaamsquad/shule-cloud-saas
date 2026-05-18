import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
    Calendar, Users, Printer, Download, RefreshCw, 
    TrendingUp, Award, UserX, BookOpen, ChevronRight, X 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ClassSummaryData {
    summary: {
        total_school_days: number;
        average_percentage: number;
        most_absent: { student_name: string; absent_count: number };
        perfect_attendance_count: number;
    };
    students: {
        student_id: string;
        student_name: string;
        admission_no: string;
        total_days: number;
        present: number;
        absent: number;
        late: number;
        excused: number;
        percentage: number;
    }[];
}

interface HeatmapDay {
    date: string;
    day: string;
    status: string;
    holiday_name?: string;
}

export default function ClassWiseReport() {
    const [classId, setClassId] = useState("");
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ["classes_report"],
        queryFn: async () => {
            const r = await api.get("/classes");
            return r.data;
        }
    });

    useEffect(() => {
        if (classes.length > 0 && !classId) setClassId(classes[0]._id);
    }, [classes]);

    // Fetch report data
    const { data: reportData, isLoading, refetch, isFetching } = useQuery<ClassSummaryData | null>({
        queryKey: ["attendance_class_wise", classId, fromDate, toDate],
        queryFn: async () => {
            if (!classId || !fromDate || !toDate) return null;
            const r = await api.get("/schools/default/attendance/reports/class-wise", {
                params: { class_id: classId, from: fromDate, to: toDate }
            });
            return r.data?.data || null;
        },
        enabled: !!classId && !!fromDate && !!toDate
    });

    // Fetch heatmap data for selected student
    const { data: heatmapData = [], isLoading: loadingHeatmap } = useQuery<HeatmapDay[]>({
        queryKey: ["attendance_heatmap", classId, selectedStudent?.id, fromDate, toDate],
        queryFn: async () => {
            if (!classId || !selectedStudent?.id || !fromDate || !toDate) return [];
            const r = await api.get("/schools/default/attendance/reports/class-wise/heatmap", {
                params: { class_id: classId, student_id: selectedStudent.id, from: fromDate, to: toDate }
            });
            return r.data?.data || [];
        },
        enabled: !!selectedStudent
    });

    const handleExport = async (format: "pdf" | "excel") => {
        try {
            const r = await api.get("/schools/default/attendance/reports/class-wise/export", {
                params: { class_id: classId, from: fromDate, to: toDate, format }
            });
            toast.success(`Exported successfully to ${format.toUpperCase()}`);
            window.open(r.data?.data?.download_url || "#", "_blank");
        } catch (e) {
            toast.error("Failed to export report");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-7 h-7 text-[#5C67F2]" /> Class-wise Attendance Report
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Aggregate attendance metrics, percentage trends, and student heatmaps</p>
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

            {/* Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Class</label>
                    <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none">
                        {classes.map((c: any) => {
                            const fullClassName = c.levelName ? `${c.levelName} ${c.streamName !== 'General' && c.streamName ? c.streamName : ''}`.trim() : (c.name || "Class");
                            return <option key={c._id} value={c._id}>{fullClassName}</option>;
                        })}
                    </select>
                </div>
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
                <button onClick={() => refetch()} disabled={isFetching} className="w-full h-11 bg-[#5C67F2] hover:bg-[#4b54db] text-white font-extrabold rounded-xl shadow-md shadow-[#5C67F2]/20 flex items-center justify-center gap-2 transition-all text-sm">
                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    Generate Report
                </button>
            </div>

            {/* Summary Metrics Cards */}
            {reportData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { icon: <BookOpen className="w-5 h-5" />, bg: "bg-indigo-50 text-[#5C67F2]", label: "Total School Days", value: `${reportData.summary.total_school_days} days` },
                        { icon: <TrendingUp className="w-5 h-5" />, bg: "bg-emerald-50 text-emerald-500", label: "Average Attendance", value: `${reportData.summary.average_percentage}%` },
                        { icon: <UserX className="w-5 h-5" />, bg: "bg-rose-50 text-rose-500", label: "Most Absent Student", value: reportData.summary.most_absent.student_name, sub: `${reportData.summary.most_absent.absent_count} absences` },
                        { icon: <Award className="w-5 h-5" />, bg: "bg-amber-50 text-amber-500", label: "Perfect Attendance", value: `${reportData.summary.perfect_attendance_count} students` },
                    ].map(({ icon, bg, label, value, sub }) => (
                        <div key={label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>{icon}</div>
                            <div className="overflow-hidden">
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{label}</p>
                                <h4 className="text-lg font-extrabold text-gray-800 mt-0.5 leading-tight truncate">{value}</h4>
                                {sub && <p className="text-[10px] text-rose-600 font-semibold mt-0.5">{sub}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Report Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading || isFetching ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                        <RefreshCw className="w-8 h-8 animate-spin text-[#5C67F2]" />
                        <p className="text-sm font-bold">Analyzing class attendance data...</p>
                    </div>
                ) : !reportData || reportData.students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p className="text-base font-bold text-gray-800">No Report Data Available</p>
                        <p className="text-sm text-gray-500">Select a class and date range to generate report.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500">
                                    <th className="py-4 px-6 w-12 text-center">#</th>
                                    <th className="py-4 px-6 min-w-[200px]">Student Name</th>
                                    <th className="py-4 px-6 w-32">Admission No</th>
                                    <th className="py-4 px-6 w-24 text-center">Total Days</th>
                                    <th className="py-4 px-6 w-24 text-center text-emerald-600">Present</th>
                                    <th className="py-4 px-6 w-24 text-center text-rose-600">Absent</th>
                                    <th className="py-4 px-6 w-24 text-center text-amber-600">Late</th>
                                    <th className="py-4 px-6 w-24 text-center text-blue-600">Excused</th>
                                    <th className="py-4 px-6 w-32 text-center">Attendance %</th>
                                    <th className="py-4 px-6 w-28 text-center">Heatmap</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.students.map((student, idx) => {
                                    const badgeColor = student.percentage >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                       student.percentage >= 75 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                       "bg-rose-50 text-rose-700 border-rose-200";

                                    return (
                                        <tr key={student.student_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-6 text-center font-bold text-sm text-gray-500">{idx + 1}</td>
                                            <td className="py-4 px-6">
                                                <div className="font-bold text-sm text-gray-900">{student.student_name}</div>
                                            </td>
                                            <td className="py-4 px-6 font-mono text-xs font-semibold text-gray-500">{student.admission_no}</td>
                                            <td className="py-4 px-6 text-center font-bold text-sm text-gray-700">{student.total_days}</td>
                                            <td className="py-4 px-6 text-center font-bold text-sm text-emerald-600">{student.present}</td>
                                            <td className="py-4 px-6 text-center font-bold text-sm text-rose-600">{student.absent}</td>
                                            <td className="py-4 px-6 text-center font-bold text-sm text-amber-600">{student.late}</td>
                                            <td className="py-4 px-6 text-center font-bold text-sm text-blue-600">{student.excused}</td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`font-extrabold text-xs px-3 py-1 rounded-full border shadow-sm ${badgeColor}`}>
                                                    {student.percentage}%
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button 
                                                    onClick={() => setSelectedStudent({ id: student.student_id, name: student.student_name })}
                                                    className="h-8 px-3 bg-indigo-50 hover:bg-indigo-100 text-[#5C67F2] rounded-lg text-xs font-bold flex items-center justify-center gap-1 mx-auto transition-colors border border-indigo-200 shadow-sm"
                                                >
                                                    View <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Heatmap Drawer / Modal */}
            <AnimatePresence>
                {selectedStudent && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-extrabold text-gray-900">Attendance Heatmap: {selectedStudent.name}</h3>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Day-by-day status breakdown ({fromDate} to {toDate})</p>
                                </div>
                                <button onClick={() => setSelectedStudent(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                                {loadingHeatmap ? (
                                    <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                                        {heatmapData.map((day, idx) => {
                                            const statusColors: Record<string, string> = {
                                                PRESENT: "bg-emerald-50 border-emerald-200 text-emerald-800",
                                                ABSENT: "bg-rose-50 border-rose-200 text-rose-800",
                                                LATE: "bg-amber-50 border-amber-200 text-amber-800",
                                                EXCUSED: "bg-blue-50 border-blue-200 text-blue-800",
                                                HOLIDAY: "bg-purple-50 border-purple-200 text-purple-800",
                                                WEEKEND: "bg-gray-100 border-gray-200 text-gray-500"
                                            };

                                            return (
                                                <div key={idx} className={`p-3 rounded-2xl border flex flex-col justify-between h-24 shadow-sm ${statusColors[day.status] || "bg-gray-50 border-gray-200 text-gray-600"}`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">{day.day.substring(0, 3)}</span>
                                                        <span className="text-xs font-mono font-bold">{day.date.substring(5)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-extrabold tracking-wide truncate">{day.status}</p>
                                                        {day.holiday_name && <p className="text-[9px] font-semibold truncate opacity-80">{day.holiday_name}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100 justify-center text-xs font-bold text-gray-600">
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Present</div>
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Absent</div>
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Late</div>
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Excused</div>
                                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Holiday</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
