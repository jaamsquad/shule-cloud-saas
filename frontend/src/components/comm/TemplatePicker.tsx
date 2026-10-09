import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronDown, Settings2, Search } from "lucide-react";
import api from "@/lib/api";

// Saved SMS / email templates (Communication → Templates), for any composer.
export interface MessageTemplate { _id: string; channel: "sms" | "email"; name: string; category: string; subject?: string; body: string; usageCount?: number }

export function useTemplates(channel?: "sms" | "email") {
    return useQuery<MessageTemplate[]>({
        queryKey: ["message_templates", channel || "all"],
        queryFn: async () => (await api.get("/communications/templates", { params: channel ? { channel } : {} })).data || [],
        staleTime: 60_000,
    });
}

/** Placeholders still in the text, e.g. ["{name}", "{date}"]. */
export const openPlaceholders = (text: string) => Array.from(new Set(String(text || "").match(/\{[a-z]+\}/gi) || []));

export default function TemplatePicker({ channel, onPick, align = "left" }: { channel: "sms" | "email"; onPick: (t: MessageTemplate) => void; align?: "left" | "right" }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const box = useRef<HTMLDivElement>(null);
    const { data = [], isLoading } = useTemplates(channel);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);
    const list = data.filter(t => !q || `${t.name} ${t.category} ${t.body}`.toLowerCase().includes(q.toLowerCase()));
    const groups = list.reduce((m: Record<string, MessageTemplate[]>, t) => { (m[t.category || "General"] ||= []).push(t); return m; }, {});

    const pick = (t: MessageTemplate) => {
        onPick(t);
        setOpen(false);
        api.post(`/communications/templates/${t._id}/used`).catch(() => {});
    };

    return (
        <div className="relative inline-block" ref={box}>
            <button type="button" onClick={() => setOpen(o => !o)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#5C67F2]" /> Use template <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {open && (
                <div className={`absolute z-50 mt-1.5 w-80 max-w-[85vw] bg-white rounded-xl border border-slate-200 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>
                    <div className="p-2 border-b border-slate-100 relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates…" className="w-full h-8 pl-7 pr-2 rounded-lg bg-slate-50 text-xs focus:outline-none" />
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                        {isLoading ? <p className="text-xs text-slate-400 px-3 py-4 text-center">Loading…</p>
                            : !list.length ? <p className="text-xs text-slate-400 px-3 py-4 text-center">No {channel === "sms" ? "SMS" : "email"} templates yet.</p>
                            : Object.entries(groups).map(([cat, ts]) => (
                                <div key={cat}>
                                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{cat}</p>
                                    {ts.map(t => (
                                        <button key={t._id} type="button" onClick={() => pick(t)} className="w-full text-left px-3 py-2 hover:bg-indigo-50/60">
                                            <p className="text-xs font-semibold text-slate-800">{t.name}</p>
                                            <p className="text-[11px] text-slate-400 line-clamp-2">{t.subject ? `${t.subject} — ` : ""}{t.body}</p>
                                        </button>
                                    ))}
                                </div>
                            ))}
                    </div>
                    <Link to="/communications/templates" className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-100 text-xs font-semibold text-[#5C67F2] hover:bg-slate-50 rounded-b-xl">
                        <Settings2 className="w-3.5 h-3.5" /> Manage templates
                    </Link>
                </div>
            )}
        </div>
    );
}
