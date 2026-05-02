import apiClient from './client'
import type { Debt, CreateDebtRequest, UpdateDebtRequest } from '@/types'

const parseDebt = (d: Debt): Debt => ({
  ...d,
  principal_amount: Number(d.principal_amount),
  remaining_amount: Number(d.remaining_amount),
  interest_rate: Number(d.interest_rate),
  monthly_payment: Number(d.monthly_payment),
})

export const debtsApi = {
  list: async (current_month?: string): Promise<Debt[]> => {
    const params = current_month ? { current_month } : {}
    const response = await apiClient.get<Debt[]>('/debts', { params })
    return response.data.map(parseDebt)
  },

  get: async (id: string): Promise<Debt> => {
    const response = await apiClient.get<Debt>(`/debts/${id}`)
    return parseDebt(response.data)
  },

  create: async (data: CreateDebtRequest): Promise<Debt> => {
    const response = await apiClient.post<Debt>('/debts', data)
    return parseDebt(response.data)
  },

  update: async (id: string, data: UpdateDebtRequest): Promise<Debt> => {
    const response = await apiClient.put<Debt>(`/debts/${id}`, data)
    return parseDebt(response.data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/debts/${id}`)
  },
}
