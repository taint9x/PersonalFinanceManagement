import type { DebtCategory } from './index'

export type SourceType = 'debt' | 'expense' | 'income'

export interface OverviewItem {
  id: string
  source_type: SourceType
  name: string
  amount: string          // Decimal as string from backend
  frequency: string
  category: string
  transaction_date?: string | null
  start_date?: string | null
  billing_day?: number | null
  payment_day?: number | null
  borrow_date?: string | null
  created_at?: string | null

  // Debt-specific
  due_day?: number
  remaining_amount?: string

  // Debt + Expense only
  is_paid?: boolean
  payment_record_id?: string | null
  marked_at?: string | null

  // Personal loan fields (present when source_type = 'debt' and debt_category = 'personal_lump_sum')
  debt_category?: DebtCategory
  is_fully_paid?: boolean
  lender_name?: string | null
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

export interface PersonalLoanAvailable {
  id: string
  name: string                    // loan label
  lender_name: string
  principal_amount: string        // borrowed amount (Decimal string)
  repay_amount: string            // to repay (Decimal string)
  borrow_date: string             // ISO date
  repay_date: string | null
  already_in_overview: boolean    // already has monthly_payment_record this period
}

export interface AddPersonalLoansPayload {
  period_key: string
  debt_ids: string[]
}
