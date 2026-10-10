import { useMemo, useState } from "react";
import { Search, Info, Loader2 } from "lucide-react";
import { APP_CATEGORIES } from "@/lib/apps";
import { useAppAccess } from "@/lib/useAppAccess";
import AppCard from "./AppCard";
import { useAppLists } from "./useAppLists";

// All the apps this user may open, grouped by category, with search and Quick Access.
export default function AppsPage() {
    const access = useAppAccess();
    const { recent, starred } = useAppLists();
    const [q, setQ] = useState("");
    const match = (a: any) => !q || `${a.name} ${a.description}`.toLowerCase().includes(q.toLowerCase());
    const list = useMemo(() => access.apps.filter(match), [access.apps, q]); // eslint-disable-line react-hooks/exhaustive-deps
    const byKey = new Map(list.map(a => [a.key, a]));
    const quick = [...starred, ...recent.filter(k => !starred.includes(k))].map(k => byKey.get(k)).filter(Boolean).slice(0, 4) as typeof list;

    const Section = ({ title, hint, apps }: { title: string; hint: string; apps: typeof list }) => !apps.length ? null : (
        <section className="space-y-3">
            <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-1.5">{title}<span title={hint}><Info className="w-3.5 h-3.5 text-slate-400" /></span></h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {apps.map(a => <AppCard key={a.key} app={a} starred={starred.includes(a.key)} locked={a.locked} />)}
            </div>
        </section>
    );

    return (
        <div className="flex-1 min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Apps</h1>
                        <p className="text-sm text-slate-500">Select an app to start your session.</p>
                    </div>
                    <div className="relative sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps"
                            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C67F2]/25 focus:border-[#5C67F2]" />
                    </div>
                </div>
                {!access.loaded ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div> : <>
                    <Section title="Quick Access" hint="Starred and recently used apps" apps={quick} />
                    {APP_CATEGORIES.map(c => <Section key={c.key} title={c.key} hint={c.hint} apps={list.filter(a => a.category === c.key)} />)}
                    {!list.length && <p className="text-sm text-slate-500 py-10 text-center">{q ? `No app matches "${q}".` : "No apps have been given to your account yet. Ask the school administrator."}</p>}
                </>}
            </div>
        </div>
    );
}
