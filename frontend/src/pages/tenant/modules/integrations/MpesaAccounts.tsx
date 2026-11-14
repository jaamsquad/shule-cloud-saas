import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft, ChevronRight, Loader2, Plus, Smartphone, CheckCircle2, AlertTriangle, Star,
    Plug, DownloadCloud, ShieldCheck, Trash2, X, Save, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// M-PESA (Daraja) — a school can register more than one Paybill/Till account
// (e.g. one for tuition, one for transport/uniform). Each is a fully independent
// set of Daraja credentials; exactly one is the DEFAULT used wherever an action
// doesn't ask which account to use (parent/student portal top-ups, background
// Pull-sync, the Verify ping on a manually-recorded Till payment).
export default function MpesaAccounts() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [editing, setEditing] = useState<string | "new" | null>(null);

    const { data: accounts = [], isLoading } = useQuery<any[]>({
        queryKey: ["mpesa_accounts"],
        queryFn: async () => (await api.get("/integrations/mpesa/accounts")).data || [],
    });

    const refresh = () => qc.invalidateQueries({ queryKey: ["mpesa_accounts"] });

    const setDefault = useMutation({
        mutationFn: async (id: string) => (await api.post(`/integrations/mpesa/accounts/${id}/set-default`)).data,
        onSuccess: () => { toast.success("Default M-PESA account updated"); refresh(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const toggleEnabled = useMutation({
        mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => (await api.put(`/integrations/mpesa/accounts/${id}`, { enabled })).data,
        onSuccess: refresh,
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const remove = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/integrations/mpesa/accounts/${id}`)).data,
        onSuccess: () => { toast.success("M-PESA account removed"); refresh(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-16">
            <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => navigate("/integrations")} className="text-gray-400 hover:text-[#5C67F2]"><ArrowLeft className="w-5 h-5" /></button>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 text-sm cursor-pointer hover:text-[#5C67F2] hidden sm:block" onClick={() => navigate("/integrations")}>Integrations</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 hidden sm:block" />
                    <span className="font-black text-[#5C67F2] text-sm truncate">M-PESA (Daraja)</span>
                </div>
                <button onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00A651] hover:bg-[#008f46] text-white text-sm font-bold">
                    <Plus className="w-4 h-4" /> Add Account
                </button>
            </div>

            <div className="px-4 sm:px-8 py-6" style={{ background: "linear-gradient(135deg, #00A65108 0%, transparent 70%)" }}>
                <div className="max-w-4xl mx-auto flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 bg-white" style={{ borderColor: "#00A65130" }}>
                        <Smartphone className="w-7 h-7" style={{ color: "#00A651" }} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-gray-900">M-PESA Accounts</h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">Register one or more Safaricom Daraja Paybill/Till accounts — e.g. a Paybill for tuition and a Till for transport. The one marked Default is used wherever a payment doesn't ask which account to use.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 space-y-3">
                {isLoading ? (
                    <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#00A651]" /></div>
                ) : accounts.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center text-gray-400">
                        <Smartphone className="w-10 h-10 mx-auto mb-2" />
                        <p className="font-bold">No M-PESA account yet</p>
                        <button onClick={() => setEditing("new")} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00A651] text-white text-sm font-bold"><Plus className="w-4 h-4" /> Add your first account</button>
                    </div>
                ) : accounts.map(a => <AccountCard key={a._id} account={a} onEdit={() => setEditing(a._id)} onSetDefault={() => setDefault.mutate(a._id)} onToggle={v => toggleEnabled.mutate({ id: a._id, enabled: v })} onRemove={() => { if (confirm(`Remove "${a.name}"? Any pending payments on it keep working, but it can no longer be used for new ones.`)) remove.mutate(a._id); }} onChanged={refresh} />)}
            </div>

            {editing && <AccountForm id={editing === "new" ? null : editing} account={editing === "new" ? null : accounts.find(a => a._id === editing)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
        </div>
    );
}

function AccountCard({ account: a, onEdit, onSetDefault, onToggle, onRemove, onChanged }: { account: any; onEdit: () => void; onSetDefault: () => void; onToggle: (v: boolean) => void; onRemove: () => void; onChanged: () => void }) {
    const [testing, setTesting] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [registeringPull, setRegisteringPull] = useState(false);
    const [pullNumber, setPullNumber] = useState("");
    const [showPull, setShowPull] = useState(false);

    const test = async () => {
        setTesting(true);
        try { const r = await api.post(`/integrations/mpesa/accounts/${a._id}/test`); toast.success(r.data?.message || "Connected"); }
        catch (e: any) { toast.error(e.response?.data?.message || "Connection failed"); }
        finally { setTesting(false); }
    };
    const registerC2B = async () => {
        setRegistering(true);
        try {
            const r = await api.post(`/integrations/mpesa/accounts/${a._id}/register-urls`);
            const sc = r.data?.registeredShortCode;
            toast.success(r.data?.alreadyRegistered
                ? `C2B URLs already registered${sc ? ` to store number ${sc}` : ""} — direct payments are being captured.`
                : `C2B URLs registered with Safaricom${sc ? ` to store number ${sc}` : ""} — direct payments will now appear.`);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Registration failed", { duration: 12000 });
        } finally { setRegistering(false); onChanged(); }
    };
    const registerPull = async () => {
        if (!pullNumber.trim()) { toast.error("Enter the nominated phone number from your M-PESA org portal."); return; }
        setRegisteringPull(true);
        try { const r = await api.post(`/integrations/mpesa/accounts/${a._id}/register-pull`, { nominatedNumber: pullNumber.trim() }); toast.success(r.data?.message || "Pull API registered."); setShowPull(false); }
        catch (e: any) { toast.error(e.response?.data?.message || "Pull registration failed"); }
        finally { setRegisteringPull(false); onChanged(); }
    };

    return (
        <div className={`bg-white rounded-2xl border-2 p-5 ${a.isDefault ? "border-indigo-200 shadow-sm" : "border-gray-100"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border bg-white" style={{ borderColor: "#00A65130" }}><Smartphone className="w-5 h-5" style={{ color: "#00A651" }} /></div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-gray-900 text-sm truncate">{a.name}</p>
                            {a.isDefault && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-full"><Star className="w-2.5 h-2.5" /> Default</span>}
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${a.env === "production" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{a.env}</span>
                            {a.configured ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-full"><CheckCircle2 className="w-2.5 h-2.5" /> Configured</span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-400 text-[9px] font-black uppercase rounded-full"><AlertTriangle className="w-2.5 h-2.5" /> Incomplete</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{a.txType === "CustomerBuyGoodsOnline" ? `Till ${a.tillNumber || "—"} (store ${a.shortcode || "—"})` : `Paybill ${a.shortcode || "—"}`}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="flex items-center gap-1.5">
                        <button onClick={() => onToggle(!a.enabled)} className={`relative w-9 h-5 rounded-full ${a.enabled ? "bg-[#00A651]" : "bg-gray-200"}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${a.enabled ? "right-0.5" : "left-0.5"}`} />
                        </button>
                        <span className="text-[11px] font-bold text-gray-500">{a.enabled ? "Enabled" : "Disabled"}</span>
                    </label>
                    <button onClick={onEdit} className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={onRemove} className="h-8 w-8 rounded-lg border border-gray-200 text-rose-500 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-50">
                {!a.isDefault && <button onClick={onSetDefault} className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Make Default</button>}
                <button onClick={test} disabled={testing} className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold flex items-center gap-1 disabled:opacity-50">{testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Test</button>
                <button onClick={registerC2B} disabled={registering} className="h-8 px-3 rounded-lg bg-[#00A651] hover:bg-[#008f46] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50">{registering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />} Register C2B URLs</button>
                {a.registered && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> registered to {a.registeredShortCode || "—"}</span>}
                <button onClick={() => setShowPull(v => !v)} className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold flex items-center gap-1"><DownloadCloud className="w-3.5 h-3.5" /> Pull API</button>
                {a.pullRegistered && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Pull registered</span>}
            </div>
            {showPull && (
                <div className="mt-3 flex flex-wrap items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <input value={pullNumber} onChange={e => setPullNumber(e.target.value)} placeholder="Nominated phone e.g. 0712345678" className="h-9 px-3 border border-gray-200 rounded-xl text-sm w-56" />
                    <button onClick={registerPull} disabled={registeringPull} className="h-9 px-4 rounded-xl bg-[#0E7490] hover:bg-[#0b5e74] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">{registeringPull ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />} Register Pull API</button>
                    <p className="text-[11px] text-gray-400 w-full">The nominated number must be an operator phone registered on your M-PESA org portal. Pull API is a separate Daraja product — activate it for this shortcode on the Daraja portal if registration is rejected.</p>
                </div>
            )}
        </div>
    );
}

const FIELD = "w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00A651]";
const LABEL = "block text-[11px] font-bold text-gray-500 mb-1";

function AccountForm({ id, account, onClose, onSaved }: { id: string | null; account: any; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState<any>(account ? {
        name: account.name, env: account.env, shortcode: account.shortcode, tillNumber: account.tillNumber,
        txType: account.txType, initiator: account.initiator, enabled: account.enabled,
    } : { env: "sandbox", txType: "CustomerPayBillOnline", enabled: true });
    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

    const save = useMutation({
        mutationFn: async () => {
            const payload: any = { ...form };
            ["consumerKey", "consumerSecret", "passkey", "c2bConsumerKey", "c2bConsumerSecret", "securityCredential"].forEach(k => { if (!form[k]) delete payload[k]; });
            return id ? api.put(`/integrations/mpesa/accounts/${id}`, payload) : api.post("/integrations/mpesa/accounts", payload);
        },
        onSuccess: () => { toast.success(id ? "Account updated" : "Account added"); onSaved(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });

    const secretField = (k: string, label: string, isSet: boolean) => (
        <div>
            <label className={LABEL}>{label} {isSet && <span className="text-emerald-600 font-normal">· set</span>}</label>
            <input type="password" value={form[k] || ""} onChange={e => set(k, e.target.value)} placeholder={isSet ? "•••••••• (leave blank to keep)" : ""} className={FIELD} />
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
                    <h2 className="font-black text-gray-800 flex items-center gap-2"><Smartphone className="w-5 h-5" style={{ color: "#00A651" }} /> {id ? "Edit M-PESA Account" : "Add M-PESA Account"}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-5">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                        Get your <strong>Consumer Key</strong>, <strong>Consumer Secret</strong> and <strong>Passkey</strong> from the Safaricom Daraja portal (My Apps). Use <strong>Sandbox</strong> for testing, then switch to <strong>Production</strong> with live credentials.
                    </div>
                    <div>
                        <label className={LABEL}>Account Name</label>
                        <input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="e.g. Tuition Paybill" className={FIELD} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={LABEL}>Environment</label>
                            <select value={form.env} onChange={e => set("env", e.target.value)} className={FIELD}>
                                <option value="sandbox">Sandbox (testing)</option>
                                <option value="production">Production (live)</option>
                            </select>
                        </div>
                        <div>
                            <label className={LABEL}>Transaction Type</label>
                            <select value={form.txType} onChange={e => set("txType", e.target.value)} className={FIELD}>
                                <option value="CustomerPayBillOnline">Paybill</option>
                                <option value="CustomerBuyGoodsOnline">Till / Buy Goods</option>
                            </select>
                        </div>
                        <div>
                            <label className={LABEL}>{form.txType === "CustomerBuyGoodsOnline" ? "Till Number" : "Business Shortcode (Paybill)"}</label>
                            <input value={form.shortcode || ""} onChange={e => set("shortcode", e.target.value)} placeholder={form.txType === "CustomerBuyGoodsOnline" ? "e.g. 5678901" : "e.g. 174379"} className={FIELD} />
                            {form.txType === "CustomerBuyGoodsOnline" && (
                                <p className="text-[11px] text-gray-400 mt-1">The number customers dial on "Lipa na M-PESA → Buy Goods" (what Safaricom calls your <em>BusinessShortCode</em>).</p>
                            )}
                        </div>
                        {form.txType === "CustomerBuyGoodsOnline" && (
                            <div>
                                <label className={LABEL}>Store Number <span className="font-normal text-gray-400">· optional</span></label>
                                <input value={form.tillNumber || ""} onChange={e => set("tillNumber", e.target.value)} placeholder="leave blank for single-till" className={FIELD} />
                                <p className="text-[11px] text-gray-400 mt-1">Only if Safaricom gave you a separate store/head-office number for a multi-till merchant. Leave blank otherwise.</p>
                            </div>
                        )}
                        {secretField("consumerKey", "Consumer Key", !!account?.consumerKeyMask)}
                        {secretField("consumerSecret", "Consumer Secret", !!account?.consumerSecretSet)}
                        {secretField("passkey", "Lipa na M-PESA Passkey", !!account?.passkeySet)}
                    </div>

                    <div>
                        <p className="text-[11px] font-black uppercase text-gray-400 mb-2">C2B App (optional — only if Safaricom gave you a separate one)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {secretField("c2bConsumerKey", "C2B Consumer Key", !!account?.c2bConsumerKeyMask)}
                            {secretField("c2bConsumerSecret", "C2B Consumer Secret", !!account?.c2bConsumerSecretSet)}
                        </div>
                    </div>

                    <div>
                        <p className="text-[11px] font-black uppercase text-gray-400 mb-2">Reconciliation (Transaction Status — optional)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL}>API Initiator Username</label>
                                <input value={form.initiator || ""} onChange={e => set("initiator", e.target.value)} placeholder="e.g. apiuser" className={FIELD} />
                            </div>
                            {secretField("securityCredential", "Security Credential", !!account?.securityCredentialSet)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
                    <button onClick={onClose} className="h-10 px-4 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm">Cancel</button>
                    <button onClick={() => save.mutate()} disabled={save.isPending} className="h-10 px-5 rounded-xl bg-[#00A651] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                </div>
            </div>
        </div>
    );
}
