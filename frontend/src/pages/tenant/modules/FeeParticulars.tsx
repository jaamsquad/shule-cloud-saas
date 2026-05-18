import { useState, useEffect } from "react";
import { Check, Loader2, Home, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function FeeParticulars() {
    const queryClient = useQueryClient();
    const [category, setCategory] = useState("All Students");

    const { data: particularsData, isLoading } = useQuery({
        queryKey: ["fee_particulars", category],
        queryFn: async () => {
            const r = await api.get(`/fee_particulars?category=${category}`);
            const items = Array.isArray(r.data) ? r.data : [];
            return items.find((i: any) => i.category === category) || null;
        },
    });

    const [rows, setRows] = useState<any[]>([]);

    useEffect(() => {
        if (particularsData?.particulars) {
            setRows(particularsData.particulars);
        } else if (!isLoading) {
            setRows([
                { label: "MONTHLY TUITION FEE", amount: "0", fixed: true },
                { label: "ADMISSION FEE", amount: "0" },
                { label: "REGISTRATION FEE", amount: "0" },
                { label: "ART MATERIAL", amount: "0" },
                { label: "TRANSPORT", amount: "0" },
                { label: "BOOKS", amount: "0" },
                { label: "UNIFORM", amount: "0" },
                { label: "FINE", amount: "0" },
                { label: "OTHERS", amount: "0" },
                { label: "PREVIOUS BALANCE", amount: "0", fixed: true },
                { label: "DISCOUNT IN FEE [FIXED]", amount: "0", fixed: true }
            ]);
        }
    }, [particularsData, isLoading, category]);

    const saveMutation = useMutation({
        mutationFn: async (updatedRows: any[]) => {
            const payload = { 
                category, 
                particulars: updatedRows,
                updatedAt: new Date()
            };
            
            if (particularsData?._id) {
                return api.patch(`/fee_particulars/${particularsData._id}`, payload);
            } else {
                return api.post("/fee_particulars", payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fee_particulars"] });
            toast.success(`Fee particulars for ${category} saved successfully`);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to save"),
    });

    const handleRowChange = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [field]: value };
        setRows(newRows);
    };

    const handleSave = () => {
        saveMutation.mutate(rows);
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center pb-20">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-sm mr-2">General Settings</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- Fee Particulars</span>
            </div>

            <div className="w-full max-w-4xl px-6 mt-4">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Change Fee Particulars</h2>
                    <div className="flex items-center justify-center gap-4 mt-2 text-xs font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1.5 text-[#5C67F2]">
                            <div className="w-4 h-1.5 bg-[#5C67F2] rounded-full"></div>
                            Editable
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <div className="w-4 h-1.5 bg-gray-300 rounded-full"></div>
                            Fixed
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mb-8">
                    <div className="relative w-full max-w-lg">
                        <div className="absolute -top-3 left-6 bg-[#ff5e6c] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">
                            Fee Particulars for*
                        </div>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full h-11 px-6 border border-gray-200 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-xs font-black shadow-sm"
                        >
                            <option value="All Students">All Students</option>
                            <option value="New Students">New Students</option>
                            <option value="Existing Students">Existing Students</option>
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="space-y-6 max-w-3xl mx-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                        </div>
                    ) : (
                        rows.map((row, idx) => (
                            <ParticularRow 
                                key={idx} 
                                label={row.label} 
                                value={row.amount || row.value} 
                                fixed={row.fixed}
                                onChangeLabel={(v) => handleRowChange(idx, 'label', v)}
                                onChangeAmount={(v) => handleRowChange(idx, 'amount', v)}
                            />
                        ))
                    )}
                </div>

                <div className="flex justify-center mt-12">
                    <button 
                        type="button" 
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="h-12 px-12 bg-[#FFC165] hover:bg-[#e0a855] text-gray-800 font-black rounded-full shadow-lg flex items-center gap-2 transition-all transform active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                        {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} 
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function ParticularRow({ label, value, fixed, onChangeLabel, onChangeAmount }: { label: string, value: string, fixed?: boolean, onChangeLabel: (v: string) => void, onChangeAmount: (v: string) => void }) {
    const bgClass = fixed ? "bg-gray-400" : "bg-[#868DF4]";
    const borderColor = fixed ? "border-gray-100" : "border-[#5C67F2]/30";
    const textColor = fixed ? "text-gray-400 font-bold" : "text-gray-700 font-black";
    const readOnly = fixed;

    return (
        <div className="flex gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative flex-1">
                <div className={`absolute -top-2.5 left-6 ${bgClass} text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase`}>
                    Particular Label*
                </div>
                <input 
                    type="text" 
                    value={label}
                    onChange={(e) => onChangeLabel(e.target.value)}
                    readOnly={readOnly}
                    className={`w-full h-11 px-6 border ${borderColor} rounded-full focus:outline-none focus:border-[#5C67F2] ${textColor} text-[11px] uppercase transition-all ${fixed ? 'bg-gray-50/50' : 'bg-white shadow-sm'}`}
                    placeholder="E.G. TUITION FEE"
                />
            </div>
            <div className="relative flex-1">
                <div className={`absolute -top-2.5 left-6 ${bgClass} text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase`}>
                    Prefix Amount*
                </div>
                <input 
                    type="text" 
                    value={value}
                    onChange={(e) => onChangeAmount(e.target.value)}
                    className={`w-full h-11 px-6 border ${borderColor} rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 font-black text-[11px] transition-all bg-white shadow-sm`}
                    placeholder="0"
                />
            </div>
        </div>
    );
}
