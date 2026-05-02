import { cn } from '@/lib/utils'

type StatusVariant = 'active' | 'paid_off' | 'paused' | 'income' | 'expense' | 'debt'

const statusConfig: Record<StatusVariant, { label: string; className: string }> = {
  active: { label: 'Hoạt động', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  paid_off: { label: 'Đã trả xong', className: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  paused: { label: 'Tạm dừng', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  income: { label: 'Thu nhập', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  expense: { label: 'Chi tiêu', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  debt: { label: 'Khoản nợ', className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
}

interface StatusBadgeProps {
  status: StatusVariant
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

interface TypeBadgeProps {
  label: string
  variant?: 'blue' | 'purple' | 'teal' | 'green' | 'orange' | 'rose' | 'slate'
  className?: string
}

const variantClasses = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export function TypeBadge({ label, variant = 'slate', className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {label}
    </span>
  )
}
