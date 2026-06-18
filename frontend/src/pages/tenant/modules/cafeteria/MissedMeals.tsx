import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed, Search, Loader2, Printer } from "lucide-react";
import api from "@/lib/api";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function MissedMeals() {
    const [q, setQ] = useState("");
    const [date, setDate] = useState(todayStr());
    const [mealType, setMealType] = useState("none");

    const { data, isLoading } = useQuery({
        queryKey: ["missed_meals", q, date, mealType],
        queryFn: async () => {
            try { return (await api.get("/cafeteria/meals/missed", { params: { q: q || undefined, date, mealType } })).data; }
            catch { return { missed: [], missedCount: 0, servedCount: 0, totalStudents: 0 }; }
        },
    });

    const rows: any[] = data?.missed || [];
    const label = mealType === "none" ? "took no meal at all" : `missed ${mealType}`;

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-5 print:hidden flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-rose-500 rounded-2xl flex items-center justify-center text-white"><UtensilsCrossed className="w-5 h-5" /></div>
                        <div><h1 className="text-xl font-black text-slate-800">Students Who Missed Meals</h1><p className="text-xs text-slate-500">Students who {label} on the selected date</p></div>
                    </div>
                    <button onClick={() => window.print()} className="h-10 px-4 bg-rose-500 text-white rounded-xl text-sm font-bold flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 print:hidden">
                    <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Student, admission no or class…" className="w-full h-10 pl-10 pr-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-500" /></div>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-sm" />
                    <select value={mealType} onChange={e => setMealType(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">
                        <option value="none">Took no meal at all</option>
                        <option value="Breakfast">Missed Breakfast</option>
                        <option value="Lunch">Missed Lunch</option>
                        <option value="Supper">Missed Supper</option>
                    </select>
                </div>

                {/* Summary tiles */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                    {[
                        { label: "Total Students", value: data?.totalStudents ?? 0, color: "#5C67F2" },
                        { label: "Served", value: data?.servedCount ?? 0, color: "#10b981" },
                        { label: "Missed", value: data?.missedCount ?? 0, color: "#ef4444" },
                    ].map(t => (
                        <div key={t.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t.label}</div>
                            <div className="text-2xl font-black mt-1" style={{ color: t.color }}>{t.value}</div>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-3 px-4">Adm No</th><th className="py-3 px-4">Student</th><th className="py-3 px-4">Class</th><th className="py-3 px-4">Boarding</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={4} className="py-16 text-center text-emerald-600 text-xs font-black uppercase tracking-wide">Everyone was served — no missed meals 🎉</td></tr>
                            ) : rows.map((r) => (
                                <tr key={r._id} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-4 text-slate-500">{r.admissionNo || "—"}</td>
                                    <td className="py-3 px-4 font-bold text-slate-800">{r.studentName || "—"}</td>
                                    <td className="py-3 px-4">{r.studentClass || "—"}</td>
                                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600">{r.boarding}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
