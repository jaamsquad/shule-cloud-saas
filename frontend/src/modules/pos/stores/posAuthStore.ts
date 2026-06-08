import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type POSRole = 'ADMIN' | 'CASHIER' | 'CUSTOMER'

interface POSUser {
  id: string
  name: string
  email: string
  role: POSRole
  studentId?: string
  classId?: string
}

interface POSAuthState {
  posUser: POSUser | null
  posToken: string | null
  isPOSAuthenticated: boolean
  posLogin: (user: POSUser, token: string) => void
  posLogout: () => void
}

export const usePOSAuthStore = create<POSAuthState>()(
  persist(
    (set) => ({
      posUser: null,
      posToken: null,
      isPOSAuthenticated: false,
      posLogin: (user, token) => set({ posUser: user, posToken: token, isPOSAuthenticated: true }),
      posLogout: () => set({ posUser: null, posToken: null, isPOSAuthenticated: false }),
    }),
    { name: 'pos-auth-storage' }
  )
)
