import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search, Rocket, CreditCard, ShieldCheck, Mail, Calendar } from "lucide-react";
import { MarketingNav, MarketingFooter, IconChip, NAVY, NAVY_DEEP, TEAL, PAGE_BG, CONTACT_PHONE } from "./MarketingChrome";

type QA = { q: string; a: string };
const categories: { key: string; label: string; sub: string; icon: any; faqs: QA[] }[] = [
  {
    key: "onboarding", label: "Onboarding", sub: "Getting started with ShuleCloud", icon: Rocket,
    faqs: [
      { q: "How long does setup take?", a: "Most schools are up and running the same day. You can import your classes, students, fee structure and timetable in an afternoon, and our team helps you migrate from spreadsheets or your previous system." },
      { q: "Is ShuleCloud built for the Kenyan curriculum?", a: "Yes. ShuleCloud is built around Kenya's Competency-Based Curriculum (CBC) with full learning areas, strands, sub-strands, competencies and rubrics — and it still supports 8-4-4 schools." },
      { q: "Do parents and students get their own logins?", a: "Yes. There are dedicated parent and student portals where they see results, fee balances, attendance and announcements in real time — on any phone or computer." },
      { q: "Does it work on a phone?", a: "Yes. ShuleCloud runs in any browser and is optimised for phones and tablets, so teachers and administrators can work from anywhere — no app install required." },
    ],
  },
  {
    key: "pricing", label: "Pricing & Plans", sub: "Billing, tiers and licenses", icon: CreditCard,
    faqs: [
      { q: "How much does it cost?", a: "You can start for free, no card required. Paid plans unlock advanced modules like custom domains, branding and higher student limits. Pricing is in KES and billed monthly or annually — talk to us for a quote tailored to your school." },
      { q: "Can we add specific feature modules later?", a: "Yes. Start with what you need and enable more modules — CBC LMS, custom domains, accounting — as your school grows. There's no need to migrate or start over." },
      { q: "Can parents pay fees through M-PESA?", a: "Yes. Each school connects its own Safaricom Daraja account, so parents pay by M-PESA STK Push straight from their phone. Receipts post against the student's account automatically." },
    ],
  },
  {
    key: "security", label: "Security", sub: "Data protection and privacy", icon: ShieldCheck,
    faqs: [
      { q: "Is our school's data kept separate from other schools?", a: "Completely. Every school runs in its own isolated database, and tenant access is enforced on every request. No school can ever see another's data. We comply with the Kenya Data Protection Act (2019)." },
      { q: "Is our data backed up, and can we export it?", a: "Your data is backed up and encrypted in transit and at rest. You can export your records at any time, and if you ever leave, you keep your data — there's no lock-in." },
      { q: "What support do we get?", a: `Our Kenyan-based team supports you by phone, email and WhatsApp. Reach us on ${CONTACT_PHONE} during business hours, or book a live demo any time.` },
    ],
  },
];

function Accordion({ q, a }: QA) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-100">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-4 text-left px-5 py-4">
        <span className="font-bold text-sm" style={{ color: NAVY }}>{q}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: TEAL }} />
      </button>
      {open && <p className="text-slate-500 text-sm leading-relaxed px-5 pb-5">{a}</p>}
    </div>
  );
}

export default function FAQ() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(categories[0].key);
  const filter = (list: QA[]) => q ? list.filter(f => (f.q + f.a).toLowerCase().includes(q.toLowerCase())) : list;
  const shownCats = q ? categories : categories;

  return (
    <div className="min-h-screen font-sans" style={{ background: PAGE_BG, color: NAVY }}>
      <MarketingNav />

      {/* Hero + search */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>How can we help you today?</h1>
        <p className="text-slate-600 mb-7">Find answers to common questions about ShuleCloud's tools, security and integrations.</p>
        <div className="relative max-w-xl mx-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search for questions (e.g. 'security')" className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#158066]" />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid lg:grid-cols-[280px_1fr] gap-8">
        {/* Category nav */}
        <div className="space-y-2 h-fit">
          {categories.map(c => (
            <button key={c.key} onClick={() => setActive(c.key)}
              className={`w-full flex items-center gap-3 text-left rounded-xl border p-3 transition-colors ${active === c.key ? "border-[#158066] bg-white" : "border-slate-100 bg-white hover:bg-slate-50"}`}>
              <IconChip icon={c.icon} />
              <div><p className="text-sm font-black" style={{ color: NAVY }}>{c.label}</p><p className="text-[11px] text-slate-400">{c.sub}</p></div>
              <ChevronDown className="w-4 h-4 text-slate-300 ml-auto -rotate-90" />
            </button>
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {shownCats.map(c => {
            const list = filter(c.faqs);
            if (q && list.length === 0) return null;
            return (
              <div key={c.key} className={q ? "" : active === c.key ? "" : "hidden"}>
                <h2 className="text-lg font-black flex items-center gap-2 mb-3" style={{ color: NAVY }}><c.icon className="w-4 h-4" style={{ color: TEAL }} /> {c.label}</h2>
                <div className="space-y-2.5">{list.map(f => <Accordion key={f.q} {...f} />)}</div>
              </div>
            );
          })}
          {q && categories.every(c => filter(c.faqs).length === 0) && <p className="text-sm text-slate-400 py-8 text-center">No questions match "{q}".</p>}
        </div>
      </section>

      {/* Still have questions */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="rounded-3xl px-8 py-12 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}>
          <h2 className="text-2xl md:text-3xl font-black mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Still have questions?</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-7">If you didn't find your answer, get in touch with our team or schedule a demo.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3.5 font-bold text-white rounded-lg" style={{ background: TEAL }}><Mail className="w-4 h-4" /> Contact Support</Link>
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3.5 font-bold text-white rounded-lg border border-white/25 hover:bg-white/10 transition-colors"><Calendar className="w-4 h-4" /> Schedule a Demo</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
