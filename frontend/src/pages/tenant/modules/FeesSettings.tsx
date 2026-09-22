import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, Loader2, Save, Receipt, CreditCard, ShieldCheck, ShieldOff } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const SEPARATORS = [{ v: "", l: "None" }, { v: "-", l: "Dash ( - )" }, { v: "/", l: "Slash ( / )" }, { v: "_", l: "Underscore ( _ )" }];

/** Fees settings: whether staff may record a payment by hand, and the format invoice numbers print in. */
export default function FeesSettings() {
    const qc = useQueryClient();

    const { data: finance, isLoading: loadingFinance } = useQuery<{ manualPaymentsEnabled: boolean }>({ queryKey: ["finance_settings"], queryFn: async () => (await api.get("/settings/finance")).data });
    const { data: numbering, isLoading: loadingNumbering } = useQuery<any>({ queryKey: ["invoice_numbering"], queryFn: async () => (await api.get("/settings/invoice-numbering")).data });

    const [fmt, setFmt] = useState({ prefix: "INV", separator: "-", useYear: true, padding: 6 });
    useEffect(() => { if (numbering) setFmt({ prefix: numbering.prefix, separator: numbering.separator, useYear: numbering.useYear, padding: numbering.padding }); }, [numbering]);
    const preview = [fmt.prefix, fmt.useYear ? String(new Date().getFullYear()) : "", String(1).padStart(fmt.padding, "0")].filter(Boolean).join(fmt.separator);

    const saveFinance = useMutation({
        mutationFn: (enabled: boolean) => api.put("/settings/finance", { manualPaymentsEnabled: enabled }),
        onSuccess: (_r, enabled) => { qc.invalidateQueries({ queryKey: ["finance_settings"] }); toast.success(enabled ? "Manual payments enabled" : "Manual payments disabled — fees must now be paid via M-Pesa"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not save"),
    });
    const saveNumbering = useMutation({
        mutationFn: () => api.put("/settings/invoice-numbering", fmt),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoice_numbering"] }); toast.success("Invoice number format saved"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not save"),
    });

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm">
                <Home className="w-4 h-4 text-gray-400 mr-2" /><span className="text-gray-500 text-sm">Fees /</span><span className="ml-1.5 font-semibold text-slate-800 text-sm">Settings</span>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                {/* Manual payments */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-1">{finance?.manualPaymentsEnabled === false ? <ShieldOff className="w-4 h-4 text-rose-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}<h2 className="text-base font-semibold text-slate-800">Manual fee payments</h2></div>
                    <p className="text-sm text-slate-500 mb-4">When allowed, staff can mark an invoice paid by hand — choosing M-Pesa, Bank, Cash or Cheque and entering the amount, with a receipt. When switched off, fees can only be collected through M-Pesa (STK push / paybill); the manual "Mark Paid" option is disabled everywhere.</p>
                    {loadingFinance ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : (
                        <div className="flex gap-2">
                            <button onClick={() => saveFinance.mutate(true)} disabled={saveFinance.isPending} className={`h-10 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 ${finance?.manualPaymentsEnabled !== false ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}><CreditCard className="w-4 h-4" /> Allow manual payments</button>
                            <button onClick={() => saveFinance.mutate(false)} disabled={saveFinance.isPending} className={`h-10 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 ${finance?.manualPaymentsEnabled === false ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"}`}>M-Pesa only</button>
                        </div>
                    )}
                </div>

                {/* Invoice numbering */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-indigo-500" /><h2 className="text-base font-semibold text-slate-800">Invoice number format</h2></div>
                    <p className="text-sm text-slate-500 mb-4">How new invoice numbers are printed, e.g. {preview}. Numbers already given out never change.</p>
                    {loadingNumbering ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Prefix</label><input value={fmt.prefix} onChange={e => setFmt({ ...fmt, prefix: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12) })} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm" /></div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Separator</label><select value={fmt.separator} onChange={e => setFmt({ ...fmt, separator: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white">{SEPARATORS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Digits in the number</label><input type="number" min={3} max={10} value={fmt.padding} onChange={e => setFmt({ ...fmt, padding: Math.min(10, Math.max(3, Number(e.target.value) || 6)) })} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm" /></div>
                                <label className="flex items-center gap-2 text-sm text-slate-600 self-end pb-2"><input type="checkbox" checked={fmt.useYear} onChange={e => setFmt({ ...fmt, useYear: e.target.checked })} /> Include the year</label>
                            </div>
                            <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-sm"><span className="text-slate-400">Next invoice will look like </span><b className="text-slate-800">{preview}</b></div>
                            <button onClick={() => saveNumbering.mutate()} disabled={saveNumbering.isPending} className="h-10 px-5 rounded-lg bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">{saveNumbering.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save format</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
