import { useState } from "react";
import { Home, Check, Loader2, RefreshCw, Calendar, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const STATUS_OPTS = ["Present", "Absent", "Leave"];
const STATUS_COLORS: Record<string, string> = {
    Present: "bg-emerald-500 text-white",
    Absent: "bg-rose-500 text-white",
    Leave: "bg-amber-500 text-white",
};

export default function HostelAttendance() {
    const qc = useQueryClient();
    const today = new Date().toISOString().split("T")[0];
    const [date, setDate] = useState(today);
    const [selectedHostel, setSelectedHostel] = useState("");
    const [attendance, setAttendance] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const { data: hostels = [] } = useQuery({ queryKey: ["hostels"], queryFn: async () => { const r = await api.get("/hostels"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: allocations = [], isLoading, refetch } = useQuery({
        queryKey: ["hostel_allocations_active", selectedHostel],
        queryFn: async () => {
            let url = "/hostel_allocations?status=Active";
            if (selectedHostel) url += `&hostelId=${selectedHostel}`;
            const r = await api.get(url);
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: existingRecord } = useQuery({
        queryKey: ["hostel_attendance_today", date, selectedHostel],
        queryFn: async () => {
            const url = selectedHostel
                ? `/hostel_attendance_records?date=${date}&hostelId=${selectedHostel}`
                : `/hostel_attendance_records?date=${date}`;
            const r = await api.get(url);
            return Array.isArray(r.data) ? r.data[0] : null;
        },
        onSuccess: (data: any) => {
            if (data?.records) {
                const map: Record<string, string> = {};
                data.records.forEach((rec: any) => { map[rec.studentId] = rec.status; });
                setAttendance(map);
            } else {
                // Default all to Present
                const map: Record<string, string> = {};
                allocations.forEach((a: any) => { map[a.studentId] = "Present"; });
                setAttendance(map);
            }
        },
    });

    // Initialize attendance when allocations load
    useState(() => {
        if (allocations.length > 0 && Object.keys(attendance).length === 0) {
            const map: Record<string, string> = {};
            allocations.forEach((a: any) => { map[a.studentId] = "Present"; });
            setAttendance(map);
        }
    });

    const markAll = (status: string) => {
        const map: Record<string, string> = {};
        allocations.forEach((a: any) => { map[a.studentId] = status; });
        setAttendance(map);
    };

    const handleSave = async () => {
        if (allocations.length === 0) { toast.error("No residents to take attendance for"); return; }
        setIsSaving(true);
        try {
            const records = allocations.map((a: any) => ({
                studentId: a.studentId, studentName: a.studentName,
                admissionNo: a.admissionNo || "", roomNumber: a.roomNumber, bedNumber: a.bedNumber,
                status: attendance[a.studentId] || "Present",
            }));
            await api.post("/hostel/attendance/bulk", {
                date, hostelId: selectedHostel || null, hostelName: hostels.find((h: any) => h._id === selectedHostel)?.name || "All",
                records, takenBy: "Admin",
            });
            toast.success(`Hostel attendance saved for ${date}`);
            qc.invalidateQueries({ queryKey: ["hostel_attendance_today"] });
            qc.invalidateQueries({ queryKey: ["hostel_stats"] });
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to save attendance");
        } finally {
            setIsSaving(false);
        }
    };

    const presentCount = allocations.filter((a: any) => (attendance[a.studentId] || "Present") === "Present").length;
    const absentCount = allocations.filter((a: any) => attendance[a.studentId] === "Absent").length;
    const leaveCount = allocations.filter((a: any) => attendance[a.studentId] === "Leave").length;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Hostel</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Hostel Attendance</span>
                </div>
                <button onClick={handleSave} disabled={isSaving || allocations.length === 0}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition-all">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Attendance
                </button>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Hostel Attendance</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Take daily roll call for hostel residents</p></div>

                {/* Controls */}
                <div className="flex flex-wrap gap-4 items-end bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm mb-6">
                    <div className="relative">
                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Date*</div>
                        <div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" /></div>
                    </div>
                    <div className="relative w-52">
                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Hostel Block</div>
                        <select value={selectedHostel} onChange={e => setSelectedHostel(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                            <option value="">All Hostels</option>
                            {hostels.map((h: any) => <option key={h._id} value={h._id}>{h.name}</option>)}
                        </select>
                    </div>
                    <button onClick={() => refetch()} className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100"><RefreshCw className="w-4 h-4 text-slate-500" /></button>

                    {/* Mark all buttons */}
                    <div className="ml-auto flex gap-2">
                        {STATUS_OPTS.map(s => (
                            <button key={s} onClick={() => markAll(s)} className={`h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-wide border transition-all ${STATUS_COLORS[s]} opacity-80 hover:opacity-100`}>{s} All</button>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                {allocations.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[{ label: "Present", value: presentCount, color: "text-emerald-600" }, { label: "Absent", value: absentCount, color: "text-rose-600" }, { label: "On Leave", value: leaveCount, color: "text-amber-600" }].map(s => (
                            <div key={s.label} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                                <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Attendance table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                    {isLoading ? <div className="flex items-center justify-center h-32 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading residents...</div>
                    : allocations.length === 0 ? <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-300 text-xs font-bold uppercase"><Users className="w-8 h-8" />No active residents found</div>
                    : <div className="space-y-3">
                        {allocations.map((a: any) => {
                            const status = attendance[a.studentId] || "Present";
                            return (
                                <div key={a._id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-[#5C67F2] text-sm flex-shrink-0">{(a.studentName || "?")[0]}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-800">{a.studentName}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{a.hostelName} · Room {a.roomNumber} · Bed {a.bedNumber}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        {STATUS_OPTS.map(s => (
                                            <button key={s} onClick={() => setAttendance(prev => ({ ...prev, [a.studentId]: s }))}
                                                className={`h-8 px-4 rounded-xl font-black text-[9px] uppercase tracking-wide border transition-all ${status === s ? STATUS_COLORS[s] : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>}
                </div>
            </div>
        </div>
    );
}
