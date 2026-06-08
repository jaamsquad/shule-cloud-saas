import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { X, Printer, Check } from 'lucide-react'
import { format } from 'date-fns'

interface ReceiptData {
  orderNumber: string
  date: string
  cashierName: string
  customerName: string
  customerClass?: string
  items: { name: string; variant: string; qty: number; unitPrice: number; subtotal: number }[]
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  change: number
  paymentMethod: string
  mpesaRef?: string
  status: string
}

export default function ReceiptModal({ order, onClose }: { order: ReceiptData; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: receiptRef })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check size={16} className="text-green-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Order Complete</p>
              <p className="text-xs text-gray-500">{order.orderNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        {/* Receipt preview */}
        <div id="receipt" ref={receiptRef} className="p-5 font-mono text-xs text-gray-200 space-y-2">
          <div className="text-center border-b border-dashed border-gray-700 pb-3 mb-3">
            <p className="font-bold text-base text-white">SCHOOL STORE</p>
            <p className="text-gray-400">Official School Supplies</p>
            <p className="text-gray-500 text-xs mt-1">{format(new Date(order.date), 'dd MMM yyyy, HH:mm')}</p>
          </div>

          <div className="flex justify-between text-gray-400">
            <span>Cashier:</span><span className="text-white">{order.cashierName}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Customer:</span><span className="text-white">{order.customerName}</span>
          </div>
          {order.customerClass && (
            <div className="flex justify-between text-gray-400">
              <span>Class:</span><span className="text-white">{order.customerClass}</span>
            </div>
          )}

          <div className="border-t border-dashed border-gray-700 pt-3 mt-3 space-y-2">
            {order.items.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between">
                  <span className="text-white font-medium">{item.name}</span>
                  <span className="text-white">KES {item.subtotal.toLocaleString()}</span>
                </div>
                <div className="text-gray-500 pl-2">
                  {item.variant} × {item.qty} @ {item.unitPrice.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-700 pt-3 mt-3 space-y-1.5">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span><span>KES {order.subtotal.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount</span><span>- KES {order.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white text-sm border-t border-gray-700 pt-1.5">
              <span>TOTAL</span><span>KES {order.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Paid ({order.paymentMethod})</span><span>KES {order.amountPaid.toLocaleString()}</span>
            </div>
            {order.change > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Change</span><span>KES {order.change.toLocaleString()}</span>
              </div>
            )}
            {order.mpesaRef && (
              <div className="flex justify-between text-gray-400">
                <span>M-Pesa Ref</span><span>{order.mpesaRef}</span>
              </div>
            )}
          </div>

          <div className="text-center border-t border-dashed border-gray-700 pt-3 mt-3 text-gray-500">
            <p>Thank you for your purchase!</p>
            <p className="text-gray-600 mt-1">Ref: {order.orderNumber}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-800">
          <button onClick={() => handlePrint()} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 hover:bg-gray-700 text-xs text-white flex items-center justify-center gap-1">
            <Printer size={15} /> Print Receipt
          </button>
          <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-xs flex items-center justify-center font-bold">
            New Order
          </button>
        </div>
      </div>
    </div>
  )
}
