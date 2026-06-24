import { useState, useRef, useCallback } from "react";
import {
    Home, Plus, Trash2, Edit3, Loader2, AlertCircle,
    CheckCircle2, X, Save, Eye, EyeOff, Upload,
    Building2, Smartphone, CreditCard, Zap, ToggleLeft, ToggleRight,
    Copy, Check, ShieldCheck, Globe, Lock
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

// Module-level field component (stable identity → inputs keep focus while typing).
export interface FFFieldProps {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; required?: boolean; secret?: boolean;
    secretKey?: string; hint?: string; mono?: boolean; colSpan?: number;
    showKeys: Record<string, boolean>; toggleKey: (k: string) => void;
}
function FFField({ label, value, onChange, placeholder = "", required = false, secret = false, secretKey = "", hint = "", mono = false, colSpan = 1, showKeys, toggleKey }: FFFieldProps) {
    return (
        <div className={colSpan === 2 ? "col-span-2" : ""}>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {label}{required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <div className="relative">
                <input
                    type={secret && !showKeys[secretKey] ? "password" : "text"}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-200 transition-all ${secret ? "pr-10" : ""} ${mono ? "font-mono" : ""}`}
                />
                {secret && (
                    <button type="button" onClick={() => toggleKey(secretKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#5C67F2] transition-colors">
                        {showKeys[secretKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                )}
            </div>
            {hint && <p className="text-[10px] text-slate-300 font-medium mt-1.5 leading-relaxed">{hint}</p>}
        </div>
    );
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface BankAccount {
    _id: string;
    bankName: string;
    branchAddress: string;
    accountNumber: string;
    instructions: string;
    logo?: string;
}

interface PayheroConfig {
    apiKey: string;
    businessId: string;
    callbackUrl: string;
    username: string;
    password: string;
    channelId: string;
    isEnabled: boolean;
}

interface DarajaConfig {
    consumerKey: string;
    consumerSecret: string;
    shortcode: string;
    passkey: string;
    callbackUrl: string;
    accountReference: string;
    transactionDesc: string;
    environment: "sandbox" | "production";
    isEnabled: boolean;
}

interface StripeConfig {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    currency: string;
    statementDescriptor: string;
    isEnabled: boolean;
}

type GatewayTab = "bank" | "payhero" | "daraja" | "stripe";

// ─── Constants ────────────────────────────────────────────────────────────────
const GATEWAYS: {
    id: GatewayTab; label: string; icon: React.ReactNode;
    color: string; bg: string; desc: string; badge?: string;
}[] = [
        { id: "bank", label: "Bank Accounts", icon: <Building2 className="w-5 h-5" />, color: "#5C67F2", bg: "#eef0fe", desc: "Manual bank transfers" },
        { id: "payhero", label: "PayHero", icon: <Zap className="w-5 h-5" />, color: "#f59e0b", bg: "#fef3c7", desc: "Mobile money & cards", badge: "KE" },
        { id: "daraja", label: "M-Pesa Daraja", icon: <Smartphone className="w-5 h-5" />, color: "#10b981", bg: "#d1fae5", desc: "STK Push payments", badge: "KE" },
        { id: "stripe", label: "Stripe", icon: <CreditCard className="w-5 h-5" />, color: "#6366f1", bg: "#ede9fe", desc: "International cards", badge: "INTL" },
    ];

const CURRENCIES = ["KES", "USD", "GBP", "EUR", "ZAR", "UGX", "TZS", "RWF", "ETB", "NGN", "GHS"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={copy}
            className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 hover:bg-violet-200 text-violet-600 text-[9px] font-black uppercase tracking-wider transition-all"
        >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
        </button>
    );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${enabled ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-400 animate-pulse" : "bg-gray-300"}`} />
            {enabled ? "Live" : "Disabled"}
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AccountsForFeesInvoice() {
    const queryClient = useQueryClient();
    const [activeGateway, setActiveGateway] = useState<GatewayTab>("bank");

    // ── Bank state ────────────────────────────────────────────────────────────
    const [showBankForm, setShowBankForm] = useState(false);
    const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
    const [bankLogo, setBankLogo] = useState<string | null>(null);
    const [bankError, setBankError] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [bankForm, setBankForm] = useState({
        bankName: "", branchAddress: "", accountNumber: "", instructions: ""
    });
    const logoInputRef = useRef<HTMLInputElement>(null);

    // ── Secret key visibility ─────────────────────────────────────────────────
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const toggleKey = (k: string) => setShowKeys(p => ({ ...p, [k]: !p[k] }));

    // ── PayHero state ─────────────────────────────────────────────────────────
    const [payheroForm, setPayheroForm] = useState<PayheroConfig>({
        apiKey: "", businessId: "", callbackUrl: "",
        username: "", password: "", channelId: "",
        isEnabled: false,
    });

    // ── Daraja state ──────────────────────────────────────────────────────────
    const [darajaForm, setDarajaForm] = useState<DarajaConfig>({
        consumerKey: "", consumerSecret: "", shortcode: "", passkey: "",
        callbackUrl: "", accountReference: "", transactionDesc: "Fee Payment",
        environment: "sandbox", isEnabled: false,
    });

    // ── Stripe state ──────────────────────────────────────────────────────────
    const [stripeForm, setStripeForm] = useState<StripeConfig>({
        publishableKey: "", secretKey: "", webhookSecret: "",
        currency: "KES", statementDescriptor: "", isEnabled: false,
    });

    const [gatewayError, setGatewayError] = useState("");
    const [gatewaySuccess, setGatewaySuccess] = useState("");

    // ─── Queries ──────────────────────────────────────────────────────────────
    const { data: bankAccounts = [], isLoading: banksLoading } = useQuery<BankAccount[]>({
        queryKey: ["bank_accounts"],
        queryFn: async () => (await api.get("/settings/bank-accounts")).data,
    });

    useQuery<PayheroConfig>({
        queryKey: ["gateway_payhero"],
        queryFn: async () => {
            const r = await api.get("/settings/gateways/payhero");
            if (r.data) setPayheroForm(p => ({ ...p, ...r.data }));
            return r.data;
        },
    });

    useQuery<DarajaConfig>({
        queryKey: ["gateway_daraja"],
        queryFn: async () => {
            const r = await api.get("/settings/gateways/daraja");
            if (r.data) setDarajaForm(p => ({ ...p, ...r.data }));
            return r.data;
        },
    });

    useQuery<StripeConfig>({
        queryKey: ["gateway_stripe"],
        queryFn: async () => {
            const r = await api.get("/settings/gateways/stripe");
            if (r.data) setStripeForm(p => ({ ...p, ...r.data }));
            return r.data;
        },
    });

    // ─── Bank mutations ───────────────────────────────────────────────────────
    const createBank = useMutation({
        mutationFn: async (data: any) => (await api.post("/settings/bank-accounts", data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank_accounts"] }); resetBankForm(); },
        onError: () => setBankError("Failed to save bank account."),
    });

    const updateBank = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) =>
            (await api.patch(`/settings/bank-accounts/${id}`, data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank_accounts"] }); resetBankForm(); },
        onError: () => setBankError("Failed to update bank account."),
    });

    const deleteBank = useMutation({
        mutationFn: async (id: string) => { await api.delete(`/settings/bank-accounts/${id}`); },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank_accounts"] }); setDeleteConfirm(null); },
    });

    // ─── Gateway mutation ─────────────────────────────────────────────────────
    const saveGateway = useMutation({
        mutationFn: async ({ type, data }: { type: string; data: any }) =>
            (await api.post(`/settings/gateways/${type}`, data)).data,
        onSuccess: (_, { type }) => {
            queryClient.invalidateQueries({ queryKey: [`gateway_${type}`] });
            setGatewaySuccess("Gateway settings saved successfully!");
            setGatewayError("");
            setTimeout(() => setGatewaySuccess(""), 3500);
        },
        onError: () => { setGatewayError("Failed to save. Please check your credentials and try again."); setGatewaySuccess(""); },
    });

    // ─── Bank helpers ─────────────────────────────────────────────────────────
    const resetBankForm = () => {
        setBankForm({ bankName: "", branchAddress: "", accountNumber: "", instructions: "" });
        setBankLogo(null);
        setEditingBank(null);
        setShowBankForm(false);
        setBankError("");
    };

    const startEditBank = (b: BankAccount) => {
        setEditingBank(b);
        setBankForm({ bankName: b.bankName, branchAddress: b.branchAddress, accountNumber: b.accountNumber, instructions: b.instructions });
        setBankLogo(b.logo || null);
        setShowBankForm(true);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) { setBankError("Logo must be under 500KB."); return; }
        const reader = new FileReader();
        reader.onload = () => setBankLogo(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleBankSubmit = () => {
        setBankError("");
        if (!bankForm.bankName.trim()) { setBankError("Bank name is required."); return; }
        if (!bankForm.branchAddress.trim()) { setBankError("Branch address is required."); return; }
        if (!bankForm.accountNumber.trim()) { setBankError("Account number is required."); return; }
        const payload = { ...bankForm, logo: bankLogo };
        editingBank
            ? updateBank.mutate({ id: editingBank._id, data: payload })
            : createBank.mutate(payload);
    };

    // ─── Gateway save handlers ────────────────────────────────────────────────
    const handleSavePayhero = () => {
        setGatewayError("");
        if (!payheroForm.apiKey.trim()) { setGatewayError("API Key is required."); return; }
        if (!payheroForm.businessId.trim()) { setGatewayError("Business ID is required."); return; }
        if (!payheroForm.channelId.trim()) { setGatewayError("Channel ID is required."); return; }
        if (!payheroForm.username.trim()) { setGatewayError("Username is required."); return; }
        if (!payheroForm.password.trim()) { setGatewayError("Password is required."); return; }
        saveGateway.mutate({ type: "payhero", data: payheroForm });
    };

    const handleSaveDaraja = () => {
        setGatewayError("");
        const required: (keyof DarajaConfig)[] = ["consumerKey", "consumerSecret", "shortcode", "passkey", "callbackUrl", "accountReference"];
        for (const f of required) {
            if (!String(darajaForm[f]).trim()) {
                setGatewayError(`${f.replace(/([A-Z])/g, ' $1')} is required.`);
                return;
            }
        }
        saveGateway.mutate({ type: "daraja", data: darajaForm });
    };

    const handleSaveStripe = () => {
        setGatewayError("");
        if (!stripeForm.publishableKey.trim()) { setGatewayError("Publishable key is required."); return; }
        if (!stripeForm.secretKey.trim()) { setGatewayError("Secret key is required."); return; }
        if (!stripeForm.webhookSecret.trim()) { setGatewayError("Webhook secret is required."); return; }
        saveGateway.mutate({ type: "stripe", data: stripeForm });
    };

    const isSaving = saveGateway.isPending;

    // ─── Reusable sub-components ──────────────────────────────────────────────
    // Stable wrapper around the module-level FFField (defined outside this function
    // so its identity never changes — otherwise React remounts the <input> on every
    // keystroke and it loses focus). useCallback keeps the same reference across
    // renders; it only changes when showKeys actually changes.
    const Field = useCallback(
        (props: Omit<FFFieldProps, "showKeys" | "toggleKey">) =>
            <FFField {...props} showKeys={showKeys} toggleKey={toggleKey} />,
        [showKeys],
    );

    const Toggle = ({ label, desc, value, onChange }: {
        label: string; desc: string; value: boolean; onChange: (v: boolean) => void;
    }) => (
        <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${value ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-gray-50/50"
            }`} onClick={() => onChange(!value)}>
            <div>
                <p className={`text-sm font-black ${value ? "text-emerald-700" : "text-slate-500"}`}>{label}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{desc}</p>
            </div>
            {value
                ? <ToggleRight className="w-9 h-9 text-emerald-500 flex-shrink-0" />
                : <ToggleLeft className="w-9 h-9 text-slate-300   flex-shrink-0" />}
        </div>
    );

    const WebhookBox = ({ url, events = [] }: { url: string; events?: string[] }) => (
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 mb-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Your Webhook Endpoint</p>
            </div>
            <div className="flex items-center gap-2">
                <code className="text-xs font-bold text-slate-700 font-mono break-all flex-1">{url}</code>
                <CopyButton text={url} />
            </div>
            {events.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">Listen for:</span>
                    {events.map(e => (
                        <code key={e} className="text-[9px] px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono text-slate-500">{e}</code>
                    ))}
                </div>
            )}
        </div>
    );

    const GatewaySaveBar = ({ onSave }: { onSave: () => void }) => (
        <div className="flex flex-col gap-3 pt-2 border-t border-gray-50 mt-2">
            {gatewayError && (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-red-500">{gatewayError}</p>
                </div>
            )}
            {gatewaySuccess && (
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-xs font-bold text-emerald-600">{gatewaySuccess}</p>
                </div>
            )}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-slate-300 font-bold">
                    <Lock className="w-3 h-3" />
                    Credentials encrypted at rest with AES-256
                </div>
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="h-11 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-60 text-white font-black rounded-xl text-xs tracking-widest uppercase shadow-lg shadow-indigo-200 flex items-center gap-2.5 transition-all"
                >
                    {isSaving
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                        : <><Save className="w-3.5 h-3.5" /> Save Settings</>}
                </button>
            </div>
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto">

            {/* Top bar */}
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">General Settings</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Accounts & Payment Gateways</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">PCI Compliant Storage</span>
                </div>
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-5xl mx-auto">

                {/* Page heading */}
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Payment Configuration</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">
                        Configure bank accounts and online payment gateways. Enabled gateways appear on fee invoices.
                    </p>
                </div>

                {/* ── Gateway tab cards ── */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {GATEWAYS.map(g => (
                        <button
                            key={g.id}
                            onClick={() => { setActiveGateway(g.id); setGatewayError(""); setGatewaySuccess(""); }}
                            className={`relative flex flex-col gap-3 p-5 rounded-2xl border-2 text-left transition-all ${activeGateway === g.id
                                ? "border-[#5C67F2] bg-indigo-50 shadow-sm"
                                : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                                }`}
                        >
                            {g.badge && (
                                <span className="absolute top-3 right-3 text-[8px] font-black px-1.5 py-0.5 rounded-md"
                                    style={{ background: g.bg, color: g.color }}>
                                    {g.badge}
                                </span>
                            )}
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                                style={{
                                    background: activeGateway === g.id ? "#5C67F2" : g.bg,
                                    color: activeGateway === g.id ? "#fff" : g.color,
                                }}
                            >
                                {g.icon}
                            </div>
                            <div>
                                <p className={`text-xs font-black ${activeGateway === g.id ? "text-[#5C67F2]" : "text-slate-700"}`}>{g.label}</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">{g.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ════════════════════════════════════════════════
                    BANK ACCOUNTS
                ════════════════════════════════════════════════ */}
                {activeGateway === "bank" && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* Form */}
                        {showBankForm && (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800">
                                            {editingBank ? "Edit Bank Account" : "Add New Bank Account"}
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">Fields marked * are required.</p>
                                    </div>
                                    <button onClick={resetBankForm}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-slate-300 hover:text-slate-500 transition-all">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="px-8 py-6 space-y-6">
                                    {/* Logo */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Bank Logo</label>
                                        <div className="flex items-center gap-6">
                                            <div
                                                onClick={() => logoInputRef.current?.click()}
                                                className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-[#5C67F2] hover:bg-indigo-50 transition-all"
                                            >
                                                {bankLogo
                                                    ? <img src={bankLogo} alt="logo" className="w-full h-full object-contain p-1" />
                                                    : <Upload className="w-6 h-6 text-gray-300" />}
                                            </div>
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="h-9 px-5 bg-white border border-gray-200 hover:border-[#5C67F2] hover:bg-indigo-50 hover:text-[#5C67F2] text-slate-500 font-black rounded-xl text-xs tracking-widest uppercase transition-all flex items-center gap-2"
                                                >
                                                    <Upload className="w-3.5 h-3.5" /> Choose Logo
                                                </button>
                                                <p className="text-[10px] text-slate-300 font-medium">Max 500KB · PNG, JPG, SVG</p>
                                                {bankLogo && (
                                                    <button onClick={() => setBankLogo(null)}
                                                        className="text-[10px] font-bold text-red-400 hover:text-red-500">
                                                        Remove logo
                                                    </button>
                                                )}
                                            </div>
                                            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <Field label="Bank Name" required value={bankForm.bankName} onChange={v => setBankForm(f => ({ ...f, bankName: v }))} placeholder="e.g. KCB Bank" />
                                        <Field label="Bank / Branch Address" required value={bankForm.branchAddress} onChange={v => setBankForm(f => ({ ...f, branchAddress: v }))} placeholder="e.g. Utawala Branch" />
                                        <Field label="Account Number" required value={bankForm.accountNumber} onChange={v => setBankForm(f => ({ ...f, accountNumber: v }))} placeholder="e.g. 1234567890" mono />
                                        <Field label="Payment Instructions" value={bankForm.instructions} onChange={v => setBankForm(f => ({ ...f, instructions: v }))} placeholder="e.g. Use student name as reference" />
                                    </div>

                                    {bankError && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                            <p className="text-xs font-bold text-red-500">{bankError}</p>
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleBankSubmit}
                                            disabled={createBank.isPending || updateBank.isPending}
                                            className="h-11 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-60 text-white font-black rounded-xl text-xs tracking-widest uppercase shadow-lg shadow-indigo-200 flex items-center gap-2.5 transition-all"
                                        >
                                            {(createBank.isPending || updateBank.isPending)
                                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                                                : <><Save className="w-3.5 h-3.5" /> {editingBank ? "Update Account" : "Save Account"}</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* List */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800">Configured Bank Accounts</h3>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        {bankAccounts.length} account{bankAccounts.length !== 1 ? "s" : ""} · All appear on printed fee invoices
                                    </p>
                                </div>
                                {!showBankForm && (
                                    <button
                                        onClick={() => { resetBankForm(); setShowBankForm(true); }}
                                        className="h-9 px-5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-xl text-xs tracking-widest uppercase shadow-md shadow-indigo-200 flex items-center gap-2 transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Account
                                    </button>
                                )}
                            </div>

                            {banksLoading ? (
                                <div className="flex items-center justify-center py-16 gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" />
                                    <span className="text-sm font-bold text-slate-400">Loading…</span>
                                </div>
                            ) : bankAccounts.length === 0 ? (
                                <div className="flex flex-col items-center py-16 gap-4">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center">
                                        <Building2 className="w-8 h-8 text-[#5C67F2]" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black text-slate-700 text-sm">No bank accounts configured yet.</p>
                                        <p className="text-slate-400 text-xs font-medium mt-1">Add a bank account to include on printed fee invoices.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {bankAccounts.map((b: BankAccount) => (
                                        <div key={b._id}>
                                            <div className="px-8 py-5 flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                    {b.logo
                                                        ? <img src={b.logo} alt={b.bankName} className="w-full h-full object-contain p-1" />
                                                        : <Building2 className="w-7 h-7 text-slate-300" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-slate-800 text-sm">{b.bankName}</p>
                                                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                                                        {b.branchAddress}
                                                        <span className="mx-2 text-slate-200">·</span>
                                                        <span className="font-mono">{b.accountNumber}</span>
                                                    </p>
                                                    {b.instructions && (
                                                        <p className="text-[11px] text-slate-300 font-medium mt-0.5 truncate">{b.instructions}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button onClick={() => startEditBank(b)}
                                                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-[#5C67F2] hover:bg-indigo-50 hover:text-[#5C67F2] text-slate-300 transition-all">
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(b._id)}
                                                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 hover:text-red-400 text-slate-300 transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Inline delete confirm */}
                                            {deleteConfirm === b._id && (
                                                <div className="mx-8 mb-5 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="flex items-center gap-3">
                                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                        <p className="text-xs font-bold text-red-600">
                                                            Remove <span className="font-black">{b.bankName}</span>? It will no longer appear on invoices.
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setDeleteConfirm(null)}
                                                            className="h-8 px-4 text-xs font-bold text-slate-400 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => deleteBank.mutate(b._id)}
                                                            disabled={deleteBank.isPending}
                                                            className="h-8 px-4 text-xs font-black text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all flex items-center gap-1.5"
                                                        >
                                                            {deleteBank.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════
                    PAYHERO
                ════════════════════════════════════════════════ */}
                {activeGateway === "payhero" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                            {/* Header */}
                            <div className="px-8 py-5 border-b border-gray-50 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                                    <Zap className="w-6 h-6 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-black text-slate-800">PayHero Integration</h3>
                                        <StatusBadge enabled={payheroForm.isEnabled} />
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        Accept M-Pesa, Airtel Money, and card payments via PayHero.
                                    </p>
                                </div>
                                <a href="https://payhero.co.ke" target="_blank" rel="noreferrer"
                                    className="text-[10px] font-black text-amber-500 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider">
                                    Dashboard ↗
                                </a>
                            </div>

                            <div className="px-8 py-6 space-y-5">

                                <Toggle
                                    label="Enable PayHero Gateway"
                                    desc="Parents can pay fees via PayHero on digital invoices"
                                    value={payheroForm.isEnabled}
                                    onChange={v => setPayheroForm(f => ({ ...f, isEnabled: v }))}
                                />

                                {/* Setup guide */}
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-2">Setup Steps</p>
                                    <ol className="text-[11px] text-amber-700 font-medium space-y-1 list-decimal list-inside">
                                        <li>Log in to your PayHero merchant dashboard at payhero.co.ke</li>
                                        <li>Go to <strong>Settings → API Keys</strong> and copy your API key</li>
                                        <li>Find your <strong>Business ID</strong> on the dashboard home</li>
                                        <li>Get your <strong>Channel ID</strong> from <strong>Settings → Channels</strong></li>
                                        <li>Paste your webhook URL below into <strong>Settings → Webhooks</strong></li>
                                    </ol>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <Field
                                        label="API Key" required secret secretKey="ph_api" mono
                                        value={payheroForm.apiKey}
                                        onChange={v => setPayheroForm(f => ({ ...f, apiKey: v }))}
                                        placeholder="ph_live_xxxxxxxxxxxxxxxx"
                                        hint="Dashboard → Settings → API Keys"
                                    />
                                    <Field
                                        label="Business ID" required
                                        value={payheroForm.businessId}
                                        onChange={v => setPayheroForm(f => ({ ...f, businessId: v }))}
                                        placeholder="e.g. BUS-123456"
                                        hint="Shown on your PayHero dashboard home"
                                    />
                                    <Field
                                        label="Channel ID" required
                                        value={payheroForm.channelId}
                                        onChange={v => setPayheroForm(f => ({ ...f, channelId: v }))}
                                        placeholder="e.g. 1234"
                                        hint="Dashboard → Settings → Channels → your channel ID"
                                    />
                                    <Field
                                        label="Username" required
                                        value={payheroForm.username}
                                        onChange={v => setPayheroForm(f => ({ ...f, username: v }))}
                                        placeholder="Your PayHero username"
                                        hint="Used for Basic Auth on API calls"
                                    />
                                    <Field
                                        label="Password" required secret secretKey="ph_pw"
                                        value={payheroForm.password}
                                        onChange={v => setPayheroForm(f => ({ ...f, password: v }))}
                                        placeholder="Your PayHero password"
                                        hint="Used for Basic Auth on API calls"
                                    />
                                    <Field
                                        label="Callback / Webhook URL" required colSpan={2}
                                        value={payheroForm.callbackUrl}
                                        onChange={v => setPayheroForm(f => ({ ...f, callbackUrl: v }))}
                                        placeholder="https://yourschool.shulecloud.com/webhooks/payhero"
                                        hint="PayHero POSTs payment results here — must be publicly accessible"
                                    />
                                </div>

                                <WebhookBox
                                    url="https://yourschool.shulecloud.com/webhooks/payhero"
                                    events={["payment.success", "payment.failed", "payment.pending"]}
                                />

                                <GatewaySaveBar onSave={handleSavePayhero} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════
                    M-PESA DARAJA
                ════════════════════════════════════════════════ */}
                {activeGateway === "daraja" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                            {/* Header */}
                            <div className="px-8 py-5 border-b border-gray-50 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                    <Smartphone className="w-6 h-6 text-emerald-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-black text-slate-800">M-Pesa Daraja (STK Push)</h3>
                                        <StatusBadge enabled={darajaForm.isEnabled} />
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        Safaricom STK Push — parents pay directly from their M-Pesa.
                                    </p>
                                </div>
                                <a href="https://developer.safaricom.co.ke" target="_blank" rel="noreferrer"
                                    className="text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider">
                                    Daraja Portal ↗
                                </a>
                            </div>

                            <div className="px-8 py-6 space-y-5">

                                <Toggle
                                    label="Enable M-Pesa STK Push"
                                    desc="Send automatic payment prompts to parents' M-Pesa phones"
                                    value={darajaForm.isEnabled}
                                    onChange={v => setDarajaForm(f => ({ ...f, isEnabled: v }))}
                                />

                                {/* Environment switcher */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Environment</label>
                                    <div className="flex gap-3">
                                        {(["sandbox", "production"] as const).map(env => (
                                            <button
                                                key={env}
                                                onClick={() => setDarajaForm(f => ({ ...f, environment: env }))}
                                                className={`flex-1 h-12 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all ${darajaForm.environment === env
                                                    ? env === "production"
                                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                                        : "border-amber-300 bg-amber-50 text-amber-700"
                                                    : "border-gray-100 text-slate-300 hover:border-gray-200"
                                                    }`}
                                            >
                                                {env === "sandbox" ? "🧪 Sandbox — Testing" : "🚀 Production — Live"}
                                            </button>
                                        ))}
                                    </div>
                                    {darajaForm.environment === "sandbox" && (
                                        <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                            <p className="text-[11px] text-amber-600 font-bold">
                                                ⚠ Sandbox mode is active — no real money moves. Use test credentials from the Daraja portal. Switch to Production when you go live.
                                            </p>
                                        </div>
                                    )}
                                    {darajaForm.environment === "production" && (
                                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                            <p className="text-[11px] text-emerald-700 font-bold">
                                                🚀 Production mode — real transactions will be processed. Ensure your credentials are correct.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Setup guide */}
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-2">Setup Steps</p>
                                    <ol className="text-[11px] text-emerald-700 font-medium space-y-1 list-decimal list-inside">
                                        <li>Create an app at <strong>developer.safaricom.co.ke</strong></li>
                                        <li>Enable <strong>Lipa Na M-Pesa Online</strong> on the app</li>
                                        <li>Copy the Consumer Key and Secret from the app credentials tab</li>
                                        <li>Get your Passkey from the <strong>Lipa na M-Pesa</strong> section</li>
                                        <li>Register your callback URL via the Daraja API or portal</li>
                                    </ol>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <Field
                                        label="Consumer Key" required secret secretKey="drj_ck" mono
                                        value={darajaForm.consumerKey}
                                        onChange={v => setDarajaForm(f => ({ ...f, consumerKey: v }))}
                                        placeholder="App consumer key from Daraja"
                                        hint="App credentials tab on Daraja portal"
                                    />
                                    <Field
                                        label="Consumer Secret" required secret secretKey="drj_cs" mono
                                        value={darajaForm.consumerSecret}
                                        onChange={v => setDarajaForm(f => ({ ...f, consumerSecret: v }))}
                                        placeholder="App consumer secret from Daraja"
                                        hint="App credentials tab on Daraja portal"
                                    />
                                    <Field
                                        label="Shortcode (Paybill / Till)" required
                                        value={darajaForm.shortcode}
                                        onChange={v => setDarajaForm(f => ({ ...f, shortcode: v }))}
                                        placeholder="e.g. 174379"
                                        hint="Your M-Pesa paybill or till number"
                                    />
                                    <Field
                                        label="Lipa Na M-Pesa Passkey" required secret secretKey="drj_pk" mono
                                        value={darajaForm.passkey}
                                        onChange={v => setDarajaForm(f => ({ ...f, passkey: v }))}
                                        placeholder="bfb279f9aa9bdbcf158a9564dd…"
                                        hint="Daraja portal → your app → Lipa Na M-Pesa"
                                    />
                                    <Field
                                        label="Account Reference" required
                                        value={darajaForm.accountReference}
                                        onChange={v => setDarajaForm(f => ({ ...f, accountReference: v }))}
                                        placeholder="e.g. SchoolFees"
                                        hint="Appears on parent's M-Pesa confirmation SMS"
                                    />
                                    <Field
                                        label="Transaction Description"
                                        value={darajaForm.transactionDesc}
                                        onChange={v => setDarajaForm(f => ({ ...f, transactionDesc: v }))}
                                        placeholder="e.g. Fee Payment"
                                        hint="Short description sent with the STK push"
                                    />
                                    <Field
                                        label="Callback URL" required colSpan={2}
                                        value={darajaForm.callbackUrl}
                                        onChange={v => setDarajaForm(f => ({ ...f, callbackUrl: v }))}
                                        placeholder="https://yourschool.shulecloud.com/webhooks/mpesa"
                                        hint="Safaricom POSTs STK push results here — must be HTTPS and publicly accessible"
                                    />
                                </div>

                                <WebhookBox
                                    url="https://yourschool.shulecloud.com/webhooks/mpesa"
                                    events={["ResultCode: 0 (success)", "ResultCode: 1 (failed)", "ResultCode: 1032 (cancelled)"]}
                                />

                                <GatewaySaveBar onSave={handleSaveDaraja} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════
                    STRIPE
                ════════════════════════════════════════════════ */}
                {activeGateway === "stripe" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                            {/* Header */}
                            <div className="px-8 py-5 border-b border-gray-50 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                                    <CreditCard className="w-6 h-6 text-violet-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-black text-slate-800">Stripe Payments</h3>
                                        <StatusBadge enabled={stripeForm.isEnabled} />
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        Credit/debit card payments for international parents. Visa, Mastercard, Amex.
                                    </p>
                                </div>
                                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer"
                                    className="text-[10px] font-black text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider">
                                    Dashboard ↗
                                </a>
                            </div>

                            <div className="px-8 py-6 space-y-5">

                                <Toggle
                                    label="Enable Stripe Payments"
                                    desc="Accept international card payments on digital fee invoices"
                                    value={stripeForm.isEnabled}
                                    onChange={v => setStripeForm(f => ({ ...f, isEnabled: v }))}
                                />

                                {/* Setup guide */}
                                <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl">
                                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-2">Setup Steps</p>
                                    <ol className="text-[11px] text-violet-700 font-medium space-y-1 list-decimal list-inside">
                                        <li>Log in to <strong>dashboard.stripe.com</strong> and complete account verification</li>
                                        <li>Go to <strong>Developers → API Keys</strong> and copy both keys</li>
                                        <li>Go to <strong>Developers → Webhooks → Add endpoint</strong></li>
                                        <li>Paste the webhook URL below and select the events listed</li>
                                        <li>Copy the <strong>Signing secret</strong> shown after creating the webhook</li>
                                    </ol>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <Field
                                        label="Publishable Key" required mono
                                        value={stripeForm.publishableKey}
                                        onChange={v => setStripeForm(f => ({ ...f, publishableKey: v }))}
                                        placeholder="pk_live_xxxxxxxxxxxxxxxx"
                                        hint="Safe to expose — used in the browser payment form"
                                    />
                                    <Field
                                        label="Secret Key" required secret secretKey="stripe_sk" mono
                                        value={stripeForm.secretKey}
                                        onChange={v => setStripeForm(f => ({ ...f, secretKey: v }))}
                                        placeholder="sk_live_xxxxxxxxxxxxxxxx"
                                        hint="Server-only — stored encrypted, never sent to browser"
                                    />
                                    <Field
                                        label="Webhook Signing Secret" required secret secretKey="stripe_wh" mono
                                        value={stripeForm.webhookSecret}
                                        onChange={v => setStripeForm(f => ({ ...f, webhookSecret: v }))}
                                        placeholder="whsec_xxxxxxxxxxxxxxxx"
                                        hint="Dashboard → Webhooks → your endpoint → Signing secret"
                                    />
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                            Charge Currency <span className="text-red-400">*</span>
                                        </label>
                                        <select
                                            value={stripeForm.currency}
                                            onChange={e => setStripeForm(f => ({ ...f, currency: e.target.value }))}
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] appearance-none"
                                        >
                                            {CURRENCIES.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-300 font-medium mt-1.5">Currency used when charging parent cards</p>
                                    </div>
                                    <Field
                                        label="Statement Descriptor" colSpan={2}
                                        value={stripeForm.statementDescriptor}
                                        onChange={v => setStripeForm(f => ({ ...f, statementDescriptor: v.slice(0, 22) }))}
                                        placeholder="e.g. SHULECLOUD FEES"
                                        hint={`Appears on the parent's bank statement (max 22 chars) · ${stripeForm.statementDescriptor.length}/22`}
                                    />
                                </div>

                                <WebhookBox
                                    url="https://yourschool.shulecloud.com/webhooks/stripe"
                                    events={[
                                        "payment_intent.succeeded",
                                        "payment_intent.payment_failed",
                                        "charge.refunded",
                                        "invoice.payment_succeeded"
                                    ]}
                                />

                                {/* Test mode note */}
                                {stripeForm.publishableKey.startsWith("pk_test") && (
                                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                        <p className="text-[11px] text-amber-600 font-bold">
                                            🧪 Test mode detected (pk_test_ key). Use Stripe test card <code className="font-mono">4242 4242 4242 4242</code> to verify your integration before switching to live keys.
                                        </p>
                                    </div>
                                )}

                                <GatewaySaveBar onSave={handleSaveStripe} />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}