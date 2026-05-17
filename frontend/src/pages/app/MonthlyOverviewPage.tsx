import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarRange, HandCoins } from 'lucide-react'
import { MonthPicker } from '@/components/common/MonthPicker'
import { useUIStore } from '@/store/uiStore'
import { monthlyOverviewApi } from '@/api/monthlyOverview'
import { OverviewSummaryBar } from '@/components/overview/OverviewSummaryBar'
import { OverviewFilters } from '@/components/overview/OverviewFilters'
import { OverviewItemRow } from '@/components/overview/OverviewItemRow'
import { ExportButton } from '@/components/overview/ExportButton'
import { PersonalLoanPopup } from '@/components/overview/PersonalLoanPopup'
import { Button } from '@/components/ui/button'
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
  const [personalLoanPopupOpen, setPersonalLoanPopupOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['monthly-overview', selectedPeriod, 'all'],
    queryFn: () => monthlyOverviewApi.getOverview(selectedPeriod, 'all'),
    staleTime: 60 * 1000,
  })

  // Check if there are personal loans available for the button
  const { data: availableLoans = [] } = useQuery({
    queryKey: ['personal-loans-available', selectedPeriod],
    queryFn: () => monthlyOverviewApi.getPersonalLoansAvailable(selectedPeriod),
    staleTime: 5 * 60 * 1000,
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

  // Check if any personal loan items are in the current list
  const hasPersonalLoanItems = filteredItems.some((i) => i.debt_category === 'personal_lump_sum')

  // Period label for popup title (MM/YYYY)
  const [year, month] = selectedPeriod.split('-')
  const periodLabel = `${month}/${year}`

  // The button shows only if there are loans available (including not-yet-added ones)
  const showPersonalLoanBtn = availableLoans.length > 0

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

      {/* Status row + Nợ Cá Nhân button + Export */}
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
        <div className="flex items-center gap-2">
          {showPersonalLoanBtn && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPersonalLoanPopupOpen(true)}
              id="add-personal-loan-btn"
              className="gap-1.5 border-purple-500/40 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
            >
              <HandCoins className="h-4 w-4" />
              + Nợ Cá Nhân
            </Button>
          )}
          <ExportButton period={selectedPeriod} />
        </div>
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

          {/* Legend for personal loan items */}
          {hasPersonalLoanItems && (
            <p className="text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/30 mr-1">Vay CN</span>
              = Khoản vay cá nhân (trả 1 lần)
            </p>
          )}
        </div>
      )}

      {/* Personal Loan Popup */}
      <PersonalLoanPopup
        open={personalLoanPopupOpen}
        onOpenChange={setPersonalLoanPopupOpen}
        period={selectedPeriod}
        periodLabel={periodLabel}
      />
    </div>
  )
}
