import { useState, useMemo } from "react";
import { Home, Zap, ChevronRight, CheckCircle2, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

export const INTEGRATIONS_CONFIG = [
    // ── Payments ────────────────────────────────────────────────────────────
    {
        key: "payhero", name: "PayHero", category: "Payments", logo: "🦸", color: "#F97316",
        description: "Accept M-PESA & card payments via PayHero — simplest Kenya payment API.",
        docsUrl: "https://payhero.co.ke/docs",
        testEndpoint: "/integrations/test/payhero",
        webhook: "payhero/callback",
        guide: [
            "Sign up at payhero.co.ke and create an account",
            "Go to Settings → API and copy your Username and Password",
            "Note your Channel ID from the Dashboard",
            "Paste your callback URL in the PayHero dashboard",
        ],
        fields: [
            { label: "API Username", field: "username", masked: false, placeholder: "your_username", hint: "From PayHero Settings → API" },
            { label: "API Password", field: "password", masked: true, hint: "From PayHero Settings → API" },
            { label: "Channel ID",   field: "channelId", masked: false, placeholder: "123", hint: "Found in your PayHero dashboard" },
            { label: "Callback URL", field: "callbackUrl", masked: false, placeholder: "auto-filled below", hint: "Copy from the webhook section below" },
        ],
    },
    {
        key: "daraja", name: "M-PESA (Daraja)", category: "Payments", logo: "🟢", color: "#00A651",
        description: "Direct Safaricom Daraja API integration for M-PESA STK Push payments.",
        docsUrl: "https://developer.safaricom.co.ke",
        testEndpoint: "/integrations/test/mpesa",
        webhook: "mpesa/callback",
        guide: [
            "Register at developer.safaricom.co.ke",
            "Create an app and select Lipa Na M-Pesa Online (STK Push)",
            "Get the Consumer Key and Consumer Secret from your app",
            "Copy the Passkey for your shortcode from the Safaricom business portal",
            "Choose Transaction Type: Paybill, or Till (Buy Goods)",
            "For a Till: Business Shortcode = your Head Office/Store number, and set the Till Number",
        ],
        fields: [
            { label: "Consumer Key",       field: "consumerKey",    masked: true,  hint: "From Safaricom Developer Portal" },
            { label: "Consumer Secret",    field: "consumerSecret", masked: true,  hint: "From Safaricom Developer Portal" },
            { label: "Transaction Type",   field: "txType",         type: "select", options: ["CustomerPayBillOnline", "CustomerBuyGoodsOnline"], hint: "Paybill or Till (Buy Goods)" },
            { label: "Business Shortcode", field: "shortCode",      masked: false, placeholder: "174379", hint: "Paybill number — or, for a Till, your Head Office/Store number" },
            { label: "Till Number",        field: "tillNumber",     masked: false, placeholder: "e.g. 5678901", hint: "Till/Buy Goods only — the till customers pay to. Leave blank for Paybill." },
            { label: "Passkey",            field: "passkey",        masked: true,  hint: "From Safaricom business portal — must match this shortcode" },
            { label: "Environment",        field: "environment",    type: "select", options: ["sandbox", "production"] },
        ],
    },
    {
        key: "stripe", name: "Stripe", category: "Payments", logo: "💳", color: "#635BFF",
        description: "Accept international card payments — Visa, Mastercard, and more.",
        docsUrl: "https://stripe.com/docs",
        testEndpoint: "/integrations/test/stripe",
        webhook: "stripe/callback",
        guide: [
            "Create an account at stripe.com",
            "Go to Developers → API keys",
            "Copy Publishable Key and Secret Key",
            "Set up webhook endpoint for payment confirmations",
        ],
        fields: [
            { label: "Publishable Key", field: "publishableKey", masked: false, placeholder: "pk_live_..." },
            { label: "Secret Key",      field: "secretKey",      masked: true,  placeholder: "sk_live_..." },
            { label: "Webhook Secret",  field: "webhookSecret",  masked: true,  placeholder: "whsec_..." },
        ],
    },
    {
        key: "flutterwave", name: "Flutterwave", category: "Payments", logo: "🌊", color: "#F5A623",
        description: "Multi-currency payments across Africa — M-PESA, cards, bank transfers.",
        docsUrl: "https://developer.flutterwave.com",
        testEndpoint: "/integrations/test/flutterwave",
        webhook: "flutterwave/callback",
        guide: [
            "Register at flutterwave.com",
            "Go to Settings → API Keys",
            "Copy Public Key, Secret Key, and Encryption Key",
        ],
        fields: [
            { label: "Public Key",      field: "publicKey",  masked: false },
            { label: "Secret Key",      field: "secretKey",  masked: true },
            { label: "Encryption Key",  field: "encKey",     masked: true },
        ],
    },

    // ── LMS / Video ──────────────────────────────────────────────────────────
    {
        key: "google_classroom", name: "Google Classroom", category: "LMS", logo: "🎓", color: "#4285F4",
        description: "Sync assignments, classwork and announcements with Google Classroom.",
        docsUrl: "https://developers.google.com/classroom",
        testEndpoint: "/integrations/test/google",
        guide: [
            "Go to console.cloud.google.com and create a project",
            "Enable the Google Classroom API",
            "Create OAuth 2.0 credentials (Web application)",
            "Add your redirect URI to Authorized redirect URIs",
        ],
        fields: [
            { label: "Client ID",     field: "clientId",     masked: false },
            { label: "Client Secret", field: "clientSecret", masked: true },
            { label: "Redirect URI",  field: "redirectUri",  masked: false, placeholder: "https://yourapp.com/auth/google/callback" },
        ],
    },
    {
        key: "zoom", name: "Zoom", category: "Video Conferencing", logo: "🎥", color: "#2D8CFF",
        description: "Host virtual classes, parent meetings and staff training via Zoom.",
        docsUrl: "https://marketplace.zoom.us",
        testEndpoint: "/integrations/test/zoom",
        guide: [
            "Go to marketplace.zoom.us and create a Server-to-Server OAuth app",
            "Note your Account ID, Client ID, and Client Secret",
            "Add the meeting:write scope to your app",
        ],
        fields: [
            { label: "Account ID",    field: "accountId",   masked: false },
            { label: "Client ID",     field: "clientId",    masked: false },
            { label: "Client Secret", field: "clientSecret",masked: true },
        ],
    },
    {
        key: "microsoft_teams", name: "Microsoft Teams", category: "Video Conferencing", logo: "💻", color: "#6264A7",
        description: "Create Teams meetings for virtual classes and staff collaboration.",
        docsUrl: "https://docs.microsoft.com/graph",
        testEndpoint: "/integrations/test/teams",
        guide: [
            "Go to portal.azure.com and register an application",
            "Note the Tenant ID and Application (client) ID",
            "Create a Client Secret under Certificates & secrets",
            "Grant Calendars.ReadWrite and OnlineMeetings.ReadWrite permissions",
        ],
        fields: [
            { label: "Tenant ID",     field: "tenantId",    masked: false },
            { label: "Client ID",     field: "clientId",    masked: false },
            { label: "Client Secret", field: "clientSecret",masked: true },
        ],
    },
    {
        key: "jitsi", name: "Jitsi Meet (Custom)", category: "Video Conferencing", logo: "📹", color: "#0099FF",
        description: "Use your own hosted Jitsi server for private, unlimited live classes.",
        docsUrl: "https://jitsi.github.io/handbook",
        guide: [
            "Self-host Jitsi on your server or use a managed instance",
            "Enable JWT authentication in your Jitsi config",
            "Note your App ID and App Secret for token generation",
        ],
        fields: [
            { label: "Jitsi Server URL", field: "serverUrl",  masked: false, placeholder: "https://meet.jit.si" },
            { label: "JWT App ID",       field: "appId",      masked: false },
            { label: "JWT App Secret",   field: "appSecret",  masked: true },
        ],
    },

    // ── SMS ──────────────────────────────────────────────────────────────────
    {
        key: "talksasa", name: "Talksasa SMS", category: "SMS", logo: "💬", color: "#2E7D32",
        description: "Send SMS and WhatsApp via Talksasa BulkSMS — fees, results, reminders.",
        docsUrl: "https://bulksms.talksasa.com",
        testEndpoint: "/integrations/test/talksasa",
        guide: [
            "Sign in at bulksms.talksasa.com and open Developers → API Documents",
            "Copy your API token (Bearer token)",
            "Register a Sender ID (alphanumeric, max 11 chars) for production",
            "Paste the token + Sender ID here and Test",
        ],
        fields: [
            { label: "API Token", field: "apiToken", masked: true, hint: "Bearer token from Talksasa Developers" },
            { label: "Sender ID", field: "senderId", masked: false, placeholder: "e.g. SCHOOLNAME", hint: "Alphanumeric, max 11 chars" },
        ],
    },
    {
        key: "africas_talking", name: "Africa's Talking", category: "SMS", logo: "📱", color: "#E63946",
        description: "Send SMS reminders, result alerts and bulk announcements.",
        docsUrl: "https://developers.africastalking.com",
        testEndpoint: "/integrations/test/at",
        guide: [
            "Register at africastalking.com",
            "Create an application and switch to sandbox for testing",
            "Copy your Username and API Key",
            "Register a Sender ID for production use",
        ],
        fields: [
            { label: "Username",    field: "username",    masked: false },
            { label: "API Key",     field: "apiKey",      masked: true },
            { label: "Sender ID",   field: "senderId",    masked: false, placeholder: "SCHOOL" },
            { label: "Environment", field: "environment", type: "select", options: ["sandbox", "production"] },
        ],
    },
    {
        key: "twilio", name: "Twilio SMS", category: "SMS", logo: "🔴", color: "#F22F46",
        description: "International SMS gateway — reliable delivery worldwide.",
        docsUrl: "https://www.twilio.com/docs",
        testEndpoint: "/integrations/test/twilio",
        guide: [
            "Sign up at twilio.com",
            "Note your Account SID and Auth Token from the console",
            "Get a Twilio phone number for SMS",
        ],
        fields: [
            { label: "Account SID", field: "accountSid", masked: false },
            { label: "Auth Token",  field: "authToken",  masked: true },
            { label: "From Number", field: "fromNumber", masked: false, placeholder: "+1234567890" },
        ],
    },
    {
        key: "infobip", name: "Infobip", category: "SMS", logo: "💬", color: "#FF4B4B",
        description: "Multi-channel messaging — SMS, WhatsApp, and Viber via Infobip.",
        docsUrl: "https://www.infobip.com/docs",
        guide: [
            "Register at infobip.com",
            "Copy your Base URL and API Key from the dashboard",
            "Register a Sender ID for SMS",
        ],
        fields: [
            { label: "Base URL",  field: "baseUrl",  masked: false, placeholder: "xxxxx.api.infobip.com" },
            { label: "API Key",   field: "apiKey",   masked: true },
            { label: "Sender ID", field: "senderId", masked: false },
        ],
    },

    // ── WhatsApp ─────────────────────────────────────────────────────────────
    {
        key: "whatsapp", name: "WhatsApp Business", category: "WhatsApp", logo: "💚", color: "#25D366",
        description: "Send fee receipts, results and alerts directly via WhatsApp.",
        docsUrl: "https://developers.facebook.com/docs/whatsapp",
        testEndpoint: "/integrations/test/whatsapp",
        webhook: "whatsapp/callback",
        guide: [
            "Set up a Meta Business account at business.facebook.com",
            "Create a WhatsApp Business app in the Meta Developer Portal",
            "Get your Phone Number ID and Permanent Access Token",
            "Register a webhook and add the verify token",
        ],
        fields: [
            { label: "Phone Number ID",       field: "phoneNumberId",  masked: false },
            { label: "Access Token",          field: "accessToken",    masked: true },
            { label: "Business Account ID",   field: "businessId",     masked: false },
            { label: "Webhook Verify Token",  field: "verifyToken",    masked: true, hint: "Any secret string you choose" },
        ],
    },

    // ── Email ────────────────────────────────────────────────────────────────
    {
        key: "sendgrid", name: "SendGrid", category: "Email", logo: "📧", color: "#1A82E2",
        description: "Reliable transactional and bulk email delivery.",
        docsUrl: "https://sendgrid.com/docs",
        testEndpoint: "/integrations/test/sendgrid",
        guide: [
            "Create an account at sendgrid.com",
            "Go to Settings → API Keys and create a key with Mail Send permission",
            "Verify your sender email address",
        ],
        fields: [
            { label: "API Key",    field: "apiKey",    masked: true },
            { label: "From Email", field: "fromEmail", masked: false, placeholder: "noreply@school.ac.ke" },
            { label: "From Name",  field: "fromName",  masked: false },
        ],
        testExtra: "email",
    },
    {
        key: "mailgun", name: "Mailgun", category: "Email", logo: "🔫", color: "#F06B26",
        description: "Developer-friendly transactional email via Mailgun.",
        docsUrl: "https://documentation.mailgun.com",
        guide: [
            "Sign up at mailgun.com",
            "Add and verify your sending domain",
            "Copy the API Key from your domain settings",
        ],
        fields: [
            { label: "API Key",    field: "apiKey",    masked: true },
            { label: "Domain",     field: "domain",    masked: false, placeholder: "mg.yourdomain.com" },
            { label: "From Email", field: "fromEmail", masked: false },
        ],
    },
    {
        key: "smtp", name: "Custom SMTP", category: "Email", logo: "✉️", color: "#64748b",
        description: "Use your own SMTP server — Gmail, Outlook, or any mail server.",
        docsUrl: "#",
        testEndpoint: "/integrations/test/smtp",
        guide: [
            "For Gmail: enable 2FA, then create an App Password",
            "For Outlook: use smtp.office365.com port 587",
            "Enter your SMTP host, port, username and password",
        ],
        fields: [
            { label: "SMTP Host",   field: "host",       masked: false, placeholder: "smtp.gmail.com" },
            { label: "Port",        field: "port",       masked: false, placeholder: "587" },
            { label: "Username",    field: "username",   masked: false },
            { label: "Password",    field: "password",   masked: true },
            { label: "From Email",  field: "fromEmail",  masked: false },
            { label: "Encryption",  field: "encryption", type: "select", options: ["TLS", "SSL", "None"] },
        ],
        testExtra: "email",
    },

    // ── Attendance ────────────────────────────────────────────────────────────
    {
        key: "biometric", name: "Biometric Devices", category: "Attendance", logo: "👆", color: "#0EA5E9",
        description: "Connect ZKTeco / biometric fingerprint devices for automatic attendance.",
        docsUrl: "https://www.zkteco.com",
        guide: [
            "Connect your ZKTeco device to the same local network",
            "Find the device IP from its Settings → Network menu",
            "Default port is 4370",
            "Install ZKTeco SDK on your server and provide the license key",
        ],
        fields: [
            { label: "Device IP",  field: "deviceIp",   masked: false, placeholder: "192.168.1.100" },
            { label: "Port",       field: "devicePort", masked: false, placeholder: "4370" },
            { label: "SDK License Key", field: "sdkKey",masked: true },
        ],
    },
];

const CATEGORIES = ["All", ...Array.from(new Set(INTEGRATIONS_CONFIG.map(i => i.category)))];

// Real brand marks via Simple Icons (open-source CC0 icon set, served from CDN).
// Maps our integration key → [simpleicons slug, brand hex]. Missing keys fall
// back to the emoji defined in the config.
export const BRAND_SLUG: Record<string, [string, string]> = {
    daraja: ["safaricom", "1AB248"],
    stripe: ["stripe", "635BFF"],
    flutterwave: ["flutterwave", "FF9B00"],
    google_classroom: ["googleclassroom", "0F9D58"],
    zoom: ["zoom", "0B5CFF"],
    microsoft_teams: ["microsoftteams", "6264A7"],
    jitsi: ["jitsi", "97979A"],
    africas_talking: ["africastalking", "F5333F"],
    twilio: ["twilio", "F22F46"],
    whatsapp: ["whatsapp", "25D366"],
    sendgrid: ["sendgrid", "1A82E2"],
    mailgun: ["mailgun", "F06B66"],
    smtp: ["maildotru", "168DE2"],
};

/** Renders a brand logo from Simple Icons, falling back to the emoji on error. */
export function BrandLogo({ intgKey, emoji, color }: { intgKey: string; emoji: string; color: string }) {
    const brand = BRAND_SLUG[intgKey];
    const [failed, setFailed] = useState(false);
    if (!brand || failed) return <span className="text-2xl">{emoji}</span>;
    const [slug, hex] = brand;
    return (
        <img
            src={`https://cdn.simpleicons.org/${slug}/${hex || color.replace("#", "")}`}
            alt=""
            className="w-6 h-6 object-contain"
            onError={() => setFailed(true)}
            loading="lazy"
        />
    );
}

export default function IntegrationsPage() {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState("All");
    const [search, setSearch] = useState("");

    const { data: allSettings = [] } = useQuery({
        queryKey: ["integration_settings"],
        queryFn: async () => { const r = await api.get("/integration_settings"); return Array.isArray(r.data) ? r.data : []; },
    });

    const settingsMap = useMemo(() => {
        const m: Record<string, any> = {};
        allSettings.forEach((s: any) => { if (s.integration) m[s.integration] = s; });
        return m;
    }, [allSettings]);

    const filtered = useMemo(() => {
        let list = INTEGRATIONS_CONFIG;
        if (activeCategory !== "All") list = list.filter(i => i.category === activeCategory);
        if (search.trim()) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()));
        return list;
    }, [activeCategory, search]);

    const grouped = useMemo(() => {
        const map: Record<string, typeof INTEGRATIONS_CONFIG> = {};
        filtered.forEach(i => { if (!map[i.category]) map[i.category] = []; map[i.category].push(i); });
        return map;
    }, [filtered]);

    const connectedCount = Object.values(settingsMap).filter((s: any) => s.enabled).length;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-2 shadow-sm sticky top-0 z-10">
                <Home className="w-4 h-4 text-[#5C67F2]" />
                <span className="text-gray-300">/</span>
                <span className="font-black text-[#5C67F2] text-sm">Integrations</span>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6">
                <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                            <Zap className="w-6 h-6 text-[#5C67F2]" /> Integrations
                        </h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                            {INTEGRATIONS_CONFIG.length} integrations · {connectedCount} connected
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-emerald-700">{connectedCount} Active</span>
                    </div>
                </div>

                {/* Search + filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search integrations…"
                        className="flex-1 h-10 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2] bg-white" />
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all flex-shrink-0 ${activeCategory === cat ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grouped grid */}
                {Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat} className="mb-8">
                        {activeCategory === "All" && (
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex-shrink-0">{cat}</span>
                                <div className="flex-1 border-b border-gray-100" />
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map(intg => {
                                const saved     = settingsMap[intg.key];
                                const isActive  = saved?.enabled || false;
                                const isConfig  = !!saved;
                                return (
                                    <button key={intg.key}
                                        onClick={() => navigate(`/integrations/${intg.key}`)}
                                        className={`bg-white rounded-2xl border-2 p-5 text-left hover:shadow-md transition-all group relative ${isActive ? "border-indigo-200 shadow-sm" : "border-gray-100 hover:border-gray-200"}`}>

                                        {/* Status badge */}
                                        {isActive && (
                                            <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase rounded-full border border-emerald-200">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> Active
                                            </span>
                                        )}
                                        {isConfig && !isActive && (
                                            <span className="absolute top-3 right-3 px-2 py-0.5 bg-gray-50 text-gray-400 text-[8px] font-black uppercase rounded-full border border-gray-200">
                                                Configured
                                            </span>
                                        )}

                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border bg-white"
                                                style={{ borderColor: `${intg.color}30` }}>
                                                <BrandLogo intgKey={intg.key} emoji={intg.logo} color={intg.color} />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <p className="font-black text-gray-900 text-sm leading-tight">{intg.name}</p>
                                                <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
                                                    style={{ backgroundColor: `${intg.color}15`, color: intg.color }}>
                                                    {intg.category}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-4 line-clamp-2">{intg.description}</p>

                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-400">
                                                {intg.fields.length} config fields
                                            </span>
                                            <div className="flex items-center gap-1 text-[#5C67F2] text-[10px] font-black group-hover:gap-2 transition-all">
                                                {isConfig ? <><Settings className="w-3.5 h-3.5" /> Configure</> : <><span>Set up</span><ChevronRight className="w-3.5 h-3.5" /></>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
