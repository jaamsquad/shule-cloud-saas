/**
 * Owner → a school → Email sending: whether the school's emails go out through its own email
 * account or ShuleCloud's (Owner → Settings → Company email). Server: POST /owner/schools/:id/email-mode.
 */
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";
const OPTIONS = [
    { v: "auto", t: "Automatic", d: "The school's own email if it has set one up, otherwise ShuleCloud's." },
    { v: "platform", t: "ShuleCloud email", d: "Always send through ShuleCloud's email, in the school's name (replies go to the school)." },
    { v: "custom", t: "School's own email", d: "Always the school's own account (Integrations → SMTP). Nothing is sent until it is set up." },
];

export default function SchoolEmailCard({ schoolId, info }: { schoolId: string; info?: { mode: string; schoolConfigured: boolean; platformConfigured: boolean } }) {
    const qc = useQueryClient();
    const [mode, setMode] = useState(info?.mode || "auto");
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (info?.mode) setMode(info.mode); }, [info?.mode]);
    const save = async (m: string) => {
        setMode(m); setBusy(true);
        try { await api.post(`/owner/schools/${schoolId}/email-mode`, { mode: m }); toast.success("Email sending updated"); qc.invalidateQueries({ queryKey: ["school_detail", schoolId] }); }
        catch (e: any) { toast.error(e?.response?.data?.message || "Could not save"); setMode(info?.mode || "auto"); } finally { setBusy(false); }
    };
    const using = mode === "platform" ? "ShuleCloud's email" : mode === "custom" ? (info?.schoolConfigured ? "the school's own email" : "nothing — the school hasn't set up its email") : info?.schoolConfigured ? "the school's own email" : info?.platformConfigured ? "ShuleCloud's email" : "nothing — no email is set up";
    const warn = using.startsWith("nothing");
    return (
        <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
            <div className="flex items-center gap-2 mb-1"><Mail className="w-4 h-4" style={{ color: PRIMARY }} /><h3 className="text-sm font-black text-slate-800">Email sending</h3>{busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}</div>
            <p className="text-[11px] text-slate-400 mb-3">Which email account this school's emails (OTPs, report cards, receipts, notices) go out through.</p>
            <div className="grid sm:grid-cols-3 gap-2">
                {OPTIONS.map(o => (
                    <button key={o.v} onClick={() => save(o.v)} disabled={busy} className={`text-left rounded-xl p-3 border-2 transition-all ${mode === o.v ? "bg-indigo-50/60" : "border-slate-100 hover:border-slate-200"}`} style={mode === o.v ? { borderColor: PRIMARY } : {}}>
                        <div className="text-sm font-black text-slate-800">{o.t}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{o.d}</div>
                    </button>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold">
                <span className={info?.schoolConfigured ? "text-emerald-600" : "text-slate-400"}>School email: {info?.schoolConfigured ? "set up" : "not set up"}</span>
                <span className={info?.platformConfigured ? "text-emerald-600" : "text-amber-600"}>ShuleCloud email: {info?.platformConfigured ? "set up" : "not set up (Settings → Company email)"}</span>
                <span className={warn ? "text-rose-600" : "text-slate-600"}>Now sending through: {using}</span>
            </div>
        </div>
    );
}
