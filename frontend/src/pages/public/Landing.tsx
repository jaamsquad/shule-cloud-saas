import { Link } from "react-router-dom";
import { resolvePortal } from "@/lib/portal";
import SchoolLanding from "./SchoolLanding";
import { MarketingNav, MarketingFooter, PURPLE, NAVY } from "./MarketingChrome";

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
  if (resolvePortal().portal === "tenant") return <SchoolLanding />;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <MarketingNav />

      {/* ── Hero (clean, card-free, icon-free) ─────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(120deg,#613ddf 0%, #4d2fc4 55%, #3a1f9e 100%)" }}>
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-24 lg:pt-24 text-center text-white">
          <p className="text-sm font-semibold tracking-widest uppercase text-white/70 mb-5">#1 Globally Ranked · Verified</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light leading-[1.08] mb-6">
            Free <span className="font-bold">Online</span> School <span className="font-bold">Management</span> Software
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Manage your school, college or any educational institution seamlessly with ShuleCloud — built for Kenya's CBC &amp; 8-4-4, with M-PESA fees, parent portals and instant reporting.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/register" className="px-10 py-4 font-bold text-white rounded-full shadow-xl" style={{ background: "#7C5CFF" }}>
              Get Started, <span className="font-light">It's Free</span>
            </Link>
            <Link to="/contact" className="px-10 py-4 font-semibold text-white rounded-full border border-white/40 hover:bg-white/10 transition-colors">
              Talk to Sales
            </Link>
          </div>
          <p className="text-sm text-white/70 mt-8">Trusted by <b className="text-white">10,000+</b> schools · Rated 4.6 out of 5</p>
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

      {/* ── CBE highlight ─────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: PURPLE }}>Competency-Based Education</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: NAVY }}>CBE done right</h2>
            <p className="text-slate-500 mt-3 text-lg">Purpose-built for Kenya's CBE curriculum — competencies, portfolios and learning-outcome analytics in one place.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {cbe.map(c => (
              <div key={c.title} className="py-7 md:grid md:grid-cols-3 md:gap-8">
                <h3 className="text-xl font-black md:col-span-1" style={{ color: NAVY }}>{c.title}</h3>
                <p className="text-slate-500 leading-relaxed md:col-span-2 mt-1 md:mt-0">{c.desc}</p>
              </div>
            ))}
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
      <section className="py-24 text-center text-white" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${NAVY})` }}>
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Ready to transform your school?</h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-10">Join hundreds of schools already running smarter with ShuleCloud. Get set up in minutes — it's free to start.</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/register" className="px-10 py-4 font-black rounded-full bg-white" style={{ color: PURPLE }}>Get Started, It's Free</Link>
            <Link to="/contact" className="px-10 py-4 font-semibold rounded-full border border-white/40 text-white hover:bg-white/10">Talk to Sales</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
