import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { appByKey, touchApp } from "@/lib/apps";
import { useAppAccess } from "@/lib/useAppAccess";
import { groupOverviewPath } from "@/components/navItems";
import { useTerminology } from "@/hooks/useTerminology";

// An app's landing page: "What would you like to see today?" with each section's pages.
export default function AppDashboard() {
    const { key = "" } = useParams();
    const app = appByKey(key);
    const access = useAppAccess();
    const words = useTerminology();
    useEffect(() => { if (app) touchApp(app.key); }, [app?.key]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!app) return <Navigate to="/apps" replace />;
    if (app.path) return <Navigate to={app.path} replace />;
    if (!access.loaded) return <div className="flex-1 flex items-center justify-center min-h-[300px]"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div>;
    const view = access.apps.find(a => a.key === app.key);
    if (!view) return <Navigate to="/access-denied" replace state={{ from: `/apps/${key}` }} />;
    const Icon = app.icon;

    return (
        <div className="flex-1 min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-5">
                <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${app.color}18`, color: app.color }}><Icon className="w-5 h-5" /></span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{app.name}</h1>
                        <p className="text-sm text-slate-500">What would you like to see today?</p>
                    </div>
                </div>
                {view.locked && <p className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-center gap-2"><Lock className="w-4 h-4" /> This app is not included in your plan, contact for more @ 0726151104</p>}
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {view.groupsVisible.map(g => {
                        const kids = access.visibleChildren(g).filter(c => c.path !== "/logout");
                        const GIcon = g.icon;
                        return (
                            <section key={g.label} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500"><GIcon className="w-4 h-4" /></span>
                                    <h2 className="text-sm font-bold text-slate-800 flex-1">{words.label(g.label)}</h2>
                                    <span className="text-[11px] text-slate-400">{kids.length} page{kids.length === 1 ? "" : "s"}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 flex-1">
                                    {kids.slice(0, 8).map(c => c.path.startsWith("http")
                                        ? <a key={c.path} href={c.path} target="_blank" rel="noreferrer" className="text-[13px] text-slate-600 hover:text-[#3f48c9] py-1">{words.label(c.label)}</a>
                                        : <Link key={c.path} to={c.path} className="text-[13px] text-slate-600 hover:text-[#3f48c9] py-1">{words.label(c.label)}</Link>)}
                                    {kids.length > 8 && <p className="text-[12px] text-slate-400 py-1">+{kids.length - 8} more in the sidebar</p>}
                                </div>
                                <Link to={groupOverviewPath(g.label)} className="mt-3 pt-3 border-t border-slate-100 text-[13px] font-semibold text-[#3f48c9] inline-flex items-center gap-1">Open {words.label(g.label)} overview <ArrowRight className="w-3.5 h-3.5" /></Link>
                            </section>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
