import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Printer, Loader2 } from "lucide-react";
import api from "@/lib/api";

const REPORTS = [
    { id: "participants", label: "Participants List", endpoint: "/sports-enrollments", cols: [["studentName", "Student"], ["sportName", "Sport"], ["status", "Status"]] },
    { id: "fees", label: "Sports Fee Collection", endpoint: "/sports-enrollments", cols: [["studentName", "Student"], ["sportName", "Sport"], ["fee", "Fee"], ["status", "Status"]] },
    { id: "attendance", label: "Sports Attendance", endpoint: "/sports-attendance", cols: [["date", "Date"], ["studentName", "Student"], ["sportName", "Sport"], ["status", "Status"]] },
    { id: "performance", label: "Sports Performance", endpoint: "/sports-performance", cols: [["studentName", "Student"], ["sportName", "Sport"], ["achievement", "Achievement"], ["value", "Value"]] },
];

export default function SportsReports() {
    const [active, setActive] = useState(REPORTS[0]);
    const { data: rows = [], isLoading } = useQuery({
        queryKey: ["sports_report", active.id],
        queryFn: async () => { try { const r = await api.get(active.endpoint); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6 print:hidden flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white"><FileText className="w-6 h-6" /></div>
                        <div><h1 className="text-xl font-black text-slate-800">Sports Reports</h1><p className="text-xs text-slate-500">Generate and print sports reports</p></div>
                    </div>
                    <button onClick={() => window.print()} className="h-10 px-4 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
                </div>

                <div className="flex gap-2 mb-5 flex-wrap print:hidden">
                    {REPORTS.map((r) => (
                        <button key={r.id} onClick={() => setActive(r)} className={`h-9 px-4 rounded-xl text-xs font-bold border ${active.id === r.id ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-600 border-slate-200"}`}>{r.label}</button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-black text-slate-800">{active.label}</h2></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                {active.cols.map(([, label]) => <th key={label} className="py-3 px-4">{label}</th>)}
                            </tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr><td colSpan={active.cols.length} className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></td></tr>
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={active.cols.length} className="py-16 text-center text-slate-400 text-xs font-bold uppercase">No data</td></tr>
                                ) : rows.map((row: any, i: number) => (
                                    <tr key={row._id || i}>
                                        {active.cols.map(([key]) => <td key={key} className="py-3 px-4 text-slate-700">{key === "fee" ? `KSh ${Number(row[key] || 0).toLocaleString()}` : (row[key] ?? "—")}</td>)}
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
