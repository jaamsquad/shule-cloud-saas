import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Home, Search, Calendar, User, ArrowRight, 
    Printer, Loader2, Check, FileText, Receipt,
    History, Filter, Building2, X
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function FeesPaidSlip() {
    const navigate = useNavigate();
    const [feeMonth, setFeeMonth] = useState("May 2026");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [showResults, setShowResults] = useState(false);

    const { data: students = [] } = useQuery({
        queryKey: ["students", searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.length < 2) return [];
            const r = await api.get(`/students?search=${searchQuery}`);
            return r.data;
        },
        enabled: searchQuery.length >= 2 && !selectedStudent
    });

    const { data: transactions = [], isFetching, refetch } = useQuery({
        queryKey: ["paid_slips", selectedStudent?._id, feeMonth],
        queryFn: async () => {
            if (!selectedStudent) return [];
            const r = await api.get(`/transactions?studentId=${selectedStudent._id}&month=${feeMonth}`);
            return r.data;
        },
        enabled: !!selectedStudent && showResults
    });

    const handleViewHistory = () => {
        if (!selectedStudent) {
            toast.error("Please select a student first");
            return;
        }
        setShowResults(true);
        refetch();
    };

    const handlePrint = (tx: any) => {
        if (tx.invoiceId || tx._id) {
            navigate(`/fees/invoice/${tx.invoiceId || tx._id}`);
        } else {
            toast.error("Receipt document not found");
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
                    <span className="font-black text-[#5C67F2]">Fees Paid Slip</span>
                </div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full px-4 pt-10">
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100/40 border border-slate-50 overflow-hidden">
                    <div className="p-12">
                        <div className="flex items-center justify-center gap-4 mb-10">
                            <div className="w-10 h-1 bg-[#5C67F2] rounded-full" />
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Fees Record</h2>
                            <div className="w-10 h-1 bg-[#5C67F2] rounded-full" />
                        </div>

                        <div className="space-y-8 max-w-md mx-auto">
                            {/* Fee Month */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Fees Month*</div>
                                <div className="relative">
                                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input 
                                        type="text" 
                                        value={feeMonth}
                                        onChange={(e) => setFeeMonth(e.target.value)}
                                        className="w-full h-14 pl-14 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all"
                                        placeholder="e.g. May 2026"
                                    />
                                </div>
                            </div>

                            {/* Search Student */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Search Student*</div>
                                <div className="relative">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (selectedStudent) {
                                                setSelectedStudent(null);
                                                setShowResults(false);
                                            }
                                        }}
                                        readOnly={!!selectedStudent}
                                        className={`w-full h-14 pl-14 pr-14 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-slate-700 font-black text-sm transition-all ${selectedStudent ? 'cursor-default' : ''}`}
                                        placeholder="Search Student..."
                                    />
                                    {selectedStudent && (
                                        <button 
                                            onClick={() => {
                                                setSelectedStudent(null);
                                                setSearchQuery("");
                                                setShowResults(false);
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {/* Dropdown */}
                                {students.length > 0 && searchQuery.length >= 2 && !selectedStudent && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        {students.map((s: any) => (
                                            <div 
                                                key={s._id}
                                                onClick={() => {
                                                    setSelectedStudent(s);
                                                    setSearchQuery(s.studentName || `${s.firstName} ${s.lastName}`);
                                                }}
                                                className="px-6 py-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between group transition-colors"
                                            >
                                                <div>
                                                    <p className="text-xs font-black text-slate-700 uppercase">{s.studentName || `${s.firstName} ${s.lastName}`}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{s.registrationNo || s.studentId} · {s.studentClass || s.currentClass}</p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-[#5C67F2]" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleViewHistory}
                                disabled={isFetching}
                                className="w-full h-14 bg-[#FFC165] hover:bg-[#eab05a] text-slate-900 font-black rounded-2xl shadow-xl shadow-amber-100 transition-all transform active:scale-95 flex items-center justify-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50"
                            >
                                {isFetching ? <Loader2 className="w-5 h-5 animate-spin" /> : <History className="w-5 h-5" />}
                                {isFetching ? "Retrieving History..." : "View Payment History"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                {showResults && selectedStudent && (
                    <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                            <Receipt className="w-5 h-5 text-[#5C67F2]" /> Payment Records for {selectedStudent.studentName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}
                        </h3>
                        
                        {transactions.length > 0 ? (
                            <div className="grid gap-4">
                                {transactions.map((tx: any) => (
                                    <div key={tx._id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                                                <Check className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 uppercase">KES {tx.amount?.toLocaleString()}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ref: {tx._id.slice(-8).toUpperCase()} · Date: {tx.date}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handlePrint(tx)}
                                            className="h-12 px-8 bg-slate-100 hover:bg-[#5C67F2] hover:text-white text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Print Slip
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-200 text-center">
                                <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No payment records found for this student in {feeMonth}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
