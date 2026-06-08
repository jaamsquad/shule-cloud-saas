import { useState, useEffect } from "react";
import { Home, Check, Loader2, Plus, Trash2, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const defaultSettings = {
    checkInTime: "18:00", checkOutTime: "06:00", visitorsAllowed: true,
    visitorHours: "08:00–20:00", maxBedsPerStudent: 1,
    finePerNightAbsence: 50, wifiEnabled: false, laundryIncluded: false,
    mealsIncluded: false, guestRoomsAvailable: false,
    wardenName: "", wardenPhone: "", wardenEmail: "",
    rules: [
        "Lights out at 10:00 PM on weekdays",
        "No visitors after 8:00 PM",
        "Maintain cleanliness in common areas",
        "Report any maintenance issues immediately",
        "No cooking in rooms unless designated kitchen used",
    ],
    notes: "",
};

export default function HostelSettings() {
    const qc = useQueryClient();
    const [settings, setSettings] = useState(defaultSettings);
    const [newRule, setNewRule] = useState("");
    const [settingsId, setSettingsId] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const { data: existing, isLoading } = useQuery({
        queryKey: ["hostel_settings"],
        queryFn: async () => {
            const r = await api.get("/hostel_settings");
            return Array.isArray(r.data) ? r.data[0] : null;
        },
    });

    useEffect(() => {
        if (existing) {
            setSettingsId(existing._id);
            setSettings({ ...defaultSettings, ...existing });
        }
    }, [existing]);

    const saveMut = useMutation({
        mutationFn: (p: any) => settingsId
            ? api.patch(`/hostel_settings/${settingsId}`, p)
            : api.post("/hostel_settings", p),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["hostel_settings"] });
            if (!settingsId) setSettingsId(res.data?.id || res.data?._id);
            toast.success("Hostel settings saved");
            setIsDirty(false);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const update = (field: string, value: any) => { setSettings(p => ({ ...p, [field]: value })); setIsDirty(true); };
    const addRule = () => { if (newRule.trim()) { update("rules", [...(settings.rules || []), newRule.trim()]); setNewRule(""); } };
    const removeRule = (i: number) => update("rules", settings.rules.filter((_: any, j: number) => j !== i));

    const Field = ({ label, field, type = "text", placeholder }: { label: string; field: string; type?: string; placeholder?: string }) => (
        <div className="relative">
            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{label}</div>
            <input type={type} value={(settings as any)[field] ?? ""} onChange={e => update(field, type === "number" ? Number(e.target.value) : e.target.value)} placeholder={placeholder}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
        </div>
    );

    const Toggle = ({ label, field, description }: { label: string; field: string; description?: string }) => (
        <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100">
            <div><p className="text-xs font-black text-slate-700 uppercase tracking-widest">{label}</p>{description && <p className="text-[9px] text-slate-400 font-bold mt-0.5">{description}</p>}</div>
            <button onClick={() => update(field, !(settings as any)[field])}
                className={`w-12 h-7 rounded-full transition-all relative flex-shrink-0 ${(settings as any)[field] ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${(settings as any)[field] ? "right-1" : "left-1"}`} />
            </button>
        </div>
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Hostel</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Hostel Settings</span>
                </div>
                <button onClick={() => saveMut.mutate(settings)} disabled={saveMut.isPending || !isDirty}
                    className={`h-10 px-5 font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all ${isDirty ? "bg-[#5C67F2] hover:bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {isDirty ? "Save Settings" : "All Saved"}
                </button>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Settings className="w-7 h-7 text-[#5C67F2]" />Hostel Settings</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Configure hostel rules, check-in/out times, amenities, and warden details</p>
                </div>

                {isLoading ? <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading settings...</div> : (
                    <div className="space-y-6">
                        {/* Check-in/out */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Check-In / Check-Out Times</h3>
                            <div className="grid grid-cols-2 gap-5">
                                <Field label="Evening Check-In Time" field="checkInTime" type="time" />
                                <Field label="Morning Check-Out Time" field="checkOutTime" type="time" />
                                <Field label="Visitor Hours (e.g. 08:00–20:00)" field="visitorHours" />
                                <Field label="Fine Per Night Absence (KSh)" field="finePerNightAbsence" type="number" />
                                <Field label="Max Beds Per Student" field="maxBedsPerStudent" type="number" />
                            </div>
                        </div>

                        {/* Warden info */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Warden / Matron Details</h3>
                            <div className="grid grid-cols-2 gap-5">
                                <Field label="Warden Name" field="wardenName" placeholder="e.g. Mr. Ochieng" />
                                <Field label="Warden Phone" field="wardenPhone" placeholder="+254..." />
                                <Field label="Warden Email" field="wardenEmail" type="email" placeholder="warden@school.ac.ke" />
                            </div>
                        </div>

                        {/* Amenities toggles */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Amenities & Facilities</h3>
                            <div className="space-y-3">
                                <Toggle label="WiFi Available" field="wifiEnabled" description="Internet access in hostel blocks" />
                                <Toggle label="Laundry Included" field="laundryIncluded" description="Laundry service included in hostel fee" />
                                <Toggle label="Meals Included" field="mealsIncluded" description="Dining/meals included in hostel fee" />
                                <Toggle label="Visitors Allowed" field="visitorsAllowed" description="External visitors permitted during visiting hours" />
                                <Toggle label="Guest Rooms Available" field="guestRoomsAvailable" description="Temporary accommodation for guests" />
                            </div>
                        </div>

                        {/* Rules */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Hostel Rules & Regulations</h3>
                            <div className="space-y-3 mb-5">
                                {(settings.rules || []).map((rule: string, i: number) => (
                                    <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                                        <span className="w-5 h-5 rounded-lg bg-[#5C67F2] text-white font-black text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                        <p className="text-xs font-bold text-slate-700 flex-1">{rule}</p>
                                        <button onClick={() => removeRule(i)} className="text-slate-300 hover:text-rose-500 flex-shrink-0 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <input type="text" value={newRule} onChange={e => setNewRule(e.target.value)} onKeyDown={e => e.key === "Enter" && addRule()} placeholder="Type a new rule and press Enter or click Add..."
                                    className="flex-1 h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                <button onClick={addRule} className="h-11 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                                    <Plus className="w-4 h-4" /> Add
                                </button>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 pb-2 border-b border-slate-50">Additional Notes</h3>
                            <textarea value={settings.notes} onChange={e => update("notes", e.target.value)} rows={3} placeholder="Any additional notes or special instructions for hostel management..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                        </div>

                        {/* Bottom save */}
                        <div className="flex justify-end pb-4">
                            <button onClick={() => saveMut.mutate(settings)} disabled={saveMut.isPending || !isDirty}
                                className={`h-12 px-10 font-black text-sm uppercase tracking-widest rounded-2xl flex items-center gap-2 transition-all ${isDirty ? "bg-[#5C67F2] hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                                {saveMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                Save All Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
