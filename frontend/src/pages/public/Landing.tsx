import { useState } from "react";
import { Link } from "react-router-dom";
import { resolvePortal } from "@/lib/portal";
import SchoolLanding from "./SchoolLanding";
import { MarketingNav, MarketingFooter, IconChip, NAVY, NAVY_DEEP, TEAL, MINT, MINT_SOFT, PAGE_BG } from "./MarketingChrome";
import { DemoModal } from "./DemoModal";
import {
  ArrowRight, PlayCircle, TrendingUp, Sparkles, ShieldCheck, Puzzle, Headset,
  Users, CheckCircle2, CalendarCheck, GraduationCap, MessageSquare,
} from "lucide-react";

const stats = [
  { value: "500+", label: "Schools" },
  { value: "100,000+", label: "Learners" },
  { value: "47", label: "Counties" },
  { value: "99.9%", label: "Uptime" },
];

// "Why Choose ShuleCloud" feature grid — one dark card for contrast.
const features = [
  { icon: TrendingUp, title: "Real-time Insights", desc: "Instant visibility into student performance and institutional health with live analytics.", points: ["Predictive grading trends", "Automated attendance reports"], dark: false, wide: true },
  { icon: ShieldCheck, title: "Enterprise Security", desc: "Your data is protected with military-grade encryption and per-school data isolation.", dark: true },
  { icon: Puzzle, title: "Easy Integration", desc: "Connect seamlessly with SMS, WhatsApp and M-PESA Daraja.", dark: false },
  { icon: Headset, title: "24/7 Support", desc: "Our team is always available to assist with onboarding and technical needs.", dark: false },
  { icon: Users, title: "Parent Portal", desc: "Keep parents engaged with real-time updates on attendance, behaviour and grades.", dark: false },
];

const showcase = [
  { icon: CalendarCheck, title: "Attendance", desc: "Daily marking for teachers and automatic SMS notifications to parents when students are absent." },
  { icon: GraduationCap, title: "Grading", desc: "Dynamic gradebooks with weighted averages, rubric-based CBC assessment and instant report cards." },
  { icon: MessageSquare, title: "Communication", desc: "Centralized hub for school-wide announcements, secure messaging and event scheduling." },
];

export default function Landing() {
  const [demo, setDemo] = useState(false);
  if (resolvePortal().portal === "tenant") return <SchoolLanding />;

  return (
    <div className="min-h-screen font-sans" style={{ background: PAGE_BG, color: NAVY }}>
      <DemoModal open={demo} onClose={() => setDemo(false)} />
      <MarketingNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-14 pb-16 grid lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full mb-6" style={{ background: MINT_SOFT, color: TEAL }}>
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Education Management
          </span>
          <h1 className="text-4xl md:text-5xl font-black leading-[1.08] mb-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Streamline Your<br /><span style={{ color: TEAL }}>School's Future</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mb-8 leading-relaxed">
            Empower educators and administrators with an all-in-one platform designed to manage CBC &amp; 8-4-4 academics, fees, attendance and communication with unprecedented efficiency.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3.5 font-bold text-white rounded-lg transition-transform hover:-translate-y-0.5" style={{ background: TEAL }}>
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => setDemo(true)} className="inline-flex items-center gap-2 px-6 py-3.5 font-bold rounded-lg border bg-white transition-colors hover:bg-slate-50" style={{ color: NAVY, borderColor: "#d4dee6" }}>
              <PlayCircle className="w-4 h-4" /> Watch Demo
            </button>
          </div>
          <p className="text-sm text-slate-500 mt-8 flex items-center gap-2">
            <span className="flex -space-x-2">{[MINT, "#cbd5e1", "#fcd9a6"].map((c, i) => <span key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ background: c }} />)}</span>
            Trusted by <b style={{ color: NAVY }}>500+ institutions</b> worldwide
          </p>
        </div>

        {/* Hero image + floating stat card */}
        <div className="relative">
          <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200/60">
            <img src="/auth-hero.png" alt="ShuleCloud in a classroom" className="w-full h-full object-cover" loading="eager" />
          </div>
          <div className="absolute -bottom-5 left-6 right-6 bg-white rounded-xl shadow-xl border border-slate-100 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconChip icon={TrendingUp} />
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">School Efficiency</p><p className="text-lg font-black" style={{ color: TEAL }}>+42%</p></div>
            </div>
            <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase">Active Students</p><p className="text-lg font-black" style={{ color: NAVY }}>12,480</p></div>
          </div>
        </div>
      </section>

      {/* ── Trusted-by band ──────────────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-100 py-8">
        <p className="text-center text-[11px] font-black uppercase tracking-widest text-slate-400 mb-5">Trusted by institutions across Kenya</p>
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-lg font-black text-slate-300">
          {["ACADEMIA", "SCHOLARLY", "EDUPATH", "INSIGHTS", "LYCEUM"].map(n => <span key={n}>{n}</span>)}
        </div>
      </section>

      {/* ── Why Choose ShuleCloud ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>Why Choose ShuleCloud?</h2>
          <p className="text-slate-500">Designed by educators for educators, we prioritize administrative speed and intuitive user experiences.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className={`rounded-2xl border p-6 ${f.wide ? "md:col-span-2" : ""}`}
              style={f.dark ? { background: NAVY, borderColor: NAVY } : { background: "#fff", borderColor: "#eef2f6" }}>
              <IconChip icon={f.icon} />
              <h3 className="text-lg font-black mt-4 mb-2" style={{ color: f.dark ? "#fff" : NAVY }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: f.dark ? "rgba(255,255,255,.7)" : "#64748b" }}>{f.desc}</p>
              {f.points && (
                <div className="mt-4 space-y-2">
                  {f.points.map(p => <p key={p} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4" style={{ color: TEAL }} /> {p}</p>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Product showcase strip ──────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {showcase.map(s => (
            <div key={s.title}>
              <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm mb-4 aspect-[16/10] bg-slate-50 flex items-center justify-center">
                <s.icon className="w-12 h-12 text-slate-200" />
              </div>
              <h3 className="text-base font-black mb-1 flex items-center gap-2" style={{ color: NAVY }}><s.icon className="w-4 h-4" style={{ color: TEAL }} /> {s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {stats.map(s => (
          <div key={s.label}>
            <p className="text-4xl font-black" style={{ color: TEAL }}>{s.value}</p>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {/* ── CTA band (dark navy) ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="rounded-3xl px-8 py-14 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}>
          <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>Ready to Transform Your School?</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-7">Join 500+ schools that have already modernized their operations with ShuleCloud.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="px-6 py-3.5 font-bold text-white rounded-lg" style={{ background: TEAL }}>Start Your Free Trial</Link>
            <button onClick={() => setDemo(true)} className="px-6 py-3.5 font-bold text-white rounded-lg border border-white/25 hover:bg-white/10 transition-colors">Talk to an Expert</button>
          </div>
          <p className="text-xs text-white/50 mt-6">No credit card required · 14-day free trial · Cancel anytime</p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
