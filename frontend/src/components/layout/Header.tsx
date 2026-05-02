import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CreditCard, ShoppingCart, Wallet, Bot, LogOut, Sun, Moon } from 'lucide-react'
import { MonthPicker } from '@/components/common/MonthPicker'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { toast } from '@/hooks/useToast'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app/dashboard' },
  { icon: CreditCard, label: 'Nợ', href: '/app/debts' },
  { icon: ShoppingCart, label: 'Chi', href: '/app/expenses' },
  { icon: Wallet, label: 'Thu', href: '/app/incomes' },
  { icon: Bot, label: 'AI', href: '/app/ai' },
]

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()

  const handleLogout = () => {
    logout()
    toast({ title: 'Đã đăng xuất' })
    navigate('/login')
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4">
        <MonthPicker />
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            id="header-theme-btn"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            id="header-logout-btn"
          >
            <LogOut className="h-3.5 w-3.5" />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card md:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
              id={`mobile-nav-${item.href.split('/').pop()}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
