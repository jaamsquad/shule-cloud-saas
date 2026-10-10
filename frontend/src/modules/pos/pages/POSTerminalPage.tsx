import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import posApi from '../lib/posApi'
import { usePOSAuthStore } from '../stores/posAuthStore'
import { usePOSCartStore } from '../stores/posCartStore'
import { Search, ArrowLeft, Tag, Layers, RefreshCw, AlertTriangle, X, Plus, Minus, Trash2, LogOut, ShoppingCart, Shirt, BookOpen, Trophy, ShoppingBag } from 'lucide-react'

interface Variant { id: string; size: string | null; color: string | null; stock: number; price: number }
interface Product { id: string; name: string; description: string | null; imageUrl: string | null; variants: Variant[]; category: { id: string; name: string } }
interface Category { id: string; name: string }

export default function POSTerminalPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH'|'MPESA'|'CARD'|'ACCOUNT'>('CASH')
  const [customerName, setCustomerName] = useState('')
  const [amountPaid, setAmountPaid] = useState(0)
  const [processing, setProcessing] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { posUser, posLogout } = usePOSAuthStore()
  const { items, addItem, removeItem, updateQty, clearCart } = usePOSCartStore()

  useEffect(() => { searchRef.current?.focus() }, [])

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const change = Math.max(0, amountPaid - subtotal)

  const { data: catData } = useQuery({
    queryKey: ['pos-terminal-cats'],
    queryFn: () => posApi.get('/categories').then(r => r.data.data as Category[]),
  })

  const { data: productData, isLoading, refetch } = useQuery({
    queryKey: ['pos-terminal-products', search, categoryId],
    queryFn: () => posApi.get('/products', { params: { search: search || undefined, category: categoryId || undefined, limit: 80 } }).then(r => r.data.data as Product[]),
    staleTime: 0,
  })

  const products = productData || []

  const handleAddToCart = useCallback((product: Product, variant: Variant) => {
    if (variant.stock < 1) { toast.error('Out of stock'); return }
    addItem({ variantId: variant.id, productName: product.name, variantLabel: variant.size || variant.color || 'One Size', unitPrice: Number(variant.price), quantity: 1, maxStock: variant.stock })
    toast.success(`${product.name} added`, { duration: 700 })
  }, [addItem])

  const handleCheckout = async () => {
    if (items.length === 0) { toast.error('Cart is empty'); return }
    if (paymentMethod === 'CASH' && amountPaid < subtotal) { toast.error('Amount paid is less than total'); return }
    setProcessing(true)
    try {
      const { data } = await posApi.post('/orders', {
        items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity, unitPrice: i.unitPrice })),
        customerName: customerName || 'Walk-in',
        paymentMethod,
        amountPaid: paymentMethod === 'CASH' ? amountPaid : subtotal,
        source: 'POS',
      })
      toast.success(`Order ${data.data.orderNumber} complete!`)
      clearCart()
      setCustomerName('')
      setAmountPaid(0)
      refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Checkout failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
      {/* LEFT — Products */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/pos/admin')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input ref={searchRef} type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"><RefreshCw size={16} /></button>
          <span className="text-xs text-gray-500 hidden lg:block">Cashier: <span className="text-white font-medium">{posUser?.name}</span></span>
          <button onClick={() => { posLogout(); navigate('/pos/login') }} className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><LogOut size={16} /></button>
        </div>

        {/* Category tabs */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <button onClick={() => setCategoryId('')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${!categoryId ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <Layers size={12} /> All
          </button>
          {catData?.map(c => (
            <button key={c.id} onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${categoryId === c.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <Tag size={12} /> {c.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 20 }).map((_, i) => <div key={i} className="h-36 bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <AlertTriangle size={32} className="mb-3" />
              <p>No products found</p>
              {search && <button onClick={() => setSearch('')} className="mt-2 text-sm text-indigo-400 hover:text-indigo-300">Clear search</button>}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map(product => <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />)}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Cart */}
      <div className="w-80 flex flex-col bg-gray-900 border-l border-gray-800 shrink-0">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <ShoppingCart size={16} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Cart</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400">{items.length} items</span>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <ShoppingCart size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Click products to add them</p>
            </div>
          ) : items.map(item => (
            <div key={item.variantId} className="bg-gray-800 rounded-xl p-3 flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{item.productName}</p>
                <p className="text-[10px] text-gray-500">{item.variantLabel}</p>
                <p className="text-xs font-bold text-indigo-400 mt-0.5">KES {(item.unitPrice * item.quantity).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateQty(item.variantId, item.quantity - 1)} className="w-6 h-6 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600"><Minus size={10} /></button>
                <span className="text-xs font-bold text-white w-5 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.variantId, item.quantity + 1)} disabled={item.quantity >= item.maxStock} className="w-6 h-6 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-600 disabled:opacity-40"><Plus size={10} /></button>
                <button onClick={() => removeItem(item.variantId)} className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 ml-0.5"><Trash2 size={10} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Customer & Payment */}
        <div className="border-t border-gray-800 p-3 space-y-3">
          <input type="text" placeholder="Customer name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />

          <div className="grid grid-cols-2 gap-1.5">
            {(['CASH', 'MPESA', 'CARD', 'ACCOUNT'] as const).map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${paymentMethod === m ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>

          {paymentMethod === 'CASH' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount Paid (KES)</label>
              <input type="number" min={0} value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              {amountPaid > 0 && (
                <p className="text-xs text-emerald-400 mt-1 font-medium">Change: KES {change.toLocaleString()}</p>
              )}
            </div>
          )}

          <div className="bg-gray-800 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-xs text-gray-400"><span>Subtotal</span><span className="text-white font-medium">KES {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm font-bold text-white border-t border-gray-700 pt-1.5"><span>Total</span><span className="text-indigo-400">KES {subtotal.toLocaleString()}</span></div>
          </div>

          <div className="flex gap-2">
            <button onClick={clearCart} className="flex-none px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-400 hover:text-white transition-colors">
              Clear
            </button>
            <button onClick={handleCheckout} disabled={processing || items.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {processing ? 'Processing…' : `Charge KES ${subtotal.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product, v: Variant) => void }) {
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id || '')
  const selectedVariant = product.variants.find(v => v.id === selectedVariantId) || product.variants[0]
  const outOfStock = !selectedVariant || selectedVariant.stock < 1
  const lowStock = selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5

  return (
    <div onClick={() => !outOfStock && selectedVariant && onAdd(product, selectedVariant)}
      className={`bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:border-indigo-500/50 hover:bg-gray-800 transition-all ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="h-20 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          : (() => {
              const cat = product.category.name.toLowerCase()
              const CategoryIcon = cat.includes('uniform') ? Shirt : cat.includes('station') ? BookOpen : cat.includes('sport') ? Trophy : ShoppingBag
              return <CategoryIcon className="w-8 h-8 text-slate-400" />
            })()}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-white leading-tight line-clamp-2">{product.name}</p>
        <p className="text-indigo-400 font-bold text-sm mt-0.5">KES {Number(selectedVariant?.price || 0).toLocaleString()}</p>
      </div>
      {product.variants.length > 1 && (
        <select value={selectedVariantId} onChange={e => { e.stopPropagation(); setSelectedVariantId(e.target.value) }} onClick={e => e.stopPropagation()}
          className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1 text-white w-full focus:outline-none">
          {product.variants.map(v => <option key={v.id} value={v.id}>{v.size || v.color || 'Default'} ({v.stock})</option>)}
        </select>
      )}
      <div className={`text-xs px-1.5 py-0.5 rounded text-center font-medium ${outOfStock ? 'bg-red-500/20 text-red-400' : lowStock ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
        {outOfStock ? 'Out of stock' : lowStock ? `Only ${selectedVariant.stock} left` : `${selectedVariant.stock} in stock`}
      </div>
    </div>
  )
}
