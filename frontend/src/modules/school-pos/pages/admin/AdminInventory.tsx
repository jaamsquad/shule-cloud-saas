import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'sonner'
import api from '@/lib/api'
import {
  Plus, RefreshCw, Layers, ArrowRightLeft, Loader2
} from 'lucide-react'

export default function AdminInventory() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('ALL')
  const [bulkModal, setBulkModal] = useState(false)
  const [adjustModal, setAdjustModal] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)

  const [bulkNote, setBulkNote] = useState('Bulk supplier shipment')
  const [bulkItems, setBulkItems] = useState<{ variantId: string; quantity: number }[]>([])

  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('IN')
  const [adjQty, setAdjQty] = useState(10)
  const [adjReason, setAdjReason] = useState('Supplier receive')

  const { data: variants, isLoading, refetch } = useQuery({
    queryKey: ['variants-list'],
    queryFn: () => api.get('/products').then(r => {
      const list: any[] = []
      r.data.data.forEach((p: any) => {
        p.variants.forEach((v: any) => {
          list.push({ ...v, productName: p.name, category: p.category.name })
        })
      })
      return list
    }),
  })

  const { mutate: adjustStock, isPending: adjPending } = useMutation({
    mutationFn: (data: any) => api.post(`/variants/${data.id}/adjust`, {
      quantity: data.quantity,
      type: data.type,
      reason: data.reason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants-list'] })
      toast.success('Stock adjusted')
      setAdjustModal(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to adjust stock'),
  })

  const { mutate: bulkReceive, isPending: bulkPending } = useMutation({
    mutationFn: () => api.post('/stock/receive', {
      note: bulkNote,
      items: bulkItems.filter(i => i.quantity > 0),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants-list'] })
      toast.success('Bulk receiving processed')
      setBulkModal(false)
      setBulkItems([])
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Bulk receiving failed'),
  })

  const openAdjust = (v: any) => {
    setSelectedVariant(v)
    setAdjQty(10)
    setAdjType('IN')
    setAdjReason('Restock')
    setAdjustModal(true)
  }

  const openBulk = () => {
    if (!variants) return
    setBulkItems(variants.map(v => ({ variantId: v.id, quantity: 0 })))
    setBulkModal(true)
  }

  const handleBulkQtyChange = (idx: number, qty: number) => {
    setBulkItems(bulkItems.map((item, i) => i === idx ? { ...item, quantity: qty } : item))
  }

  const filtered = variants?.filter((v: any) => {
    if (filter === 'OUT') return v.stock === 0
    if (filter === 'LOW') return v.stock > 0 && v.stock <= 5
    return true
  }) || []

  return (
    <div className="p-6 space-y-6 text-white bg-gray-950 min-h-[calc(100vh-64px)] rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Inventory</h1>
          <p className="text-gray-400 text-sm">Stock levels, bulk receiving, and inventory adjustments.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <button onClick={openBulk} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-1">
            <Layers size={14} /> Bulk Receive
          </button>
          <button onClick={() => refetch()} className="p-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded-lg"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 text-xs">
        {['ALL', 'LOW', 'OUT'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 font-semibold rounded-lg border transition-all ${
              filter === tab ? 'bg-blue-600 border-blue-500 text-white shadow' : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            {tab === 'ALL' ? 'All Items' : tab === 'LOW' ? 'Low Stock' : 'Out of Stock'}
          </button>
        ))}
      </div>

      {/* Table */}
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
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Stock Level</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-white">{v.productName}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-400">{v.size || v.color || 'Default'}</td>
                  <td className="px-4 py-3.5"><span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs font-medium">{v.category}</span></td>
                  <td className="px-4 py-3.5">
                    <span className={`font-semibold ${
                      v.stock === 0 ? 'text-red-400' : v.stock <= 5 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {v.stock} units
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button onClick={() => openAdjust(v)} className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-2.5 py-1 text-xs border border-gray-700 flex items-center gap-1.5 ml-auto">
                      <ArrowRightLeft size={12} /> Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Adjust Single Modal */}
      {adjustModal && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-blue-400" /> Stock Adjustment
            </h2>
            <p className="text-xs text-gray-400">Adjust stock level for <span className="text-white font-medium">{selectedVariant.productName} ({selectedVariant.size || 'One Size'})</span></p>

            <div className="flex gap-2">
              <button onClick={() => setAdjType('IN')} className={`flex-1 py-2 font-medium rounded-lg text-xs transition-colors ${adjType === 'IN' ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-gray-850 text-gray-500'}`}>
                + Receive (Stock In)
              </button>
              <button onClick={() => setAdjType('OUT')} className={`flex-1 py-2 font-medium rounded-lg text-xs transition-colors ${adjType === 'OUT' ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-gray-850 text-gray-500'}`}>
                - Issue (Stock Out)
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
              <input type="number" className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm" value={adjQty} onChange={e => setAdjQty(parseInt(e.target.value) || 0)} min={1} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Reason / Reference</label>
              <input className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm" placeholder="Supplier invoice..." value={adjReason} onChange={e => setAdjReason(e.target.value)} />
            </div>

            <div className="flex gap-3 justify-end pt-3 text-xs font-semibold">
              <button onClick={() => setAdjustModal(false)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 px-4 py-2 rounded-lg text-white">Cancel</button>
              <button
                onClick={() => adjustStock({ id: selectedVariant.id, quantity: adjQty, type: adjType, reason: adjReason })}
                disabled={adjPending}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center justify-center gap-1"
              >
                {adjPending ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Receive Modal */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus size={16} /> Bulk Stock Receiving
              </h2>
              <button onClick={() => setBulkModal(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Bulk note / Shipment reference</label>
                <input className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm" value={bulkNote} onChange={e => setBulkNote(e.target.value)} />
              </div>

              <div className="space-y-2 border-t border-gray-800 pt-4">
                <h3 className="text-xs font-semibold text-gray-400">Variant stock receive list</h3>
                <div className="space-y-2">
                  {variants?.map((v: any, idx: number) => (
                    <div key={v.id} className="flex justify-between items-center bg-gray-850 p-2.5 rounded-lg border border-gray-800">
                      <div>
                        <p className="text-xs font-semibold text-white">{v.productName}</p>
                        <p className="text-[10px] text-gray-500">{v.size || v.color || 'Default'} • {v.stock} current</p>
                      </div>
                      <input
                        type="number"
                        placeholder="0"
                        className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs w-24 text-right"
                        value={bulkItems[idx]?.quantity || ''}
                        min={0}
                        onChange={e => handleBulkQtyChange(idx, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-4 border-t border-gray-800 bg-gray-900/40 text-xs font-semibold">
              <button onClick={() => setBulkModal(false)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 px-4 py-2 rounded-lg">Cancel</button>
              <button onClick={() => bulkReceive()} disabled={bulkPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2">
                {bulkPending ? <Loader2 size={14} className="animate-spin" /> : 'Process Bulk Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
