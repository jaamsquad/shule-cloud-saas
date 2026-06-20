import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Save, Check, X, Printer, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ExpCrud, { Fld, Col } from "./ExpCrud";
import { exp, ksh, toCSV, download } from "./expenseApi";
import { useSchoolBrand, printBranded } from "@/lib/printDoc";

const ACCENT = "#B45309";
const APPROVAL = ["Draft", "Submitted", "Pending", "Approved", "Rejected"];
const PAYSTATUS = ["Unpaid", "Partial", "Paid"];
const useCats = () => { const { data = [] } = useQuery({ queryKey: ["exp", "expense_categories"], queryFn: () => exp.list("expense_categories") }); return data.map((c: any) => c.name).filter(Boolean); };
const useSuppliers = () => { const { data = [] } = useQuery({ queryKey: ["exp", "procurement_suppliers"], queryFn: () => exp.list("procurement_suppliers") }); return data.map((s: any) => s.name).filter(Boolean); };
const useMethods = () => { const { data } = useQuery({ queryKey: ["exp_settings"], queryFn: exp.settings }); return data?.paymentMethods || ["Cash", "Bank Transfer", "Cheque", "Mobile Money", "EFT"]; };

// ── Expenses ──────────────────────────────────────────────────────────────────
export function ExpensesPage() {
    const cats = useCats(); const suppliers = useSuppliers(); const methods = useMethods();
    const fields: Fld[] = [
        { k: "date", label: "Date", type: "date", required: true },
        { k: "category", label: "Category", type: "select", options: () => cats, required: true },
        { k: "department", label: "Department" },
        { k: "supplier", label: "Supplier", type: "select", options: () => suppliers },
        { k: "description", label: "Description", type: "textarea" },
        { k: "invoiceNumber", label: "Invoice No" }, { k: "receiptNumber", label: "Receipt No" },
        { k: "amount", label: "Amount", type: "money", required: true }, { k: "vat", label: "VAT", type: "money" },
        { k: "discount", label: "Discount", type: "money" }, { k: "totalAmount", label: "Total Amount", type: "money", required: true },
        { k: "paymentMethod", label: "Payment Method", type: "select", options: () => methods },
        { k: "paymentStatus", label: "Payment Status", type: "select", options: PAYSTATUS },
        { k: "approvalStatus", label: "Approval Status", type: "select", options: APPROVAL },
        { k: "expenseAccount", label: "Expense Account" }, { k: "costCentre", label: "Cost Centre" }, { k: "budgetCode", label: "Budget Code" },
        { k: "attachment", label: "Attachment", type: "file" }, { k: "notes", label: "Notes", type: "textarea" },
    ];
    const columns: Col[] = [{ k: "date", label: "Date" }, { k: "category", label: "Category" }, { k: "supplier", label: "Supplier" }, { k: "totalAmount", label: "Amount", type: "money" }, { k: "paymentStatus", label: "Payment", type: "badge" }, { k: "approvalStatus", label: "Approval", type: "badge" }];
    return <ExpCrud collection="expenses" title="Expenses" addLabel="Record Expense" numberLabel="Expense No" totalKey="totalAmount" fields={fields} columns={columns} searchKeys={["number", "supplier", "invoiceNumber", "receiptNumber", "description"]} printable />;
}

export function CategoriesPage() {
    const qc = useQueryClient();
    const seed = async () => { const r = await exp.seedCategories(); toast.success(`${r.count || 0} categories ready`); qc.invalidateQueries({ queryKey: ["exp", "expense_categories"] }); };
    return (
        <div className="space-y-3">
            <button onClick={seed} className="h-9 px-4 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-[#B45309]">Load default categories</button>
            <ExpCrud collection="expense_categories" title="Expense Categories" addLabel="New Category"
                fields={[{ k: "name", label: "Category Name", required: true }, { k: "description", label: "Description", type: "textarea" }, { k: "department", label: "Department" }, { k: "budgetLimit", label: "Budget Limit", type: "money" }, { k: "active", label: "Status", type: "select", options: ["Active", "Inactive"] }]}
                columns={[{ k: "name", label: "Category" }, { k: "department", label: "Department" }, { k: "budgetLimit", label: "Budget Limit", type: "money" }, { k: "active", label: "Status", type: "badge" }]} />
        </div>
    );
}

