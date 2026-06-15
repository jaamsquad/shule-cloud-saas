import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Utensils, Search, Loader2 } from "lucide-react";
import api from "@/lib/api";

const time = (t: any) => (t ? new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function MealHistory() {
    const [q, setQ] = useState("");
    const [date, setDate] = useState("");
    const [mealType, setMealType] = useState("");
    const { data: rows = [], isLoading } = useQuery({
        queryKey: ["meal_history", q, date, mealType],
        queryFn: async () => (await api.get("/cafeteria/meals", { params: { q: q || undefined, date: date || undefined, mealType: mealType || undefined } })).data,
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-5"><div className="w-11 h-11 bg-amber-500 rounded-2xl flex items-center justify-center text-white"><Utensils className="w-5 h-5" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">Meal History</h1><p className="text-xs text-slate-500">All meals served, with food-photo evidence</p></div></div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Student or admission no…" className="w-full h-10 pl-10 pr-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" /></div>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-sm" />
                    <select value={mealType} onChange={e => setMealType(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600"><option value="">All Meals</option><option>Breakfast</option><option>Lunch</option><option>Supper</option></select>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-500 text-[11px] uppercase"><th className="text-left px-5 py-3 font-black">Student</th><th className="text-left px-3 py-3 font-black">Adm No</th><th className="text-left px-3 py-3 font-black">Class</th><th className="text-left px-3 py-3 font-black">Meal</th><th className="text-left px-3 py-3 font-black">Served</th><th className="text-left px-3 py-3 font-black">By</th><th className="text-left px-3 py-3 font-black">Photo</th></tr></thead>
                        <tbody>
                            {isLoading ? <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" /></td></tr>
                                : rows.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-slate-400 text-xs font-bold uppercase">No meals found</td></tr>
                                    : rows.map((r: any) => (
                                        <tr key={r._id} className="border-b border-slate-50">
                                            <td className="px-5 py-3 font-bold text-slate-700">{r.studentName}</td>
                                            <td className="px-3 py-3 text-slate-500">{r.admissionNo || "—"}</td>
                                            <td className="px-3 py-3 text-slate-500">{r.studentClass || "—"}</td>
                                            <td className="px-3 py-3"><span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{r.mealType}</span></td>
                                            <td className="px-3 py-3 text-slate-500">{time(r.time)}</td>
                                            <td className="px-3 py-3 text-slate-500">{r.staffName || "—"}</td>
                                            <td className="px-3 py-3">{r.photo ? <a href={r.photo} target="_blank" rel="noreferrer"><img src={r.photo} className="w-10 h-10 rounded-lg object-cover" /></a> : "—"}</td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
