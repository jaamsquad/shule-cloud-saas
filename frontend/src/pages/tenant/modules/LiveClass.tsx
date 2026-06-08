import { useState, useEffect } from "react";
import {
    Home, Video, Plus, Calendar, Trash2, RefreshCw, Users, Shield
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

function generateMeetingId(): string {
    const digits = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join("");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const rand = Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `ESK${digits}${rand}`;
}

export default function LiveClass() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ── Live clock ──────────────────────────────────────────────────────────
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // ── Form state ──────────────────────────────────────────────────────────
    const [title, setTitle] = useState("");
    const [meetingId, setMeetingId] = useState(generateMeetingId);
    const [meetingWith, setMeetingWith] = useState("All Students");
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");
    const [message, setMessage] = useState("");
    const [activeFilter, setActiveFilter] = useState("All Meetings");

    // Get current user info to determine moderator name
    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
    })();
    const hostName = currentUser?.name || currentUser?.email?.split("@")[0] || "Host";

    // ── Data ────────────────────────────────────────────────────────────────
    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => {
            const r = await api.get("/classes");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: meetings = [], refetch } = useQuery({
        queryKey: ["live_meetings"],
        queryFn: async () => {
            const r = await api.get("/live_meetings");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    // ── Mutations ────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (payload: any) => api.post("/live_meetings", payload),
        onSuccess: (_res, vars) => {
            queryClient.invalidateQueries({ queryKey: ["live_meetings"] });
            toast.success("Meeting created!");
            if (vars.joinNow) {
                // Creator joins as MODERATOR
                navigate(`/live/room/${vars.meetingId}?title=${encodeURIComponent(vars.title)}&role=moderator&name=${encodeURIComponent(hostName)}`);
            }
            setTitle("");
            setMeetingId(generateMeetingId());
            setMessage("");
            setIsScheduled(false);
            setScheduledDate("");
            setScheduledTime("");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to create meeting"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/live_meetings/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["live_meetings"] });
            toast.success("Meeting removed");
        },
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.patch(`/live_meetings/${id}`, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live_meetings"] }),
    });

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleCreateAndJoin = () => {
        if (!title.trim()) { toast.error("Meeting title is required"); return; }
        if (isScheduled && (!scheduledDate || !scheduledTime)) {
            toast.error("Please set both date and time for scheduled meetings"); return;
        }
        createMutation.mutate({
            title: title.trim(),
            meetingId,
            meetingWith,
            isScheduled,
            scheduledDate: isScheduled ? scheduledDate : null,
            scheduledTime: isScheduled ? scheduledTime : null,
            message: message.trim(),
            status: "active",
            hostedBy: "Self",
            joinNow: !isScheduled,
        });
    };

    // ── Filter meetings ──────────────────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const filteredMeetings = meetings.filter((m: any) => {
        if (activeFilter === "Today") return m.scheduledDate === today;
        if (activeFilter === "Tomorrow") return m.scheduledDate === tomorrow;
        if (activeFilter === "Self Hosted") return m.hostedBy === "Self";
        if (activeFilter === "Invitations") return m.hostedBy !== "Self";
        return true;
    });

    // ── Clock formatting ─────────────────────────────────────────────────────
    const h = time.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = String(h % 12 || 12).padStart(2, "0");
    const min = String(time.getMinutes()).padStart(2, "0");
    const dateStr = time.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const FILTERS = ["All Meetings", "Today", "Tomorrow", "Self Hosted", "Invitations"];

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Live Class</span>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* ── Left: Create Meeting Form ────────────────────── */}
                    <div className="space-y-5">
                        {/* Host Meeting hero button */}
                        <button
                            onClick={handleCreateAndJoin}
                            disabled={createMutation.isPending}
                            className="w-full h-14 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-3"
                        >
                            <Video className="w-5 h-5" />
                            Host Meeting
                        </button>

                        {/* Form */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
                            {/* Meeting Title */}
                            <div className="relative">
                                <label className="absolute -top-3 left-4 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">
                                    Meeting Title*
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Meeting title"
                                    className="w-full h-12 px-4 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-slate-700 transition-all"
                                />
                            </div>

                            {/* Meeting ID */}
                            <div className="relative">
                                <label className="absolute -top-3 left-4 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">
                                    Meeting ID*
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={meetingId}
                                        onChange={(e) => setMeetingId(e.target.value)}
                                        className="flex-1 h-12 px-4 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-slate-700 tracking-widest"
                                    />
                                    <button
                                        onClick={() => setMeetingId(generateMeetingId())}
                                        className="h-12 w-12 rounded-2xl bg-slate-50 hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-200 flex items-center justify-center text-slate-400 hover:text-[#5C67F2] transition-all"
                                        title="Generate new ID"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Meeting With */}
                            <div className="relative">
                                <label className="absolute -top-3 left-4 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">
                                    Meeting With*
                                </label>
                                <select
                                    value={meetingWith}
                                    onChange={(e) => setMeetingWith(e.target.value)}
                                    className="w-full h-12 px-4 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-slate-700 appearance-none"
                                >
                                    <option value="All Students">All Students</option>
                                    <option value="All Staff">All Staff</option>
                                    {classes.map((c: any) => (
                                        <option key={c._id} value={c.levelName || c.className || c.name}>
                                            {c.levelName || c.className || c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Schedule toggle */}
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={isScheduled}
                                    onChange={(e) => setIsScheduled(e.target.checked)}
                                    className="w-4 h-4 accent-[#5C67F2] cursor-pointer"
                                />
                                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">
                                    I want to schedule this meeting.
                                </span>
                            </label>

                            {/* Scheduled date + time */}
                            {isScheduled && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="absolute -top-3 left-4 bg-slate-700 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Date</label>
                                        <input
                                            type="date"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            className="w-full h-11 px-4 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-slate-700"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="absolute -top-3 left-4 bg-slate-700 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Time</label>
                                        <input
                                            type="time"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            className="w-full h-11 px-4 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-slate-700"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Message */}
                            <div>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value.slice(0, 244))}
                                    placeholder="Write your Message here, if any..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-sm text-slate-700 resize-none"
                                />
                                <p className="text-right text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                                    {message.length} / 244 characters
                                </p>
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleCreateAndJoin}
                                disabled={createMutation.isPending}
                                className="w-full h-12 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                {isScheduled ? "Schedule Meeting" : "Create & Join"}
                            </button>
                        </div>
                    </div>

                    {/* ── Right: Clock + Meetings ──────────────────────── */}
                    <div className="space-y-5">
                        {/* Clock widget */}
                        <div
                            className="rounded-[2rem] p-8 text-white text-center relative overflow-hidden"
                            style={{ background: "linear-gradient(135deg, #5C67F2 0%, #7B84F8 50%, #3B54A6 100%)" }}
                        >
                            <div
                                className="absolute inset-0 opacity-[0.07]"
                                style={{
                                    backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                                    backgroundSize: "28px 28px",
                                }}
                            />
                            <p className="text-5xl font-black tracking-tight relative z-10 drop-shadow-lg">
                                {h12}:{min} {ampm}
                            </p>
                            <p className="text-white/75 font-bold text-sm mt-2 relative z-10">{dateStr}</p>
                        </div>

                        {/* Filter tabs */}
                        <div className="flex flex-wrap gap-2">
                            {FILTERS.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                                        activeFilter === f
                                            ? "bg-[#5C67F2] text-white shadow-sm"
                                            : "bg-white text-slate-500 border border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Meetings list */}
                        <div className="space-y-4">
                            {filteredMeetings.length === 0 ? (
                                <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 p-12 text-center">
                                    <Video className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No meetings found</p>
                                </div>
                            ) : (
                                filteredMeetings.map((m: any) => (
                                    <div key={m._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                                        {/* Top row: badges + controls */}
                                        <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                                    #SELF HOSTED
                                                </span>
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                                                    <Users className="w-2.5 h-2.5" />
                                                    meeting with: {m.meetingWith}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => toggleMutation.mutate({
                                                        id: m._id,
                                                        status: m.status === "active" ? "ended" : "active",
                                                    })}
                                                    className={`w-10 h-6 rounded-full transition-all relative flex-shrink-0 ${
                                                        m.status === "active" ? "bg-emerald-500" : "bg-slate-200"
                                                    }`}
                                                >
                                                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                                                        m.status === "active" ? "right-0.5" : "left-0.5"
                                                    }`} />
                                                </button>
                                                <button
                                                    onClick={() => deleteMutation.mutate(m._id)}
                                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <p className="font-black text-slate-800 text-base mb-2">{m.title}</p>

                                        {/* Meta */}
                                        <div className="flex items-center gap-3 text-xs text-slate-400 font-bold mb-4 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {m.scheduledDate
                                                    ? new Date(m.scheduledDate + "T00:00:00").toLocaleDateString("en-US", {
                                                          weekday: "long", year: "numeric", month: "long", day: "numeric",
                                                      })
                                                    : new Date(m.createdAt).toLocaleDateString("en-US", {
                                                          weekday: "long", year: "numeric", month: "long", day: "numeric",
                                                      })
                                                }
                                            </span>
                                            {m.scheduledTime && <span>{m.scheduledTime}</span>}
                                            <span>Duration: Not Defined</span>
                                        </div>

                                        {/* Message */}
                                        {m.message && (
                                            <p className="text-xs text-slate-500 mb-4 italic">"{m.message}"</p>
                                        )}

                                        {/* Join button */}
                                        <button
                                            onClick={() =>
                                                // Staff/admin joins as moderator from the live class page
                                                navigate(`/live/room/${m.meetingId}?title=${encodeURIComponent(m.title)}&role=moderator&name=${encodeURIComponent(hostName)}`)
                                            }
                                            className="bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest h-10 px-5 rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-indigo-100"
                                        >
                                            <Shield className="w-4 h-4" />
                                            Join as Host
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
