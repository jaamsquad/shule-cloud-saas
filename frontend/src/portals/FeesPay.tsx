import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { Loader2, Smartphone, X, Check, CreditCard, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "./PortalShell";

interface Props {
    api: AxiosInstance;
    base: string;            // "/student-portal" | "/parent-portal"
    title?: string;
    payBill?: string;        // school paybill (display only)
}

const METHODS = [
    { key: "MPESA", label: "M-PESA", icon: "📱" },
    { key: "BANK", label: "Bank", icon: "🏦" },
    { key: "CASH", label: "Cash", icon: "💵" },
];

export default function FeesPay({ api, base, title = "Pay Fees", payBill = "123456" }: Props) {
    const qc = useQueryClient();
    const [modal, setModal] = useState<null | { invoiceId?: string; invoiceNo?: string; amount: number }>(null);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("MPESA");
    const [phone, setPhone] = useState("");
    const [reference, setReference] = useState("");
    const [success, setSuccess] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["fees_summary", base],
        queryFn: async () => (await api.get(`${base}/fees`)).data,
        retry: false,
    });

    const billed = Number(data?.billed || 0);
    const paid = Number(data?.totalPaid || 0);
    const balance = Number(data?.balance || 0);
    const structureTotal = Number(data?.structureTotal || 0);
    const hasInvoices = !!data?.hasInvoices;
    const items: any[] = data?.items || [];
    const invoices: any[] = data?.invoices || [];

    useEffect(() => { if (modal) { setAmount(String(modal.amount || balance)); setReference(""); setSuccess(false); } }, [modal]); // eslint-disable-line

    const pay = useMutation({
        mutationFn: async () => (await api.post(`${base}/pay-invoice`, {
            invoiceId: modal?.invoiceId, invoiceNo: modal?.invoiceNo,
            amount: Number(amount), method, phone, reference,
            studentName: data?.studentName, notes: `Self-service payment via ${method}`,
        })).data,
        onSuccess: () => { setSuccess(true); qc.invalidateQueries({ queryKey: ["fees_summary", base] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Payment failed"),
    });

    const cleared = balance <= 0;

    return (
        <>
            <PageTitle title={title} />

            {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading fee account…</div>
            ) : (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { l: "Total Billed", v: billed, c: "text-slate-800" },
                            { l: "Total Paid", v: paid, c: "text-emerald-600" },
                            { l: "Balance", v: balance, c: cleared ? "text-emerald-600" : "text-rose-600" },
                        ].map(s => (
                            <div key={s.l} className="bg-white rounded-md shadow-sm border border-black/5 p-4 text-center">
                                <p className={`text-lg font-black ${s.c}`}>KSh {s.v.toLocaleString()}</p>
                                <p className="text-[11px] text-slate-500 font-bold uppercase">{s.l}</p>
                            </div>
                        ))}
                    </div>

                    {/* Pay action */}
                    <div className="mb-6">
                        {!hasInvoices ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-semibold text-slate-600">
                                No fees have been invoiced yet. Fees become payable once the school issues an invoice. The fee structure below is indicative.
                            </div>
                        ) : cleared ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 text-sm font-bold text-emerald-700 flex items-center gap-2">
                                <Check className="w-4 h-4" /> Invoiced fees fully cleared. Thank you!
                            </div>
                        ) : (
                            <button onClick={() => setModal({ amount: balance })}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-sm px-6 py-3 rounded-lg shadow-lg shadow-green-900/20">
                                <Smartphone className="w-5 h-5" /> Pay KSh {balance.toLocaleString()} Now
                            </button>
                        )}
                    </div>

                    {/* Invoices */}
                    {invoices.length > 0 && (
                        <PanelCard title="Invoices">
                            <div className="space-y-2">
                                {invoices.map((inv: any) => {
                                    const total = Number(inv.total_due || inv.amount || 0);
                                    const ipaid = Number(inv.paid_amount || inv.amount_paid || 0);
                                    const ibal = Math.max(0, Number(inv.balance ?? total - ipaid));
                                    return (
                                        <div key={inv._id} className="flex items-center justify-between border-b border-black/5 py-2.5">
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm">{inv.invoice_no || inv.invoiceNo || `INV-${String(inv._id).slice(-6)}`}</p>
                                                <p className="text-xs text-slate-400">{inv.term || inv.period || "—"} · Bal KSh {ibal.toLocaleString()}</p>
                                            </div>
                                            {ibal > 0 && (
                                                <button onClick={() => setModal({ invoiceId: inv._id, invoiceNo: inv.invoice_no || inv.invoiceNo, amount: ibal })}
                                                    className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded">Pay</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </PanelCard>
                    )}

                    {/* Indicative fee structure */}
                    <PanelCard title={`Fee Structure (indicative) — ${data?.term || ""}`}>
                        {items.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-6">No fee structure published for your class.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <tbody>
                                    {items.map((it, i) => (
                                        <tr key={i} className="border-b border-black/5">
                                            <td className="py-2 text-slate-600">{it.name}</td>
                                            <td className="py-2 text-right font-semibold text-slate-700">KSh {Number(it.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="font-black text-slate-800"><td className="py-2.5">Indicative Total</td><td className="py-2.5 text-right text-[#b08642]">KSh {structureTotal.toLocaleString()}</td></tr>
                                </tbody>
                            </table>
                        )}
                    </PanelCard>
                </>
            )}

            {/* Payment modal */}
            {modal && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-500" />
                        {success ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-9 h-9 text-white" /></div>
                                <h3 className="text-xl font-black text-slate-800 mb-1">Payment Submitted!</h3>
                                <p className="text-slate-500 text-xs mb-6">It will be verified by the school office within 24 hours.</p>
                                <button onClick={() => setModal(null)} className="w-full py-3 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-lg">Done</button>
                            </div>
                        ) : (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" /> Pay Fees</h3>
                                    <button onClick={() => setModal(null)} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {METHODS.map(m => (
                                        <button key={m.key} onClick={() => setMethod(m.key)}
                                            className={`py-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 ${method === m.key ? "bg-green-500 border-green-500 text-white" : "bg-white border-slate-200 text-slate-500"}`}>
                                            <span className="text-lg">{m.icon}</span>{m.label}
                                        </button>
                                    ))}
                                </div>

                                {method === "MPESA" && (
                                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-3 text-[11px] text-green-700 space-y-0.5">
                                        <p className="font-black uppercase text-[10px]">How to pay via M-PESA</p>
                                        <p>1. M-PESA → Pay Bill</p>
                                        <p>2. Business No: <strong>{payBill}</strong></p>
                                        <p>3. Account No: <strong>{data?.registrationNo || "Adm No"}</strong></p>
                                        <p>4. Enter amount &amp; PIN, then paste the code below.</p>
                                    </div>
                                )}

                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Amount (KSh)</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mb-3" />

                                {method === "MPESA" && (
                                    <>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">M-PESA Phone</label>
                                        <div className="relative mb-3">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678" className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                    </>
                                )}

                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Transaction Code / Reference</label>
                                <input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. RGH2XXXXX" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mb-4" />

                                <button onClick={() => { if (!amount || Number(amount) <= 0) return; pay.mutate(); }} disabled={pay.isPending || !amount}
                                    className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                    {pay.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                                    Submit Payment — KSh {Number(amount || 0).toLocaleString()}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
