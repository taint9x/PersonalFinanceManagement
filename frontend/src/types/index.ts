// ========================
// Auth Types
// ========================
export interface User {
  id: string
  username: string
  email: string
}

export interface AuthToken {
  access_token: string
  token_type: string
}

// ========================
// Debt Types
// ========================
export type DebtType = 'credit_loan' | 'credit_card' | 'personal_loan' | 'other'
export type DebtStatus = 'active' | 'paid_off' | 'paused'
export type DebtCategory = 'monthly_installment' | 'personal_lump_sum'

export interface Debt {
  id: string
  name: string
  debt_type: DebtType
  principal_amount: number
  remaining_amount: number
  interest_rate: number
  monthly_payment: number
  due_day: number
  start_date: string | null
  end_date: string | null
  status: DebtStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Personal loan fields
  debt_category: DebtCategory
  repay_amount: string | null      // Decimal string
  borrow_date: string | null       // ISO date
  repay_date: string | null        // ISO date
  lender_name: string | null
  is_fully_paid: boolean
  actual_repaid_date: string | null
}

export interface CreateDebtRequest {
  name: string
  debt_type: DebtType
  principal_amount: number
  remaining_amount: number
  interest_rate: number
  monthly_payment: number
  due_day?: number
  start_date?: string
  end_date?: string
  status?: DebtStatus
  notes?: string
  // Personal loan fields
  debt_category?: DebtCategory
  repay_amount?: number
  borrow_date?: string
  repay_date?: string
  lender_name?: string
}

export type UpdateDebtRequest = Partial<CreateDebtRequest>

// ========================
// Expense Types
// ========================
export type ExpenseType = 'subscription' | 'utility' | 'food' | 'transport' | 'healthcare' | 'entertainment' | 'other'
export type Frequency = 'one_time' | 'weekly' | 'monthly' | 'yearly'

export interface Expense {
  id: string
  name: string
  expense_type: ExpenseType
  amount: number
  frequency: Frequency
  billing_day: number | null
  transaction_date: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateExpenseRequest {
  name: string
  expense_type: ExpenseType
  amount: number
  frequency: Frequency
  billing_day?: number
  transaction_date?: string
  start_date?: string
  end_date?: string
  is_active?: boolean
  notes?: string
}

export type UpdateExpenseRequest = Partial<CreateExpenseRequest>

// ========================
// Income Types
// ========================
export type IncomeType = 'salary' | 'trading' | 'freelance' | 'passive' | 'other'

export interface Income {
  id: string
  name: string
  income_type: IncomeType
  amount: number
  frequency: Frequency
  payment_day: number | null
  transaction_date: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateIncomeRequest {
  name: string
  income_type: IncomeType
  amount: number
  frequency: Frequency
  payment_day?: number
  transaction_date?: string
  start_date?: string
  end_date?: string
  is_active?: boolean
  notes?: string
}

export type UpdateIncomeRequest = Partial<CreateIncomeRequest>

// ========================
// Dashboard Types
// ========================
export interface DashboardSummary {
  period: string
  total_income: number
  total_expense: number
  total_debt_payment: number
  net_cashflow: number
  breakdown_by_type: Record<string, number>
  active_subscriptions_count: number
  active_subscriptions_total: number
  upcoming_debts: Array<{
    id: string
    name: string
    monthly_payment: number
    due_day: number
  }>
  upcoming_incomes: Array<{
    id: string
    name: string
    amount: number
    payment_day: number | null
  }>
}

export interface MonthlyTrend {
  period: string
  total_income: number
  total_expense: number
  total_debt_payment: number
  net_cashflow: number
}

// ========================
// AI Analysis Types
// ========================
export interface AIAnalysis {
  id: string
  period_key: string
  analysis_text: string
  model_used: string
  token_usage: Record<string, number> | null
  created_at: string
}

export interface GenerateAnalysisResponse {
  analysis: AIAnalysis
  generated: boolean
}

// ========================
// Transaction Types
// ========================
export type TransactionSourceType = 'debt' | 'expense' | 'income'

export interface Transaction {
  id: string
  source_type: TransactionSourceType
  source_id: string
  amount: number
  transaction_date: string
  notes: string | null
  created_at: string
}

// ========================
// Common API Response
// ========================
export interface ApiError {
  detail: string
  code?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}
