import { useState } from "react";
import { Link } from "react-router-dom";
import { resolvePortal } from "@/lib/portal";
import SchoolLanding from "./SchoolLanding";
import { MarketingNav, MarketingFooter, HeroBackdrop, PURPLE, NAVY } from "./MarketingChrome";
import { DemoModal } from "./DemoModal";

const cbe = [
  { title: "7 Core Competencies", desc: "Map and monitor all 7 CBE core competencies across every learning area with live progress analytics." },
  { title: "Learner Portfolios", desc: "Rich portfolios with evidence collection, quality assessment and competency demonstrations." },
  { title: "Learning Outcomes", desc: "Real-time tracking of learning outcomes with predictive analytics to flag learners who need support." },
];

const modules = [
  { title: "CBE & 8-4-4 Academics", desc: "Full Competency-Based Education and 8-4-4 support — assessments, strands, rubrics and report cards." },
  { title: "Fees & Finance", desc: "Invoicing, M-PESA payments, statements, defaulters and complete school accounting." },
  { title: "Parent & Student Portals", desc: "Dedicated portals keep parents, students and teachers connected in real time." },
  { title: "Reports & Analytics", desc: "Insightful reports for performance, attendance and finance — exported in a click." },
  { title: "Communication", desc: "Reach parents instantly via SMS, Email and WhatsApp — results, fees and announcements." },
  { title: "Attendance & Timetable", desc: "Smart timetabling, daily attendance and card-scan check-in for students and staff." },
];

const stats = [
  { value: "500+", label: "Schools" },
  { value: "100,000+", label: "Learners" },
  { value: "47", label: "Counties" },
  { value: "99.9%", label: "Uptime" },
];

const why = [
  { t: "Secure & private", d: "Bank-grade security with per-school data isolation and privacy compliance." },
  { t: "Works on any device", d: "Optimized for phones and tablets — manage your school from anywhere." },
  { t: "Real-time insights", d: "Live dashboards for academics, finance and attendance." },
  { t: "M-PESA built in", d: "Collect fees and reconcile payments automatically with Daraja." },
];

const testimonials = [
  { name: "Mrs. Wanjiku", role: "Head Teacher, Nairobi Girls Academy", quote: "CBE assessment and reporting that used to take days now takes minutes. Our teachers love it." },
  { name: "Mr. Ochieng", role: "Principal, Kisumu Boys High", quote: "Fee collection and M-PESA reconciliation are effortless, and parents get instant receipts." },
  { name: "Mrs. Chebet", role: "Bursar, Eldoret Heights", quote: "One platform for academics, finance and communication. It paid for itself in a single term." },
];

