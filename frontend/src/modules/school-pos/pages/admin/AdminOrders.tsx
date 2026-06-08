import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'sonner'
import api from '@/lib/api'
import { format } from 'date-fns'
import {
  Search, Eye, RefreshCw, XCircle
} from 'lucide-react'

export default function AdminOrders() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['orders-admin', search, statusFilter, methodFilter],
    queryFn: () => api.get('/orders', { params: { search: search || undefined, status: statusFilter || undefined, method: methodFilter || undefined } }).then(r => r.data.data),
  })

  const { mutate: cancelOrder } = useMutation({
    mutationFn: (id: string) => api.put(`/orders/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-admin'] })
      toast.success('Order cancelled and stock restored')
      setSelectedOrder(null)
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to cancel order'),
  })

  const orders = ordersData || []

  return (
    <div className="p-6 space-y-6 text-white bg-gray-950 min-h-[calc(100vh-64px)] rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Logs</h1>
          <p className="text-gray-400 text-sm">POS sales and online store orders.</p>
        </div>
        <button onClick={() => refetch()} className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-900 p-4 border border-gray-800 rounded-xl">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Order number or customer name…"
            className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 pl-9 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select className="bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
          <option value="">All Payment Methods</option>
          <option value="CASH">Cash</option>
          <option value="MPESA">M-Pesa</option>
          <option value="CARD">Card</option>
          <option value="ACCOUNT">Student Account</option>
        </select>
      </div>

      {/* Grid */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="bg-gray-800 animate-pulse h-10 w-full rounded" />
            <div className="bg-gray-800 animate-pulse h-10 w-full rounded" />
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/40 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Order No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-400 text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-400">
                    {format(new Date(o.createdAt), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-white text-sm">{o.customerName || 'Walk-in'}</p>
                    {o.customerClass && <p className="text-[10px] text-gray-500">{o.customerClass}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      o.source === 'ONLINE' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {o.source}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-gray-300 text-xs">{o.paymentMethod}</td>
                  <td className="px-4 py-3.5 font-bold text-blue-400 text-sm">KES {Number(o.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      o.status === 'PAID' ? 'bg-green-500/10 text-green-400' :
                      o.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button onClick={() => setSelectedOrder(o)} className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-2.5 py-1 text-xs border border-gray-700 flex items-center gap-1 ml-auto">
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Order Details</h2>
                <p className="text-xs text-gray-500">{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-gray-500 font-medium uppercase">Customer Details</p>
                <p className="text-white font-semibold text-sm">{selectedOrder.customerName || 'Walk-in Customer'}</p>
                {selectedOrder.customerClass && <p className="text-gray-400">Class: {selectedOrder.customerClass}</p>}
                {selectedOrder.admissionNo && <p className="text-gray-400">Adm No: {selectedOrder.admissionNo}</p>}
              </div>
              <div className="space-y-1 text-right">
                <p className="text-gray-500 font-medium uppercase">Metadata</p>
                <p className="text-white">Date: {format(new Date(selectedOrder.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                <p className="text-white">Cashier ID: {selectedOrder.cashierId || 'N/A'}</p>
                {selectedOrder.notes && <p className="text-yellow-400 truncate">Notes: {selectedOrder.notes}</p>}
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ordered Items</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-850 p-2.5 rounded-lg border border-gray-800">
                    <div>
                      <p className="text-xs font-semibold text-white">{item.productName}</p>
                      <p className="text-[10px] text-gray-500">{item.variantLabel} × {item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-white">KES {Number(item.subtotal).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-850 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span><span className="text-white">KES {(Number(selectedOrder.totalAmount) + Number(selectedOrder.discount)).toLocaleString()}</span>
              </div>
              {Number(selectedOrder.discount) > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span><span>- KES {Number(selectedOrder.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white text-sm border-t border-gray-800 pt-1.5">
                <span>Total Amount</span>
                <span className="text-blue-400">KES {Number(selectedOrder.totalAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-gray-800 text-xs font-semibold">
              {selectedOrder.status !== 'CANCELLED' && (
                <button
                  onClick={() => { if (confirm('Cancel this order and restore stock?')) cancelOrder(selectedOrder.id) }}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 flex items-center gap-1"
                >
                  <XCircle size={14} /> Cancel & Restock
                </button>
              )}
              <button onClick={() => setSelectedOrder(null)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 px-4 py-2 rounded-lg text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
