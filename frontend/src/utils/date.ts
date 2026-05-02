import { format, addMonths, subMonths, parseISO, isValid } from 'date-fns'
import { vi } from 'date-fns/locale'

/**
 * Get current period as YYYY-MM
 */
export function getCurrentPeriod(): string {
  return format(new Date(), 'yyyy-MM')
}

/**
 * Format a YYYY-MM period key as a display string
 * Example: "2025-03" → "Tháng 3, 2025"
 */
export function formatPeriod(periodKey: string): string {
  const date = parseISO(`${periodKey}-01`)
  if (!isValid(date)) return periodKey
  return format(date, "MMMM, yyyy", { locale: vi })
    .replace(/^./, (c) => c.toUpperCase())
}

/**
 * Get the next period key
 */
export function nextPeriod(periodKey: string): string {
  const date = parseISO(`${periodKey}-01`)
  return format(addMonths(date, 1), 'yyyy-MM')
}

/**
 * Get the previous period key
 */
export function prevPeriod(periodKey: string): string {
  const date = parseISO(`${periodKey}-01`)
  return format(subMonths(date, 1), 'yyyy-MM')
}

/**
 * Format an ISO date string to display date
 */
export function formatDate(isoString: string | null): string {
  if (!isoString) return '—'
  const date = parseISO(isoString)
  if (!isValid(date)) return '—'
  return format(date, 'dd/MM/yyyy')
}

/**
 * Format an ISO datetime to display string
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  const date = parseISO(isoString)
  if (!isValid(date)) return '—'
  return format(date, 'HH:mm dd/MM/yyyy')
}

/**
 * Convert YYYY-MM to Date object (1st of month)
 */
export function periodToDate(periodKey: string): Date {
  return parseISO(`${periodKey}-01`)
}
