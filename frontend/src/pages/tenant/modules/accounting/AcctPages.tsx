import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Plus, Trash2, X, CheckCircle2, Download, Printer, AlertTriangle } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { acct, ksh, toCSV, download, printStatement } from "./acctApi";

const ACCENT = "#047857";
const COLORS = ["#047857", "#1D4ED8", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];
const toData = (o: Record<string, number> = {}) => Object.entries(o).map(([name, value]) => ({ name, value: Math.abs(Math.round(value)) }));
const useAccounts = () => { const { data = [] } = useQuery({ queryKey: ["acct", "accounting_accounts"], queryFn: () => acct.list("accounting_accounts") }); return data; };

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function AcctDashboard() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ["acct_stats"], queryFn: acct.stats });
    const seed = async () => { await acct.seed(); toast.success("Chart of accounts loaded"); qc.invalidateQueries(); };
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#047857]" /></div>;
    const c = data?.cards || {}; const ch = data?.charts || {};
    const cards = [["Total Assets", c.totalAssets], ["Total Liabilities", c.totalLiabilities], ["Total Equity", c.totalEquity], ["Total Income", c.totalIncome], ["Total Expenses", c.totalExpenses], ["Net Profit/Loss", c.netProfit], ["Accounts Receivable", c.accountsReceivable], ["Accounts Payable", c.accountsPayable], ["Cash Balance", c.cashBalance]];
    return (
        <div className="space-y-6">
            <div className="flex justify-end"><button onClick={seed} className="h-9 px-4 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-[#047857]">Load default chart of accounts</button></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {cards.map(([l, v]) => <div key={l as string} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><div className="text-lg font-black text-slate-800">{ksh(v)}</div><div className="text-[11px] text-slate-400 font-bold">{l as string}</div></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Income vs Expenses"><ResponsiveContainer width="100%" height={240}><BarChart data={toData(ch.incomeVsExpense)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: any) => ksh(v)} /><Bar dataKey="value" fill={ACCENT} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
                <Card title="Revenue Breakdown"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={toData(ch.revenueBreakdown)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.revenueBreakdown).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip formatter={(v: any) => ksh(v)} /></PieChart></ResponsiveContainer></Card>
                <Card title="Expense Breakdown"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={toData(ch.expenseBreakdown)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(ch.expenseBreakdown).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip formatter={(v: any) => ksh(v)} /></PieChart></ResponsiveContainer></Card>
            </div>
        </div>
    );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 className="text-sm font-black text-slate-700 mb-3">{title}</h3>{children}</div>; }

// ── Generic CRUD (chart of accounts, budgets, periods, reconciliation) ─────────
export function CrudPage({ collection, title, addLabel, fields, columns }: { collection: string; title: string; addLabel: string; fields: { k: string; label: string; type?: string; options?: string[] | (() => string[]) }[]; columns: { k: string; label: string; type?: string }[] }) {
    const qc = useQueryClient();
    const { data: rows = [], isLoading } = useQuery({ queryKey: ["acct", collection], queryFn: () => acct.list(collection) });
    const [open, setOpen] = useState(false); const [editId, setEditId] = useState<string | null>(null); const [form, setForm] = useState<Record<string, any>>({}); const [saving, setSaving] = useState(false);
    const opts = (f: any) => (typeof f.options === "function" ? f.options() : f.options) || [];
    const save = async () => { setSaving(true); try { if (editId) await acct.update(collection, editId, form); else await acct.add(collection, form); toast.success(editId ? "Updated" : "Saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["acct", collection] }); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); } };
    const del = async (id: string) => { if (!confirm("Delete?")) return; try { await acct.remove(collection, id); qc.invalidateQueries({ queryKey: ["acct", collection] }); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } };
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-base font-black text-slate-800">{title} <span className="text-slate-300">· {rows.length}</span></h2><button onClick={() => { setEditId(null); setForm({}); setOpen(true); }} className="h-10 px-4 text-white rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: ACCENT }}><Plus className="w-4 h-4" /> {addLabel}</button></div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                {isLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#047857]" /></div> : (
                    <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">{columns.map(c => <th key={c.k} className="text-left px-4 py-3 font-black">{c.label}</th>)}<th className="px-4 py-3" /></tr></thead>
                        <tbody>{rows.map((r: any) => <tr key={r._id} className="border-b border-slate-50"><>{columns.map(c => <td key={c.k} className="px-4 py-3 text-slate-600">{c.type === "money" ? ksh(r[c.k]) : (r[c.k] ?? "—")}</td>)}</><td className="px-4 py-3 text-right"><div className="flex gap-1 justify-end"><button onClick={() => { setEditId(r._id); setForm({ ...r }); setOpen(true); }} className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:text-[#047857] flex items-center justify-center text-xs">✎</button><button onClick={() => del(r._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button></div></td></tr>)}{rows.length === 0 && <tr><td colSpan={columns.length + 1} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">No records</td></tr>}</tbody>
                    </table>
                )}
            </div>
            {open && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} /><div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-800">{editId ? "Edit" : addLabel}</h2><button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button></div><div className="grid grid-cols-2 gap-3">{fields.map(f => <div key={f.k}><label className="block text-[11px] font-bold text-slate-600 mb-1">{f.label}</label>{f.type === "select" ? <select value={form[f.k] ?? ""} onChange={e => setForm(s => ({ ...s, [f.k]: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"><option value="">Select…</option>{opts(f).map((o: string) => <option key={o}>{o}</option>)}</select> : <input type={f.type === "number" || f.type === "money" ? "number" : f.type === "date" ? "date" : "text"} value={form[f.k] ?? ""} onChange={e => setForm(s => ({ ...s, [f.k]: (f.type === "number" || f.type === "money") ? Number(e.target.value) : e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#047857]" />}</div>)}</div><div className="flex gap-2 mt-5"><button onClick={() => setOpen(false)} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Cancel</button><button onClick={save} disabled={saving} className="flex-1 h-10 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button></div></div></div>}
        </div>
    );
}
export const CoaPage = () => <CrudPage collection="accounting_accounts" title="Chart of Accounts" addLabel="New Account" fields={[{ k: "code", label: "Account Code" }, { k: "name", label: "Account Name" }, { k: "type", label: "Type", type: "select", options: ["Asset", "Liability", "Equity", "Income", "Expense"] }, { k: "parent", label: "Parent Account" }, { k: "openingBalance", label: "Opening Balance", type: "money" }, { k: "status", label: "Status", type: "select", options: ["Active", "Inactive"] }]} columns={[{ k: "code", label: "Code" }, { k: "name", label: "Account" }, { k: "type", label: "Type" }, { k: "openingBalance", label: "Opening", type: "money" }, { k: "status", label: "Status" }]} />;
export const BudgetingPage = () => <CrudPage collection="accounting_budgets" title="Budgeting" addLabel="New Budget" fields={[{ k: "name", label: "Name" }, { k: "account", label: "Account" }, { k: "department", label: "Department" }, { k: "year", label: "Year/Term" }, { k: "amount", label: "Allocated", type: "money" }]} columns={[{ k: "name", label: "Budget" }, { k: "account", label: "Account" }, { k: "amount", label: "Allocated", type: "money" }, { k: "year", label: "Period" }]} />;
export const PeriodsPage = () => <CrudPage collection="accounting_periods" title="Fiscal Periods" addLabel="New Period" fields={[{ k: "name", label: "Period Name" }, { k: "startDate", label: "Start", type: "date" }, { k: "endDate", label: "End", type: "date" }, { k: "status", label: "Status", type: "select", options: ["Open", "Closed", "Locked"] }]} columns={[{ k: "name", label: "Period" }, { k: "startDate", label: "Start" }, { k: "endDate", label: "End" }, { k: "status", label: "Status" }]} />;
export const ReconciliationPage = () => <CrudPage collection="accounting_reconciliation" title="Bank Reconciliation" addLabel="New Entry" fields={[{ k: "date", label: "Date", type: "date" }, { k: "description", label: "Description" }, { k: "amount", label: "Amount", type: "money" }, { k: "bankRef", label: "Bank Reference" }, { k: "status", label: "Status", type: "select", options: ["Unmatched", "Matched", "Reconciled"] }]} columns={[{ k: "date", label: "Date" }, { k: "description", label: "Description" }, { k: "amount", label: "Amount", type: "money" }, { k: "status", label: "Status" }]} />;

// ── Journal Entries (balanced double-entry) ───────────────────────────────────
export function JournalsPage() {
    const qc = useQueryClient(); const accounts = useAccounts();
    const { data: journals = [], isLoading } = useQuery({ queryKey: ["acct", "accounting_journals"], queryFn: () => acct.list("accounting_journals") });
    const [open, setOpen] = useState(false);
    const [head, setHead] = useState({ date: "", description: "", reference: "" });
    const [lines, setLines] = useState<any[]>([{ account: "", type: "debit", amount: 0 }, { account: "", type: "credit", amount: 0 }]);
    const [saving, setSaving] = useState(false);
    const debit = lines.filter(l => l.type === "debit").reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const credit = lines.filter(l => l.type === "credit").reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const balanced = Math.round(debit * 100) === Math.round(credit * 100) && debit > 0;

    const save = async (post: boolean) => {
        if (post && !balanced) return toast.error("Debits must equal credits to post");
        setSaving(true);
        try { await acct.add("accounting_journals", { ...head, lines, status: post ? "posted" : "draft" }); toast.success(post ? "Posted" : "Saved as draft"); setOpen(false); setLines([{ account: "", type: "debit", amount: 0 }, { account: "", type: "credit", amount: 0 }]); setHead({ date: "", description: "", reference: "" }); qc.invalidateQueries({ queryKey: ["acct", "accounting_journals"] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); }
    };
    const post = async (id: string) => { try { await acct.postJournal(id); toast.success("Posted"); qc.invalidateQueries({ queryKey: ["acct", "accounting_journals"] }); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-base font-black text-slate-800">Journal Entries <span className="text-slate-300">· {journals.length}</span></h2><button onClick={() => setOpen(true)} className="h-10 px-4 text-white rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: ACCENT }}><Plus className="w-4 h-4" /> New Journal</button></div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                {isLoading ? <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#047857]" /></div> : (
                    <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase"><th className="text-left px-4 py-3 font-black">JV No</th><th className="text-left px-4 py-3 font-black">Date</th><th className="text-left px-4 py-3 font-black">Description</th><th className="text-left px-4 py-3 font-black">Amount</th><th className="text-left px-4 py-3 font-black">Source</th><th className="text-left px-4 py-3 font-black">Status</th><th className="px-4 py-3" /></tr></thead>
                        <tbody>{journals.map((j: any) => <tr key={j._id} className="border-b border-slate-50"><td className="px-4 py-3 font-bold text-slate-700">{j.number}</td><td className="px-4 py-3 text-slate-500">{j.date ? new Date(j.date).toLocaleDateString("en-GB") : "—"}</td><td className="px-4 py-3 text-slate-600">{j.description}</td><td className="px-4 py-3 font-bold">{ksh(j.debitTotal)}</td><td className="px-4 py-3"><span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{j.source}</span></td><td className="px-4 py-3"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${j.status === "posted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{j.status}</span></td><td className="px-4 py-3 text-right">{j.status !== "posted" && <button onClick={() => post(j._id)} className="h-7 px-2 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700">Post</button>}</td></tr>)}{journals.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">No journal entries</td></tr>}</tbody>
                    </table>
                )}
            </div>
            {open && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} /><div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-800">New Journal Entry</h2><button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-500" /></button></div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label><input type="date" value={head.date} onChange={e => setHead(h => ({ ...h, date: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>
                    <div className="col-span-2"><label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label><input value={head.description} onChange={e => setHead(h => ({ ...h, description: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div>
                </div>
                <div className="space-y-2">
                    {lines.map((l, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                            <select value={l.account} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, account: e.target.value } : x))} className="col-span-5 h-9 px-2 border border-slate-200 rounded-lg text-xs bg-white"><option value="">Account…</option>{accounts.map((a: any) => <option key={a._id} value={a.name}>{a.name}</option>)}</select>
                            <select value={l.type} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} className="col-span-3 h-9 px-2 border border-slate-200 rounded-lg text-xs bg-white"><option value="debit">Debit</option><option value="credit">Credit</option></select>
                            <input type="number" value={l.amount} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} className="col-span-3 h-9 px-2 border border-slate-200 rounded-lg text-xs" placeholder="Amount" />
                            <button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="col-span-1 text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    ))}
                    <button onClick={() => setLines(ls => [...ls, { account: "", type: "debit", amount: 0 }])} className="text-xs font-bold text-[#047857]">+ Add line</button>
                </div>
                <div className={`mt-3 text-xs font-bold flex items-center gap-2 ${balanced ? "text-emerald-600" : "text-rose-600"}`}>{balanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} Debit {ksh(debit)} · Credit {ksh(credit)} {balanced ? "· Balanced" : "· Unbalanced"}</div>
                <div className="flex gap-2 mt-5"><button onClick={() => setOpen(false)} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Cancel</button><button onClick={() => save(false)} disabled={saving} className="flex-1 h-10 border border-slate-300 rounded-xl text-sm font-bold text-slate-700">Save Draft</button><button onClick={() => save(true)} disabled={saving || !balanced} className="flex-1 h-10 text-white rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: ACCENT }}>Post Entry</button></div>
            </div></div>}
        </div>
    );
}

// ── Statement pages (generic table view + print) ──────────────────────────────
function StatementTable({ title, cols, rows, footer }: { title: string; cols: { k: string; label: string; money?: boolean }[]; rows: any[]; footer?: React.ReactNode }) {
    const csv = () => download(toCSV(cols.map(c => c.label), rows.map(r => cols.map(c => r[c.k] ?? ""))), `${title}.csv`);
    const print = () => printStatement(title, `<table><thead><tr>${cols.map(c => `<th>${c.label}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${c.money ? ksh(r[c.k]) : (r[c.k] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-100"><h3 className="font-black text-slate-800">{title}</h3><div className="flex gap-2"><button onClick={csv} className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> CSV</button><button onClick={print} className="h-9 px-3 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: ACCENT }}><Printer className="w-3.5 h-3.5" /> Print</button></div></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">{cols.map(c => <th key={c.k} className="text-left px-4 py-3 font-black">{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-b border-slate-50">{cols.map(c => <td key={c.k} className="px-4 py-2.5 text-slate-600">{c.money ? ksh(r[c.k]) : (r[c.k] ?? "—")}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={cols.length} className="py-10 text-center text-slate-400 text-xs font-bold uppercase">No data</td></tr>}</tbody>{footer}</table></div>
        </div>
    );
}

export function LedgerPage() {
    const accounts = useAccounts(); const [account, setAccount] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["acct_ledger", account], queryFn: () => acct.ledger(account || undefined) });
    return <div className="space-y-4"><select value={account} onChange={e => setAccount(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"><option value="">All accounts</option>{accounts.map((a: any) => <option key={a._id} value={a.name}>{a.name}</option>)}</select>{isLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#047857]" /> : <StatementTable title="General Ledger" cols={[{ k: "date", label: "Date" }, { k: "account", label: "Account" }, { k: "description", label: "Description" }, { k: "reference", label: "Ref" }, { k: "debit", label: "Debit", money: true }, { k: "credit", label: "Credit", money: true }, { k: "balance", label: "Balance", money: true }]} rows={(data?.rows || []).map((r: any) => ({ ...r, date: r.date ? new Date(r.date).toLocaleDateString("en-GB") : "" }))} />}</div>;
}
export function TrialBalancePage() {
    const { data, isLoading } = useQuery({ queryKey: ["acct_tb"], queryFn: acct.trialBalance });
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#047857]" />;
    return <div className="space-y-3">{!data?.balanced && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-bold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Trial balance does not balance (debits ≠ credits)</div>}<StatementTable title="Trial Balance" cols={[{ k: "code", label: "Code" }, { k: "account", label: "Account" }, { k: "debit", label: "Debit", money: true }, { k: "credit", label: "Credit", money: true }]} rows={data?.rows || []} footer={<tfoot><tr className="border-t-2 border-[#047857] font-black"><td colSpan={2} className="px-4 py-3 text-right">Total</td><td className="px-4 py-3">{ksh(data?.totalDebit)}</td><td className="px-4 py-3">{ksh(data?.totalCredit)}</td></tr></tfoot>} /></div>;
}
export function IncomeStatementPage() {
    const { data, isLoading } = useQuery({ queryKey: ["acct_is"], queryFn: acct.incomeStatement });
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#047857]" />;
    const rows = [...(data?.income || []).map((r: any) => ({ section: "Income", ...r })), { section: "", account: "Total Income", amount: data?.totalIncome }, ...(data?.expenses || []).map((r: any) => ({ section: "Expense", ...r })), { section: "", account: "Total Expenses", amount: data?.totalExpense }, { section: "", account: "NET PROFIT / (LOSS)", amount: data?.netProfit }];
    return <StatementTable title="Income Statement (Profit & Loss)" cols={[{ k: "section", label: "Section" }, { k: "account", label: "Account" }, { k: "amount", label: "Amount", money: true }]} rows={rows} />;
}
export function BalanceSheetPage() {
    const { data, isLoading } = useQuery({ queryKey: ["acct_bs"], queryFn: acct.balanceSheet });
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#047857]" />;
    const rows = [...(data?.assets || []).map((r: any) => ({ section: "Assets", ...r })), { section: "", account: "Total Assets", amount: data?.totalAssets }, ...(data?.liabilities || []).map((r: any) => ({ section: "Liabilities", ...r })), ...(data?.equity || []).map((r: any) => ({ section: "Equity", ...r })), { section: "", account: "Total Liabilities + Equity", amount: (data?.totalLiabilities || 0) + (data?.totalEquity || 0) }];
    return <div className="space-y-3">{!data?.balanced && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-bold text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Assets ≠ Liabilities + Equity (post all journals)</div>}<StatementTable title="Balance Sheet" cols={[{ k: "section", label: "Section" }, { k: "account", label: "Account" }, { k: "amount", label: "Amount", money: true }]} rows={rows} /></div>;
}
export function CashFlowPage() {
    const { data, isLoading } = useQuery({ queryKey: ["acct_cf"], queryFn: acct.cashFlow });
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#047857]" />;
    const rows = [{ activity: "Operating Activities", amount: data?.operating }, { activity: "Investing Activities", amount: data?.investing }, { activity: "Financing Activities", amount: data?.financing }, { activity: "Opening Balance", amount: data?.openingBalance }, { activity: "Closing Balance", amount: data?.closingBalance }];
    return <StatementTable title="Cash Flow Statement" cols={[{ k: "activity", label: "Activity" }, { k: "amount", label: "Amount", money: true }]} rows={rows} />;
}
export function ReceivablesPage() {
    const { data, isLoading } = useQuery({ queryKey: ["acct_ar"], queryFn: acct.receivables });
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#047857]" />;
    return <div className="space-y-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(data?.aging || {}).map(([b, v]) => <div key={b} className="bg-white rounded-xl border border-slate-100 p-3"><div className="text-lg font-black text-slate-800">{ksh(v as number)}</div><div className="text-[10px] text-slate-400 font-bold">{b} days</div></div>)}</div><StatementTable title="Accounts Receivable (Aging)" cols={[{ k: "student", label: "Student" }, { k: "invoice", label: "Invoice" }, { k: "balance", label: "Balance", money: true }, { k: "days", label: "Days" }, { k: "bucket", label: "Aging" }]} rows={data?.rows || []} /></div>;
}
export function PayablesPage() {
    const { data, isLoading } = useQuery({ queryKey: ["acct_ap"], queryFn: acct.payables });
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#047857]" />;
    return <StatementTable title="Accounts Payable" cols={[{ k: "supplier", label: "Supplier" }, { k: "invoice", label: "Invoice" }, { k: "amount", label: "Amount", money: true }, { k: "date", label: "Date" }]} rows={data?.rows || []} />;
}
export function SettingsPage() {
    const { data, isLoading } = useQuery({ queryKey: ["acct_settings"], queryFn: acct.settings });
    const [form, setForm] = useState<any>({}); const [saving, setSaving] = useState(false);
    if (!isLoading && Object.keys(form).length === 0 && data) setForm(data);
    const save = async () => { setSaving(true); try { await acct.setSettings(form); toast.success("Saved"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); } };
    if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-[#047857]" />;
    return <div className="max-w-xl bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-[11px] font-bold text-slate-600 mb-1">Financial Year</label><input value={form.financialYear ?? ""} onChange={e => setForm((f: any) => ({ ...f, financialYear: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div><div><label className="block text-[11px] font-bold text-slate-600 mb-1">Currency</label><input value={form.currency ?? ""} onChange={e => setForm((f: any) => ({ ...f, currency: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" /></div></div><button onClick={save} disabled={saving} className="h-10 px-5 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button></div>;
}
