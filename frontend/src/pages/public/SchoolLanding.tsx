import { Link } from "react-router-dom";
import { GraduationCap, Users, UserCheck, ShieldCheck, ArrowRight, BookOpen, CalendarDays, CreditCard, Award, Phone, Mail, MapPin } from "lucide-react";
import { makePortalApi, currentTenantSubdomain, tenantDisplayName } from "@/lib/portal";
import { useBranding } from "@/portals/useBranding";

const brandingApi = makePortalApi("__none__");

// Build a portal subdomain URL (students./staff./parent.) for the current school.
function portalUrl(prefix: string) {
    const { protocol, hostname, port } = window.location;
    const p = port ? `:${port}` : "";
    const sub = currentTenantSubdomain();
    const rootDomain = (hostname === "localhost" || hostname.endsWith(".localhost"))
        ? "localhost"
        : (hostname.split(".").length > 2 ? hostname.split(".").slice(1).join(".") : hostname);
    return `${protocol}//${prefix}.${sub}.${rootDomain}${p}`;
}

const GREEN = "#159a52";
const DARK = "#0f2942";

export default function SchoolLanding() {
    const { data: brand } = useBranding(brandingApi);
    const name = brand?.name || tenantDisplayName() || "Our School";
    const logo = brand?.logo;

    const portals = [
        { title: "Student Portal", desc: "Results, fees, timetable, assignments & more", icon: GraduationCap, href: portalUrl("students"), color: GREEN },
        { title: "Parent Portal", desc: "Track your child's progress, fees and reports", icon: Users, href: portalUrl("parent"), color: "#7c3aed" },
        { title: "Teacher Portal", desc: "Classes, marks entry, attendance & content", icon: UserCheck, href: portalUrl("teacher"), color: DARK },
    ];

    const highlights = [
        { icon: BookOpen, title: "Academics", desc: "Curriculum, exams and report cards" },
        { icon: CalendarDays, title: "Timetable", desc: "Class schedules and events" },
        { icon: CreditCard, title: "Fees & Payments", desc: "M-PESA payments and statements" },
        { icon: Award, title: "Results", desc: "Continuous assessment and grading" },
    ];

    return (
        <div className="min-h-screen bg-white text-slate-800">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {logo ? <img src={logo} alt={name} className="w-10 h-10 rounded-lg object-contain" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: GREEN }}><GraduationCap className="w-5 h-5" /></div>}
                        <span className="font-black text-lg" style={{ color: DARK }}>{name}</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
                        <a href={portals[0].href} className="hover:text-slate-800">Students</a>
                        <a href={portals[1].href} className="hover:text-slate-800">Parents</a>
                        <a href={portals[2].href} className="hover:text-slate-800">Teachers</a>
                        <a href="#contact" className="hover:text-slate-800">Contact</a>
                    </nav>
                    <Link to="/login" className="inline-flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-lg" style={{ background: GREEN }}>
                        Sign In <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${GREEN}10, ${DARK}08)` }} />
                <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center relative">
                    {logo && <img src={logo} alt={name} className="w-20 h-20 mx-auto mb-6 object-contain" />}
                    <p className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full" style={{ background: `${GREEN}15`, color: GREEN }}>Official School Portal</p>
                    <h1 className="text-4xl md:text-6xl font-black mb-4" style={{ color: DARK }}>Welcome to<br /><span style={{ color: GREEN }}>{name}</span></h1>
                    <p className="text-slate-500 max-w-2xl mx-auto mb-8 text-lg">Access your portal for results, fees, timetables, attendance and school communications — all in one place.</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <a href={portals[0].href} className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-lg" style={{ background: GREEN }}>Student Portal <ArrowRight className="w-4 h-4" /></a>
                        <a href={portals[1].href} className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-lg border-2" style={{ borderColor: GREEN, color: GREEN }}>Parent Portal</a>
                    </div>
                </div>
            </section>

            {/* Portal cards */}
            <section className="max-w-6xl mx-auto px-6 py-14">
                <h2 className="text-2xl font-black text-center mb-2" style={{ color: DARK }}>Choose your portal</h2>
                <p className="text-center text-slate-400 text-sm mb-10">Sign in to the portal that applies to you</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {portals.map(p => (
                        <a key={p.title} href={p.href} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-6">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white" style={{ background: p.color }}><p.icon className="w-6 h-6" /></div>
                            <h3 className="font-black text-lg mb-1" style={{ color: DARK }}>{p.title}</h3>
                            <p className="text-sm text-slate-500 mb-4">{p.desc}</p>
                            <span className="inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" style={{ color: p.color }}>Open portal <ArrowRight className="w-4 h-4" /></span>
                        </a>
                    ))}
                </div>
            </section>

            {/* Highlights */}
            <section className="bg-slate-50 py-14">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                        {highlights.map(h => (
                            <div key={h.title} className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
                                <div className="w-11 h-11 rounded-xl mx-auto flex items-center justify-center mb-3" style={{ background: `${GREEN}15` }}><h.icon className="w-5 h-5" style={{ color: GREEN }} /></div>
                                <p className="font-bold text-sm" style={{ color: DARK }}>{h.title}</p>
                                <p className="text-xs text-slate-400 mt-1">{h.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Admin / staff sign in strip */}
            <section className="max-w-6xl mx-auto px-6 py-12">
                <div className="rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4" style={{ background: `linear-gradient(135deg, ${GREEN}, ${DARK})` }}>
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8" />
                        <div><p className="font-black text-lg">School Administration</p><p className="text-white/80 text-sm">Staff & administrators sign in to manage the school</p></div>
                    </div>
                    <Link to="/login" className="bg-white font-bold px-6 py-3 rounded-lg" style={{ color: DARK }}>Sign In</Link>
                </div>
            </section>

            {/* Footer */}
            <footer id="contact" className="border-t border-slate-100 py-10">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                        {logo ? <img src={logo} alt={name} className="w-10 h-10 rounded-lg object-contain" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: GREEN }}><GraduationCap className="w-5 h-5" /></div>}
                        <span className="font-black" style={{ color: DARK }}>{name}</span>
                    </div>
                    <div className="text-sm text-slate-500 space-y-2">
                        <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-300" /> Contact the school office for directions</p>
                        <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-300" /> Phone via the school administration</p>
                        <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-300" /> Email via the school administration</p>
                    </div>
                    <div className="text-sm text-slate-400">
                        <p className="font-bold text-slate-600 mb-2">Quick Links</p>
                        <a href={portals[0].href} className="block hover:text-slate-700">Student Portal</a>
                        <a href={portals[1].href} className="block hover:text-slate-700">Parent Portal</a>
                        <a href={portals[2].href} className="block hover:text-slate-700">Staff Portal</a>
                    </div>
                </div>
                <p className="text-center text-xs text-slate-400 mt-8">© {new Date().getFullYear()} {name}. Powered by ShuleCloud.</p>
            </footer>
        </div>
    );
}
