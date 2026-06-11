import { Link } from "react-router-dom";
import { Check, ArrowRight, Star, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { MarketingNav, MarketingFooter, BLUE, NAVY, TEAL } from "./MarketingChrome";

const FALLBACK = [
  { name: "Starter", price: "KSh 0", period: "/ term", tagline: "For small schools getting started", popular: false,
    features: ["Up to 150 students", "Student & staff records", "Fee invoicing & receipts", "Basic exams & report cards", "Email support"] },
  { name: "School", price: "KSh 15,000", period: "/ term", tagline: "Everything a growing school needs", popular: true,
    features: ["Unlimited students", "M-PESA fee payments", "Smart timetable & CBC academics", "Student, parent & teacher portals", "SMS / Email / WhatsApp", "Analytics & report cards", "Priority support"] },
  { name: "Enterprise", price: "Custom", period: "", tagline: "For groups & large institutions", popular: false,
    features: ["Multi-campus management", "Custom domain & branding", "Dedicated account manager", "API & integrations", "On-site training", "24/7 support"] },
];

const fmtPrice = (p: any) => {
  if (typeof p.price === "number") return p.price === 0 ? "KSh 0" : `KSh ${Number(p.price).toLocaleString()}`;
  return p.price || "Custom";
};

export default function Pricing() {
  const { data, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => { const r = await api.get("/plans"); return Array.isArray(r.data) ? r.data : []; },
    retry: false,
  });

  const plans = (data && data.length)
    ? data.map((p: any) => ({
        name: p.name, tagline: p.tagline || p.description || "", popular: !!(p.popular || p.highlight || p.isPopular),
        price: fmtPrice(p), period: p.period || p.interval || (p.name?.toLowerCase().includes("enterprise") ? "" : "/ term"),
        features: Array.isArray(p.features) ? p.features : [],
      }))
    : FALLBACK;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <MarketingNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#EEF4FF 0%, #ffffff 70%)" }} />
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center relative">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5" style={{ background: `${BLUE}12`, color: BLUE }}>
            <Star className="w-3.5 h-3.5" /> Simple, transparent pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4" style={{ color: NAVY }}>Pricing that grows with your school</h1>
          <p className="text-lg text-slate-500">No hidden fees. No per-feature charges. Pay per term and cancel anytime.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BLUE }} /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {plans.map((p: any) => (
              <div key={p.name}
                className={`relative bg-white rounded-3xl border p-8 flex flex-col ${p.popular ? "shadow-2xl lg:scale-[1.03]" : "shadow-sm"}`}
                style={{ borderColor: p.popular ? BLUE : "#E2E8F0" }}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white" style={{ background: BLUE }}>Most Popular</span>
                )}
                <p className="text-sm font-black uppercase tracking-widest" style={{ color: p.popular ? BLUE : "#94A3B8" }}>{p.name}</p>
                {p.tagline && <p className="text-xs text-slate-400 mt-1 mb-5">{p.tagline}</p>}
                <div className="flex items-end gap-1 mb-6 mt-auto">
                  <span className="text-4xl font-black" style={{ color: NAVY }}>{p.price}</span>
                  {p.period && <span className="text-sm text-slate-400 mb-1">{p.period}</span>}
                </div>
                <div className="space-y-3 mb-8 flex-1">
                  {p.features.map((f: string) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white" style={{ background: TEAL }}><Check className="w-3 h-3" /></span>
                      <span className="text-sm font-semibold text-slate-700">{f}</span>
                    </div>
                  ))}
                </div>
                <Link to={String(p.name).toLowerCase().includes("enterprise") ? "/contact" : "/register"}
                  className={`inline-flex items-center justify-center gap-2 h-12 rounded-xl font-bold transition-all ${p.popular ? "text-white shadow-lg" : "border-2 text-slate-700 hover:bg-slate-50"}`}
                  style={p.popular ? { background: BLUE } : { borderColor: "#E2E8F0" }}>
                  {String(p.name).toLowerCase().includes("enterprise") ? "Talk to Sales" : "Get Started"} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
        <p className="text-center text-sm text-slate-400 mt-10">All plans include free updates, secure per-school data isolation and Kenyan-based support.</p>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto rounded-3xl p-12 text-center text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}>
          <h2 className="text-3xl font-black mb-3">Not sure which plan fits?</h2>
          <p className="text-blue-100 max-w-xl mx-auto mb-8">Talk to our team and we'll help you pick the right plan for your school.</p>
          <Link to="/contact" className="inline-flex items-center gap-2 px-8 py-3.5 font-black rounded-xl bg-white" style={{ color: BLUE }}>Talk to Sales <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
