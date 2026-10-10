import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, ArrowRight } from "lucide-react";
import { appHomePath } from "@/lib/apps";
import { useAppAccess } from "@/lib/useAppAccess";

// Top-bar grid button: jump straight to any app you may use.
export default function AppSwitcher({ className = "" }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const access = useAppAccess();
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);
    const apps = access.apps.filter(a => !a.locked);
    return (
        <div className="relative" ref={box}>
            <button onClick={() => setOpen(o => !o)} title="Apps" className={`relative transition-colors ${className}`}><LayoutGrid className="w-6 h-6" strokeWidth={1.5} /></button>
            {open && (
                <div className="absolute right-0 mt-3 w-[340px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-3">
                    <div className="grid grid-cols-3 gap-1 max-h-[360px] overflow-y-auto">
                        {apps.map(a => {
                            const I = a.icon;
                            return (
                                <Link key={a.key} to={appHomePath(a)} onClick={() => setOpen(false)} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 text-center">
                                    <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${a.color}14`, color: a.color }}><I className="w-5 h-5" /></span>
                                    <span className="text-[11px] font-semibold text-slate-700 leading-tight line-clamp-2">{a.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                    <Link to="/apps" onClick={() => setOpen(false)} className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-xs font-semibold text-[#3f48c9]">All apps <ArrowRight className="w-3.5 h-3.5" /></Link>
                </div>
            )}
        </div>
    );
}
