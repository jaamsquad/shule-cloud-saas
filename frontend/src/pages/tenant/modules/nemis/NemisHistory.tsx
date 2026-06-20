import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download } from "lucide-react";
import { nemis, toCSV, downloadFile } from "./nemisApi";

const ACTIONS = ["", "export", "import", "validation", "transfer"];
const badge = (a: string) => ({ export: "bg-blue-50 text-blue-600", import: "bg-emerald-50 text-emerald-600", validation: "bg-amber-50 text-amber-600", transfer: "bg-indigo-50 text-indigo-600" }[a] || "bg-slate-100 text-slate-500");

export default function NemisHistory() {
    const [action, setAction] = useState("");
    const { data: rows = [], isLoading } = useQuery({ queryKey: ["nemis_history", action], queryFn: () => nemis.syncLog(action ? `?action=${action}` : "") });

    const exportLog = () => {
        const r = rows.map((x: any) => [new Date(x.at).toLocaleString(), x.user, x.action, x.records ?? "", x.status ?? "", x.fileName ?? ""]);
        downloadFile(toCSV(["Date", "User", "Action", "Records", "Status", "File"], r), "nemis_sync_history.csv");
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">{ACTIONS.map(a => <button key={a || "all"} onClick={() => setAction(a)} className={`h-9 px-3 rounded-lg text-xs font-bold capitalize ${action === a ? "bg-[#0F766E] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{a || "All"}</button>)}</div>
                <button onClick={exportLog} className="h-9 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 flex items-center gap-2"><Download className="w-4 h-4" /> Export Log</button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                {isLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0F766E]" /></div> : (
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase"><th className="text-left px-4 py-3 font-black">Date</th><th className="text-left px-4 py-3 font-black">User</th><th className="text-left px-4 py-3 font-black">Action</th><th className="text-left px-4 py-3 font-black">Records</th><th className="text-left px-4 py-3 font-black">Status</th><th className="text-left px-4 py-3 font-black">File</th></tr></thead>
                        <tbody>
                            {rows.map((x: any) => (
                                <tr key={x._id} className="border-b border-slate-50">
                                    <td className="px-4 py-3 text-slate-500">{new Date(x.at).toLocaleString("en-GB")}</td>
                                    <td className="px-4 py-3 text-slate-500">{x.user}</td>
                                    <td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${badge(x.action)}`}>{x.action}</span></td>
                                    <td className="px-4 py-3 font-bold text-slate-700">{x.records ?? "—"}</td>
                                    <td className="px-4 py-3 text-slate-500">{x.status || "—"}</td>
                                    <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[200px]">{x.fileName || "—"}</td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">No history yet</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
