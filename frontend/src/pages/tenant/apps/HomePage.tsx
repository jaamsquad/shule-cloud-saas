import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAppAccess } from "@/lib/useAppAccess";
import AppCard from "./AppCard";
import { useAppLists } from "./useAppLists";

const greeting = (h: number) => (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
const firstName = () => { try { const u = JSON.parse(localStorage.getItem("user") || "{}"); return String(u.name || u.email || "").split(/[\s@]/)[0]; } catch { return ""; } };

// Home: greeting + Quick Access (starred first, then recently used apps).
export default function HomePage() {
    const access = useAppAccess();
    const { recent, starred } = useAppLists();
    const [now, setNow] = useState(new Date());
    useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);

    const byKey = new Map(access.apps.map(a => [a.key, a]));
    const quick = [...starred, ...recent.filter(k => !starred.includes(k))].map(k => byKey.get(k)).filter(Boolean).slice(0, 8) as typeof access.apps;
    const suggested = quick.length ? [] : access.apps.filter(a => !a.locked).slice(0, 4);
    const name = firstName();

    return (
        <div className="flex-1 min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-5">
                <section className="bg-white rounded-2xl border border-slate-100 p-6">
                    <h1 className="text-2xl font-bold text-[#3f48c9]">{greeting(now.getHours())}{name ? `, ${name.toUpperCase()}` : ""}</h1>
                    <p className="text-sm text-slate-500 mt-1">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} | {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 p-6">
                    <h2 className="text-lg font-bold text-slate-900">Quick Access</h2>
                    <p className="text-sm text-slate-500 mb-4">{quick.length ? "Your starred and recently used apps" : "Apps you can open — star one to keep it here"}</p>
                    {!access.loaded ? <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /></div> : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {(quick.length ? quick : suggested).map(a => <AppCard key={a.key} app={a} starred={starred.includes(a.key)} locked={a.locked} />)}
                        </div>
                    )}
                    {access.loaded && !access.apps.length && <p className="text-sm text-slate-500">No apps have been given to your account yet. Ask the school administrator.</p>}
                    <div className="flex justify-end mt-4">
                        <Link to="/apps" className="text-sm font-semibold text-[#3f48c9] inline-flex items-center gap-1 hover:underline">View all apps <ArrowRight className="w-4 h-4" /></Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
