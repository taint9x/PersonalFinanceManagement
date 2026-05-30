import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HandCoins } from 'lucide-react'
import { debtsApi } from '@/api/debts'
import { PersonalLoanCard } from './PersonalLoanCard'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'
import type { Debt } from '@/types'

type FilterState = 'unpaid' | 'paid' | 'all'

const FILTER_LABELS: Record<FilterState, string> = {
  unpaid: 'Chưa trả',
  paid: 'Đã trả',
  all: 'Tất cả',
}

interface Props {
  onEdit: (loan: Debt) => void
}

export function PersonalLoanList({ onEdit }: Props) {
  const [filter, setFilter] = useState<FilterState>('unpaid')

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['debts', 'personal_lump_sum'],
    queryFn: () => debtsApi.listByCategory('personal_lump_sum'),
    staleTime: 60 * 1000,
  })

  const filteredLoans = loans.filter((loan) => {
    if (filter === 'unpaid') return !loan.is_fully_paid
    if (filter === 'paid') return loan.is_fully_paid
    return true
  })

  const getEmptyMessage = () => {
    if (filter === 'unpaid') return 'Không có khoản vay cá nhân nào chưa thanh toán.'
    return 'Chưa có khoản vay cá nhân nào. Nhấn + để thêm.'
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {(Object.keys(FILTER_LABELS) as FilterState[]).map((f) => (
          <button
            key={f}
            id={`personal-loan-filter-${f}`}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
              filter === f
                ? 'bg-background shadow-sm text-foreground border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      ) : filteredLoans.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={getEmptyMessage()}
          description=""
        />
      ) : (
        <div className="space-y-3">
          {filteredLoans.map((loan) => (
            <PersonalLoanCard key={loan.id} loan={loan} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
