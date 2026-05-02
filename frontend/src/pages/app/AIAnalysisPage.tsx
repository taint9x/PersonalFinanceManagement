import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, RefreshCw, Sparkles, Clock, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthPicker } from '@/components/common/MonthPicker'
import { EmptyState } from '@/components/common/EmptyState'
import { useUIStore } from '@/store/uiStore'
import { aiApi } from '@/api/ai'
import { toast } from '@/hooks/useToast'
import { formatDateTime, formatPeriod } from '@/utils/date'

export default function AIAnalysisPage() {
  const { selectedPeriod } = useUIStore()
  const qc = useQueryClient()
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['ai-analysis', selectedPeriod],
    queryFn: () => aiApi.getAnalysis(selectedPeriod),
    staleTime: 5 * 60 * 1000,
  })

  const generateMutation = useMutation({
    mutationFn: (force: boolean) => aiApi.generate(selectedPeriod, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-analysis', selectedPeriod] })
      setShowRegenConfirm(false)
      toast({ title: 'Phân tích AI hoàn tất!' })
    },
    onError: (err: unknown) => {
      const msg = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response: { data: { detail?: string } } }).response?.data?.detail
        : null
      toast({
        title: 'Có lỗi xảy ra',
        description: msg || 'Không thể tạo phân tích AI.',
        variant: 'destructive',
      })
    },
  })

  const isGenerating = generateMutation.isPending

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6 text-primary" />
            Phân Tích AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Phân tích tài chính tháng {formatPeriod(selectedPeriod)} bởi AI
          </p>
        </div>
        <MonthPicker />
      </div>

      {/* States */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="skeleton h-5 w-64 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-4 w-5/6 rounded" />
            </div>
          </CardContent>
        </Card>
      ) : isGenerating ? (
        /* State 3: Generating */
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-8 w-8 animate-pulse text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Đang phân tích...</h3>
            <p className="text-sm text-muted-foreground">
              Có thể mất 15–30 giây. Vui lòng đợi.
            </p>
            <div className="mt-4 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : analysis ? (
        /* State 2: Analysis exists */
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-base">Phân Tích AI — {formatPeriod(analysis.period_key)}</CardTitle>
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs text-primary">
                    {analysis.model_used}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!showRegenConfirm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => setShowRegenConfirm(true)}
                      id="ai-regen-btn"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Tạo lại
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-muted-foreground">Sẽ ghi đè phân tích cũ.</span>
                      <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={() => generateMutation.mutate(true)} id="ai-regen-confirm-btn">
                        Xác nhận
                      </Button>
                      <button className="text-muted-foreground hover:text-foreground" onClick={() => setShowRegenConfirm(false)}>Hủy</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Tạo lúc {formatDateTime(analysis.created_at)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1 text-foreground">{children}</h3>,
                    p: ({ children }) => <p className="mb-3 leading-relaxed text-muted-foreground">{children}</p>,
                    ul: ({ children }) => <ul className="mb-3 list-disc pl-5 space-y-1 text-muted-foreground">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 space-y-1 text-muted-foreground">{children}</ol>,
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-primary pl-4 italic text-muted-foreground">{children}</blockquote>,
                  }}
                >
                  {analysis.analysis_text}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* State 1: No analysis */
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Sparkles}
              title={`Chưa có phân tích AI cho ${formatPeriod(selectedPeriod)}`}
              description="AI sẽ phân tích dữ liệu tài chính của bạn và đề xuất cải thiện tài chính."
              action={
                <Button
                  className="gap-2"
                  onClick={() => generateMutation.mutate(false)}
                  loading={isGenerating}
                  id="ai-generate-btn"
                >
                  <Bot className="h-4 w-4" />
                  Tạo Phân Tích
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
