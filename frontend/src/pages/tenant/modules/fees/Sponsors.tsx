import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandHeart, Plus, Pencil, Trash2, Users, Wallet, Building2, Phone, Mail, ArrowLeft, Banknote, UserPlus, Receipt } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
    FeesPage, FCard, FStat, FBadge, FButton, FField, FInput, FSelect, FTextarea, FEmpty, FLoading, FTable, td,
    FModal, StudentPicker, PickedStudent, money, fmtDate, statusTone,
} from "@/components/fees/FeesUI";

const err = (e: any) => e?.response?.data?.message || e?.message || "Something went wrong";
const TYPES = [["organisation", "Organisation / Company"], ["ngo", "NGO / Foundation"], ["government", "Government / CDF"], ["religious", "Church / Religious"], ["alumni", "Alumni"], ["individual", "Individual"]];
const coverageLabel = (c: string, v: number) => (c === "full" ? "Full fees" : c === "percent" ? `${v}% of fees` : `Up to ${money(v)}`);

export default function Sponsors() {
    const qc = useQueryClient();
    const [selected, setSelected] = useState<string | null>(null);
    const [sponsorModal, setSponsorModal] = useState<any | null>(null);

    const summary = useQuery({ queryKey: ["sp_summary"], queryFn: async () => (await api.get("/fees/sponsors/summary")).data });
    const sponsors = useQuery({ queryKey: ["sp_list"], queryFn: async () => (await api.get("/fees/sponsors")).data as any[] });
    const refresh = () => ["sp_summary", "sp_list", "sp_detail"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));

    if (selected) return <SponsorDetail id={selected} onBack={() => setSelected(null)} onEdit={s => setSponsorModal(s)} onChanged={refresh} modal={
        <SponsorModal sponsor={sponsorModal} onClose={() => setSponsorModal(null)} onSaved={refresh} />
    } />;

    const s = summary.data || {};
    return (
        <FeesPage
            title="Sponsors"
            subtitle="Organisations and people who pay fees for students. Sponsor money is posted as normal payments on each student's invoices."
            icon={HandHeart}
            actions={<FButton icon={Plus} onClick={() => setSponsorModal({})}>Add Sponsor</FButton>}
        >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <FStat label="Active sponsors" value={s.sponsors ?? 0} icon={HandHeart} loading={summary.isLoading} />
                <FStat label="Sponsored students" value={s.sponsoredStudents ?? 0} icon={Users} tone="emerald" loading={summary.isLoading} />
                <FStat label="Received from sponsors" value={money(s.totalReceived)} icon={Wallet} tone="amber" loading={summary.isLoading} />
            </div>

            {sponsors.isLoading ? <FLoading /> : !sponsors.data?.length ? (
                <FCard><FEmpty icon={HandHeart} title="No sponsors yet" hint="Add a sponsor (e.g. a CDF office, a church or a company), link the students they support, then record their payments."
                    action={<FButton icon={Plus} onClick={() => setSponsorModal({})}>Add Sponsor</FButton>} /></FCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sponsors.data.map(sp => (
                        <button key={sp._id} onClick={() => setSelected(sp._id)} className="text-left">
                            <FCard className="h-full hover:border-indigo-200 hover:shadow-md transition-all">
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-[#5C67F2] flex items-center justify-center font-extrabold shrink-0">{sp.name?.[0]}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900 truncate">{sp.name}</h3>
                                            {sp.active === false && <FBadge tone="slate">inactive</FBadge>}
                                        </div>
                                        <p className="text-xs text-slate-400 capitalize">{TYPES.find(t => t[0] === sp.type)?.[1] || sp.type}</p>
                                        {sp.contactPerson && <p className="text-xs text-slate-500 mt-1 truncate">{sp.contactPerson}{sp.phone ? ` · ${sp.phone}` : ""}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
                                    <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Students</p><p className="font-extrabold text-slate-900">{sp.students}</p></div>
                                    <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paid to date</p><p className="font-extrabold text-emerald-600">{money(sp.totalPaid)}</p></div>
                                </div>
                            </FCard>
                        </button>
                    ))}
                </div>
            )}
            <SponsorModal sponsor={sponsorModal} onClose={() => setSponsorModal(null)} onSaved={refresh} />
        </FeesPage>
    );
}

