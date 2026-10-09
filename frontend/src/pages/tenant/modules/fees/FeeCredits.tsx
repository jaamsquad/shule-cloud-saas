import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, Users, History, Search } from "lucide-react";
import api from "@/lib/api";
import { FeesPage, FCard, FStat, FBadge, FEmpty, FLoading, FTable, FInput, td, money, fmtDate } from "@/components/fees/FeesUI";

/** Overpayments carried forward: who holds credit and how it has moved. */
export default function FeeCredits() {
    const [q, setQ] = useState("");
    const { data, isLoading } = useQuery({ queryKey: ["fee_credits"], queryFn: async () => (await api.get("/fees/credits")).data });
    const students = (data?.students || []).filter((s: any) => !q || `${s.studentName} ${s.registrationNo} ${s.className}`.toLowerCase().includes(q.toLowerCase()));
    return (
        <FeesPage title="Credits & Overpayments" icon={PiggyBank}
            subtitle="When a student pays more than they owe, the extra is kept as credit and used automatically on their next invoice.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <FStat label="Total credit held" value={money(data?.total)} icon={PiggyBank} tone="emerald" loading={isLoading} />
                <FStat label="Students with credit" value={data?.students?.length ?? 0} icon={Users} loading={isLoading} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <FCard className="xl:col-span-3" title="Students holding credit" icon={Users} bodyClassName="p-0"
                    actions={<div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><FInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="w-52 h-9 pl-9" /></div>}>
                    {isLoading ? <FLoading /> : !students.length ? <FEmpty icon={PiggyBank} title="No students hold credit" hint="Overpayments will show here." /> : (
                        <FTable head={["Student", "Class", "Credit"]}>
                            {students.map((s: any) => (
                                <tr key={s.studentId}>
                                    <td className={td}><p className="font-semibold text-slate-800">{s.studentName}</p><p className="text-xs text-slate-400">{s.registrationNo}</p></td>
                                    <td className={td}>{s.className || "—"}</td>
                                    <td className={`${td} font-bold text-emerald-600`}>{money(s.credit)}</td>
                                </tr>
                            ))}
                        </FTable>
                    )}
                </FCard>
                <FCard className="xl:col-span-2" title="Recent movements" icon={History} bodyClassName="p-0">
                    {isLoading ? <FLoading /> : !data?.movements?.length ? <FEmpty icon={History} title="No movements yet" /> : (
                        <ul className="divide-y divide-slate-100">
                            {data.movements.map((m: any) => (
                                <li key={m._id} className="px-5 py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{m.studentName || m.registrationNo || "Student"}</p>
                                        <p className="text-xs text-slate-400">{m.reason}{m.invoiceNo ? ` · ${m.invoiceNo}` : ""}{m.receipt ? ` · ${m.receipt}` : ""} · {fmtDate(m.createdAt)}</p>
                                    </div>
                                    <FBadge tone={m.amount >= 0 ? "emerald" : "amber"}>{m.amount >= 0 ? "+" : "−"}{money(Math.abs(m.amount))}</FBadge>
                                </li>
                            ))}
                        </ul>
                    )}
                </FCard>
            </div>
        </FeesPage>
    );
}
