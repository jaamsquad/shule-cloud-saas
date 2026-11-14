import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'sonner'
import api from '@/lib/api'
import {
  Plus, Edit, Trash2, Search, Loader2, Shirt, X
} from 'lucide-react'

interface VariantInput { id?: string; size: string; color: string; stock: number; price: number }

export default function AdminProducts() {
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

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data),
  })

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search, catFilter],
    queryFn: () => api.get('/products', { params: { search: search || undefined, category: catFilter || undefined } }).then(r => r.data.data),
  })

  const { mutate: saveProduct, isPending } = useMutation({
    mutationFn: (data: any) => selectedProduct
      ? api.put(`/products/${selectedProduct.id}`, data)
      : api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(selectedProduct ? 'Product updated' : 'Product created')
      closeModal()
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save product'),
  })

  const { mutate: deleteProduct } = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete product'),
  })

  const openEdit = (p: any) => {
    setSelectedProduct(p)
    setName(p.name)
    setDescription(p.description || '')
    setCategoryId(p.categoryId)
    setImageUrl(p.imageUrl || '')
    setVariants(p.variants.map((v: any) => ({ id: v.id, size: v.size || '', color: v.color || '', stock: v.stock, price: Number(v.price) })))
    setModalOpen(true)
  }

  const openNew = () => {
    setSelectedProduct(null)
    setName('')
    setDescription('')
    setCategoryId(cats?.[0]?.id || '')
    setImageUrl('')
    setVariants([{ size: '', color: '', stock: 10, price: 100 }])
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedProduct(null)
  }

  const handleAddVariant = () => {
    setVariants([...variants, { size: '', color: '', stock: 10, price: 100 }])
  }

  const handleRemoveVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx))
  }

  const handleVariantChange = (idx: number, key: keyof VariantInput, value: any) => {
    setVariants(variants.map((v, i) => i === idx ? { ...v, [key]: value } : v))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !categoryId) { toast.error('Name and Category are required'); return }
    saveProduct({ name, description, categoryId, imageUrl, variants })
  }

  return (
    <div className="p-6 space-y-6 text-white bg-gray-950 min-h-[calc(100vh-64px)] rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products Catalog</h1>
          <p className="text-gray-400 text-sm">Create and modify uniforms, stationery, accessories, sportswear.</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-1 text-sm">
          <Plus size={16} /> New Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900 p-4 border border-gray-800 rounded-xl">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search catalog…"
            className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 pl-9 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm md:w-48"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {cats?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Price Range</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {products?.map((p: any) => {
                const totalStock = p.variants.reduce((s: number, v: any) => s + v.stock, 0)
                const prices = p.variants.map((v: any) => Number(v.price))
                const minPrice = prices.length ? Math.min(...prices) : 0
                const maxPrice = prices.length ? Math.max(...prices) : 0
                return (
                  <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-gray-800 flex items-center justify-center text-lg">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} className="w-full h-full object-cover rounded" />
                        ) : <Shirt className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{p.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{p.description || 'No description'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs font-medium">{p.category.name}</span></td>
                    <td className="px-4 py-3.5 text-xs text-gray-400">{p.variants.map((v: any) => v.size || v.color || 'Default').join(', ')}</td>
                    <td className="px-4 py-3.5">
                      <span className={totalStock === 0 ? 'text-red-400 font-semibold' : totalStock <= 5 ? 'text-yellow-400 font-semibold' : 'text-gray-300'}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-blue-400">
                      KES {minPrice === maxPrice ? minPrice.toLocaleString() : `${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><Edit size={14} /></button>
                        <button onClick={() => { if (confirm('Delete this product?')) deleteProduct(p.id) }} className="p-1.5 hover:bg-gray-800 rounded-lg text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-bold text-white">{selectedProduct ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Product Name *</label>
                  <input className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm" placeholder="e.g. School Blazer" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Category *</label>
                  <select className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                    {cats?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <textarea className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm min-h-[60px]" placeholder="Brief details about fit, quality, or material..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Image URL (Optional)</label>
                <input className="w-full bg-gray-850 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm" placeholder="https://image-host.com/blazer.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              </div>

              <div className="border-t border-gray-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Product Variants</h3>
                  <button type="button" onClick={handleAddVariant} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 px-3 py-1 rounded text-xs font-bold">
                    + Add Variant
                  </button>
                </div>

                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-800 p-2.5 border border-gray-700 rounded-lg">
                    <div className="col-span-3">
                      <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs" placeholder="Size" value={v.size} onChange={e => handleVariantChange(i, 'size', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs" placeholder="Color" value={v.color} onChange={e => handleVariantChange(i, 'color', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs" placeholder="Stock" value={v.stock} onChange={e => handleVariantChange(i, 'stock', parseInt(e.target.value) || 0)} required />
                    </div>
                    <div className="col-span-3">
                      <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs" placeholder="Price" value={v.price} onChange={e => handleVariantChange(i, 'price', parseFloat(e.target.value) || 0)} required />
                    </div>
                    <div className="col-span-1 text-center">
                      <button type="button" onClick={() => handleRemoveVariant(i)} disabled={variants.length <= 1} className="text-red-400 hover:text-red-300 disabled:opacity-40"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
                <button type="button" onClick={closeModal} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold">Cancel</button>
                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-semibold flex items-center justify-center gap-1">
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
