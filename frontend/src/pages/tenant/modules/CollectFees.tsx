import { useState, useEffect } from "react";
import { 
    Home, Search, Calendar, Landmark, User, Users, 
    ArrowRight, Printer, Loader2, Check, AlertCircle,
    ChevronDown, CreditCard, ScanLine, Receipt, Wallet
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

type Mode = "Student Wise" | "Family Wise" | "Scanning Paid Invoices";

export default function CollectFees() {
    const [mode, setMode] = useState<Mode>("Student Wise");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Collection Form State
    const [deposit, setDeposit] = useState("0");
    const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
    const [feeTerm, setFeeTerm] = useState("Term 1");
    const [feeYear, setFeeYear] = useState(new Date().getFullYear().toString());

    const queryClient = useQueryClient();

    const { data: students = [] } = useQuery({
        queryKey: ["students", searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.length < 2) return [];
            const r = await api.get(`/students?search=${searchQuery}`);
            return r.data;
        },
        enabled: mode === "Student Wise"
    });

    // Fetch Global Fee Particulars
    const { data: feeParticulars = [] } = useQuery({
        queryKey: ["fee_particulars"],
        queryFn: async () => {
            const r = await api.get("/fee_particulars");
            const doc = r.data.find((d: any) => d.category === 'All Students') || r.data[0];
            return doc?.particulars || [];
        },
    });

    // Fetch Fee Structure for the selected student's class
    const { data: feeStructure } = useQuery({
        queryKey: ["fee_structure", selectedStudent?.studentClass || selectedStudent?.currentClass],
        queryFn: async () => {
            const className = selectedStudent?.studentClass || selectedStudent?.currentClass;
            if (!className) return null;
            const r = await api.get(`/fee_structures?className=${className}`);
            return r.data?.[0];
        },
        enabled: !!selectedStudent
    });

    // Dynamic amounts state to allow manual entry/override
    const [amounts, setAmounts] = useState<Record<string, string>>({});

    // Fetch existing transactions for this student/term/year to show previous balance
    const { data: previousTransactions = [] } = useQuery({
        queryKey: ["previous_transactions", selectedStudent?._id, feeTerm, feeYear],
        queryFn: async () => {
            if (!selectedStudent || !feeTerm || !feeYear) return [];
            const r = await api.get(`/transactions?studentId=${selectedStudent._id}&term=${feeTerm}&year=${feeYear}`);
            return r.data;
        },
        enabled: !!selectedStudent && !!feeTerm && !!feeYear
    });

    const previousDeposit = previousTransactions.reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0);

    useEffect(() => {
        if (feeParticulars.length > 0) {
            const initialAmounts: Record<string, string> = {};
            feeParticulars.forEach((p: any) => {
                // Pre-fill from structure if available, otherwise use global default, otherwise 0
                const structAmount = feeStructure?.amounts?.[p.label];
                initialAmounts[p.label] = structAmount || p.amount || "0";
            });
            setAmounts(initialAmounts);
        }
    }, [feeParticulars, feeStructure, selectedStudent]);

    const calculateTotal = () => {
        return Object.values(amounts).reduce((acc: number, curr: string) => acc + (parseFloat(curr) || 0), 0);
    };

    const total = calculateTotal();
    const remainingBalance = Math.max(0, total - previousDeposit);
    const dueAbleBalance = Math.max(0, remainingBalance - parseFloat(deposit || "0"));

    const submitMutation = useMutation({
        mutationFn: async (payload: any) => api.post("/transactions", payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["previous_transactions"] });
            toast.success("Fees collected successfully");
            setSelectedStudent(null);
            setDeposit("0");
            setSearchQuery("");
            setShowResults(false);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to submit"),
    });

    const handleSubmit = () => {
        if (!selectedStudent || parseFloat(deposit) <= 0) {
            toast.error("Please select a student and enter a valid deposit amount");
            return;
        }
        submitMutation.mutate({
            studentId: selectedStudent._id,
            studentName: selectedStudent.studentName || `${selectedStudent.firstName} ${selectedStudent.lastName}`,
            class: selectedStudent.studentClass || selectedStudent.currentClass,
            amount: parseFloat(deposit),
            totalDue: total,
            previousDeposit: previousDeposit,
            balance: dueAbleBalance,
            date: collectionDate,
            term: feeTerm,
            year: feeYear,
            type: "Fee Collection",
            particulars: amounts
        });
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
                    <span className="font-black text-[#5C67F2]">Collect Fees</span>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 pt-10">
                
                {/* Mode Selector Tabs */}
                {!selectedStudent && (
                    <div className="flex justify-center mb-10">
                        <div className="inline-flex bg-white p-1.5 rounded-[1.5rem] shadow-xl shadow-indigo-100/20 border border-slate-100">
                            {(["Student Wise", "Family Wise", "Scanning Paid Invoices"] as Mode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => { setMode(m); setSearchQuery(""); }}
                                    className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                        mode === m 
                                        ? "bg-[#5C67F2] text-white shadow-lg shadow-indigo-200" 
                                        : "text-slate-400 hover:text-slate-600"
                                    }`}
                                >
                                    {m === "Scanning Paid Invoices" && <ScanLine className="w-4 h-4" />}
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Initial Search Card */}
                {!selectedStudent ? (
                    <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100/40 border border-slate-50 p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8">Collect Fees of a {mode.split(' ')[0]}</h2>
                        <div className="flex items-center justify-center gap-6 mb-10">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1.5 bg-[#5C67F2] rounded-full" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required*</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1.5 bg-slate-200 rounded-full" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optional</span>
                            </div>
                        </div>

                        {mode === "Scanning Paid Invoices" ? (
                            <div className="flex flex-col items-center py-10">
                                <div className="w-24 h-24 bg-amber-100 rounded-[2rem] flex items-center justify-center text-amber-500 mb-6 animate-pulse">
                                    <ScanLine className="w-12 h-12" />
                                </div>
                                <h3 className="text-lg font-black text-slate-700 uppercase">Ready to Scan</h3>
                                <p className="text-slate-400 text-xs font-bold mt-2">Place the invoice barcode under the scanner</p>
                                <input 
                                    type="text" 
                                    autoFocus
                                    className="mt-6 w-64 h-12 border-2 border-dashed border-slate-200 rounded-xl focus:border-[#5C67F2] text-center font-black text-sm outline-none"
                                    placeholder="Waiting for scan..."
                                />
                            </div>
                        ) : (
                            <div className="max-w-md mx-auto relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase transition-transform group-focus-within:scale-110">Search {mode.split(' ')[0]}*</div>
                                <div className="relative">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (selectedStudent) setSelectedStudent(null);
                                        }}
                                        className="w-full h-14 pl-14 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all shadow-inner"
                                        placeholder={mode === "Student Wise" ? "Search Student..." : "Search Family..."}
                                    />
                                </div>

                                {/* Results Dropdown */}
                                {mode === "Student Wise" && students.length > 0 && searchQuery.length >= 2 && !selectedStudent && (
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] border border-slate-100 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="p-3 bg-slate-50 border-b border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Suggested Students</p>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar text-left">
                                            {students.map((s: any) => (
                                                <div 
                                                    key={s._id}
                                                    onClick={() => {
                                                        setSelectedStudent(s);
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
                        )}
                    </div>
                ) : (
                    /* Collection Form */
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100/40 border border-slate-50 overflow-hidden">
                            {/* Header Info */}
                            <div className="bg-slate-50/50 border-b border-slate-100 p-10 flex flex-wrap items-center justify-between gap-8">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedStudent(null)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-sm">
                                        <X className="w-5 h-5" />
                                    </button>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Fees Collection</h2>
                                </div>
                                <div className="flex items-center gap-12">
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration</p>
                                        <p className="text-sm font-black text-[#5C67F2] uppercase tracking-tighter">{selectedStudent.registrationNo || selectedStudent.studentId}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Name</p>
                                        <p className="text-sm font-black text-slate-700 uppercase tracking-tighter">{selectedStudent.studentName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Class</p>
                                        <p className="text-sm font-black text-slate-700 uppercase tracking-tighter">{selectedStudent.studentClass || selectedStudent.currentClass}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-12">
                                <div className="grid grid-cols-3 gap-10 mb-12">
                                    <div className="relative group">
                                        <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Fee Term*</div>
                                        <select 
                                            value={feeTerm}
                                            onChange={(e) => setFeeTerm(e.target.value)}
                                            className="w-full h-14 px-6 bg-slate-50/30 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all appearance-none"
                                        >
                                            <option value="Term 1">Term 1</option>
                                            <option value="Term 2">Term 2</option>
                                            <option value="Term 3">Term 3</option>
                                        </select>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Academic Year*</div>
                                        <input 
                                            type="text" 
                                            value={feeYear}
                                            onChange={(e) => setFeeYear(e.target.value)}
                                            className="w-full h-14 px-6 bg-slate-50/30 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all"
                                            placeholder="e.g. 2026"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Date*</div>
                                        <input 
                                            type="date" 
                                            value={collectionDate}
                                            onChange={(e) => setCollectionDate(e.target.value)}
                                            className="w-full h-14 px-6 bg-slate-50/30 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Particulars Table */}
                                <div className="bg-slate-50/30 rounded-[2rem] border border-slate-100 overflow-hidden mb-12">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-white border-b border-slate-100">
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sr.</th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Particulars</th>
                                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (KES)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {feeParticulars.length > 0 ? feeParticulars.map((p: any, i: number) => (
                                                <tr key={p.label || i} className="hover:bg-white transition-colors group">
                                                    <td className="px-8 py-4 text-[11px] font-black text-slate-300 uppercase">{i + 1}</td>
                                                    <td className="px-8 py-4 text-xs font-black text-slate-600 uppercase">{p.label}</td>
                                                    <td className="px-8 py-4 text-right">
                                                        <input 
                                                            type="number"
                                                            value={amounts[p.label] || "0"}
                                                            onChange={(e) => setAmounts(prev => ({ ...prev, [p.label]: e.target.value }))}
                                                            className="w-32 h-10 px-4 bg-white border border-slate-100 rounded-xl font-black text-right text-xs text-slate-700 focus:outline-none focus:border-[#5C67F2] transition-all"
                                                        />
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={3} className="px-8 py-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No particulars found. Configure them in Settings.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-white border-t-2 border-slate-100">
                                                <td colSpan={2} className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Institutional Due</td>
                                                <td className="px-8 py-5 text-right text-xl font-black text-slate-900 tracking-tighter">{total.toLocaleString()}</td>
                                            </tr>
                                            {previousDeposit > 0 && (
                                                <tr className="bg-emerald-50/20">
                                                    <td colSpan={2} className="px-8 py-4 text-right text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center justify-end gap-2">
                                                        <Check className="w-3 h-3" /> Already Paid (Uneditable)
                                                    </td>
                                                    <td className="px-8 py-4 text-right text-lg font-black text-emerald-600 tracking-tighter">-{previousDeposit.toLocaleString()}</td>
                                                </tr>
                                            )}
                                            <tr className="bg-indigo-50/20">
                                                <td colSpan={2} className="px-8 py-6 text-right text-[10px] font-black text-[#5C67F2] uppercase tracking-widest">Deposit Received</td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3 h-12 w-64 ml-auto px-6 bg-white border-2 border-[#5C67F2] rounded-2xl shadow-lg shadow-indigo-100">
                                                        <button 
                                                            onClick={() => setDeposit(remainingBalance.toString())}
                                                            className="px-3 py-1 bg-indigo-50 text-[#5C67F2] text-[9px] font-black uppercase rounded-lg hover:bg-[#5C67F2] hover:text-white transition-all shadow-sm"
                                                        >
                                                            Full
                                                        </button>
                                                        <input 
                                                            type="number" 
                                                            value={deposit}
                                                            onChange={(e) => setDeposit(e.target.value)}
                                                            className="w-full bg-transparent text-right font-black text-lg text-slate-900 focus:outline-none"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr className="bg-rose-50/20">
                                                <td colSpan={2} className="px-8 py-5 text-right text-[10px] font-black text-rose-500 uppercase tracking-widest">Net Remaining Balance</td>
                                                <td className="px-8 py-5 text-right text-xl font-black text-rose-600 tracking-tighter">{dueAbleBalance.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Submit Section */}
                                <div className="flex flex-col items-center gap-6">
                                    <button 
                                        onClick={handleSubmit}
                                        disabled={submitMutation.isPending || total === 0}
                                        className="h-16 px-16 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-[2rem] shadow-2xl shadow-indigo-100 transition-all transform active:scale-95 flex items-center gap-4 text-sm uppercase tracking-widest disabled:opacity-50 group"
                                    >
                                        {submitMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6 group-hover:scale-125 transition-transform" />}
                                        {submitMutation.isPending ? "Processing..." : "Submit Fees Collection"}
                                    </button>
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                        <AlertCircle className="w-3 h-3" />
                                        Submitting will generate a transaction record and update student balance
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function X({ className }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>;
}
