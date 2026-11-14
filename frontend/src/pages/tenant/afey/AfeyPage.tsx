/**
 * Afey — full page. Conversations on the left, the chat in the middle.
 * Opens a conversation from the top-bar prompt with ?chat=<id>.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowUp, Loader2, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Search, Trash2, Users, Wallet, CalendarX2, FileText } from "lucide-react";
import api from "@/lib/api";
import { AfeyAnswer, AfeyMark, AfeyMsg, useAfeyChat, useAfeyStatus } from "@/components/afey/afey";

type ChatRow = { _id: string; title: string; updatedAt: string };
const CARD_ICONS = [CalendarX2, Wallet, MessageSquare, Users, FileText];

export default function AfeyPage() {
    const qc = useQueryClient();
    const [params, setParams] = useSearchParams();
    const { data: status } = useAfeyStatus();
    const { data: chats = [] } = useQuery<ChatRow[]>({ queryKey: ["afey_chats"], queryFn: async () => (await api.get("/afey/chats")).data || [] });
    const chat = useAfeyChat();
    const [text, setText] = useState("");
    const [find, setFind] = useState("");
    const [side, setSide] = useState(() => window.innerWidth >= 1024);
    const [loadingChat, setLoadingChat] = useState(false);
    const scroller = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const current = params.get("chat") || undefined;

    // open the conversation named in the URL
    useEffect(() => {
        if (!current) { if (chat.chatId) chat.load(undefined, []); return; }
        if (current === chat.chatId) return;
        setLoadingChat(true);
        api.get(`/afey/chats/${current}`).then(r => chat.load(current, (r.data.messages || []).map((m: AfeyMsg & { actions?: { _id: unknown }[] }) => ({ ...m, actions: (m.actions || []).map(a => ({ ...a, _id: String(a._id) })) }))))
            .catch(() => setParams({}, { replace: true })).finally(() => setLoadingChat(false));
    }, [current]); // eslint-disable-line react-hooks/exhaustive-deps
    // keep the URL on the conversation once a new one is saved
    useEffect(() => { if (chat.chatId && chat.chatId !== current) setParams({ chat: chat.chatId }, { replace: true }); }, [chat.chatId]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [chat.messages.length, chat.ask.isPending]);

    const send = (t = text) => { const q = t.trim(); if (!q || chat.ask.isPending) return; setText(""); chat.ask.mutate(q); if (window.innerWidth < 1024) setSide(false); };
    const newChat = () => { setParams({}); chat.load(undefined, []); setTimeout(() => input.current?.focus(), 50); if (window.innerWidth < 1024) setSide(false); };
    const remove = async (id: string) => { await api.delete(`/afey/chats/${id}`).catch(() => null); qc.invalidateQueries({ queryKey: ["afey_chats"] }); if (id === current) newChat(); };
    const off = status && !status.enabled;

    const groups = useMemo(() => {
        const q = find.trim().toLowerCase();
        const list = chats.filter(c => !q || c.title.toLowerCase().includes(q));
        const today = new Date().toDateString(); const y = new Date(Date.now() - 864e5).toDateString();
        const g: Record<string, ChatRow[]> = { Today: [], Yesterday: [], Earlier: [] };
        list.forEach(c => { const d = new Date(c.updatedAt).toDateString(); (d === today ? g.Today : d === y ? g.Yesterday : g.Earlier).push(c); });
        return Object.entries(g).filter(([, v]) => v.length);
    }, [chats, find]);

    const empty = !chat.messages.length && !loadingChat;

    return (
        <div className="afey-page h-[calc(100dvh-4rem)] flex flex-nowrap bg-[#f3f4f6] text-slate-800 relative overflow-hidden">
            {/* conversations */}
            {side && <div className="lg:hidden fixed inset-0 top-16 z-20 bg-slate-900/30" onClick={() => setSide(false)} />}
            <aside className={`${side ? "translate-x-0" : "-translate-x-full lg:hidden"} transition-transform fixed lg:static top-16 bottom-0 left-0 z-30 w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col`}>
                <div className="p-3 flex items-center gap-2">
                    <div className="flex items-center gap-2 font-black tracking-tight"><AfeyMark className="w-6 h-6" /> Afey</div>
                    <button onClick={() => setSide(false)} className="ml-auto p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Hide"><PanelLeftClose className="w-4 h-4" /></button>
                </div>
                <div className="px-3 space-y-2">
                    <button onClick={newChat} className="w-full h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> New chat</button>
                    <div className="h-9 rounded-lg bg-slate-100 flex items-center gap-2 px-2.5"><Search className="w-4 h-4 text-slate-400" /><input value={find} onChange={e => setFind(e.target.value)} placeholder="Search chats" className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400" /></div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
                    {!chats.length && <p className="px-2 text-xs text-slate-400">Your conversations with Afey show here.</p>}
                    {groups.map(([label, rows]) => (
                        <div key={label}>
                            <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
                            {rows.map(c => (
                                <div key={c._id} className={`group flex items-center rounded-lg ${c._id === current ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                                    <button onClick={() => { setParams({ chat: c._id }); if (window.innerWidth < 1024) setSide(false); }} className="flex-1 min-w-0 text-left px-2 py-2 text-[13px] text-slate-700 flex items-center gap-2">
                                        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400" /><span className="truncate">{c.title}</span>
                                    </button>
                                    <button onClick={() => remove(c._id)} title="Delete" className="p-1.5 mr-1 rounded text-slate-400 hover:text-slate-700 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-200 text-[11px] text-slate-400 leading-relaxed">
                    {status?.canAct ? "Afey prepares SMS and other actions. Nothing is sent until you approve it." : "Afey answers from your school's data and drafts messages for you."}
                </div>
            </aside>

            {/* chat */}
            <section className="flex-1 min-w-0 flex flex-col relative">
                <div className="afey-glow pointer-events-none" />
                <div className="h-12 shrink-0 flex items-center gap-2 px-3 sm:px-4 relative z-10">
                    {!side && <button onClick={() => setSide(true)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Conversations"><PanelLeftOpen className="w-4 h-4" /></button>}
                    {!empty && <span className="text-sm text-slate-500 truncate">{chats.find(c => c._id === current)?.title || ""}</span>}
                    {!empty && <button onClick={newChat} className="ml-auto h-8 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New</button>}
                </div>

                <div ref={scroller} className="flex-1 overflow-y-auto relative z-10">
                    {loadingChat ? <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                    : empty ? (
                        <div className="min-h-full flex flex-col items-center justify-center px-4 py-10 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-5"><AfeyMark className="w-8 h-8" /></div>
                            <p className="text-sm text-slate-500">Welcome to Afey{status?.name ? `, ${status.name.split(" ")[0]}` : ""}</p>
                            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-1">How can I assist you?</h1>
                            {off && <p className="mt-4 text-sm text-slate-500 max-w-md">{status?.platform ? "AI is turned off for your school. A school admin can turn it on in Settings." : "The platform owner hasn't set up the AI key yet."}</p>}
                            {!off && (
                                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full max-w-4xl text-left">
                                    {(status?.suggestions || []).map((s, i) => { const I = CARD_ICONS[i % CARD_ICONS.length]; return (
                                        <button key={s} onClick={() => send(s)} className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm p-4 min-h-[96px] flex flex-col justify-between text-sm text-slate-700 transition-colors">
                                            <span>{s}</span><I className="w-4 h-4 text-slate-400 mt-3" />
                                        </button>
                                    ); })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                            {chat.messages.map((m, i) => m.role === "user"
                                ? <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-white border border-slate-200 text-slate-800 text-sm px-4 py-2.5 whitespace-pre-wrap">{m.content}</div></div>
                                : <div key={i} className="flex gap-3"><span className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0"><AfeyMark className="w-5 h-5" /></span><div className="min-w-0 flex-1 pt-1"><AfeyAnswer m={m} onAction={chat.patchAction} /></div></div>)}
                            {chat.ask.isPending && <div className="flex gap-3 items-center text-sm text-slate-500"><span className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></span> Afey is working…</div>}
                        </div>
                    )}
                </div>

                <div className="shrink-0 px-3 sm:px-4 pb-4 pt-2 relative z-10">
                    <form onSubmit={e => { e.preventDefault(); send(); }} className="max-w-3xl mx-auto afey-ring rounded-2xl p-[1.5px]">
                        <div className="bg-white rounded-2xl px-3 pt-3 pb-2">
                            <textarea ref={input} value={text} onChange={e => setText(e.target.value)} rows={2} disabled={!!off}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                                placeholder={off ? "AI is off for your school" : "Ask Afey anything, or tell it what to do — e.g. SMS parents of fee defaulters"}
                                className="w-full resize-none bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400" />
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">Enter to send · Shift+Enter for a new line</span>
                                <button type="submit" disabled={!text.trim() || chat.ask.isPending || !!off} aria-label="Send" className="ml-auto w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-30">
                                    {chat.ask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
