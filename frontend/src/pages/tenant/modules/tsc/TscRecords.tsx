import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { tsc } from "./tscApi";

// School-wide record views. `tab` selects which TSC dataset to list; default
// (TSC Records) shows the teacher register with their core TSC fields.
const CONFIG: Record<string, { title: string; col?: string; columns: [string, string][] }> = {
    records: { title: "TSC Records", columns: [["name", "Teacher"], ["tscNumber", "TSC No"], ["employmentType", "Type"], ["department", "Department"], ["status", "Status"]] },
    qualifications: { title: "Qualifications", col: "tsc_qualifications", columns: [["level", "Level"], ["course", "Course"], ["institution", "Institution"], ["year", "Year"]] },
    deployment: { title: "Deployment History", col: "tsc_deployment", columns: [["schoolName", "School"], ["position", "Position"], ["startDate", "From"], ["endDate", "To"]] },
    leave: { title: "Leave Management", col: "tsc_leave", columns: [["type", "Type"], ["startDate", "From"], ["endDate", "To"], ["totalDays", "Days"], ["status", "Status"]] },
    performance: { title: "Performance", col: "tsc_performance", columns: [["period", "Period"], ["appraisalScore", "Score"], ["principalReview", "Review"]] },
};

export default function TscRecords({ tab = "records" }: { tab?: string }) {
    const nav = useNavigate();
    const cfg = CONFIG[tab] || CONFIG.records;
    const [q, setQ] = useState("");

    const { data: teachers = [] } = useQuery({ queryKey: ["tsc_teachers"], queryFn: tsc.teachers });
    const { data: linked = [], isLoading } = useQuery({ queryKey: ["tsc_linked_all", cfg.col], queryFn: () => cfg.col ? tsc.list(cfg.col) : Promise.resolve([]), enabled: !!cfg.col });

    const teacherById = useMemo(() => Object.fromEntries(teachers.map((t: any) => [t._id, t])), [teachers]);
    const rows = cfg.col ? linked.map((r: any) => ({ ...r, name: teacherById[r.staffId]?.name || "—" })) : teachers;
    const filtered = rows.filter((r: any) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

    if (cfg.col && isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#1D4ED8]" /></div>;

    return (
        <div className="space-y-4">
            {tab === "leave" && <LeaveRequestsPanel />}
            <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-800">{cfg.title}</h2>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" /></div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">{cfg.col && <th className="text-left px-4 py-3 font-black">Teacher</th>}{cfg.columns.map(([k, l]) => <th key={k} className="text-left px-4 py-3 font-black">{l}</th>)}<th className="px-4 py-3" /></tr></thead>
                    <tbody>
                        {filtered.map((r: any, i: number) => (
                            <tr key={r._id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                {cfg.col && <td className="px-4 py-3 font-bold text-slate-700">{r.name}</td>}
                                {cfg.columns.map(([k]) => <td key={k} className="px-4 py-3 text-slate-600">{r[k] ?? "—"}</td>)}
                                <td className="px-4 py-3 text-right"><button onClick={() => nav(`/tsc/teachers/${cfg.col ? r.staffId : r._id}`)} className="text-[#1D4ED8]"><ExternalLink className="w-3.5 h-3.5" /></button></td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={cfg.columns.length + 2} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">No records</td></tr>}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400 font-bold">{filtered.length} records · open a teacher to add/edit</p>
        </div>
    );
}

// Pending staff leave requests submitted from the staff portal — approve/reject.
function LeaveRequestsPanel() {
    const qc = useQueryClient();
    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
    const { data: reqs = [], isLoading } = useQuery({ queryKey: ["tsc_leave_requests"], queryFn: () => tsc.leaveRequests() });
    const review = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => tsc.reviewLeave(id, status),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["tsc_leave_requests"] }); qc.invalidateQueries({ queryKey: ["tsc_linked_all"] }); qc.invalidateQueries({ queryKey: ["tsc_pending_leave"] }); },
    });
    const pending = reqs.filter((r: any) => r.status === "pending");

    if (isLoading || reqs.length === 0) return null;
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-black text-slate-800 mb-3">Staff Leave Requests {pending.length > 0 && <span className="ml-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pending.length} pending</span>}</h3>
            <div className="space-y-2">
                {reqs.map((r: any) => (
                    <div key={r._id} className="flex items-center justify-between border-b border-slate-50 py-2.5">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{r.staffName} · {r.type} <span className="text-slate-400 font-normal">({r.days}d)</span></p>
                            <p className="text-xs text-slate-400">{fmt(r.startDate)} → {fmt(r.endDate)}{r.reason ? ` · ${r.reason}` : ""}</p>
                        </div>
                        {r.status === "pending" ? (
                            <div className="flex gap-1.5 flex-shrink-0">
                                <button onClick={() => review.mutate({ id: r._id, status: "approved" })} className="h-8 px-3 rounded-lg bg-emerald-500 text-white text-xs font-bold">Approve</button>
                                <button onClick={() => review.mutate({ id: r._id, status: "rejected" })} className="h-8 px-3 rounded-lg border border-slate-200 text-rose-600 text-xs font-bold">Reject</button>
                            </div>
                        ) : (
                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${r.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>{r.status}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
