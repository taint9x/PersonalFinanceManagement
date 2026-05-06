import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarRange } from 'lucide-react'
import { MonthPicker } from '@/components/common/MonthPicker'
import { useUIStore } from '@/store/uiStore'
import { monthlyOverviewApi } from '@/api/monthlyOverview'
import { OverviewSummaryBar } from '@/components/overview/OverviewSummaryBar'
import { OverviewFilters } from '@/components/overview/OverviewFilters'
import { OverviewItemRow } from '@/components/overview/OverviewItemRow'
import { ExportButton } from '@/components/overview/ExportButton'
import type { OverviewItem } from '@/types/monthlyOverview'

type FilterType = 'all' | 'debt' | 'expense' | 'income'

const SECTION_LABELS: Record<string, string> = {
  debt: 'NỢ PHẢI TRẢ',
  expense: 'CHI TIÊU',
  income: 'THU NHẬP',
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-bold tracking-widest text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export default function MonthlyOverviewPage() {
  const { selectedPeriod } = useUIStore()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['monthly-overview', selectedPeriod, 'all'],
    queryFn: () => monthlyOverviewApi.getOverview(selectedPeriod, 'all'),
    staleTime: 60 * 1000,
  })

  // Front-end filtering (no re-fetch needed)
  const filteredItems: OverviewItem[] =
    activeFilter === 'all'
      ? (data?.items ?? [])
      : (data?.items ?? []).filter((i) => i.source_type === activeFilter)

  // Grouped rendering
  const groups: Array<{ type: string; items: OverviewItem[] }> = activeFilter === 'all'
    ? ['debt', 'expense', 'income']
        .map((type) => ({
          type,
          items: filteredItems.filter((i) => i.source_type === type),
        }))
        .filter((g) => g.items.length > 0)
    : [{ type: activeFilter, items: filteredItems }]

  const paidCount = data?.summary.paid_count ?? 0
  const unpaidCount = data?.summary.unpaid_count ?? 0
  const totalPayable = paidCount + unpaidCount

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarRange className="h-6 w-6 text-primary" />
            Tổng Quan Tháng
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tổng hợp thu chi nợ trong tháng đã chọn
          </p>
        </div>
        <MonthPicker />
      </div>

      {/* Summary Bar */}
      <OverviewSummaryBar summary={data?.summary} loading={isLoading} />

      {/* Filters */}
      <OverviewFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        items={data?.items ?? []}
      />

      {/* Status row + Export */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <span className="skeleton inline-block h-4 w-28 rounded" />
          ) : (
            <>
              <span className="font-semibold text-foreground">{paidCount}</span>
              /{totalPayable} đã xử lý
            </>
          )}
        </p>
        <ExportButton period={selectedPeriod} />
      </div>

      {/* Item List */}
      {isError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          Không thể tải dữ liệu. Vui lòng thử lại.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarRange className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Không có dữ liệu cho tháng này
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hãy thêm khoản thu chi trong các tab tương ứng.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ type, items }) => (
            <div key={type} className="space-y-2">
              {activeFilter === 'all' && <SectionHeader label={SECTION_LABELS[type]} />}
              {items.map((item) => (
                <OverviewItemRow key={item.id} item={item} period={selectedPeriod} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
