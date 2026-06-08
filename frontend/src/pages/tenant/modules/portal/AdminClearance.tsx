import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const STATUSES = ["Pending", "Cleared", "Blocked"];

const icon = (s: string) =>
    s === "Cleared" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        : s === "Blocked" ? <XCircle className="w-4 h-4 text-rose-600" />
            : <Clock className="w-4 h-4 text-amber-500" />;

export default function AdminClearance() {
    const qc = useQueryClient();

    const { data = [], isLoading } = useQuery({
        queryKey: ["admin_clearance"],
        queryFn: async () => {
            const r = await api.get("/portal_clearances");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const update = useMutation({
        mutationFn: async ({ id, departments }: { id: string; departments: any[] }) =>
            api.patch(`/portal_clearances/${id}`, { departments, updatedAt: new Date() }),
        onSuccess: () => {
            toast.success("Clearance updated");
            qc.invalidateQueries({ queryKey: ["admin_clearance"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Update failed"),
    });

    const setDept = (req: any, deptName: string, status: string) => {
        const departments = req.departments.map((d: any) =>
            d.name === deptName ? { ...d, status } : d
        );
        update.mutate({ id: req._id, departments });
    };

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800">Clearance Requests</h1>
                    <p className="text-xs text-slate-500">Approve or block students per department</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-12 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                </div>
            ) : data.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-center text-slate-400 text-sm py-12">No clearance requests yet.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {data.map((req: any) => {
                        const cleared = (req.departments || []).filter((d: any) => d.status === "Cleared").length;
                        return (
                            <div key={req._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                                    <div>
                                        <p className="font-black text-slate-800">{req.studentName || "Student"}</p>
                                        <p className="text-xs text-slate-400">Requested {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString("en-GB") : ""}</p>
                                    </div>
                                    <span className="text-xs font-bold text-slate-500">{cleared}/{req.departments?.length || 0} cleared</span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {(req.departments || []).map((d: any) => (
                                        <div key={d.name} className="flex items-center justify-between px-5 py-3">
                                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                {icon(d.status)} {d.name}
                                            </span>
                                            <div className="flex gap-1">
                                                {STATUSES.map(s => (
                                                    <button key={s} disabled={update.isPending}
                                                        onClick={() => setDept(req, d.name, s)}
                                                        className={`text-xs font-bold px-2.5 py-1 rounded border transition-colors ${d.status === s
                                                            ? s === "Cleared" ? "bg-emerald-500 border-emerald-500 text-white"
                                                                : s === "Blocked" ? "bg-rose-500 border-rose-500 text-white"
                                                                    : "bg-amber-400 border-amber-400 text-white"
                                                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
