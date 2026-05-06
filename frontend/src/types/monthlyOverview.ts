export type SourceType = 'debt' | 'expense' | 'income'

export interface OverviewItem {
  id: string
  source_type: SourceType
  name: string
  amount: string          // Decimal as string from backend
  frequency: string
  category: string

  // Debt-specific
  due_day?: number
  remaining_amount?: string

  // Debt + Expense only
  is_paid?: boolean
  payment_record_id?: string | null
  marked_at?: string | null
}

export interface OverviewSummary {
  total_income: string
  total_expense: string
  total_debt_payment: string
  net_cashflow: string
  paid_count: number
  unpaid_count: number
}

export interface MonthlyOverviewResponse {
  period: string
  summary: OverviewSummary
  items: OverviewItem[]
}

export interface MarkPaymentPayload {
  source_type: 'debt' | 'expense'
  source_id: string
  period_key: string
  note?: string
}

export interface PaymentRecord {
  id: string
  user_id: string
  source_type: 'debt' | 'expense'
  source_id: string
  period_key: string
  status: 'paid' | 'unpaid'
  note?: string | null
  marked_at?: string | null
  updated_at: string
}
