import { cn } from '@/lib/utils'
import type { OverviewItem } from '@/types/monthlyOverview'

type FilterType = 'all' | 'debt' | 'expense' | 'income'

interface Props {
  activeFilter: FilterType
  onFilterChange: (f: FilterType) => void
  items: OverviewItem[]
}

const TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Tất Cả' },
  { key: 'debt', label: 'Nợ' },
  { key: 'expense', label: 'Chi Tiêu' },
  { key: 'income', label: 'Thu Nhập' },
]

export function OverviewFilters({ activeFilter, onFilterChange, items }: Props) {
  const counts: Record<FilterType, number> = {
    all: items.length,
    debt: items.filter((i) => i.source_type === 'debt').length,
    expense: items.filter((i) => i.source_type === 'expense').length,
    income: items.filter((i) => i.source_type === 'income').length,
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo loại">
      {TABS.map(({ key, label }) => {
        const isActive = activeFilter === key
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            id={`overview-filter-${key}`}
            onClick={() => onFilterChange(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none',
                isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              )}
            >
              {counts[key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
