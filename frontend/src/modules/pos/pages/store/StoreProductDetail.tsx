import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import posApi from '../../lib/posApi'
import { usePOSCartStore } from '../../stores/posCartStore'
import { ShoppingBag, ArrowLeft, ShieldCheck, Check, Shirt } from 'lucide-react'

export default function StoreProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = usePOSCartStore(s => s.addItem)
  const [selectedVariantId, setSelectedVariantId] = useState('')

  const { data: product, isLoading } = useQuery({
    queryKey: ['store-product', id],
    queryFn: () => posApi.get(`/store/products/${id}`).then(r => r.data.data),
    staleTime: 30000,
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-6 bg-gray-950 min-h-screen text-gray-100">
        <div className="h-8 w-1/3 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-80 bg-gray-900 border border-gray-800 rounded-3xl animate-pulse" />
          <div className="h-80 bg-gray-900 border border-gray-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center bg-gray-950 min-h-screen text-gray-100">
        <p className="text-gray-550">Product not found.</p>
        <Link to="/store/products" className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-all">Back to Shop</Link>
      </div>
    )
  }

  // Auto-select first variant on load if none selected
  const activeVariantId = selectedVariantId || product.variants[0]?.id || ''
  const selectedVariant = product.variants.find((v: any) => v.id === activeVariantId)
  const isOutOfStock = !selectedVariant || selectedVariant.stock < 1

  const handleAddToCart = () => {
    if (!selectedVariant) return
    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      variantLabel: selectedVariant.size || selectedVariant.color || 'One Size',
      unitPrice: Number(selectedVariant.price),
      quantity: 1,
      maxStock: selectedVariant.stock,
      imageUrl: product.imageUrl || undefined,
    })
    toast.success(`${product.name} added to cart!`)
    navigate('/store/cart')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6 bg-gray-950 min-h-screen text-gray-100">
      <Link to="/store/products" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Catalog
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left — Image Gallery */}
        <div className="md:col-span-6 bg-gray-900 border border-gray-800 rounded-3xl p-6 flex items-center justify-center overflow-hidden min-h-[320px]">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="max-h-[380px] max-w-full object-contain rounded-2xl" />
          ) : (
            <Shirt className="w-24 h-24 text-slate-400" />
          )}
        </div>

        {/* Right — Info */}
        <div className="md:col-span-6 space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{product.category?.name || 'Store Item'}</span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">{product.name}</h1>
            <p className="text-sm text-gray-400">{product.description || 'Official premium quality uniform item.'}</p>
          </div>

          <div className="border-y border-gray-800 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Unit Price</p>
              <p className="text-2xl font-black text-indigo-400">KES {Number(selectedVariant?.price || 0).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isOutOfStock ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                <Check size={12} /> {isOutOfStock ? 'Out of stock' : 'In stock'}
              </span>
            </div>
          </div>

          {/* Variants Selectors */}
          {product.variants?.length > 1 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Choose Option</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`px-4 py-2 border rounded-xl text-xs font-medium transition-all ${
                      activeVariantId === v.id
                        ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                        : 'border-gray-800 bg-gray-900 text-gray-400 hover:text-white'
                    }`}
                  >
                    {v.size || v.color || 'Standard'} ({v.stock} left)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add to Cart button */}
          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ShoppingBag size={18} /> {isOutOfStock ? 'Out of stock' : 'Add to Shopping Cart'}
            </button>
          </div>

          {/* School quality badge */}
          <div className="flex items-center gap-2.5 p-3.5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
            <ShieldCheck size={16} className="text-indigo-400 shrink-0" />
            <p className="text-[10px] text-gray-400 leading-tight">Official item approved by school boards for uniform standards.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
