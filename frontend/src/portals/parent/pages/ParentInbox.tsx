import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Inbox, X } from "lucide-react";
import type { ParentCtx } from "../ParentLayout";

// Parent inbox — messages from the school with type badges (Meeting=dark blue,
// Results=light blue, General=grey). Results messages show the child's exam
// results inline.
const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
    Meeting: { bg: "#1e3a8a", text: "#fff" },
    Results: { bg: "#0284c7", text: "#fff" },
    General: { bg: "#e2e8f0", text: "#475569" },
};
const fmt = (d: any) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

export default function ParentInbox() {
    const { api, child } = useOutletContext<ParentCtx>();
    const qc = useQueryClient();
    const [open, setOpen] = useState<any>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["parent_inbox", child?._id],
        enabled: !!child?._id,
        queryFn: async () => (await api.get("/messaging/inbox")).data,
    });
    const rows: any[] = data?.data || [];

    const openMsg = async (m: any) => {
        setOpen(m);
        if (!m.read) { try { await api.post(`/messaging/${m._id}/read`); qc.invalidateQueries({ queryKey: ["parent_inbox"] }); } catch { /* ignore */ } }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F5] pb-20">
            <div className="text-white px-5 py-4" style={{ background: "#2E7D32" }}>
                <h1 className="text-lg font-black flex items-center gap-2"><Inbox className="w-5 h-5" /> Inbox</h1>
                <p className="text-xs opacity-90">{child?.name} · {child?.stream || child?.studentClass || ""}</p>
            </div>

            {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div> : rows.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold">No messages yet.</div>
            ) : (
                <div className="p-3 space-y-2">
                    {rows.map(m => {
                        const b = TYPE_BADGE[m.type] || TYPE_BADGE.General;
                        return (
                            <button key={m._id} onClick={() => openMsg(m)} className={`w-full text-left bg-white rounded-xl border p-3 flex items-start gap-3 ${m.read ? "border-slate-100" : "border-[#2E7D32]/40"}`}>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0" style={{ background: b.bg, color: b.text }}>{m.type}</span>
                                <div className="min-w-0 flex-1">
                                    <div className={`text-sm truncate ${m.read ? "font-semibold text-slate-700" : "font-black text-slate-900"}`}>{m.subject}</div>
                                    <div className="text-xs text-slate-400 truncate">{m.from} · {fmt(m.createdAt)}</div>
                                </div>
                                {!m.read && <span className="w-2 h-2 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Message detail */}
            {open && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setOpen(null)}>
                    <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" style={{ background: (TYPE_BADGE[open.type] || TYPE_BADGE.General).bg, color: (TYPE_BADGE[open.type] || TYPE_BADGE.General).text }}>{open.type}</span>
                            <button onClick={() => setOpen(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5">
                            <h2 className="font-black text-slate-800">{open.subject}</h2>
                            <p className="text-xs text-slate-400 mb-3">{open.from} · {fmt(open.createdAt)}</p>
                            {open.body && <p className="text-sm text-slate-700 whitespace-pre-wrap">{open.body}</p>}

                            {/* Attached results */}
                            {open.attachment && (
                                <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden">
                                    <div className="px-3 py-2 bg-slate-50 text-xs font-black text-slate-600">{open.attachment.examTitle} · Mean {open.attachment.meanPct}%</div>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {open.attachment.subjects.map((s: any, i: number) => (
                                                <tr key={i} className="border-t border-slate-50">
                                                    <td className="px-3 py-1.5 text-slate-700">{s.name}</td>
                                                    <td className="px-3 py-1.5 text-right font-bold">{s.marks}/{s.outOf}</td>
                                                    <td className="px-3 py-1.5 text-right text-slate-400 w-12">{s.pct}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
