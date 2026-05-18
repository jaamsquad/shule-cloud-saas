import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, FileText, Download, Edit2, Trash2, Calendar, BookOpen, Layers, X, Loader2, Check, Home } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function FeeStructure() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("Active");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const { items: structures, isLoading } = useItems("fee_structures");
    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });
    const { data: particularsData } = useQuery({
        queryKey: ["fee_particulars"],
        queryFn: async () => { const r = await api.get("/fee_particulars"); return r.data?.[0]?.particulars || []; },
    });

    const [formData, setFormData] = useState<any>({
        className: "",
        term: "Term 1",
        year: new Date().getFullYear().toString(),
        amounts: {}
    });

    const [editingId, setEditingId] = useState<string | null>(null);

    const createMutation = useMutation({
        mutationFn: async (newData: any) => {
            const total = Object.values(newData.amounts).reduce((acc: number, curr: any) => acc + (parseFloat(curr as string) || 0), 0);
            const payload = { ...newData, total, status: "Active" };
            
            if (editingId) {
                return api.patch(`/fee_structures/${editingId}`, payload);
            } else {
                return api.post("/fee_structures", payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fee_structures"] });
            toast.success(editingId ? "Fee structure updated successfully" : "Fee structure created successfully");
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ className: "", term: "Term 1", year: new Date().getFullYear().toString(), amounts: {} });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to save"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/fee_structures/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fee_structures"] });
            toast.success("Fee structure deleted");
        },
    });

    const tabs = ["Active", "Archived", "Configurations"];

    const filteredStructures = structures?.filter((s: any) => 
        s.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.term?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.year?.includes(searchTerm)
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-sm mr-2">Finance</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- Fee Structures</span>
            </div>

            <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Fee Structures</h1>
                        <p className="text-slate-500 font-bold text-xs flex items-center gap-2 uppercase tracking-widest">
                            <Layers className="w-4 h-4 text-[#5C67F2]" /> Manage school fee frameworks for different classes.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all transform active:scale-95 group text-xs uppercase tracking-widest"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        Add New Structure
                    </button>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
                    {/* Navigation Tabs */}
                    <div className="flex border-b border-slate-50 px-8 bg-slate-50/30">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-6 px-8 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
                                    activeTab === tab ? "text-[#5C67F2]" : "text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#5C67F2] rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-8 lg:p-10">
                        {/* Toolbar */}
                        <div className="flex flex-col lg:flex-row gap-6 mb-10">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#5C67F2] transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search by class, term or academic year..." 
                                    className="w-full h-14 pl-14 pr-6 bg-slate-50/50 border border-slate-100 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-[#5C67F2]/10 focus:border-[#5C67F2] transition-all font-bold text-slate-700 text-sm placeholder-slate-300 shadow-inner"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-4">
                                <button className="h-14 px-8 bg-white border border-slate-100 rounded-[1.25rem] flex items-center gap-2 font-black text-slate-500 hover:bg-slate-50 transition-all text-[11px] uppercase tracking-widest shadow-sm">
                                    <Filter className="w-4 h-4" /> Filter
                                </button>
                                <button className="h-14 px-8 bg-white border border-slate-100 rounded-[1.25rem] flex items-center gap-2 font-black text-slate-500 hover:bg-slate-50 transition-all text-[11px] uppercase tracking-widest shadow-sm">
                                    <Download className="w-4 h-4" /> Export
                                </button>
                            </div>
                        </div>

                        {/* Table View */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-4">
                                <thead>
                                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">
                                        <th className="px-8 pb-4">Structure Details</th>
                                        <th className="px-8 pb-4">Academic Session</th>
                                        <th className="px-8 pb-4">Amount (KES)</th>
                                        <th className="px-8 pb-4">Status</th>
                                        <th className="px-8 pb-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2] mx-auto" />
                                            </td>
                                        </tr>
                                    ) : filteredStructures && filteredStructures.length > 0 ? (
                                        filteredStructures.map((s: any) => (
                                            <StructureRow 
                                                key={s._id}
                                                id={s._id}
                                                className={s.className} 
                                                term={s.term} 
                                                year={s.year}
                                                total={new Intl.NumberFormat().format(s.total)}
                                                status={s.status}
                                                color={["blue", "purple", "emerald", "amber"][Math.floor(Math.random() * 4)]}
                                                onEdit={() => {
                                                    setEditingId(s._id);
                                                    setFormData({
                                                        className: s.className,
                                                        term: s.term,
                                                        year: s.year,
                                                        amounts: s.amounts || {}
                                                    });
                                                    setIsModalOpen(true);
                                                }}
                                                onDelete={() => deleteMutation.mutate(s._id)}
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                                                No fee structures found. Click "Add New Structure" to begin.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center gap-6 p-8 bg-amber-50/50 rounded-[2rem] border border-amber-100/50 backdrop-blur-sm shadow-sm">
                    <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-amber-900 text-sm uppercase tracking-wide">System Configuration</h4>
                        <p className="text-amber-700 text-xs font-bold mt-1">
                            Link fee particulars to these structures in the <Link to="/settings/fees-particulars" className="underline font-black hover:text-amber-800 transition-colors">Particulars Settings</Link>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Add New Structure Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    {editingId ? "Edit Fee Structure" : "New Fee Structure"}
                                </h3>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                                    {editingId ? "Update payments for class and term" : "Define payments for class and term"}
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingId(null);
                                    setFormData({ className: "", term: "Term 1", year: new Date().getFullYear().toString(), amounts: {} });
                                }} 
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-10 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-8 mb-10">
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Select Class*</div>
                                    <select 
                                        className="w-full h-12 px-6 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-black text-xs bg-slate-50/50 shadow-inner appearance-none"
                                        value={formData.className}
                                        onChange={(e) => setFormData({...formData, className: e.target.value})}
                                    >
                                        <option value="">Select Class...</option>
                                        {classes.map((c: any) => (
                                            <option key={c._id} value={c.name || c.levelName}>{c.name || c.levelName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Academic Term*</div>
                                    <select 
                                        className="w-full h-12 px-6 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-black text-xs bg-slate-50/50 shadow-inner appearance-none"
                                        value={formData.term}
                                        onChange={(e) => setFormData({...formData, term: e.target.value})}
                                    >
                                        <option>Term 1</option>
                                        <option>Term 2</option>
                                        <option>Term 3</option>
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Year*</div>
                                    <input 
                                        type="text" 
                                        className="w-full h-12 px-6 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-black text-xs bg-slate-50/50 shadow-inner"
                                        value={formData.year}
                                        onChange={(e) => setFormData({...formData, year: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                    Fee Particulars Setup
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                </h4>
                                {particularsData.length > 0 ? (
                                    particularsData.map((p: any, i: number) => (
                                        <div key={i} className="relative">
                                            <div className="absolute -top-2.5 left-6 bg-slate-100 text-slate-500 text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{p.label}</div>
                                            <div className="flex items-center gap-4 h-12 px-6 border border-slate-100 rounded-2xl bg-white shadow-sm focus-within:border-[#5C67F2] transition-colors group">
                                                <span className="text-slate-300 font-black text-[10px] uppercase">KES</span>
                                                <input 
                                                    type="number"
                                                    placeholder="0"
                                                    className="flex-1 bg-transparent focus:outline-none text-slate-700 font-black text-sm"
                                                    value={formData.amounts[p.label] || ""}
                                                    onChange={(e) => setFormData({
                                                        ...formData, 
                                                        amounts: { ...formData.amounts, [p.label]: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No particulars defined yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-10 py-8 bg-slate-50/30 border-t border-slate-50 flex justify-end gap-4">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-8 py-3.5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => createMutation.mutate(formData)}
                                disabled={createMutation.isPending || !formData.className}
                                className="px-10 py-3.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest disabled:opacity-50"
                            >
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Save Structure
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StructureRow({ className, term, year, total, status, color, onEdit, onDelete }: { className: string, term: string, year: string, total: string, status: string, color: string, onEdit: () => void, onDelete: () => void }) {
    const statusColors = {
        Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
        Draft: "bg-purple-100 text-purple-700 border-purple-200",
        Archived: "bg-slate-100 text-slate-700 border-slate-200"
    };

    const iconColors = {
        blue: "bg-blue-50 text-blue-500",
        purple: "bg-purple-50 text-purple-500",
        emerald: "bg-emerald-50 text-emerald-500",
        amber: "bg-amber-50 text-amber-500"
    };

    return (
        <tr className="group">
            <td className="bg-slate-50/30 rounded-l-[1.5rem] px-8 py-6 border-y border-l border-transparent group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-xl group-hover:shadow-slate-200/40 transition-all duration-300">
                <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${iconColors[color as keyof typeof iconColors]}`}>
                        <FileText className="w-7 h-7" />
                    </div>
                    <div>
                        <div className="font-black text-slate-800 text-lg tracking-tight uppercase">{className}</div>
                        <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] mt-0.5">{term}</div>
                    </div>
                </div>
            </td>
            <td className="bg-slate-50/30 px-8 py-6 border-y border-transparent group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-xl group-hover:shadow-slate-200/40 transition-all duration-300">
                <div className="flex items-center gap-3 text-slate-600 font-black text-sm">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    {year}
                </div>
            </td>
            <td className="bg-slate-50/30 px-8 py-6 border-y border-transparent group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-xl group-hover:shadow-slate-200/40 transition-all duration-300">
                <div className="text-xl font-black text-slate-900 tracking-tighter">
                    <span className="text-[10px] text-slate-300 mr-2 uppercase tracking-widest">KES</span>
                    {total}
                </div>
            </td>
            <td className="bg-slate-50/30 px-8 py-6 border-y border-transparent group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-xl group-hover:shadow-slate-200/40 transition-all duration-300">
                <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[status as keyof typeof statusColors]}`}>
                    {status}
                </span>
            </td>
            <td className="bg-slate-50/30 rounded-r-[1.5rem] px-8 py-6 border-y border-r border-transparent group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-xl group-hover:shadow-slate-200/40 transition-all duration-300">
                <div className="flex items-center justify-center gap-3">
                    <button 
                        onClick={onEdit}
                        className="w-10 h-10 flex items-center justify-center hover:bg-[#5C67F2]/10 hover:text-[#5C67F2] text-slate-400 rounded-xl transition-all shadow-sm"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={onDelete}
                        className="w-10 h-10 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 text-slate-400 rounded-xl transition-all shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 text-slate-400 rounded-xl transition-all shadow-sm">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
