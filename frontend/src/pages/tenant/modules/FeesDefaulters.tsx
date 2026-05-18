import { useState } from "react";
import { 
    Home, Search, Calendar, User, ArrowRight, 
    Printer, Loader2, Check, FileText, Receipt,
    History, Filter, Bell, ArrowRightLeft, Eye,
    Phone, Mail, MessageSquare, Building2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function FeesDefaulters() {
    const [feeMonth, setFeeMonth] = useState("May 2026");

    const { data: defaulters = [], isLoading } = useQuery({
        queryKey: ["defaulters", feeMonth],
        queryFn: async () => {
            const r = await api.get(`/invoices?month=${feeMonth}&status=Unpaid`);
            return r.data;
        }
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Fees</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Fees Defaulters</span>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 pt-10">
                
                {/* Header Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="relative group min-w-[280px]">
                        <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase group-focus-within:scale-110 transition-transform">Fees Month*</div>
                        <div className="relative">
                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                type="text" 
                                value={feeMonth}
                                onChange={(e) => setFeeMonth(e.target.value)}
                                className="w-full h-14 pl-14 pr-6 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-black text-sm shadow-sm transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <button className="h-14 px-8 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 text-[10px] font-black text-[#5C67F2] uppercase tracking-widest hover:shadow-lg transition-all">
                            <Eye className="w-4 h-4" /> See Details
                        </button>
                        <button className="h-14 px-8 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:shadow-lg transition-all">
                            <Bell className="w-4 h-4" /> Send Reminder
                        </button>
                        <button className="h-14 px-8 bg-[#5C67F2] text-white rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-indigo-100 transition-all shadow-lg">
                            <ArrowRightLeft className="w-4 h-4" /> Carry Forward Balance
                        </button>
                    </div>
                </div>

                {/* Defaulters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {defaulters.map((d: any) => (
                        <div key={d._id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="p-8 text-center">
                                <div className="relative inline-block mb-6">
                                    <div className="w-24 h-24 rounded-[2rem] bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-2xl font-black text-slate-300">
                                        {/* Placeholder for student photo */}
                                        <User className="w-10 h-10" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                </div>
                                
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{d.studentId || 'S17046124'}</p>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{d.studentName || 'Muzamil mohamed'}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">4 West</p>

                                <div className="mt-8 flex items-center justify-center gap-3">
                                    <button className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5C67F2] flex items-center justify-center hover:bg-[#5C67F2] hover:text-white transition-all shadow-sm">
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                    <button className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                        <MessageSquare className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50/50 p-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</p>
                                    <p className="text-xs font-black text-rose-600 uppercase">KES {d.total?.toLocaleString()}</p>
                                </div>
                                <button className="px-5 py-2 bg-white border border-slate-100 rounded-xl text-[9px] font-black text-[#5C67F2] uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
                                    Submit
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {defaulters.length === 0 && !isLoading && (
                        <div className="col-span-full py-20 text-center bg-emerald-50/50 rounded-[3rem] border border-dashed border-emerald-200">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-4 shadow-sm">
                                <Check className="w-8 h-8" />
                            </div>
                            <p className="text-emerald-700 font-black uppercase text-xs tracking-widest">No defaulters found for this month!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AlertCircle({ className }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
}
