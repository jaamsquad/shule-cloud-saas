import { useState } from "react";
import { Clock, Plus, Trash2, Edit3, Loader2 } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";

export default function TimePeriods() {
    const { items: periods, isLoading, createItem, updateItem, deleteItem } = useItems("timetable_periods");
    const [formData, setFormData] = useState({ name: "", start_time: "", end_time: "", type: "PERIOD" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await updateItem({ id: editingId, ...formData });
                toast.success("Period updated");
            } else {
                await createItem(formData);
                toast.success("Period added");
            }
            setFormData({ name: "", start_time: "", end_time: "", type: "PERIOD" });
            setEditingId(null);
        } catch (e) {
            toast.error("Failed to save period");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (p: any) => {
        setFormData({ name: p.name, start_time: p.start_time, end_time: p.end_time, type: p.type });
        setEditingId(p._id);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this period?")) {
            try {
                await deleteItem(id);
                toast.success("Period deleted");
            } catch (e) {
                toast.error("Failed to delete");
            }
        }
    };

    const sortedPeriods = [...(periods || [])].sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#5C67F2]" /> Time Periods
                    </h2>
                </div>
                
                <div className="p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Name</th>
                                <th className="p-4">Start Time</th>
                                <th className="p-4">End Time</th>
                                <th className="p-4">Type</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#5C67F2]" /></td></tr>
                            ) : sortedPeriods.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No periods defined.</td></tr>
                            ) : (
                                sortedPeriods.map((p: any) => (
                                    <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-4 font-bold text-gray-800">{p.name}</td>
                                        <td className="p-4 text-gray-600">{p.start_time}</td>
                                        <td className="p-4 text-gray-600">{p.end_time}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                                p.type === "BREAK" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                            }`}>
                                                {p.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleEdit(p)} className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(p._id)} className="p-2 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">{editingId ? "Edit Period" : "Add New Period"}</h3>
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Name</label>
                            <input required type="text" placeholder="e.g. Period 1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Start Time</label>
                            <input required type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">End Time</label>
                            <input required type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Type</label>
                            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm bg-white">
                                <option value="PERIOD">Lesson Period</option>
                                <option value="BREAK">Break / Lunch</option>
                            </select>
                        </div>
                        <button disabled={submitting} type="submit" className="h-10 px-6 bg-[#5C67F2] hover:bg-[#4b54db] text-white rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-70 text-sm">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingId ? "Update" : "Add"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
