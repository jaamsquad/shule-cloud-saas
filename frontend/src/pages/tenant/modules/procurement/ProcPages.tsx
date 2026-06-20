import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save, Printer, Download, Clock, CheckCircle2, FileText, Truck, PackageCheck, Wallet, Users, FileSignature, Search, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import ExpCrud from "../expense/ExpCrud";
import { proc, ksh, toCSV, download } from "./procApi";

const ACCENT = "#0E7490";
const toData = (o: Record<string, number> = {}) => Object.entries(o).map(([name, value]) => ({ name, value }));
const useSuppliers = () => { const { data = [] } = useQuery({ queryKey: ["exp", "procurement_suppliers"], queryFn: () => proc.list("procurement_suppliers") }); return data.map((s: any) => s.name).filter(Boolean); };

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function ProcDashboard() {
    const { data, isLoading } = useQuery({ queryKey: ["proc_stats"], queryFn: proc.stats });
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#0E7490]" /></div>;
    const c = data?.cards || {}; const ch = data?.charts || {};
    const cards = [
        { label: "Pending Requests", value: c.pendingRequests, icon: Clock }, { label: "Approved Requests", value: c.approvedRequests, icon: CheckCircle2 },
        { label: "Purchase Orders", value: c.purchaseOrders, icon: FileText }, { label: "Outstanding Deliveries", value: c.outstandingDeliveries, icon: Truck },
        { label: "Goods Received", value: c.goodsReceived, icon: PackageCheck }, { label: "Pending Payments", value: c.pendingPayments, icon: Wallet },
        { label: "Active Suppliers", value: c.activeSuppliers, icon: Users }, { label: "Active Contracts", value: c.activeContracts, icon: FileSignature },
    ];
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cards.map(card => <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-2"><card.icon className="w-4 h-4" /></div><div className="text-2xl font-black text-slate-800">{card.value ?? 0}</div><div className="text-[11px] text-slate-400 font-bold">{card.label}</div></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Monthly Procurement Spending"><ResponsiveContainer width="100%" height={240}><BarChart data={toData(ch.byMonth)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: any) => ksh(v)} /><Bar dataKey="value" fill={ACCENT} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
                <Card title="Purchases by Department"><ResponsiveContainer width="100%" height={240}><BarChart data={toData(ch.byDept)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: any) => ksh(v)} /><Bar dataKey="value" fill="#1D4ED8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
            </div>
            <SupplierPerformance />
        </div>
    );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 className="text-sm font-black text-slate-700 mb-3">{title}</h3>{children}</div>; }
function SupplierPerformance() {
    const { data = [] } = useQuery({ queryKey: ["proc_supplier_perf"], queryFn: proc.supplierPerformance });
    if (!data.length) return null;
    return (
        <Card title="Supplier Performance">
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase"><th className="text-left px-3 py-2 font-black">Supplier</th><th className="text-left px-3 py-2 font-black">Orders</th><th className="text-left px-3 py-2 font-black">On-time</th><th className="text-left px-3 py-2 font-black">Late</th><th className="text-left px-3 py-2 font-black">Total</th><th className="text-left px-3 py-2 font-black">Rating</th></tr></thead><tbody>{data.map((s: any) => <tr key={s.name} className="border-b border-slate-50"><td className="px-3 py-2 font-bold text-slate-700">{s.name}</td><td className="px-3 py-2">{s.totalOrders}</td><td className="px-3 py-2 text-emerald-600">{s.onTime}</td><td className="px-3 py-2 text-rose-600">{s.late}</td><td className="px-3 py-2">{ksh(s.totalPurchases)}</td><td className="px-3 py-2 font-bold">{s.rating}/5</td></tr>)}</tbody></table></div>
        </Card>
    );
}

