import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import posApi from '../../lib/posApi'
import { Plus, Edit, Trash2, Search, Loader2, ShoppingBag, X } from 'lucide-react'

interface VariantInput { id?: string; size: string; color: string; stock: number; price: number }

export default function POSProducts() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [variants, setVariants] = useState<VariantInput[]>([{ size: '', color: '', stock: 10, price: 100 }])

  const { data: cats } = useQuery({ queryKey: ['pos-cats'], queryFn: () => posApi.get('/categories').then(r => r.data.data) })
  const { data: products, isLoading } = useQuery({
    queryKey: ['pos-products-admin', search, catFilter],
    queryFn: () => posApi.get('/products', { params: { search: search || undefined, category: catFilter || undefined } }).then(r => r.data.data),
  })
  const { mutate: saveProduct, isPending } = useMutation({
    mutationFn: (data: any) => selectedProduct ? posApi.put(`/products/${selectedProduct.id}`, data) : posApi.post('/products', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-products-admin'] }); toast.success(selectedProduct ? 'Updated' : 'Created'); closeModal() },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  })
  const { mutate: deleteProduct } = useMutation({
    mutationFn: (id: string) => posApi.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-products-admin'] }); toast.success('Deleted') },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  })

  const openEdit = (p: any) => {
    setSelectedProduct(p); setName(p.name); setDescription(p.description || '')
    setCategoryId(p.categoryId); setImageUrl(p.imageUrl || '')
    setVariants(p.variants.map((v: any) => ({ id: v.id, size: v.size || '', color: v.color || '', stock: v.stock, price: Number(v.price) })))
    setModalOpen(true)
  }
  const openNew = () => {
    setSelectedProduct(null); setName(''); setDescription('')
    setCategoryId(cats?.[0]?.id || ''); setImageUrl('')
    setVariants([{ size: '', color: '', stock: 10, price: 100 }]); setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setSelectedProduct(null) }
  const handleVariantChange = (idx: number, key: keyof VariantInput, value: any) =>
    setVariants(variants.map((v, i) => i === idx ? { ...v, [key]: value } : v))

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage store catalog — uniforms, stationery, accessories.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <Plus size={16} /> New Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 md:w-48">
          <option value="">All Categories</option>
          {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variants</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Range</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {products?.map((p: any) => {
                const totalStock = p.variants.reduce((s: number, v: any) => s + v.stock, 0)
                const prices = p.variants.map((v: any) => Number(v.price))
                const minP = prices.length ? Math.min(...prices) : 0
                const maxP = prices.length ? Math.max(...prices) : 0
                return (
                  <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-lg shrink-0">
                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover rounded-lg" /> : <ShoppingBag className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{p.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[180px]">{p.description || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">{p.category?.name}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {p.variants.map((v: any) => v.size || v.color || 'Default').join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${totalStock === 0 ? 'text-red-400' : totalStock <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>{totalStock}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-indigo-400">
                      KES {minP === maxP ? minP.toLocaleString() : `${minP.toLocaleString()} – ${maxP.toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><Edit size={14} /></button>
                        <button onClick={() => { if (confirm('Delete this product?')) deleteProduct(p.id) }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {products?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No products found. Create your first product!</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-bold text-white">{selectedProduct ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!name || !categoryId) { toast.error('Name and Category required'); return } saveProduct({ name, description, categoryId, imageUrl, variants }) }}
              className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Product Name *</label>
                  <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Category *</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                    {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Description</label>
                <textarea className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[64px]" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Image URL</label>
                <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
              {/* Variants */}
              <div className="border-t border-gray-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Variants</p>
                  <button type="button" onClick={() => setVariants([...variants, { size: '', color: '', stock: 10, price: 100 }])}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-colors">
                    <Plus size={11} /> Add
                  </button>
                </div>
                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-800/60 p-2.5 rounded-xl border border-gray-700">
                    <div className="col-span-3"><input className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" placeholder="Size" value={v.size} onChange={e => handleVariantChange(i, 'size', e.target.value)} /></div>
                    <div className="col-span-3"><input className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" placeholder="Color" value={v.color} onChange={e => handleVariantChange(i, 'color', e.target.value)} /></div>
                    <div className="col-span-2"><input type="number" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" placeholder="Stock" value={v.stock} onChange={e => handleVariantChange(i, 'stock', parseInt(e.target.value) || 0)} /></div>
                    <div className="col-span-3"><input type="number" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" placeholder="Price" value={v.price} onChange={e => handleVariantChange(i, 'price', parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-1 text-center"><button type="button" onClick={() => setVariants(variants.filter((_, ii) => ii !== i))} disabled={variants.length <= 1} className="text-red-400 hover:text-red-300 disabled:opacity-30"><Trash2 size={13} /></button></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : null} Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
