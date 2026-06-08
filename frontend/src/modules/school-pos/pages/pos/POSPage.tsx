import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'sonner'
import api from '@/lib/api'
import { useCartStore } from '../../stores/cartStore'
import CartPanel from '../../components/pos/CartPanel'
import ReceiptModal from '../../components/pos/ReceiptModal'
import {
  Search, ArrowLeft, Tag, Layers, RefreshCw, AlertTriangle, X
} from 'lucide-react'

interface Variant { id: string; size: string | null; color: string | null; stock: number; price: number }
interface Product { id: string; name: string; description: string | null; imageUrl: string | null; variants: Variant[]; category: { id: string; name: string } }
interface Category { id: string; name: string }

export default function POSPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [receiptOrder, setReceiptOrder] = useState<any>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => { searchRef.current?.focus() }, [])

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data as Category[]),
  })

  const { data: productData, isLoading, refetch } = useQuery({
    queryKey: ['pos-products', search, categoryId],
    queryFn: () => api.get('/products', { params: { search: search || undefined, category: categoryId || undefined, limit: 80 } }).then(r => r.data.data as Product[]),
  })

  const products = productData || []

  const handleAddToCart = useCallback((product: Product, variant: Variant) => {
    if (variant.stock < 1) { toast.error('Out of stock'); return }
    addItem({
      variantId: variant.id,
      productName: product.name,
      variantLabel: variant.size || variant.color || 'One Size',
      unitPrice: Number(variant.price),
      quantity: 1,
      maxStock: variant.stock,
    })
    toast.success(`${product.name} added`)
  }, [addItem])

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-950 text-white rounded-xl border border-gray-800">
      {/* Left — Products */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products… (type to filter)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pl-9 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => refetch()} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setCategoryId('')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              !categoryId ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Layers size={12} /> All
          </button>
          {catData?.map(c => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                categoryId === c.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Tag size={12} /> {c.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="bg-gray-800 animate-pulse h-36 rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <AlertTriangle size={32} className="mb-3" />
              <p>No products found</p>
              {search && <button onClick={() => setSearch('')} className="mt-2 text-sm text-blue-400">Clear search</button>}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map(product => (
                <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — Cart */}
      <CartPanel onOrderComplete={(order) => setReceiptOrder(order)} />

      {/* Receipt modal */}
      {receiptOrder && (
        <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}
    </div>
  )
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product, v: Variant) => void }) {
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id || '')
  const selectedVariant = product.variants.find(v => v.id === selectedVariantId) || product.variants[0]
  const outOfStock = !selectedVariant || selectedVariant.stock < 1
  const lowStock = selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5

  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-xl p-3 cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition-all flex flex-col gap-2 group ${
        outOfStock ? 'opacity-60 cursor-not-allowed' : ''
      }`}
      onClick={() => !outOfStock && selectedVariant && onAdd(product, selectedVariant)}
    >
      <div className="h-20 rounded-lg bg-gray-900 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl select-none">
            {product.category.name.includes('Uniform') ? '👕' :
             product.category.name.includes('Stationary') || product.category.name.includes('Stationery') ? '📚' :
             product.category.name.includes('Sport') ? '⚽' : '🛍️'}
          </span>
        )}
      </div>

      <div className="flex-1">
        <p className="text-xs font-semibold text-white leading-tight line-clamp-2">{product.name}</p>
        <p className="text-blue-400 font-bold text-sm mt-0.5">KES {Number(selectedVariant?.price || 0).toLocaleString()}</p>
      </div>

      {product.variants.length > 1 && (
        <select
          value={selectedVariantId}
          onChange={e => { e.stopPropagation(); setSelectedVariantId(e.target.value) }}
          onClick={e => e.stopPropagation()}
          className="text-xs bg-gray-900 border border-gray-700 rounded-md px-1.5 py-1 text-white w-full"
        >
          {product.variants.map(v => (
            <option key={v.id} value={v.id}>
              {v.size || v.color || 'Default'} ({v.stock} left)
            </option>
          ))}
        </select>
      )}

      <div className={`text-[10px] px-1.5 py-0.5 rounded text-center font-medium ${
        outOfStock ? 'bg-red-500/20 text-red-400' :
        lowStock ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/10 text-green-400'
      }`}>
        {outOfStock ? 'Out of stock' : lowStock ? `Only {selectedVariant.stock} left` : `${selectedVariant.stock} in stock`}
      </div>
    </div>
  )
}
