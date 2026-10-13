import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import {
  CalendarDays, CalendarRange, CalendarClock, List, Plus, Loader2, ChevronLeft, ChevronRight,
  Trash2, X, Check, MapPin, Clock, User, Globe2, Link2, Unlink, AlertTriangle, Moon, PartyPopper, Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, addWeeks, addDays,
  format, isSameMonth, isToday, parseISO,
} from "date-fns";
import api from "@/lib/api";

// Mirrors backend/src/routes/calendar.routes.ts's CATEGORIES (section 5 of the spec) — the fixed
// taxonomy every event is filtered/colour-coded by. PUBLIC_HOLIDAY / RELIGIOUS / INTERNATIONAL
// are system-computed (holidays.ts), never created here.
const CATEGORIES = [
  { key: "SCHOOL", label: "School", color: "#5C67F2" },
  { key: "EXAM", label: "Exams", color: "#dc2626" },
  { key: "ASSIGNMENT", label: "Assignments", color: "#d97706" },
  { key: "MEETING", label: "Meetings", color: "#0891b2" },
  { key: "SPORTS", label: "Sports", color: "#7c3aed" },
  { key: "PERSONAL", label: "Personal", color: "#16a34a" },
  { key: "PUBLIC_HOLIDAY", label: "Holidays", color: "#f43f5e" },
  { key: "RELIGIOUS", label: "Religious", color: "#a16207" },
  { key: "INTERNATIONAL", label: "International", color: "#0ea5e9" },
  { key: "OTHER", label: "Other", color: "#6b7280" },
];
const CREATABLE_CATEGORIES = CATEGORIES.filter(c => !["PUBLIC_HOLIDAY", "RELIGIOUS", "INTERNATIONAL"].includes(c.key));
const colorOf = (key: string) => CATEGORIES.find(c => c.key === key)?.color || "#6b7280";
const labelOf = (key: string) => CATEGORIES.find(c => c.key === key)?.label || key;
const catKey = (e: any) => e.displayCategory || e.category;

