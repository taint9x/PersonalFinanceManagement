import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatVND } from '@/utils/currency'
import { toAmount, type CalendarItemLike, type CalendarMode } from '@/utils/calendarMapping'

interface CalendarDayDialogProps<T extends CalendarItemLike> {
  items: T[]
  date: string
  open: boolean
  onClose: () => void
  mode: CalendarMode
  renderItem: (item: T, index: number) => ReactNode
}

const TITLE_PREFIX: Record<CalendarMode, string> = {
  expense: 'Chi tiêu ngày',
  income: 'Thu nhập ngày',
  overview: 'Giao dịch ngày',
}

function formatDialogDate(date: string) {
  const parsed = parseISO(date)
  if (Number.isNaN(parsed.getTime())) return date
  return format(parsed, 'dd/MM/yyyy', { locale: vi })
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold tracking-widest text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export function CalendarDayDialog<T extends CalendarItemLike>({
  items,
  date,
  open,
  onClose,
  mode,
  renderItem,
}: CalendarDayDialogProps<T>) {
  const recurringItems = items.filter((item) => item.frequency !== 'one_time')
  const oneTimeItems = items.filter((item) => item.frequency === 'one_time')
  const total = items.reduce((sum, item) => {
    const amount = toAmount(item.amount)
    return mode === 'overview' && item.source_type !== 'income' ? sum - amount : sum + amount
  }, 0)

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[82vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-6 py-5">
          <DialogTitle>
            {TITLE_PREFIX[mode]} {formatDialogDate(date)}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[58vh] overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Không có giao dịch nào trong ngày này.
            </p>
          ) : (
            <div className="space-y-4">
              {recurringItems.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader label="ĐỊNH KỲ" />
                  {recurringItems.map((item, index) => renderItem(item, index))}
                </div>
              )}
              {oneTimeItems.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader label="MỘT LẦN" />
                  {oneTimeItems.map((item, index) => renderItem(item, index))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-card px-6 py-4 text-sm font-semibold">
          <span>Tổng ngày này:</span>
          <span className={cn(mode === 'overview' && total > 0 && 'text-emerald-400', mode === 'overview' && total < 0 && 'text-rose-400')}>
            {mode === 'overview' && total > 0 ? '+' : ''}
            {formatVND(total)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
