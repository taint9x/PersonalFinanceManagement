import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Pencil, CheckCircle2, RotateCcw, AlertTriangle, HandCoins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatVND } from '@/utils/currency'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { debtsApi } from '@/api/debts'
import { toast } from '@/hooks/useToast'
import type { Debt } from '@/types'

interface Props {
  loan: Debt
  onEdit: (loan: Debt) => void
}

function getStatusBadge(loan: Debt) {
  if (loan.is_fully_paid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" /> Xong
      </span>
    )
  }
  if (loan.repay_date) {
    const today = new Date()
    const repayDate = new Date(loan.repay_date)
    if (repayDate < today) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-400 border border-orange-500/30">
          <AlertTriangle className="h-3 w-3" /> Quá hạn
        </span>
      )
    }
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/40">
      <AlertTriangle className="h-3 w-3" />
      Chưa trả
    </span>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Không xác định'
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function PersonalLoanCard({ loan, onEdit }: Props) {
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const markPaidMutation = useMutation({
    mutationFn: () => debtsApi.markFullyPaid(loan.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts', 'personal_lump_sum'] })
      qc.invalidateQueries({ queryKey: ['personal-loans-available'] })
      setConfirmOpen(false)
      toast({ title: 'Đã đánh dấu khoản vay là đã trả hết', variant: 'default' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail?.detail ?? 'Có lỗi xảy ra'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const unmarkPaidMutation = useMutation({
    mutationFn: () => debtsApi.unmarkFullyPaid(loan.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts', 'personal_lump_sum'] })
      qc.invalidateQueries({ queryKey: ['personal-loans-available'] })
      toast({ title: 'Đã hoàn tác trạng thái trả hết', variant: 'default' })
    },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })

  const repayAmount = loan.repay_amount ? Number(loan.repay_amount) : Number(loan.principal_amount)
  const isFullyPaid = loan.is_fully_paid

  return (
    <>
      <Card
        className={cn(
          'transition-all duration-200',
          isFullyPaid && 'opacity-60'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left: info */}
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex-shrink-0 mt-0.5 rounded-full bg-purple-500/15 p-1.5">
                <User className="h-4 w-4 text-purple-400" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold truncate">{loan.name}</p>
                  {getStatusBadge(loan)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {loan.lender_name && <span className="font-medium">{loan.lender_name}</span>}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    <span className="text-foreground font-medium">Mượn:</span>{' '}
                    {formatVND(Number(loan.principal_amount))} · {formatDate(loan.borrow_date)}
                  </span>
                  <span>
                    <span className="text-foreground font-medium">Trả:</span>{' '}
                    {formatVND(repayAmount)}
                  </span>
                  <span>
                    <span className="text-foreground font-medium">Hạn trả:</span>{' '}
                    {loan.repay_date ? formatDate(loan.repay_date) : 'Không xác định'}
                  </span>
                  {isFullyPaid && loan.actual_repaid_date && (
                    <span className="text-emerald-400">
                      Đã trả: {formatDate(loan.actual_repaid_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: amount + actions */}
            <div className="flex flex-shrink-0 flex-col items-end gap-2">
              <p className="text-sm font-bold text-foreground">{formatVND(repayAmount)}</p>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(loan)}
                  id={`personal-loan-edit-${loan.id}`}
                  className="h-7 w-7"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {isFullyPaid ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unmarkPaidMutation.mutate()}
                    loading={unmarkPaidMutation.isPending}
                    id={`personal-loan-unmark-${loan.id}`}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Hoàn Tác
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmOpen(true)}
                    id={`personal-loan-mark-paid-${loan.id}`}
                    className="h-7 text-xs border-sky-500/40 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300"
                  >
                    <HandCoins className="h-3.5 w-3.5 mr-1" />
                    Thực hiện trả
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận thực hiện trả?"
        description="Xác nhận bạn muốn ghi nhận khoản vay này đã được trả hết. Sau khi xác nhận, khoản vay sẽ chuyển sang trạng thái đã thanh toán."
        confirmText="Thực hiện trả"
        loading={markPaidMutation.isPending}
        onConfirm={() => markPaidMutation.mutate()}
      />
    </>
  )
}
