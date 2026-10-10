/**
 * Owner → a school → Pricing & discount: give this school its own price for any plan, and a
 * discount (a % or a fixed KES amount off each payment, with a reason and an optional end
 * date). The school sees and pays these prices. Server: PUT /owner/schools/:id/pricing.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";
const ksh = (n: any) => `KES ${Number(n || 0).toLocaleString()}`;
const border = { border: "0.5px solid #e5e7eb" };

export default function SchoolPricingCard({ schoolId, plans, pricing, currentPlanId }: { schoolId: string; plans: any[]; pricing: { planPricing?: Record<string, number>; discount?: any } | undefined; currentPlanId?: string }) {
    const qc = useQueryClient();
    const [prices, setPrices] = useState<Record<string, string>>({});
    const [dType, setDType] = useState<"none" | "percent" | "fixed">("none");
    const [dValue, setDValue] = useState("");
    const [reason, setReason] = useState("");
    const [until, setUntil] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        const p: Record<string, string> = {};
        Object.entries(pricing?.planPricing || {}).forEach(([k, v]) => { p[k] = String(v); });
        setPrices(p);
        const d = pricing?.discount;
        setDType(d?.type || "none"); setDValue(d?.value ? String(d.value) : ""); setReason(d?.reason || ""); setUntil(d?.until || "");
    }, [pricing]);

    const finalOf = (p: any) => {
        const base = prices[p._id] !== undefined && prices[p._id] !== "" ? Number(prices[p._id]) || 0 : Number(p.listPrice) || 0;
        const v = Number(dValue) || 0;
        const expired = until && new Date(`${until}T23:59:59`) < new Date();
        const off = dType === "none" || !v || expired ? 0 : dType === "percent" ? (base * Math.min(100, v)) / 100 : Math.min(base, v);
        return { base, final: Math.max(0, Math.round((base - off) * 100) / 100), off };
    };
    const save = async () => {
        setBusy(true);
        try {
            await api.put(`/owner/schools/${schoolId}/pricing`, {
                planPricing: prices,
                discount: dType === "none" ? null : { type: dType, value: Number(dValue) || 0, reason, until: until || null },
            });
            toast.success("School pricing saved");
            qc.invalidateQueries({ queryKey: ["owner_school", schoolId] });
            qc.invalidateQueries();
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not save"); } finally { setBusy(false); }
    };

    return (
        <div className="bg-white rounded-xl p-5" style={border}>
            <div className="flex items-center gap-2 mb-1"><BadgePercent className="w-4 h-4" style={{ color: PRIMARY }} /><h3 className="text-sm font-black text-slate-800">Pricing & discount for this school</h3></div>
            <p className="text-[11px] text-slate-400 mb-4">Leave a price blank to use the plan's standard price. The discount comes off every payment this school makes, until the end date (if set).</p>

            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                    <thead><tr className="text-[10px] font-black uppercase text-slate-400 text-left"><th className="py-2">Plan</th><th>Standard price</th><th>This school's price</th><th className="text-right">They pay</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {plans.map((p: any) => {
                            const f = finalOf(p);
                            return (
                                <tr key={p._id} className={p._id === currentPlanId ? "bg-indigo-50/40" : ""}>
                                    <td className="py-2 font-bold text-slate-700">{p.name}{p._id === currentPlanId && <span className="ml-1.5 text-[9px] font-black uppercase text-indigo-600">current</span>}</td>
                                    <td className="text-slate-500">{ksh(p.listPrice)}<span className="text-[11px]">{p.per}</span></td>
                                    <td><input type="number" min={0} value={prices[p._id] ?? ""} placeholder="standard" onChange={e => setPrices(x => ({ ...x, [p._id]: e.target.value }))} className="w-32 h-9 px-2 rounded-lg text-sm" style={border} /></td>
                                    <td className="text-right"><span className="font-black" style={{ color: PRIMARY }}>{ksh(f.final)}</span><span className="text-[11px] text-slate-400">{p.per}</span>{f.off > 0 && <div className="text-[10px] font-bold text-emerald-600">−{ksh(f.off)} discount</div>}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Discount</label>
                    <select value={dType} onChange={e => setDType(e.target.value as any)} className="w-full h-10 px-3 rounded-lg text-sm" style={border}>
                        <option value="none">No discount</option><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount (KES)</option>
                    </select></div>
                {dType !== "none" && <>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">{dType === "percent" ? "Percent off" : "KES off each payment"}</label><input type="number" min={0} max={dType === "percent" ? 100 : undefined} value={dValue} onChange={e => setDValue(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm" style={border} /></div>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Ends on (optional)</label><input type="date" value={until} onChange={e => setUntil(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm" style={border} /></div>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Reason</label><input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Early adopter" className="w-full h-10 px-3 rounded-lg text-sm" style={border} /></div>
                </>}
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={save} disabled={busy} className="h-10 px-5 rounded-lg text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Save pricing</button>
            </div>
        </div>
    );
}
