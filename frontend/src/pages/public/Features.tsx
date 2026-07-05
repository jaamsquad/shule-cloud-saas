import { useState } from "react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter, IconChip, NAVY, NAVY_DEEP, TEAL, MINT, MINT_SOFT, PAGE_BG } from "./MarketingChrome";
import { DemoModal } from "./DemoModal";
import {
  Users, GraduationCap, Banknote, CalendarCheck, ShieldCheck, ArrowRight, CheckCircle2, PlayCircle,
} from "lucide-react";

// Grouped the way a head teacher thinks about running a school.
const groups: { area: string; icon: any; blurb: string; items: { title: string; desc: string }[]; dark?: boolean }[] = [
  {
    area: "People", icon: Users,
    blurb: "Every student, guardian and staff member in one place — from the first admission form to the alumni record.",
    items: [
      { title: "Student lifecycle", desc: "Admissions, CBC-ready profiles, guardian linkage, promotions, transfers, houses & clubs and ID cards." },
      { title: "Staff & HR", desc: "Profiles, workload, leave, duty rosters, appraisals and staff ID cards — with TSC and BoM records." },
      { title: "Parent & student portals", desc: "Dedicated logins so parents see fees, results and attendance the moment they update." },
    ],
  },
  {
    area: "Teaching & Learning", icon: GraduationCap,
    blurb: "Plan, assess and report against the CBC the way the curriculum is actually designed.",
    items: [
      { title: "CBC academics", desc: "Learning areas, strands, sub-strands, competencies and rubrics, with portfolio evidence and progress tracking." },
      { title: "Assessments & exams", desc: "Question banks, paper generation, mark entry, moderation, results publishing and report cards." },
      { title: "Smart timetable", desc: "Teacher availability, room allocation, auto-generation with clash detection and substitutions." },
      { title: "LMS & e-learning", desc: "Courses, resources, assignments, quizzes and grading for both teachers and learners." },
    ],
  },
  {
    area: "Money", icon: Banknote, dark: true,
    blurb: "Bill, collect and reconcile fees without a single manual ledger entry.",
    items: [
      { title: "Fees & finance", desc: "Fee structures, bulk invoicing, arrears tracking, bursaries, refunds, statements and cashbook." },
      { title: "M-PESA built in", desc: "Per-school Daraja STK Push — parents pay from their phone and receipts post automatically." },
      { title: "Accounting & expenses", desc: "General ledger, expense management, procurement and budget vs actual reporting." },
    ],
  },
  {
    area: "Day-to-day Operations", icon: CalendarCheck,
    blurb: "The unglamorous things that keep a school running — handled.",
    items: [
      { title: "Attendance", desc: "Daily and lesson-based attendance, card-scan check-in and chronic-absentee lists for parents." },
      { title: "Communications", desc: "Announcements, targeted messaging, SMS, email and WhatsApp — results, fees and emergencies." },
      { title: "Clinic & library", desc: "Medical profiles and visit logs, plus a full book catalogue with issue, return and fines." },
      { title: "Transport, boarding & assets", desc: "Routes and manifests, dorm allocation and roll calls, inventory and maintenance tickets." },
    ],
  },
  {
    area: "Trust & Control", icon: ShieldCheck,
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
    <div className="min-h-screen font-sans" style={{ background: PAGE_BG, color: NAVY }}>
      <DemoModal open={demo} onClose={() => setDemo(false)} />
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black leading-[1.1] mb-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Empower Your Institution with Precision Tools
        </h1>
        <p className="text-lg text-slate-600">
          ShuleCloud provides a structured framework for modern education management — focusing on data clarity, administrative speed and student success.
        </p>
        <div className="flex items-center justify-center gap-3 mt-7">
          <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 font-bold text-white rounded-lg" style={{ background: TEAL }}>Get Started Free <ArrowRight className="w-4 h-4" /></Link>
          <button onClick={() => setDemo(true)} className="inline-flex items-center gap-2 px-6 py-3 font-bold rounded-lg border bg-white" style={{ color: NAVY, borderColor: "#d4dee6" }}><PlayCircle className="w-4 h-4" /> Watch Demo</button>
        </div>
      </section>

      {/* Feature groups as cards */}
      <section className="max-w-7xl mx-auto px-6 pb-20 space-y-5">
        {groups.map((g, gi) => (
          <div key={g.area} className="rounded-2xl border p-6 md:p-8"
            style={g.dark ? { background: NAVY, borderColor: NAVY } : { background: "#fff", borderColor: "#eef2f6" }}>
            <div className="flex items-start gap-4 mb-5">
              <IconChip icon={g.icon} />
              <div>
                <h2 className="text-xl font-black" style={{ color: g.dark ? "#fff" : NAVY }}>{g.area}</h2>
                <p className="text-sm mt-1 max-w-2xl" style={{ color: g.dark ? "rgba(255,255,255,.7)" : "#64748b" }}>{g.blurb}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.items.map(it => (
                <div key={it.title} className="rounded-xl p-4" style={{ background: g.dark ? "rgba(255,255,255,.06)" : PAGE_BG }}>
                  <h3 className="text-sm font-black flex items-center gap-2 mb-1.5" style={{ color: g.dark ? "#fff" : NAVY }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: g.dark ? MINT : TEAL }} /> {it.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: g.dark ? "rgba(255,255,255,.6)" : "#64748b" }}>{it.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA band */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="rounded-3xl px-8 py-12 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}>
          <h2 className="text-3xl font-black mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>See it in action</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-7">Start free today or book a walkthrough with our team — no credit card required.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="px-6 py-3.5 font-bold text-white rounded-lg" style={{ background: TEAL }}>Start Your Free Trial</Link>
            <button onClick={() => setDemo(true)} className="px-6 py-3.5 font-bold text-white rounded-lg border border-white/25 hover:bg-white/10 transition-colors">Talk to an Expert</button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
