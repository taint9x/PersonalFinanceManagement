import { Link, useLocation } from 'react-router-dom'
import { Menu, X, TrendingUp, Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Trang Chủ', href: '/' },
  { label: 'Giới Thiệu', href: '/about' },
  { label: 'Liên Hệ', href: '/contact' },
]

export function PublicNavbar() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const { theme, toggleTheme } = useUIStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" id="public-nav-logo">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">FinyTrack</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                location.pathname === link.href
                  ? 'text-primary underline underline-offset-4'
                  : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            id="public-nav-theme-btn"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {isAuthenticated ? (
            <Button asChild size="sm" id="public-nav-enter-app">
              <Link to="/app/dashboard">Vào Ứng Dụng</Link>
            </Button>
          ) : (
            <Button asChild size="sm" id="public-nav-login">
              <Link to="/login">Đăng Nhập</Link>
            </Button>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            id="public-nav-mobile-theme-btn"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            id="public-nav-mobile-toggle"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname === link.href
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <Button asChild className="mt-2" id="public-nav-mobile-enter-app">
                <Link to="/app/dashboard" onClick={() => setMobileOpen(false)}>
                  Vào Ứng Dụng
                </Link>
              </Button>
            ) : (
              <Button asChild className="mt-2" id="public-nav-mobile-login">
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  Đăng Nhập
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
