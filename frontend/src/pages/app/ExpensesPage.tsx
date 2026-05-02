import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { TypeBadge } from '@/components/common/StatusBadge'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { expensesApi } from '@/api/expenses'
import { useUIStore } from '@/store/uiStore'
import { toast } from '@/hooks/useToast'
import type { Expense, ExpenseType, Frequency } from '@/types'

const expenseTypeLabels: Record<ExpenseType, { label: string; variant: 'blue' | 'purple' | 'teal' | 'green' | 'orange' | 'rose' | 'slate' }> = {
  subscription: { label: 'Subscription', variant: 'purple' },
  utility: { label: 'Tiện ích', variant: 'blue' },
  food: { label: 'Ăn uống', variant: 'green' },
  transport: { label: 'Di chuyển', variant: 'teal' },
  healthcare: { label: 'Y tế', variant: 'rose' },
  entertainment: { label: 'Giải trí', variant: 'orange' },
  other: { label: 'Khác', variant: 'slate' },
}

const frequencyLabels: Record<Frequency, string> = {
  one_time: 'Một lần',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  yearly: 'Hàng năm',
}

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  expense_type: z.enum(['subscription', 'utility', 'food', 'transport', 'healthcare', 'entertainment', 'other']),
  amount: z.coerce.number().positive('Phải > 0'),
  frequency: z.enum(['one_time', 'weekly', 'monthly', 'yearly']),
  billing_day: z.preprocess((val) => (val === '' || val === undefined ? undefined : Number(val)), z.number().min(1).max(31).optional()),
  transaction_date: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
  start_date: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
  end_date: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formFrequency, setFormFrequency] = useState<Frequency>('monthly')

  const { selectedPeriod } = useUIStore()

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', selectedPeriod],
    queryFn: () => expensesApi.list({ current_month: selectedPeriod }),
  })

  const recurring = expenses.filter((e) => e.frequency !== 'one_time')
  const oneTime = expenses.filter((e) => e.frequency === 'one_time')

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true, expense_type: 'other', frequency: 'monthly' },
  })
  const watchFrequency = watch('frequency')

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setDrawerOpen(false); reset(); toast({ title: 'Tạo chi tiêu thành công' }) },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => expensesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setDrawerOpen(false); setEditExpense(null); reset(); toast({ title: 'Cập nhật thành công' }) },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })
  const deleteMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setDeleteId(null); toast({ title: 'Đã xóa chi tiêu' }) },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => expensesApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const openEdit = (expense: Expense) => {
    setEditExpense(expense)
    setFormFrequency(expense.frequency)
    reset({
      name: expense.name,
      expense_type: expense.expense_type,
      amount: expense.amount,
      frequency: expense.frequency,
      billing_day: expense.billing_day ?? undefined,
      transaction_date: expense.transaction_date?.slice(0, 10) ?? '',
      start_date: expense.start_date?.slice(0, 10) ?? '',
      end_date: expense.end_date?.slice(0, 10) ?? '',
      is_active: expense.is_active,
      notes: expense.notes ?? '',
    })
    setDrawerOpen(true)
  }

  const openCreate = () => {
    setEditExpense(null)
    setFormFrequency('monthly')
    const today = new Date().toISOString().split('T')[0]
    reset({ is_active: true, expense_type: 'other', frequency: 'monthly', transaction_date: today, start_date: today })
    setDrawerOpen(true)
  }

  const onSubmit = (data: FormData) => {
    if (data.frequency === 'one_time') {
      data.start_date = null
      data.end_date = null
    } else {
      data.transaction_date = null
    }

    if (editExpense) {
      const { transaction_date, ...updateData } = data
      updateMutation.mutate({ id: editExpense.id, data: updateData })
    } else {
      createMutation.mutate(data)
    }
  }

  const ExpenseCard = ({ expense }: { expense: Expense }) => {
    const typeInfo = expenseTypeLabels[expense.expense_type]
    return (
      <Card className="hover:border-border/80 transition-colors">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{expense.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <TypeBadge label={typeInfo.label} variant={typeInfo.variant} />
                <TypeBadge label={frequencyLabels[expense.frequency]} variant="slate" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Số tiền</p>
                <CurrencyDisplay amount={expense.amount} variant="expense" compact />
              </div>
              {expense.billing_day && (
                <div>
                  <p className="text-xs text-muted-foreground">Ngày thanh toán</p>
                  <span className="font-semibold">Ngày {expense.billing_day}</span>
                </div>
              )}
              {expense.transaction_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Ngày giao dịch</p>
                  <span className="font-semibold">{expense.transaction_date.slice(0, 10)}</span>
                </div>
              )}
              {expense.frequency !== 'one_time' && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Hoạt động</p>
                  <Switch
                    checked={expense.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: expense.id, is_active: v })}
                    id={`expense-toggle-${expense.id}`}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => openEdit(expense)} id={`expense-edit-${expense.id}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(expense.id)} id={`expense-delete-${expense.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chi Tiêu</h1>
          <p className="text-sm text-muted-foreground">{expenses.length} khoản</p>
        </div>
        <Button onClick={openCreate} className="gap-2" id="expenses-add-btn">
          <Plus className="h-4 w-4" /> Thêm Chi Tiêu
        </Button>
      </div>

      <Tabs defaultValue="recurring" id="expenses-tabs">
        <TabsList>
          <TabsTrigger value="recurring" id="tab-recurring">Định Kỳ ({recurring.length})</TabsTrigger>
          <TabsTrigger value="onetime" id="tab-onetime">Một Lần ({oneTime.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="recurring" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          ) : recurring.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Chưa có chi tiêu định kỳ" description="Subscription, hóa đơn, chi phí cố định" action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Thêm ngay</Button>} />
          ) : (
            <div className="space-y-3">{recurring.map((e) => <ExpenseCard key={e.id} expense={e} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="onetime" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          ) : oneTime.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Chưa có chi tiêu một lần" description="Ghi nhận các khoản chi không định kỳ" action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Thêm ngay</Button>} />
          ) : (
            <div className="space-y-3">{oneTime.map((e) => <ExpenseCard key={e.id} expense={e} />)}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={drawerOpen} onOpenChange={(o) => { setDrawerOpen(o); if (!o) { setEditExpense(null); reset() } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editExpense ? 'Chỉnh sửa chi tiêu' : 'Thêm chi tiêu'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="expense-form">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Tên chi tiêu</Label>
                <Input placeholder="VD: YouTube Premium" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Loại chi tiêu</Label>
                <Select defaultValue={editExpense?.expense_type ?? 'other'} onValueChange={(v) => setValue('expense_type', v as ExpenseType)}>
                  <SelectTrigger id="expense-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(expenseTypeLabels).map(([v, { label }]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tần suất</Label>
                <Select defaultValue={editExpense?.frequency ?? 'monthly'} onValueChange={(v) => { setValue('frequency', v as Frequency); setFormFrequency(v as Frequency) }}>
                  <SelectTrigger id="expense-freq-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">Một lần</SelectItem>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                    <SelectItem value="monthly">Hàng tháng</SelectItem>
                    <SelectItem value="yearly">Hàng năm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Số tiền (₫)</Label>
                <Controller
                  name="amount"
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
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              {watchFrequency === 'one_time' || formFrequency === 'one_time' ? (
                <div className="col-span-2 space-y-1">
                  <Label>Ngày giao dịch</Label>
                  <Input type="date" {...register('transaction_date')} />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label>Ngày thanh toán (1-31)</Label>
                    <Input type="number" min={1} max={31} {...register('billing_day')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Ngày bắt đầu</Label>
                    <Input type="date" {...register('start_date')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Ngày kết thúc</Label>
                    <Input type="date" {...register('end_date')} />
                  </div>
                  <div className="flex items-center gap-3 col-span-2 rounded-lg border border-border p-3">
                    <Switch id="expense-active" defaultChecked={editExpense?.is_active ?? true} onCheckedChange={(v) => setValue('is_active', v)} />
                    <Label htmlFor="expense-active">Đang hoạt động</Label>
                  </div>
                </>
              )}
              <div className="col-span-2 space-y-1">
                <Label>Ghi chú</Label>
                <Textarea rows={2} {...register('notes')} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Hủy</Button>
              <Button type="submit" loading={isSubmitting} id="expense-form-submit">
                {editExpense ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa chi tiêu?"
        description="Hành động này không thể hoàn tác."
        confirmText="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
