import { Link } from "react-router-dom";
import {
  GraduationCap, BarChart3, CreditCard, Calendar, BookOpen, MessageSquare,
  Users, ArrowRight, Check, Star, ShieldCheck, Smartphone, Target,
  FolderCheck, LineChart, PlayCircle, CheckCircle2, TrendingUp, Wallet,
} from "lucide-react";
import { resolvePortal } from "@/lib/portal";
import SchoolLanding from "./SchoolLanding";
import { MarketingNav, MarketingFooter, BLUE, NAVY, TEAL } from "./MarketingChrome";

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

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#EFF5FF 0%, #ffffff 60%)" }} />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-20 lg:pt-24 relative grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: `${TEAL}1A`, color: TEAL }}>
              <Star className="w-3.5 h-3.5" /> Built for CBE & 8-4-4
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] mb-5" style={{ color: NAVY }}>
              Kenya's complete <span style={{ color: BLUE }}>school management</span> system
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mb-8">
              Run academics, finance, communication and parent engagement from one cloud platform — with full Competency-Based Education and 8-4-4 support.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <Link to="/register" className="inline-flex items-center gap-2 px-7 py-3.5 font-bold text-white rounded-xl shadow-lg" style={{ background: BLUE }}>
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 px-7 py-3.5 font-bold rounded-xl border-2 text-slate-700 hover:bg-slate-50" style={{ borderColor: "#E2E8F0" }}>
                <PlayCircle className="w-5 h-5" style={{ color: BLUE }} /> Request a Free Demo
              </Link>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {[BLUE, TEAL, "#F59E0B", "#7C3AED"].map(c => <div key={c} className="w-8 h-8 rounded-full border-2 border-white" style={{ background: c }} />)}
              </div>
              <span><b className="text-slate-800">500+ schools</b> trust EduPoa</span>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 rotate-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: BLUE }}><GraduationCap className="w-4 h-4" /></div><span className="font-black text-sm" style={{ color: NAVY }}>School Dashboard</span></div>
                <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-rose-300" /><span className="w-2 h-2 rounded-full bg-amber-300" /><span className="w-2 h-2 rounded-full bg-emerald-300" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[{ l: "Learners", v: "1,248", c: BLUE }, { l: "Collected", v: "KSh 8.2M", c: TEAL }, { l: "Competency", v: "82%", c: "#F59E0B" }].map(s => (
                  <div key={s.l} className="rounded-xl p-3" style={{ background: `${s.c}12` }}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{s.l}</p>
                    <p className="text-lg font-black" style={{ color: s.c }}>{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-100 p-4 mb-3">
                <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-slate-500">Competency Progress</span><TrendingUp className="w-4 h-4" style={{ color: TEAL }} /></div>
                <div className="flex items-end gap-2 h-20">
                  {[45, 62, 55, 78, 66, 88, 80].map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i % 2 ? TEAL : `${TEAL}66` }} />)}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: BLUE }}><Wallet className="w-4 h-4" /></div>
                <div className="flex-1"><p className="text-xs font-bold text-slate-700">M-PESA payment received</p><p className="text-[10px] text-slate-400">John Doe · KSh 12,000</p></div>
                <CheckCircle2 className="w-5 h-5" style={{ color: TEAL }} />
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3 -rotate-3 hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase">CBE Report cards</p>
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
