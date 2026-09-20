import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Home, Loader2, Printer, Search, User, Phone, Mail, Users, ArrowLeft, Trophy, Wallet, GraduationCap } from "lucide-react";
import api from "@/lib/api";
import { useSchoolBrand, printBranded } from "@/lib/printDoc";

const money = (n: number) => `KES ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const SORTS: { v: string; l: string }[] = [
    { v: "name_asc", l: "Name (A-Z)" },
    { v: "name_desc", l: "Name (Z-A)" },
    { v: "reg_asc", l: "Registration no." },
    { v: "fee_desc", l: "Fee balance — highest first" },
    { v: "fee_asc", l: "Fee balance — lowest first" },
    { v: "perf_desc", l: "Most performing first" },
    { v: "perf_asc", l: "Least performing first" },
];

/** A class (stream) page: its class teacher, every student in it with fee balance and performance, sortable and printable. */
export default function ClassRoster() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const school = useSchoolBrand();
    const [sortBy, setSortBy] = useState("name_asc");
    const [search, setSearch] = useState("");
    const [examId, setExamId] = useState("");

    const { data, isLoading, error } = useQuery<any>({
        queryKey: ["class_roster", streamId, examId],
        queryFn: async () => (await api.get(`/v2/streams/${streamId}/roster`, { params: examId ? { examId } : {} })).data,
    });

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list: any[] = (data?.students || []).filter((s: any) => !q || `${s.studentName} ${s.registrationNo}`.toLowerCase().includes(q));
        const byName = (a: any, b: any) => a.studentName.localeCompare(b.studentName, undefined, { sensitivity: "base" });
        // students with no marks yet always go last when sorting by performance
        const perf = (dir: 1 | -1) => (a: any, b: any) => (a.average == null ? 1 : b.average == null ? -1 : dir * (a.average - b.average)) || byName(a, b);
        return list.sort((a, b) => {
            switch (sortBy) {
                case "name_desc": return byName(b, a);
                case "reg_asc": return String(a.registrationNo).localeCompare(String(b.registrationNo), undefined, { numeric: true }) || byName(a, b);
                case "fee_desc": return b.feeDue - a.feeDue || byName(a, b);
                case "fee_asc": return a.feeDue - b.feeDue || byName(a, b);
                case "perf_desc": return perf(-1)(a, b);
                case "perf_asc": return perf(1)(a, b);
                default: return byName(a, b);
            }
        });
    }, [data, search, sortBy]);

    if (isLoading) return <div className="flex-1 bg-[#f4f7f6] min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>;
    if (error || !data) {
        return (
            <div className="flex-1 bg-[#f4f7f6] min-h-screen flex items-center justify-center">
                <div className="bg-white p-10 rounded-2xl shadow text-center space-y-3 border border-gray-100">
                    <p className="font-black text-slate-800">Couldn't open this class</p>
                    <p className="text-sm text-slate-500">{(error as any)?.response?.data?.message || "It may have been removed."}</p>
                    <button onClick={() => navigate("/classes")} className="text-sm font-bold text-[#5C67F2] hover:underline">← Back to classes</button>
                </div>
            </div>
        );
    }

    const { stream, teacher, summary, exams } = data;
    const finance: boolean = !!data.canViewFinance;   // fee figures are sent (and shown) only to people allowed to see student finance
    const examName = exams.find((e: any) => e._id === examId)?.name;
    const sortLabel = SORTS.find(s => s.v === sortBy)?.l || "";

    const print = () => {
        const body = `
          <div style="display:flex;justify-content:space-between;margin:0 0 10px;font-size:12px">
            <div><b>Class teacher:</b> ${esc(teacher?.name || "Not assigned")}${teacher?.phone ? ` · ${esc(teacher.phone)}` : ""}</div>
            <div><b>Students:</b> ${summary.total} (${summary.boys} boys, ${summary.girls} girls)</div>
          </div>
          <div style="font-size:11px;color:#64748b;margin-bottom:8px">Sorted by: ${esc(sortLabel)}${examName ? ` · Performance: ${esc(examName)}` : ""}${summary.classMean != null ? ` · Class mean: ${summary.classMean}%` : ""}</div>
          <table><thead><tr><th>#</th><th>Student</th><th>Reg No</th><th>Gender</th><th>Contact</th>${finance ? `<th style="text-align:right">Fee balance</th>` : ""}<th style="text-align:right">Average</th><th style="text-align:right">Position</th></tr></thead><tbody>
          ${rows.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.studentName)}</td><td>${esc(s.registrationNo)}</td><td>${esc(s.gender)}</td><td>${esc(s.phone)}</td>${finance ? `<td style="text-align:right">${s.feeDue > 0 ? esc(money(s.feeDue)) : "—"}</td>` : ""}<td style="text-align:right">${s.average != null ? s.average + "%" : "—"}</td><td style="text-align:right">${s.position ?? "—"}</td></tr>`).join("")}
          </tbody>${finance ? `<tfoot><tr><td colspan="5">Total fee balance (${summary.owing} owing)</td><td style="text-align:right">${esc(money(summary.feeDueTotal))}</td><td colspan="2"></td></tr></tfoot>` : ""}</table>`;
        printBranded(school, `Class list — ${stream.name}`, body, "#5C67F2");
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)] flex-wrap gap-3">
                <div className="flex items-center">
                    <button onClick={() => navigate("/classes")} className="mr-3 text-gray-400 hover:text-[#5C67F2]" title="Back to classes"><ArrowLeft className="w-4 h-4" /></button>
                    <span className="font-bold text-gray-800 text-lg mr-2">Classes</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <Home className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-500 font-medium">- {stream.name}</span>
                </div>
                <button onClick={print} className="h-9 px-5 bg-[#868DF4] hover:bg-[#5C67F2] text-white text-[11px] font-bold rounded-full shadow-sm flex items-center gap-2 transition-colors"><Printer className="w-3.5 h-3.5" /> Print class list</button>
            </div>

            <div className="p-6 pt-0 w-full space-y-5">
                {/* Class teacher + class summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-[#868DF4]/15 text-[#5C67F2] flex items-center justify-center shrink-0"><User className="w-7 h-7" /></div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class teacher</div>
                            {teacher ? (
                                <>
                                    <div className="text-lg font-black text-slate-800 truncate">{teacher.name}</div>
                                    <div className="text-xs text-slate-500">{teacher.designation || "Teacher"}</div>
                                    <div className="flex flex-wrap gap-x-3 text-[11px] text-slate-500 mt-1">
                                        {teacher.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{teacher.phone}</span>}
                                        {teacher.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{teacher.email}</span>}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-base font-black text-slate-400">Not assigned yet</div>
                                    <button onClick={() => navigate("/classes")} className="text-xs font-bold text-[#5C67F2] hover:underline">Assign a class teacher →</button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className={`lg:col-span-2 grid grid-cols-2 gap-3 ${finance ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                        {[
                            { icon: Users, label: "Students", value: summary.total, sub: `${summary.boys} boys · ${summary.girls} girls${stream.capacity ? ` · capacity ${stream.capacity}` : ""}`, color: "text-[#5C67F2]" },
                            ...(finance ? [{ icon: Wallet, label: "Fee balance", value: money(summary.feeDueTotal), sub: `${summary.owing} student${summary.owing === 1 ? "" : "s"} owing`, color: summary.feeDueTotal > 0 ? "text-rose-600" : "text-emerald-600" }] : []),
                            { icon: GraduationCap, label: "Class mean", value: summary.classMean != null ? `${summary.classMean}%` : "—", sub: examName || "All exams", color: "text-emerald-600" },
                            { icon: Trophy, label: "Top student", value: (data.students.filter((s: any) => s.position === 1)[0]?.studentName || "—"), sub: (() => { const t = data.students.find((s: any) => s.position === 1); return t ? `${t.average}%` : "No marks yet"; })(), color: "text-amber-600", small: true },
                        ].map((c: any) => (
                            <div key={c.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><c.icon className="w-3.5 h-3.5" />{c.label}</div>
                                <div className={`${c.small ? "text-sm" : "text-xl"} font-black mt-1 truncate ${c.color}`}>{c.value}</div>
                                <div className="text-[11px] text-slate-400 truncate">{c.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white font-medium text-gray-700 cursor-pointer">
                            {SORTS.filter(s => finance || !s.v.startsWith("fee_")).map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                        </select>
                        <select value={examId} onChange={e => setExamId(e.target.value)} className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white font-medium text-gray-700 cursor-pointer" title="Which exam the average is worked out from">
                            <option value="">Performance: all exams</option>
                            {exams.map((e: any) => <option key={e._id} value={e._id}>{e.name}{e.term ? ` · ${e.term}` : ""}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…" className="h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white w-full md:w-64" />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                {/* Students */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    {["#", "Student", "Gender", "Contact", ...(finance ? ["Billed", "Paid", "Fee balance"] : []), "Average", "Position"].map((h, i) => <th key={h} className={`p-4 text-xs font-bold text-gray-500 uppercase tracking-wider ${i >= 4 ? "text-right" : ""}`}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr><td colSpan={finance ? 9 : 6} className="p-12 text-center text-sm font-bold text-gray-400">{summary.total ? "No students match your search." : "No students in this class yet."}</td></tr>
                                ) : rows.map((s, i) => (
                                    <tr key={s._id} onClick={() => navigate(`/students/report/${s._id}`)} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors">
                                        <td className="p-4 text-xs text-gray-400">{i + 1}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden text-[#5C67F2] shrink-0">
                                                    {s.avatar ? <img src={s.avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
                                                </div>
                                                <div><div className="font-bold text-gray-800 text-sm">{s.studentName}</div><div className="text-[11px] text-gray-400">{s.registrationNo || "—"}</div></div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs text-gray-600">{s.gender || "—"}</td>
                                        <td className="p-4 text-xs text-gray-600">{s.phone || "—"}</td>
                                        {finance && <>
                                            <td className="p-4 text-xs text-gray-500 text-right">{s.feeBilled ? money(s.feeBilled) : "—"}</td>
                                            <td className="p-4 text-xs text-gray-500 text-right">{s.feePaid ? money(s.feePaid) : "—"}</td>
                                            <td className={`p-4 text-sm font-black text-right ${s.feeDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>{s.feeDue > 0 ? money(s.feeDue) : "Cleared"}</td>
                                        </>}
                                        <td className="p-4 text-sm font-bold text-right text-gray-700">{s.average != null ? `${s.average}%` : "—"}</td>
                                        <td className="p-4 text-right">{s.position ? <span className={`inline-block min-w-8 px-2 py-0.5 rounded-full text-[11px] font-black ${s.position === 1 ? "bg-amber-100 text-amber-700" : s.position <= 3 ? "bg-indigo-50 text-[#5C67F2]" : "bg-gray-100 text-gray-500"}`}>{s.position}</span> : <span className="text-gray-300">—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
