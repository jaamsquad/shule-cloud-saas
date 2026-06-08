import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import posApi from '../../lib/posApi'
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

export default function StoreOrderConfirmation() {
  const { orderNumber } = useParams()

  const { data: order, isLoading } = useQuery({
    queryKey: ['store-order', orderNumber],
    queryFn: () => posApi.get(`/store/orders/${orderNumber}`).then(r => r.data.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'PENDING' ? 3000 : false
    }
  })

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4 bg-gray-950 min-h-screen text-gray-100">
        <div className="h-12 w-12 mx-auto rounded-full bg-gray-800 animate-pulse" />
        <div className="h-8 w-2/3 mx-auto bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4 bg-gray-950 min-h-screen text-gray-100">
        <AlertCircle size={48} className="text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Order not found</h2>
        <Link to="/store" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-all">Back to Store</Link>
      </div>
    )
  }

  const isPaid = order.status === 'PAID'

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6 bg-gray-950 min-h-screen text-gray-100">
      {isPaid ? (
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 text-emerald-400">
          <CheckCircle size={32} />
        </div>
      ) : (
        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto border border-yellow-500/20 text-yellow-400 animate-pulse">
          <AlertCircle size={32} />
        </div>
      )}

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-white">
          {isPaid ? 'Payment Confirmed!' : 'Awaiting Payment Confirmation'}
        </h1>
        <p className="text-xs text-gray-500">Order: <span className="font-mono text-white font-semibold">{order.orderNumber}</span></p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 text-left text-xs">
        <div className="flex justify-between items-center text-gray-400">
          <span>Customer</span>
          <span className="text-white font-semibold">{order.customerName}</span>
        </div>
        {order.customerClass && (
          <div className="flex justify-between items-center text-gray-400">
            <span>Student Class</span>
            <span className="text-white">{order.customerClass}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-gray-400 border-t border-gray-850 pt-3">
          <span>Total Paid</span>
          <span className="text-indigo-400 font-extrabold text-sm">KES {Number(order.totalAmount).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link to="/store/products" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all">
          Continue Shopping <ArrowRight size={14} />
        </Link>
        <Link to="/store" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 font-semibold transition-all">
          Back to Homepage
        </Link>
      </div>
    </div>
  )
}
