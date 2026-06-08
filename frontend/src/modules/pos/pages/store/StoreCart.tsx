import { Link } from 'react-router-dom'
import { usePOSCartStore } from '../../stores/posCartStore'
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react'

export default function StoreCart() {
  const cart = usePOSCartStore()

  const subtotal = cart.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  if (cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6 bg-gray-950 min-h-screen text-gray-100">
        <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto border border-gray-800">
          <ShoppingBag size={32} className="text-gray-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Your Cart is Empty</h2>
          <p className="text-gray-500 text-sm">Add school uniforms or textbooks to get started.</p>
        </div>
        <Link to="/store/products" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all">
          Explore Catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 bg-gray-950 min-h-screen text-gray-100">
      <h1 className="text-2xl font-extrabold text-white">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          {cart.items.map(item => (
            <div key={item.variantId} className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-3xl shrink-0">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover rounded-xl" /> : '👕'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm line-clamp-1">{item.productName}</h3>
                  <p className="text-xs text-gray-400">{item.variantLabel}</p>
                  <p className="text-indigo-400 font-extrabold text-xs mt-1">KES {item.unitPrice.toLocaleString()}</p>
                </div>
              </div>

              {/* Qty Controls */}
              <div className="flex items-center gap-6 justify-between w-full sm:w-auto border-t border-gray-800 pt-3 sm:pt-0 sm:border-0">
                <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg p-1">
                  <button onClick={() => cart.updateQty(item.variantId, item.quantity - 1)} className="w-6 h-6 rounded hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center">
                    <Minus size={11} />
                  </button>
                  <span className="w-8 text-center text-xs font-semibold text-white">{item.quantity}</span>
                  <button onClick={() => cart.updateQty(item.variantId, item.quantity + 1)} disabled={item.quantity >= item.maxStock} className="w-6 h-6 rounded hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center disabled:opacity-40">
                    <Plus size={11} />
                  </button>
                </div>

                <div className="text-right min-w-[80px]">
                  <p className="text-sm font-bold text-white">KES {(item.unitPrice * item.quantity).toLocaleString()}</p>
                  <button onClick={() => cart.removeItem(item.variantId)} className="text-red-400 hover:text-red-300 text-xs mt-1 inline-flex items-center gap-1">
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cart Summary</h2>
          <div className="border-y border-gray-850 py-3 space-y-1.5 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Subtotal</span><span className="text-white">KES {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span><span className="text-emerald-400 font-semibold">FREE (Pickup)</span>
            </div>
          </div>

          <div className="flex justify-between font-bold text-white text-base">
            <span>Total</span>
            <span className="text-indigo-400">KES {subtotal.toLocaleString()}</span>
          </div>

          <Link to="/store/checkout" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all">
            Proceed to Checkout <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
