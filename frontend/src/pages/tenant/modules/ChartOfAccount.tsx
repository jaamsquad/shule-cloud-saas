import { useState } from "react";
import { Home, Plus, Search, Trash2, Edit, Wallet, Loader2, Check } from "lucide-react";
import { useItems } from "@/hooks/useItems";

export default function ChartOfAccount() {
    const { items, isLoading, createItem, isCreating, deleteItem, updateItem } = useItems("chart_of_accounts");
    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [editId, setEditId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const handleSave = () => {
        if (!name || !type) return;
        if (editId) {
            updateItem({ id: editId, name, type }, { onSuccess: () => { setName(""); setType(""); setEditId(null); } });
        } else {
            createItem({ name, type }, { onSuccess: () => { setName(""); setType(""); } });
        }
    };
    const startEdit = (it: any) => { setEditId(it._id); setName(it.name); setType(it.type); };

    const filtered = items.filter((it: any) => !search || (it.name || "").toLowerCase().includes(search.toLowerCase()) || (it.type || "").toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Accounts</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Chart of accounts
                </span>
            </div>

            <div className="p-6 pt-0 w-full mt-4 flex flex-col gap-6">

                {/* Top: Add form (horizontal) */}
                <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-[#5C67F2]" />
                            <h2 className="text-base font-black text-gray-800">Add Chart of Accounts</h2>
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-[#5C67F2] uppercase tracking-widest mb-1">Head Name *</label>
                            <input
                                type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name of head"
                                className="w-full h-11 px-4 border border-[#5C67F2]/30 rounded-xl focus:outline-none focus:border-[#5C67F2] text-gray-700 text-sm bg-white"
                            />
                        </div>
                        <div className="w-full md:w-56 relative">
                            <label className="block text-[10px] font-black text-[#5C67F2] uppercase tracking-widest mb-1">Head Type *</label>
                            <select
                                value={type} onChange={(e) => setType(e.target.value)}
                                className="w-full h-11 px-4 border border-[#5C67F2]/30 rounded-xl focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm"
                            >
                                <option value="" disabled>Select type</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isCreating || !name || !type}
                            className="h-11 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editId ? "Update Head" : "Save Head"}
                        </button>
                        {editId && <button onClick={() => { setEditId(null); setName(""); setType(""); }} className="h-11 px-4 text-slate-500 font-bold text-sm">Cancel</button>}
                    </div>
                </div>

                {/* Right Side: Table */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            Show 
                            <select className="border border-gray-200 rounded px-2 py-1 focus:outline-none">
                                <option>10</option>
                                <option>25</option>
                                <option>50</option>
                            </select>
                            entries
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 font-medium">Search:</span>
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2]" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-100/50">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider rounded-l-xl">NAME OF HEAD</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">TYPE</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider rounded-r-xl">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#5C67F2]" />
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-gray-400 text-sm italic">
                                            No data available in table
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item: any) => (
                                        <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-700 font-medium">{item.name}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    item.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex gap-2">
                                                    <button onClick={() => startEdit(item)} className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => deleteItem(item._id)}
                                                        className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-between items-center text-sm text-gray-500 font-medium">
                        <p>Showing {filtered.length} entries</p>
                        <div className="flex gap-4">
                            <button className="text-gray-400">Previous</button>
                            <button className="text-gray-400">Next</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
