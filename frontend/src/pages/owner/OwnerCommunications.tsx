import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, MessageSquare, Send, Wallet, Save, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";

// Platform owner communications — SMS / WhatsApp to any number via Talksasa,
// with the platform SMS balance and token setup.
export default function OwnerCommunications() {
    const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
    const [numbers, setNumbers] = useState("");
    const [message, setMessage] = useState("");
    const [token, setToken] = useState("");
    const [senderId, setSenderId] = useState("");
    const [picked, setPicked] = useState<string[]>([]);   // selected user phones

    const { data: bal, refetch } = useQuery({ queryKey: ["owner_sms_balance"], queryFn: async () => (await api.get("/owner/communications/balance")).data });
    const { data: users = [] } = useQuery<any[]>({ queryKey: ["owner_users_comms"], queryFn: async () => (await api.get("/owner/users")).data });

    const allRecipients = () => {
        const typed = numbers.split(",").map(s => s.trim()).filter(Boolean);
        return Array.from(new Set([...typed, ...picked]));
    };
    const toggleUser = (phone: string) => setPicked(p => p.includes(phone) ? p.filter(x => x !== phone) : [...p, phone]);

    const send = useMutation({
        mutationFn: async () => (await api.post("/owner/communications/send", { channel, numbers: allRecipients(), message })).data,
        onSuccess: (d: any) => { toast.success(d.ok ? `Sent to ${d.sent} recipient(s).` : (d.error || "Send failed"), { duration: 7000 }); if (d.ok) { setMessage(""); setPicked([]); } refetch(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Send failed"),
    });
    const saveToken = useMutation({
        mutationFn: async () => (await api.post("/owner/communications/settings", { apiToken: token, senderId })).data,
        onSuccess: () => { toast.success("Saved"); setToken(""); refetch(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="p-6 space-y-6 max-w-4xl">
            <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6" style={{ color: PRIMARY }} /> Communications</h1>
            <div className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                    <div className="flex gap-2">
                        {(["sms", "whatsapp"] as const).map(c => (
                            <button key={c} onClick={() => setChannel(c)} className={`h-9 px-4 rounded-xl font-bold text-sm capitalize ${channel === c ? "text-white" : "bg-slate-50 text-slate-600"}`} style={channel === c ? { background: PRIMARY } : {}}>{c}</button>
                        ))}
                    </div>
                    <input value={numbers} onChange={e => setNumbers(e.target.value)} placeholder="Numbers, comma-separated (0712…, 0798…)" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />

                    {/* Select platform users to message */}
                    <div className="border border-slate-100 rounded-xl">
                        <div className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 border-b border-slate-100"><Users className="w-3.5 h-3.5" /> Platform Users {picked.length ? `· ${picked.length} selected` : ""}</div>
                        <div className="max-h-40 overflow-y-auto p-1">
                            {users.filter(u => u.phone).length === 0 ? (
                                <p className="text-xs text-slate-400 px-3 py-3">No users have a phone number on file.</p>
                            ) : users.filter(u => u.phone).map(u => (
                                <label key={u._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm">
                                    <input type="checkbox" checked={picked.includes(u.phone)} onChange={() => toggleUser(u.phone)} />
                                    <span className="font-semibold text-slate-700">{u.name}</span>
                                    <span className="text-xs text-slate-400">{u.role} · {u.phone}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Message…" className="w-full p-3 rounded-xl border border-slate-200 text-sm" />
                    <button onClick={() => send.mutate()} disabled={send.isPending || !message || allRecipients().length === 0} className="h-11 px-5 rounded-xl text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50" style={{ background: PRIMARY }}>
                        {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send {channel.toUpperCase()} {allRecipients().length ? `(${allRecipients().length})` : ""}
                    </button>
                </div>
                <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-2"><Wallet className="w-4 h-4" /> SMS Balance</div>
                        {bal?.configured ? (
                            <>
                                <div className="text-3xl font-black text-slate-800">{typeof bal.balance === "object" ? JSON.stringify(bal.balance) : (bal.balance ?? "—")}</div>
                                <a href={bal.topupUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm font-bold" style={{ color: PRIMARY }}>Recharge units <ExternalLink className="w-3.5 h-3.5" /></a>
                            </>
                        ) : <p className="text-sm text-slate-400">Add the platform Talksasa token below.</p>}
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2">
                        <div className="text-slate-500 text-xs font-bold uppercase mb-1">Talksasa Setup</div>
                        <input value={token} onChange={e => setToken(e.target.value)} placeholder="API Token" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm" />
                        <input value={senderId} onChange={e => setSenderId(e.target.value)} placeholder="Sender ID" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm" />
                        <button onClick={() => saveToken.mutate()} disabled={saveToken.isPending || !token} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                            {saveToken.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
