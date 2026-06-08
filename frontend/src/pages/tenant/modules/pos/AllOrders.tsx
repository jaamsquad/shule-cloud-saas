import { useState } from "react";
import { Home, Search, RefreshCw, Eye, X, Check, Loader2, ShoppingBag, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AllOrders() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [viewOrder, setViewOrder] = useState<any>(null);
    const qc = useQueryClient();

    const { data: orders = [], isLoading, refetch } = useQuery({
        queryKey: ["pos_orders"],
        queryFn: async () => {
            const r = await api.get("/pos/orders");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/pos/orders/${id}/cancel`, {}),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos_orders"] }); toast.success("Order cancelled & stock restored"); setViewOrder(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to cancel"),
    });

    const filtered = orders.filter((o: any) => {
        const matchSearch = !search || (o.orderNo || "").toLowerCase().includes(search.toLowerCase()) || (o.customerName || "").toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalRevenue = orders.filter((o: any) => o.status !== "CANCELLED").reduce((s: number, o: any) => s + (o.total || 0), 0);

    const statusColor = (s: string) => {
        if (s === "COMPLETED") return "bg-emerald-50 text-emerald-600";
        if (s === "CANCELLED") return "bg-rose-50 text-rose-500";
        return "bg-amber-50 text-amber-600";
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Online Store & POS</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">All Orders</span>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">All Orders</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                            {orders.length} orders · Total revenue: KSh {totalRevenue.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order no or customer..."
                            className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                        <option value="ALL">All Status</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="PENDING">Pending</option>
                    </select>
                    <button onClick={() => refetch()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100">
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>
                    <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} results</span>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase">
                            <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading orders...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase">
                            <ShoppingBag className="w-8 h-8 opacity-20" />
                            No orders found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-4">Order No</th>
                                        <th className="py-4 px-4">Customer</th>
                                        <th className="py-4 px-4">Items</th>
                                        <th className="py-4 px-4 text-right">Total (KSh)</th>
                                        <th className="py-4 px-4 text-center">Method</th>
                                        <th className="py-4 px-4 text-center">Status</th>
                                        <th className="py-4 px-4">Date</th>
                                        <th className="py-4 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((o: any) => (
                                        <tr key={o._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 font-black text-slate-800">{o.orderNo}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{o.customerName || "Walk-in"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{(o.items || []).length} item{(o.items || []).length !== 1 ? "s" : ""}</td>
                                            <td className="py-3 px-4 text-right font-black text-slate-800">{Number(o.total || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase">{o.paymentMethod || "CASH"}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${statusColor(o.status)}`}>{o.status}</span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 font-bold">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(o.createdAt).toLocaleDateString("en-GB")}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button onClick={() => setViewOrder(o)} className="h-8 px-3 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-[#5C67F2] border border-slate-100 rounded-xl font-black text-[9px] uppercase flex items-center gap-1.5 mx-auto transition-colors">
                                                    <Eye className="w-3 h-3" /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Detail Modal */}
            {viewOrder && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">{viewOrder.orderNo}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                        {new Date(viewOrder.createdAt).toLocaleString("en-GB")} · {viewOrder.customerName || "Walk-in"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${viewOrder.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                                        {viewOrder.status}
                                    </span>
                                    <button onClick={() => setViewOrder(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-2 mb-5">
                                {(viewOrder.items || []).map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 text-xs">
                                        <div>
                                            <p className="font-black text-slate-800">{item.productName}</p>
                                            <p className="text-slate-400 font-bold">Qty: {item.qty} × KSh {Number(item.unitPrice).toLocaleString()}</p>
                                        </div>
                                        <span className="font-black text-slate-800">KSh {Number(item.subtotal || item.unitPrice * item.qty).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 text-xs mb-5">
                                <div className="flex justify-between"><span className="text-slate-500 font-bold">Subtotal</span><span className="font-black">KSh {Number(viewOrder.subtotal || 0).toLocaleString()}</span></div>
                                {(viewOrder.taxTotal || 0) > 0 && <div className="flex justify-between"><span className="text-slate-500 font-bold">Tax</span><span className="font-black text-amber-600">KSh {Number(viewOrder.taxTotal).toLocaleString()}</span></div>}
                                {(viewOrder.discount || 0) > 0 && <div className="flex justify-between"><span className="text-slate-500 font-bold">Discount</span><span className="font-black text-rose-500">-KSh {Number(viewOrder.discount).toLocaleString()}</span></div>}
                                <div className="flex justify-between pt-2 border-t border-slate-200">
                                    <span className="font-black text-slate-800 uppercase">Total</span>
                                    <span className="font-black text-[#5C67F2] text-base">KSh {Number(viewOrder.total || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                                {[["Payment Method", viewOrder.paymentMethod], ["Reference", viewOrder.paymentRef || "—"], ["Source", viewOrder.source || "POS"], ["Notes", viewOrder.notes || "—"]].map(([label, val]) => (
                                    <div key={label}>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{label}</p>
                                        <p className="font-black text-slate-700 mt-0.5">{val}</p>
                                    </div>
                                ))}
                            </div>

                            {viewOrder.status !== "CANCELLED" && (
                                <button onClick={() => cancelMutation.mutate(viewOrder._id)} disabled={cancelMutation.isPending}
                                    className="w-full h-10 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                    Cancel Order & Restore Stock
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
