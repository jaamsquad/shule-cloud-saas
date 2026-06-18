import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Home, Check, Loader2, Settings, MessageSquare, Mail, QrCode, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const defaultSettings = {
    // SMS Gateway
    smsProvider: "Africa's Talking",
    smsApiKey: "",
    smsSenderId: "",
    smsEnabled: false,
    // Email
    emailProvider: "SMTP",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    emailFromName: "",
    emailFromAddress: "",
    emailEnabled: false,
    // WhatsApp
    whatsappProvider: "qr",         // "qr" (scanned session) | "api" (Meta Cloud API)
    whatsappEnabled: false,
    whatsappApiKey: "",
    whatsappPhoneNumberId: "",
    whatsappBusinessAccountId: "",
    // Push Notifications
    pushEnabled: false,
    fcmServerKey: "",
    // School contact
    schoolPhone: "",
    schoolEmail: "",
};

export default function CommunicationsSettings() {
    const qc = useQueryClient();
    const [settings, setSettings] = useState(defaultSettings);
    const [settingsId, setSettingsId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"sms" | "email" | "push">("sms");
    const [isDirty, setIsDirty] = useState(false);

    const { data: existing, isLoading } = useQuery({
        queryKey: ["communication_settings"],
        queryFn: async () => { const r = await api.get("/communication_settings"); return Array.isArray(r.data) ? r.data[0] : null; },
    });

    useEffect(() => {
        if (existing) { setSettingsId(existing._id); setSettings({ ...defaultSettings, ...existing }); }
    }, [existing]);

    const saveMut = useMutation({
        mutationFn: (p: any) => settingsId ? api.patch(`/communication_settings/${settingsId}`, p) : api.post("/communication_settings", p),
        onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["communication_settings"] }); if (!settingsId) setSettingsId(res.data?.id || res.data?._id); toast.success("Settings saved"); setIsDirty(false); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const update = (f: string, v: any) => { setSettings(p => ({ ...p, [f]: v })); setIsDirty(true); };

    const Field = ({ label, field, type = "text", placeholder, masked }: any) => (
        <div className="relative">
            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{label}</div>
            <input type={masked ? "password" : type} value={(settings as any)[field] ?? ""} onChange={e => update(field, e.target.value)} placeholder={placeholder}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
        </div>
    );

    const Toggle = ({ label, field, description }: any) => (
        <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100">
            <div><p className="text-xs font-black text-slate-700 uppercase tracking-widest">{label}</p>{description && <p className="text-[9px] text-slate-400 font-bold mt-0.5">{description}</p>}</div>
            <button onClick={() => update(field, !(settings as any)[field])}
                className={`w-12 h-7 rounded-full transition-all relative flex-shrink-0 ${(settings as any)[field] ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${(settings as any)[field] ? "right-1" : "left-1"}`} />
            </button>
        </div>
    );

    const TABS = [
        { key: "sms", label: "SMS", icon: MessageSquare },
        { key: "email", label: "Email", icon: Mail },
        { key: "push", label: "Push Notifications", icon: Bell },
    ];

    function Bell(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>; }

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Communications</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Settings</span>
                </div>
                <button onClick={() => saveMut.mutate(settings)} disabled={saveMut.isPending || !isDirty}
                    className={`h-10 px-5 font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all ${isDirty ? "bg-[#5C67F2] hover:bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {isDirty ? "Save Settings" : "All Saved"}
                </button>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Settings className="w-7 h-7 text-[#5C67F2]" />Communication Settings</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Configure SMS, Email, WhatsApp, and push notification gateways</p>
                </div>

                {isLoading ? <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div> : (
                    <div className="space-y-6">
                        {/* Tab bar */}
                        <div className="flex gap-2 flex-wrap">
                            {TABS.map(t => (
                                <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide border transition-all ${activeTab === t.key ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>
                                    <t.icon className="w-4 h-4" />{t.label}
                                </button>
                            ))}
                        </div>

                        {/* SMS */}
                        {activeTab === "sms" && (
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-5">
                                <Toggle label="Enable SMS Gateway" field="smsEnabled" description="Send bulk SMS to students, parents and staff" />
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">SMS Provider</div>
                                    <select value={settings.smsProvider} onChange={e => update("smsProvider", e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        {["Africa's Talking", "Twilio", "Infobip", "Vonage", "Custom"].map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <Field label="API Key" field="smsApiKey" masked placeholder="Your SMS API key..." />
                                    <Field label="Sender ID / From Name" field="smsSenderId" placeholder="e.g. SCHOOL" />
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 font-bold">
                                    💡 Get API credentials from your SMS provider's dashboard. Africa's Talking offers free sandbox for testing.
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        {activeTab === "email" && (
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-5">
                                <Toggle label="Enable Email Notifications" field="emailEnabled" description="Send email notifications to parents and staff" />
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Email Provider</div>
                                    <select value={settings.emailProvider} onChange={e => update("emailProvider", e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        {["SMTP", "SendGrid", "Mailgun", "AWS SES", "Postmark"].map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <Field label="SMTP Host" field="smtpHost" placeholder="smtp.gmail.com" />
                                    <Field label="SMTP Port" field="smtpPort" type="number" placeholder="587" />
                                    <Field label="SMTP Username" field="smtpUser" placeholder="your@email.com" />
                                    <Field label="SMTP Password" field="smtpPass" masked placeholder="•••••••••" />
                                    <Field label="From Name" field="emailFromName" placeholder="School Name" />
                                    <Field label="From Email Address" field="emailFromAddress" placeholder="noreply@school.ac.ke" />
                                </div>
                            </div>
                        )}

                        {/* WhatsApp — now configured by scanning a QR (its own page).
                            The Meta Cloud API remains available as an optional provider. */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-5">
                            <div className="flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">WhatsApp</h3>
                            </div>

                            <div className="relative">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Provider</div>
                                <select value={settings.whatsappProvider} onChange={e => update("whatsappProvider", e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                    <option value="qr">QR Session — scan with your phone (recommended)</option>
                                    <option value="api">Meta WhatsApp Cloud API — use API keys</option>
                                </select>
                            </div>

                            {settings.whatsappProvider === "qr" ? (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between gap-4">
                                    <p className="text-xs text-emerald-700 font-bold">
                                        Connect your school's WhatsApp by scanning a QR code — no Meta account needed. Manage the link on the WhatsApp Integration page.
                                    </p>
                                    <Link to="/communications/whatsapp-integration"
                                        className="flex-shrink-0 inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl">
                                        <QrCode className="w-4 h-4" /> Open Integration <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <Toggle label="Enable WhatsApp Business API" field="whatsappEnabled" description="Send WhatsApp messages via Meta Cloud API" />
                                    <div className="grid grid-cols-1 gap-5">
                                        <Field label="WhatsApp Business API Key / Token" field="whatsappApiKey" masked placeholder="Bearer token from Meta..." />
                                        <Field label="Phone Number ID" field="whatsappPhoneNumberId" placeholder="From Meta Business Manager" />
                                        <Field label="Business Account ID" field="whatsappBusinessAccountId" placeholder="WABA ID" />
                                    </div>
                                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-xs text-green-700 font-bold">
                                        📱 Set up at <span className="underline">business.facebook.com</span> → WhatsApp → API Setup. Requires Meta Business verification.
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Push */}
                        {activeTab === "push" && (
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-5">
                                <Toggle label="Enable Push Notifications" field="pushEnabled" description="Send push notifications via Firebase Cloud Messaging (FCM)" />
                                <Field label="Firebase Server Key (FCM)" field="fcmServerKey" masked placeholder="AAAA... (from Firebase Console)" />
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 font-bold">
                                    🔔 Get your FCM Server Key from <span className="underline">console.firebase.google.com</span> → Project Settings → Cloud Messaging.
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pb-4">
                            <button onClick={() => saveMut.mutate(settings)} disabled={saveMut.isPending || !isDirty}
                                className={`h-12 px-10 font-black text-sm uppercase tracking-widest rounded-2xl flex items-center gap-2 transition-all ${isDirty ? "bg-[#5C67F2] hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                                {saveMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                Save All Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
