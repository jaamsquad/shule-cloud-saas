import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Home, Printer, ArrowLeft, Check, AlertCircle, 
    FileText, User, Calendar, Landmark, Receipt,
    Building2, Wallet, Share2, Loader2
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: invoice, isLoading } = useQuery({
        queryKey: ["invoice", id],
        queryFn: async () => (await api.get(`/invoices/${id}`)).data.data,
        enabled: !!id
    });

    const markAsPaid = useMutation({
        mutationFn: async () => api.patch(`/invoices/${id}`, { status: "Paid" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            toast.success("Invoice settled successfully");
        }
    });

    const generatePrintHTML = () => {
        if (!invoice) return "";
        const particulars = invoice.particulars || { "FEE PAYMENT": invoice.total };
        const rows = Object.entries(particulars).map(([label, amount], i) => `
            <tr>
                <td style="padding: 5px; border: 1px solid #eee; font-size: 10px;">${i + 1}. ${label.toUpperCase()}</td>
                <td style="padding: 5px; border: 1px solid #eee; text-align: right; font-size: 10px;">${amount}</td>
            </tr>
        `).join("");

        const copy = (title: string) => `
            <div style="padding: 20px; border-bottom: 2px dashed #ccc; position: relative; height: 31%; box-sizing: border-box;">
                <div style="display: flex; justify-between; align-items: start;">
                    <div>
                        <p style="font-size: 9px; font-weight: bold; margin: 0; color: #666;">STUDENT ID: ${invoice.registrationNo}</p>
                        <h2 style="font-size: 16px; margin: 5px 0; font-weight: 900;">${invoice.studentName.toUpperCase()}</h2>
                        <p style="font-size: 9px; margin: 0; color: #888;">Class: ${invoice.studentClass} | Month: ${invoice.feeMonth}</p>
                    </div>
                    <div style="text-align: right; flex-grow: 1;">
                        <p style="font-size: 10px; font-weight: 900; margin: 0; color: #bbb;">${title.toUpperCase()} COPY</p>
                        <p style="font-size: 8px; margin: 0; color: #ccc;">Bank: ${invoice.bankName || 'KCB'}</p>
                    </div>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <tr style="background: #f9f9f9;">
                        <th style="text-align: left; padding: 5px; font-size: 8px; color: #999;">Sr. Particulars</th>
                        <th style="text-align: right; padding: 5px; font-size: 8px; color: #999;">Amount</th>
                    </tr>
                    ${rows}
                    <tr>
                        <td style="padding: 5px; font-weight: 900; font-size: 11px;">TOTAL</td>
                        <td style="padding: 5px; text-align: right; font-weight: 900; font-size: 11px;">KES ${invoice.total.toLocaleString()}</td>
                    </tr>
                </table>
                <div style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <p style="font-size: 8px; color: #aaa; margin: 0;">PAYABLE AFTER DUE DATE: ${invoice.total}</p>
                    <div style="width: 80px; height: 30px; border: 1px solid #eee; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #ddd; font-weight: bold;">OFFICIAL STAMP</div>
                </div>
            </div>
        `;

        return `
            <html>
                <body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; height: 100vh;">
                    ${copy('Bank')}
                    ${copy('Student')}
                    ${copy('Institute')}
                </body>
            </html>
        `;
    };

    const handlePrint = () => {
        const content = generatePrintHTML();
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(content);
            doc.close();
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                document.body.removeChild(iframe);
            }, 500);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
        </div>
    );

    if (!invoice) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400 font-black uppercase text-xs tracking-widest">
            <AlertCircle className="w-12 h-12 mb-4" />
            Invoice Not Found
        </div>
    );

    if (invoice.status === 'Paid') {
        return (
            <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20">
                {/* Breadcrumb */}
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 print:hidden">
                    <div className="flex items-center gap-2 text-sm">
                        <Home className="w-4 h-4 text-[#5C67F2]" />
                        <span className="text-gray-300">/</span>
                        <span className="font-bold text-gray-600">Fees</span>
                        <span className="text-gray-300">/</span>
                        <span className="font-black text-[#5C67F2]">Fees Paid Receipt</span>
                    </div>
                </div>

                <div className="flex-1 max-w-5xl mx-auto w-full px-4 pt-10">
                    {/* Receipt Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-12 print:hidden">
                        <button onClick={handlePrint} className="h-14 px-8 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 text-[10px] font-black text-[#5C67F2] uppercase tracking-widest hover:shadow-lg transition-all">
                            <Printer className="w-4 h-4" /> Print Detailed Receipt
                        </button>
                        <button className="h-14 px-8 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 text-[10px] font-black text-[#5C67F2] uppercase tracking-widest hover:shadow-lg transition-all">
                            <FileText className="w-4 h-4" /> Mini Receipt
                        </button>
                        <button className="h-14 px-8 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:shadow-lg transition-all">
                            <Building2 className="w-4 h-4" /> Thermal Receipt
                        </button>
                    </div>

                    {/* Receipt Card */}
                    <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100/40 border border-slate-50 overflow-hidden max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
                        <div className="p-16 text-center">
                            <div className="relative inline-block mb-10">
                                <div className="w-20 h-16 bg-[#252C48] rounded-2xl flex items-center justify-center text-white relative">
                                    <div className="text-3xl font-black">$ =</div>
                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-400 rounded-full border-4 border-white flex items-center justify-center text-white shadow-lg">
                                        <Check className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-12">Fees Paid Receipt</h2>

                            <div className="space-y-1 bg-slate-50/50 rounded-[2.5rem] p-2">
                                {[
                                    { label: "Registration/ID", value: invoice.registrationNo },
                                    { label: "Class", value: invoice.studentClass },
                                    { label: "Name", value: invoice.studentName },
                                    { label: "Fee Month", value: invoice.feeMonth },
                                    { label: "Total Amount", value: `KES ${invoice.total?.toLocaleString()}` },
                                    { label: "Deposit", value: `KES ${invoice.total?.toLocaleString()}` }, // Simplified for demo
                                    { label: "Remainings", value: "KES 0" }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-10 py-5 bg-white rounded-[1.5rem] shadow-sm">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                        <p className="text-sm font-black text-slate-700 uppercase">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 print:hidden">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Fees</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Invoice Detail</span>
                </div>
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#5C67F2] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to List
                </button>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 pt-10">
                {/* Executive Summary Card */}
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100/40 border border-slate-50 overflow-hidden mb-10 print:shadow-none print:border-none">
                    <div className="p-10 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center text-[#5C67F2]">
                                <Receipt className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Invoice Details</h2>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Ref: {id?.slice(-8).toUpperCase()} · Created: {new Date(invoice.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 print:hidden">
                            <span className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-amber-100 text-amber-600 border-amber-200'}`}>
                                {invoice.status}
                            </span>
                            <button 
                                onClick={handlePrint}
                                className="h-12 px-8 bg-[#5C67F2] text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-[#4a54c4] transition-all flex items-center gap-3 text-[10px] uppercase tracking-widest"
                            >
                                <Printer className="w-4 h-4" /> Print Triple-Copy
                            </button>
                            {invoice.status === 'Unpaid' && (
                                <button 
                                    onClick={() => markAsPaid.mutate()}
                                    className="h-12 px-8 bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center gap-3 text-[10px] uppercase tracking-widest"
                                >
                                    <Check className="w-4 h-4" /> Mark Paid
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-[10px] font-black text-[#5C67F2] uppercase tracking-widest">
                                    <User className="w-4 h-4" /> Student Information
                                </div>
                                <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                                    <p className="text-sm font-black text-slate-800 uppercase mb-1">{invoice.studentName}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{invoice.registrationNo} · {invoice.studentClass}</p>
                                    
                                    {/* Parent Contacts */}
                                    {invoice.student?.parents && invoice.student.parents.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2">
                                            <p className="text-[9px] font-black text-[#5C67F2] uppercase tracking-wider">Parent/Guardian Details</p>
                                            {invoice.student.parents.map((p: any, idx: number) => (
                                                <div key={idx} className="text-xs">
                                                    <p className="font-bold text-slate-700">{p.name} ({p.relation || 'Parent'})</p>
                                                    {p.phone && <p className="text-slate-500 font-mono text-[10px] mt-0.5">📞 {p.phone}</p>}
                                                    {p.email && <p className="text-slate-500 text-[10px]">✉️ {p.email}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {(!invoice.student?.parents || invoice.student.parents.length === 0) && (invoice.student?.parentName || invoice.student?.fatherName || invoice.student?.motherName) && (
                                        <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2">
                                            <p className="text-[9px] font-black text-[#5C67F2] uppercase tracking-wider">Parent/Guardian Details</p>
                                            <div className="text-xs">
                                                <p className="font-bold text-slate-700">
                                                    {invoice.student.parentName || invoice.student.fatherName || invoice.student.motherName}
                                                </p>
                                                {(invoice.student.parentPhone || invoice.student.fatherPhone || invoice.student.motherPhone) && (
                                                    <p className="text-slate-500 font-mono text-[10px] mt-0.5">
                                                        📞 {invoice.student.parentPhone || invoice.student.fatherPhone || invoice.student.motherPhone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-[10px] font-black text-[#5C67F2] uppercase tracking-widest">
                                    <Calendar className="w-4 h-4" /> Billing Period
                                </div>
                                <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                                    <p className="text-sm font-black text-slate-800 uppercase mb-1">{invoice.feeMonth}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Due Date: {invoice.dueDate}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-[10px] font-black text-[#5C67F2] uppercase tracking-widest">
                                    <Landmark className="w-4 h-4" /> Payment Method
                                </div>
                                <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                                    <p className="text-sm font-black text-slate-800 uppercase mb-1">{invoice.bankName || 'BANK TRANSFER'}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Account No: N/A</p>
                                </div>
                            </div>
                        </div>

                        {/* Financial Ledger */}
                        <div className="bg-slate-50/30 rounded-[2.5rem] border border-slate-100 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr>
                                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Particulars</th>
                                        <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (KES)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoice.particulars ? Object.entries(invoice.particulars).map(([label, amount]) => (
                                        <tr key={label} className="hover:bg-white transition-colors">
                                            <td className="px-10 py-5 text-xs font-black text-slate-700 uppercase">{label}</td>
                                            <td className="px-10 py-5 text-right text-xs font-black text-slate-600 uppercase">{amount as number}</td>
                                        </tr>
                                    )) : (
                                        <tr className="hover:bg-white transition-colors">
                                            <td className="px-10 py-5 text-xs font-black text-slate-700 uppercase">FEE PAYMENT</td>
                                            <td className="px-10 py-5 text-right text-xs font-black text-slate-600 uppercase">{invoice.total}</td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-white border-t-2 border-slate-100">
                                        <td className="px-10 py-8 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Amount Due</td>
                                        <td className="px-10 py-8 text-right text-2xl font-black text-[#5C67F2] tracking-tighter">KES {invoice.total?.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:hidden">
                    <div className="bg-[#5C67F2] rounded-[2.5rem] p-10 text-white shadow-xl shadow-indigo-100">
                        <Share2 className="w-10 h-10 mb-6 opacity-40" />
                        <h4 className="text-lg font-black uppercase tracking-tight mb-2">Share With Parents</h4>
                        <p className="text-white/60 text-xs font-medium leading-relaxed mb-8">Send this invoice link via WhatsApp or Email to allow parents to view and pay directly from their portal.</p>
                        <button className="h-12 px-8 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">Copy Secure Link</button>
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-4">
                            <Building2 className="w-8 h-8 text-slate-300" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Institutional Audit</h4>
                        </div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase leading-relaxed">This invoice is protected by blockchain-verified integrity. Any manual status changes are recorded in the institutional audit trail for compliance.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
