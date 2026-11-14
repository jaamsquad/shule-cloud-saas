/**
 * Subjects → Subjects we offer: tick the subjects the school teaches from the built-in list.
 * Ticked subjects become the school's subjects (classes, exams, marks, report cards).
 */
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BookOpenCheck, Loader2, Route } from "lucide-react";
import api from "@/lib/api";
import SubjectPicker from "@/components/subjects/SubjectPicker";
import { useSubjectCatalog } from "@/lib/subjectCatalog";

const INK = "#1f2937";
const border = { border: "0.5px solid #e5e7eb" };

export default function SubjectsOffered() {
    const nav = useNavigate();
    const qc = useQueryClient();
    const { data: catalog, isLoading } = useSubjectCatalog();
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [dirty, setDirty] = useState(false);
    useEffect(() => { if (catalog) { setSel(new Set(catalog.subjects.filter(s => s.offered).map(s => s.key))); setDirty(false); } }, [catalog]);

    const save = useMutation({
        mutationFn: async () => (await api.put("/subject-catalog/offered", { keys: [...sel] })).data,
        onSuccess: (d: { message?: string }) => {
            toast.success(d.message || "Saved");
            ["subject_catalog", "subjects", "cbc_subjects", "pathways"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
            setDirty(false);
        },
        onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || "Could not save"),
    });

    return (
        <div className="min-h-screen bg-[#f6f7fb] p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ background: INK }}><BookOpenCheck className="w-5 h-5" /></div>
                        <div><h1 className="text-xl font-black" style={{ color: INK }}>Subjects we offer</h1><p className="text-xs text-slate-500">Tick the subjects your school teaches. They're used for classes, exams, marks and report cards.</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => nav("/subjects/pathways")} className="h-10 px-3 rounded-xl text-sm font-bold bg-white flex items-center gap-1.5" style={{ ...border, color: INK }}><Route className="w-4 h-4" /> Pathways</button>
                        <button disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="h-10 px-5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-50" style={{ background: "#0f766e" }}>{save.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save ({sel.size})</button>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 sm:p-6" style={border}>
                    {isLoading ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                        : <SubjectPicker catalog={catalog} value={sel} onChange={v => { setSel(v); setDirty(true); }} />}
                </div>
                {!!catalog?.custom.length && (
                    <div className="bg-white rounded-2xl p-4" style={border}>
                        <h3 className="text-sm font-black mb-2" style={{ color: INK }}>Your own subjects</h3>
                        <p className="text-xs text-slate-500 mb-2">Subjects your school added that aren't on the built-in list. Manage them under Subjects → All Subjects.</p>
                        <div className="flex flex-wrap gap-2">{catalog.custom.map(c => <span key={c._id} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">{c.name}</span>)}</div>
                    </div>
                )}
                <p className="text-[11px] text-slate-400">Unticking a subject hides it. A subject that already has marks or is on a class is kept with its history, and comes back if you tick it again.</p>
            </div>
        </div>
    );
}
