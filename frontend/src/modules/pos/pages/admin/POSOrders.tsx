import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import posApi from '../../lib/posApi'
import { format } from 'date-fns'
import { Search, Eye, RefreshCw, XCircle, X } from 'lucide-react'

export default function POSOrders() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['pos-orders', search, statusFilter, methodFilter],
    queryFn: () => posApi.get('/orders', { params: { search: search || undefined, status: statusFilter || undefined, method: methodFilter || undefined } }).then(r => r.data.data),
  })

  const { mutate: cancelOrder } = useMutation({
    mutationFn: (id: string) => posApi.put(`/orders/${id}/cancel`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-orders'] }); toast.success('Order cancelled & stock restored'); setSelectedOrder(null) },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  })

  const statusBadge = (s: string) => {
    const cls = s === 'PAID' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : s === 'CANCELLED' ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{s}</span>
  }

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">POS sales and online store orders</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-sm transition-all">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Order number or customer…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
          <option value="">All Statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
          <option value="">All Payment Methods</option>
          <option value="CASH">Cash</option>
          <option value="MPESA">M-Pesa</option>
          <option value="CARD">Card</option>
          <option value="ACCOUNT">Student Account</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Order No.', 'Date', 'Customer', 'Channel', 'Method', 'Amount', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-white text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(o.createdAt), 'dd MMM yyyy, HH:mm')}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{o.customerName || 'Walk-in'}</p>
                    {o.customerClass && <p className="text-xs text-gray-500">{o.customerClass}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.source === 'ONLINE' ? 'bg-purple-500/15 text-purple-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                      {o.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300 font-medium">{o.paymentMethod}</td>
                  <td className="px-4 py-3 font-bold text-indigo-400 text-sm">KES {Number(o.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3">{statusBadge(o.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedOrder(o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:text-white transition-colors ml-auto">
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No orders found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Order Details</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-white text-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <p className="text-gray-500 font-medium uppercase tracking-wider">Customer</p>
                <p className="text-white font-semibold">{selectedOrder.customerName || 'Walk-in'}</p>
                {selectedOrder.customerClass && <p className="text-gray-400">Class: {selectedOrder.customerClass}</p>}
                {selectedOrder.admissionNo && <p className="text-gray-400">Adm: {selectedOrder.admissionNo}</p>}
              </div>
              <div className="space-y-1.5 text-right">
                <p className="text-gray-500 font-medium uppercase tracking-wider">Details</p>
                <p className="text-white">{format(new Date(selectedOrder.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                <p className="text-gray-400">Cashier: {selectedOrder.cashier?.name || 'N/A'}</p>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-800 p-2.5 rounded-xl">
                    <div>
                      <p className="text-xs font-medium text-white">{item.productName}</p>
                      <p className="text-[10px] text-gray-500">{item.variantLabel} × {item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-white">KES {Number(item.subtotal).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-xs space-y-1.5">
              {Number(selectedOrder.discount) > 0 && (
                <div className="flex justify-between text-emerald-400"><span>Discount</span><span>- KES {Number(selectedOrder.discount).toLocaleString()}</span></div>
              )}
              <div className="flex justify-between font-bold text-white text-sm">
                <span>Total</span>
                <span className="text-indigo-400">KES {Number(selectedOrder.totalAmount).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              {selectedOrder.status !== 'CANCELLED' && (
                <button onClick={() => { if (confirm('Cancel & restock?')) cancelOrder(selectedOrder.id) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 text-sm transition-colors">
                  <XCircle size={14} /> Cancel & Restock
                </button>
              )}
              <button onClick={() => setSelectedOrder(null)} className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
