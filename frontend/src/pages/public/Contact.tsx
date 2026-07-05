import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarketingNav, MarketingFooter, IconChip, NAVY, TEAL, MINT_SOFT, PAGE_BG, CONTACT_PHONE, CONTACT_EMAIL } from "./MarketingChrome";

export default function Contact() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", school: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "https://api.shulecloud.com"}/api/v1/onboard/contact`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      setSubmitted(true);
      toast({ title: "Request received!", description: "We'll get back to you within 24 hours." });
    } catch {
      toast({ title: "Could not send", description: "Please try again or email us directly.", variant: "destructive" });
    } finally { setSending(false); }
  };

  const info = [
    { icon: Mail, label: "Email", value: CONTACT_EMAIL, sub: "24/7 Response Time" },
    { icon: Phone, label: "Phone", value: CONTACT_PHONE, sub: "Mon–Fri, 8am – 6pm EAT" },
    { icon: MapPin, label: "Office", value: "Nairobi, Kenya", sub: "By appointment" },
  ];

  const field = "w-full h-11 px-4 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#158066]";

  return (
    <div className="min-h-screen font-sans" style={{ background: PAGE_BG, color: NAVY }}>
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <h1 className="text-4xl md:text-5xl font-black leading-[1.1] mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Let's build the future of education together
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          Have questions about our platform? Our team is ready to help your institution streamline student progress and school operations.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16 grid lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7">
          {submitted ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white" style={{ background: TEAL }}><CheckCircle2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-black mb-1" style={{ color: NAVY }}>Message sent!</h3>
              <p className="text-slate-500 text-sm">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xl font-black mb-2" style={{ color: NAVY, fontFamily: "'Poppins', sans-serif" }}>Send us a message</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Full Name</label><input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" className={field} /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5">School Name</label><input value={form.school} onChange={(e) => set("school", e.target.value)} placeholder="International Academy" className={field} /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Work Email</label><input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@school.ac.ke" className={field} /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Phone</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XX XXX XXX" className={field} /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5">How can we help?</label><textarea required value={form.message} onChange={(e) => set("message", e.target.value)} rows={4} placeholder="Tell us about your institution's needs…" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#158066]" /></div>
              <button type="submit" disabled={sending} className="inline-flex items-center gap-2 px-6 py-3 font-bold text-white rounded-lg disabled:opacity-60" style={{ background: TEAL }}>
                <Send className="w-4 h-4" /> {sending ? "Sending…" : "Send Message"}
              </button>
            </form>
          )}
        </div>

        {/* Info cards */}
        <div className="space-y-4">
          {info.map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
              <IconChip icon={c.icon} />
              <div>
                <p className="text-sm font-black" style={{ color: NAVY }}>{c.label}</p>
                <p className="text-sm text-slate-700">{c.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
              </div>
            </div>
          ))}
          <a href="https://wa.me/254726151104" target="_blank" rel="noreferrer" className="block rounded-2xl p-5 text-white" style={{ background: TEAL }}>
            <p className="font-black flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Prefer WhatsApp?</p>
            <p className="text-sm text-white/85 mt-1">Message us on {CONTACT_PHONE} for a live walkthrough.</p>
          </a>
        </div>
      </section>

      {/* Trusted-by */}
      <section className="bg-white border-y border-slate-100 py-14 text-center">
        <h2 className="text-2xl font-black mb-8" style={{ fontFamily: "'Poppins', sans-serif" }}>Trusted by 500+ Educational Institutions</h2>
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-4">
          {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-10 w-28 rounded-lg" style={{ background: MINT_SOFT }} />)}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
