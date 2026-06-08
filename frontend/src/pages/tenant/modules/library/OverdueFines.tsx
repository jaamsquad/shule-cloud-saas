import { Home, AlertTriangle, DollarSign, Check, Loader2, RefreshCw, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function OverdueFines() {
    const qc = useQueryClient();

    const { data: overdue = [], isLoading, refetch } = useQuery({
        queryKey: ["library_overdue"],
        queryFn: async () => {
            const r = await api.get("/library/overdue");
            return Array.isArray(r.data) ? r.data : [];
        },
        refetchInterval: 60000,
    });

    const payFineMut = useMutation({
        mutationFn: (id: string) => api.patch(`/library/issues/${id}/pay-fine`, {}),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["library_overdue"] }); qc.invalidateQueries({ queryKey: ["library_stats"] }); toast.success("Fine marked as paid"); },
        onError: () => toast.error("Failed to update fine"),
    });

    const totalFines = overdue.reduce((s: number, o: any) => s + (o.fineAmount || 0), 0);
    const unpaidFines = overdue.filter((o: any) => !o.finePaid).reduce((s: number, o: any) => s + (o.fineAmount || 0), 0);

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Library</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Overdue & Fines</span>
                </div>
                <button onClick={() => refetch()} className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><AlertTriangle className="w-7 h-7 text-rose-500" />Overdue & Fines</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Books past their due date · Fine rate: KSh 10 per day</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: "Overdue Books", value: overdue.length, color: "text-rose-600", bg: "bg-rose-50" },
                        { label: "Total Fines", value: `KSh ${totalFines.toLocaleString()}`, color: "text-amber-600", bg: "bg-amber-50" },
                        { label: "Outstanding Fines", value: `KSh ${unpaidFines.toLocaleString()}`, color: "text-rose-600", bg: "bg-rose-50" },
                    ].map(s => (
                        <div key={s.label} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><DollarSign className={`w-4 h-4 ${s.color}`} /></div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                            <p className={`text-xl font-black ${s.color}`}>{isLoading ? "—" : s.value}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                    ) : overdue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 text-emerald-500">
                            <Check className="w-10 h-10" />
                            <p className="text-xs font-black uppercase tracking-widest">No overdue books!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-4">Book</th>
                                        <th className="py-4 px-4">Member</th>
                                        <th className="py-4 px-4">Due Date</th>
                                        <th className="py-4 px-4 text-center">Days Overdue</th>
                                        <th className="py-4 px-4 text-right">Fine (KSh)</th>
                                        <th className="py-4 px-4 text-center">Fine Status</th>
                                        <th className="py-4 px-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {overdue.map((o: any) => (
                                        <tr key={o._id} className="hover:bg-rose-50/20 transition-colors">
                                            <td className="py-3 px-4 font-black text-slate-800">{o.bookTitle}</td>
                                            <td className="py-3 px-4">
                                                <p className="font-black text-slate-700">{o.memberName}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{o.memberClass || o.memberType}</p>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-rose-600 flex items-center gap-1"><Calendar className="w-3 h-3" />{o.dueDate}</td>
                                            <td className="py-3 px-4 text-center font-black text-rose-600 text-sm">{o.daysOverdue}</td>
                                            <td className="py-3 px-4 text-right font-black text-rose-600">{(o.fineAmount || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${o.finePaid ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                                                    {o.finePaid ? "Paid" : "Unpaid"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {!o.finePaid && (
                                                    <button onClick={() => payFineMut.mutate(o._id)} disabled={payFineMut.isPending}
                                                        className="h-8 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1 mx-auto transition-colors">
                                                        {payFineMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                        Mark Paid
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
