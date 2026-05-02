import apiClient from './client'
import type { AuthToken, User } from '@/types'

export const authApi = {
  login: async (username: string, password: string): Promise<AuthToken> => {
    const response = await apiClient.post<AuthToken>('/auth/login', {
      username,
      password,
    })
    return response.data
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me')
    return response.data
  },

  refresh: async (): Promise<AuthToken> => {
    const response = await apiClient.post<AuthToken>('/auth/refresh')
    return response.data
  },

  register: async (username: string, password: string, email?: string): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', {
      username,
      password,
      email: email || undefined,
    })
    return response.data
  },
}
