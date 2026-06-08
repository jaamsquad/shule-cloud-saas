import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import posApi from '../../lib/posApi'
import { usePOSCartStore } from '../../stores/posCartStore'
import { Loader2 } from 'lucide-react'

export default function StoreCheckout() {
  const cart = usePOSCartStore()
  const navigate = useNavigate()

  // Form states
  const [parentName, setParentName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [admissionNo, setAdmissionNo] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [collectionMethod, setCollectionMethod] = useState<'PICKUP' | 'CLASS_DELIVERY'>('PICKUP')

  const total = cart.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: (mpesaRef?: string) => posApi.post('/store/orders', {
      customerName: parentName,
      customerClass: studentClass || undefined,
      admissionNo: admissionNo || undefined,
      parentPhone: parentPhone || undefined,
      collectionMethod,
      paymentMethod: 'MPESA',
      mpesaRef,
      items: cart.items.map(i => ({ variantId: i.variantId, quantity: i.quantity, unitPrice: i.unitPrice })),
    }),
    onSuccess: (res) => {
      const order = res.data.data
      toast.success('Order placed successfully!')
      cart.clearCart()
      navigate(`/store/orders/${order.orderNumber}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to place order')
    },
  })

  // Optional M-Pesa STK Push flow
  const [stkPending, setStkPending] = useState(false)
  const handleStkPush = async () => {
    if (!parentPhone || !parentName) {
      toast.error('Name and Phone number are required')
      return
    }
    setStkPending(true)
    try {
      const res = await posApi.post('/payments/mpesa/initiate', {
        phoneNumber: parentPhone,
        amount: total,
        accountRef: parentName.slice(0, 10),
      })
      placeOrder(res.data.data.checkoutRequestId)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'STK Push failed')
    } finally {
      setStkPending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentName) {
      toast.error('Customer/Parent name is required')
      return
    }
    if (parentPhone) {
      handleStkPush()
    } else {
      placeOrder()
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 bg-gray-950 min-h-screen text-gray-100">
      <h1 className="text-2xl font-extrabold text-white">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Checkout Form */}
        <div className="lg:col-span-8 bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Student & Collection Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Parent / Guardian Name *</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. John Doe"
                value={parentName}
                onChange={e => setParentName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Parent M-Pesa Phone (07xx...)</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                type="tel"
                placeholder="0722000000"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Student Class / Form</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. Form 3 West"
                value={studentClass}
                onChange={e => setStudentClass(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Student Admission Number</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="ADM-1049"
                value={admissionNo}
                onChange={e => setAdmissionNo(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-gray-850 pt-4 space-y-3">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Collection Preference</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => setCollectionMethod('PICKUP')}
                className={`flex-1 py-3 px-4 border rounded-xl text-left transition-all ${
                  collectionMethod === 'PICKUP'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                    : 'border-gray-800 bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <p className="text-xs font-bold text-white">Collect from Store Window</p>
                <p className="text-[10px] text-gray-500 mt-1">Available next business day.</p>
              </button>
              <button
                type="button"
                onClick={() => setCollectionMethod('CLASS_DELIVERY')}
                className={`flex-1 py-3 px-4 border rounded-xl text-left transition-all ${
                  collectionMethod === 'CLASS_DELIVERY'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                    : 'border-gray-800 bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <p className="text-xs font-bold text-white">Deliver to Student's Class</p>
                <p className="text-[10px] text-gray-500 mt-1">Delivered directly during rollcall.</p>
              </button>
            </div>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Order Summary</h2>

          <div className="border-y border-gray-850 py-3 space-y-2 text-xs text-gray-400">
            {cart.items.map(item => (
              <div key={item.variantId} className="flex justify-between">
                <span>{item.productName.slice(0, 18)}... × {item.quantity}</span>
                <span className="text-white font-medium">KES {(item.unitPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between font-bold text-white text-base">
            <span>Total</span>
            <span className="text-indigo-400">KES {total.toLocaleString()}</span>
          </div>

          <button
            type="submit"
            disabled={isPending || stkPending || cart.items.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || stkPending ? (
              <><Loader2 size={16} className="animate-spin" /> Processing Payment...</>
            ) : (
              <>Pay with M-Pesa (STK Push)</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
