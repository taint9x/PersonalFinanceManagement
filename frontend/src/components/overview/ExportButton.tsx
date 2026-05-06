import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { monthlyOverviewApi } from '@/api/monthlyOverview'
import { toast } from '@/hooks/useToast'

interface Props {
  period: string
}

export function ExportButton({ period }: Props) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await monthlyOverviewApi.exportExcel(period)

      // Browser download trick: create a temporary <a> tag, click it, then clean up
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `finance_${period}.xlsx`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Xuất file thất bại. Thử lại sau.', variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      id="export-excel-btn"
      onClick={handleExport}
      disabled={isExporting}
      className="gap-1.5"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang tạo file...
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5" />
          Xuất Excel
        </>
      )}
    </Button>
  )
}
