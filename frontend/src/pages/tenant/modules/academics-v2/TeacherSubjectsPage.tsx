import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Plus, Trash2, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// Assign a teacher to a subject for a class (stream optional). These links drive
// the "Initials" column on report cards — e.g. "Muzamil Mohamed" → "M.M". Reads
// the v2 classes/streams model and the legacy subjects + staff collections.
export default function TeacherSubjectsPage() {
    const qc = useQueryClient();
    const [classId, setClassId] = useState("");
    const [streamId, setStreamId] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [teacherId, setTeacherId] = useState("");

    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: streams = [] } = useQuery<any[]>({ queryKey: ["v2_streams", classId], enabled: !!classId, queryFn: async () => (await api.get("/v2/streams", { params: { classId } })).data || [] });
    const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["subjects"], queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: staff = [] } = useQuery<any[]>({ queryKey: ["staff"], queryFn: async () => { const r = await api.get("/staff"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: links = [] } = useQuery<any[]>({ queryKey: ["teacher_subjects"], queryFn: async () => (await api.get("/v2/teacher-subjects")).data || [] });

    const cls = classes.find((c: any) => String(c._id) === classId);
    const stream = streams.find((s: any) => String(s._id) === streamId);
    const subject = subjects.find((s: any) => String(s._id) === subjectId);
    const teacher = staff.find((s: any) => String(s._id) === teacherId);
    const staffName = (s: any) => s?.employeeName || s?.name || `${s?.firstName || ""} ${s?.lastName || s?.surname || ""}`.trim();
    const subjName = (s: any) => s?.name || s?.subjectName || "Subject";
    const initialsOf = (n: string) => String(n || "").trim().split(/\s+/).filter(Boolean).slice(0, 3).map(w => w[0].toUpperCase()).join(".");

    const add = useMutation({
        mutationFn: async () => (await api.post("/v2/teacher-subjects", {
            teacherId, teacherName: staffName(teacher),
            subjectId, subjectName: subjName(subject),
            classId, className: cls?.name || "",
            streamId: streamId || null, streamName: stream?.name || "",
        })).data,
        onSuccess: () => { toast.success("Teacher assigned."); qc.invalidateQueries({ queryKey: ["teacher_subjects"] }); setSubjectId(""); setTeacherId(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not assign"),
    });
    const remove = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/v2/teacher-subjects/${id}`)).data,
        onSuccess: () => { toast.success("Removed."); qc.invalidateQueries({ queryKey: ["teacher_subjects"] }); },
    });

    const ready = classId && subjectId && teacherId;

    // Show links for the chosen class (or all, when none chosen).
    const shown = useMemo(() => {
        const rows = classId ? links.filter((l: any) => String(l.classId) === classId) : links;
        return [...rows].sort((a, b) => `${a.className} ${a.subjectName}`.localeCompare(`${b.className} ${b.subjectName}`));
    }, [links, classId]);

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-1"><UserCheck className="w-6 h-6 text-[#5C67F2]" /> Assign Teachers to Subjects</h1>
            <p className="text-sm text-slate-400 mb-5">Pick a class, subject and teacher. The teacher's initials then show on that subject's row in report cards.</p>

            {/* Assignment form */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 max-w-4xl mb-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Class *</label>
                        <select value={classId} onChange={e => { setClassId(e.target.value); setStreamId(""); }} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                            <option value="">— Class —</option>
                            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Stream</label>
                        <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!classId} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                            <option value="">All streams</option>
                            {streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Subject *</label>
                        <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                            <option value="">— Subject —</option>
                            {subjects.map((s: any) => <option key={s._id} value={s._id}>{subjName(s)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Teacher *</label>
                        <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                            <option value="">— Teacher —</option>
                            {staff.map((s: any) => <option key={s._id} value={s._id}>{staffName(s)}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                    <button onClick={() => add.mutate()} disabled={!ready || add.isPending} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                        {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Assign
                    </button>
                    {teacher && <span className="text-sm text-slate-500">Initials: <strong className="text-slate-800">{initialsOf(staffName(teacher)) || "—"}</strong></span>}
                </div>
            </div>

            {/* Current assignments */}
            <div className="bg-white rounded-2xl border border-slate-100 max-w-4xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-black text-slate-700">{classId ? `Assignments for ${cls?.name || "class"}` : "All assignments"} ({shown.length})</h2>
                </div>
                {shown.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm font-bold">No assignments yet — add one above.</div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-5 py-2.5">Class</th>
                                <th className="px-5 py-2.5">Subject</th>
                                <th className="px-5 py-2.5">Teacher</th>
                                <th className="px-5 py-2.5">Initials</th>
                                <th className="px-5 py-2.5"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((l: any) => (
                                <tr key={l._id} className="border-b border-slate-50 text-sm">
                                    <td className="px-5 py-3 font-bold text-slate-700">{l.className}{l.streamName ? ` ${l.streamName}` : ""}</td>
                                    <td className="px-5 py-3 text-slate-600">{l.subjectName}</td>
                                    <td className="px-5 py-3 text-slate-600">{l.teacherName || "—"}</td>
                                    <td className="px-5 py-3"><span className="px-2 py-1 rounded-lg bg-indigo-50 text-[#5C67F2] font-black text-xs">{initialsOf(l.teacherName) || "—"}</span></td>
                                    <td className="px-5 py-3 text-right">
                                        <button onClick={() => remove.mutate(l._id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
