import apiClient from './client'
import type { DashboardSummary, MonthlyTrend } from '@/types'

const parseSummary = (s: DashboardSummary & { period_key?: string }): DashboardSummary => ({
  ...s,
  period: s.period_key || s.period,
  total_income: Number(s.total_income),
  total_expense: Number(s.total_expense),
  total_debt_payment: Number(s.total_debt_payment),
  net_cashflow: Number(s.net_cashflow),
  active_subscriptions_total: Number(s.active_subscriptions_total),
  upcoming_debts: (s.upcoming_debts || []).map((d) => ({
    ...d,
    monthly_payment: Number(d.monthly_payment),
  })),
  upcoming_incomes: (s.upcoming_incomes || []).map((i) => ({
    ...i,
    amount: Number(i.amount),
  })),
})

const parseTrend = (t: MonthlyTrend & { period_key?: string }): MonthlyTrend => ({
  ...t,
  period: t.period_key || t.period,
  total_income: Number(t.total_income),
  total_expense: Number(t.total_expense),
  total_debt_payment: Number(t.total_debt_payment),
  net_cashflow: Number(t.net_cashflow),
})

export const dashboardApi = {
  summary: async (period: string): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary', {
      params: { period },
    })
    return parseSummary(response.data)
  },

  monthlyTrend: async (months = 6): Promise<MonthlyTrend[]> => {
    const response = await apiClient.get<MonthlyTrend[]>('/dashboard/monthly-trend', {
      params: { months },
    })
    return response.data.map(parseTrend)
  },
}
