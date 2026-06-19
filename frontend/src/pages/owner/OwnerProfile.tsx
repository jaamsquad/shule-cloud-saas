import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Camera, Shield, Mail, Phone, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";
const ROLE_LABEL: Record<string, string> = {
    super_owner: "Super Owner", owner: "Owner", finance: "Finance",
    support: "Support", sales: "Sales", viewer: "Viewer",
};

export default function OwnerProfile() {
    const qc = useQueryClient();
    const fileRef = useRef<HTMLInputElement>(null);

    const { data: profile, isLoading } = useQuery({
        queryKey: ["owner_profile"],
        queryFn: async () => (await api.get("/owner/profile")).data,
    });

    const [form, setForm] = useState({ name: "", email: "", phone: "", bio: "", avatar: "" });
    useEffect(() => {
        if (profile) setForm({ name: profile.name || "", email: profile.email || "", phone: profile.phone || "", bio: profile.bio || "", avatar: profile.avatar || "" });
    }, [profile]);

    const isSuper = !!profile?.isSuperOwner;

    const save = useMutation({
        mutationFn: async () => api.patch("/owner/profile", form),
        onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["owner_profile"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        if (f.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB");
        const r = new FileReader(); r.onloadend = () => setForm((p) => ({ ...p, avatar: String(r.result) })); r.readAsDataURL(f);
    };

    // ── Message a teammate ───────────────────────────────────────────────────
    const { data: contacts = [] } = useQuery({
        queryKey: ["owner_contacts"],
        queryFn: async () => { try { const r = await api.get("/owner/contacts"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const [toUserId, setToUserId] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const sendMsg = useMutation({
        mutationFn: async () => api.post("/owner/message-user", { toUserId, subject, message }),
        onSuccess: (res: any) => {
            const d = res.data?.delivery;
            const via = d ? [d.email && "email", d.whatsapp && "WhatsApp"].filter(Boolean).join(" & ") : "";
            toast.success(via ? `Sent via ${via}` : "Message sent");
            setSubject(""); setMessage("");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed", { duration: 7000 }),
    });

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
            {/* Profile card */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6" style={{ border: "0.5px solid #e5e7eb" }}>
                <div className="flex items-center gap-5 mb-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center ring-4 ring-slate-50">
                            {form.avatar ? <img src={form.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-slate-300">{(form.name || "?")[0]}</span>}
                        </div>
                        <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full text-white flex items-center justify-center" style={{ background: PRIMARY }}>
                            <Camera className="w-3.5 h-3.5" />
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">{form.name || "Your name"}</h2>
                        <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase">
                            <Shield className="w-3 h-3" /> {ROLE_LABEL[profile?.role] || profile?.role}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} icon={null} />
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address {!isSuper && <span className="text-slate-400">(only Super Owner can change)</span>}</label>
                        <div className="relative">
                            {isSuper ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />}
                            <input type="email" value={form.email} disabled={!isSuper} onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full h-10 pl-10 pr-3 rounded-lg text-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-500" style={{ border: "0.5px solid #e5e7eb" }} />
                        </div>
                    </div>
                    <Field label="WhatsApp Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} icon={<Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />} />
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Bio</label>
                        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ border: "0.5px solid #e5e7eb" }} />
                    </div>
                    <button onClick={() => save.mutate()} disabled={save.isPending} className="h-10 px-5 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>
                        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
                    </button>
                </div>
            </div>

            {/* Message a teammate */}
            <div className="bg-white rounded-xl p-6 h-fit" style={{ border: "0.5px solid #e5e7eb" }}>
                <div className="flex items-center gap-2 mb-3"><Send className="w-4 h-4" style={{ color: PRIMARY }} /><h3 className="text-sm font-black text-slate-800">Message a Teammate</h3></div>
                <p className="text-[11px] text-slate-400 mb-3">Sends via email (and WhatsApp if they have a number).</p>
                <select value={toUserId} onChange={(e) => setToUserId(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm mb-2 focus:outline-none" style={{ border: "0.5px solid #e5e7eb" }}>
                    <option value="">— Choose recipient —</option>
                    {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({ROLE_LABEL[c.role] || c.role})</option>)}
                </select>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full h-10 px-3 rounded-lg text-sm mb-2 focus:outline-none" style={{ border: "0.5px solid #e5e7eb" }} />
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message…" rows={4} className="w-full px-3 py-2 rounded-lg text-sm mb-3 focus:outline-none" style={{ border: "0.5px solid #e5e7eb" }} />
                <button onClick={() => { if (!toUserId) return toast.error("Choose a recipient"); if (!message.trim()) return toast.error("Write a message"); sendMsg.mutate(); }}
                    disabled={sendMsg.isPending} className="w-full h-10 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>
                    {sendMsg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
                </button>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, icon }: { label: string; value: string; onChange: (v: string) => void; icon: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
            <div className="relative">
                {icon}
                <input value={value} onChange={(e) => onChange(e.target.value)} className={`w-full h-10 ${icon ? "pl-10" : "px-3"} pr-3 rounded-lg text-sm focus:outline-none`} style={{ border: "0.5px solid #e5e7eb" }} />
            </div>
        </div>
    );
}
