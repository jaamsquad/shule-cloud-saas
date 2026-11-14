import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Mail, Phone, AlertTriangle, CheckCircle2, Beaker } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { ContactPicker, type Contact } from "./ContactPicker";
import TemplatePicker, { openPlaceholders } from "@/components/comm/TemplatePicker";

interface Props {
    channel: "email" | "whatsapp";
}

const AUDIENCES = [
    { key: "all", label: "Everyone" },
    { key: "students", label: "Students" },
    { key: "parents", label: "Parents" },
    { key: "staff", label: "Staff" },
];

export default function ChannelComposer({ channel }: Props) {
    const qc = useQueryClient();
    const isEmail = channel === "email";
    const Icon = isEmail ? Mail : Phone;
    const accent = isEmail ? "#5C67F2" : "#25D366";

    const [mode, setMode] = useState<"compose" | "results">("compose");
    const [recipientMode, setRecipientMode] = useState<"groups" | "person">("groups");
    const [person, setPerson] = useState<Contact | null>(null);
    const [audience, setAudience] = useState("students");
    const [manual, setManual] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [testTo, setTestTo] = useState("");
    const [resType, setResType] = useState<"exam" | "classTest" | "cbc">("exam");
    const [resId, setResId] = useState("");

    // Result sources for the "Send Results" mode (only meaningful for WhatsApp here).
    const { data: resultSources } = useQuery({
        queryKey: ["wa_result_sources", channel],
        queryFn: async () => (await api.get(`/communications/${channel}/result-sources`)).data,
        enabled: !isEmail,
    });
    const resList = resType === "exam" ? (resultSources?.exams || []) : resType === "classTest" ? (resultSources?.classTests || []) : (resultSources?.cbcActivities || []);

    const sendResults = useMutation({
        mutationFn: async () => (await api.post(`/communications/${channel}/send-results`, { type: resType, id: resId })).data,
        onSuccess: (d: any) => { toast.success(`Results sent to ${d.recipients} parent(s) (${d.sent} ok, ${d.failed} failed).`); setResId(""); qc.invalidateQueries({ queryKey: ["comm_logs", channel] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not send results"),
    });

    const { data: status } = useQuery({
        queryKey: ["comm_status"],
        queryFn: async () => (await api.get("/communications/status")).data,
        refetchInterval: 0,
    });
    const chStatus = status?.[channel];
    const counts = chStatus?.counts || {};

    const { data: logs = [] } = useQuery({
        queryKey: ["comm_logs", channel],
        queryFn: async () => { const r = await api.get(`/communications/${channel}/logs`); return Array.isArray(r.data) ? r.data : []; },
    });

    const manualList = () => manual.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);

    const send = useMutation({
        mutationFn: async () => {
            const body: any = { message };
            if (recipientMode === "person") {
                const dest = isEmail ? person?.email : person?.phone;
                if (!dest) throw new Error(isEmail ? "Pick a person with an email" : "Pick a person with a phone number");
                body.to = [dest];
            } else {
                body.audience = audience;
                if (manualList().length) body.to = manualList();
            }
            if (isEmail) body.subject = subject;
            return (await api.post(`/communications/${channel}/send`, body)).data;
        },
        onSuccess: (d: any) => {
            toast.success(`Sent: ${d.sent}, Failed: ${d.failed}`);
            setMessage(""); setSubject("");
            qc.invalidateQueries({ queryKey: ["comm_logs", channel] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Send failed"),
    });

    const test = useMutation({
        mutationFn: async () => (await api.post(`/communications/${channel}/test`, { to: testTo })).data,
        onSuccess: (d: any) => { toast.success(d.sent ? "Test sent" : `Test failed: ${d.results?.[0]?.error || ""}`); qc.invalidateQueries({ queryKey: ["comm_logs", channel] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Test failed"),
    });

    const notConfigured = chStatus && !chStatus.configured;
    const disabled = chStatus && chStatus.configured && !chStatus.enabled;

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${accent}1a` }}>
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800">{isEmail ? "Email" : "WhatsApp"} Broadcast</h1>
                    <p className="text-xs text-slate-500">Send {isEmail ? "emails" : "WhatsApp messages"} to students, parents or staff</p>
                </div>
            </div>

            {/* Gateway status */}
            {notConfigured && (
                <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    {isEmail
                        ? <>Email (SMTP) is not configured. <Link to="/integrations" className="underline font-black">Open Integrations →</Link></>
                        : <>WhatsApp is not connected. <Link to="/communications/whatsapp-integration" className="underline font-black">Scan the QR code →</Link></>}
                </div>
            )}
            {disabled && (
                <div className="mb-5 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <AlertTriangle className="w-4 h-4" /> {isEmail ? "Email" : "WhatsApp"} is configured but disabled.
                    <Link to={isEmail ? "/integrations" : "/communications/whatsapp-integration"} className="underline font-black">Enable it →</Link>
                </div>
            )}
            {chStatus?.configured && chStatus?.enabled && (
                <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    {isEmail ? "Gateway active and ready." : (chStatus?.provider === "qr" ? "Connected via scanned WhatsApp — ready to send." : "WhatsApp API active and ready.")}
                </div>
            )}

            {!isEmail && (
                <div className="flex gap-2 mb-5">
                    {([["compose", "Compose"], ["results", "Send Results"]] as const).map(([k, label]) => (
                        <button key={k} onClick={() => setMode(k)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${mode === k ? "text-white" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                            style={mode === k ? { background: accent, borderColor: accent } : {}}>
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {mode === "results" && !isEmail ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">Result type</label>
                            <div className="flex flex-wrap gap-2">
                                {([["exam", "Exam Results"], ["classTest", "Class Test"], ["cbc", "CBC Assessment"]] as const).map(([k, label]) => (
                                    <button key={k} onClick={() => { setResType(k); setResId(""); }}
                                        className="px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors"
                                        style={resType === k ? { background: accent, borderColor: accent, color: "white" } : { borderColor: "#e2e8f0", color: "#475569" }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Choose {resType === "exam" ? "exam" : resType === "classTest" ? "class test" : "CBC activity"}</label>
                            <select value={resId} onChange={e => setResId(e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]">
                                <option value="">— Select —</option>
                                {resList.map((s: any) => <option key={s.id} value={s.id}>{s.name}{s.subject ? ` · ${s.subject}` : ""}{s.learningArea ? ` · ${s.learningArea}` : ""}</option>)}
                            </select>
                        </div>
                        <p className="text-xs text-slate-400">A personalised WhatsApp message is generated for each learner and sent to their parent/guardian.</p>
                        <div className="flex justify-end">
                            <button onClick={() => resId && sendResults.mutate()} disabled={!resId || sendResults.isPending}
                                className="inline-flex items-center gap-2 h-10 px-6 rounded-lg text-white font-black text-xs uppercase tracking-widest disabled:opacity-50" style={{ background: accent }}>
                                {sendResults.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Results
                            </button>
                        </div>
                    </div>
                    <div />
                </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Composer */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                    <div>
                        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-3 w-fit">
                            {([["groups", "Groups"], ["person", "One person"]] as const).map(([k, label]) => (
                                <button key={k} onClick={() => setRecipientMode(k)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${recipientMode === k ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>{label}</button>
                            ))}
                        </div>

                        {recipientMode === "person" ? (
                            <ContactPicker channel={isEmail ? "email" : "whatsapp"} value={person} onChange={setPerson} />
                        ) : (
                        <>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Audience</label>
                        <div className="flex flex-wrap gap-2">
                            {AUDIENCES.map(a => (
                                <button key={a.key} onClick={() => setAudience(a.key)}
                                    className="px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors"
                                    style={audience === a.key ? { background: accent, borderColor: accent, color: "white" } : { borderColor: "#e2e8f0", color: "#475569" }}>
                                    {a.label} <span className="opacity-70">({counts[a.key] ?? "…"})</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-4">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Extra recipients (optional)</label>
                            <textarea value={manual} onChange={e => setManual(e.target.value)} rows={2}
                                placeholder={isEmail ? "extra@email.com, another@email.com" : "0712345678, 0723456789"}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
                        </div>
                        </>
                        )}
                    </div>

                    {isEmail && (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Subject</label>
                            <input value={subject} onChange={e => setSubject(e.target.value)}
                                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <label className="block text-xs font-bold text-slate-600">Message</label>
                            {isEmail && <TemplatePicker channel="email" align="right" onPick={t => { setSubject(t.subject || ""); setMessage(t.body); }} />}
                        </div>
                        {openPlaceholders(`${subject} ${message}`).length > 0 && (
                            <p className="mb-1 text-xs text-amber-600 font-semibold">Replace {openPlaceholders(`${subject} ${message}`).join(", ")} before sending — this broadcast sends the same text to everyone.</p>
                        )}
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
                            placeholder="Type your message…"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
                    </div>

                    <div className="flex justify-end">
                        <button onClick={() => send.mutate()} disabled={send.isPending || !message || (isEmail && !subject) || (recipientMode === "person" && !(isEmail ? person?.email : person?.phone))}
                            className="inline-flex items-center gap-2 h-10 px-6 rounded-lg text-white font-black text-xs uppercase tracking-widest disabled:opacity-50"
                            style={{ background: accent }}>
                            {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {recipientMode === "person" ? `Send to ${person?.name || "person"}` : "Send Broadcast"}
                        </button>
                    </div>
                </div>

                {/* Test + logs */}
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <p className="text-sm font-black text-slate-700 mb-2 flex items-center gap-1.5"><Beaker className="w-4 h-4 text-slate-400" /> Send a test</p>
                        <input value={testTo} onChange={e => setTestTo(e.target.value)}
                            placeholder={isEmail ? "you@email.com" : "0712345678"}
                            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:border-[#5C67F2]" />
                        <button onClick={() => test.mutate()} disabled={test.isPending || !testTo}
                            className="w-full h-9 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold disabled:opacity-50 hover:bg-slate-50">
                            {test.isPending ? "Sending…" : "Send test"}
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100"><p className="text-sm font-black text-slate-700">Recent</p></div>
                        <div className="max-h-80 overflow-y-auto">
                            {logs.length === 0 ? (
                                <p className="text-center text-slate-400 text-xs py-6">No messages sent yet.</p>
                            ) : logs.map((l: any) => (
                                <div key={l._id} className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{l.to}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{l.subject || l.message}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${l.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{l.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}
