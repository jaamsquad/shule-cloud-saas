import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Video, Eye, Users } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StudentCtx } from "../StudentLayout";

export default function StudentLive() {
    const { student, api } = useOutletContext<StudentCtx>();
    const navigate = useNavigate();

    const { data: meetings = [], isLoading } = useQuery({
        queryKey: ["student_live"],
        queryFn: async () => { const r = await api.get("/student-portal/live-meetings"); return Array.isArray(r.data) ? r.data : []; },
        refetchInterval: 15000,
    });

    const join = (m: any) => {
        const q = new URLSearchParams({ role: "viewer", name: student.name || "Student", title: m.title || "Live Class", return: "/live" });
        navigate(`/live/${m.meetingId}?${q.toString()}`);
    };

    return (
        <>
            <PageTitle title="Live Classes" />
            <PanelCard title="Live Classes for Your Class">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
                ) : meetings.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <Video className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No live classes right now.</p>
                        <p className="text-xs mt-1">You'll see lessons here when your teacher starts one.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {meetings.map((m: any) => (
                            <div key={m._id} className="flex items-center justify-between border-b border-black/5 py-3">
                                <div>
                                    <p className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> {m.title}
                                    </p>
                                    <p className="text-xs text-slate-400 flex items-center gap-2">
                                        <Users className="w-3 h-3" /> {m.subject || m.className || "Live lesson"} · Teacher: {m.hostName}
                                    </p>
                                </div>
                                <button onClick={() => join(m)} className="inline-flex items-center gap-1.5 bg-[#159a52] text-white text-xs font-bold px-3 py-1.5 rounded">
                                    <Eye className="w-4 h-4" /> Join (View Only)
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </PanelCard>
        </>
    );
}
