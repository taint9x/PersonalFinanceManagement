import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Bot, CreditCard, DollarSign, Lock, TrendingUp, Zap, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: CreditCard,
    title: 'Quản lý nợ & tín dụng',
    desc: 'Theo dõi tất cả khoản vay, thẻ tín dụng và lịch trả nợ hàng tháng.',
  },
  {
    icon: TrendingUp,
    title: 'Theo dõi chi tiêu định kỳ',
    desc: 'Quản lý subscriptions, hóa đơn và các chi phí cố định hàng tháng.',
  },
  {
    icon: DollarSign,
    title: 'Ghi nhận nhiều nguồn thu nhập',
    desc: 'Lương, trading, freelance, thu nhập thụ động — tất cả trong một nơi.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard tổng quan theo tháng',
    desc: 'Nhìn toàn cảnh dòng tiền, biểu đồ xu hướng và phân tích chi tiết.',
  },
  {
    icon: Bot,
    title: 'Phân tích AI theo tháng',
    desc: 'Nhận phân tích thông minh và gợi ý cải thiện tài chính từ AI.',
  },
  {
    icon: Lock,
    title: 'Dữ liệu cá nhân, bảo mật JWT',
    desc: 'Dữ liệu của bạn chỉ thuộc về bạn. Self-host, không cloud bên thứ ba.',
  },
]

const steps = [
  { number: '01', title: 'Thêm dữ liệu tài chính', desc: 'Nhập các khoản thu, chi và nợ của bạn một cách dễ dàng.' },
  { number: '02', title: 'Xem dashboard theo tháng', desc: 'Xem tổng quan dòng tiền và xu hướng chi tiêu theo biểu đồ.' },
  { number: '03', title: 'Nhận phân tích AI', desc: 'Nhận phân tích chi tiết và gợi ý cải thiện tài chính từ AI.' },
]

const techStack = ['FastAPI', 'React', 'PostgreSQL', 'Redis', 'Docker', 'OpenRouter']

export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" />
            AI-Powered Personal Finance
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Quản Lý Tài Chính Cá Nhân
            <span className="block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Đơn Giản &amp; Thông Minh
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Theo dõi thu nhập, chi tiêu và khoản nợ. Nhận phân tích AI hàng tháng để cải thiện
            sức khỏe tài chính của bạn, bảo mật và hoàn toàn dưới quyền kiểm soát của bạn.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" id="hero-cta-start" className="gap-2">
              <Link to="/login">
                Bắt Đầu Ngay <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" id="hero-cta-learn">
              <a href="#features">Tìm Hiểu Thêm</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold">Tính Năng Nổi Bật</h2>
            <p className="text-muted-foreground">Mọi thứ bạn cần để quản lý tài chính cá nhân hiệu quả</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold">Cách Hoạt Động</h2>
            <p className="text-muted-foreground">3 bước đơn giản để bắt đầu</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.number} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="absolute top-6 left-[60%] hidden h-px w-[80%] bg-border sm:block" />
                )}
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary font-bold text-lg">
                  {step.number}
                </div>
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="mb-6 text-sm font-medium text-muted-foreground uppercase tracking-wider">Xây dựng với</p>
          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-card/50 to-background">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <div className="mb-4 inline-flex items-center gap-2 text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Miễn phí, thoải mái ghi chép</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold">
            Bắt đầu quản lý tài chính của bạn hôm nay
          </h2>
          <p className="mb-8 text-muted-foreground">
            Hoàn toàn miễn phí, và bảo mật. Dữ liệu của bạn luôn thuộc về bạn.
          </p>
          <Button asChild size="lg" className="gap-2" id="final-cta-btn">
            <Link to="/login">
              Đăng Nhập / Vào Ứng Dụng <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
