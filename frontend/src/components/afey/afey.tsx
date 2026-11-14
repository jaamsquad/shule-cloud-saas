/**
 * Afey — shared pieces for the top-bar prompt and the full page:
 * the mark, the chat hook, answers (text + data cards) and the approve-before-send card.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, MessageSquareText, Pencil, Send, Users, X, Ban, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

/** The Afey mark: an open rounded square, "AI", and three sparkles. */
export function AfeyMark({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
            <path d="M24 10H15a5 5 0 0 0-5 5v18a5 5 0 0 0 5 5h18a5 5 0 0 0 5-5v-7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M16.2 31.5l4.3-12h1.9l4.3 12M17.6 27.4h7.3M30.6 19.5v12" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M33 4.5l1.3 3.6 3.6 1.3-3.6 1.3L33 14.3l-1.3-3.6-3.6-1.3 3.6-1.3z" fill="currentColor" />
            <path d="M41.5 7l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z" fill="currentColor" />
            <path d="M40 15.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="currentColor" />
        </svg>
    );
}

export type AfeyCard = { id?: string; title?: string; summary?: string; stat?: { value: string; label?: string }; breakdown?: { label: string; value: string | number }[] };
export type AfeyAction = { _id: string; title: string; message: string; recipients: number; sample: { to: string; text: string }[]; status: "pending" | "sending" | "done" | "cancelled" | "failed"; result?: { recipients?: number; sent?: number; queued?: number; failed?: number; provider?: string } };
export type AfeyMsg = { role: "user" | "assistant"; content: string; cards?: AfeyCard[]; actions?: AfeyAction[]; error?: boolean };
export type AfeyStatus = { enabled: boolean; platform: boolean; school: boolean; canAct: boolean; name?: string; suggestions: string[] };

const errText = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Afey could not answer. Try again.";

export function useAfeyStatus() {
    return useQuery<AfeyStatus>({ queryKey: ["afey_status"], staleTime: 60_000, queryFn: async () => (await api.get("/afey/status")).data });
}

/** A conversation: send a prompt, get the answer, keep the chat id for the next turn. */
export function useAfeyChat(initial?: { chatId?: string; messages?: AfeyMsg[] }) {
    const qc = useQueryClient();
    const [messages, setMessages] = useState<AfeyMsg[]>(initial?.messages || []);
    const [chatId, setChatId] = useState<string | undefined>(initial?.chatId);
    const ask = useMutation({
        mutationFn: async (text: string) => {
            const next: AfeyMsg[] = [...messages, { role: "user", content: text }];
            setMessages(next);
            const r = await api.post("/afey/chat", { chatId, messages: next.filter(m => !m.error).map(m => ({ role: m.role, content: m.content })) });
            return r.data as { reply: string; cards: AfeyCard[]; actions: AfeyAction[]; chatId: string };
        },
        onSuccess: d => {
            setMessages(m => [...m, { role: "assistant", content: d.reply, cards: d.cards, actions: (d.actions || []).map(a => ({ ...a, _id: String(a._id) })) }]);
            setChatId(d.chatId);
            qc.invalidateQueries({ queryKey: ["afey_chats"] });
        },
        onError: e => setMessages(m => [...m, { role: "assistant", content: errText(e), error: true }]),
    });
    const load = (id: string | undefined, msgs: AfeyMsg[]) => { setChatId(id); setMessages(msgs); };
    const patchAction = (a: AfeyAction) => setMessages(ms => ms.map(m => (m.actions?.some(x => x._id === a._id) ? { ...m, actions: m.actions.map(x => (x._id === a._id ? a : x)) } : m)));
    return { messages, chatId, ask, load, patchAction };
}

