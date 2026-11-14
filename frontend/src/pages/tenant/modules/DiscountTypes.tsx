import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Tag, Download, Edit2, Trash2, Percent, DollarSign, Gift, Loader2, X, Check } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";

type Tab = "Active" | "Seasonal" | "Configurations";

const emptyForm = { name: "", type: "Percentage", value: "", status: "Active", isSeasonal: false, validFrom: "", validTo: "" };

export default function DiscountTypes() {
    const [tab, setTab] = useState<Tab>("Active");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState({ ...emptyForm });

    const { items: discounts = [], isLoading, createItem, updateItem, deleteItem, isCreating, isUpdating } = useItems("discount_types");

    const handleOpenModal = (item: any = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name || "", type: item.type || "Percentage", value: item.value || "", status: item.status || "Active", isSeasonal: !!item.isSeasonal, validFrom: item.validFrom || "", validTo: item.validTo || "" });
        } else {
            setEditingItem(null);
            setFormData({ ...emptyForm, isSeasonal: tab === "Seasonal" });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) await updateItem({ id: editingItem._id, ...formData });
            else await createItem(formData);
            setIsModalOpen(false);
        } catch { /* toast handled by useItems */ }
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Delete "${name}"? This can't be undone.`)) deleteItem(id);
    };

    // ── Filtering per tab ────────────────────────────────────────────────────
    const visible = useMemo(() => {
        let list = discounts as any[];
        if (tab === "Active") list = list.filter(d => d.status === "Active");
        else if (tab === "Seasonal") list = list.filter(d => d.isSeasonal);
        if (statusFilter !== "All") list = list.filter(d => d.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(d => [d.name, d.type].filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q)));
        }
        return list;
    }, [discounts, tab, statusFilter, search]);

    const exportCsv = () => {
        const rows = [["Name", "Method", "Value", "Status", "Seasonal", "Valid From", "Valid To"],
            ...visible.map(d => [d.name, d.type, d.value, d.status, d.isSeasonal ? "Yes" : "No", d.validFrom || "", d.validTo || ""])];
        const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a"); a.href = url; a.download = "discount-types.csv"; a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col pb-10">
            <div className="bg-white border-b border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between m-4 rounded-xl">
                <div>
                    <h1 className="text-xl font-black text-slate-900">Discount Types</h1>
                    <p className="text-sm text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                        <Tag className="w-3.5 h-3.5 text-amber-400" /> Scholarships, sibling discounts, and seasonal fee waivers.
                    </p>
                </div>
                <button onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-sm transition-all">
                    <Plus className="w-4 h-4" /> Create Discount Type
                </button>
            </div>

            <div className="px-6 flex flex-col gap-5">
                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
                    {(["Active", "Seasonal", "Configurations"] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wide border-b-2 -mb-px transition-all ${tab === t ? "border-[#5C67F2] text-[#5C67F2]" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {tab === "Configurations" ? (
                    <ConfigurationsPanel />
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        {/* Toolbar */}
                        <div className="flex flex-col md:flex-row gap-3 mb-5">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search discounts by name or type…"
                                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                            </div>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white">
                                {["All", "Active", "Draft", "Archived"].map(s => <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>)}
                            </select>
                            <button onClick={exportCsv} disabled={!visible.length}
                                className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 disabled:opacity-40">
                                <Download className="w-4 h-4" /> Export
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-3 px-4">Discount Name</th>
                                        <th className="py-3 px-4">Method</th>
                                        <th className="py-3 px-4">Value</th>
                                        {tab === "Seasonal" && <th className="py-3 px-4">Valid Period</th>}
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr><td colSpan={6} className="py-16 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline" /></td></tr>
                                    ) : visible.length === 0 ? (
                                        <tr><td colSpan={6} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Gift className="w-10 h-10 text-slate-200" />
                                                <p className="font-bold text-sm">No discount types found{tab === "Seasonal" ? " — mark one as seasonal to see it here." : ". Create one to get started."}</p>
                                            </div>
                                        </td></tr>
                                    ) : visible.map((d: any) => (
                                        <DiscountRow key={d._id} d={d} showPeriod={tab === "Seasonal"} onEdit={() => handleOpenModal(d)} onDelete={() => handleDelete(d._id, d.name)} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Footer Info */}
                <div className="flex items-center gap-4 p-5 bg-[#5C67F2]/5 rounded-2xl border border-[#5C67F2]/10 mb-4">
                    <div className="w-10 h-10 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white flex-shrink-0">
                        <Gift className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm">Automated Discounts</h4>
                        <p className="text-slate-500 text-xs font-medium">Active discounts apply automatically to student invoices during the billing cycle.</p>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 bg-[#5C67F2] text-white flex items-center justify-between">
                            <h3 className="text-base font-black">{editingItem ? "Edit Discount" : "New Discount Type"}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Discount Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] font-bold text-slate-700 text-sm"
                                    placeholder="e.g. Sibling Discount" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Method</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] font-bold text-slate-700 text-sm">
                                        <option value="Percentage">Percentage (%)</option>
                                        <option value="Fixed Amount">Fixed Amount</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Value</label>
                                    <input required value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] font-bold text-slate-700 text-sm"
                                        placeholder={formData.type === "Percentage" ? "e.g. 15" : "e.g. 5000"} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                                <div className="flex gap-2">
                                    {["Active", "Draft", "Archived"].map(s => (
                                        <button key={s} type="button" onClick={() => setFormData({ ...formData, status: s })}
                                            className={`flex-1 h-10 rounded-xl font-bold text-xs transition-all border ${formData.status === s ? "bg-[#5C67F2] border-[#5C67F2] text-white" : "bg-white border-slate-200 text-slate-400 hover:border-[#5C67F2]/40"}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-center justify-between py-1 cursor-pointer">
                                <span className="text-xs font-bold text-slate-600">Seasonal discount (only valid for a set period)</span>
                                <button type="button" onClick={() => setFormData(f => ({ ...f, isSeasonal: !f.isSeasonal }))}
                                    className={`w-10 h-6 rounded-full p-0.5 transition-colors ${formData.isSeasonal ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                                    <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.isSeasonal ? "translate-x-4" : ""}`} />
                                </button>
                            </label>
                            {formData.isSeasonal && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valid From</label>
                                        <input type="date" value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                                            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] font-bold text-slate-700 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valid To</label>
                                        <input type="date" value={formData.validTo} onChange={e => setFormData({ ...formData, validTo: e.target.value })}
                                            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] font-bold text-slate-700 text-sm" />
                                    </div>
                                </div>
                            )}
                            <button disabled={isCreating || isUpdating}
                                className="w-full h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                {(isCreating || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {editingItem ? "Update Discount" : "Create Discount Type"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function DiscountRow({ d, showPeriod, onEdit, onDelete }: { d: any; showPeriod: boolean; onEdit: () => void; onDelete: () => void }) {
    const statusColors: Record<string, string> = {
        Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
        Draft: "bg-purple-50 text-purple-700 border-purple-200",
        Archived: "bg-slate-100 text-slate-500 border-slate-200",
    };
    return (
        <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${d.type === "Percentage" ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"}`}>
                        {d.type === "Percentage" ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    </div>
                    <span className="font-black text-slate-800">{d.name}</span>
                </div>
            </td>
            <td className="py-3 px-4 text-slate-500 font-bold">{d.type}</td>
            <td className="py-3 px-4 font-black text-slate-900">{d.value}{d.type === "Percentage" ? "%" : ""}</td>
            {showPeriod && <td className="py-3 px-4 text-xs text-slate-500 font-bold">{d.validFrom || "—"} → {d.validTo || "—"}</td>}
            <td className="py-3 px-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${statusColors[d.status] || statusColors.Draft}`}>{d.status}</span>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1.5">
                    <button onClick={onEdit} className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-500 flex items-center justify-center transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={onDelete} className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </td>
        </tr>
    );
}

// ── Configurations tab: global discount policy, applied when discounts are billed ──
function ConfigurationsPanel() {
    const { items, isLoading, createItem, updateItem, isCreating, isUpdating } = useItems("discount_settings");
    const doc = (items as any[])?.[0] || null;
    const [autoApplySiblings, setAutoApplySiblings] = useState(false);
    const [requireApproval, setRequireApproval] = useState(false);
    const [maxCombined, setMaxCombined] = useState("");
    useEffect(() => {
        if (!doc) return;
        setAutoApplySiblings(!!doc.autoApplySiblings);
        setRequireApproval(!!doc.requireApproval);
        setMaxCombined(doc.maxCombinedPercent != null ? String(doc.maxCombinedPercent) : "");
    }, [doc?._id]);

    const save = () => {
        const payload = { autoApplySiblings, requireApproval, maxCombinedPercent: maxCombined ? Number(maxCombined) : null };
        if (doc?._id) updateItem({ id: doc._id, ...payload });
        else createItem(payload);
    };

    const Toggle = ({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) => (
        <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
            <div>
                <p className="text-sm font-bold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{hint}</p>
            </div>
            <button onClick={() => onChange(!on)} className={`w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0 ${on ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : ""}`} />
            </button>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-xl">
            <h3 className="text-sm font-black text-slate-800 mb-1">Discount Policy</h3>
            <p className="text-xs text-slate-400 mb-4">Rules applied automatically when discounts are billed to invoices.</p>
            {isLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
            ) : (
                <>
                    <Toggle label="Auto-apply to siblings" hint="Automatically apply an active sibling discount when a family has more than one enrolled student." on={autoApplySiblings} onChange={setAutoApplySiblings} />
                    <Toggle label="Require admin approval" hint="A discount must be approved by an admin before it reduces a student's invoice." on={requireApproval} onChange={setRequireApproval} />
                    <div className="py-3">
                        <p className="text-sm font-bold text-slate-700">Maximum combined discount</p>
                        <p className="text-xs text-slate-400 mb-2">Cap on how much a student's fees can be reduced when multiple discounts apply, as a %.</p>
                        <div className="flex items-center gap-2">
                            <input type="number" min={0} max={100} value={maxCombined} onChange={e => setMaxCombined(e.target.value)} placeholder="No limit"
                                className="w-32 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                            <span className="text-sm font-bold text-slate-400">%</span>
                        </div>
                    </div>
                    <button onClick={save} disabled={isCreating || isUpdating}
                        className="mt-4 h-10 px-6 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 disabled:opacity-50">
                        {(isCreating || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Policy
                    </button>
                </>
            )}
        </div>
    );
}
