import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, UserCheck, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Props {
    title: string;
    subtitle?: string;
    /** "Trip" | "Sport" — the activity label shown in the picker. */
    activityLabel: string;
    /** Endpoint listing activities (e.g. "/trips", "/sports"). */
    activityEndpoint: string;
    /** Field on an activity used as its name (default "name"). */
    activityNameField?: string;
    /** Endpoint listing participants (e.g. "/trip-participants", "/sports-enrollments"). */
    participantsEndpoint: string;
    /** Field on a participant that holds the activity name to filter by. */
    participantActivityField: string;   // e.g. "tripName" | "sportName"
    /** Endpoint that records one attendance row (POST). */
    attendanceEndpoint: string;         // e.g. "/trip-attendance"
    /** Activity-name key written on each attendance row. */
    attendanceActivityKey: string;      // e.g. "tripName" | "sportName"
    moduleKey: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Roster-style register: pick an activity → its participants load automatically →
 * mark each Present/Absent → save the whole register in one go (one row per
 * participant). Used by Trip Attendance and Sports Attendance.
 */
export default function RosterAttendance(props: Props) {
    const {
        title, subtitle, activityLabel, activityEndpoint, activityNameField = "name",
        participantsEndpoint, participantActivityField, attendanceEndpoint,
        attendanceActivityKey,
    } = props;
    const qc = useQueryClient();

    const [activity, setActivity] = useState("");
    const [date, setDate] = useState(today());
    const [marks, setMarks] = useState<Record<string, "Present" | "Absent">>({});

    const { data: activities = [] } = useQuery({
        queryKey: ["roster_activities", activityEndpoint],
        queryFn: async () => { try { const r = await api.get(activityEndpoint); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    const { data: allParticipants = [], isLoading: loadingParts } = useQuery({
        queryKey: ["roster_participants", participantsEndpoint],
        queryFn: async () => { try { const r = await api.get(participantsEndpoint); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    // Participants for the chosen activity.
    const participants = useMemo(
        () => allParticipants.filter((p: any) => !activity || p[participantActivityField] === activity),
        [allParticipants, activity, participantActivityField],
    );

    const setMark = (id: string, v: "Present" | "Absent") => setMarks((m) => ({ ...m, [id]: v }));
    const markAll = (v: "Present" | "Absent") => {
        const next: Record<string, "Present" | "Absent"> = {};
        participants.forEach((p: any) => { next[p._id] = v; });
        setMarks(next);
    };

    const save = useMutation({
        mutationFn: async () => {
            const rows = participants
                .filter((p: any) => marks[p._id])
                .map((p: any) => ({
                    [attendanceActivityKey]: activity,
                    date,
                    studentName: p.studentName,
                    studentClass: p.studentClass || p.currentClass || "",
                    studentId: p.studentId || p._id,
                    status: marks[p._id],
                }));
            if (!rows.length) throw new Error("Mark at least one participant");
            // One POST per row (matches the existing CRUD attendance endpoints).
            await Promise.all(rows.map((row: any) => api.post(attendanceEndpoint, row)));
            return rows.length;
        },
        onSuccess: (n) => { toast.success(`Saved register for ${n} participant(s)`); qc.invalidateQueries({ queryKey: [attendanceEndpoint] }); setMarks({}); },
        onError: (e: any) => toast.error(e.response?.data?.message || e.message || "Failed to save"),
    });

    const presentCount = participants.filter((p: any) => marks[p._id] === "Present").length;

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white"><UserCheck className="w-6 h-6" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">{title}</h1>{subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}</div>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5 flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">{activityLabel} *</label>
                        <select value={activity} onChange={(e) => { setActivity(e.target.value); setMarks({}); }}
                            className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]">
                            <option value="">{`Select ${activityLabel.toLowerCase()}…`}</option>
                            {activities.map((a: any) => { const v = a[activityNameField]; return v ? <option key={a._id || v} value={v}>{v}</option> : null; })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
                        </div>
                    </div>
                    {activity && participants.length > 0 && (
                        <div className="flex gap-2">
                            <button onClick={() => markAll("Present")} className="h-9 px-3 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">All Present</button>
                            <button onClick={() => markAll("Absent")} className="h-9 px-3 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">All Absent</button>
                        </div>
                    )}
                </div>

                {/* Roster */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {!activity ? (
                        <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">Select a {activityLabel.toLowerCase()} to load its participants</div>
                    ) : loadingParts ? (
                        <div className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#5C67F2]" /></div>
                    ) : participants.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">No participants enrolled for this {activityLabel.toLowerCase()}</div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                                <p className="text-xs font-black text-slate-600 uppercase tracking-wide">{participants.length} participants · {presentCount} present</p>
                            </div>
                            <table className="w-full text-left text-sm">
                                <tbody className="divide-y divide-slate-50">
                                    {participants.map((p: any, i: number) => (
                                        <tr key={p._id} className="hover:bg-slate-50/50">
                                            <td className="py-3 px-4 text-slate-400 font-bold w-10">{i + 1}</td>
                                            <td className="py-3 px-4 font-bold text-slate-800">{p.studentName}</td>
                                            <td className="py-3 px-4 text-slate-500">{p.studentClass || p.currentClass || ""}</td>
                                            <td className="py-3 px-4 w-48">
                                                <div className="flex gap-2 justify-end">
                                                    {(["Present", "Absent"] as const).map((s) => (
                                                        <button key={s} onClick={() => setMark(p._id, s)}
                                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase ${marks[p._id] === s ? (s === "Present" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "bg-slate-100 text-slate-500"}`}>
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 border-t border-slate-100 flex justify-end">
                                <button onClick={() => save.mutate()} disabled={save.isPending || presentCount + Object.keys(marks).length === 0}
                                    className="h-10 px-6 bg-[#5C67F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                                    {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Register
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
