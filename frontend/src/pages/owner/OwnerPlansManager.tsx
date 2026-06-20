import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRIMARY = "#534AB7";
const ksh = (n: any) => `KES ${Number(n || 0).toLocaleString()}`;

// Modules a plan can include (matches sidebar module keys).
// Must mirror the sidebar `moduleKey` values in AppSidebar.tsx — otherwise a
// locked module can never be enabled by any plan. Excludes the ALWAYS-available
// keys (dashboard, settings, students, employees, classes, subjects) which are
// never plan-restricted.
const MODULES = [
    "fees", "accounts", "salary", "attendance", "timetable", "exams", "reports",
    "communications", "transport", "hostel", "library", "cafeteria", "pos",
    "sports", "trips", "frontdesk", "secretary", "certificates", "live_class",
    "academic_system", "academics_content", "behaviour", "question_paper",
    "integrations", "custom_domain", "nemis", "expenses",
];

const MODULE_LABEL: Record<string, string> = {
    live_class: "Live Class & LMS", pos: "Point of Sale", frontdesk: "Front Desk",
    academic_system: "Academic System", academics_content: "Academic Content",
    behaviour: "Behaviour & Skills", question_paper: "Question Paper",
    custom_domain: "Custom Domain & Branding", integrations: "Integrations", nemis: "NEMIS Assistant", expenses: "Expense Management",
};
const moduleLabel = (m: string) => MODULE_LABEL[m] || m.charAt(0).toUpperCase() + m.slice(1);

type PlanForm = { name: string; price: number; maxStudents: string; modules: string[]; description: string; isActive: boolean; durationDays: number; graceDays: number };
const blank: PlanForm = { name: "", price: 0, maxStudents: "", modules: [], description: "", isActive: true, durationDays: 30, graceDays: 0 };

export default function OwnerPlansManager() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<PlanForm>(blank);

    const { data: plans = [], isLoading } = useQuery({
        queryKey: ["owner_plans_mgr"],
        queryFn: async () => { try { const r = await api.get("/owner/plans"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    const save = useMutation({
        mutationFn: async () => {
            const body = { ...form, maxStudents: form.maxStudents === "" ? null : Number(form.maxStudents) };
            return editId ? api.patch(`/owner/plans/${editId}`, body) : api.post("/owner/plans", body);
        },
        onSuccess: () => { toast.success(editId ? "Plan updated" : "Plan created"); setOpen(false); setEditId(null); setForm(blank); qc.invalidateQueries({ queryKey: ["owner_plans_mgr"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const remove = useMutation({
        mutationFn: async (id: string) => api.delete(`/owner/plans/${id}`),
        onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["owner_plans_mgr"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const openCreate = () => { setEditId(null); setForm(blank); setOpen(true); };
    const openEdit = (p: any) => {
        setEditId(p._id);
        setForm({
            name: p.name || "", price: Number(p.priceMonthly ?? p.price ?? 0),
            maxStudents: p.limits?.maxStudents == null ? "" : String(p.limits.maxStudents),
            modules: Array.isArray(p.modules) ? p.modules : [], description: p.description || "",
            isActive: p.isActive !== false,
            durationDays: Number(p.durationDays) > 0 ? Number(p.durationDays) : 30,
            graceDays: Number(p.graceDays) >= 0 ? Number(p.graceDays) : 0,
        });
        setOpen(true);
    };
    const toggleModule = (m: string) => setForm((f) => ({ ...f, modules: f.modules.includes(m) ? f.modules.filter((x) => x !== m) : [...f.modules, m] }));

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div><h2 className="text-lg font-black text-slate-800">Pricing Plans</h2><p className="text-xs text-slate-500">Create plans, choose included modules, and set the student limit</p></div>
                <button onClick={openCreate} className="h-10 px-4 text-white rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: PRIMARY }}><Plus className="w-4 h-4" /> New Plan</button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.length === 0 && <div className="col-span-3 text-center py-10 text-slate-400 text-sm">No plans yet — create your first plan.</div>}
                    {plans.map((p: any) => (
                        <div key={p._id} className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #e5e7eb" }}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-base font-black text-slate-800">{p.name}</h3>
                                    <p className="text-xl font-black mt-1" style={{ color: PRIMARY }}>{ksh(p.priceMonthly ?? p.price)}<span className="text-xs text-slate-400 font-bold">/mo</span></p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${p.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{p.isActive !== false ? "Active" : "Inactive"}</span>
                            </div>
                            <div className="mt-3 text-xs text-slate-500 space-y-1">
                                <div className="flex justify-between"><span>Max Students</span><b className="text-slate-700">{p.limits?.maxStudents == null ? "Unlimited" : Number(p.limits.maxStudents).toLocaleString()}</b></div>
                                <div className="flex justify-between"><span>Modules</span><b className="text-slate-700">{Array.isArray(p.modules) ? p.modules.length : 0}</b></div>
                            </div>
                            {p.description && <p className="text-[11px] text-slate-400 mt-2">{p.description}</p>}
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => openEdit(p)} className="flex-1 h-9 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5" style={{ border: "0.5px solid #e5e7eb" }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                                <button onClick={() => { if (confirm("Delete this plan?")) remove.mutate(p._id); }} className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-black text-slate-800">{editId ? "Edit Plan" : "New Plan"}</h2>
                            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Plan Name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Pro" className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Price / month (KES)</label><input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                            </div>
                            <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Max Students <span className="text-slate-400 font-normal">(blank = unlimited)</span></label><input type="number" value={form.maxStudents} onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))} placeholder="e.g. 500" className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Duration (days)</label><input type="number" value={form.durationDays} onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))} placeholder="30" className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Grace Period (days)</label><input type="number" value={form.graceDays} onChange={(e) => setForm((f) => ({ ...f, graceDays: Number(e.target.value) }))} placeholder="0" className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                            </div>
                            <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }} /></div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Included Modules ({form.modules.length})</label>
                                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg max-h-44 overflow-y-auto" style={{ border: "0.5px solid #e5e7eb" }}>
                                    {MODULES.map((m) => {
                                        const on = form.modules.includes(m);
                                        return <button type="button" key={m} onClick={() => toggleModule(m)} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${on ? "text-white" : "bg-white text-slate-600 border-slate-200"}`} style={on ? { background: PRIMARY, borderColor: PRIMARY } : {}}>{on && <Check className="w-3 h-3 inline mr-0.5" />}{moduleLabel(m)}</button>;
                                    })}
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active (available to assign)</label>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setOpen(false)} className="flex-1 h-10 rounded-xl text-slate-600 font-bold text-sm" style={{ border: "0.5px solid #e5e7eb" }}>Cancel</button>
                            <button onClick={() => { if (!form.name) { toast.error("Plan name is required"); return; } save.mutate(); }} disabled={save.isPending} className="flex-1 h-10 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>{save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editId ? "Update" : "Create"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
