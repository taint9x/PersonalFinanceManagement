import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, CreditCard, HandCoins } from 'lucide-react'
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
import { PersonalLoanList } from '@/components/debts/PersonalLoanList'
import { debtsApi } from '@/api/debts'
import { toast } from '@/hooks/useToast'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import type { Debt, DebtType, DebtStatus, DebtCategory } from '@/types'

// ── Tab type ──────────────────────────────────────────────────────────────────
type TabType = 'monthly_installment' | 'personal_lump_sum'

const debtTypeLabels: Record<DebtType, { label: string; variant: 'blue' | 'purple' | 'orange' | 'rose' }> = {
  credit_loan: { label: 'Vay tín dụng', variant: 'blue' },
  credit_card: { label: 'Thẻ tín dụng', variant: 'purple' },
  personal_loan: { label: 'Vay cá nhân', variant: 'orange' },
  other: { label: 'Khác', variant: 'rose' },
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const monthlySchema = z.object({
  debt_category: z.literal('monthly_installment'),
  name: z.string().min(1, 'Bắt buộc'),
  debt_type: z.enum(['credit_loan', 'credit_card', 'personal_loan', 'other']),
  principal_amount: z.coerce.number().positive('Phải > 0'),
  remaining_amount: z.coerce.number().min(0, 'Phải >= 0'),
  interest_rate: z.coerce.number().min(0),
  monthly_payment: z.coerce.number().min(0),
  due_day: z.coerce.number().min(1).max(31),
  start_date: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  end_date: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  status: z.enum(['active', 'paid_off', 'paused']).default('active'),
  notes: z.string().optional(),
})

const personalLoanSchema = z.object({
  debt_category: z.literal('personal_lump_sum'),
  name: z.string().min(1, 'Bắt buộc'),
  debt_type: z.enum(['credit_loan', 'credit_card', 'personal_loan', 'other']).default('personal_loan'),
  lender_name: z.string().min(1, 'Bắt buộc'),
  principal_amount: z.coerce.number().positive('Phải > 0'),
  repay_amount: z.coerce.number().positive('Phải > 0'),
  borrow_date: z.string().min(1, 'Bắt buộc'),
  repay_date: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  notes: z.string().optional(),
  // Provide defaults for unused monthly fields
  remaining_amount: z.coerce.number().min(0).default(0),
  interest_rate: z.coerce.number().min(0).default(0),
  monthly_payment: z.coerce.number().min(0).default(0),
  status: z.enum(['active', 'paid_off', 'paused']).default('active'),
})

const schema = z.discriminatedUnion('debt_category', [monthlySchema, personalLoanSchema])
type FormData = z.infer<typeof schema>

// ── Component ─────────────────────────────────────────────────────────────────
export default function DebtsPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('monthly_installment')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editDebt, setEditDebt] = useState<Debt | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { selectedPeriod } = useUIStore()

  // Monthly installment list (Tab 1)
  const { data: monthlyDebts = [], isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['debts', 'monthly_installment'],
    queryFn: () => debtsApi.listByCategory('monthly_installment'),
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { debt_category: 'monthly_installment', status: 'active', debt_type: 'personal_loan' } as any,
  })

  const currentCategory = watch('debt_category') as DebtCategory

  const createMutation = useMutation({
    mutationFn: (data: FormData) => debtsApi.create(data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] })
      setDrawerOpen(false)
      reset()
      toast({ title: 'Tạo khoản nợ thành công', variant: 'default' })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail?.detail ?? 'Có lỗi xảy ra'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => debtsApi.update(id, data as any),
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
    const cat = debt.debt_category ?? 'monthly_installment'
    if (cat === 'personal_lump_sum') {
      reset({
        debt_category: 'personal_lump_sum',
        name: debt.name,
        debt_type: debt.debt_type,
        lender_name: debt.lender_name ?? '',
        principal_amount: debt.principal_amount,
        repay_amount: debt.repay_amount ? Number(debt.repay_amount) : debt.principal_amount,
        borrow_date: debt.borrow_date?.slice(0, 10) ?? '',
        repay_date: debt.repay_date?.slice(0, 10) ?? '',
        notes: debt.notes ?? '',
      } as any)
    } else {
      reset({
        debt_category: 'monthly_installment',
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
      } as any)
    }
    setDrawerOpen(true)
  }

  const openCreate = () => {
    setEditDebt(null)
    const today = new Date().toISOString().split('T')[0]
    if (activeTab === 'personal_lump_sum') {
      reset({ debt_category: 'personal_lump_sum', debt_type: 'personal_loan', borrow_date: today } as any)
    } else {
      reset({ debt_category: 'monthly_installment', status: 'active', debt_type: 'personal_loan', start_date: today } as any)
    }
    setDrawerOpen(true)
  }

  const onSubmit = (data: FormData) => {
    if (editDebt) updateMutation.mutate({ id: editDebt.id, data })
    else createMutation.mutate(data)
  }

  const drawerTitle = () => {
    const action = editDebt ? 'Chỉnh sửa' : 'Thêm'
    const catLabel = currentCategory === 'personal_lump_sum' ? 'Vay Cá Nhân' : 'Khoản Nợ'
    return `${action} ${catLabel}`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khoản Nợ</h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'monthly_installment' ? monthlyDebts.length : '...'} khoản
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2" id="debts-add-btn">
          <Plus className="h-4 w-4" /> Thêm Khoản Nợ
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        <button
          id="tab-monthly-installment"
          onClick={() => setActiveTab('monthly_installment')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150',
            activeTab === 'monthly_installment'
              ? 'bg-background shadow-sm text-foreground border border-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <CreditCard className="h-4 w-4" />
          Trả Hàng Tháng
        </button>
        <button
          id="tab-personal-lump-sum"
          onClick={() => setActiveTab('personal_lump_sum')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150',
            activeTab === 'personal_lump_sum'
              ? 'bg-background shadow-sm text-foreground border border-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <HandCoins className="h-4 w-4" />
          Vay Cá Nhân
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'monthly_installment' ? (
        <>
          {isLoadingMonthly ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : monthlyDebts.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Chưa có khoản nợ trả hàng tháng nào"
              description="Thêm khoản vay, thẻ tín dụng để theo dõi"
              action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Thêm ngay</Button>}
            />
          ) : (
            <div className="space-y-3">
              {monthlyDebts.map((debt) => {
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
        </>
      ) : (
        <PersonalLoanList onEdit={openEdit} />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={drawerOpen} onOpenChange={(o) => { setDrawerOpen(o); if (!o) { setEditDebt(null); reset() } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drawerTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="debt-form">

            {/* Category selector (hidden in edit mode) */}
            {!editDebt && (
              <div className="space-y-2">
                <Label>Loại khoản nợ</Label>
                <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
                  <button
                    type="button"
                    id="debt-cat-monthly"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0]
                      reset({ debt_category: 'monthly_installment', status: 'active', debt_type: 'personal_loan', start_date: today } as any)
                    }}
                    className={cn(
                      'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                      currentCategory === 'monthly_installment'
                        ? 'bg-background shadow-sm text-foreground border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Trả hàng tháng
                  </button>
                  <button
                    type="button"
                    id="debt-cat-personal"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0]
                      reset({ debt_category: 'personal_lump_sum', debt_type: 'personal_loan', borrow_date: today } as any)
                    }}
                    className={cn(
                      'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                      currentCategory === 'personal_lump_sum'
                        ? 'bg-background shadow-sm text-foreground border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Vay cá nhân
                  </button>
                </div>
              </div>
            )}

            {currentCategory === 'monthly_installment' ? (
              /* ── Monthly installment fields ─────────────────────────────── */
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
                  <Controller name="principal_amount" control={control} render={({ field: { value, onChange, ...field } }) => (
                    <Input type="text" placeholder="0" {...field}
                      value={value ? Number(value).toLocaleString('en-US') : ''}
                      onChange={(e) => { const r = e.target.value.replace(/,/g, ''); if (!isNaN(Number(r))) onChange(r) }} />
                  )} />
                  {errors.principal_amount && <p className="text-xs text-destructive">{errors.principal_amount.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Số dư còn lại (₫)</Label>
                  <Controller name="remaining_amount" control={control} render={({ field: { value, onChange, ...field } }) => (
                    <Input type="text" placeholder="0" {...field}
                      value={value ? Number(value).toLocaleString('en-US') : ''}
                      onChange={(e) => { const r = e.target.value.replace(/,/g, ''); if (!isNaN(Number(r))) onChange(r) }} />
                  )} />
                </div>
                <div className="space-y-1">
                  <Label>Lãi suất (%/năm)</Label>
                  <Input type="number" step="0.1" placeholder="0" {...register('interest_rate')} />
                </div>
                <div className="space-y-1">
                  <Label>Trả hàng tháng (₫)</Label>
                  <Controller name="monthly_payment" control={control} render={({ field: { value, onChange, ...field } }) => (
                    <Input type="text" placeholder="0" {...field}
                      value={value ? Number(value).toLocaleString('en-US') : ''}
                      onChange={(e) => { const r = e.target.value.replace(/,/g, ''); if (!isNaN(Number(r))) onChange(r) }} />
                  )} />
                </div>
                <div className="space-y-1">
                  <Label>Ngày đến hạn (1-31)</Label>
                  <Input type="number" min={1} max={31} {...register('due_day')} />
                  {(errors as any).due_day && <p className="text-xs text-destructive">{(errors as any).due_day.message}</p>}
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
            ) : (
              /* ── Personal lump-sum fields ────────────────────────────────── */
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Tên khoản vay</Label>
                  <Input placeholder="VD: Mượn tiền mua xe" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Người cho mượn</Label>
                  <Input placeholder="VD: Anh Hai, Chị Ba" {...register('lender_name' as any)} />
                  {(errors as any).lender_name && <p className="text-xs text-destructive">{(errors as any).lender_name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Số tiền mượn (₫)</Label>
                  <Controller name="principal_amount" control={control} render={({ field: { value, onChange, ...field } }) => (
                    <Input type="text" placeholder="0" {...field}
                      value={value ? Number(value).toLocaleString('en-US') : ''}
                      onChange={(e) => { const r = e.target.value.replace(/,/g, ''); if (!isNaN(Number(r))) onChange(r) }} />
                  )} />
                  {errors.principal_amount && <p className="text-xs text-destructive">{errors.principal_amount.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Số tiền phải trả (₫)</Label>
                  <Controller name={'repay_amount' as any} control={control} render={({ field: { value, onChange, ...field } }) => (
                    <Input type="text" placeholder="0" {...field}
                      value={value ? Number(value).toLocaleString('en-US') : ''}
                      onChange={(e) => { const r = e.target.value.replace(/,/g, ''); if (!isNaN(Number(r))) onChange(r) }} />
                  )} />
                  {(errors as any).repay_amount && <p className="text-xs text-destructive">{(errors as any).repay_amount.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Ngày mượn</Label>
                  <Input type="date" {...register('borrow_date' as any)} />
                  {(errors as any).borrow_date && <p className="text-xs text-destructive">{(errors as any).borrow_date.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Ngày trả dự kiến <span className="text-muted-foreground">(tùy chọn)</span></Label>
                  <Input type="date" {...register('repay_date' as any)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Ghi chú <span className="text-muted-foreground">(tùy chọn)</span></Label>
                  <Textarea rows={2} {...register('notes')} />
                </div>
              </div>
            )}

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
