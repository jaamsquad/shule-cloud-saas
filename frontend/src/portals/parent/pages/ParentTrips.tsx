import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Calendar, Check, X, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { ParentCtx } from "../ParentLayout";

const ksh = (n: any) => `KSh ${Number(n || 0).toLocaleString()}`;

export default function ParentTrips() {
    const { api, child } = useOutletContext<ParentCtx>();
    const qc = useQueryClient();

    const { data: trips = [], isLoading } = useQuery({
        queryKey: ["parent_trips", child?._id],
        queryFn: async () => { try { const r = await api.get("/parent-portal/trips"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    const consent = useMutation({
        mutationFn: async ({ id, decision }: { id: string; decision: "approve" | "decline" }) =>
            api.post(`/parent-portal/trips/${id}/consent`, { decision }),
        onSuccess: (_res, vars) => {
            toast.success(vars.decision === "approve" ? "Consent given — fee added for payment" : "Trip declined");
            qc.invalidateQueries({ queryKey: ["parent_trips"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white"><MapPin className="w-5 h-5" /></div>
                <div>
                    <h1 className="text-lg font-black text-slate-800">Trips & Excursions</h1>
                    <p className="text-xs text-slate-500">Approve trips and pay for {child?.name || "your child"}</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading trips…</div>
            ) : trips.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm font-bold">No trips available right now</div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {trips.map((t: any) => (
                        <div key={t._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="h-1.5 bg-[#5C67F2]" />
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <h3 className="font-black text-slate-800">{t.name}</h3>
                                    {t.fee > 0 && <span className="text-xs font-black text-[#5C67F2]">{ksh(t.fee)}</span>}
                                </div>
                                {t.destination && <p className="text-xs text-slate-500 mt-0.5">{t.destination}</p>}
                                {t.description && <p className="text-[11px] text-slate-400 mt-2 line-clamp-3">{t.description}</p>}
                                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400 font-bold">
                                    {t.date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {t.date}</span>}
                                    {t.deadline && <span>Deadline: {t.deadline}</span>}
                                </div>

                                {/* Status / actions */}
                                <div className="mt-4">
                                    {t.consentStatus === "pending" ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => consent.mutate({ id: t._id, decision: "approve" })} disabled={consent.isPending}
                                                className="flex-1 h-9 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                <Check className="w-3.5 h-3.5" /> Approve
                                            </button>
                                            <button onClick={() => consent.mutate({ id: t._id, decision: "decline" })} disabled={consent.isPending}
                                                className="flex-1 h-9 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                                                <X className="w-3.5 h-3.5" /> Decline
                                            </button>
                                        </div>
                                    ) : t.consentStatus === "declined" ? (
                                        <div className="text-center text-xs font-bold text-slate-400 py-2 bg-slate-50 rounded-lg">Declined</div>
                                    ) : t.paid ? (
                                        <div className="text-center text-xs font-black text-emerald-600 py-2 bg-emerald-50 rounded-lg flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Confirmed &amp; Paid</div>
                                    ) : t.fee > 0 ? (
                                        <div className="space-y-2">
                                            <div className="text-center text-[11px] font-bold text-amber-600 py-1.5 bg-amber-50 rounded-lg">Approved — payment pending</div>
                                            <a href="/fees" className="h-9 bg-[#5C67F2] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Pay {ksh(t.fee)}{t.invoiceNo ? ` · ${t.invoiceNo}` : ""}</a>
                                        </div>
                                    ) : (
                                        <div className="text-center text-xs font-black text-emerald-600 py-2 bg-emerald-50 rounded-lg">Confirmed</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
