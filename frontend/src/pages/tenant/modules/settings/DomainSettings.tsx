import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Globe, Loader2, Plus, Trash2, RefreshCw, ShieldCheck, ShieldAlert, Clock,
    Copy, Check, AlertTriangle, Palette, History,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const badge = (s: string) => {
    const v = (s || "").toLowerCase();
    if (v === "active") return { cls: "bg-emerald-100 text-emerald-700", icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Active" };
    if (v.includes("fail")) return { cls: "bg-rose-100 text-rose-700", icon: <ShieldAlert className="w-3.5 h-3.5" />, label: "Failed" };
    if (v === "none") return { cls: "bg-slate-100 text-slate-500", icon: <Clock className="w-3.5 h-3.5" />, label: "—" };
    return { cls: "bg-amber-100 text-amber-700", icon: <Clock className="w-3.5 h-3.5" />, label: "Pending" };
};

function CopyBtn({ text }: { text: string }) {
    const [done, setDone] = useState(false);
    return (
        <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}
            className="text-slate-400 hover:text-[#5C67F2]" title="Copy">
            {done ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

export default function DomainSettings() {
    const qc = useQueryClient();
    const [domain, setDomain] = useState("");

    const { data: status, isLoading } = useQuery({ queryKey: ["domain_status"], queryFn: async () => (await api.get("/domains/status")).data });
    const { data: dns } = useQuery({ queryKey: ["domain_dns"], queryFn: async () => (await api.get("/domains/dns-instructions")).data, enabled: !!status?.customDomain });
    const { data: history = [] } = useQuery({ queryKey: ["domain_history"], queryFn: async () => { const r = await api.get("/domains/history"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: profile } = useQuery({ queryKey: ["tenant_profile_branding"], queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; } });

    const refresh = () => { ["domain_status", "domain_dns", "domain_history"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); };

    const add = useMutation({ mutationFn: async () => api.post("/domains/add", { domain }), onSuccess: () => { toast.success("Domain added — complete the DNS setup"); setDomain(""); refresh(); }, onError: (e: any) => toast.error(e.response?.data?.message || "Failed") });
    const remove = useMutation({ mutationFn: async () => api.post("/domains/remove", {}), onSuccess: () => { toast.success("Domain removed"); refresh(); }, onError: (e: any) => toast.error(e.response?.data?.message || "Failed") });
    const recheck = useMutation({ mutationFn: async () => api.post("/domains/recheck", {}), onSuccess: () => { toast.success("Re-checked"); refresh(); }, onError: (e: any) => toast.error(e.response?.data?.message || "Failed") });

    // Branding
    const [branding, setBranding] = useState<any>(null);
    const b = branding ?? profile?.branding ?? {};
    const setB = (k: string, v: any) => setBranding({ ...(branding ?? profile?.branding ?? {}), [k]: v });
    const saveBranding = useMutation({
        mutationFn: async () => api.patch("/auth/tenant/profile", { branding: b }),
        onSuccess: () => { toast.success("Branding saved"); qc.invalidateQueries({ queryKey: ["tenant_profile_branding"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const onFile = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader(); r.onloadend = () => setB(k, r.result as string); r.readAsDataURL(f);
    };

    if (isLoading) return <div className="flex-1 flex items-center justify-center min-h-screen bg-[#f8fafc]"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>;

    const vBadge = badge(status?.verificationStatus);
    const sBadge = badge(status?.sslStatus);

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen pb-16">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center"><Globe className="w-5 h-5 text-indigo-600" /></div>
                <div><h1 className="text-lg font-black text-slate-800">Custom Domain &amp; Branding</h1><p className="text-xs text-slate-400">Connect your own domain and brand your portal</p></div>
            </div>

            <div className="px-6 mt-5 space-y-5 max-w-4xl">
                {!status?.cloudflareConfigured && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
                        <AlertTriangle className="w-4 h-4" /> The platform's Cloudflare integration isn't configured yet. You can still add your domain; verification activates once the operator sets it up.
                    </div>
                )}

                {/* Custom domain */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60"><h2 className="text-sm font-black text-slate-700">Custom Domain</h2></div>
                    <div className="p-5">
                        {!status?.customDomain ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="portal.yourschool.ac.ke"
                                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
                                <button onClick={() => add.mutate()} disabled={add.isPending || !domain}
                                    className="inline-flex items-center justify-center gap-1.5 h-10 px-5 bg-[#5C67F2] text-white text-xs font-black rounded-lg disabled:opacity-50">
                                    {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Domain
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div>
                                        <p className="text-lg font-black text-slate-800">{status.customDomain}</p>
                                        <p className="text-xs text-slate-400">{status.domainConnectedAt ? `Connected ${new Date(status.domainConnectedAt).toLocaleDateString("en-GB")}` : "Awaiting DNS verification"}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${vBadge.cls}`}>{vBadge.icon} Domain: {vBadge.label}</span>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${sBadge.cls}`}>{sBadge.icon} SSL: {sBadge.label}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => recheck.mutate()} disabled={recheck.isPending} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">
                                        {recheck.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Re-check
                                    </button>
                                    <button onClick={() => remove.mutate()} disabled={remove.isPending} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50">
                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* DNS instructions */}
                {status?.customDomain && dns && (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60"><h2 className="text-sm font-black text-slate-700">DNS Setup Instructions</h2></div>
                        <div className="p-5">
                            <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1 mb-4">{dns.steps?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="text-left text-slate-500 border-b border-slate-100">
                                        <th className="py-2">Type</th><th className="py-2">Host / Name</th><th className="py-2">Target / Value</th><th className="py-2">Purpose</th>
                                    </tr></thead>
                                    <tbody>
                                        {dns.records?.map((r: any, i: number) => (
                                            <tr key={i} className="border-b border-slate-50">
                                                <td className="py-2.5 font-bold text-slate-700">{r.type}</td>
                                                <td className="py-2.5"><span className="font-mono text-xs text-slate-600 break-all">{r.host}</span> <CopyBtn text={r.host} /></td>
                                                <td className="py-2.5"><span className="font-mono text-xs text-slate-600 break-all">{r.target}</span> <CopyBtn text={r.target} /></td>
                                                <td className="py-2.5 text-xs text-slate-500">{r.purpose}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Branding */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2"><Palette className="w-4 h-4 text-[#5C67F2]" /><h2 className="text-sm font-black text-slate-700">Branding</h2></div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">School Name</label>
                            <input value={b.schoolName ?? profile?.name ?? ""} onChange={e => setB("schoolName", e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Portal Theme</label>
                            <select value={b.portalTheme || "light"} onChange={e => setB("portalTheme", e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white">
                                {["light", "dark", "system"].map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Primary Color</label>
                            <div className="flex items-center gap-2"><input type="color" value={b.primaryColor || "#5C67F2"} onChange={e => setB("primaryColor", e.target.value)} className="h-10 w-14 rounded border border-gray-200" /><span className="text-xs font-mono text-slate-500">{b.primaryColor || "#5C67F2"}</span></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Secondary Color</label>
                            <div className="flex items-center gap-2"><input type="color" value={b.secondaryColor || "#0f2942"} onChange={e => setB("secondaryColor", e.target.value)} className="h-10 w-14 rounded border border-gray-200" /><span className="text-xs font-mono text-slate-500">{b.secondaryColor || "#0f2942"}</span></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Logo</label>
                            <div className="flex items-center gap-3">
                                {b.logo && <img src={b.logo} className="w-10 h-10 object-contain rounded border border-slate-100" />}
                                <input type="file" accept="image/*" onChange={onFile("logo")} className="text-xs" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Favicon</label>
                            <div className="flex items-center gap-3">
                                {b.favicon && <img src={b.favicon} className="w-6 h-6 object-contain rounded border border-slate-100" />}
                                <input type="file" accept="image/*" onChange={onFile("favicon")} className="text-xs" />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Login Background</label>
                            <div className="flex items-center gap-3">
                                {b.loginBackground && <img src={b.loginBackground} className="w-16 h-10 object-cover rounded border border-slate-100" />}
                                <input type="file" accept="image/*" onChange={onFile("loginBackground")} className="text-xs" />
                            </div>
                        </div>
                    </div>
                    <div className="px-5 pb-5 flex justify-end">
                        <button onClick={() => saveBranding.mutate()} disabled={saveBranding.isPending} className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[#5C67F2] text-white text-xs font-black disabled:opacity-50">
                            {saveBranding.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save Branding
                        </button>
                    </div>
                </div>

                {/* Connection history */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2"><History className="w-4 h-4 text-[#5C67F2]" /><h2 className="text-sm font-black text-slate-700">Connection History</h2></div>
                    <div className="p-5">
                        {history.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">No domain activity yet.</p> : (
                            <div className="space-y-1">
                                {history.map((h: any) => (
                                    <div key={h._id} className="flex items-center justify-between text-xs py-2 border-b border-slate-50">
                                        <span className="font-semibold text-slate-700">{String(h.action).replace(/_/g, " ")} <span className="text-slate-400 font-normal">· {h.domain}</span></span>
                                        <span className="text-slate-400">{h.user || "—"} · {new Date(h.createdAt).toLocaleString("en-GB")}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
