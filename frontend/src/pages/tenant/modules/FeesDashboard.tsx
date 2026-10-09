import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Home, Loader2, Clock, CreditCard, Wallet, Landmark, Printer, RefreshCw, Send, Search, CheckCircle2, XCircle, TrendingUp, Layers, Users, Banknote } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSchoolBrand, printBranded } from "@/lib/printDoc";
import { FeesPage, FButton, FLoading } from "@/components/fees/FeesUI";
import { LayoutDashboard, Award, HandHeart, PiggyBank } from "lucide-react";

const money = (n: number) => `KSh ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const when = (v: any) => { const d = new Date(v); return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
const shortDay = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const TABS = [{ k: "overdue", l: "Late Payment" }, { k: "records", l: "Student Fee Records" }, { k: "processing", l: "Payment in Process" }, { k: "edited", l: "Edited Fee Records" }] as const;

function StatCard({ icon: Icon, title, big, rows, color }: { icon: any; title: string; big: string; rows: [string, string][]; color: string }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10" style={{ background: color }} />
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}><Icon className="w-5 h-5" /></div>
                <div className="text-sm font-black text-slate-700">{title}</div>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-3">{big}</div>
            <div className="mt-2 space-y-1">{rows.map(([k, v]) => <div key={k} className="flex justify-between text-xs"><span className="text-slate-400 font-medium">{k}</span><span className="font-bold text-slate-700">{v}</span></div>)}</div>
        </div>
    );
}

export default function FeesDashboard() {
    const { data, isLoading, error, refetch, isFetching } = useQuery<any>({ queryKey: ["fees_overview"], queryFn: async () => (await api.get("/fees/overview")).data, refetchInterval: 120000 });
    const [sel, setSel] = useState("");
    const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("overdue");
    const structure = useMemo(() => (data?.structures || []).find((s: any) => s._id === sel) || data?.structures?.[0], [data, sel]);

    if (isLoading) return <FeesPage title="Fees Dashboard" icon={LayoutDashboard} wide><FLoading label="Loading fee figures…" /></FeesPage>;
    if (error || !data) return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex items-center justify-center"><div className="bg-white p-10 rounded-2xl shadow text-center border border-gray-100"><p className="font-black text-slate-800">Couldn't open the fees dashboard</p><p className="text-sm text-slate-500 mt-1">{(error as any)?.response?.data?.message || "Please try again."}</p></div></div>
    );
    const c = data.cards; const maxDaily = Math.max(1, ...data.trend.map((t: any) => t.amount)); const maxMethod = Math.max(1, ...data.methods.map((m: any) => m.amount)); const maxClass = Math.max(1, ...data.byClass.map((m: any) => m.balance));

    return (
        <FeesPage
            title="Fees Dashboard"
            subtitle={data.term ? `Collections, balances and fee activity · ${data.term.label}` : "Collections, balances and fee activity"}
            icon={LayoutDashboard}
            wide
            actions={<>
                <FButton variant="secondary" icon={RefreshCw} onClick={() => refetch()} loading={isFetching}>Refresh</FButton>
                <Link to="/fees/collect"><FButton icon={Banknote}>Collect Fees</FButton></Link>
            </>}
        >
            <div className="w-full space-y-5">
                {/* top cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard icon={Clock} color="#e11d48" title="Late Collection" big={money(c.overdue.amount)} rows={[["Late invoices", String(c.overdue.invoices)], ["Students", String(c.overdue.students)]]} />
                    <StatCard icon={CreditCard} color="#0ea5e9" title="Online Payment (30 days)" big={money(c.online.amount)} rows={[["Online transactions", String(c.online.count)], ["Waiting / failed", `${c.online.pending} / ${c.online.failed}`], ["Total school students", String(c.online.totalStudents)]]} />
                    <StatCard icon={Wallet} color="#8b5cf6" title="Deposit Collection" big={money(c.deposit.held)} rows={[["Held in student wallets", money(c.deposit.held)], ["Students with a balance", String(c.deposit.students)]]} />
                    <StatCard icon={Landmark} color="#16a34a" title="School Collection" big={money(c.school.paid)} rows={[["Total invoiced", money(c.school.invoiced)], ["Outstanding", money(c.school.balance)], ["Students owing", String(c.school.studentsOwing)]]} />
                </div>

                <FeeAidRow />

                {/* collection progress + today */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between"><div className="text-sm font-black text-slate-700 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Collection rate</div><div className="text-2xl font-black text-emerald-600">{c.school.rate}%</div></div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mt-3"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${Math.min(100, c.school.rate)}%` }} /></div>
                        <div className="flex justify-between text-xs text-slate-400 mt-2"><span>{money(c.school.paid)} collected</span><span>{money(c.school.invoiced)} invoiced · {c.school.invoices} invoices</span></div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><div className="text-sm font-black text-slate-700">Collected today</div><div className="text-3xl font-black text-slate-900 mt-1">{money(c.today.amount)}</div><div className="text-xs text-slate-400">{c.today.transactions} transaction{c.today.transactions === 1 ? "" : "s"}</div></div>
                </div>

                {/* fee structure templates */}
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between"><div className="font-black text-slate-800 flex items-center gap-2"><Layers className="w-4 h-4 text-[#5C67F2]" /> Fee Structure</div><span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-teal-500 text-white">You have {data.structures.length} template{data.structures.length === 1 ? "" : "s"}</span></div>
                        <div className="flex-1 max-h-[340px] overflow-y-auto">
                            {data.structures.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">No fee structures yet.</p> : data.structures.map((s: any) => (
                                <button key={s._id} onClick={() => setSel(s._id)} className={`w-full text-left px-4 py-3 border-b border-slate-50 flex items-center justify-between gap-3 ${structure?._id === s._id ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
                                    <div className="min-w-0"><div className="text-sm font-bold text-slate-700 truncate">{s.name}</div><div className="text-[11px] text-slate-400">{s.classes} class{s.classes === 1 ? "" : "es"} · {money(s.total)} per learner</div></div>
                                    <div className="text-right shrink-0"><div className="text-sm font-black text-slate-800">{s.students}</div><div className="text-[10px] text-slate-400">students</div></div>
                                </button>
                            ))}
                        </div>
                        <div className="p-3 border-t border-slate-100 flex flex-wrap gap-2"><Link to="/fees/generate-invoice" className="h-9 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center">Assign</Link><Link to="/settings/fees-structure" className="h-9 px-3 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold flex items-center">Add template</Link></div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        {!structure ? <div className="h-full flex items-center justify-center text-sm text-slate-400">Choose a fee structure to see its details.</div> : (
                            <>
                                <div className="flex items-start justify-between gap-3 flex-wrap"><div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fee structure of</div><div className="text-xl font-black text-[#1d7fc9]">{structure.name}</div></div>
                                    <div className="grid grid-cols-2 gap-x-6 text-right"><div><div className="text-[10px] text-slate-400">Students not fully paid</div><div className="text-xl font-black text-rose-600">{structure.notPaid}<span className="text-xs text-slate-400 font-bold"> / {structure.students}</span></div></div><div><div className="text-[10px] text-slate-400">Total collection</div><div className="text-xl font-black text-emerald-600">{money(structure.collected)}</div></div></div></div>
                                {structure.invoiced > 0 && <div className="mt-3"><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (structure.collected / structure.invoiced) * 100)}%` }} /></div><div className="text-[11px] text-slate-400 mt-1">{Math.round((structure.collected / structure.invoiced) * 100)}% of {money(structure.invoiced)} invoiced from this structure</div></div>}
                                <table className="w-full text-sm mt-4"><thead><tr className="text-[10px] uppercase text-slate-400 text-left"><th className="py-2">Particular</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
                                    <tbody>{structure.items.map((it: any, i: number) => <tr key={i} className="border-t border-slate-50"><td className="py-2 font-bold text-slate-700">{it.category}{it.required && <span className="ml-1.5 text-[9px] font-black text-orange-500">REQUIRED</span>}</td><td className="text-slate-500">{it.description || "—"}</td><td className="text-right font-bold">{money(it.amount)}</td></tr>)}
                                        <tr className="border-t-2 border-slate-200"><td className="py-2 font-black" colSpan={2}>Total per learner</td><td className="text-right font-black">{money(structure.total)}</td></tr></tbody></table>
                            </>
                        )}
                    </div>
                </div>

                {/* charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><div className="text-sm font-black text-slate-700 mb-2">Collections — last 14 days</div>
                        <ResponsiveContainer width="100%" height={210}><BarChart data={data.trend.map((t: any) => ({ ...t, d: shortDay(t.date) }))}><XAxis dataKey="d" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={1} /><YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} /><Tooltip formatter={(v: any) => money(v)} labelStyle={{ fontWeight: 700 }} /><Bar dataKey="amount" radius={[6, 6, 0, 0]}>{data.trend.map((t: any, i: number) => <Cell key={i} fill={t.amount === maxDaily ? "#16a34a" : "#86efac"} />)}</Bar></BarChart></ResponsiveContainer></div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
                        <div><div className="text-sm font-black text-slate-700 mb-2">How parents pay (90 days)</div>{data.methods.length === 0 ? <p className="text-xs text-slate-400">No payments yet.</p> : data.methods.map((m: any) => <div key={m.method} className="mb-2"><div className="flex justify-between text-xs"><span className="font-bold text-slate-600">{m.method} <span className="text-slate-400 font-normal">· {m.count}</span></span><span className="font-bold">{money(m.amount)}</span></div><div className="h-1.5 bg-slate-100 rounded-full mt-1"><div className="h-full rounded-full bg-[#5C67F2]" style={{ width: `${(m.amount / maxMethod) * 100}%` }} /></div></div>)}</div>
                        <div><div className="text-sm font-black text-slate-700 mb-2">Most owing classes</div>{data.byClass.length === 0 ? <p className="text-xs text-slate-400">Nothing outstanding.</p> : data.byClass.map((m: any) => <div key={m.className} className="mb-2"><div className="flex justify-between text-xs"><span className="font-bold text-slate-600">{m.className} <span className="text-slate-400 font-normal">· {m.students}</span></span><span className="font-bold text-rose-600">{money(m.balance)}</span></div><div className="h-1.5 bg-slate-100 rounded-full mt-1"><div className="h-full rounded-full bg-rose-400" style={{ width: `${(m.balance / maxClass) * 100}%` }} /></div></div>)}</div>
                    </div>
                </div>

                {/* payment quick view */}
                <div>
                    <div className="text-sm font-black text-slate-700 mb-2">Payment Quick View</div>
                    <div className="flex flex-wrap border-b border-slate-200">{TABS.map(t => <button key={t.k} onClick={() => setTab(t.k)} className={`px-5 py-3 text-sm font-bold -mb-px border-b-2 ${tab === t.k ? "border-[#5C67F2] text-[#5C67F2] bg-white rounded-t-lg" : "border-transparent text-slate-400 hover:text-slate-600"}`}>{t.l}</button>)}</div>
                    <div className="bg-white rounded-b-2xl rounded-tr-2xl border border-t-0 border-slate-100 shadow-sm p-4">
                        {tab === "overdue" && <Overdue />}{tab === "records" && <Records />}{tab === "processing" && <Processing />}{tab === "edited" && <Edited />}
                    </div>
                </div>
            </div>
        </FeesPage>
    );
}

