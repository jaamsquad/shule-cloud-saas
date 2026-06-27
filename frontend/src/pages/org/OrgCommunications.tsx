import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, MessageSquare, Send, Smartphone, Wallet, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { isOrgUser } from "@/lib/orgContext";

// Organization communications — send SMS / WhatsApp to numbers, staff or parents
// of any branch, via Talksasa. Shows the SMS unit balance and a top-up link.
export default function OrgCommunications() {
    const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
    const [message, setMessage] = useState("");
    const [numbers, setNumbers] = useState("");
    const [branchId, setBranchId] = useState("");
    const [audience, setAudience] = useState("");
    const [token, setToken] = useState("");
    const [senderId, setSenderId] = useState("");

    const { data: branches = [] } = useQuery({ queryKey: ["org_branches_comms"], enabled: isOrgUser(), queryFn: async () => (await api.get("/org/branches")).data });
    const { data: bal, refetch: refetchBal } = useQuery({ queryKey: ["org_sms_balance"], enabled: isOrgUser(), queryFn: async () => (await api.get("/org/communications/balance")).data });

    const send = useMutation({
        mutationFn: async () => (await api.post("/org/communications/send", { channel, message, numbers, branchId: branchId || undefined, audience: audience || undefined })).data,
        onSuccess: (d: any) => { toast.success(d.ok ? `Sent to ${d.sent} recipient(s).` : (d.error || "Send failed"), { duration: 7000 }); if (d.ok) setMessage(""); refetchBal(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Send failed"),
    });
    const saveToken = useMutation({
        mutationFn: async () => (await api.post("/org/communications/settings", { apiToken: token, senderId })).data,
        onSuccess: () => { toast.success("Talksasa settings saved"); setToken(""); refetchBal(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-5"><MessageSquare className="w-6 h-6" style={{ color: "var(--org-accent,#5C67F2)" }} /> Communications</h1>

            <div className="grid lg:grid-cols-3 gap-5">
                {/* Compose */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                    <div className="flex gap-2">
                        {(["sms", "whatsapp"] as const).map(c => (
                            <button key={c} onClick={() => setChannel(c)} className={`h-9 px-4 rounded-xl font-bold text-sm capitalize ${channel === c ? "bg-[#5C67F2] text-white" : "bg-slate-50 text-slate-600"}`}>{c}</button>
                        ))}
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Recipients (numbers, comma-separated)</label>
                        <input value={numbers} onChange={e => setNumbers(e.target.value)} placeholder="0712345678, 0798765432" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Or a branch audience</label>
                            <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                                <option value="">— No branch —</option>
                                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Audience</label>
                            <select value={audience} onChange={e => setAudience(e.target.value)} disabled={!branchId} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                                <option value="">— Select —</option>
                                <option value="staff">All Staff</option>
                                <option value="parents">All Parents</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Message</label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Type your message…" className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                        <p className="text-[11px] text-slate-400 mt-1">Messages are automatically prefixed with your organization name.</p>
                    </div>
                    <button onClick={() => send.mutate()} disabled={send.isPending || !message || (!numbers && !audience)} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                        {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send {channel.toUpperCase()}
                    </button>
                </div>

                {/* Balance + settings */}
                <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-2"><Wallet className="w-4 h-4" /> SMS Balance</div>
                        {bal?.configured ? (
                            <>
                                <div className="text-3xl font-black text-slate-800">{typeof bal.balance === "object" ? JSON.stringify(bal.balance) : (bal.balance ?? "—")}</div>
                                <a href={bal.topupUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-[#5C67F2]">Recharge units <ExternalLink className="w-3.5 h-3.5" /></a>
                            </>
                        ) : <p className="text-sm text-slate-400">Add your Talksasa token below to see the balance.</p>}
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1"><Smartphone className="w-4 h-4" /> Talksasa Setup</div>
                        <input value={token} onChange={e => setToken(e.target.value)} placeholder="API Token" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm" />
                        <input value={senderId} onChange={e => setSenderId(e.target.value)} placeholder="Sender ID (max 11 chars)" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm" />
                        <button onClick={() => saveToken.mutate()} disabled={saveToken.isPending || !token} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                            {saveToken.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
