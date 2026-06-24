import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Smartphone, Plug, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function MpesaIntegration() {
    const qc = useQueryClient();
    const [form, setForm] = useState<any>({ env: "sandbox", txType: "CustomerPayBillOnline", enabled: true });

    const { data: settings, isLoading } = useQuery({
        queryKey: ["mpesa_settings"],
        queryFn: async () => (await api.get("/integrations/mpesa/settings")).data,
    });

    useEffect(() => {
        if (settings) setForm((f: any) => ({
            ...f, env: settings.env, txType: settings.txType, enabled: settings.enabled,
            shortcode: settings.shortcode, tillNumber: settings.tillNumber, initiator: settings.initiator,
        }));
    }, [settings]);

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

    const save = useMutation({
        mutationFn: async () => {
            // Only send secrets the user actually typed (leave existing ones intact).
            const payload: any = { env: form.env, txType: form.txType, enabled: form.enabled, shortcode: form.shortcode, tillNumber: form.tillNumber || "", initiator: form.initiator };
            ["consumerKey", "consumerSecret", "passkey", "securityCredential"].forEach(k => { if (form[k]) payload[k] = form[k]; });
            return api.put("/integrations/mpesa/settings", payload);
        },
        onSuccess: () => { toast.success("M-PESA settings saved"); qc.invalidateQueries({ queryKey: ["mpesa_settings"] }); setForm((f: any) => ({ ...f, consumerKey: "", consumerSecret: "", passkey: "", securityCredential: "" })); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });

    const test = useMutation({
        mutationFn: async () => (await api.post("/integrations/mpesa/test", {})).data,
        onSuccess: (d: any) => toast.success(d.message || "Connected"),
        onError: (e: any) => toast.error(e.response?.data?.message || "Connection failed"),
    });

    const register = useMutation({
        mutationFn: async () => (await api.post("/integrations/mpesa/register-urls", {})).data,
        onSuccess: () => { toast.success("C2B URLs registered with Safaricom"); qc.invalidateQueries({ queryKey: ["mpesa_settings"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Registration failed"),
    });

    if (isLoading) return <div className="flex-1 flex items-center justify-center min-h-screen bg-[#f8fafc]"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>;

    const secretField = (k: string, label: string, isSet: boolean, ph = "") => (
        <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{label} {isSet && <span className="text-emerald-600 font-normal">· set</span>}</label>
            <input type="password" value={form[k] || ""} onChange={e => set(k, e.target.value)} placeholder={isSet ? "•••••••• (leave blank to keep)" : ph}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
        </div>
    );

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen pb-16">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-wrap items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center"><Smartphone className="w-5 h-5 text-green-600" /></div>
                <div className="flex-1">
                    <h1 className="text-lg font-black text-slate-800">M-PESA (Daraja) Integration</h1>
                    <p className="text-xs text-slate-400">Use your school's own Safaricom Daraja credentials</p>
                </div>
                {settings?.configured ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Configured</span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700"><AlertTriangle className="w-3.5 h-3.5" /> Not configured</span>
                )}
                <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#5C67F2] text-white text-xs font-black disabled:opacity-50">
                    {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </button>
            </div>

            <div className="px-6 mt-5 space-y-5 max-w-3xl">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                    Get your <strong>Consumer Key</strong>, <strong>Consumer Secret</strong> and <strong>Passkey</strong> from the Safaricom Daraja portal (My Apps). Use <strong>Sandbox</strong> for testing, then switch to <strong>Production</strong> with your live Paybill/Till credentials.
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                        <h2 className="text-sm font-black text-slate-700">Credentials</h2>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            Enabled
                            <button onClick={() => set("enabled", !form.enabled)} className={`relative w-11 h-6 rounded-full ${form.enabled ? "bg-green-500" : "bg-slate-300"}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.enabled ? "translate-x-5" : ""}`} />
                            </button>
                        </label>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Environment</label>
                            <select value={form.env} onChange={e => set("env", e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white">
                                <option value="sandbox">Sandbox (testing)</option>
                                <option value="production">Production (live)</option>
                            </select>
                            {form.env === "sandbox" && (
                                <p className="text-[11px] text-amber-600 font-semibold mt-1.5 leading-snug">
                                    ⚠️ Sandbox never sends a real prompt to a normal phone. It only works with Safaricom's test number <b>254708374149</b>. To receive prompts on real phones, switch to <b>Production</b> with your live Paybill/Till credentials.
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Transaction Type</label>
                            <select value={form.txType} onChange={e => set("txType", e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white">
                                <option value="CustomerPayBillOnline">Paybill (CustomerPayBillOnline)</option>
                                <option value="CustomerBuyGoodsOnline">Till / Buy Goods (CustomerBuyGoodsOnline)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                {form.txType === "CustomerBuyGoodsOnline" ? "Head Office / Store Number" : "Business Shortcode (Paybill)"}
                            </label>
                            <input value={form.shortcode || ""} onChange={e => set("shortcode", e.target.value)} placeholder="e.g. 174379" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm" />
                            {form.txType === "CustomerBuyGoodsOnline" && (
                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">For a Till, this is your <b>Head Office / Store number</b> (used to sign the request), not the till customers pay to.</p>
                            )}
                        </div>
                        {form.txType === "CustomerBuyGoodsOnline" && (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Till Number</label>
                                <input value={form.tillNumber || ""} onChange={e => set("tillNumber", e.target.value)} placeholder="e.g. 5678901" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm" />
                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">The actual <b>Till number</b> customers pay to (PartyB). Leave blank only if it's the same as the store number.</p>
                            </div>
                        )}
                        {secretField("consumerKey", "Consumer Key", !!settings?.consumerKeyMask)}
                        {secretField("consumerSecret", "Consumer Secret", !!settings?.consumerSecretSet)}
                        {secretField("passkey", "Lipa na M-PESA Passkey", !!settings?.passkeySet)}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60"><h2 className="text-sm font-black text-slate-700">Reconciliation (Transaction Status — optional)</h2></div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">API Initiator Username</label>
                            <input value={form.initiator || ""} onChange={e => set("initiator", e.target.value)} placeholder="e.g. apiuser" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm" />
                        </div>
                        {secretField("securityCredential", "Security Credential", !!settings?.securityCredentialSet)}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-black text-slate-700 mb-2 flex items-center gap-2"><Plug className="w-4 h-4 text-[#5C67F2]" /> Callbacks</h2>
                    <p className="text-xs text-slate-500 mb-3">
                        STK Push uses the platform callback automatically. For C2B (paybill notifications) register your URLs with Safaricom:
                    </p>
                    {settings?.callbackBase ? (
                        <div className="text-xs font-mono text-slate-500 bg-slate-50 rounded-lg p-3 space-y-1 mb-3 break-all">
                            {/* /pesa not /mpesa — Safaricom rejects URLs containing the word "mpesa" */}
                            <div>Validation: {settings.callbackBase.replace(/mpesa/gi, "pesa")}/pesa/c2b/validation</div>
                            <div>Confirmation: {settings.callbackBase.replace(/mpesa/gi, "pesa")}/pesa/c2b/confirmation</div>
                        </div>
                    ) : (
                        <div className="text-xs text-amber-600 mb-3 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> The platform callback URL isn't set by the operator yet.</div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => test.mutate()} disabled={test.isPending} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">
                            {test.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Test Connection
                        </button>
                        <button onClick={() => register.mutate()} disabled={register.isPending} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">
                            {register.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />} Register C2B URLs
                        </button>
                        {settings?.registered && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 self-center"><CheckCircle2 className="w-3.5 h-3.5" /> URLs registered</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
