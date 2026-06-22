import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Power, Smartphone, AtSign, Video } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";

// Read the owner role from the JWT to gate super-owner-only settings.
const ownerRole = (): string => {
    try { const t = localStorage.getItem("owner_token"); if (!t) return ""; return String(JSON.parse(atob(t.split(".")[1])).role || "").toLowerCase(); } catch { return ""; }
};

export default function OwnerSettings() {
    const qc = useQueryClient();
    const isSuperOwner = ownerRole() === "super_owner";

    // Public school registration toggle
    const { data: settings } = useQuery({
        queryKey: ["owner_public_settings"],
        queryFn: async () => { try { return (await api.get("/owner/public-settings")).data; } catch { return { registrationEnabled: true }; } },
    });
    const toggleReg = useMutation({
        mutationFn: async (enabled: boolean) => api.post("/owner/public-settings", { registrationEnabled: enabled }),
        onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["owner_public_settings"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const regOn = settings?.registrationEnabled !== false;

    // Platform M-PESA (Daraja) for subscription billing
    const { data: mpesa } = useQuery({
        queryKey: ["owner_mpesa"],
        queryFn: async () => { try { return (await api.get("/owner/mpesa-settings")).data; } catch { return {}; } },
    });
    const [mp, setMp] = useState<any>({ env: "sandbox", consumerKey: "", consumerSecret: "", shortcode: "", tillNumber: "", passkey: "", txType: "CustomerPayBillOnline", callbackBase: "", enabled: true });
    useEffect(() => { if (mpesa) setMp((p: any) => ({ ...p, ...mpesa })); }, [mpesa]);
    const saveMpesa = useMutation({
        mutationFn: async () => api.post("/owner/mpesa-settings", mp),
        onSuccess: () => { toast.success("Platform M-PESA saved"); qc.invalidateQueries({ queryKey: ["owner_mpesa"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const mpField = (k: string, label: string, type = "text") => (
        <div><label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
            <input type={type} value={mp[k] ?? ""} onChange={(e) => setMp((p: any) => ({ ...p, [k]: e.target.value }))} className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
    );

    // Platform Jitsi / JaaS (Live Classes) — one account shared by all schools
    const { data: meetingCfg } = useQuery({
        queryKey: ["owner_meeting"],
        queryFn: async () => { try { return (await api.get("/owner/meeting-settings")).data; } catch { return {}; } },
    });
    const [mt, setMt] = useState<any>({ jitsiEnabled: true, jitsiDomain: "8x8.vc", jitsiAppId: "", jitsiKeyId: "", jitsiAppSecret: "" });
    useEffect(() => { if (meetingCfg) setMt((p: any) => ({ ...p, ...meetingCfg })); }, [meetingCfg]);
    const saveMeeting = useMutation({
        mutationFn: async () => api.post("/owner/meeting-settings", mt),
        onSuccess: () => { toast.success("Live Classes provider saved"); qc.invalidateQueries({ queryKey: ["owner_meeting"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    // Company email (SMTP) — super_owner only
    const { data: emailCfg } = useQuery({
        queryKey: ["owner_company_email"],
        enabled: isSuperOwner,
        queryFn: async () => { try { return (await api.get("/owner/company-email")).data; } catch { return {}; } },
    });
    const [em, setEm] = useState<any>({ host: "", port: 587, secure: false, user: "", pass: "", fromName: "ShuleCloud", domain: "shulecloud.com" });
    useEffect(() => { if (emailCfg) setEm((p: any) => ({ ...p, ...emailCfg })); }, [emailCfg]);
    const saveEmail = useMutation({
        mutationFn: async () => api.post("/owner/company-email", em),
        onSuccess: () => { toast.success("Company email saved"); qc.invalidateQueries({ queryKey: ["owner_company_email"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const emField = (k: string, label: string, type = "text") => (
        <div><label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
            <input type={type} value={em[k] ?? ""} onChange={(e) => setEm((p: any) => ({ ...p, [k]: e.target.value }))} className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
    );

    return (
        <div className="space-y-5">
            {/* Public registration toggle */}
            <div className="bg-white rounded-xl p-5 flex items-center justify-between" style={{ border: "0.5px solid #e5e7eb" }}>
                <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Power className="w-4 h-4" style={{ color: PRIMARY }} /> Public School Registration</h3>
                    <p className="text-xs text-slate-500 mt-0.5">When off, the public Sign-Up / Register page redirects visitors to the landing page.</p>
                </div>
                <button onClick={() => toggleReg.mutate(!regOn)} disabled={toggleReg.isPending}
                    className={`h-9 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 ${regOn ? "bg-emerald-500" : "bg-slate-400"}`}>
                    {toggleReg.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {regOn ? "Enabled" : "Disabled"}
                </button>
            </div>

            {/* Platform M-PESA (Daraja) */}
            <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Smartphone className="w-4 h-4" style={{ color: PRIMARY }} /> Platform M-PESA (Subscription Billing)</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Your Daraja credentials. Schools pay for plans via STK push to this paybill. {mpesa?.configured ? "" : "Not configured yet."}</p>
                    </div>
                    <button onClick={() => saveMpesa.mutate()} disabled={saveMpesa.isPending} className="h-9 px-4 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: PRIMARY }}>{saveMpesa.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Environment</label>
                        <select value={mp.env} onChange={(e) => setMp((p: any) => ({ ...p, env: e.target.value }))} className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }}>
                            <option value="sandbox">Sandbox</option><option value="production">Production</option>
                        </select>
                    </div>
                    {mpField("shortcode", mp.txType === "CustomerBuyGoodsOnline" ? "Head Office / Store Number" : "Shortcode / Paybill")}
                    {mp.txType === "CustomerBuyGoodsOnline" && mpField("tillNumber", "Till Number (customers pay to)")}
                    {mpField("consumerKey", "Consumer Key")}
                    {mpField("consumerSecret", "Consumer Secret", "password")}
                    {mpField("passkey", "Passkey", "password")}
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Transaction Type</label>
                        <select value={mp.txType} onChange={(e) => setMp((p: any) => ({ ...p, txType: e.target.value }))} className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }}>
                            <option value="CustomerPayBillOnline">PayBill</option><option value="CustomerBuyGoodsOnline">Buy Goods (Till)</option>
                        </select>
                    </div>
                    <div className="col-span-2">{mpField("callbackBase", "Callback Base URL (e.g. https://api.shulecloud.com/api/v1)")}</div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3">Production STK endpoint: <code>https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest</code> (used automatically when Environment = Production).</p>
            </div>

            {/* Platform Live Classes (Jitsi / 8x8 JaaS) — shared by all schools */}
            <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Video className="w-4 h-4" style={{ color: PRIMARY }} /> Live Classes — Jitsi / 8x8 JaaS</h3>
                        <p className="text-xs text-slate-500 mt-0.5">One JaaS account used by <b>all schools</b>. Each school's rooms stay isolated (namespaced by school). {meetingCfg?.configured ? "Configured ✓" : "Not configured yet."}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMt((p: any) => ({ ...p, jitsiEnabled: !p.jitsiEnabled }))}
                            className={`h-9 px-3 rounded-lg text-xs font-bold text-white ${mt.jitsiEnabled ? "bg-emerald-500" : "bg-slate-400"}`}>{mt.jitsiEnabled ? "Enabled" : "Disabled"}</button>
                        <button onClick={() => saveMeeting.mutate()} disabled={saveMeeting.isPending} className="h-9 px-4 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: PRIMARY }}>{saveMeeting.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="block text-[11px] font-bold text-slate-600 mb-1">App ID (vpaas-magic-cookie-…)</label>
                        <input value={mt.jitsiAppId ?? ""} onChange={(e) => setMt((p: any) => ({ ...p, jitsiAppId: e.target.value }))} placeholder="vpaas-magic-cookie-…" className="w-full h-10 px-3 rounded-lg text-sm font-mono" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Key ID (after the / in the API key name)</label>
                        <input value={mt.jitsiKeyId ?? ""} onChange={(e) => setMt((p: any) => ({ ...p, jitsiKeyId: e.target.value }))} placeholder="e.g. 5abcea-…" className="w-full h-10 px-3 rounded-lg text-sm font-mono" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Domain</label>
                        <input value={mt.jitsiDomain ?? ""} onChange={(e) => setMt((p: any) => ({ ...p, jitsiDomain: e.target.value }))} placeholder="8x8.vc" className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                    <div className="col-span-2"><label className="block text-[11px] font-bold text-slate-600 mb-1">RSA Private Key (PEM)</label>
                        <textarea value={mt.jitsiAppSecret ?? ""} onChange={(e) => setMt((p: any) => ({ ...p, jitsiAppSecret: e.target.value }))} rows={4}
                            placeholder={"-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----"} className="w-full px-3 py-2 rounded-lg text-xs font-mono" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3">Generate the App ID + RSA key pair at <code>jaas.8x8.vc → API Keys</code>. The free JaaS tier removes the 5-minute meeting limit. Schools cannot change this — it's locked platform-wide.</p>
            </div>

            {/* Company Email (SMTP) — super_owner only */}
            {isSuperOwner && (
                <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><AtSign className="w-4 h-4" style={{ color: PRIMARY }} /> Company Email (SMTP)</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Powers owner email broadcasts (sent from <b>name@{em.domain || "shulecloud.com"}</b>). {emailCfg?.configured ? "" : "Not configured yet."}</p>
                        </div>
                        <button onClick={() => saveEmail.mutate()} disabled={saveEmail.isPending} className="h-9 px-4 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: PRIMARY }}>{saveEmail.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {emField("host", "SMTP Host (e.g. smtp.gmail.com)")}
                        {emField("port", "Port", "number")}
                        {emField("user", "SMTP Username")}
                        {emField("pass", "SMTP Password", "password")}
                        {emField("fromName", "From Name")}
                        {emField("domain", "Sending Domain (e.g. shulecloud.com)")}
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mt-3"><input type="checkbox" checked={!!em.secure} onChange={(e) => setEm((p: any) => ({ ...p, secure: e.target.checked }))} /> Use SSL/TLS (port 465)</label>
                </div>
            )}
        </div>
    );
}