// ── Shared CRUD pages (reuse ExpCrud against shared collections) ──────────────
export function RequestsPage() {
    return <ExpCrud collection="procurement_pr" title="Purchase Requests" addLabel="New Request" numberLabel="Request No"
        fields={[{ k: "date", label: "Request Date", type: "date" }, { k: "department", label: "Department", required: true }, { k: "requestedBy", label: "Requested By" }, { k: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] }, { k: "requiredDate", label: "Required Date", type: "date" }, { k: "budgetCode", label: "Budget Code" }, { k: "items", label: "Items Requested", type: "textarea" }, { k: "quantity", label: "Quantity", type: "number" }, { k: "estimatedCost", label: "Estimated Total Cost", type: "money" }, { k: "justification", label: "Justification", type: "textarea" }, { k: "status", label: "Status", type: "select", options: ["Draft", "Submitted", "Approved", "Purchase Order", "Goods Received", "Invoice", "Payment", "Completed"] }, { k: "attachment", label: "Attachment", type: "file" }]}
        columns={[{ k: "date", label: "Date" }, { k: "department", label: "Department" }, { k: "estimatedCost", label: "Est. Cost", type: "money" }, { k: "priority", label: "Priority", type: "badge" }, { k: "status", label: "Status", type: "badge" }]} />;
}
export function OrdersPage() {
    const suppliers = useSuppliers();
    return <ExpCrud collection="procurement_po" title="Purchase Orders" addLabel="New PO" numberLabel="PO No" printable totalKey="totalCost"
        fields={[{ k: "date", label: "Date", type: "date" }, { k: "supplier", label: "Supplier", type: "select", options: () => suppliers, required: true }, { k: "department", label: "Department" }, { k: "items", label: "Items", type: "textarea" }, { k: "quantity", label: "Quantity", type: "number" }, { k: "unitPrice", label: "Unit Cost", type: "money" }, { k: "taxes", label: "Taxes", type: "money" }, { k: "totalCost", label: "Total Cost", type: "money" }, { k: "deliveryAddress", label: "Delivery Address" }, { k: "expectedDelivery", label: "Expected Delivery", type: "date" }, { k: "paymentTerms", label: "Payment Terms" }, { k: "status", label: "Delivery Status", type: "select", options: ["Draft", "Sent", "Partial", "Delivered", "Cancelled"] }]}
        columns={[{ k: "date", label: "Date" }, { k: "supplier", label: "Supplier" }, { k: "totalCost", label: "Total", type: "money" }, { k: "expectedDelivery", label: "Delivery" }, { k: "status", label: "Status", type: "badge" }]} searchKeys={["number", "supplier"]} />;
}
export function SuppliersPage() {
    return <ExpCrud collection="procurement_suppliers" title="Suppliers" addLabel="New Supplier"
        fields={[{ k: "name", label: "Supplier Name", required: true }, { k: "category", label: "Category" }, { k: "contactPerson", label: "Contact Person" }, { k: "phone", label: "Phone" }, { k: "email", label: "Email" }, { k: "address", label: "Address" }, { k: "taxPin", label: "Tax PIN" }, { k: "vatNumber", label: "VAT Number" }, { k: "bankDetails", label: "Bank Details" }, { k: "paymentTerms", label: "Payment Terms" }, { k: "products", label: "Products/Services", type: "textarea" }, { k: "rating", label: "Rating (0-5)", type: "number" }, { k: "status", label: "Status", type: "select", options: ["Active", "Inactive"] }]}
        columns={[{ k: "name", label: "Supplier" }, { k: "category", label: "Category" }, { k: "phone", label: "Phone" }, { k: "rating", label: "Rating" }, { k: "status", label: "Status", type: "badge" }]} searchKeys={["name", "phone", "category"]} />;
}
export function QuotationsPage() {
    const suppliers = useSuppliers();
    return <ExpCrud collection="procurement_quotations" title="Quotations (RFQ)" addLabel="New RFQ" numberLabel="RFQ No"
        fields={[{ k: "date", label: "Date", type: "date" }, { k: "supplier", label: "Supplier", type: "select", options: () => suppliers }, { k: "items", label: "Items", type: "textarea" }, { k: "price", label: "Price", type: "money" }, { k: "deliveryTime", label: "Delivery Time" }, { k: "warranty", label: "Warranty" }, { k: "terms", label: "Terms", type: "textarea" }, { k: "status", label: "Status", type: "select", options: ["Requested", "Received", "Selected", "Rejected"] }]}
        columns={[{ k: "supplier", label: "Supplier" }, { k: "price", label: "Price", type: "money" }, { k: "deliveryTime", label: "Delivery" }, { k: "status", label: "Status", type: "badge" }]} searchKeys={["number", "supplier"]} />;
}
export function GrnPage() {
    const suppliers = useSuppliers();
    return <ExpCrud collection="procurement_grn" title="Goods Received (GRN)" addLabel="New GRN" numberLabel="GRN No"
        fields={[{ k: "po", label: "Purchase Order" }, { k: "supplier", label: "Supplier", type: "select", options: () => suppliers }, { k: "deliveryDate", label: "Delivery Date", type: "date" }, { k: "itemName", label: "Item" }, { k: "orderedQuantity", label: "Quantity Ordered", type: "number" }, { k: "receivedQuantity", label: "Quantity Received", type: "number" }, { k: "damagedQuantity", label: "Damaged", type: "number" }, { k: "acceptedQuantity", label: "Accepted", type: "number" }, { k: "receivedBy", label: "Received By" }, { k: "expectedDelivery", label: "Expected Delivery", type: "date" }, { k: "notes", label: "Notes", type: "textarea" }]}
        columns={[{ k: "number", label: "GRN" }, { k: "supplier", label: "Supplier" }, { k: "itemName", label: "Item" }, { k: "acceptedQuantity", label: "Accepted" }, { k: "deliveryDate", label: "Delivered" }]} searchKeys={["number", "supplier", "itemName"]} />;
}
export function ContractsPage() {
    const suppliers = useSuppliers();
    return <ExpCrud collection="procurement_contracts" title="Contracts" addLabel="New Contract" numberLabel="Contract No"
        fields={[{ k: "supplier", label: "Supplier", type: "select", options: () => suppliers, required: true }, { k: "startDate", label: "Start Date", type: "date" }, { k: "endDate", label: "End Date", type: "date" }, { k: "contractValue", label: "Contract Value", type: "money" }, { k: "terms", label: "Terms", type: "textarea" }, { k: "renewalDate", label: "Renewal Date", type: "date" }, { k: "document", label: "Document", type: "file" }]}
        columns={[{ k: "number", label: "Contract" }, { k: "supplier", label: "Supplier" }, { k: "contractValue", label: "Value", type: "money" }, { k: "endDate", label: "Expires" }]} searchKeys={["number", "supplier"]} />;
}
export function TendersPage() {
    return <ExpCrud collection="procurement_tenders" title="Tender Management" addLabel="New Tender" numberLabel="Tender No"
        fields={[{ k: "description", label: "Description", type: "textarea", required: true }, { k: "publicationDate", label: "Publication Date", type: "date" }, { k: "closingDate", label: "Closing Date", type: "date" }, { k: "committee", label: "Evaluation Committee" }, { k: "winningSupplier", label: "Winning Supplier" }, { k: "awardLetter", label: "Award Letter", type: "file" }, { k: "status", label: "Status", type: "select", options: ["Open", "Closed", "Evaluating", "Awarded", "Cancelled"] }]}
        columns={[{ k: "number", label: "Tender" }, { k: "description", label: "Description" }, { k: "closingDate", label: "Closing" }, { k: "status", label: "Status", type: "badge" }]} searchKeys={["number", "description"]} />;
}

