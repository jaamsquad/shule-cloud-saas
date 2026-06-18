import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, Trash2, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";

export default function OwnerReminders() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ title: "", note: "", dueAt: "" });

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ["owner_reminders"],
        queryFn: async () => { try { const r = await api.get("/owner/reminders"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const create = useMutation({
        mutationFn: async () => api.post("/owner/reminders", form),
        onSuccess: () => { toast.success("Reminder added"); setOpen(false); setForm({ title: "", note: "", dueAt: "" }); qc.invalidateQueries({ queryKey: ["owner_reminders"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const toggle = useMutation({
        mutationFn: async ({ id, done }: { id: string; done: boolean }) => api.patch(`/owner/reminders/${id}`, { done }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["owner_reminders"] }),
    });
    const remove = useMutation({
        mutationFn: async (id: string) => api.delete(`/owner/reminders/${id}`),
        onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["owner_reminders"] }); },
    });

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div><h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Bell className="w-5 h-5" style={{ color: PRIMARY }} /> My Reminders</h2><p className="text-xs text-slate-500">Personal to-dos & follow-ups</p></div>
                <button onClick={() => setOpen(true)} className="h-10 px-4 text-white rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: PRIMARY }}><Plus className="w-4 h-4" /> New Reminder</button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-14 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : rows.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center text-slate-400 text-sm" style={{ border: "0.5px solid #e5e7eb" }}>No reminders yet</div>
            ) : (
                <div className="space-y-2">
                    {rows.map((r: any) => (
                        <div key={r._id} className="bg-white rounded-xl p-4 flex items-center gap-3" style={{ border: "0.5px solid #e5e7eb" }}>
                            <button onClick={() => toggle.mutate({ id: r._id, done: !r.done })} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${r.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent"}`}><Check className="w-3.5 h-3.5" /></button>
                            <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm ${r.done ? "line-through text-slate-400" : "text-slate-800"}`}>{r.title}</div>
                                {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
                                {r.dueAt && <div className="text-[11px] font-bold text-amber-600 mt-0.5">Due {new Date(r.dueAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
                            </div>
                            <button onClick={() => remove.mutate(r._id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    ))}
                </div>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-5"><h2 className="font-black text-slate-800">New Reminder</h2><button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button></div>
                        <div className="space-y-3">
                            <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Title</label><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                            <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Note</label><textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm min-h-[70px]" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                            <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Due (optional)</label><input type="datetime-local" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setOpen(false)} className="flex-1 h-10 rounded-xl text-slate-600 font-bold text-sm" style={{ border: "0.5px solid #e5e7eb" }}>Cancel</button>
                            <button onClick={() => { if (!form.title) { toast.error("Title required"); return; } create.mutate(); }} disabled={create.isPending} className="flex-1 h-10 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>{create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