/** Light formatting: **bold**, bullet lines and paragraphs. */
export function AfeyText({ text, dark }: { text: string; dark?: boolean }) {
    const lines = text.split(/\n/);
    const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i} className={dark ? "text-white" : "text-slate-900"}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>));
    return (
        <div className="space-y-1.5 leading-relaxed">
            {lines.map((l, i) => {
                const t = l.trim();
                if (!t) return null;
                const b = t.match(/^([-*•]|\d+[.)])\s+(.*)$/);
                if (b) return <div key={i} className="flex gap-2"><span className={dark ? "text-white/40" : "text-slate-400"}>{/^\d/.test(b[1]) ? b[1] : "•"}</span><span className="min-w-0">{inline(b[2])}</span></div>;
                return <p key={i}>{inline(t.replace(/^#+\s*/, ""))}</p>;
            })}
        </div>
    );
}

export function AfeyCardView({ card, dark }: { card: AfeyCard; dark?: boolean }) {
    const box = dark ? "bg-white/[0.04] border-white/10" : "bg-white border-slate-200";
    return (
        <div className={`rounded-xl border p-3 ${box}`}>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${dark ? "text-white/50" : "text-slate-500"}`}>{card.title}</div>
            {card.stat && <div className={`text-xl font-black mt-0.5 tabular-nums ${dark ? "text-white" : "text-slate-900"}`}>{card.stat.value} {card.stat.label && <span className={`text-xs font-semibold ${dark ? "text-white/50" : "text-slate-500"}`}>{card.stat.label}</span>}</div>}
            {!!card.breakdown?.length && (
                <div className={`mt-2 divide-y ${dark ? "divide-white/5" : "divide-slate-100"}`}>
                    {card.breakdown.slice(0, 8).map((b, i) => (
                        <div key={i} className="flex justify-between gap-3 py-1 text-xs"><span className={`truncate ${dark ? "text-white/70" : "text-slate-600"}`}>{b.label}</span><span className={`font-bold tabular-nums ${dark ? "text-white" : "text-slate-900"}`}>{b.value}</span></div>
                    ))}
                    {card.breakdown.length > 8 && <div className={`pt-1 text-[11px] ${dark ? "text-white/40" : "text-slate-400"}`}>+{card.breakdown.length - 8} more</div>}
                </div>
            )}
        </div>
    );
}

/** A prepared SMS: who gets it, the message (editable), a sample, then Approve & send / Cancel. */
export function AfeyActionCard({ action, onChange, dark }: { action: AfeyAction; onChange: (a: AfeyAction) => void; dark?: boolean }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(action.message);
    const [note, setNote] = useState("");
    const approve = useMutation({
        mutationFn: async () => (await api.post(`/afey/actions/${action._id}/approve`, { message: text })).data,
        onSuccess: d => { onChange({ ...action, message: text, status: d.status, result: d.result }); setNote(d.message || ""); },
        onError: e => setNote(errText(e)),
    });
    const cancel = useMutation({
        mutationFn: async () => (await api.post(`/afey/actions/${action._id}/cancel`)).data,
        onSuccess: () => onChange({ ...action, status: "cancelled" }),
    });
    const muted = dark ? "text-white/50" : "text-slate-500";
    const strong = dark ? "text-white" : "text-slate-900";
    const pending = action.status === "pending";
    const sample = action.sample?.[0]?.text;
    return (
        <div className={`rounded-xl border p-3 sm:p-4 ${dark ? "bg-white/[0.04] border-white/15" : "bg-white border-slate-200"}`}>
            <div className="flex items-start gap-2.5">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"}`}><MessageSquareText className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                    <div className={`text-sm font-bold ${strong}`}>{action.title}</div>
                    <div className={`text-xs flex items-center gap-1 mt-0.5 ${muted}`}><Users className="w-3.5 h-3.5" /> {action.recipients} recipient{action.recipients === 1 ? "" : "s"} with a phone number</div>
                </div>
                {pending && !editing && <button onClick={() => setEditing(true)} title="Edit message" className={`p-1.5 rounded-lg ${dark ? "text-white/60 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"}`}><Pencil className="w-4 h-4" /></button>}
            </div>
            {editing && pending ? (
                <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={480}
                    className={`mt-3 w-full rounded-lg p-2.5 text-sm outline-none border ${dark ? "bg-black/30 border-white/15 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`} />
            ) : (
                <div className={`mt-3 rounded-lg p-2.5 text-sm whitespace-pre-wrap ${dark ? "bg-black/30 text-white/85" : "bg-slate-50 text-slate-700"}`}>{text}</div>
            )}
            {sample && sample !== text && !editing && <div className={`mt-2 text-[11px] ${muted}`}>e.g. {action.sample[0].to}: “{sample}”</div>}
            {pending ? (
                action.recipients ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button disabled={approve.isPending || !text.trim()} onClick={() => approve.mutate()}
                            className={`h-9 px-4 rounded-lg text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 ${dark ? "bg-white text-black" : "bg-slate-900 text-white"}`}>
                            {approve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Approve &amp; send
                        </button>
                        <button disabled={approve.isPending} onClick={() => cancel.mutate()} className={`h-9 px-3 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${dark ? "text-white/70 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}><X className="w-4 h-4" /> Cancel</button>
                    </div>
                ) : <div className={`mt-3 text-xs flex items-center gap-1.5 ${muted}`}><AlertTriangle className="w-3.5 h-3.5" /> No one to send to — no matching phone numbers.</div>
            ) : (
                <div className={`mt-3 text-xs font-semibold flex items-center gap-1.5 ${action.status === "done" ? (dark ? "text-white" : "text-slate-900") : muted}`}>
                    {action.status === "done" ? <Check className="w-4 h-4" /> : action.status === "cancelled" ? <Ban className="w-4 h-4" /> : action.status === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    {action.status === "done" ? `Sent to ${action.result?.recipients ?? action.recipients} recipient${(action.result?.recipients ?? action.recipients) === 1 ? "" : "s"}${action.result?.provider === "device" ? " (queued on the SMS phone)" : ""}`
                        : action.status === "cancelled" ? "Cancelled — nothing was sent" : action.status === "sending" ? "Sending…" : "Not sent"}
                </div>
            )}
            {note && pending && <div className={`mt-2 text-xs ${muted}`}>{note}</div>}
        </div>
    );
}

/** One assistant turn: text, data cards, prepared actions. */
export function AfeyAnswer({ m, dark, onAction }: { m: AfeyMsg; dark?: boolean; onAction: (a: AfeyAction) => void }) {
    return (
        <div className="space-y-2.5">
            <div className={`text-sm ${m.error ? (dark ? "text-white/60" : "text-slate-500") : dark ? "text-white/85" : "text-slate-700"}`}>
                {m.error ? <span className="inline-flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{m.content}</span> : <AfeyText text={m.content} dark={dark} />}
            </div>
            {!!m.cards?.length && <div className="grid sm:grid-cols-2 gap-2">{m.cards.map((c, i) => <AfeyCardView key={i} card={c} dark={dark} />)}</div>}
            {m.actions?.map(a => <AfeyActionCard key={a._id} action={a} onChange={onAction} dark={dark} />)}
        </div>
    );
}
