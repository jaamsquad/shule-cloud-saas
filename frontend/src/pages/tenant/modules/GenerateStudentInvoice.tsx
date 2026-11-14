import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Plus, Trash2, Sparkles, AlertTriangle, FileText, CheckCircle2, Bus, Info } from "lucide-react";
import api from "@/lib/api";
import {
    FeesPage, FCard, FButton, FField, FInput, FSelect, FEmpty, FLoading, FBadge, StudentPicker, PickedStudent, money, td,
} from "@/components/fees/FeesUI";
import { useTerms, TermPicker } from "@/components/fees/TermPicker";

// One student's invoice for a term. The fee structure and amounts come from the server using
// the same rules as the class-wide run (their class + this term, transport by zone, tuition by
// class); you can then adjust lines and the discount before generating.

type Line = { category: string; amount: number; description?: string; is_required?: boolean };
const in14 = () => new Date(Date.now() + 14 * 864e5).toISOString().split("T")[0];

export default function GenerateStudentInvoice() {
    const navigate = useNavigate();
    const t = useTerms();
    const [picked, setPicked] = useState<PickedStudent[]>([]);
    const student = picked[0];
    const [structureId, setStructureId] = useState("");
    const [lines, setLines] = useState<Line[]>([]);
    const [discountType, setDiscountType] = useState<"NONE" | "FIXED" | "PERCENTAGE">("NONE");
    const [discountValue, setDiscountValue] = useState(0);
    const [dueDate, setDueDate] = useState(in14());
    const [saving, setSaving] = useState(false);

    useEffect(() => { setStructureId(""); }, [student?._id, t.yearId, t.termId]);
    const { data: pv, isFetching, isLoading } = useQuery<any>({
        queryKey: ["invoice_preview", student?._id, t.yearId, t.termId, structureId],
        enabled: !!student && !!t.yearId && !!t.termId,
        queryFn: async () => (await api.get("/schools/default/fees/invoice-preview", { params: { student_id: student!._id, academic_year_id: t.yearId, semester_id: t.termId, structure_id: structureId || undefined } })).data?.data,
    });
    const { data: particulars = [] } = useQuery<any[]>({
        queryKey: ["all_fee_particulars"],
        queryFn: async () => { const r = await api.get("/fee_particulars"); return Array.isArray(r.data) ? r.data.flatMap((c: any) => c.particulars || []) : (r.data?.particulars || []); },
    });
    const labels = useMemo(() => Array.from(new Set(particulars.map((p: any) => p.label).filter(Boolean))) as string[], [particulars]);

    // Load the server's plan into the editable form
    useEffect(() => {
        const p = pv?.plan;
        setLines(p ? p.line_items.map((l: any) => ({ category: l.category, amount: Number(l.amount) || 0, description: l.description || "", is_required: l.is_required })) : []);
        setDiscountType(p?.discount_type || "NONE");
        setDiscountValue(Number(p?.discount_value) || 0);
    }, [pv]);

    const subtotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const discount = Math.min(subtotal, discountType === "FIXED" ? discountValue : discountType === "PERCENTAGE" ? (subtotal * discountValue) / 100 : 0);
    const total = Math.max(0, subtotal - discount);
    const dupCats = lines.map(l => l.category.trim().toLowerCase()).filter((c, i, a) => c && a.indexOf(c) !== i);
    const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
    const addLine = () => {
        const free = labels.find(l => !lines.some(x => x.category === l)) || "OTHERS";
        const p = particulars.find((x: any) => x.label === free);
        setLines(ls => [...ls, { category: free, amount: Number(p?.amount) || 0, is_required: false }]);
    };

    const generate = async () => {
        if (!student || !pv?.plan) return;
        if (!lines.length) return toast.error("Add at least one line");
        if (lines.some(l => !l.category.trim())) return toast.error("Every line needs a name");
        if (dupCats.length) return toast.error(`"${dupCats[0]}" appears twice`);
        setSaving(true);
        try {
            const r = await api.post("/schools/default/invoices", {
                student_id: student._id, class_id: pv.student.className || "—", academic_year_id: t.yearId, semester_id: t.termId,
                fee_structure_id: structureId || pv.plan.structureId, due_date: dueDate,
                override_items: lines.map(l => ({ ...l, amount: Number(l.amount) || 0 })), discount_type: discountType, discount_value: discountValue,
            });
            toast.success("Invoice created");
            const id = r.data?.data?._id;
            navigate(id ? `/fees/invoice/${id}` : "/fees/invoices");
        } catch (e: any) { toast.error(e.response?.data?.errors?.[0]?.message || e.response?.data?.message || "Could not create the invoice"); }
        finally { setSaving(false); }
    };

    const rankLabel = (r: number) => (r === 3 ? "this term" : r === 2 ? "same term (by name)" : "no term set");

    return (
        <FeesPage wide title="Generate Per Student" icon={UserPlus}
            subtitle="One learner's invoice for a term — worked out from their class and fee structure, then adjust if needed."
            actions={<TermPicker t={t} />}>
            <div className="grid lg:grid-cols-[360px_1fr] gap-5">
                <div className="space-y-5">
                    <FCard title="1 · Learner" icon={UserPlus}>
                        <StudentPicker value={picked} onChange={setPicked} />
                        {student && pv?.student && (
                            <div className="mt-4 rounded-xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-2">
                                <p className="text-base font-bold text-slate-900">{pv.student.name}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {student.reg && <FBadge tone="slate">Adm {student.reg}</FBadge>}
                                    <FBadge tone="indigo">{pv.student.className || "No class"}</FBadge>
                                    {pv.student.transportZone ? <FBadge tone="emerald"><Bus className="w-3 h-3" /> {pv.student.transportZone}</FBadge> : <FBadge tone="slate">No transport</FBadge>}
                                </div>
                            </div>
                        )}
                    </FCard>

                    {student && (
                        <FCard title="2 · Fee structure" icon={FileText}>
                            {isLoading ? <FLoading /> : (
                                <div className="space-y-3">
                                    <FSelect value={structureId || pv?.plan?.structureId || ""} onChange={e => setStructureId(e.target.value)}>
                                        {!pv?.plan && <option value="">— Choose a fee structure —</option>}
                                        {(pv?.structures || []).map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name} · {s.classes.length ? s.classes.slice(0, 3).join(", ") : "all classes"} ({rankLabel(s.rank)})</option>
                                        ))}
                                    </FSelect>
                                    {pv?.plan && <p className="text-xs text-slate-500 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {pv.plan.how}</p>}
                                    {pv?.problem && !structureId && (
                                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                                            <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {pv.problem}</p>
                                            <p className="mt-1">Choose one above, or <Link to="/settings/fees-structure" className="underline font-semibold">set one up for {t.label}</Link>.</p>
                                        </div>
                                    )}
                                    {!pv?.structures?.length && <p className="text-xs text-slate-400">No fee structures exist for {t.label}.</p>}
                                </div>
                            )}
                        </FCard>
                    )}

                    {pv?.existing && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <p className="font-semibold flex items-center gap-1.5"><Info className="w-4 h-4" /> Already invoiced for {t.label}</p>
                            <p className="text-xs mt-1">{pv.existing.invoice_no} · {money(pv.existing.total_due)} · balance {money(pv.existing.balance)} · {String(pv.existing.status).toLowerCase()}</p>
                            <Link to={`/fees/invoice/${pv.existing.id}`} className="text-xs font-semibold underline mt-1 inline-block">Open it</Link>
                        </div>
                    )}
                </div>

                <FCard title="3 · Invoice" subtitle={t.label} icon={FileText} bodyClassName="p-0"
                    actions={pv?.plan && <FButton size="sm" variant="secondary" icon={Plus} onClick={addLine}>Add line</FButton>}>
                    {!student ? <FEmpty icon={UserPlus} title="Search for a learner" hint="Their class, fee structure and amounts fill in automatically." />
                        : isLoading ? <FLoading label="Working out the invoice…" />
                        : !pv?.plan ? <FEmpty icon={AlertTriangle} title="No fee structure for this term" hint="Choose one on the left." />
                        : (
                            <div className={isFetching ? "opacity-60 transition-opacity" : ""}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400"><th className="px-5 py-2.5">Item</th><th className="px-4 py-2.5 w-44 text-right">Amount (KSh)</th><th className="w-12" /></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {lines.map((l, i) => (
                                                <tr key={i}>
                                                    <td className={`${td} pl-5`}>
                                                        <FInput list="fee-particulars" value={l.category} onChange={e => setLine(i, { category: e.target.value })} className={dupCats.includes(l.category.trim().toLowerCase()) ? "!border-rose-300" : ""} />
                                                    </td>
                                                    <td className={td}><FInput type="number" min={0} value={l.amount} onChange={e => setLine(i, { amount: parseFloat(e.target.value) || 0 })} className="text-right font-semibold" /></td>
                                                    <td className={td}><button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button></td>
                                                </tr>
                                            ))}
                                            {!lines.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-400">No lines — add one.</td></tr>}
                                        </tbody>
                                    </table>
                                    <datalist id="fee-particulars">{labels.map(l => <option key={l} value={l} />)}<option value="OTHERS" /><option value="ADJUSTMENT" /></datalist>
                                </div>
                                {pv.plan.notes?.length > 0 && <p className="px-5 pt-3 text-xs text-slate-500 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#5C67F2]" /> {pv.plan.notes.join(" · ")}</p>}

                                <div className="p-5 grid md:grid-cols-[1fr_300px] gap-5 border-t border-slate-100 mt-3">
                                    <div className="grid sm:grid-cols-3 gap-3 content-start">
                                        <FField label="Discount">
                                            <FSelect value={discountType} onChange={e => { setDiscountType(e.target.value as any); setDiscountValue(0); }}>
                                                <option value="NONE">None</option><option value="FIXED">Fixed amount</option><option value="PERCENTAGE">Percentage</option>
                                            </FSelect>
                                        </FField>
                                        {discountType !== "NONE" && <FField label={discountType === "FIXED" ? "Amount (KSh)" : "Percent (%)"}><FInput type="number" min={0} max={discountType === "PERCENTAGE" ? 100 : undefined} value={discountValue} onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))} /></FField>}
                                        <FField label="Due date" required><FInput type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></FField>
                                        <p className="sm:col-span-3 text-xs text-slate-400">Scholarships and carried-over credit are applied automatically when the invoice is created.</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
                                        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-semibold">{money(subtotal)}</span></div>
                                        <div className="flex justify-between text-slate-600"><span>Discount</span><span className="font-semibold text-rose-600">− {money(discount)}</span></div>
                                        <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-bold text-slate-800">Total due</span><span className="text-lg font-extrabold text-slate-900">{money(total)}</span></div>
                                        <FButton className="w-full mt-2" loading={saving} disabled={!!pv.existing || !lines.length} onClick={generate}>{pv.existing ? "Already invoiced this term" : "Create invoice"}</FButton>
                                    </div>
                                </div>
                            </div>
                        )}
                </FCard>
            </div>
        </FeesPage>
    );
}