function SponsorDetail({ id, onBack, onEdit, onChanged, modal }: { id: string; onBack: () => void; onEdit: (s: any) => void; onChanged: () => void; modal: React.ReactNode }) {
    const qc = useQueryClient();
    const [linkOpen, setLinkOpen] = useState(false);
    const [payOpen, setPayOpen] = useState(false);
    const [editShip, setEditShip] = useState<any | null>(null);
    const detail = useQuery({ queryKey: ["sp_detail", id], queryFn: async () => (await api.get(`/fees/sponsors/${id}`)).data });
    const refresh = () => { qc.invalidateQueries({ queryKey: ["sp_detail", id] }); onChanged(); };

    const endShip = useMutation({
        mutationFn: async (sid: string) => (await api.delete(`/fees/sponsorships/${sid}`)).data,
        onSuccess: (r: any) => { toast.success(r.ended ? "Sponsorship ended" : "Student removed from sponsor"); refresh(); },
        onError: (e) => toast.error(err(e)),
    });
    const removeSponsor = useMutation({
        mutationFn: async () => (await api.delete(`/fees/sponsors/${id}`)).data,
        onSuccess: (r: any) => { toast.success(r.deactivated ? "Sponsor deactivated (has payment history)" : "Sponsor removed"); onChanged(); onBack(); },
        onError: (e) => toast.error(err(e)),
    });

    const d = detail.data;
    const sp = d?.sponsor;
    return (
        <FeesPage
            title={sp?.name || "Sponsor"}
            subtitle={sp ? `${TYPES.find(t => t[0] === sp.type)?.[1] || sp.type}${sp.active === false ? " · inactive" : ""}` : undefined}
            icon={HandHeart}
            actions={<>
                <FButton variant="secondary" icon={ArrowLeft} onClick={onBack}>All sponsors</FButton>
                {sp && <FButton variant="secondary" icon={Pencil} onClick={() => onEdit(sp)}>Edit</FButton>}
                {sp && <FButton variant="secondary" icon={Trash2} className="text-rose-600" onClick={() => confirm(`Remove ${sp.name}?`) && removeSponsor.mutate()}>Remove</FButton>}
                {sp?.active !== false && <FButton icon={Banknote} onClick={() => setPayOpen(true)} disabled={!d?.students?.length}>Record Payment</FButton>}
            </>}
        >
            {detail.isLoading || !d ? <FLoading /> : <>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                    <FCard className="lg:col-span-1" title="Contact" icon={Building2}>
                        <div className="space-y-2 text-sm">
                            <p className="font-semibold text-slate-800">{sp.contactPerson || "—"}</p>
                            {sp.phone && <p className="flex items-center gap-2 text-slate-600"><Phone className="w-3.5 h-3.5 text-slate-400" />{sp.phone}</p>}
                            {sp.email && <p className="flex items-center gap-2 text-slate-600 break-all"><Mail className="w-3.5 h-3.5 text-slate-400" />{sp.email}</p>}
                            {sp.address && <p className="text-slate-500">{sp.address}</p>}
                            {sp.notes && <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">{sp.notes}</p>}
                        </div>
                    </FCard>
                    <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FStat label="Students sponsored" value={d.students.filter((x: any) => x.status === "active").length} icon={Users} />
                        <FStat label="Expected now" value={money(d.totals.expected)} icon={Receipt} tone="amber" hint="Sponsor's share of current balances" />
                        <FStat label="Paid to date" value={money(d.totals.paid)} icon={Wallet} tone="emerald" hint={sp.unallocated > 0 ? `${money(sp.unallocated)} unallocated` : undefined} />
                    </div>
                </div>

                <FCard title="Sponsored students" icon={Users} className="mb-6" bodyClassName="p-0"
                    actions={sp.active !== false && <FButton size="sm" icon={UserPlus} onClick={() => setLinkOpen(true)}>Add students</FButton>}>
                    {!d.students.length ? (
                        <FEmpty icon={Users} title="No students linked" hint="Link the students this sponsor pays for." action={<FButton icon={UserPlus} onClick={() => setLinkOpen(true)}>Add students</FButton>} />
                    ) : (
                        <FTable head={["Student", "Coverage", "Period", "Outstanding", "Sponsor's share", "Paid by sponsor", "Status", ""]}>
                            {d.students.map((x: any) => (
                                <tr key={x._id}>
                                    <td className={td}><p className="font-semibold text-slate-800">{x.studentName}</p><p className="text-xs text-slate-400">{x.registrationNo} · {x.className}</p></td>
                                    <td className={td}>{coverageLabel(x.coverage, x.value)}</td>
                                    <td className={`${td} text-xs text-slate-500 whitespace-nowrap`}>{x.startDate ? fmtDate(x.startDate) : "Now"} – {x.endDate ? fmtDate(x.endDate) : "Open"}</td>
                                    <td className={`${td} font-semibold ${x.outstanding > 0 ? "text-rose-600" : "text-slate-400"}`}>{money(x.outstanding)}</td>
                                    <td className={`${td} font-semibold text-amber-600`}>{money(x.expected)}</td>
                                    <td className={`${td} font-semibold text-emerald-600`}>{money(x.totalPaid)}</td>
                                    <td className={td}><FBadge tone={statusTone(x.status)}>{x.status}</FBadge></td>
                                    <td className={`${td} text-right whitespace-nowrap`}>
                                        <FButton size="sm" variant="ghost" icon={Pencil} onClick={() => setEditShip(x)} />
                                        {x.status !== "ended" && <FButton size="sm" variant="ghost" icon={Trash2} className="text-rose-500" onClick={() => confirm(`End sponsorship for ${x.studentName}?`) && endShip.mutate(x._id)} />}
                                    </td>
                                </tr>
                            ))}
                        </FTable>
                    )}
                </FCard>

                <FCard title="Payments received" icon={Banknote} bodyClassName="p-0">
                    {!d.payments.length ? <FEmpty icon={Banknote} title="No payments recorded yet" /> : (
                        <FTable head={["Date", "Amount", "Method", "Reference", "Split", "Unallocated"]}>
                            {d.payments.map((p: any) => (
                                <tr key={p._id}>
                                    <td className={`${td} whitespace-nowrap`}>{fmtDate(p.payment_date)}</td>
                                    <td className={`${td} font-bold text-slate-900`}>{money(p.amount)}</td>
                                    <td className={td}><FBadge tone="sky">{p.method}</FBadge></td>
                                    <td className={`${td} font-mono text-xs`}>{p.reference || "—"}</td>
                                    <td className={`${td} text-xs`}>
                                        {p.allocations?.length ? p.allocations.map((a: any) => <div key={a.studentId}>{a.studentName}: <b>{money(a.amount)}</b> <span className="text-slate-400">({a.receipts?.join(", ")})</span></div>) : <span className="text-slate-400">—</span>}
                                    </td>
                                    <td className={`${td} ${p.unallocated > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}`}>{money(p.unallocated)}</td>
                                </tr>
                            ))}
                        </FTable>
                    )}
                </FCard>

                <LinkStudentsModal open={linkOpen} sponsorId={id} onClose={() => setLinkOpen(false)} onSaved={refresh} />
                <PaymentModal open={payOpen} sponsor={sp} students={d.students.filter((x: any) => x.status === "active")} onClose={() => setPayOpen(false)} onSaved={refresh} />
                <EditShipModal ship={editShip} onClose={() => setEditShip(null)} onSaved={refresh} />
            </>}
            {modal}
        </FeesPage>
    );
}

function SponsorModal({ sponsor, onClose, onSaved }: { sponsor: any | null; onClose: () => void; onSaved: () => void }) {
    const editing = !!sponsor?._id;
    const [f, setF] = useState<any>({});
    const [lastId, setLastId] = useState<string | undefined>();
    if (sponsor && (sponsor._id ?? "new") !== lastId) {
        setLastId(sponsor._id ?? "new");
        setF({ name: "", type: "organisation", contactPerson: "", phone: "", email: "", address: "", notes: "", active: true, ...sponsor });
    }
    const close = () => { setLastId(undefined); onClose(); };
    const save = useMutation({
        mutationFn: async () => editing ? api.put(`/fees/sponsors/${sponsor._id}`, f) : api.post("/fees/sponsors", f),
        onSuccess: () => { toast.success(editing ? "Sponsor updated" : "Sponsor added"); onSaved(); close(); },
        onError: (e) => toast.error(err(e)),
    });
    return (
        <FModal open={!!sponsor} title={editing ? "Edit sponsor" : "Add sponsor"} onClose={close}
            footer={<><FButton variant="secondary" onClick={close}>Cancel</FButton><FButton loading={save.isPending} onClick={() => save.mutate()}>Save</FButton></>}>
            <div className="grid grid-cols-2 gap-4">
                <FField label="Sponsor name" required className="col-span-2"><FInput value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Kilimani NG-CDF" /></FField>
                <FField label="Type" className="col-span-2">
                    <FSelect value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</FSelect>
                </FField>
                <FField label="Contact person"><FInput value={f.contactPerson || ""} onChange={e => setF({ ...f, contactPerson: e.target.value })} /></FField>
                <FField label="Phone"><FInput value={f.phone || ""} onChange={e => setF({ ...f, phone: e.target.value })} /></FField>
                <FField label="Email" className="col-span-2"><FInput type="email" value={f.email || ""} onChange={e => setF({ ...f, email: e.target.value })} /></FField>
                <FField label="Address" className="col-span-2"><FInput value={f.address || ""} onChange={e => setF({ ...f, address: e.target.value })} /></FField>
                <FField label="Notes" className="col-span-2"><FTextarea value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></FField>
                {editing && (
                    <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={f.active !== false} onChange={e => setF({ ...f, active: e.target.checked })} className="accent-[#5C67F2] w-4 h-4" /> Active
                    </label>
                )}
            </div>
        </FModal>
    );
}

function LinkStudentsModal({ open, sponsorId, onClose, onSaved }: { open: boolean; sponsorId: string; onClose: () => void; onSaved: () => void }) {
    const [students, setStudents] = useState<PickedStudent[]>([]);
    const [coverage, setCoverage] = useState("full");
    const [value, setValue] = useState("");
    const [startDate, setStart] = useState("");
    const [endDate, setEnd] = useState("");
    const [notes, setNotes] = useState("");
    const save = useMutation({
        mutationFn: async () => (await api.post("/fees/sponsorships", { sponsorId, studentIds: students.map(s => s._id), coverage, value, startDate: startDate || null, endDate: endDate || null, notes })).data,
        onSuccess: (r: any) => {
            toast.success(`Linked ${r.created} student(s)${r.skipped?.length ? ` · ${r.skipped.length} already linked` : ""}`);
            setStudents([]); setValue(""); setNotes(""); onSaved(); onClose();
        },
        onError: (e) => toast.error(err(e)),
    });
    return (
        <FModal open={open} title="Add sponsored students" onClose={onClose} width="max-w-xl"
            footer={<><FButton variant="secondary" onClick={onClose}>Cancel</FButton><FButton icon={UserPlus} loading={save.isPending} disabled={!students.length} onClick={() => save.mutate()}>Link {students.length || ""} student{students.length === 1 ? "" : "s"}</FButton></>}>
            <div className="space-y-4">
                <FField label="Students" required><StudentPicker multiple value={students} onChange={setStudents} /></FField>
                <div className="grid grid-cols-2 gap-3">
                    <FField label="Sponsor covers">
                        <FSelect value={coverage} onChange={e => setCoverage(e.target.value)}>
                            <option value="full">Full fees</option><option value="percent">A percentage</option><option value="fixed">A fixed amount</option>
                        </FSelect>
                    </FField>
                    {coverage !== "full" && (
                        <FField label={coverage === "percent" ? "Percentage (%)" : "Amount per term (KSh)"} required>
                            <FInput type="number" min={0} value={value} onChange={e => setValue(e.target.value)} />
                        </FField>
                    )}
                    <FField label="Starts"><FInput type="date" value={startDate} onChange={e => setStart(e.target.value)} /></FField>
                    <FField label="Ends"><FInput type="date" value={endDate} onChange={e => setEnd(e.target.value)} /></FField>
                </div>
                <FField label="Notes"><FTextarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[64px]" placeholder="Agreement reference, conditions…" /></FField>
            </div>
        </FModal>
    );
}

function PaymentModal({ open, sponsor, students, onClose, onSaved }: { open: boolean; sponsor: any; students: any[]; onClose: () => void; onSaved: () => void }) {
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("BANK");
    const [reference, setReference] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [mode, setMode] = useState<"auto" | "manual">("auto");
    const [alloc, setAlloc] = useState<Record<string, string>>({});
    const allocTotal = Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0);
    const save = useMutation({
        mutationFn: async () => (await api.post(`/fees/sponsors/${sponsor._id}/payments`, {
            amount, method, reference, payment_date: date,
            allocations: mode === "manual" ? Object.entries(alloc).filter(([, v]) => Number(v) > 0).map(([studentId, v]) => ({ studentId, amount: Number(v) })) : undefined,
        })).data,
        onSuccess: (r: any) => {
            toast.success(`${money(r.amount)} recorded · ${r.allocations.length} student(s) credited${r.unallocated > 0 ? ` · ${money(r.unallocated)} kept as unallocated` : ""}`);
            setAmount(""); setReference(""); setAlloc({}); onSaved(); onClose();
        },
        onError: (e) => toast.error(err(e)),
    });
    const over = mode === "manual" && allocTotal > (Number(amount) || 0) + 0.009;
    return (
        <FModal open={open} title={`Record payment from ${sponsor?.name || "sponsor"}`} subtitle="Each student's share is posted as a fee payment with its own receipt." onClose={onClose} width="max-w-xl"
            footer={<><FButton variant="secondary" onClick={onClose}>Cancel</FButton><FButton icon={Banknote} loading={save.isPending} disabled={!Number(amount) || over} onClick={() => save.mutate()}>Record {amount ? money(amount) : "payment"}</FButton></>}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <FField label="Amount received (KSh)" required><FInput type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} /></FField>
                    <FField label="Date" required><FInput type="date" value={date} onChange={e => setDate(e.target.value)} /></FField>
                    <FField label="Method">
                        <FSelect value={method} onChange={e => setMethod(e.target.value)}>
                            <option value="BANK">Bank transfer</option><option value="CHEQUE">Cheque</option><option value="MPESA">M-PESA</option><option value="CASH">Cash</option>
                        </FSelect>
                    </FField>
                    <FField label="Reference"><FInput value={reference} onChange={e => setReference(e.target.value)} placeholder="Cheque / transaction no." /></FField>
                </div>
                <div className="flex gap-2">
                    <FButton size="sm" variant={mode === "auto" ? "primary" : "secondary"} onClick={() => setMode("auto")}>Split automatically</FButton>
                    <FButton size="sm" variant={mode === "manual" ? "primary" : "secondary"} onClick={() => setMode("manual")}>Choose amounts</FButton>
                </div>
                {mode === "auto" ? (
                    <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">The amount is shared across the sponsored students according to each one's coverage and current balance. Anything left over is kept on the sponsor as unallocated.</p>
                ) : (
                    <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {students.map(s => (
                            <div key={s.studentId} className="flex items-center justify-between gap-3 px-3 py-2">
                                <div className="min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{s.studentName}</p><p className="text-xs text-slate-400">Owes {money(s.outstanding)} · share {money(s.expected)}</p></div>
                                <FInput type="number" min={0} className="w-32" placeholder="0" value={alloc[s.studentId] || ""} onChange={e => setAlloc({ ...alloc, [s.studentId]: e.target.value })} />
                            </div>
                        ))}
                        <div className={`px-3 py-2 text-sm font-semibold flex justify-between ${over ? "text-rose-600" : "text-slate-600"}`}>
                            <span>Allocated</span><span>{money(allocTotal)} of {money(amount)}</span>
                        </div>
                    </div>
                )}
            </div>
        </FModal>
    );
}

