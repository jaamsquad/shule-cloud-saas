import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
    Calendar, Users, Check, X, Clock, AlertCircle, 
    Save, RefreshCw, CheckCircle2, UserCheck, Briefcase 
} from "lucide-react";

interface EmployeeAttendanceRecord {
    employee_id: string;
    employee_name: string;
    staff_id: string;
    role: string;
    department: string;
    avatar_url: string | null;
    attendance: {
        id: string;
        status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE";
        check_in: string | null;
        check_out: string | null;
        working_hours: number | null;
        remarks: string;
    } | null;
}

export default function EmployeesAttendance() {
    const queryClient = useQueryClient();
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [department, setDepartment] = useState("");
    const [role, setRole] = useState("");
    const [records, setRecords] = useState<Record<string, { 
        status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE"; 
        check_in: string; 
        check_out: string; 
        remarks: string;
    }>>({});
    const [isDirty, setIsDirty] = useState(false);

    // Check existing attendance status
    const { data: checkStatus, refetch: refetchCheck } = useQuery({
        queryKey: ["attendance_employees_check", date],
        queryFn: async () => {
            if (!date) return null;
            const r = await api.get("/schools/default/attendance/employees/check", { params: { date } });
            return r.data?.data;
        },
        enabled: !!date
    });

    // Fetch employees & attendance
    const { data: employeesData = [], isLoading: loadingEmployees, refetch: refetchEmployees, isFetching } = useQuery<EmployeeAttendanceRecord[]>({
        queryKey: ["attendance_employees_list", date, department, role],
        queryFn: async () => {
            if (!date) return [];
            const r = await api.get("/schools/default/attendance/employees", {
                params: { date, department: department || undefined, role: role || undefined }
            });
            return r.data?.data || [];
        },
        enabled: !!date
    });

    // Sync state with fetched data
    useEffect(() => {
        const initialMap: Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE"; check_in: string; check_out: string; remarks: string }> = {};
        employeesData.forEach(e => {
            if (e.attendance) {
                initialMap[e.employee_id] = { 
                    status: e.attendance.status, 
                    check_in: e.attendance.check_in || "07:50", 
                    check_out: e.attendance.check_out || "17:00", 
                    remarks: e.attendance.remarks || "" 
                };
            } else {
                initialMap[e.employee_id] = { status: "PRESENT", check_in: "07:50", check_out: "17:00", remarks: "" };
            }
        });
        setRecords(prev => {
            if (JSON.stringify(prev) === JSON.stringify(initialMap)) {
                return prev;
            }
            setIsDirty(false);
            return initialMap;
        });
    }, [employeesData]);

    // Bulk save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                date,
                records: Object.entries(records).map(([employee_id, val]) => ({
                    employee_id,
                    status: val.status,
                    check_in: val.check_in || null,
                    check_out: val.check_out || null,
                    remarks: val.remarks
                }))
            };
            const r = await api.post("/schools/default/attendance/employees/bulk", payload);
            return r.data;
        },
        onSuccess: () => {
            toast.success("Employee attendance saved successfully!");
            setIsDirty(false);
            refetchCheck();
            queryClient.invalidateQueries({ queryKey: ["attendance_employees_list"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.errors?.[0]?.message || "Failed to save employee attendance");
        }
    });

    // Quick checkout mutation
    const checkoutMutation = useMutation({
        mutationFn: async (arg: { record_id: string; check_out: string }) => {
            const r = await api.patch(`/schools/default/attendance/employees/${arg.record_id}/checkout`, { check_out: arg.check_out });
            return r.data;
        },
        onSuccess: () => {
            toast.success("Quick checkout successful!");
            queryClient.invalidateQueries({ queryKey: ["attendance_employees_list"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.errors?.[0]?.message || "Failed to checkout");
        }
    });

    // Status updater
    const updateStatus = (employeeId: string, status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE") => {
        setRecords(prev => ({ ...prev, [employeeId]: { ...prev[employeeId], status } }));
        setIsDirty(true);
    };

    // Time & remarks updaters
    const updateField = (employeeId: string, field: "check_in" | "check_out" | "remarks", val: string) => {
        setRecords(prev => ({ ...prev, [employeeId]: { ...prev[employeeId], [field]: val } }));
        setIsDirty(true);
    };

    // Bulk actions
    const markAll = (status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE") => {
        const updated: Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE"; check_in: string; check_out: string; remarks: string }> = {};
        employeesData.forEach(e => {
            updated[e.employee_id] = { 
                status, 
                check_in: records[e.employee_id]?.check_in || "07:50", 
                check_out: records[e.employee_id]?.check_out || "17:00", 
                remarks: records[e.employee_id]?.remarks || "" 
            };
        });
        setRecords(updated);
        setIsDirty(true);
        toast.success(`Marked all employees as ${status}`);
    };

    // Calculate working hours helper
    const calcHours = (inTime: string, outTime: string) => {
        if (!inTime || !outTime) return "N/A";
        const [inH, inM] = inTime.split(':').map(Number);
        const [outH, outM] = outTime.split(':').map(Number);
        const diff = (outH * 60 + outM) - (inH * 60 + inM);
        if (diff < 0) return "Invalid";
        return `${(diff / 60).toFixed(1)} hrs`;
    };

    // Summary stats
    const stats = useMemo(() => {
        let present = 0, absent = 0, late = 0, half = 0, leave = 0;
        Object.values(records).forEach(r => {
            if (r.status === "PRESENT") present++;
            if (r.status === "ABSENT") absent++;
            if (r.status === "LATE") late++;
            if (r.status === "HALF_DAY") half++;
            if (r.status === "ON_LEAVE") leave++;
        });
        return { present, absent, late, half, leave, total: Object.keys(records).length };
    }, [records]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Title & Status Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <Briefcase className="w-7 h-7 text-[#5C67F2]" /> Employees Attendance
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Track staff daily check-ins, check-outs, and working hours</p>
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
                            <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Pending Check-in</p>
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
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Department Filter</label>
                        <select 
                            value={department} 
                            onChange={e => { setDepartment(e.target.value); setIsDirty(false); }}
                            className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none"
                        >
                            <option value="">All Departments</option>
                            <option value="Academic">Academic</option>
                            <option value="Administrative">Administrative</option>
                            <option value="Support">Support</option>
                            <option value="Finance">Finance</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Role Filter</label>
                        <select 
                            value={role} 
                            onChange={e => { setRole(e.target.value); setIsDirty(false); }}
                            className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:border-[#5C67F2] outline-none"
                        >
                            <option value="">All Roles</option>
                            <option value="Teacher">Teacher</option>
                            <option value="HOD">HOD</option>
                            <option value="Principal">Principal</option>
                            <option value="Driver">Driver</option>
                            <option value="Cleaner">Cleaner</option>
                        </select>
                    </div>

                    <button 
                        onClick={() => refetchEmployees()}
                        disabled={isFetching}
                        className="w-full h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Load Employees
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
                        <div className="bg-purple-50 border border-purple-200 text-purple-700 px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                            Half Day: {stats.half}
                        </div>
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                            On Leave: {stats.leave}
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
                {loadingEmployees || isFetching ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                        <RefreshCw className="w-8 h-8 animate-spin text-[#5C67F2]" />
                        <p className="text-sm font-bold">Loading employee roster...</p>
                    </div>
                ) : employeesData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p className="text-base font-bold text-gray-800">No Employees Found</p>
                        <p className="text-sm text-gray-500">Adjust filters and click "Load Employees" to view roster.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500">
                                    <th className="py-4 px-6 w-12 text-center">#</th>
                                    <th className="py-4 px-6 w-16">Photo</th>
                                    <th className="py-4 px-6 min-w-[180px]">Employee Details</th>
                                    <th className="py-4 px-6 w-40">Department & Role</th>
                                    <th className="py-4 px-6 w-[420px] text-center">Status</th>
                                    <th className="py-4 px-6 w-32 text-center">Check In</th>
                                    <th className="py-4 px-6 w-32 text-center">Check Out</th>
                                    <th className="py-4 px-6 w-28 text-center">Hours</th>
                                    <th className="py-4 px-6 w-48">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeesData.map((emp, idx) => {
                                    const rec = records[emp.employee_id] || { status: "PRESENT", check_in: "07:50", check_out: "17:00", remarks: "" };
                                    const statusColors = {
                                        PRESENT: "bg-emerald-50/70 border-emerald-100 text-emerald-900",
                                        ABSENT: "bg-rose-50/70 border-rose-100 text-rose-900",
                                        LATE: "bg-amber-50/70 border-amber-100 text-amber-900",
                                        HALF_DAY: "bg-purple-50/70 border-purple-100 text-purple-900",
                                        ON_LEAVE: "bg-blue-50/70 border-blue-100 text-blue-900"
                                    };

                                    return (
                                        <tr key={emp.employee_id} className={`border-b border-gray-50 last:border-0 transition-colors ${statusColors[rec.status]}`}>
                                            <td className="py-4 px-6 text-center font-bold text-sm text-gray-500">{idx + 1}</td>
                                            <td className="py-4 px-6">
                                                {emp.avatar_url ? (
                                                    <img src={emp.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-white shadow-sm" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-gray-200 border border-white shadow-sm flex items-center justify-center font-bold text-xs text-gray-600 uppercase">
                                                        {emp.employee_name.substring(0, 2)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="font-bold text-sm text-gray-900">{emp.employee_name}</div>
                                                <div className="text-xs font-mono text-gray-500 mt-0.5">ID: {emp.staff_id}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="font-semibold text-xs text-gray-800">{emp.department}</div>
                                                <div className="text-[11px] text-gray-500 mt-0.5">{emp.role}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-center gap-1 p-1 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm">
                                                    {[
                                                        { key: "PRESENT", label: "Present", color: "hover:bg-emerald-500 hover:text-white active:bg-emerald-600", active: "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold" },
                                                        { key: "ABSENT", label: "Absent", color: "hover:bg-rose-500 hover:text-white active:bg-rose-600", active: "bg-rose-500 text-white shadow-md shadow-rose-500/20 font-bold" },
                                                        { key: "LATE", label: "Late", color: "hover:bg-amber-500 hover:text-white active:bg-amber-600", active: "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold" },
                                                        { key: "HALF_DAY", label: "Half", color: "hover:bg-purple-500 hover:text-white active:bg-purple-600", active: "bg-purple-500 text-white shadow-md shadow-purple-500/20 font-bold" },
                                                        { key: "ON_LEAVE", label: "Leave", color: "hover:bg-blue-500 hover:text-white active:bg-blue-600", active: "bg-blue-500 text-white shadow-md shadow-blue-500/20 font-bold" },
                                                    ].map(btn => (
                                                        <button
                                                            key={btn.key}
                                                            onClick={() => updateStatus(emp.employee_id, btn.key as any)}
                                                            className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all px-1.5 ${rec.status === btn.key ? btn.active : `text-gray-600 bg-transparent ${btn.color}`}`}
                                                        >
                                                            {btn.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <input 
                                                    type="time" 
                                                    value={rec.check_in}
                                                    onChange={e => updateField(emp.employee_id, "check_in", e.target.value)}
                                                    className="h-9 px-2 bg-white/80 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:border-[#5C67F2] outline-none w-24 text-center"
                                                />
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="time" 
                                                        value={rec.check_out}
                                                        onChange={e => updateField(emp.employee_id, "check_out", e.target.value)}
                                                        className="h-9 px-2 bg-white/80 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:border-[#5C67F2] outline-none w-24 text-center"
                                                    />
                                                    {emp.attendance && (
                                                        <button 
                                                            title="Quick Checkout Now"
                                                            onClick={() => {
                                                                const nowStr = new Date().toTimeString().substring(0, 5);
                                                                checkoutMutation.mutate({ record_id: emp.attendance!.id, check_out: nowStr });
                                                            }}
                                                            className="h-9 w-9 bg-white hover:bg-gray-100 text-gray-600 hover:text-indigo-600 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm transition-colors"
                                                        >
                                                            <Clock className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="font-mono font-bold text-xs bg-white/80 border border-gray-200 px-2.5 py-1.5 rounded-lg shadow-sm">
                                                    {calcHours(rec.check_in, rec.check_out)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <input 
                                                    type="text" 
                                                    placeholder="Add remark..."
                                                    value={rec.remarks}
                                                    onChange={e => updateField(emp.employee_id, "remarks", e.target.value)}
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
                    {saveMutation.isPending ? "Saving..." : "Save Employee Attendance"}
                </button>
            </div>
        </div>
    );
}
