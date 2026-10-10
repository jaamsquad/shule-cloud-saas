import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { CommApiBase } from "@/components/comm/TemplatePicker";
import Meetings from "../communications/Meetings";

/**
 * Secretary → Meeting Management: the same meetings calendar as Communication → Meetings
 * (create a meeting, pick who is invited, notify them by SMS / email, automatic reminders),
 * served under /secretary so it works for the secretary even when Communication is off.
 * Meetings recorded in the older simple list are still shown underneath.
 */
export default function SecretaryMeetings() {
    const [showOld, setShowOld] = useState(false);
    const { data: old = [] } = useQuery<any[]>({
        queryKey: ["secretary_meetings"],
        queryFn: async () => { try { const r = await api.get("/secretary-meetings"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    return (
        <CommApiBase.Provider value="/secretary">
            <Meetings section="secretary" />
            {old.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 pb-12">
                    <button onClick={() => setShowOld(v => !v)} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                        <ChevronDown className={`w-4 h-4 transition-transform ${showOld ? "rotate-180" : ""}`} /> Earlier meeting records ({old.length})
                    </button>
                    {showOld && (
                        <div className="mt-3 bg-white rounded-2xl border border-slate-100 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                                    <th className="py-2.5 px-4">Date</th><th className="py-2.5 px-2">Time</th><th className="py-2.5 px-2">Title</th><th className="py-2.5 px-2">Type</th><th className="py-2.5 px-2">Venue</th><th className="py-2.5 px-2">Status</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {old.map((m: any) => (
                                        <tr key={m._id}><td className="py-2 px-4">{m.date || "—"}</td><td className="py-2 px-2">{m.time || "—"}</td><td className="py-2 px-2 font-bold text-slate-700">{m.title}</td><td className="py-2 px-2">{m.type || "—"}</td><td className="py-2 px-2">{m.venue || "—"}</td><td className="py-2 px-2">{m.status || "—"}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </CommApiBase.Provider>
    );
}
