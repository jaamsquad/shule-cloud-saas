import { Link } from "react-router-dom";
import {
  GraduationCap, BarChart3, CreditCard, Calendar, BookOpen, MessageSquare,
  Users, ArrowRight, Check, Star, ShieldCheck, TrendingUp, Wallet,
  PlayCircle, Phone, Mail, MapPin, CheckCircle2, Menu,
} from "lucide-react";
import { resolvePortal } from "@/lib/portal";
import SchoolLanding from "./SchoolLanding";

const BLUE = "#1B5FE3";
const NAVY = "#0A1B3F";
const TEAL = "#16B364";

const products = [
  { icon: BarChart3, color: BLUE, title: "Analytics & Reports", desc: "Live academic dashboards, performance trends, report cards and exam analysis in one click." },
  { icon: CreditCard, color: TEAL, title: "Fees & Finance", desc: "Invoicing, M-PESA payments, statements, defaulters and full accounting — automated." },
  { icon: Calendar, color: "#F59E0B", title: "Smart Timetable", desc: "Auto-generate clash-free timetables with teacher availability and room allocation." },
  { icon: BookOpen, color: "#7C3AED", title: "CBC Academics", desc: "Learning areas, strands, competencies and rubrics — fully CBC & KCSE ready." },
  { icon: MessageSquare, color: "#EC4899", title: "Communications", desc: "Reach parents instantly via SMS, Email and WhatsApp — results, fees and announcements." },
  { icon: Users, color: "#0EA5E9", title: "Student & Parent Portals", desc: "Dedicated portals for students, parents and teachers — everyone stays in the loop." },
];

const stats = [
  { value: "500+", label: "Schools" },
  { value: "100,000+", label: "Students" },
  { value: "47", label: "Counties" },
  { value: "99.9%", label: "Uptime" },
];

const features = [
  "CBC & KCSE compliant out of the box",
  "M-PESA Daraja fee payments built in",
  "Role-based access for every staff member",
  "Works on any device — phone, tablet, laptop",
  "Bank-grade security & per-school data isolation",
  "Free updates and Kenyan-based support",
];

const testimonials = [
  { name: "Mrs. Wanjiku", role: "Head Teacher, Nairobi Girls Academy", quote: "ShuleCloud transformed how we run our school. CBC reporting that used to take days now takes minutes." },
  { name: "Mr. Ochieng", role: "Principal, Kisumu Boys High", quote: "Fee collection and M-PESA reconciliation are effortless. Parents love the instant receipts." },
  { name: "Mrs. Chebet", role: "Bursar, Eldoret Heights", quote: "One platform for finance, academics and communication. It paid for itself in a single term." },
];

