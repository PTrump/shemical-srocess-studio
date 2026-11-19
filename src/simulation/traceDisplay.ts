import type { TraceValue } from '../engine'
import { formatNumber } from '../utils/format'

export interface TraceDisplayValue {
  display: string
  original: string
  converted: boolean
}

function formatRaw(value: number): string {
  return Number.isFinite(value) ? formatNumber(value, 6) : String(value)
}

function formatConverted(value: number): string {
  return Number.isFinite(value) ? formatNumber(value, 4) : '—'
}

function convertPressureList(value: string): TraceDisplayValue | null {
  const parts = value.split(',').map((part) => part.trim())
  if (parts.length === 0) {
    return null
  }
  const numbers = parts.map((part) => Number(part))
  if (!numbers.every((number) => Number.isFinite(number))) {
    return null
  }
  const converted = numbers.map((number) => number / 100_000)
  return {
    display: `${converted.map((number) => formatConverted(number)).join(' / ')} bar`,
    original: `${parts.join(' / ')} Pa`,
    converted: true,
  }
}

function convertComponentFlowList(value: string): TraceDisplayValue | null {
  const parts = value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return null
  }
  const converted: string[] = []
  for (const part of parts) {
    const [componentId, rawValue] = part.split('=')
    if (!componentId || rawValue === undefined) {
      return null
    }
    const number = Number(rawValue)
    if (!Number.isFinite(number)) {
      return null
    }
    converted.push(
      `${componentId.trim()}=${formatConverted((number * 3600) / 1000)}`,
    )
  }
  return {
    display: `${converted.join(';')} t/h`,
    original: `${value} kg/s`,
    converted: true,
  }
}

/**
 * Convert a raw Engine trace value for display only.
 *
 * The Engine trace object is never mutated. Each call starts from the raw
 * Engine value, so converted values cannot be converted a second time.
 */
export function displayTraceValue(
  field: string,
  value: TraceValue,
): TraceDisplayValue {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return {
        display: '—',
        original: String(value),
        converted: false,
      }
    }
    if (/MassFlowKgS$/.test(field)) {
      return {
        display: `${formatConverted((value * 3600) / 1000)} t/h`,
        original: `${formatRaw(value)} kg/s`,
        converted: true,
      }
    }
    if (/TemperatureK$/.test(field)) {
      return {
        display: `${formatConverted(value - 273.15)} °C`,
        original: `${formatRaw(value)} K`,
        converted: true,
      }
    }
    if (/PressurePa$/.test(field)) {
      return {
        display: `${formatConverted(value / 100_000)} bar`,
        original: `${formatRaw(value)} Pa`,
        converted: true,
      }
    }
    if (/CpJPerKgK$/.test(field)) {
      return {
        display: `${formatConverted(value / 1000)} kJ/(kg·K)`,
        original: `${formatRaw(value)} J/(kg·K)`,
        converted: true,
      }
    }
    if (/dutyW$/.test(field)) {
      return {
        display: `${formatConverted(value / 1000)} kW`,
        original: `${formatRaw(value)} W`,
        converted: true,
      }
    }
    return {
      display: formatRaw(value),
      original: formatRaw(value),
      converted: false,
    }
  }

  if (typeof value === 'string') {
    if (field === 'inletPressureValuesPa') {
      const converted = convertPressureList(value)
      if (converted) {
        return converted
      }
    }
    if (field === 'outletComponentsKgS') {
      const converted = convertComponentFlowList(value)
      if (converted) {
        return converted
      }
    }
  }

  return {
    display: String(value),
    original: String(value),
    converted: false,
  }
}
