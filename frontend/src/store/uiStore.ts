import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format } from 'date-fns'

interface UIState {
  selectedPeriod: string // YYYY-MM
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  setSelectedPeriod: (period: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedPeriod: format(new Date(), 'yyyy-MM'),
      sidebarOpen: true,
      theme: 'dark',

      setSelectedPeriod: (period: string) => set({ selectedPeriod: period }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)
