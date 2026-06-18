import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Loader2, Check, Power } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";
const when = (d: any) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function OwnerMessages() {
    const qc = useQueryClient();

    const { data: messages = [], isLoading } = useQuery({
        queryKey: ["owner_contact_messages"],
        queryFn: async () => { try { const r = await api.get("/owner/contact-messages"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const { data: settings } = useQuery({
        queryKey: ["owner_public_settings"],
        queryFn: async () => { try { return (await api.get("/owner/public-settings")).data; } catch { return { registrationEnabled: true }; } },
    });

    const markRead = useMutation({
        mutationFn: async (id: string) => api.patch(`/owner/contact-messages/${id}`, { status: "read" }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["owner_contact_messages"] }),
    });
    const toggleReg = useMutation({
        mutationFn: async (enabled: boolean) => api.post("/owner/public-settings", { registrationEnabled: enabled }),
        onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["owner_public_settings"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const regOn = settings?.registrationEnabled !== false;

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

            {/* Contact messages */}
            <div>
                <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2"><Mail className="w-4 h-4" style={{ color: PRIMARY }} /> Contact Messages ({messages.length})</h3>
                {isLoading ? (
                    <div className="flex items-center justify-center py-14 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : messages.length === 0 ? (
                    <div className="bg-white rounded-xl p-10 text-center text-slate-400 text-sm" style={{ border: "0.5px solid #e5e7eb" }}>No messages yet</div>
                ) : (
                    <div className="space-y-3">
                        {messages.map((m: any) => (
                            <div key={m._id} className={`bg-white rounded-xl p-4 ${m.status === "new" ? "ring-1 ring-[#534AB7]/20" : ""}`} style={{ border: "0.5px solid #e5e7eb" }}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-800 text-sm">{m.name}</span>
                                            {m.school && <span className="text-[11px] text-slate-400">· {m.school}</span>}
                                            {m.status === "new" && <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#534AB7]/10 text-[#534AB7]">New</span>}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">{m.email}{m.phone ? ` · ${m.phone}` : ""} · {when(m.createdAt)}</div>
                                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{m.message}</p>
                                    </div>
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                        <a href={`mailto:${m.email}`} className="h-8 px-3 rounded-lg text-xs font-bold text-white flex items-center" style={{ background: PRIMARY }}>Reply</a>
                                        {m.status === "new" && <button onClick={() => markRead.mutate(m._id)} className="h-8 px-3 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1" style={{ border: "0.5px solid #e5e7eb" }}><Check className="w-3.5 h-3.5" /> Read</button>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
