import { useState, useEffect } from "react";
import {
    ArrowLeft, Check, Loader2, ExternalLink, RefreshCw, CheckCircle2,
    XCircle, AlertCircle, Eye, EyeOff, Copy, ChevronRight, Settings,
    Zap, BookOpen, Info, TestTube
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { INTEGRATIONS_CONFIG } from "./IntegrationsPage";

export default function IntegrationDetail() {
    const { key } = useParams<{ key: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const intg = INTEGRATIONS_CONFIG.find(i => i.key === key);

    const [config, setConfig]         = useState<Record<string, string>>({});
    const [enabled, setEnabled]       = useState(false);
    const [dirty, setDirty]           = useState(false);
    const [saving, setSaving]         = useState(false);
    const [testing, setTesting]       = useState(false);
    const [settingsId, setSettingsId] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showMasked, setShowMasked] = useState<Record<string, boolean>>({});
    const [testPhone, setTestPhone]   = useState("");
    const [testEmail, setTestEmail]   = useState("");
    const [activeTab, setActiveTab]   = useState<"config" | "guide" | "webhook">("config");
    const [loaded, setLoaded]         = useState(false);

    // ── Load saved settings ────────────────────────────────────────────────
    const { data: allSettings = [] } = useQuery({
        queryKey: ["integration_settings"],
        queryFn: async () => { const r = await api.get("/integration_settings"); return Array.isArray(r.data) ? r.data : []; },
    });

    useEffect(() => {
        if (!allSettings.length || loaded) return;
        const saved = allSettings.find((s: any) => s.integration === key);
        if (saved) {
            setLoaded(true);
            setSettingsId(saved._id);
            setEnabled(saved.enabled || false);
            const { _id, integration, enabled: _e, updatedAt, createdAt, ...rest } = saved;
            setConfig(rest);
        }
    }, [allSettings, key, loaded]);

    if (!intg) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <p className="text-xl font-black text-gray-800">Integration not found</p>
                <button onClick={() => navigate("/integrations")} className="mt-4 text-[#5C67F2] font-bold text-sm hover:underline">← Back to Integrations</button>
            </div>
        </div>
    );

    const updateField = (field: string, value: string) => {
        setConfig(p => ({ ...p, [field]: value }));
        setDirty(true);
        setTestResult(null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { integration: intg.key, enabled, ...config, updatedAt: new Date().toISOString() };
            if (settingsId) {
                await api.patch(`/integration_settings/${settingsId}`, payload);
            } else {
                const r = await api.post("/integration_settings", payload);
                setSettingsId(r.data?.id || r.data?._id);
            }
            toast.success(`${intg.name} settings saved successfully`);
            qc.invalidateQueries({ queryKey: ["integration_settings"] });
            setDirty(false);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        const endpoint = (intg as any).testEndpoint;
        if (!endpoint) { toast.error("No test endpoint for this integration"); return; }
        setTesting(true);
        setTestResult(null);
        try {
            const payload: any = { ...config, integration: intg.key };
            if (["africas_talking","twilio","infobip"].includes(intg.key) && testPhone) payload.testPhone = testPhone;
            if (["sendgrid","mailgun","smtp"].includes(intg.key) && testEmail) payload.testEmail = testEmail;
            const r = await api.post(endpoint, payload);
            setTestResult({ success: true, message: r.data?.message || "Connection successful!" });
            toast.success("Connection test passed!");
        } catch (e: any) {
            const msg = e.response?.data?.message || "Connection test failed";
            setTestResult({ success: false, message: msg });
            toast.error(msg);
        } finally {
            setTesting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
    };

    const webhookBase = `${window.location.protocol}//${window.location.host}/api/v1`;
    const webhookUrl  = (intg as any).webhook ? `${webhookBase}/${(intg as any).webhook}` : null;
    const hasTest     = !!(intg as any).testEndpoint;
    const needsPhone  = ["africas_talking","twilio","infobip"].includes(intg.key);
    const needsEmail  = ["sendgrid","mailgun","smtp"].includes(intg.key);

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-16 font-sans">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => navigate("/integrations")} className="text-gray-400 hover:text-[#5C67F2] transition-colors flex-shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 text-sm cursor-pointer hover:text-[#5C67F2] hidden sm:block" onClick={() => navigate("/integrations")}>Integrations</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 hidden sm:block" />
                    <span className="font-black text-[#5C67F2] text-sm truncate">{intg.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {enabled && <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase rounded-full"><CheckCircle2 className="w-3 h-3" /> Active</span>}
                    <button onClick={handleSave} disabled={saving || !dirty}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${dirty ? "bg-[#5C67F2] hover:bg-[#4a54c4] text-white shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {dirty ? "Save" : "Saved"}
                    </button>
                </div>
            </div>

            {/* ── Integration hero ───────────────────────────────────── */}
            <div className="px-4 sm:px-8 py-6" style={{ background: `linear-gradient(135deg, ${intg.color}08 0%, transparent 70%)` }}>
                <div className="max-w-4xl mx-auto flex items-start gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border-2"
                        style={{ backgroundColor: `${intg.color}15`, borderColor: `${intg.color}30` }}>
                        {intg.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900">{intg.name}</h1>
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: `${intg.color}20`, color: intg.color }}>
                                {intg.category}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mt-1">{intg.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                            {(intg as any).docsUrl && (intg as any).docsUrl !== "#" && (
                                <a href={(intg as any).docsUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#5C67F2] transition-colors">
                                    <ExternalLink className="w-3.5 h-3.5" /> Documentation
                                </a>
                            )}
                            {/* Enable/disable toggle */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className={`relative w-10 h-6 rounded-full transition-colors ${enabled ? "bg-[#5C67F2]" : "bg-gray-200"}`}
                                    onClick={() => { setEnabled(v => !v); setDirty(true); }}>
                                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? "right-0.5" : "left-0.5"}`} />
                                </div>
                                <span className="text-sm font-bold text-gray-600">{enabled ? "Enabled" : "Disabled"}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tabs ────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 px-4 sm:px-8">
                <div className="max-w-4xl mx-auto flex gap-1">
                    {[
                        { id: "config",  label: "Configuration", icon: Settings },
                        { id: "guide",   label: "Setup Guide",   icon: BookOpen },
                        ...(webhookUrl ? [{ id: "webhook", label: "Webhook",  icon: Zap }] : []),
                    ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wide border-b-2 transition-all -mb-px ${activeTab === t.id ? "border-[#5C67F2] text-[#5C67F2]" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                            <t.icon className="w-3.5 h-3.5" /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-6 space-y-5">

                {/* ── CONFIG TAB ──────────────────────────────────────── */}
                {activeTab === "config" && (
                    <div className="space-y-5">
                        {/* Fields */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                            <h2 className="text-sm font-black text-gray-800 mb-5">API Configuration</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {intg.fields.map((f: any) => (
                                    <div key={f.field} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{f.label}</label>
                                            {f.hint && (
                                                <span className="text-[9px] text-gray-400 font-medium flex items-center gap-0.5">
                                                    <Info className="w-2.5 h-2.5" /> {f.hint}
                                                </span>
                                            )}
                                        </div>
                                        {f.type === "select" ? (
                                            <select value={config[f.field] || ""}
                                                onChange={e => updateField(f.field, e.target.value)}
                                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2] transition-colors">
                                                <option value="">— Select —</option>
                                                {f.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type={f.masked && !showMasked[f.field] ? "password" : "text"}
                                                    value={config[f.field] || ""}
                                                    onChange={e => updateField(f.field, e.target.value)}
                                                    placeholder={f.placeholder || ""}
                                                    className="w-full h-11 px-4 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2] transition-colors"
                                                />
                                                {f.masked && (
                                                    <button type="button"
                                                        onClick={() => setShowMasked(p => ({ ...p, [f.field]: !p[f.field] }))}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                        {showMasked[f.field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Test Connection */}
                        {hasTest && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                <h2 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                                    <TestTube className="w-4 h-4 text-[#5C67F2]" /> Test Connection
                                </h2>

                                {/* Extra test inputs */}
                                {needsPhone && (
                                    <div className="mb-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Test Phone Number (optional)</label>
                                        <input type="tel" value={testPhone} onChange={e => setTestPhone(e.target.value)}
                                            placeholder="+254712345678"
                                            className="w-full sm:w-64 h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2]" />
                                        <p className="text-[9px] text-gray-400 mt-1 font-medium">A test SMS will be sent to this number</p>
                                    </div>
                                )}
                                {needsEmail && (
                                    <div className="mb-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Test Email Address</label>
                                        <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                                            placeholder="test@example.com"
                                            className="w-full sm:w-64 h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2]" />
                                        <p className="text-[9px] text-gray-400 mt-1 font-medium">A test email will be sent here</p>
                                    </div>
                                )}

                                {/* Test result */}
                                {testResult && (
                                    <div className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${testResult.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                                        {testResult.success
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                            : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                                        <div>
                                            <p className={`text-sm font-black ${testResult.success ? "text-emerald-700" : "text-red-700"}`}>
                                                {testResult.success ? "Test Passed!" : "Test Failed"}
                                            </p>
                                            <p className={`text-xs font-medium mt-0.5 ${testResult.success ? "text-emerald-600" : "text-red-600"}`}>
                                                {testResult.message}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleTest} disabled={testing}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-bold text-sm rounded-xl transition-all shadow-sm disabled:opacity-50">
                                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    {testing ? "Testing…" : `Test ${intg.name} Connection`}
                                </button>
                            </div>
                        )}

                        {/* Danger zone */}
                        {settingsId && (
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                                <h3 className="text-sm font-black text-red-700 mb-2">Disconnect Integration</h3>
                                <p className="text-xs text-red-600 font-medium mb-3">
                                    This will disable {intg.name} and clear all saved credentials. This action cannot be undone.
                                </p>
                                <button onClick={async () => {
                                    if (!confirm(`Disconnect ${intg.name}? All credentials will be cleared.`)) return;
                                    try {
                                        await api.patch(`/integration_settings/${settingsId}`, { enabled: false, integration: intg.key });
                                        setEnabled(false); setConfig({}); setDirty(false);
                                        qc.invalidateQueries({ queryKey: ["integration_settings"] });
                                        toast.success(`${intg.name} disconnected`);
                                        navigate("/integrations");
                                    } catch { toast.error("Failed to disconnect"); }
                                }} className="px-4 py-2 text-xs font-black uppercase text-red-600 border border-red-300 rounded-xl hover:bg-red-100 transition-all">
                                    Disconnect {intg.name}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── SETUP GUIDE TAB ─────────────────────────────────── */}
                {activeTab === "guide" && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                        <h2 className="text-sm font-black text-gray-800 mb-5 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#5C67F2]" /> How to Set Up {intg.name}
                        </h2>
                        <div className="space-y-4">
                            {((intg as any).guide || []).map((step: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: intg.color }}>
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 leading-relaxed pt-0.5">{step}</p>
                                </div>
                            ))}
                        </div>
                        {(intg as any).docsUrl && (intg as any).docsUrl !== "#" && (
                            <div className="mt-6 pt-5 border-t border-gray-100">
                                <a href={(intg as any).docsUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-all w-fit">
                                    <ExternalLink className="w-4 h-4 text-[#5C67F2]" />
                                    View Full Documentation → {intg.name}
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* ── WEBHOOK TAB ─────────────────────────────────────── */}
                {activeTab === "webhook" && webhookUrl && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                            <h2 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-[#5C67F2]" /> Your Callback / Webhook URL
                            </h2>
                            <p className="text-xs text-gray-500 font-medium mb-4">
                                Paste this URL in your {intg.name} dashboard to receive payment confirmations and event notifications.
                            </p>
                            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                <code className="flex-1 text-sm font-mono text-[#5C67F2] break-all">{webhookUrl}</code>
                                <button onClick={() => copyToClipboard(webhookUrl)}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#5C67F2] text-white text-[10px] font-black uppercase rounded-lg hover:bg-[#4a54c4] transition-all">
                                    <Copy className="w-3 h-3" /> Copy
                                </button>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-black text-amber-800 mb-1">Important</p>
                                    <ul className="space-y-1 text-xs text-amber-700 font-medium list-disc list-inside">
                                        <li>Make sure your server is publicly accessible (not localhost) for webhooks to work in production</li>
                                        <li>Use the same URL in both the {intg.name} dashboard and the Callback URL field above</li>
                                        <li>Test with sandbox/test mode before switching to live payments</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Events */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                            <h3 className="text-sm font-black text-gray-800 mb-4">Events Handled</h3>
                            <div className="space-y-2">
                                {[
                                    { event: "payment.success",    desc: "Automatically marks invoice as paid in ShuleCloud" },
                                    { event: "payment.failed",     desc: "Records failed attempt — no invoice update" },
                                    { event: "payment.pending",    desc: "Marks invoice as partially paid (if partial)" },
                                ].map(e => (
                                    <div key={e.event} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                                        <code className="text-[10px] font-mono bg-indigo-50 text-[#5C67F2] px-2 py-1 rounded-lg flex-shrink-0 mt-0.5">{e.event}</code>
                                        <p className="text-xs text-gray-500 font-medium">{e.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Sticky save bar ──────────────────────────────────────── */}
            {dirty && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
                    <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-sm font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Unsaved changes
                        <button onClick={handleSave} disabled={saving}
                            className="ml-2 px-4 py-1.5 bg-[#5C67F2] hover:bg-[#4a54c4] rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center gap-1.5 disabled:opacity-50">
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save Now
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
