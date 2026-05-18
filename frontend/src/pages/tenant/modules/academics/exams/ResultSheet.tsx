import { useState } from "react";
import {
    Home, Download, Printer, ChevronDown, Loader2, BarChart3,
    TrendingUp, Users, Award, BookOpen, Search, ArrowUpDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

function autoGrade(
    pct: number,
    tiers?: Array<{ grade: string; from: number; upto: number; status: string }>
): string {
    if (tiers && tiers.length > 0) {
        const sorted = [...tiers].sort((a, b) => b.from - a.from);
        const match = sorted.find(t => pct >= t.from && pct <= t.upto);
        if (match) return match.grade;
    }
    if (pct >= 80) return "A+";
    if (pct >= 70) return "A";
    if (pct >= 60) return "B+";
    if (pct >= 50) return "B";
    if (pct >= 40) return "C";
    if (pct >= 33) return "D";
    return "F";
}

export default function ResultSheet() {
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [sortField, setSortField] = useState<"name" | "total" | "rank">("rank");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [search, setSearch] = useState("");

    const { data: exams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data });
    const { data: periods = [] } = useQuery<any[]>({ queryKey: ["periods"], queryFn: async () => (await api.get("/academics/periods")).data });
    const { data: gradingConfig } = useQuery<any>({ queryKey: ["grading_criteria"], queryFn: async () => (await api.get("/grading_criteria")).data?.[0] });
    const gradeTiers: Array<{ grade: string; from: number; upto: number; status: string }> = gradingConfig?.grades || [];
    const currentPeriod = periods.find((p: any) => p.isCurrent);

    const { data: marks = [], isLoading } = useQuery<any[]>({
        queryKey: ["result-sheet", selectedExam?._id, selectedClass?._id],
        queryFn: async () => selectedExam && selectedClass
            ? (await api.get(`/academics/exam-marks?examId=${selectedExam._id}&classId=${selectedClass._id}`)).data
            : [],
        enabled: !!selectedExam && !!selectedClass,
    });

    // Group marks by student
    const studentMap: Record<string, any> = {};
    marks.forEach((m: any) => {
        if (!studentMap[m.studentId]) {
            studentMap[m.studentId] = {
                studentId: m.studentId, studentName: m.studentName, admNo: m.admNo || "—",
                subjects: {}, totalObtained: 0, totalMax: 0
            };
        }
        studentMap[m.studentId].subjects[m.subjectName || m.subjectId] = m;
        studentMap[m.studentId].totalObtained += Number(m.marksObtained) || 0;
        studentMap[m.studentId].totalMax += Number(m.totalMarks) || 100;
    });

    const allSubjects = [...new Set(marks.map((m: any) => m.subjectName || m.subjectId))];
    let rows = Object.values(studentMap).map((s: any) => ({
        ...s,
        pct: s.totalMax > 0 ? Math.round((s.totalObtained / s.totalMax) * 100) : 0,
        grade: autoGrade(s.totalMax > 0 ? Math.round((s.totalObtained / s.totalMax) * 100) : 0, gradeTiers),
    }));

    // Rank
    rows = rows.sort((a, b) => b.pct - a.pct).map((r, i) => ({ ...r, rank: i + 1 }));

    // Sort and filter
    const filtered = rows
        .filter(r => (r.studentName || "").toLowerCase().includes(search.toLowerCase()) || (r.admNo || "").toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            let va = sortField === "name" ? a.studentName : sortField === "total" ? a.totalObtained : a.rank;
            let vb = sortField === "name" ? b.studentName : sortField === "total" ? b.totalObtained : b.rank;
            if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortDir === "asc" ? va - vb : vb - va;
        });

    const meanScore = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
    const passCount = rows.filter(r => r.pct >= 50).length;
    const topStudent = rows[0];

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("asc"); }
    };

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Exams</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Result Sheet</span>
                </div>
                {filtered.length > 0 && (
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md transition-all">
                        <Printer className="w-3.5 h-3.5" /> Print Result Sheet
                    </button>
                )}
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-7xl mx-auto">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Result Sheet</h1>
                <p className="text-slate-400 text-sm font-medium mb-8">Full class result analysis with rankings and subject breakdown.</p>

                {/* Filters */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: "Select Exam", opts: exams, key: "examName", val: selectedExam, set: setSelectedExam },
                        { label: "Select Class", opts: classes, key: "name", val: selectedClass, set: setSelectedClass },
                    ].map(({ label, opts, key, val, set }) => (
                        <div key={label} className="relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</label>
                            <select value={val?._id || ""} onChange={e => set(opts.find((o: any) => o._id === e.target.value) || null)} className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none">
                                <option value="">— Select —</option>
                                {opts.map((o: any) => (
                                    <option key={o._id} value={o._id}>
                                        {o.levelName || o.examName || o.name || "—"}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 bottom-4 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    ))}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Search Student</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by name or adm no…" className="w-full h-12 pl-12 pr-4 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-300" />
                        </div>
                    </div>
                </div>

                {/* Stats */}
                {rows.length > 0 && (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {[
                            { label: "Total Students", value: rows.length, color: "#5C67F2", bg: "#eef0fe", icon: Users },
                            { label: "Mean Score", value: `${meanScore}%`, color: "#10b981", bg: "#d1fae5", icon: BarChart3 },
                            { label: "Passed (≥50%)", value: passCount, color: "#3b82f6", bg: "#dbeafe", icon: Award },
                            { label: "Top Student", value: topStudent?.studentName?.split(" ")[0] || "—", color: "#f59e0b", bg: "#fef3c7", icon: TrendingUp },
                        ].map(({ label, value, color, bg, icon: Icon }) => (
                            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                                    <Icon className="w-5 h-5" style={{ color }} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                                    <p className="text-xl font-black" style={{ color }}>{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!selectedExam || !selectedClass ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-4">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                            <BarChart3 className="w-10 h-10 text-[#5C67F2]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-black text-slate-700">Select Exam & Class</h3>
                            <p className="text-slate-400 text-sm font-medium mt-1">Choose an exam and class to generate the class result sheet.</p>
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center py-24 gap-4"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-16 gap-4">
                        <BookOpen className="w-10 h-10 text-slate-300" />
                        <p className="text-slate-400 font-bold">No results found for this exam and class.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#5C67F2]/5 to-transparent">
                            <h3 className="font-black text-slate-700 text-sm">{selectedExam?.examName} · {selectedClass?.levelName || selectedClass?.name}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{filtered.length} student(s) · {allSubjects.length} subject(s)</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-gray-100">
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                                            <button onClick={() => toggleSort("rank")} className="flex items-center gap-1 hover:text-[#5C67F2]">Rank <ArrowUpDown className="w-3 h-3" /></button>
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                                            <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-[#5C67F2]">Student <ArrowUpDown className="w-3 h-3" /></button>
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Adm No</th>
                                        {allSubjects.map(sub => (
                                            <th key={sub} className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center max-w-[70px]">
                                                {(sub || "").length > 8 ? sub.substring(0, 7) + "…" : sub}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                                            <button onClick={() => toggleSort("total")} className="flex items-center gap-1 hover:text-[#5C67F2]">Total <ArrowUpDown className="w-3 h-3" /></button>
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">%</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Grade</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((row, i) => (
                                        <tr key={row.studentId} className={`border-b border-gray-50 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mx-auto ${row.rank <= 3 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                                                    {row.rank}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-xl bg-indigo-50 text-[#5C67F2] flex items-center justify-center text-[10px] font-black">{(row.studentName || "?")[0]}</div>
                                                    <span className="text-sm font-black text-slate-700">{row.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-400">{row.admNo}</td>
                                            {allSubjects.map(sub => {
                                                const m = row.subjects[sub];
                                                return (
                                                    <td key={sub} className="px-3 py-3 text-center text-xs font-black">
                                                        {m ? (
                                                            <span className={m.attendanceStatus === "Absent" ? "text-red-400" : "text-slate-700"}>{m.marksObtained}</span>
                                                        ) : <span className="text-slate-200">—</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3 text-center font-black text-[#5C67F2]">{row.totalObtained}/{row.totalMax}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-black ${row.pct >= 50 ? "text-emerald-600" : "text-red-500"}`}>{row.pct}%</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-xs font-black px-2 py-1 rounded-lg bg-indigo-50 text-[#5C67F2]">{row.grade}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${row.pct >= 50 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                                                    {row.pct >= 50 ? "PASS" : "FAIL"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
