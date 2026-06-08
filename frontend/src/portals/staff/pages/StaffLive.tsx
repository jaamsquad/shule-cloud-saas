import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Video, Plus, PlayCircle, Square, Users } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";
import { useAssignments } from "../useAssignments";

export default function StaffLive() {
    const { staff, api } = useOutletContext<StaffCtx>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { data: assign } = useAssignments();
    const classes = Array.from(new Set((assign?.assignments || []).map(a => a.className)));

    const [title, setTitle] = useState("");
    const [className, setClassName] = useState("");
    const [subject, setSubject] = useState("");

    const { data: meetings = [], isLoading } = useQuery({
        queryKey: ["staff_live"],
        queryFn: async () => { const r = await api.get("/staff-portal/live-meetings"); return Array.isArray(r.data) ? r.data : []; },
        refetchInterval: 15000,
    });

    const create = useMutation({
        mutationFn: async () => (await api.post("/staff-portal/live-meetings", { title, className, subject })).data,
        onSuccess: (m: any) => {
            toast.success("Live class created");
            qc.invalidateQueries({ queryKey: ["staff_live"] });
            setTitle(""); setSubject("");
            host(m);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to create"),
    });

    const end = useMutation({
        mutationFn: async (id: string) => api.post(`/staff-portal/live-meetings/${id}/end`, {}),
        onSuccess: () => { toast.success("Class ended"); qc.invalidateQueries({ queryKey: ["staff_live"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const host = (m: any) => {
        const q = new URLSearchParams({ role: "moderator", name: staff.name || "Teacher", title: m.title || "Live Class", return: "/live" });
        navigate(`/live/${m.meetingId}?${q.toString()}`);
    };

    return (
        <>
            <PageTitle title="Live Classes" />

            <PanelCard title="Start a New Live Class">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Algebra Revision"
                            className="w-full h-10 px-3 border border-black/10 rounded text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Class</label>
                        <select value={className} onChange={e => setClassName(e.target.value)} className="w-full h-10 px-3 border border-black/10 rounded text-sm bg-white">
                            <option value="">All my classes</option>
                            {classes.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Subject (optional)</label>
                        <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full h-10 px-3 border border-black/10 rounded text-sm" />
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                    <button disabled={create.isPending || !title} onClick={() => create.mutate()}
                        className="inline-flex items-center gap-2 bg-[#0f2942] hover:bg-[#15395c] disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded">
                        {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create &amp; Host
                    </button>
                </div>
            </PanelCard>

            <PanelCard title="Active Live Classes">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
                ) : meetings.length === 0 ? (
                    <div className="text-center py-10 text-slate-400"><Video className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm font-semibold">No live classes running.</p></div>
                ) : (
                    <div className="space-y-2">
                        {meetings.map((m: any) => {
                            const mine = String(m.hostId) === String(staff._id);
                            return (
                                <div key={m._id} className="flex items-center justify-between border-b border-black/5 py-3">
                                    <div>
                                        <p className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> {m.title}
                                        </p>
                                        <p className="text-xs text-slate-400 flex items-center gap-2">
                                            <Users className="w-3 h-3" /> {m.className || "All classes"}{m.subject ? ` · ${m.subject}` : ""} · Host: {m.hostName}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => host(m)} className="inline-flex items-center gap-1.5 bg-[#159a52] text-white text-xs font-bold px-3 py-1.5 rounded">
                                            <PlayCircle className="w-4 h-4" /> {mine ? "Host" : "Join"}
                                        </button>
                                        {mine && (
                                            <button onClick={() => end.mutate(m._id)} className="inline-flex items-center gap-1.5 bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded">
                                                <Square className="w-3.5 h-3.5" /> End
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </PanelCard>
        </>
    );
}
