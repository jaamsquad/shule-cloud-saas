import { useState } from "react";
import {
    Home, Search, User, CreditCard, Calendar, Check,
    Loader2, AlertCircle, Sparkles, Printer, FileText, X, Smartphone
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";
import { toast } from "sonner";

export default function CollectFees() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Form inputs
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("MPESA");
    const [reference, setReference] = useState("");
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    // STK Push (send M-PESA prompt to a phone)
    const [stkPhone, setStkPhone] = useState("");
    const [stkBusy, setStkBusy] = useState(false);
    const [stkMsg, setStkMsg] = useState("");

    const queryClient = useQueryClient();

    // Search students query
    const { data: students = [] } = useQuery({
        queryKey: ["students_search", searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.length < 2) return [];
            const r = await api.get(`/students?search=${searchQuery}`);
            return r.data;
        },
        enabled: searchQuery.length >= 2 && !selectedStudent
    });

    // Fetch student fee summary & invoices
    const { data: summaryRes, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
        queryKey: ["student_fee_summary", selectedStudent?._id],
        queryFn: async () => {
            if (!selectedStudent) return null;
            const r = await api.get(`/schools/default/students/${selectedStudent._id}/fee-summary`);
            return r.data.data;
        },
        enabled: !!selectedStudent
    });

    const summary = (summaryRes && typeof summaryRes.total_invoiced === "number") 
        ? summaryRes 
        : { total_invoiced: 0, total_paid: 0, outstanding: 0, invoices: [] };

    // Fetch recent payment transactions
    const { data: recentPaymentsRes } = useQuery({
        queryKey: ["recent_payments_dashboard"],
        queryFn: async () => {
            const r = await api.get("/schools/default/fees/dashboard");
            return r.data;
        }
    });

    const recentPayments = recentPaymentsRes?.data?.recent_payments || [];

    const handleSelectStudent = (student: any) => {
        setSelectedStudent(student);
        setSearchQuery(student.studentName || `${student.firstName} ${student.lastName}`);
    };

    const handleSelectInvoice = (invoice: any) => {
        setSelectedInvoice(invoice);
        setAmount(invoice.balance.toString()); // default to full balance
    };

    const handleCollectFees = async () => {
        if (!selectedStudent || !selectedInvoice || !amount) {
            toast.error("Please fill in all required fields");
            return;
        }

        const payVal = parseFloat(amount);
        if (payVal <= 0) {
            toast.error("Amount must be greater than zero");
            return;
        }

        if (payVal > selectedInvoice.balance) {
            toast.error(`Amount cannot exceed outstanding balance of KSh ${selectedInvoice.balance.toLocaleString()}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post("/schools/default/payments", {
                invoice_id: selectedInvoice.id || selectedInvoice._id,
                amount: payVal,
                method,
                reference,
                payment_date: paymentDate,
                remarks
            });

            toast.success("Fees payment recorded successfully");
            
            // Auto-print receipt in new tab. The backend returns a relative
            // /api/v1/... path — prefix the API origin so it doesn't resolve
            // against the frontend domain (which would 404 in the SPA).
            const receiptPdfUrl = response.data?.data?.receipt_pdf_url;
            if (receiptPdfUrl) {
                const url = /^https?:\/\//.test(receiptPdfUrl) ? receiptPdfUrl : `${API_ORIGIN}${receiptPdfUrl}`;
                window.open(url, "_blank");
            }

            // Reset forms & refetch
            setAmount("");
            setReference("");
            setRemarks("");
            setSelectedInvoice(null);
            refetchSummary();
            queryClient.invalidateQueries({ queryKey: ["recent_payments_dashboard"] });
        } catch (err: any) {
            const errorMsg = err.response?.data?.errors?.[0]?.message || "Payment transaction failed";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Send an M-PESA STK push to the parent's phone, then poll until they pay.
    // Works for both Paybill and Till (the backend picks the right type). On
    // success the payment is applied automatically — we just refresh.
    const handleStkPush = async () => {
        if (!selectedStudent || !selectedInvoice || !amount) { toast.error("Select an invoice and amount first"); return; }
        const phone = stkPhone.trim();
        if (!/^(0|254|\+254)?(7|1)\d{8}$/.test(phone.replace(/\s/g, ""))) { toast.error("Enter a valid Safaricom number, e.g. 07XXXXXXXX"); return; }
        const payVal = parseFloat(amount);
        if (payVal <= 0 || payVal > selectedInvoice.balance) { toast.error("Enter a valid amount within the balance"); return; }

        setStkBusy(true);
        setStkMsg("Sending prompt to the phone…");
        try {
            const r = await api.post("/schools/default/payments/stk", {
                invoice_id: selectedInvoice.id || selectedInvoice._id,
                studentId: selectedStudent._id, phone, amount: payVal,
            });
            const checkoutRequestId = r.data?.checkoutRequestId;
            setStkMsg(r.data?.message || "Prompt sent. Waiting for the parent to enter their PIN…");
            toast.success("STK prompt sent to " + phone);
            if (!checkoutRequestId) { setStkBusy(false); return; }

            // Poll for up to ~90s.
            for (let i = 0; i < 30; i++) {
                await new Promise(res => setTimeout(res, 3000));
                const s = (await api.get("/schools/default/payments/stk-status", { params: { checkoutRequestId } })).data;
                if (s.status === "completed") {
                    toast.success("Payment received and applied 🎉");
                    setStkMsg(""); setStkPhone(""); setAmount(""); setSelectedInvoice(null);
                    refetchSummary();
                    queryClient.invalidateQueries({ queryKey: ["recent_payments_dashboard"] });
                    setStkBusy(false);
                    return;
                }
                if (s.status === "failed") { toast.error(s.message || "The customer did not complete the payment."); setStkMsg(""); setStkBusy(false); return; }
            }
            setStkMsg("Still waiting — if the parent paid, it will appear shortly under Till / Paybill Transactions.");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Could not send STK push");
            setStkMsg("");
        } finally {
            setStkBusy(false);
        }
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
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

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10">
                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        Collect Fees Ledger <Sparkles className="w-6 h-6 text-indigo-500" />
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Record payments, view student balances, print double-stub receipts, and review logs</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Panel: Student Search & Metrics */}
                    <div className="md:col-span-1 space-y-6">
                        {/* Search Input */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group">
                            <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Search Student*</div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (selectedStudent) {
                                            setSelectedStudent(null);
                                            setSelectedInvoice(null);
                                        }
                                    }}
                                    className="w-full h-11 pl-12 pr-10 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700"
                                    placeholder="Type name or Adm No..."
                                />
                                {selectedStudent && (
                                    <button 
                                        onClick={() => {
                                            setSelectedStudent(null);
                                            setSelectedInvoice(null);
                                            setSearchQuery("");
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Suggestions */}
                            {students.length > 0 && searchQuery.length >= 2 && !selectedStudent && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                    {students.map((s: any) => (
                                        <div
                                            key={s._id}
                                            onClick={() => handleSelectStudent(s)}
                                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50"
                                        >
                                            <div>
                                                <p className="text-xs font-black text-slate-700 uppercase">{s.studentName || `${s.firstName} ${s.lastName}`}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{s.registrationNo || s.studentId} · {s.studentClass || s.currentClass}</p>
                                            </div>
                                            <Check className="w-3.5 h-3.5 text-slate-200" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Student Metrics Balance cards */}
                        {selectedStudent && (
                            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400">
                                        {selectedStudent.studentName ? selectedStudent.studentName[0] : 'S'}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase">{selectedStudent.studentName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{selectedStudent.registrationNo || selectedStudent.studentId}</p>
                                    </div>
                                </div>

                                {loadingSummary ? (
                                    <div className="text-center py-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" />
                                        Calculating dues...
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Total Invoiced</span>
                                            <p className="text-lg font-black text-slate-800">KSh {summary.total_invoiced.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Total Paid</span>
                                            <p className="text-lg font-black text-emerald-600">KSh {summary.total_paid.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Outstanding Balance</span>
                                            <p className="text-lg font-black text-rose-600">KSh {summary.outstanding.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Middle Panel: Select Invoices & Form */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Collect Fees Form Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                Invoice Payments Form <CreditCard className="w-4 h-4 text-[#5C67F2]" />
                            </h3>

                            {selectedStudent ? (
                                <div className="space-y-6">
                                    {/* Select Outstanding Invoice */}
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Outstanding Invoice*</p>
                                        <div className="grid grid-cols-1 gap-3">
                                            {summary.invoices?.filter((inv: any) => inv.balance > 0).map((inv: any) => (
                                                <div
                                                    key={inv.id || inv._id}
                                                    onClick={() => handleSelectInvoice(inv)}
                                                    className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                                                        selectedInvoice?.id === inv.id || selectedInvoice?._id === inv._id
                                                        ? "border-[#5C67F2] bg-indigo-50/30"
                                                        : "border-slate-100 hover:border-indigo-100 bg-white"
                                                    }`}
                                                >
                                                    <div>
                                                        <span className="font-black text-xs text-slate-800 uppercase">{inv.invoice_no}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight ml-2">Due: {inv.due_date}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-rose-600">Bal: KSh {inv.balance.toLocaleString()}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Total: KSh {inv.total_due.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {summary.invoices?.filter((inv: any) => inv.balance > 0).length === 0 && (
                                                <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-400 uppercase">
                                                    No outstanding invoices found for this student.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Inputs */}
                                    {selectedInvoice && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                            {/* Amount to pay */}
                                            <div className="relative group">
                                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Amount to pay (KSh)*</div>
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700"
                                                    placeholder="Enter amount..."
                                                />
                                            </div>

                                            {/* Payment Method */}
                                            <div className="relative group">
                                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Payment Method*</div>
                                                <select
                                                    value={method}
                                                    onChange={(e) => setMethod(e.target.value)}
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                                                >
                                                    <option value="MPESA">M-Pesa</option>
                                                    <option value="CASH">Cash</option>
                                                    <option value="BANK">Bank Transfer</option>
                                                    <option value="CHEQUE">Cheque</option>
                                                </select>
                                            </div>

                                            {/* Reference */}
                                            <div className="relative group">
                                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Transaction Reference</div>
                                                <input
                                                    type="text"
                                                    value={reference}
                                                    onChange={(e) => setReference(e.target.value)}
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700"
                                                    placeholder="MPesa code or Cheque No..."
                                                />
                                            </div>

                                            {/* Payment Date */}
                                            <div className="relative group">
                                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Payment Date*</div>
                                                <input
                                                    type="date"
                                                    value={paymentDate}
                                                    onChange={(e) => setPaymentDate(e.target.value)}
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700"
                                                />
                                            </div>

                                            {/* Remarks */}
                                            <div className="relative group md:col-span-2">
                                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Remarks / Notes</div>
                                                <input
                                                    type="text"
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700"
                                                    placeholder="Optional notes..."
                                                />
                                            </div>

                                            {/* M-PESA STK Push — send the prompt to a phone (Paybill or Till) */}
                                            {method === "MPESA" && (
                                                <div className="md:col-span-2 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                                        <Smartphone className="w-3.5 h-3.5" /> Send M-PESA Prompt (STK Push)
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <input
                                                            type="tel"
                                                            value={stkPhone}
                                                            onChange={(e) => setStkPhone(e.target.value)}
                                                            placeholder="Parent phone e.g. 0712345678"
                                                            className="flex-1 h-11 px-4 bg-white border border-emerald-100 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-bold text-slate-700"
                                                        />
                                                        <button
                                                            onClick={handleStkPush}
                                                            disabled={stkBusy || !amount}
                                                            className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 whitespace-nowrap"
                                                        >
                                                            {stkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                                                            Send Prompt
                                                        </button>
                                                    </div>
                                                    {stkMsg && <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5"><Loader2 className={`w-3 h-3 ${stkBusy ? "animate-spin" : "hidden"}`} />{stkMsg}</p>}
                                                    <p className="text-[10px] text-slate-400 font-bold">The parent enters their PIN on their phone; the payment is captured and applied automatically. Or use the button below to record a payment already made (M-PESA code, cash, cheque…).</p>
                                                </div>
                                            )}

                                            {/* Action Button */}
                                            <div className="md:col-span-2 pt-4">
                                                <button
                                                    onClick={handleCollectFees}
                                                    disabled={isSubmitting || !amount}
                                                    className="w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                    Record Collection & Print Receipt
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-400 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">
                                    Search and select a student to load outstanding invoices
                                </div>
                            )}
                        </div>

                        {/* Recent Transactions Log */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6">Recent Collections Log</h3>
                            <div className="space-y-4">
                                {recentPayments.map((p: any) => (
                                    <div key={p.receipt_no} className="flex items-center justify-between p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center font-black text-xs">
                                                ✓
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-700 uppercase">{p.student_name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">Receipt: {p.receipt_no} · Via: {p.method}</p>
                                            </div>
                                        </div>
                                        <span className="font-black text-xs text-slate-850">KSh {p.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                                {recentPayments.length === 0 && (
                                    <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest py-8">No collections recorded today</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
