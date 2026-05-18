import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Tag, Download, Edit2, Trash2, Percent, DollarSign, Gift, Loader2, X } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";

export default function DiscountTypes() {
    const [activeTab, setActiveTab] = useState("Active");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState({ name: "", type: "Percentage", value: "", status: "Active" });
    
    const { items: discounts, isLoading, createItem, updateItem, deleteItem, isCreating, isUpdating } = useItems("discount_types");

    const tabs = ["Active", "Seasonal", "Configurations"];

    const handleOpenModal = (item: any = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, type: item.type, value: item.value, status: item.status });
        } else {
            setEditingItem(null);
            setFormData({ name: "", type: "Percentage", value: "", status: "Active" });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await updateItem({ id: editingItem._id, ...formData });
                toast.success("Discount updated successfully");
            } else {
                await createItem(formData);
                toast.success("Discount created successfully");
            }
            setIsModalOpen(false);
        } catch (err) {
            toast.error("Operation failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this discount type?")) {
            await deleteItem(id);
            toast.success("Discount deleted");
        }
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-4 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Discount Types</h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <Tag className="w-4 h-4 text-[#FFC165]" /> Configure scholarships, sibling discounts, and special fee waivers.
                        </p>
                    </div>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all transform active:scale-95 group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        Create Discount Type
                    </button>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    {/* Navigation Tabs */}
                    <div className="flex border-b border-slate-100 px-8 bg-slate-50/50">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-6 px-8 text-sm font-bold transition-all relative ${
                                    activeTab === tab ? "text-[#5C67F2]" : "text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5C67F2] rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        {/* Toolbar */}
                        <div className="flex flex-col lg:flex-row gap-4 mb-8">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#5C67F2] transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search discounts by name or type..." 
                                    className="w-full h-14 pl-12 pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5C67F2]/20 focus:border-[#5C67F2] transition-all font-medium text-slate-700"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button className="h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2 font-bold text-slate-600 hover:bg-slate-100 transition-all">
                                    <Filter className="w-5 h-5" /> Filter
                                </button>
                                <button className="h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2 font-bold text-slate-600 hover:bg-slate-100 transition-all">
                                    <Download className="w-5 h-5" /> Export
                                </button>
                            </div>
                        </div>

                        {/* Table View */}
                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                                    <p className="text-slate-400 font-bold animate-pulse">Loading discounts...</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-separate border-spacing-y-4">
                                    <thead>
                                        <tr className="text-slate-400 text-sm font-bold">
                                            <th className="px-6 pb-2">Discount Name</th>
                                            <th className="px-6 pb-2">Method</th>
                                            <th className="px-6 pb-2">Value</th>
                                            <th className="px-6 pb-2">Status</th>
                                            <th className="px-6 pb-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {discounts?.map((discount: any) => (
                                            <DiscountRow 
                                                key={discount._id}
                                                id={discount._id}
                                                name={discount.name} 
                                                type={discount.type} 
                                                value={discount.value}
                                                status={discount.status}
                                                onEdit={() => handleOpenModal(discount)}
                                                onDelete={() => handleDelete(discount._id)}
                                            />
                                        ))}
                                        {(!discounts || discounts.length === 0) && (
                                            <tr>
                                                <td colSpan={5} className="text-center py-20">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Gift className="w-12 h-12 text-slate-200" />
                                                        <p className="text-slate-400 font-bold italic">No discount types found. Create one to get started!</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                        <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="px-8 py-6 bg-[#5C67F2] text-white flex items-center justify-between">
                                <h3 className="text-xl font-black">{editingItem ? "Edit Discount" : "New Discount Type"}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Discount Name</label>
                                        <input 
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] font-bold text-slate-700" 
                                            placeholder="e.g. Sibling Discount"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Method</label>
                                            <select 
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] font-bold text-slate-700 appearance-none"
                                            >
                                                <option value="Percentage">Percentage (%)</option>
                                                <option value="Fixed Amount">Fixed Amount</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Value</label>
                                            <input 
                                                required
                                                value={formData.value}
                                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                                                className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] font-bold text-slate-700" 
                                                placeholder={formData.type === 'Percentage' ? 'e.g. 15' : 'e.g. 5000'}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                                        <div className="flex gap-3">
                                            {['Active', 'Draft'].map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, status: s })}
                                                    className={`flex-1 h-12 rounded-xl font-bold transition-all border ${
                                                        formData.status === s ? 'bg-[#5C67F2] border-[#5C67F2] text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-[#5C67F2]/30'
                                                    }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    disabled={isCreating || isUpdating}
                                    className="w-full h-14 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-50"
                                >
                                    {(isCreating || isUpdating) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Tag className="w-5 h-5" />}
                                    {editingItem ? "Update Discount" : "Create Discount Type"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Footer Info */}
                <div className="flex items-center gap-4 p-6 bg-[#5C67F2]/5 rounded-2xl border border-[#5C67F2]/10">
                    <div className="w-10 h-10 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white">
                        <Gift className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm">Automated Discounts</h4>
                        <p className="text-slate-600 text-xs font-medium">You can apply these discounts automatically to student invoices during the billing cycle.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DiscountRow({ id, name, type, value, status, onEdit, onDelete }: { id: string, name: string, type: string, value: string, status: string, onEdit: () => void, onDelete: () => void }) {
    const statusColors = {
        Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
        Draft: "bg-purple-100 text-purple-700 border-purple-200",
        Archived: "bg-slate-100 text-slate-700 border-slate-200"
    };

    return (
        <tr className="group hover:scale-[1.01] transition-all duration-300">
            <td className="bg-slate-50/50 rounded-l-2xl px-6 py-5 border-y border-l border-slate-50 group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-lg group-hover:shadow-slate-200/40">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type === 'Percentage' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {type === 'Percentage' ? <Percent className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 text-base">{name}</div>
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{type === 'Percentage' ? 'Rate-based' : 'Flat-rate'}</div>
                    </div>
                </div>
            </td>
            <td className="bg-slate-50/50 px-6 py-5 border-y border-slate-50 group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-lg group-hover:shadow-slate-200/40">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                    <Tag className="w-4 h-4 text-slate-400" />
                    {type}
                </div>
            </td>
            <td className="bg-slate-50/50 px-6 py-5 border-y border-slate-50 group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-lg group-hover:shadow-slate-200/40">
                <div className="text-lg font-black text-slate-900 tracking-tight">
                    {value}{type === 'Percentage' ? '%' : ''}
                </div>
            </td>
            <td className="bg-slate-50/50 px-6 py-5 border-y border-slate-50 group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-lg group-hover:shadow-slate-200/40">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black border ${statusColors[status as keyof typeof statusColors]}`}>
                    {status}
                </span>
            </td>
            <td className="bg-slate-50/50 rounded-r-2xl px-6 py-5 border-y border-r border-slate-50 group-hover:bg-white group-hover:border-slate-100 group-hover:shadow-lg group-hover:shadow-slate-200/40">
                <div className="flex items-center gap-2">
                    <button onClick={onEdit} className="p-2.5 hover:bg-[#5C67F2]/10 hover:text-[#5C67F2] text-slate-400 rounded-xl transition-all">
                        <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={onDelete} className="p-2.5 hover:bg-rose-50 hover:text-rose-500 text-slate-400 rounded-xl transition-all">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button className="p-2.5 hover:bg-slate-100 text-slate-400 rounded-xl transition-all">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