// ── Invoice Matching (3-way) ──────────────────────────────────────────────────
export function MatchingPage() {
    const [form, setForm] = useState({ poNumber: "", invoiceNumber: "", invoiceQty: "", invoicePrice: "" });
    const [result, setResult] = useState<any>(null);
    const { data: invoices = [] } = useQuery({ queryKey: ["proc_invoices"], queryFn: proc.invoices });
    const run = async () => { if (!form.poNumber) return toast.error("Enter a PO number"); try { const r = await proc.match(form); setResult(r); if (r.matched) toast.success("Matched — no discrepancies"); else toast.warning(`${r.issues.length} discrepancy(ies)`); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } };
    return (
        <div className="space-y-4 max-w-3xl">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-700 mb-1">Three-Way Match</h3>
                <p className="text-xs text-slate-400 mb-4">Match a supplier invoice against its Purchase Order. Detects quantity/price mismatches and duplicates.</p>
                <div className="grid grid-cols-2 gap-3">
                    {[["poNumber", "PO Number"], ["invoiceNumber", "Invoice Number"], ["invoiceQty", "Invoice Quantity"], ["invoicePrice", "Invoice Unit Price"]].map(([k, l]) => <div key={k}><label className="block text-[11px] font-bold text-slate-600 mb-1">{l}</label><input value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0E7490]" /></div>)}
                </div>
                <button onClick={run} className="mt-4 h-10 px-5 text-white rounded-xl text-sm font-bold" style={{ background: ACCENT }}>Match Invoice</button>
            </div>
            {result && <div className={`rounded-2xl border p-4 ${result.matched ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>{result.matched ? <p className="text-sm font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Matched — PO {result.po.number} ({ksh(result.po.unitPrice)} × {result.po.quantity})</p> : <div><p className="text-sm font-bold text-rose-700 flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> Discrepancies</p>{result.issues.map((i: string) => <p key={i} className="text-xs text-rose-600">• {i}</p>)}</div>}</div>}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase"><th className="text-left px-4 py-3 font-black">Invoice</th><th className="text-left px-4 py-3 font-black">PO</th><th className="text-left px-4 py-3 font-black">Supplier</th><th className="text-left px-4 py-3 font-black">Result</th></tr></thead><tbody>{invoices.map((iv: any) => <tr key={iv._id} className="border-b border-slate-50"><td className="px-4 py-2.5 font-bold text-slate-700">{iv.invoiceNumber}</td><td className="px-4 py-2.5 text-slate-600">{iv.poNumber}</td><td className="px-4 py-2.5 text-slate-600">{iv.supplier}</td><td className="px-4 py-2.5">{iv.matched ? <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Matched</span> : <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{iv.issues?.length} issues</span>}</td></tr>)}{invoices.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-bold uppercase">No invoices matched yet</td></tr>}</tbody></table>
            </div>
        </div>
    );
}

// ── Reports + Settings ────────────────────────────────────────────────────────
const REPORTS = [{ k: "requests", l: "Purchase Requests" }, { k: "pos", l: "Purchase Orders" }, { k: "grn", l: "Goods Received" }, { k: "contracts", l: "Contracts" }];
export function ReportsPage() {
    const [active, setActive] = useState("requests");
    const { data, isLoading } = useQuery({ queryKey: ["proc_report", active], queryFn: () => proc.report(active) });
    const cols = data?.columns || []; const rows = data?.rows || [];
    const csv = () => download(toCSV(cols.map((c: any) => c.label), rows.map((r: any) => cols.map((c: any) => r[c.key] ?? ""))), `${data.title}.csv`);
    const print = () => { const w = window.open("", "_blank"); if (!w) return; const head = cols.map((c: any) => `<th>${c.label}</th>`).join(""); const body = rows.map((r: any) => `<tr>${cols.map((c: any) => `<td>${c.type === "money" ? ksh(r[c.key]) : (r[c.key] ?? "")}</td>`).join("")}</tr>`).join(""); w.document.write(`<!DOCTYPE html><html><head><title>${data.title}</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Arial}table{width:100%;border-collapse:collapse}th{background:${ACCENT};color:#fff;padding:8px;text-align:left}td{padding:7px;border-bottom:1px solid #eee;font-size:12px}</style></head><body><h2>${data.title}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><script>onload=()=>print()</script></body></html>`); w.document.close(); };
    return (
        <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">{REPORTS.map(r => <button key={r.k} onClick={() => setActive(r.k)} className={`h-9 px-4 rounded-lg text-sm font-bold ${active === r.k ? "text-white" : "bg-white border border-slate-200 text-slate-600"}`} style={active === r.k ? { background: ACCENT } : {}}>{r.l}</button>)}</div>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#0E7490]" /> : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100"><h3 className="font-black text-slate-800">{data?.title} · {rows.length}</h3><div className="flex gap-2"><button onClick={csv} className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> CSV</button><button onClick={print} className="h-9 px-3 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: ACCENT }}><Printer className="w-3.5 h-3.5" /> Print</button></div></div>
                    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">{cols.map((c: any) => <th key={c.key} className="text-left px-4 py-3 font-black">{c.label}</th>)}</tr></thead><tbody>{rows.map((r: any, i: number) => <tr key={i} className="border-b border-slate-50">{cols.map((c: any) => <td key={c.key} className="px-4 py-2.5 text-slate-600">{c.type === "money" ? ksh(r[c.key]) : (r[c.key] ?? "—")}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={cols.length} className="py-10 text-center text-slate-400 text-xs font-bold uppercase">No data</td></tr>}</tbody></table></div>
                </div>
            )}
        </div>
    );
}
export function SettingsPage() {
    const { data, isLoading } = useQuery({ queryKey: ["proc_settings"], queryFn: proc.settings });
    const [form, setForm] = useState<any>({}); const [saving, setSaving] = useState(false);
    if (!isLoading && Object.keys(form).length === 0 && data) setForm(data);
    const save = async () => { setSaving(true); try { await proc.setSettings(form); toast.success("Saved"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); } };
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#0E7490]" />;
    return (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            {[["approvalLevels", "Approval Workflow"], ["categories", "Categories"]].map(([k, l]) => <div key={k}><label className="block text-[11px] font-bold text-slate-600 mb-1">{l} (comma-separated)</label><input value={(form[k] || []).join(", ")} onChange={e => setForm((f: any) => ({ ...f, [k]: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>)}
            <button onClick={save} disabled={saving} className="h-10 px-5 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings</button>
        </div>
    );
}
