import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, Sparkles, Copy, RotateCcw, Power } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// AI chat (Groq, set up by ShuleCloud in the owner portal). Ask anything; for school
// facts the server runs the Smart Assistant's read-only queries and returns their cards,
// which are shown under the answer. Suggested prompts make it one tap to start.

export interface AiStatus { platform: boolean; school: boolean; enabled: boolean; canManage: boolean; model?: string; suggestions?: string[]; dailyLimit?: number; usedToday?: number }
type Msg = { role: "user" | "assistant"; content: string; cards?: any[]; error?: boolean };

const KEY = "sc_ai_chat";

// Light formatting: **bold**, bullet lines, line breaks — no HTML from the model is trusted.
function Rich({ text }: { text: string }) {
    const lines = text.split("\n");
    return (
        <div className="space-y-1">
            {lines.map((l, i) => {
                const bullet = /^\s*([-*•]|\d+[.)])\s+/.test(l);
                const body = l.replace(/^\s*([-*•])\s+/, "");
                const parts = body.split(/(\*\*[^*]+\*\*)/g).map((p, j) => p.startsWith("**") && p.endsWith("**") ? <b key={j}>{p.slice(2, -2)}</b> : <span key={j}>{p}</span>);
                if (!l.trim()) return <div key={i} className="h-1" />;
                return bullet ? <div key={i} className="flex gap-2"><span className="text-[#5C67F2]">•</span><span>{parts}</span></div> : <p key={i}>{parts}</p>;
            })}
        </div>
    );
}

export default function AiChat({ status, renderCard }: { status: AiStatus; renderCard: (card: any) => React.ReactNode }) {
    const qc = useQueryClient();
    const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch { return []; } });
    const [text, setText] = useState("");
    const end = useRef<HTMLDivElement>(null);
    useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch { /* private mode */ } end.current?.scrollIntoView({ block: "end" }); }, [msgs]);

    const ask = useMutation({
        mutationFn: async (history: Msg[]) => (await api.post("/assistant/ai/chat", { messages: history.filter(m => !m.error).map(m => ({ role: m.role, content: m.content })) })).data,
        onSuccess: (d) => setMsgs(m => [...m, { role: "assistant", content: d.reply, cards: d.cards }]),
        onError: (e: any) => setMsgs(m => [...m, { role: "assistant", content: e.response?.data?.message || "The assistant could not answer. Try again.", error: true }]),
    });
    const toggle = useMutation({
        mutationFn: async (enabled: boolean) => (await api.post("/assistant/ai/school", { enabled })).data,
        onSuccess: (d) => { toast.success(d.message); qc.invalidateQueries({ queryKey: ["ai_status"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not change it"),
    });

    const send = (q?: string) => {
        const content = (q ?? text).trim();
        if (!content || ask.isPending) return;
        const next = [...msgs, { role: "user" as const, content }];
        setMsgs(next); setText(""); ask.mutate(next);
    };

    if (!status.platform) return (
        <div className="text-center py-10 px-4">
            <Sparkles className="w-8 h-8 text-indigo-300 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-700">AI assistant not set up yet</p>
            <p className="text-xs text-slate-500 mt-1">ShuleCloud adds the AI key in the owner portal. Call 0726151104 to have it turned on.</p>
        </div>
    );
    if (!status.school) return (
        <div className="text-center py-10 px-4">
            <Power className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-700">AI is turned off for your school</p>
            {status.canManage
                ? <button onClick={() => toggle.mutate(true)} disabled={toggle.isPending} className="mt-4 px-4 py-2 rounded-xl bg-[#5C67F2] text-white text-sm font-bold">{toggle.isPending ? "Turning on…" : "Turn on AI for the school"}</button>
                : <p className="text-xs text-slate-500 mt-1">Your school administrator can turn it on.</p>}
        </div>
    );

    return (
        <div className="flex flex-col h-full min-h-[360px]">
            <div className="flex-1 space-y-3">
                {msgs.length === 0 && (
                    <div>
                        <div className="rounded-2xl bg-gradient-to-br from-[#5C67F2]/10 to-indigo-50 p-4 mb-3">
                            <p className="text-sm font-black text-slate-800 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#5C67F2]" /> Ask me anything</p>
                            <p className="text-xs text-slate-600 mt-1">School numbers, drafting SMS and notices, lesson ideas, how-to in ShuleCloud — type or pick one below.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(status.suggestions || []).map(s => (
                                <button key={s} onClick={() => send(s)} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:border-[#5C67F2] hover:text-[#5C67F2] text-left">{s}</button>
                            ))}
                        </div>
                    </div>
                )}
                {msgs.map((m, i) => m.role === "user" ? (
                    <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#5C67F2] text-white text-sm px-3.5 py-2.5 whitespace-pre-wrap">{m.content}</div></div>
                ) : (
                    <div key={i} className="space-y-2">
                        <div className={`max-w-[92%] rounded-2xl rounded-bl-md text-sm px-3.5 py-2.5 border ${m.error ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-white border-slate-100 text-slate-700"}`}>
                            <Rich text={m.content} />
                            {!m.error && <button onClick={() => { navigator.clipboard?.writeText(m.content); toast.success("Copied"); }} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-[#5C67F2]"><Copy className="w-3 h-3" /> Copy</button>}
                        </div>
                        {(m.cards || []).map((c, j) => <div key={j}>{renderCard(c)}</div>)}
                    </div>
                ))}
                {ask.isPending && <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</div>}
                <div ref={end} />
            </div>

            <div className="sticky bottom-0 pt-3 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
                <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 focus-within:border-[#5C67F2]">
                    <textarea value={text} onChange={e => setText(e.target.value)} rows={1} placeholder="Ask the assistant…"
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        className="flex-1 resize-none max-h-28 px-2 py-1.5 text-sm outline-none bg-transparent" />
                    <button onClick={() => send()} disabled={!text.trim() || ask.isPending} className="w-9 h-9 rounded-xl bg-[#5C67F2] text-white flex items-center justify-center disabled:opacity-40" aria-label="Send"><Send className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                    {msgs.length > 0 ? <button onClick={() => setMsgs([])} className="inline-flex items-center gap-1 hover:text-slate-600"><RotateCcw className="w-3 h-3" /> New chat</button> : <span>AI can make mistakes — check important details.</span>}
                    {status.canManage && <button onClick={() => { if (confirm("Turn the AI assistant off for everyone in your school?")) toggle.mutate(false); }} className="inline-flex items-center gap-1 hover:text-rose-600"><Power className="w-3 h-3" /> Turn off for school</button>}
                </div>
            </div>
        </div>
    );
}
