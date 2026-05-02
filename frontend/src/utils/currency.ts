/**
 * Format a number as Vietnamese Dong (VND)
 * Example: 1500000 → "1.500.000 ₫"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Compact VND format for large numbers
 * Example: 1500000 → "1,5M ₫"
 */
export function formatVNDCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}B ₫`
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}M ₫`
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}K ₫`
  }
  return formatVND(amount)
}

/**
 * Parse a formatted VND string back to a number
 */
export function parseVND(formatted: string): number {
  return Number(formatted.replace(/[^\d-]/g, ''))
}
