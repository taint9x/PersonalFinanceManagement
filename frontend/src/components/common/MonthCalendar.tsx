import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatVNDCompact } from '@/utils/currency'
import { toAmount, type CalendarItemLike, type CalendarMode, type DayMap } from '@/utils/calendarMapping'

interface MonthCalendarProps<T extends CalendarItemLike> {
  year: number
  month: number
  dayMap: DayMap<T>
  mode: CalendarMode
  onDayClick: (day: number, items: T[]) => void
  onDayHover: (day: number, items: T[], anchorEl: HTMLElement) => void
  onDayHoverEnd: () => void
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function isTouchHoverDisabled() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
}

function signedCompact(amount: number) {
  const prefix = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${prefix}${formatVNDCompact(Math.abs(amount))}`
}

export function MonthCalendar<T extends CalendarItemLike>({
  year,
  month,
  dayMap,
  mode,
  onDayClick,
  onDayHover,
  onDayHoverEnd,
}: MonthCalendarProps<T>) {
  const monthIndex = month - 1
  const firstDate = new Date(year, monthIndex, 1)
  const lastDate = new Date(year, month, 0)
  const firstWeekday = (firstDate.getDay() + 6) % 7
  const daysInMonth = lastDate.getDate()
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex

  const cells = Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstWeekday + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-center">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
          {format(firstDate, 'MMMM yyyy', { locale: vi }).replace(/^./, (char) => char.toUpperCase())}
        </h2>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-xs font-bold text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          if (day === null) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[92px] border-b border-r border-border bg-muted/20 last:border-r-0 sm:min-h-[112px]"
              />
            )
          }

          const items = dayMap[day] ?? []
          const incomeTotal = items
            .filter((item) => item.source_type === 'income')
            .reduce((sum, item) => sum + toAmount(item.amount), 0)
          const expenseTotal = items
            .filter((item) => item.source_type !== 'income')
            .reduce((sum, item) => sum + toAmount(item.amount), 0)
          const total = items.reduce((sum, item) => sum + toAmount(item.amount), 0)
          const isToday = isCurrentMonth && today.getDate() === day

          return (
            <button
              key={day}
              type="button"
              className={cn(
                'relative flex min-h-[92px] flex-col border-b border-r border-border p-2 text-left transition-colors hover:bg-accent/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset sm:min-h-[112px]',
                (index + 1) % 7 === 0 && 'border-r-0',
                isToday && 'bg-primary/5 ring-1 ring-inset ring-primary/50'
              )}
              onClick={() => onDayClick(day, items)}
              onMouseEnter={(event) => {
                if (!isTouchHoverDisabled()) onDayHover(day, items, event.currentTarget)
              }}
              onMouseLeave={onDayHoverEnd}
            >
              <span className="text-xs font-semibold text-muted-foreground">{day}</span>
              <span className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
                {items.length === 0 ? (
                  <span className="text-sm text-muted-foreground/50">—</span>
                ) : mode === 'overview' ? (
                  <>
                    {incomeTotal > 0 && (
                      <span className="text-xs font-bold text-emerald-400 sm:text-sm">
                        {signedCompact(incomeTotal)}
                      </span>
                    )}
                    {expenseTotal > 0 && (
                      <span className="text-xs font-bold text-rose-400 sm:text-sm">
                        -{formatVNDCompact(expenseTotal)}
                      </span>
                    )}
                  </>
                ) : (
                  <span
                    className={cn(
                      'text-xs font-bold sm:text-sm',
                      mode === 'income' ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {formatVNDCompact(total)}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
