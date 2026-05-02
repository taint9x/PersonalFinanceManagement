import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, CreditCard, Minus, Bot, Calendar, ArrowRight, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay'
import { useUIStore } from '@/store/uiStore'
import { dashboardApi } from '@/api/dashboard'
import { aiApi } from '@/api/ai'
import { formatVNDCompact } from '@/utils/currency'
import { formatPeriod } from '@/utils/date'

const PIE_COLORS = ['#3b82f6', '#ef4444', '#f97316', '#22c55e', '#a855f7', '#06b6d4', '#f59e0b']

function StatCard({
  title,
  value,
  icon: Icon,
  variant,
  loading,
}: {
  title: string
  value: number
  icon: React.ElementType
  variant: 'income' | 'expense' | 'debt' | 'auto'
  loading?: boolean
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton h-8 w-36 rounded" />
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                variant === 'income' ? 'bg-emerald-500/10 text-emerald-400' :
                variant === 'expense' ? 'bg-rose-500/10 text-rose-400' :
                variant === 'debt' ? 'bg-orange-500/10 text-orange-400' :
                value >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <CurrencyDisplay amount={value} variant={variant} className="text-2xl" />
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { selectedPeriod } = useUIStore()

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary', selectedPeriod],
    queryFn: () => dashboardApi.summary(selectedPeriod),
    staleTime: 60 * 1000,
  })

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard-trend'],
    queryFn: () => dashboardApi.monthlyTrend(6),
    staleTime: 30 * 60 * 1000,
  })

  const { data: aiAnalysis } = useQuery({
    queryKey: ['ai-analysis', selectedPeriod],
    queryFn: () => aiApi.getAnalysis(selectedPeriod),
    staleTime: 5 * 60 * 1000,
  })

  // Pie chart data from breakdown_by_type
  const pieData = summary
    ? Object.entries(summary.breakdown_by_type).map(([key, value]) => ({
        name: key,
        value: Math.abs(value),
      }))
    : []

  // Trend chart data
  const trendData = (trend || []).map((t) => ({
    period: t.period.slice(5), // MM
    income: t.total_income,
    expense: t.total_expense + t.total_debt_payment,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{formatPeriod(selectedPeriod)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Thu Nhập"
          value={summary?.total_income ?? 0}
          icon={TrendingUp}
          variant="income"
          loading={summaryLoading}
        />
        <StatCard
          title="Tổng Chi Tiêu"
          value={summary?.total_expense ?? 0}
          icon={TrendingDown}
          variant="expense"
          loading={summaryLoading}
        />
        <StatCard
          title="Tổng Trả Nợ"
          value={summary?.total_debt_payment ?? 0}
          icon={CreditCard}
          variant="debt"
          loading={summaryLoading}
        />
        <StatCard
          title="Dòng Tiền Ròng"
          value={summary?.net_cashflow ?? 0}
          icon={summary && summary.net_cashflow >= 0 ? TrendingUp : Minus}
          variant="auto"
          loading={summaryLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cashflow Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Xu Hướng Dòng Tiền (6 tháng)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="skeleton h-48 w-full rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 20%)" />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: 'hsl(215 20% 65%)' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(215 20% 65%)' }}
                    tickFormatter={(v) => formatVNDCompact(v)}
                    width={70}
                  />
                  <Tooltip
                    formatter={(v: number) => formatVNDCompact(v)}
                    contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(215 25% 23%)', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(213 31% 91%)' }}
                  />
                  <Bar dataKey="income" name="Thu nhập" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Chi tiêu + Nợ" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phân Loại Chi Tiêu</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="skeleton h-48 w-full rounded" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatVNDCompact(v)}
                    contentStyle={{ background: 'hsl(222 47% 14%)', border: '1px solid hsl(215 25% 23%)', borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Không có dữ liệu chi tiêu
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming debts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-orange-400" />
              Khoản Nợ Sắp Đến Hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-8 rounded" />)}
              </div>
            ) : summary?.upcoming_debts?.length ? (
              <div className="space-y-2">
                {summary.upcoming_debts.slice(0, 3).map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium truncate max-w-[120px]">{d.name}</p>
                      <p className="text-xs text-muted-foreground">Ngày {d.due_day}</p>
                    </div>
                    <CurrencyDisplay amount={d.monthly_payment} variant="debt" className="text-xs" compact />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">Không có khoản nợ</p>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-rose-400" />
              Subscriptions Hoạt Động
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="skeleton h-16 rounded" />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Số lượng</span>
                  <span className="text-xs font-semibold">{summary?.active_subscriptions_count ?? 0}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Tổng/tháng</span>
                  <CurrencyDisplay amount={summary?.active_subscriptions_total ?? 0} variant="expense" className="text-xs" compact />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bot className="h-4 w-4 text-primary" />
              Phân Tích AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiAnalysis ? (
              <>
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Đã có phân tích
                </div>
                <p className="text-xs text-muted-foreground">
                  Model: {aiAnalysis.model_used}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Chưa có phân tích AI cho tháng này</p>
            )}
            <Button asChild size="sm" variant="outline" className="w-full gap-1.5 border-primary/30" id="dashboard-ai-btn">
              <Link to="/app/ai">
                Xem Phân Tích AI <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
