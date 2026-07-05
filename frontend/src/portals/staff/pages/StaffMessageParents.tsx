import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, MessageSquare, Users, Check, History, Phone, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";

const MAX_LEN = 320;   // ~2 SMS segments; a soft guide, not enforced server-side

export default function StaffMessageParents() {
    const { api } = useOutletContext<StaffCtx>();
    const qc = useQueryClient();
    const [tab, setTab] = useState<"compose" | "history">("compose");
    const [className, setClassName] = useState("");
    const [message, setMessage] = useState("");
    const [selected, setSelected] = useState<Record<string, boolean>>({});

    // Classes the teacher may message + their students (with parent-phone availability).
    const { data, isLoading } = useQuery({
        queryKey: ["staff_msg_students"],
        queryFn: async () => (await api.get("/staff-portal/message-parents/students")).data,
    });
    const classes: any[] = data?.classes || [];
    const activeClass = classes.find((c) => c.className === className) || classes[0];
    const students: any[] = activeClass?.students || [];

    // The teacher's own sent messages.
    const { data: history = [] } = useQuery({
        queryKey: ["staff_msg_history"],
        queryFn: async () => (await api.get("/staff-portal/message-parents/history")).data,
        enabled: tab === "history",
    });

    const withPhone = students.filter((s) => s.hasPhone);
    const selectedIds = useMemo(
        () => students.filter((s) => selected[s.studentId] && s.hasPhone).map((s) => s.studentId),
        [students, selected],
    );
    // If nothing is explicitly ticked, we send to the whole class (all with phones).
    const recipientCount = selectedIds.length > 0 ? selectedIds.length : withPhone.length;

    const toggle = (id: string) => setSelected((m) => ({ ...m, [id]: !m[id] }));
    const allChecked = withPhone.length > 0 && withPhone.every((s) => selected[s.studentId]);
    const toggleAll = () => {
        const next: Record<string, boolean> = { ...selected };
        withPhone.forEach((s) => { next[s.studentId] = !allChecked; });
        setSelected(next);
    };

    const send = useMutation({
        mutationFn: async () => (await api.post("/staff-portal/message-parents", {
            message: message.trim(),
            className: activeClass?.className,
            studentIds: selectedIds.length > 0 ? selectedIds : undefined,   // undefined = whole class
        })).data,
        onSuccess: (d: any) => {
            toast.success(d.message || "Message sent");
            setMessage(""); setSelected({});
            qc.invalidateQueries({ queryKey: ["staff_msg_history"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to send"),
    });

    const canSend = !!message.trim() && recipientCount > 0 && !send.isPending;

    return (
        <>
            <PageTitle title="Message Parents" />

            <div className="flex gap-2 mb-4">
                <button onClick={() => setTab("compose")}
                    className={`px-4 py-1.5 rounded text-sm font-bold border ${tab === "compose" ? "bg-[#159a52] border-[#159a52] text-white" : "bg-white border-slate-200 text-slate-500"}`}>
                    Compose
                </button>
                <button onClick={() => setTab("history")}
                    className={`px-4 py-1.5 rounded text-sm font-bold border inline-flex items-center gap-1.5 ${tab === "history" ? "bg-[#159a52] border-[#159a52] text-white" : "bg-white border-slate-200 text-slate-500"}`}>
                    <History className="w-3.5 h-3.5" /> History
                </button>
            </div>

            {tab === "compose" ? (
                isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading your classes…
                    </div>
                ) : classes.length === 0 ? (
                    <PanelCard title="No classes">
                        <p className="text-sm text-slate-500">You aren't assigned to any class yet, so there are no parents to message.</p>
                    </PanelCard>
                ) : (
                    <>
                        <PanelCard title="Recipients">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Class</label>
                                    <select value={activeClass?.className || ""} onChange={(e) => { setClassName(e.target.value); setSelected({}); }}
                                        className="w-full h-10 px-3 border border-black/10 rounded text-sm bg-white">
                                        {classes.map((c) => <option key={c.className} value={c.className}>{c.className} ({c.students.length})</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-[#159a52]" />
                                        <span><b>{withPhone.length}</b> of {students.length} have a parent phone.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] text-slate-500">
                                    Tick students to message their parents, or leave all unticked to message the <b>whole class</b>.
                                </p>
                                {withPhone.length > 0 && (
                                    <button onClick={toggleAll} className="text-[11px] font-bold text-[#159a52]">
                                        {allChecked ? "Clear all" : "Select all"}
                                    </button>
                                )}
                            </div>

                            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 border border-slate-100 rounded-lg">
                                {students.map((s) => (
                                    <label key={s.studentId} className={`flex items-center justify-between px-3 py-2 ${s.hasPhone ? "cursor-pointer hover:bg-slate-50" : "opacity-60"}`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <input type="checkbox" disabled={!s.hasPhone} checked={!!selected[s.studentId]} onChange={() => toggle(s.studentId)} className="accent-[#159a52]" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-700 truncate">{s.name}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{s.registrationNo || "—"}</p>
                                            </div>
                                        </div>
                                        {s.hasPhone
                                            ? <span className="text-[11px] text-slate-500 flex items-center gap-1 flex-shrink-0"><Phone className="w-3 h-3" /> {s.parentPhone}</span>
                                            : <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 flex-shrink-0"><AlertCircle className="w-3 h-3" /> No phone</span>}
                                    </label>
                                ))}
                            </div>
                        </PanelCard>

                        <PanelCard title="Message"
                            action={
                                <button disabled={!canSend} onClick={() => send.mutate()}
                                    className="inline-flex items-center gap-1.5 bg-white text-[#0f5132] text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50">
                                    {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send to {recipientCount}
                                </button>
                            }>
                            <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))} rows={4}
                                placeholder="e.g. Dear parent, kindly ensure your child completes the assigned homework by Monday. Thank you."
                                className="w-full px-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#159a52]/40" />
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-[11px] text-slate-400">The school name is added automatically. Sent as SMS.</p>
                                <p className="text-[11px] text-slate-400">{message.length}/{MAX_LEN}</p>
                            </div>
                        </PanelCard>
                    </>
                )
            ) : (
                <PanelCard title="Sent Messages">
                    {history.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-semibold">You haven't sent any messages yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {history.map((h: any) => (
                                <div key={h._id} className="py-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-700">{h.message}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> {h.phone} · {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}</p>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 ${h.status === "sent" ? "bg-emerald-100 text-emerald-700" : h.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
                                        {h.status === "sent" && <Check className="w-3 h-3" />}{h.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>
            )}
        </>
    );
}
