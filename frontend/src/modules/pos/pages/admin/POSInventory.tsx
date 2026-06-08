import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import posApi from '../../lib/posApi'
import { Package, Plus, Minus, Search, RefreshCw, AlertTriangle } from 'lucide-react'

export default function POSInventory() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN')

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['pos-inventory', search],
    queryFn: () => posApi.get('/products', { params: { search: search || undefined, limit: 100 } }).then(r => r.data.data),
  })

  const { mutate: adjustStock, isPending } = useMutation({
    mutationFn: (data: any) => posApi.post('/stock/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-inventory'] })
      toast.success('Stock updated successfully')
      setSelectedVariant(null); setAdjustQty(0); setAdjustReason('')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to adjust stock'),
  })

  const allVariants = products.flatMap((p: any) =>
    p.variants.map((v: any) => ({ ...v, productName: p.name, categoryName: p.category?.name }))
  )

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-gray-400 text-sm mt-0.5">Monitor stock levels and make adjustments</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-sm transition-all">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
      </div>

      {/* Inventory Grid */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {allVariants.map((v: any) => {
                const stockStatus = v.stock === 0 ? { label: 'Out of Stock', cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
                  : v.stock <= 5 ? { label: 'Low Stock', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
                  : { label: 'In Stock', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
                return (
                  <tr key={v.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white">{v.productName}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{v.size || v.color || 'Default'}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">{v.categoryName}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-lg ${v.stock === 0 ? 'text-red-400' : v.stock <= 5 ? 'text-amber-400' : 'text-white'}`}>{v.stock}</span>
                        {v.stock <= 5 && <AlertTriangle size={14} className="text-amber-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${stockStatus.cls}`}>{stockStatus.label}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setSelectedVariant(v); setAdjustQty(0); setAdjustReason(''); setAdjustType('IN') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 text-xs transition-colors ml-auto">
                        <Package size={12} /> Adjust
                      </button>
                    </td>
                  </tr>
                )
              })}
              {allVariants.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No inventory data found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Adjust Modal */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-bold text-white">Adjust Stock</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedVariant.productName} — {selectedVariant.size || selectedVariant.color || 'Default'}</p>
              </div>
              <button onClick={() => setSelectedVariant(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-2">
              <Package size={16} className="text-indigo-400" />
              <span className="text-sm text-gray-400">Current stock:</span>
              <span className="text-lg font-bold text-white">{selectedVariant.stock}</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Movement Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['IN', 'OUT', 'ADJUSTMENT'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setAdjustType(t)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors ${adjustType === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                      {t === 'IN' ? '+ Stock In' : t === 'OUT' ? '− Stock Out' : '~ Adjust'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Quantity</label>
                <input type="number" min={0} value={adjustQty} onChange={e => setAdjustQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Reason (optional)</label>
                <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="e.g. Delivery received, damaged goods…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setSelectedVariant(null)} className="flex-1 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => adjustStock({ variantId: selectedVariant.id, type: adjustType, quantity: adjustQty, reason: adjustReason })}
                disabled={isPending || adjustQty <= 0}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-60">
                {isPending ? 'Saving…' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
