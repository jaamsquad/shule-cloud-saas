import { useState } from "react";
import { 
    Home, Search, Calendar, User, Printer, Loader2, Check, 
    FileText, Mail, MessageSquare, Download, Filter, RefreshCw
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";
import { toast } from "sonner";
import { FeesPage } from "@/components/fees/FeesUI";
import { Receipt as ReceiptPageIcon } from "lucide-react";

export default function FeesPaidSlip() {
    const [searchQuery, setSearchQuery] = useState("");
    const [methodFilter, setMethodFilter] = useState("ALL");
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [emailInput, setEmailInput] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Fetch Receipts
    const { data: receiptsRes, isLoading, refetch } = useQuery({
        queryKey: ["fees_paid_receipts", searchQuery, methodFilter],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            if (searchQuery) queryParams.append("receipt_no", searchQuery);
            if (methodFilter !== "ALL") queryParams.append("method", methodFilter);
            const r = await api.get(`/schools/default/receipts?${queryParams.toString()}`);
            return r.data;
        }
    });

    const receipts = receiptsRes?.data || [];

    const handlePrintReceipt = (receiptNo: string, id: string) => {
        toast.info(`Opening print receipt: ${receiptNo}`);
        window.open(`${API_ORIGIN}/api/v1/schools/default/receipts/${receiptNo}/pdf`, "_blank");
    };

    const handleDocxExport = (receiptNo: string) => {
        toast.info(`Downloading Word stub for receipt: ${receiptNo}`);
        window.open(`${API_ORIGIN}/api/v1/schools/default/receipts/${receiptNo}/word`, "_blank");
    };

    const handleEmailReceipt = async () => {
        if (!selectedReceipt || !emailInput) {
            toast.error("Receipt and email are required");
            return;
        }
        setIsSending(true);
        try {
            await api.post(`/schools/default/receipts/${selectedReceipt.receipt_no}/email`, { email: emailInput });
            toast.success("Receipt emailed successfully");
            setSelectedReceipt(null);
            setEmailInput("");
        } catch {
            toast.error("Failed to email receipt");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <FeesPage title="Receipts" subtitle="Every payment received. Reprint a receipt, email it to the parent or export the list." icon={ReceiptPageIcon}>

            <div>

                {/* Filter and Search controls */}
                <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
                    <div className="flex gap-4 flex-1 max-w-xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by Receipt Number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700"
                            />
                        </div>

                        <div className="relative w-48">
                            <select
                                value={methodFilter}
                                onChange={(e) => setMethodFilter(e.target.value)}
                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                            >
                                <option value="ALL">All Methods</option>
                                <option value="CASH">Cash</option>
                                <option value="MPESA">M-Pesa</option>
                                <option value="BANK">Bank Transfer</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={() => refetch()}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Receipts Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="py-4 px-6">Receipt Info</th>
                                    <th className="py-4 px-6">Student details</th>
                                    <th className="py-4 px-6">Invoice Ref</th>
                                    <th className="py-4 px-6 text-right">Amount (KSh)</th>
                                    <th className="py-4 px-6 text-center">Method</th>
                                    <th className="py-4 px-6 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                {receipts.map((rcpt: any) => (
                                    <tr key={rcpt.receipt_no} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <p className="font-black text-slate-800 text-sm uppercase">{rcpt.receipt_no}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Date: {rcpt.date}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="font-bold text-slate-800 uppercase">{rcpt.student_name}</p>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-0.5">{rcpt.admission_no} · {rcpt.class_name}</p>
                                        </td>
                                        <td className="py-4 px-6 font-black text-slate-700 uppercase">
                                            {rcpt.invoice_no}
                                        </td>
                                        <td className="py-4 px-6 text-right font-black text-slate-800 text-sm">
                                            KSh {rcpt.amount_paid.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="px-2.5 py-1 bg-indigo-55 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-100">{rcpt.method}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Print button using the exact requested styling */}
                                                <button
                                                    onClick={() => handlePrintReceipt(rcpt.receipt_no, rcpt.id)}
                                                    className="group relative bg-white hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-md"
                                                >
                                                    <Printer className="w-4 h-4 text-indigo-500 group-hover:scale-115 transition-transform" />
                                                    Print
                                                </button>
                                                
                                                <button
                                                    onClick={() => setSelectedReceipt(rcpt)}
                                                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[#5C67F2] transition-colors"
                                                    title="Email receipt"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {receipts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                            {isLoading ? "Retrieving ledger records..." : "No matching paid slips/receipts found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Email Stub Modal */}
            {selectedReceipt && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-md w-full rounded-2xl border border-slate-100 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
                        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        
                        <div className="p-8">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Email Receipt Stub</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wide mb-6">Receipt: {selectedReceipt.receipt_no} · Student: {selectedReceipt.student_name}</p>

                            <div className="relative group">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Parent Email Address</div>
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold transition-all"
                                    placeholder="parent@example.com"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-8">
                                <button
                                    onClick={() => {
                                        setSelectedReceipt(null);
                                        setEmailInput("");
                                    }}
                                    className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEmailReceipt}
                                    disabled={isSending || !emailInput}
                                    className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                                >
                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Send Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </FeesPage>
    );
}
