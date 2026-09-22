import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export type DocType = "invoice" | "quote" | "contract";
export const TYPE_LABEL: Record<DocType, string> = { invoice: "Invoice", quote: "Quotation", contract: "Contract" };
export const TYPE_PLURAL: Record<DocType, string> = { invoice: "Invoices", quote: "Quotations", contract: "Contracts" };
export const TERMS = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];
export const TERM_DAYS: Record<string, number> = { "Due on Receipt": 0, "Net 7": 7, "Net 15": 15, "Net 30": 30, "Net 45": 45, "Net 60": 60 };
export const ACCENT = "#534AB7";

export const fmt = (n: any, cur = "KES") => `${cur} ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtDate = (iso?: string) => (iso ? new Date(String(iso).slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const isoToday = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, days: number) => new Date(new Date(iso + "T00:00:00").getTime() + days * 86400000).toISOString().slice(0, 10);
export const docLink = (type: DocType, publicId: string) => `${window.location.origin}/lnk/doc/${type}/${publicId}`;

// Same arithmetic as the server (which is the one that counts) — for the live totals while editing.
export function calcTotals(doc: any) {
    let subTotal = 0, tax = 0;
    for (const it of doc.items || []) { const a = (Number(it.quantity) || 0) * (Number(it.rate) || 0); subTotal += a; tax += a * (Number(it.taxPercent) || 0) / 100; }
    const d = doc.discount || {};
    let discountAmount = d.type === "amount" ? Number(d.value) || 0 : subTotal * (Number(d.value) || 0) / 100;
    discountAmount = Math.min(Math.max(discountAmount, 0), subTotal);
    const taxTotal = subTotal > 0 ? tax * (subTotal - discountAmount) / subTotal : 0;
    const total = Math.max(0, subTotal - discountAmount + taxTotal + (Number(doc.shipping) || 0) + (Number(doc.adjustment) || 0));
    return { subTotal, discountAmount, taxTotal, total };
}

export const STATUS_STYLE: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600", sent: "bg-blue-100 text-blue-700", partially_paid: "bg-amber-100 text-amber-700", paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700", void: "bg-slate-200 text-slate-500", accepted: "bg-emerald-100 text-emerald-700", declined: "bg-red-100 text-red-700",
    expired: "bg-orange-100 text-orange-700", signed: "bg-emerald-100 text-emerald-700",
};
export const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${STATUS_STYLE[status] || "bg-slate-100 text-slate-600"}`}>{String(status).replace("_", " ")}</span>
);

// ─── Contract wording ────────────────────────────────────────────────────────
// Starting template: a lawyer should review it before it is used with customers. {{tokens}} are filled from the contract.
export const DEFAULT_CLAUSES = [
    { heading: "Parties and purpose", body: "This Agreement is made between {{provider}} (\"ShuleCloud\") and {{client}} (the \"School\"). ShuleCloud agrees to provide, and the School agrees to subscribe to, the ShuleCloud school management platform on the terms below." },
    { heading: "The service", body: "ShuleCloud provides a cloud-hosted school management system with the modules included in the School's subscription plan ({{plan}}), including hosting, security updates and new releases during the term." },
    { heading: "Fees and payment", body: "The School shall pay {{fee}} per {{billingCycle}}. ShuleCloud will issue an invoice for each period, payable by the due date shown on it through M-PESA or bank transfer using the details on the invoice. Access may be suspended after written notice if an invoice remains unpaid." },
    { heading: "Term and renewal", body: "This Agreement starts on {{startDate}} and runs until {{endDate}}. It renews for a further period when the next invoice is paid, unless either party gives notice under clause 8." },
    { heading: "School responsibilities", body: "The School shall keep its login details secure, ensure the data it enters is lawful and accurate, and use the service only for the School's own operations." },
    { heading: "Data protection and confidentiality", body: "The School remains the controller of the personal data of its students, parents and staff, and ShuleCloud acts as its processor under the Data Protection Act, 2019 (Kenya). ShuleCloud shall protect that data with reasonable security measures, use it only to provide the service, and keep it confidential. Each party shall keep the other's confidential information confidential." },
    { heading: "Support and availability", body: "ShuleCloud shall provide support during normal business hours through the channels published on its website and use reasonable efforts to keep the service available, excluding planned maintenance and events outside its control." },
    { heading: "Suspension and termination", body: "Either party may end this Agreement by giving 30 days' written notice. ShuleCloud may suspend the service for non-payment or misuse. On termination the School may request an export of its data within 30 days, after which it may be deleted." },
    { heading: "Limitation of liability", body: "To the extent permitted by law, ShuleCloud's total liability under this Agreement is limited to the fees paid by the School in the 12 months before the claim, and neither party is liable for indirect or consequential loss." },
    { heading: "Governing law", body: "This Agreement is governed by the laws of Kenya. The parties shall first try to settle any dispute by negotiation, failing which it shall be referred to the courts of Kenya." },
];

