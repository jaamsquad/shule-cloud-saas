import { create } from 'zustand'

export interface CartItem {
  variantId: string
  productName: string
  variantLabel: string
  unitPrice: number
  quantity: number
  maxStock: number
  imageUrl?: string
}

interface CartState {
  items: CartItem[]
  customerName: string
  customerClass: string
  admissionNo: string
  paymentMethod: 'CASH' | 'MPESA' | 'CARD' | 'ACCOUNT'
  amountPaid: number
  mpesaRef: string
  discount: number
  studentAccountId: string
  checkoutRequestId: string | null

  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQty: (variantId: string, qty: number) => void
  clearCart: () => void
  setCustomer: (name: string, cls: string, admNo?: string) => void
  setPaymentMethod: (method: CartState['paymentMethod']) => void
  setAmountPaid: (amount: number) => void
  setDiscount: (amount: number) => void
  setMpesaRef: (ref: string) => void
  setStudentAccountId: (id: string) => void
  setCheckoutRequestId: (id: string | null) => void

  get subtotal(): number
  get total(): number
  get change(): number
}

export const usePOSCartStore = create<CartState>()((set, get) => ({
  items: [],
  customerName: '',
  customerClass: '',
  admissionNo: '',
  paymentMethod: 'CASH',
  amountPaid: 0,
  mpesaRef: '',
  discount: 0,
  studentAccountId: '',
  checkoutRequestId: null,

  get subtotal() { return get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) },
  get total() { return Math.max(0, get().subtotal - get().discount) },
  get change() { return Math.max(0, get().amountPaid - get().total) },

  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.variantId === item.variantId)
    if (existing) {
      const newQty = Math.min(existing.quantity + item.quantity, item.maxStock)
      return { items: state.items.map(i => i.variantId === item.variantId ? { ...i, quantity: newQty } : i) }
    }
    return { items: [...state.items, item] }
  }),

  removeItem: (variantId) => set((s) => ({ items: s.items.filter(i => i.variantId !== variantId) })),

  updateQty: (variantId, qty) => set((s) => ({
    items: qty <= 0
      ? s.items.filter(i => i.variantId !== variantId)
      : s.items.map(i => i.variantId === variantId ? { ...i, quantity: Math.min(qty, i.maxStock) } : i),
  })),

  clearCart: () => set({
    items: [], customerName: '', customerClass: '', admissionNo: '',
    paymentMethod: 'CASH', amountPaid: 0, mpesaRef: '', discount: 0,
    studentAccountId: '', checkoutRequestId: null,
  }),

  setCustomer: (name, cls, admNo = '') => set({ customerName: name, customerClass: cls, admissionNo: admNo }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setAmountPaid: (amount) => set({ amountPaid: amount }),
  setDiscount: (amount) => set({ discount: amount }),
  setMpesaRef: (ref) => set({ mpesaRef: ref }),
  setStudentAccountId: (id) => set({ studentAccountId: id }),
  setCheckoutRequestId: (id) => set({ checkoutRequestId: id }),
}))
