import apiClient from './client'
import type { NotificationLog } from '@/types/notification'

export const notificationsApi = {
  /**
   * Get the user's notification send history, most recent first.
   */
  getHistory: async (limit = 12): Promise<NotificationLog[]> => {
    const response = await apiClient.get<NotificationLog[]>('/notifications/history', {
      params: { limit },
    })
    return response.data
  },

  /**
   * Manually trigger a monthly report send for the given period.
   * Useful for testing or re-sending a specific month.
   */
  sendNow: async (period: string): Promise<{ status: string; period: string; results: Record<string, unknown> }> => {
    const response = await apiClient.post('/notifications/send-now', null, {
      params: { period },
    })
    return response.data
  },
}
