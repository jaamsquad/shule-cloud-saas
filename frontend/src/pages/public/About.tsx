import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter, NAVY, NAVY_DEEP, TEAL, MINT, MINT_SOFT, PAGE_BG } from "./MarketingChrome";
import { Layers, Zap, Sparkles, Users } from "lucide-react";

const values = [
  { icon: Layers, title: "Structured Excellence", desc: "We build systems that are robust, secure and infinitely scalable — as meticulously planned as the institutions we serve.", tone: "light" },
  { icon: Zap, title: "Speed of Thought", desc: "Reducing latency in administrative tasks so teachers can spend more time teaching.", tone: "teal" },
  { icon: Sparkles, title: "Radical Clarity", desc: "Turning complex academic data into actionable insights through intuitive design and high-end visualization.", tone: "dark" },
  { icon: Users, title: "Inclusive Growth", desc: "Technology should close the achievement gap, not widen it. We build for every learner, regardless of their starting point.", tone: "grey" },
];

const team = [
  { name: "Muzamil Mohamed", role: "Founder & CEO", bio: "Builds the platform and the vision — bridging Kenyan classrooms and modern technology." },
  { name: "Academic Advisors", role: "Curriculum & CBC", bio: "Kenyan educators shaping how CBC assessment, strands and rubrics work in ShuleCloud." },
  { name: "Engineering Team", role: "Product & Reliability", bio: "Keeping every school's data isolated, secure and available around the clock." },
];

const valueStyle = (tone: string) =>
  tone === "teal" ? { bg: TEAL, fg: "#fff", sub: "rgba(255,255,255,.85)" }
  : tone === "dark" ? { bg: NAVY, fg: "#fff", sub: "rgba(255,255,255,.7)" }
  : tone === "grey" ? { bg: "#eef2f6", fg: NAVY, sub: "#64748b" }
  : { bg: "#fff", fg: NAVY, sub: "#64748b" };

export default function About() {
  return (
    <div className="min-h-screen font-sans" style={{ background: PAGE_BG, color: NAVY }}>
      <MarketingNav />

      {/* Mission hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <span className="inline-block text-[11px] font-black uppercase tracking-wide px-3 py-1 rounded-full mb-5" style={{ background: MINT_SOFT, color: TEAL }}>Our Mission</span>
        <h1 className="text-4xl md:text-5xl font-black leading-[1.1] mb-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Architecting the future of institutional learning.
        </h1>
        <p className="text-lg text-slate-600 max-w-3xl">
          At ShuleCloud, we believe education is the most powerful tool for human progress. Our mission is to provide the digital infrastructure that empowers educators to focus on what matters most: the students.
        </p>
      </section>

      {/* Story */}
      <section className="bg-white border-y border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-slate-200/60 aspect-[4/3] bg-slate-100">
            <img src="/auth-hero.png" alt="The ShuleCloud story" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>It started with a single classroom frustration.</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              ShuleCloud wasn't born in a boardroom — it grew from the day-to-day struggles of Kenyan schools. Administrative friction was winning: student progress buried in spreadsheets, and communication between parents and schools fragmented.
            </p>
            <p className="text-slate-600 leading-relaxed mb-5">
              We realised that for education to truly transform, it needed a reliable platform built with the precision of high-end infrastructure and the empathy of a teacher — one that speaks CBC and 8-4-4 natively, and works on the phones parents already own.
            </p>
            <p className="text-sm font-black tracking-wide" style={{ color: TEAL }}>— ESTABLISHED IN KENYA</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>Values that drive us</h2>
          <p className="text-slate-500">We operate at the intersection of technological excellence and educational integrity.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {values.map(v => {
            const s = valueStyle(v.tone);
            return (
              <div key={v.title} className="rounded-2xl border p-6" style={{ background: s.bg, borderColor: s.bg === "#fff" ? "#eef2f6" : s.bg }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: s.bg === "#fff" || s.bg === "#eef2f6" ? MINT_SOFT : "rgba(255,255,255,.15)" }}>
                  <v.icon className="w-5 h-5" style={{ color: s.bg === "#fff" || s.bg === "#eef2f6" ? TEAL : "#fff" }} />
                </div>
                <h3 className="text-lg font-black mb-2" style={{ color: s.fg }}>{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: s.sub }}>{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Team */}
      <section className="bg-white border-y border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-black mb-8 inline-block border-b-4 pb-1" style={{ fontFamily: "'Poppins', sans-serif", borderColor: TEAL }}>The Team</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {team.map(m => (
              <div key={m.name}>
                <div className="rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 mb-4 flex items-center justify-center">
                  <Users className="w-12 h-12 text-slate-200" />
                </div>
                <h3 className="text-lg font-black" style={{ color: NAVY }}>{m.name}</h3>
                <p className="text-[11px] font-black uppercase tracking-wide mb-2" style={{ color: TEAL }}>{m.role}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-3xl px-8 py-12 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}>
          <h2 className="text-3xl font-black mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>Ready to transform your institution?</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-7">Join 500+ schools that trust ShuleCloud to architect their digital learning environments.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/contact" className="px-6 py-3.5 font-bold text-white rounded-lg" style={{ background: TEAL }}>Schedule a Consultation</Link>
            <Link to="/register" className="px-6 py-3.5 font-bold text-white rounded-lg border border-white/25 hover:bg-white/10 transition-colors">View Pricing</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
