import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Inbox, Search, X, CheckCircle2, RotateCcw, Smartphone, Download } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";
import { currentTenantSubdomain } from "@/lib/portal";
import { useSchoolBrand, printBranded } from "@/lib/printDoc";

const ksh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;
const fmt = (d: any) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
    allocated: { label: "Allocated", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    auto_matched: { label: "Auto Matched", cls: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
    pending: { label: "Pending", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
    rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
    duplicate: { label: "Duplicate", cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
};

// C2B Payment Inbox — every M-PESA payment to the school's Till/Paybill, with
// auto-match status, reconciliation stats and manual allocation. Live-refreshing.
export default function PaymentInbox() {
    const qc = useQueryClient();
    const school = useSchoolBrand();
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [allocFor, setAllocFor] = useState<any>(null);

    const [live, setLive] = useState(false);
    const { data: recon } = useQuery({
        queryKey: ["c2b_recon"], refetchInterval: 60000,
        queryFn: async () => (await api.get("/payments/reconciliation")).data,
    });
    const { data, isLoading } = useQuery({
        queryKey: ["c2b_inbox", status, search], refetchInterval: 60000,   // slow fallback; SSE drives live
        queryFn: async () => (await api.get("/payments/inbox", { params: { status, search: search || undefined } })).data,
    });
    const rows: any[] = data?.data || [];

    // ── Real-time updates via Server-Sent Events ──────────────────────────────
    // New payments and allocation changes are pushed instantly; we refetch on
    // each event rather than patching, to keep filters/search correct.
    useEffect(() => {
        const sub = currentTenantSubdomain() || localStorage.getItem("active_branch_subdomain");
        const url = `${API_ORIGIN}/api/v1/payments/inbox/stream${sub ? `?subdomain=${encodeURIComponent(sub)}` : ""}`;
        let es: EventSource | null = null;
        try {
            es = new EventSource(url);
            es.onopen = () => setLive(true);
            es.onerror = () => setLive(false);
            const onEvt = (e: MessageEvent, isNew: boolean) => {
                qc.invalidateQueries({ queryKey: ["c2b_inbox"] });
                qc.invalidateQueries({ queryKey: ["c2b_recon"] });
                if (isNew) { try { const d = JSON.parse(e.data); toast.success(`New payment: ${d.customerName || d.MSISDN} · KSh ${Number(d.TransAmount).toLocaleString()}`); } catch { /* ignore */ } }
            };
            es.addEventListener("payment", (e) => onEvt(e as MessageEvent, true));
            es.addEventListener("update", (e) => onEvt(e as MessageEvent, false));
        } catch { /* EventSource unsupported → polling fallback covers it */ }
        return () => { es?.close(); setLive(false); };
    }, [qc]);

    const reverse = useMutation({
        mutationFn: async (id: string) => (await api.post(`/payments/${id}/reverse`, { reason: "Manual reversal" })).data,
        onSuccess: () => { toast.success("Payment reversed"); qc.invalidateQueries({ queryKey: ["c2b_inbox"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Reverse failed"),
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#5C67F2]/10 text-[#5C67F2] flex items-center justify-center"><Inbox className="w-5 h-5" /></div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">C2B Payment Inbox <span className={`inline-flex items-center gap-1 text-xs font-bold ${live ? "text-emerald-600" : "text-slate-400"}`}><span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} /> {live ? "Live" : "Polling"}</span></h1>
                    <p className="text-sm text-slate-400">Every M-PESA payment to your Till/Paybill, auto-matched and reconciled.</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <a href={`${API_ORIGIN}/api/v1/payments/export?format=csv&status=${status}${(currentTenantSubdomain() || localStorage.getItem("active_branch_subdomain")) ? `&subdomain=${currentTenantSubdomain() || localStorage.getItem("active_branch_subdomain")}` : ""}`} className="h-9 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><Download className="w-4 h-4" /> CSV</a>
                    <a href={`${API_ORIGIN}/api/v1/payments/export?format=xlsx&status=${status}${(currentTenantSubdomain() || localStorage.getItem("active_branch_subdomain")) ? `&subdomain=${currentTenantSubdomain() || localStorage.getItem("active_branch_subdomain")}` : ""}`} className="h-9 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><Download className="w-4 h-4" /> Excel</a>
                    <button onClick={() => {
                        const body = `<p style="font-size:12px;color:#475569">${rows.length} payments · Today ${ksh(recon?.todayCollections)} · Total ${ksh(recon?.totalCollections)}</p>
                            <table><thead><tr><th>Status</th><th>Receipt</th><th>Customer</th><th>Phone</th><th>Account</th><th>Amount</th><th>Matched</th><th>Paid</th></tr></thead><tbody>
                            ${rows.map(r => `<tr><td>${STATUS[r.reconStatus]?.label || r.reconStatus}</td><td>${r.TransID}</td><td>${r.customerName || "-"}</td><td>${r.MSISDN || "-"}</td><td>${r.BillRefNumber || "-"}</td><td>${ksh(r.TransAmount)}</td><td>${r.matchedStudentName || "-"}</td><td>${fmt(r.paidAt)}</td></tr>`).join("")}</tbody></table>`;
                        printBranded(school, "C2B Payment Inbox", body, "#5C67F2");
                    }} className="h-9 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">PDF / Print</button>
                </div>
            </div>

            {/* Reconciliation stats */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
                <Stat label="Today's Collections" value={ksh(recon?.todayCollections)} accent="#10B981" />
                <Stat label="Pending Allocation" value={recon?.pending ?? 0} accent="#F59E0B" />
                <Stat label="Allocated Today" value={recon?.allocatedToday ?? 0} accent="#0EA5E9" />
                <Stat label="Duplicates" value={recon?.duplicates ?? 0} accent="#94A3B8" />
                <Stat label="Total Collected" value={ksh(recon?.totalCollections)} accent="#5C67F2" />
                <Stat label="Fees Outstanding" value={ksh(recon?.totalOutstanding)} accent="#EF4444" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 p-3 mb-4 flex flex-wrap items-center gap-2">
                {["all", "pending", "auto_matched", "allocated", "rejected"].map(s => (
                    <button key={s} onClick={() => setStatus(s)} className={`h-9 px-3 rounded-lg text-xs font-bold ${status === s ? "bg-[#5C67F2] text-white" : "bg-slate-50 text-slate-500"}`}>{s === "all" ? "All" : STATUS[s]?.label}</button>
                ))}
                <div className="relative ml-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Code, phone, name, account…" className="h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm w-64 focus:outline-none focus:border-[#5C67F2]" />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div> : rows.length === 0 ? (
                    <div className="py-16 text-center text-slate-400"><Smartphone className="w-10 h-10 mx-auto mb-2" /><p className="font-bold">No payments yet</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">
                                <th className="text-left px-4 py-3 font-black">Status</th>
                                <th className="text-left px-4 py-3 font-black">Receipt</th>
                                <th className="text-left px-4 py-3 font-black">Customer</th>
                                <th className="text-left px-4 py-3 font-black">Phone</th>
                                <th className="text-left px-4 py-3 font-black">Account</th>
                                <th className="text-right px-4 py-3 font-black">Amount</th>
                                <th className="text-left px-4 py-3 font-black">Matched</th>
                                <th className="text-left px-4 py-3 font-black">Paid</th>
                                <th className="text-right px-4 py-3 font-black">Actions</th>
                            </tr></thead>
                            <tbody>
                                {rows.map(r => {
                                    const st = STATUS[r.reconStatus] || STATUS.pending;
                                    return (
                                        <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-1 rounded-full ${st.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span></td>
                                            <td className="px-4 py-3 font-mono text-xs font-bold text-[#0E7490]">{r.TransID}</td>
                                            <td className="px-4 py-3 font-bold text-slate-700">{r.customerName || "—"}</td>
                                            <td className="px-4 py-3 text-slate-500">{r.MSISDN || "—"}</td>
                                            <td className="px-4 py-3 text-slate-500">{r.BillRefNumber || "—"}</td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-700">{ksh(r.TransAmount)}</td>
                                            <td className="px-4 py-3 text-slate-600">{r.matchedStudentName || (r.needsReview ? <span className="text-amber-600 font-bold">Needs review</span> : "—")}</td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">{fmt(r.paidAt)}</td>
                                            <td className="px-4 py-3 text-right">
                                                {["pending"].includes(r.reconStatus) && <button onClick={() => setAllocFor(r)} className="text-[#5C67F2] font-bold text-xs">Allocate</button>}
                                                {["allocated", "auto_matched"].includes(r.reconStatus) && <button onClick={() => reverse.mutate(r._id)} className="text-rose-500 font-bold text-xs inline-flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reverse</button>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {allocFor && <AllocateModal payment={allocFor} onClose={() => setAllocFor(null)} onDone={() => { setAllocFor(null); qc.invalidateQueries({ queryKey: ["c2b_inbox"] }); qc.invalidateQueries({ queryKey: ["c2b_recon"] }); }} />}
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: any; accent: string }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="text-xl font-black" style={{ color: accent }}>{value}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">{label}</div>
        </div>
    );
}

function AllocateModal({ payment, onClose, onDone }: { payment: any; onClose: () => void; onDone: () => void }) {
    const [q, setQ] = useState("");
    const [student, setStudent] = useState<any>(null);
    const { data: students = [] } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });
    const matches = useMemo(() => {
        const s = q.trim().toLowerCase(); if (!s) return [];
        return students.filter((st: any) => String(st.studentName || "").toLowerCase().includes(s) || String(st.registrationNo || st.admNo || "").toLowerCase().includes(s)).slice(0, 8);
    }, [q, students]);
    const save = useMutation({
        mutationFn: async () => (await api.post(`/payments/${payment._id}/allocate`, { studentId: student._id })).data,
        onSuccess: (d: any) => { toast.success(d.message || "Allocated"); onDone(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Allocation failed"),
    });
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="font-black text-slate-800">Allocate {ksh(payment.TransAmount)} · {payment.TransID}</h2>
                    <button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5">
                    <p className="text-xs text-slate-500 mb-2">From {payment.customerName || payment.MSISDN}. Choose the student to apply this to.</p>
                    {student ? (
                        <div className="flex items-center justify-between h-11 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800">{student.studentName}<button onClick={() => setStudent(null)} className="text-emerald-600 text-xs">change</button></div>
                    ) : (
                        <div className="relative">
                            <input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="Search name or reg/adm no…" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                            {matches.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                    {matches.map((s: any) => <button key={s._id} onClick={() => setStudent(s)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between"><span className="font-bold text-slate-700">{s.studentName}</span><span className="font-mono text-xs text-slate-400">{s.registrationNo || s.admNo}</span></button>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
                    <button onClick={onClose} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                    <button onClick={() => save.mutate()} disabled={!student || save.isPending} className="h-10 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">{save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Allocate</button>
                </div>
            </div>
        </div>
    );
}
