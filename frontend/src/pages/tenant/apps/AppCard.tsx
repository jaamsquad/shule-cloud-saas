import { Link } from "react-router-dom";
import { Star, Lock } from "lucide-react";
import { toast } from "sonner";
import { appHomePath, toggleStar, type AppDef } from "@/lib/apps";

const PLAN_LOCK_MSG = "This app is not included in your plan, contact for more @ 0726151104";

/** One app tile: icon, name, what's inside, and a star to keep it in Quick Access. */
export default function AppCard({ app, starred, locked }: { app: AppDef; starred: boolean; locked?: boolean }) {
    const Icon = app.icon;
    const body = (
        <>
            <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${app.color}14`, color: app.color }}><Icon className="w-[18px] h-[18px]" /></span>
                <div className="min-w-0 flex-1 pr-6">
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">{app.name}{locked && <Lock className="w-3 h-3 text-amber-500" />}</p>
                    <p className="text-[12.5px] leading-snug text-slate-500 mt-1 line-clamp-2">{app.description}</p>
                </div>
            </div>
            <button type="button" aria-label={starred ? "Remove from Quick Access" : "Add to Quick Access"}
                onClick={e => { e.preventDefault(); e.stopPropagation(); toggleStar(app.key); }}
                className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-amber-500">
                <Star className={`w-4 h-4 ${starred ? "fill-amber-400 text-amber-400" : ""}`} />
            </button>
        </>
    );
    const cls = "relative block bg-white rounded-xl border border-slate-200 p-4 hover:border-[#5C67F2]/50 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all";
    if (locked) return <button type="button" onClick={() => toast.message(PLAN_LOCK_MSG, { duration: 6000 })} className={`${cls} text-left w-full opacity-70`}>{body}</button>;
    return <Link to={appHomePath(app)} className={cls}>{body}</Link>;
}