// Mirrors backend/src/lib/holidays.ts's COUNTRIES registry — the calendar only ever shows the
// selected country's public holidays, never every country's at once.
const COUNTRIES = [
  { code: "KE", name: "Kenya" }, { code: "NG", name: "Nigeria" }, { code: "UG", name: "Uganda" },
  { code: "TZ", name: "Tanzania" }, { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" },
];
const COUNTRY_KEY = "shulecloud_calendar_country";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const todayStr = () => fmt(new Date());
const useIsMobile = () => {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
};

interface CalendarPageProps { apiClient?: AxiosInstance }

export default function CalendarPage({ apiClient }: CalendarPageProps) {
  type ViewMode = "month" | "week" | "day" | "agenda";
  const client = apiClient ?? api;
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const [view, setView] = useState<ViewMode>("month");
  const effectiveView: ViewMode = isMobile && view !== "agenda" ? "agenda" : view;
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [country, setCountry] = useState(() => (typeof window !== "undefined" && localStorage.getItem(COUNTRY_KEY)) || "KE");
  useEffect(() => { try { localStorage.setItem(COUNTRY_KEY, country); } catch { /* private mode */ } }, [country]);
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.key)));
  const toggleCat = (key: string) => setActiveCats(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const [detail, setDetail] = useState<any>(null);
  const emptyDraft = { title: "", category: "SCHOOL", eventDate: selectedDate, allDay: true, startTime: "", endTime: "", location: "", description: "", organizer: "", syncToGoogle: true, notifyStaff: false };
  const [draft, setDraft] = useState<any>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Google Calendar connection ────────────────────────────────────────────
  const { data: googleStatus, isLoading: googleLoading } = useQuery({
    queryKey: ["google-calendar-status", apiClient ? "staff" : "admin"],
    queryFn: async () => (await client.get("/calendar/google/status")).data as { connected: boolean; email?: string; connectedAt?: string; lastError?: string | null },
    staleTime: 30_000,
  });
  const [connecting, setConnecting] = useState(false);
  const connectGoogle = async () => {
    setConnecting(true);
    try {
      const r = await client.get("/calendar/google/auth-url", { params: { returnUrl: window.location.href } });
      window.location.href = r.data.url;
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Could not start the Google Calendar connection");
      setConnecting(false);
    }
  };
  const disconnectGoogle = async () => {
    if (!confirm("Disconnect Google Calendar? Events already pushed to it will stay there, but new changes will stop syncing.")) return;
    try {
      await client.post("/calendar/google/disconnect");
      toast.success("Google Calendar disconnected");
      qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
    } catch (e: any) { toast.error(e.response?.data?.message || "Could not disconnect Google Calendar"); }
  };
  // The OAuth callback redirects back here with ?google=connected|error — surface it once, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("google");
    if (!g) return;
    if (g === "connected") { toast.success("Google Calendar connected"); qc.invalidateQueries({ queryKey: ["google-calendar-status"] }); }
    else if (g === "error") toast.error(params.get("reason") || "Could not connect Google Calendar");
    params.delete("google"); params.delete("reason");
    const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
    window.history.replaceState({}, "", clean);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visible date range per view ───────────────────────────────────────────
  const base = parseISO(selectedDate);
  const range = useMemo(() => {
    if (effectiveView === "day") return { start: base, end: base };
    if (effectiveView === "week") return { start: startOfWeek(base, { weekStartsOn: 1 }), end: endOfWeek(base, { weekStartsOn: 1 }) };
    if (effectiveView === "agenda") return { start: base, end: addDays(base, 60) };
    return { start: startOfWeek(startOfMonth(base), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(base), { weekStartsOn: 1 }) };
  }, [effectiveView, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events", fmt(range.start), fmt(range.end), country, [...activeCats].sort().join(","), googleStatus?.connected],
    queryFn: async () => {
      const r = await client.get("/calendar/events", {
        params: {
          start: fmt(range.start), end: fmt(range.end), includeHolidays: 1, country,
          categories: [...activeCats].join(","), includeGoogle: googleStatus?.connected ? 1 : 0,
        },
      });
      return Array.isArray(r.data) ? r.data : [];
    },
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const e of events) (map[e.eventDate] ||= []).push(e);
    for (const k of Object.keys(map)) map[k].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    return map;
  }, [events]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["calendar-events"] }); qc.invalidateQueries({ queryKey: ["calendar-summary"] }); };

  // ── Holiday/occasion SMS wishes (Eid, Christmas, Mother's/Father's Day, …) ────────────────
  const { data: occasions = [] } = useQuery({
    queryKey: ["calendar-occasions", country],
    queryFn: async () => (await client.get("/calendar/occasions", { params: { country } })).data as any[],
    staleTime: 60 * 60_000,
  });
  const [wishOpen, setWishOpen] = useState(false);
  const [wishAudience, setWishAudience] = useState<"parents" | "staff" | "both">("both");
  const [wishMessage, setWishMessage] = useState("");
  const openWish = () => {
    const occ = occasions.find((o: any) => o.template?.key === detail?.greetingKey);
    setWishMessage(occ?.template?.message || detail?.description || "");
    setWishAudience("both");
    setWishOpen(true);
  };
  const wishMut = useMutation({
    mutationFn: () => client.post("/calendar/occasions/send", { key: detail?.greetingKey, audience: wishAudience, message: wishMessage }),
    onSuccess: (r: any) => { toast.success(r?.data?.message || "Sent"); setWishOpen(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || "Could not send this wish"),
  });

  // ── Create / edit / delete ────────────────────────────────────────────────
  const openCreate = (date?: string) => { setEditingId(null); setDraft({ ...emptyDraft, eventDate: date || selectedDate }); setShowModal(true); };
  const openEdit = (e: any) => {
    if (!e.editable) { toast.info(e.source === "google" ? "This is a Google Calendar event — edit it in Google Calendar." : e.source === "shulecloud" && e._id?.startsWith?.("sync-") ? "Auto-synced events are read-only. Edit the source record instead." : "This event can't be edited here."); return; }
    setEditingId(String(e._id));
    setDraft({ title: e.title || "", category: catKey(e) || "SCHOOL", eventDate: e.eventDate, allDay: !e.startTime, startTime: e.startTime || "", endTime: e.endTime || "", location: e.location || e.venue || "", description: e.description || "", organizer: e.organizer || "", syncToGoogle: true });
    setDetail(null);
    setShowModal(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = { ...draft, startTime: draft.allDay ? "" : draft.startTime, endTime: draft.allDay ? "" : draft.endTime };
      if (editingId) return client.patch(`/calendar/events/${editingId}`, payload);
      return client.post("/calendar/events", payload);
    },
    onSuccess: (r: any) => {
      toast.success(editingId ? "Event updated" : "Event created");
      const sync = r?.data?.googleSync;
      if (sync && sync.synced === false && sync.error && sync.error !== "not_connected") toast.warning(`Saved, but Google Calendar sync failed: ${sync.error}`);
      const notified = r?.data?.staffNotified;
      if (notified?.attempted) toast.info(notified.error ? `Could not email staff: ${notified.error}` : `Emailed ${notified.sent} of ${notified.attempted} staff${notified.failed ? ` (${notified.failed} failed)` : ""}`);
      setShowModal(false); refresh();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Could not save this event"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => client.delete(`/calendar/events/${id}`),
    onSuccess: () => { toast.success("Event deleted"); setConfirmDeleteId(null); setDetail(null); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || "Could not delete this event"),
  });

  const nav = (dir: -1 | 1) => {
    if (effectiveView === "day") setSelectedDate(fmt(addDays(base, dir)));
    else if (effectiveView === "week") setSelectedDate(fmt(addWeeks(base, dir)));
    else if (effectiveView === "agenda") setSelectedDate(fmt(addDays(base, dir * 30)));
    else setSelectedDate(fmt(addMonths(base, dir)));
  };

  const title = effectiveView === "month" ? format(base, "MMMM yyyy")
    : effectiveView === "week" ? `${format(range.start, "d MMM")} – ${format(range.end, "d MMM yyyy")}`
    : effectiveView === "day" ? format(base, "EEEE, d MMMM yyyy")
    : `From ${format(base, "d MMM yyyy")}`;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2"><CalendarDays className="w-6 h-6 text-[#5C67F2]" /> School Calendar</h1>
        <p className="text-sm text-slate-400 mt-1">School events, Kenyan &amp; regional public holidays, religious and international observances — all in one place.</p>
      </div>

      {/* Google Calendar connection */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        {googleLoading ? (
          <span className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking Google Calendar…</span>
        ) : googleStatus?.connected ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full"><Link2 className="w-3.5 h-3.5" /> Connected to Google Calendar{googleStatus.email ? ` (${googleStatus.email})` : ""}</span>
            {googleStatus.lastError && <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600"><AlertTriangle className="w-3.5 h-3.5" /> Last sync issue: {googleStatus.lastError}</span>}
            <button onClick={disconnectGoogle} className="ml-auto text-xs font-black text-rose-500 hover:text-rose-600 flex items-center gap-1.5"><Unlink className="w-3.5 h-3.5" /> Disconnect</button>
          </>
        ) : (
          <button onClick={connectGoogle} disabled={connecting} className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#5C67F2] hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wide disabled:opacity-50">
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} Connect Google Calendar
          </button>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto sm:ml-0">
          <Globe2 className="w-3.5 h-3.5" />
          <select value={country} onChange={e => setCountry(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:border-[#5C67F2]">
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4 mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => openCreate()} className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wide flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Create Event</button>
          <button onClick={() => setSelectedDate(todayStr())} className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Today</button>
          <button onClick={() => nav(-1)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => nav(1)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-black text-slate-700 ml-1">{title}</span>
          {!isMobile && (
            <div className="ml-auto flex items-center gap-1 bg-slate-50 rounded-xl p-1">
              {([["month", CalendarDays, "Month"], ["week", CalendarRange, "Week"], ["day", CalendarClock, "Day"], ["agenda", List, "Agenda"]] as const).map(([key, Icon, label]) => (
                <button key={key} onClick={() => setView(key)} className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${view === key ? "bg-white text-[#5C67F2] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map(c => {
            const on = activeCats.has(c.key);
            return (
              <button key={c.key} onClick={() => toggleCat(c.key)} className={`h-7 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wide border flex items-center gap-1.5 transition-colors ${on ? "border-current" : "border-slate-200 text-slate-400"}`} style={on ? { color: c.color, backgroundColor: `${c.color}14` } : undefined}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: on ? c.color : "#cbd5e1" }} /> {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : effectiveView === "month" ? (
        <MonthGrid base={base} range={range} eventsByDate={eventsByDate} onPickDay={d => { setSelectedDate(d); setView("day"); }} onEvent={setDetail} />
      ) : effectiveView === "week" ? (
        <WeekView range={range} eventsByDate={eventsByDate} onEvent={setDetail} onAddOn={d => openCreate(d)} />
      ) : effectiveView === "day" ? (
        <DayView date={selectedDate} events={eventsByDate[selectedDate] || []} onEvent={setDetail} onAdd={() => openCreate(selectedDate)} />
      ) : (
        <AgendaView eventsByDate={eventsByDate} start={range.start} end={range.end} onEvent={setDetail} />
      )}

      {/* Event detail */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setDetail(null); setWishOpen(false); }}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-2" style={{ backgroundColor: colorOf(catKey(detail)) }} />
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-black text-slate-800">{detail.title}</h3>
                <button onClick={() => { setDetail(null); setWishOpen(false); }} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><X className="w-4 h-4" /></button>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ color: colorOf(catKey(detail)), backgroundColor: `${colorOf(catKey(detail))}14` }}>{labelOf(catKey(detail))}</span>
              <div className="space-y-1.5 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> {format(parseISO(detail.eventDate), "EEEE, d MMMM yyyy")}{detail.startTime ? ` · ${detail.startTime}${detail.endTime ? `–${detail.endTime}` : ""}` : " · All day"}</p>
                {(detail.location || detail.venue) && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {detail.location || detail.venue}</p>}
                <p className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> {detail.organizer || "ShuleCloud"} {detail.country ? `· ${COUNTRIES.find(c => c.code === detail.country)?.name || detail.country}` : ""}</p>
              </div>
              {detail.description && <p className="text-sm text-slate-500 border-t border-slate-100 pt-3">{detail.description}</p>}
              {(detail.isPublicHoliday || detail.isObservance) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {detail.isPublicHoliday && <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-rose-50 text-rose-600">Official public holiday</span>}
                  {detail.isObservance && !detail.isPublicHoliday && <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-amber-50 text-amber-700">Observance (not a day off)</span>}
                  {detail.approxDate && <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-600"><Moon className="w-3 h-3" /> Approximate date</span>}
                </div>
              )}
              {detail.approxDate && detail.description && <p className="text-[11px] text-slate-400 italic">{detail.description}</p>}
              <p className="text-[10px] text-slate-400 uppercase tracking-wide pt-1">Source: {detail.source === "google" ? "Your Google Calendar" : detail.source === "public_holiday" ? "Public holiday registry" : detail.source === "religious" ? "Religious observance registry" : detail.source === "international" ? "International observance registry" : "ShuleCloud School"}</p>
              {detail.greetingKey && !wishOpen && (
                <button onClick={openWish} className="w-full h-10 rounded-xl bg-fuchsia-50 text-fuchsia-600 text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-fuchsia-100"><PartyPopper className="w-4 h-4" /> Send a wish by SMS</button>
              )}
              {wishOpen && (
                <div className="space-y-2.5 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
                    {([["parents", "Parents"], ["staff", "Staff"], ["both", "Everyone"]] as const).map(([v, label]) => (
                      <button key={v} onClick={() => setWishAudience(v)} className={`flex-1 h-8 rounded-lg text-[11px] font-black uppercase transition-colors ${wishAudience === v ? "bg-white text-fuchsia-600 shadow-sm" : "text-slate-500"}`}>{label}</button>
                    ))}
                  </div>
                  <textarea value={wishMessage} onChange={e => setWishMessage(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-fuchsia-300" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setWishOpen(false)} className="h-9 px-3 rounded-xl text-xs font-bold text-slate-400">Cancel</button>
                    <button onClick={() => { if (!wishMessage.trim()) { toast.error("Write a message"); return; } wishMut.mutate(); }} disabled={wishMut.isPending} className="h-9 px-4 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs font-black uppercase flex items-center gap-1.5 disabled:opacity-50">
                      {wishMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
                    </button>
                  </div>
                </div>
              )}
              {detail.editable && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => openEdit(detail)} className="h-9 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase">Edit</button>
                  {confirmDeleteId === detail._id ? (
                    <>
                      <button onClick={() => deleteMut.mutate(String(detail._id))} className="h-9 px-4 rounded-xl bg-rose-500 text-white text-xs font-black uppercase flex items-center gap-1.5">{deleteMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Confirm</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="h-9 px-3 rounded-xl text-xs font-bold text-slate-400">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(String(detail._id))} className="h-9 px-4 rounded-xl border border-slate-200 text-rose-500 text-xs font-black uppercase flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800">{editingId ? "Edit event" : "Create event"}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Title *</label>
                <input value={draft.title} onChange={e => setDraft((d: any) => ({ ...d, title: e.target.value }))} placeholder="e.g. Term 2 Begins, Mathematics Exam, Parents' Meeting"
                  className="w-full h-11 px-3 mt-1 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Category</label>
                  <select value={draft.category} onChange={e => setDraft((d: any) => ({ ...d, category: e.target.value }))} className="w-full h-11 px-3 mt-1 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#5C67F2]">
                    {CREATABLE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Date</label>
                  <input type="date" value={draft.eventDate} onChange={e => setDraft((d: any) => ({ ...d, eventDate: e.target.value }))} className="w-full h-11 px-3 mt-1 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={draft.allDay} onChange={e => setDraft((d: any) => ({ ...d, allDay: e.target.checked }))} /> All day</label>
              {!draft.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Start time</label>
                    <input type="time" value={draft.startTime} onChange={e => setDraft((d: any) => ({ ...d, startTime: e.target.value }))} className="w-full h-11 px-3 mt-1 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase">End time</label>
                    <input type="time" value={draft.endTime} onChange={e => setDraft((d: any) => ({ ...d, endTime: e.target.value }))} className="w-full h-11 px-3 mt-1 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Location</label>
                <input value={draft.location} onChange={e => setDraft((d: any) => ({ ...d, location: e.target.value }))} placeholder="e.g. Main Hall" className="w-full h-11 px-3 mt-1 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Organizer</label>
                <input value={draft.organizer} onChange={e => setDraft((d: any) => ({ ...d, organizer: e.target.value }))} placeholder="e.g. Admin Office" className="w-full h-11 px-3 mt-1 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Description</label>
                <textarea value={draft.description} onChange={e => setDraft((d: any) => ({ ...d, description: e.target.value }))} rows={3} className="w-full px-3 py-2 mt-1 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" />
              </div>
              {googleStatus?.connected && (
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={draft.syncToGoogle} onChange={e => setDraft((d: any) => ({ ...d, syncToGoogle: e.target.checked }))} /> Sync to Google Calendar</label>
              )}
              {!editingId && (
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={draft.notifyStaff} onChange={e => setDraft((d: any) => ({ ...d, notifyStaff: e.target.checked }))} /> Notify all staff by email</label>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="h-11 px-4 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold">Cancel</button>
                <button onClick={() => { if (!draft.title.trim()) { toast.error("Give the event a title"); return; } saveMut.mutate(); }} disabled={saveMut.isPending} className="h-11 px-5 rounded-xl bg-[#5C67F2] hover:bg-indigo-600 text-white text-sm font-black flex items-center gap-2 disabled:opacity-50">
                  {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editingId ? "Save changes" : "Create event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Views ──────────────────────────────────────────────────────────────────

function EventChip({ e, onClick }: { e: any; onClick: () => void }) {
  return (
    <button onClick={ev => { ev.stopPropagation(); onClick(); }} className="w-full text-left truncate text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: colorOf(catKey(e)), backgroundColor: `${colorOf(catKey(e))}18` }}>
      {e.startTime ? `${e.startTime} ` : ""}{e.title}
    </button>
  );
}

function MonthGrid({ base, range, eventsByDate, onPickDay, onEvent }: { base: Date; range: { start: Date; end: Date }; eventsByDate: Record<string, any[]>; onPickDay: (d: string) => void; onEvent: (e: any) => void }) {
  const days = eachDayOfInterval(range);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-400">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map(day => {
          const key = fmt(day);
          const dayEvents = eventsByDate[key] || [];
          const inMonth = isSameMonth(day, base);
          return (
            <div key={key} onClick={() => onPickDay(key)} className={`min-h-[96px] border-b border-r border-slate-100 p-1.5 cursor-pointer hover:bg-slate-50 transition-colors ${inMonth ? "" : "bg-slate-50/50"}`}>
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isToday(day) ? "bg-[#5C67F2] text-white" : inMonth ? "text-slate-700" : "text-slate-300"}`}>{format(day, "d")}</span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map(e => <EventChip key={e._id} e={e} onClick={() => onEvent(e)} />)}
                {dayEvents.length > 3 && <p className="text-[10px] font-bold text-slate-400 px-1.5">+{dayEvents.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ range, eventsByDate, onEvent, onAddOn }: { range: { start: Date; end: Date }; eventsByDate: Record<string, any[]>; onEvent: (e: any) => void; onAddOn: (d: string) => void }) {
  const days = eachDayOfInterval(range);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
      {days.map(day => {
        const key = fmt(day);
        const dayEvents = eventsByDate[key] || [];
        return (
          <div key={key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 min-h-[160px]">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-black ${isToday(day) ? "text-[#5C67F2]" : "text-slate-600"}`}>{format(day, "EEE d")}</span>
              <button onClick={() => onAddOn(key)} className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs">+</button>
            </div>
            <div className="space-y-1">
              {dayEvents.length === 0 ? <p className="text-[11px] text-slate-300">No events</p> : dayEvents.map(e => <EventChip key={e._id} e={e} onClick={() => onEvent(e)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ date, events, onEvent, onAdd }: { date: string; events: any[]; onEvent: (e: any) => void; onAdd: () => void }) {
  const allDay = events.filter(e => !e.startTime);
  const timed = events.filter(e => e.startTime);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-slate-700">{format(parseISO(date), "EEEE, d MMMM yyyy")}</p>
        <button onClick={onAdd} className="h-8 px-3 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
      </div>
      {events.length === 0 ? <p className="text-sm text-slate-300 py-10 text-center">No events this day</p> : (
        <div className="space-y-2">
          {allDay.map(e => (
            <button key={e._id} onClick={() => onEvent(e)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorOf(catKey(e)) }} />
              <span className="text-xs font-bold text-slate-400 w-16 shrink-0">All day</span>
              <span className="text-sm font-semibold text-slate-700 truncate">{e.title}</span>
            </button>
          ))}
          {timed.map(e => (
            <button key={e._id} onClick={() => onEvent(e)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorOf(catKey(e)) }} />
              <span className="text-xs font-bold text-slate-400 w-16 shrink-0">{e.startTime}{e.endTime ? `–${e.endTime}` : ""}</span>
              <span className="text-sm font-semibold text-slate-700 truncate">{e.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AgendaView({ eventsByDate, start, end, onEvent }: { eventsByDate: Record<string, any[]>; start: Date; end: Date; onEvent: (e: any) => void }) {
  const dates = Object.keys(eventsByDate).filter(d => d >= fmt(start) && d <= fmt(end)).sort();
  if (!dates.length) return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-sm text-slate-300">No events in this range</div>;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
      {dates.map(d => (
        <div key={d} className="p-4">
          <p className={`text-xs font-black uppercase tracking-wide mb-2 ${isToday(parseISO(d)) ? "text-[#5C67F2]" : "text-slate-400"}`}>{format(parseISO(d), "EEEE, d MMMM yyyy")}</p>
          <div className="space-y-1.5">
            {eventsByDate[d].map(e => (
              <button key={e._id} onClick={() => onEvent(e)} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorOf(catKey(e)) }} />
                <span className="text-xs font-bold text-slate-400 w-14 shrink-0">{e.startTime || "All day"}</span>
                <span className="text-sm font-semibold text-slate-700 truncate flex-1">{e.title}</span>
                <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0" style={{ color: colorOf(catKey(e)), backgroundColor: `${colorOf(catKey(e))}14` }}>{labelOf(catKey(e))}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
