import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight, Menu, Mail, Phone, MapPin, Shield } from "lucide-react";

export const BLUE = "#2563EB";
export const NAVY = "#0B1B34";
export const TEAL = "#10B981";
export const CONTACT_PHONE = "+254 726 151 104";
export const CONTACT_PHONE_RAW = "+254726151104";
export const CONTACT_EMAIL = "hello@shulecloud.com";

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: BLUE }}>
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight" style={{ color: NAVY }}>Shule<span style={{ color: BLUE }}>Cloud</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
          <Link to="/#products" className="hover:text-slate-900">Products</Link>
          <Link to="/features" className="hover:text-slate-900">Features</Link>
          <Link to="/pricing" className="hover:text-slate-900">Pricing</Link>
          <Link to="/contact" className="hover:text-slate-900">Contact</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:inline-flex px-4 py-2 text-sm font-bold text-slate-700 hover:text-slate-900">Sign In</Link>
          <Link to="/register" className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm" style={{ background: BLUE }}>
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <button className="md:hidden text-slate-500 p-2"><Menu className="w-5 h-5" /></button>
        </div>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-100 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: BLUE }}><GraduationCap className="w-5 h-5" /></div>
            <span className="text-xl font-black" style={{ color: NAVY }}>Shule<span style={{ color: BLUE }}>Cloud</span></span>
          </div>
          <p className="text-sm text-slate-500 max-w-xs mb-4">The all-in-one cloud platform powering schools across Kenya — academics, finance, communication and more.</p>
          <div className="space-y-1.5 text-sm text-slate-500">
            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-300" /> {CONTACT_EMAIL}</p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-300" /> {CONTACT_PHONE}</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-300" /> Nairobi, Kenya</p>
          </div>
        </div>
        {[
          { h: "Product", links: [["Features", "/features"], ["Pricing", "/pricing"], ["Status", "/status"]] },
          { h: "Company", links: [["Contact", "/contact"], ["Sign In", "/login"], ["Get Started", "/register"]] },
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