export function SuppliersPage() {
    return <ExpCrud collection="procurement_suppliers" title="Suppliers" addLabel="New Supplier"
        fields={[{ k: "name", label: "Supplier Name", required: true }, { k: "contactPerson", label: "Contact Person" }, { k: "phone", label: "Phone" }, { k: "email", label: "Email" }, { k: "address", label: "Address" }, { k: "taxPin", label: "Tax PIN" }, { k: "vatNumber", label: "VAT Number" }, { k: "bankDetails", label: "Bank Details" }, { k: "paymentTerms", label: "Payment Terms" }, { k: "category", label: "Category" }, { k: "products", label: "Products/Services", type: "textarea" }, { k: "status", label: "Status", type: "select", options: ["Active", "Inactive"] }]}
        columns={[{ k: "name", label: "Supplier" }, { k: "contactPerson", label: "Contact" }, { k: "phone", label: "Phone" }, { k: "category", label: "Category" }, { k: "status", label: "Status", type: "badge" }]} searchKeys={["name", "phone", "email", "category"]} />;
}

export function RequestsPage() {
    return <ExpCrud collection="procurement_pr" title="Purchase Requests" addLabel="New Request" numberLabel="Request No"
        fields={[{ k: "date", label: "Date", type: "date" }, { k: "department", label: "Department", required: true }, { k: "requestedBy", label: "Requested By" }, { k: "items", label: "Items Requested", type: "textarea" }, { k: "quantity", label: "Quantity", type: "number" }, { k: "estimatedCost", label: "Estimated Cost", type: "money" }, { k: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] }, { k: "justification", label: "Justification", type: "textarea" }, { k: "status", label: "Status", type: "select", options: ["Draft", "Submitted", "Approved", "Purchase Order", "Received", "Expense Recorded"] }, { k: "attachment", label: "Attachment", type: "file" }]}
        columns={[{ k: "date", label: "Date" }, { k: "department", label: "Department" }, { k: "estimatedCost", label: "Est. Cost", type: "money" }, { k: "priority", label: "Priority", type: "badge" }, { k: "status", label: "Status", type: "badge" }]} />;
}

export function OrdersPage() {
    const suppliers = useSuppliers();
    return <ExpCrud collection="procurement_po" title="Purchase Orders" addLabel="New PO" numberLabel="PO No" printable
        fields={[{ k: "date", label: "Date", type: "date" }, { k: "supplier", label: "Supplier", type: "select", options: () => suppliers, required: true }, { k: "department", label: "Department" }, { k: "deliveryAddress", label: "Delivery Address" }, { k: "items", label: "Items", type: "textarea" }, { k: "quantity", label: "Quantity", type: "number" }, { k: "unitPrice", label: "Unit Price", type: "money" }, { k: "totalCost", label: "Total Cost", type: "money" }, { k: "expectedDelivery", label: "Expected Delivery", type: "date" }, { k: "status", label: "Status", type: "select", options: ["Draft", "Sent", "Delivered", "Cancelled"] }]}
        columns={[{ k: "date", label: "Date" }, { k: "supplier", label: "Supplier" }, { k: "totalCost", label: "Total", type: "money" }, { k: "expectedDelivery", label: "Delivery" }, { k: "status", label: "Status", type: "badge" }]} searchKeys={["number", "supplier"]} totalKey="totalCost" />;
}

export function PaymentsPage() {
    const suppliers = useSuppliers(); const methods = useMethods();
    return <ExpCrud collection="expense_payments" title="Payments" addLabel="Record Payment" numberLabel="Payment No" totalKey="amount"
        fields={[{ k: "date", label: "Payment Date", type: "date", required: true }, { k: "supplier", label: "Supplier", type: "select", options: () => suppliers }, { k: "amount", label: "Amount", type: "money", required: true }, { k: "paymentMethod", label: "Payment Method", type: "select", options: () => methods }, { k: "chequeNumber", label: "Cheque Number" }, { k: "bank", label: "Bank" }, { k: "reference", label: "Transaction Reference" }, { k: "paidBy", label: "Paid By" }, { k: "status", label: "Status", type: "select", options: PAYSTATUS }]}
        columns={[{ k: "date", label: "Date" }, { k: "supplier", label: "Supplier" }, { k: "amount", label: "Amount", type: "money" }, { k: "paymentMethod", label: "Method", type: "badge" }, { k: "status", label: "Status", type: "badge" }]} searchKeys={["number", "supplier", "reference"]} />;
}