// ── tabs ────────────────────────────────────────────────────────────────────
function Toolbar({ q, setQ, children }: { q: string; setQ: (v: string) => void; children?: React.ReactNode }) {
    return <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div className="flex flex-wrap gap-2 items-center">{children}</div><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="h-9 pl-9 pr-3 border border-slate-200 rounded-lg text-sm w-56" /></div></div>;
}
const Th = ({ children, right }: any) => <th className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 ${right ? "text-right" : "text-left"}`}>{children}</th>;
const Empty = ({ cols, loading, text }: { cols: number; loading?: boolean; text: string }) => <tr><td colSpan={cols} className="py-10 text-center text-sm text-slate-400">{loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#5C67F2]" /> : text}</td></tr>;

function Overdue() {
    const school = useSchoolBrand(); const [q, setQ] = useState(""); const [busy, setBusy] = useState(false);
    const { data = [], isLoading, refetch } = useQuery<any[]>({ queryKey: ["fees_overdue"], queryFn: async () => (await api.get("/fees/overview/overdue")).data });
    const rows = data.filter(r => !q || `${r.studentName} ${r.className} ${r.invoiceNo}`.toLowerCase().includes(q.toLowerCase()));
    const notify = async () => {
        if (!rows.length || !confirm(`Send an SMS reminder to the parents of ${new Set(rows.map(r => r.studentId)).size} student(s) with overdue fees?`)) return;
        setBusy(true);
        try { const r = (await api.post("/fees/overview/notify", { invoiceIds: rows.map(x => x.invoiceId) })).data; toast[r.failed && !r.sent ? "error" : "success"](`Reminders: ${r.sent} sent${r.failed ? ` · ${r.failed} failed${r.message ? ` (${r.message})` : ""}` : ""}${r.noPhone ? ` · ${r.noPhone} without a phone number` : ""}`); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not send"); } finally { setBusy(false); }
    };
    const print = () => printBranded(school, "Late fee payments", `<table><thead><tr><th>#</th><th>Student</th><th>Class</th><th>Invoice</th><th>Due date</th><th>Days late</th><th style="text-align:right">Balance</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.studentName)}</td><td>${esc(r.className)}</td><td>${esc(r.invoiceNo)}</td><td>${esc(r.dueDate)}</td><td>${r.daysOverdue}</td><td style="text-align:right">${esc(money(r.balance))}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="6">Total</td><td style="text-align:right">${esc(money(rows.reduce((s, r) => s + r.balance, 0)))}</td></tr></tfoot></table>`, "#5C67F2");
    return (
        <>
            <Toolbar q={q} setQ={setQ}>
                <button onClick={() => refetch()} className="h-9 px-3 rounded-lg bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
                <button onClick={notify} disabled={busy || !rows.length} className="h-9 px-3 rounded-lg bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send notification</button>
                <button onClick={print} disabled={!rows.length} className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-50"><Printer className="w-3.5 h-3.5" /> Print</button>
            </Toolbar>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><Th>#</Th><Th>Student</Th><Th>Class</Th><Th>Invoice</Th><Th>Due date</Th><Th right>Days late</Th><Th right>Balance</Th></tr></thead>
                <tbody>{rows.length === 0 ? <Empty cols={7} loading={isLoading} text="No overdue fees. 🎉" /> : rows.map((r, i) => <tr key={r.invoiceId} className="border-t border-slate-50"><td className="px-3 py-2 text-slate-400">{i + 1}</td><td className="px-3 font-bold text-slate-700">{r.studentName}</td><td className="px-3 text-slate-500">{r.className || "—"}</td><td className="px-3"><Link to={`/fees/invoice/${r.invoiceId}`} className="text-[#5C67F2] font-bold">{r.invoiceNo}</Link></td><td className="px-3 text-slate-500">{r.dueDate}</td><td className="px-3 text-right"><span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${r.daysOverdue > 30 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{r.daysOverdue}</span></td><td className="px-3 text-right font-black text-rose-600">{money(r.balance)}</td></tr>)}</tbody></table></div>
        </>
    );
}

