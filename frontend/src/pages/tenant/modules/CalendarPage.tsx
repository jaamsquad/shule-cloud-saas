import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { CalendarDays, CalendarRange, CalendarClock, Plus, Search, Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  academic: "bg-blue-50 text-blue-700",
  examinations: "bg-rose-50 text-rose-700",
  sports: "bg-violet-50 text-violet-700",
  meetings: "bg-cyan-50 text-cyan-700",
  fees: "bg-amber-50 text-amber-700",
  transport: "bg-teal-50 text-teal-700",
  hostel: "bg-pink-50 text-pink-700",
  library: "bg-indigo-50 text-indigo-700",
  medical: "bg-emerald-50 text-emerald-700",
  public_holiday: "bg-rose-100 text-rose-800",
  school_holiday: "bg-slate-100 text-slate-700",
  administration: "bg-slate-200 text-slate-800",
  other: "bg-gray-100 text-gray-700",
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const createDate = (value: string) => new Date(`${value}T00:00:00`);

interface CalendarPageProps {
  apiClient?: AxiosInstance;
}

export default function CalendarPage({ apiClient }: CalendarPageProps) {
  type CalendarView = "month" | "week" | "day";
  const [view, setView] = useState<CalendarView>("month");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [draft, setDraft] = useState({ title: "", description: "", category: "academic", eventDate: formatDate(new Date()), startTime: "", endTime: "", venue: "", organizer: "" });
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();
  const client = apiClient ?? api;

  const parseDate = (value: string) => new Date(`${value}T00:00:00`);
  const getVisibleRange = (viewMode: CalendarView, value: string) => {
    const base = parseDate(value);
    if (viewMode === "day") return { start: base, end: base };
    if (viewMode === "week") {
      const day = base.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(base);
      start.setDate(base.getDate() + diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { start, end };
  };

  const visibleRange = useMemo(() => getVisibleRange(view, selectedDate), [view, selectedDate]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events", selectedDate, view],
    queryFn: async () => {
      const r = await client.get(`/calendar/events?start=${formatDate(visibleRange.start)}&end=${formatDate(visibleRange.end)}`);
      return Array.isArray(r.data) ? r.data : [];
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["calendar-summary", selectedDate],
    queryFn: async () => {
      const r = await client.get(`/calendar/summary?date=${selectedDate}`);
      return r.data;
    },
  });

  const createEvent = useMutation({
    mutationFn: (payload: any) => client.post("/calendar/events", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      qc.invalidateQueries({ queryKey: ["calendar-summary"] });
      toast.success("Event created");
      setShowModal(false);
      setDraft({ title: "", description: "", category: "academic", eventDate: selectedDate, startTime: "", endTime: "", venue: "", organizer: "" });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Could not create event"),
  });

  const calendarDays = useMemo(() => {
    const current = createDate(selectedDate);
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Array<{ date: string; inMonth: boolean }> = [];
    for (let i = 0; i < firstDay.getDay(); i += 1) {
      const date = new Date(year, month, i - firstDay.getDay() + 1);
      days.push({ date: formatDate(date), inMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d += 1) {
      const date = new Date(year, month, d);
      days.push({ date: formatDate(date), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      const date = new Date(year, month + 1, days.length - lastDay.getDate() - firstDay.getDay() + 1);
      days.push({ date: formatDate(date), inMonth: false });
    }
    return days;
  }, [selectedDate]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (events as any[]).filter((item: any) => !q || (item.title + " " + (item.description || "")).toLowerCase().includes(q));
  }, [events, search]);

  const shiftSelectedDate = (delta: number) => {
    const current = createDate(selectedDate);
    if (view === "month") {
      current.setMonth(current.getMonth() + delta);
    } else {
      current.setDate(current.getDate() + delta * (view === "week" ? 7 : 1));
    }
    setSelectedDate(formatDate(current));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <CalendarDays className="h-4 w-4 text-indigo-600" /> School Calendar
            </div>
            <h1 className="text-3xl font-black text-slate-900">Central scheduling hub</h1>
            <p className="text-sm text-slate-500">Create, review, and track school events across academic, sports, fees, transport, and more.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              { mode: "month" as CalendarView, label: "Month view", Icon: CalendarDays },
              { mode: "week" as CalendarView, label: "Week view", Icon: CalendarRange },
              { mode: "day" as CalendarView, label: "Day view", Icon: CalendarClock },
            ]).map(({ mode, label, Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${view === mode ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> New event
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => shiftSelectedDate(-1)} className="rounded-lg border border-slate-200 p-2"><ChevronLeft className="h-4 w-4" /></button>
                <div className="text-lg font-black text-slate-800">
                  {view === "month"
                    ? new Date(selectedDate).toLocaleDateString("en", { month: "long", year: "numeric" })
                    : view === "week"
                    ? `Week of ${visibleRange.start.toLocaleDateString("en", { month: "short", day: "numeric" })}`
                    : new Date(selectedDate).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </div>
                <button onClick={() => shiftSelectedDate(1)} className="rounded-lg border border-slate-200 p-2"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events" className="w-40 bg-transparent text-sm outline-none" />
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-56 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading calendar…</div>
            ) : view === "month" ? (
              <div className="grid grid-cols-7 gap-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day} className="text-center text-xs font-semibold uppercase text-slate-400">{day}</div>)}
                {calendarDays.map((item) => {
                  const matches = filteredEvents.filter((e: any) => e.eventDate === item.date);
                  return (
                    <button key={item.date} onClick={() => setSelectedDate(item.date)} className={`min-h-24 rounded-2xl border p-2 text-left ${item.inMonth ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 text-slate-400'} ${selectedDate === item.date ? 'ring-2 ring-indigo-400' : ''}`}>
                      <div className="text-xs font-semibold">{new Date(item.date).getDate()}</div>
                      <div className="mt-1 space-y-1">
                        {matches.slice(0, 2).map((event: any) => (
                          <div key={event._id} className={`truncate rounded-md px-2 py-1 text-[10px] font-semibold ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other}`}>
                            {event.title}
                          </div>
                        ))}
                        {matches.length > 2 && <div className="text-[10px] font-semibold text-slate-500">+{matches.length - 2} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : view === "week" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold uppercase text-slate-400">{day}</div>
                  ))}
                  {Array.from({ length: 7 }).map((_, index) => {
                    const date = new Date(visibleRange.start);
                    date.setDate(visibleRange.start.getDate() + index);
                    const dateKey = formatDate(date);
                    const matches = filteredEvents.filter((e: any) => e.eventDate === dateKey);
                    const isSelected = selectedDate === dateKey;
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedDate(dateKey)}
                        className={`min-h-28 rounded-2xl border p-3 text-left ${isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold">{date.getDate()}</div>
                          <div className="text-[10px] text-slate-500">{date.toLocaleDateString('en', { month: 'short' })}</div>
                        </div>
                        <div className="mt-2 space-y-1">
                          {matches.slice(0, 3).map((event: any) => (
                            <div key={event._id} className={`truncate rounded-md px-2 py-1 text-[10px] font-semibold ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other}`}>
                              {event.title}
                            </div>
                          ))}
                          {matches.length > 3 && <div className="text-[10px] font-semibold text-slate-500">+{matches.length - 3} more</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-500">Selected day</div>
                  <div className="text-base font-black text-slate-900">{new Date(selectedDate).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">No events found for this day.</div> : filteredEvents.map((event: any) => (
                  <div key={event._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{event.title}</div>
                        <div className="text-xs text-slate-500">{event.eventDate} {event.startTime ? `• ${event.startTime}` : ''}</div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other}`}>
                        {event.category}
                      </span>
                    </div>
                    {event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900">Today at a glance</h2>
                <Sparkles className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-500">Today</div>
                  <div className="text-3xl font-black text-slate-900">{summary?.todayCount ?? 0}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-500">Tomorrow</div>
                  <div className="text-3xl font-black text-slate-900">{summary?.tomorrowCount ?? 0}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-500">Upcoming</div>
                  <div className="text-3xl font-black text-slate-900">{summary?.upcomingCount ?? 0}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">Upcoming events</h2>
              <div className="mt-4 space-y-3">
                {(summary?.upcoming || []).slice(0, 5).map((event: any) => (
                  <div key={event._id} className="rounded-2xl border border-slate-100 p-3">
                    <div className="text-sm font-semibold text-slate-800">{event.title}</div>
                    <div className="text-xs text-slate-500">{event.eventDate} {event.startTime ? `• ${event.startTime}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Create calendar event</h3>
                <p className="text-sm text-slate-500">Add a one-off event that can be used by staff, parents, and students.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Close</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">Title</label>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Category</label>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                  {Object.entries(CATEGORY_COLORS).map(([key]) => <option key={key} value={key}>{key}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Date</label>
                <input type="date" value={draft.eventDate} onChange={(e) => setDraft({ ...draft, eventDate: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Start time</label>
                <input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">End time</label>
                <input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Venue</label>
                <input value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Organizer</label>
                <input value={draft.organizer} onChange={(e) => setDraft({ ...draft, organizer: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={() => createEvent.mutate(draft)} disabled={createEvent.isPending} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                {createEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
