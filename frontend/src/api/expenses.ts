import apiClient from './client'
import type { Expense, CreateExpenseRequest, UpdateExpenseRequest } from '@/types'

const parseExpense = (e: Expense): Expense => ({
  ...e,
  amount: Number(e.amount),
})

export const expensesApi = {
  list: async (params?: { frequency?: string; active?: boolean; current_month?: string }): Promise<Expense[]> => {
    const response = await apiClient.get<Expense[]>('/expenses', { params })
    return response.data.map(parseExpense)
  },

  create: async (data: CreateExpenseRequest): Promise<Expense> => {
    const response = await apiClient.post<Expense>('/expenses', data)
    return parseExpense(response.data)
  },

  update: async (id: string, data: UpdateExpenseRequest): Promise<Expense> => {
    const response = await apiClient.put<Expense>(`/expenses/${id}`, data)
    return parseExpense(response.data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`)
  },
}