export function RecurringPage() {
    const cats = useCats();
    return <ExpCrud collection="recurring_expenses" title="Recurring Expenses" addLabel="New Recurring"
        fields={[{ k: "name", label: "Name", required: true }, { k: "category", label: "Category", type: "select", options: () => cats }, { k: "amount", label: "Amount", type: "money", required: true }, { k: "frequency", label: "Frequency", type: "select", options: ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"] }, { k: "nextDue", label: "Next Due", type: "date" }, { k: "supplier", label: "Supplier" }, { k: "status", label: "Status", type: "select", options: ["Active", "Paused"] }]}
        columns={[{ k: "name", label: "Name" }, { k: "category", label: "Category" }, { k: "amount", label: "Amount", type: "money" }, { k: "frequency", label: "Frequency", type: "badge" }, { k: "nextDue", label: "Next Due" }, { k: "status", label: "Status", type: "badge" }]} />;
}

// ── Budget Control ────────────────────────────────────────────────────────────
export function BudgetsPage() {
    const { data: control = [], isLoading } = useQuery({ queryKey: ["exp_budget_control"], queryFn: exp.budgetControl });
    return (
        <div className="space-y-4">
            <ExpCrud collection="budgets" title="Budgets" addLabel="New Budget"
                fields={[{ k: "name", label: "Budget Name", required: true }, { k: "category", label: "Category" }, { k: "department", label: "Department" }, { k: "project", label: "Project" }, { k: "campus", label: "Campus" }, { k: "amount", label: "Allocated Amount", type: "money", required: true }, { k: "year", label: "Year/Term" }, { k: "code", label: "Budget Code" }]}
                columns={[{ k: "name", label: "Budget" }, { k: "amount", label: "Allocated", type: "money" }, { k: "year", label: "Period" }]} />
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-black text-slate-700 mb-3">Budget vs Actual</h3>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#B45309]" /> : control.length === 0 ? <p className="text-xs text-slate-400">No budgets yet.</p> : control.map((b: any) => (
                    <div key={b._id} className="mb-3">
                        <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-700">{b.name} <span className="text-slate-300">({b.scope})</span></span><span className={b.percent > 100 ? "text-rose-600" : "text-slate-500"}>{ksh(b.spent)} / {ksh(b.allocated)} · {b.percent}%</span></div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${b.percent > 100 ? "bg-rose-500" : b.percent > 90 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(b.percent, 100)}%` }} /></div>
                        {b.percent > 90 && <p className="text-[10px] text-amber-600 font-bold mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {b.percent > 100 ? "Over budget" : "Nearing limit"}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Approvals ─────────────────────────────────────────────────────────────────
export function ApprovalsPage() {
    const qc = useQueryClient();
    const { data: rows = [], isLoading } = useQuery({ queryKey: ["exp_approvals"], queryFn: exp.approvals });
    const act = async (id: string, decision: string) => { const comment = decision === "reject" ? prompt("Reason for rejection?") || "" : ""; await exp.approve(id, decision, comment); toast.success(decision === "reject" ? "Rejected" : "Approved"); qc.invalidateQueries({ queryKey: ["exp_approvals"] }); qc.invalidateQueries({ queryKey: ["exp_stats"] }); };
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#B45309]" /></div>;
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase"><th className="text-left px-4 py-3 font-black">Expense No</th><th className="text-left px-4 py-3 font-black">Category</th><th className="text-left px-4 py-3 font-black">Supplier</th><th className="text-left px-4 py-3 font-black">Amount</th><th className="text-left px-4 py-3 font-black">Status</th><th className="px-4 py-3" /></tr></thead>
                <tbody>
                    {rows.map((r: any) => (
                        <tr key={r._id} className="border-b border-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-700">{r.number}</td><td className="px-4 py-3 text-slate-600">{r.category}</td><td className="px-4 py-3 text-slate-600">{r.supplier || "—"}</td><td className="px-4 py-3 font-bold">{ksh(r.totalAmount)}</td>
                            <td className="px-4 py-3"><span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{r.approvalStatus}</span></td>
                            <td className="px-4 py-3 text-right"><div className="flex gap-1.5 justify-end"><button onClick={() => act(r._id, "approve")} className="h-8 px-3 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Approve</button><button onClick={() => act(r._id, "reject")} className="h-8 px-3 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Reject</button></div></td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">Nothing awaiting approval</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

// ── Reports ───────────────────────────────────────────────────────────────────
const REPORTS = [{ k: "summary", l: "Expense Summary" }, { k: "by-category", l: "By Category" }, { k: "by-department", l: "By Department" }, { k: "supplier-payments", l: "Supplier Payments" }];
export function ReportsPage() {
    const [active, setActive] = useState("summary");
    const school = useSchoolBrand();
    const { data, isLoading } = useQuery({ queryKey: ["exp_report", active], queryFn: () => exp.report(active) });
    const cols = data?.columns || []; const rows = data?.rows || [];
    const csv = () => download(toCSV(cols.map((c: any) => c.label), rows.map((r: any) => cols.map((c: any) => r[c.key] ?? ""))), `${data.title}.csv`);
    const excel = async () => { const { utils, writeFile } = await import("xlsx"); const ws = utils.aoa_to_sheet([cols.map((c: any) => c.label), ...rows.map((r: any) => cols.map((c: any) => r[c.key] ?? ""))]); const wb = utils.book_new(); utils.book_append_sheet(wb, ws, "Report"); writeFile(wb, `${data.title}.xlsx`); };
    const print = () => { const head = cols.map((c: any) => `<th>${c.label}</th>`).join(""); const body = rows.map((r: any) => `<tr>${cols.map((c: any) => `<td>${c.type === "money" ? ksh(r[c.key]) : (r[c.key] ?? "")}</td>`).join("")}</tr>`).join(""); printBranded(school, data.title, `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`, ACCENT); };
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">{REPORTS.map(r => <button key={r.k} onClick={() => setActive(r.k)} className={`h-9 px-4 rounded-lg text-sm font-bold ${active === r.k ? "text-white" : "bg-white border border-slate-200 text-slate-600"}`} style={active === r.k ? { background: ACCENT } : {}}>{r.l}</button>)}</div>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#B45309]" /> : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100"><h3 className="font-black text-slate-800">{data?.title} · {rows.length}</h3><div className="flex gap-2"><button onClick={csv} className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> CSV</button><button onClick={excel} className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">Excel</button><button onClick={print} className="h-9 px-3 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: ACCENT }}><Printer className="w-3.5 h-3.5" /> Print</button></div></div>
                    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">{cols.map((c: any) => <th key={c.key} className="text-left px-4 py-3 font-black">{c.label}</th>)}</tr></thead><tbody>{rows.map((r: any, i: number) => <tr key={i} className="border-b border-slate-50">{cols.map((c: any) => <td key={c.key} className="px-4 py-2.5 text-slate-600">{c.type === "money" ? ksh(r[c.key]) : (r[c.key] ?? "—")}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={cols.length} className="py-10 text-center text-slate-400 text-xs font-bold uppercase">No data</td></tr>}</tbody></table></div>
                </div>
            )}
        </div>
    );
}

// ── Settings ──────────────────────────────────────────────────────────────────
export function SettingsPage() {
    const { data, isLoading } = useQuery({ queryKey: ["exp_settings"], queryFn: exp.settings });
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    if (!isLoading && Object.keys(form).length === 0 && data) setForm(data);
    const setList = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v.split(",").map(s => s.trim()).filter(Boolean) }));
    const save = async () => { setSaving(true); try { await exp.setSettings(form); toast.success("Saved"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); } };
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#B45309]" />;
    return (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Tax Rate (%)</label><input type="number" value={form.taxRate ?? ""} onChange={e => setForm((f: any) => ({ ...f, taxRate: Number(e.target.value) }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Currency</label><input value={form.currency ?? ""} onChange={e => setForm((f: any) => ({ ...f, currency: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Financial Year</label><input value={form.financialYear ?? ""} onChange={e => setForm((f: any) => ({ ...f, financialYear: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>
            </div>
            {[["paymentMethods", "Payment Methods"], ["costCentres", "Cost Centres"]].map(([k, l]) => (
                <div key={k}><label className="block text-[11px] font-bold text-slate-600 mb-1">{l} (comma-separated)</label><input value={(form[k] || []).join(", ")} onChange={e => setList(k, e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>
            ))}
            <button onClick={save} disabled={saving} className="h-10 px-5 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings</button>
        </div>
    );
}
