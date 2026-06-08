import { Outlet, NavLink } from 'react-router-dom'
import { ShoppingCart, Store, Package } from 'lucide-react'
import { usePOSCartStore } from '../stores/posCartStore'

export default function StoreLayout() {
  const items = usePOSCartStore(s => s.items)
  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/store" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">School Store</span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/store" end className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-indigo-400 font-semibold' : 'text-gray-400 hover:text-white'}`}>
              Home
            </NavLink>
            <NavLink to="/store/products" className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-indigo-400 font-semibold' : 'text-gray-400 hover:text-white'}`}>
              <Package size={14} className="inline mr-1" />Products
            </NavLink>
          </nav>

          <NavLink to="/store/cart" className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 text-sm font-medium transition-all">
            <ShoppingCart size={16} />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </NavLink>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} School Store. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
