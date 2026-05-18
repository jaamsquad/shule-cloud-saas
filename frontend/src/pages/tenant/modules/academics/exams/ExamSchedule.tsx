import { useState } from "react";
import {
    Home, Plus, Edit3, Trash2, Loader2, Calendar, Clock, Users,
    AlertCircle, XCircle, CheckCircle, ChevronDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const BLANK = {
    examId: "", subjectId: "", classId: "", room: "",
    invigilator: "", date: "", startTime: "", endTime: "", notes: ""
};

export default function ExamSchedule() {
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [form, setForm] = useState(BLANK);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: schedules = [], isLoading } = useQuery<any[]>({
        queryKey: ["exam-schedules"],
        queryFn: async () => (await api.get("/academics/exam-schedules")).data,
    });
    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data });
    const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data });
    const { data: staff = [] } = useQuery<any[]>({ queryKey: ["staff"], queryFn: async () => (await api.get("/staff")).data });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/exam-schedules", data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["exam-schedules"] }); setShowModal(false); setForm(BLANK); toast.success("Schedule added!"); },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: any) => api.patch(`/academics/exam-schedules/${id}`, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["exam-schedules"] }); setShowModal(false); setEditItem(null); toast.success("Schedule updated!"); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/exam-schedules/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["exam-schedules"] }); setDeleteConfirm(null); toast.success("Schedule deleted"); },
    });

    const openModal = (item?: any) => {
        if (item) {
            setEditItem(item);
            setForm({ examId: item.examId || "", subjectId: item.subjectId || "", classId: item.classId || "", room: item.room || "", invigilator: item.invigilator || "", date: item.date?.split("T")[0] || "", startTime: item.startTime || "", endTime: item.endTime || "", notes: item.notes || "" });
        } else { setEditItem(null); setForm(BLANK); }
        setShowModal(true);
    };

    const handleSubmit = () => {
        if (!form.examId || !form.date || !form.startTime || !form.endTime) return toast.error("Exam, date, and times are required");
        if (editItem) updateMutation.mutate({ id: editItem._id, data: form });
        else createMutation.mutate(form);
    };

    const examMap: Record<string, any> = Object.fromEntries(exams.map(e => [e._id, e]));
    const subMap: Record<string, any> = Object.fromEntries(subjects.map(s => [s._id, s]));
    const classMap: Record<string, any> = Object.fromEntries(classes.map(c => [c._id, c]));

    const grouped: Record<string, any[]> = {};
    schedules.forEach(s => {
        const date = s.date?.split("T")[0] || "—";
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(s);
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Exams</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Exam Schedule</span>
                </div>
                <button onClick={() => openModal()} className="flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-indigo-100 transition-all">
                    <Plus className="w-4 h-4" /> Add Schedule
                </button>
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-5xl mx-auto">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Exam Schedule</h1>
                <p className="text-slate-400 text-sm font-medium mb-8">Assign papers, invigilators, rooms, and times for each exam session.</p>

                {isLoading ? (
                    <div className="flex flex-col items-center py-24 gap-4"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>
                ) : schedules.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-5">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                            <Calendar className="w-10 h-10 text-[#5C67F2]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-black text-slate-700">No Schedule Yet</h3>
                            <p className="text-slate-400 text-sm font-medium mt-1">Add exam sessions to build your timetable.</p>
                        </div>
                        <button onClick={() => openModal()} className="h-10 px-6 bg-[#5C67F2] text-white font-black rounded-xl text-xs tracking-widest uppercase shadow-md shadow-indigo-200 flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5" /> Add First Session
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, sessions]) => (
                            <div key={date}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-2xl bg-[#5C67F2] text-white flex items-center justify-center flex-shrink-0">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-sm">
                                            {new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium">{sessions.length} session(s)</p>
                                    </div>
                                </div>
                                <div className="space-y-2 ml-14">
                                    {sessions.map((s: any) => (
                                        <motion.div key={s._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all px-5 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center min-w-[60px]">
                                                    <p className="text-xs font-black text-[#5C67F2]">{s.startTime}</p>
                                                    <div className="w-px h-4 bg-slate-200 mx-auto my-0.5" />
                                                    <p className="text-xs font-black text-slate-400">{s.endTime}</p>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="text-sm font-black text-slate-800">{subMap[s.subjectId]?.name || s.subjectName || "All Subjects"}</span>
                                                        <span className="text-[9px] bg-indigo-50 text-[#5C67F2] px-2 py-0.5 rounded font-black">{classMap[s.classId]?.levelName || classMap[s.classId]?.name || "All Classes"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold flex-wrap">
                                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.invigilator || "No invigilator assigned"}</span>
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Room: {s.room || "TBD"}</span>
                                                        <span>{examMap[s.examId]?.examName || "—"}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button onClick={() => openModal(s)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-[#5C67F2] hover:bg-indigo-50 hover:text-[#5C67F2] text-slate-300 transition-all">
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(s._id)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 hover:text-red-400 text-slate-300 transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            {deleteConfirm === s._id && (
                                                <div className="mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /><p className="text-xs font-bold text-red-600">Delete this schedule?</p></div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setDeleteConfirm(null)} className="h-8 px-3 text-xs font-bold text-slate-400 bg-white border border-gray-200 rounded-lg">Cancel</button>
                                                        <button onClick={() => deleteMutation.mutate(s._id)} className="h-8 px-3 text-xs font-black text-white bg-red-500 rounded-lg flex items-center gap-1.5">{deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}Delete</button>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl max-w-xl w-full overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">{editItem ? "Edit Schedule" : "Add Exam Schedule"}</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Assign paper, room, invigilator, and timings.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><XCircle className="w-4 h-4" /></button>
                            </div>
                            <div className="px-8 py-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Exam *</label>
                                        <select value={form.examId} onChange={e => setForm(f => ({ ...f, examId: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                            <option value="">Select Exam</option>
                                            {exams.map(e => <option key={e._id} value={e._id}>{e.examName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                                        <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                            <option value="">All Subjects</option>
                                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Class</label>
                                        <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                            <option value="">All Classes</option>
                                            {classes.map(c => <option key={c._id} value={c._id}>{c.levelName || c.name || "—"}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Room</label>
                                        <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. Room 1A, Hall B" className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-200" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Invigilator</label>
                                    <input value={form.invigilator} onChange={e => setForm(f => ({ ...f, invigilator: e.target.value }))} placeholder="Invigilator name or select from staff" className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-200" list="staff-list" />
                                    <datalist id="staff-list">{staff.map((s: any) => <option key={s._id} value={s.fullName || s.name} />)}</datalist>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date *</label>
                                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Start Time *</label>
                                        <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">End Time *</label>
                                        <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</label>
                                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Special instructions…" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-200 resize-none" />
                                </div>
                            </div>
                            <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-end gap-3">
                                <button onClick={() => setShowModal(false)} className="h-11 px-6 bg-gray-100 text-slate-600 font-bold rounded-full text-xs uppercase tracking-wider">Cancel</button>
                                <button onClick={handleSubmit} disabled={isPending} className="h-11 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-lg shadow-indigo-100 flex items-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50">
                                    {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle className="w-4 h-4" /> {editItem ? "Update" : "Save Schedule"}</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
