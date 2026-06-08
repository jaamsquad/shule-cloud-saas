import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Save, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";
import { useAssignments, pairKey, parsePair } from "../useAssignments";

const STATUSES = ["Present", "Absent", "Late"];
const statusStyle = (active: boolean, s: string) =>
    active
        ? s === "Present" ? "bg-emerald-500 border-emerald-500 text-white"
            : s === "Late" ? "bg-amber-400 border-amber-400 text-white"
                : "bg-rose-500 border-rose-500 text-white"
        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300";

export default function StaffAttendance() {
    const { api } = useOutletContext<StaffCtx>();
    const { data: assign } = useAssignments();
    const pairs = assign?.assignments || [];
    const classTeacherOf = assign?.classTeacherOf || [];

    const [mode, setMode] = useState<"subject" | "class">("subject");
    const [pair, setPair] = useState("");
    const [classOnly, setClassOnly] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [rows, setRows] = useState<any[]>([]);

    const className = mode === "subject" ? (pair ? parsePair(pair).className : "") : classOnly;
    const subject = mode === "subject" ? (pair ? parsePair(pair).subject : "") : "";
    const ready = !!className && (mode === "class" || !!subject);

    const { data, isFetching, refetch } = useQuery({
        queryKey: ["staff_attendance", className, subject, date],
        queryFn: async () => (await api.get(`/staff-portal/attendance?className=${encodeURIComponent(className)}&subject=${encodeURIComponent(subject)}&date=${date}`)).data,
        enabled: ready,
        retry: false,
    });

    useEffect(() => { if (data?.students) setRows(data.students.map((s: any) => ({ ...s }))); }, [data]);

    const save = useMutation({
        mutationFn: async () => (await api.post("/staff-portal/attendance", {
            className, subject: subject || "General", date,
            records: rows.map(r => ({ studentId: r.studentId, status: r.status })),
        })).data,
        onSuccess: (d: any) => { toast.success(d.message || "Saved"); refetch(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });

    return (
        <>
            <PageTitle title="Mark Attendance" />

            <PanelCard title="Attendance Setup">
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setMode("subject")}
                        className={`px-3 py-1.5 rounded text-sm font-bold border ${mode === "subject" ? "bg-[#159a52] border-[#159a52] text-white" : "bg-white border-slate-200 text-slate-500"}`}>
                        Subject Attendance
                    </button>
                    <button onClick={() => setMode("class")} disabled={classTeacherOf.length === 0}
                        className={`px-3 py-1.5 rounded text-sm font-bold border disabled:opacity-40 ${mode === "class" ? "bg-[#159a52] border-[#159a52] text-white" : "bg-white border-slate-200 text-slate-500"}`}>
                        Class Register {classTeacherOf.length === 0 ? "(not a class teacher)" : ""}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mode === "subject" ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Class &amp; Subject</label>
                            <select value={pair} onChange={e => setPair(e.target.value)}
                                className="w-full h-10 px-3 border border-black/10 rounded text-sm bg-white">
                                <option value="">— Select —</option>
                                {pairs.map(p => <option key={pairKey(p)} value={pairKey(p)}>{p.className} — {p.subject}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Class</label>
                            <select value={classOnly} onChange={e => setClassOnly(e.target.value)}
                                className="w-full h-10 px-3 border border-black/10 rounded text-sm bg-white">
                                <option value="">— Select class —</option>
                                {classTeacherOf.map(c => <option key={c.classId} value={c.className}>{c.className}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full h-10 px-3 border border-black/10 rounded text-sm" />
                    </div>
                </div>
            </PanelCard>

            {ready && (
                <PanelCard title={`${className}${subject ? " — " + subject : ""} · ${date}`}
                    action={
                        <button disabled={save.isPending || rows.length === 0} onClick={() => save.mutate()}
                            className="inline-flex items-center gap-1.5 bg-white text-[#0f5132] text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50">
                            {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                        </button>
                    }>
                    {isFetching ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading roster…
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-semibold">No students in this class.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {rows.map((r, i) => (
                                <div key={r.studentId} className="flex items-center justify-between py-2 border-b border-black/5">
                                    <span className="text-sm font-semibold text-slate-700">{i + 1}. {r.name}</span>
                                    <div className="flex gap-1">
                                        {STATUSES.map(s => (
                                            <button key={s}
                                                onClick={() => setRows(rs => rs.map((x, j) => j === i ? { ...x, status: s } : x))}
                                                className={`text-xs font-bold px-2.5 py-1 rounded border transition-colors ${statusStyle(r.status === s, s)}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>
            )}
        </>
    );
}
