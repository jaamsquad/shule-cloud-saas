import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StudentCtx } from "../StudentLayout";

const ICON = {
    Cleared: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    Pending: <Clock className="w-4 h-4 text-amber-500" />,
    Blocked: <XCircle className="w-4 h-4 text-rose-600" />,
} as const;

export default function ClearanceRequest() {
    const { api } = useOutletContext<StudentCtx>();
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["sp_clearance"],
        queryFn: async () => (await api.get("/student-portal/clearance")).data,
        retry: false,
    });

    const request = useMutation({
        mutationFn: async () => (await api.post("/student-portal/clearance", {})).data,
        onSuccess: () => {
            toast.success("Clearance request submitted to all departments");
            qc.invalidateQueries({ queryKey: ["sp_clearance"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Request failed"),
    });

    const departments: any[] = data?.departments || [];
    const requested = data?.requested;
    const allCleared = departments.length > 0 && departments.every(d => d.status === "Cleared");

    return (
        <>
            <PageTitle title="Clearance Request" />

            <PanelCard
                title="Clearance Status"
                action={!requested ? (
                    <button disabled={request.isPending} onClick={() => request.mutate()}
                        className="bg-white text-[#0f5132] text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5">
                        {request.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        Request Clearance
                    </button>
                ) : undefined}
            >
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : (
                    <>
                        {requested && (
                            <div className={`mb-4 rounded px-4 py-2.5 text-sm font-semibold ${allCleared ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                {allCleared
                                    ? <><CheckCircle2 className="w-4 h-4 inline align-[-3px] mr-1.5" />You have been fully cleared by all departments.</>
                                    : "Your clearance is being processed by the departments below."}
                            </div>
                        )}
                        <div className="divide-y divide-black/5">
                            {departments.map(d => (
                                <div key={d.name} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{d.name}</p>
                                        {d.note && <p className="text-xs text-slate-500">{d.note}</p>}
                                    </div>
                                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                                        {ICON[d.status as keyof typeof ICON] || ICON.Pending}
                                        {d.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </PanelCard>
        </>
    );
}
