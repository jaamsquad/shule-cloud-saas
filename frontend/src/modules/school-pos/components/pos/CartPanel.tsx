import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'sonner'
import api from '@/lib/api'
import { useCartStore } from '../../stores/cartStore'
import {
  Trash2, Plus, Minus, User, CreditCard, Smartphone,
  Wallet, Banknote, ShoppingBag, Tag, ChevronDown, Loader2
} from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'CASH',    label: 'Cash',    icon: Banknote },
  { value: 'MPESA',   label: 'M-Pesa',  icon: Smartphone },
  { value: 'CARD',    label: 'Card',    icon: CreditCard },
  { value: 'ACCOUNT', label: 'Account', icon: Wallet },
]

export default function CartPanel({ onOrderComplete }: { onOrderComplete: (order: any) => void }) {
  const cart = useCartStore()
  const [showCustomer, setShowCustomer] = useState(false)
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [stkPending, setStkPending] = useState(false)

  const subtotal = cart.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const total = Math.max(0, subtotal - cart.discount)
  const change = cart.paymentMethod === 'CASH' ? Math.max(0, cart.amountPaid - total) : 0

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: () => api.post('/orders', {
      customerName: cart.customerName || undefined,
      customerClass: cart.customerClass || undefined,
      admissionNo: cart.admissionNo || undefined,
      source: 'POS',
      paymentMethod: cart.paymentMethod,
      items: cart.items.map(i => ({ variantId: i.variantId, quantity: i.quantity, unitPrice: i.unitPrice })),
      payment: {
        method: cart.paymentMethod,
        amountPaid: cart.paymentMethod === 'CASH' ? cart.amountPaid : total,
        mpesaRef: cart.mpesaRef || undefined,
        studentAccountId: cart.studentAccountId || undefined,
        discount: cart.discount,
      },
    }),
    onSuccess: async (res) => {
      const { data: order } = res.data
      const receipt = await api.get(`/orders/${order.id}/receipt`)
      onOrderComplete(receipt.data.data)
      cart.clearCart()
      toast.success(`Order ${order.orderNumber} placed!`)
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Order failed'),
  })

  const initiateStkPush = async () => {
    if (!mpesaPhone) { toast.error('Enter phone number'); return }
    setStkPending(true)
    try {
      const res = await api.post('/payments/mpesa/initiate', {
        phoneNumber: mpesaPhone,
        amount: total,
        accountRef: `POS-${Date.now()}`,
      })
      cart.setCheckoutRequestId(res.data.data.checkoutRequestId)
      toast.success('STK Push sent — please complete on phone')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'STK Push failed')
    } finally {
      setStkPending(false)
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="w-80 xl:w-96 flex flex-col bg-gray-900 border-l border-gray-800">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
          <ShoppingBag size={18} className="text-blue-400" />
          <h2 className="font-semibold text-white">Order</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
          <ShoppingBag size={48} className="mb-4 opacity-20" />
          <p className="text-sm">Cart is empty</p>
          <p className="text-xs mt-1 text-gray-600">Tap a product to add it</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 xl:w-96 flex flex-col bg-gray-900 border-l border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-blue-400" />
          <h2 className="font-semibold text-white text-sm">Order</h2>
          <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs font-semibold">{cart.items.length} items</span>
        </div>
        <button onClick={cart.clearCart} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto py-2">
        {cart.items.map(item => (
          <div key={item.variantId} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.productName}</p>
              <p className="text-xs text-gray-400">{item.variantLabel}</p>
              <p className="text-xs text-blue-400 font-semibold">KES {item.unitPrice.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => cart.updateQty(item.variantId, item.quantity - 1)}
                className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <Minus size={11} />
              </button>
              <span className="w-6 text-center text-sm font-medium text-white">{item.quantity}</span>
              <button
                onClick={() => cart.updateQty(item.variantId, item.quantity + 1)}
                disabled={item.quantity >= item.maxStock}
                className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-40"
              >
                <Plus size={11} />
              </button>
            </div>
            <div className="text-right min-w-[64px]">
              <p className="text-sm font-bold text-white">KES {(item.unitPrice * item.quantity).toLocaleString()}</p>
              <button onClick={() => cart.removeItem(item.variantId)} className="text-red-400 hover:text-red-300 mt-0.5">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom panel */}
      <div className="border-t border-gray-800 p-4 space-y-3">
        {/* Customer */}
        <button
          onClick={() => setShowCustomer(!showCustomer)}
          className="flex items-center justify-between w-full text-sm text-gray-400 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <User size={14} />
            {cart.customerName || 'Walk-in Customer'}
          </span>
          <ChevronDown size={14} className={`transition-transform ${showCustomer ? 'rotate-180' : ''}`} />
        </button>

        {showCustomer && (
          <div className="space-y-2">
            <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500" placeholder="Customer name" value={cart.customerName}
              onChange={e => cart.setCustomer(e.target.value, cart.customerClass, cart.admissionNo)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500" placeholder="Class" value={cart.customerClass}
                onChange={e => cart.setCustomer(cart.customerName, e.target.value, cart.admissionNo)} />
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500" placeholder="Adm. No." value={cart.admissionNo}
                onChange={e => cart.setCustomer(cart.customerName, cart.customerClass, e.target.value)} />
            </div>
          </div>
        )}

        {/* Discount */}
        <div className="flex items-center gap-2">
          <Tag size={13} className="text-gray-500" />
          <input
            type="number"
            placeholder="Discount (KES)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
            value={cart.discount || ''}
            min={0}
            onChange={e => cart.setDiscount(Number(e.target.value) || 0)}
          />
        </div>

        {/* Totals */}
        <div className="bg-gray-800 rounded-lg p-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span><span className="text-white">KES {subtotal.toLocaleString()}</span>
          </div>
          {cart.discount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Discount</span><span>- KES {cart.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-700 pt-1.5">
            <span className="text-white">Total</span>
            <span className="text-blue-400">KES {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="grid grid-cols-4 gap-1">
          {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => cart.setPaymentMethod(value as any)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs transition-all ${
                cart.paymentMethod === value
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Cash: amount paid */}
        {cart.paymentMethod === 'CASH' && (
          <div className="space-y-1">
            <input
              type="number"
              placeholder={`Amount Paid (min KES ${total.toLocaleString()})`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
              value={cart.amountPaid || ''}
              min={0}
              onChange={e => cart.setAmountPaid(Number(e.target.value) || 0)}
            />
            {change > 0 && (
              <div className="flex justify-between text-sm px-1">
                <span className="text-gray-400">Change</span>
                <span className="text-green-400 font-bold">KES {change.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* M-Pesa: STK Push */}
        {cart.paymentMethod === 'MPESA' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Phone: 0722..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 flex-1"
                value={mpesaPhone}
                onChange={e => setMpesaPhone(e.target.value)}
              />
              <button
                onClick={initiateStkPush}
                disabled={stkPending}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 hover:bg-gray-700 text-xs disabled:opacity-50"
              >
                {stkPending ? <Loader2 size={14} className="animate-spin" /> : 'Push'}
              </button>
            </div>
            <input
              type="text"
              placeholder="M-Pesa reference (optional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
              value={cart.mpesaRef}
              onChange={e => cart.setMpesaRef(e.target.value)}
            />
          </div>
        )}

        {/* Place order */}
        <button
          onClick={() => placeOrder()}
          disabled={
            isPending ||
            cart.items.length === 0 ||
            (cart.paymentMethod === 'CASH' && cart.amountPaid < total)
          }
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 text-base font-semibold transition-colors disabled:opacity-50"
        >
          {isPending ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : `Charge KES ${total.toLocaleString()}`}
        </button>
      </div>
    </div>
  )
}
