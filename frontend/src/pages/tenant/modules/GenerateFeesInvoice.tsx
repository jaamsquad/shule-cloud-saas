import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Home, Search, Calendar, Landmark, User, Users, 
    ArrowRight, Printer, Loader2, Check, AlertCircle,
    ChevronDown, CreditCard, Building2, Receipt, FileText,
    Eye
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useItems } from "@/hooks/useItems";

type Mode = "Student Wise" | "Class Wise" | "Family Wise";

export default function GenerateFeesInvoice() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>("Student Wise");
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Form State
    const [feeMonth, setFeeMonth] = useState("May 2026");
    const [dueDate, setDueDate] = useState("2026-05-16");
    const [fineAmount, setFineAmount] = useState("0");
    const [bankName, setBankName] = useState("kcb");
    const [selectedId, setSelectedId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const { data: periods = [] } = useQuery({
        queryKey: ["periods"],
        queryFn: async () => (await api.get("/academics/periods")).data,
    });

    useEffect(() => {
        if (periods.length > 0) {
            const current = periods.find((p: any) => p.isCurrent) || periods[0];
            if (current) {
                setFeeMonth(`${current.label} (${current.academicYear})`);
            }
        }
    }, [periods]);

    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => (await api.get("/academics/classes")).data,
    });

    const { data: students = [] } = useQuery({
        queryKey: ["students", searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.length < 2) return [];
            const r = await api.get(`/students?search=${searchQuery}`);
            return r.data;
        },
        enabled: mode === "Student Wise"
    });

    const { data: feeParticulars = [] } = useQuery({
        queryKey: ["fee_particulars"],
        queryFn: async () => {
            const r = await api.get("/fee_particulars");
            const doc = r.data.find((d: any) => d.category === 'All Students') || r.data[0];
            return doc?.particulars || [];
        },
    });

    const { data: feeStructure } = useQuery({
        queryKey: ["fee_structure", mode === "Class Wise" ? selectedId : students.find(s => s._id === selectedId)?.studentClass || students.find(s => s._id === selectedId)?.currentClass],
        queryFn: async () => {
            const student = students.find(s => s._id === selectedId);
            const className = mode === "Class Wise" ? classes.find(c => c._id === selectedId)?.name : (student?.studentClass || student?.currentClass);
            if (!className) return null;
            const r = await api.get(`/fee_structures?className=${className}`);
            return r.data?.[0];
        },
        enabled: !!selectedId
    });

    const calculateTotal = () => {
        return feeParticulars.reduce((acc, p) => {
            const amount = feeStructure?.amounts?.[p.label] || p.amount || 0;
            return acc + parseFloat(amount);
        }, 0);
    };

    const { data: recentInvoices = [], refetch: refetchInvoices } = useQuery({
        queryKey: ["recent_invoices"],
        queryFn: async () => (await api.get("/invoices")).data,
    });

    const handleGenerate = async () => {
        if (!selectedId && mode !== "Family Wise") {
            toast.error(`Please select a ${mode === "Student Wise" ? "student" : "class"}`);
            return;
        }

        setIsGenerating(true);
        try {
            const total = calculateTotal();
            const particularsPayload: Record<string, any> = {};
            feeParticulars.forEach(p => {
                particularsPayload[p.label] = feeStructure?.amounts?.[p.label] || p.amount || 0;
            });

            // Save to backend
            const payload = {
                studentId: selectedId,
                studentName: mode === "Student Wise" ? students.find(s => s._id === selectedId)?.studentName : "Class Invoice",
                registrationNo: mode === "Student Wise" ? students.find(s => s._id === selectedId)?.registrationNo : "",
                studentClass: mode === "Class Wise" ? classes.find(c => c._id === selectedId)?.name : (students.find(s => s._id === selectedId)?.studentClass || students.find(s => s._id === selectedId)?.currentClass),
                mode,
                feeMonth,
                dueDate,
                bankName,
                total,
                particulars: particularsPayload,
                status: "Unpaid",
                createdAt: new Date().toISOString()
            };
            
            const r = await api.post("/invoices", payload);
            refetchInvoices();

            toast.success("Invoice generated and saved successfully");
            navigate(`/fees/invoice/${r.data.id}`);
        } catch (err) {
            toast.error("Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const markAsPaid = async (id: string) => {
        try {
            await api.patch(`/invoices/${id}`, { status: "Paid" });
            refetchInvoices();
            toast.success("Invoice marked as paid");
        } catch (err) {
            toast.error("Update failed");
        }
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Fees</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Generate Fees Invoice</span>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 pt-10">
                
                {/* Tabs */}
                <div className="flex justify-center mb-10">
                    <div className="inline-flex bg-white p-1.5 rounded-[1.5rem] shadow-xl shadow-indigo-100/20 border border-slate-100">
                        {(["Student Wise", "Class Wise", "Family Wise"] as Mode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setSelectedId(""); }}
                                className={`px-10 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                    mode === m 
                                    ? "bg-[#5C67F2] text-white shadow-lg shadow-indigo-200" 
                                    : "text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100/40 border border-slate-50 relative">
                    {/* Header Overlay */}
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#5C67F2] to-[#FF5E6C]" />
                    
                    <div className="p-12">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Fees Invoice for {mode.split(' ')[0]}</h2>
                            <div className="flex items-center justify-center gap-6 mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-1.5 bg-[#5C67F2] rounded-full" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required*</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-1.5 bg-slate-200 rounded-full" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optional</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {/* Fee Month */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Academic Period / Term*</div>
                                <div className="relative">
                                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <select 
                                        value={feeMonth}
                                        onChange={(e) => setFeeMonth(e.target.value)}
                                        className="w-full h-14 pl-14 pr-12 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-xs appearance-none transition-all uppercase tracking-wider cursor-pointer"
                                    >
                                        {periods.map((p: any) => (
                                            <option key={p._id} value={`${p.label} (${p.academicYear})`}>
                                                {p.label} ({p.academicYear}) {p.isCurrent ? "★ CURRENT" : ""}
                                            </option>
                                        ))}
                                        {periods.length === 0 && (
                                            <option value="Term 2 (2026/2027)">Term 2 (2026/2027)</option>
                                        )}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Due Date */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Due Date*</div>
                                <div className="relative">
                                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input 
                                        type="date" 
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full h-14 pl-14 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all"
                                    />
                                </div>
                            </div>

                            {/* Fine */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Fine After Due Date</div>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">KES</span>
                                    <input 
                                        type="number" 
                                        value={fineAmount}
                                        onChange={(e) => setFineAmount(e.target.value)}
                                        className="w-full h-14 pl-14 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Bank Selection */}
                            <div className="relative group md:col-span-2">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Select Bank*</div>
                                <div className="relative">
                                    <Landmark className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <select 
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full h-14 pl-14 pr-12 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-xs appearance-none transition-all uppercase tracking-wider cursor-pointer"
                                    >
                                        <option value="kcb">Kenya Commercial Bank (KCB)</option>
                                        <option value="equity">Equity Bank</option>
                                        <option value="coop">Co-operative Bank</option>
                                        <option value="mpesa">M-Pesa (Direct STK)</option>
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Entity Selection */}
                            <div className="relative group md:col-span-1">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">
                                    {mode === "Student Wise" ? "Search Student*" : mode === "Class Wise" ? "Select Class*" : "Search Family*"}
                                </div>
                                <div className="relative">
                                    {mode === "Student Wise" ? <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /> : <Users className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />}
                                    
                                    {mode === "Class Wise" ? (
                                        <>
                                            <select 
                                                value={selectedId}
                                                onChange={(e) => setSelectedId(e.target.value)}
                                                className="w-full h-14 pl-14 pr-12 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-xs appearance-none transition-all uppercase"
                                            >
                                                <option value="">Select...</option>
                                                {classes.map((c: any) => (
                                                    <option key={c._id} value={c._id}>{c.name || c.levelName}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </>
                                    ) : (
                                        <input 
                                            type="text" 
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                if (selectedId) setSelectedId(""); // Reset if typing again
                                            }}
                                            className="w-full h-14 pl-14 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all"
                                            placeholder={mode === "Student Wise" ? "Name or ID..." : "Family Surname..."}
                                        />
                                    )}
                                </div>
                                
                                {/* Search Results Dropdown */}
                                {mode === "Student Wise" && students.length > 0 && searchQuery.length >= 2 && !selectedId && (
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] border border-slate-100 shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="p-3 bg-slate-50 border-b border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Suggested Students</p>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            {students.map((s: any) => (
                                                <div 
                                                    key={s._id}
                                                    onClick={() => {
                                                        setSelectedId(s._id);
                                                        setSearchQuery(s.studentName || `${s.firstName} ${s.lastName}`);
                                                    }}
                                                    className="px-6 py-4 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between group transition-all"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[#5C67F2] font-black text-xs group-hover:scale-110 transition-transform">
                                                            {(s.studentName || `${s.firstName} ${s.lastName}`)[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-800 uppercase group-hover:text-[#5C67F2] transition-colors">{s.studentName || `${s.firstName} ${s.lastName}`}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{s.registrationNo || s.studentId} · {s.studentClass || s.currentClass}</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Check className="w-4 h-4 text-[#5C67F2]" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Copy Selection Toggles */}
                            <div className="md:col-span-3 flex flex-wrap justify-center gap-8 mt-4">
                                {[
                                    { label: "Bank Copy", color: "bg-blue-500" },
                                    { label: "Student Copy", color: "bg-indigo-500" },
                                    { label: "Institute Copy", color: "bg-[#5C67F2]" }
                                ].map((copy) => (
                                    <div key={copy.label} className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                                        <div className={`w-3 h-3 rounded-full ${copy.color} shadow-sm shadow-indigo-100`} />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{copy.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="flex justify-center mt-16">
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="h-16 px-16 bg-[#FFC165] hover:bg-[#eab05a] text-slate-900 font-black rounded-[2rem] shadow-2xl shadow-amber-200/50 transition-all transform active:scale-95 flex items-center gap-4 text-sm uppercase tracking-widest disabled:opacity-50 group"
                            >
                                {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Printer className="w-6 h-6 group-hover:rotate-12 transition-transform" />}
                                {isGenerating ? "Processing..." : "Generate Invoice"}
                            </button>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-indigo-50/30 p-8 border-t border-slate-50 flex items-center gap-6">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#5C67F2] shadow-sm">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[#5C67F2] uppercase tracking-widest mb-1">Production Ready Tip</p>
                            <p className="text-slate-500 text-xs font-medium leading-relaxed">
                                Ensure your <span className="font-black text-slate-700">Bank Accounts</span> and <span className="font-black text-slate-700">Fee Particulars</span> are correctly linked in Settings to ensure all copies contain accurate payment instructions.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Recent Invoices List */}
                <div className="mt-20">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recent Generated Invoices</h3>
                        <div className="h-px flex-1 bg-slate-200 mx-8"></div>
                        <Receipt className="w-6 h-6 text-slate-300" />
                    </div>

                    <div className="space-y-4">
                        {recentInvoices.slice(0, 5).map((inv: any) => (
                            <div key={inv._id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group animate-in slide-in-from-left-4">
                                <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-black text-slate-800 text-sm uppercase">{inv.feeMonth}</p>
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-amber-100 text-amber-600 border-amber-200'}`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Due: {inv.dueDate} · Bank: {inv.bankName?.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => navigate(`/fees/invoice/${inv._id}`)}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-[#5C67F2] hover:text-white text-slate-500 rounded-xl transition-all"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    {inv.status === 'Unpaid' && (
                                        <button 
                                            onClick={() => markAsPaid(inv._id)}
                                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-100"
                                        >
                                            Mark Paid
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {recentInvoices.length === 0 && (
                            <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No invoices generated yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
