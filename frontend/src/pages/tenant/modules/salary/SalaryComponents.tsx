import { useState } from "react";
import {
    Home, Plus, Trash2, Pencil, Check, X, Loader2,
    TrendingUp, TrendingDown, Gift, Percent, DollarSign
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "allowance" | "deduction" | "bonus";
type AmountType = "fixed" | "percentage";

interface Component {
    _id: string;
    name: string;
    category: Category;
    amountType: AmountType;
    amount: number;
    percentage: number;
    description: string;
    isActive: boolean;
    createdAt: string;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { key: Category; label: string; icon: React.ElementType; color: string; bg: string; border: string }[] = [
    {
        key: "allowance",
        label: "Allowances",
        icon: TrendingUp,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
    },
    {
        key: "deduction",
        label: "Deductions",
        icon: TrendingDown,
        color: "text-rose-600",
        bg: "bg-rose-50",
        border: "border-rose-200",
    },
    {
        key: "bonus",
        label: "Bonuses",
        icon: Gift,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
    },
];

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = {
    name: "",
    amountType: "fixed" as AmountType,
    amount: "",
    percentage: "",
    description: "",
    isActive: true,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalaryComponents() {
    const [activeTab, setActiveTab] = useState<Category>("allowance");
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const { data: allComponents = [], isLoading } = useQuery<Component[]>({
        queryKey: ["salary_components"],
        queryFn: async () => {
            const r = await api.get("/salary/components");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const items = allComponents.filter((c) => c.category === activeTab);

    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (editId) {
                return api.patch(`/salary/components/${editId}`, payload);
            }
            return api.post("/salary/components", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["salary_components"] });
            toast.success(editId ? "Component updated" : "Component added");
            setForm(emptyForm);
            setEditId(null);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/salary/components/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["salary_components"] });
            toast.success("Component removed");
            setDeletingId(null);
        },
        onError: () => toast.error("Failed to delete"),
    });

    const handleSubmit = () => {
        const name = form.name.trim();
        if (!name) { toast.error("Name is required"); return; }
        if (form.amountType === "fixed" && (!form.amount || Number(form.amount) <= 0)) {
            toast.error("Enter a valid fixed amount"); return;
        }
        if (form.amountType === "percentage" && (!form.percentage || Number(form.percentage) <= 0 || Number(form.percentage) > 100)) {
            toast.error("Enter a valid percentage (1–100)"); return;
        }

        saveMutation.mutate({
            name,
            category: activeTab,
            amountType: form.amountType,
            amount: form.amountType === "fixed" ? Number(form.amount) : 0,
            percentage: form.amountType === "percentage" ? Number(form.percentage) : 0,
            description: form.description.trim(),
            isActive: form.isActive,
        });
    };

    const handleEdit = (item: Component) => {
        setEditId(item._id);
        setForm({
            name: item.name,
            amountType: item.amountType,
            amount: String(item.amount || ""),
            percentage: String(item.percentage || ""),
            description: item.description || "",
            isActive: item.isActive,
        });
        // Scroll to form
        document.getElementById("component-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const handleCancelEdit = () => {
        setEditId(null);
        setForm(emptyForm);
    };

    const tab = TABS.find((t) => t.key === activeTab)!;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Salary</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Salary Components</span>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-10">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                        Salary Components
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                        Define allowances, deductions, and bonuses that can be applied to employee payroll
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8">
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const count = allComponents.filter((c) => c.category === t.key).length;
                        const isActive = activeTab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => { setActiveTab(t.key); handleCancelEdit(); }}
                                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border ${
                                    isActive
                                        ? `${t.bg} ${t.color} ${t.border} shadow-sm`
                                        : "bg-white text-slate-500 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? t.color : "text-slate-400"}`} />
                                {t.label}
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                                    isActive ? `${t.bg} ${t.color}` : "bg-slate-100 text-slate-500"
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                    {/* ── Add / Edit Form ────────────────────────────────── */}
                    <div id="component-form" className="md:col-span-2">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7 relative">
                            {/* Tag */}
                            <div className={`absolute -top-3 left-6 text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase ${
                                editId ? "bg-amber-500" : "bg-[#5C67F2]"
                            }`}>
                                {editId ? "Edit Component" : `Add ${tab.label.slice(0, -1)}`}
                            </div>

                            {editId && (
                                <button onClick={handleCancelEdit}
                                    className="absolute top-5 right-5 text-slate-300 hover:text-rose-400 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            )}

                            <div className="space-y-5 mt-2">
                                {/* Name */}
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">
                                        Name*
                                    </div>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder={
                                            activeTab === "allowance" ? "e.g. Housing Allowance" :
                                            activeTab === "deduction" ? "e.g. SACCO Loan" :
                                            "e.g. Performance Bonus"
                                        }
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700 transition-all"
                                    />
                                </div>

                                {/* Amount Type Toggle */}
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Amount Type</p>
                                    <div className="flex gap-2">
                                        {[{ value: "fixed", label: "Fixed (KSh)", icon: DollarSign }, { value: "percentage", label: "% of Basic", icon: Percent }].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setForm({ ...form, amountType: opt.value as AmountType })}
                                                className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${
                                                    form.amountType === opt.value
                                                        ? "bg-[#5C67F2] text-white border-[#5C67F2] shadow-sm"
                                                        : "bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200"
                                                }`}
                                            >
                                                <opt.icon className="w-3.5 h-3.5" />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Amount or Percentage */}
                                {form.amountType === "fixed" ? (
                                    <div className="relative group">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">
                                            Amount (KSh)*
                                        </div>
                                        <input
                                            type="number"
                                            value={form.amount}
                                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                            placeholder="0"
                                            min="0"
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700"
                                        />
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">
                                            Percentage of Basic (%)*
                                        </div>
                                        <input
                                            type="number"
                                            value={form.percentage}
                                            onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                                            placeholder="e.g. 15"
                                            min="1"
                                            max="100"
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700"
                                        />
                                    </div>
                                )}

                                {/* Description */}
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">
                                        Description
                                    </div>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Optional notes..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700 resize-none"
                                    />
                                </div>

                                {/* Active toggle */}
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Active</span>
                                    <button
                                        onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                        className={`w-11 h-6 rounded-full transition-all relative ${form.isActive ? "bg-[#5C67F2]" : "bg-slate-200"}`}
                                    >
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? "right-0.5" : "left-0.5"}`} />
                                    </button>
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={saveMutation.isPending}
                                    className="w-full h-11 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                                >
                                    {saveMutation.isPending
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <>{editId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}</>
                                    }
                                    {editId ? "Save Changes" : `Add ${tab.label.slice(0, -1)}`}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Items List ─────────────────────────────────────── */}
                    <div className="md:col-span-3 space-y-3">
                        {/* Section header */}
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {items.length} {tab.label} defined
                            </h3>
                        </div>

                        {isLoading ? (
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase">
                                <Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" /> Loading...
                            </div>
                        ) : items.length === 0 ? (
                            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center h-40 text-slate-400 text-xs font-bold uppercase tracking-widest gap-2">
                                <tab.icon className={`w-6 h-6 ${tab.color} opacity-40`} />
                                No {tab.label.toLowerCase()} defined yet
                            </div>
                        ) : (
                            items.map((item) => {
                                const isEditing = editId === item._id;
                                const isDeleting = deletingId === item._id;
                                return (
                                    <div
                                        key={item._id}
                                        className={`bg-white rounded-[1.5rem] border shadow-sm px-6 py-5 flex items-center justify-between gap-4 transition-all ${
                                            isEditing
                                                ? "border-amber-200 bg-amber-50/30"
                                                : "border-slate-100 hover:border-slate-200"
                                        }`}
                                    >
                                        {/* Left: Icon + Info */}
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${tab.bg}`}>
                                                {item.amountType === "percentage"
                                                    ? <Percent className={`w-4 h-4 ${tab.color}`} />
                                                    : <tab.icon className={`w-4 h-4 ${tab.color}`} />
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-xs font-black text-slate-800 uppercase">{item.name}</p>
                                                    {!item.isActive && (
                                                        <span className="text-[8px] px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full font-black uppercase tracking-widest">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                {item.description && (
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{item.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Center: Amount badge */}
                                        <div className={`flex-shrink-0 px-4 py-2 rounded-xl ${tab.bg} ${tab.border} border`}>
                                            <p className={`text-xs font-black ${tab.color} whitespace-nowrap`}>
                                                {item.amountType === "percentage"
                                                    ? `${item.percentage}% of Basic`
                                                    : `KSh ${Number(item.amount).toLocaleString()}`
                                                }
                                            </p>
                                            <p className="text-[8px] text-slate-400 font-black uppercase text-center mt-0.5">
                                                {item.amountType === "fixed" ? "Fixed" : "Variable"}
                                            </p>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center transition-colors border border-slate-100 hover:border-amber-100"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>

                                            {isDeleting ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => deleteMutation.mutate(item._id)}
                                                        disabled={deleteMutation.isPending}
                                                        className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center transition-colors"
                                                    >
                                                        {deleteMutation.isPending
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Check className="w-3.5 h-3.5" />
                                                        }
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingId(null)}
                                                        className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeletingId(item._id)}
                                                    className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors border border-slate-100 hover:border-rose-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
