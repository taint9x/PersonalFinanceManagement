import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge, TypeBadge } from '@/components/common/StatusBadge'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { debtsApi } from '@/api/debts'
import { toast } from '@/hooks/useToast'
import { useUIStore } from '@/store/uiStore'
import type { Debt, DebtType, DebtStatus } from '@/types'

const debtTypeLabels: Record<DebtType, { label: string; variant: 'blue' | 'purple' | 'orange' | 'rose' }> = {
  credit_loan: { label: 'Vay tín dụng', variant: 'blue' },
  credit_card: { label: 'Thẻ tín dụng', variant: 'purple' },
  personal_loan: { label: 'Vay cá nhân', variant: 'orange' },
  other: { label: 'Khác', variant: 'rose' },
}

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  debt_type: z.enum(['credit_loan', 'credit_card', 'personal_loan', 'other']),
  principal_amount: z.coerce.number().positive('Phải > 0'),
  remaining_amount: z.coerce.number().min(0, 'Phải >= 0'),
  interest_rate: z.coerce.number().min(0),
  monthly_payment: z.coerce.number().min(0),
  due_day: z.coerce.number().min(1).max(31),
  start_date: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
  end_date: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
  status: z.enum(['active', 'paid_off', 'paused']).default('active'),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function DebtsPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editDebt, setEditDebt] = useState<Debt | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { selectedPeriod } = useUIStore()

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts', selectedPeriod],
    queryFn: () => {
      const [year, month] = selectedPeriod.split('-')
      const current_month = `${month}${year}`
      return debtsApi.list(current_month)
    },
  })

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active', debt_type: 'personal_loan' },
  })

  const createMutation = useMutation({
    mutationFn: debtsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] })
      setDrawerOpen(false)
      reset()
      toast({ title: 'Tạo khoản nợ thành công', variant: 'default' })
    },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => debtsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] })
      setDrawerOpen(false)
      setEditDebt(null)
      reset()
      toast({ title: 'Cập nhật thành công', variant: 'default' })
    },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: debtsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] })
      setDeleteId(null)
      toast({ title: 'Đã xóa khoản nợ', variant: 'default' })
    },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })

  const openEdit = (debt: Debt) => {
    setEditDebt(debt)
    reset({
      name: debt.name,
      debt_type: debt.debt_type,
      principal_amount: debt.principal_amount,
      remaining_amount: debt.remaining_amount,
      interest_rate: debt.interest_rate,
      monthly_payment: debt.monthly_payment,
      due_day: debt.due_day,
      start_date: debt.start_date?.slice(0, 10) ?? '',
      end_date: debt.end_date?.slice(0, 10) ?? '',
      status: debt.status,
      notes: debt.notes ?? '',
    })
    setDrawerOpen(true)
  }

  const openCreate = () => {
    setEditDebt(null)
    const today = new Date().toISOString().split('T')[0]
    reset({ status: 'active', debt_type: 'personal_loan', start_date: today })
    setDrawerOpen(true)
  }

  const onSubmit = (data: FormData) => {
    if (editDebt) updateMutation.mutate({ id: editDebt.id, data })
    else createMutation.mutate(data)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khoản Nợ</h1>
          <p className="text-sm text-muted-foreground">{debts.length} khoản</p>
        </div>
        <Button onClick={openCreate} className="gap-2" id="debts-add-btn">
          <Plus className="h-4 w-4" /> Thêm Khoản Nợ
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : debts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Chưa có khoản nợ nào"
          description="Thêm khoản vay, thẻ tín dụng để theo dõi"
          action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Thêm ngay</Button>}
        />
      ) : (
        <div className="space-y-3">
          {debts.map((debt) => {
            const typeInfo = debtTypeLabels[debt.debt_type]
            return (
              <Card key={debt.id} className="hover:border-border/80 transition-colors">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{debt.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <TypeBadge label={typeInfo.label} variant={typeInfo.variant} />
                        <StatusBadge status={debt.status} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Còn lại</p>
                        <CurrencyDisplay amount={debt.remaining_amount} variant="debt" compact />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Trả/tháng</p>
                        <CurrencyDisplay amount={debt.monthly_payment} variant="expense" compact />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lãi suất</p>
                        <span className="font-semibold">{debt.interest_rate}%</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ngày đến hạn</p>
                        <span className="font-semibold">Ngày {debt.due_day}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(debt)} id={`debt-edit-${debt.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(debt.id)} id={`debt-delete-${debt.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={drawerOpen} onOpenChange={(o) => { setDrawerOpen(o); if (!o) { setEditDebt(null); reset() } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDebt ? 'Chỉnh sửa khoản nợ' : 'Thêm khoản nợ'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="debt-form">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Tên khoản nợ</Label>
                <Input placeholder="VD: VPBank Credit Card" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Loại nợ</Label>
                <Select defaultValue={editDebt?.debt_type ?? 'personal_loan'} onValueChange={(v) => setValue('debt_type', v as DebtType)}>
                  <SelectTrigger id="debt-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_loan">Vay tín dụng</SelectItem>
                    <SelectItem value="credit_card">Thẻ tín dụng</SelectItem>
                    <SelectItem value="personal_loan">Vay cá nhân</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Trạng thái</Label>
                <Select defaultValue={editDebt?.status ?? 'active'} onValueChange={(v) => setValue('status', v as DebtStatus)}>
                  <SelectTrigger id="debt-status-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="paid_off">Đã trả xong</SelectItem>
                    <SelectItem value="paused">Tạm dừng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Số tiền gốc (₫)</Label>
                <Controller
                  name="principal_amount"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      type="text"
                      placeholder="0"
                      {...field}
                      value={value ? Number(value).toLocaleString('en-US') : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/,/g, '')
                        if (!isNaN(Number(rawValue))) onChange(rawValue)
                      }}
                    />
                  )}
                />
                {errors.principal_amount && <p className="text-xs text-destructive">{errors.principal_amount.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Số dư còn lại (₫)</Label>
                <Controller
                  name="remaining_amount"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      type="text"
                      placeholder="0"
                      {...field}
                      value={value ? Number(value).toLocaleString('en-US') : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/,/g, '')
                        if (!isNaN(Number(rawValue))) onChange(rawValue)
                      }}
                    />
                  )}
                />
                {errors.remaining_amount && <p className="text-xs text-destructive">{errors.remaining_amount.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Lãi suất (%/năm)</Label>
                <Input type="number" step="0.1" placeholder="0" {...register('interest_rate')} />
              </div>
              <div className="space-y-1">
                <Label>Trả hàng tháng (₫)</Label>
                <Controller
                  name="monthly_payment"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      type="text"
                      placeholder="0"
                      {...field}
                      value={value ? Number(value).toLocaleString('en-US') : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/,/g, '')
                        if (!isNaN(Number(rawValue))) onChange(rawValue)
                      }}
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label>Ngày đến hạn (1-31)</Label>
                <Input type="number" min={1} max={31} {...register('due_day')} />
                {errors.due_day && <p className="text-xs text-destructive">{errors.due_day.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Ngày bắt đầu</Label>
                <Input type="date" {...register('start_date')} />
              </div>
              <div className="space-y-1">
                <Label>Ngày kết thúc</Label>
                <Input type="date" {...register('end_date')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Ghi chú</Label>
                <Textarea rows={2} {...register('notes')} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Hủy</Button>
              <Button type="submit" loading={isSubmitting} id="debt-form-submit">
                {editDebt ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa khoản nợ?"
        description="Hành động này không thể hoàn tác. Khoản nợ sẽ bị xóa vĩnh viễn."
        confirmText="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
