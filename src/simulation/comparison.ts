import type { UiSimulationView } from './types'

export type ComparisonDirection = 'up' | 'down' | 'same' | 'unavailable'

export interface ComparisonMetric {
  key:
    | 'totalFeed'
    | 'mixerOutletTemperature'
    | 'heaterDuty'
    | 'productFlow'
    | 'productTemperature'
    | 'massClosure'
  label: string
  unit: string
  previousValue: number | null
  currentValue: number | null
  delta: number | null
  direction: ComparisonDirection
}

export interface RunComparison {
  previousRunAt: string | null
  currentRunAt: string | null
  metrics: ComparisonMetric[]
}

interface ViewMetrics {
  totalFeed: number | null
  mixerOutletTemperature: number | null
  heaterDuty: number | null
  productFlow: number | null
  productTemperature: number | null
  massClosure: number | null
}

function findMixerTemperature(view: UiSimulationView): number | null {
  const mixer = Object.values(view.equipment).find(
    (item) => item.kind === 'mixer' && item.status === 'calculated',
  )
  if (!mixer) {
    return null
  }
  return view.nodeOutputs[mixer.nodeId]?.temperatureC ?? null
}

function extractMetrics(view: UiSimulationView): ViewMetrics {
  const heaters = view.energyRows.filter(
    (row) =>
      row.category === 'heater' &&
      row.status === 'calculated' &&
      row.dutyKW !== null,
  )
  const heaterDuty =
    heaters.length > 0
      ? heaters.reduce((total, row) => total + (row.dutyKW ?? 0), 0)
      : null

  return {
    totalFeed: view.summary.totalFeedTph,
    mixerOutletTemperature: findMixerTemperature(view),
    heaterDuty,
    productFlow: view.summary.productFlowTph,
    productTemperature: view.summary.outletTemperatureC,
    massClosure: view.summary.massClosure,
  }
}

function directionOf(
  previous: number | null,
  current: number | null,
): ComparisonDirection {
  if (
    previous === null ||
    current === null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return 'unavailable'
  }
  const scale = Math.max(1, Math.abs(previous), Math.abs(current))
  if (Math.abs(current - previous) <= 1e-9 * scale) {
    return 'same'
  }
  return current > previous ? 'up' : 'down'
}

function metric(
  key: ComparisonMetric['key'],
  label: string,
  unit: string,
  previousValue: number | null,
  currentValue: number | null,
): ComparisonMetric {
  const delta =
    previousValue === null || currentValue === null
      ? null
      : currentValue - previousValue
  return {
    key,
    label,
    unit,
    previousValue,
    currentValue,
    delta,
    direction: directionOf(previousValue, currentValue),
  }
}

/**
 * Compare two real Engine runs. This function never fabricates values: if a
 * metric is unavailable in either run, its direction is unavailable.
 */
export function buildRunComparison(
  previous: UiSimulationView | null,
  current: UiSimulationView | null,
): RunComparison | null {
  if (
    previous === null ||
    current === null ||
    current.status === 'failed'
  ) {
    return null
  }

  const previousMetrics = extractMetrics(previous)
  const currentMetrics = extractMetrics(current)

  return {
    previousRunAt: previous.executedAt,
    currentRunAt: current.executedAt,
    metrics: [
      metric(
        'totalFeed',
        '总进料流量',
        't/h',
        previousMetrics.totalFeed,
        currentMetrics.totalFeed,
      ),
      metric(
        'mixerOutletTemperature',
        'Mixer 出口温度',
        '°C',
        previousMetrics.mixerOutletTemperature,
        currentMetrics.mixerOutletTemperature,
      ),
      metric(
        'heaterDuty',
        'Heater 热负荷',
        'kW',
        previousMetrics.heaterDuty,
        currentMetrics.heaterDuty,
      ),
      metric(
        'productFlow',
        'Product 流量',
        't/h',
        previousMetrics.productFlow,
        currentMetrics.productFlow,
      ),
      metric(
        'productTemperature',
        'Product 温度',
        '°C',
        previousMetrics.productTemperature,
        currentMetrics.productTemperature,
      ),
      metric(
        'massClosure',
        '物料平衡',
        '%',
        previousMetrics.massClosure,
        currentMetrics.massClosure,
      ),
    ],
  }
}
