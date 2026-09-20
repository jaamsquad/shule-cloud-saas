import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

const DISMISS_KEY = "pwa_install_dismissed";
const WEEK = 7 * 24 * 3600 * 1000;

// Chrome / Edge / Android fire `beforeinstallprompt` when the app can be installed.
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

const isInstalled = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
const recentlyDismissed = () => { try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < WEEK; } catch { return false; } };

/** "Install ShuleCloud 360" — lets people add the app to their home screen / desktop (a PWA). */
export default function InstallPrompt() {
    const [evt, setEvt] = useState<InstallEvent | null>(null);
    const [iosHelp, setIosHelp] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isInstalled() || recentlyDismissed()) return;
        const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); setVisible(true); };
        const onInstalled = () => setVisible(false);
        window.addEventListener("beforeinstallprompt", onPrompt);
        window.addEventListener("appinstalled", onInstalled);
        // iPhone / iPad Safari can't install with a button — show the Share → Add to Home Screen steps instead.
        if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream) { setIosHelp(true); setVisible(true); }
        return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
    }, []);

    const dismiss = () => { setVisible(false); try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ } };
    const install = async () => {
        if (!evt) return;
        await evt.prompt();
        const choice = await evt.userChoice.catch(() => null);
        setEvt(null); setVisible(false);
        if (choice?.outcome === "dismissed") dismiss();
    };

    if (!visible) return null;
    return (
        <div className="fixed top-4 right-4 z-[100] w-[calc(100%-2rem)] max-w-sm print:hidden">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-center gap-3">
                <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-800 text-sm">Install ShuleCloud 360</div>
                    {iosHelp && !evt
                        ? <div className="text-xs text-slate-500">Tap <Share className="inline w-3 h-3 -mt-0.5" /> Share, then <b>Add to Home Screen</b>.</div>
                        : <div className="text-xs text-slate-500">Quicker, full-screen access.</div>}
                </div>
                {evt && <button onClick={install} className="h-9 px-4 rounded-lg bg-[#534AB7] hover:bg-[#443c9b] text-white text-xs font-bold flex items-center gap-1.5 shrink-0"><Download className="w-3.5 h-3.5" /> Install</button>}
                <button onClick={dismiss} aria-label="Dismiss" className="text-slate-400 hover:text-slate-700 shrink-0 self-start"><X className="w-4 h-4" /></button>
            </div>
        </div>
    );
}
