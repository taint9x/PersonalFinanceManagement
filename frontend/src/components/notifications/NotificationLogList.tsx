import { Mail, Send, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationLog } from '@/types/notification'

interface Props {
  logs: NotificationLog[]
}

function StatusBadge({ status }: { status: NotificationLog['status'] }) {
  const configs = {
    success: {
      label: 'Thành công',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      Icon: CheckCircle,
    },
    failed: {
      label: 'Thất bại',
      className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      Icon: XCircle,
    },
    retrying: {
      label: 'Đang thử lại',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      Icon: RefreshCw,
    },
  }

  const { label, className, Icon } = configs[status]
  return (
    <span className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function ChannelIcon({ channel }: { channel: NotificationLog['channel'] }) {
  if (channel === 'email') {
    return <Mail className="h-4 w-4 text-blue-400" />
  }
  return <Send className="h-4 w-4 text-sky-400" />
}

function formatPeriodDisplay(periodKey: string): string {
  const [year, month] = periodKey.split('-')
  return `Tháng ${month}/${year}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function LogEntry({ log }: { log: NotificationLog }) {
  const channelLabel = log.channel === 'email' ? 'Email' : 'Telegram'

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ChannelIcon channel={log.channel} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {channelLabel} · {formatPeriodDisplay(log.period_key)}
            </p>
            {log.status === 'success' && log.sent_at && (
              <p className="text-xs text-muted-foreground">
                Gửi lúc: {formatDateTime(log.sent_at)}
              </p>
            )}
            {log.status === 'failed' && log.error_message && (
              <p className="truncate text-xs text-rose-400 max-w-xs">
                Lỗi: {log.error_message}
              </p>
            )}
            {log.status === 'retrying' && (
              <p className="text-xs text-amber-400">
                Thử lần {log.attempt_count}...
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={log.status} />
      </div>
    </div>
  )
}

export function NotificationLogList({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Mail className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Chưa có báo cáo nào được gửi</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Báo cáo sẽ tự động gửi vào cuối mỗi tháng.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <LogEntry key={log.id} log={log} />
      ))}
    </div>
  )
}
