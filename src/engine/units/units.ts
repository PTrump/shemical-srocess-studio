/**
 * Canonical internal units for the calculation engine.
 *
 * These units are part of the engine contract. UI input/output units are
 * converted at the adapter boundary in `units/convert.ts`.
 */
export const ENGINE_UNIT_SYSTEM = {
  id: 'si-engineering-v1',
  massFlow: 'kg/s',
  temperature: 'K',
  pressure: 'Pa',
  heatCapacity: 'J/(kg·K)',
  duty: 'W',
  componentMassFlow: 'kg/s',
  massFraction: '1',
} as const

/** Display/input units used by the current UI. */
export const UI_UNIT_SYSTEM = {
  massFlow: 't/h',
  temperature: '°C',
  pressure: 'bar',
  heatCapacity: 'kJ/(kg·K)',
  duty: 'kW',
  weightPercent: 'wt%',
} as const

export const KILOGRAMS_PER_TONNE = 1000
export const SECONDS_PER_HOUR = 3600
export const KELVIN_OFFSET = 273.15
export const PASCALS_PER_BAR = 100_000
export const JOULES_PER_KILOJOULE = 1000
export const WATTS_PER_KILOWATT = 1000

export const MASS_FLOW_TOLERANCE_RELATIVE = 1e-9
export const MASS_FLOW_TOLERANCE_EPSILON_FACTOR = 64

/**
 * Scale-aware tolerance for comparing a total mass flow with the sum of its
 * component mass flows.
 *
 * A fixed absolute floor is deliberately not used: at flows around 1e-13 kg/s
 * such a floor can be larger than the total flow itself and would accept
 * physically inconsistent compositions. The epsilon term only covers the
 * ordinary floating-point representation error of the values involved.
 */
export function massFlowConsistencyTolerance(
  totalMassFlowKgS: number,
  componentMassFlowSumKgS: number,
): number {
  if (
    !Number.isFinite(totalMassFlowKgS) ||
    !Number.isFinite(componentMassFlowSumKgS)
  ) {
    return 0
  }

  const scale = Math.max(
    Math.abs(totalMassFlowKgS),
    Math.abs(componentMassFlowSumKgS),
  )
  if (scale === 0) {
    return 0
  }

  return Math.max(
    scale * MASS_FLOW_TOLERANCE_RELATIVE,
    Number.EPSILON * MASS_FLOW_TOLERANCE_EPSILON_FACTOR * scale,
  )
}
