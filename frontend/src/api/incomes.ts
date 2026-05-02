import apiClient from './client'
import type { Income, CreateIncomeRequest, UpdateIncomeRequest } from '@/types'

const parseIncome = (i: Income): Income => ({
  ...i,
  amount: Number(i.amount),
})

export const incomesApi = {
  list: async (params?: { frequency?: string; active?: boolean; current_month?: string }): Promise<Income[]> => {
    const response = await apiClient.get<Income[]>('/incomes', { params })
    return response.data.map(parseIncome)
  },

  create: async (data: CreateIncomeRequest): Promise<Income> => {
    const response = await apiClient.post<Income>('/incomes', data)
    return parseIncome(response.data)
  },

  update: async (id: string, data: UpdateIncomeRequest): Promise<Income> => {
    const response = await apiClient.put<Income>(`/incomes/${id}`, data)
    return parseIncome(response.data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/incomes/${id}`)
  },
}
