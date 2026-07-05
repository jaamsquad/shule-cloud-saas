import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, Mail, Phone, MapPin, Shield, Lock, X, Globe, Share2,
} from "lucide-react";

// EduStream-inspired brand palette: deep navy + teal-green on soft off-white.
export const NAVY = "#0f2942";          // headings, dark sections, footer
export const NAVY_DEEP = "#0c2137";
export const TEAL = "#158066";          // primary CTA / accent
export const TEAL_DARK = "#0f6b54";
export const MINT = "#a7e8d8";          // icon-chip backgrounds
export const MINT_SOFT = "#d3f3ea";
export const PAGE_BG = "#f4f8fa";       // page background
// Back-compat aliases (older imports referenced PURPLE) → mapped to the new palette.
export const PURPLE = TEAL;
export const PURPLE_LIGHT = MINT_SOFT;
export const BLUE = NAVY;
export const CONTACT_PHONE = "+254 726 151 104";
export const CONTACT_PHONE_RAW = "+254726151104";
export const CONTACT_EMAIL = "hello@shulecloud.com";

// Reusable UI atoms in the new design language.
export function IconChip({ icon: Icon, className = "" }: { icon: any; className?: string }) {
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${className}`} style={{ background: MINT_SOFT }}>
      <Icon className="w-5 h-5" style={{ color: TEAL }} />
    </div>
  );
}
export function TealButton({ to, children, className = "" }: { to: string; children: ReactNode; className?: string }) {
  return <Link to={to} className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-lg transition-colors ${className}`} style={{ background: TEAL }}>{children}</Link>;
}
export function OutlineButton({ to, children, className = "" }: { to: string; children: ReactNode; className?: string }) {
  return <Link to={to} className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg border transition-colors ${className}`} style={{ color: NAVY, borderColor: "#d4dee6", background: "#fff" }}>{children}</Link>;
}

// Top-level nav links (EduStream style: simple centered links, active teal underline).
const NAV_LINKS: { label: string; to: string }[] = [
  { label: "Features", to: "/features" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blogs" },
  { label: "Pricing", to: "/register" },
  { label: "FAQs", to: "/faq" },
  { label: "Contact", to: "/contact" },
];

export function MarketingNav() {
  const [openMobile, setOpenMobile] = useState(false);
  const { pathname } = useLocation();
  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-50 border-b" style={{ background: PAGE_BG, borderColor: "#e6eef3" }}>
      <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">
        <Link to="/" className="text-2xl font-black tracking-tight" style={{ color: NAVY, fontFamily: "'Poppins', sans-serif" }}>
          Shule<span style={{ color: TEAL }}>Cloud</span>
        </Link>

        {/* Centered links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold">
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} className="relative py-1.5 transition-colors" style={{ color: isActive(l.to) ? TEAL : "#334155" }}>
              {l.label}
              {isActive(l.to) && <span className="absolute left-0 -bottom-0.5 w-full h-0.5 rounded" style={{ background: TEAL }} />}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden sm:inline-flex text-sm font-bold" style={{ color: NAVY }}>Login</Link>
          <TealButton to="/register">Get Started</TealButton>
          <button onClick={() => setOpenMobile(true)} className="lg:hidden p-2" style={{ color: NAVY }}><Menu className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Mobile drawer */}
      {openMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenMobile(false)} />
          <div className="absolute left-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xl font-black" style={{ color: NAVY }}>Shule<span style={{ color: TEAL }}>Cloud</span></span>
              <button onClick={() => setOpenMobile(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            {NAV_LINKS.map(l => <Link key={l.to} to={l.to} onClick={() => setOpenMobile(false)} className="block py-2.5 text-sm font-bold" style={{ color: isActive(l.to) ? TEAL : NAVY }}>{l.label}</Link>)}
            <Link to="/login" onClick={() => setOpenMobile(false)} className="mt-4 flex items-center justify-center h-11 rounded-lg text-sm font-bold border" style={{ color: NAVY, borderColor: "#d4dee6" }}><Lock className="w-3.5 h-3.5 mr-1.5" /> Login</Link>
            <Link to="/register" onClick={() => setOpenMobile(false)} className="mt-2 flex items-center justify-center h-11 rounded-lg text-sm font-bold text-white" style={{ background: TEAL }}>Get Started</Link>
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
    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}>
      {/* subtle geometric texture */}
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 70%, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
    </div>
  );
}

/**
 * Shared shell for public info/legal pages (Terms, Privacy, Status, …) so they
 * match the landing page — purple header band + the marketing nav and footer.
 */
export function LegalShell({ title, subtitle, badge, lastUpdated, children }: { title: string; subtitle?: string; badge?: string; lastUpdated?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen text-slate-800 font-sans" style={{ background: PAGE_BG }}>
      <MarketingNav />
      <section className="relative overflow-hidden text-center text-white py-16 px-6">
        <HeroBackdrop />
        <div className="relative max-w-3xl mx-auto">
          {badge && <span className="inline-block text-[11px] font-black uppercase tracking-wide px-3 py-1 rounded-full mb-4" style={{ background: "rgba(167,232,216,.2)", color: MINT }}>{badge}</span>}
          <h1 className="text-4xl md:text-5xl font-black" style={{ fontFamily: "'Poppins', sans-serif" }}>{title}</h1>
          {subtitle && <p className="text-white/75 text-lg mt-3">{subtitle}</p>}
          {lastUpdated && <p className="text-white/60 text-sm mt-3">Last Updated: {lastUpdated}</p>}
        </div>
      </section>
      <main className="max-w-4xl mx-auto px-6 py-14">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-10 prose-legal">{children}</div>
      </main>
      <MarketingFooter />
    </div>
  );
}

const FOOTER_COLS: { h: string; links: [string, string][] }[] = [
  { h: "Product", links: [["Features", "/features"], ["Pricing", "/register"], ["Blog", "/blogs"], ["Status", "/status"]] },
  { h: "Company", links: [["About Us", "/about"], ["Contact", "/contact"], ["FAQs", "/faq"], ["Sign In", "/login"]] },
  { h: "Resources", links: [["Help Center", "/faq"], ["Get Started", "/register"], ["Documentation", "/features"]] },
  { h: "Legal", links: [["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"]] },
];

export function MarketingFooter() {
  return (
    <footer style={{ background: NAVY }} className="text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-6 gap-8">
        <div className="col-span-2">
          <div className="text-2xl font-black mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>Shule<span style={{ color: MINT }}>Cloud</span></div>
          <p className="text-sm text-white/60 max-w-xs mb-5">The all-in-one cloud platform powering schools across Kenya — academics, finance, communication and more.</p>
          <div className="space-y-1.5 text-sm text-white/60">
            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-white/40" /> {CONTACT_EMAIL}</p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-white/40" /> {CONTACT_PHONE}</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-white/40" /> Nairobi, Kenya</p>
          </div>
        </div>
        {FOOTER_COLS.map(col => (
          <div key={col.h}>
            <p className="font-black text-sm mb-3 text-white">{col.h}</p>
            <div className="space-y-2">
              {col.links.map(([label, to]) => <Link key={label} to={to} className="block text-sm text-white/60 hover:text-white transition-colors">{label}</Link>)}
            </div>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
        <span>© {new Date().getFullYear()} ShuleCloud. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Global</span>
          <span className="inline-flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5" /> Share</span>
          {/* Platform owner / super-admin entry — manages all schools on the system. */}
          <Link to="/owner/login" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-white transition-colors" style={{ background: TEAL }}>
            <Shield className="w-3.5 h-3.5" /> Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
