import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { FeesPage, FCard, FBadge, FButton, FEmpty, FLoading, FTable, FSelect, FInput, FField, td, money, Tone } from "@/components/fees/FeesUI";

const ACTIONS: [string, string, Tone][] = [
    ["VOID", "Voided", "rose"], ["BULK_VOID", "Bulk voided", "rose"], ["WAIVE", "Invoice waived", "slate"], ["BULK_WAIVE", "Bulk waived", "slate"],
    ["DELETE_INVOICE", "Invoice deleted", "rose"], ["DELETE_TRANSACTION", "Payment deleted", "rose"], ["SCHOLARSHIP", "Scholarship applied", "emerald"],
];
const toneFor = (a: string): Tone => ACTIONS.find(x => x[0] === a)?.[2] || "sky";

/** Every sensitive change in the fees module: voids, waivers, deletes, discounts. */
export default function FeeAuditLog() {
    const [action, setAction] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const { data, isLoading } = useQuery({
        queryKey: ["fee_audit", action, from, to, page],
        queryFn: async () => (await api.get("/schools/default/fees/audit-log", { params: { action: action || undefined, from: from || undefined, to: to ? `${to}T23:59:59` : undefined, page, limit: 25 } })).data,
    });
    const rows = data?.data || [];
    const meta = data?.meta || { page: 1, pages: 1, total: 0 };
    return (
        <FeesPage title="Fee Audit Log" icon={ScrollText} subtitle="Who changed what: voided and waived invoices, deleted records, discounts applied.">
            <FCard className="mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FField label="Action">
                        <FSelect value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
                            <option value="">All actions</option>
                            {ACTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </FSelect>
                    </FField>
                    <FField label="From"><FInput type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></FField>
                    <FField label="To"><FInput type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></FField>
                </div>
            </FCard>
            <FCard bodyClassName="p-0">
                {isLoading ? <FLoading /> : !rows.length ? <FEmpty icon={ScrollText} title="Nothing logged for these filters" /> : (
                    <FTable head={["When", "Action", "Record", "Student", "Amount", "Reason"]}>
                        {rows.map((r: any) => (
                            <tr key={r._id}>
                                <td className={`${td} whitespace-nowrap text-xs`}>{new Date(r.performed_at).toLocaleString()}</td>
                                <td className={td}><FBadge tone={toneFor(r.action)}>{ACTIONS.find(x => x[0] === r.action)?.[1] || r.action}</FBadge></td>
                                <td className={`${td} font-mono text-xs`}>{r.invoice_no || r.receipt_no || r.entity_type}</td>
                                <td className={td}>{r.student_name || "—"}</td>
                                <td className={`${td} font-semibold`}>{r.amount != null ? money(r.amount) : "—"}</td>
                                <td className={`${td} text-slate-500 max-w-xs`}>{r.reason || "—"}</td>
                            </tr>
                        ))}
                    </FTable>
                )}
                {meta.pages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
                        <span>{meta.total} entries · page {meta.page} of {meta.pages}</span>
                        <div className="flex gap-2">
                            <FButton size="sm" variant="secondary" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</FButton>
                            <FButton size="sm" variant="secondary" disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight className="w-3.5 h-3.5" /></FButton>
                        </div>
                    </div>
                )}
            </FCard>
        </FeesPage>
    );
}
