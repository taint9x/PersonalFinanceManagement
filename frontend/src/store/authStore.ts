import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  accessToken: string | null
  user: User | null
  setToken: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,

      setToken: (token: string, user: User) => {
        set({ accessToken: token, user })
      },

      logout: () => {
        set({ accessToken: null, user: null })
      },

      isAuthenticated: () => {
        return get().accessToken !== null
      },
    }),
    {
      name: 'finance-auth-storage',
    }
  )
)
