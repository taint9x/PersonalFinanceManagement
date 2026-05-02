import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
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
import { incomesApi } from '@/api/incomes'
import { useUIStore } from '@/store/uiStore'
import { toast } from '@/hooks/useToast'
import type { Income, IncomeType, Frequency } from '@/types'

const incomeTypeConfig: Record<IncomeType, { label: string; variant: 'blue' | 'purple' | 'teal' | 'green' | 'orange' | 'rose' | 'slate' }> = {
  salary: { label: 'Lương', variant: 'blue' },
  trading: { label: 'Trading', variant: 'purple' },
  freelance: { label: 'Freelance', variant: 'teal' },
  passive: { label: 'Thụ động', variant: 'green' },
  other: { label: 'Khác', variant: 'slate' },
}

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  income_type: z.enum(['salary', 'trading', 'freelance', 'passive', 'other']),
  amount: z.coerce.number().positive('Phải > 0'),
  frequency: z.enum(['one_time', 'weekly', 'monthly', 'yearly']),
  payment_day: z.preprocess((val) => (val === '' || val === undefined ? undefined : Number(val)), z.number().min(1).max(31).optional()),
  transaction_date: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
  start_date: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
  end_date: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function IncomesPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editIncome, setEditIncome] = useState<Income | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formFrequency, setFormFrequency] = useState<Frequency>('monthly')

  const { selectedPeriod } = useUIStore()

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ['incomes', selectedPeriod],
    queryFn: () => incomesApi.list({ current_month: selectedPeriod }),
  })

  const recurring = incomes.filter((i) => i.frequency !== 'one_time')
  const oneTime = incomes.filter((i) => i.frequency === 'one_time')

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true, income_type: 'salary', frequency: 'monthly' },
  })
  const watchFrequency = watch('frequency')

  const createMutation = useMutation({
    mutationFn: incomesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); setDrawerOpen(false); reset(); toast({ title: 'Tạo thu nhập thành công' }) },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => incomesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); setDrawerOpen(false); setEditIncome(null); reset(); toast({ title: 'Cập nhật thành công' }) },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })
  const deleteMutation = useMutation({
    mutationFn: incomesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); setDeleteId(null); toast({ title: 'Đã xóa thu nhập' }) },
    onError: () => toast({ title: 'Có lỗi xảy ra', variant: 'destructive' }),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => incomesApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  })

  const openEdit = (income: Income) => {
    setEditIncome(income)
    setFormFrequency(income.frequency)
    reset({
      name: income.name,
      income_type: income.income_type,
      amount: income.amount,
      frequency: income.frequency,
      payment_day: income.payment_day ?? undefined,
      transaction_date: income.transaction_date?.slice(0, 10) ?? '',
      start_date: income.start_date?.slice(0, 10) ?? '',
      end_date: income.end_date?.slice(0, 10) ?? '',
      is_active: income.is_active,
      notes: income.notes ?? '',
    })
    setDrawerOpen(true)
  }

  const openCreate = () => {
    setEditIncome(null)
    setFormFrequency('monthly')
    const today = new Date().toISOString().split('T')[0]
    reset({ is_active: true, income_type: 'salary', frequency: 'monthly', transaction_date: today, start_date: today })
    setDrawerOpen(true)
  }

  const onSubmit = (data: FormData) => {
    if (data.frequency === 'one_time') {
      data.start_date = null
      data.end_date = null
    } else {
      data.transaction_date = null
    }

    if (editIncome) {
      const { transaction_date, ...updateData } = data
      updateMutation.mutate({ id: editIncome.id, data: updateData })
    } else {
      createMutation.mutate(data)
    }
  }

  const IncomeCard = ({ income }: { income: Income }) => {
    const typeInfo = incomeTypeConfig[income.income_type]
    return (
      <Card className="hover:border-border/80 transition-colors">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{income.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <TypeBadge label={typeInfo.label} variant={typeInfo.variant} />
                <TypeBadge label={{ one_time: 'Một lần', weekly: 'Tuần', monthly: 'Tháng', yearly: 'Năm' }[income.frequency]} variant="slate" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Số tiền</p>
                <CurrencyDisplay amount={income.amount} variant="income" compact />
              </div>
              {income.payment_day && (
                <div>
                  <p className="text-xs text-muted-foreground">Ngày nhận</p>
                  <span className="font-semibold">Ngày {income.payment_day}</span>
                </div>
              )}
              {income.transaction_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Ngày giao dịch</p>
                  <span className="font-semibold">{income.transaction_date.slice(0, 10)}</span>
                </div>
              )}
              {income.frequency !== 'one_time' && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Hoạt động</p>
                  <Switch
                    checked={income.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: income.id, is_active: v })}
                    id={`income-toggle-${income.id}`}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => openEdit(income)} id={`income-edit-${income.id}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(income.id)} id={`income-delete-${income.id}`}>
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
          <h1 className="text-2xl font-bold">Thu Nhập</h1>
          <p className="text-sm text-muted-foreground">{incomes.length} nguồn</p>
        </div>
        <Button onClick={openCreate} className="gap-2" id="incomes-add-btn">
          <Plus className="h-4 w-4" /> Thêm Thu Nhập
        </Button>
      </div>

      <Tabs defaultValue="recurring" id="incomes-tabs">
        <TabsList>
          <TabsTrigger value="recurring" id="tab-income-recurring">Định Kỳ ({recurring.length})</TabsTrigger>
          <TabsTrigger value="onetime" id="tab-income-onetime">Một Lần ({oneTime.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="recurring" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          ) : recurring.length === 0 ? (
            <EmptyState icon={Wallet} title="Chưa có thu nhập định kỳ" description="Lương, thu nhập thụ động, freelance..." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Thêm ngay</Button>} />
          ) : (
            <div className="space-y-3">{recurring.map((i) => <IncomeCard key={i.id} income={i} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="onetime" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          ) : oneTime.length === 0 ? (
            <EmptyState icon={Wallet} title="Chưa có thu nhập một lần" description="Trading profit, bonus, freelance lẻ..." action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Thêm ngay</Button>} />
          ) : (
            <div className="space-y-3">{oneTime.map((i) => <IncomeCard key={i.id} income={i} />)}</div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={drawerOpen} onOpenChange={(o) => { setDrawerOpen(o); if (!o) { setEditIncome(null); reset() } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editIncome ? 'Chỉnh sửa thu nhập' : 'Thêm thu nhập'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="income-form">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Tên thu nhập</Label>
                <Input placeholder="VD: Lương công ty A" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Loại thu nhập</Label>
                <Select defaultValue={editIncome?.income_type ?? 'salary'} onValueChange={(v) => setValue('income_type', v as IncomeType)}>
                  <SelectTrigger id="income-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(incomeTypeConfig).map(([v, { label }]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tần suất</Label>
                <Select defaultValue={editIncome?.frequency ?? 'monthly'} onValueChange={(v) => { setValue('frequency', v as Frequency); setFormFrequency(v as Frequency) }}>
                  <SelectTrigger id="income-freq-select"><SelectValue /></SelectTrigger>
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
                    <Label>Ngày nhận lương (1-31)</Label>
                    <Input type="number" min={1} max={31} {...register('payment_day')} />
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
                    <Switch id="income-active" defaultChecked={editIncome?.is_active ?? true} onCheckedChange={(v) => setValue('is_active', v)} />
                    <Label htmlFor="income-active">Đang hoạt động</Label>
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
              <Button type="submit" loading={isSubmitting} id="income-form-submit">
                {editIncome ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa thu nhập?"
        description="Hành động này không thể hoàn tác."
        confirmText="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
