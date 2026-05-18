import { useState, useEffect } from "react";
import { Save, CalendarDays, Loader2 } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";

const DEFAULT_DAYS = [
    { day: "MON", label: "Monday", is_active: true, order: 1 },
    { day: "TUE", label: "Tuesday", is_active: true, order: 2 },
    { day: "WED", label: "Wednesday", is_active: true, order: 3 },
    { day: "THU", label: "Thursday", is_active: true, order: 4 },
    { day: "FRI", label: "Friday", is_active: true, order: 5 },
    { day: "SAT", label: "Saturday", is_active: false, order: 6 },
    { day: "SUN", label: "Sunday", is_active: false, order: 7 }
];

export default function Weekdays() {
    const { items, isLoading, createItem, updateItem } = useItems("weekdays");
    const [days, setDays] = useState(DEFAULT_DAYS);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (items && items.length > 0) {
            const mapped = DEFAULT_DAYS.map(d => {
                const existing = items.find((i: any) => i.day === d.day);
                return existing ? { ...d, _id: existing._id, is_active: existing.is_active } : d;
            });
            setDays(mapped);
        }
    }, [items]);

    const toggleDay = (dayKey: string) => {
        setDays(prev => prev.map(d => d.day === dayKey ? { ...d, is_active: !d.is_active } : d));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            for (const d of days) {
                if ((d as any)._id) {
                    await updateItem({ id: (d as any)._id, day: d.day, is_active: d.is_active, order: d.order });
                } else {
                    await createItem({ day: d.day, is_active: d.is_active, order: d.order });
                }
            }
            toast.success("Weekdays saved successfully");
        } catch (e) {
            toast.error("Failed to save weekdays");
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>;

    const activeCount = days.filter(d => d.is_active).length;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                    <CalendarDays className="w-6 h-6 text-[#5C67F2]" />
                    <h2 className="text-xl font-bold text-gray-900">Manage Active Weekdays</h2>
                </div>

                <div className="flex flex-wrap gap-4 mb-8">
                    {days.map(d => (
                        <button
                            key={d.day}
                            onClick={() => toggleDay(d.day)}
                            className={`px-6 py-4 rounded-xl font-bold text-sm border-2 transition-all flex-1 min-w-[120px] ${
                                d.is_active 
                                    ? "bg-[#5C67F2]/10 border-[#5C67F2] text-[#5C67F2] shadow-sm" 
                                    : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"
                            }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <p className="text-gray-500 font-medium text-sm">
                        Total active learning days: <span className="font-bold text-[#5C67F2]">{activeCount} days</span>
                    </p>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#5C67F2] hover:bg-[#4b54db] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md disabled:opacity-70"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
