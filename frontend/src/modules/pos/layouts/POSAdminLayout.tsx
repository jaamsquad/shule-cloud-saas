import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { usePOSAuthStore } from '../stores/posAuthStore'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  BarChart3, Users, LogOut, Store, Terminal,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'

const nav = [
  { to: '/pos/admin',           label: 'Dashboard',       icon: LayoutDashboard, exact: true },
  { to: '/pos/terminal',        label: 'POS Terminal',     icon: Terminal },
  { to: '/pos/admin/orders',    label: 'Orders',           icon: ShoppingCart },
  { to: '/pos/admin/products',  label: 'Products',         icon: Package },
  { to: '/pos/admin/inventory', label: 'Inventory',        icon: Warehouse },
  { to: '/pos/admin/reports',   label: 'Reports',          icon: BarChart3 },
  { to: '/pos/admin/accounts',  label: 'Student Accounts', icon: Users },
  { to: '/pos/store',           label: 'Online Store',     icon: Store },
]

export default function POSAdminLayout() {
  const { posUser, posLogout } = usePOSAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { posLogout(); navigate('/pos/login') }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' } }} />

      {/* Sidebar */}
      <aside className="w-60 flex flex-col bg-gray-900 border-r border-gray-800 shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white leading-none">School Store</p>
              <p className="text-xs text-gray-500 mt-0.5">POS Management</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{posUser?.name}</p>
            <p className="text-xs text-gray-500 truncate">{posUser?.email}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              {posUser?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
