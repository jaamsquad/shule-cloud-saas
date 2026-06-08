import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

export default function POSTerminalLayout() {
  return (
    <div className="h-screen bg-gray-950 overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' } }} />
      <Outlet />
    </div>
  )
}
