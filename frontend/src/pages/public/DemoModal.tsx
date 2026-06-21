import { useState } from "react";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PURPLE, NAVY, CONTACT_PHONE } from "./MarketingChrome";

/**
 * Lightweight "Book a demo" modal — posts to the same onboarding/contact
 * endpoint the Contact page uses, so requests land in the same inbox.
 */
export function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", school: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "https://api.shulecloud.com"}/api/v1/onboard/contact`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, message: form.message || "Demo request from the website." }),
      });
      setDone(true);
      toast({ title: "Demo requested!", description: "We'll reach out within 24 hours to set it up." });
    } catch {
      toast({ title: "Could not send", description: "Please try again or WhatsApp us directly.", variant: "destructive" });
    } finally { setSending(false); }
  };

  const close = () => { onClose(); setTimeout(() => { setDone(false); setForm({ name: "", school: "", email: "", phone: "", message: "" }); }, 200); };
  const field = "w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#613ddf]";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <button onClick={close} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 z-10"><X className="w-5 h-5" /></button>

        {done ? (
          <div className="text-center px-8 py-16">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl text-white" style={{ background: PURPLE }}>✓</div>
            <h3 className="text-xl font-black mb-1" style={{ color: NAVY }}>You're all set!</h3>
            <p className="text-slate-500 text-sm">Our team will contact you within 24 hours to book your demo.</p>
            <button onClick={close} className="mt-6 px-6 py-2.5 rounded-full font-bold text-white" style={{ background: PURPLE }}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-8 py-8">
            <h3 className="text-2xl font-black mb-1" style={{ color: NAVY }}>Book a demo</h3>
            <p className="text-slate-500 text-sm mb-6">Tell us a little about your school and we'll walk you through ShuleCloud live. Prefer to talk now? WhatsApp <b>{CONTACT_PHONE}</b>.</p>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Your name</label>
                  <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jane Doe" className={field} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">School name</label>
                  <input value={form.school} onChange={e => set("school", e.target.value)} placeholder="Your school" className={field} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
                  <input type="email" required value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@school.ac.ke" className={field} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="07XX XXX XXX" className={field} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Anything we should know? <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea value={form.message} onChange={e => set("message", e.target.value)} rows={3} placeholder="Number of students, what you're hoping to fix…" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#613ddf]" />
              </div>
              <button type="submit" disabled={sending} className="w-full h-12 font-bold text-white rounded-full shadow-lg disabled:opacity-60" style={{ background: PURPLE }}>
                {sending ? "Sending…" : "Request my demo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