function Records() {
    const school = useSchoolBrand(); const [q, setQ] = useState(""); const [cls, setCls] = useState("");
    const { data: streams = [] } = useQuery<any[]>({ queryKey: ["fees_streams"], queryFn: async () => (await api.get("/v2/streams")).data || [] });
    const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["fees_records", cls, q], queryFn: async () => (await api.get("/fees/overview/records", { params: { className: cls, q } })).data });
    const print = () => printBranded(school, `Student fee records${cls ? ` — ${cls}` : ""}`, `<table><thead><tr><th>#</th><th>Student</th><th>Reg No</th><th>Class</th><th style="text-align:right">Billed</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th></tr></thead><tbody>${data.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.studentName)}</td><td>${esc(r.registrationNo)}</td><td>${esc(r.className)}</td><td style="text-align:right">${esc(money(r.billed))}</td><td style="text-align:right">${esc(money(r.paid))}</td><td style="text-align:right">${esc(money(r.balance))}</td></tr>`).join("")}</tbody></table>`, "#5C67F2");
    return (
        <>
            <Toolbar q={q} setQ={setQ}>
                <select value={cls} onChange={e => setCls(e.target.value)} className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white"><option value="">All classes</option>{streams.map((s: any) => <option key={s._id} value={s.fullName}>{s.fullName}</option>)}</select>
                <button onClick={print} disabled={!data.length} className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-50"><Printer className="w-3.5 h-3.5" /> Print</button>
            </Toolbar>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><Th>#</Th><Th>Student</Th><Th>Class</Th><Th right>Billed</Th><Th right>Paid</Th><Th right>Balance</Th><Th></Th></tr></thead>
                <tbody>{data.length === 0 ? <Empty cols={7} loading={isLoading} text="No fee records found." /> : data.map((r, i) => <tr key={r.studentId} className="border-t border-slate-50"><td className="px-3 py-2 text-slate-400">{i + 1}</td><td className="px-3"><div className="font-bold text-slate-700">{r.studentName}</div><div className="text-[11px] text-slate-400">{r.registrationNo}</div></td><td className="px-3 text-slate-500">{r.className || "—"}</td><td className="px-3 text-right text-slate-500">{money(r.billed)}</td><td className="px-3 text-right text-emerald-700">{money(r.paid)}</td><td className={`px-3 text-right font-black ${r.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>{r.balance > 0 ? money(r.balance) : "Cleared"}</td><td className="px-3 text-right"><Link to={`/fees/ledger?student=${r.studentId}`} className="text-xs font-bold text-[#5C67F2]">Ledger</Link></td></tr>)}</tbody></table></div>
        </>
    );
}