export default function Landing() {
  const [demo, setDemo] = useState(false);
  if (resolvePortal().portal === "tenant") return <SchoolLanding />;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <DemoModal open={demo} onClose={() => setDemo(false)} />
      <MarketingNav />

      {/* ── Hero (real photo + copy, two columns) ──────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(115deg,#5a36d6 0%, #4326b5 60%, #34199a 100%)" }}>
        {/* soft radial highlight, hand-placed off-centre */}
        <div className="absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #b69bff, transparent 70%)" }} />
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-8 items-center pt-16 pb-20 lg:pt-20 relative">
          <div className="text-white">
            <p className="inline-block text-[13px] font-semibold tracking-wide text-white/80 mb-6 border border-white/25 rounded-full px-3.5 py-1.5">
              Kenya's school platform · CBC &amp; 8-4-4 ready
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-light leading-[1.07] mb-6">
              Run your whole school from <span className="font-bold">one place</span>.
            </h1>
            <p className="text-lg text-white/75 max-w-xl mb-9 leading-relaxed">
              From admissions and CBC assessment to M-PESA fee collection, timetables and parent messaging — ShuleCloud keeps teachers, parents and administrators on the same page.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/register" className="px-9 py-4 font-bold rounded-full shadow-lg shadow-purple-900/30 transition-transform hover:-translate-y-0.5" style={{ background: "#fff", color: PURPLE }}>
                Start free — no card needed
              </Link>
              <button onClick={() => setDemo(true)} className="px-9 py-4 font-semibold text-white rounded-full border border-white/40 hover:bg-white/10 transition-colors">
                Book a demo
              </button>
            </div>
            <p className="text-sm text-white/65 mt-8">Trusted by schools in all <b className="text-white">47 counties</b> · Rated 4.6 / 5 by head teachers</p>
          </div>

          {/* Real photograph, framed naturally with a stat overlay */}
          <div className="relative lg:justify-self-end w-full max-w-md mx-auto lg:mx-0">
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl shadow-purple-950/40 ring-1 ring-white/20">
              <img src="/auth-hero.png" alt="A graduate using ShuleCloud on a laptop" className="w-full h-full object-cover" loading="eager" />
              <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: "linear-gradient(to top, rgba(40,20,110,.55), transparent)" }} />
            </div>
            {/* small honest stat tag, not a fake dashboard */}
            <div className="absolute -bottom-5 -left-4 sm:left-6 bg-white rounded-2xl shadow-xl px-5 py-3.5">
              <p className="text-xs text-slate-400 font-semibold">Fees collected this term</p>
              <p className="text-2xl font-black" style={{ color: NAVY }}>KSh 8.2M</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="py-14" style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-3xl md:text-5xl font-black text-white">{s.value}</p>
              <p className="text-xs font-bold uppercase tracking-widest mt-2 text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CBE highlight (image + list) ──────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-14 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="rounded-[2rem] overflow-hidden shadow-xl ring-1 ring-slate-100">
              <img src="/auth-hero.png" alt="Student tracking competency progress" className="w-full object-cover" loading="lazy" />
            </div>
            <div className="absolute -top-4 -right-3 sm:right-6 bg-white rounded-2xl shadow-lg px-5 py-3 ring-1 ring-slate-100">
              <p className="text-xs text-slate-400 font-semibold">Average competency</p>
              <p className="text-2xl font-black" style={{ color: PURPLE }}>82%</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: PURPLE }}>Competency-Based Education</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: NAVY }}>CBE, done the way teachers actually work</h2>
            <p className="text-slate-500 text-lg mb-8">Purpose-built for Kenya's CBC — competencies, portfolios and learning-outcome analytics in one place, without the spreadsheet gymnastics.</p>
            <div className="divide-y divide-slate-100">
              {cbe.map(c => (
                <div key={c.title} className="py-5">
                  <h3 className="text-lg font-black" style={{ color: NAVY }}>{c.title}</h3>
                  <p className="text-slate-500 leading-relaxed mt-1">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules ───────────────────────────────────────────────────── */}
      <section id="products" className="py-24" style={{ background: "#faf9ff" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: PURPLE }}>The platform</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: NAVY }}>Everything your school needs</h2>
            <p className="text-slate-500 mt-3 text-lg">One subscription. Every module. No more juggling spreadsheets and disconnected systems.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
            {modules.map(p => (
              <div key={p.title} className="border-l-2 pl-5" style={{ borderColor: PURPLE }}>
                <h3 className="text-lg font-black mb-1.5" style={{ color: NAVY }}>{p.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why ShuleCloud ────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: PURPLE }}>Why ShuleCloud</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: NAVY }}>Trusted by schools across Kenya</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8">
            {why.map(b => (
              <div key={b.t}>
                <p className="font-black text-base mb-1" style={{ color: NAVY }}>{b.t}</p>
                <p className="text-slate-500 leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: "#faf9ff" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: PURPLE }}>Loved by educators</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: NAVY }}>What schools say about ShuleCloud</h2>
          </div>
          <div className="space-y-12 max-w-3xl mx-auto">
            {testimonials.map(t => (
              <figure key={t.name} className="text-center">
                <blockquote className="text-xl md:text-2xl font-light leading-relaxed" style={{ color: NAVY }}>“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm text-slate-500"><b style={{ color: NAVY }}>{t.name}</b> — {t.role}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 text-center text-white">
        <HeroBackdrop />
        <div className="max-w-3xl mx-auto px-6 relative">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Ready to transform your school?</h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-10">Join hundreds of schools already running smarter with ShuleCloud. Get set up in minutes — it's free to start.</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/register" className="px-10 py-4 font-black rounded-full bg-white" style={{ color: PURPLE }}>Get Started, It's Free</Link>
            <button onClick={() => setDemo(true)} className="px-10 py-4 font-semibold rounded-full border border-white/40 text-white hover:bg-white/10">Book a demo</button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
