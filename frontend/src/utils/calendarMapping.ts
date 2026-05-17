import { addDays, getDate, getMonth, getYear, isBefore, isWithinInterval, parseISO } from 'date-fns'

export type CalendarMode = 'expense' | 'income' | 'overview'

export interface CalendarItemLike {
  id: string
  name: string
  amount: number | string
  frequency: string
  source_type?: 'debt' | 'expense' | 'income'
  transaction_date?: string | null
  start_date?: string | null
  billing_day?: number | null
  payment_day?: number | null
  due_day?: number | null
  borrow_date?: string | null
  debt_category?: string
  created_at?: string | null
}

export type DayMap<T extends CalendarItemLike> = Record<number, T[]>

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function clampDay(day: number, lastDay: number): number {
  return Math.min(Math.max(day, 1), lastDay)
}

function pushDay<T extends CalendarItemLike>(dayMap: DayMap<T>, day: number, item: T) {
  if (!dayMap[day]) dayMap[day] = []
  dayMap[day].push(item)
}

export function buildDayMap<T extends CalendarItemLike>(
  items: T[],
  year: number,
  month: number
): DayMap<T> {
  const dayMap: DayMap<T> = {}
  const monthIndex = month - 1
  const periodStart = new Date(year, monthIndex, 1)
  const periodEnd = new Date(year, month, 0)
  const lastDay = getDate(periodEnd)

  items.forEach((item) => {
    if (item.debt_category === 'personal_lump_sum') {
      const borrowDate = parseDate(item.borrow_date)
      if (borrowDate && getYear(borrowDate) === year && getMonth(borrowDate) === monthIndex) {
        pushDay(dayMap, getDate(borrowDate), item)
      }
      return
    }

    if (item.frequency === 'one_time') {
      const transactionDate = parseDate(item.transaction_date)
      if (transactionDate && getYear(transactionDate) === year && getMonth(transactionDate) === monthIndex) {
        pushDay(dayMap, getDate(transactionDate), item)
      }
      return
    }

    if (item.frequency === 'monthly') {
      const day = item.billing_day ?? item.payment_day ?? item.due_day ?? 1
      pushDay(dayMap, clampDay(day, lastDay), item)
      return
    }

    if (item.frequency === 'yearly') {
      const startDate = parseDate(item.start_date)
      if (startDate && getMonth(startDate) === monthIndex) {
        pushDay(dayMap, clampDay(getDate(startDate), lastDay), item)
      }
      return
    }

    if (item.frequency === 'weekly') {
      const startDate = parseDate(item.start_date) ?? periodStart
      let candidate = startDate
      while (isBefore(candidate, periodStart)) {
        candidate = addDays(candidate, 7)
      }
      for (let offset = 0; offset <= 35; offset += 7) {
        const occurrence = addDays(candidate, offset)
        if (isWithinInterval(occurrence, { start: periodStart, end: periodEnd })) {
          pushDay(dayMap, getDate(occurrence), item)
        }
      }
    }
  })

  return dayMap
}

export function toAmount(value: number | string | undefined): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  return Number(value) || 0
}
