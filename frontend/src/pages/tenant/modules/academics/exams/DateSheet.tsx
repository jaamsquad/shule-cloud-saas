import { useState } from "react";
import { Home, Printer, Download, Calendar, Clock, ChevronDown, Loader2, BookOpen, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const DAY_COLORS = ["bg-blue-50 border-blue-200", "bg-emerald-50 border-emerald-200", "bg-amber-50 border-amber-200", "bg-purple-50 border-purple-200", "bg-rose-50 border-rose-200"];

export default function DateSheet() {
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);

    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data });
    const { data: tenantProfile } = useQuery<any>({ queryKey: ["tenant_profile"], queryFn: async () => (await api.get("/tenant/profile")).data });

    const { data: allSchedules = [], isLoading } = useQuery<any[]>({
        queryKey: ["exam-schedules"],
        queryFn: async () => (await api.get("/academics/exam-schedules")).data,
    });

    // Client-side filter: match examId as string (covers both ObjectId and string stored values)
    const schedules = allSchedules.filter((s: any) => {
        if (!selectedExam) return false;
        const examMatch = s.examId?.toString() === selectedExam._id?.toString();
        if (!examMatch) return false;
        if (!selectedClass) return true;
        // No classId means schedule applies to all classes
        if (!s.classId) return true;
        return s.classId?.toString() === selectedClass._id?.toString() ||
               s.className === (selectedClass.levelName || selectedClass.name);
    });


    const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data });
    const subMap: Record<string, any> = Object.fromEntries(subjects.map((s: any) => [s._id, s]));

    // Group by date
    const grouped: Record<string, any[]> = {};
    schedules.forEach((s: any) => {
        const date = s.date?.split("T")[0] || "—";
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(s);
    });
    const sortedDates = Object.keys(grouped).sort();

    const schoolName = tenantProfile?.name || "ShuleCloud School";

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 print:hidden">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Exams</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Date Sheet</span>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md transition-all">
                    <Printer className="w-3.5 h-3.5" /> Print Date Sheet
                </button>
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-5xl mx-auto">
                <div className="print:hidden">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Date Sheet</h1>
                    <p className="text-slate-400 text-sm font-medium mb-8">Printable exam timetable for students and teachers.</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Exam</label>
                            <select value={selectedExam?._id || ""} onChange={e => setSelectedExam(exams.find((o: any) => o._id === e.target.value) || null)} className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none">
                                <option value="">— Select Exam —</option>
                                {exams.map((e: any) => <option key={e._id} value={e._id}>{e.examName}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 bottom-4 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Filter by Class (Optional)</label>
                            <select value={selectedClass?._id || ""} onChange={e => setSelectedClass(classes.find((o: any) => o._id === e.target.value) || null)} className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none">
                                <option value="">All Classes</option>
                                {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.name || "—"}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 bottom-4 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {!selectedExam ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-4 print:hidden">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center"><Calendar className="w-10 h-10 text-[#5C67F2]" /></div>
                        <div className="text-center"><h3 className="text-base font-black text-slate-700">Select an Exam</h3><p className="text-slate-400 text-sm font-medium mt-1">Choose an exam to generate its date sheet.</p></div>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>
                ) : (
                    <div id="date-sheet" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Printable Header */}
                        <div className="bg-gradient-to-r from-[#5C67F2] to-indigo-500 px-8 py-6 text-white text-center">
                            <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mx-auto mb-3">
                                <GraduationCap className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-widest">{schoolName}</h2>
                            <p className="text-white/70 text-sm mt-1 font-medium">EXAMINATION DATE SHEET</p>
                            <p className="mt-2 text-sm font-black">{selectedExam?.examName}</p>
                            {selectedClass && <p className="text-white/80 text-xs mt-0.5">{selectedClass.levelName || selectedClass.name}</p>}
                        </div>

                        {sortedDates.length === 0 ? (
                            <div className="flex flex-col items-center py-16 gap-4">
                                <BookOpen className="w-10 h-10 text-slate-300" />
                                <p className="text-slate-400 font-bold text-sm">No schedule entries found. Add exam schedules first.</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4">
                                {sortedDates.map((date, di) => (
                                    <div key={date} className={`rounded-2xl border ${DAY_COLORS[di % DAY_COLORS.length]} overflow-hidden`}>
                                        <div className="px-5 py-3 flex items-center gap-3 border-b border-current border-opacity-20">
                                            <Calendar className="w-4 h-4 opacity-60" />
                                            <span className="font-black text-sm">
                                                {new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                                            </span>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {grouped[date].map((s: any, si: number) => (
                                                <div key={s._id || si} className="bg-white rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm">
                                                    <div className="text-center min-w-[80px] border-r border-gray-100 pr-4">
                                                        <p className="text-xs font-black text-[#5C67F2]">{s.startTime || "—"}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold">to</p>
                                                        <p className="text-xs font-black text-slate-600">{s.endTime || "—"}</p>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-black text-slate-800">{subMap[s.subjectId]?.name || s.subjectName || "General Exam"}</p>
                                                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 font-bold">
                                                            {s.room && <span>Room: {s.room}</span>}
                                                            {s.invigilator && <span>Invigilator: {s.invigilator}</span>}
                                                            {s.notes && <span className="italic">{s.notes}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Signature footer for print */}
                        <div className="px-8 py-6 border-t border-gray-100 print:block hidden grid grid-cols-3 gap-8">
                            {["Exam Officer", "Head of Academics", "Principal"].map(role => (
                                <div key={role} className="text-center">
                                    <div className="h-10 border-b border-dashed border-slate-300 mb-2" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