function EditShipModal({ ship, onClose, onSaved }: { ship: any | null; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState<any>({});
    const [lastId, setLastId] = useState<string | undefined>();
    if (ship && ship._id !== lastId) {
        setLastId(ship._id);
        setF({ status: ship.status, coverage: ship.coverage, value: ship.value, startDate: ship.startDate?.slice?.(0, 10) || "", endDate: ship.endDate?.slice?.(0, 10) || "", notes: ship.notes || "" });
    }
    const close = () => { setLastId(undefined); onClose(); };
    const save = useMutation({
        mutationFn: async () => api.put(`/fees/sponsorships/${ship._id}`, { ...f, startDate: f.startDate || null, endDate: f.endDate || null }),
        onSuccess: () => { toast.success("Sponsorship updated"); onSaved(); close(); },
        onError: (e) => toast.error(err(e)),
    });
    return (
        <FModal open={!!ship} title={`Sponsorship — ${ship?.studentName || ""}`} onClose={close}
            footer={<><FButton variant="secondary" onClick={close}>Cancel</FButton><FButton loading={save.isPending} onClick={() => save.mutate()}>Save</FButton></>}>
            <div className="grid grid-cols-2 gap-4">
                <FField label="Status">
                    <FSelect value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>
                        <option value="active">Active</option><option value="suspended">Suspended</option><option value="ended">Ended</option>
                    </FSelect>
                </FField>
                <FField label="Covers">
                    <FSelect value={f.coverage} onChange={e => setF({ ...f, coverage: e.target.value })}>
                        <option value="full">Full fees</option><option value="percent">Percentage</option><option value="fixed">Fixed amount</option>
                    </FSelect>
                </FField>
                {f.coverage !== "full" && <FField label={f.coverage === "percent" ? "Percentage (%)" : "Amount (KSh)"} className="col-span-2"><FInput type="number" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></FField>}
                <FField label="Starts"><FInput type="date" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} /></FField>
                <FField label="Ends"><FInput type="date" value={f.endDate} onChange={e => setF({ ...f, endDate: e.target.value })} /></FField>
                <FField label="Notes" className="col-span-2"><FTextarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></FField>
            </div>
        </FModal>
    );
}
