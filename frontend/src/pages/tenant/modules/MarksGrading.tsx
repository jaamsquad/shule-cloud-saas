import { Home, Plus, Minus, Check, RefreshCcw, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

interface GradeTier {
    grade: string;
    from: number;
    upto: number;
    status: string;
}

export default function MarksGrading() {
    const [activeTab, setActiveTab] = useState("Marks Grading");
    const queryClient = useQueryClient();

    // Grades State
    const [grades, setGrades] = useState<GradeTier[]>([
        { grade: "A+", from: 80, upto: 100, status: "PASS" },
        { grade: "A", from: 70, upto: 79, status: "PASS" },
        { grade: "B+", from: 60, upto: 69, status: "PASS" },
        { grade: "B", from: 50, upto: 59, status: "PASS" },
        { grade: "C", from: 40, upto: 49, status: "PASS" },
        { grade: "D", from: 33, upto: 39, status: "PASS" },
        { grade: "F", from: 0, upto: 32, status: "FAIL" },
    ]);

    // Fail Criteria State
    const [failCriteria, setFailCriteria] = useState({
        overallPercent: 40,
        subjectPercent: 33,
        minSubjects: 1
    });

    // Fetch existing configuration
    const { data: existingConfig, isLoading } = useQuery({
        queryKey: ["grading_criteria"],
        queryFn: async () => {
            const r = await api.get("/grading_criteria");
            return r.data?.[0]; // Assuming one global config
        }
    });

    useEffect(() => {
        if (existingConfig) {
            if (existingConfig.grades) setGrades(existingConfig.grades);
            if (existingConfig.failCriteria) setFailCriteria(existingConfig.failCriteria);
        }
    }, [existingConfig]);

    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (existingConfig?._id) {
                return api.patch(`/grading_criteria/${existingConfig._id}`, payload);
            }
            return api.post("/grading_criteria", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grading_criteria"] });
            toast.success("Grading configuration saved successfully");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to save configuration")
    });

    const handleSave = () => {
        saveMutation.mutate({
            grades,
            failCriteria,
            type: "Global"
        });
    };

    const addGrade = () => {
        setGrades([...grades, { grade: "", from: 0, upto: 0, status: "PASS" }]);
    };

    const removeGrade = () => {
        if (grades.length > 1) {
            setGrades(grades.slice(0, -1));
        }
    };

    const updateGrade = (index: number, field: keyof GradeTier, value: string | number) => {
        const newGrades = [...grades];
        newGrades[index] = { ...newGrades[index], [field]: value };
        setGrades(newGrades);
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f4f7f6]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-[#5C67F2] animate-spin" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Synchronizing academic tiers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-lg mr-2">Settings</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Exam Grading
                </span>
            </div>

            <div className="p-6 pt-0 mt-4 max-w-5xl">
                {/* Tabs */}
                <div className="flex px-4 relative z-10">
                    <button 
                        onClick={() => setActiveTab("Marks Grading")}
                        className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors border-t border-x border-gray-100 ${
                            activeTab === "Marks Grading" 
                                ? "bg-white text-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-b-0" 
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100 border-b border-gray-100"
                        }`}
                    >
                        Marks Grading
                    </button>
                    <button 
                        onClick={() => setActiveTab("Fail Criteria")}
                        className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors border-t border-x border-gray-100 ${
                            activeTab === "Fail Criteria" 
                                ? "bg-white text-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-b-0" 
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100 border-b border-gray-100"
                        }`}
                    >
                        Fail Criteria
                    </button>
                    <div className="flex-1 border-b border-gray-100"></div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-b-3xl rounded-tr-3xl shadow-sm border border-gray-100 p-10 -mt-[1px] relative z-0">
                    {activeTab === "Marks Grading" && (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-2">Customize Grading</h2>
                            <div className="flex items-center justify-center gap-4 mb-10 text-sm">
                                <div className="flex items-center gap-1.5 text-[#5C67F2] font-bold">
                                    <div className="w-3.5 h-1.5 bg-[#5C67F2] rounded-full"></div>
                                    Required*
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                                    <div className="w-3.5 h-1.5 bg-gray-300 rounded-full"></div>
                                    Optional
                                </div>
                            </div>

                            <div className="space-y-6 max-w-4xl mx-auto">
                                {grades.map((g, idx) => (
                                    <div key={idx} className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="relative flex-1">
                                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                                Grade*
                                            </div>
                                            <input 
                                                type="text" 
                                                value={g.grade} 
                                                onChange={(e) => updateGrade(idx, "grade", e.target.value)}
                                                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 font-bold text-sm bg-slate-50/50" 
                                            />
                                        </div>
                                        <div className="relative w-32">
                                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                                % From*
                                            </div>
                                            <input 
                                                type="number" 
                                                value={g.from} 
                                                onChange={(e) => updateGrade(idx, "from", parseInt(e.target.value))}
                                                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 font-bold text-sm bg-slate-50/50" 
                                            />
                                        </div>
                                        <div className="relative w-32">
                                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                                % Upto*
                                            </div>
                                            <input 
                                                type="number" 
                                                value={g.upto} 
                                                onChange={(e) => updateGrade(idx, "upto", parseInt(e.target.value))}
                                                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 font-bold text-sm bg-slate-50/50" 
                                            />
                                        </div>
                                        <div className="relative flex-1">
                                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                                Status / Remark*
                                            </div>
                                            <input 
                                                type="text"
                                                value={g.status} 
                                                onChange={(e) => updateGrade(idx, "status", e.target.value)}
                                                placeholder="e.g. PASS, Excellent, Fail"
                                                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 font-bold text-sm bg-slate-50/50"
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-center gap-4 mt-8">
                                    <button onClick={addGrade} className="h-10 px-6 bg-[#8fa4b8] hover:bg-[#7e92a5] text-white font-bold rounded-full text-xs flex items-center gap-1 transition-colors shadow-sm">
                                        <Plus className="w-3.5 h-3.5" /> Add More Option
                                    </button>
                                    <button onClick={removeGrade} className="h-10 px-6 bg-[#1f2937] hover:bg-black text-white font-bold rounded-full text-xs flex items-center gap-1 transition-colors shadow-sm">
                                        <Minus className="w-3.5 h-3.5" /> Remove
                                    </button>
                                </div>
                                
                                <div className="flex justify-center mt-6">
                                    <button 
                                        onClick={handleSave}
                                        disabled={saveMutation.isPending}
                                        className="h-12 px-10 bg-[#FFC165] hover:bg-[#e0a855] text-gray-800 font-bold rounded-full shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Fail Criteria" && (
                        <div className="text-center pt-8">
                            <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-2">Fail Criteria</h2>
                            <div className="flex items-center justify-center gap-4 mb-16 text-sm">
                                <div className="flex items-center gap-1.5 text-[#5C67F2] font-bold">
                                    <div className="w-3.5 h-1.5 bg-[#5C67F2] rounded-full"></div>
                                    Required*
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                                    <div className="w-3.5 h-1.5 bg-gray-300 rounded-full"></div>
                                    Optional
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-6 text-left max-w-4xl mx-auto mb-16">
                                {/* Condition 1 */}
                                <div className="w-64">
                                    <p className="text-gray-700 font-medium mb-8 leading-snug">
                                        Student will be marked as <span className="text-red-500 font-bold">FAILED</span> in the exams if he or she obtains an <span className="font-bold">overall percentage</span> score equal to or below
                                    </p>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                            Overall %
                                        </div>
                                        <input 
                                            type="number" 
                                            value={failCriteria.overallPercent}
                                            onChange={(e) => setFailCriteria({...failCriteria, overallPercent: parseInt(e.target.value)})}
                                            placeholder="Example 40" 
                                            className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 font-bold text-sm placeholder-gray-400 bg-slate-50/50" 
                                        />
                                    </div>
                                </div>

                                {/* Condition 2 */}
                                <div className="w-64 mt-4 md:mt-0">
                                    <p className="text-gray-700 font-medium mb-8 leading-snug h-[4.5rem]">
                                        <span className="text-[#FFC165] font-bold">OR</span> he or she obtains a <span className="font-bold">Subject percentage</span> score equal to or below
                                    </p>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                            Subject %
                                        </div>
                                        <input 
                                            type="number" 
                                            value={failCriteria.subjectPercent}
                                            onChange={(e) => setFailCriteria({...failCriteria, subjectPercent: parseInt(e.target.value)})}
                                            placeholder="Example 33" 
                                            className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 font-bold text-sm placeholder-gray-400 bg-slate-50/50" 
                                        />
                                    </div>
                                </div>

                                {/* Condition 3 */}
                                <div className="w-64 mt-4 md:mt-0">
                                    <p className="text-[#0ea5e9] font-bold mb-8 leading-snug h-[4.5rem] flex items-end">
                                        at least in Subjects
                                    </p>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                            No. of Subjects
                                        </div>
                                        <input 
                                            type="number" 
                                            value={failCriteria.minSubjects}
                                            onChange={(e) => setFailCriteria({...failCriteria, minSubjects: parseInt(e.target.value)})}
                                            placeholder="Example 1" 
                                            className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 font-bold text-sm placeholder-gray-400 bg-slate-50/50" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button 
                                    onClick={handleSave}
                                    disabled={saveMutation.isPending}
                                    className="h-12 px-10 bg-[#FFC165] hover:bg-[#e0a855] text-gray-800 font-bold rounded-full shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                    Update
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
