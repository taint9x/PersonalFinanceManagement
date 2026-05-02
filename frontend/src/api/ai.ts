import apiClient from './client'
import type { AIAnalysis } from '@/types'

export const aiApi = {
  getAnalysis: async (period: string): Promise<AIAnalysis | null> => {
    try {
      const response = await apiClient.get<any>('/ai/analysis', {
        params: { period },
      })
      if (response.data && response.data.exists === false) {
        return null
      }
      return response.data as AIAnalysis
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response: { status: number } }
        if (axiosError.response?.status === 404) return null
      }
      throw error
    }
  },

  generate: async (period: string, force = false): Promise<AIAnalysis> => {
    const response = await apiClient.post<AIAnalysis>('/ai/analysis/generate', null, {
      params: { period, force },
    })
    return response.data
  },
}
