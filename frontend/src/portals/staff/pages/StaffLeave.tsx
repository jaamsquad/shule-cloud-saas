import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CalendarPlus, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";

const LEAVE_TYPES = ["Annual", "Sick", "Maternity", "Paternity", "Compassionate", "Study", "Official Duty", "Unpaid"];
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

const StatusPill = ({ s }: { s: string }) => {
  const map: any = {
    approved: ["bg-emerald-50 text-emerald-700", CheckCircle2, "Approved"],
    rejected: ["bg-rose-50 text-rose-600", XCircle, "Rejected"],
    pending: ["bg-amber-50 text-amber-700", Clock, "Pending"],
  };
  const [cls, Icon, label] = map[s] || map.pending;
  return <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full ${cls}`}><Icon className="w-3 h-3" /> {label}</span>;
};

export default function StaffLeave() {
  const { api } = useOutletContext<StaffCtx>();
  const qc = useQueryClient();
  const [f, setF] = useState({ type: "Annual", startDate: "", endDate: "", reason: "" });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["staff_leave"],
    queryFn: async () => { const r = await api.get("/staff-portal/leave-requests"); return Array.isArray(r.data) ? r.data : []; },
  });

  const submit = useMutation({
    mutationFn: () => api.post("/staff-portal/leave-requests", f),
    onSuccess: () => { toast.success("Leave request submitted"); setF({ type: "Annual", startDate: "", endDate: "", reason: "" }); qc.invalidateQueries({ queryKey: ["staff_leave"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not submit"),
  });

  const days = f.startDate && f.endDate ? Math.max(0, Math.round((new Date(f.endDate).getTime() - new Date(f.startDate).getTime()) / 86400000) + 1) : 0;

  return (
    <>
      <PageTitle title="Leave Requests" />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <PanelCard title="Request Leave">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Leave type</label>
                <select value={f.type} onChange={e => set("type", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm">
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">From</label>
                  <input type="date" value={f.startDate} onChange={e => set("startDate", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">To</label>
                  <input type="date" value={f.endDate} min={f.startDate} onChange={e => set("endDate", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              {days > 0 && <p className="text-xs text-slate-500 font-semibold">{days} day{days > 1 ? "s" : ""}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Reason</label>
                <textarea value={f.reason} onChange={e => set("reason", e.target.value)} rows={3} placeholder="Briefly explain…" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <button onClick={() => f.startDate && f.endDate ? submit.mutate() : toast.error("Pick the dates")} disabled={submit.isPending}
                className="w-full h-11 bg-[#5C67F2] text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />} Submit request
              </button>
            </div>
          </PanelCard>
        </div>

        <div className="lg:col-span-2">
          <PanelCard title="My Requests">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
            ) : requests.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">You haven't requested any leave yet.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r: any) => (
                  <div key={r._id} className="flex items-center justify-between border-b border-black/5 py-3">
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{r.type} · {r.days} day{r.days > 1 ? "s" : ""}</p>
                      <p className="text-xs text-slate-400">{fmt(r.startDate)} → {fmt(r.endDate)}{r.reason ? ` · ${r.reason}` : ""}</p>
                      {r.note && <p className="text-[11px] text-slate-400 mt-0.5">Note: {r.note}</p>}
                    </div>
                    <StatusPill s={r.status} />
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </>
  );
}
