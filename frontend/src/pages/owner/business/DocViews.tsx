import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Pencil, Printer, Send, Link2, CreditCard, ArrowLeft, Check, FileSignature, Receipt, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { DocType, TYPE_LABEL, TYPE_PLURAL, ACCENT, StatusBadge, DocumentView, Modal, fmt, fmtDate, docLink, useCopy, inputClass as inp, isoToday } from "./bizShared";

const FILTERS: Record<DocType, string[]> = {
    invoice: ["all", "draft", "sent", "partially_paid", "paid", "overdue", "void"],
    quote: ["all", "draft", "sent", "accepted", "declined", "expired"],
    contract: ["all", "draft", "sent", "signed", "expired"],
};
const label = (s: string) => (s === "all" ? "All" : s === "partially_paid" ? "Partially paid" : s.charAt(0).toUpperCase() + s.slice(1));

// ── List ─────────────────────────────────────────────────────────────────────
export function DocList({ type, onNew, onOpen }: { type: DocType; onNew: () => void; onOpen: (id: string) => void }) {
    const [status, setStatus] = useState("all");
    const [q, setQ] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["biz_docs", type], queryFn: async () => (await api.get("/owner/business/docs", { params: { type } })).data });
    const docs: any[] = (data?.docs || []).filter((d: any) => (status === "all" || d.status === status) && (!q || `${d.number} ${d.customer?.name} ${d.subject}`.toLowerCase().includes(q.toLowerCase())));
    const s = data?.stats || {};
    const cards = type === "invoice"
        ? [["Outstanding", fmt(s.outstanding), ""], ["Overdue", fmt(s.overdue), "text-red-600", `${s.overdueCount || 0} invoices`], ["Paid this month", fmt(s.paidThisMonth), "text-emerald-600"]]
        : type === "quote" ? [["Total value", fmt(s.totalValue), ""], ["Accepted, not yet invoiced", fmt(s.acceptedNotInvoiced), "text-emerald-600"], ["Sent", String(s.sent || 0), ""]]
        : [["Signed", String(s.signed || 0), "text-emerald-600"], ["Awaiting signature", String(s.awaiting || 0), ""], ["Signed contract value", fmt(s.totalValue), ""]];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {cards.map(([l, v, c, sub]: any) => <div key={l} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{l}</div><div className={`text-2xl font-black mt-1 ${c}`}>{v}</div>{sub && <div className="text-[11px] text-slate-400">{sub}</div>}</div>)}
            </div>
            <div className="flex flex-wrap gap-2">{FILTERS[type].map(f => <button key={f} onClick={() => setStatus(f)} className={`h-8 px-3 rounded-full text-xs font-bold ${status === f ? "text-white" : "bg-white border border-slate-200 text-slate-600"}`} style={status === f ? { background: ACCENT } : {}}>{label(f)}</button>)}</div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
                    <div className="relative w-full max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${TYPE_LABEL[type].toLowerCase()} # or customer…`} className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm" /></div>
                    <button onClick={onNew} className="h-10 px-4 rounded-lg text-white text-sm font-bold flex items-center gap-2 shrink-0" style={{ background: ACCENT }}><Plus className="w-4 h-4" /> New {TYPE_LABEL[type]}</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-[10px] uppercase tracking-widest text-slate-400 text-left"><th className="px-4 py-3">{TYPE_LABEL[type]} #</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">{type === "invoice" ? "Due date" : type === "quote" ? "Expiry" : "Ends"}</th><th className="px-4 py-3 text-right">{type === "contract" ? "Value" : "Amount"}</th>{type === "invoice" && <th className="px-4 py-3 text-right">Balance due</th>}<th className="px-4 py-3">Status</th></tr></thead>
                        <tbody>
                            {isLoading ? <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: ACCENT }} /></td></tr>
                                : docs.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">No {TYPE_PLURAL[type].toLowerCase()} yet. Create your first one.</td></tr>
                                : docs.map(d => (
                                    <tr key={d._id} onClick={() => onOpen(d._id)} className="border-t border-slate-50 hover:bg-slate-50/60 cursor-pointer">
                                        <td className="px-4 py-3 font-bold text-slate-800">{d.number}</td>
                                        <td className="px-4 py-3 text-slate-600">{d.customer?.name}<div className="text-[11px] text-slate-400">{d.subject}</div></td>
                                        <td className="px-4 py-3 text-slate-500">{fmtDate(d.date)}</td>
                                        <td className="px-4 py-3 text-slate-500">{fmtDate(type === "invoice" ? d.dueDate : type === "quote" ? d.expiryDate : d.contract?.endDate)}</td>
                                        <td className="px-4 py-3 text-right font-bold">{fmt(type === "contract" ? d.contract?.value : d.total, d.currency)}</td>
                                        {type === "invoice" && <td className="px-4 py-3 text-right font-bold" style={{ color: d.balanceDue > 0 ? "#dc2626" : "#16a34a" }}>{fmt(d.balanceDue, d.currency)}</td>}
                                        <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── One document: actions, hint, payments, and the formal preview ─────────────
export function DocDetail({ id, type, onBack, onEdit, onOpen }: { id: string; type: DocType; onBack: () => void; onEdit: () => void; onOpen: (type: DocType, id: string) => void }) {
    const qc = useQueryClient();
    const { copied, copy } = useCopy();
    const [modal, setModal] = useState<"" | "pay" | "send">("");
    const [busy, setBusy] = useState(false);
    const { data, isLoading } = useQuery({ queryKey: ["biz_doc", id], queryFn: async () => (await api.get(`/owner/business/docs/${id}`)).data });

    if (isLoading || !data) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} /></div>;
    const { doc, company } = data; const link = docLink(doc.type, doc.publicId);
    const refresh = () => { qc.invalidateQueries({ queryKey: ["biz_doc", id] }); qc.invalidateQueries({ queryKey: ["biz_docs"] }); };
    const call = async (fn: () => Promise<any>, ok?: string) => { setBusy(true); try { const r = await fn(); if (ok) toast.success(ok); refresh(); return r; } catch (e: any) { toast.error(e.response?.data?.message || "Action failed"); } finally { setBusy(false); } };
    const setStatus = (status: string, ok?: string) => call(() => api.post(`/owner/business/docs/${id}/status`, { status }), ok);
    const isDraft = doc.status === "draft", closed = doc.status === "void";

    const hint = doc.type === "invoice"
        ? isDraft ? "This invoice hasn't been sent to the customer yet." : doc.status === "paid" ? "Paid in full — thank you." : doc.status === "overdue" ? "This invoice is overdue. Send a reminder with the payment link." : "Waiting for payment. The customer can pay with M-PESA from the link."
        : doc.type === "quote" ? isDraft ? "This quotation hasn't been sent to the customer yet." : doc.status === "accepted" ? (doc.invoiceId ? `Accepted and invoiced (${doc.invoiceNumber}).` : "Accepted — convert it to an invoice.") : doc.status === "sent" ? "Sent — waiting for the customer to accept or decline." : ""
        : isDraft ? "This contract hasn't been sent for signing yet." : doc.status === "signed" ? "Signed by the customer." : "Sent — waiting for the customer to sign.";

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> All {TYPE_PLURAL[type].toLowerCase()}</button>
            <div className="flex flex-wrap items-center gap-3">
                <div className="w-11 h-11 rounded-full text-white font-black flex items-center justify-center" style={{ background: ACCENT }}>{String(doc.customer?.name || "?").slice(0, 2).toUpperCase()}</div>
                <div><div className="flex items-center gap-2"><h2 className="text-xl font-black text-slate-800">{doc.number}</h2><StatusBadge status={doc.status} /></div><div className="text-sm text-slate-500">{doc.customer?.name}</div></div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {!closed && !(doc.status === "paid" || doc.status === "signed") && <button onClick={onEdit} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
                <button onClick={() => window.print()} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> PDF / Print</button>
                {!closed && <button onClick={() => setModal("send")} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Send</button>}
                <button onClick={() => copy(link)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 flex items-center gap-1.5">{copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />} {copied ? "Copied" : doc.type === "invoice" ? "Copy payment link" : `Copy ${TYPE_LABEL[doc.type as DocType].toLowerCase()} link`}</button>
                {doc.type === "invoice" && !closed && doc.balanceDue > 0 && <button onClick={() => setModal("pay")} className="h-9 px-4 rounded-lg text-white text-sm font-bold flex items-center gap-1.5" style={{ background: ACCENT }}><CreditCard className="w-3.5 h-3.5" /> Record payment</button>}
                {doc.type === "quote" && !doc.invoiceId && !closed && doc.status !== "declined" && <button onClick={async () => { const r = await call(() => api.post(`/owner/business/docs/${id}/convert`), "Invoice created"); if (r) onOpen("invoice", r.data.doc._id); }} className="h-9 px-4 rounded-lg text-white text-sm font-bold flex items-center gap-1.5 bg-emerald-600"><Receipt className="w-3.5 h-3.5" /> Convert to invoice</button>}
                {doc.type === "quote" && doc.status === "sent" && <><button onClick={() => setStatus("accepted", "Marked accepted")} className="h-9 px-3 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-bold">Mark accepted</button><button onClick={() => setStatus("declined", "Marked declined")} className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-sm font-bold">Mark declined</button></>}
                {doc.type === "contract" && doc.status === "sent" && <button onClick={() => setStatus("signed", "Marked signed")} className="h-9 px-3 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center gap-1.5"><FileSignature className="w-3.5 h-3.5" /> Mark signed</button>}
                {isDraft && !(doc.payments || []).length && <button onClick={async () => { if (confirm(`Delete ${doc.number}?`)) { await call(() => api.delete(`/owner/business/docs/${id}`), "Deleted"); onBack(); } }} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-red-500 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /></button>}
                {!isDraft && !closed && !(doc.payments || []).length && doc.status !== "signed" && <button onClick={() => confirm(`Void ${doc.number}? It can no longer be used.`) && setStatus("void", "Voided")} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-500 flex items-center gap-1.5"><Ban className="w-3.5 h-3.5" /> Void</button>}
                {busy && <Loader2 className="w-4 h-4 animate-spin" style={{ color: ACCENT }} />}
            </div>

            {hint && <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900"><span><b>What's next?</b> {hint}</span>{isDraft && <button onClick={() => setStatus("sent", "Marked as sent")} className="h-8 px-3 rounded-lg text-white text-xs font-bold shrink-0" style={{ background: ACCENT }}>Mark as sent</button>}</div>}

            {doc.type === "invoice" && (doc.payments || []).length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-sm font-black mb-2">Payments received</div>
                    {doc.payments.map((p: any) => <div key={p.id || p.reference} className="flex items-center justify-between text-sm py-1.5 border-t border-slate-50"><span className="text-slate-500">{fmtDate(p.date)} · {p.method}{p.online ? " (online)" : ""} · {p.reference}</span><b>{fmt(p.amount, doc.currency)}</b></div>)}
                </div>
            )}

            <div className="print:p-0 py-2"><DocumentView doc={doc} company={company} link={doc.type === "invoice" ? link : undefined} /></div>

            {modal === "pay" && <PaymentModal doc={doc} onClose={() => setModal("")} onDone={() => { setModal(""); refresh(); }} />}
            {modal === "send" && <SendModal doc={doc} link={link} onClose={() => setModal("")} onDone={() => { setModal(""); refresh(); }} />}
        </div>
    );
}

function PaymentModal({ doc, onClose, onDone }: { doc: any; onClose: () => void; onDone: () => void }) {
    const [f, setF] = useState({ amount: String(doc.balanceDue), method: "Bank transfer", reference: "", date: isoToday() });
    const [saving, setSaving] = useState(false);
    const save = async () => {
        setSaving(true);
        try { await api.post(`/owner/business/docs/${doc._id}/payments`, f); toast.success("Payment recorded"); onDone(); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); }
    };
    return (
        <Modal title={`Record payment — ${doc.number}`} onClose={onClose}>
            <p className="text-xs text-slate-500 mb-3">For money received outside the online link (bank, cash, cheque, M-PESA to the till). Balance due: <b>{fmt(doc.balanceDue, doc.currency)}</b>.</p>
            <div className="space-y-3">
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Amount received</label><input type="number" className={inp} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Method</label><select className={inp} value={f.method} onChange={e => setF({ ...f, method: e.target.value })}>{["Bank transfer", "M-PESA", "Cash", "Cheque", "Other"].map(m => <option key={m}>{m}</option>)}</select></div>
                    <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Date</label><input type="date" className={inp} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div>
                </div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Reference (M-PESA code, cheque no…)</label><input className={inp} value={f.reference} onChange={e => setF({ ...f, reference: e.target.value })} /></div>
                {doc.subscription?.planName && <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">Once this invoice is paid in full, the school is put on the <b>{doc.subscription.planName}</b> plan automatically.</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5"><button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-bold text-slate-600">Cancel</button><button onClick={save} disabled={saving} className="h-10 px-5 rounded-lg text-white text-sm font-bold disabled:opacity-50" style={{ background: ACCENT }}>{saving ? "Saving…" : "Record payment"}</button></div>
        </Modal>
    );
}

function SendModal({ doc, link, onClose, onDone }: { doc: any; link: string; onClose: () => void; onDone: () => void }) {
    const { copied, copy } = useCopy();
    const [to, setTo] = useState(doc.customer?.email || "");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const send = async (email: boolean) => {
        setBusy(true);
        try {
            const r = await api.post(`/owner/business/docs/${doc._id}/send`, { to, message, email, origin: window.location.origin });
            if (email && r.data.emailed) toast.success(`Emailed to ${to}`);
            else if (email) toast.warning(r.data.emailError || "Marked as sent, but the email could not be sent.");
            else toast.success("Marked as sent");
            onDone();
        } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setBusy(false); }
    };
    const wa = `https://wa.me/${String(doc.customer?.phone || "").replace(/[^\d]/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(`Hello, please find your ${TYPE_LABEL[doc.type as DocType].toLowerCase()} ${doc.number} here: ${link}`)}`;
    return (
        <Modal title={`Send ${doc.number}`} onClose={onClose}>
            <div className="space-y-3">
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Customer email</label><input className={inp} value={to} onChange={e => setTo(e.target.value)} placeholder="name@school.ac.ke" /></div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Message (optional)</label><textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={message} onChange={e => setMessage(e.target.value)} placeholder="A short note to go with the link" /></div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2"><code className="flex-1 text-[11px] break-all text-slate-600">{link}</code><button onClick={() => copy(link)} className="text-xs font-bold shrink-0" style={{ color: ACCENT }}>{copied ? "Copied" : "Copy"}</button></div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 mt-5">
                <a href={wa} target="_blank" rel="noreferrer" onClick={() => send(false)} className="h-10 px-4 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center">WhatsApp</a>
                <button onClick={() => send(false)} disabled={busy} className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-bold text-slate-600">Just mark as sent</button>
                <button onClick={() => send(true)} disabled={busy || !to} className="h-10 px-5 rounded-lg text-white text-sm font-bold disabled:opacity-50" style={{ background: ACCENT }}>{busy ? "Sending…" : "Email & mark sent"}</button>
            </div>
        </Modal>
    );
}
