import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { LegalShell, PURPLE, NAVY, CONTACT_PHONE } from "./MarketingChrome";

const faqs: { q: string; a: string }[] = [
  {
    q: "Is ShuleCloud built for the Kenyan curriculum?",
    a: "Yes. ShuleCloud is built around Kenya's Competency-Based Curriculum (CBC) with full learning areas, strands, sub-strands, competencies and rubrics — and it still supports 8-4-4 schools. Report cards, assessments and analytics all follow the CBC achievement levels.",
  },
  {
    q: "How much does it cost?",
    a: "You can start for free, no card required. Paid plans unlock advanced modules like custom domains, branding and higher student limits. Pricing is in KES and billed monthly or annually — talk to us for a quote tailored to your school's size.",
  },
  {
    q: "Can parents pay fees through M-PESA?",
    a: "Yes. Each school connects its own Safaricom Daraja account, so parents pay fees by M-PESA STK Push straight from their phone. Receipts post against the student's account automatically — no manual reconciliation.",
  },
  {
    q: "Is our school's data kept separate from other schools?",
    a: "Completely. Every school runs in its own isolated database, and tenant access is enforced on every single request. No school can ever see another school's data. We comply with the Kenya Data Protection Act (2019).",
  },
  {
    q: "How long does setup take?",
    a: "Most schools are up and running the same day. You can import your classes, students, fee structure and timetable in an afternoon, and our team helps you migrate from spreadsheets or your previous system.",
  },
  {
    q: "Do parents and students get their own logins?",
    a: "Yes. There are dedicated parent and student portals where they can see results, fee balances, attendance and announcements in real time — on any phone or computer.",
  },
  {
    q: "Can we send SMS and WhatsApp messages to parents?",
    a: "Yes. You can send announcements, results, fee reminders and emergency broadcasts by SMS, email and WhatsApp — to the whole school or targeted groups like a single class or stream.",
  },
  {
    q: "Does it work on a phone?",
    a: "Yes. ShuleCloud runs in any browser and is optimised for phones and tablets, so teachers and administrators can work from anywhere — no app install required.",
  },
  {
    q: "What about exams, marks and report cards?",
    a: "ShuleCloud handles the full assessment workflow: question banks, paper generation, mark entry, moderation, results publishing and branded report cards — for both CBC competency levels and traditional grading.",
  },
  {
    q: "Can we use our own school domain and branding?",
    a: "Yes, on paid plans. Run ShuleCloud on your own custom domain with your school's logo, name and colours across the portals and printed documents.",
  },
  {
    q: "Is our data backed up, and can we export it?",
    a: "Your data is backed up and encrypted in transit and at rest. You can export your records at any time, and if you ever leave, you keep your data — there's no lock-in.",
  },
  {
    q: "What support do we get?",
    a: `Our Kenyan-based team supports you by phone, email and WhatsApp. Reach us on ${CONTACT_PHONE} during business hours, or book a live demo any time.`,
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-5">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-4 text-left">
        <span className="font-black text-lg" style={{ color: NAVY }}>{q}</span>
        <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: PURPLE }} />
      </button>
      {open && <p className="text-slate-500 leading-relaxed mt-3 max-w-3xl">{a}</p>}
    </div>
  );
}

export default function FAQ() {
  return (
    <LegalShell title="Frequently asked questions" subtitle="Everything head teachers and bursars ask us before getting started.">
      <div className="divide-y divide-slate-100">
        {faqs.map(f => <Item key={f.q} {...f} />)}
      </div>
      <div className="mt-14 text-center rounded-3xl px-6 py-12 text-white" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${NAVY})` }}>
        <h2 className="text-2xl font-black mb-2">Still have a question?</h2>
        <p className="text-white/80 mb-6">Our team is happy to help — or see ShuleCloud with your own school's data.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/register" className="px-8 py-3.5 font-black rounded-full bg-white" style={{ color: PURPLE }}>Start free</Link>
          <Link to="/contact" className="px-8 py-3.5 font-semibold rounded-full border border-white/40 text-white hover:bg-white/10">Contact us</Link>
        </div>
      </div>
    </LegalShell>
  );
}
