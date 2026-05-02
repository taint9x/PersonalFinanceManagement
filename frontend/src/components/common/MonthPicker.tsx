import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { formatPeriod, nextPeriod, prevPeriod } from '@/utils/date'

export function MonthPicker() {
  const { selectedPeriod, setSelectedPeriod } = useUIStore()

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setSelectedPeriod(prevPeriod(selectedPeriod))}
        id="month-picker-prev"
        aria-label="Tháng trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[120px] text-center text-sm font-medium">
        {formatPeriod(selectedPeriod)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setSelectedPeriod(nextPeriod(selectedPeriod))}
        id="month-picker-next"
        aria-label="Tháng sau"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
