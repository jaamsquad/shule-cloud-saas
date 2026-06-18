import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Send, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";

export default function OwnerBroadcast() {
    const [mode, setMode] = useState<"email" | "notify">("email");

    // Email broadcast
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [emailMsg, setEmailMsg] = useState("");
    const sendEmail = useMutation({
        mutationFn: async () => api.post("/owner/broadcast", { to, subject, message: emailMsg }),
        onSuccess: (res: any) => { toast.success(`Sent to ${res.data?.sent || 0} recipient(s) from ${res.data?.from || ""}`); setTo(""); setSubject(""); setEmailMsg(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    // School notification
    const [tenantId, setTenantId] = useState("");
    const [title, setTitle] = useState("");
    const [level, setLevel] = useState("info");
    const [notifMsg, setNotifMsg] = useState("");
    const { data: schools = [] } = useQuery({
        queryKey: ["owner_schools_for_notify"],
        queryFn: async () => { try { const r = await api.get("/owner/schools/summary"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const sendNotif = useMutation({
        mutationFn: async () => api.post("/owner/notify", { tenantId: tenantId || undefined, title, message: notifMsg, level }),
        onSuccess: (res: any) => { toast.success(`Notification delivered to ${res.data?.delivered || 0} school(s)`); setTitle(""); setNotifMsg(""); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const input = "w-full h-10 px-3 rounded-lg text-sm";
    const border = { border: "0.5px solid #e5e7eb" };

    return (
        <div className="space-y-5 max-w-3xl">
            <div className="flex gap-2">
                <button onClick={() => setMode("email")} className={`h-9 px-4 rounded-lg text-sm font-bold flex items-center gap-2 ${mode === "email" ? "text-white" : "text-slate-600"}`} style={mode === "email" ? { background: PRIMARY } : border}><Mail className="w-4 h-4" /> Email Broadcast</button>
                <button onClick={() => setMode("notify")} className={`h-9 px-4 rounded-lg text-sm font-bold flex items-center gap-2 ${mode === "notify" ? "text-white" : "text-slate-600"}`} style={mode === "notify" ? { background: PRIMARY } : border}><Bell className="w-4 h-4" /> School Notification</button>
            </div>

            {mode === "email" ? (
                <div className="bg-white rounded-xl p-5 space-y-3" style={border}>
                    <p className="text-xs text-slate-500">Sends from <b>your name @shulecloud.com</b> via the company SMTP.</p>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Recipients (comma-separated)</label><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="a@school.ac.ke, b@school.ac.ke" className={input} style={border} /></div>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} style={border} /></div>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Message</label><textarea value={emailMsg} onChange={(e) => setEmailMsg(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm min-h-[140px]" style={border} /></div>
                    <button onClick={() => sendEmail.mutate()} disabled={sendEmail.isPending} className="h-10 px-5 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>{sendEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Email</button>
                </div>
            ) : (
                <div className="bg-white rounded-xl p-5 space-y-3" style={border}>
                    <p className="text-xs text-slate-500">Shows as a banner on the school admin's top bar (dismissible).</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[11px] font-bold text-slate-600 mb-1">School</label>
                            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className={input} style={border}>
                                <option value="">All Schools</option>
                                {schools.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Level</label>
                            <select value={level} onChange={(e) => setLevel(e.target.value)} className={input} style={border}>
                                <option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option>
                            </select>
                        </div>
                    </div>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={input} style={border} /></div>
                    <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Message</label><textarea value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm min-h-[120px]" style={border} /></div>
                    <button onClick={() => { if (!notifMsg) { toast.error("Message required"); return; } sendNotif.mutate(); }} disabled={sendNotif.isPending} className="h-10 px-5 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>{sendNotif.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Send Notification</button>
                </div>
            )}
        </div>
    );
}
