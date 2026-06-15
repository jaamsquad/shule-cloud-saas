import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Trash2, Check, Loader2, Utensils } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = ["Breakfast", "Lunch", "Supper"];

export default function MealMenu() {
    const qc = useQueryClient();
    const [newFood, setNewFood] = useState("");
    const [plan, setPlan] = useState<Record<string, Record<string, string>>>({});

    const { data: foods = [] } = useQuery({ queryKey: ["cafeteria_foods"], queryFn: async () => (await api.get("/cafeteria/foods")).data || [] });
    const { data: menu } = useQuery({ queryKey: ["cafeteria_menu"], queryFn: async () => (await api.get("/cafeteria/menu")).data });
    useEffect(() => { if (menu?.plan) setPlan(menu.plan); }, [menu]);

    const addFood = useMutation({
        mutationFn: async () => (await api.post("/cafeteria/foods", { name: newFood.trim() })).data,
        onSuccess: () => { setNewFood(""); qc.invalidateQueries({ queryKey: ["cafeteria_foods"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const delFood = useMutation({
        mutationFn: async (id: string) => api.delete(`/cafeteria/foods/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["cafeteria_foods"] }),
    });
    const saveMenu = useMutation({
        mutationFn: async () => (await api.post("/cafeteria/menu", { plan })).data,
        onSuccess: () => { toast.success("Weekly menu saved"); qc.invalidateQueries({ queryKey: ["cafeteria_menu"] }); },
    });

    const setCell = (day: string, meal: string, food: string) => setPlan(p => ({ ...p, [day]: { ...(p[day] || {}), [meal]: food } }));

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3"><div className="w-11 h-11 bg-amber-500 rounded-2xl flex items-center justify-center text-white"><CalendarDays className="w-5 h-5" /></div>
                        <div><h1 className="text-xl font-black text-slate-800">Weekly Meal Menu</h1><p className="text-xs text-slate-500">Define the foods served each day — the kitchen serves from this</p></div></div>
                    <button onClick={() => saveMenu.mutate()} disabled={saveMenu.isPending} className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2">{saveMenu.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Menu</button>
                </div>

                <div className="grid lg:grid-cols-[260px_1fr] gap-6">
                    {/* Foods */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-fit">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Utensils className="w-4 h-4" /> Foods / Dishes</p>
                        <div className="flex gap-2 mb-3">
                            <input value={newFood} onChange={e => setNewFood(e.target.value)} onKeyDown={e => e.key === "Enter" && newFood.trim() && addFood.mutate()} placeholder="e.g. Ugali & Beef" className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                            <button onClick={() => newFood.trim() && addFood.mutate()} className="w-9 h-9 bg-amber-500 text-white rounded-lg flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-1 max-h-80 overflow-y-auto">
                            {foods.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">No foods yet.</p> : foods.map((f: any) => (
                                <div key={f._id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5">
                                    <span className="text-xs font-bold text-slate-700">{f.name}</span>
                                    <button onClick={() => delFood.mutate(f._id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weekly grid */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 text-slate-500 text-[11px] uppercase">
                                <th className="text-left px-5 py-3 font-black">Day</th>
                                {MEALS.map(m => <th key={m} className="text-left px-3 py-3 font-black">{m}</th>)}
                            </tr></thead>
                            <tbody>
                                {DAYS.map(day => (
                                    <tr key={day} className="border-b border-slate-50">
                                        <td className="px-5 py-3 font-black text-slate-700">{day}</td>
                                        {MEALS.map(meal => (
                                            <td key={meal} className="px-3 py-2">
                                                <select value={plan[day]?.[meal] || ""} onChange={e => setCell(day, meal, e.target.value)} className="w-full h-9 px-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500">
                                                    <option value="">—</option>
                                                    {foods.map((f: any) => <option key={f._id} value={f.name}>{f.name}</option>)}
                                                </select>
                                            </td>
                                        ))}
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
