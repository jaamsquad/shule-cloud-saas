import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, Printer, ArrowLeft, Check, AlertCircle, Copy, Loader2, CreditCard, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useSchoolBrand } from "@/lib/printDoc";
import { invoiceHtml, esc, day, Line, InvoiceView } from "./invoicePaper";
import { outputHtmlDoc } from "@/lib/pdfDoc";

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const school = useSchoolBrand();

    const { data: raw, isLoading } = useQuery({
        queryKey: ["invoice", id],
        queryFn: async () => (await api.get(`/schools/default/invoices/${id}`)).data.data,
        enabled: !!id,
    });

    // Manual payments — gated by Settings → Fees → Manual fee payments
    const { data: finance } = useQuery<{ manualPaymentsEnabled: boolean }>({ queryKey: ["finance_settings"], queryFn: async () => (await api.get("/settings/finance")).data });
    const manualAllowed = finance?.manualPaymentsEnabled !== false;
    const [payOpen, setPayOpen] = useState(false);
    const [pay, setPay] = useState({ amount: "", method: "M-Pesa", reference: "", date: new Date().toISOString().slice(0, 10) });
    const recordPayment = useMutation({
        mutationFn: async () => api.post(`/schools/default/payments`, { invoice_id: id, amount: parseFloat(pay.amount), method: pay.method, reference: pay.reference || undefined, payment_date: pay.date }),
        onSuccess: (r: any) => {
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            toast.success(`Payment recorded — receipt ${r.data?.data?.receipt_no || ""}`);
            setPayOpen(false); setPay({ amount: "", method: "M-Pesa", reference: "", date: new Date().toISOString().slice(0, 10) });
        },
        onError: (e: any) => toast.error(e.response?.data?.errors?.[0]?.message || e.response?.data?.message || "Could not record the payment"),
    });

    // Real invoice shape (total_due / line_items / payments) → what the page shows
    const view = useMemo<InvoiceView | null>(() => {
        if (!raw) return null;
        const st = raw.student || {};
        const parent = Array.isArray(st.parents) && st.parents[0] ? st.parents[0] : null;
        const total = Number(raw.total ?? raw.total_due ?? raw.amount_due ?? raw.amount ?? 0);
        const status = String(raw.status || "UNPAID").toUpperCase();
        const paid = status === "PAID" && raw.amount_paid == null ? total : Number(raw.amount_paid ?? 0);
        const balance = status === "PAID" ? 0 : Number(raw.balance ?? Math.max(0, total - paid));
        const lines: Line[] = Array.isArray(raw.line_items) && raw.line_items.length
            ? raw.line_items.map((li: any) => ({ label: li.label || li.name || li.description || li.category || "Fee", amount: Number(li.amount) || 0 }))
            : raw.particulars && typeof raw.particulars === "object"
                ? Object.entries(raw.particulars).map(([label, amount]) => ({ label, amount: Number(amount) || 0 }))
                : [{ label: "Fee payment", amount: total }];
        return {
            no: raw.invoice_no || raw.invoiceNo || String(raw._id || id || "").slice(-8).toUpperCase(),
            issued: raw.createdAt || raw.issue_date || raw.date, due: raw.due_date || raw.dueDate,
            status, period: raw.feeMonth ?? raw.period ?? raw.term ?? raw.month ?? "",
            studentName: raw.studentName || st.studentName || "—", regNo: raw.registrationNo || st.registrationNo || "—", className: raw.studentClass || st.studentClass || "—",
            guardian: {
                name: parent?.name || st.parentName || st.fatherName || st.motherName || st.guardianName || "",
                phone: parent?.phone || st.parentPhone || st.fatherPhone || st.motherPhone || st.guardianPhone || "",
                email: parent?.email || st.parentEmail || st.fatherEmail || st.motherEmail || st.guardianEmail || "",
            },
            lines, total, paid, balance,
            payments: (raw.payments || []).map((p: any) => ({ date: p.payment_date || p.createdAt || p.date, method: p.method || p.payment_method || "", ref: p.reference || p.receipt_no || p.transaction_id || "", amount: Number(p.amount) || 0 })),
            bank: raw.bankName || "",
        };
    }, [raw, id]);

    const previewHtml = useMemo(() => (view ? invoiceHtml(view, school, false) : ""), [view, school]);
    const frame = useRef<HTMLIFrameElement>(null);
    const [h, setH] = useState(1100);
    useEffect(() => { setH(1100); }, [previewHtml]);
    const fit = () => { const d = frame.current?.contentDocument; if (d?.body) setH(Math.max(900, d.body.scrollHeight + 8)); };

    const printInvoice = () => { if (view) void outputHtmlDoc(`Invoice ${view.no}`, invoiceHtml(view, school, true), { fileName: `Invoice-${view.no}` }); };

    // The bank / student / institute triple copy used for counter payments
    const printTriple = () => {
        if (!view) return;
        const rows = view.lines.map((l, i) => `<tr><td style="padding:5px;border:1px solid #eee;font-size:10px">${i + 1}. ${esc(l.label).toUpperCase()}</td><td style="padding:5px;border:1px solid #eee;text-align:right;font-size:10px">${l.amount.toLocaleString()}</td></tr>`).join("");
        const copy = (t: string) => `<div style="padding:18px 22px;border-bottom:2px dashed #ccc;height:32%;box-sizing:border-box;overflow:hidden">
            <div style="display:flex;justify-content:space-between;align-items:flex-start"><div><p style="font-size:9px;font-weight:bold;margin:0;color:#666">${esc(school.name)} · ADM: ${esc(view.regNo)}</p><h2 style="font-size:15px;margin:4px 0;font-weight:900">${esc(view.studentName).toUpperCase()}</h2><p style="font-size:9px;margin:0;color:#888">Class: ${esc(view.className)} | Invoice: ${esc(view.no)} | Due: ${day(view.due)}</p></div><p style="font-size:10px;font-weight:900;margin:0;color:#999">${t.toUpperCase()} COPY</p></div>
            <table style="width:100%;border-collapse:collapse;margin-top:10px"><tr style="background:#f9f9f9"><th style="text-align:left;padding:4px;font-size:8px;color:#999">Sr. Particulars</th><th style="text-align:right;padding:4px;font-size:8px;color:#999">Amount</th></tr>${rows}
            <tr><td style="padding:5px;font-weight:900;font-size:11px">BALANCE DUE</td><td style="padding:5px;text-align:right;font-weight:900;font-size:11px">KES ${view.balance.toLocaleString()}</td></tr></table></div>`;
        void outputHtmlDoc(`Invoice ${view.no} (triple copy)`, `<html><head><style>@page{size:A4;margin:0}</style></head><body style="margin:0;font-family:Arial,sans-serif;height:100vh">${copy("Bank")}${copy("Student")}${copy("Institute")}<script>window.onload=()=>window.print()</script></body></html>`, { fileName: `Invoice-${view.no}-copies` });
    };

    const copyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); toast.success("Invoice link copied"); } catch { toast.error("Could not copy the link"); } };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" /></div>;
    if (!view) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400 font-black uppercase text-xs tracking-widest">
            <AlertCircle className="w-12 h-12 mb-4" /> Invoice Not Found
        </div>
    );

    return (
        <div className="flex-1 bg-[#EEF1F6] min-h-screen flex flex-col pb-16">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 print:hidden">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Fees</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Invoice {view.no}{view.period ? ` - ${view.period}` : ""}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button onClick={printInvoice} className="h-10 px-5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-xl flex items-center gap-2 text-[11px] uppercase tracking-widest"><Printer className="w-4 h-4" /> Print Invoice</button>
                    <button onClick={printTriple} className="h-10 px-4 bg-white border border-slate-200 text-slate-600 font-black rounded-xl flex items-center gap-2 text-[11px] uppercase tracking-widest hover:bg-slate-50">Triple copy</button>
                    <button onClick={copyLink} className="h-10 px-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50" title="Copy link"><Copy className="w-4 h-4" /></button>
                    {view.status !== "PAID" && view.status !== "VOIDED" && (
                        manualAllowed ? (
                            <button onClick={() => { setPay(p => ({ ...p, amount: view.balance ? String(view.balance) : "" })); setPayOpen(true); }} className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl flex items-center gap-2 text-[11px] uppercase tracking-widest"><Check className="w-4 h-4" /> Mark Paid</button>
                        ) : (
                            <span className="h-10 px-4 rounded-xl bg-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-2" title="Manual payments are switched off — pay via M-Pesa"><CreditCard className="w-4 h-4" /> M-Pesa only</span>
                        )
                    )}
                    <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-[#5C67F2] ml-2"><ArrowLeft className="w-4 h-4" /> Back</button>
                </div>
            </div>

            {/* the invoice, shown exactly as it prints */}
            <div className="flex-1 px-3 pt-8 flex justify-center overflow-x-auto">
                <div className="bg-white shadow-xl shadow-slate-300/50 rounded-sm" style={{ width: 794, minWidth: 794 }}>
                    <iframe ref={frame} title="Invoice" srcDoc={previewHtml} onLoad={fit} style={{ width: 794, height: h, border: 0, display: "block" }} />
                </div>
            </div>

            {/* Record a manual payment */}
            {payOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="text-base font-semibold text-slate-800">Record payment</h3>
                            <button onClick={() => setPayOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-xs text-slate-400">Invoice {view.no} · Balance due KES {view.balance.toLocaleString()}</p>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Amount paid</label><input type="number" min={1} value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400" /></div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Mode of payment</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {["M-Pesa", "Bank Transfer", "Cash", "Cheque"].map(m => (
                                        <button key={m} type="button" onClick={() => setPay({ ...pay, method: m })} className={`h-9 rounded-lg text-xs font-semibold border ${pay.method === m ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white border-slate-200 text-slate-600"}`}>{m}</button>
                                    ))}
                                </div>
                            </div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Reference / receipt no. (optional)</label><input value={pay.reference} onChange={e => setPay({ ...pay, reference: e.target.value })} placeholder="e.g. M-Pesa code, bank slip no." className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400" /></div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Date paid</label><input type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm" /></div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
                            <button onClick={() => setPayOpen(false)} className="h-9 px-4 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending || !pay.amount || Number(pay.amount) <= 0} className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">{recordPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Record payment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
