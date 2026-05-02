import { Target, Lock, Bot, Rocket, Github, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

const principles = [
  { icon: Target, title: 'Đơn giản', desc: 'Không phức tạp hóa việc quản lý tiền. Giao diện trực quan, dữ liệu rõ ràng.' },
  { icon: Lock, title: 'Riêng tư', desc: 'Dữ liệu lưu trên hệ thống của bạn, không cloud bên thứ ba. Hoàn toàn self-hosted.' },
  { icon: Bot, title: 'Thông minh', desc: 'AI hỗ trợ phân tích, không thay thế quyết định của bạn. Gợi ý hành động cụ thể.' },
  { icon: Rocket, title: 'Mở rộng được', desc: 'Docker Compose, dễ dàng self-host và tùy chỉnh theo nhu cầu của bạn.' },
]

const techDetails = [
  { name: 'FastAPI', desc: 'Backend hiệu năng cao, async/await, tài liệu API tự động.' },
  { name: 'React 18', desc: 'UI hiện đại với Vite, TypeScript và React Query.' },
  { name: 'PostgreSQL', desc: 'Cơ sở dữ liệu quan hệ mạnh mẽ, lưu trữ số tiền chính xác.' },
  { name: 'Redis', desc: 'Cache layer cho dashboard và phân tích AI, giảm tải database.' },
  { name: 'Docker', desc: 'Triển khai dễ dàng với Docker Compose, tất cả trong một file.' },
  { name: 'OpenRouter', desc: 'Kết nối với nhiều mô hình AI (Claude, GPT...) để phân tích tài chính.' },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      {/* Page Header */}
      <div className="mb-16 text-center">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight">Về Dự Án</h1>
        <p className="text-lg text-muted-foreground">
          Một công cụ quản lý tài chính cá nhân — đơn giản, bảo mật, và thông minh.
        </p>
      </div>

      {/* Project Story */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">Câu Chuyện Dự Án</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Dự án này ra đời từ nhu cầu thực tế: tôi cần một công cụ để theo dõi nhiều nguồn thu nhập,
            quản lý các khoản vay và subscription, và hiểu rõ hơn về dòng tiền hàng tháng của mình.
            Các ứng dụng tài chính hiện tại hoặc quá phức tạp, hoặc lưu dữ liệu lên cloud của họ.
          </p>
          <p>
            FinyTrack giải quyết những vấn đề đó: giao diện đơn giản, tập trung vào các chức năng
            cốt lõi, và tất cả dữ liệu chạy trên hạ tầng của chính bạn. Không có quảng cáo,
            không theo dõi, không cloud bên thứ ba.
          </p>
          <p>
            Triết lý thiết kế: <em>"Đủ đơn giản để dùng hàng ngày, đủ thông minh để giúp bạn ra quyết định tốt hơn."</em>{' '}
            AI được tích hợp như một công cụ hỗ trợ, không phải trung tâm — bạn luôn kiểm soát dữ liệu
            và quyết định cuối cùng.
          </p>
        </div>
      </section>

      {/* Goals & Principles */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">Mục Tiêu &amp; Nguyên Tắc</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {principles.map((p) => (
            <div key={p.title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <p.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold">Công Nghệ Sử Dụng</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Công nghệ</th>
                <th className="px-4 py-3 text-left font-medium">Vai trò</th>
              </tr>
            </thead>
            <tbody>
              {techDetails.map((tech, i) => (
                <tr key={tech.name} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="px-4 py-3 font-medium">{tech.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tech.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Author Block */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold">Tác Giả</h2>
        <p className="mb-4 text-muted-foreground">
          Dự án được xây dựng bởi một developer với niềm đam mê về personal finance.
          Nếu bạn thấy dự án hữu ích hoặc có góp ý, tôi rất muốn nghe từ bạn!
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm hover:border-primary/30 hover:bg-accent transition-colors"
            id="about-github-link"
          >
            <Github className="h-4 w-4" />
            GitHub Repository
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm hover:border-primary/30 hover:bg-accent transition-colors"
            id="about-contact-link"
          >
            <Mail className="h-4 w-4" />
            Liên Hệ
          </Link>
        </div>
      </section>
    </div>
  )
}
