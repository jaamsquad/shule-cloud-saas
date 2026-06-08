import { useQuery } from '@tanstack/react-query'
import posApi from '../../lib/posApi'
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  ArrowRight, Landmark, RefreshCw
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function POSDashboard() {
  const { data: summary, isLoading: sumLoading, refetch } = useQuery({
    queryKey: ['pos-today-summary'],
    queryFn: () => posApi.get('/orders/summary/today').then(r => r.data.data),
  })

  const { data: lowStock, isLoading: stockLoading } = useQuery({
    queryKey: ['pos-low-stock'],
    queryFn: () => posApi.get('/products?inStock=true&limit=5').then(r => r.data.data),
  })

  const stats = [
    { label: "Today's Sales", value: `KES ${Number(summary?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'indigo' },
    { label: "Today's Orders", value: summary?.totalOrders || 0, icon: ShoppingCart, color: 'blue' },
    { label: 'Items Sold Today', value: summary?.itemsSold || 0, icon: Package, color: 'emerald' },
    { label: 'Cash Collected', value: `KES ${Number(summary?.byMethod?.CASH || 0).toLocaleString()}`, icon: Landmark, color: 'amber' },
  ]

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Store Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Real-time store operations & metrics</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 text-sm transition-all">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color === 'indigo' ? 'text-indigo-400' : color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-white'}`}>{sumLoading ? '—' : value}</p>
            </div>
            <div className={`p-3 rounded-xl ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400' : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : color === 'amber' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
              <Icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/pos/terminal" className="flex items-center gap-3 p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 transition-all group">
              <ShoppingCart size={20} />
              <span className="text-sm font-medium">Open POS Terminal</span>
              <ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/pos/admin/products" className="flex items-center gap-3 p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 transition-all group">
              <Package size={20} />
              <span className="text-sm font-medium">Manage Products</span>
              <ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/pos/admin/inventory" className="flex items-center gap-3 p-4 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-400 hover:bg-amber-600/20 transition-all group">
              <Package size={20} />
              <span className="text-sm font-medium">Update Stock</span>
              <ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/pos/admin/reports" className="flex items-center gap-3 p-4 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 hover:bg-purple-600/20 transition-all group">
              <TrendingUp size={20} />
              <span className="text-sm font-medium">View Reports</span>
              <ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" /> Low Stock Alerts
          </h2>
          {stockLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />)}
            </div>
          ) : !lowStock?.length ? (
            <p className="text-gray-500 text-sm">All items fully stocked! ✅</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-500">{p.category?.name}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 shrink-0 ml-2">
                    {p.variants?.reduce((s: number, v: any) => s + v.stock, 0)} left
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link to="/pos/admin/inventory" className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400 hover:text-white transition-colors">
            Manage Stock <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}
