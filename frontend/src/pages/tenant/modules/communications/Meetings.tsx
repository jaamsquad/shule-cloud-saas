import { useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    CalendarDays, ChevronLeft, ChevronRight, Plus, MapPin, Clock, Video, Users, MessageSquare, Mail, Send, Pencil, Ban, Trash2,
    BellRing, UserPlus, X, Search, CheckCircle2, AlertTriangle, History,
} from "lucide-react";
import api from "@/lib/api";
import { FCard, FButton, FField, FInput, FSelect, inputCls, FModal, FEmpty, FLoading, FBadge, FStat, Tone } from "@/components/fees/FeesUI";
import TemplatePicker, { CommApiBase } from "@/components/comm/TemplatePicker";
import { CommShell } from "./MessageTemplates";

// Communication → Meetings: the school calendar. Create a meeting, choose who is invited
// (staff, teachers, parents — all or by class — and anyone picked by hand), then notify
// them by SMS and/or email with one click. Optional automatic reminder before it starts.

const TYPES = ["Staff meeting", "Parents meeting (PTA)", "Board meeting", "Class meeting", "Department meeting", "Academic clinic", "Other"];
const COLORS = ["#5C67F2", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];
const CATS = [
    { key: "teachers", label: "Teachers", hint: "Teaching staff" },
    { key: "staff", label: "All staff", hint: "Teaching & support staff" },
    { key: "parents", label: "Parents", hint: "All, or of chosen classes" },
];
const REMINDERS = [{ v: 0, l: "No reminder" }, { v: 30, l: "30 minutes before" }, { v: 60, l: "1 hour before" }, { v: 180, l: "3 hours before" }, { v: 1440, l: "1 day before" }, { v: 2880, l: "2 days before" }];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sameDay = (a: Date, b: Date) => ymd(a) === ymd(b);
const fmtDay = (d: any) => new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtTime = (d: any) => new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const fmtWhen = (d: any) => new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

interface Contact { id: string; name: string; role: string; phone?: string; email?: string; meta?: string }
interface MForm {
    _id?: string; title: string; type: string; date: string; startTime: string; endTime: string; location: string;
    mode: string; link: string; description: string; color: string;
    categories: string[]; classNames: string[]; custom: Contact[];
    reminderMinutes: number; reminderSms: boolean; reminderEmail: boolean;
}
const blank = (d = new Date()): MForm => ({
    title: "", type: "Staff meeting", date: ymd(d), startTime: "14:00", endTime: "15:00", location: "", mode: "in-person", link: "", description: "", color: COLORS[0],
    categories: ["teachers"], classNames: [], custom: [], reminderMinutes: 0, reminderSms: true, reminderEmail: true,
});
const fromMeeting = (m: any): MForm => {
    const s = new Date(m.start), e = new Date(m.end);
    return {
        _id: m._id, title: m.title, type: m.type, date: ymd(s), startTime: hm(s), endTime: hm(e), location: m.location || "", mode: m.mode || "in-person", link: m.link || "",
        description: m.description || "", color: m.color || COLORS[0], categories: m.audience?.categories || [], classNames: m.audience?.classNames || [], custom: m.audience?.custom || [],
        reminderMinutes: m.reminder?.minutesBefore || 0, reminderSms: m.reminder ? !!m.reminder.sms : true, reminderEmail: m.reminder ? !!m.reminder.email : true,
    };
};
const toBody = (f: MForm) => ({
    title: f.title, type: f.type, location: f.location, mode: f.mode, link: f.link, description: f.description, color: f.color,
    start: new Date(`${f.date}T${f.startTime}`).toISOString(), end: new Date(`${f.date}T${f.endTime}`).toISOString(),
    audience: { categories: f.categories, classNames: f.categories.includes("parents") ? f.classNames : [], custom: f.custom },
    reminder: f.reminderMinutes ? { minutesBefore: f.reminderMinutes, sms: f.reminderSms, email: f.reminderEmail } : null,
});
const audienceLabel = (a: any) => {
    const parts: string[] = [];
    if (a?.categories?.includes("staff")) parts.push("All staff"); else if (a?.categories?.includes("teachers")) parts.push("Teachers");
    if (a?.categories?.includes("parents")) parts.push(a.classNames?.length ? `Parents of ${a.classNames.join(", ")}` : "All parents");
    if (a?.custom?.length) parts.push(`${a.custom.length} picked`);
    return parts.join(" · ") || "Nobody yet";
};

