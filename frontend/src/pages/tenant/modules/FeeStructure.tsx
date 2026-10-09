import { useState, useEffect } from "react";
import { Plus, Search, Filter, FileText, Download, Edit2, Trash2, Calendar, BookOpen, Layers, X, Loader2, Check, Home, Sparkles, Receipt, ListFilter, HelpCircle } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { FeesPage } from "@/components/fees/FeesUI";
import { Layers as LayersPageIcon } from "lucide-react";

export default function FeeStructure() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("Active");
    const [view, setView] = useState<"list" | "form">("list");
    const [searchTerm, setSearchTerm] = useState("");

    const { items: structures, isLoading } = useItems("fee_structures");
    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });

    const { data: academicYears = [] } = useQuery<any[]>({
        queryKey: ["v2_academic_years_fs"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });
    const { data: terms = [] } = useQuery<any[]>({
        queryKey: ["v2_terms_fs"],
        queryFn: async () => (await api.get("/v2/terms")).data || [],
    });
    const activeYear = academicYears.find((y: any) => y.isActive) || academicYears[0];
    const termsOfYear = (yearId: string) => terms.filter((t: any) => String(t.academicYearId) === String(yearId));
    const activeTerm = (yearId: string) => termsOfYear(yearId).find((t: any) => t.isActive) || termsOfYear(yearId)[0];

    // Dynamic extraction of unique fee particulars from all category configurations
    const { data: rawParticulars = [], data: particularsData = [] } = useQuery({
        queryKey: ["fee_particulars"],
        queryFn: async () => {
            const r = await api.get("/fee_particulars");
            const dataArray = Array.isArray(r.data) ? r.data : [];
            const allParticulars = dataArray.flatMap((c: any) => c.particulars || []);
            // Map to store unique particulars by label
            const uniqueMap = new Map();
            allParticulars.forEach((p: any) => {
                if (p && p.label) {
                    uniqueMap.set(p.label, p);
                }
            });
            const unique = Array.from(uniqueMap.values());
            return unique;
        },
    });

    // Map raw particular keys → human-readable names for display.
    const labelMap = new Map<string, string>();
    (particularsData || []).forEach((p: any) => { if (p?.label) labelMap.set(p.label, p.name || p.title || p.label); });
    const prettyLabel = (label: string) => {
        if (labelMap.has(label)) return labelMap.get(label)!;
        if (/^CUSTOM[-_]?\d+$/i.test(label)) return "Custom Charge";
        return String(label).replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    };

    const [formData, setFormData] = useState<any>({
        name: "",
        classIds: [] as string[],
        academic_year_id: "",
        semester_id: "",
        amounts: {}
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleDeleteConfirm = () => {
        if (deleteConfirmId) {
            deleteMutation.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
        }
    };

    useEffect(() => {
        if (activeYear && !formData.academic_year_id) {
            const t = activeTerm(activeYear._id);
            setFormData((prev: any) => ({ ...prev, academic_year_id: String(activeYear._id), semester_id: t ? String(t._id) : prev.semester_id }));
        }
    }, [activeYear]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleOpenCreateModal = () => {
        setEditingId(null);
        const t = activeYear ? activeTerm(activeYear._id) : null;
        setFormData({ name: "", classIds: [], academic_year_id: activeYear ? String(activeYear._id) : "", semester_id: t ? String(t._id) : "", amounts: {} });
        setView("form");
    };

    const createMutation = useMutation({
        mutationFn: async (newData: any) => {
            const total = Object.values(newData.amounts).reduce((acc: number, curr: any) => acc + (parseFloat(curr as string) || 0), 0);
            const items = Object.entries(newData.amounts).map(([label, val]) => ({ category: label, amount: parseFloat(val as string) || 0, is_required: true }));
            const firstClass = classes.find((c: any) => newData.classIds.includes(c._id));
            const payload = {
                name: newData.name, class_ids: newData.classIds, academic_year_id: newData.academic_year_id, semester_id: newData.semester_id,
                items, total, status: "Active",
                // legacy fields some older screens still read
                className: firstClass?.name || firstClass?.levelName || "",
                term: terms.find((t: any) => t._id === newData.semester_id)?.name || "", year: academicYears.find((y: any) => y._id === newData.academic_year_id)?.year || "",
                amounts: newData.amounts,
            };
            if (editingId) {
                return api.patch(`/fee_structures/${editingId}`, payload);
            } else {
                return api.post("/fee_structures", payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fee_structures"] });
            queryClient.invalidateQueries({ queryKey: ["fees_overview"] });
            toast.success(editingId ? "Fee structure updated successfully" : "Fee structure created successfully");
            setView("list");
            setEditingId(null);
            handleOpenCreateModal();
        },
        onError: (err: any) => toast.error(err?.response?.data?.errors?.[0]?.message || err?.response?.data?.message || "Failed to save"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/fee_structures/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fee_structures"] });
            toast.success("Fee structure deleted");
        },
    });

    const toggleClass = (selectedClass: string) => {
        setFormData((prev: any) => {
            const has = prev.classIds.includes(selectedClass);
            const classIds = has ? prev.classIds.filter((c: string) => c !== selectedClass) : [...prev.classIds, selectedClass];
            const updatedAmounts = { ...prev.amounts };
            if (!has) {
                const cls = classes.find((c: any) => c._id === selectedClass);
                const label = cls?.name || cls?.levelName || "";
                // Auto pre-fill tuition fees if configured class-wise
                rawParticulars.forEach((p: any) => {
                    if (p.classAmounts && p.classAmounts[label]) {
                        updatedAmounts[p.label] = p.classAmounts[label];
                    } else if (p.amount) {
                        // Fallback to prefix default amount if not already custom set
                        if (!updatedAmounts[p.label]) {
                            updatedAmounts[p.label] = p.amount;
                        }
                    }
                });
            }
            return { ...prev, classIds, amounts: updatedAmounts };
        });
    };

    const tabs = ["Active", "Archived"];

    const filteredStructures = structures?.filter((s: any) => {
        // Tab filtering
        const matchesTab = s.status === activeTab || (!s.status && activeTab === "Active");
        if (!matchesTab) return false;

        // Search term filtering
        const q = searchTerm.toLowerCase();
        return !q || s.name?.toLowerCase().includes(q) || s.className?.toLowerCase().includes(q) ||
               s.term?.toLowerCase().includes(q) || String(s.year ?? "").includes(searchTerm);
    });

    if (view === "form") {
        return (
            <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
                {/* Breadcrumb Header */}
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl">
                    <div className="flex items-center text-sm font-medium text-gray-500">
                        <span className="font-bold text-gray-800 text-base mr-2">Finance</span>
                        <span className="text-gray-300 mx-2">|</span>
                        <Home className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="text-gray-500 font-semibold">- Fee Structures</span>
                        <span className="text-gray-300 mx-2">|</span>
                        <span className="text-[#5C67F2] font-semibold">{editingId ? "Edit Fee Structure" : "New Fee Structure"}</span>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto w-full px-6 space-y-8 pb-20 mt-4">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-3">
                                {editingId ? "Edit Fee Structure" : "New Fee Structure"} <Sparkles className="w-5 h-5 text-[#5C67F2]" />
                            </h1>
                            <p className="text-slate-400 font-bold text-xs flex items-center gap-2 uppercase tracking-widest">
                                <Layers className="w-4 h-4 text-[#5C67F2]" /> Define tuition and related fees for a specific class term.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setView("list");
                                setEditingId(null);
                                handleOpenCreateModal();
                            }}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition-all transform active:scale-95 text-xs uppercase tracking-widest"
                        >
                            Back to List
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="relative col-span-2">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Structure Name*</div>
                                <input
                                    type="text"
                                    placeholder="e.g. Grade 4 Term 2 Fees"
                                    className="w-full h-12 px-6 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-black text-xs bg-slate-50/50 shadow-inner"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="relative col-span-2">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Classes* (pick one or more)</div>
                                <div className="w-full min-h-12 px-4 py-3 border border-slate-100 rounded-2xl bg-slate-50/50 shadow-inner flex flex-wrap gap-2">
                                    {classes.length === 0 && <span className="text-[10px] text-slate-400 font-bold uppercase py-1.5">No classes created yet</span>}
                                    {classes.map((c: any) => {
                                        const on = formData.classIds.includes(c._id);
                                        return (
                                            <button key={c._id} type="button" onClick={() => toggleClass(c._id)}
                                                className={`px-3 h-8 rounded-full text-[10px] font-black uppercase tracking-wide border transition-all ${on ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-200"}`}>
                                                {c.name || c.levelName}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Academic Year*</div>
                                <select
                                    className="w-full h-12 px-6 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-black text-xs bg-slate-50/50 shadow-inner appearance-none cursor-pointer"
                                    value={formData.academic_year_id}
                                    onChange={(e) => { const t = activeTerm(e.target.value); setFormData({ ...formData, academic_year_id: e.target.value, semester_id: t ? String(t._id) : "" }); }}
                                >
                                    <option value="">Select year…</option>
                                    {academicYears.map((y: any) => <option key={y._id} value={y._id}>{y.year}{y.isActive ? " (Current)" : ""}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Term*</div>
                                <select
                                    className="w-full h-12 px-6 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-black text-xs bg-slate-50/50 shadow-inner appearance-none cursor-pointer"
                                    value={formData.semester_id}
                                    onChange={(e) => setFormData({ ...formData, semester_id: e.target.value })}
                                    disabled={!formData.academic_year_id}
                                >
                                    <option value="">Select term…</option>
                                    {termsOfYear(formData.academic_year_id).map((t: any) => <option key={t._id} value={t._id}>{t.name}{t.isActive ? " (Current)" : ""}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    Fee Particulars Setup
                                </h4>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const unused = particularsData.find((p: any) => !formData.amounts.hasOwnProperty(p.label));
                                        let label = unused?.label;
                                        let amount = unused?.amount || "0";
                                        if (!label) {
                                            // No predefined particular left — ask for a real name instead of "Custom-<timestamp>".
                                            const name = window.prompt("Name this fee item (e.g. Tuition, Transport, Lunch):", "");
                                            if (!name || !name.trim()) return;
                                            label = name.trim();
                                            if (formData.amounts.hasOwnProperty(label)) { toast.error("That item already exists"); return; }
                                        }
                                        setFormData({ ...formData, amounts: { ...formData.amounts, [label]: amount } });
                                    }}
                                    className="px-4 py-2 bg-[#5C67F2]/10 hover:bg-[#5C67F2]/20 text-[#5C67F2] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                >
                                    <Plus className="w-4 h-4" strokeWidth={3} /> Add Particular Item
                                </button>
                            </div>

                            {Object.entries(formData.amounts).length > 0 ? (
                                <div className="space-y-3">
                                    {Object.entries(formData.amounts).map(([label, val], idx) => (
                                        <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                                            {/* Select Particular */}
                                            <div className="flex-1 relative">
                                                <select
                                                    value={label}
                                                    onChange={(e) => {
                                                        const newLabel = e.target.value;
                                                        const newAmounts = { ...formData.amounts };
                                                        delete newAmounts[label];
                                                        newAmounts[newLabel] = val;
                                                        setFormData({ ...formData, amounts: newAmounts });
                                                    }}
                                                    className="w-full text-xs font-bold p-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-[#5C67F2] text-slate-700 cursor-pointer"
                                                >
                                                    {particularsData.map((p: any) => {
                                                        const isAlreadySelected = formData.amounts.hasOwnProperty(p.label) && p.label !== label;
                                                        return (
                                                            <option key={p.label} value={p.label} disabled={isAlreadySelected}>
                                                                {prettyLabel(p.label)} {isAlreadySelected ? "(already added)" : ""}
                                                            </option>
                                                        );
                                                    })}
                                                    {!particularsData.some((p: any) => p.label === label) && (
                                                        <option value={label}>{prettyLabel(label)}</option>
                                                    )}
                                                </select>
                                            </div>

                                            {/* Input Price */}
                                            <div className="w-36 relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KES</span>
                                                <input 
                                                    type="number"
                                                    placeholder="0"
                                                    value={val as string}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        amounts: {
                                                            ...formData.amounts,
                                                            [label]: e.target.value
                                                        }
                                                    })}
                                                    className="w-full text-xs p-3 pl-10 bg-white border border-slate-100 rounded-xl outline-none focus:border-[#5C67F2] font-black text-slate-700 text-right"
                                                />
                                            </div>

                                            {/* Delete Button */}
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const newAmounts = { ...formData.amounts };
                                                    delete newAmounts[label];
                                                    setFormData({ ...formData, amounts: newAmounts });
                                                }}
                                                className="p-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No particulars added to this structure yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-slate-150 flex justify-end gap-4">
                            <button 
                                type="button"
                                onClick={() => {
                                    setView("list");
                                    setEditingId(null);
                                    handleOpenCreateModal();
                                }}
                                className="px-8 py-3.5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => createMutation.mutate(formData)}
                                disabled={createMutation.isPending || !formData.name.trim() || formData.classIds.length === 0 || !formData.academic_year_id || !formData.semester_id}
                                className="flex items-center gap-2 px-8 py-3.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all transform active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                <Check className="w-4 h-4" strokeWidth={3} />
                                {editingId ? "Save Structure" : "Create Structure"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <FeesPage title="Fee Structure" subtitle="Fee templates per class and term — the items and amounts each invoice is built from." icon={LayersPageIcon} actions={<>
                    <button 
                        onClick={handleOpenCreateModal}
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all transform active:scale-95 group text-xs uppercase tracking-widest"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
                        Create Structure
                    </button>
            </>}>

            <div className="space-y-8">

                {/* Main Content Layout */}
                <div className="space-y-6">
                    {/* Toolbar & Filter Tabs */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-2.5 px-6 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                                        activeTab === tab 
                                            ? "bg-white text-[#5C67F2] shadow-sm font-extrabold" 
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {tab} Structures
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <div className="relative flex-1 sm:w-80 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#5C67F2] transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search by class, term..." 
                                    className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] transition-all font-bold text-slate-700 text-xs placeholder-slate-350 shadow-inner"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Premium Grid layout of Cards */}
                    {isLoading ? (
                        <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 shadow-sm">
                            <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2] mx-auto" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4">Loading active fee frameworks...</p>
                        </div>
                    ) : filteredStructures && filteredStructures.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStructures.map((s: any) => {
                                const amountsList: [string, any][] = s.amounts && Object.keys(s.amounts).length
                                    ? Object.entries(s.amounts)
                                    : (s.items || []).map((it: any) => [it.category, it.amount]);
                                const classNames = Array.isArray(s.class_ids) && s.class_ids.length
                                    ? s.class_ids.map((id: string) => classes.find((c: any) => c._id === id)?.name || classes.find((c: any) => c._id === id)?.levelName).filter(Boolean).join(", ")
                                    : (s.className || "");
                                return (
                                    <div 
                                        key={s._id} 
                                        className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between hover:shadow-xl hover:border-slate-200 transition-all duration-350 group relative overflow-hidden"
                                    >
                                        {/* Colored header strip */}
                                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#5C67F2] to-indigo-400 opacity-80" />

                                        <div>
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#5C67F2]/10 text-[#5C67F2] mb-2">
                                                        {s.term || "Term 1"}
                                                    </span>
                                                    <h3 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-[#5C67F2] transition-colors">
                                                        {s.name || classNames || "Untitled structure"}
                                                    </h3>
                                                    {classNames && s.name && <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{classNames}</p>}
                                                </div>

                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(s._id);
                                                            const amounts = s.amounts && Object.keys(s.amounts).length ? s.amounts : Object.fromEntries((s.items || []).map((it: any) => [it.category, it.amount]));
                                                            const classIds = Array.isArray(s.class_ids) && s.class_ids.length ? s.class_ids : classes.filter((c: any) => (c.name || c.levelName) === s.className).map((c: any) => c._id);
                                                            setFormData({
                                                                name: s.name || "",
                                                                classIds,
                                                                academic_year_id: s.academic_year_id || (activeYear ? String(activeYear._id) : ""),
                                                                semester_id: s.semester_id || "",
                                                                amounts,
                                                            });
                                                            setView("form");
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-[#5C67F2] hover:text-white text-slate-400 flex items-center justify-center transition-colors shadow-sm"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setDeleteConfirmId(s._id || s.id)}
                                                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-500 hover:text-white text-slate-400 flex items-center justify-center transition-colors shadow-sm"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Details Info */}
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">
                                                <Calendar className="w-4 h-4 text-slate-300" />
                                                Session Year: <span className="text-slate-655 font-extrabold">{s.year || "N/A"}</span>
                                            </div>

                                            {/* Particulars Breakdown */}
                                            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <ListFilter className="w-3 h-3 text-[#5C67F2]" /> Itemized Breakdown
                                                </h4>
                                                
                                                {amountsList.length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1.5 custom-scrollbar">
                                                        {amountsList.map(([label, val]) => (
                                                            <div key={label} className="flex justify-between items-center text-[10px] font-bold text-slate-500 py-1 border-b border-dashed border-slate-50 last:border-0">
                                                                <span className="uppercase">{prettyLabel(label)}</span>
                                                                <span className="text-slate-800 font-extrabold">KES {Number(val).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 italic">No custom breakdown values assigned.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer Card Total */}
                                        <div className="mt-8 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group-hover:bg-[#5C67F2]/5 group-hover:border-[#5C67F2]/10 transition-colors">
                                            <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Aggregate Total</span>
                                            <span className="text-lg font-black text-[#5C67F2]">
                                                KES {s.total ? Number(s.total).toLocaleString() : "0"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-20 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-350">
                                <Receipt className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide">No Frameworks Found</h3>
                                <p className="text-slate-400 text-xs font-semibold mt-1">There are no fee structures registered matching the current query.</p>
                            </div>
                            <button 
                                onClick={handleOpenCreateModal}
                                className="px-6 py-2.5 bg-[#5C67F2]/10 hover:bg-[#5C67F2]/20 text-[#5C67F2] font-black rounded-xl text-[10px] uppercase tracking-widest mt-2 transition-all"
                            >
                                Register First Structure
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Info Banner */}
                <div className="flex items-center gap-6 p-6 bg-indigo-50/40 rounded-3xl border border-indigo-100/50 backdrop-blur-sm shadow-sm mt-8">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-indigo-900 text-sm uppercase tracking-wide">Dynamic Invoicing Sync</h4>
                        <p className="text-indigo-700/80 text-xs font-semibold mt-0.5">
                            Any structural updates configured here dynamically recalculate outstanding tuition and logistics parameters on active student fee ledgers.
                        </p>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-350 p-8 text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Delete Fee Structure?</h3>
                            <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                                Are you sure you want to delete this fee framework? This action is permanent and cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-rose-100 transition-all active:scale-95"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FeesPage>
    );
}
