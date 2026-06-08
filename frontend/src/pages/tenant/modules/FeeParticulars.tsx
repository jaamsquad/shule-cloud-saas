import { useState, useEffect } from "react";
import { Check, Loader2, Home, ChevronDown, Settings2, X, Truck, ArrowRight, Trash2, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function FeeParticulars() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [category, setCategory] = useState("All Students");

    // Classes query for setup
    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => {
            const r = await api.get("/academics/classes");
            return r.data || [];
        },
    });

    const { data: particularsData, isLoading } = useQuery({
        queryKey: ["fee_particulars", category],
        queryFn: async () => {
            const r = await api.get(`/fee_particulars?category=${category}`);
            const items = Array.isArray(r.data) ? r.data : [];
            return items.find((i: any) => i.category === category) || null;
        },
    });

    const [rows, setRows] = useState<any[]>([]);
    const [classSetupModalOpen, setClassSetupModalOpen] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

    useEffect(() => {
        if (particularsData?.particulars) {
            // Migration check: rename MONTHLY TUITION FEE to TERMLY TUITION FEE if present
            const updatedRows = particularsData.particulars.map((row: any) => {
                if (row.label === "MONTHLY TUITION FEE") {
                    return { ...row, label: "TERMLY TUITION FEE" };
                }
                return row;
            });
            setRows(updatedRows);
        } else if (!isLoading) {
            setRows([
                { label: "TERMLY TUITION FEE", amount: "0", fixed: true, classAmounts: {} },
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

    // Open class setup modal for a tuition row
    const openClassSetup = (index: number) => {
        setSelectedRowIndex(index);
        setClassSetupModalOpen(true);
    };

    // Update class amounts in the row
    const handleClassAmountChange = (classIdOrName: string, amount: string) => {
        if (selectedRowIndex === null) return;
        setRows(prev => {
            const copy = [...prev];
            const rowCopy = { ...copy[selectedRowIndex] };
            const classAmountsCopy = { ...(rowCopy.classAmounts || {}) };
            classAmountsCopy[classIdOrName] = amount;
            rowCopy.classAmounts = classAmountsCopy;
            
            // Set average or fallback amount to main field for visualization
            const vals = Object.values(classAmountsCopy).map(v => parseFloat(v as string) || 0);
            if (vals.length > 0) {
                rowCopy.amount = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0);
            }
            
            copy[selectedRowIndex] = rowCopy;
            return copy;
        });
    };

    const handleClassSetupDone = () => {
        setClassSetupModalOpen(false);
        saveMutation.mutate(rows);
    };

    const handleAddParticular = () => {
        setRows(prev => [
            ...prev,
            { label: "", amount: "0" }
        ]);
    };

    const handleDeleteParticular = (index: number) => {
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center pb-20 font-sans">
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
                        rows.map((row, idx) => {
                            const isTuition = row.label === "TERMLY TUITION FEE" || row.label === "MONTHLY TUITION FEE";
                            const isTransport = row.label === "TRANSPORT";
                            return (
                                <ParticularRow 
                                    key={idx} 
                                    label={row.label} 
                                    value={row.amount || row.value} 
                                    fixed={row.fixed}
                                    onChangeLabel={(v) => handleRowChange(idx, 'label', v)}
                                    onChangeAmount={(v) => handleRowChange(idx, 'amount', v)}
                                    onSetupClass={isTuition ? () => openClassSetup(idx) : undefined}
                                    onSetupTransport={isTransport ? () => navigate("/transport/zones") : undefined}
                                    onDelete={() => handleDeleteParticular(idx)}
                                />
                            );
                        })
                    )}
                </div>

                <div className="flex justify-center gap-4 mt-12">
                    <button 
                        type="button" 
                        onClick={handleAddParticular}
                        className="h-12 px-8 bg-white border border-gray-250 hover:bg-slate-50 text-slate-700 font-black rounded-full shadow-sm flex items-center gap-2 transition-all transform active:scale-95 text-xs uppercase tracking-widest"
                    >
                        <Plus className="w-5 h-5" /> 
                        Add Particular
                    </button>
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

            {/* Class Setup Modal */}
            {classSetupModalOpen && selectedRowIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="px-8 py-5 bg-gradient-to-r from-[#5C67F2] to-indigo-500 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider">Setup Class Tuition Fees</h3>
                                <p className="text-[10px] opacity-80 font-bold uppercase mt-0.5">{rows[selectedRowIndex]?.label}</p>
                            </div>
                            <button 
                                onClick={() => setClassSetupModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-8 max-h-[55vh] overflow-y-auto space-y-4">
                            {classes.length > 0 ? (
                                classes.map((c: any) => {
                                    const classIdentifier = c.name || c.levelName;
                                    return (
                                        <div key={c._id || classIdentifier} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-xs font-black text-slate-700 uppercase">{classIdentifier}</span>
                                            <div className="w-32 relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">KES</span>
                                                <input 
                                                    type="number"
                                                    value={rows[selectedRowIndex]?.classAmounts?.[classIdentifier] || ""}
                                                    onChange={(e) => handleClassAmountChange(classIdentifier, e.target.value)}
                                                    placeholder="0"
                                                    className="w-full text-xs p-2 pl-9 bg-white border border-slate-150 rounded-lg outline-none focus:border-[#5C67F2] font-black text-slate-700 text-right"
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center text-xs text-slate-400 py-6 uppercase font-bold tracking-wider">No classes created yet. Setup classes in Academics module.</p>
                            )}
                        </div>
                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleClassSetupDone}
                                className="px-6 py-2 bg-[#5C67F2] hover:bg-indigo-600 text-white text-xs font-black rounded-lg uppercase tracking-wider shadow-sm transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ParticularRow({ 
    label, value, fixed, onChangeLabel, onChangeAmount, onSetupClass, onSetupTransport, onDelete 
}: { 
    label: string, 
    value: string, 
    fixed?: boolean, 
    onChangeLabel: (v: string) => void, 
    onChangeAmount: (v: string) => void,
    onSetupClass?: () => void,
    onSetupTransport?: () => void,
    onDelete?: () => void
}) {
    const bgClass = fixed ? "bg-gray-400" : "bg-[#868DF4]";
    const borderColor = fixed ? "border-gray-100" : "border-[#5C67F2]/30";
    const textColor = fixed ? "text-gray-400 font-bold" : "text-gray-700 font-black";
    const readOnly = fixed;

    return (
        <div className="flex gap-4 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
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

            {onSetupClass && (
                <button
                    type="button"
                    onClick={onSetupClass}
                    className="h-11 px-4 bg-indigo-50 hover:bg-indigo-100/80 text-[#5C67F2] border border-indigo-100 rounded-full flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm active:scale-95"
                    title="Setup amount for each class individually"
                >
                    <Settings2 className="w-3.5 h-3.5" />
                    Setup per Class
                </button>
            )}

            {onSetupTransport && (
                <button
                    type="button"
                    onClick={onSetupTransport}
                    className="h-11 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm active:scale-95"
                    title="Setup Transport Zones"
                >
                    <Truck className="w-3.5 h-3.5" />
                    Setup Zones
                </button>
            )}

            {!fixed && onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    className="h-11 w-11 bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-100 rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm active:scale-95"
                    title="Delete particular"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
