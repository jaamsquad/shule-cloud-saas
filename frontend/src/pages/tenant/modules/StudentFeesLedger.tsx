import { useState } from "react";
import { 
    Home, Search, User, CreditCard, Calendar, Check, 
    Loader2, Sparkles, X, FileText, Banknote, History,
    Edit, Trash2, Plus, Save
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { FeesPage } from "@/components/fees/FeesUI";
import { BookOpen as BookOpenPageIcon } from "lucide-react";

export default function StudentFeesLedger() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"invoices" | "payments">("invoices");
    const [editingInvoice, setEditingInvoice] = useState<any>(null);

    const { data: feeParticularsArray } = useQuery({
        queryKey: ["all_fee_particulars"],
        queryFn: async () => {
            const r = await api.get('/fee_particulars');
            if (Array.isArray(r.data)) {
                return r.data.flatMap((c: any) => c.particulars || []);
            }
            return r.data?.particulars || [];
        }
    });

    // Fetch fee structures for creating invoices
    const { data: feeStructures = [] } = useQuery({
        queryKey: ["fee_structures"],
        queryFn: async () => {
            const res = await api.get('/fee_structures');
            return res.data?.data || [];
        },
        enabled: !!selectedStudent
    });

    const [selectedFeeStructure, setSelectedFeeStructure] = useState<string>('');

    const uniqueParticulars = Array.from(new Map(feeParticularsArray?.map((p: any) => [p.label, p])).values()) as any[];

    // Invoice item edits are no longer applied straight away — they are sent to the requester's
    // reporting officer (Settings → Staff → reportsTo) to Approve or Decline, and are applied
    // by the server automatically once approved (see requests.routes.ts / applyInvoiceItemsUpdate).
    const updateInvoiceMutation = useMutation({
        mutationFn: async (payload: { id: string, line_items: any[], fee_structure_id?: string, invoiceNo?: string, studentName?: string }) => {
            return api.post("/requests", {
                category: "Fee Invoice Change",
                title: `Invoice ${payload.invoiceNo || payload.id} items change${payload.studentName ? ` — ${payload.studentName}` : ""}`,
                description: `Requested change to the fee particulars on invoice ${payload.invoiceNo || payload.id}.`,
                payload: { invoiceId: payload.id, line_items: payload.line_items, ...(payload.fee_structure_id ? { fee_structure_id: payload.fee_structure_id } : {}) },
            });
        },
        onSuccess: (r: any) => {
            queryClient.invalidateQueries({ queryKey: ["student_fee_summary"] });
            toast.success(r.data?.currentOwnerName ? `Sent to ${r.data.currentOwnerName} for approval` : "Sent for approval");
            setEditingInvoice(null);
            setSelectedFeeStructure('');
        },
        onError: (err: any) => {
            const backendError = err?.response?.data?.message;
            toast.error(backendError || "Failed to send for approval");
        },
    });

    const handleSaveInvoiceItems = () => {
        if (!editingInvoice) return;
        
        // Validation: Check for duplicates
        const categories = (editingInvoice.line_items || []).map((i: any) => i.category);
        const uniqueCategories = new Set(categories);
        if (categories.length !== uniqueCategories.size) {
            toast.error("Duplicate items are not allowed. Please remove or change duplicate items.");
            return;
        }

        const payload: any = {
            id: editingInvoice._id || editingInvoice.id,
            line_items: editingInvoice.line_items,
            invoiceNo: editingInvoice.invoice_no,
            studentName: selectedStudent?.studentName || selectedStudent?.name,
        };
        // Include fee_structure_id if present on the invoice or selected
        if (editingInvoice.fee_structure_id) {
            payload.fee_structure_id = editingInvoice.fee_structure_id;
        } else if (selectedFeeStructure) {
            payload.fee_structure_id = selectedFeeStructure;
        }
        updateInvoiceMutation.mutate(payload);
    };

    const handleAddItem = () => {
        const selectedCategories = new Set((editingInvoice?.line_items || []).map((i: any) => i.category));
        const availableParticular = uniqueParticulars.find((p: any) => !selectedCategories.has(p.label)) 
            || uniqueParticulars[0] 
            || { label: 'OTHERS', amount: 0 };

        setEditingInvoice({
            ...editingInvoice,
            line_items: [
                ...(editingInvoice.line_items || []), 
                { 
                    category: availableParticular.label, 
                    amount: parseFloat(availableParticular.amount) || 0, 
                    description: '' 
                }
            ]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...editingInvoice.line_items];
        newItems.splice(index, 1);
        setEditingInvoice({ ...editingInvoice, line_items: newItems });
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...editingInvoice.line_items];
        if (field === 'category') {
            const particular = uniqueParticulars.find((p: any) => p.label === value);
            newItems[index] = { 
                ...newItems[index], 
                category: value,
                amount: particular ? (parseFloat(particular.amount) || 0) : 0
            };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setEditingInvoice({ ...editingInvoice, line_items: newItems });
    };

    const handleStartEditing = (inv: any) => {
        const copy = JSON.parse(JSON.stringify(inv));
        if (!copy.line_items || copy.line_items.length === 0) {
            copy.line_items = [
                {
                    category: 'OTHERS',
                    amount: copy.total_due || copy.total || 0,
                    description: 'Legacy Fees Invoice'
                }
            ];
        }
        setEditingInvoice(copy);
    };

    // Search students query
    const { data: students = [], isFetching: isSearching } = useQuery({
        queryKey: ["students_search", searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.length < 2) return [];
            const r = await api.get(`/students?search=${searchQuery}`);
            return r.data;
        },
        enabled: searchQuery.length >= 2 && !selectedStudent
    });

    // Fetch student fee summary (invoices)
    const { data: summaryRes, isLoading: loadingSummary } = useQuery({
        queryKey: ["student_fee_summary", selectedStudent?._id],
        queryFn: async () => {
            if (!selectedStudent) return null;
            const r = await api.get(`/schools/default/students/${selectedStudent._id}/fee-summary`);
            return r.data.data;
        },
        enabled: !!selectedStudent
    });

    const summary = summaryRes || { total_invoiced: 0, total_paid: 0, outstanding: 0, invoices: [] };

    // Fetch student payment history
    const { data: paymentsRes, isLoading: loadingPayments } = useQuery({
        queryKey: ["student_payment_history", selectedStudent?._id],
        queryFn: async () => {
            if (!selectedStudent) return null;
            const r = await api.get(`/schools/default/payments?student_id=${selectedStudent._id}&limit=100`);
            return r.data.data; // Assuming it returns { data: [payments], meta: ... }
        },
        enabled: !!selectedStudent
    });

    const payments = paymentsRes || [];

    const handleSelectStudent = (student: any) => {
        setSelectedStudent(student);
        setSearchQuery(student.studentName || `${student.firstName} ${student.lastName}`);
    };

    const editingSubtotal = (editingInvoice?.line_items || []).reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
    const editingPaid = parseFloat(editingInvoice?.amount_paid) || 0;
    const editingBalance = editingSubtotal - editingPaid;

    return (
        <FeesPage title="Student Ledger" subtitle="Look up a student to see every invoice, payment, discount and running balance." icon={BookOpenPageIcon}>

            <div>

                <div className="flex flex-col gap-6">
                    {/* Top bar: Student Search & Metrics (horizontal) */}
                    <div className="flex flex-col lg:flex-row gap-4 [&>*]:flex-1">
                        {/* Search Input */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">Search Student</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (selectedStudent) {
                                            setSelectedStudent(null);
                                        }
                                    }}
                                    className="w-full h-10 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:bg-white text-sm font-medium text-slate-700 transition-colors"
                                    placeholder="Type name or Adm No..."
                                />
                                {selectedStudent && (
                                    <button 
                                        onClick={() => {
                                            setSelectedStudent(null);
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
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-slate-200 shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                                    {students.map((s: any) => (
                                        <div
                                            key={s._id}
                                            onClick={() => handleSelectStudent(s)}
                                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{s.studentName || `${s.firstName} ${s.lastName}`}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{s.registrationNo || s.studentId} · {s.studentClass || s.currentClass}</p>
                                            </div>
                                            <Check className="w-4 h-4 text-slate-300" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {isSearching && !selectedStudent && (
                                <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                                </div>
                            )}
                        </div>

                        {/* Student Metrics Balance cards */}
                        {selectedStudent && (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-lg">
                                        {selectedStudent.studentName ? selectedStudent.studentName[0] : 'S'}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800">{selectedStudent.studentName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</h4>
                                        <p className="text-xs text-slate-500 mt-1">{selectedStudent.registrationNo || selectedStudent.studentId}</p>
                                    </div>
                                </div>

                                {loadingSummary ? (
                                    <div className="text-center py-6 text-slate-500 text-xs font-medium flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                        Calculating dues...
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <span className="text-xs text-slate-500 font-medium block">Total Invoiced</span>
                                            <p className="text-lg font-bold text-slate-800">KSh {summary.total_invoiced.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <span className="text-xs text-slate-500 font-medium block">Total Paid</span>
                                            <p className="text-lg font-bold text-emerald-600">KSh {summary.total_paid.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <span className="text-xs text-slate-500 font-medium block">Outstanding Balance</span>
                                            <p className="text-lg font-bold text-rose-600">KSh {summary.outstanding.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Middle Panel: Ledger Views */}
                    <div className="w-full space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            
                            {/* Tabs */}
                            <div className="flex items-center border-b border-slate-200 bg-slate-50/50">
                                <button
                                    onClick={() => setActiveTab("invoices")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                                        activeTab === "invoices" 
                                        ? "text-slate-800 border-b-2 border-slate-800 bg-white" 
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <FileText className="w-4 h-4" /> All Invoices
                                </button>
                                <button
                                    onClick={() => setActiveTab("payments")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                                        activeTab === "payments" 
                                        ? "text-slate-800 border-b-2 border-slate-800 bg-white" 
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <History className="w-4 h-4" /> Payment History
                                </button>
                            </div>

                            <div className="p-6 flex-1">
                                {!selectedStudent ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                                        <User className="w-12 h-12 mb-4 text-slate-300" />
                                        <p className="text-sm font-medium">Search and select a student</p>
                                        <p className="text-xs mt-1">To view their full ledger and history</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* INVOICES TAB */}
                                        {activeTab === "invoices" && (
                                            <div className="space-y-4">
                                                {loadingSummary ? (
                                                    <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {summary.invoices?.length > 0 ? summary.invoices.map((inv: any) => (
                                                            <div
                                                                key={inv.id || inv._id}
                                                                className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                                            >
                                                                <div>
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <span className="font-semibold text-slate-800">{inv.invoice_no}{(inv.term || inv.period || inv.feeMonth) ? ` - ${inv.term || inv.period || inv.feeMonth}` : ""}</span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                            inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                                                            inv.status === 'UNPAID' ? 'bg-amber-100 text-amber-700' :
                                                                            inv.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' :
                                                                            'bg-slate-100 text-slate-600'
                                                                        }`}>
                                                                            {inv.status}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs text-slate-500">Due: {inv.due_date || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-6 sm:text-right">
                                                                    <div>
                                                                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Total</span>
                                                                        <span className="text-sm font-medium text-slate-700">KSh {inv.total_due.toLocaleString()}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Paid</span>
                                                                        <span className="text-sm font-medium text-emerald-600">KSh {inv.amount_paid.toLocaleString()}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Balance</span>
                                                                        <span className={`text-sm font-bold ${inv.balance < 0 ? 'text-emerald-500' : 'text-rose-600'}`}>KSh {inv.balance.toLocaleString()}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleStartEditing(inv)}
                                                                        className="ml-2 p-2 text-slate-400 hover:text-[#5C67F2] hover:bg-indigo-50 rounded-lg transition-colors"
                                                                        title="Add/Remove Items"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
                                                                No invoices found for this student.
                                                                <button
                                                                    onClick={() => setEditingInvoice({ line_items: [] })}
                                                                    className="mt-4 px-4 py-2 bg-[#5C67F2] text-white rounded-lg hover:bg-[#4a54c4] block mx-auto"
                                                                >
                                                                    Create Invoice
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* PAYMENTS TAB */}
                                        {activeTab === "payments" && (
                                            <div className="space-y-4">
                                                {loadingPayments ? (
                                                    <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {payments?.length > 0 ? payments.map((pay: any) => (
                                                            <div key={pay._id} className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                                        pay.is_voided ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                                                                    }`}>
                                                                        <Banknote className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-semibold text-slate-800 uppercase">{pay.receipt_no}</span>
                                                                            {pay.is_voided && (
                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                                                                                    VOIDED
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-slate-500">Date: {pay.payment_date} · Method: {pay.method}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="sm:text-right">
                                                                    <span className={`text-lg font-bold ${pay.is_voided ? 'text-rose-500 line-through' : 'text-slate-800'}`}>
                                                                        KSh {pay.amount.toLocaleString()}
                                                                    </span>
                                                                    {pay.reference && <p className="text-xs text-slate-500 mt-1">Ref: {pay.reference}</p>}
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
                                                                No payment history found.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for Editing Invoice Items */}
            {editingInvoice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex items-center justify-between p-5 border-b border-slate-100">
                        <div>
                            <h3 className="font-bold text-slate-800">Add/Remove Items</h3>
                            <p className="text-xs text-slate-500">Invoice: {editingInvoice?.invoice_no || 'New Invoice'} · sent to your reporting officer to approve before it takes effect</p>
                            {/* Fee Structure selector for new invoice */}
                            {!editingInvoice && feeStructures.length > 0 && (
                                <select
                                    value={selectedFeeStructure}
                                    onChange={(e) => setSelectedFeeStructure(e.target.value)}
                                    className="mt-2 w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:border-[#5C67F2]"
                                >
                                    <option value="">Select Fee Structure...</option>
                                    {feeStructures.map((fs: any) => (
                                        <option key={fs._id} value={fs._id}>{fs.name || `Fee Structure ${fs._id}`}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <button onClick={() => { setEditingInvoice(null); setSelectedFeeStructure(''); }} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-5 flex-1 overflow-y-auto bg-slate-50 space-y-4">
                        {editingInvoice?.line_items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex-1">
                                        <select 
                                            value={item.category}
                                            onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                                            className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:border-[#5C67F2]"
                                        >
                                            {uniqueParticulars.map((p: any) => {
                                                const isAlreadySelected = (editingInvoice.line_items || []).some((li: any, liIdx: number) => liIdx !== idx && li.category === p.label);
                                                return (
                                                    <option key={p.label} value={p.label} disabled={isAlreadySelected}>
                                                        {p.label} {isAlreadySelected ? "(already selected)" : ""}
                                                    </option>
                                                );
                                            })}
                                            {uniqueParticulars.length === 0 && <option value={item.category}>{item.category}</option>}
                                            <option 
                                                value="OTHERS" 
                                                disabled={(editingInvoice.line_items || []).some((li: any, liIdx: number) => liIdx !== idx && li.category === "OTHERS")}
                                            >
                                                OTHERS
                                            </option>
                                            <option 
                                                value="ADJUSTMENT" 
                                                disabled={(editingInvoice.line_items || []).some((li: any, liIdx: number) => liIdx !== idx && li.category === "ADJUSTMENT")}
                                            >
                                                ADJUSTMENT
                                            </option>
                                        </select>
                                    </div>
                                    <div className="w-32 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">KSh</span>
                                        <input 
                                            type="number" 
                                            value={item.amount}
                                            onChange={(e) => handleItemChange(idx, 'amount', parseFloat(e.target.value))}
                                            className="w-full text-sm p-2 pl-10 border border-slate-200 rounded-lg outline-none focus:border-[#5C67F2] font-bold text-slate-700"
                                            placeholder="Amount"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveItem(idx)}
                                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            
                            <button 
                                onClick={handleAddItem}
                                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-white hover:text-[#5C67F2] hover:border-[#5C67F2] transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Item
                            </button>

                            {/* Live Balance Summary */}
                            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 text-center mt-6 shadow-inner">
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">New Total</span>
                                    <span className="text-sm font-black text-slate-800">KSh {editingSubtotal.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Paid</span>
                                    <span className="text-sm font-bold text-emerald-600">KSh {editingPaid.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">New Balance</span>
                                    <span className={`text-sm font-black ${editingBalance < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>KSh {editingBalance.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3 mt-4">
                                <Sparkles className="w-5 h-5 text-[#5C67F2] shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-[#5C67F2]">Tip: Negative Amounts</p>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Adding an item with a negative amount will reduce the total balance due. If the balance drops below zero, it will reflect as a student credit/overpayment.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-white">
                            <button onClick={() => setEditingInvoice(null)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                            <button 
                                onClick={handleSaveInvoiceItems}
                                disabled={updateInvoiceMutation.isPending}
                                className="px-5 py-2 text-sm font-bold text-white bg-[#5C67F2] hover:bg-[#4a54c4] rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                            >
                                {updateInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Send for Approval
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FeesPage>
    );
}