export function fillTokens(text: string, doc: any, company: any) {
    const k = doc.contract || {};
    const map: Record<string, string> = {
        provider: company?.companyName || "ShuleCloud", client: doc.customer?.name || "the School",
        startDate: fmtDate(k.startDate), endDate: fmtDate(k.endDate), fee: fmt(k.value, doc.currency || "KES"),
        billingCycle: String(k.billingCycle || "period").toLowerCase(), plan: doc.subscription?.planName || "selected plan",
    };
    return String(text || "").replace(/\{\{(\w+)\}\}/g, (_, key) => map[key] ?? "");
}

// ─── Customer (school) picker ────────────────────────────────────────────────
export function useCustomers() {
    return useQuery<any[]>({ queryKey: ["biz_customers"], queryFn: async () => (await api.get("/owner/business/customers")).data || [] });
}
export function usePlans() {
    return useQuery<any[]>({ queryKey: ["owner-plans"], queryFn: async () => (await api.get("/owner/plans")).data || [] });
}

const inp = "w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#534AB7]";
export function CustomerFields({ customer, onChange }: { customer: any; onChange: (c: any) => void }) {
    const { data: schools = [] } = useCustomers();
    const set = (patch: any) => onChange({ ...customer, ...patch });
    const pick = (tenantId: string) => {
        const s = schools.find(x => x.tenantId === tenantId);
        if (!s) { set({ tenantId: "" }); return; }
        onChange({ tenantId: s.tenantId, name: s.name, contactPerson: customer.contactPerson || "", email: s.email || "", phone: s.phone || "", address: s.address || "" });
    };
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">School / customer *</label>
                <select value={customer.tenantId || ""} onChange={e => pick(e.target.value)} className={inp}>
                    <option value="">Other customer (type the details below)…</option>
                    {schools.map(s => <option key={s.tenantId} value={s.tenantId}>{s.name}{s.subdomain ? ` — ${s.subdomain}` : ""}</option>)}
                </select>
            </div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Name *</label><input className={inp} value={customer.name || ""} onChange={e => set({ name: e.target.value })} placeholder="School or company name" /></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Contact person</label><input className={inp} value={customer.contactPerson || ""} onChange={e => set({ contactPerson: e.target.value })} placeholder="e.g. The Principal" /></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Email</label><input className={inp} value={customer.email || ""} onChange={e => set({ email: e.target.value })} /></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Phone (M-PESA number for online payment)</label><input className={inp} value={customer.phone || ""} onChange={e => set({ phone: e.target.value })} placeholder="07XX XXX XXX" /></div>
            <div className="md:col-span-2"><label className="block text-[11px] font-bold text-slate-500 mb-1">Address</label><input className={inp} value={customer.address || ""} onChange={e => set({ address: e.target.value })} /></div>
        </div>
    );
}

