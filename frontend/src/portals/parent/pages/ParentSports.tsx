import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, Check, Loader2, CreditCard, User, Clock } from "lucide-react";
import { toast } from "sonner";
import type { ParentCtx } from "../ParentLayout";

const ksh = (n: any) => `KSh ${Number(n || 0).toLocaleString()}`;

export default function ParentSports() {
    const { api, child } = useOutletContext<ParentCtx>();
    const qc = useQueryClient();

    const { data: sports = [], isLoading } = useQuery({
        queryKey: ["parent_sports", child?._id],
        queryFn: async () => { try { const r = await api.get("/parent-portal/sports"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    const enroll = useMutation({
        mutationFn: async (id: string) => api.post(`/parent-portal/sports/${id}/enroll`, {}),
        onSuccess: (res: any) => {
            toast.success(res.data?.fee > 0 ? "Enrolled — fee added for payment" : "Enrolled");
            qc.invalidateQueries({ queryKey: ["parent_sports"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white"><Trophy className="w-5 h-5" /></div>
                <div>
                    <h1 className="text-lg font-black text-slate-800">Sports</h1>
                    <p className="text-xs text-slate-500">Enrol {child?.name || "your child"} in school sports</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading sports…</div>
            ) : sports.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm font-bold">No sports available right now</div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {sports.map((s: any) => (
                        <div key={s._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="h-1.5 bg-[#5C67F2]" />
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <h3 className="font-black text-slate-800">{s.name}</h3>
                                    {s.fee > 0 && <span className="text-xs font-black text-[#5C67F2]">{ksh(s.fee)}</span>}
                                </div>
                                <div className="mt-2 space-y-1 text-[11px] text-slate-500 font-bold">
                                    {s.coach && <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Coach: {s.coach}</div>}
                                    {s.schedule && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {s.schedule}</div>}
                                    <div className="flex gap-2">{s.ageGroup && <span>{s.ageGroup}</span>}{s.gender && <span>· {s.gender}</span>}{s.term && <span>· {s.term}</span>}</div>
                                </div>

                                <div className="mt-4">
                                    {s.status === "not_enrolled" ? (
                                        <button onClick={() => enroll.mutate(s._id)} disabled={enroll.isPending}
                                            className="w-full h-9 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                                            <Check className="w-3.5 h-3.5" /> Enrol {s.fee > 0 ? `(${ksh(s.fee)})` : ""}
                                        </button>
                                    ) : s.paid ? (
                                        <div className="text-center text-xs font-black text-emerald-600 py-2 bg-emerald-50 rounded-lg flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Enrolled &amp; Paid</div>
                                    ) : s.fee > 0 ? (
                                        <div className="space-y-2">
                                            <div className="text-center text-[11px] font-bold text-amber-600 py-1.5 bg-amber-50 rounded-lg">Enrolled — payment pending</div>
                                            <a href="/fees" className="h-9 bg-[#5C67F2] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Pay {ksh(s.fee)}{s.invoiceNo ? ` · ${s.invoiceNo}` : ""}</a>
                                        </div>
                                    ) : (
                                        <div className="text-center text-xs font-black text-emerald-600 py-2 bg-emerald-50 rounded-lg">Enrolled</div>
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
