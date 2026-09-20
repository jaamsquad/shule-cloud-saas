import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { DocType, TYPE_LABEL, TERMS, TERM_DAYS, ACCENT, CustomerFields, usePlans, calcTotals, fmt, isoToday, addDays, DEFAULT_CLAUSES, inputClass as inp } from "./bizShared";

const Card = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <h3 className="font-black text-slate-800">{title}</h3>{sub && <p className="text-xs text-slate-400 mb-4">{sub}</p>}<div className={sub ? "" : "mt-4"}>{children}</div>
    </div>
);
const Lbl = ({ children }: { children: React.ReactNode }) => <label className="block text-[11px] font-bold text-slate-500 mb-1">{children}</label>;

const blankCustomer = { tenantId: "", name: "", contactPerson: "", email: "", phone: "", address: "" };

// ── Create / edit an invoice or quotation ─────────────────────────────────────
export function InvoiceQuoteEditor({ type, id, onDone, onCancel }: { type: "invoice" | "quote"; id?: string; onDone: (doc: any) => void; onCancel: () => void }) {
    const { data: plans = [] } = usePlans();
    const { data: existing, isLoading } = useQuery({ queryKey: ["biz_doc", id], enabled: !!id, queryFn: async () => (await api.get(`/owner/business/docs/${id}`)).data });
    const { data: company } = useQuery({ queryKey: ["biz_company"], queryFn: async () => (await api.get("/owner/business/settings")).data });
    const [f, setF] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<"details" | "notes">("details");

    useEffect(() => {
        if (f) return;
        if (id && existing) { setF({ ...existing.doc }); return; }
        if (!id && company) {
            const date = isoToday();
            setF({ customer: { ...blankCustomer }, subject: "", salesperson: "", orderNumber: "", currency: "KES", date, terms: "Net 30", dueDate: addDays(date, 30), expiryDate: addDays(date, Number(company.quoteValidityDays) || 30),
                items: [{ description: "", quantity: 1, rate: 0, taxPercent: 0 }], discount: { value: 0, type: "%" }, shipping: 0, adjustment: 0, notes: "",
                termsAndConditions: type === "invoice" ? company.invoiceTerms : company.quoteTerms, subscription: null });
        }
    }, [id, existing, company, f, type]);

    if (!f || (id && isLoading)) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} /></div>;

    const set = (patch: any) => setF((s: any) => ({ ...s, ...patch }));
    const setItem = (i: number, patch: any) => set({ items: f.items.map((it: any, j: number) => j === i ? { ...it, ...patch } : it) });
    const t = calcTotals(f);

    // A plan line: paying the invoice puts the school on this plan (needs a school chosen above).
    const addPlan = (planId: string) => {
        const p = plans.find((x: any) => String(x._id || x.id) === planId); if (!p) return;
        const name = `ShuleCloud ${p.name} subscription${p.durationDays ? ` (${p.durationDays} days)` : ""}`;
        const blank = f.items.length === 1 && !f.items[0].description && !Number(f.items[0].rate);
        set({ items: [...(blank ? [] : f.items), { description: name, quantity: 1, rate: Number(p.price) || 0, taxPercent: 0 }], subscription: f.customer?.tenantId ? { tenantId: f.customer.tenantId, planId: String(p._id || p.id), planName: p.name } : f.subscription });
        if (!f.customer?.tenantId) toast.info("Choose the school above so paying this invoice activates its plan automatically.");
    };

    const save = async () => {
        if (!f.customer?.name?.trim()) { toast.error("Choose or enter the customer."); return; }
        if (!f.items.some((it: any) => it.description?.trim() || Number(it.rate))) { toast.error("Add at least one item."); return; }
        setSaving(true);
        try {
            const body = { ...f, type };
            const r = id ? await api.put(`/owner/business/docs/${id}`, body) : await api.post("/owner/business/docs", body);
            toast.success(`${TYPE_LABEL[type]} ${id ? "updated" : "created"}`);
            onDone(r.data.doc);
        } catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); } finally { setSaving(false); }
    };

    return (
        <div className="space-y-5 max-w-5xl">
            <button onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
            <h2 className="text-xl font-black text-slate-800">{id ? `Edit ${existing?.doc?.number || TYPE_LABEL[type]}` : `New ${TYPE_LABEL[type]}`}</h2>

            <Card title={TYPE_LABEL[type]} sub="Who this is for"><CustomerFields customer={f.customer || blankCustomer} onChange={c => set({ customer: c, ...(f.subscription && c.tenantId !== f.subscription.tenantId ? { subscription: null } : {}) })} /></Card>

            <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 w-fit">
                {(["details", "notes"] as const).map(k => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-xs font-black ${tab === k ? "text-white" : "text-slate-500"}`} style={tab === k ? { background: ACCENT } : {}}>{k === "details" ? "Details" : "Notes & Terms"}</button>)}
            </div>

            {tab === "details" ? (
                <>
                    <Card title="Details">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Lbl>{type === "invoice" ? "Invoice" : "Quote"} date *</Lbl><input type="date" className={inp} value={f.date} onChange={e => set({ date: e.target.value, ...(type === "invoice" ? { dueDate: addDays(e.target.value, TERM_DAYS[f.terms] ?? 30) } : {}) })} /></div>
                            {type === "invoice" ? (
                                <>
                                    <div><Lbl>Terms *</Lbl><select className={inp} value={f.terms} onChange={e => set({ terms: e.target.value, dueDate: addDays(f.date, TERM_DAYS[e.target.value] ?? 30) })}>{TERMS.map(x => <option key={x}>{x}</option>)}</select></div>
                                    <div><Lbl>Due date *</Lbl><input type="date" className={inp} value={f.dueDate} onChange={e => set({ dueDate: e.target.value })} /></div>
                                </>
                            ) : <div><Lbl>Valid until *</Lbl><input type="date" className={inp} value={f.expiryDate} onChange={e => set({ expiryDate: e.target.value })} /></div>}
                            <div><Lbl>Salesperson</Lbl><input className={inp} value={f.salesperson} onChange={e => set({ salesperson: e.target.value })} placeholder="e.g. Jane Doe" /></div>
                            <div><Lbl>{type === "invoice" ? "Order / PO number" : "Reference"}</Lbl><input className={inp} value={f.orderNumber} onChange={e => set({ orderNumber: e.target.value })} /></div>
                            <div><Lbl>Currency</Lbl><select className={inp} value={f.currency} onChange={e => set({ currency: e.target.value })}><option>KES</option><option>USD</option><option>UGX</option><option>TZS</option></select></div>
                            <div className="md:col-span-3"><Lbl>Subject</Lbl><input className={inp} value={f.subject} onChange={e => set({ subject: e.target.value })} placeholder="e.g. ShuleCloud Premium subscription — Term 2" /></div>
                        </div>
                    </Card>

                    <Card title="Items">
                        <div className="flex flex-wrap gap-2 mb-3">
                            <button onClick={() => set({ items: [...f.items, { description: "", quantity: 1, rate: 0, taxPercent: 0 }] })} className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Item</button>
                            <select value="" onChange={e => e.target.value && addPlan(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white">
                                <option value="">+ Subscription plan…</option>
                                {plans.map((p: any) => <option key={p._id || p.id} value={p._id || p.id}>{p.name} — {fmt(p.price)}</option>)}
                            </select>
                        </div>
                        {f.subscription && <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3">When this invoice is paid in full, {f.customer?.name} is put on the <b>{f.subscription.planName}</b> plan automatically.</p>}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[640px]">
                                <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-400"><th className="text-left p-2">Item details</th><th className="p-2 w-20">Qty</th><th className="p-2 w-28">Rate</th><th className="p-2 w-20">Tax %</th><th className="p-2 w-28 text-right">Amount</th><th className="w-8" /></tr></thead>
                                <tbody>{f.items.map((it: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-50 align-top">
                                        <td className="p-2"><textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={it.description} onChange={e => setItem(i, { description: e.target.value })} placeholder="Item or service description" /></td>
                                        <td className="p-2"><input type="number" min={0} className={inp} value={it.quantity} onChange={e => setItem(i, { quantity: e.target.value })} /></td>
                                        <td className="p-2"><input type="number" min={0} className={inp} value={it.rate} onChange={e => setItem(i, { rate: e.target.value })} /></td>
                                        <td className="p-2"><input type="number" min={0} max={100} className={inp} value={it.taxPercent} onChange={e => setItem(i, { taxPercent: e.target.value })} /></td>
                                        <td className="p-2 text-right font-bold pt-4">{fmt((Number(it.quantity) || 0) * (Number(it.rate) || 0), f.currency)}</td>
                                        <td className="p-2 pt-3"><button onClick={() => set({ items: f.items.filter((_: any, j: number) => j !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-4">
                            <div className="w-full sm:w-80 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">Sub total</span><b>{fmt(t.subTotal, f.currency)}</b></div>
                                <div className="flex items-center justify-between gap-2"><span className="text-slate-500">Discount</span>
                                    <div className="flex gap-1"><input type="number" min={0} className="w-24 h-9 px-2 border border-slate-200 rounded-lg text-right" value={f.discount.value} onChange={e => set({ discount: { ...f.discount, value: e.target.value } })} />
                                        <select className="h-9 px-1 border border-slate-200 rounded-lg" value={f.discount.type} onChange={e => set({ discount: { ...f.discount, type: e.target.value } })}><option value="%">%</option><option value="amount">{f.currency}</option></select></div>
                                    <b className="w-24 text-right">- {fmt(t.discountAmount, "")}</b></div>
                                {t.taxTotal > 0 && <div className="flex justify-between"><span className="text-slate-500">Tax</span><b>{fmt(t.taxTotal, f.currency)}</b></div>}
                                <div className="flex items-center justify-between"><span className="text-slate-500">Shipping / other charges</span><input type="number" className="w-28 h-9 px-2 border border-slate-200 rounded-lg text-right" value={f.shipping} onChange={e => set({ shipping: e.target.value })} /></div>
                                <div className="flex items-center justify-between"><span className="text-slate-500">Adjustment</span><input type="number" className="w-28 h-9 px-2 border border-slate-200 rounded-lg text-right" value={f.adjustment} onChange={e => set({ adjustment: e.target.value })} /></div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span className="font-black">Total</span><span className="font-black" style={{ color: ACCENT }}>{fmt(t.total, f.currency)}</span></div>
                            </div>
                        </div>
                    </Card>
                </>
            ) : (
                <Card title="Notes & terms">
                    <div className="space-y-4">
                        <div><Lbl>Customer notes (shown on the document)</Lbl><textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={f.notes} onChange={e => set({ notes: e.target.value })} /></div>
                        <div><Lbl>Terms &amp; conditions</Lbl><textarea rows={5} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={f.termsAndConditions} onChange={e => set({ termsAndConditions: e.target.value })} /></div>
                    </div>
                </Card>
            )}

            <div className="flex justify-end gap-3">
                <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
                <button onClick={save} disabled={saving} className="h-10 px-6 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
            </div>
        </div>
    );
}

// ── Create / edit a contract ──────────────────────────────────────────────────
export function ContractEditor({ id, onDone, onCancel }: { id?: string; onDone: (doc: any) => void; onCancel: () => void }) {
    const { data: plans = [] } = usePlans();
    const { data: existing, isLoading } = useQuery({ queryKey: ["biz_doc", id], enabled: !!id, queryFn: async () => (await api.get(`/owner/business/docs/${id}`)).data });
    const [f, setF] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (f) return;
        if (id && existing) setF({ ...existing.doc });
        else if (!id) {
            const start = isoToday();
            setF({ customer: { ...blankCustomer }, subject: "", currency: "KES", date: start, notes: "", items: [], discount: { value: 0, type: "%" }, shipping: 0, adjustment: 0, subscription: null,
                contract: { title: "Software Subscription Agreement", startDate: start, endDate: addDays(start, 365), billingCycle: "Term", value: 0, clauses: DEFAULT_CLAUSES.map(c => ({ ...c })), providerSignatory: { name: "", title: "Director" }, clientSignatory: { name: "", title: "Principal" } } });
        }
    }, [id, existing, f]);

    if (!f || (id && isLoading)) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} /></div>;
    const set = (patch: any) => setF((s: any) => ({ ...s, ...patch }));
    const k = f.contract; const setK = (patch: any) => set({ contract: { ...k, ...patch } });
    const setClause = (i: number, patch: any) => setK({ clauses: k.clauses.map((c: any, j: number) => j === i ? { ...c, ...patch } : c) });
    const moveClause = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= k.clauses.length) return; const n = k.clauses.slice(); [n[i], n[j]] = [n[j], n[i]]; setK({ clauses: n }); };

    const pickPlan = (planId: string) => {
        const p = plans.find((x: any) => String(x._id || x.id) === planId);
        if (!p) { set({ subscription: null }); return; }
        set({ subscription: f.customer?.tenantId ? { tenantId: f.customer.tenantId, planId: String(p._id || p.id), planName: p.name } : { tenantId: "", planId: String(p._id || p.id), planName: p.name } });
        setK({ value: Number(p.price) || k.value });
    };

    const save = async () => {
        if (!f.customer?.name?.trim()) { toast.error("Choose or enter the customer."); return; }
        setSaving(true);
        try {
            const body = { ...f, type: "contract", subscription: f.subscription?.tenantId ? f.subscription : null };
            const r = id ? await api.put(`/owner/business/docs/${id}`, body) : await api.post("/owner/business/docs", body);
            toast.success(`Contract ${id ? "updated" : "created"}`); onDone(r.data.doc);
        } catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); } finally { setSaving(false); }
    };

    return (
        <div className="space-y-5 max-w-5xl">
            <button onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
            <h2 className="text-xl font-black text-slate-800">{id ? `Edit ${existing?.doc?.number || "contract"}` : "New contract"}</h2>

            <Card title="Parties" sub="The school signing this contract"><CustomerFields customer={f.customer || blankCustomer} onChange={c => set({ customer: c, contract: { ...k, clientSignatory: { ...k.clientSignatory, name: k.clientSignatory?.name || c.contactPerson || "" } } })} /></Card>

            <Card title="Terms of the agreement">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><Lbl>Contract title</Lbl><input className={inp} value={k.title} onChange={e => setK({ title: e.target.value })} /></div>
                    <div><Lbl>Start date</Lbl><input type="date" className={inp} value={k.startDate} onChange={e => setK({ startDate: e.target.value })} /></div>
                    <div><Lbl>End date</Lbl><input type="date" className={inp} value={k.endDate} onChange={e => setK({ endDate: e.target.value })} /></div>
                    <div><Lbl>Plan</Lbl><select className={inp} value={f.subscription?.planId || ""} onChange={e => pickPlan(e.target.value)}><option value="">— none —</option>{plans.map((p: any) => <option key={p._id || p.id} value={p._id || p.id}>{p.name} — {fmt(p.price)}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-3"><div><Lbl>Fee ({f.currency})</Lbl><input type="number" min={0} className={inp} value={k.value} onChange={e => setK({ value: e.target.value })} /></div>
                        <div><Lbl>Billed every</Lbl><select className={inp} value={k.billingCycle} onChange={e => setK({ billingCycle: e.target.value })}><option>Month</option><option>Term</option><option>Year</option></select></div></div>
                </div>
            </Card>

            <Card title="Clauses" sub="Edit the wording as needed. {{client}}, {{provider}}, {{fee}}, {{billingCycle}}, {{startDate}}, {{endDate}} and {{plan}} are filled in automatically.">
                <div className="space-y-4">
                    {k.clauses.map((c: any, i: number) => (
                        <div key={i} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                            <div className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shrink-0" style={{ background: ACCENT }}>{i + 1}</span>
                                <input className={inp} value={c.heading} onChange={e => setClause(i, { heading: e.target.value })} placeholder="Heading" />
                                <button onClick={() => moveClause(i, -1)} className="text-slate-400 hover:text-slate-700"><ArrowUp className="w-4 h-4" /></button><button onClick={() => moveClause(i, 1)} className="text-slate-400 hover:text-slate-700"><ArrowDown className="w-4 h-4" /></button>
                                <button onClick={() => setK({ clauses: k.clauses.filter((_: any, j: number) => j !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                            <textarea rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={c.body} onChange={e => setClause(i, { body: e.target.value })} />
                        </div>
                    ))}
                    <button onClick={() => setK({ clauses: [...k.clauses, { heading: "", body: "" }] })} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add clause</button>
                </div>
            </Card>

            <Card title="Signatories">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Lbl>For ShuleCloud — name</Lbl><input className={inp} value={k.providerSignatory?.name || ""} onChange={e => setK({ providerSignatory: { ...k.providerSignatory, name: e.target.value } })} /></div>
                    <div><Lbl>Title</Lbl><input className={inp} value={k.providerSignatory?.title || ""} onChange={e => setK({ providerSignatory: { ...k.providerSignatory, title: e.target.value } })} /></div>
                    <div><Lbl>For the school — name</Lbl><input className={inp} value={k.clientSignatory?.name || ""} onChange={e => setK({ clientSignatory: { ...k.clientSignatory, name: e.target.value } })} /></div>
                    <div><Lbl>Title</Lbl><input className={inp} value={k.clientSignatory?.title || ""} onChange={e => setK({ clientSignatory: { ...k.clientSignatory, title: e.target.value } })} /></div>
                    <div className="md:col-span-2"><Lbl>Additional notes</Lbl><textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={f.notes} onChange={e => set({ notes: e.target.value })} /></div>
                </div>
            </Card>

            <div className="flex justify-end gap-3">
                <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
                <button onClick={save} disabled={saving} className="h-10 px-6 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
            </div>
        </div>
    );
}
