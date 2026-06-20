import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
