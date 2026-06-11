import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarketingNav, MarketingFooter, BLUE, NAVY, TEAL, CONTACT_PHONE, CONTACT_EMAIL } from "./MarketingChrome";

export default function Contact() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Request received!", description: "We'll get back to you within 24 hours." });
  };

  const channels = [
    { icon: Phone, label: "Call us", value: CONTACT_PHONE, href: `tel:${CONTACT_PHONE.replace(/\s/g, "")}`, color: BLUE },
    { icon: Mail, label: "Email us", value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}`, color: TEAL },
    { icon: MessageSquare, label: "WhatsApp", value: CONTACT_PHONE, href: `https://wa.me/254726151104`, color: "#25D366" },
    { icon: MapPin, label: "Visit us", value: "Nairobi, Kenya", href: "#", color: "#F59E0B" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#EEF4FF 0%, #ffffff 70%)" }} />
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center relative">
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4" style={{ color: NAVY }}>Let's talk about your school</h1>
          <p className="text-lg text-slate-500">Questions, a demo, or help getting set up — our Kenyan-based team is here for you.</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20 grid lg:grid-cols-2 gap-10">
        {/* Channels */}
        <div>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {channels.map(c => (
              <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: c.color }}><c.icon className="w-5 h-5" /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
                <p className="font-bold text-sm mt-0.5" style={{ color: NAVY }}>{c.value}</p>
              </a>
            ))}
          </div>
          <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
            <p className="font-black text-lg mb-1">Prefer a quick demo?</p>
            <p className="text-blue-100 text-sm">Call or WhatsApp us on <b>{CONTACT_PHONE}</b> and we'll walk you through ShuleCloud live.</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-7">
          {submitted ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white" style={{ background: TEAL }}><CheckCircle2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-black mb-1" style={{ color: NAVY }}>Message sent!</h3>
              <p className="text-slate-500 text-sm">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-black mb-1" style={{ color: NAVY }}>Send us a message</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Your name</label>
                  <input required placeholder="Jane Doe" className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1B5FE3]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">School name</label>
                  <input placeholder="Your school" className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1B5FE3]" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
                  <input type="email" required placeholder="you@school.ac.ke" className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1B5FE3]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Phone</label>
                  <input placeholder="07XX XXX XXX" className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1B5FE3]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Message</label>
                <textarea required rows={4} placeholder="Tell us about your school and what you need…" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1B5FE3]" />
              </div>
              <button type="submit" className="w-full h-12 inline-flex items-center justify-center gap-2 font-bold text-white rounded-xl shadow-lg" style={{ background: BLUE }}>
                <Send className="w-4 h-4" /> Send Message
              </button>
            </form>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
