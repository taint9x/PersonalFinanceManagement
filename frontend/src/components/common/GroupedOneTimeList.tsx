import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { CalendarItemLike } from '@/utils/calendarMapping'

interface GroupedOneTimeListProps<T extends CalendarItemLike> {
  items: T[]
  renderItem: (item: T) => ReactNode
}

function dateKey(value?: string | null): string {
  return value?.slice(0, 10) ?? ''
}

function formatGroupDate(key: string): string {
  const parsed = parseISO(key)
  if (Number.isNaN(parsed.getTime())) return key
  const label = format(parsed, 'EEEE, dd/MM/yyyy', { locale: vi })
  return label.replace(/^./, (char) => char.toUpperCase())
}

export function GroupedOneTimeList<T extends CalendarItemLike>({
  items,
  renderItem,
}: GroupedOneTimeListProps<T>) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const grouped = new Map<string, T[]>()
    items
      .filter((item) => item.frequency === 'one_time')
      .forEach((item) => {
        const key = dateKey(item.transaction_date)
        if (!key) return
        grouped.set(key, [...(grouped.get(key) ?? []), item])
      })

    return Array.from(grouped.entries())
      .map(([date, groupItems]) => ({
        date,
        items: groupItems.sort((a, b) => {
          if (a.created_at && b.created_at) return b.created_at.localeCompare(a.created_at)
          return Number(b.amount) - Number(a.amount)
        }),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [items])

  const toggleGroup = (date: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  if (groups.length === 0) return null

  return (
    <div className="space-y-3">
      {groups.length > 1 && (
        <div className="flex justify-end gap-3 text-xs">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setCollapsedGroups(new Set(groups.map((group) => group.date)))}
          >
            Thu gọn tất cả
          </button>
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setCollapsedGroups(new Set())}
          >
            Mở rộng tất cả
          </button>
        </div>
      )}
      {groups.map((group) => {
        const collapsed = collapsedGroups.has(group.date)
        const Icon = collapsed ? ChevronRight : ChevronDown
        return (
          <div key={group.date} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
              onClick={() => toggleGroup(group.date)}
              aria-expanded={!collapsed}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold">
                <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{formatGroupDate(group.date)}</span>
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                {group.items.length} khoản
              </span>
            </button>
            <div className={cn('border-t border-border px-3 py-3', collapsed && 'hidden')}>
              <div className="space-y-3">{group.items.map((item) => renderItem(item))}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
