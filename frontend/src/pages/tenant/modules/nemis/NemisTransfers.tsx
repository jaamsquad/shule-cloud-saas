import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { nemis } from "./nemisApi";

const TABS = [
    { key: "", label: "All" },
    { key: "?direction=incoming", label: "Incoming" },
    { key: "?direction=outgoing", label: "Outgoing" },
    { key: "?status=Pending", label: "Pending" },
    { key: "?status=Completed", label: "Completed" },
];
const STATUSES = ["Pending", "In Progress", "Completed"];

export default function NemisTransfers() {
    const qc = useQueryClient();
    const [tab, setTab] = useState("");
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ studentName: "", admissionNo: "", direction: "outgoing", previousSchool: "", newSchool: "", transferDate: "", reason: "", status: "Pending" });

    const { data: rows = [], isLoading } = useQuery({ queryKey: ["nemis_transfers", tab], queryFn: () => nemis.transfers(tab) });

    const create = async () => {
        if (!form.studentName) return toast.error("Student name is required");
        try { await nemis.createTransfer(form); toast.success("Transfer recorded"); setOpen(false); setForm({ studentName: "", admissionNo: "", direction: "outgoing", previousSchool: "", newSchool: "", transferDate: "", reason: "", status: "Pending" }); qc.invalidateQueries({ queryKey: ["nemis_transfers"] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    };
    const setStatus = async (id: string, status: string) => { await nemis.updateTransfer(id, { status }); qc.invalidateQueries({ queryKey: ["nemis_transfers"] }); };
    const printDoc = (t: any) => {
        const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups");
        w.document.write(`<!DOCTYPE html><html><head><title>Transfer — ${t.studentName}</title><style>@page{margin:20mm}body{font-family:Arial;color:#1e293b}h1{color:#0F766E}table{margin-top:16px}td{padding:6px 12px}td:first-child{color:#64748b}</style></head><body><h1>Student Transfer ${t.direction === "incoming" ? "In" : "Out"}</h1><table><tr><td>Student</td><td><b>${t.studentName}</b></td></tr><tr><td>Admission No</td><td>${t.admissionNo || "—"}</td></tr><tr><td>From</td><td>${t.previousSchool || "—"}</td></tr><tr><td>To</td><td>${t.newSchool || "—"}</td></tr><tr><td>Date</td><td>${t.transferDate || "—"}</td></tr><tr><td>Reason</td><td>${t.reason || "—"}</td></tr><tr><td>Status</td><td>${t.status}</td></tr></table><div style="margin-top:60px;display:flex;justify-content:space-between"><div>____________________<br/>Head Teacher</div><div>____________________<br/>Date & Stamp</div></div><script>onload=()=>print()</script></body></html>`);
        w.document.close();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1">{TABS.map(t => <button key={t.label} onClick={() => setTab(t.key)} className={`h-9 px-3 rounded-lg text-xs font-bold ${tab === t.key ? "bg-[#0F766E] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{t.label}</button>)}</div>
                <button onClick={() => setOpen(true)} className="h-9 px-4 bg-[#0F766E] text-white rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> New Transfer</button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                {isLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#0F766E]" /></div> : (
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase"><th className="text-left px-4 py-3 font-black">Student</th><th className="text-left px-4 py-3 font-black">Direction</th><th className="text-left px-4 py-3 font-black">From → To</th><th className="text-left px-4 py-3 font-black">Date</th><th className="text-left px-4 py-3 font-black">Status</th><th className="px-4 py-3" /></tr></thead>
                        <tbody>
                            {rows.map((t: any) => (
                                <tr key={t._id} className="border-b border-slate-50">
                                    <td className="px-4 py-3 font-bold text-slate-800">{t.studentName}<div className="text-[10px] text-slate-400 font-normal">{t.admissionNo}</div></td>
                                    <td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${t.direction === "incoming" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>{t.direction}</span></td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">{t.previousSchool || "—"} → {t.newSchool || "—"}</td>
                                    <td className="px-4 py-3 text-slate-500">{t.transferDate || "—"}</td>
                                    <td className="px-4 py-3"><select value={t.status} onChange={e => setStatus(t._id, e.target.value)} className="h-8 px-2 border border-slate-200 rounded-lg text-xs font-bold">{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td>
                                    <td className="px-4 py-3 text-right"><button onClick={() => printDoc(t)} className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-[#0F766E]/10 text-slate-400 hover:text-[#0F766E] flex items-center justify-center"><Printer className="w-3.5 h-3.5" /></button></td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">No transfers</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-800">New Transfer</h2><button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button></div>
                        <div className="grid grid-cols-2 gap-3">
                            {[["studentName", "Student Name"], ["admissionNo", "Admission No"], ["previousSchool", "Previous School"], ["newSchool", "New School"], ["transferDate", "Transfer Date"], ["reason", "Reason"]].map(([k, l]) => (
                                <div key={k}><label className="block text-[11px] font-bold text-slate-600 mb-1">{l}</label><input type={k === "transferDate" ? "date" : "text"} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0F766E]" /></div>
                            ))}
                            <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Direction</label><select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option></select></div>
                        </div>
                        <button onClick={create} className="mt-5 w-full h-10 bg-[#0F766E] text-white rounded-xl font-bold text-sm">Record Transfer</button>
                    </div>
                </div>
            )}
        </div>
    );
}
