import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Check, Loader2, Search, UserPlus, Award } from "lucide-react";
import { useModuleCrud } from "@/contexts/PermissionsContext";
import { AddStudentsModal, SportCertificatesModal } from "./SportTools";
import { toast } from "sonner";
import api from "@/lib/api";

const badge = (s: string) => {
    const map: Record<string, string> = {
        confirmed: "bg-emerald-100 text-emerald-700",
        awaiting_payment: "bg-amber-100 text-amber-700",
        declined: "bg-slate-100 text-slate-600",
    };
    return map[s] || "bg-slate-100 text-slate-600";
};

export default function SportsParticipants() {
    const qc = useQueryClient();
    const { data: rows = [], isLoading } = useQuery({
        queryKey: ["sports_enrollments"],
        queryFn: async () => { try { const r = await api.get("/sports-enrollments"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    // Look up real admission numbers for existing enrolments that didn't store one.
    const { data: students = [] } = useQuery({
        queryKey: ["sports_students_lookup"],
        queryFn: async () => { try { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const admOf = (r: any) => {
        if (r.admNo || r.registrationNo) return r.admNo || r.registrationNo;
        const s = students.find((x: any) => x._id === r.studentId);
        return s?.registrationNo || s?.admNo || "—";
    };
    const classOf = (r: any) => {
        if (r.studentClass) return r.studentClass;
        const s = students.find((x: any) => x._id === r.studentId);
        return s?.studentClass || s?.currentClass || "—";
    };

    const { data: sportList = [] } = useQuery<any[]>({
        queryKey: ["sports_list"],
        queryFn: async () => { try { const r = await api.get("/sports"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const canAdd = useModuleCrud("sports").canCreate;
    const canCert = useModuleCrud("certificates").canCreate;
    const [tool, setTool] = useState<{ kind: "add" | "cert"; sportId: string } | null>(null);
    const toolSport = tool ? sportList.find((s: any) => String(s._id) === tool.sportId) : null;
    // the buttons act on the sport picked in the filter (or the only sport there is)
    const openTool = (kind: "add" | "cert") => {
        const sp = sportList.find((s: any) => s.name === sportFilter) || (sportList.length === 1 ? sportList[0] : null);
        if (!sp) { toast.info("Pick a sport in the 'All Sports' filter first"); return; }
        setTool({ kind, sportId: String(sp._id) });
    };

    const approve = useMutation({
        mutationFn: async (id: string) => api.patch(`/sports-enrollments/${id}`, { approvalStatus: "approved" }),
        onSuccess: () => { toast.success("Approved"); qc.invalidateQueries({ queryKey: ["sports_enrollments"] }); },
    });

    // ── Filter + sort ─────────────────────────────────────────────────────────
    const [q, setQ] = useState("");
    const [sportFilter, setSportFilter] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [sortBy, setSortBy] = useState("student");

    const sports = useMemo(() => Array.from(new Set(rows.map((r: any) => r.sportName).filter(Boolean))), [rows]);
    const classes = useMemo(() => Array.from(new Set(rows.map(classOf).filter((c) => c && c !== "—"))), [rows, students]);

    const viewRows = useMemo(() => {
        let out = rows.filter((r: any) => {
            const text = `${r.studentName} ${admOf(r)} ${r.sportName} ${classOf(r)}`.toLowerCase();
            return (!q || text.includes(q.toLowerCase())) && (!sportFilter || r.sportName === sportFilter) && (!classFilter || classOf(r) === classFilter);
        });
        out = [...out].sort((a: any, b: any) => {
            if (sortBy === "sport") return String(a.sportName || "").localeCompare(String(b.sportName || ""));
            if (sortBy === "class") return String(classOf(a)).localeCompare(String(classOf(b)));
            return String(a.studentName || "").localeCompare(String(b.studentName || ""));
        });
        return out;
    }, [rows, students, q, sportFilter, classFilter, sortBy]);

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white"><Users className="w-6 h-6" /></div>
                    <div className="flex-1 min-w-0"><h1 className="text-xl font-black text-slate-800">Registered Participants</h1><p className="text-xs text-slate-500">Students enrolled per sport, with payment & approval status</p></div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        {canAdd && <button onClick={() => openTool("add")} className="h-10 px-4 bg-[#5C67F2] text-white rounded-xl text-sm font-bold flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add Students</button>}
                        {canCert && <button onClick={() => openTool("cert")} className="h-10 px-4 bg-amber-500 text-white rounded-xl text-sm font-bold flex items-center gap-2"><Award className="w-4 h-4" /> Certificates</button>}
                    </div>
                </div>

                {/* Filter + sort */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, adm, sport, class…" className="w-full h-10 pl-10 pr-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" /></div>
                    <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600"><option value="">All Sports</option>{[...new Set([...sportList.map((s: any) => s.name), ...sports])].filter(Boolean).map((s: any) => <option key={s} value={s}>{s}</option>)}</select>
                    <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600"><option value="">All Classes</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600"><option value="student">Sort: Student</option><option value="sport">Sort: Sport</option><option value="class">Sort: Class</option></select>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-3 px-4">Adm No</th><th className="py-3 px-4">Student</th><th className="py-3 px-4">Class</th><th className="py-3 px-4">Sport</th>
                            <th className="py-3 px-4">Fee</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Approval</th><th className="py-3 px-4" />
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={8} className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></td></tr>
                            ) : viewRows.length === 0 ? (
                                <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-xs font-bold uppercase">No participants found</td></tr>
                            ) : viewRows.map((r: any) => (
                                <tr key={r._id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 text-slate-500">{admOf(r)}</td>
                                    <td className="py-3 px-4 font-bold text-slate-800">{r.studentName || "—"}</td>
                                    <td className="py-3 px-4 text-slate-500">{classOf(r)}</td>
                                    <td className="py-3 px-4">{r.sportName}</td>
                                    <td className="py-3 px-4">KSh {Number(r.fee || 0).toLocaleString()}</td>
                                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badge(r.status)}`}>{(r.status || "").replace(/_/g, " ")}</span></td>
                                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.approvalStatus === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.approvalStatus || "pending"}</span></td>
                                    <td className="py-3 px-4">
                                        {r.approvalStatus !== "approved" && (
                                            <button onClick={() => approve.mutate(r._id)} className="h-8 px-3 bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Approve</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {tool?.kind === "add" && toolSport && <AddStudentsModal sport={toolSport} onClose={() => setTool(null)} />}
            {tool?.kind === "cert" && toolSport && <SportCertificatesModal sport={toolSport} onClose={() => setTool(null)} />}
        </div>
    );
}
