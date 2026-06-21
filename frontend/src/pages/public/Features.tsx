import { useState } from "react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter, PURPLE, NAVY } from "./MarketingChrome";
import { DemoModal } from "./DemoModal";

// Grouped the way a head teacher thinks about running a school, not a flat
// feature dump — each group reads like a sentence, not a marketing bullet.
const groups: { area: string; blurb: string; items: { title: string; desc: string }[] }[] = [
  {
    area: "People",
    blurb: "Every student, guardian and staff member in one place — from the first admission form to the alumni record.",
    items: [
      { title: "Student lifecycle", desc: "Admissions, CBC-ready profiles, guardian linkage, promotions, transfers, houses & clubs and ID cards." },
      { title: "Staff & HR", desc: "Profiles, workload, leave, duty rosters, appraisals and staff ID cards — with TSC and BoM records." },
      { title: "Parent & student portals", desc: "Dedicated logins so parents see fees, results and attendance the moment they update." },
    ],
  },
  {
    area: "Teaching & learning",
    blurb: "Plan, assess and report against the CBC the way the curriculum is actually designed.",
    items: [
      { title: "CBC academics", desc: "Learning areas, strands, sub-strands, competencies and rubrics, with portfolio evidence and progress tracking." },
      { title: "Assessments & exams", desc: "Question banks, paper generation, mark entry, moderation, results publishing and report cards." },
      { title: "Smart timetable", desc: "Teacher availability, room allocation, auto-generation with clash detection and substitutions." },
      { title: "LMS & e-learning", desc: "Courses, resources, assignments, quizzes and grading for both teachers and learners." },
    ],
  },
  {
    area: "Money",
    blurb: "Bill, collect and reconcile fees without a single manual ledger entry.",
    items: [
      { title: "Fees & finance", desc: "Fee structures, bulk invoicing, arrears tracking, bursaries, refunds, statements and cashbook." },
      { title: "M-PESA built in", desc: "Per-school Daraja STK Push — parents pay from their phone and receipts post automatically." },
      { title: "Accounting & expenses", desc: "General ledger, expense management, procurement and budget vs actual reporting." },
    ],
  },
  {
    area: "Day-to-day operations",
    blurb: "The unglamorous things that keep a school running — handled.",
    items: [
      { title: "Attendance", desc: "Daily and lesson-based attendance, card-scan check-in and chronic-absentee lists for parents." },
      { title: "Communications", desc: "Announcements, targeted messaging, SMS, email and WhatsApp — results, fees and emergencies." },
      { title: "Clinic & library", desc: "Medical profiles and visit logs, plus a full book catalogue with issue, return and fines." },
      { title: "Transport, boarding & assets", desc: "Routes and manifests, dorm allocation and roll calls, inventory and maintenance tickets." },
    ],
  },
  {
    area: "Trust & control",
    blurb: "School data stays the school's — isolated, audited and access-controlled.",
    items: [
      { title: "Roles & permissions", desc: "Custom roles with granular module permissions, so everyone sees exactly what they should." },
      { title: "Per-school isolation", desc: "Each school's data lives in its own database, enforced on every request — never shared." },
      { title: "Reports & analytics", desc: "Performance, attendance and finance reporting, exported to CSV, Excel or branded PDF." },
    ],
  },
];

export default function Features() {
  const [demo, setDemo] = useState(false);
  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <DemoModal open={demo} onClose={() => setDemo(false)} />
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden text-white" style={{ background: "linear-gradient(115deg,#5a36d6 0%, #4326b5 60%, #34199a 100%)" }}>
        <div className="absolute -top-32 -left-24 w-[460px] h-[460px] rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #b69bff, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center relative">
          <h1 className="text-4xl md:text-5xl font-light leading-[1.1] mb-5">Everything a Kenyan school needs, <span className="font-bold">nothing it doesn't</span>.</h1>
          <p className="text-lg text-white/75 mb-9">One platform, built around how schools actually run — from the admission form to the audited account.</p>
          <Link to="/register" className="inline-block px-9 py-4 font-bold rounded-full" style={{ background: "#fff", color: PURPLE }}>Start free — no card needed</Link>
        </div>
      </section>

      {/* Feature groups */}
      <div className="max-w-5xl mx-auto px-6 py-24 space-y-20">
        {groups.map((g, i) => (
          <section key={g.area} className="md:grid md:grid-cols-[0.8fr_1.2fr] md:gap-12">
            <div className="mb-6 md:mb-0">
              <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: PURPLE }}>{String(i + 1).padStart(2, "0")}</p>
              <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: NAVY }}>{g.area}</h2>
              <p className="text-slate-500 leading-relaxed">{g.blurb}</p>
            </div>
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {g.items.map(it => (
                <div key={it.title} className="py-5">
                  <h3 className="font-black text-lg" style={{ color: NAVY }}>{it.title}</h3>
                  <p className="text-slate-500 leading-relaxed mt-1">{it.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="py-24 text-center text-white" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${NAVY})` }}>
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black mb-4">See it with your own school's data</h2>
          <p className="text-white/80 text-lg mb-9">Set up takes minutes, and it's free to start. Bring your classes, fees and timetable across in an afternoon.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="px-9 py-4 font-black rounded-full bg-white" style={{ color: PURPLE }}>Get Started, It's Free</Link>
            <button onClick={() => setDemo(true)} className="px-9 py-4 font-semibold rounded-full border border-white/40 text-white hover:bg-white/10">Book a demo</button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
