import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { TrendingUp, Lock, User, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { toast } from '@/hooks/useToast'
import { PublicNavbar } from '@/components/layout/PublicNavbar'

const schema = z.object({
  username: z.string().min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setToken, isAuthenticated } = useAuthStore()
  const [isRegister, setIsRegister] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ 
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
      email: '',
    }
  })

  if (isAuthenticated()) {
    return <Navigate to="/app/dashboard" replace />
  }

  const onSubmit = async (data: FormData) => {
    try {
      if (isRegister) {
        await authApi.register(data.username, data.password, data.email || undefined)
        toast({ 
          title: 'Đăng ký thành công', 
          description: 'Bây giờ bạn có thể đăng nhập bằng tài khoản vừa tạo.',
          variant: 'default' 
        })
        setIsRegister(false)
        reset()
      } else {
        const token = await authApi.login(data.username, data.password)
        // Set token first so subsequent requests (like me()) can use it in headers
        useAuthStore.setState({ accessToken: token.access_token })

        const user = await authApi.me()
        setToken(token.access_token, user)
        toast({ title: 'Đăng nhập thành công', variant: 'default' })
        navigate('/app/dashboard', { replace: true })
      }
    } catch (err: any) {
      let description = isRegister ? 'Không thể đăng ký tài khoản.' : 'Sai tên đăng nhập hoặc mật khẩu.'
      const detail = err?.response?.data?.detail

      if (detail) {
        if (typeof detail === 'string') {
          description = detail
        } else if (Array.isArray(detail) && detail.length > 0) {
          description = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        } else if (typeof detail === 'object' && detail.detail) {
          description = detail.detail
        }
      }

      toast({
        title: isRegister ? 'Đăng ký thất bại' : 'Đăng nhập thất bại',
        description,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">FinyTrack</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập để tiếp tục'}
              </p>
            </div>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" id="auth-form">
              <div className="space-y-2">
                <Label htmlFor="auth-username">Tên đăng nhập</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-username"
                    className="pl-9"
                    placeholder="username"
                    autoComplete="username"
                    {...register('username')}
                  />
                </div>
                {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
              </div>

              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email (Tùy chọn)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-email"
                      type="email"
                      className="pl-9"
                      placeholder="name@example.com"
                      autoComplete="email"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="auth-password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-password"
                    type="password"
                    className="pl-9"
                    placeholder="••••••••"
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    {...register('password')}
                  />
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" loading={isSubmitting} id="auth-submit-btn">
                {isRegister ? 'Đăng Ký' : 'Đăng Nhập'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister)
                  reset()
                }}
                className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
