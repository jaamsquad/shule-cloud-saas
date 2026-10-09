import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, GraduationCap, Plus, Pencil, Trash2, Wand2, Undo2, Percent, Coins, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
    FeesPage, FCard, FStat, FBadge, FButton, FField, FInput, FSelect, FTextarea, FEmpty, FLoading, FTable, td,
    FModal, FTabs, StudentPicker, PickedStudent, money, fmtDate, statusTone,
} from "@/components/fees/FeesUI";

const err = (e: any) => e?.response?.data?.message || e?.message || "Something went wrong";
const valueLabel = (t: string, v: number) => (t === "percent" ? `${v}%` : money(v));

type Tab = "awards" | "schemes" | "history";

export default function Scholarships() {
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("awards");
    const [status, setStatus] = useState("active");
    const [search, setSearch] = useState("");
    const [schemeModal, setSchemeModal] = useState<any | null>(null);   // {} = new, object = edit
    const [awardModal, setAwardModal] = useState(false);
    const [editAward, setEditAward] = useState<any | null>(null);

    const summary = useQuery({ queryKey: ["sch_summary"], queryFn: async () => (await api.get("/fees/scholarships/summary")).data });
    const schemes = useQuery({ queryKey: ["sch_schemes"], queryFn: async () => (await api.get("/fees/scholarships/schemes")).data as any[] });
    const awards = useQuery({
        queryKey: ["sch_awards", status, search],
        queryFn: async () => (await api.get("/fees/scholarships/awards", { params: { status: status || undefined, search: search || undefined } })).data as any[],
    });
    const history = useQuery({ queryKey: ["sch_apps"], queryFn: async () => (await api.get("/fees/scholarships/applications")).data as any[], enabled: tab === "history" });

    const refresh = () => ["sch_summary", "sch_schemes", "sch_awards", "sch_apps"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));

    const apply = useMutation({
        mutationFn: async (id: string) => (await api.post(`/fees/scholarships/awards/${id}/apply`)).data,
        onSuccess: (r: any) => { toast.success(r.invoices ? `Applied ${money(r.amount)} across ${r.invoices} invoice(s)` : "No open invoices to apply to"); refresh(); },
        onError: (e) => toast.error(err(e)),
    });
    const removeAward = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/fees/scholarships/awards/${id}`)).data,
        onSuccess: (r: any) => { toast.success(r.ended ? "Award ended (it has discounted invoices, so it is kept for the record)" : "Award removed"); refresh(); },
        onError: (e) => toast.error(err(e)),
    });
    const removeScheme = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/fees/scholarships/schemes/${id}`)).data,
        onSuccess: () => { toast.success("Scheme deleted"); refresh(); },
        onError: (e) => toast.error(err(e)),
    });
    const reverse = useMutation({
        mutationFn: async (id: string) => (await api.post(`/fees/scholarships/applications/${id}/reverse`)).data,
        onSuccess: () => { toast.success("Discount reversed — the invoice total is restored"); refresh(); },
        onError: (e) => toast.error(err(e)),
    });

    const s = summary.data || {};
    return (
        <FeesPage
            title="Scholarships & Bursaries"
            subtitle="Discounts awarded to students. Live awards are deducted automatically on every new fee invoice."
            icon={Award}
            actions={<>
                <FButton variant="secondary" icon={Plus} onClick={() => setSchemeModal({})}>New Scheme</FButton>
                <FButton icon={GraduationCap} onClick={() => setAwardModal(true)} disabled={!schemes.data?.length}>Award Students</FButton>
            </>}
        >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <FStat label="Active schemes" value={s.schemes ?? 0} icon={Award} loading={summary.isLoading} />
                <FStat label="Students on awards" value={s.activeAwards ?? 0} icon={Users} tone="emerald" loading={summary.isLoading} />
                <FStat label="Total discounted" value={money(s.totalAwarded)} icon={Coins} tone="amber" hint="Across all invoices" loading={summary.isLoading} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <FTabs<Tab> value={tab} onChange={setTab} tabs={[
                    { value: "awards", label: "Awards", count: awards.data?.length },
                    { value: "schemes", label: "Schemes", count: schemes.data?.length },
                    { value: "history", label: "Applied to invoices" },
                ]} />
                {tab === "awards" && (
                    <div className="flex gap-2">
                        <FInput placeholder="Search student or scheme…" value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
                        <FSelect value={status} onChange={e => setStatus(e.target.value)} className="w-36">
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="ended">Ended</option>
                            <option value="">All</option>
                        </FSelect>
                    </div>
                )}
            </div>

            {tab === "awards" && (
                <FCard bodyClassName="p-0">
                    {awards.isLoading ? <FLoading /> : !awards.data?.length ? (
                        <FEmpty icon={GraduationCap} title="No awards here yet"
                            hint={schemes.data?.length ? "Award a scheme to students — it will be deducted from their fee invoices." : "Create a scheme first (e.g. “Sports Scholarship 50%”), then award it to students."}
                            action={schemes.data?.length ? <FButton icon={GraduationCap} onClick={() => setAwardModal(true)}>Award Students</FButton> : <FButton icon={Plus} onClick={() => setSchemeModal({})}>New Scheme</FButton>} />
                    ) : (
                        <FTable head={["Student", "Scheme", "Value", "Period", "Discounted so far", "Status", ""]}>
                            {awards.data.map(a => (
                                <tr key={a._id}>
                                    <td className={td}><p className="font-semibold text-slate-800">{a.studentName}</p><p className="text-xs text-slate-400">{a.registrationNo} · {a.className}</p></td>
                                    <td className={td}>{a.schemeName}</td>
                                    <td className={`${td} font-semibold`}>{valueLabel(a.valueType, a.value)}</td>
                                    <td className={`${td} text-xs text-slate-500 whitespace-nowrap`}>{a.startDate ? fmtDate(a.startDate) : "Now"} – {a.endDate ? fmtDate(a.endDate) : "Open"}</td>
                                    <td className={`${td} font-semibold text-emerald-600`}>{money(a.totalApplied)}</td>
                                    <td className={td}><FBadge tone={statusTone(a.status)}>{a.status}</FBadge></td>
                                    <td className={`${td} text-right whitespace-nowrap`}>
                                        {a.status === "active" && (
                                            <FButton size="sm" variant="secondary" icon={Wand2} loading={apply.isPending && apply.variables === a._id}
                                                onClick={() => apply.mutate(a._id)} title="Deduct from this student's current unpaid invoices">Apply now</FButton>
                                        )}
                                        <FButton size="sm" variant="ghost" icon={Pencil} onClick={() => setEditAward(a)} />
                                        <FButton size="sm" variant="ghost" icon={Trash2} className="text-rose-500"
                                            onClick={() => confirm(`Remove ${a.schemeName} from ${a.studentName}?`) && removeAward.mutate(a._id)} />
                                    </td>
                                </tr>
                            ))}
                        </FTable>
                    )}
                </FCard>
            )}

            {tab === "schemes" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {schemes.isLoading && <FLoading />}
                    {!schemes.isLoading && !schemes.data?.length && (
                        <FCard className="md:col-span-2 xl:col-span-3"><FEmpty icon={Award} title="No schemes yet" hint="A scheme is a type of award — e.g. Academic Excellence 25%, Staff Child KSh 10,000, Needy Bursary 100%."
                            action={<FButton icon={Plus} onClick={() => setSchemeModal({})}>New Scheme</FButton>} /></FCard>
                    )}
                    {schemes.data?.map(sc => (
                        <FCard key={sc._id}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FBadge tone={sc.kind === "bursary" ? "violet" : sc.kind === "discount" ? "sky" : "indigo"}>{sc.kind}</FBadge>
                                        {sc.active === false && <FBadge tone="slate">inactive</FBadge>}
                                    </div>
                                    <h3 className="font-bold text-slate-900">{sc.name}</h3>
                                    {sc.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{sc.description}</p>}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-extrabold text-[#5C67F2]">{valueLabel(sc.valueType, sc.value)}</p>
                                    <p className="text-[11px] text-slate-400">{sc.valueType === "percent" ? "of each invoice" : "off each invoice"}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-500"><b className="text-slate-700">{sc.activeAwards}</b> students · {money(sc.totalApplied)} discounted</p>
                                <div className="flex gap-1">
                                    <FButton size="sm" variant="ghost" icon={Pencil} onClick={() => setSchemeModal(sc)} />
                                    <FButton size="sm" variant="ghost" icon={Trash2} className="text-rose-500" onClick={() => confirm(`Delete scheme “${sc.name}”?`) && removeScheme.mutate(sc._id)} />
                                </div>
                            </div>
                        </FCard>
                    ))}
                </div>
            )}

            {tab === "history" && (
                <FCard bodyClassName="p-0">
                    {history.isLoading ? <FLoading /> : !history.data?.length ? (
                        <FEmpty icon={Coins} title="Nothing applied yet" hint="Discounts appear here each time an award is deducted from an invoice." />
                    ) : (
                        <FTable head={["Date", "Student", "Scheme", "Invoice", "Discount", ""]}>
                            {history.data.map(a => (
                                <tr key={a._id} className={a.reversed ? "opacity-50" : ""}>
                                    <td className={`${td} whitespace-nowrap`}>{fmtDate(a.createdAt)}</td>
                                    <td className={td}>{a.studentName}</td>
                                    <td className={td}>{a.schemeName}</td>
                                    <td className={`${td} font-mono text-xs`}>{a.invoiceNo || "—"}</td>
                                    <td className={`${td} font-semibold text-emerald-600`}>{money(a.amount)}</td>
                                    <td className={`${td} text-right`}>
                                        {a.reversed ? <FBadge tone="rose">reversed</FBadge> : (
                                            <FButton size="sm" variant="ghost" icon={Undo2} onClick={() => confirm("Reverse this discount? The invoice total goes back up.") && reverse.mutate(a._id)}>Reverse</FButton>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </FTable>
                    )}
                </FCard>
            )}

            <SchemeModal scheme={schemeModal} onClose={() => setSchemeModal(null)} onSaved={refresh} />
            <AwardModal open={awardModal} schemes={(schemes.data || []).filter(s => s.active !== false)} onClose={() => setAwardModal(false)} onSaved={refresh} />
            <EditAwardModal award={editAward} onClose={() => setEditAward(null)} onSaved={refresh} />
        </FeesPage>
    );
}

function SchemeModal({ scheme, onClose, onSaved }: { scheme: any | null; onClose: () => void; onSaved: () => void }) {
    const editing = !!scheme?._id;
    const [f, setF] = useState<any>({});
    const open = scheme !== null;
    const [lastId, setLastId] = useState<string | undefined>();
    if (open && (scheme?._id ?? "new") !== lastId) {
        setLastId(scheme?._id ?? "new");
        setF({ name: scheme?.name || "", kind: scheme?.kind || "scholarship", valueType: scheme?.valueType || "percent", value: scheme?.value ?? "", description: scheme?.description || "", active: scheme?.active !== false });
    }
    const save = useMutation({
        mutationFn: async () => editing ? api.put(`/fees/scholarships/schemes/${scheme._id}`, f) : api.post("/fees/scholarships/schemes", f),
        onSuccess: () => { toast.success(editing ? "Scheme updated" : "Scheme created"); onSaved(); setLastId(undefined); onClose(); },
        onError: (e) => toast.error(err(e)),
    });
    return (
        <FModal open={open} title={editing ? "Edit scheme" : "New scholarship scheme"} onClose={() => { setLastId(undefined); onClose(); }}
            footer={<><FButton variant="secondary" onClick={onClose}>Cancel</FButton><FButton loading={save.isPending} onClick={() => save.mutate()}>Save scheme</FButton></>}>
            <div className="grid grid-cols-2 gap-4">
                <FField label="Scheme name" required className="col-span-2"><FInput value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Academic Excellence Scholarship" /></FField>
                <FField label="Type">
                    <FSelect value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>
                        <option value="scholarship">Scholarship</option><option value="bursary">Bursary</option><option value="discount">Discount</option>
                    </FSelect>
                </FField>
                <FField label="Deduct as">
                    <FSelect value={f.valueType} onChange={e => setF({ ...f, valueType: e.target.value })}>
                        <option value="percent">Percentage of invoice</option><option value="fixed">Fixed amount per invoice</option>
                    </FSelect>
                </FField>
                <FField label={f.valueType === "percent" ? "Percentage (%)" : "Amount (KSh)"} required className="col-span-2"
                    hint={f.valueType === "percent" ? "100% clears the whole invoice." : "Deducted from each new fee invoice, never below what is already paid."}>
                    <div className="relative">
                        <FInput type="number" min={0} max={f.valueType === "percent" ? 100 : undefined} value={f.value} onChange={e => setF({ ...f, value: e.target.value })} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{f.valueType === "percent" ? <Percent className="w-4 h-4" /> : "KSh"}</span>
                    </div>
                </FField>
                <FField label="Description" className="col-span-2"><FTextarea value={f.description || ""} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Who qualifies, conditions…" /></FField>
                <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} className="accent-[#5C67F2] w-4 h-4" /> Scheme is active (can be awarded)
                </label>
            </div>
        </FModal>
    );
}

function AwardModal({ open, schemes, onClose, onSaved }: { open: boolean; schemes: any[]; onClose: () => void; onSaved: () => void }) {
    const [schemeId, setSchemeId] = useState("");
    const [students, setStudents] = useState<PickedStudent[]>([]);
    const [override, setOverride] = useState("");
    const [startDate, setStart] = useState("");
    const [endDate, setEnd] = useState("");
    const [notes, setNotes] = useState("");
    const [applyNow, setApplyNow] = useState(true);
    const scheme = schemes.find(s => s._id === schemeId);
    const reset = () => { setSchemeId(""); setStudents([]); setOverride(""); setStart(""); setEnd(""); setNotes(""); setApplyNow(true); };
    const save = useMutation({
        mutationFn: async () => (await api.post("/fees/scholarships/awards", {
            schemeId, studentIds: students.map(s => s._id), value: override || undefined, startDate: startDate || null, endDate: endDate || null, notes, applyNow,
        })).data,
        onSuccess: (r: any) => {
            toast.success(`Awarded to ${r.created} student(s)${r.skipped?.length ? ` · ${r.skipped.length} already had it` : ""}`);
            onSaved(); reset(); onClose();
        },
        onError: (e) => toast.error(err(e)),
    });
    return (
        <FModal open={open} title="Award a scholarship" subtitle="The discount is deducted on every new fee invoice while the award is active." onClose={onClose} width="max-w-xl"
            footer={<><FButton variant="secondary" onClick={onClose}>Cancel</FButton><FButton icon={GraduationCap} loading={save.isPending} disabled={!schemeId || !students.length} onClick={() => save.mutate()}>Award {students.length || ""} student{students.length === 1 ? "" : "s"}</FButton></>}>
            <div className="space-y-4">
                <FField label="Scheme" required>
                    <FSelect value={schemeId} onChange={e => setSchemeId(e.target.value)}>
                        <option value="">Choose a scheme…</option>
                        {schemes.map(s => <option key={s._id} value={s._id}>{s.name} — {valueLabel(s.valueType, s.value)}</option>)}
                    </FSelect>
                </FField>
                <FField label="Students" required hint="Search and pick one or more students.">
                    <StudentPicker multiple value={students} onChange={setStudents} />
                </FField>
                <div className="grid grid-cols-3 gap-3">
                    <FField label={`Value${scheme ? (scheme.valueType === "percent" ? " (%)" : " (KSh)") : ""}`} hint="Blank = scheme value">
                        <FInput type="number" min={0} value={override} onChange={e => setOverride(e.target.value)} placeholder={scheme ? String(scheme.value) : ""} />
                    </FField>
                    <FField label="Starts"><FInput type="date" value={startDate} onChange={e => setStart(e.target.value)} /></FField>
                    <FField label="Ends"><FInput type="date" value={endDate} onChange={e => setEnd(e.target.value)} /></FField>
                </div>
                <FField label="Notes"><FTextarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason, approval reference…" className="min-h-[64px]" /></FField>
                <label className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">
                    <input type="checkbox" checked={applyNow} onChange={e => setApplyNow(e.target.checked)} className="accent-[#5C67F2] w-4 h-4 mt-0.5" />
                    <span>Also deduct from the students’ <b>current unpaid invoices</b> now (otherwise it starts with the next invoice).</span>
                </label>
            </div>
        </FModal>
    );
}

function EditAwardModal({ award, onClose, onSaved }: { award: any | null; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState<any>({});
    const [lastId, setLastId] = useState<string | undefined>();
    if (award && award._id !== lastId) {
        setLastId(award._id);
        setF({ status: award.status, valueType: award.valueType, value: award.value, startDate: award.startDate?.slice?.(0, 10) || "", endDate: award.endDate?.slice?.(0, 10) || "", notes: award.notes || "" });
    }
    const save = useMutation({
        mutationFn: async () => api.put(`/fees/scholarships/awards/${award._id}`, { ...f, startDate: f.startDate || null, endDate: f.endDate || null }),
        onSuccess: () => { toast.success("Award updated"); onSaved(); setLastId(undefined); onClose(); },
        onError: (e) => toast.error(err(e)),
    });
    return (
        <FModal open={!!award} title={`Edit award — ${award?.studentName || ""}`} subtitle={award?.schemeName} onClose={() => { setLastId(undefined); onClose(); }}
            footer={<><FButton variant="secondary" onClick={onClose}>Cancel</FButton><FButton loading={save.isPending} onClick={() => save.mutate()}>Save</FButton></>}>
            <div className="grid grid-cols-2 gap-4">
                <FField label="Status">
                    <FSelect value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>
                        <option value="active">Active</option><option value="suspended">Suspended</option><option value="ended">Ended</option>
                    </FSelect>
                </FField>
                <FField label={f.valueType === "percent" ? "Value (%)" : "Value (KSh)"}>
                    <FInput type="number" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} />
                </FField>
                <FField label="Starts"><FInput type="date" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} /></FField>
                <FField label="Ends"><FInput type="date" value={f.endDate} onChange={e => setF({ ...f, endDate: e.target.value })} /></FField>
                <FField label="Notes" className="col-span-2"><FTextarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></FField>
                <p className="col-span-2 text-xs text-slate-400">Changes affect future invoices. Discounts already applied stay as they are (reverse them under “Applied to invoices” if needed).</p>
            </div>
        </FModal>
    );
}
