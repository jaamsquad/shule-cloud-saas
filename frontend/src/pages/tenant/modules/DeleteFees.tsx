import { useState } from "react";
import { 
    Home, Trash2, Ban, Eye, Search, AlertCircle, 
    ShieldAlert, Key, ClipboardList, Loader2, Check,
    AlertTriangle, Sparkles, Filter, RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { FeesPage } from "@/components/fees/FeesUI";
import { Trash2 as Trash2PageIcon } from "lucide-react";

type Tab = "invoices" | "transactions" | "audit";

export default function DeleteFees() {
    const [activeTab, setActiveTab] = useState<Tab>("invoices");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
    
    // Modal states
    const [actionModal, setActionModal] = useState<{
        type: 'void' | 'waive' | 'delete' | 'void-bulk' | 'waive-bulk' | 'void-payment' | 'delete-payment';
        id?: string;
        invoiceNo?: string;
        amount?: number;
    } | null>(null);

    const [reason, setReason] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const queryClient = useQueryClient();

    // Fetch Invoices
    const { data: invoiceRes, isLoading: loadingInvoices, refetch: refetchInvoices } = useQuery({
        queryKey: ["delete_fees_invoices", searchQuery],
        queryFn: async () => {
            const r = await api.get(`/schools/default/invoices?limit=100`);
            return r.data;
        }
    });
    const invoices = invoiceRes?.data || [];

    // Fetch Payments/Transactions
    const { data: paymentRes, isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
        queryKey: ["delete_fees_payments"],
        queryFn: async () => {
            const r = await api.get(`/schools/default/payments?limit=100`);
            return r.data;
        }
    });
    const payments = paymentRes?.data || [];

    // Fetch Audit Log
    const { data: auditRes, isLoading: loadingAudit, refetch: refetchAudit } = useQuery({
        queryKey: ["fees_audit_log"],
        queryFn: async () => {
            const r = await api.get(`/schools/default/fees/audit-log?limit=100`);
            return r.data;
        }
    });
    const auditLogs = auditRes?.data || [];

    const handleActionSubmit = async () => {
        if (!actionModal) return;
        if (!reason) {
            toast.error("Reason is required");
            return;
        }
        if ((actionModal.type === 'delete' || actionModal.type === 'delete-payment') && !password) {
            toast.error("Password is required for hard deletes");
            return;
        }

        setIsSubmitting(true);
        try {
            if (actionModal.type === 'void') {
                await api.patch(`/schools/default/invoices/${actionModal.id}/void`, { reason });
                toast.success("Invoice voided successfully");
            } else if (actionModal.type === 'waive') {
                await api.patch(`/schools/default/invoices/${actionModal.id}/waive`, { reason });
                toast.success("Invoice balance waived successfully");
            } else if (actionModal.type === 'delete') {
                await api.delete(`/schools/default/invoices/${actionModal.id}`, { data: { reason, password } });
                toast.success("Invoice deleted and payments reversed");
            } else if (actionModal.type === 'void-bulk') {
                await api.post(`/schools/default/invoices/bulk-void`, { invoice_ids: selectedInvoices, reason });
                toast.success("Bulk invoices voided successfully");
                setSelectedInvoices([]);
            } else if (actionModal.type === 'waive-bulk') {
                await api.post(`/schools/default/invoices/bulk-waive`, { invoice_ids: selectedInvoices, reason });
                toast.success("Bulk invoices waived successfully");
                setSelectedInvoices([]);
            } else if (actionModal.type === 'void-payment') {
                await api.patch(`/schools/default/payments/${actionModal.id}/void`, { reason });
                toast.success("Payment transaction voided successfully");
            } else if (actionModal.type === 'delete-payment') {
                await api.delete(`/schools/default/payments/${actionModal.id}`, { data: { reason, password } });
                toast.success("Payment transaction deleted successfully");
            }

            // Reset and refresh
            setActionModal(null);
            setReason("");
            setPassword("");
            queryClient.invalidateQueries({ queryKey: ["delete_fees_invoices"] });
            queryClient.invalidateQueries({ queryKey: ["delete_fees_payments"] });
            queryClient.invalidateQueries({ queryKey: ["fees_audit_log"] });
            refetchInvoices();
            refetchPayments();
            refetchAudit();
        } catch (err: any) {
            const errorMsg = err.response?.data?.errors?.[0]?.message || "Action execution failed";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectInvoice = (id: string) => {
        setSelectedInvoices(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const filteredInvoices = invoices.filter((inv: any) => 
        inv.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.admission_no?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <FeesPage title="Delete & Void" subtitle="Void or waive invoices and reverse payments. Every action is recorded in the audit log." icon={Trash2PageIcon} actions={<>
<span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-xs font-bold"><ShieldAlert className="w-3.5 h-3.5" /> Admin only</span>
            </>}>

            <div>

                {/* Dashboard Tabs */}
                <div className="flex gap-4 border-b border-slate-200 mb-8">
                    {[
                        { id: "invoices", label: "Invoice Controls", icon: Trash2 },
                        { id: "transactions", label: "Payment Ledger", icon: Ban },
                        { id: "audit", label: "Audit Ledger", icon: ClipboardList }
                    ].map((tab) => {
                        const Icon = tab.icon as any;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`flex items-center gap-3 px-6 py-3 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${
                                    active 
                                    ? "border-[#5C67F2] text-[#5C67F2]" 
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Main Views */}
                {activeTab === "invoices" && (
                    <div className="space-y-6">
                        {/* Search and Filters */}
                        <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="relative max-w-md w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Invoice No, Student, Adm No..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold"
                                />
                            </div>
                            
                            {/* Bulk Actions */}
                            {selectedInvoices.length > 0 && (
                                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-2xl animate-in zoom-in-95 duration-200">
                                    <span className="text-xs font-black text-[#5C67F2] uppercase tracking-widest">{selectedInvoices.length} selected</span>
                                    <button 
                                        onClick={() => setActionModal({ type: 'void-bulk' })}
                                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                                    >
                                        Bulk Void
                                    </button>
                                    <button 
                                        onClick={() => setActionModal({ type: 'waive-bulk' })}
                                        className="px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                                    >
                                        Bulk Waive
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Invoices List */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                            <th className="py-4 px-6 w-12 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedInvoices(filteredInvoices.map((i: any) => i._id));
                                                        } else {
                                                            setSelectedInvoices([]);
                                                        }
                                                    }}
                                                    checked={selectedInvoices.length > 0 && selectedInvoices.length === filteredInvoices.length}
                                                    className="rounded border-slate-300 text-[#5C67F2] focus:ring-[#5C67F2]"
                                                />
                                            </th>
                                            <th className="py-4 px-6">Invoice Details</th>
                                            <th className="py-4 px-6">Student Info</th>
                                            <th className="py-4 px-6 text-right">Totals (KSh)</th>
                                            <th className="py-4 px-6 text-center">Status</th>
                                            <th className="py-4 px-6 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                        {filteredInvoices.map((inv: any) => (
                                            <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6 text-center">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedInvoices.includes(inv._id)}
                                                        onChange={() => handleSelectInvoice(inv._id)}
                                                        disabled={inv.status === 'VOIDED' || inv.status === 'PAID'}
                                                        className="rounded border-slate-300 text-[#5C67F2] focus:ring-[#5C67F2] disabled:opacity-30"
                                                    />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <p className="font-black text-slate-800 text-sm uppercase">{inv.invoice_no}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Due: {inv.due_date} · {inv.semester_id}</p>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <p className="font-bold text-slate-800 uppercase">{inv.student_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-0.5">{inv.admission_no} · {inv.studentClass || 'N/A'}</p>
                                                </td>
                                                <td className="py-4 px-6 text-right font-black">
                                                    <p className="text-slate-800">Due: {inv.total_due.toLocaleString()}</p>
                                                    <p className="text-emerald-500 text-[10px] font-bold">Paid: {inv.amount_paid.toLocaleString()}</p>
                                                    {inv.balance > 0 && <p className="text-red-500 text-[10px] font-bold">Bal: {inv.balance.toLocaleString()}</p>}
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                                                        inv.status === 'VOIDED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                        inv.status === 'WAIVED' ? 'bg-teal-100 text-teal-600 border-teal-200' :
                                                        inv.status === 'OVERDUE' ? 'bg-rose-100 text-rose-600 border-rose-200' :
                                                        'bg-amber-100 text-amber-600 border-amber-200'
                                                    }`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setActionModal({ type: 'void', id: inv._id, invoiceNo: inv.invoice_no, amount: inv.balance })}
                                                            disabled={inv.status === 'VOIDED' || inv.status === 'PAID'}
                                                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                            title="Void Invoice"
                                                        >
                                                            Void
                                                        </button>
                                                        <button
                                                            onClick={() => setActionModal({ type: 'waive', id: inv._id, invoiceNo: inv.invoice_no, amount: inv.balance })}
                                                            disabled={inv.status === 'VOIDED' || inv.status === 'PAID' || inv.status === 'WAIVED'}
                                                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 disabled:opacity-40 text-teal-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                            title="Waive Balance"
                                                        >
                                                            Waive
                                                        </button>
                                                        <button
                                                            onClick={() => setActionModal({ type: 'delete', id: inv._id, invoiceNo: inv.invoice_no, amount: inv.total_due })}
                                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                            title="Hard Delete"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {filteredInvoices.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                                    {loadingInvoices ? "Loading system records..." : "No matching invoices found"}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "transactions" && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-6">Receipt No</th>
                                        <th className="py-4 px-6">Student Info</th>
                                        <th className="py-4 px-6 text-right">Amount (KSh)</th>
                                        <th className="py-4 px-6 text-center">Payment Method</th>
                                        <th className="py-4 px-6 text-center">Status</th>
                                        <th className="py-4 px-6 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                    {payments.map((pay: any) => (
                                        <tr key={pay._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <p className="font-black text-slate-800 text-sm uppercase">{pay.receipt_no}</p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Date: {pay.payment_date} · Ref: {pay.reference || 'N/A'}</p>
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="font-bold text-slate-800 uppercase">{pay.student_name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-0.5">{pay.admission_no} · {pay.class_name}</p>
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm text-slate-800">
                                                KSh {pay.amount.toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase">{pay.method}</span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                    pay.is_voided 
                                                    ? 'bg-rose-100 text-rose-600 border-rose-200' 
                                                    : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                                                }`}>
                                                    {pay.is_voided ? 'VOIDED' : 'ACTIVE'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setActionModal({ type: 'void-payment', id: pay._id, invoiceNo: pay.receipt_no, amount: pay.amount })}
                                                        disabled={pay.is_voided}
                                                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Void
                                                    </button>
                                                    <button
                                                        onClick={() => setActionModal({ type: 'delete-payment', id: pay._id, invoiceNo: pay.receipt_no, amount: pay.amount })}
                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {payments.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                                {loadingPayments ? "Loading ledger..." : "No payment records found"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "audit" && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-6">Timestamp</th>
                                        <th className="py-4 px-6">Action Type</th>
                                        <th className="py-4 px-6">Invoice/Receipt</th>
                                        <th className="py-4 px-6">Student Info</th>
                                        <th className="py-4 px-6 text-right">Amount (KSh)</th>
                                        <th className="py-4 px-6">Reason / Log Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                    {auditLogs.map((log: any) => (
                                        <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 font-medium text-slate-500">
                                                {new Date(log.performed_at).toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                                                    log.action.includes('DELETE') ? 'bg-red-100 text-red-600 border-red-200' :
                                                    log.action.includes('VOID') ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                                    'bg-teal-100 text-teal-600 border-teal-200'
                                                }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 font-black uppercase text-slate-800">
                                                {log.invoice_no || 'N/A'}
                                            </td>
                                            <td className="py-4 px-6 font-bold uppercase text-slate-700">
                                                {log.student_name}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-slate-800">
                                                KSh {log.amount.toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6 text-slate-600 italic">
                                                {log.reason || 'No description provided'}
                                            </td>
                                        </tr>
                                    ))}

                                    {auditLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                                {loadingAudit ? "Loading audit trail..." : "No reverse operations logged"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Modals */}
            {actionModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-md w-full rounded-2xl border border-slate-100 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
                        {/* Overlay Header */}
                        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                    actionModal.type.includes('delete') ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                                }`}>
                                    <AlertTriangle className="w-6 h-6 animate-bounce" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                        {actionModal.type === 'void' && 'Void Invoice'}
                                        {actionModal.type === 'waive' && 'Waive Fees'}
                                        {actionModal.type === 'delete' && 'DELETE INVOICE'}
                                        {actionModal.type === 'void-bulk' && 'Bulk Void Invoices'}
                                        {actionModal.type === 'waive-bulk' && 'Bulk Waive Invoices'}
                                        {actionModal.type === 'void-payment' && 'Void Payment Transaction'}
                                        {actionModal.type === 'delete-payment' && 'DELETE PAYMENT'}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wide">
                                        Ref: {actionModal.invoiceNo || 'Multiple'} · Amount: KSh {actionModal.amount?.toLocaleString() || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                                {actionModal.type.includes('delete') 
                                    ? <><AlertTriangle className="w-3.5 h-3.5 inline-block align-[-2px] mr-1 text-rose-500" />WARNING: This will permanently purge the record from the database. Linked payments will be deleted. This is irreversible.</>
                                    : "This action will reverse/void ledger computations. The action is logged to the audit system."}
                            </p>

                            <div className="space-y-4">
                                {/* Reason Input */}
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Provide Reason*</div>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={3}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold transition-all"
                                        placeholder="Reason for this operation..."
                                    />
                                </div>

                                {/* Password Input for hard delete */}
                                {actionModal.type.includes('delete') && (
                                    <div className="relative group">
                                        <div className="absolute -top-3 left-4 bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Admin Password Confirmation*</div>
                                        <div className="relative">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold transition-all"
                                                placeholder="Enter admin password to confirm..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-end gap-3 mt-8">
                                <button
                                    onClick={() => {
                                        setActionModal(null);
                                        setReason("");
                                        setPassword("");
                                    }}
                                    className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleActionSubmit}
                                    disabled={isSubmitting || !reason}
                                    className={`px-6 py-2.5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-2 ${
                                        actionModal.type.includes('delete') 
                                        ? 'bg-red-500 hover:bg-red-600 shadow-red-100' 
                                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-100'
                                    }`}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Confirm Action
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </FeesPage>
    );
}
