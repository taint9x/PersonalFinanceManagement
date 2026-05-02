import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Github, Clock, CheckCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  name: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  subject: z.string().optional(),
  message: z.string().min(10, 'Nội dung tối thiểu 10 ký tự'),
})
type FormData = z.infer<typeof schema>

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      // Fallback to mailto since there's no /contact endpoint in the spec
      const subject = encodeURIComponent(data.subject || 'Liên hệ từ FinyTrack')
      const body = encodeURIComponent(`Từ: ${data.name} (${data.email})\n\n${data.message}`)
      window.open(`mailto:your@email.com?subject=${subject}&body=${body}`)
      setSubmitted(true)
    } catch {
      toast({ title: 'Có lỗi xảy ra', description: 'Vui lòng thử lại sau.', variant: 'destructive' })
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center sm:px-6">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="mb-3 text-2xl font-bold">Cảm ơn bạn!</h2>
        <p className="mb-8 text-muted-foreground">Tôi sẽ phản hồi sớm nhất có thể.</p>
        <button
          className="text-sm text-primary hover:underline"
          onClick={() => { setSubmitted(false); reset() }}
          id="contact-send-another"
        >
          Gửi tin khác
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight">Liên Hệ</h1>
        <p className="text-lg text-muted-foreground">
          Có câu hỏi hoặc đề xuất? Hãy liên hệ với tôi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" id="contact-form">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Họ và tên *</Label>
                  <Input id="contact-name" placeholder="Nguyễn Văn A" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email *</Label>
                  <Input id="contact-email" type="email" placeholder="email@example.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Chủ đề</Label>
                <Input id="contact-subject" placeholder="Chủ đề tin nhắn (không bắt buộc)" {...register('subject')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Nội dung *</Label>
                <Textarea
                  id="contact-message"
                  placeholder="Nội dung tin nhắn của bạn..."
                  rows={6}
                  {...register('message')}
                />
                {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
              </div>
              <Button type="submit" className="w-full gap-2" loading={isSubmitting} id="contact-submit">
                <Send className="h-4 w-4" />
                Gửi Tin Nhắn
              </Button>
            </form>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">your@email.com</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Github className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">GitHub</p>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  id="contact-github-link"
                >
                  github.com/your-repo
                </a>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Thời gian phản hồi</p>
                <p className="text-sm text-muted-foreground">Trong vòng 1–3 ngày làm việc</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
