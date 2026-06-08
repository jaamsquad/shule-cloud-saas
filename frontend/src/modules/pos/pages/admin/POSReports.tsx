import { useQuery } from '@tanstack/react-query'
import posApi from '../../lib/posApi'
import { TrendingUp, ShoppingCart, Landmark, CreditCard } from 'lucide-react'

export default function POSReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['pos-sales-report'],
    queryFn: () => posApi.get('/reports/sales').then(r => r.data.data),
  })

  const { data: topProducts } = useQuery({
    queryKey: ['pos-top-products'],
    queryFn: () => posApi.get('/reports/products').then(r => r.data.data),
  })

  const { data: cashierReport } = useQuery({
    queryKey: ['pos-cashier-report'],
    queryFn: () => posApi.get('/reports/cashiers').then(r => r.data.data),
  })

  const paymentBreakdown = data?.byMethod || {}

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-gray-400 text-sm mt-0.5">Sales analytics, payment breakdowns, and performance metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `KES ${Number(data?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'indigo' },
          { label: 'Total Orders', value: data?.totalOrders || 0, icon: ShoppingCart, color: 'blue' },
          { label: 'Cash Collected', value: `KES ${Number(paymentBreakdown.CASH || 0).toLocaleString()}`, icon: Landmark, color: 'emerald' },
          { label: 'M-Pesa Collected', value: `KES ${Number(paymentBreakdown.MPESA || 0).toLocaleString()}`, icon: CreditCard, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color === 'indigo' ? 'text-indigo-400' : color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-white'}`}>
                {isLoading ? '—' : value}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400' : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : color === 'amber' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
              <Icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Top Selling Products</h2>
          <div className="space-y-3">
            {topProducts?.slice(0, 8).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 font-mono w-5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{p.productName}</p>
                    <p className="text-xs text-gray-500">{p.totalQty} units sold</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-indigo-400">KES {Number(p.totalRevenue).toLocaleString()}</span>
              </div>
            )) || <p className="text-gray-500 text-sm">No product data yet.</p>}
          </div>
        </div>

        {/* Cashier Performance */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Cashier Performance</h2>
          <div className="space-y-3">
            {cashierReport?.slice(0, 8).map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{c.cashierName}</p>
                  <p className="text-xs text-gray-500">{c.totalOrders} orders</p>
                </div>
                <span className="text-sm font-bold text-emerald-400">KES {Number(c.totalRevenue).toLocaleString()}</span>
              </div>
            )) || <p className="text-gray-500 text-sm">No cashier data yet.</p>}
          </div>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Payment Method Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['CASH', 'MPESA', 'CARD', 'ACCOUNT'].map(method => (
            <div key={method} className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 uppercase mb-1">{method}</p>
              <p className="text-lg font-bold text-white">KES {Number(paymentBreakdown[method] || 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
