import { useState, useEffect } from "react";
import { Check, Loader2, Home, ChevronDown, Settings2, X, Truck, ArrowRight, Trash2, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FeesPage } from "@/components/fees/FeesUI";
import { ClassTuitionModal } from "@/components/fees/ClassTuitionGrid";
import { ListChecks as ListChecksPageIcon } from "lucide-react";

export default function FeeParticulars() {
    const navigate = useNavigate();
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
    const [classSetupModalOpen, setClassSetupModalOpen] = useState(false);

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
    const openClassSetup = (_index: number) => {
        setClassSetupModalOpen(true);
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
        <FeesPage title="Fee Particulars" subtitle="The fee items (vote heads) used when building fee structures and invoices." icon={ListChecksPageIcon}>

            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
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

            {/* Class tuition (per class, per term) */}
            {classSetupModalOpen && <ClassTuitionModal onClose={() => setClassSetupModalOpen(false)} />}
        </FeesPage>
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
                    Per class &amp; term
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
