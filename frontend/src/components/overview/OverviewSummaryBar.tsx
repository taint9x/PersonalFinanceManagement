import { TrendingUp, TrendingDown, CreditCard, ArrowUpDown } from 'lucide-react'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import type { OverviewSummary } from '@/types/monthlyOverview'

interface Props {
  summary?: OverviewSummary
  loading?: boolean
}

function StatChip({
  label,
  value,
  icon: Icon,
  variant,
  loading,
}: {
  label: string
  value: string
  icon: React.ElementType
  variant: 'income' | 'expense' | 'debt' | 'auto'
  loading?: boolean
}) {
  const numValue = Number(value)
  const colorClass =
    variant === 'income'
      ? 'text-emerald-400'
      : variant === 'expense'
        ? 'text-rose-400'
        : variant === 'debt'
          ? 'text-orange-400'
          : numValue >= 0
            ? 'text-emerald-400'
            : 'text-rose-400'

  const bgClass =
    variant === 'income'
      ? 'bg-emerald-500/10'
      : variant === 'expense'
        ? 'bg-rose-500/10'
        : variant === 'debt'
          ? 'bg-orange-500/10'
          : numValue >= 0
            ? 'bg-emerald-500/10'
            : 'bg-rose-500/10'

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3">
        <div className="skeleton h-8 w-8 rounded-lg" />
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-5 w-28 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${bgClass} ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <CurrencyDisplay
          amount={numValue}
          variant={variant}
          className={`text-sm font-bold ${variant === 'auto' ? (numValue >= 0 ? 'text-emerald-400' : 'text-rose-400') : ''}`}
          compact
        />
      </div>
    </div>
  )
}

export function OverviewSummaryBar({ summary, loading }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 overflow-x-auto">
      <StatChip
        label="Tổng Thu"
        value={summary?.total_income ?? '0'}
        icon={TrendingUp}
        variant="income"
        loading={loading}
      />
      <StatChip
        label="Tổng Chi"
        value={summary?.total_expense ?? '0'}
        icon={TrendingDown}
        variant="expense"
        loading={loading}
      />
      <StatChip
        label="Tổng Nợ"
        value={summary?.total_debt_payment ?? '0'}
        icon={CreditCard}
        variant="debt"
        loading={loading}
      />
      <StatChip
        label="Dòng Tiền Ròng"
        value={summary?.net_cashflow ?? '0'}
        icon={ArrowUpDown}
        variant="auto"
        loading={loading}
      />
    </div>
  )
}