// ── People picker (multi) ────────────────────────────────────────────────────
function PeoplePicker({ value, onChange }: { value: Contact[]; onChange: (v: Contact[]) => void }) {
    const base = useContext(CommApiBase);
    const [q, setQ] = useState("");
    const [type, setType] = useState("all");
    const { data = [], isFetching } = useQuery<Contact[]>({
        queryKey: ["comm_contacts", q, type], enabled: q.trim().length >= 2,
        queryFn: async () => (await api.get(`${base}/communications/contacts`, { params: { q, type } })).data || [],
    });
    const chosen = new Set(value.map(v => v.id));
    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <FInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search a teacher, staff member or parent…" className="pl-9" />
                </div>
                <div className="w-36 shrink-0"><FSelect value={type} onChange={e => setType(e.target.value)}>
                    <option value="all">Everyone</option><option value="staff">Staff</option><option value="teachers">Teachers</option><option value="parents">Parents</option>
                </FSelect></div>
            </div>
            {q.trim().length >= 2 && (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                    {isFetching && !data.length ? <p className="text-xs text-slate-400 p-3">Searching…</p>
                        : !data.length ? <p className="text-xs text-slate-400 p-3">Nobody found.</p>
                        : data.map(c => (
                            <button key={c.id} type="button" disabled={chosen.has(c.id)} onClick={() => onChange([...value, c])}
                                className="w-full text-left px-3 py-2 hover:bg-indigo-50/60 disabled:opacity-40 flex items-center gap-2">
                                <UserPlus className="w-3.5 h-3.5 text-[#5C67F2] shrink-0" />
                                <span className="text-sm font-semibold text-slate-700 truncate">{c.name}</span>
                                <span className="text-[11px] text-slate-400 truncate">{c.role}{c.meta ? ` · ${c.meta}` : ""}</span>
                                <span className="ml-auto text-[10px] text-slate-400 shrink-0">{[c.phone && "SMS", c.email && "Email"].filter(Boolean).join(" · ") || "no contact"}</span>
                            </button>
                        ))}
                </div>
            )}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map(c => (
                        <span key={c.id} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-lg bg-indigo-50 text-[#5C67F2] text-xs font-semibold">
                            {c.name}<span className="text-indigo-300 font-normal">· {c.role}</span>
                            <button type="button" onClick={() => onChange(value.filter(v => v.id !== c.id))} className="w-5 h-5 rounded hover:bg-indigo-100 flex items-center justify-center"><X className="w-3 h-3" /></button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Notify panel ─────────────────────────────────────────────────────────────
function NotifyPanel({ meeting, onSent }: { meeting: any; onSent: () => void }) {
    const base = useContext(CommApiBase);
    const cancelled = meeting.status === "cancelled";
    const sentBefore = (meeting.notifications || []).length > 0;
    const [kind, setKind] = useState<string>(cancelled ? "cancel" : sentBefore ? "reminder" : "invite");
    const [useSms, setUseSms] = useState(true);
    const [useEmail, setUseEmail] = useState(true);
    const [smsText, setSmsText] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [tplIds, setTplIds] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    useEffect(() => { setKind(cancelled ? "cancel" : sentBefore ? "reminder" : "invite"); }, [meeting._id, cancelled]);

    const { data: preview, isLoading } = useQuery<any>({
        queryKey: ["meeting_recipients", meeting._id, JSON.stringify(meeting.audience)],
        queryFn: async () => (await api.post(`${base}/meetings/recipients/preview`, { audience: meeting.audience })).data,
    });

    const send = async () => {
        if (!useSms && !useEmail) return toast.error("Tick SMS, email or both");
        if (!confirm(`Send this ${kind} to ${preview?.total ?? "the"} invited people?`)) return;
        setSending(true);
        try {
            const r = await api.post(`${base}/meetings/${meeting._id}/notify`, { kind, sms: useSms, email: useEmail, smsText: smsText || undefined, emailSubject: emailSubject || undefined, emailBody: emailBody || undefined, templateIds: tplIds });
            const d = r.data;
            const parts = [d.sms && `SMS: ${d.sms.sent + d.sms.queued} sent/queued${d.sms.failed ? `, ${d.sms.failed} failed` : ""}`, d.email && `Email: ${d.email.sent} sent${d.email.failed ? `, ${d.email.failed} failed` : ""}`].filter(Boolean);
            (d.sms?.failed || d.email?.failed ? toast.warning : toast.success)(parts.join(" · ") || "Sent", { duration: 7000 });
            if (d.email?.error) toast.error(`Email: ${d.email.error}`, { duration: 8000 });
            onSent();
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not send"); }
        finally { setSending(false); }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
                <FStat label="Invited" value={preview?.total ?? "…"} icon={Users} loading={isLoading} />
                <FStat label="SMS" value={preview?.withPhone ?? "…"} icon={MessageSquare} tone="emerald" loading={isLoading} />
                <FStat label="Email" value={preview?.withEmail ?? "…"} icon={Mail} tone="sky" loading={isLoading} />
            </div>
            {preview?.byRole && <p className="text-xs text-slate-500">{Object.entries(preview.byRole).map(([r, n]) => `${n} ${r.toLowerCase()}${Number(n) === 1 ? "" : "s"}`).join(" · ")}</p>}

            <div className="flex flex-wrap gap-1.5">
                {(cancelled ? [["cancel", "Cancellation"]] : [["invite", "Invitation"], ["reminder", "Reminder"], ["update", "Update / change"]]).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setKind(k)} className={`h-8 px-3 rounded-lg text-xs font-semibold border ${kind === k ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-600 border-slate-200"}`}>{l}</button>
                ))}
            </div>

            <div className="rounded-xl border border-slate-200">
                <label className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-100 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={useSms} onChange={e => setUseSms(e.target.checked)} /><MessageSquare className="w-4 h-4 text-emerald-600" /> SMS</span>
                    {useSms && <span onClick={e => e.preventDefault()}><TemplatePicker channel="sms" align="right" onPick={t => { setSmsText(t.body); setTplIds(ids => [...ids, t._id]); }} /></span>}
                </label>
                {useSms && (
                    <div className="p-3">
                        <textarea rows={3} value={smsText} onChange={e => setSmsText(e.target.value)} className={`${inputCls} h-auto py-2`} placeholder="Leave empty for the standard wording — e.g. “Dear {name}, you are invited to {title} on {date} at {time}, {location}.”" />
                        <p className="text-[11px] text-slate-400 mt-1">{smsText.length} chars · {"{name} {title} {date} {time} {location} {link} {school}"} are filled for each person.</p>
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-slate-200">
                <label className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-100 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={useEmail} onChange={e => setUseEmail(e.target.checked)} /><Mail className="w-4 h-4 text-sky-600" /> Email</span>
                    {useEmail && <span onClick={e => e.preventDefault()}><TemplatePicker channel="email" align="right" onPick={t => { setEmailSubject(t.subject || ""); setEmailBody(t.body); setTplIds(ids => [...ids, t._id]); }} /></span>}
                </label>
                {useEmail && (
                    <div className="p-3 space-y-2">
                        <FInput value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject (empty = “Invitation: {title} — {date}”)" />
                        <textarea rows={5} value={emailBody} onChange={e => setEmailBody(e.target.value)} className={`${inputCls} h-auto py-2`} placeholder="Leave empty for the standard invitation with date, time, venue and the description." />
                    </div>
                )}
            </div>

            <FButton className="w-full" icon={Send} loading={sending} disabled={!preview?.total} onClick={send}>
                Send {kind === "cancel" ? "cancellation" : kind} to {preview?.total ?? 0} {preview?.total === 1 ? "person" : "people"}
            </FButton>
        </div>
    );
}

export default function Meetings({ section }: { section?: "secretary" } = {}) {
    const qc = useQueryClient();
    const base = useContext(CommApiBase);
    const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
    const [form, setForm] = useState<MForm | null>(null);
    const [saving, setSaving] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);

    // Calendar range: the 6 weeks shown
    const gridStart = useMemo(() => { const d = new Date(cursor); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d; }, [cursor]);
    const days = useMemo(() => Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(d.getDate() + i); return d; }), [gridStart]);
    const rangeEnd = days[41];
    const { data: meetings = [], isLoading } = useQuery<any[]>({
        queryKey: ["meetings", ymd(gridStart)],
        queryFn: async () => { const to = new Date(rangeEnd); to.setDate(to.getDate() + 1); return (await api.get(`${base}/meetings`, { params: { from: gridStart.toISOString(), to: to.toISOString() } })).data || []; },
    });
    const { data: upcoming = [] } = useQuery<any[]>({
        queryKey: ["meetings_upcoming"],
        queryFn: async () => (await api.get(`${base}/meetings`, { params: { from: new Date().toISOString() } })).data || [],
    });
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const open = useMemo(() => [...meetings, ...upcoming].find(m => m._id === openId) || null, [meetings, upcoming, openId]);
    const refresh = () => { qc.invalidateQueries({ queryKey: ["meetings"] }); qc.invalidateQueries({ queryKey: ["meetings_upcoming"] }); };

    const byDay = useMemo(() => {
        const m: Record<string, any[]> = {};
        meetings.forEach(x => { (m[ymd(new Date(x.start))] ||= []).push(x); });
        return m;
    }, [meetings]);

    const save = async (andNotify = false) => {
        if (!form) return;
        if (!form.title.trim()) return toast.error("Give the meeting a title");
        if (form.endTime <= form.startTime) return toast.error("The meeting must end after it starts");
        if (!form.categories.length && !form.custom.length) return toast.error("Choose who is invited");
        setSaving(true);
        try {
            let id = form._id;
            if (id) { const r = await api.put(`${base}/meetings/${id}`, toBody(form)); if (r.data?.rescheduled) toast.info("Date changed — send an update so people know."); }
            else id = (await api.post(`${base}/meetings`, toBody(form))).data._id;
            toast.success(form._id ? "Meeting saved" : "Meeting created");
            setForm(null); refresh();
            if (andNotify && id) setOpenId(String(id));
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not save"); }
        finally { setSaving(false); }
    };
    const cancelMeeting = async (m: any) => {
        if (!confirm(`Cancel "${m.title}"? You can then send a cancellation notice.`)) return;
        try { await api.post(`${base}/meetings/${m._id}/cancel`); toast.success("Meeting cancelled — you can notify people below."); refresh(); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    };
    const deleteMeeting = async (m: any) => {
        if (!confirm(`Delete "${m.title}" from the calendar?`)) return;
        try { await api.delete(`${base}/meetings/${m._id}`); toast.success("Deleted"); setOpenId(null); refresh(); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    };

    const today = new Date();
    const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const thisMonth = meetings.filter(m => new Date(m.start).getMonth() === cursor.getMonth() && m.status !== "cancelled");
    const tone = (m: any): Tone => (m.status === "cancelled" ? "rose" : new Date(m.end) < today ? "slate" : "emerald");

    return (
        <CommShell active="meetings" title={section === "secretary" ? "Meeting Management" : "Meetings"} icon={CalendarDays}
            section={section === "secretary" ? "Secretary" : "Communication"} nav={section !== "secretary"}
            subtitle="The school calendar — plan meetings and notify staff and parents by SMS or email."
            actions={<FButton icon={Plus} onClick={() => setForm(blank())}>New meeting</FButton>}>
            <div className="grid lg:grid-cols-[1fr_320px] gap-5">
                {/* Calendar */}
                <FCard bodyClassName="p-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><ChevronRight className="w-4 h-4" /></button>
                            <h2 className="text-base font-bold text-slate-800 ml-2">{monthLabel}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 hidden sm:inline">{thisMonth.length} meeting{thisMonth.length === 1 ? "" : "s"}</span>
                            <FButton size="sm" variant="secondary" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</FButton>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
                        {WEEKDAYS.map(w => <div key={w} className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center sm:text-left">{w}</div>)}
                    </div>
                    {isLoading ? <FLoading /> : (
                        <div className="grid grid-cols-7">
                            {days.map((d, i) => {
                                const inMonth = d.getMonth() === cursor.getMonth();
                                const list = byDay[ymd(d)] || [];
                                const isToday = sameDay(d, today);
                                return (
                                    <div key={i} onClick={() => setForm(blank(d))}
                                        className={`min-h-[64px] sm:min-h-[104px] p-1 sm:p-1.5 border-b border-r border-slate-100 cursor-pointer hover:bg-indigo-50/30 transition-colors ${i % 7 === 6 ? "border-r-0" : ""} ${inMonth ? "bg-white" : "bg-slate-50/50"}`}>
                                        <div className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center mb-0.5 ${isToday ? "bg-[#5C67F2] text-white" : inMonth ? "text-slate-700" : "text-slate-300"}`}>{d.getDate()}</div>
                                        <div className="space-y-0.5">
                                            {list.slice(0, 3).map(m => (
                                                <button key={m._id} onClick={e => { e.stopPropagation(); setOpenId(m._id); }}
                                                    className={`w-full text-left rounded-md px-1.5 py-0.5 text-[11px] font-semibold truncate text-white ${m.status === "cancelled" ? "opacity-50 line-through" : ""}`}
                                                    style={{ background: m.color || "#5C67F2" }} title={`${fmtTime(m.start)} ${m.title}`}>
                                                    <span className="hidden sm:inline opacity-80 mr-1">{fmtTime(m.start)}</span>{m.title}
                                                </button>
                                            ))}
                                            {list.length > 3 && <p className="text-[10px] text-slate-400 font-semibold px-1">+{list.length - 3} more</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </FCard>

                {/* Upcoming */}
                <FCard title="Upcoming" subtitle="Next meetings" icon={Clock} bodyClassName="p-0">
                    {!upcoming.filter(m => m.status !== "cancelled").length ? <FEmpty icon={CalendarDays} title="Nothing planned" hint="Click a day on the calendar to add a meeting." /> : (
                        <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
                            {upcoming.filter(m => m.status !== "cancelled").slice(0, 20).map(m => (
                                <button key={m._id} onClick={() => setOpenId(m._id)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex gap-3">
                                    <div className="w-11 shrink-0 text-center rounded-lg py-1" style={{ background: `${m.color || "#5C67F2"}14`, color: m.color || "#5C67F2" }}>
                                        <p className="text-[10px] font-bold uppercase">{new Date(m.start).toLocaleDateString(undefined, { month: "short" })}</p>
                                        <p className="text-lg font-extrabold leading-tight">{new Date(m.start).getDate()}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{m.title}</p>
                                        <p className="text-xs text-slate-500">{fmtTime(m.start)} – {fmtTime(m.end)}{m.location ? ` · ${m.location}` : ""}</p>
                                        <p className="text-[11px] text-slate-400 truncate">{audienceLabel(m.audience)}</p>
                                        {!m.notifications?.length && <p className="text-[11px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Not notified yet</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </FCard>
            </div>

            {/* Create / edit */}
            <FModal open={!!form} onClose={() => setForm(null)} width="max-w-3xl" title={form?._id ? "Edit meeting" : "New meeting"} subtitle="Save it to the calendar, then notify the people invited."
                footer={<>
                    <FButton variant="secondary" onClick={() => setForm(null)}>Cancel</FButton>
                    <FButton variant="secondary" loading={saving} onClick={() => save(false)}>Save</FButton>
                    <FButton icon={Send} loading={saving} onClick={() => save(true)}>Save & notify…</FButton>
                </>}>
                {form && (
                    <div className="space-y-5">
                        <div className="grid sm:grid-cols-6 gap-3">
                            <FField label="Title" required className="sm:col-span-4"><FInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Term 2 staff meeting" autoFocus /></FField>
                            <FField label="Type" className="sm:col-span-2"><FSelect value={form.type} onChange={e => setForm({ ...form, type: e.target.value, categories: e.target.value === "Parents meeting (PTA)" && !form.categories.includes("parents") ? [...form.categories, "parents"] : form.categories })}>{TYPES.map(t => <option key={t}>{t}</option>)}</FSelect></FField>
                            <FField label="Date" required className="sm:col-span-2"><FInput type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></FField>
                            <FField label="Starts" required className="sm:col-span-2"><FInput type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></FField>
                            <FField label="Ends" required className="sm:col-span-2"><FInput type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></FField>
                            <FField label="Where" className="sm:col-span-2">
                                <FSelect value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}><option value="in-person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option></FSelect>
                            </FField>
                            <FField label="Venue" className="sm:col-span-2"><FInput value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Staff room, School hall…" /></FField>
                            <FField label="Online link" className="sm:col-span-2"><FInput value={form.link} disabled={form.mode === "in-person"} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://meet…" /></FField>
                            <FField label="Agenda / notes" className="sm:col-span-6"><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inputCls} h-auto py-2`} placeholder="Shown in the email invitation" /></FField>
                            <FField label="Colour" className="sm:col-span-6">
                                <div className="flex gap-2">{COLORS.map(c => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`w-7 h-7 rounded-full ${form.color === c ? "ring-2 ring-offset-2 ring-slate-400" : ""}`} style={{ background: c }} />)}</div>
                            </FField>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                            <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-[#5C67F2]" /> Who is invited</p>
                            <div className="grid sm:grid-cols-3 gap-2">
                                {CATS.map(c => {
                                    const on = form.categories.includes(c.key);
                                    return (
                                        <button key={c.key} type="button" onClick={() => setForm({ ...form, categories: on ? form.categories.filter(x => x !== c.key) : [...form.categories, c.key] })}
                                            className={`text-left rounded-xl border p-3 transition-colors ${on ? "border-[#5C67F2] bg-indigo-50/60" : "border-slate-200 hover:bg-slate-50"}`}>
                                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><input type="checkbox" readOnly checked={on} /> {c.label}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 pl-5">{c.hint}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            {form.categories.includes("parents") && (
                                <FField label="Parents of these classes" hint="None ticked = parents of every class.">
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {[...classes].sort((a: any, b: any) => a.level - b.level).map((c: any) => {
                                            const on = form.classNames.includes(c.name);
                                            return <button key={c._id} type="button" onClick={() => setForm({ ...form, classNames: on ? form.classNames.filter(x => x !== c.name) : [...form.classNames, c.name] })}
                                                className={`h-7 px-2.5 rounded-lg text-xs font-semibold border ${on ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-600 border-slate-200"}`}>{c.name}</button>;
                                        })}
                                    </div>
                                </FField>
                            )}
                            <FField label="Add people by hand (optional)"><PeoplePicker value={form.custom} onChange={v => setForm({ ...form, custom: v })} /></FField>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4 grid sm:grid-cols-3 gap-3 items-end">
                            <FField label="Automatic reminder" className="sm:col-span-1">
                                <FSelect value={form.reminderMinutes} onChange={e => setForm({ ...form, reminderMinutes: Number(e.target.value) })}>{REMINDERS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}</FSelect>
                            </FField>
                            {form.reminderMinutes > 0 && <>
                                <label className="flex items-center gap-2 h-10 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.reminderSms} onChange={e => setForm({ ...form, reminderSms: e.target.checked })} /> by SMS</label>
                                <label className="flex items-center gap-2 h-10 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.reminderEmail} onChange={e => setForm({ ...form, reminderEmail: e.target.checked })} /> by email</label>
                            </>}
                        </div>
                    </div>
                )}
            </FModal>

            {/* Meeting details + notify */}
            <FModal open={!!open} onClose={() => setOpenId(null)} width="max-w-4xl" title={open?.title || ""} subtitle={open ? `${open.type} · ${fmtDay(open.start)}` : ""}>
                {open && (
                    <div className="grid md:grid-cols-[1fr_1.15fr] gap-5">
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <FBadge tone={tone(open)}>{open.status === "cancelled" ? "Cancelled" : new Date(open.end) < today ? "Past" : "Scheduled"}</FBadge>
                                {open.reminder && <FBadge tone={open.reminder.sentAt ? "slate" : "violet"}><BellRing className="w-3 h-3" /> {open.reminder.sentAt ? "Reminder sent" : `Reminder ${REMINDERS.find(r => r.v === open.reminder.minutesBefore)?.l || ""}`}</FBadge>}
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                                <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> {fmtDay(open.start)}, {fmtTime(open.start)} – {fmtTime(open.end)}</p>
                                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {open.location || (open.mode === "online" ? "Online" : "—")}</p>
                                {open.link && <p className="flex items-center gap-2"><Video className="w-4 h-4 text-slate-400" /> <a href={open.link} target="_blank" rel="noreferrer" className="text-[#5C67F2] underline truncate">{open.link}</a></p>}
                                <p className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> {audienceLabel(open.audience)}</p>
                            </div>
                            {open.description && <p className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 rounded-xl p-3">{open.description}</p>}
                            <div className="flex flex-wrap gap-2">
                                <FButton size="sm" variant="secondary" icon={Pencil} onClick={() => { setForm(fromMeeting(open)); setOpenId(null); }}>Edit</FButton>
                                {open.status === "scheduled" && <FButton size="sm" variant="secondary" icon={Ban} onClick={() => cancelMeeting(open)}>Cancel meeting</FButton>}
                                <FButton size="sm" variant="ghost" icon={Trash2} onClick={() => deleteMeeting(open)}>Delete</FButton>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Notifications sent</p>
                                {!open.notifications?.length ? <p className="text-xs text-slate-400">None yet.</p> : (
                                    <div className="space-y-1.5">
                                        {[...open.notifications].reverse().map((n: any, i: number) => (
                                            <div key={i} className="text-xs rounded-lg border border-slate-100 px-3 py-2">
                                                <p className="font-semibold text-slate-700 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {n.kind} · {fmtWhen(n.at)} <span className="font-normal text-slate-400">by {n.by}</span></p>
                                                <p className="text-slate-500 mt-0.5">
                                                    {n.sms && `SMS ${n.sms.sent + n.sms.queued}/${n.sms.targeted}${n.sms.failed ? ` (${n.sms.failed} failed)` : ""}`}
                                                    {n.sms && n.email && " · "}
                                                    {n.email && `Email ${n.email.sent}/${n.email.targeted}${n.email.failed ? ` (${n.email.failed} failed)` : ""}`}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50/70 border border-slate-100 p-4">
                            <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-[#5C67F2]" /> Notify the people invited</p>
                            <NotifyPanel meeting={open} onSent={refresh} />
                        </div>
                    </div>
                )}
            </FModal>
        </CommShell>
    );
}
