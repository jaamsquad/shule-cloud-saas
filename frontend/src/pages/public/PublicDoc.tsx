import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer, CheckCircle2, XCircle, Smartphone, FileSignature } from "lucide-react";
import api from "@/lib/api";
import { DocumentView, StatusBadge, ACCENT, fmt, inputClass as inp } from "@/pages/owner/business/bizShared";

/**
 * The customer's link to a document:  /lnk/doc/invoice/<id>   /lnk/doc/quote/<id>   /lnk/doc/contract/<id>
 * Printable for everyone; invoices can be paid with M-PESA right here, quotations accepted, contracts signed.
 */
export default function PublicDoc() {
    const { type = "", publicId = "" } = useParams();
    const qc = useQueryClient();
    const { data: doc, isLoading, error } = useQuery<any>({
        queryKey: ["public_doc", type, publicId], retry: false,
        queryFn: async () => (await api.get(`/public/docs/${type}/${publicId}`)).data,
    });
    useEffect(() => { if (doc) document.title = `${doc.type === "quote" ? "Quotation" : doc.type === "contract" ? "Contract" : "Invoice"} ${doc.number} — ${doc.company?.companyName || "ShuleCloud"}`; }, [doc]);
    const refresh = () => qc.invalidateQueries({ queryKey: ["public_doc", type, publicId] });

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} /></div>;
    if (error || !doc) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center"><XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h1 className="font-black text-slate-800 text-lg">Document not found</h1>
                <p className="text-sm text-slate-500 mt-2">{(error as any)?.response?.data?.message || "Check the link, or ask the sender for a new one."}</p></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 py-6 px-3">
            <div className="max-w-[860px] mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">{doc.company?.companyName || "ShuleCloud"} · {doc.number} <StatusBadge status={doc.status} /></div>
                <button onClick={() => window.print()} className="h-9 px-4 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-700 flex items-center gap-2 hover:border-[#534AB7]"><Printer className="w-4 h-4" /> Print / Save PDF</button>
            </div>

            <div className="max-w-[860px] mx-auto mb-4 print:hidden space-y-4">
                {doc.type === "invoice" && <PayPanel doc={doc} publicId={publicId} onPaid={refresh} />}
                {doc.type === "quote" && <QuotePanel doc={doc} publicId={publicId} onDone={refresh} />}
                {doc.type === "contract" && <SignPanel doc={doc} publicId={publicId} onDone={refresh} />}
            </div>

            <DocumentView doc={doc} company={doc.company} link={doc.type === "invoice" ? window.location.href : undefined} />
            <div className="text-center text-[11px] text-slate-400 mt-4 print:hidden">Powered by ShuleCloud</div>
        </div>
    );
}

// ── Invoice: pay with M-PESA ─────────────────────────────────────────────────
function PayPanel({ doc, publicId, onPaid }: { doc: any; publicId: string; onPaid: () => void }) {
    const [phone, setPhone] = useState(doc.customer?.phone || "");
    const [amount, setAmount] = useState(String(Math.ceil(doc.balanceDue || 0)));
    const [phase, setPhase] = useState<"idle" | "sending" | "waiting" | "done" | "failed">("idle");
    const [msg, setMsg] = useState("");
    const [receipt, setReceipt] = useState("");
    const timer = useRef<any>(null);
    useEffect(() => () => clearTimeout(timer.current), []);
    useEffect(() => { setAmount(String(Math.ceil(doc.balanceDue || 0))); }, [doc.balanceDue]);

    if (doc.status === "paid") return <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800"><CheckCircle2 className="w-6 h-6" /><div><b>Paid in full.</b> Thank you!</div></div>;
    if (!doc.canPayOnline) {
        return doc.status === "void" ? null : (doc.company?.paymentInstructions || doc.company?.bankName) ? null
            : <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-600">To pay this invoice, please contact {doc.company?.companyName}{doc.company?.phone ? ` on ${doc.company.phone}` : ""}.</div>;
    }

    const poll = (cid: string, tries = 0) => {
        timer.current = setTimeout(async () => {
            try {
                const r = await api.get(`/public/docs/invoice/${publicId}/pay-status`, { params: { checkoutRequestId: cid } });
                if (r.data.status === "completed") { setReceipt(r.data.receipt || ""); setPhase("done"); onPaid(); return; }
                if (r.data.status === "failed") { setMsg(r.data.message || "The payment was not completed."); setPhase("failed"); return; }
            } catch { /* keep trying */ }
            if (tries > 45) { setMsg("We haven't received confirmation yet. If money was deducted, it will reflect on this invoice shortly — otherwise try again."); setPhase("failed"); return; }
            poll(cid, tries + 1);
        }, 3000);
    };
    const pay = async () => {
        setPhase("sending"); setMsg("");
        try {
            const r = await api.post(`/public/docs/invoice/${publicId}/pay`, { phone, amount: Number(amount) });
            setMsg(r.data.message || "Check your phone and enter your M-PESA PIN."); setPhase("waiting"); poll(r.data.checkoutRequestId);
        } catch (e: any) { setMsg(e.response?.data?.message || "Could not start the payment. Please try again."); setPhase("failed"); }
    };

    return (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 font-black text-slate-800 mb-1"><Smartphone className="w-5 h-5 text-emerald-600" /> Pay with M-PESA</div>
            {phase === "done" ? (
                <div className="flex items-center gap-3 text-emerald-700 py-2"><CheckCircle2 className="w-6 h-6" /><div><b>Payment received.</b>{receipt ? ` M-PESA receipt ${receipt}.` : ""} Thank you!</div></div>
            ) : phase === "waiting" ? (
                <div className="flex items-center gap-3 py-2 text-slate-700"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /><div><b>{msg}</b><div className="text-xs text-slate-500">Keep this page open — it updates by itself once you have paid.</div></div></div>
            ) : (
                <>
                    <p className="text-xs text-slate-500 mb-3">You'll get a prompt on your phone. Balance due: <b>{fmt(doc.balanceDue, doc.currency)}</b>.</p>
                    <div className="flex flex-wrap items-end gap-3">
                        <div><label className="block text-[11px] font-bold text-slate-500 mb-1">M-PESA phone number</label><input className={`${inp} w-52`} value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel" /></div>
                        <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Amount ({doc.currency})</label><input className={`${inp} w-36`} type="number" min={1} max={Math.ceil(doc.balanceDue)} value={amount} onChange={e => setAmount(e.target.value)} /></div>
                        <button onClick={pay} disabled={phase === "sending" || !phone || !Number(amount)} className="h-10 px-6 rounded-lg text-white text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                            {phase === "sending" && <Loader2 className="w-4 h-4 animate-spin" />} Pay {fmt(Number(amount) || 0, doc.currency)}
                        </button>
                    </div>
                    {phase === "failed" && msg && <p className="text-sm text-red-600 mt-3">{msg}</p>}
                </>
            )}
        </div>
    );
}

