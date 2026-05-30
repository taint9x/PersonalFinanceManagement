import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, HandCoins, BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatVND } from '@/utils/currency'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { monthlyOverviewApi } from '@/api/monthlyOverview'
import { toast } from '@/hooks/useToast'
import type { PersonalLoanAvailable } from '@/types/monthlyOverview'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: string           // YYYY-MM
  periodLabel: string      // MM/YYYY for display
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function PersonalLoanPopup({ open, onOpenChange, period, periodLabel }: Props) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['personal-loans-available', period],
    queryFn: () => monthlyOverviewApi.getPersonalLoansAvailable(period),
    enabled: open,
    staleTime: 0,  // always fresh when popup opens
  })

  const addMutation = useMutation({
    mutationFn: () =>
      monthlyOverviewApi.addPersonalLoansToOverview({
        period_key: period,
        debt_ids: Array.from(selected),
      }),
    onSuccess: () => {
      const n = selected.size
      qc.invalidateQueries({ queryKey: ['monthly-overview', period] })
      qc.invalidateQueries({ queryKey: ['personal-loans-available', period] })
      onOpenChange(false)
      setSelected(new Set())
      toast({
        title: `Đã thêm ${n} khoản nợ cá nhân và đánh dấu đã trả`,
        variant: 'default',
      })
    },
    onError: () => {
      toast({ title: 'Có lỗi khi thêm khoản vay. Vui lòng thử lại.', variant: 'destructive' })
    },
  })

  const handleToggle = (id: string, alreadyAdded: boolean) => {
    if (alreadyAdded) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleClose = () => {
    if (addMutation.isPending) return
    setSelected(new Set())
    onOpenChange(false)
  }

  const selectedCount = selected.size

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-purple-400" />
            Thêm Khoản Nợ Cá Nhân vào Tháng {periodLabel}
          </DialogTitle>
          <DialogDescription>
            Chọn khoản vay muốn theo dõi trong tháng này
          </DialogDescription>
        </DialogHeader>

        {/* Loan list */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <HandCoins className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Không có khoản vay cá nhân nào trong tháng này</p>
            </div>
          ) : (
            loans.map((loan: PersonalLoanAvailable) => {
              const isAdded = loan.already_in_overview
              const isChecked = isAdded || selected.has(loan.id)

              return (
                <button
                  key={loan.id}
                  id={`personal-loan-popup-item-${loan.id}`}
                  onClick={() => handleToggle(loan.id, isAdded)}
                  disabled={isAdded || addMutation.isPending}
                  className={cn(
                    'w-full text-left rounded-lg border px-4 py-3 transition-all duration-150',
                    isAdded
                      ? 'border-emerald-500/30 bg-emerald-500/5 opacity-70 cursor-not-allowed'
                      : isChecked
                        ? 'border-purple-500/50 bg-purple-500/10 cursor-pointer'
                        : 'border-border bg-card hover:border-border/80 hover:bg-muted/30 cursor-pointer'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={cn(
                          'mt-0.5 h-4 w-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors',
                          isAdded
                            ? 'border-emerald-500 bg-emerald-500'
                            : isChecked
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-border bg-transparent'
                        )}
                      >
                        {(isAdded || isChecked) && (
                          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{loan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {loan.lender_name} ·{' '}
                          Mượn: {formatDate(loan.borrow_date)}{' '}
                          {loan.repay_date ? `· Hạn: ${formatDate(loan.repay_date)}` : '· Không có hạn'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <p className="text-sm font-semibold">{formatVND(Number(loan.repay_amount))}</p>
                      {isAdded && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          <BadgeCheck className="h-3 w-3" /> Đã thêm
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={addMutation.isPending}
            id="personal-loan-popup-cancel"
          >
            Huỷ
          </Button>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={selectedCount === 0 || addMutation.isPending}
            loading={addMutation.isPending}
            id="personal-loan-popup-submit"
          >
            {addMutation.isPending
              ? 'Đang thêm...'
              : selectedCount === 0
                ? 'Add to mark đã trả'
                : `Add ${selectedCount} khoản vào tháng này`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
