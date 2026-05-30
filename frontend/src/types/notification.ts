export type NotificationChannel = 'email' | 'telegram'
export type NotificationStatus = 'success' | 'failed' | 'retrying'

export interface NotificationLog {
  id: string
  user_id: string
  period_key: string
  channel: NotificationChannel
  status: NotificationStatus
  attempt_count: number
  error_message: string | null
  sent_at: string | null
  created_at: string
}
