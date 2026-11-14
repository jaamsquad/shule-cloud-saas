import { Link } from "react-router-dom";
import { Phone, Mail, Bot, LayoutGrid, ShieldCheck, Globe } from "lucide-react";

// Help & support.
export default function HelpPage() {
    const items = [
        { icon: LayoutGrid, title: "Finding your way", body: "Open Apps to see everything your account can use. Star an app to keep it on Home.", to: "/apps", cta: "Open Apps" },
        { icon: ShieldCheck, title: "Missing an app?", body: "Apps follow your role. Ask the school administrator to grant it in Roles & Permissions.", to: null, cta: "" },
        { icon: Bot, title: "ShuleCloud Assistant", body: "Use the Assistant button at the bottom right to ask how to do something.", to: null, cta: "" },
    ];
    return (
        <div className="flex-1 min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-5">
                <div><h1 className="text-xl font-bold text-slate-900">Help</h1><p className="text-sm text-slate-500">Get around ShuleCloud and reach support.</p></div>
                <div className="grid md:grid-cols-3 gap-3">
                    {items.map(i => (
                        <div key={i.title} className="bg-white rounded-2xl border border-slate-100 p-5">
                            <i.icon className="w-5 h-5 text-[#5C67F2]" />
                            <p className="text-sm font-bold text-slate-800 mt-3">{i.title}</p>
                            <p className="text-[13px] text-slate-500 mt-1">{i.body}</p>
                            {i.to && <Link to={i.to} className="text-[13px] font-semibold text-[#3f48c9] mt-2 inline-block">{i.cta} →</Link>}
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 grid sm:grid-cols-3 gap-4">
                    <a href="tel:0726151104" className="flex items-center gap-3"><Phone className="w-5 h-5 text-emerald-600" /><span><span className="block text-xs text-slate-400">Call support</span><span className="text-sm font-semibold text-slate-800">0726 151 104</span></span></a>
                    <a href="mailto:support@shulecloud.com" className="flex items-center gap-3"><Mail className="w-5 h-5 text-sky-600" /><span><span className="block text-xs text-slate-400">Email</span><span className="text-sm font-semibold text-slate-800">support@shulecloud.com</span></span></a>
                    <a href="https://shulecloud.com" target="_blank" rel="noreferrer" className="flex items-center gap-3"><Globe className="w-5 h-5 text-[#5C67F2]" /><span><span className="block text-xs text-slate-400">Website</span><span className="text-sm font-semibold text-slate-800">shulecloud.com</span></span></a>
                </div>
            </div>
        </div>
    );
}
