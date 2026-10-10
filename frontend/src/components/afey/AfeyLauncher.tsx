/**
 * Afey in the top bar: hover (or tap) the mark to open a prompt field. Ask anything about the
 * school; answers and prepared SMS (approve before sending) show right under it.
 * "Open full" continues the same conversation on the Afey page.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowUp, Loader2, Maximize2, RotateCcw } from "lucide-react";
import { AfeyAnswer, AfeyMark, useAfeyChat, useAfeyStatus } from "./afey";

export default function AfeyLauncher({ tone = "light" }: { tone?: "light" | "dark" }) {
    const nav = useNavigate();
    const onPage = useLocation().pathname === "/afey";
    const { data: status } = useAfeyStatus();
    const chat = useAfeyChat();
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const box = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const closeTimer = useRef<number>();
    const scroller = useRef<HTMLDivElement>(null);

    const show = () => { window.clearTimeout(closeTimer.current); if (!onPage) setOpen(true); };
    // Close on mouse-out only when nothing is in progress (no text, no chat, not focused)
    const hide = () => {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => {
            if (!text && !chat.messages.length && document.activeElement !== input.current) setOpen(false);
        }, 350);
    };
    useEffect(() => { if (onPage) setOpen(false); }, [onPage]);
    useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 60); }, [open]);
    useEffect(() => {
        const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
    }, []);
    useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [chat.messages.length, chat.ask.isPending]);

    const send = (t = text) => { const q = t.trim(); if (!q || chat.ask.isPending) return; setText(""); chat.ask.mutate(q); };
    const openFull = () => { setOpen(false); nav(chat.chatId ? `/afey?chat=${chat.chatId}` : "/afey"); };
    const off = status && !status.enabled;

    return (
        <div ref={box} className="relative" onMouseEnter={show} onMouseLeave={hide}>
            <button onClick={show} aria-label="Afey AI" title="Afey — ask anything"
                className={`relative h-10 pl-2 pr-2.5 sm:pr-3 rounded-xl flex items-center gap-1.5 transition-colors ${tone === "dark" ? "text-white/80 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"} ${open ? (tone === "dark" ? "bg-white/10" : "bg-slate-100") : ""}`}>
                <AfeyMark className="w-6 h-6" />
                <span className="hidden md:inline text-sm font-bold tracking-tight">Afey</span>
            </button>

            {open && (
                <div className="fixed sm:absolute left-2 right-2 top-[68px] sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-[30rem] z-[60] bg-white rounded-2xl shadow-[0_18px_50px_rgba(15,23,42,0.18)] border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                        <div className="flex items-center gap-2 text-slate-800"><AfeyMark className="w-5 h-5" /><span className="text-sm font-black">Afey</span><span className="text-[11px] text-slate-400 font-medium">· ask anything in ShuleCloud</span></div>
                        <div className="flex items-center gap-1">
                            {!!chat.messages.length && <button onClick={() => chat.load(undefined, [])} title="New chat" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><RotateCcw className="w-4 h-4" /></button>}
                            <button onClick={openFull} title="Open full" className="h-7 px-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" /> Open full</button>
                        </div>
                    </div>

                    {(chat.messages.length > 0 || chat.ask.isPending) && (
                        <div ref={scroller} className="max-h-[52vh] overflow-y-auto px-4 pb-2 space-y-3">
                            {chat.messages.map((m, i) => m.role === "user"
                                ? <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-100 text-slate-800 text-sm px-3 py-2">{m.content}</div></div>
                                : <AfeyAnswer key={i} m={m} onAction={chat.patchAction} />)}
                            {chat.ask.isPending && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Afey is working…</div>}
                        </div>
                    )}

                    <div className="p-3 pt-1">
                        <form onSubmit={e => { e.preventDefault(); send(); }} className="afey-ring rounded-full p-[1.5px]">
                            <div className="flex items-center gap-2 bg-white rounded-full pl-4 pr-1.5 h-12">
                                <input ref={input} value={text} onChange={e => setText(e.target.value)} disabled={!!off}
                                    placeholder={off ? "AI is off for your school" : "Ask Afey…  e.g. how many are absent today?"}
                                    className="flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400" />
                                <button type="submit" disabled={!text.trim() || chat.ask.isPending || !!off} aria-label="Send"
                                    className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 shrink-0">
                                    {chat.ask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>
                        {!chat.messages.length && !off && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {(status?.suggestions || []).map(s => <button key={s} onClick={() => send(s)} className="text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">{s}</button>)}
                            </div>
                        )}
                        {off && <p className="text-[11px] text-slate-500 mt-2">{status?.platform ? "A school admin can turn AI on in Settings." : "The platform owner hasn't set up the AI key yet."}</p>}
                        {status?.enabled && status.canAct && !chat.messages.length && <p className="text-[10px] text-slate-400 mt-2">Afey prepares messages — nothing is sent until you approve.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
