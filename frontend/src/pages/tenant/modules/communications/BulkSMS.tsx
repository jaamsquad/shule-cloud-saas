import { useState } from "react";
import { Home, Send, Loader2, MessageSquare, Users, RefreshCw, CheckCircle2, Smartphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { sms } from "@/lib/smsApi";
import SmsDevices from "./SmsDevices";
import SmsConnection from "./SmsConnection";

const MAX_CHARS = 160;

// Each group maps to an audience key the backend's resolvePhones understands
// (students | parents | staff). Class-specific resolves numbers client-side.
const RECIPIENT_GROUPS = [
    { key: "all_students", audience: "students", label: "All Students", icon: "🎓" },
    { key: "all_parents", audience: "parents", label: "All Parents / Guardians", icon: "👨‍👩‍👧" },
    { key: "all_staff", audience: "staff", label: "All Staff", icon: "👔" },
    { key: "all_teachers", audience: "staff", label: "All Teachers", icon: "📚" },
    { key: "class_specific", audience: "", label: "Specific Class", icon: "🏫" },
];

export default function BulkSMS() {
    const [message, setMessage] = useState("");
    const [selectedGroups, setSelectedGroups] = useState<string[]>(["all_students"]);
    const [selectedClass, setSelectedClass] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [tab, setTab] = useState<"connection" | "compose" | "history" | "devices">("connection");

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
        if (selectedGroups.length === 0) { toast.error("Select at least one recipient group"); return; }
        setIsSending(true);
        try {
            const audiences = Array.from(new Set(
                selectedGroups.map(k => RECIPIENT_GROUPS.find(g => g.key === k)?.audience).filter(Boolean) as string[]
            ));
            const to = selectedGroups.includes("class_specific") ? classNumbers() : [];
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
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Communications</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Bulk SMS</span>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <MessageSquare className="w-7 h-7 text-[#5C67F2]" /> Bulk SMS
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Send SMS messages to students, parents, and staff</p>
                </div>

                <div className="flex gap-2 mb-6">
                    {[{ key: "connection", label: "Connection" }, { key: "compose", label: "Compose" }, { key: "history", label: `History (${logs.length})` }, { key: "devices", label: "Devices & Provider" }].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)} className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide border transition-all flex items-center gap-1.5 ${tab === t.key ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>
                            {t.key === "devices" && <Smartphone className="w-3.5 h-3.5" />}{t.label}
                        </button>
                    ))}
                </div>

                {tab === "connection" && <SmsConnection onOpenDashboard={() => setTab("devices")} />}

                {tab === "devices" && <SmsDevices />}

                {tab === "compose" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recipient selection */}
                        <div className="lg:col-span-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-[#5C67F2]" />Select Recipients</h3>
                            <div className="space-y-2">
                                {RECIPIENT_GROUPS.map(g => (
                                    <button key={g.key} onClick={() => toggleGroup(g.key)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${selectedGroups.includes(g.key) ? "border-[#5C67F2] bg-indigo-50" : "border-slate-100 bg-white hover:border-indigo-200"}`}>
                                        <span className="text-lg">{g.icon}</span>
                                        <span className="text-xs font-bold text-slate-700">{g.label}</span>
                                        {selectedGroups.includes(g.key) && <CheckCircle2 className="w-4 h-4 text-[#5C67F2] ml-auto" />}
                                    </button>
                                ))}
                            </div>
                            {selectedGroups.includes("class_specific") && (
                                <div className="relative mt-4">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Select Class</div>
                                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Choose class —</option>
                                        {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.className || c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="mt-4 bg-indigo-50 rounded-2xl p-3 text-center border border-indigo-100">
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Estimated Recipients</p>
                                <p className="text-2xl font-black text-[#5C67F2]">~{estimateRecipients()}</p>
                            </div>
                        </div>

                        {/* Compose */}
                        <div className="lg:col-span-2 space-y-5">
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Compose Message</h3>
                                <div className="relative">
                                    <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))} rows={5} placeholder="Type your SMS message here..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-sm text-slate-700 resize-none" />
                                    <div className="flex justify-between mt-2">
                                        <span className={`text-[9px] font-black ${message.length > MAX_CHARS * 0.9 ? "text-rose-500" : "text-slate-400"} uppercase`}>{message.length}/{MAX_CHARS} characters</span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">{Math.ceil(message.length / MAX_CHARS)} SMS message(s)</span>
                                    </div>
                                </div>

                                {/* Quick templates */}
                                <div className="mt-4">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Quick Templates</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            "Dear Parent, your child's fees are due. Please clear balance. Thank you.",
                                            "School reopens on Monday. Ensure your child has all required materials.",
                                            "Parent-teacher meeting scheduled for Saturday 10AM. Please attend.",
                                        ].map((t, i) => (
                                            <button key={i} onClick={() => setMessage(t)} className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-[#5C67F2] border border-slate-100 hover:border-indigo-200 rounded-xl text-[9px] font-bold transition-all">
                                                Template {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Schedule (optional)</p>
                                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                                <p className="text-[10px] text-slate-400 mt-1.5">Leave empty to send now. Scheduled messages are released automatically when due.</p>
                            </div>

                            <button onClick={handleSend} disabled={isSending || !message.trim() || selectedGroups.length === 0}
                                className="w-full h-14 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 transition-all">
                                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {scheduledAt ? "Schedule" : "Send"} to ~{estimateRecipients()} Recipients
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
