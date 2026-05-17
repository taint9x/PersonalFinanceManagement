import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatVND } from '@/utils/currency'
import { toAmount, type CalendarItemLike, type CalendarMode } from '@/utils/calendarMapping'

interface CalendarHoverPopupProps<T extends CalendarItemLike> {
  items: T[]
  date: string
  anchorEl: HTMLElement | null
  visible: boolean
  mode: CalendarMode
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function formatPopupDate(date: string) {
  const parsed = parseISO(date)
  if (Number.isNaN(parsed.getTime())) return date
  return format(parsed, 'EEEE, dd/MM/yyyy', { locale: vi }).replace(/^./, (char) => char.toUpperCase())
}

export function CalendarHoverPopup<T extends CalendarItemLike>({
  items,
  date,
  anchorEl,
  visible,
  mode,
  onMouseEnter,
  onMouseLeave,
}: CalendarHoverPopupProps<T>) {
  const position = useMemo(() => {
    if (!anchorEl) return null
    const rect = anchorEl.getBoundingClientRect()
    const width = 280
    const topSpace = rect.top
    const top = topSpace > 220 ? rect.top - 12 : rect.bottom + 12
    return {
      left: Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 12), window.innerWidth - width - 12),
      top,
      transform: topSpace > 220 ? 'translateY(-100%)' : 'none',
    }
  }, [anchorEl])

  if (!visible || !anchorEl || !position) return null

  const visibleItems = items.slice(0, 5)
  const hiddenCount = Math.max(items.length - visibleItems.length, 0)
  const total = items.reduce((sum, item) => {
    const amount = toAmount(item.amount)
    return mode === 'overview' && item.source_type !== 'income' ? sum - amount : sum + amount
  }, 0)

  return (
    <div
      className="fixed z-[60] w-[280px] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl"
      style={{ left: position.left, top: position.top, transform: position.transform }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <p className="text-sm font-semibold">{formatPopupDate(date)}</p>
      <div className="my-2 h-px bg-border" />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có giao dịch nào.</p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate">
                • {item.name}
                {item.debt_category === 'personal_lump_sum' && (
                  <span className="ml-1 rounded-full border border-purple-500/30 bg-purple-500/15 px-1 text-[9px] font-semibold text-purple-400">
                    Vay CN
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'flex-shrink-0 font-semibold',
                  mode === 'overview' && item.source_type === 'income' && 'text-emerald-400',
                  mode === 'overview' && item.source_type !== 'income' && 'text-rose-400'
                )}
              >
                {formatVND(toAmount(item.amount))}
              </span>
            </div>
          ))}
          {hiddenCount > 0 && (
            <p className="text-xs text-muted-foreground">...và {hiddenCount} khoản khác</p>
          )}
        </div>
      )}
      <div className="my-2 h-px bg-border" />
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>Tổng:</span>
        <span className={cn(mode === 'overview' && total < 0 && 'text-rose-400', mode === 'overview' && total > 0 && 'text-emerald-400')}>
          {mode === 'overview' && total > 0 ? '+' : ''}
          {formatVND(total)}
        </span>
      </div>
    </div>
  )
}