// ── Quotation: accept / decline ──────────────────────────────────────────────
function QuotePanel({ doc, publicId, onDone }: { doc: any; publicId: string; onDone: () => void }) {
    const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
    if (doc.status === "accepted") return <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800"><b>Quotation accepted.</b> Thank you — we'll be in touch with your invoice.</div>;
    if (doc.status === "declined") return <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">This quotation was declined.</div>;
    if (doc.status === "expired") return <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-orange-800">This quotation has expired. Please contact us for an updated one.</div>;
    const respond = async (action: "accept" | "decline") => {
        setBusy(true); setErr("");
        try { await api.post(`/public/docs/quote/${publicId}/respond`, { action, name: doc.customer?.name }); onDone(); }
        catch (e: any) { setErr(e.response?.data?.message || "Something went wrong."); } finally { setBusy(false); }
    };
    return (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
            <div><div className="font-black text-slate-800">Do you accept this quotation?</div><div className="text-xs text-slate-500">Valid until {doc.expiryDate}. Total {fmt(doc.total, doc.currency)}.</div>{err && <div className="text-sm text-red-600 mt-1">{err}</div>}</div>
            <div className="flex gap-2"><button onClick={() => respond("decline")} disabled={busy} className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-bold text-slate-600">Decline</button><button onClick={() => respond("accept")} disabled={busy} className="h-10 px-6 rounded-lg text-white text-sm font-bold bg-emerald-600 hover:bg-emerald-700">Accept quotation</button></div>
        </div>
    );
}

// ── Contract: sign online ────────────────────────────────────────────────────
function SignPanel({ doc, publicId, onDone }: { doc: any; publicId: string; onDone: () => void }) {
    const [name, setName] = useState(doc.contract?.clientSignatory?.name || "");
    const [agree, setAgree] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
    if (doc.status === "signed") return <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800"><b>Signed</b>{doc.signedAt ? ` on ${new Date(doc.signedAt).toLocaleDateString("en-GB")}` : ""}. A copy stays available at this link — use Print / Save PDF to keep one.</div>;
    if (doc.status !== "sent") return null;
    const sign = async () => {
        setBusy(true); setErr("");
        try { await api.post(`/public/docs/contract/${publicId}/sign`, { name, agree }); onDone(); }
        catch (e: any) { setErr(e.response?.data?.message || "Could not sign."); } finally { setBusy(false); }
    };
    return (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 font-black text-slate-800 mb-1"><FileSignature className="w-5 h-5" style={{ color: ACCENT }} /> Sign this contract</div>
            <p className="text-xs text-slate-500 mb-3">Read the contract below, then type your full name to sign on behalf of {doc.customer?.name}. Your name, the date and time are recorded.</p>
            <div className="flex flex-wrap items-end gap-3">
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Full name</label><input className={`${inp} w-64`} value={name} onChange={e => setName(e.target.value)} /></div>
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> I have read and agree to this contract</label>
                <button onClick={sign} disabled={busy || name.trim().length < 3 || !agree} className="h-10 px-6 rounded-lg text-white text-sm font-bold disabled:opacity-50" style={{ background: ACCENT }}>{busy ? "Signing…" : "Sign contract"}</button>
            </div>
            {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
        </div>
    );
}
