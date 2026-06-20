import { Link } from "react-router-dom";
import {
  GraduationCap, BarChart3, CreditCard, Calendar, BookOpen, MessageSquare,
  Users, ArrowRight, Check, Star, ShieldCheck, Smartphone, Target,
  FolderCheck, LineChart, PlayCircle, CheckCircle2, TrendingUp, Wallet,
} from "lucide-react";
import { resolvePortal } from "@/lib/portal";
import SchoolLanding from "./SchoolLanding";
import { MarketingNav, MarketingFooter, PURPLE, BLUE, NAVY, TEAL } from "./MarketingChrome";

const cbe = [
  { icon: Target, title: "7 Core Competencies", desc: "Map and monitor all 7 CBE core competencies across every learning area with live progress analytics." },
  { icon: FolderCheck, title: "Learner Portfolios", desc: "Rich portfolios with evidence collection, quality assessment and competency demonstrations." },
  { icon: LineChart, title: "Learning Outcomes", desc: "Real-time tracking of learning outcomes with predictive analytics to flag learners who need support." },
];

const modules = [
  { icon: BookOpen, color: BLUE, title: "CBE & 8-4-4 Academics", desc: "Full Competency-Based Education and 8-4-4 support — assessments, strands, rubrics and report cards." },
  { icon: CreditCard, color: TEAL, title: "Fees & Finance", desc: "Invoicing, M-PESA payments, statements, defaulters and complete school accounting." },
  { icon: Users, color: "#7C3AED", title: "Parent & Student Portals", desc: "Dedicated portals keep parents, students and teachers connected in real time." },
  { icon: BarChart3, color: "#F59E0B", title: "Reports & Analytics", desc: "Insightful reports for performance, attendance and finance — exported in a click." },
  { icon: MessageSquare, color: "#EC4899", title: "Communication", desc: "Reach parents instantly via SMS, Email and WhatsApp — results, fees and announcements." },
  { icon: Calendar, color: "#0EA5E9", title: "Attendance & Timetable", desc: "Smart timetabling, daily attendance and card-scan check-in for students and staff." },
];

const stats = [
  { value: "500+", label: "Schools" },
  { value: "100,000+", label: "Learners" },
  { value: "47", label: "Counties" },
  { value: "99.9%", label: "Uptime" },
];

const why = [
  { icon: ShieldCheck, t: "Secure & private", d: "Bank-grade security with per-school data isolation and privacy compliance.", c: BLUE },
  { icon: Smartphone, t: "Works on any device", d: "Optimized for phones and tablets — manage your school from anywhere.", c: TEAL },
  { icon: TrendingUp, t: "Real-time insights", d: "Live dashboards for academics, finance and attendance.", c: "#F59E0B" },
  { icon: Wallet, t: "M-PESA built in", d: "Collect fees and reconcile payments automatically with Daraja.", c: "#7C3AED" },
];

const testimonials = [
  { name: "Mrs. Wanjiku", role: "Head Teacher, Nairobi Girls Academy", quote: "CBE assessment and reporting that used to take days now takes minutes. Our teachers love it." },
  { name: "Mr. Ochieng", role: "Principal, Kisumu Boys High", quote: "Fee collection and M-PESA reconciliation are effortless, and parents get instant receipts." },
  { name: "Mrs. Chebet", role: "Bursar, Eldoret Heights", quote: "One platform for academics, finance and communication. It paid for itself in a single term." },
];

