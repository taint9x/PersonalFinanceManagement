import { CalendarDays, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ViewMode = 'list' | 'calendar'

interface ViewToggleProps {
  view: ViewMode
  onChange: (view: ViewMode) => void
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1" aria-label="Chọn kiểu xem">
      <Button
        type="button"
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        className={cn('h-8 gap-1.5 px-2.5', view !== 'list' && 'text-muted-foreground')}
        onClick={() => onChange('list')}
        aria-pressed={view === 'list'}
        title="Danh sách"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </Button>
      <Button
        type="button"
        variant={view === 'calendar' ? 'default' : 'ghost'}
        size="sm"
        className={cn('h-8 gap-1.5 px-2.5', view !== 'calendar' && 'text-muted-foreground')}
        onClick={() => onChange('calendar')}
        aria-pressed={view === 'calendar'}
        title="Lịch"
      >
        <CalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">Cal</span>
      </Button>
    </div>
  )
}
