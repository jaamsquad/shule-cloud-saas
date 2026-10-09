import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Home, FileText, Search, Loader2, MessageSquare,
    Mail, Phone, RefreshCw, ChevronDown, X, Check,
    AlertCircle, Clock, Filter, Send, Eye
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { FeesPage } from "@/components/fees/FeesUI";
import { FileText as FileTextPageIcon } from "lucide-react";

type TabKey = "ALL" | "PAID" | "UNPAID" | "PARTIAL";

const TABS: { key: TabKey; label: string; color: string; bg: string; dot: string }[] = [
    { key: "ALL",     label: "All Invoices",    color: "text-slate-700",   bg: "bg-slate-100",   dot: "bg-slate-400" },
    { key: "UNPAID",  label: "Unpaid",           color: "text-amber-700",   bg: "bg-amber-100",   dot: "bg-amber-500" },
    { key: "PARTIAL", label: "Partially Paid",   color: "text-blue-700",    bg: "bg-blue-100",    dot: "bg-blue-500"  },
    { key: "PAID",    label: "Paid",             color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
];

function statusBadge(status: string) {
    const map: Record<string, string> = {
        PAID:    "bg-emerald-100 text-emerald-700",
        UNPAID:  "bg-amber-100 text-amber-700",
        PARTIAL: "bg-blue-100 text-blue-700",
        OVERDUE: "bg-rose-100 text-rose-700",
    };
    return map[status?.toUpperCase()] ?? "bg-slate-100 text-slate-600";
}

export default function GeneratedInvoices() {
    const [activeTab, setActiveTab] = useState<TabKey>("ALL");
    const [search, setSearch]       = useState("");
    const [reminderInvoice, setReminderInvoice] = useState<any>(null);
    const [reminderMsg, setReminderMsg]         = useState("");
    const [page, setPage]           = useState(1);

    // ── Fetch invoices ─────────────────────────────────────────────────
    const { data: res, isLoading, refetch } = useQuery({
        queryKey: ["generated_invoices", activeTab, search, page],
        queryFn: async () => {
            const params = new URLSearchParams({ page: String(page), limit: "20" });
            if (activeTab !== "ALL") params.set("status", activeTab);
            if (search.trim().length >= 2) params.set("search", search.trim());
            const r = await api.get(`/schools/default/invoices?${params}`);
            return r.data;
        },
        keepPreviousData: true,
    } as any);

    const invoices: any[] = res?.data || res || [];
    const meta            = res?.meta || {};

    // ── Reminder mutation ───────────────────────────────────────────────
    const reminderMutation = useMutation({
        mutationFn: async ({ id, channel }: { id: string; channel: "sms" | "email" | "whatsapp" }) => {
            return api.post(`/schools/default/invoices/${id}/remind`, {
                channel,
                message: reminderMsg || undefined,
            });
        },
        onSuccess: (_, vars) => {
            toast.success(`Reminder sent via ${vars.channel.toUpperCase()}!`);
            setReminderInvoice(null);
            setReminderMsg("");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to send reminder");
        },
    });

    const counts = {
        ALL:     meta.total     ?? invoices.length,
        PAID:    meta.paid      ?? invoices.filter((i: any) => i.status?.toUpperCase() === "PAID").length,
        UNPAID:  meta.unpaid    ?? invoices.filter((i: any) => i.status?.toUpperCase() === "UNPAID").length,
        PARTIAL: meta.partial   ?? invoices.filter((i: any) => i.status?.toUpperCase() === "PARTIAL").length,
    };

    return (
        <FeesPage title="Invoices" subtitle="Every fee invoice issued. Filter by status, open one, or send reminders by SMS, email or WhatsApp." icon={FileTextPageIcon} actions={<>
                <button
                    onClick={() => refetch()}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </>}>

            <div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => { setActiveTab(t.key); setPage(1); }}
                            className={`p-4 rounded-xl border text-left transition-all shadow-sm ${
                                activeTab === t.key
                                    ? `${t.bg} border-current ${t.color} shadow-md`
                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${t.dot}`} />
                                <span className="text-xs font-semibold uppercase tracking-wider">{t.label}</span>
                            </div>
                            <p className="text-2xl font-black">{counts[t.key] ?? "—"}</p>
                        </button>
                    ))}
                </div>

                {/* Search & Filters */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4 p-4 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search by student name, invoice no, class..."
                            className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-[#5C67F2] focus:bg-white transition-colors"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium whitespace-nowrap">
                        <Filter className="w-3.5 h-3.5" />
                        <span>
                            {activeTab === "ALL" ? "All statuses" : TABS.find(t => t.key === activeTab)?.label}
                        </span>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-[#5C67F2]" />
                            <p className="text-sm font-medium">Loading invoices...</p>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <FileText className="w-12 h-12 text-slate-300" />
                            <p className="text-sm font-semibold">No invoices found</p>
                            <p className="text-xs">Try a different tab or search term</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            {["Invoice No", "Student", "Class", "Due Date", "Total", "Paid", "Balance", "Status", "Remind"].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invoices.map((inv: any) => (
                                            <tr key={inv._id || inv.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-4 py-3 font-semibold text-slate-800">{inv.invoice_no}</td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    <Link 
                                                        to={`/fees/invoice/${inv._id || inv.id}`}
                                                        className="font-bold text-[#5C67F2] hover:underline"
                                                    >
                                                        {inv.student_name || inv.student?.studentName || inv.student?.name || "—"}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{inv.class_name || "—"}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">{inv.due_date || "—"}</td>
                                                <td className="px-4 py-3 font-medium text-slate-700">KSh {Number(inv.total_due || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 font-medium text-emerald-600">KSh {Number(inv.amount_paid || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-bold ${Number(inv.balance) <= 0 ? "text-emerald-500" : "text-rose-600"}`}>
                                                        KSh {Number(inv.balance || 0).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(inv.status)}`}>
                                                        {inv.status || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            to={`/fees/invoice/${inv._id || inv.id}`}
                                                            className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" /> View
                                                        </Link>
                                                        {inv.status?.toUpperCase() !== "PAID" && (
                                                            <button
                                                                onClick={() => { setReminderInvoice(inv); setReminderMsg(""); }}
                                                                className="flex items-center gap-1.5 text-[11px] font-bold text-[#5C67F2] hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors border border-indigo-100"
                                                            >
                                                                <Send className="w-3 h-3" /> Remind
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {invoices.map((inv: any) => (
                                    <div key={inv._id || inv.id} className="p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800 text-sm">{inv.invoice_no}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(inv.status)}`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <Link 
                                            to={`/fees/invoice/${inv._id || inv.id}`}
                                            className="text-sm font-bold text-[#5C67F2] hover:underline block text-left"
                                        >
                                            {inv.student_name || inv.student?.studentName || "—"}
                                        </Link>
                                        <p className="text-xs text-slate-500 text-left">{inv.class_name || "—"} · Due: {inv.due_date || "N/A"}</p>
                                        <div className="flex gap-4 text-xs font-medium">
                                            <span className="text-slate-600">Total: <strong>KSh {Number(inv.total_due || 0).toLocaleString()}</strong></span>
                                            <span className="text-emerald-600">Paid: <strong>KSh {Number(inv.amount_paid || 0).toLocaleString()}</strong></span>
                                            <span className={Number(inv.balance) <= 0 ? "text-emerald-500" : "text-rose-600"}>
                                                Bal: <strong>KSh {Number(inv.balance || 0).toLocaleString()}</strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <Link
                                                to={`/fees/invoice/${inv._id || inv.id}`}
                                                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> View Invoice
                                            </Link>
                                            {inv.status?.toUpperCase() !== "PAID" && (
                                                <button
                                                    onClick={() => { setReminderInvoice(inv); setReminderMsg(""); }}
                                                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#5C67F2] hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
                                                >
                                                    <Send className="w-3 h-3" /> Send Reminder
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {(meta.pages > 1 || meta.totalPages > 1) && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                                    <p className="text-xs text-slate-500">
                                        Page {meta.page || page} of {meta.pages || meta.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page <= 1}
                                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page >= (meta.pages || meta.totalPages || 1)}
                                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Reminder Modal ─────────────────────────────────────────── */}
            {reminderInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800">Send Payment Reminder</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Invoice <strong>{reminderInvoice.invoice_no}</strong> · Balance: KSh{" "}
                                    <strong className="text-rose-600">{Number(reminderInvoice.balance || 0).toLocaleString()}</strong>
                                </p>
                            </div>
                            <button onClick={() => setReminderInvoice(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Student info */}
                        <div className="px-5 pt-4">
                            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-[#5C67F2] text-sm">
                                    {(reminderInvoice.student_name || reminderInvoice.student?.studentName || "S")[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        {reminderInvoice.student_name || reminderInvoice.student?.studentName || "Student"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {reminderInvoice.class_name || reminderInvoice.student?.currentClass || ""}
                                    </p>
                                </div>
                            </div>

                            {/* Optional custom message */}
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                                Custom Message <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <textarea
                                value={reminderMsg}
                                onChange={e => setReminderMsg(e.target.value)}
                                rows={3}
                                placeholder="Leave blank to use default reminder template..."
                                className="w-full text-sm p-3 border border-slate-200 rounded-xl outline-none focus:border-[#5C67F2] resize-none text-slate-700 bg-slate-50 focus:bg-white transition-colors"
                            />
                        </div>

                        {/* Channel buttons */}
                        <div className="p-5 space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Choose channel</p>
                            <div className="grid grid-cols-3 gap-3">
                                {/* SMS */}
                                <button
                                    onClick={() => reminderMutation.mutate({ id: reminderInvoice._id || reminderInvoice.id, channel: "sms" })}
                                    disabled={reminderMutation.isPending}
                                    className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group disabled:opacity-50"
                                >
                                    {reminderMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                    ) : (
                                        <Phone className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                                    )}
                                    <span className="text-xs font-bold text-blue-600">SMS</span>
                                </button>

                                {/* Email */}
                                <button
                                    onClick={() => reminderMutation.mutate({ id: reminderInvoice._id || reminderInvoice.id, channel: "email" })}
                                    disabled={reminderMutation.isPending}
                                    className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-slate-200 hover:border-[#5C67F2] hover:bg-indigo-50 transition-all group disabled:opacity-50"
                                >
                                    {reminderMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />
                                    ) : (
                                        <Mail className="w-5 h-5 text-[#5C67F2] group-hover:scale-110 transition-transform" />
                                    )}
                                    <span className="text-xs font-bold text-[#5C67F2]">Email</span>
                                </button>

                                {/* WhatsApp */}
                                <button
                                    onClick={() => reminderMutation.mutate({ id: reminderInvoice._id || reminderInvoice.id, channel: "whatsapp" })}
                                    disabled={reminderMutation.isPending}
                                    className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group disabled:opacity-50"
                                >
                                    {reminderMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                    ) : (
                                        <MessageSquare className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                                    )}
                                    <span className="text-xs font-bold text-emerald-600">WhatsApp</span>
                                </button>
                            </div>

                            <button
                                onClick={() => { setReminderInvoice(null); setReminderMsg(""); }}
                                className="w-full py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors mt-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FeesPage>
    );
}
