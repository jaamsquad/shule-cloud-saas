import { useState, useEffect } from "react";
import { Home, Check, Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { parseRulesContent, formatRulesContent } from "@/lib/rulesRegulations";

export default function RulesRegulations() {
    const queryClient = useQueryClient();

    const { data: rulesData, isLoading } = useQuery({
        queryKey: ["rules_regulations"],
        queryFn: async () => {
            const r = await api.get("/rules_regulations");
            return r.data?.[0] || null;
        },
    });

    const [rules, setRules] = useState<string[]>([""]);

    useEffect(() => {
        const lines = parseRulesContent(rulesData?.content);
        if (lines.length > 0) setRules(lines);
    }, [rulesData]);

    const addRule = () => setRules([...rules, ""]);
    
    const removeRule = (index: number) => {
        if (rules.length === 1) {
            setRules([""]);
            return;
        }
        setRules(rules.filter((_, i) => i !== index));
    };

    const updateRule = (index: number, value: string) => {
        const newRules = [...rules];
        newRules[index] = value;
        setRules(newRules);
    };

    const saveMutation = useMutation({
        mutationFn: async (content: string) => {
            if (rulesData?._id) {
                return api.patch(`/rules_regulations/${rulesData._id}`, { content });
            } else {
                return api.post("/rules_regulations", { content });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rules_regulations"] });
            toast.success("Rules & Regulations saved successfully");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to save"),
    });

    const handleSave = () => {
        const formattedContent = formatRulesContent(rules);
        if (!formattedContent) {
            toast.error("Please add at least one rule");
            return;
        }
        saveMutation.mutate(formattedContent);
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center pb-20">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-sm mr-2">General Settings</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- Rules & Regulations</span>
            </div>

            <div className="p-6 pt-0 w-full max-w-4xl mt-4">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Institute Rules & Regulations</h2>
                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">Define the disciplinary standards for your institution</p>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="bg-white rounded-2xl p-20 flex flex-col items-center justify-center border border-gray-100 shadow-sm">
                            <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2] mb-4" />
                            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Loading rules...</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {rules.map((rule, index) => (
                                    <div key={index} className="group flex items-center gap-4 bg-white p-3 pr-5 rounded-2xl border border-gray-100 shadow-sm hover:border-[#5C67F2]/40 transition-all">
                                        <div className="w-10 h-10 flex-shrink-0 bg-indigo-50 text-[#5C67F2] font-black rounded-xl flex items-center justify-center text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <input 
                                                type="text"
                                                value={rule}
                                                onChange={(e) => updateRule(index, e.target.value)}
                                                placeholder={`Rule #${index + 1}...`}
                                                className="w-full bg-transparent border-none focus:ring-0 text-gray-700 text-sm font-medium placeholder-gray-300"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => removeRule(index)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-400 transition-all hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="cursor-grab text-gray-200 group-hover:text-gray-300">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={addRule}
                                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:border-[#5C67F2] hover:text-[#5C67F2] hover:bg-indigo-50/30 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add New Rule
                            </button>
                        </>
                    )}
                </div>

                <div className="flex justify-center mt-12">
                    <button 
                        type="button" 
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="h-12 px-12 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-xl shadow-indigo-100 flex items-center gap-2 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                        {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        Save All Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
