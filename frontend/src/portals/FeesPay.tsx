import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { Loader2, Smartphone, X, Check, Phone, AlertTriangle, FileText } from "lucide-react";
import { PageTitle, PanelCard } from "./PortalShell";
import { useBranding } from "./useBranding";
import { invoiceHtml } from "./printInvoice";

interface Props {
    api: AxiosInstance;
    base: string;            // "/student-portal" | "/parent-portal"
    title?: string;
    student?: { name?: string; registrationNo?: string };
}

type Stage = "form" | "sending" | "waiting" | "success" | "failed";

export default function FeesPay({ api, base, title = "Pay Fees", student }: Props) {
    const qc = useQueryClient();
    const { data: brand } = useBranding(api);
    const [viewHtml, setViewHtml] = useState<string | null>(null);

    const viewInvoice = (inv: any) => {
        const total = Number(inv.total_due || inv.amount || 0);
        const paidAmt = Number(inv.paid_amount || inv.amount_paid || 0);
        const html = invoiceHtml(
            { schoolName: brand?.name, schoolLogo: brand?.logo || null, studentName: data?.studentName || student?.name, studentNo: data?.registrationNo || student?.registrationNo, payBill: "—" },
            {
                invoiceNo: inv.invoice_no || inv.invoiceNo || `INV-${String(inv._id).slice(-6)}`,
                date: inv.createdAt || inv.created_at, dueDate: inv.due_date, term: inv.term || inv.period,
                lineItems: (inv.line_items || inv.items || []).map((it: any) => ({ description: it.description || it.category || it.name, amount: Number(it.amount || 0), qty: it.qty || 1 })),
                subtotal: Number(inv.subtotal || total), discount: Number(inv.discount_amount || 0),
                total, paid: paidAmt, balance: Math.max(0, Number(inv.balance ?? total - paidAmt)),
            },
        );
        setViewHtml(html);
    };
    const [modal, setModal] = useState<null | { invoiceId?: string; amount: number }>(null);
    const [amount, setAmount] = useState("");
    const [phone, setPhone] = useState("");
    const [stage, setStage] = useState<Stage>("form");
    const [message, setMessage] = useState("");
    const [receipt, setReceipt] = useState<string | null>(null);
    const pollRef = useRef<any>(null);

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

    useEffect(() => {
        if (modal) { setAmount(String(modal.amount || balance)); setStage("form"); setMessage(""); setReceipt(null); }
        return () => { if (pollRef.current) clearTimeout(pollRef.current); };
    }, [modal]); // eslint-disable-line

    const closeModal = () => { if (pollRef.current) clearTimeout(pollRef.current); setModal(null); setStage("form"); };

    const poll = (cid: string, attempt: number) => {
        if (attempt > 20) { setStage("failed"); setMessage("Timed out waiting for confirmation. If you completed the payment, it will reflect shortly."); return; }
        pollRef.current = setTimeout(async () => {
            try {
                const r = await api.get(`${base}/mpesa-status?checkoutRequestId=${encodeURIComponent(cid)}`);
                const st = r.data?.status;
                if (st === "completed") { setReceipt(r.data?.receipt || null); setStage("success"); qc.invalidateQueries({ queryKey: ["fees_summary", base] }); return; }
                if (st === "failed") { setStage("failed"); setMessage(r.data?.message || "Payment was cancelled or failed."); return; }
            } catch { /* keep polling */ }
            poll(cid, attempt + 1);
        }, 3000);
    };

    const startPay = async () => {
        if (!amount || Number(amount) <= 0 || !phone) return;
        setStage("sending"); setMessage("");
        try {
            const r = await api.post(`${base}/pay-mpesa`, { phone, amount: Number(amount), invoiceId: modal?.invoiceId });
            setMessage(r.data?.message || "Enter your M-PESA PIN on your phone to complete payment.");
            setStage("waiting");
            poll(r.data.checkoutRequestId, 0);
        } catch (e: any) {
            setStage("failed");
            setMessage(e.response?.data?.message || "Could not start the M-PESA payment.");
        }
    };

    const cleared = balance <= 0;

    return (
        <>
            <PageTitle title={title} />

            {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading fee account…</div>
            ) : (
                <>
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
                                <Smartphone className="w-5 h-5" /> Pay KSh {balance.toLocaleString()} via M-PESA
                            </button>
                        )}
                    </div>

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
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => viewInvoice(inv)}
                                                    className="inline-flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded">
                                                    <FileText className="w-3.5 h-3.5" /> View
                                                </button>
                                                {ibal > 0 && (
                                                    <button onClick={() => setModal({ invoiceId: inv._id, amount: ibal })}
                                                        className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded">Pay</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </PanelCard>
                    )}

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

            {/* Invoice viewer (inline, in-browser) */}
            {viewHtml && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex flex-col items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "90vh" }}>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                            <p className="text-sm font-bold text-slate-700">Invoice</p>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { const f = document.getElementById("inv-frame") as HTMLIFrameElement; f?.contentWindow?.print(); }}
                                    className="text-xs font-bold px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-white">Print / Download</button>
                                <button onClick={() => setViewHtml(null)} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <iframe id="inv-frame" title="Invoice" srcDoc={viewHtml} className="w-full flex-1" style={{ border: 0, minHeight: "60vh" }} />
                    </div>
                </div>
            )}

            {/* M-PESA payment modal */}
            {modal && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-500" />

                        {stage === "success" ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-9 h-9 text-white" /></div>
                                <h3 className="text-xl font-black text-slate-800 mb-1">Payment Received!</h3>
                                <p className="text-slate-500 text-xs mb-4">Your fee balance has been updated.</p>
                                {receipt && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2.5 mb-5">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">M-PESA Code</p>
                                        <p className="text-base font-black text-emerald-700 tracking-wider">{receipt}</p>
                                    </div>
                                )}
                                <button onClick={closeModal} className="w-full py-3 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-lg">Done</button>
                            </div>
                        ) : (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><img src="/payments/mpesa.svg" alt="M-PESA" className="h-5" /> Pay Fees</h3>
                                    <button onClick={closeModal} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                                </div>

                                {stage === "waiting" ? (
                                    <div className="text-center py-6">
                                        <Loader2 className="w-10 h-10 animate-spin text-green-500 mx-auto mb-3" />
                                        <p className="font-bold text-slate-700 text-sm">Check your phone</p>
                                        <p className="text-xs text-slate-500 mt-1">{message}</p>
                                        <p className="text-[11px] text-slate-400 mt-3">Waiting for confirmation…</p>
                                    </div>
                                ) : stage === "failed" ? (
                                    <div className="text-center py-4">
                                        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-6 h-6 text-rose-500" /></div>
                                        <p className="text-sm font-bold text-slate-700">Payment not completed</p>
                                        <p className="text-xs text-slate-500 mt-1 mb-4">{message}</p>
                                        <button onClick={() => setStage("form")} className="w-full py-2.5 bg-green-500 text-white font-bold text-xs rounded-lg">Try Again</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-3 text-[11px] text-green-700">
                                            Enter your M-PESA phone number and amount. You'll get a prompt on your phone to enter your PIN.
                                        </div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Amount (KSh)</label>
                                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm mb-3" />
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">M-PESA Phone</label>
                                        <div className="relative mb-4">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678" className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm" />
                                        </div>
                                        <button onClick={startPay} disabled={stage === "sending" || !amount || !phone}
                                            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                            {stage === "sending" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                                            Pay KSh {Number(amount || 0).toLocaleString()}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
