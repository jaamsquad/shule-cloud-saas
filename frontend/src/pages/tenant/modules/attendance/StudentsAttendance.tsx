import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
    Calendar, Users, Check, X, Clock, AlertCircle, 
    Save, RefreshCw, CheckCircle2, UserCheck, ShieldAlert 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StudentAttendanceRecord {
    student_id: string;
    student_name: string;
    admission_no: string;
    avatar_url: string | null;
    attendance: {
        id: string;
        status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
        check_in: string | null;
        remarks: string;
    } | null;
}

export default function StudentsAttendance() {
    const queryClient = useQueryClient();
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [classId, setClassId] = useState("");
    const [periodId, setPeriodId] = useState("");
    const [records, setRecords] = useState<Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks: string }>>({});
    const [isDirty, setIsDirty] = useState(false);

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ["classes_attendance"],
        queryFn: async () => {
            const r = await api.get("/classes");
            return r.data;
        }
    });

    // Fetch periods (optional)
    const { data: periods = [] } = useQuery({
        queryKey: ["periods_attendance"],
        queryFn: async () => {
            const r = await api.get("/timetable_periods");
            return r.data;
        }
    });

    // Auto-select first class
    useEffect(() => {
        if (classes.length > 0 && !classId) {
            setClassId(classes[0]._id);
        }
    }, [classes]);

    // Check existing attendance status
    const { data: checkStatus, refetch: refetchCheck } = useQuery({
        queryKey: ["attendance_students_check", date, classId],
        queryFn: async () => {
            if (!classId || !date) return null;
            const r = await api.get("/schools/default/attendance/students/check", {
                params: { date, class_id: classId }
            });
            return r.data?.data;
        },
        enabled: !!classId && !!date
    });

    // Fetch students & attendance
    const { data: studentsData = [], isLoading: loadingStudents, refetch: refetchStudents, isFetching } = useQuery<StudentAttendanceRecord[]>({
        queryKey: ["attendance_students_list", date, classId, periodId],
        queryFn: async () => {
            if (!classId || !date) return [];
            const r = await api.get("/schools/default/attendance/students", {
                params: { date, class_id: classId, period_id: periodId || undefined }
            });
            return r.data?.data || [];
        },
        enabled: !!classId && !!date
    });

    // Sync state with fetched data
    useEffect(() => {
        const initialMap: Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks: string }> = {};
        studentsData.forEach(s => {
            if (s.attendance) {
                initialMap[s.student_id] = { status: s.attendance.status, remarks: s.attendance.remarks || "" };
            } else {
                initialMap[s.student_id] = { status: "PRESENT", remarks: "" }; // default
            }
        });
        setRecords(prev => {
            if (JSON.stringify(prev) === JSON.stringify(initialMap)) {
                return prev;
            }
            setIsDirty(false);
            return initialMap;
        });
    }, [studentsData]);

    // Bulk save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                date,
                class_id: classId,
                period_id: periodId || null,
                records: Object.entries(records).map(([student_id, val]) => ({
                    student_id,
                    status: val.status,
                    remarks: val.remarks
                }))
            };
            const r = await api.post("/schools/default/attendance/students/bulk", payload);
            return r.data;
        },
        onSuccess: () => {
            toast.success("Attendance saved successfully!");
            setIsDirty(false);
            refetchCheck();
            queryClient.invalidateQueries({ queryKey: ["attendance_students_list"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.errors?.[0]?.message || "Failed to save attendance");
        }
    });

    // Status updater
    const updateStatus = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") => {
        setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
        setIsDirty(true);
    };

    // Remarks updater
    const updateRemarks = (studentId: string, remarks: string) => {
        setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }));
        setIsDirty(true);
    };

    // Bulk actions
    const markAll = (status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") => {
        const updated: Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks: string }> = {};
        studentsData.forEach(s => {
            updated[s.student_id] = { status, remarks: records[s.student_id]?.remarks || "" };
        });
        setRecords(updated);
        setIsDirty(true);
        toast.success(`Marked all students as ${status}`);
    };

    // Summary stats
    const stats = useMemo(() => {
        let present = 0, absent = 0, late = 0, excused = 0;
        Object.values(records).forEach(r => {
            if (r.status === "PRESENT") present++;
            if (r.status === "ABSENT") absent++;
            if (r.status === "LATE") late++;
            if (r.status === "EXCUSED") excused++;
        });
        return { present, absent, late, excused, total: Object.keys(records).length };
    }, [records]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Title & Status Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <UserCheck className="w-7 h-7 text-[#5C67F2]" /> Students Attendance
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Mark daily or lesson-based presence for academic classes</p>
                </div>
                
                {checkStatus?.already_marked ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-pulse" />
                        <div>
                            <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">Attendance Saved</p>
                            <p className="text-[11px] text-emerald-600 font-medium">Last saved: {new Date(checkStatus.marked_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <div>
                            <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Pending Roll Call</p>
                            <p className="text-[11px] text-amber-600 font-medium">Not marked for selected date</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Control Bar */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => { setDate(e.target.value); setIsDirty(false); }}
                                className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Class</label>
                        <select 
                            value={classId} 
                            onChange={e => { setClassId(e.target.value); setIsDirty(false); }}
                            className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none"
                        >
                            {classes.map((c: any) => {
                                const fullClassName = c.levelName ? `${c.levelName} ${c.streamName !== 'General' && c.streamName ? c.streamName : ''}`.trim() : (c.name || "Class");
                                return <option key={c._id} value={c._id}>{fullClassName}</option>;
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Period (Optional)</label>
                        <select 
                            value={periodId} 
                            onChange={e => { setPeriodId(e.target.value); setIsDirty(false); }}
                            className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none"
                        >
                            <option value="">Full Day Attendance</option>
                            {periods.filter((p: any) => p.type !== "BREAK").map((p: any) => (
                                <option key={p._id} value={p._id}>{p.name} ({p.start_time} - {p.end_time})</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={() => refetchStudents()}
                        disabled={isFetching}
                        className="w-full h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Load Students
                    </button>
                </div>

                {/* Summary Badges & Bulk Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Present: {stats.present}
                        </div>
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                            Absent: {stats.absent}
                        </div>
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            Late: {stats.late}
                        </div>
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                            Excused: {stats.excused}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => markAll("PRESENT")} className="h-9 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-colors">
                            <Check className="w-3.5 h-3.5" /> Mark All Present
                        </button>
                        <button onClick={() => markAll("ABSENT")} className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition-colors">
                            <X className="w-3.5 h-3.5" /> Mark All Absent
                        </button>
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loadingStudents || isFetching ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                        <RefreshCw className="w-8 h-8 animate-spin text-[#5C67F2]" />
                        <p className="text-sm font-bold">Loading student roster...</p>
                    </div>
                ) : studentsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p className="text-base font-bold text-gray-800">No Students Found</p>
                        <p className="text-sm text-gray-500">Select a class and click "Load Students" to view roster.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500">
                                    <th className="py-4 px-6 w-12 text-center">#</th>
                                    <th className="py-4 px-6 w-16">Photo</th>
                                    <th className="py-4 px-6">Student Name</th>
                                    <th className="py-4 px-6 w-32">Admission No</th>
                                    <th className="py-4 px-6 w-80 text-center">Status</th>
                                    <th className="py-4 px-6 w-64">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentsData.map((student, idx) => {
                                    const rec = records[student.student_id] || { status: "PRESENT", remarks: "" };
                                    const statusColors = {
                                        PRESENT: "bg-emerald-50/70 border-emerald-100 text-emerald-900",
                                        ABSENT: "bg-rose-50/70 border-rose-100 text-rose-900",
                                        LATE: "bg-amber-50/70 border-amber-100 text-amber-900",
                                        EXCUSED: "bg-blue-50/70 border-blue-100 text-blue-900"
                                    };

                                    return (
                                        <tr key={student.student_id} className={`border-b border-gray-50 last:border-0 transition-colors ${statusColors[rec.status]}`}>
                                            <td className="py-4 px-6 text-center font-bold text-sm text-gray-500">{idx + 1}</td>
                                            <td className="py-4 px-6">
                                                {student.avatar_url ? (
                                                    <img src={student.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-white shadow-sm" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-gray-200 border border-white shadow-sm flex items-center justify-center font-bold text-xs text-gray-600 uppercase">
                                                        {student.student_name.substring(0, 2)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="font-bold text-sm text-gray-900">{student.student_name}</div>
                                            </td>
                                            <td className="py-4 px-6 font-mono text-xs font-semibold text-gray-500">{student.admission_no}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-center gap-1.5 p-1 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm">
                                                    {[
                                                        { key: "PRESENT", label: "Present", color: "hover:bg-emerald-500 hover:text-white active:bg-emerald-600", active: "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold" },
                                                        { key: "ABSENT", label: "Absent", color: "hover:bg-rose-500 hover:text-white active:bg-rose-600", active: "bg-rose-500 text-white shadow-md shadow-rose-500/20 font-bold" },
                                                        { key: "LATE", label: "Late", color: "hover:bg-amber-500 hover:text-white active:bg-amber-600", active: "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold" },
                                                        { key: "EXCUSED", label: "Excused", color: "hover:bg-blue-500 hover:text-white active:bg-blue-600", active: "bg-blue-500 text-white shadow-md shadow-blue-500/20 font-bold" },
                                                    ].map(btn => (
                                                        <button
                                                            key={btn.key}
                                                            onClick={() => updateStatus(student.student_id, btn.key as any)}
                                                            className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all ${rec.status === btn.key ? btn.active : `text-gray-600 bg-transparent ${btn.color}`}`}
                                                        >
                                                            {btn.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <input 
                                                    type="text" 
                                                    placeholder="Add remark..."
                                                    value={rec.remarks}
                                                    onChange={e => updateRemarks(student.student_id, e.target.value)}
                                                    className="w-full h-9 px-3 bg-white/80 border border-gray-200 rounded-lg text-xs focus:border-[#5C67F2] outline-none"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Save Button Bar */}
            <div className="flex items-center justify-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                {isDirty && (
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-xs animate-bounce">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                        Unsaved changes pending
                    </div>
                )}
                <button
                    onClick={() => saveMutation.mutate()}
                    disabled={!isDirty || saveMutation.isPending}
                    className="h-12 px-8 bg-[#5C67F2] hover:bg-[#4b54db] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-extrabold rounded-xl shadow-lg shadow-[#5C67F2]/20 flex items-center gap-2 transition-all text-sm"
                >
                    <Save className="w-5 h-5" />
                    {saveMutation.isPending ? "Saving..." : "Save Attendance"}
                </button>
            </div>
        </div>
    );
}
