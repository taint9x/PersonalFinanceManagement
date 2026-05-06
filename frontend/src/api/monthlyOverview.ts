import apiClient from './client'
import type {
  MonthlyOverviewResponse,
  MarkPaymentPayload,
  PaymentRecord,
} from '@/types/monthlyOverview'

export const monthlyOverviewApi = {
  /**
   * Fetch the unified monthly overview list for a given period.
   */
  getOverview: async (
    period: string,
    type: 'all' | 'debt' | 'expense' | 'income' = 'all'
  ): Promise<MonthlyOverviewResponse> => {
    const response = await apiClient.get<MonthlyOverviewResponse>('/monthly-overview', {
      params: { period, type },
    })
    return response.data
  },

  /**
   * UPSERT a payment record as paid for the given item + period.
   */
  markAsPaid: async (payload: MarkPaymentPayload): Promise<PaymentRecord> => {
    const response = await apiClient.post<PaymentRecord>(
      '/monthly-overview/mark-paid',
      payload
    )
    return response.data
  },

  /**
   * UPSERT a payment record as unpaid (toggle off). Does NOT delete — preserves audit trail.
   */
  markAsUnpaid: async (payload: MarkPaymentPayload): Promise<PaymentRecord> => {
    const response = await apiClient.post<PaymentRecord>(
      '/monthly-overview/mark-unpaid',
      payload
    )
    return response.data
  },

  /**
   * Download monthly data as Excel file.
   * IMPORTANT: uses responseType 'blob' — do NOT parse as JSON.
   * Returns a Blob to be downloaded by the browser.
   */
  exportExcel: async (period: string): Promise<Blob> => {
    const response = await apiClient.get('/monthly-overview/export/excel', {
      params: { period },
      responseType: 'blob',
    })
    return response.data as Blob
  },
}
