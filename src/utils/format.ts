export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function formatNumber(
  value: number,
  digits = 1,
  trimTrailing = true,
): string {
  if (!Number.isFinite(value)) {
    return '—'
  }

  const safe = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value
  const fixed = safe.toFixed(digits)
  if (!trimTrailing) {
    return fixed
  }

  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

export function formatFlow(value: number): string {
  return formatNumber(value, value >= 100 ? 0 : 2)
}

export function formatTemperature(value: number): string {
  return formatNumber(value, 1)
}

export function formatPressure(value: number): string {
  return formatNumber(value, 2)
}

export function formatDuty(value: number): string {
  return formatNumber(value, 1)
}

export function formatPercent(value: number): string {
  return formatNumber(value, 1)
}

export function formatSigned(value: number, digits = 1): string {
  if (!Number.isFinite(value)) {
    return '—'
  }
  if (value > 0) {
    return `+${formatNumber(value, digits)}`
  }
  return formatNumber(value, digits)
}

export function formatClock(value: Date | string | number | null): string {
  if (value === null) {
    return '—'
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatShortDateTime(iso: string | null): string {
  if (!iso) {
    return '尚未保存'
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '尚未保存'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function createId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)

  return `${prefix}-${randomPart}`
}
