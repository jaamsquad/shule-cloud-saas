import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileText, Check, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const statusBadge = (s: string) =>
    s === "Approved" ? "bg-emerald-100 text-emerald-700"
        : s === "Rejected" ? "bg-rose-100 text-rose-700"
            : "bg-amber-100 text-amber-700";

export default function AdminRequisitions() {
    const qc = useQueryClient();

    const { data = [], isLoading } = useQuery({
        queryKey: ["admin_requisitions"],
        queryFn: async () => {
            const r = await api.get("/portal_requisitions");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const setStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) =>
            api.patch(`/portal_requisitions/${id}`, { status, reviewedAt: new Date() }),
        onSuccess: () => {
            toast.success("Requisition updated");
            qc.invalidateQueries({ queryKey: ["admin_requisitions"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Update failed"),
    });

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800">Academic Requisitions</h1>
                    <p className="text-xs text-slate-500">Student requests submitted from the portal</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-12 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : data.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-12">No requisitions submitted yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50">
                                    <th className="px-5 py-3">Student</th>
                                    <th className="px-5 py-3">Type</th>
                                    <th className="px-5 py-3">Reason</th>
                                    <th className="px-5 py-3">Date</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((r: any) => (
                                    <tr key={r._id} className="border-b border-slate-50">
                                        <td className="px-5 py-3 font-semibold text-slate-700">{r.studentName || "—"}</td>
                                        <td className="px-5 py-3 text-slate-600">{r.type}</td>
                                        <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{r.reason}</td>
                                        <td className="px-5 py-3 text-slate-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "—"}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusBadge(r.status)}`}>{r.status}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button disabled={r.status === "Approved" || setStatus.isPending}
                                                    onClick={() => setStatus.mutate({ id: r._id, status: "Approved" })}
                                                    className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold px-2.5 py-1.5 rounded">
                                                    <Check className="w-3.5 h-3.5" /> Approve
                                                </button>
                                                <button disabled={r.status === "Rejected" || setStatus.isPending}
                                                    onClick={() => setStatus.mutate({ id: r._id, status: "Rejected" })}
                                                    className="inline-flex items-center gap-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-bold px-2.5 py-1.5 rounded">
                                                    <X className="w-3.5 h-3.5" /> Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
