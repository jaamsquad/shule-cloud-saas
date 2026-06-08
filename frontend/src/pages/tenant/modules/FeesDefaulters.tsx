import { useState } from "react";
import { 
    Home, Search, Calendar, User, ArrowRight, 
    Printer, Loader2, Check, FileText, Filter, 
    Bell, AlertTriangle, ShieldAlert, Sparkles, MessageSquare
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function FeesDefaulters() {
    const [minDaysOverdue, setMinDaysOverdue] = useState("0");
    const [minBalance, setMinBalance] = useState("0");
    const [classFilter, setClassFilter] = useState("ALL");
    const [smsTemplate, setSmsTemplate] = useState("Dear Parent, student {name} has a fee balance of KSh {amount}. Please clear promptly.");
    const [isSendingSMS, setIsSendingSMS] = useState(false);

    const queryClient = useQueryClient();

    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/academics/classes")).data || [] });

    // Fetch defaulters data
    const { data: defaultersRes, isLoading, refetch } = useQuery({
        queryKey: ["fees_defaulters", minDaysOverdue, minBalance, classFilter],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            if (minDaysOverdue !== "0") queryParams.append("min_days_overdue", minDaysOverdue);
            if (minBalance !== "0") queryParams.append("min_balance", minBalance);
            if (classFilter !== "ALL") queryParams.append("class_ids", classFilter);

            const r = await api.get(`/schools/default/fees/defaulters?${queryParams.toString()}`);
            return r.data;
        }
    });

    const summary = defaultersRes?.data?.summary || { total_defaulters: 0, total_outstanding: 0, most_overdue: null, classes_full_collection: 0 };
    const list = defaultersRes?.data?.defaulters || [];

    const handleSendBulkSMS = async () => {
        if (list.length === 0) {
            toast.error("No defaulters selected");
            return;
        }
        setIsSendingSMS(true);
        try {
            const invoice_ids = list.map((d: any) => d.student_id); // using student_id as mock trigger
            await api.post(`/schools/default/fees/defaulters/sms`, { invoice_ids, template: smsTemplate });
            toast.success(`Bulk SMS reminder sent successfully to ${list.length} parents`);
        } catch {
            toast.error("Failed to send reminders");
        } finally {
            setIsSendingSMS(false);
        }
    };

    const handleExportDefaulters = () => {
        toast.info("Preparing landscape report download...");
        window.open("/api/v1/schools/default/fees/defaulters/export", "_blank");
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Fees</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Defaulters Module</span>
                </div>
                <button
                    onClick={handleExportDefaulters}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
                >
                    <Printer className="w-3.5 h-3.5" />
                    Landscape PDF Report
                </button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10">
                
                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        Overdue & Defaulter Ledger
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Live tracking of fee balances, aging accounts, and parent reminder broadcasts</p>
                </div>

                {/* Dashboard Widgets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Defaulters</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-2">{summary.total_defaulters} Students</h3>
                        <p className="text-xs text-slate-500 mt-1">Active aging accounts</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-2">KSh {summary.total_outstanding.toLocaleString()}</h3>
                        <p className="text-xs text-slate-500 mt-1">Sum of unpaid/partial invoices</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Most Overdue</p>
                        <h3 className="text-lg font-bold text-slate-800 mt-2 truncate">
                            {summary.most_overdue ? `${summary.most_overdue.student_name}` : 'None'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {summary.most_overdue ? `Overdue by ${summary.most_overdue.days_overdue} Days` : 'All caught up'}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfect Collection Classes</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-2">{summary.classes_full_collection} Classes</h3>
                        <p className="text-xs text-slate-500 mt-1">100% clearing rate</p>
                    </div>
                </div>

                {/* Filter and Broadcast controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    
                    {/* Advanced Filtering */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2 space-y-6">
                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            Filter Defaulters <Filter className="w-4 h-4 text-slate-500" />
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Min Overdue Days */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Min Days Overdue</div>
                                <select 
                                    value={minDaysOverdue}
                                    onChange={(e) => setMinDaysOverdue(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                                >
                                    <option value="0">All Invoices</option>
                                    <option value="7">7+ Days</option>
                                    <option value="15">15+ Days</option>
                                    <option value="30">30+ Days</option>
                                    <option value="60">60+ Days</option>
                                </select>
                            </div>

                            {/* Min Balance threshold */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Min Balance</div>
                                <select
                                    value={minBalance}
                                    onChange={(e) => setMinBalance(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                                >
                                    <option value="0">Show All Balances</option>
                                    <option value="5000">KSh 5,000+</option>
                                    <option value="10000">KSh 10,000+</option>
                                    <option value="20000">KSh 20,000+</option>
                                    <option value="50000">KSh 50,000+</option>
                                </select>
                            </div>

                            {/* Class Filter */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Filter Class</div>
                                <select
                                    value={classFilter}
                                    onChange={(e) => setClassFilter(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                                >
                                    <option value="ALL">All Classes</option>
                                    {classes.map((cls: any) => (
                                        <option key={cls._id} value={cls._id}>{cls.name || cls.levelName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SMS Reminder broadcast block */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            Bulk SMS Reminder <Bell className="w-4 h-4 text-slate-500" />
                        </h3>
                        <textarea
                            value={smsTemplate}
                            onChange={(e) => setSmsTemplate(e.target.value)}
                            rows={3}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-sm text-slate-700"
                            placeholder="Type template reminder..."
                        />
                        <button
                            onClick={handleSendBulkSMS}
                            disabled={isSendingSMS || list.length === 0}
                            className="w-full h-10 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {isSendingSMS ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                            Send Reminders ({list.length})
                        </button>
                    </div>
                </div>

                {/* Defaulters Table list */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                    <h3 className="text-base font-semibold text-slate-800 mb-6">List of Delinquent Accounts</h3>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                                    <th className="py-4 px-6">Student Info</th>
                                    <th className="py-4 px-6 text-right">Invoiced (KSh)</th>
                                    <th className="py-4 px-6 text-right">Paid (KSh)</th>
                                    <th className="py-4 px-6 text-right">Outstanding (KSh)</th>
                                    <th className="py-4 px-6 text-center">Days Overdue</th>
                                    <th className="py-4 px-6 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                {list.map((d: any) => (
                                    <tr key={d.student_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <p className="font-medium text-slate-800">{d.student_name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{d.admission_no} · {d.class_name}</p>
                                        </td>
                                        <td className="py-4 px-6 text-right font-medium text-slate-800">
                                            KSh {d.total_invoiced.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-right font-medium text-slate-800">
                                            KSh {d.total_paid.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-right font-semibold text-slate-800">
                                            KSh {d.outstanding.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-center font-medium text-slate-800">
                                            {d.days_overdue} Days
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                {d.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {list.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-20 text-slate-500 font-medium text-sm">
                                            {isLoading ? "Loading ledger..." : "No defaulters found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
