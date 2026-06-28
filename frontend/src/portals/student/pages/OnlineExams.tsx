import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Clock, FileText, CheckCircle2 } from "lucide-react";
import type { StudentCtx } from "../StudentLayout";

type Tab = "available" | "upcoming" | "completed" | "missed";

// Online Examinations — student list. Starting an exam navigates to the dedicated
// take page at /online-exam/:examId.
export default function OnlineExams() {
    const { api } = useOutletContext<StudentCtx>();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>("available");

    const { data, isLoading } = useQuery({
        queryKey: ["online_exams_list"],
        queryFn: async () => (await api.get("/student-portal/online-exams")).data,
        retry: false,
    });

    const groups: Record<Tab, any[]> = { available: data?.available || [], upcoming: data?.upcoming || [], completed: data?.completed || [], missed: data?.missed || [] };
    const list = groups[tab];

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-xl font-bold text-slate-700 mb-4">Online Examinations</h1>
            <div className="flex gap-2 flex-wrap mb-4">
                {(["available", "upcoming", "completed", "missed"] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`h-9 px-4 rounded-lg text-sm font-bold capitalize ${tab === t ? "bg-[#159a52] text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{t} ({groups[t].length})</button>
                ))}
            </div>
            {isLoading ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#159a52]" /></div>
                : list.length === 0 ? <div className="py-16 text-center text-slate-400 font-bold">No {tab} exams.</div>
                    : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {list.map((e: any) => (
                                <div key={e._id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                                    <h3 className="font-black text-slate-800">{e.examName}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{e.subjectName} · {e.category}</p>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 font-bold">
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{e.durationMinutes} min</span>
                                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{e.totalMarks} marks</span>
                                    </div>
                                    {tab === "available" && <button onClick={() => navigate(`/online-exam/${e._id}`)} className="mt-3 w-full h-10 rounded-xl bg-[#159a52] text-white font-bold text-sm">Start Exam</button>}
                                    {tab === "upcoming" && <p className="mt-3 text-xs text-slate-400">Opens {e.startAt ? new Date(e.startAt).toLocaleString() : "soon"}</p>}
                                    {tab === "completed" && <p className="mt-3 text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Submitted</p>}
                                    {tab === "missed" && <p className="mt-3 text-xs text-rose-500 font-bold">Missed</p>}
                                </div>
                            ))}
                        </div>
                    )}
        </div>
    );
}
