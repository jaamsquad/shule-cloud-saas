import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShuleCloudLogo } from "./ShuleCloudLogo";
import {
  GraduationCap, Menu, Mail, Phone, MapPin, Shield, Lock, ChevronDown,
  Cloud, Smartphone, Monitor, Network, Server, BookOpen, PenLine, Sliders,
  Rocket, BookOpenCheck, PlayCircle, Headset, X,
} from "lucide-react";

// eSkooly-style brand palette.
export const PURPLE = "#613ddf";
export const PURPLE_LIGHT = "#ddddf9";
export const BLUE = "#613ddf";        // alias kept for existing imports
export const NAVY = "#1a1333";
export const TEAL = "#613ddf";
export const CONTACT_PHONE = "+254 726 151 104";
export const CONTACT_PHONE_RAW = "+254726151104";
export const CONTACT_EMAIL = "hello@shulecloud.com";

type MegaItem = { icon: any; title: string; desc: string; to: string; badge?: "Free" | "Paid" };
const PRODUCTS: { group: string; items: MegaItem[] }[] = [
  { group: "Cloud Solutions", items: [
    { icon: Cloud, title: "ShuleCloud Basic", desc: "Free cloud school management for schools, colleges and institutes.", to: "/register", badge: "Free" },
    { icon: Smartphone, title: "Mobile Apps", desc: "Apps for students, teachers and parents.", to: "/features", badge: "Free" },
    { icon: Monitor, title: "Parent & Student Portals", desc: "Dedicated portals keep everyone connected.", to: "/features", badge: "Free" },
    { icon: Network, title: "Integrations", desc: "Connect SMS, WhatsApp & M-PESA Daraja.", to: "/features", badge: "Free" },
  ] },
  { group: "Advanced", items: [
    { icon: Server, title: "Custom Domains & Branding", desc: "Run on your own domain with your branding.", to: "/features", badge: "Paid" },
    { icon: GraduationCap, title: "CBC Assessment & LMS", desc: "Full competency-based assessment & e-learning.", to: "/features", badge: "Paid" },
    { icon: Cloud, title: "Cloud Hosting", desc: "Secure per-school data isolation & storage.", to: "/features", badge: "Paid" },
  ] },
];
const EXPLORE: MegaItem[] = [
  { icon: PenLine, title: "Blog", desc: "Our latest news and updates.", to: "/blogs" },
  { icon: Sliders, title: "Features & Tools", desc: "Everything ShuleCloud can do.", to: "/features" },
  { icon: Rocket, title: "Our Story", desc: "How we got here and where we're going.", to: "/contact" },
];
const SUPPORT: MegaItem[] = [
  { icon: BookOpenCheck, title: "FAQs", desc: "Advice & answers to common questions.", to: "/faq" },
  { icon: PlayCircle, title: "Video Tutorials", desc: "Detailed how-to-use guides.", to: "/features" },
  { icon: Headset, title: "Support Center", desc: "Get help from the ShuleCloud team.", to: "/contact" },
];

function Badge({ kind }: { kind: "Free" | "Paid" }) {
  const free = kind === "Free";
  return <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded" style={free ? { background: PURPLE, color: "#fff" } : { background: PURPLE_LIGHT, color: PURPLE }}>{kind}</span>;
}
function MegaItemRow({ it }: { it: MegaItem }) {
  return (
    <Link to={it.to} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
      <it.icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: PURPLE }} />
      <div className="min-w-0">
        <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-800">{it.title}</span>{it.badge && <Badge kind={it.badge} />}</div>
        <p className="text-[11px] text-slate-400 leading-snug">{it.desc}</p>
      </div>
    </Link>
  );
}

