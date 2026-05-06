import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Send, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { notificationsApi } from '@/api/notifications'
import { NotificationLogList } from '@/components/notifications/NotificationLogList'
import { toast } from '@/hooks/useToast'
import { useUIStore } from '@/store/uiStore'

export default function NotificationsPage() {
  const { selectedPeriod } = useUIStore()
  const queryClient = useQueryClient()
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)
  const [sendPeriod, setSendPeriod] = useState(selectedPeriod)

  const { data: logs, isLoading } = useQuery({
    queryKey: ['notifications', 'history'],
    queryFn: () => notificationsApi.getHistory(24),
    staleTime: 30 * 1000,
  })

  const sendMutation = useMutation({
    mutationFn: (period: string) => notificationsApi.sendNow(period),
    onSuccess: (data) => {
      const emailOk = (data.results as Record<string, { success: boolean }>)?.email?.success
      const tgOk = (data.results as Record<string, { success: boolean }>)?.telegram?.success
      const parts = []
      if (emailOk) parts.push('Email ✓')
      if (tgOk) parts.push('Telegram ✓')
      const failParts = []
      if (!emailOk) failParts.push('Email')
      if (!tgOk) failParts.push('Telegram')

      if (parts.length > 0) {
        toast({ title: `Đã gửi: ${parts.join(', ')}` })
      }
      if (failParts.length > 0) {
        toast({ title: `Gửi thất bại: ${failParts.join(', ')}`, variant: 'destructive' })
      }

      queryClient.invalidateQueries({ queryKey: ['notifications', 'history'] })
      setShowPeriodPicker(false)
    },
    onError: () => {
      toast({ title: 'Gửi báo cáo thất bại. Kiểm tra cấu hình Email/Telegram.', variant: 'destructive' })
    },
  })

  // Compute a list of recent periods for the picker (last 6 months)
  const recentPeriods: string[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  function formatPeriodDisplay(p: string) {
    const [y, m] = p.split('-')
    return `Tháng ${m}/${y}`
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bell className="h-6 w-6 text-primary" />
            Lịch Sử Báo Cáo Tự Động
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Các báo cáo tháng đã được gửi qua Email và Telegram
          </p>
        </div>

        {/* Manual Send Button */}
        <div className="relative">
          <Button
            id="send-report-btn"
            variant="outline"
            className="gap-2"
            onClick={() => setShowPeriodPicker((v) => !v)}
            disabled={sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sendMutation.isPending ? 'Đang gửi...' : 'Gửi Báo Cáo Thủ Công'}
            {!sendMutation.isPending && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
          </Button>

          {showPeriodPicker && !sendMutation.isPending && (
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card shadow-lg">
              <div className="p-2">
                <p className="mb-1.5 px-2 text-xs font-semibold text-muted-foreground">
                  Chọn tháng để gửi báo cáo
                </p>
                {recentPeriods.map((p) => (
                  <button
                    key={p}
                    id={`send-period-${p}`}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => {
                      setSendPeriod(p)
                      sendMutation.mutate(p)
                    }}
                  >
                    <span>{formatPeriodDisplay(p)}</span>
                    {p === selectedPeriod && (
                      <span className="text-xs text-primary">Hiện tại</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Lịch sử gửi báo cáo
            {logs && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {logs.length} bản ghi
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <NotificationLogList logs={logs ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