// ─── The formal, printable document ──────────────────────────────────────────
// Used in the owner portal preview and on the customer's public link. Only `.doc-print` is printed.
export function DocumentView({ doc, company, link }: { doc: any; company: any; link?: string }) {
    const cur = doc.currency || "KES";
    const isContract = doc.type === "contract";
    const title = doc.type === "quote" ? "QUOTATION" : doc.type === "contract" ? "CONTRACT" : "INVOICE";
    const status = String(doc.status || "");
    const contacts = [company?.address, company?.phone, company?.email, company?.website].filter(Boolean);
    const stamp = status === "paid" ? "PAID" : status === "void" ? "VOID" : status === "draft" ? "DRAFT" : status === "signed" ? "SIGNED" : status === "accepted" ? "ACCEPTED" : status === "declined" ? "DECLINED" : "";
    const stampColor = status === "paid" || status === "signed" || status === "accepted" ? "#16a34a" : status === "draft" ? "#64748b" : "#dc2626";

    return (
        <>
            <style>{`@page{size:A4;margin:12mm}@media print{body *{visibility:hidden!important}.doc-print,.doc-print *{visibility:visible!important}.doc-print{position:absolute!important;left:0;top:0;width:100%!important;box-shadow:none!important;border:none!important;margin:0!important;padding:0!important}}`}</style>
            <div className="doc-print relative bg-white text-slate-900 shadow-sm border border-slate-100 rounded-2xl p-8 md:p-12 mx-auto max-w-[860px] text-[13px] leading-relaxed" style={{ fontFamily: "Arial, Helvetica, sans-serif", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as any}>
                {stamp && <div className="pointer-events-none absolute right-10 top-40 -rotate-12 border-4 rounded-lg px-4 py-1 text-3xl font-black tracking-widest opacity-25" style={{ color: stampColor, borderColor: stampColor }}>{stamp}</div>}

                {/* Letterhead */}
                <div className="flex items-start justify-between gap-6 pb-5" style={{ borderBottom: `3px solid ${ACCENT}` }}>
                    <div className="flex items-center gap-4">
                        {company?.logo ? <img src={company.logo} alt="" className="h-16 w-auto object-contain" /> : <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-black" style={{ background: ACCENT }}>S</div>}
                        <div>
                            <div className="text-xl font-black uppercase" style={{ color: ACCENT }}>{company?.companyName || "ShuleCloud"}</div>
                            {company?.tagline && <div className="text-[11px] text-slate-500 italic">{company.tagline}</div>}
                            <div className="text-[11px] text-slate-500 mt-1">{contacts.join("  ·  ")}</div>
                            {company?.kraPin && <div className="text-[11px] text-slate-500">KRA PIN: {company.kraPin}</div>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black tracking-wide" style={{ color: ACCENT }}>{title}</div>
                        <div className="font-bold text-slate-700"># {doc.number}</div>
                    </div>
                </div>

                {/* Billed to + dates */}
                <div className="flex flex-wrap justify-between gap-6 py-5">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{doc.type === "invoice" ? "Bill to" : doc.type === "quote" ? "Quotation for" : "Between"}</div>
                        <div className="text-base font-black uppercase">{doc.customer?.name}</div>
                        {doc.customer?.contactPerson && <div>Attn: {doc.customer.contactPerson}</div>}
                        {doc.customer?.address && <div className="text-slate-600">{doc.customer.address}</div>}
                        {(doc.customer?.email || doc.customer?.phone) && <div className="text-slate-600">{[doc.customer.email, doc.customer.phone].filter(Boolean).join("  ·  ")}</div>}
                    </div>
                    <table className="text-[12px]"><tbody>
                        {!isContract && <tr><td className="pr-6 text-slate-500 py-0.5">{doc.type === "quote" ? "Quote date" : "Invoice date"}</td><td className="text-right font-bold">{fmtDate(doc.date)}</td></tr>}
                        {doc.type === "invoice" && <><tr><td className="pr-6 text-slate-500 py-0.5">Terms</td><td className="text-right font-bold">{doc.terms}</td></tr><tr><td className="pr-6 text-slate-500 py-0.5">Due date</td><td className="text-right font-bold">{fmtDate(doc.dueDate)}</td></tr></>}
                        {doc.type === "quote" && <tr><td className="pr-6 text-slate-500 py-0.5">Valid until</td><td className="text-right font-bold">{fmtDate(doc.expiryDate)}</td></tr>}
                        {isContract && <><tr><td className="pr-6 text-slate-500 py-0.5">Start date</td><td className="text-right font-bold">{fmtDate(doc.contract?.startDate)}</td></tr><tr><td className="pr-6 text-slate-500 py-0.5">End date</td><td className="text-right font-bold">{fmtDate(doc.contract?.endDate)}</td></tr></>}
                        {doc.orderNumber && <tr><td className="pr-6 text-slate-500 py-0.5">Order no.</td><td className="text-right font-bold">{doc.orderNumber}</td></tr>}
                        {doc.salesperson && <tr><td className="pr-6 text-slate-500 py-0.5">Salesperson</td><td className="text-right font-bold">{doc.salesperson}</td></tr>}
                    </tbody></table>
                </div>
                {doc.subject && <div className="mb-3 text-sm"><span className="text-slate-500">Subject: </span><b>{doc.subject}</b></div>}

                {isContract ? (
                    <>
                        <div className="text-center text-lg font-black uppercase my-4">{doc.contract?.title}</div>
                        <table className="w-full border border-slate-300 mb-5 text-[12px]"><tbody>
                            <tr><td className="border border-slate-300 bg-slate-50 font-bold p-2 w-1/3">Contract value</td><td className="border border-slate-300 p-2">{fmt(doc.contract?.value, cur)}{doc.contract?.billingCycle ? ` per ${String(doc.contract.billingCycle).toLowerCase()}` : ""}</td></tr>
                            {doc.subscription?.planName && <tr><td className="border border-slate-300 bg-slate-50 font-bold p-2">Plan</td><td className="border border-slate-300 p-2">{doc.subscription.planName}</td></tr>}
                            <tr><td className="border border-slate-300 bg-slate-50 font-bold p-2">Term</td><td className="border border-slate-300 p-2">{fmtDate(doc.contract?.startDate)} to {fmtDate(doc.contract?.endDate)}</td></tr>
                        </tbody></table>
                        <ol className="space-y-3 mb-8">
                            {(doc.contract?.clauses || []).map((c: any, i: number) => (
                                <li key={i}><div className="font-black">{i + 1}. {c.heading}</div><div className="text-justify whitespace-pre-line text-slate-700">{fillTokens(c.body, doc, company)}</div></li>
                            ))}
                        </ol>
                        {doc.notes && <div className="mb-6 whitespace-pre-line text-slate-600">{doc.notes}</div>}
                        <div className="text-[12px] mb-2">Signed by the authorised representatives of the parties:</div>
                        <div className="grid grid-cols-2 gap-10 pt-8">
                            <div>
                                <div className="h-14 flex items-end gap-2">
                                    {company?.stamp && <img src={company.stamp} alt="" className="h-14 w-14 object-contain opacity-90" />}
                                    {company?.signature && <img src={company.signature} alt="" className="h-12 object-contain" />}
                                </div>
                                <div className="border-t border-slate-700 pt-1 font-bold">{doc.contract?.providerSignatory?.name || "____________________"}</div>
                                <div className="text-slate-500 text-[11px]">{doc.contract?.providerSignatory?.title || "Authorised signatory"}, {company?.companyName}</div>
                            </div>
                            <div>
                                <div className="h-14 flex items-end">{status === "signed" && <span className="text-xl italic" style={{ fontFamily: "'Brush Script MT', cursive", color: "#1e3a8a" }}>{doc.contract?.clientSignatory?.name}</span>}</div>
                                <div className="border-t border-slate-700 pt-1 font-bold">{doc.contract?.clientSignatory?.name || "____________________"}</div>
                                <div className="text-slate-500 text-[11px]">{doc.contract?.clientSignatory?.title || "Authorised signatory"}, {doc.customer?.name}{doc.signedAt ? ` · signed ${new Date(doc.signedAt).toLocaleDateString("en-GB")}` : ""}</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <table className="w-full border-collapse">
                            <thead><tr className="text-white text-[11px] uppercase tracking-wide" style={{ background: ACCENT }}>
                                <th className="text-left p-2.5">Item &amp; description</th><th className="text-right p-2.5 w-16">Qty</th><th className="text-right p-2.5 w-28">Rate</th><th className="text-right p-2.5 w-16">Tax</th><th className="text-right p-2.5 w-32">Amount</th>
                            </tr></thead>
                            <tbody>
                                {(doc.items || []).map((it: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-200">
                                        <td className="p-2.5 whitespace-pre-line">{it.description}</td>
                                        <td className="p-2.5 text-right">{it.quantity}</td>
                                        <td className="p-2.5 text-right">{fmt(it.rate, cur)}</td>
                                        <td className="p-2.5 text-right">{Number(it.taxPercent) ? `${it.taxPercent}%` : "-"}</td>
                                        <td className="p-2.5 text-right font-bold">{fmt((Number(it.quantity) || 0) * (Number(it.rate) || 0), cur)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-end mt-4">
                            <table className="w-72 text-[13px]"><tbody>
                                <tr><td className="py-1 text-slate-500">Sub total</td><td className="py-1 text-right">{fmt(doc.subTotal, cur)}</td></tr>
                                {Number(doc.discountAmount) > 0 && <tr><td className="py-1 text-slate-500">Discount{doc.discount?.type === "%" ? ` (${doc.discount.value}%)` : ""}</td><td className="py-1 text-right">- {fmt(doc.discountAmount, cur)}</td></tr>}
                                {Number(doc.taxTotal) > 0 && <tr><td className="py-1 text-slate-500">Tax</td><td className="py-1 text-right">{fmt(doc.taxTotal, cur)}</td></tr>}
                                {Number(doc.shipping) !== 0 && <tr><td className="py-1 text-slate-500">Shipping</td><td className="py-1 text-right">{fmt(doc.shipping, cur)}</td></tr>}
                                {Number(doc.adjustment) !== 0 && <tr><td className="py-1 text-slate-500">Adjustment</td><td className="py-1 text-right">{fmt(doc.adjustment, cur)}</td></tr>}
                                <tr className="border-t-2" style={{ borderColor: ACCENT }}><td className="py-2 font-black text-base">Total</td><td className="py-2 text-right font-black text-base">{fmt(doc.total, cur)}</td></tr>
                                {doc.type === "invoice" && Number(doc.amountPaid) > 0 && <tr><td className="py-1 text-slate-500">Payments received</td><td className="py-1 text-right text-emerald-700">- {fmt(doc.amountPaid, cur)}</td></tr>}
                                {doc.type === "invoice" && <tr className="bg-slate-50"><td className="py-2 px-1 font-black">Balance due</td><td className="py-2 px-1 text-right font-black" style={{ color: Number(doc.balanceDue) > 0 ? "#dc2626" : "#16a34a" }}>{fmt(doc.balanceDue, cur)}</td></tr>}
                            </tbody></table>
                        </div>

                        {doc.type === "invoice" && (doc.payments || []).length > 0 && (
                            <div className="mt-5"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Payments received</div>
                                <table className="w-full text-[12px]"><tbody>{doc.payments.map((p: any, i: number) => <tr key={i} className="border-b border-slate-100"><td className="py-1">{fmtDate(p.date)}</td><td>{p.method}</td><td className="text-slate-500">{p.reference}</td><td className="text-right font-bold">{fmt(p.amount, cur)}</td></tr>)}</tbody></table>
                            </div>
                        )}
                        {doc.notes && <div className="mt-6"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</div><div className="whitespace-pre-line text-slate-700">{doc.notes}</div></div>}
                        {doc.termsAndConditions && <div className="mt-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Terms &amp; conditions</div><div className="whitespace-pre-line text-slate-600 text-[12px]">{doc.termsAndConditions}</div></div>}

                        {doc.type === "invoice" && Number(doc.balanceDue) > 0 && (company?.paymentInstructions || company?.bankName || link) && (
                            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12px]">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">How to pay</div>
                                {company.paymentInstructions && <div className="whitespace-pre-line">{company.paymentInstructions}</div>}
                                {company.bankName && <div className="mt-1">Bank: <b>{company.bankName}</b>{company.bankBranch ? `, ${company.bankBranch}` : ""}{company.accountName ? ` · Account name: ` : ""}<b>{company.accountName}</b>{company.accountNo ? ` · Account no: ` : ""}<b>{company.accountNo}</b></div>}
                                {link && <div className="mt-1">Pay online with M-PESA: <b>{link}</b></div>}
                            </div>
                        )}

                        {(company?.signature || company?.stamp) && (
                            <div className="mt-8 flex justify-end">
                                <div className="flex flex-col items-center">
                                    <div className="h-16 flex items-end justify-center gap-3">
                                        {company.stamp && <img src={company.stamp} alt="" className="h-16 w-16 object-contain opacity-90" />}
                                        {company.signature && <img src={company.signature} alt="" className="h-14 object-contain" />}
                                    </div>
                                    <div className="border-t border-slate-700 pt-1 mt-1 text-[11px] font-bold text-slate-600 w-44 text-center">Authorised Signature</div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {company?.footer && <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[11px] text-slate-500">{company.footer}</div>}
            </div>
        </>
    );
}

// Small modal shell shared by the business dialogs.
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
    useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[92vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100"><h3 className="font-black text-slate-800">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button></div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
export { inp as inputClass };
export function useCopy() {
    const [copied, setCopied] = useState(false);
    return { copied, copy: (text: string) => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); } };
}