export default function Landing() {
  if (resolvePortal().portal === "tenant") return <SchoolLanding />;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <MarketingNav />

      {/* ── Hero (eSkooly-style purple banner) ─────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(120deg,#613ddf 0%, #4d2fc4 55%, #3a1f9e 100%)" }}>
        {/* decorative background lines */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 hidden sm:block" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,.4), transparent 45%)" }} />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-24 lg:pt-20 relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl font-bold">#1</span>
              <span className="text-[11px] leading-tight">Globally<br />Ranked</span>
              <span className="text-sm font-medium ml-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Verified</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light leading-[1.05] mb-5">
              Free <span className="font-bold">Online</span> School<br /><span className="font-bold">Management</span> Software
            </h1>
            <p className="text-base text-white/80 max-w-lg mb-8 leading-relaxed">
              You can now manage your school, college, or any educational institution seamlessly with ShuleCloud — built for Kenya's CBC & 8-4-4, with M-PESA fees, parent portals and instant reporting.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-2">
              <Link to="/register" className="inline-flex items-center gap-2 px-9 py-4 font-bold text-white rounded-full shadow-xl" style={{ background: "#7C5CFF" }}>
                Get Started, <span className="font-light">It's Free</span>
              </Link>
              <Link to="/contact" className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 transition-colors">
                <PlayCircle className="w-8 h-8 text-white" />
              </Link>
              <div className="text-sm leading-tight">
                Trusted by <b>10,000+</b> schools<br />
                <span className="flex items-center gap-0.5 text-white/90">Rated 4.6 {[0, 1, 2, 3].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}<Star className="w-3.5 h-3.5 text-amber-400" /></span>
              </div>
            </div>
          </div>

          {/* Dashboard mockup with floating revenue card */}
          <div className="relative lg:pl-10">
            <div className="bg-white rounded-3xl shadow-2xl border border-white/30 p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: PURPLE }}><GraduationCap className="w-4 h-4" /></div><span className="font-black text-sm" style={{ color: NAVY }}>School Dashboard</span></div>
                <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-rose-300" /><span className="w-2 h-2 rounded-full bg-amber-300" /><span className="w-2 h-2 rounded-full bg-emerald-300" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[{ l: "Learners", v: "1,248" }, { l: "Collected", v: "KSh 8.2M" }, { l: "Competency", v: "82%" }].map(s => (
                  <div key={s.l} className="rounded-xl p-3" style={{ background: `${PURPLE}10` }}><p className="text-[10px] font-bold text-slate-400 uppercase">{s.l}</p><p className="text-lg font-black" style={{ color: PURPLE }}>{s.v}</p></div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-slate-500">Competency Progress</span><TrendingUp className="w-4 h-4" style={{ color: PURPLE }} /></div>
                <div className="flex items-end gap-2 h-20">{[45, 62, 55, 78, 66, 88, 80].map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i % 2 ? PURPLE : `${PURPLE}66` }} />)}</div>
              </div>
            </div>
            {/* floating revenue card */}
            <div className="absolute -bottom-6 left-0 bg-white/90 backdrop-blur rounded-2xl border border-white shadow-xl px-6 py-4 z-20 hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Revenue</p>
              <p className="text-xl font-black" style={{ color: NAVY }}>KSh 242,000</p>
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
              <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: "#7FA8E8" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CBE highlight (EduPoa's signature) ────────────────────────── */}
      <section className="py-20" style={{ background: "#F1FBF6" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: TEAL }}>Competency-Based Education</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2 mb-3" style={{ color: NAVY }}>CBE done right</h2>
            <p className="text-slate-500">Purpose-built tools for Kenya's CBE curriculum — competencies, portfolios and learning-outcome analytics in one place.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {cbe.map(c => (
              <div key={c.title} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-7">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-white" style={{ background: TEAL }}><c.icon className="w-6 h-6" /></div>
                <h3 className="text-lg font-black mb-2" style={{ color: NAVY }}>{c.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules grid ──────────────────────────────────────────────── */}
      <section id="products" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: BLUE }}>The platform</span>
          <h2 className="text-3xl md:text-4xl font-black mt-2 mb-3" style={{ color: NAVY }}>Everything your school needs</h2>
          <p className="text-slate-500">One subscription. Every module. No more juggling spreadsheets and disconnected systems.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map(p => (
            <div key={p.title} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-7">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-white" style={{ background: p.color }}><p.icon className="w-6 h-6" /></div>
              <h3 className="text-lg font-black mb-2" style={{ color: NAVY }}>{p.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why EduPoa ────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: "#EFF5FF" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: BLUE }}>Why EduPoa</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2" style={{ color: NAVY }}>Trusted by schools across Kenya</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {why.map(b => (
              <div key={b.t} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: b.c }}><b.icon className="w-5 h-5" /></div>
                <p className="font-black text-sm mb-1" style={{ color: NAVY }}>{b.t}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: TEAL }}>Loved by educators</span>
          <h2 className="text-3xl md:text-4xl font-black mt-2" style={{ color: NAVY }}>What schools say about EduPoa</h2>
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
          <p className="text-blue-100 max-w-xl mx-auto mb-8">Join hundreds of schools already running smarter with EduPoa. Get set up in minutes.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 font-black rounded-xl bg-white" style={{ color: BLUE }}>Get Started Free <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/contact" className="inline-flex items-center gap-2 px-8 py-3.5 font-bold rounded-xl border-2 border-white/40 text-white hover:bg-white/10">Talk to Sales</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