export default function Landing() {
  // School subdomains (e.g. egerton.shulecloud.com) get their own branded site.
  if (resolvePortal().portal === "tenant") return <SchoolLanding />;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: BLUE }}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight" style={{ color: NAVY }}>Shule<span style={{ color: BLUE }}>Cloud</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
            <a href="#products" className="hover:text-slate-900">Products</a>
            <a href="#why" className="hover:text-slate-900">Why ShuleCloud</a>
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

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#EEF4FF 0%, #ffffff 60%)" }} />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-20 lg:pt-24 relative grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: `${BLUE}12`, color: BLUE }}>
              <Star className="w-3.5 h-3.5" /> Kenya's all-in-one school platform
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] mb-5" style={{ color: NAVY }}>
              Run your whole school from <span style={{ color: BLUE }}>one cloud platform</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mb-8">
              From admissions to report cards, fee collection to timetabling — ShuleCloud digitizes every part of your school. Built for Kenyan schools, CBC-ready.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <Link to="/register" className="inline-flex items-center gap-2 px-7 py-3.5 font-bold text-white rounded-xl shadow-lg" style={{ background: BLUE }}>
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 px-7 py-3.5 font-bold rounded-xl border-2 text-slate-700 hover:bg-slate-50" style={{ borderColor: "#E2E8F0" }}>
                <PlayCircle className="w-5 h-5" style={{ color: BLUE }} /> Request a Demo
              </Link>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {["#1B5FE3", "#16B364", "#F59E0B", "#7C3AED"].map(c => <div key={c} className="w-8 h-8 rounded-full border-2 border-white" style={{ background: c }} />)}
              </div>
              <span><b className="text-slate-800">500+ schools</b> trust ShuleCloud</span>
            </div>
          </div>

          {/* Right — dashboard mockup */}
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 rotate-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: BLUE }}><GraduationCap className="w-4 h-4" /></div><span className="font-black text-sm" style={{ color: NAVY }}>School Dashboard</span></div>
                <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-rose-300" /><span className="w-2 h-2 rounded-full bg-amber-300" /><span className="w-2 h-2 rounded-full bg-emerald-300" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[{ l: "Students", v: "1,248", c: BLUE }, { l: "Collected", v: "KSh 8.2M", c: TEAL }, { l: "Attendance", v: "96%", c: "#F59E0B" }].map(s => (
                  <div key={s.l} className="rounded-xl p-3" style={{ background: `${s.c}10` }}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{s.l}</p>
                    <p className="text-lg font-black" style={{ color: s.c }}>{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-100 p-4 mb-3">
                <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-slate-500">Fee Collection</span><TrendingUp className="w-4 h-4" style={{ color: TEAL }} /></div>
                <div className="flex items-end gap-2 h-20">
                  {[40, 65, 50, 80, 60, 90, 75].map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i % 2 ? BLUE : `${BLUE}66` }} />)}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: TEAL }}><Wallet className="w-4 h-4" /></div>
                <div className="flex-1"><p className="text-xs font-bold text-slate-700">M-PESA payment received</p><p className="text-[10px] text-slate-400">John Doe · KSh 12,000</p></div>
                <CheckCircle2 className="w-5 h-5" style={{ color: TEAL }} />
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3 -rotate-3 hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Report cards</p>
              <p className="text-sm font-black" style={{ color: NAVY }}>Generated in seconds</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="py-10" style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-black text-white">{s.value}</p>
              <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: "#7FA0E0" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Products ──────────────────────────────────────────────────── */}
      <section id="products" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: BLUE }}>The platform</span>
          <h2 className="text-3xl md:text-4xl font-black mt-2 mb-3" style={{ color: NAVY }}>Everything your school needs</h2>
          <p className="text-slate-500">One subscription. Every module. No more juggling spreadsheets and disconnected systems.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.title} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-7">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-white" style={{ background: p.color }}><p.icon className="w-6 h-6" /></div>
              <h3 className="text-lg font-black mb-2" style={{ color: NAVY }}>{p.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why ───────────────────────────────────────────────────────── */}
      <section id="why" className="py-20" style={{ background: "#EEF4FF" }}>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: BLUE }}>Why ShuleCloud</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2 mb-6" style={{ color: NAVY }}>Built for Kenyan schools, trusted nationwide</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {features.map(f => (
                <div key={f} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white" style={{ background: TEAL }}><Check className="w-3 h-3" /></span>
                  <span className="text-sm font-semibold text-slate-700">{f}</span>
                </div>
              ))}
            </div>
            <Link to="/register" className="inline-flex items-center gap-2 mt-8 px-6 py-3 font-bold text-white rounded-xl" style={{ background: BLUE }}>Start your free trial <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[{ icon: ShieldCheck, t: "Secure by design", c: BLUE }, { icon: BarChart3, t: "Real-time insights", c: TEAL }, { icon: CreditCard, t: "Instant payments", c: "#F59E0B" }, { icon: Users, t: "Everyone connected", c: "#7C3AED" }].map(b => (
              <div key={b.t} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: b.c }}><b.icon className="w-5 h-5" /></div>
                <p className="font-black text-sm" style={{ color: NAVY }}>{b.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: BLUE }}>Loved by educators</span>
          <h2 className="text-3xl md:text-4xl font-black mt-2" style={{ color: NAVY }}>Trusted by schools across the country</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div key={t.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7">
              <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-slate-600 leading-relaxed mb-5">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black" style={{ background: BLUE }}>{t.name[0]}</div>
                <div><p className="font-black text-sm" style={{ color: NAVY }}>{t.name}</p><p className="text-xs text-slate-400">{t.role}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto rounded-3xl p-12 text-center text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
          <h2 className="text-3xl md:text-4xl font-black mb-3">Ready to transform your school?</h2>
          <p className="text-blue-100 max-w-xl mx-auto mb-8">Join hundreds of schools already running smarter with ShuleCloud. Get set up in minutes.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 font-black rounded-xl bg-white" style={{ color: BLUE }}>Get Started Free <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/contact" className="inline-flex items-center gap-2 px-8 py-3.5 font-bold rounded-xl border-2 border-white/40 text-white hover:bg-white/10">Talk to Sales</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: BLUE }}><GraduationCap className="w-5 h-5" /></div>
              <span className="text-xl font-black" style={{ color: NAVY }}>Shule<span style={{ color: BLUE }}>Cloud</span></span>
            </div>
            <p className="text-sm text-slate-500 max-w-xs mb-4">The all-in-one cloud platform powering schools across Kenya — academics, finance, communication and more.</p>
            <div className="space-y-1.5 text-sm text-slate-500">
              <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-300" /> hello@shulecloud.com</p>
              <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-300" /> +254 700 000 000</p>
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
        <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} ShuleCloud. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
