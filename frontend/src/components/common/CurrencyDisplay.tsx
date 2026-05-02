import { cn } from '@/lib/utils'
import { formatVND, formatVNDCompact } from '@/utils/currency'

interface CurrencyDisplayProps {
  amount: number
  variant?: 'income' | 'expense' | 'debt' | 'neutral' | 'auto'
  compact?: boolean
  className?: string
  showSign?: boolean
}

/**
 * Displays a VND amount with optional color coding.
 * variant="auto" colors green if positive, red if negative.
 */
export function CurrencyDisplay({
  amount,
  variant = 'neutral',
  compact = false,
  className,
  showSign = false,
}: CurrencyDisplayProps) {
  const formatted = compact ? formatVNDCompact(amount) : formatVND(amount)
  const display = showSign && amount > 0 ? `+${formatted}` : formatted

  const colorClass = {
    income: 'text-emerald-400',
    expense: 'text-rose-400',
    debt: 'text-orange-400',
    neutral: 'text-foreground',
    auto: amount >= 0 ? 'text-emerald-400' : 'text-rose-400',
  }[variant]

  return <span className={cn('font-semibold tabular-nums', colorClass, className)}>{display}</span>
}