export function MarketingNav() {
  const [openMobile, setOpenMobile] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 h-[70px] flex items-center justify-between">
        {/* Logo */}
        <Link to="/"><ShuleCloudLogo /></Link>

        {/* Desktop mega-menu nav */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-700">
          <div className="relative" onMouseEnter={() => setHover("products")} onMouseLeave={() => setHover(null)}>
            <button className="flex items-center gap-1 py-6 hover:text-[#613ddf]">Products <ChevronDown className="w-3.5 h-3.5" /></button>
            {hover === "products" && (
              <div className="absolute left-0 top-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 grid grid-cols-2 gap-5" style={{ width: 720 }}>
                {PRODUCTS.map(g => <div key={g.group}><p className="text-[11px] font-black text-slate-400 uppercase tracking-wide px-2.5 mb-1">{g.group}</p>{g.items.map(it => <MegaItemRow key={it.title} it={it} />)}</div>)}
              </div>
            )}
          </div>
          <div className="relative" onMouseEnter={() => setHover("explore")} onMouseLeave={() => setHover(null)}>
            <button className="flex items-center gap-1 py-6 hover:text-[#613ddf]">Explore <ChevronDown className="w-3.5 h-3.5" /></button>
            {hover === "explore" && <div className="absolute left-0 top-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-4" style={{ width: 320 }}>{EXPLORE.map(it => <MegaItemRow key={it.title} it={it} />)}</div>}
          </div>
          <div className="relative" onMouseEnter={() => setHover("support")} onMouseLeave={() => setHover(null)}>
            <button className="flex items-center gap-1 py-6 hover:text-[#613ddf]">Support <ChevronDown className="w-3.5 h-3.5" /></button>
            {hover === "support" && <div className="absolute left-0 top-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-4" style={{ width: 320 }}>{SUPPORT.map(it => <MegaItemRow key={it.title} it={it} />)}</div>}
          </div>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold rounded-lg" style={{ background: PURPLE_LIGHT, color: PURPLE, border: `1px solid ${PURPLE}` }}><Lock className="w-3.5 h-3.5" /> Login</Link>
          <Link to="/register" className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-white rounded-lg" style={{ background: PURPLE }}>Sign Up Now</Link>
          <button onClick={() => setOpenMobile(true)} className="lg:hidden text-slate-700 p-2"><Menu className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Mobile drawer */}
      {openMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenMobile(false)} />
          <div className="absolute left-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <ShuleCloudLogo />
              <button onClick={() => setOpenMobile(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            {[...PRODUCTS.flatMap(g => g.items), ...EXPLORE, ...SUPPORT].map(it => <Link key={it.title} to={it.to} onClick={() => setOpenMobile(false)} className="flex items-center gap-2 py-2.5 text-sm font-bold text-slate-700"><it.icon className="w-4 h-4" style={{ color: PURPLE }} /> {it.title}</Link>)}
            <Link to="/login" onClick={() => setOpenMobile(false)} className="mt-4 flex items-center justify-center gap-1.5 h-11 rounded-lg text-sm font-bold" style={{ background: PURPLE_LIGHT, color: PURPLE }}><Lock className="w-3.5 h-3.5" /> Login</Link>
            <Link to="/register" onClick={() => setOpenMobile(false)} className="mt-2 flex items-center justify-center h-11 rounded-lg text-sm font-bold text-white" style={{ background: PURPLE }}>Sign Up Now</Link>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * School photo behind a purple gradient — the standard backdrop for the purple
 * hero bands across the public site. Absolutely positioned; place inside a
 * `relative overflow-hidden` section and render content in a sibling with
 * `relative` so it sits above this layer.
 */
export function HeroBackdrop() {
  return (
    <div className="absolute inset-0">
      <img src="/auth-hero.png" alt="" aria-hidden="true" className="w-full h-full object-cover object-[center_25%]" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(90,54,214,.93) 0%, rgba(67,38,181,.92) 55%, rgba(52,25,154,.95) 100%)" }} />
    </div>
  );
}

/**
 * Shared shell for public info/legal pages (Terms, Privacy, Status, …) so they
 * match the landing page — purple header band + the marketing nav and footer.
 */
export function LegalShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <MarketingNav />
      <section className="relative overflow-hidden text-center text-white py-20 px-6">
        <HeroBackdrop />
        <div className="relative">
          <h1 className="text-4xl md:text-5xl font-black">{title}</h1>
          {subtitle && <p className="text-white/80 text-lg mt-3 max-w-2xl mx-auto">{subtitle}</p>}
        </div>
      </section>
      <main className="max-w-3xl mx-auto px-6 py-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-100 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="mb-4"><ShuleCloudLogo /></div>
          <p className="text-sm text-slate-500 max-w-xs mb-4">The all-in-one cloud platform powering schools across Kenya — academics, finance, communication and more.</p>
          <div className="space-y-1.5 text-sm text-slate-500">
            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-300" /> {CONTACT_EMAIL}</p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-300" /> {CONTACT_PHONE}</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-300" /> Nairobi, Kenya</p>
          </div>
        </div>
        {[
          { h: "Product", links: [["Features", "/features"], ["Blog", "/blogs"], ["Status", "/status"]] },
          { h: "Company", links: [["FAQs", "/faq"], ["Contact", "/contact"], ["Sign In", "/login"], ["Get Started", "/register"]] },
          { h: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"]] },
        ].map(col => (
          <div key={col.h}>
            <p className="font-black text-sm mb-3" style={{ color: NAVY }}>{col.h}</p>
            <div className="space-y-2">
              {col.links.map(([label, to]) => <Link key={label} to={to} className="block text-sm text-slate-500 hover:text-slate-800">{label}</Link>)}
            </div>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <span>© {new Date().getFullYear()} ShuleCloud. All rights reserved.</span>
        {/* Platform owner / super-admin entry — manages all schools on the system. */}
        <Link
          to="/owner/login"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-white transition-colors"
          style={{ background: NAVY }}
        >
          <Shield className="w-3.5 h-3.5" /> Admin Login
        </Link>
      </div>
    </footer>
  );
}