function Processing() {
    const qc = useQueryClient(); const [days, setDays] = useState(3); const [q, setQ] = useState(""); const [checking, setChecking] = useState(false);
    const { data = [], isLoading, refetch } = useQuery<any[]>({ queryKey: ["fees_processing", days], queryFn: async () => (await api.get("/fees/overview/processing", { params: { days } })).data });
    const rows = data.filter(r => !q || `${r.studentName} ${r.registrationNo} ${r.phone} ${r.receipt}`.toLowerCase().includes(q.toLowerCase()));
    const pending = data.filter(r => r.status === "pending");
    const check = async () => {
        if (!pending.length) { toast.info("Nothing is waiting."); return; } setChecking(true);
        try { let done = 0; for (const p of pending) { const r = (await api.get("/schools/default/payments/stk-status", { params: { checkoutRequestId: p.checkoutRequestId } })).data; if (r.status === "completed") done++; } toast.success(done ? `${done} payment${done === 1 ? "" : "s"} confirmed and posted` : "Still waiting for the parents to confirm."); await refetch(); qc.invalidateQueries({ queryKey: ["fees_overview"] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not check the status"); } finally { setChecking(false); }
    };
    const badge = (s: string) => s === "completed" ? "bg-emerald-100 text-emerald-700" : s === "failed" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";
    return (
        <>
            <Toolbar q={q} setQ={setQ}>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white"><option value={1}>Last day</option><option value={3}>Last 3 days</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select>
                <button onClick={() => refetch()} className="h-9 px-3 rounded-lg bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh list</button>
                <button onClick={check} disabled={checking || !pending.length} className="h-9 px-3 rounded-lg bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">{checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Check status{pending.length ? ` (${pending.length})` : ""}</button>
            </Toolbar>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><Th>#</Th><Th>Student</Th><Th>Purpose</Th><Th right>Amount</Th><Th>Phone</Th><Th>Started</Th><Th>Status</Th></tr></thead>
                <tbody>{rows.length === 0 ? <Empty cols={7} loading={isLoading} text="No M-PESA payments in this period." /> : rows.map((r, i) => <tr key={r.checkoutRequestId} className="border-t border-slate-50"><td className="px-3 py-2 text-slate-400">{i + 1}</td><td className="px-3"><div className="font-bold text-slate-700">{r.studentName || "—"}</div><div className="text-[11px] text-slate-400">{r.registrationNo}</div></td><td className="px-3 text-slate-500 capitalize">{r.purpose}</td><td className="px-3 text-right font-bold">{money(r.amount)}</td><td className="px-3 text-slate-500">{r.phone}</td><td className="px-3 text-slate-500 whitespace-nowrap">{when(r.createdAt)}</td><td className="px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badge(r.status)}`}>{r.status}</span>{r.receipt && <div className="text-[10px] text-slate-400 mt-0.5">{r.receipt}</div>}{r.status === "failed" && r.message && <div className="text-[10px] text-rose-400 mt-0.5 max-w-[180px]">{r.message}</div>}</td></tr>)}</tbody></table></div>
        </>
    );
}

function Edited() {
    const [q, setQ] = useState("");
    const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["fees_edited"], queryFn: async () => (await api.get("/fees/overview/edited")).data });
    const rows = data.filter(r => !q || `${r.action} ${r.entity} ${r.by} ${r.details} ${r.reference}`.toLowerCase().includes(q.toLowerCase()));
    return (
        <>
            <Toolbar q={q} setQ={setQ} />
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><Th>#</Th><Th>When</Th><Th>Action</Th><Th>Item</Th><Th>By</Th><Th>Details</Th></tr></thead>
                <tbody>{rows.length === 0 ? <Empty cols={6} loading={isLoading} text="No edited, waived or voided fee records." /> : rows.map((r, i) => <tr key={r._id} className="border-t border-slate-50"><td className="px-3 py-2 text-slate-400">{i + 1}</td><td className="px-3 text-slate-500 whitespace-nowrap">{when(r.at)}</td><td className="px-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600">{String(r.action).replace(/_/g, " ")}</span></td><td className="px-3 text-slate-600">{[r.entity, r.reference].filter(Boolean).join(" · ") || "—"}</td><td className="px-3 text-slate-500">{r.by || "—"}</td><td className="px-3 text-slate-500 text-xs">{r.details || "—"}</td></tr>)}</tbody></table></div>
        </>
    );
}

/** Scholarships, sponsors and credits at a glance — each links to its page. */
function FeeAidRow() {
    const sch = useQuery<any>({ queryKey: ["sch_summary"], queryFn: async () => (await api.get("/fees/scholarships/summary")).data, retry: false });
    const sp = useQuery<any>({ queryKey: ["sp_summary"], queryFn: async () => (await api.get("/fees/sponsors/summary")).data, retry: false });
    const cr = useQuery<any>({ queryKey: ["fee_credits"], queryFn: async () => (await api.get("/fees/credits")).data, retry: false });
    const tiles = [
        { to: "/fees/scholarships", icon: Award, color: "#5C67F2", title: "Scholarships & bursaries", big: money(sch.data?.totalAwarded || 0), sub: `${sch.data?.activeAwards ?? 0} students on active awards` },
        { to: "/fees/sponsors", icon: HandHeart, color: "#d97706", title: "Sponsors", big: money(sp.data?.totalReceived || 0), sub: `${sp.data?.sponsoredStudents ?? 0} sponsored students · ${sp.data?.sponsors ?? 0} sponsors` },
        { to: "/fees/credits", icon: PiggyBank, color: "#059669", title: "Credits held", big: money(cr.data?.total || 0), sub: `${cr.data?.students?.length ?? 0} students with overpayments` },
    ];
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiles.map(t => (
                <Link key={t.to} to={t.to} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:border-indigo-200 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: t.color }}><t.icon className="w-5 h-5" /></div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-500">{t.title}</p>
                        <p className="text-lg font-extrabold text-slate-900">{t.big}</p>
                        <p className="text-[11px] text-slate-400 truncate">{t.sub}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}
