import { useState } from "react";
import { Home, Plus, Wallet, Calendar, Loader2 } from "lucide-react";
import { useItems } from "@/hooks/useItems";

export default function AddIncome() {
    const { createItem, isCreating } = useItems("income");
    const [date, setDate] = useState("2026-05-15");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");

    const handleAdd = () => {
        if (!description || !amount) return;
        createItem({ date, description, amount: parseFloat(amount) }, {
            onSuccess: () => {
                setDescription("");
                setAmount("");
            }
        });
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Accounts</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Add income
                </span>
            </div>

            <div className="p-6 pt-0 w-full mt-4 flex justify-center">
                
                <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-gray-100 p-12">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Add income</h2>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                            <div className="flex items-center gap-1.5 text-[#5C67F2] font-bold">
                                <div className="w-3.5 h-1.5 bg-[#5C67F2] rounded-full"></div>
                                Required*
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                                <div className="w-3.5 h-1.5 bg-gray-300 rounded-full"></div>
                                Optional
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="relative">
                            <div className="absolute -top-3 left-8 bg-[#5C67F2] text-white text-[11px] px-4 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                Date*
                            </div>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full h-14 px-8 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 text-sm bg-white"
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -top-3 left-8 bg-[#5C67F2] text-white text-[11px] px-4 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                Description*
                            </div>
                            <input 
                                type="text" 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Income Description"
                                className="w-full h-14 px-8 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 text-sm bg-white"
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute -top-3 left-8 bg-[#5C67F2] text-white text-[11px] px-4 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                Amount*
                            </div>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Income Amount"
                                className="w-full h-14 px-8 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 text-sm bg-white"
                            />
                        </div>

                        <div className="flex justify-center pt-4">
                            <button 
                                onClick={handleAdd}
                                disabled={isCreating || !description || !amount}
                                className="h-14 px-12 bg-[#FFC165] hover:bg-[#e0a855] text-gray-800 font-bold rounded-full shadow-lg shadow-orange-100 flex items-center gap-3 transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" strokeWidth={2.5} />} 
                                Add Income
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
