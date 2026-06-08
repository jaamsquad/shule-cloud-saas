import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  ArrowRight, Landmark, RefreshCw
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend
)

export default function AdminDashboard() {
  const { data: summary, isLoading: sumLoading, refetch: refetchSum } = useQuery({
    queryKey: ['today-summary'],
    queryFn: () => api.get('/orders/summary/today').then(r => r.data.data),
  })

  const { data: lowStock, isLoading: stockLoading } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.get('/products?inStock=true&limit=5').then(r => r.data.data),
  })

  const { data: salesReport, isLoading: repLoading } = useQuery({
    queryKey: ['dashboard-sales-rep'],
    queryFn: () => api.get('/reports/sales').then(r => r.data.data),
  })

  const dayKeys = salesReport?.byDay ? Object.keys(salesReport.byDay).sort() : []
  const chartData = {
    labels: dayKeys.map(k => k.slice(5)),
    datasets: [
      {
        label: 'Daily Sales (KES)',
        data: dayKeys.map(k => salesReport.byDay[k].revenue),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  }

  return (
    <div className="p-6 space-y-6 text-white bg-gray-950 min-h-[calc(100vh-64px)] rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Store Management Dashboard</h1>
          <p className="text-gray-400 text-sm">Real-time store operations, financial metrics, and cashier trends.</p>
        </div>
        <button onClick={() => refetchSum()} className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase">Today's Sales</p>
            <p className="text-xl font-bold mt-1 text-blue-400">KES {Number(summary?.totalRevenue || 0).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><TrendingUp size={20} /></div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase">Today's Orders</p>
            <p className="text-xl font-bold mt-1 text-white">{summary?.totalOrders || 0}</p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><ShoppingCart size={20} /></div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase">Items Sold Today</p>
            <p className="text-xl font-bold mt-1 text-white">{summary?.itemsSold || 0}</p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-xl text-green-400"><Package size={20} /></div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase">Today's Cash Sales</p>
            <p className="text-xl font-bold mt-1 text-yellow-400">KES {Number(summary?.byMethod?.CASH || 0).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400"><Landmark size={20} /></div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Sales Performance (30 Days)</h2>
          <div className="h-64 flex items-center justify-center">
            {repLoading ? (
              <div className="bg-gray-800 animate-pulse w-full h-full rounded-xl" />
            ) : dayKeys.length === 0 ? (
              <p className="text-gray-500 text-sm">No sales data recorded yet.</p>
            ) : (
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" /> Low Stock Alerts
            </h2>
            {stockLoading ? (
              <div className="space-y-2">
                <div className="bg-gray-800 animate-pulse h-12 rounded-lg" />
                <div className="bg-gray-800 animate-pulse h-12 rounded-lg" />
              </div>
            ) : lowStock?.length === 0 ? (
              <p className="text-gray-500 text-xs py-4">All items fully stocked!</p>
            ) : (
              <div className="space-y-2">
                {lowStock?.slice(0, 4).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center bg-gray-800 p-2.5 rounded-lg border border-gray-700">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-500">{p.category.name}</p>
                    </div>
                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {p.variants?.reduce((s: number, v: any) => s + v.stock, 0)} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link to="/admin/store/inventory" className="mt-4 w-full bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1">
            Manage Stock <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}
