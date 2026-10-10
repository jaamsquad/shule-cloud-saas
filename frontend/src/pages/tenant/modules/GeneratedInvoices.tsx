import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Search, X, RefreshCw, Eye, Send, Phone, Mail, MessageSquare, Wallet, Banknote, AlertCircle, Layers, UserPlus } from "lucide-react";
import api from "@/lib/api";
import {
    FeesPage, FCard, FStat, FBadge, FButton, FInput, FSelect, FModal, FTable, td, FEmpty, FLoading, money, fmtDate, statusTone,
} from "@/components/fees/FeesUI";
import { useTerms, TermPicker } from "@/components/fees/TermPicker";

// Every invoice for a term — the current year and term are shown first.
type Status = "ALL" | "UNPAID" | "OVERDUE" | "PARTIAL" | "PAID" | "WAIVED" | "VOIDED";
const STATUS_TABS: { key: Status; label: string }[] = [
    { key: "ALL", label: "All" }, { key: "UNPAID", label: "Unpaid" }, { key: "OVERDUE", label: "Overdue" },
    { key: "PARTIAL", label: "Partly paid" }, { key: "PAID", label: "Paid" }, { key: "VOIDED", label: "Voided" },
];

export default function GeneratedInvoices() {
    const t = useTerms({ allowAll: true });
    const [status, setStatus] = useState<Status>("ALL");
    const [search, setSearch] = useState("");
    const [q, setQ] = useState("");
    const [klass, setKlass] = useState("");
    const [page, setPage] = useState(1);
    const [remind, setRemind] = useState<any>(null);
    const [msg, setMsg] = useState("");

    useEffect(() => { const h = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300); return () => clearTimeout(h); }, [search]);
    useEffect(() => { setPage(1); }, [t.yearId, t.termId, status, klass]);

    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["academics_classes"], queryFn: async () => (await api.get("/academics/classes")).data || [] });
    const { data: res, isLoading, isFetching, refetch } = useQuery<any>({
        queryKey: ["generated_invoices", t.yearId, t.termId, status, q, klass, page], enabled: !!t.yearId || t.years.length === 0,
        queryFn: async () => (await api.get("/schools/default/invoices", { params: {
            page, limit: 25, status,
            academic_year_id: t.yearId || undefined, semester_id: t.termId && t.termId !== "all" ? t.termId : undefined,
            search: q.length >= 2 ? q : undefined, class_name: klass || undefined,
        } })).data,
        placeholderData: prev => prev,
    });
    const rows: any[] = res?.data || [];
    const meta = res?.meta || {};
    const counts = meta.counts || {};
    const m = meta.money || {};

    const reminder = useMutation({
        mutationFn: async (channel: "sms" | "email" | "whatsapp") => api.post(`/schools/default/invoices/${remind._id}/remind`, { channel, message: msg || undefined }),
        onSuccess: (_, ch) => { toast.success(`Reminder sent by ${ch === "sms" ? "SMS" : ch === "email" ? "email" : "WhatsApp"}`); setRemind(null); setMsg(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || e.response?.data?.errors?.[0]?.message || "Could not send the reminder"),
    });
    const allTerms = t.termId === "all";
    const countOf = (k: Status) => (k === "UNPAID" ? (counts.UNPAID || 0) + (counts.OVERDUE || 0) : counts[k] || 0);

    return (
        <FeesPage wide title="Invoices" icon={FileText}
            subtitle={`Every fee invoice${t.label ? ` for ${t.label}` : ""}. Open one, or remind the parent by SMS, email or WhatsApp.`}
            actions={<>
                <TermPicker t={t} allowAll />
                <Link to="/fees/generate-invoice"><FButton variant="secondary" icon={Layers}>Generate</FButton></Link>
                <FButton variant="ghost" icon={RefreshCw} onClick={() => refetch()} title="Refresh" />
            </>}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <FStat label="Invoices" value={countOf("ALL")} icon={FileText} loading={isLoading} hint={t.label} />
                <FStat label="Billed" value={money(m.billed || 0)} icon={Banknote} tone="sky" loading={isLoading} />
                <FStat label="Collected" value={money(m.collected || 0)} icon={Wallet} tone="emerald" loading={isLoading} hint={m.billed ? `${Math.round(((m.collected || 0) / m.billed) * 100)}% of billed` : undefined} />
                <FStat label="Outstanding" value={money(m.outstanding || 0)} icon={AlertCircle} tone={(m.outstanding || 0) > 0 ? "rose" : "emerald"} loading={isLoading} hint={`${countOf("OVERDUE")} overdue`} />
            </div>

            <FCard bodyClassName="p-0">
                <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between border-b border-slate-100">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar p-1 bg-slate-100 rounded-xl w-fit max-w-full">
                        {STATUS_TABS.map(s => (
                            <button key={s.key} onClick={() => setStatus(s.key)}
                                className={`h-8 px-3 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors ${status === s.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                {s.label} <span className="ml-1 text-[11px] text-slate-400">{countOf(s.key)}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <FSelect value={klass} onChange={e => setKlass(e.target.value)} className="lg:!w-44">
                            <option value="">All classes</option>
                            {classes.map((c: any) => { const n = c.name || c.levelName; return <option key={c._id} value={n}>{n}</option>; })}
                        </FSelect>
                        <div className="relative flex-1 lg:w-72">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <FInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, admission or invoice no…" className="pl-9 pr-8" />
                            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>}
                        </div>
                    </div>
                </div>

                {isLoading ? <FLoading /> : !rows.length ? (
                    <FEmpty icon={FileText} title={q || klass || status !== "ALL" ? "No invoices match" : `No invoices for ${t.label || "this term"} yet`}
                        hint={q || klass || status !== "ALL" ? "Try another filter or term." : "Generate them for whole classes or one learner."}
                        action={!(q || klass || status !== "ALL") && <div className="flex gap-2"><Link to="/fees/generate-invoice"><FButton icon={Layers}>Generate for classes</FButton></Link><Link to="/fees/generate-student-invoice"><FButton variant="secondary" icon={UserPlus}>One learner</FButton></Link></div>} />
                ) : (
                    <div className={isFetching ? "opacity-70 transition-opacity" : ""}>
                        <div className="hidden md:block">
                            <FTable head={["Invoice", "Learner", "Class", ...(allTerms ? ["Term"] : []), "Due", "Total", "Paid", "Balance", "Status", ""]}>
                                {rows.map(inv => (
                                    <tr key={inv._id}>
                                        <td className={`${td} font-semibold text-slate-800 whitespace-nowrap`}>{inv.invoice_no}</td>
                                        <td className={td}>
                                            <Link to={`/fees/invoice/${inv._id}`} className="font-semibold text-[#5C67F2] hover:underline whitespace-nowrap">{inv.student_name}</Link>
                                            {inv.admission_no && <p className="text-[11px] text-slate-400">{inv.admission_no}</p>}
                                        </td>
                                        <td className={`${td} whitespace-nowrap`}>{inv.class_name}</td>
                                        {allTerms && <td className={`${td} whitespace-nowrap text-xs text-slate-500`}>{[inv.term_label, inv.year_label].filter(Boolean).join(" · ") || "—"}</td>}
                                        <td className={`${td} whitespace-nowrap text-xs`}>
                                            {inv.due_date ? fmtDate(inv.due_date) : "—"}
                                            {inv.days_overdue > 0 && <p className="text-[11px] text-rose-600 font-semibold">{inv.days_overdue}d overdue</p>}
                                        </td>
                                        <td className={`${td} whitespace-nowrap`}>{money(inv.total_due)}</td>
                                        <td className={`${td} whitespace-nowrap text-emerald-600`}>{money(inv.amount_paid)}</td>
                                        <td className={`${td} whitespace-nowrap font-bold ${Number(inv.balance) > 0 ? "text-rose-600" : "text-emerald-600"}`}>{money(inv.balance)}</td>
                                        <td className={td}><FBadge tone={statusTone(inv.status)}>{String(inv.status || "").toLowerCase()}</FBadge></td>
                                        <td className={`${td} text-right whitespace-nowrap`}>
                                            <div className="inline-flex gap-1.5">
                                                <Link to={`/fees/invoice/${inv._id}`}><FButton size="sm" variant="secondary" icon={Eye} title="View" /></Link>
                                                {Number(inv.balance) > 0 && !["VOIDED", "WAIVED"].includes(inv.status) && <FButton size="sm" variant="ghost" icon={Send} title="Send reminder" onClick={() => { setRemind(inv); setMsg(""); }} />}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </FTable>
                        </div>
                        <div className="md:hidden divide-y divide-slate-100">
                            {rows.map(inv => (
                                <div key={inv._id} className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <Link to={`/fees/invoice/${inv._id}`} className="text-sm font-bold text-[#5C67F2]">{inv.student_name}</Link>
                                            <p className="text-xs text-slate-500">{inv.invoice_no} · {inv.class_name}</p>
                                        </div>
                                        <FBadge tone={statusTone(inv.status)}>{String(inv.status || "").toLowerCase()}</FBadge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div><p className="text-slate-400">Total</p><p className="font-semibold">{money(inv.total_due)}</p></div>
                                        <div><p className="text-slate-400">Paid</p><p className="font-semibold text-emerald-600">{money(inv.amount_paid)}</p></div>
                                        <div><p className="text-slate-400">Balance</p><p className={`font-bold ${Number(inv.balance) > 0 ? "text-rose-600" : "text-emerald-600"}`}>{money(inv.balance)}</p></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link to={`/fees/invoice/${inv._id}`} className="flex-1"><FButton size="sm" variant="secondary" icon={Eye} className="w-full">View</FButton></Link>
                                        {Number(inv.balance) > 0 && !["VOIDED", "WAIVED"].includes(inv.status) && <FButton size="sm" variant="ghost" icon={Send} className="flex-1" onClick={() => { setRemind(inv); setMsg(""); }}>Remind</FButton>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                            <p className="text-xs text-slate-500">{meta.total || 0} invoice{meta.total === 1 ? "" : "s"} · page {meta.page || 1} of {meta.pages || 1}</p>
                            <div className="flex gap-2">
                                <FButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</FButton>
                                <FButton size="sm" variant="secondary" disabled={page >= (meta.pages || 1)} onClick={() => setPage(p => p + 1)}>Next</FButton>
                            </div>
                        </div>
                    </div>
                )}
            </FCard>

            <FModal open={!!remind} onClose={() => setRemind(null)} title="Send a payment reminder"
                subtitle={remind ? `${remind.invoice_no} · ${remind.student_name} · balance ${money(remind.balance)}` : ""}>
                {remind && (
                    <div className="space-y-4">
                        <textarea rows={3} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Optional message — leave empty for the standard reminder"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C67F2]/25 focus:border-[#5C67F2]" />
                        <div className="grid grid-cols-3 gap-2">
                            {([["sms", "SMS", Phone], ["email", "Email", Mail], ["whatsapp", "WhatsApp", MessageSquare]] as const).map(([k, l, I]) => (
                                <button key={k} disabled={reminder.isPending} onClick={() => reminder.mutate(k)}
                                    className="rounded-xl border border-slate-200 py-4 flex flex-col items-center gap-1.5 hover:border-[#5C67F2] hover:bg-indigo-50/50 disabled:opacity-50">
                                    <I className="w-5 h-5 text-[#5C67F2]" /><span className="text-xs font-semibold text-slate-700">{l}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </FModal>
        </FeesPage>
    );
}
