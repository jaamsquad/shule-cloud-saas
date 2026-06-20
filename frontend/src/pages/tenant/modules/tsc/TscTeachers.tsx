import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, User, ChevronRight } from "lucide-react";
import { tsc } from "./tscApi";

const statusTone = (s: string) => /active/i.test(s) ? "bg-emerald-100 text-emerald-700" : /leave/i.test(s) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";
const typeTone = (t: string) => /tsc/i.test(t) ? "bg-blue-50 text-blue-700" : /intern/i.test(t) ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700";

export default function TscTeachers() {
    const nav = useNavigate();
    const { data: rows = [], isLoading } = useQuery({ queryKey: ["tsc_teachers"], queryFn: tsc.teachers });
    const [q, setQ] = useState("");
    const [type, setType] = useState("");
    const [dept, setDept] = useState("");
    const [status, setStatus] = useState("");

    const depts = useMemo(() => Array.from(new Set(rows.map((r: any) => r.department).filter(Boolean))) as string[], [rows]);
    const types = useMemo(() => Array.from(new Set(rows.map((r: any) => r.employmentType).filter(Boolean))) as string[], [rows]);

    const filtered = rows.filter((r: any) =>
        (!q || `${r.name} ${r.employeeNo} ${r.tscNumber} ${r.nationalId}`.toLowerCase().includes(q.toLowerCase())) &&
        (!type || r.employmentType === type) && (!dept || r.department === dept) && (!status || r.status === status));

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#1D4ED8]" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, emp no, TSC no, ID…" className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" /></div>
                <select value={type} onChange={e => setType(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"><option value="">All types</option>{types.map(t => <option key={t}>{t}</option>)}</select>
                <select value={dept} onChange={e => setDept(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"><option value="">All departments</option>{depts.map(d => <option key={d}>{d}</option>)}</select>
                <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"><option value="">All statuses</option><option>Active</option><option>On Leave</option><option>Inactive</option></select>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">
                        <th className="text-left px-4 py-3 font-black">Teacher</th><th className="text-left px-4 py-3 font-black">Emp No</th><th className="text-left px-4 py-3 font-black">TSC No</th><th className="text-left px-4 py-3 font-black">Phone</th><th className="text-left px-4 py-3 font-black">Department</th><th className="text-left px-4 py-3 font-black">Type</th><th className="text-left px-4 py-3 font-black">Status</th><th className="px-4 py-3" />
                    </tr></thead>
                    <tbody>
                        {filtered.map((r: any) => (
                            <tr key={r._id} onClick={() => nav(`/tsc/teachers/${r._id}`)} className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer">
                                <td className="px-4 py-3"><div className="flex items-center gap-2.5">{r.photo ? <img src={r.photo} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User className="w-4 h-4" /></div>}<div><p className="font-bold text-slate-800">{r.name}</p><p className="text-[10px] text-slate-400">{r.designation}</p></div></div></td>
                                <td className="px-4 py-3 text-slate-500">{r.employeeNo || "—"}</td>
                                <td className="px-4 py-3 text-slate-500">{r.tscNumber || <span className="text-rose-400">missing</span>}</td>
                                <td className="px-4 py-3 text-slate-500">{r.phone || "—"}</td>
                                <td className="px-4 py-3 text-slate-500">{r.department || "—"}</td>
                                <td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${typeTone(r.employmentType)}`}>{r.employmentType}</span></td>
                                <td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusTone(r.status)}`}>{r.status}</span></td>
                                <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">No teachers found</td></tr>}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400 font-bold">{filtered.length} teachers</p>
        </div>
    );
}
