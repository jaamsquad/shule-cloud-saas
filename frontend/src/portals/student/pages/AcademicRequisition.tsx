import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StudentCtx } from "../StudentLayout";

const TYPES = [
    "Official Transcript",
    "Examination Card",
    "Student ID Replacement",
    "Letter of Introduction",
    "Certificate of Good Conduct",
    "Other",
];

const statusColor = (s: string) =>
    s === "Approved" ? "bg-emerald-100 text-emerald-700"
        : s === "Rejected" ? "bg-rose-100 text-rose-700"
            : "bg-amber-100 text-amber-700";

export default function AcademicRequisition() {
    const { api } = useOutletContext<StudentCtx>();
    const qc = useQueryClient();
    const [type, setType] = useState(TYPES[0]);
    const [reason, setReason] = useState("");

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ["sp_requisitions"],
        queryFn: async () => (await api.get("/student-portal/requisitions")).data,
        retry: false,
    });

    const submit = useMutation({
        mutationFn: async () => (await api.post("/student-portal/requisitions", { type, reason })).data,
        onSuccess: () => {
            toast.success("Requisition submitted");
            setReason("");
            qc.invalidateQueries({ queryKey: ["sp_requisitions"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Submission failed"),
    });

    return (
        <>
            <PageTitle title="Academic Requisition" />

            <PanelCard title="New Requisition">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Requisition Type</label>
                        <select value={type} onChange={e => setType(e.target.value)}
                            className="w-full h-10 px-3 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#159a52]/40">
                            {TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Reason / Details</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                        placeholder="Explain why you need this document…"
                        className="w-full px-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#159a52]/40" />
                </div>
                <div className="flex justify-end mt-4">
                    <button disabled={submit.isPending || !reason.trim()} onClick={() => submit.mutate()}
                        className="bg-[#0f2942] hover:bg-[#15395c] disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded flex items-center gap-2">
                        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit Requisition
                    </button>
                </div>
            </PanelCard>

            <PanelCard title="My Requisitions">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : requests.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-6">No requisitions submitted yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-black/10">
                                    <th className="py-2">Type</th>
                                    <th className="py-2">Reason</th>
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((r: any) => (
                                    <tr key={r._id} className="border-b border-black/5">
                                        <td className="py-2.5 font-semibold text-slate-700">{r.type}</td>
                                        <td className="py-2.5 text-slate-600 max-w-xs truncate">{r.reason}</td>
                                        <td className="py-2.5 text-slate-500">{new Date(r.createdAt).toLocaleDateString("en-GB")}</td>
                                        <td className="py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusColor(r.status)}`}>{r.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </PanelCard>
        </>
    );
}
