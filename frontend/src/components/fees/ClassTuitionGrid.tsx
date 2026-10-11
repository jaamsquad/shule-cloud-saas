/**
 * Class tuition fees: each class's usual termly tuition, and — when it differs — its own
 * price for Term 1, Term 2 or Term 3. Terms are hard-coded and repeat every year, so there's
 * no year to pick — a price set for a term applies every year until changed. A blank term
 * cell means that term charges the usual tuition. Used on Fees → Class Tuition and in the
 * Fee Particulars / Fee Structure pop-ups. Server: /fees/class-tuition/grid (lib/classTuition).
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useModuleCrud } from "@/contexts/PermissionsContext";

type Grid = { terms: { _id: string; name: string; isActive?: boolean }[]; classes: { classId: string; className: string; usual: number | null; byTerm: Record<string, number> }[] };
const key = (classId: string, termNumber: string) => `${classId}|${termNumber}`;
const cellInp = "w-full h-9 pl-9 pr-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#5C67F2] text-xs font-black text-slate-700 text-right disabled:bg-slate-50";

export default function ClassTuitionGrid({ onSaved, compact }: { onSaved?: () => void; compact?: boolean }) {
    const qc = useQueryClient();
    const canEdit = useModuleCrud("fees").canUpdate;

    const { data: grid, isLoading } = useQuery<Grid>({
        queryKey: ["class_tuition_grid"],
        queryFn: async () => (await api.get("/fees/class-tuition/grid")).data,
    });
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!grid) return;
        const d: Record<string, string> = {};
        grid.classes.forEach(c => {
            d[key(c.classId, "")] = c.usual === null ? "" : String(c.usual);
            grid.terms.forEach(t => { d[key(c.classId, t._id)] = c.byTerm[t._id] === undefined ? "" : String(c.byTerm[t._id]); });
        });
        setDraft(d);
    }, [grid]);

    const original = useMemo(() => {
        const o: Record<string, string> = {};
        grid?.classes.forEach(c => { o[key(c.classId, "")] = c.usual === null ? "" : String(c.usual); grid.terms.forEach(t => { o[key(c.classId, t._id)] = c.byTerm[t._id] === undefined ? "" : String(c.byTerm[t._id]); }); });
        return o;
    }, [grid]);
    const changed = Object.keys(draft).filter(k => (draft[k] ?? "") !== (original[k] ?? ""));

    const save = async () => {
        if (!changed.length) { onSaved?.(); return; }
        setBusy(true);
        try {
            const cells = changed.map(k => { const [classId, termNumber] = k.split("|"); return { classId, termNumber, amount: draft[k] === "" ? null : Number(draft[k]) }; });
            const r = (await api.put("/fees/class-tuition/grid", { cells })).data;
            qc.setQueryData(["class_tuition_grid"], r);
            qc.invalidateQueries({ queryKey: ["class_tuition"] });
            qc.invalidateQueries({ queryKey: ["fee_particulars"] });
            toast.success("Class tuition fees saved");
            onSaved?.();
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not save class tuition fees"); } finally { setBusy(false); }
    };

    const terms = grid?.terms || [];
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <p className="text-[11px] font-semibold text-slate-500 flex-1 min-w-[220px]">
                    <b>Usual tuition</b> is charged every term. Type a price under a term only where that term is different — leave it blank to use the usual.
                </p>
            </div>

            {isLoading || !grid ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div>
            ) : grid.classes.length === 0 ? (
                <p className="py-10 text-center text-xs font-bold uppercase text-slate-400">No classes yet — set up classes in the Academics module.</p>
            ) : (
                <div className={`overflow-auto border border-slate-100 rounded-2xl ${compact ? "max-h-[52vh]" : ""}`}>
                    <table className="w-full text-sm min-w-[560px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                                <th className="py-3 px-4">Class</th>
                                <th className="py-3 px-2 w-36 text-[#5C67F2]">Usual tuition</th>
                                {terms.map(t => <th key={t._id} className="py-3 px-2 w-32">{t.name}{t.isActive ? " · Current" : ""}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {grid.classes.map(c => {
                                const usual = draft[key(c.classId, "")] ?? "";
                                return (
                                    <tr key={c.classId}>
                                        <td className="py-2 px-4 font-black text-slate-700 uppercase text-xs">{c.className}</td>
                                        <td className="py-2 px-2">
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">KES</span>
                                                <input type="number" min={0} disabled={!canEdit} value={usual} placeholder="0" onChange={e => setDraft(d => ({ ...d, [key(c.classId, "")]: e.target.value }))} className={cellInp + " border-[#5C67F2]/30"} />
                                            </div>
                                        </td>
                                        {terms.map(t => {
                                            const v = draft[key(c.classId, t._id)] ?? "";
                                            return (
                                                <td key={t._id} className="py-2 px-2">
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">KES</span>
                                                        <input type="number" min={0} disabled={!canEdit} value={v} placeholder={usual || "—"} title={v === "" ? "Uses the usual tuition" : `${t.name} price`}
                                                            onChange={e => setDraft(d => ({ ...d, [key(c.classId, t._id)]: e.target.value }))}
                                                            className={cellInp + (v === "" ? " placeholder:text-slate-300" : " border-amber-300 bg-amber-50/40")} />
                                                        {v !== "" && canEdit && (
                                                            <button type="button" title="Use the usual tuition" onClick={() => setDraft(d => ({ ...d, [key(c.classId, t._id)]: "" }))}
                                                                className="absolute -right-1.5 -top-1.5 w-4 h-4 rounded-full bg-slate-200 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {grid && terms.length === 0 && grid.classes.length > 0 && (
                <p className="text-[11px] font-bold text-slate-400">No terms set up yet — <Link to="/academic-system/years" className="text-[#5C67F2] underline">add terms</Link> to give a term its own price.</p>
            )}
            <div className="flex items-center justify-end gap-3">
                {!canEdit && <span className="mr-auto text-[11px] font-bold text-slate-400">You can view these amounts; changing them needs Fees edit permission.</span>}
                {changed.length > 0 && <span className="text-[11px] font-bold text-amber-600">{changed.length} unsaved change{changed.length === 1 ? "" : "s"}</span>}
                {canEdit && (
                    <button type="button" onClick={save} disabled={busy} className="h-10 px-6 bg-[#5C67F2] hover:bg-indigo-600 text-white text-xs font-black rounded-xl uppercase tracking-wider flex items-center gap-2 disabled:opacity-50">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                    </button>
                )}
            </div>
        </div>
    );
}

/** The grid in a pop-up (Fee Particulars, Fee Structure). */
export function ClassTuitionModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 bg-gradient-to-r from-[#5C67F2] to-indigo-500 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider">Class Tuition Fees</h3>
                        <p className="text-[10px] opacity-80 font-bold uppercase mt-0.5">Termly tuition fee · per class, per term</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5"><ClassTuitionGrid compact onSaved={onClose} /></div>
            </div>
        </div>
    );
}
