import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CreditCard,
  ShoppingCart,
  Wallet,
  Bot,
  LogOut,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  User,
  CalendarRange,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/useToast'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app/dashboard' },
  { icon: CalendarRange, label: 'Tổng Quan Tháng', href: '/app/overview' },
  { icon: CreditCard, label: 'Khoản Nợ', href: '/app/debts' },
  { icon: ShoppingCart, label: 'Chi Tiêu', href: '/app/expenses' },
  { icon: Wallet, label: 'Thu Nhập', href: '/app/incomes' },
  { icon: Bot, label: 'Phân Tích AI', href: '/app/ai' },
]

const bottomNavItems = [
  { icon: Bell, label: 'Lịch Sử Báo Cáo', href: '/app/notifications' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()

  const handleLogout = () => {
    logout()
    toast({ title: 'Đã đăng xuất', variant: 'default' })
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'relative hidden flex-col border-r border-border bg-card transition-all duration-300 md:flex',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b border-border px-4', sidebarOpen ? 'gap-2' : 'justify-center')}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
          <TrendingUp className="h-5 w-5 text-primary-foreground" />
        </div>
        {sidebarOpen && <span className="text-base font-bold">FinyTrack</span>}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        id="sidebar-collapse-btn"
        aria-label={sidebarOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
      >
        {sidebarOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 p-2 pt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              id={`sidebar-nav-${item.href.split('/').pop()}`}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                !sidebarOpen && 'justify-center px-2'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* Bottom nav items — shown above logout */}
        <div className="mt-auto">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                id={`sidebar-nav-${item.href.split('/').pop()}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  !sidebarOpen && 'justify-center px-2'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User & Logout */}
      <div className="border-t border-border p-2 pb-4">
        {sidebarOpen && user && (
          <div className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/50">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.username}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={sidebarOpen ? 'sm' : 'icon'}
          className={cn('text-muted-foreground hover:text-foreground w-full', !sidebarOpen && 'h-10 w-10')}
          onClick={handleLogout}
          id="sidebar-logout-btn"
          title={!sidebarOpen ? 'Đăng xuất' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {sidebarOpen && <span className="ml-2">Đăng Xuất</span>}
        </Button>
      </div>
    </aside>
  )
}
