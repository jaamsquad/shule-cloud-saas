import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { sms } from "@/lib/smsApi";
import SmsDevices from "./SmsDevices";
import SmsConnection from "./SmsConnection";
import SmsResults from "./SmsResults";
import { ContactPicker, type Contact } from "./ContactPicker";

const MAX_CHARS = 160;

// Each group maps to an audience key the backend's resolvePhones understands
// (students | parents | staff). Class-specific resolves numbers client-side.
const RECIPIENT_GROUPS = [
    { key: "all_students", audience: "students", label: "All Students" },
    { key: "all_parents", audience: "parents", label: "All Parents / Guardians" },
    { key: "all_staff", audience: "staff", label: "All Staff" },
    { key: "all_teachers", audience: "staff", label: "All Teachers" },
    { key: "class_specific", audience: "", label: "Specific Class" },
];

export default function BulkSMS() {
    const [message, setMessage] = useState("");
    const [recipientMode, setRecipientMode] = useState<"groups" | "person">("groups");
    const [person, setPerson] = useState<Contact | null>(null);
    const [selectedGroups, setSelectedGroups] = useState<string[]>(["all_students"]);
    const [selectedClass, setSelectedClass] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [tab, setTab] = useState<"connection" | "compose" | "results" | "history" | "devices">("connection");

    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: logData, refetch } = useQuery({ queryKey: ["sms_jobs"], queryFn: sms.logs, refetchInterval: tab === "history" ? 5000 : false });
    const logs = logData?.jobs || [];

    const toggleGroup = (key: string) => setSelectedGroups(prev => prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]);

    const classNumbers = () => students
        .filter((s: any) => s.studentClass === selectedClass || s.classId === selectedClass || s.currentClass === selectedClass)
        .flatMap((s: any) => [s.parentPhone, s.fatherPhone, s.motherPhone, s.phone].filter(Boolean));

    const estimateRecipients = () => {
        let count = 0;
        if (selectedGroups.includes("all_students") || selectedGroups.includes("all_parents")) count += students.length;
        if (selectedGroups.includes("all_staff") || selectedGroups.includes("all_teachers")) count += 20;
        if (selectedGroups.includes("class_specific") && selectedClass) count += classNumbers().length;
        return Math.max(count, 0);
    };

    const handleSend = async () => {
        if (!message.trim()) { toast.error("Message is required"); return; }
        if (recipientMode === "person" && !person?.phone) { toast.error("Pick a person with a phone number"); return; }
        if (recipientMode === "groups" && selectedGroups.length === 0) { toast.error("Select at least one recipient group"); return; }
        setIsSending(true);
        try {
            const audiences = recipientMode === "person" ? [] : Array.from(new Set(
                selectedGroups.map(k => RECIPIENT_GROUPS.find(g => g.key === k)?.audience).filter(Boolean) as string[]
            ));
            const to = recipientMode === "person"
                ? [person!.phone!]
                : (selectedGroups.includes("class_specific") ? classNumbers() : []);
            const res = await sms.send({ message: message.trim(), audiences, to, scheduledAt: scheduledAt || null });
            if (res.provider === "device") {
                toast.success(scheduledAt ? `Scheduled ${res.queued} message(s)` : `Queued ${res.queued} message(s) to your connected phone${res.onlineDevices === 0 ? " — no phone is online yet" : ""}`);
            } else {
                toast.success(`API gateway: ${res.sent || 0} sent, ${res.failed || 0} failed`);
            }
            refetch();
            setMessage("");
            setTab("history");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to send SMS. Check SMS gateway settings.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-500">Communications</span><span className="text-gray-300">/</span>
                    <span className="font-semibold text-[#5C67F2]">Bulk SMS</span>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Bulk SMS</h1>
                    <p className="text-slate-400 text-sm mt-1">Send SMS messages to students, parents, and staff.</p>
                </div>

                <div className="flex gap-2 mb-6 flex-wrap">
                    {[{ key: "connection", label: "Connection" }, { key: "compose", label: "Compose" }, { key: "results", label: "Send Results" }, { key: "history", label: `History (${logs.length})` }, { key: "devices", label: "Devices & Provider" }].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab === t.key ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === "connection" && <SmsConnection onOpenDashboard={() => setTab("devices")} />}

                {tab === "results" && <SmsResults />}

                {tab === "devices" && <SmsDevices />}

                {tab === "compose" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Recipient selection */}
                        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6">
                            <h3 className="text-sm font-semibold text-slate-800 mb-1">Recipients</h3>
                            <p className="text-xs text-slate-400 mb-3">Choose who receives this message.</p>

                            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-4">
                                {([["groups", "Groups"], ["person", "One person"]] as const).map(([k, label]) => (
                                    <button key={k} onClick={() => setRecipientMode(k)} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${recipientMode === k ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>{label}</button>
                                ))}
                            </div>

                            {recipientMode === "person" ? (
                                <ContactPicker channel="sms" value={person} onChange={setPerson} />
                            ) : (
                            <>
                            <div className="space-y-2">
                                {RECIPIENT_GROUPS.map(g => (
                                    <label key={g.key} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-colors ${selectedGroups.includes(g.key) ? "border-[#5C67F2] bg-indigo-50/60" : "border-slate-200 hover:bg-slate-50"}`}>
                                        <input type="checkbox" checked={selectedGroups.includes(g.key)} onChange={() => toggleGroup(g.key)} className="w-4 h-4 accent-[#5C67F2]" />
                                        <span className="text-sm font-medium text-slate-700">{g.label}</span>
                                    </label>
                                ))}
                            </div>
                            {selectedGroups.includes("class_specific") && (
                                <div className="mt-4">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Select class</label>
                                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm text-slate-700">
                                        <option value="">— Choose class —</option>
                                        {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.className || c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="mt-5 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                                <span className="text-xs font-semibold text-slate-500">Estimated recipients</span>
                                <span className="text-xl font-bold text-slate-800">~{estimateRecipients()}</span>
                            </div>
                            </>
                            )}
                        </div>

                        {/* Compose */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <label className="block text-sm font-semibold text-slate-800 mb-2">Message</label>
                                <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))} rows={6} placeholder="Type your SMS message here…"
                                    className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm text-slate-700 resize-none" />
                                <div className="flex justify-between mt-2 text-xs text-slate-400">
                                    <span className={message.length > MAX_CHARS * 0.9 ? "text-rose-500 font-semibold" : ""}>{message.length}/{MAX_CHARS} characters</span>
                                    <span>{Math.ceil(message.length / MAX_CHARS) || 1} SMS</span>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 mb-2">Quick templates</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            "Dear Parent, your child's fees are due. Please clear the balance. Thank you.",
                                            "School reopens on Monday. Ensure your child has all required materials.",
                                            "Parent-teacher meeting scheduled for Saturday 10AM. Please attend.",
                                        ].map((t, i) => (
                                            <button key={i} onClick={() => setMessage(t)} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium transition-colors">
                                                Template {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <label className="block text-sm font-semibold text-slate-800 mb-2">Schedule <span className="font-normal text-slate-400">(optional)</span></label>
                                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                                <p className="text-xs text-slate-400 mt-1.5">Leave empty to send now. Scheduled messages are released automatically when due.</p>
                            </div>

                            <button onClick={handleSend} disabled={isSending || !message.trim() || (recipientMode === "groups" ? selectedGroups.length === 0 : !person?.phone)}
                                className="w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-semibold text-sm rounded-lg transition-colors">
                                {isSending ? "Sending…" : recipientMode === "person"
                                    ? `${scheduledAt ? "Schedule" : "Send"} to ${person?.name || "1 person"}`
                                    : `${scheduledAt ? "Schedule" : "Send"} to ~${estimateRecipients()} recipients`}
                            </button>
                        </div>
                    </div>
                )}

                {tab === "history" && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">SMS History</h3>
                            <button onClick={() => refetch()} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
                        </div>
                        {logs.length === 0 ? (
                            <p className="text-center text-slate-300 text-xs font-bold uppercase py-12">No SMS sent yet</p>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log: any) => {
                                    const color = ({ delivered: "bg-emerald-50 text-emerald-600", sent: "bg-emerald-50 text-emerald-600", sending: "bg-blue-50 text-blue-600", queued: "bg-amber-50 text-amber-600", scheduled: "bg-violet-50 text-violet-600", failed: "bg-rose-50 text-rose-500" } as any)[log.status] || "bg-slate-100 text-slate-500";
                                    return (
                                        <div key={log._id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-700 truncate">{log.message}</p>
                                                    <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-400 font-bold uppercase flex-wrap">
                                                        <span>{log.phone}</span>
                                                        {log.audience && <span>{log.audience}</span>}
                                                        <span>{new Date(log.scheduledAt || log.createdAt).toLocaleString("en-GB")}</span>
                                                        {log.error && <span className="text-rose-400 normal-case">{log.error}</span>}
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase flex-shrink-0 ${color}`}>{log.status}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
