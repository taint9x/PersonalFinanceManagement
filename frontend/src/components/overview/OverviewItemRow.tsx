import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Loader2, CreditCard, ShoppingCart, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatVND } from '@/utils/currency'
import { monthlyOverviewApi } from '@/api/monthlyOverview'
import { toast } from '@/hooks/useToast'
import type { OverviewItem, MarkPaymentPayload } from '@/types/monthlyOverview'

interface Props {
  item: OverviewItem
  period: string
}

const TYPE_ICON = {
  debt: CreditCard,
  expense: ShoppingCart,
  income: Wallet,
}

const TYPE_ICON_COLOR = {
  debt: 'text-orange-400',
  expense: 'text-rose-400',
  income: 'text-emerald-400',
}

const MARK_LABEL: Record<string, { paid: string; unpaid: string }> = {
  debt: { paid: '✓ Đã Trả', unpaid: 'Mark Đã Trả' },
  expense: { paid: '✓ Đã Chi', unpaid: 'Mark Đã Chi' },
}

const FREQ_LABEL: Record<string, string> = {
  one_time: 'Một lần',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  yearly: 'Hàng năm',
}

export function OverviewItemRow({ item, period }: Props) {
  const queryClient = useQueryClient()
  const Icon = TYPE_ICON[item.source_type] ?? Wallet
  const iconColor = TYPE_ICON_COLOR[item.source_type] ?? 'text-muted-foreground'

  // Local optimistic paid state
  const [isPaid, setIsPaid] = useState<boolean>(item.is_paid ?? false)

  // Sync state with prop updates
  useEffect(() => {
    setIsPaid(item.is_paid ?? false)
  }, [item.is_paid])

  const mutation = useMutation({
    mutationFn: (payload: MarkPaymentPayload) =>
      isPaid
        ? monthlyOverviewApi.markAsUnpaid(payload)
        : monthlyOverviewApi.markAsPaid(payload),
    onMutate: () => {
      // Optimistic update
      setIsPaid((prev) => !prev)
    },
    onError: () => {
      // Revert optimistic update
      setIsPaid((prev) => !prev)
      toast({ title: 'Không thể cập nhật trạng thái. Thử lại.', variant: 'destructive' })
    },
    onSettled: () => {
      // Invalidate cache to refetch fresh data from server
      queryClient.invalidateQueries({ queryKey: ['monthly-overview', period] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })

  const handleToggle = () => {
    const payload: MarkPaymentPayload = {
      source_type: item.source_type as 'debt' | 'expense',
      source_id: item.id,
      period_key: period,
    }
    mutation.mutate(payload)
  }

  const amount = Number(item.amount)
  const remaining = item.remaining_amount ? Number(item.remaining_amount) : null
  const freqLabel = FREQ_LABEL[item.frequency] ?? item.frequency
  const hasMarkButton = item.source_type === 'debt' || item.source_type === 'expense'
  const labels = MARK_LABEL[item.source_type]
  const isLoading = mutation.isPending

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3.5 transition-opacity',
        isLoading && 'opacity-70'
      )}
    >
      {/* Left: icon + info */}
      <div className="flex items-start gap-3 min-w-0">
        <div className={cn('mt-0.5 flex-shrink-0', iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
            {item.debt_category === 'personal_lump_sum' && (
              <span className="inline-flex flex-shrink-0 items-center rounded-full bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400">
                Vay CN
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {item.debt_category === 'personal_lump_sum' && item.lender_name && (
              <span className="font-medium text-foreground/70">{item.lender_name}</span>
            )}
            {item.debt_category !== 'personal_lump_sum' && (
              <span className="capitalize">{item.category.replace(/_/g, ' ')}</span>
            )}
            {item.source_type !== 'debt' && <span>· {freqLabel}</span>}
            {item.source_type === 'debt' && item.debt_category !== 'personal_lump_sum' && item.due_day && (
              <span>· Đến hạn: ngày {item.due_day}</span>
            )}
            {remaining !== null && (
              <span className="text-orange-400">· Còn: {formatVND(remaining)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: amount + mark button */}
      <div className="flex flex-shrink-0 flex-col items-end gap-2">
        <p className="text-sm font-semibold text-foreground">{formatVND(amount)}</p>
        {hasMarkButton && (
          <button
            id={`mark-btn-${item.id}`}
            onClick={handleToggle}
            disabled={isLoading}
            aria-label={isPaid ? labels.paid : labels.unpaid}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150',
              isPaid
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground',
              isLoading && 'cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isPaid ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            {isLoading ? 'Đang xử lý...' : isPaid ? labels.paid : labels.unpaid}
          </button>
        )}
      </div>
    </div>
  )
}
