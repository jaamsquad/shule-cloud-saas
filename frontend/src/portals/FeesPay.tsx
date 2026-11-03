import { useState } from "react";
import type { AxiosInstance } from "axios";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X, Check, FileText } from "lucide-react";
import { PageTitle, PanelCard } from "./PortalShell";
import { useBranding } from "./useBranding";
import { invoiceHtml } from "./printInvoice";

interface Props {
    api: AxiosInstance;
    base: string;            // "/student-portal" | "/parent-portal"
    title?: string;
    student?: { name?: string; registrationNo?: string };
}

// Fee account summary + invoices. Online payment isn't offered here — pay the
// school directly (Till/Paybill, bank, or in person) and the office will record it.
export default function FeesPay({ api, base, title = "Pay Fees", student }: Props) {
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
                            <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-semibold text-slate-600">
                                Balance: KSh {balance.toLocaleString()}. Pay the school directly (Till/Paybill, bank, or in person) and the office will record it on your account.
                            </div>
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
                                            <button onClick={() => viewInvoice(inv)}
                                                className="inline-flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded">
                                                <FileText className="w-3.5 h-3.5" /> View
                                            </button>
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
        </>
    );
}
