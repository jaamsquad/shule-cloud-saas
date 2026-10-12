/**
 * Exams → Printouts → School Rules: prints/downloads the SAME rules list a school keeps
 * under General Settings → Rules & Regulations (the `rules_regulations` document) — editing
 * it from either screen shows up on the other, instead of keeping a second separate copy.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Printer, Download, Save, Loader2, ScrollText } from "lucide-react";
import api from "@/lib/api";
import { useSchoolBrand, printBranded } from "@/lib/printDoc";
import { downloadHtmlAsPdf } from "@/lib/pdfDoc";
import { parseRulesContent, formatRulesContent } from "@/lib/rulesRegulations";

const INK = "#1f2937";
const border = { border: "0.5px solid #e5e7eb" };
const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export default function SchoolRules() {
    const nav = useNavigate();
    const qc = useQueryClient();
    const school = useSchoolBrand();
    const { data, isLoading } = useQuery({
        queryKey: ["rules_regulations"],
        queryFn: async () => (await api.get("/rules_regulations")).data?.[0] || null,
    });
    const [rules, setRules] = useState<string[]>([]);
    const [dirty, setDirty] = useState(false);
    useEffect(() => { if (data !== undefined) { setRules(parseRulesContent(data?.content)); setDirty(false); } }, [data]);

    const save = useMutation({
        mutationFn: async () => {
            const content = formatRulesContent(rules);
            return data?._id
                ? (await api.patch(`/rules_regulations/${data._id}`, { content })).data
                : (await api.post("/rules_regulations", { content })).data;
        },
        onSuccess: () => { setDirty(false); qc.invalidateQueries({ queryKey: ["rules_regulations"] }); toast.success("School rules saved"); },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Could not save"),
    });

    const title = `${school.name} — School Rules`;
    const buildHtml = () => {
        const body = `<ol style="margin:0;padding-left:22px;line-height:1.9;font-size:13px">
            ${rules.filter(r => r.trim()).map(r => `<li>${esc(r)}</li>`).join("")}
          </ol>`;
        return body;
    };
    const print = () => printBranded(school, title, buildHtml(), "#0f766e");
    const pdf = () => downloadHtmlAsPdf(title, `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:24px}</style></head><body>${buildHtml()}</body></html>`, title);

    return (
        <div className="min-h-screen bg-[#f6f7fb] p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => nav("/exams/printouts")} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center" style={border}><ArrowLeft className="w-4 h-4" /></button>
                        <div><h1 className="text-lg font-black flex items-center gap-2" style={{ color: INK }}><ScrollText className="w-5 h-5 text-slate-400" /> School Rules</h1><p className="text-[11px] text-slate-500">Edit once, print whenever needed.</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button disabled={!rules.some(r => r.trim())} onClick={print} className="h-10 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: INK }}><Printer className="w-4 h-4" /> Print</button>
                        <button disabled={!rules.some(r => r.trim())} onClick={pdf} className="h-10 px-4 rounded-xl text-sm font-bold bg-white flex items-center gap-1.5 disabled:opacity-50" style={{ ...border, color: INK }}><Download className="w-4 h-4" /> PDF</button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5" style={border}>
                    {isLoading ? (
                        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {rules.map((r, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-400 w-6 text-right">{i + 1}.</span>
                                        <input value={r} onChange={e => { setRules(rs => rs.map((x, k) => k === i ? e.target.value : x)); setDirty(true); }}
                                            className="flex-1 h-10 px-3 rounded-xl text-sm bg-white outline-none" style={border} placeholder="Rule text…" />
                                        <button onClick={() => { setRules(rs => rs.filter((_, k) => k !== i)); setDirty(true); }} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {!rules.length && <p className="text-sm text-slate-400 text-center py-6">No rules yet — add the first one below.</p>}
                            </div>
                            <button onClick={() => { setRules(rs => [...rs, ""]); setDirty(true); }} className="mt-3 text-sm font-bold text-[#0f766e] flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add rule</button>
                        </>
                    )}
                </div>

                <div className="flex justify-end">
                    <button disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="h-10 px-5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-50" style={{ background: "#0f766e" }}>
                        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
                    </button>
                </div>

                {/* preview */}
                <div className="bg-white rounded-2xl p-5" style={border}>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Preview</p>
                    <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700">
                        {rules.filter(r => r.trim()).map((r, i) => <li key={i}>{r}</li>)}
                    </ol>
                    {!rules.some(r => r.trim()) && <p className="text-sm text-slate-400">Nothing to print yet.</p>}
                </div>
            </div>
        </div>
    );
}
